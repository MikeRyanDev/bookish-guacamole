import { execFile, spawn } from "node:child_process";
import { lstat, opendir, realpath } from "node:fs/promises";
import { join, relative, resolve, isAbsolute } from "node:path";
import { promisify } from "node:util";
import { parseGitStatus, type WorkspaceGitStatus } from "./file-status.js";

export interface DirectoryEntry {
  path: string;
  kind: "directory" | "file";
}
export interface DirectoryPage {
  entries: DirectoryEntry[];
  nextCursor?: string;
  git?: WorkspaceGitStatus;
}
export interface SearchPage {
  files: string[];
  nextCursor?: string;
  git?: WorkspaceGitStatus;
}
export class FileDiscoveryError extends Error {
  readonly status = 400;
}

interface PageOptions {
  cursor?: string;
  signal?: AbortSignal;
}
const execute = promisify(execFile);
const pageSize = 100;
const gitFlags = ["-c", "core.fsmonitor=", "-c", "core.hooksPath="];
const env = { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0", GIT_LITERAL_PATHSPECS: "1" };
const visible = (path: string) =>
  Boolean(path) &&
  !isAbsolute(path) &&
  !path.includes("\0") &&
  !path.split(/[\\/]/).some((part) => part.startsWith("."));
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const key = (entry: DirectoryEntry) => `${entry.kind === "directory" ? "0" : "1"}${entry.path}`;

/** Streams NUL-delimited Git output without a whole-repository stdout buffer. Aborts kill the child. */
async function* gitRecords(root: string, args: string[], signal?: AbortSignal, input?: string) {
  signal?.throwIfAborted();
  const child = spawn("git", [...gitFlags, ...args], {
    cwd: root,
    env: { ...env, GIT_LITERAL_PATHSPECS: args[0] === "check-ignore" ? "0" : "1" },
    signal,
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let failure: Error | undefined;
  let stderr = "";
  child.on("error", (error) => {
    failure = error;
  });
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + String(chunk)).slice(-2000);
  });
  child.stdin.on("error", (error) => {
    if ((error as NodeJS.ErrnoException).code !== "EPIPE") failure = error;
  });
  child.stdin.end(input);
  const ended = new Promise<number | null>((resolve) => child.on("close", resolve));
  child.stdout.setEncoding("utf8");
  let pending = "";
  try {
    for await (const chunk of child.stdout) {
      signal?.throwIfAborted();
      pending += String(chunk);
      let end: number;
      while ((end = pending.indexOf("\0")) >= 0) {
        yield pending.slice(0, end);
        pending = pending.slice(end + 1);
      }
    }
    const code = await ended;
    if (failure) throw failure;
    if (code !== 0 && !(args[0] === "check-ignore" && code === 1))
      throw new Error(stderr || "Git discovery failed or timed out. Retry the file list.");
  } finally {
    if (child.exitCode === null) child.kill();
  }
}

/** Resolves only public directories and refuses symlink traversal, including internal aliases. */
async function directoryPath(root: string, directory: string) {
  if (directory && !visible(directory))
    throw new FileDiscoveryError("Invalid workspace directory.");
  let path = root;
  for (const part of directory.split("/").filter(Boolean)) {
    path = join(path, part);
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new FileDiscoveryError("Workspace directory is not accessible.");
  }
  const canonical = await realpath(path);
  const rel = relative(await realpath(root), canonical);
  if (rel.startsWith("..") || isAbsolute(rel))
    throw new FileDiscoveryError("Workspace directory is outside the workspace.");
  return canonical;
}

async function gitContext(root: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const options = { cwd: root, env: { ...env, GIT_LITERAL_PATHSPECS: "0" }, signal, timeout: 5000 };
  try {
    await execute("git", [...gitFlags, "check-ignore", "--quiet", "."], options);
    return undefined; // An explicitly opened, ancestor-ignored folder is a plain workspace.
  } catch (error) {
    signal?.throwIfAborted();
    const code = Number((error as NodeJS.ErrnoException).code);
    if (![1, 128].includes(code)) throw error;
  }
  try {
    const { stdout } = await execute("git", [...gitFlags, "rev-parse", "--show-prefix"], options);
    return { prefix: stdout.replace(/\n$/, "") };
  } catch (error) {
    signal?.throwIfAborted();
    if (String((error as { stderr?: string }).stderr).includes("not a git repository"))
      return undefined;
    throw error;
  }
}

