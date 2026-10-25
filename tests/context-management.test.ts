import { expect, test } from "vitest";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { projectCompaction } from "@tanstack/ai-compaction";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { contextManagement } from "../src/server/agent/context-management.js";
import { createExecutionSettings } from "../src/server/agent/execution-settings.js";
import { answer, scriptedAdapter } from "./provider.js";

test("durable compaction keeps full history, folds model context, and survives reopen", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const initial = await settings.read();
  await settings.save({
    ...initial,
    settings: { ...initial.settings, models: { coder: { contextWindow: 4096, prices: null } } },
  });
  const modelInputs: unknown[] = [];
  const adapter = scriptedAdapter(async function* (options) {
    modelInputs.push(options.messages);
    yield* answer();
  });
  const harness = defineHarness({
    name: "context-test",
    adapter,
    models: { coder: adapter },
    durability: { addRecordsToModelContext: { version: "v1", record: projectCompaction } },
    plugins: () => [
      contextManagement({ settings, models: { coder: adapter }, defaultModel: "coder" }),
    ],
  });
  let host = createHarnessHost({ persistence });
  try {
    let session = await host.open(harness, { threadId: "one" });
    await session.send("Keep this original message: " + "a ".repeat(9000));
    await session.send("What was the task?");
    const full = await session.transcript();
    expect(JSON.stringify(full)).toContain("Keep this original message");
    expect(
      modelInputs.some((messages) =>
        JSON.stringify(messages).includes("untrusted-conversation-summary"),
      ),
    ).toBe(true);
    expect(session.snapshot().plugins["starter/context"]).toMatchObject({ status: "ready" });
    await session.close();
    await host.close();
    host = createHarnessHost({ persistence });
    session = await host.open(harness, { threadId: "one" });
    await session.send("Continue.");
    expect(JSON.stringify(modelInputs.at(-1))).toContain("untrusted-conversation-summary");
    expect(JSON.stringify(await session.transcript())).toContain("Keep this original message");
    await session.close();
  } finally {
    await host.close();
  }
});

test("a scheduled summary on short history settles after the next turn", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const adapter = scriptedAdapter(answer);
  const harness = defineHarness({
    name: "short-context",
    adapter,
    models: { coder: adapter },
    durability: { addRecordsToModelContext: { version: "v1", record: projectCompaction } },
    plugins: () => [
      contextManagement({ settings, models: { coder: adapter }, defaultModel: "coder" }),
    ],
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "short" });
    await session.runCommand({ name: "compact-next" });
    await session.send("Hello");
    expect(session.snapshot().plugins["starter/context"]).toMatchObject({ status: "ready" });
    await session.close();
  } finally {
    await host.close();
  }
});

test("changing automatic summaries applies on the next turn", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  let initial = await settings.read();
  await settings.save({
    ...initial,
    settings: {
      ...initial.settings,
      autoCompact: false,
      compactAt: 50,
      models: { coder: { contextWindow: 8192, prices: null } },
    },
  });
  let summaries = 0;
  const adapter = scriptedAdapter(async function* (options) {
    if (JSON.stringify(options.systemPrompts).includes("Summarize the supplied")) summaries++;
    yield* answer();
  });
  const harness = defineHarness({
    name: "toggle-context",
    adapter,
    models: { coder: adapter },
    durability: { addRecordsToModelContext: { version: "v1", record: projectCompaction } },
    plugins: () => [
      contextManagement({ settings, models: { coder: adapter }, defaultModel: "coder" }),
    ],
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "toggle" });
    await session.send("a ".repeat(10000));
    await session.send("Continue");
    expect(summaries).toBe(0);
    initial = await settings.read();
    await settings.save({ ...initial, settings: { ...initial.settings, autoCompact: true } });
    await session.send("Continue again");
    expect(summaries).toBeGreaterThan(0);
    await session.close();
  } finally {
    await host.close();
  }
});

test("after-turn compaction settles its visible state", async () => {
  const persistence = memoryPersistence();
  const settings = createExecutionSettings(persistence.stores.metadata!, ["coder"]);
  const initial = await settings.read();
  await settings.save({
    ...initial,
    settings: { ...initial.settings, models: { coder: { contextWindow: 8192, prices: null } } },
  });
  const adapter = scriptedAdapter(async function* () {
    for await (const chunk of answer())
      yield chunk.type === "RUN_FINISHED"
        ? { ...chunk, usage: { promptTokens: 9000, completionTokens: 10, totalTokens: 9010 } }
        : chunk;
  });
  const harness = defineHarness({
    name: "after-turn-context",
    adapter,
    models: { coder: adapter },
    durability: { addRecordsToModelContext: { version: "v1", record: projectCompaction } },
    plugins: () => [
      contextManagement({ settings, models: { coder: adapter }, defaultModel: "coder" }),
    ],
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "after" });
    await session.send("a ".repeat(10000));
    expect(session.snapshot().plugins["starter/context"]).toMatchObject({ status: "ready" });
    await session.close();
  } finally {
    await host.close();
  }
});
