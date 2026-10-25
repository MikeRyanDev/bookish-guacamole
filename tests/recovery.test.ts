import { expect, test } from "vitest";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { createExecutionSettings } from "../src/server/agent/execution-settings.js";
import { createRecovery } from "../src/server/agent/recovery.js";
import { answer, scriptedAdapter } from "./provider.js";

test("temporary errors retry within the configured bound and clear recovery status", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const recovery = createRecovery(settings, { baseDelayMs: 1 });
  let calls = 0;
  const adapter = scriptedAdapter(async function* () {
    if (++calls === 1) throw new Error("503 service unavailable");
    yield* answer();
  });
  const harness = defineHarness({
    name: "recovery",
    adapter,
    turn: { onModelError: recovery.onModelError },
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "retry" });
    await session.send("Hello");
    expect(calls).toBe(2);
    expect(recovery.read("retry")).toBeNull();
    await session.close();
    const current = await settings.read();
    await settings.save({ ...current, settings: { ...current.settings, maxRetries: 0 } });
    calls = 0;
    const disabled = await host.open(harness, { threadId: "disabled" });
    await expect(Promise.resolve(disabled.send("Hello"))).rejects.toThrow("503");
    expect(calls).toBe(1);
    await disabled.close();
  } finally {
    await host.close();
  }
});

test("stop interrupts the retry wait without another provider call", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const recovery = createRecovery(settings, { baseDelayMs: 10000 });
  let calls = 0;
  const adapter = scriptedAdapter(() => {
    calls++;
    throw new Error("503 service unavailable");
  });
  const harness = defineHarness({
    name: "stop-recovery",
    adapter,
    turn: { onModelError: recovery.onModelError },
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "stop" });
    const operation = Promise.resolve(session.send("Hello")).catch((error: unknown) => error);
    await expect.poll(() => recovery.read("stop")?.attempt).toBe(1);
    await session.cancel();
    await operation;
    expect(calls).toBe(1);
    expect(recovery.read("stop")).toBeNull();
    await session.close();
  } finally {
    await host.close();
  }
});

test("a transient failure through the bridge preserves a single approval and tool execution", async () => {
  const { EventType, toolDefinition } = await import("@tanstack/ai");
  const { z } = await import("zod");
  const { createHarnessAgent } = await import("../src/server/agent/bridge.js");
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const recovery = createRecovery(settings, { baseDelayMs: 1 });
  let calls = 0;
  let writes = 0;
  const adapter = scriptedAdapter(async function* () {
    if (++calls === 1) throw new Error("503 service unavailable");
    if (calls > 2) {
      yield* answer();
      return;
    }
    yield {
      type: EventType.TOOL_CALL_START,
      toolCallId: "approved-write",
      toolCallName: "change",
      timestamp: Date.now(),
    };
    yield {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: "approved-write",
      delta: "{}",
      timestamp: Date.now(),
    };
    yield { type: EventType.TOOL_CALL_END, toolCallId: "approved-write", timestamp: Date.now() };
    yield {
      type: EventType.RUN_FINISHED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
      metadata: { tanstack: { finishReason: "tool_calls" } },
    };
  });
  const change = toolDefinition({
    name: "change",
    description: "Change the fixture",
    needsApproval: true,
    inputSchema: z.object({}),
    outputSchema: z.string(),
  }).server(async () => {
    writes++;
    return "changed";
  });
  const harness = defineHarness({
    name: "retry-approval",
    adapter,
    tools: [change],
    turn: { onModelError: recovery.onModelError },
  });
  const host = createHarnessHost({ persistence });
  const agent = createHarnessAgent({ host, harness });
  agent.threadId = "retry-approval";
  agent.messages = [{ id: "outer-user", role: "user", content: "Make the change" }];
  try {
    await agent.runAgent({ runId: crypto.randomUUID() });
    expect(calls).toBe(2);
    expect(writes).toBe(0);
    expect(agent.pendingInterrupts).toHaveLength(1);
    await agent.runAgent({
      runId: crypto.randomUUID(),
      resume: [{ interruptId: agent.pendingInterrupts[0]!.id, status: "resolved", payload: true }],
    });
    expect(writes).toBe(1);
    expect(agent.messages.filter((message) => message.role === "user")).toHaveLength(1);
    expect(agent.pendingInterrupts).toHaveLength(0);
  } finally {
    await host.close();
  }
});
