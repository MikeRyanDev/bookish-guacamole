import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "vitest";
import { listWorkspaceFiles } from "../src/server/workspaces/files.js";

test("Git file discovery returns scoped staged, unstaged, renamed, deleted, and untracked status", async () => {
  const root = await mkdtemp(join(tmpdir(), "git-tree-"));
  const git = (...args: string[]) =>
    promisify(execFile)(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args],
      { cwd: root },
    );
  try {
    await git("init", "-q");
    await mkdir(join(root, "project"));
    for (const path of ["modified.ts", "removed.ts", "renamed.ts", "clean.ts"])
      await writeFile(join(root, "project", path), `${path} before\n`);
    await writeFile(join(root, "outside.ts"), "outside");
    await git("add", ".");
    await git("commit", "-qm", "fixture");
    await writeFile(join(root, "project/modified.ts"), "after\n");
    await git("mv", "project/renamed.ts", "project/new name.ts");
    await git("rm", "project/removed.ts");
    await writeFile(join(root, "project/untracked\nname.ts"), "new");
    await writeFile(join(root, "project/.secret"), "private");
    await writeFile(join(root, "outside.ts"), "changed");
    const result = await listWorkspaceFiles(join(root, "project"));
    expect(result).toMatchObject({
      git: {
        available: true,
        entries: {
          "modified.ts": " M",
          "removed.ts": "D ",
          "new name.ts": "R ",
          "untracked\nname.ts": "??",
        },
      },
    });
    expect(result.files).toContain("removed.ts");
    expect(result.files).not.toContain("renamed.ts");
    expect(JSON.stringify(result)).not.toMatch(/outside|secret/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
