import { sqliteMetadata } from "./metadata-store.js";
import type { MetadataStore } from "@tanstack/ai";
import { DatabaseSync } from "node:sqlite";
import {
  LogConflictError,
  type LogEntry,
  type LogSnapshot,
  type LogStore,
  LogTruncatedError,
  type OfferedInput,
  type OrphanedLog,
  OwnershipLostError,
} from "@tanstack/ai-persistence";

interface StoredLog {
  epoch: number;
  ownerId: string | null;
  expires: number;
  released: boolean;
  deleted: boolean;
  harness: string;
  affinity: string | null;
  wake: number | null;
  head: number;
  first: number;
  entries: LogEntry[];
  offers: (OfferedInput & { consumed: boolean })[];
  snapshot: LogSnapshot | null;
  revision: number;
}

/** Initial state; the epoch survives deletion to reject late writers. */
function empty(epoch = 0): StoredLog {
  return {
    epoch,
    ownerId: null,
    expires: 0,
    released: false,
    deleted: false,
    harness: "",
    affinity: null,
    wake: null,
    head: 0,
    first: 1,
    entries: [],
    offers: [],
    snapshot: null,
    revision: 0,
  };
}

/** JSON copying rejects unsupported values before any database commit. */
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Refuses invalid lease durations before changing ownership. */
function positive(value: number): void {
  if (!(value > 0)) throw new RangeError("Lease duration must be positive");
}

/** Checks the writer fence before inspecting append positions or payloads. */
function fence(row: StoredLog, logId: string, epoch: number, owned = false): void {
  if (row.deleted || row.epoch !== epoch || row.released || (owned && !row.ownerId)) {
    throw new OwnershipLostError(logId, epoch);
  }
}

/**
 * Local durable execution state for the harness. SQLite serializes writers;
 * transactions commit each batch, consumed input, and ownership fence together.
 * One JSON row per session favors a small starter over a second backend service.
 */
