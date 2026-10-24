import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type AIPersistence, defineAIPersistence } from "@tanstack/ai-persistence";
import { runPersistenceConformance } from "@tanstack/ai-persistence/testkit";
import { afterAll } from "vitest";
import { openLogStore } from "../src/log-store.js";

const resources: { directory: string; close: () => void }[] = [];
const paths = new WeakMap<AIPersistence, string>();
afterAll(() => {
  for (const resource of resources.reverse()) resource.close();
  for (const { directory } of resources)
    if (directory) rmSync(directory, { recursive: true, force: true });
});
runPersistenceConformance(
  "SQLite harness log",
  () => {
    const directory = mkdtempSync(join(tmpdir(), "tanstack-log-"));
    const path = join(directory, "harness.sqlite");
    const { log, metadata, close } = openLogStore(path);
    resources.push({ directory, close });
    const persistence = defineAIPersistence({ stores: { log, metadata } });
    paths.set(persistence, path);
    return persistence;
  },
  {
    skip: [
      "messages",
      "runs",
      "interrupts",
      "activities",
      "artifacts",
      "blobs",
      "generationRuns",
      "sessions",
    ],
    twin: (persistence) => {
      const path = paths.get(persistence);
      if (!path) throw new Error("Missing test database");
      const { log, metadata, close } = openLogStore(path);
      resources.push({ directory: "", close });
      return defineAIPersistence({ stores: { log, metadata } });
    },
  },
);
