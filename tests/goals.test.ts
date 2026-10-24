import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventType, toolDefinition } from "@tanstack/ai";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { z } from "zod";
import { openLogStore } from "../src/server/storage/log-store.js";
import { randomUUID } from "node:crypto";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { goal } from "@tanstack/ai-harness/plugins";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { firstValueFrom, toArray } from "rxjs";
import { expect, test, vi } from "vitest";
import { createHarnessAgent } from "../src/server/agent/bridge.js";
import { answer, scriptedAdapter } from "./provider.js";

test("streams every native Goal round and its persisted state through one outer run", async () => {
  let rounds = 0;
  let checks = 0;
  const adapter = scriptedAdapter(async function* () {
    rounds++;
    yield* answer();
  });
  const judge = scriptedAdapter(answer);
  judge.structuredOutput = async () => {
    const data = { met: ++checks === 2, reason: checks === 2 ? "Verified" : "More work" };
    return { data, rawText: JSON.stringify(data) };
  };
  const host = createHarnessHost({ persistence: memoryPersistence() });
  const harness = defineHarness({ name: "test/goals", adapter, plugins: () => [goal({ judge })] });
  const agent = createHarnessAgent({ host, harness });
  const threadId = randomUUID();
  const runId = randomUUID();
  try {
    const events = await firstValueFrom(
      agent
        .run({
          threadId,
          runId,
          state: {},
          tools: [],
          context: [],
          forwardedProps: { starterGoal: { action: "start", objective: "Verify the project" } },
          messages: [{ id: randomUUID(), role: "user", content: "Goal: Verify the project" }],
        })
        .pipe(toArray()),
    );
    expect(rounds).toBe(2);
    expect(checks).toBe(2);
    expect(events.filter((event) => event.type === "RUN_STARTED")).toHaveLength(1);
    expect(events.filter((event) => event.type === "RUN_FINISHED")).toEqual([
      expect.objectContaining({ threadId, runId }),
    ]);
    expect(events.filter((event) => event.type === "TEXT_MESSAGE_CONTENT")).toHaveLength(2);
    expect(events.filter((event) => event.type === "STATE_SNAPSHOT").at(-1)).toMatchObject({
      snapshot: { plugins: { "tanstack/goal": { status: "met", round: 2, reason: "Verified" } } },
    });
  } finally {
    await host.close();
  }
});

function goalFixture(
  options: { maxRounds?: number; failJudge?: boolean; failModel?: boolean; met?: boolean } = {},
) {
  let rounds = 0;
  const adapter = scriptedAdapter(async function* () {
    rounds++;
    if (options.failModel) throw new Error("Provider offline");
    yield* answer();
  });
  const judge = scriptedAdapter(answer);
  judge.structuredOutput = async () => {
    if (options.failJudge) throw new Error("Judge offline");
    const data = { met: options.met ?? false, reason: "Checked evidence" };
    return { data, rawText: JSON.stringify(data) };
  };
  const host = createHarnessHost({ persistence: memoryPersistence() });
  const harness = defineHarness({
    name: "test/goals",
    adapter,
    plugins: () => [goal({ judge, maxRounds: options.maxRounds ?? 2 })],
  });
  const agent = createHarnessAgent({ host, harness });
  const request = (
    action: "start" | "resume" | "stop" = "start",
    threadId = "goal-thread",
    objective = "Verify the project",
  ) => ({
    threadId,
    runId: randomUUID(),
    state: {},
    tools: [],
    context: [],
    forwardedProps: { starterGoal: action === "start" ? { action, objective } : { action } },
    messages: [{ id: randomUUID(), role: "user" as const, content: "Goal: Verify the project" }],
  });
  return { host, harness, agent, request, rounds: () => rounds };
}

for (const failure of ["failJudge", "failModel"] as const) {
  test(`${failure} pauses the native goal without starting another round`, async () => {
    const f = goalFixture({ [failure]: true });
    try {
      const events = await firstValueFrom(f.agent.run(f.request()).pipe(toArray()));
      expect(f.rounds()).toBe(1);
      const session = await f.host.open(f.harness, { threadId: "goal-thread" });
      expect(session.snapshot().plugins["tanstack/goal"]).toMatchObject({
        status: "paused",
        round: 1,
      });
      expect(events.some((event) => event.type === "RUN_ERROR")).toBe(failure === "failModel");
      await session.close();
    } finally {
      await f.host.close();
    }
  });
}

