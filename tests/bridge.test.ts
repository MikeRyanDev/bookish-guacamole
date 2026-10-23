import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type AnyTextAdapter, EventType, toolDefinition } from "@tanstack/ai";
import { createHarnessHost, defineHarness, type HarnessPersistence } from "@tanstack/ai-harness";
import { defineAIPersistence, memoryPersistence } from "@tanstack/ai-persistence";
import { firstValueFrom, toArray } from "rxjs";
import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { createHarnessAgent } from "../src/bridge.js";
import { openLogStore } from "../src/log-store.js";
import { answer, scriptedAdapter } from "./provider.js";

const hosts: ReturnType<typeof createHarnessHost>[] = [];
afterEach(async () => {
  for (const host of hosts.splice(0)) await host.close();
});

/** Uses the real harness loop with a deterministic model stream. */
function fixture(
  reply: AnyTextAdapter["chatStream"],
  tools: Parameters<typeof defineHarness>[0]["tools"] = [],
  persistence: HarnessPersistence = memoryPersistence(),
) {
  const adapter = scriptedAdapter(reply);
  const host = createHarnessHost({ persistence });
  hosts.push(host);
  const harness = defineHarness({ name: "test/bridge", adapter, tools });
  return createHarnessAgent({ host, harness });
}

/** An outer Intelligence run, passed unchanged into the bridge. */
function input(content = "Hello") {
  return {
    threadId: randomUUID(),
    runId: randomUUID(),
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
    messages: [{ id: randomUUID(), role: "user" as const, content }],
  };
}

test("preserves the caller run and thread IDs through the real harness", async () => {
  const agent = fixture(answer);
  const request = input();
  const events = await firstValueFrom(agent.run(request).pipe(toArray()));
  expect(events.find((event) => event.type === "RUN_STARTED")).toMatchObject({
    type: EventType.RUN_STARTED,
    threadId: request.threadId,
    runId: request.runId,
  });
  expect(events.find((event) => event.type === "RUN_FINISHED")).toMatchObject({
    type: EventType.RUN_FINISHED,
    threadId: request.threadId,
    runId: request.runId,
  });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: EventType.TEXT_MESSAGE_CONTENT,
      delta: "Ready to code.",
    }),
  );
});

test("does not turn a model failure into a successful run", async () => {
  const agent = fixture(() => {
    throw new Error("Provider unavailable");
  });
  const events = await firstValueFrom(agent.run(input()).pipe(toArray()));
  expect(events.some((event) => event.type === "RUN_ERROR")).toBe(true);
  expect(events.some((event) => event.type === "RUN_FINISHED")).toBe(false);
});

test("cloning keeps the private transport and isolated message state", async () => {
  const agent = fixture(answer);
  agent.messages = [{ id: "first", role: "user", content: "Original" }];
  const clone = agent.clone();
  const message = clone.messages[0];
  assert(message);
  message.content = "Changed";
  expect(agent.messages[0]?.content).toBe("Original");
  const request = input();
  const events = await firstValueFrom(clone.run(request).pipe(toArray()));
  expect(events.some((event) => event.type === "RUN_FINISHED")).toBe(true);
});

test("retains tool arguments and results for Intelligence Learning", async () => {
  let calls = 0;
  const tool = toolDefinition({
    name: "read_project",
    description: "Read project",
    inputSchema: z.object({}),
  }).server(async () => "project evidence");
  const agent = fixture(
    async function* () {
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
        toolCallId: "tool-1",
        toolCallName: "read_project",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: "tool-1",
        delta: "{}",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_END,
        toolCallId: "tool-1",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.RUN_FINISHED,
        runId: "provider",
        threadId: "provider",
        timestamp: Date.now(),
        metadata: { tanstack: { finishReason: "tool_calls" } },
      };
    },
    [tool],
  );
  const events = await firstValueFrom(agent.run(input()).pipe(toArray()));
  expect(events.filter((event) => event.type === "RUN_STARTED")).toHaveLength(1);
  expect(events.filter((event) => event.type === "RUN_FINISHED")).toHaveLength(1);
  expect(events).toContainEqual(expect.objectContaining({ type: "TOOL_CALL_ARGS", delta: "{}" }));
  expect(events).toContainEqual(
    expect.objectContaining({
      type: "TOOL_CALL_RESULT",
      toolCallId: "tool-1",
      content: expect.stringContaining("project evidence"),
    }),
  );
});

