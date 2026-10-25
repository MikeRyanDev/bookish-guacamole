import { expect, test } from "vitest";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { goal, usage } from "@tanstack/ai-harness/plugins";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { firstValueFrom, toArray } from "rxjs";
import { createExecutionSettings } from "../src/server/agent/execution-settings.js";
import { createExecutionUsage } from "../src/server/agent/execution-usage.js";
import { createHarnessAgent } from "../src/server/agent/bridge.js";
import { answer, scriptedAdapter } from "./provider.js";

function fixture(reported = true) {
  let calls = 0;
  const adapter = scriptedAdapter(async function* () {
    calls++;
    for await (const chunk of answer()) {
      yield chunk.type === EventType.RUN_FINISHED && reported
        ? ({
            ...chunk,
            usage: { promptTokens: 900, completionTokens: 100, totalTokens: 1000 },
          } as StreamChunk)
        : chunk;
    }
  });
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const ledger = createExecutionUsage({
    metadata: persistence.stores.metadata!,
    settings,
    models: { coder: adapter },
  });
  const harness = defineHarness({
    name: "usage-test",
    adapter,
    middleware: [ledger.middleware],
    plugins: () => [ledger.plugin, usage()],
  });
  const host = createHarnessHost({ persistence });
  const agent = createHarnessAgent({ host, harness });
  const run = () =>
    firstValueFrom(
      agent
        .run({
          threadId: "one",
          runId: crypto.randomUUID(),
          messages: [{ id: crypto.randomUUID(), role: "user", content: "hello" }],
          state: {},
          tools: [],
          context: [],
        })
        .pipe(toArray()),
    );
  return { calls: () => calls, settings, ledger, host, run, adapter, persistence };
}

test("existing conversation usage is retained and incomplete historical accounting cannot bypass limits", async () => {
  const persistence = memoryPersistence();
  let calls = 0;
  const adapter = scriptedAdapter(async function* () {
    calls++;
    for await (const chunk of answer())
      yield chunk.type === "RUN_FINISHED"
        ? { ...chunk, usage: { promptTokens: 900, completionTokens: 100, totalTokens: 1000 } }
        : chunk;
  });
  let host = createHarnessHost({ persistence });
  const prior = defineHarness({ name: "usage-migration", adapter });
  const original = await host.open(prior, { threadId: "old" });
  await original.send("An earlier conversation");
  await original.close();
  await host.close();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const initial = await settings.read();
  await settings.save({ ...initial, settings: { ...initial.settings, tokenLimit: 2000 } });
  const ledger = createExecutionUsage({
    metadata: persistence.stores.metadata!,
    settings,
    models: { coder: adapter },
  });
  const upgraded = defineHarness({
    name: prior.name,
    adapter,
    middleware: [ledger.middleware],
    plugins: () => [ledger.plugin, usage()],
  });
  host = createHarnessHost({ persistence });
  try {
    const session = await host.open(upgraded, { threadId: "old" });
    expect(await ledger.read("old")).toMatchObject({ totalTokens: 1000, historyIncomplete: true });
    await expect(session.send("Continue")).rejects.toThrow(/earlier|historical/i);
    expect(calls).toBe(1);
    await session.close();
  } finally {
    await host.close();
  }
});

test("token limits stop the next model call and survive ledger reconstruction", async () => {
  const f = fixture();
  try {
    const initial = await f.settings.read();
    await f.settings.save({ ...initial, settings: { ...initial.settings, tokenLimit: 1000 } });
    await f.run();
    expect(await f.ledger.read("one")).toMatchObject({
      calls: 1,
      reportedCalls: 1,
      totalTokens: 1000,
      unpricedCalls: 1,
      contextTokens: 900,
    });
    const events = await f.run();
    expect(f.calls()).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "RUN_ERROR",
        message: expect.stringContaining("token limit"),
      }),
    );
    const restored = createExecutionUsage({
      metadata: f.persistence.stores.metadata!,
      settings: f.settings,
      models: { coder: f.adapter },
    });
    expect((await restored.read("one")).totalTokens).toBe(1000);
    expect((await restored.read("other")).totalTokens).toBe(0);
  } finally {
    await f.host.close();
  }
});

