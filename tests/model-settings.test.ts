import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { expect, test } from "vitest";
import { openLogStore } from "../src/server/storage/log-store.js";
import { createModelSettings, selectedModelGoal } from "../src/server/agent/model-settings.js";
import { answer, scriptedAdapter } from "./provider.js";

test("native model selection survives restart, isolates threads, and drives goal checks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "starter-models-"));
  const calls: string[] = [];
  const make = (id: string) => {
    const adapter = scriptedAdapter(async function* () {
      calls.push(id);
      yield* answer();
    });
    adapter.structuredOutput = async () => {
      calls.push(`${id}-judge`);
      return { data: { met: true, reason: "Done" }, rawText: '{"met":true,"reason":"Done"}' };
    };
    return adapter;
  };
  const models = { first: make("first"), second: make("second") };
  const harness = defineHarness({
    name: "models-test",
    adapter: models.first,
    models,
    plugins: () => [selectedModelGoal(models, "first")],
  });
  const open = () => {
    const store = openLogStore(join(directory, "harness.sqlite"));
    const host = createHarnessHost({
      persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
    });
    return {
      store,
      host,
      settings: createModelSettings({ host, harness, defaultModel: "first", models }),
    };
  };
  let current = open();
  try {
    expect((await current.settings.read("one")).modelId).toBe("first");
    await expect(current.settings.set("one", "unknown")).rejects.toThrow();
    await current.settings.set("one", "second");
    expect((await current.settings.read("two")).modelId).toBe("first");
    await current.host.close();
    current.store.close();
    current = open();
    expect((await current.settings.read("one")).modelId).toBe("second");
    const session = await current.host.open(harness, { threadId: "one" });
    await session.send("Hello");
    await session.runCommand({ name: "goal", input: "Finish this goal" });
    await session.whenIdle();
    expect(calls).toContain("second");
    expect(calls).toContain("second-judge");
    expect(calls).not.toContain("first");
    expect(calls).not.toContain("first-judge");
    await session.close();
  } finally {
    await current.host.close();
    current.store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("an active turn refuses model changes without affecting another thread", async () => {
  const { memoryPersistence } = await import("@tanstack/ai-persistence");
  let release!: () => void;
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = scriptedAdapter(async function* () {
    started();
    await gate;
    yield* answer();
  });
  const models = { first, second: scriptedAdapter(answer) };
  const harness = defineHarness({ name: "active-models", adapter: first, models });
  const host = createHarnessHost({ persistence: memoryPersistence() });
  const settings = createModelSettings({ host, harness, defaultModel: "first", models });
  const session = await host.open(harness, { threadId: "active" });
  try {
    const turn = session.send("Start");
    await entered;
    await expect(settings.set("active", "second")).rejects.toThrow(/Finish or stop/);
    await settings.set("other", "second");
    expect((await settings.read("active")).modelId).toBe("first");
    release();
    await turn;
    await settings.set("active", "second");
    expect((await settings.read("active")).modelId).toBe("second");
  } finally {
    release();
    await session.close();
    await host.close();
  }
});
