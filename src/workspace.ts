import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { type WorkspaceGitStatus } from "./file-status.js";
import { searchWorkspace } from "./workspace-discovery.js";
/** Keeps private dotfiles and parent traversal out of the browser's file preview. */
function visible(path: string): boolean {
  return (
    Boolean(path) && !isAbsolute(path) && !path.split(/[\\/]/).some((part) => part.startsWith("."))
  );
}
/** Compatibility full listing. New consumers should use paginated directory/search endpoints. */
export async function listWorkspaceFiles(root: string) {
  const files: string[] = [];
  let git: WorkspaceGitStatus | undefined;
  let cursor: string | undefined;
  do {
    const page = await searchWorkspace(root, { query: "", cursor });
    files.push(...page.files);
    if (page.git)
      git = {
        available: (git?.available ?? true) && page.git.available,
        entries: { ...git?.entries, ...page.git.entries },
      };
    cursor = page.nextCursor;
  } while (cursor);
  return { files, truncated: false, ...(git ? { git } : {}) };
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