test("unsubscribing cancels the underlying model instead of leaving it running", async () => {
  let cancelled = false;
  let started = false;
  const agent = fixture(async function* (options) {
    started = true;
    await new Promise<void>((resolve) => {
      options.request?.signal?.addEventListener(
        "abort",
        () => {
          cancelled = true;
          resolve();
        },
        { once: true },
      );
    });
    yield* answer();
  });
  const subscription = agent.run(input()).subscribe();
  await vi.waitFor(() => expect(started).toBe(true));
  subscription.unsubscribe();
  await vi.waitFor(() => expect(cancelled).toBe(true), { timeout: 1000 });
});

test("a fresh process host restores the model context from SQLite", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-restart-"));
  const path = join(directory, "state.sqlite");
  let store = openLogStore(path);
  try {
    const first = fixture(answer, [], defineAIPersistence({ stores: { log: store.log } }));
    const request = input("Remember the project codename: apricot");
    await firstValueFrom(first.run(request).pipe(toArray()));
    await hosts.pop()?.close();
    store.close();
    store = openLogStore(path);
    let context = "";
    const second = fixture(
      async function* (options) {
        context = JSON.stringify(options.messages);
        yield* answer();
      },
      [],
      defineAIPersistence({ stores: { log: store.log } }),
    );
    const next = input("What was the codename?");
    next.threadId = request.threadId;
    await firstValueFrom(second.run(next).pipe(toArray()));
    expect(context).toContain("apricot");
    expect(context).toContain("What was the codename?");
    await hosts.pop()?.close();
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("the public AG-UI runner accepts the bridged event sequence", async () => {
  const agent = fixture(answer);
  agent.messages = input().messages;
  const result = await agent.runAgent({ runId: randomUUID() });
  expect(result.newMessages).toContainEqual(
    expect.objectContaining({ role: "assistant", content: "Ready to code." }),
  );
});

test("a tool approval resumes exactly once through the public agent API", async () => {
  let calls = 0;
  let writes = 0;
  const tool = toolDefinition({
    name: "edit_project",
    description: "Edit project",
    needsApproval: true,
    inputSchema: z.object({}),
  }).server(async () => {
    writes += 1;
    return "edited";
  });
  const agent = fixture(
    async function* () {
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
        toolCallId: "edit-1",
        parentMessageId: "provider-edit-message",
        toolCallName: "edit_project",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: "edit-1",
        delta: "{}",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_END,
        toolCallId: "edit-1",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.RUN_FINISHED,
        runId: "provider",
        threadId: "provider",
        timestamp: Date.now(),
        metadata: { tanstack: { finishReason: "tool_calls" } },
      };
    },
    [tool],
  );
  agent.messages = input().messages;
  const snapshots: unknown[] = [];
  agent.subscribe({
    onMessagesSnapshotEvent: ({ event }) => {
      snapshots.push(event);
    },
  });
  await agent.runAgent({ runId: randomUUID() });
  expect(snapshots).toHaveLength(0);
  expect(writes).toBe(0);
  expect(agent.pendingInterrupts).toHaveLength(1);
  const interrupt = agent.pendingInterrupts[0];
  assert(interrupt);
  await agent.runAgent({
    runId: randomUUID(),
    resume: [{ interruptId: interrupt.id, status: "resolved", payload: true }],
  });
  expect(writes).toBe(1);
  expect(agent.pendingInterrupts).toHaveLength(0);
  expect(agent.messages.filter((message) => message.role === "user")).toHaveLength(1);
  expect(
    agent.messages
      .flatMap((message) => (message.role === "assistant" ? (message.toolCalls ?? []) : []))
      .filter((call) => call.id === "edit-1"),
  ).toHaveLength(1);
});
