import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { listWorkspaceFiles, readWorkspaceFile } from "../src/workspace.js";

test("file previews refuse traversal, private files and symlinks outside the workspace", async () => {
  const parent = await mkdtemp(join(tmpdir(), "workspace-api-"));
  const root = join(parent, "project");
  await mkdir(root);
  await writeFile(join(root, "hello.ts"), "export const hello = 1;");
  await writeFile(join(parent, "private.txt"), "private");
  await writeFile(join(root, ".env"), "private");
  await symlink(join(parent, "private.txt"), join(root, "escape.txt"));
  try {
    expect(await readWorkspaceFile(root, "hello.ts")).toEqual({
      path: "hello.ts",
      content: "export const hello = 1;",
    });
    for (const path of ["../private.txt", ".env", "escape.txt"])
      await expect(readWorkspaceFile(root, path)).rejects.toThrow();
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("folders without Git list source files without walking private paths or dependency trees", async () => {
  const root = await mkdtemp(join(tmpdir(), "workspace-files-"));
  try {
    await mkdir(join(root, "src"));
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "src", "hello.ts"), "export const hello=1;");
    await writeFile(join(root, ".env"), "private");
    await writeFile(join(root, "node_modules", "ignored.js"), "ignored");
    await symlink(join(root, "src"), join(root, "linked"));
    await mkdir(join(root, ".private"));
    await writeFile(join(root, ".private", "hidden.txt"), "private");

    expect(await listWorkspaceFiles(root)).toEqual({ files: ["src/hello.ts"], truncated: false });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plain-folder discovery caps its response and reports omitted files", async () => {
  const root = await mkdtemp(join(tmpdir(), "workspace-limit-"));
  try {
    await Promise.all(
      Array.from({ length: 1001 }, (_, index) =>
        writeFile(join(root, `file-${index}.txt`), "text"),
      ),
    );
    const result = await listWorkspaceFiles(root);
    expect(result.files).toHaveLength(1000);
    expect(result.truncated).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing folders report an error instead of an empty workspace", async () => {
  const parent = await mkdtemp(join(tmpdir(), "workspace-missing-"));
  try {
    await expect(listWorkspaceFiles(join(parent, "missing"))).rejects.toThrow();
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("an opened folder ignored by its parent Git repository still lists its own files", async () => {
  const parent = await mkdtemp(join(tmpdir(), "workspace-parent-"));
  try {
    await promisify(execFile)("git", ["init", "--quiet", parent]);
    await writeFile(join(parent, ".gitignore"), "projects/\n");
    const root = join(parent, "projects");
    await mkdir(root);
    await writeFile(join(root, "hello.ts"), "export const hello=1;");
    expect(await listWorkspaceFiles(root)).toEqual({ files: ["hello.ts"], truncated: false });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
