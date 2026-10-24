import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { browseWorkspace, searchWorkspace } from "../src/workspace-discovery.js";

for (const repository of [false, true]) {
  test(`${repository ? "Git" : "plain"} discovery pages every file and searches beyond 1,000`, async () => {
    const root = await mkdtemp(join(tmpdir(), "browse-"));
    try {
      if (repository) await promisify(execFile)("git", ["init", "-q", root]);
      await mkdir(join(root, "many"));
      await mkdir(join(root, "empty"));
      await Promise.all(
        Array.from({ length: 1105 }, (_, i) =>
          writeFile(join(root, "many", `file-${String(i).padStart(4, "0")}.ts`), ""),
        ),
      );
      await writeFile(join(root, ".secret"), "");
      await symlink(tmpdir(), join(root, "outside"));
      const top = await browseWorkspace(root, {});
      expect(top.entries.map((entry) => entry.path)).toEqual(["empty", "many"]);
      expect(top.entries.every((entry) => entry.kind === "directory")).toBe(true);
      const paths: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await browseWorkspace(root, { directory: "many", cursor });
        expect(page.entries.length).toBeLessThanOrEqual(100);
        paths.push(...page.entries.map((entry) => entry.path));
        cursor = page.nextCursor;
      } while (cursor);
      expect(paths).toHaveLength(1105);
      expect(new Set(paths).size).toBe(1105);
      expect((await searchWorkspace(root, { query: "FILE-1104" })).files).toEqual([
        "many/file-1104.ts",
      ]);
      const matches: string[] = [];
      cursor = undefined;
      do {
        const page = await searchWorkspace(root, { query: "file-", cursor });
        matches.push(...page.files);
        cursor = page.nextCursor;
      } while (cursor);
      expect(matches).toEqual(paths);
      expect((await searchWorkspace(root, { query: "secret" })).files).toEqual([]);
      await expect(browseWorkspace(root, { directory: "outside" })).rejects.toThrow();
      await expect(browseWorkspace(root, { directory: "../" })).rejects.toThrow();
      await expect(browseWorkspace(root, { directory: ".git" })).rejects.toThrow();
      const first = await browseWorkspace(root, { directory: "many" });
      await expect(browseWorkspace(root, { cursor: first.nextCursor })).rejects.toThrow(/cursor/i);
      const signal = AbortSignal.abort();
      await expect(searchWorkspace(root, { query: "file", signal })).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("Git ignores, tracked exceptions, deleted files and folder status survive lazy discovery", async () => {
  const root = await mkdtemp(join(tmpdir(), "browse-git-"));
  const git = (...args: string[]) =>
    promisify(execFile)(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args],
      { cwd: root },
    );
  try {
    await git("init", "-q");
    await mkdir(join(root, "src"));
    await mkdir(join(root, "ignored"));
    await writeFile(join(root, ".gitignore"), "ignored/\n");
    await writeFile(join(root, "ignored/kept.ts"), "tracked");
    await writeFile(join(root, "ignored/hidden.ts"), "hidden");
    await writeFile(join(root, "src/deleted.ts"), "deleted");
    await git("add", ".");
    await git("add", "-f", "ignored/kept.ts");
    await git("commit", "-qm", "fixture");
    await git("rm", "src/deleted.ts");
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src/added.ts"), "new");
    await git("add", "src/added.ts");
    expect((await browseWorkspace(root, {})).git?.directories?.src).toEqual(["D ", "A "]);
    expect((await browseWorkspace(root, {})).entries.map((entry) => entry.path)).toEqual([
      "ignored",
      "src",
    ]);
    const page = await browseWorkspace(root, { directory: "src" });
    expect(page.entries).toContainEqual({ path: "src/deleted.ts", kind: "file" });
    expect(page.git?.entries["src/deleted.ts"]).toBe("D ");
    expect((await searchWorkspace(root, { query: ".ts" })).files).toEqual([
      "ignored/kept.ts",
      "src/added.ts",
      "src/deleted.ts",
    ]);
    expect(
      (await browseWorkspace(root, { directory: "ignored" })).entries.map((entry) => entry.path),
    ).toEqual(["ignored/kept.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plain-folder search crosses 10,000 entries without a silent traversal cutoff", async () => {
  const root = await mkdtemp(join(tmpdir(), "browse-deep-"));
  try {
    for (let start = 0; start < 10020; start += 100) {
      await Promise.all(
        Array.from({ length: 100 }, (_, offset) => mkdir(join(root, `dir-${start + offset}`))),
      );
    }
    await writeFile(join(root, "dir-0/needle.ts"), "found");
    expect((await searchWorkspace(root, { query: "needle" })).files).toEqual(["dir-0/needle.ts"]);
    const controller = new AbortController();
    const pending = searchWorkspace(root, { query: "needle", signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
