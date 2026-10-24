import { execFile } from "node:child_process";
import { open, opendir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { parseGitStatus, type WorkspaceGitStatus } from "./file-status.js";
const execute = promisify(execFile);
/** Keeps private dotfiles and parent traversal out of the browser's file preview. */
function visible(path: string): boolean {
  return (
    Boolean(path) && !isAbsolute(path) && !path.split(/[\\/]/).some((part) => part.startsWith("."))
  );
}
/** Walks plain folders without following symlinks or entering dependency/private trees. */
async function listPlainFolder(
  root: string,
): Promise<{ files: string[]; truncated: boolean; git?: WorkspaceGitStatus }> {
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
    let git: WorkspaceGitStatus;
    try {
      const options = {
        cwd: root,
        timeout: 5000,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0" },
      };
      const [{ stdout: prefix }, { stdout: status }] = await Promise.all([
        execute("git", ["rev-parse", "--show-prefix"], options),
        execute(
          "git",
          [
            "-c",
            "core.fsmonitor=",
            "-c",
            "core.hooksPath=",
            "status",
            "--porcelain=v1",
            "-z",
            "--untracked-files=all",
            "--",
            ".",
          ],
          options,
        ),
      ]);
      git = { available: true, entries: parseGitStatus(status, prefix.replace(/\n$/, "")) };
    } catch {
      // A timeout/unsupported status command must not turn unavailable status into "clean".
      git = { available: false, entries: {} };
    }
    const paths = [
      ...new Set([...stdout.split("\0").filter(visible), ...Object.keys(git.entries)]),
    ].sort();
    const files = paths.slice(0, 1000);
    git.entries = Object.fromEntries(
      files
        .filter((path) => Object.hasOwn(git.entries, path))
        .map((path) => [path, git.entries[path]!]),
    );
    return { files, truncated: paths.length > 1000, git };
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
/** Reads bounded UTF-8 source; binary and invalid text use the asset viewer instead. */
export async function readWorkspaceFile(root: string, path: string) {
  const bytes = await readBoundedWorkspaceFile(
    root,
    path,
    256 * 1024,
    "Text previews are limited to 256 KiB.",
  );
  const content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  if (content.includes("\0")) throw new Error("Binary files cannot be previewed as text.");
  return { path, content };
}

/** Reads at most 20 MiB for local viewers/downloads, never following private or outside targets. */
export function readWorkspaceAsset(root: string, path: string): Promise<Buffer> {
  return readBoundedWorkspaceFile(
    root,
    path,
    20 * 1024 * 1024,
    "File viewing and downloads are limited to 20 MiB.",
  );
}

/** Resolves the path before opening and bounds every read even if the file grows. */
async function readBoundedWorkspaceFile(
  root: string,
  path: string,
  limit: number,
  limitMessage: string,
): Promise<Buffer> {
  if (!visible(path)) throw new Error("File is outside the preview boundary.");
  const base = await realpath(root);
  const target = await realpath(resolve(base, path));
  const within = relative(base, target);
  if (!visible(within)) throw new Error("File is outside the preview boundary.");
  const handle = await open(target, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit) throw new Error(limitMessage);
    const bytes = Buffer.alloc(Math.min(info.size + 1, limit + 1));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > info.size) throw new Error("File changed while reading. Refresh and try again.");
    return bytes.subarray(0, offset);
  } finally {
    await handle.close();
  }
}
