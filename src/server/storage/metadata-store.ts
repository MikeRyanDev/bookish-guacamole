import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { MetadataStore } from "@tanstack/ai";

/** Stores private harness settings with atomic revisions, never conversation messages. */
export function sqliteMetadata(db: DatabaseSync): MetadataStore {
  db.exec(
    "CREATE TABLE IF NOT EXISTS harness_metadata (namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, revision TEXT NOT NULL, PRIMARY KEY(namespace, key))",
  );
  const read = (namespace: string, key: string) => {
    const row = db
      .prepare("SELECT value, revision FROM harness_metadata WHERE namespace = ? AND key = ?")
      .get(namespace, key);
    return row
      ? { value: JSON.parse(String(row.value)) as unknown, revision: String(row.revision) }
      : null;
  };
  const write = (namespace: string, key: string, value: unknown) => {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("Metadata must be JSON.");
    const revision = randomUUID();
    db.prepare(
      "INSERT INTO harness_metadata VALUES (?, ?, ?, ?) ON CONFLICT(namespace, key) DO UPDATE SET value=excluded.value, revision=excluded.revision",
    ).run(namespace, key, encoded, revision);
    return revision;
  };
  return {
    get: async (namespace, key) => read(namespace, key)?.value ?? null,
    getVersioned: async (namespace, key) => read(namespace, key),
    set: async (namespace, key, value) => {
      write(namespace, key, value);
    },
    delete: async (namespace, key) => {
      db.prepare("DELETE FROM harness_metadata WHERE namespace=? AND key=?").run(namespace, key);
    },
    setIf: async (namespace, key, value, expectedRevision) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        if ((read(namespace, key)?.revision ?? null) !== expectedRevision) {
          db.exec("ROLLBACK");
          return { ok: false, reason: "conflict" };
        }
        const revision = write(namespace, key, value);
        db.exec("COMMIT");
        return { ok: true, revision };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
