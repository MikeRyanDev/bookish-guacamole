import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";

export interface WorktreeIdentity {
  root: string;
  commit: string;
  instance: string;
  kind: "app" | "fixture";
}

/** Captures checkout identity at startup. Production never exposes this development endpoint. */
export function readWorktreeIdentity(kind: WorktreeIdentity["kind"]): WorktreeIdentity | undefined {
  if (process.env.NODE_ENV === "production" || !process.env.STARTER_WORKTREE_INSTANCE) return;
  const root = realpathSync(process.cwd());
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  return { root, commit, instance: process.env.STARTER_WORKTREE_INSTANCE, kind };
}
