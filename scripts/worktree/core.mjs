import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseEnv } from "node:util";

export const VERSION = "0.81.0";
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Executes argv directly. Captured output must never contain private configuration. */
export function capture(command, args, cwd = process.cwd()) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
/** Runs a command with inherited output and waits for a successful exit. */
export function run(command, args, cwd = process.cwd(), env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0 ? resolve() : reject(Error(`${command} failed (${signal ?? code})`)),
    );
  });
}
export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}
/** Atomically replaces private metadata; readers never see a partial JSON document. */
export async function writeJson(path, value) {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await rename(temp, path);
}
/** Exclusive repository lock. Dead owners are reported, never silently displaced. */
export async function withLock(directory, name, action, waitMs = 0) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, `${name}.lock`);
  const deadline = Date.now() + waitMs;
  let handle;
  while (!handle) {
    try {
      handle = await open(path, "wx", 0o600);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw Error(
          `${name} busy: ${path}. Run wt doctor; retry after the owner exits. For a dead owner use wt unlock ${name}.`,
        );
      await sleep(50);
    }
  }
  try {
    await handle.writeFile(
      JSON.stringify({
        pid: process.pid,
        root: process.cwd(),
        createdAt: new Date().toISOString(),
      }),
    );
    return await action();
  } finally {
    await handle.close();
    await rm(path);
  }
}
export async function context(root = process.cwd()) {
  root = await realpath(capture("git", ["rev-parse", "--show-toplevel"], root));
  const common = await realpath(
    capture("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], root),
  );
  return {
    root,
    common,
    shared: join(common, "starter-worktrunk"),
    statePath: join(root, ".data", "worktrunk.json"),
    branch: capture("git", ["branch", "--show-current"], root),
    commit: capture("git", ["rev-parse", "HEAD"], root),
  };
}
export async function available(port) {
  const server = createServer();
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
/** Reserves three distinct ports across this repository; startup still checks actual binds. */
export async function allocatePorts(directory, root, seed) {
  return withLock(
    directory,
    "ports",
    async () => {
      const path = join(directory, "ports.json");
      const registry = await readJson(path, {});
      if (registry[root]) return registry[root];
      const used = new Set(Object.values(registry).flatMap(Object.values));
      const result = {};
      let candidate = 10000 + ((((seed - 10000) % 40000) + 40000) % 40000);
      for (const name of ["app", "fixture", "hmr"]) {
        let found = false;
        for (let attempt = 0; attempt < 40000; attempt++) {
          const port = candidate;
          candidate = 10000 + ((candidate - 9999) % 40000);
          if (!used.has(port) && (await available(port))) {
            result[name] = port;
            used.add(port);
            found = true;
            break;
          }
        }
        if (!found) throw Error("No available worktree ports");
      }
      registry[root] = result;
      await writeJson(path, registry);
      return result;
    },
    10000,
  );
}
/** Refuses copied path overrides that escape this checkout. Does not print their values. */
export async function checkPrivatePaths(root) {
  let env;
  try {
    env = parseEnv(await readFile(join(root, ".env"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const name of ["CODING_WORKSPACE", "CODING_MODELS_FILE", "LEARNING_MODELS_FILE"]) {
    if (!env[name]) continue;
    const path = resolve(root, env[name]);
    const rel = relative(root, path);
    if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
      throw Error(`${name} points outside this checkout. Correct .env, then run wt setup.`);
    try {
      const actual = await realpath(path);
      const r = relative(root, actual);
      if (r === ".." || r.startsWith("../") || isAbsolute(r))
        throw Error(`${name} resolves outside this checkout. Correct .env, then run wt setup.`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}
/** Binds a request to a checkout, revision, server kind and startup instance. */
export function assertIdentity(actual, expected) {
  for (const key of ["root", "commit", "instance", "kind"])
    if (actual?.[key] !== expected[key])
      throw Error(`Worktree identity mismatch (${key}); refuse this server. Run wt dev restart.`);
}
export async function probe(url, token, expected) {
  if (expected.kind === "app") {
    const bootstrap = await fetch(`${url}/api/config`, { signal: AbortSignal.timeout(1500) });
    if (!bootstrap.ok) throw Error(`Bootstrap failed: HTTP ${bootstrap.status}`);
    token = (await bootstrap.json()).token;
  }
  const response = await fetch(
    `${url}${expected.kind === "app" ? "/api/worktree-identity" : "/__worktree"}`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(1500) },
  );
  if (!response.ok) throw Error(`Identity request failed: HTTP ${response.status}`);
  assertIdentity(await response.json(), expected);
}
