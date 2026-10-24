import { randomUUID } from "node:crypto";
import { mkdir, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execute = promisify(execFile);
const entrySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  createdAt: z.string(),
});
export type WorkspaceEntry = z.infer<typeof entrySchema>;
const nameSchema = z.string().trim().min(1).max(80);
export const createWorkspaceSchema = z
  .object({
    name: nameSchema,
    mode: z.enum(["create", "open"]),
    path: z.string().trim().min(1).optional(),
  })
  .strict();

/** A user-correctable workspace error, suitable for the local HTTP boundary. */
export class WorkspaceError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "WorkspaceError";
  }
}

/** Opens the local workspace index; removing an entry never removes files or execution logs. */
export async function openWorkspaceRegistry(directory: string, defaultRoot: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const initialPath = await realpath(defaultRoot);
  const database = new DatabaseSync(join(directory, "workspaces.sqlite"));
  database.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0)",
  );
  database
    .prepare("INSERT OR IGNORE INTO workspaces(id,name,path,createdAt) VALUES (?,?,?,?)")
    .run("default", basename(initialPath), initialPath, new Date().toISOString());
  /** Reads active entries in their stable creation order. */
  function list(): WorkspaceEntry[] {
    return database
      .prepare(
        "SELECT id,name,path,createdAt FROM workspaces WHERE archived=0 ORDER BY createdAt,id",
      )
      .all()
      .map((row) => entrySchema.parse(row));
  }
  /** Resolves a registered identity instead of accepting a filesystem path from a request. */
  function get(id: string): WorkspaceEntry {
    const row = database
      .prepare("SELECT id,name,path,createdAt FROM workspaces WHERE id=? AND archived=0")
      .get(id);
    if (!row) throw new WorkspaceError("Workspace not found.", 404);
    return entrySchema.parse(row);
  }
  /** Creates an empty Git project or registers an explicitly chosen existing directory. */
  async function create(input: unknown): Promise<WorkspaceEntry> {
    const parsed = createWorkspaceSchema.safeParse(input);
    if (!parsed.success)
      throw new WorkspaceError("Enter a workspace name of 1–80 characters and a valid folder.");
    const { name, mode, path } = parsed.data;
    if (path && !isAbsolute(path)) throw new WorkspaceError("Use an absolute folder path.");
    if (mode === "open" && !path) throw new WorkspaceError("Choose an existing folder to open.");
    const id = randomUUID();
    const managed = join(directory, "workspaces");
    if (mode === "create" && !path) await mkdir(managed, { recursive: true, mode: 0o700 });
    const candidate = path ?? join(managed, id);
    if (mode === "create") {
      try {
        await mkdir(candidate);
      } catch {
        throw new WorkspaceError("The new folder must not exist, and its parent must be writable.");
      }
      try {
        await execute("git", ["init", "--quiet", candidate], { timeout: 5000 });
      } catch {
        throw new WorkspaceError(
          "The folder was created, but Git could not initialize it. Open it after fixing Git.",
        );
      }
    }
    let canonical: string;
    try {
      canonical = await realpath(candidate);
      if (!(await stat(canonical)).isDirectory()) throw new Error("not directory");
    } catch {
      throw new WorkspaceError("The workspace folder must exist and be readable.");
    }
    const existing = database
      .prepare("SELECT id,archived FROM workspaces WHERE path=?")
      .get(canonical);
    if (existing) {
      if (!existing.archived)
        throw new WorkspaceError("This folder is already in your workspaces.", 409);
      database
        .prepare("UPDATE workspaces SET name=?,archived=0 WHERE id=?")
        .run(name, existing.id!);
      return get(String(existing.id));
    }
    database
      .prepare("INSERT INTO workspaces(id,name,path,createdAt) VALUES (?,?,?,?)")
      .run(id, name, canonical, new Date().toISOString());
    return get(id);
  }
  /** Renames only the workspace label; the directory and conversation identity stay fixed. */
  function rename(id: string, name: unknown): WorkspaceEntry {
    get(id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) throw new WorkspaceError("Enter a workspace name of 1–80 characters.");
    database.prepare("UPDATE workspaces SET name=? WHERE id=?").run(parsed.data, id);
    return get(id);
  }
  /** Removes a saved entry from the picker while retaining its identity for a later reopen. */
  function remove(id: string): void {
    get(id);
    if (list().length < 2) throw new WorkspaceError("Keep at least one workspace open.");
    database.prepare("UPDATE workspaces SET archived=1 WHERE id=?").run(id);
  }
  return { list, get, create, rename, remove, close: () => database.close() };
}
