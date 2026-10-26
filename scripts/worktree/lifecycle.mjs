import { spawn } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { cp, mkdir, open, readFile, readdir, realpath, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import {
  VERSION,
  allocatePorts,
  available,
  capture,
  checkPrivatePaths,
  context,
  probe,
  readJson,
  run,
  sleep,
  withLock,
  writeJson,
} from "./core.mjs";

export async function setVariables(root, values) {
  // Worktrunk stores branch variables in the shared Git config. Git's lock is fail-fast.
  for (const [key, value] of Object.entries(values)) {
    for (let attempt = 0; ; attempt++) {
      try {
        capture(
          "wt",
          [
            "config",
            "state",
            "vars",
            "set",
            `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`,
          ],
          root,
        );
        break;
      } catch (error) {
        if (attempt >= 100 || !String(error.stderr).includes("could not lock config file"))
          throw error;
        await sleep(50);
      }
    }
  }
}
export async function load(root) {
  const ctx = await context(root);
  const state = await readJson(ctx.statePath);
  if (!state || state.root !== ctx.root || state.branch !== ctx.branch || state.version !== VERSION)
    throw Error("Worktree setup is missing or stale. Run wt setup.");
  return { ctx, state };
}
/** Prepares this checkout without overwriting private files or existing workspace edits. */
export async function setup(base = "main", mode = process.env.STARTER_WORKTREE_MODE ?? "fixture") {
  const ctx = await context();
  if (capture("wt", ["--version"]) !== `wt v${VERSION}`)
    throw Error(`Install Worktrunk ${VERSION} before setup.`);
  if (!ctx.branch) throw Error("Name the detached branch before setup: git switch -c <task>.");
  if (!["fixture", "connected"].includes(mode)) throw Error("Mode must be fixture or connected.");
  return withLock(
    ctx.shared,
    `setup-${createHash("sha256").update(ctx.root).digest("hex").slice(0, 16)}`,
    async () => {
      const started = Date.now();
      await mkdir(join(ctx.root, ".data"), { recursive: true, mode: 0o700 });
      const previous = await readJson(ctx.statePath);
      if (previous?.process) throw Error("Stop the server with wt dev stop before setup.");
      await setVariables(ctx.root, { readiness: "preparing" });
      await run("wt", ["step", "copy-ignored", "--require-include"], ctx.root);
      await checkPrivatePaths(ctx.root);
      if (mode === "connected") {
        let env;
        try {
          env = parseEnv(await readFile(join(ctx.root, ".env"), "utf8"));
        } catch {
          throw Error(
            "Connected mode needs .env. Prepare private configuration, then run wt setup main connected.",
          );
        }
        for (const key of [
          "INTELLIGENCE_API_URL",
          "INTELLIGENCE_GATEWAY_WS_URL",
          "CPK_INTELLIGENCE_API_KEY",
        ])
          if (!env[key])
            throw Error(`Connected mode needs ${key} in .env. Run wt setup after correcting it.`);
        try {
          JSON.parse(
            await readFile(resolve(ctx.root, env.CODING_MODELS_FILE ?? "models.json"), "utf8"),
          );
        } catch {
          throw Error(
            "Connected mode needs valid CODING_MODELS_FILE. Correct the private model file, then run wt setup.",
          );
        }
      }
      await run("pnpm", ["install", "--frozen-lockfile"], ctx.root);
      try {
        await mkdir(join(ctx.root, "workspace"));
        await cp(join(ctx.root, "example"), join(ctx.root, "workspace"), {
          recursive: true,
          force: false,
          errorOnExist: true,
        });
        await run("git", ["init", "--quiet", "workspace"], ctx.root);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
      const seed = Number(
        capture("wt", ["step", "eval", "{{ worktree_path | hash_port }}"], ctx.root),
      );
      const ports = await allocatePorts(ctx.shared, ctx.root, seed);
      const state = {
        version: VERSION,
        root: ctx.root,
        branch: ctx.branch,
        base: previous?.base ?? base,
        baseCommit: previous?.baseCommit ?? ctx.commit,
        target: previous?.target ?? base,
        owner: previous?.owner ?? process.env.STARTER_WORKTREE_OWNER ?? process.env.USER ?? "local",
        purpose: previous?.purpose ?? process.env.STARTER_WORKTREE_PURPOSE ?? ctx.branch,
        mode,
        ports,
        token: previous?.token ?? randomBytes(32).toString("hex"),
        preparedAt: new Date().toISOString(),
        setupMs: Date.now() - started,
      };
      await writeJson(ctx.statePath, state);
      await setVariables(ctx.root, {
        owner: state.owner,
        purpose: state.purpose,
        "base-commit": state.baseCommit,
        target: state.target,
        mode,
        ports,
        url: `http://127.0.0.1:${mode === "connected" ? ports.app : ports.fixture}`,
        readiness: "prepared",
      });
      console.log(
        JSON.stringify({ root: ctx.root, branch: ctx.branch, mode, ports, setupMs: state.setupMs }),
      );
    },
  );
}
function expected(ctx, state, kind) {
  return { root: ctx.root, commit: ctx.commit, instance: state.instance, kind };
}
export async function ready(ctx, state) {
  await probe(
    `http://127.0.0.1:${state.ports.fixture}`,
    state.token,
    expected(ctx, state, "fixture"),
  );
  if (state.mode === "connected")
    await probe(`http://127.0.0.1:${state.ports.app}`, state.token, expected(ctx, state, "app"));
}
function processInfo(pid) {
  try {
    const line = capture("ps", [
      "-p",
      String(pid),
      "-o",
      "lstart=",
      "-o",
      "pgid=",
      "-o",
      "command=",
    ]);
    const match = /^(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(\d+)\s+(.+)$/.exec(
      line,
    );
    return match ? { stamp: match[1], pgid: Number(match[2]), command: match[3] } : undefined;
  } catch {
    return undefined;
  }
}
function processStamp(pid) {
  return processInfo(pid)?.stamp ?? "";
}
function terminate(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
/** Stops recorded processes after one atomic process snapshot; an already-exited process is harmless. */
export async function stop(ctx, state) {
  const groupFile = join(ctx.root, ".data/worktrunk-process.json");
  const group = await readJson(groupFile);
  const groupInfo = group && processInfo(group.pid);
  if (groupInfo) {
    if (
      group.instance !== state.instance ||
      groupInfo.stamp !== group.stamp ||
      groupInfo.pgid !== group.pid ||
      !groupInfo.command.includes(join(ctx.root, "scripts/worktree.mjs"))
    )
      throw Error("Recorded server group identity changed; refuse to signal it.");
    terminate(-group.pid);
    for (let i = 0; i < 100 && processStamp(group.pid); i++) await sleep(100);
    if (processStamp(group.pid))
      throw Error("Server group did not stop; inspect it before retrying.");
  }
  await rm(groupFile, { force: true });
  const owned = state.process;
  const info = owned && processInfo(owned.pid);
  if (info) {
    if (
      info.stamp !== owned.stamp ||
      !info.command.includes(join(ctx.root, "scripts/worktree.mjs"))
    )
      throw Error("Recorded process identity changed; refuse to signal it.");
    terminate(owned.pid);
    for (let i = 0; i < 100 && processStamp(owned.pid); i++) await sleep(100);
    if (processStamp(owned.pid))
      throw Error("Server did not stop. Inspect its process before retrying.");
  }
  delete state.process;
  delete state.instance;
  await writeJson(ctx.statePath, state);
  await setVariables(ctx.root, { readiness: "stopped" });
}
/** Starts tethered services and waits for their authenticated checkout identities. */
export async function dev(action = "start") {
  const { ctx, state } = await load();
  return withLock(
    ctx.shared,
    `dev-${createHash("sha256").update(ctx.root).digest("hex").slice(0, 16)}`,
    async () => {
      if (action === "stop" || action === "restart") await stop(ctx, state);
      if (action === "stop") return;
      if (!["start", "restart"].includes(action)) throw Error("Use wt dev [start|stop|restart].");
      if (state.process) {
        try {
          await ready(ctx, state);
          console.log("Existing worktree servers are ready.");
          return;
        } catch {
          throw Error("Existing server is stale or stopped. Run wt dev restart.");
        }
      }
      for (const key of state.mode === "connected" ? ["app", "fixture", "hmr"] : ["fixture"])
        if (!(await available(state.ports[key])))
          throw Error(
            `Reserved ${key} port is occupied. Stop the other listener, or run wt ports-reset after wt dev stop.`,
          );
      state.instance = randomUUID();
      state.serverCommit = ctx.commit;
      await writeJson(ctx.statePath, state);
      const log = await open(join(ctx.root, ".data", "worktrunk-server.log"), "a", 0o600);
      const child = spawn(
        "wt",
        ["step", "tether", "--", process.execPath, join(ctx.root, "scripts/worktree.mjs"), "serve"],
        { cwd: ctx.root, detached: true, stdio: ["ignore", log.fd, log.fd], env: process.env },
      );
      await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      state.process = { pid: child.pid, stamp: processStamp(child.pid) };
      await writeJson(ctx.statePath, state);
      child.unref();
      await log.close();
      await setVariables(ctx.root, { readiness: "starting" });
      let failure;
      for (let i = 0; i < 120; i++) {
        try {
          await ready(ctx, state);
          await setVariables(ctx.root, { readiness: "ready" });
          console.log(
            JSON.stringify({
              root: ctx.root,
              mode: state.mode,
              fixtureUrl: `http://127.0.0.1:${state.ports.fixture}`,
              appUrl: state.mode === "connected" ? `http://127.0.0.1:${state.ports.app}` : null,
            }),
          );
          return;
        } catch (error) {
          failure = error;
          await sleep(250);
        }
      }
      await setVariables(ctx.root, { readiness: "failed" });
      throw Error(
        `Server readiness failed: ${failure.message}. Inspect .data/worktrunk-server.log; run wt dev restart.`,
      );
    },
  );
}
export function environment(ctx, state) {
  return {
    ...process.env,
    PORT: String(state.ports.app),
    STARTER_HMR_PORT: String(state.ports.hmr),
    CODING_WORKSPACE: join(ctx.root, "workspace"),
    STARTER_WORKTREE_ROOT: ctx.root,
    STARTER_WORKTREE_COMMIT: ctx.commit,
    STARTER_WORKTREE_INSTANCE: state.instance,
    STARTER_WORKTREE_TOKEN: state.token,
    STARTER_WORKTREE_MODE: state.mode,
    FILE_VIEWER_APP_URL: `http://127.0.0.1:${state.ports.app}`,
    FILE_VIEWER_FIXTURE_URL: `http://127.0.0.1:${state.ports.fixture}`,
  };
}
/** Foreground supervisor under Worktrunk tether; either service exiting stops its siblings. */
export async function serve() {
  const { ctx, state } = await load();
  const env = environment(ctx, state);
  await writeJson(join(ctx.root, ".data/worktrunk-process.json"), {
    pid: process.pid,
    stamp: processStamp(process.pid),
    instance: state.instance,
  });
  const children = [];
  const launch = (args) => spawn("pnpm", args, { cwd: ctx.root, env, stdio: "inherit" });
  children.push(
    launch([
      "exec",
      "vite",
      "--config",
      "e2e/fixtures/vite.config.ts",
      "--port",
      String(state.ports.fixture),
    ]),
  );
  if (state.mode === "connected") children.push(launch(["dev"]));
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    for (const child of children) child.kill("SIGTERM");
  };
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve, reject) => {
          child.once("error", (error) => {
            close();
            reject(error);
          });
          child.once("exit", (code) => {
            const intentional = closing;
            close();
            if (code === 0 || intentional) resolve();
            else reject(Error(`Service exited (${code})`));
          });
        }),
    ),
  );
}
export async function doctor() {
  const { ctx, state } = await load();
  const locks = (await readdir(ctx.shared)).filter((name) => name.endsWith(".lock"));
  try {
    await ready(ctx, state);
    await setVariables(ctx.root, { readiness: "ready" });
    console.log(
      JSON.stringify({
        root: ctx.root,
        branch: ctx.branch,
        owner: state.owner,
        purpose: state.purpose,
        target: state.target,
        mode: state.mode,
        ports: state.ports,
        locks,
        ready: true,
      }),
    );
  } catch (error) {
    await setVariables(ctx.root, { readiness: "not-ready" });
    throw Error(
      `${error.message} Locks: ${locks.join(", ") || "none"}. Run wt dev restart; if setup is missing run wt setup.`,
    );
  }
}
/** Runs deterministic checks and browser tests against this checkout only. */
export async function check(args = []) {
  const { ctx, state } = await load();
  await run("pnpm", ["check"], ctx.root);
  await run(process.execPath, ["--test", "example/greet.test.js"], ctx.root);
  if (state.serverCommit && state.serverCommit !== ctx.commit) await dev("restart");
  else await dev("start");
  const current = await load();
  await ready(current.ctx, current.state);
  const selected = args.length ? args : ["e2e/worktree.spec.ts"];
  await run(
    "pnpm",
    ["exec", "playwright", "test", ...selected],
    ctx.root,
    environment(current.ctx, current.state),
  );
  await run("git", ["diff", "--check"], ctx.root);
}
/** Keeps private artifacts outside the worktree before allowing removal. */
export async function archive() {
  const { ctx, state } = await load();
  await stop(ctx, state);
  const destination = join(
    ctx.shared,
    "archives",
    `${createHash("sha256").update(ctx.root).digest("hex").slice(0, 12)}-${Date.now()}`,
  );
  await mkdir(destination, { recursive: true, mode: 0o700 });
  for (const name of [".data", "workspace", "test-results", "playwright-report"]) {
    try {
      await cp(join(ctx.root, name), join(destination, name), {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  state.archive = destination;
  // Record the complete private-artifact fingerprint, so later edits invalidate this archive.
  state.archiveDigest = await artifactDigest(ctx.root);
  await writeJson(ctx.statePath, state);
  console.log(`Private evidence archived at ${destination}`);
}
async function artifactDigest(root) {
  const hash = createHash("sha256");
  async function walk(path, relative) {
    let entries;
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${relative}/${entry.name}`;
      if (
        name === ".data/worktrunk.json" ||
        name === ".data/worktrunk-server.log" ||
        name.startsWith(".data/vite-")
      )
        continue;
      if (entry.isSymbolicLink()) {
        hash.update(name);
        continue;
      }
      if (entry.isDirectory()) await walk(join(path, entry.name), name);
      else {
        hash.update(name);
        hash.update(await readFile(join(path, entry.name)));
      }
    }
  }
  for (const name of [".data", "workspace", "test-results", "playwright-report"])
    await walk(join(root, name), name);
  return hash.digest("hex");
}
export async function preRemove() {
  const { ctx, state } = await load();
  if (state.owner !== (process.env.STARTER_WORKTREE_OWNER ?? process.env.USER ?? "local"))
    throw Error("Task belongs to another owner. Hand it off before removal.");
  if (state.process)
    throw Error("Stop the server and archive private artifacts with wt archive before removal.");
  if (!state.archive || state.archiveDigest !== (await artifactDigest(ctx.root)))
    throw Error("Private artifacts need a current archive. Run wt archive before removal.");
  await realpath(state.archive);
}
export async function releasePorts(root) {
  const ctx = await context();
  await withLock(
    ctx.shared,
    "ports",
    async () => {
      const file = join(ctx.shared, "ports.json");
      const registry = await readJson(file, {});
      delete registry[root];
      await writeJson(file, registry);
    },
    10000,
  );
}
