import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { permissions } from "@tanstack/ai-harness/plugins";
import { workspaceTools } from "@tanstack/ai-harness/plugins/coding";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { createExecutionSettings } from "../src/server/agent/execution-settings.js";
import { optionalCodeMode } from "../src/server/agent/code-mode.js";
import { answer, scriptedAdapter } from "./provider.js";

test("opt-in code mode batches reads in a real isolate while writes remain approval tools", async () => {
  const root = await mkdtemp(join(tmpdir(), "code-mode-"));
  await writeFile(join(root, "one.txt"), "first fixture");
  await writeFile(join(root, "two.txt"), "second fixture");
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  let step = 0;
  const catalogs: string[][] = [];
  const adapter = scriptedAdapter(async function* (options) {
    catalogs.push(options.tools?.map((tool) => tool.name) ?? []);
    if (!options.tools?.some((tool) => tool.name === "execute_typescript") || step++ > 0) {
      yield* answer();
      return;
    }
    yield {
      type: EventType.TOOL_CALL_START,
      toolCallId: "program",
      toolCallName: "execute_typescript",
      timestamp: Date.now(),
    };
    yield {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: "program",
      delta: JSON.stringify({
        typescriptCode:
          'const first = await external_read_file({ path: "one.txt" }); const second = await external_read_file({ path: "two.txt" }); return {first, second, canWrite: typeof external_write_file !== "undefined", host: typeof process};',
      }),
      timestamp: Date.now(),
    };
    yield { type: EventType.TOOL_CALL_END, toolCallId: "program", timestamp: Date.now() };
    yield {
      type: EventType.RUN_FINISHED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
      metadata: { tanstack: { finishReason: "tool_calls" } },
    };
  });
  const harness = defineHarness({
    name: "code-mode-test",
    adapter,
    plugins: () => [
      workspaceTools({ root, web: false }),
      permissions({ root }),
      optionalCodeMode(settings),
    ],
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "one" });
    await session.send("Read the files");
    expect(catalogs[0]).not.toContain("execute_typescript");
    const initial = await settings.read();
    await settings.save({ ...initial, settings: { ...initial.settings, codeMode: true } });
    const events: StreamChunk[] = [];
    const off = session.onEvent(({ event }) => events.push(event));
    await session.send("Read both files in a program");
    off();
    expect(catalogs[1]).toContain("execute_typescript");
    expect(catalogs[1]).toContain("write_file");
    const results = JSON.stringify(events.filter((event) => event.type === "TOOL_CALL_RESULT"));
    expect(results).toContain("first fixture");
    expect(results).toContain("second fixture");
    expect(results).toContain("canWrite");
    expect(results).toContain("false");
    expect(results).toContain("undefined");
    expect(catalogs).toHaveLength(3);
    const enabled = await settings.read();
    await settings.save({ ...enabled, settings: { ...enabled.settings, codeMode: false } });
    await session.send("Use direct tools again");
    expect(catalogs.at(-1)).not.toContain("execute_typescript");
    await session.close();
  } finally {
    await host.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("dependent read benchmark compares direct tools with one isolated program", async () => {
  const root = await mkdtemp(join(tmpdir(), "code-mode-benchmark-"));
  await writeFile(join(root, "manifest.txt"), "payload.txt");
  await writeFile(join(root, "payload.txt"), "dependent read payload");
  const measurements: { mode: string; modelCalls: number; elapsedMs: number }[] = [];
  try {
    for (const enabled of [false, true]) {
      const persistence = memoryPersistence();
      const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
      const initial = await settings.read();
      await settings.save({ ...initial, settings: { ...initial.settings, codeMode: enabled } });
      let calls = 0;
      const adapter = scriptedAdapter(async function* () {
        const index = calls++;
        if (index >= (enabled ? 1 : 2)) {
          yield* answer();
          return;
        }
        const id = `read-${index}`;
        const name = enabled ? "execute_typescript" : "read_file";
        const args = enabled
          ? {
              typescriptCode:
                'const manifest = await external_read_file({path:"manifest.txt"}); const next = String(manifest).split("\\t").at(-1).trim(); return await external_read_file({path:next});',
            }
          : { path: index === 0 ? "manifest.txt" : "payload.txt" };
        yield {
          type: EventType.TOOL_CALL_START,
          toolCallId: id,
          toolCallName: name,
          timestamp: Date.now(),
        };
        yield {
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: id,
          delta: JSON.stringify(args),
          timestamp: Date.now(),
        };
        yield { type: EventType.TOOL_CALL_END, toolCallId: id, timestamp: Date.now() };
        yield {
          type: EventType.RUN_FINISHED,
          runId: "provider",
          threadId: "provider",
          timestamp: Date.now(),
          metadata: { tanstack: { finishReason: "tool_calls" } },
        };
      });
      const harness = defineHarness({
        name: "benchmark",
        adapter,
        plugins: () => [workspaceTools({ root, web: false }), optionalCodeMode(settings)],
      });
      const host = createHarnessHost({ persistence });
      try {
        const session = await host.open(harness, { threadId: "benchmark" });
        const results: StreamChunk[] = [];
        const off = session.onEvent(({ event }) => results.push(event));
        const start = performance.now();
        await session.send("Read the manifest, then its referenced file.");
        measurements.push({
          mode: enabled ? "isolated program" : "direct tools",
          modelCalls: calls,
          elapsedMs: Math.round(performance.now() - start),
        });
        off();
        expect(
          JSON.stringify(results.filter((event) => event.type === "TOOL_CALL_RESULT")),
        ).toContain("dependent read payload");
        await session.close();
      } finally {
        await host.close();
      }
    }
    expect(measurements.map((entry) => entry.modelCalls)).toEqual([3, 2]);
    console.info("Dependent read benchmark (scripted model, real tools/isolate):", measurements);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