test("the round limit stops work; explicit resume starts a new bounded sequence", async () => {
  const f = goalFixture();
  try {
    await firstValueFrom(f.agent.run(f.request()).pipe(toArray()));
    expect(f.rounds()).toBe(2);
    await firstValueFrom(f.agent.run(f.request("resume")).pipe(toArray()));
    expect(f.rounds()).toBe(4);
    const session = await f.host.open(f.harness, { threadId: "goal-thread" });
    expect(session.snapshot().plugins["tanstack/goal"]).toMatchObject({
      status: "stopped",
      round: 2,
      note: expect.stringContaining("round limit"),
    });
    await session.close();
  } finally {
    await f.host.close();
  }
});

test("completed command retries do not run the model twice; threads retain separate goals", async () => {
  const f = goalFixture({ met: true });
  try {
    const request = f.request();
    await firstValueFrom(f.agent.run(request).pipe(toArray()));
    await firstValueFrom(f.agent.run(request).pipe(toArray()));
    expect(f.rounds()).toBe(1);
    await firstValueFrom(
      f.agent.run(f.request("start", "other", "Inspect documentation")).pipe(toArray()),
    );
    const first = await f.host.open(f.harness, { threadId: "goal-thread" });
    const second = await f.host.open(f.harness, { threadId: "other" });
    expect(first.snapshot().plugins["tanstack/goal"]).toMatchObject({ text: "Verify the project" });
    expect(second.snapshot().plugins["tanstack/goal"]).toMatchObject({
      text: "Inspect documentation",
    });
    await first.close();
    await second.close();
  } finally {
    await f.host.close();
  }
});

for (const objective of ["", "  ", "resume", "stop", "x".repeat(4001)]) {
  test(`rejects invalid goal input (${objective.length} characters) without model use`, async () => {
    const f = goalFixture();
    try {
      await expect(
        firstValueFrom(f.agent.run(f.request("start", "invalid", objective)).pipe(toArray())),
      ).rejects.toThrow();
      expect(f.rounds()).toBe(0);
    } finally {
      await f.host.close();
    }
  });
}

test("cancelling an active Goal stops its model and queued continuation", async () => {
  let started = false;
  let cancelled = false;
  let rounds = 0;
  const adapter = scriptedAdapter(async function* (options) {
    rounds++;
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
  const judge = scriptedAdapter(answer);
  judge.structuredOutput = async () => ({
    data: { met: false, reason: "More work" },
    rawText: "{}",
  });
  const host = createHarnessHost({ persistence: memoryPersistence() });
  const harness = defineHarness({
    name: "test/cancel-goal",
    adapter,
    plugins: () => [goal({ judge })],
  });
  try {
    const agent = createHarnessAgent({ host, harness });
    const sub = agent
      .run({
        threadId: "cancel-goal",
        runId: randomUUID(),
        state: {},
        context: [],
        tools: [],
        forwardedProps: { starterGoal: { action: "start", objective: "Keep working" } },
        messages: [],
      })
      .subscribe();
    await vi.waitFor(() => expect(started).toBe(true));
    sub.unsubscribe();
    await vi.waitFor(() => expect(cancelled).toBe(true));
    const session = await host.open(harness, { threadId: "cancel-goal" });
    await session.whenIdle();
    expect(session.snapshot().plugins["tanstack/goal"]).toMatchObject({ status: "stopped" });
    expect(rounds).toBe(1);
    await session.close();
  } finally {
    await host.close();
  }
});

test("Goal approval pauses, resolves once, and requires explicit resume", async () => {
  let calls = 0;
  let writes = 0;
  const tool = toolDefinition({
    name: "edit_project",
    description: "Edit project",
    needsApproval: true,
    inputSchema: z.object({}),
  }).server(async () => {
    writes++;
    return "edited";
  });
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
      toolCallId: "goal-edit",
      toolCallName: "edit_project",
      timestamp: Date.now(),
    };
    yield {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: "goal-edit",
      delta: "{}",
      timestamp: Date.now(),
    };
    yield { type: EventType.TOOL_CALL_END, toolCallId: "goal-edit", timestamp: Date.now() };
    yield {
      type: EventType.RUN_FINISHED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
      metadata: { tanstack: { finishReason: "tool_calls" } },
    };
  });
  const judge = scriptedAdapter(answer);
  judge.structuredOutput = async () => ({ data: { met: true, reason: "Verified" }, rawText: "{}" });
  const host = createHarnessHost({ persistence: memoryPersistence() });
  const harness = defineHarness({
    name: "test/goal-approval",
    adapter,
    tools: [tool],
    plugins: () => [goal({ judge })],
  });
  try {
    const agent = createHarnessAgent({ host, harness });
    agent.messages = [{ id: randomUUID(), role: "user", content: "Goal: edit project" }];
    await agent.runAgent({
      forwardedProps: { starterGoal: { action: "start", objective: "Edit project" } },
    });
    expect(writes).toBe(0);
    expect(agent.pendingInterrupts).toHaveLength(1);
    expect(agent.state).toMatchObject({ plugins: { "tanstack/goal": { status: "paused" } } });
    await expect(
      agent.runAgent({ forwardedProps: { starterGoal: { action: "stop" } } }),
    ).rejects.toThrow("pending interrupt");
    expect(agent.pendingInterrupts).toHaveLength(1);
    await agent.runAgent({
      resume: [{ interruptId: agent.pendingInterrupts[0]!.id, status: "resolved", payload: true }],
    });
    expect(writes).toBe(1);
    expect(agent.pendingInterrupts).toHaveLength(0);
    expect(calls).toBe(2);
    await agent.runAgent({ forwardedProps: { starterGoal: { action: "resume" } } });
    expect(writes).toBe(1);
    expect(agent.state).toMatchObject({ plugins: { "tanstack/goal": { status: "met" } } });
  } finally {
    await host.close();
  }
});

