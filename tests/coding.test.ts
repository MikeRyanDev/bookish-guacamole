import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { EventType } from "@tanstack/ai";
import { createHarnessHost } from "@tanstack/ai-harness";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { expect, test } from "vitest";
import { createHarnessAgent } from "../src/bridge.js";
import { createCodingHarness } from "../src/harness.js";
import { openLogStore } from "../src/log-store.js";
import { answer, scriptedAdapter } from "./provider.js";

for (const decision of ["once", "reject"] as const) {
  test(`real coding plugin honors ${decision} after a host restart`, async () => {
    const root = await mkdtemp(join(tmpdir(), "coding-plugin-"));
    const path = join(root, "state.sqlite");
    let store = openLogStore(path);
    let host = createHarnessHost({
      persistence: defineAIPersistence({ stores: { log: store.log } }),
    });
    let calls = 0;
    const adapter = scriptedAdapter(async function* () {
      if (calls++ > 0) {
        yield* answer();
        return;
      }
      yield {
        type: EventType.RUN_STARTED,
        runId: "provider",
        threadId: "provider",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_START,
        toolCallId: "write-1",
        toolCallName: "write_file",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: "write-1",
        delta: JSON.stringify({
          path: "hello.js",
          content: 'export const hello = "world";\n',
        }),
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_END,
        toolCallId: "write-1",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.RUN_FINISHED,
        runId: "provider",
        threadId: "provider",
        timestamp: Date.now(),
        metadata: { tanstack: { finishReason: "tool_calls" } },
      };
    });
    const intelligence = new CopilotKitIntelligence({
      apiKey: "test",
      apiUrl: "http://localhost:9",
      wsUrl: "ws://localhost:9",
    });
    const harness = createCodingHarness({
      root,
      intelligence,
      containerId: "coding-lessons",
      adapter,
    });
    try {
      const agent = createHarnessAgent({ host, harness });
      agent.threadId = randomUUID();
      agent.messages = [{ id: randomUUID(), role: "user", content: "Create hello.js" }];
      await agent.runAgent({ runId: randomUUID() });
      expect(agent.pendingInterrupts).toHaveLength(1);
      await expect(readFile(join(root, "hello.js"), "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });
      const interrupt = agent.pendingInterrupts[0];
      assert(interrupt);
      await host.close();
      store.close();
      store = openLogStore(path);
      host = createHarnessHost({
        persistence: defineAIPersistence({ stores: { log: store.log } }),
      });
      const resumed = createHarnessAgent({ host, harness });
      resumed.threadId = agent.threadId;
      resumed.messages = agent.messages;
      await resumed.runAgent({
        runId: randomUUID(),
        resume: [{ interruptId: interrupt.id, status: "resolved", payload: decision }],
      });
      expect(resumed.pendingInterrupts).toHaveLength(0);
      if (decision === "once")
        expect(await readFile(join(root, "hello.js"), "utf8")).toContain("export const hello");
      else
        await expect(readFile(join(root, "hello.js"), "utf8")).rejects.toMatchObject({
          code: "ENOENT",
        });
    } finally {
      await host.close();
      store.close();
      await rm(root, { recursive: true, force: true });
    }
  });
}