export function openLogStore(path: string): {
  log: LogStore;
  metadata: MetadataStore;
  close: () => void;
} {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS harness_logs (id TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS harness_hosts (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);`);
  const timers = new Set<ReturnType<typeof setInterval>>();
  const listeners = new Map<string, Set<() => void>>();

  /** Reads a detached record; callers never receive mutable database state. */
  function read(logId: string): StoredLog {
    const row = db.prepare("SELECT value FROM harness_logs WHERE id = ?").get(logId);
    return row ? (JSON.parse(String(row.value)) as StoredLog) : empty();
  }
  /** A stale host affinity does not prevent recovery by another host. */
  function pinned(row: StoredLog, affinity?: string): boolean {
    if (!row.affinity || row.affinity === affinity) return false;
    const host = db.prepare("SELECT expires FROM harness_hosts WHERE id = ?").get(row.affinity);
    return host !== undefined && Number(host.expires) > Date.now();
  }
  /** Listener failures must never turn a committed write into a failed append. */
  function notify(logId: string): void {
    for (const listener of listeners.get(logId) ?? []) {
      try {
        listener();
      } catch (error) {
        console.error("Harness log listener failed", error);
      }
    }
  }
  /** Performs the complete read/check/write while holding SQLite's write lock. */
  function change<T>(
    logId: string,
    update: (row: StoredLog) => T,
    announce: boolean | ((result: T) => boolean) = false,
  ): T {
    db.exec("BEGIN IMMEDIATE");
    let result: T;
    let changed = false;
    try {
      const row = read(logId);
      result = update(row);
      changed = typeof announce === "function" ? announce(result) : announce;
      if (changed) row.revision += 1;
      db.prepare(
        "INSERT INTO harness_logs VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
      ).run(logId, JSON.stringify(row));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    if (changed) notify(logId);
    return result;
  }

  const log: LogStore = {
    append: async ({ logId, seq, epoch, records, consumes = [] }) => {
      if (!records.length && !consumes.length) return;
      change(
        logId,
        (row) => {
          fence(row, logId, epoch);
          if (seq !== row.head + 1) throw new LogConflictError(logId, seq);
          for (const id of consumes) {
            if (!row.offers.some((offer) => offer.inputId === id && !offer.consumed)) {
              throw new TypeError("Input is not pending");
            }
          }
          const entries = records.map((record, index) => ({
            seq: seq + index,
            record: copy(record),
          }));
          row.entries.push(...entries);
          row.head += entries.length;
          for (const offer of row.offers)
            if (consumes.includes(offer.inputId)) offer.consumed = true;
        },
        true,
      );
    },
    read: async ({ logId, after = 0, limit }) => {
      const row = read(logId);
      if (after + 1 < row.first) throw new LogTruncatedError(logId, row.first);
      return row.entries.filter((entry) => entry.seq > after).slice(0, limit);
    },
    subscribe: ({ logId, listener }) => {
      let revision = read(logId).revision;
      const watch = () => {
        const next = read(logId).revision;
        if (next !== revision) {
          revision = next;
          listener();
        }
      };
      const callbacks = listeners.get(logId) ?? new Set<() => void>();
      callbacks.add(watch);
      listeners.set(logId, callbacks);
      const timer = setInterval(() => {
        try {
          watch();
        } catch (error) {
          console.error("Harness log listener failed", error);
        }
      }, 10);
      timer.unref();
      timers.add(timer);
      return () => {
        clearInterval(timer);
        timers.delete(timer);
        callbacks.delete(watch);
      };
    },
    acquireOwnership: async ({ logId, harness, ownerId, ttlMs, affinity }) => {
      positive(ttlMs);
      return change(logId, (row) => {
        if (pinned(row, affinity)) return null;
        if (row.ownerId && !row.released && row.expires > Date.now() && row.ownerId !== ownerId)
          return null;
        if (row.ownerId === ownerId && !row.released && !row.deleted) {
          row.expires = Date.now() + ttlMs;
          return { epoch: row.epoch };
        }
        const expired = !!row.ownerId && !row.released && row.expires <= Date.now();
        row.epoch += 1;
        row.ownerId = ownerId;
        row.expires = Date.now() + ttlMs;
        row.released = false;
        row.deleted = false;
        row.harness = harness;
        row.wake = null;
        return { epoch: row.epoch, ...(expired ? { expired: true } : {}) };
      });
    },
    renewOwnership: async ({ logId, ownerId, epoch, ttlMs }) => {
      positive(ttlMs);
      return change(logId, (row) => {
        if (row.deleted || row.released || row.ownerId !== ownerId || row.epoch !== epoch)
          return false;
        row.expires = Date.now() + ttlMs;
        return true;
      });
    },
    releaseOwnership: async ({ logId, ownerId, epoch, wakeInMs }) => {
      if (wakeInMs !== undefined && wakeInMs < 0)
        throw new RangeError("Wake delay must not be negative");
      change(logId, (row) => {
        if (row.deleted || row.ownerId !== ownerId || row.epoch !== epoch) return;
        row.released = true;
        row.wake = wakeInMs === undefined ? null : Date.now() + wakeInMs;
      });
    },
    pinToWorkers: async ({ logId, epoch, affinity }) => {
      change(logId, (row) => {
        fence(row, logId, epoch, true);
        row.affinity = affinity;
      });
    },
    markHostAlive: async ({ hostId, ttlMs }) => {
      positive(ttlMs);
      db.prepare(
        "INSERT INTO harness_hosts VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires",
      ).run(hostId, Date.now() + ttlMs);
    },
    listLogsWithoutOwner: async ({ limit, harnesses, affinity }) => {
      const found: (OrphanedLog & { due: number })[] = [];
      for (const entry of db.prepare("SELECT id, value FROM harness_logs").all()) {
        const row = JSON.parse(String(entry.value)) as StoredLog;
        if (row.deleted || (harnesses && !harnesses.includes(row.harness)) || pinned(row, affinity))
          continue;
        const live = row.ownerId && !row.released && row.expires > Date.now();
        if (live) continue;
        const pending = row.offers.find((offer) => !offer.consumed);
        let reason: OrphanedLog["reason"];
        let due: number;
        if (row.ownerId && !row.released && row.expires <= Date.now()) {
          reason = "expired";
          due = row.expires;
        } else if (pending) {
          reason = "offered";
          due = pending.offeredAt;
        } else if (row.released && row.wake !== null && row.wake <= Date.now()) {
          reason = "wake";
          due = row.wake;
        } else continue;
        found.push({
          logId: String(entry.id),
          harness: row.harness,
          reason,
          due,
        });
      }
      return found
        .sort((a, b) => a.due - b.due)
        .slice(0, limit)
        .map(({ due: _due, ...entry }) => entry);
    },
    offerInput: async ({ logId, harness, inputId, record }) =>
      change(
        logId,
        (row) => {
          if (row.deleted) return "deleted";
          const value = copy(record);
          const previous = row.offers.find((offer) => offer.inputId === inputId);
          if (previous)
            return JSON.stringify(previous.record) === JSON.stringify(value)
              ? "duplicate"
              : "conflict";
          if (!row.ownerId && !row.offers.length) row.harness = harness;
          row.offers.push({
            inputId,
            record: value,
            offeredAt: Date.now(),
            consumed: false,
          });
          return "offered";
        },
        (result) => result === "offered",
      ),
    listOfferedInputs: async ({ logId }) =>
      read(logId)
        .offers.filter((offer) => !offer.consumed)
        .map(({ consumed: _consumed, ...offer }) => offer),
    getSnapshot: async ({ logId }) => read(logId).snapshot,
    putSnapshot: async ({ logId, epoch, seq, version, state }) => {
      change(logId, (row) => {
        fence(row, logId, epoch, true);
        if (seq < row.first - 1 || seq > row.head)
          throw new RangeError("Snapshot position is outside the log");
        row.snapshot = copy({ seq, version, state });
      });
    },
    truncate: async ({ logId, epoch, beforeSeq }) => {
      change(logId, (row) => {
        fence(row, logId, epoch, true);
        if (!row.snapshot || row.snapshot.seq < beforeSeq - 1)
          throw new RangeError("Snapshot does not cover truncation");
        row.entries = row.entries.filter((entry) => entry.seq >= beforeSeq);
        row.first = Math.max(row.first, beforeSeq);
      });
    },
    deleteLog: async ({ logId }) => {
      change(
        logId,
        (row) => {
          const revision = row.revision;
          Object.assign(row, empty(row.epoch), { deleted: true, revision });
        },
        true,
      );
    },
  };
  return {
    log,
    metadata: sqliteMetadata(db),
    close: () => {
      for (const timer of timers) clearInterval(timer);
      db.close();
    },
  };
}