test("a paused Goal survives a SQLite close and reopen and resumes through the public bridge", async () => {
  const directory = await mkdtemp(join(tmpdir(), "goal-restart-"));
  const path = join(directory, "state.sqlite");
  let store = openLogStore(path);
  let host = createHarnessHost({
    persistence: defineAIPersistence({ stores: { log: store.log } }),
  });
  const judge = scriptedAdapter(answer);
  judge.structuredOutput = async () => {
    throw new Error("Judge temporarily unavailable");
  };
  const harness = defineHarness({
    name: "test/goal-restart",
    adapter: scriptedAdapter(answer),
    plugins: () => [goal({ judge })],
  });
  const threadId = randomUUID();
  try {
    let agent = createHarnessAgent({ host, harness });
    agent.threadId = threadId;
    agent.messages = [{ id: randomUUID(), role: "user", content: "Goal: inspect project" }];
    await agent.runAgent({
      forwardedProps: { starterGoal: { action: "start", objective: "Inspect project" } },
    });
    await host.close();
    store.close();
    store = openLogStore(path);
    host = createHarnessHost({ persistence: defineAIPersistence({ stores: { log: store.log } }) });
    const session = await host.open(harness, { threadId });
    expect(session.snapshot().plugins["tanstack/goal"]).toMatchObject({
      text: "Inspect project",
      status: "paused",
    });
    await session.close();
    judge.structuredOutput = async () => ({
      data: { met: true, reason: "Verified after restart" },
      rawText: "{}",
    });
    agent = createHarnessAgent({ host, harness });
    agent.threadId = threadId;
    await agent.runAgent({ forwardedProps: { starterGoal: { action: "resume" } } });
    expect(agent.state).toMatchObject({
      plugins: { "tanstack/goal": { status: "met", reason: "Verified after restart" } },
    });
  } finally {
    await host.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("ordinary follow-up messages also publish the authoritative saved goal state", async () => {
  const f = goalFixture({ met: true });
  try {
    await firstValueFrom(f.agent.run(f.request()).pipe(toArray()));
    const request = {
      ...f.request(),
      forwardedProps: {},
      messages: [{ id: randomUUID(), role: "user" as const, content: "Explain the result" }],
    };
    const events = await firstValueFrom(f.agent.run(request).pipe(toArray()));
    expect(events.filter((event) => event.type === "STATE_SNAPSHOT").at(-1)).toMatchObject({
      snapshot: { plugins: { "tanstack/goal": { status: "met" } } },
    });
  } finally {
    await f.host.close();
  }
});

test("simultaneous goal commands admit only one sequence", async () => {
  const f = goalFixture({ met: true });
  try {
    const results = await Promise.allSettled([
      firstValueFrom(f.agent.run(f.request()).pipe(toArray())),
      firstValueFrom(f.agent.clone().run(f.request()).pipe(toArray())),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(f.rounds()).toBe(1);
  } finally {
    await f.host.close();
  }
});

test("an unfinished objective cannot be replaced without an explicit stop", async () => {
  const f = goalFixture({ failJudge: true });
  try {
    await firstValueFrom(f.agent.run(f.request()).pipe(toArray()));
    await expect(
      firstValueFrom(
        f.agent.run(f.request("start", "goal-thread", "Another objective")).pipe(toArray()),
      ),
    ).rejects.toThrow();
    expect(f.rounds()).toBe(1);
    await firstValueFrom(f.agent.run(f.request("stop")).pipe(toArray()));
    await firstValueFrom(
      f.agent.run(f.request("start", "goal-thread", "Another objective")).pipe(toArray()),
    );
    expect(f.rounds()).toBe(2);
  } finally {
    await f.host.close();
  }
});