async function status(
  root: string,
  prefix: string,
  directory: string,
  signal?: AbortSignal,
  untracked = "all",
): Promise<WorkspaceGitStatus> {
  try {
    const records: string[] = [];
    for await (const record of gitRecords(
      root,
      ["status", "--porcelain=v1", "-z", `--untracked-files=${untracked}`, "--", directory || "."],
      signal,
    ))
      records.push(record);
    return { available: true, entries: parseGitStatus(records.join("\0"), prefix) };
  } catch {
    signal?.throwIfAborted();
    return { available: false, entries: {} };
  }
}

function cursorAfter(cursor: string | undefined, scope: string): string {
  if (!cursor) return "";
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString());
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed[0] === scope &&
      typeof parsed[1] === "string"
    )
      return parsed[1];
  } catch {
    /* Report a malformed cursor through the same contract. */
  }
  throw new FileDiscoveryError("Invalid file page cursor. Refresh the file list.");
}

/** Keeps one response page plus a lookahead in memory, regardless of total matching paths. */
function pageCollector<T>(after: string, getKey: (value: T) => string) {
  const values: T[] = [];
  return {
    values,
    add(value: T) {
      const valueKey = getKey(value);
      if (compare(valueKey, after) <= 0) return;
      let low = 0,
        high = values.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (compare(getKey(values[mid]!), valueKey) < 0) low = mid + 1;
        else high = mid;
      }
      if (values[low] && getKey(values[low]!) === valueKey) return;
      if (low > pageSize) return;
      values.splice(low, 0, value);
      if (values.length > pageSize + 1) values.pop();
    },
    result(scope: string) {
      const more = values.length > pageSize;
      const items = values.slice(0, pageSize);
      return {
        items,
        nextCursor: more
          ? Buffer.from(JSON.stringify([scope, getKey(items.at(-1)!)])).toString("base64url")
          : undefined,
      };
    },
  };
}

/** Lists only a directory's immediate children. Pages are keyset-based and folders sort first. */
export async function browseWorkspace(
  root: string,
  options: PageOptions & { directory?: string },
): Promise<DirectoryPage> {
  const directory = options.directory ?? "";
  const signal = options.signal;
  signal?.throwIfAborted();
  if (directory && !visible(directory))
    throw new FileDiscoveryError("Invalid workspace directory.");
  const scope = JSON.stringify([resolve(root), "directory", directory]);
  const page = pageCollector(cursorAfter(options.cursor, scope), key);
  const context = await gitContext(root, signal);
  if (!context && directory.split("/").includes("node_modules"))
    throw new FileDiscoveryError("Dependency directories are excluded from discovery.");
  const git = context ? await status(root, context.prefix, directory, signal, "normal") : undefined;
  const entries = new Map<string, DirectoryEntry>();
  const excluded = new Set<string>();
  try {
    const dir = await opendir(await directoryPath(root, directory));
    for await (const entry of dir) {
      signal?.throwIfAborted();
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (!visible(path) || entry.isSymbolicLink() || (!context && entry.name === "node_modules")) {
        excluded.add(path);
        continue;
      }
      if (entry.isDirectory() || entry.isFile())
        entries.set(path, { path, kind: entry.isDirectory() ? "directory" : "file" });
    }
  } catch (error) {
    // Deleted tracked directories remain inspectable through their Git entries.
    if (
      (error as NodeJS.ErrnoException).code !== "ENOENT" ||
      !git?.available ||
      !Object.keys(git.entries).some((path) => path.startsWith(`${directory}/`))
    )
      throw error;
  }
  if (context && entries.size) {
    const input = [...entries.keys()].map((path) => `./${path}`).join("\0") + "\0";
    for await (const record of gitRecords(root, ["check-ignore", "--stdin", "-z"], signal, input)) {
      const ignored = record.startsWith("./") ? record.slice(2) : record;
      const entry = entries.get(ignored);
      if (entry?.kind === "directory") {
        // Forced tracked files can exist below an otherwise ignored directory.
        let tracked = false;
        for await (const path of gitRecords(
          root,
          ["ls-files", "-z", "--cached", "--", ignored],
          signal,
        ))
          if (visible(path)) {
            tracked = true;
            break;
          }
        if (tracked) continue;
      }
      entries.delete(ignored);
    }
  }
  const scoped: Record<string, string> = Object.create(null);
  const directoryCodes = new Map<string, Set<string>>();
  const priority = (code: string) =>
    /U/.test(code) || ["AA", "DD"].includes(code)
      ? 0
      : code.includes("D")
        ? 1
        : /[MT]/.test(code)
          ? 2
          : /[RC]/.test(code)
            ? 3
            : code.includes("A")
              ? 4
              : 5;
  for (const [path, code] of Object.entries(git?.entries ?? {})) {
    const suffix = directory ? path.slice(directory.length + 1) : path;
    if (directory && !path.startsWith(`${directory}/`)) continue;
    if (!suffix) continue;
    const child = directory ? `${directory}/${suffix.split("/")[0]}` : suffix.split("/")[0]!;
    if (excluded.has(child)) continue;
    if (!entries.has(child))
      entries.set(child, { path: child, kind: suffix.includes("/") ? "directory" : "file" });
    if (!scoped[child] || priority(code) < priority(scoped[child])) scoped[child] = code;
    if (entries.get(child)?.kind === "directory") {
      if (!directoryCodes.has(child)) directoryCodes.set(child, new Set());
      directoryCodes.get(child)!.add(code);
    }
  }
  for (const entry of entries.values()) page.add(entry);
  const { items, nextCursor } = page.result(scope);
  return {
    entries: items,
    nextCursor,
    ...(git
      ? {
          git: {
            available: git.available,
            directories: Object.fromEntries(
              items
                .filter((entry) => directoryCodes.has(entry.path))
                .map((entry) => [
                  entry.path,
                  [...directoryCodes.get(entry.path)!].sort((a, b) => priority(a) - priority(b)),
                ]),
            ),
            entries: Object.fromEntries(
              items
                .filter((entry) => scoped[entry.path])
                .map((entry) => [entry.path, scoped[entry.path]!]),
            ),
          },
        }
      : {}),
  };
}

