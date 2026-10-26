// Opt-in lifecycle acceptance. Real Git worktrees, pnpm installs, Worktrunk hooks and TCP listeners.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { available, context, probe, readJson, sleep, writeJson } from "./core.mjs";
import { environment } from "./lifecycle.mjs";

const ctx = await context();
const directory = await realpath(await mkdtemp(join(tmpdir(), "starter-worktrunk-acceptance-")));
const id = Date.now().toString(36);
const evidence = join(ctx.shared, "acceptance", id);
await mkdir(evidence, { recursive: true });
const report = {
  commit: ctx.commit,
  startedAt: new Date().toISOString(),
  directory,
  checks: [],
  worktrees: [],
};
const env = {
  ...process.env,
  WORKTRUNK_WORKTREE_PATH: `${directory}/{{ branch | sanitize }}`,
  STARTER_WORKTREE_MODE: "fixture",
};
const record = (name, detail) => {
  report.checks.push({ name, detail });
  console.log(`PASS ${name}`);
};
async function command(cwd, program, args, expected = 0, childEnv = env) {
  const file = join(evidence, `${report.checks.length}-${randomUUID()}.log`);
  const log = await open(file, "w", 0o600);
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(program, args, { cwd, env: childEnv, stdio: ["ignore", log.fd, log.fd] });
      child.once("error", reject);
      child.once("exit", (code) => resolve(code));
    });
    if (expected === 0)
      assert.equal(result, 0, `${program} ${args.join(" ")} failed; inspect ${file}`);
    else assert.notEqual(result, 0, `Expected failure: ${program} ${args.join(" ")}`);
    return readFile(file, "utf8");
  } finally {
    await log.close();
  }
}
async function waitReady(root) {
  for (let i = 0; i < 160; i++) {
    const state = await readJson(join(root, ".data/worktrunk.json"));
    try {
      await probe(`http://127.0.0.1:${state.ports.fixture}`, state.token, {
        root,
        commit: ctx.commit,
        instance: state.instance,
        kind: "fixture",
      });
      return state;
    } catch {
      await sleep(250);
    }
  }
  throw Error(`Readiness timeout in ${root}`);
}
try {
  const started = Date.now();
  const creations = await Promise.allSettled(
    ["a", "b", "c"].map(async (suffix) => {
      const branch = `verify/wt-${id}-${suffix}`;
      const root = join(directory, branch.replaceAll("/", "-"));
      report.worktrees.push({ branch, root });
      await command(ctx.root, "wt", [
        "--yes",
        "switch",
        "--create",
        branch,
        "--base",
        ctx.branch,
        "--no-cd",
      ]);
      await waitReady(root);
    }),
  );
  const failedCreation = creations.find((result) => result.status === "rejected");
  if (failedCreation) throw failedCreation.reason;
  report.parallelSetupMs = Date.now() - started;
  const [a, b, c] = report.worktrees;
  const states = await Promise.all(
    report.worktrees.map(({ root }) => readJson(join(root, ".data/worktrunk.json"))),
  );
  assert.equal(new Set(states.flatMap((state) => Object.values(state.ports))).size, 9);
  for (const { root } of report.worktrees) await command(root, "wt", ["--yes", "doctor"]);
  record("three simultaneous worktrees", {
    setupMs: report.parallelSetupMs,
    distinctPorts: 9,
    commandsPerTask: 2,
  });
  const stateA = states[0];
  const stateB = states[1];
  const wrongEnv = {
    ...environment(await context(a.root), stateA),
    ...env,
    FILE_VIEWER_FIXTURE_URL: `http://127.0.0.1:${stateB.ports.fixture}`,
  };
  const rejected = await command(
    a.root,
    "pnpm",
    ["exec", "playwright", "test", "e2e/worktree.spec.ts"],
    1,
    wrongEnv,
  );
  assert.match(rejected, /identity request failed|identity mismatch/);
  record("browser suite rejects another checkout");
  await command(a.root, "pnpm", ["exec", "playwright", "test", "e2e/worktree.spec.ts"], 0, {
    ...env,
    ...environment(await context(a.root), stateA),
  });
  record("managed browser smoke");
  await command(b.root, "wt", ["--yes", "dev", "stop"]);
  await writeFile(join(b.root, ".env"), "CODING_WORKSPACE=workspace\n");
  const failed = await command(b.root, "wt", ["--yes", "setup", ctx.branch, "connected"], 1);
  assert.match(failed, /needs INTELLIGENCE_API_URL/);
  await command(b.root, "wt", ["--yes", "setup", ctx.branch, "fixture"]);
  await command(b.root, "wt", ["--yes", "dev"]);
  record("failed setup leaves checkout and supports retry");
  await command(b.root, "wt", ["--yes", "dev", "stop"]);
  assert.equal(await available(stateB.ports.fixture), true);
  await command(b.root, "wt", ["--yes", "dev"]);
  record("stop releases the server port and restart succeeds");
  const group = await readJson(join(c.root, ".data/worktrunk-process.json"));
  process.kill(-group.pid, "SIGKILL");
  await sleep(500);
  await command(c.root, "wt", ["--yes", "doctor"], 1);
  await command(c.root, "wt", ["--yes", "dev", "restart"]);
  record("interrupted server recovers");
  await writeFile(
    join(a.root, "workspace", "acceptance-private.txt"),
    "preserve this private edit",
  );
  const denied = await command(ctx.root, "wt", ["--yes", "remove", a.branch, "--foreground"], 1);
  assert.match(denied, /archive|Stop the server/);
  await command(a.root, "wt", ["--yes", "archive"]);
  const archived = await readJson(join(a.root, ".data/worktrunk.json"));
  assert.equal(
    await readFile(join(archived.archive, "workspace", "acceptance-private.txt"), "utf8"),
    "preserve this private edit",
  );
  await writeFile(join(a.root, "workspace", "acceptance-private.txt"), "later edit");
  await command(ctx.root, "wt", ["--yes", "remove", a.branch, "--foreground"], 1);
  await command(a.root, "wt", ["--yes", "archive"]);
  record("cleanup refuses missing and stale private archives");
  for (const { branch, root } of report.worktrees) {
    await command(root, "wt", ["--yes", "archive"]);
    await command(ctx.root, "wt", ["--yes", "remove", branch, "--foreground"]);
  }
  for (const state of states) assert.equal(await available(state.ports.fixture), true);
  record("foreground removal preserves archives and releases ports");
  report.completedAt = new Date().toISOString();
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  await writeJson(join(evidence, "report.json"), report);
  console.log(`Evidence: ${evidence}`);
}
