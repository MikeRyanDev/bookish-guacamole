import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { withLock, allocatePorts, assertIdentity, checkPrivatePaths } from "./core.mjs";

test("parallel allocations are distinct and skip an occupied port", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wt-ports-"));
  const server = createServer();
  await new Promise((resolve) => server.listen(18000, "127.0.0.1", resolve));
  try {
    const results = await Promise.all(
      ["a", "b", "c"].map((name) => allocatePorts(dir, name, 18000)),
    );
    const ports = results.flatMap(Object.values);
    assert.equal(new Set(ports).size, 9);
    assert.ok(!ports.includes(18000));
    assert.deepEqual(await allocatePorts(dir, "a", 18000), results[0]);
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("integration locks serialize requests and release after failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wt-lock-"));
  let release;
  const first = withLock(
    dir,
    "finish",
    async () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  while (!release) await new Promise((resolve) => setTimeout(resolve, 10));
  await assert.rejects(
    withLock(dir, "finish", async () => {}),
    /busy/,
  );
  release();
  await first;
  await assert.rejects(
    withLock(dir, "finish", async () => {
      throw Error("failed");
    }),
    /failed/,
  );
  await withLock(dir, "finish", async () => {});
  await rm(dir, { recursive: true, force: true });
});

test("identity rejects another checkout, revision, mode and server instance", () => {
  const expected = { root: "/repo/a", commit: "abc", instance: "one", kind: "fixture" };
  assertIdentity(expected, expected);
  for (const key of Object.keys(expected))
    assert.throws(() => assertIdentity({ ...expected, [key]: "wrong" }, expected), /identity/);
});

test("private configuration rejects outside paths without revealing secrets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wt-private-"));
  await writeFile(
    join(dir, ".env"),
    "API_KEY=never-print-me\nCODING_WORKSPACE=/another/checkout\n",
  );
  await assert.rejects(
    checkPrivatePaths(dir),
    (error) => /CODING_WORKSPACE/.test(error.message) && !error.message.includes("never-print-me"),
  );
  await writeFile(join(dir, ".env"), "CODING_WORKSPACE=workspace\n");
  await checkPrivatePaths(dir);
  assert.equal(await readFile(join(dir, ".env"), "utf8"), "CODING_WORKSPACE=workspace\n");
  await rm(dir, { recursive: true, force: true });
});

test("dirty integration target refuses merge, with narrow preservation for unrelated tracked edits", async () => {
  const { execFileSync } = await import("node:child_process");
  const { targetSnapshot } = await import("./finish.mjs");
  const root = await mkdtemp(join(tmpdir(), "wt-target-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe", encoding: "utf8" });
  try {
    git("init", "-b", "main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    await writeFile(join(root, "notes"), "original");
    git("add", ".");
    git("commit", "-m", "base");
    git("branch", "feature");
    await writeFile(join(root, "notes"), "private user edit");
    assert.throws(() => targetSnapshot(root, "feature", "main"), /dirty/);
    const before = targetSnapshot(root, "feature", "main", ["notes"]);
    assert.ok(before);
    assert.equal(targetSnapshot(root, "feature", "main", ["notes"]), before);
    await writeFile(join(root, "untracked"), "keep");
    assert.throws(() => targetSnapshot(root, "feature", "main", ["notes"]), /dirty/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
