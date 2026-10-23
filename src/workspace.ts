import { execFile } from "node:child_process";
import { opendir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
const execute = promisify(execFile);
/** Keeps private dotfiles and parent traversal out of the browser's file preview. */
function visible(path: string): boolean {
  return (
    Boolean(path) && !isAbsolute(path) && !path.split(/[\\/]/).some((part) => part.startsWith("."))
  );
}
/** Walks plain folders without following symlinks or entering dependency/private trees. */
async function listPlainFolder(root: string) {
  const files: string[] = [];
  const pending = [""];
  let visited = 0;
  let truncated = false;
  while (pending.length && !truncated) {
    const path = pending.pop()!;
    const directory = await opendir(join(root, path));
    for await (const entry of directory) {
      if (++visited > 10_000) {
        truncated = true;
        break;
      }
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const child = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) pending.push(child);
      else if (entry.isFile()) {
        if (files.length === 1000) {
          truncated = true;
          break;
        }
        files.push(child);
      }
    }
  }
  return { files: files.sort(), truncated };
}
/** Lists Git-visible paths, or bounded plain-folder files when Git is absent. */
export async function listWorkspaceFiles(root: string) {
  try {
    // A folder ignored by an ancestor repository is still an explicitly opened workspace.
    // Only test the root itself; preserve normal ignore rules within a project.
    try {
      await execute("git", ["check-ignore", "--quiet", "."], { cwd: root, timeout: 5000 });
      return listPlainFolder(root);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || ![1, 128].includes(Number(error.code)))
        throw error;
    }
    const { stdout } = await execute(
      "git",
      [
        "-c",
        "core.fsmonitor=",
        "-c",
        "core.hooksPath=",
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-standard",
      ],
      {
        cwd: root,
        maxBuffer: 4 * 1024 * 1024,
        timeout: 5000,
        env: { ...process.env, LC_ALL: "C" },
      },
    );
    const files = [...new Set(stdout.split("\0").filter(visible))].sort();
    return { files: files.slice(0, 1000), truncated: files.length > 1000 };
  } catch (error) {
    if (
      error instanceof Error &&
      "stderr" in error &&
      typeof error.stderr === "string" &&
      error.stderr.includes("fatal: not a git repository")
    ) {
      return listPlainFolder(root);
    }
    throw error;
  }
}
/** Reads bounded UTF-8 text only after resolving the real filesystem boundary. */
export async function readWorkspaceFile(root: string, path: string) {
  if (!visible(path)) throw new Error("File is outside the preview boundary.");
  const base = await realpath(root);
  const target = await realpath(resolve(base, path));
  const within = relative(base, target);
  if (within.startsWith("..") || isAbsolute(within))
    throw new Error("File is outside the preview boundary.");
  const info = await stat(target);
  if (!info.isFile() || info.size > 256 * 1024)
    throw new Error("Preview requires a text file smaller than 256 KiB.");
  const content = await readFile(target, "utf8");
  if (content.includes("\0")) throw new Error("Binary files cannot be previewed.");
  return { path, content };
}
