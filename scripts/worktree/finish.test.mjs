import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VERSION, context, readJson, sleep, writeJson } from "./core.mjs";
import { finish } from "./finish.mjs";

let installed = true;
try {
  execFileSync("wt", ["--version"], { stdio: "pipe" });
} catch {
  installed = false;
}
async function fixture(conflict) {
  const directory = await mkdtemp(join(tmpdir(), "wt-finish-"));
  const main = join(directory, "main");
  const feature = join(directory, "feature");
  await mkdir(main);
  const git = (cwd, ...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  git(main, "init", "-b", "main");
  git(main, "config", "user.email", "test@example.com");
  git(main, "config", "user.name", "Test");
  await mkdir(join(main, ".config"));
  await writeFile(
    join(main, ".config", "wt.toml"),
    `[pre-merge]\nchecks = "node -e 'setTimeout(() => {}, 500)'"\n`,
  );
  await writeFile(join(main, ".gitignore"), ".data/\n");
  await writeFile(join(main, "shared.txt"), "base\n");
  git(main, "add", ".");
  git(main, "commit", "-m", "base");
  git(main, "worktree", "add", "-b", "feature", feature);
  await writeFile(join(feature, "shared.txt"), "feature\n");
  git(feature, "add", ".");
  git(feature, "commit", "-m", "feature");
  if (conflict) {
    await writeFile(join(main, "shared.txt"), "main\n");
    git(main, "add", ".");
    git(main, "commit", "-m", "main");
  }
  const ctx = await context(feature);
  await mkdir(join(feature, ".data"));
  await writeJson(ctx.statePath, {
    version: VERSION,
    root: ctx.root,
    branch: "feature",
    target: "main",
  });
  return { directory, main, feature: ctx.root, ctx, git };
}
test(
  "real Worktrunk conflict retains source and leaves target unchanged",
  { skip: !installed },
  async () => {
    const f = await fixture(true);
    const previous = process.cwd();
    const head = f.git(f.main, "rev-parse", "HEAD");
    try {
      process.chdir(f.feature);
      await assert.rejects(finish(), /wt failed/);
      assert.equal(f.git(f.main, "rev-parse", "HEAD"), head);
      assert.match(f.git(f.feature, "status", "--porcelain"), /UU shared.txt/);
      assert.equal(await readJson(join(f.ctx.shared, "finish.lock")), undefined);
      f.git(f.feature, "rebase", "--abort");
    } finally {
      process.chdir(previous);
      await rm(f.directory, { recursive: true, force: true });
    }
  },
);
test(
  "concurrent finish refuses second request and retains source if target checks fail",
  { skip: !installed },
  async () => {
    const f = await fixture(false);
    const previous = process.cwd();
    try {
      process.chdir(f.feature);
      // This minimal repository intentionally has no application setup script: final checks must fail.
      const first = finish().then(
        () => {
          throw Error("Expected target check failure");
        },
        (error) => error,
      );
      for (let i = 0; i < 100 && !(await readJson(join(f.ctx.shared, "finish.lock"))); i++)
        await sleep(10);
      await assert.rejects(finish(), /finish busy/);
      assert.match((await first).message, /failed/);
      assert.equal(f.git(f.main, "rev-parse", "HEAD"), f.git(f.feature, "rev-parse", "HEAD"));
      assert.equal(await readFile(join(f.feature, "shared.txt"), "utf8"), "feature\n");
      assert.equal(await readJson(join(f.ctx.shared, "last-finish.json")), undefined);
    } finally {
      process.chdir(previous);
      await rm(f.directory, { recursive: true, force: true });
    }
  },
);
