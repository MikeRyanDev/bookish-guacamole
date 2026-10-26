import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const execute = promisify(execFile);

test("sample files stay discoverable when the parent repository ignores the workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "starter-workspace-"));
  try {
    await execute("git", ["init", "--quiet", root]);
    await writeFile(join(root, ".gitignore"), "workspace/\n");
    await cp("example", join(root, "example"), { recursive: true });
    await execute(process.execPath, [resolve("scripts/create-workspace.mjs")], {
      cwd: root,
    });
    const files = await execute("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: join(root, "workspace"),
    });
    expect(files.stdout.split("\n")).toContain("greet.js");
    await writeFile(join(root, "workspace/greet.js"), "user edit\n");
    await expect(
      execute(process.execPath, [resolve("scripts/create-workspace.mjs")], {
        cwd: root,
      }),
    ).rejects.toThrow();
    expect(await readFile(join(root, "workspace/greet.js"), "utf8")).toBe("user edit\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