test("unknown usage and unknown prices cannot silently bypass a configured limit", async () => {
  const f = fixture(false);
  try {
    await f.run();
    expect(await f.ledger.read("one")).toMatchObject({ calls: 1, reportedCalls: 0 });
    const initial = await f.settings.read();
    await f.settings.save({ ...initial, settings: { ...initial.settings, tokenLimit: 10000 } });
    await f.run();
    expect(f.calls()).toBe(1);
  } finally {
    await f.host.close();
  }
  const priced = fixture();
  try {
    const initial = await priced.settings.read();
    await priced.settings.save({ ...initial, settings: { ...initial.settings, costLimit: 1 } });
    const events = await priced.run();
    expect(priced.calls()).toBe(0);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "RUN_ERROR", message: expect.stringContaining("prices") }),
    );
  } finally {
    await priced.host.close();
  }
});

test("goal judges use the same limit as the main coding model", async () => {
  const f = fixture();
  let checks = 0;
  f.adapter.structuredOutput = async () => {
    checks++;
    return { data: { met: false, reason: "Continue" }, rawText: "{}" };
  };
  const harness = defineHarness({
    name: "goal-budget",
    adapter: f.adapter,
    middleware: [f.ledger.middleware],
    plugins: () => [f.ledger.plugin, goal({ judge: f.adapter })],
  });
  const agent = createHarnessAgent({ host: f.host, harness });
  try {
    const initial = await f.settings.read();
    await f.settings.save({ ...initial, settings: { ...initial.settings, tokenLimit: 1000 } });
    await firstValueFrom(
      agent
        .run({
          threadId: "goal",
          runId: crypto.randomUUID(),
          messages: [],
          state: {},
          tools: [],
          context: [],
          forwardedProps: { starterGoal: { action: "start", objective: "Complete the task" } },
        })
        .pipe(toArray()),
    );
    expect(f.calls()).toBe(1);
    expect(checks).toBe(0);
    const session = await f.host.open(harness, { threadId: "goal" });
    expect(session.snapshot().plugins["tanstack/goal"]).toMatchObject({ status: "paused" });
    await session.close();
  } finally {
    await f.host.close();
  }
});

test("price lookup uses the selected catalog ID when aliases share an adapter model", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["cheap", "expensive"]);
  const adapter = scriptedAdapter(async function* () {
    for await (const chunk of answer())
      yield chunk.type === "RUN_FINISHED"
        ? { ...chunk, usage: { promptTokens: 1000, completionTokens: 0, totalTokens: 1000 } }
        : chunk;
  });
  const models = { cheap: adapter, expensive: { ...adapter } };
  const initial = await settings.read();
  await settings.save({
    ...initial,
    settings: {
      ...initial.settings,
      models: {
        cheap: {
          contextWindow: 32768,
          prices: { input: 1, output: 1, cacheRead: 1, cacheWrite: 1 },
        },
        expensive: {
          contextWindow: 32768,
          prices: { input: 10, output: 10, cacheRead: 10, cacheWrite: 10 },
        },
      },
    },
  });
  const ledger = createExecutionUsage({ metadata: persistence.stores.metadata!, settings, models });
  const harness = defineHarness({
    name: "alias-prices",
    adapter,
    models,
    middleware: [ledger.middleware],
    plugins: () => [ledger.plugin],
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "alias" });
    await session.updateThreadSettings({ settings: { model: "expensive" } });
    await session.send("Hello");
    expect((await ledger.read("alias")).knownCost).toBeCloseTo(0.01);
    await session.close();
  } finally {
    await host.close();
  }
});