/** Walks public plain-folder files without following symlinks or imposing a total file/entry cap. */
async function* plainFiles(root: string, signal?: AbortSignal) {
  const pending = [""];
  while (pending.length) {
    signal?.throwIfAborted();
    const parent = pending.pop()!;
    const directory = await opendir(await directoryPath(root, parent));
    for await (const entry of directory) {
      signal?.throwIfAborted();
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.isSymbolicLink())
        continue;
      const path = parent ? `${parent}/${entry.name}` : entry.name;
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) yield path;
    }
  }
}

/** Searches paths across the entire public workspace; pagination limits responses, never the search scope. */
export async function searchWorkspace(
  root: string,
  options: PageOptions & { query: string },
): Promise<SearchPage> {
  const query = options.query.toLowerCase();
  const signal = options.signal;
  signal?.throwIfAborted();
  const scope = JSON.stringify([resolve(root), "search", query]);
  const page = pageCollector<string>(cursorAfter(options.cursor, scope), (value) => value);
  const context = await gitContext(root, signal);
  const git = context ? await status(root, context.prefix, "", signal) : undefined;
  const paths = context
    ? gitRecords(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], signal)
    : plainFiles(root, signal);
  // Cache checked ancestors so matching files in a large directory do not repeatedly stat its parents.
  const safeParents = new Map<string, boolean>();
  async function add(path: string) {
    if (!visible(path) || !path.toLowerCase().includes(query)) return;
    if (context) {
      const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (!safeParents.has(parent)) {
        try {
          await directoryPath(root, parent);
          safeParents.set(parent, true);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") safeParents.set(parent, true);
          else safeParents.set(parent, false);
        }
      }
      if (!safeParents.get(parent)) return;
      try {
        const stat = await lstat(join(root, path));
        if (!stat.isFile() || stat.isSymbolicLink()) return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    page.add(path);
  }
  for await (const path of paths) {
    signal?.throwIfAborted();
    await add(path);
  }
  for (const path of Object.keys(git?.entries ?? {})) await add(path);
  const { items, nextCursor } = page.result(scope);
  return {
    files: items,
    nextCursor,
    ...(git
      ? {
          git: {
            available: git.available,
            entries: Object.fromEntries(
              items.filter((path) => git.entries[path]).map((path) => [path, git.entries[path]!]),
            ),
          },
        }
      : {}),
  };
}
