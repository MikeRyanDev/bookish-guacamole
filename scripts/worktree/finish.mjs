import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { capture, context, readJson, run, withLock, writeJson } from "./core.mjs";
import { load } from "./lifecycle.mjs";

/** Refuses dirty targets unless named tracked edits are explicitly preserved and untouched by the source. */
export function targetSnapshot(root, source, target, preserve = []) {
  const status = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  if (!status) return "";
  const changes = status.split("\0").filter(Boolean);
  const touched = new Set(
    capture("git", ["diff", "--name-only", `${target}...${source}`], root).split("\n"),
  );
  for (const entry of changes) {
    const path = entry.slice(3);
    if (entry.slice(0, 2) !== " M" || !preserve.includes(path) || touched.has(path))
      throw Error(
        `Target worktree is dirty (${path}). Preserve unrelated work before integration.`,
      );
  }
  return createHash("sha256")
    .update(capture("git", ["diff", "--binary", "HEAD"], root))
    .digest("hex");
}
/** Serializes rebase, pre-merge checks, target update and final target checks. Never removes the source. */
export async function finish(args = []) {
  const { ctx, state } = await load();
  const target = args.find((arg) => !arg.startsWith("--")) ?? state.target;
  const preserve = args.filter((arg) => arg.startsWith("--preserve=")).map((arg) => arg.slice(11));
  if (args.some((arg) => arg.startsWith("--") && !arg.startsWith("--preserve=")))
    throw Error("Unknown finish option.");
  if (!target || target === ctx.branch)
    throw Error("Choose a different integration target with wt task target=<branch>.");
  await withLock(ctx.shared, "finish", async () => {
    if (capture("git", ["status", "--porcelain"], ctx.root))
      throw Error("Commit reviewed source changes before wt finish.");
    const listing = capture("git", ["worktree", "list", "--porcelain", "-z"], ctx.root);
    const record = listing
      .split("\0\0")
      .find((record) => record.split("\0").includes(`branch refs/heads/${target}`));
    if (!record) throw Error("Target needs an existing worktree. Create it with wt switch first.");
    const targetRoot = record
      .split("\0")
      .find((line) => line.startsWith("worktree "))
      .slice(9);
    const before = targetSnapshot(targetRoot, ctx.branch, target, preserve);
    const targetHead = capture("git", ["rev-parse", target], ctx.root);
    const env = { ...process.env, STARTER_WORKTREE_FINISH_PID: String(process.pid) };
    await run("wt", ["merge", target, "--no-commit", "--no-remove", "--yes"], ctx.root, env);
    const sourceHead = capture("git", ["rev-parse", "HEAD"], ctx.root);
    if (capture("git", ["rev-parse", "HEAD"], targetRoot) !== sourceHead)
      throw Error("Target moved unexpectedly after merge; source retained.");
    if (targetSnapshot(targetRoot, ctx.branch, target, preserve) !== before)
      throw Error("Target edits changed unexpectedly; source retained.");
    const priorState = await readJson(join(targetRoot, ".data/worktrunk.json"));
    if (priorState?.process)
      await run(process.execPath, ["scripts/worktree.mjs", "dev", "stop"], targetRoot);
    await run(process.execPath, ["scripts/worktree.mjs", "setup", target, "fixture"], targetRoot);
    await run(process.execPath, ["scripts/worktree.mjs", "check"], targetRoot);
    if (capture("git", ["rev-parse", "HEAD"], targetRoot) !== sourceHead)
      throw Error("Target changed during final checks; source retained.");
    if (targetSnapshot(targetRoot, ctx.branch, target, preserve) !== before)
      throw Error("Final checks changed target edits; source retained.");
    const result = {
      source: ctx.branch,
      target,
      previousTarget: targetHead,
      commit: sourceHead,
      checkedAt: new Date().toISOString(),
      sourceRetained: true,
    };
    await writeJson(join(ctx.shared, "last-finish.json"), result);
    console.log(JSON.stringify(result));
  });
}
/** Pre-merge hooks require the coordinator lock; direct merges cannot bypass serialization accidentally. */
export async function guardMerge() {
  const ctx = await context();
  const lock = await readJson(join(ctx.shared, "finish.lock"));
  if (!lock || String(lock.pid) !== process.env.STARTER_WORKTREE_FINISH_PID)
    throw Error("Use wt finish so target checks and integration share one lock.");
  process.kill(lock.pid, 0);
}
