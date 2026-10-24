import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { permissions } from "@tanstack/ai-harness/plugins";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import { openLogStore } from "../src/log-store.js";
import { createPermissionSettings } from "../src/permission-settings.js";
import { scriptedAdapter, answer } from "./provider.js";

test("metadata revisions survive restart and reject stale writers after delete", async () => {
  const dir = await mkdtemp(join(tmpdir(), "permissions-"));
  let store = openLogStore(join(dir, "state.sqlite"));
  try {
    await store.metadata.set("n", "k", ["first"]);
    const first = await store.metadata.getVersioned!("n", "k");
    await store.metadata.delete("n", "k");
    await store.metadata.set("n", "k", ["second"]);
    expect(await store.metadata.setIf!("n", "k", ["stale"], first!.revision)).toEqual({
      ok: false,
      reason: "conflict",
    });
    store.close();
    store = openLogStore(join(dir, "state.sqlite"));
    expect(await store.metadata.get("n", "k")).toEqual(["second"]);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("new conversations use acceptEdits; old conversations retain default; modes survive restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "modes-"));
  const path = join(dir, "state.sqlite");
  let store = openLogStore(path);
  let host = createHarnessHost({
    persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
  });
  const harness = defineHarness({
    name: "test/permissions",
    adapter: scriptedAdapter(answer),
    plugins: () => [permissions({ root: dir })],
  });
  try {
    const old = await host.open(harness, { threadId: "old" });
    await old.setPluginSetting({ key: "mode", value: "default" });
    await old.close();
    let settings = createPermissionSettings({ host, harness, store, root: dir });
    expect((await settings.read("old")).mode).toBe("default");
    expect((await settings.read("new")).mode).toBe("acceptEdits");
    expect((await settings.set("new", "bypass")).mode).toBe("bypass");
    await expect(settings.set("new", "invalid")).rejects.toThrow();
    await host.close();
    store.close();
    store = openLogStore(path);
    host = createHarnessHost({
      persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
    });
    settings = createPermissionSettings({ host, harness, store, root: dir });
    expect((await settings.read("new")).mode).toBe("bypass");
    expect((await settings.set("new", "plan")).mode).toBe("plan");
  } finally {
    await host.close();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

import { readFile } from "node:fs/promises";
import { EventType } from "@tanstack/ai";
import { workspaceTools } from "@tanstack/ai-harness/plugins/coding";
import { createHarnessAgent } from "../src/bridge.js";
import { permissionPreview, PREVIEW_PLUGIN } from "../src/permission-preview.js";
import { randomUUID } from "node:crypto";

async function codingFixture() {
  const root = await mkdtemp(join(tmpdir(), "permission-tools-"));
  const path = join(root, "state.sqlite");
  let store = openLogStore(path);
  let host = createHarnessHost({
    persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
  });
  let next = [
    {
      name: "write_file",
      args: { path: "hello.txt", content: "hello" } as Record<string, unknown>,
    },
  ];
  let calls = 0;
  const adapter = scriptedAdapter(async function* () {
    if (calls++ % 2) {
      yield* answer();
      return;
    }
    yield {
      type: EventType.RUN_STARTED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
    };
    for (const tool of next) {
      const id = randomUUID();
      yield {
        type: EventType.TOOL_CALL_START,
        toolCallId: id,
        toolCallName: tool.name,
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: id,
        delta: JSON.stringify(tool.args),
        timestamp: Date.now(),
      };
      yield { type: EventType.TOOL_CALL_END, toolCallId: id, timestamp: Date.now() };
    }
    yield {
      type: EventType.RUN_FINISHED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
      metadata: { tanstack: { finishReason: "tool_calls" } },
    };
  });
  const harness = defineHarness({
    name: "test/coding-modes",
    adapter,
    plugins: () => [
      workspaceTools({ root, web: false, outside: "deny", editStyle: "patch" }),
      permissionPreview(root),
      permissions({
        root,
        rules: [{ tool: "write_file", resource: "denied.txt", decision: "deny" }],
      }),
    ],
  });
  let settings = createPermissionSettings({ host, harness, store, root });
  return {
    root,
    get settings() {
      return settings;
    },
    get host() {
      return host;
    },
    harness,
    tool(name: string, args: Record<string, unknown>) {
      next = [{ name, args }];
      calls = 0;
    },
    tools(tools: typeof next) {
      next = tools;
      calls = 0;
    },
    agent(threadId: string = randomUUID()) {
      const agent = createHarnessAgent({ host, harness, initialize: settings.initialize });
      agent.threadId = threadId;
      return agent;
    },
    async restart() {
      await host.close();
      store.close();
      store = openLogStore(path);
      host = createHarnessHost({
        persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
      });
      settings = createPermissionSettings({ host, harness, store, root });
    },
    async close() {
      await host.close();
      store.close();
      await rm(root, { recursive: true, force: true });
    },
  };
}
async function send(agent: ReturnType<typeof createHarnessAgent>) {
  agent.messages = [
    ...agent.messages,
    { id: randomUUID(), role: "user", content: "Do the requested operation" },
  ];
  await agent.runAgent({ runId: randomUUID() });
}

for (const mode of ["default", "acceptEdits", "plan", "bypass"] as const) {
  test(`native ${mode} applies to file edits`, async () => {
    const f = await codingFixture();
    try {
      const agent = f.agent();
      await f.settings.set(agent.threadId, mode);
      await send(agent);
      expect(agent.pendingInterrupts).toHaveLength(mode === "default" ? 1 : 0);
      if (mode === "acceptEdits" || mode === "bypass")
        expect(await readFile(join(f.root, "hello.txt"), "utf8")).toBe("hello");
      else await expect(readFile(join(f.root, "hello.txt"))).rejects.toThrow();
    } finally {
      await f.close();
    }
  });
}

test("YOLO bypasses a deny; leaving YOLO restores it without changing saved rules", async () => {
  const f = await codingFixture();
  try {
    const agent = f.agent();
    f.tool("write_file", { path: "denied.txt", content: "first" });
    await f.settings.set(agent.threadId, "bypass");
    await send(agent);
    expect(await readFile(join(f.root, "denied.txt"), "utf8")).toBe("first");
    await f.settings.set(agent.threadId, "acceptEdits");
    f.tool("write_file", { path: "denied.txt", content: "second" });
    await send(agent);
    expect(await readFile(join(f.root, "denied.txt"), "utf8")).toBe("first");
    expect(await f.settings.list()).toEqual([]);
  } finally {
    await f.close();
  }
});

for (const name of ["bash", "write_file"]) {
  test(`acceptEdits still asks for ${name === "bash" ? "commands" : "sensitive files"}`, async () => {
    const f = await codingFixture();
    try {
      const agent = f.agent();
      f.tool(
        name,
        name === "bash" ? { command: "printf hello" } : { path: ".env", content: "fixture" },
      );
      await send(agent);
      expect(agent.pendingInterrupts).toHaveLength(1);
      await f.settings.set(agent.threadId, "bypass");
      const session = await f.host.open(f.harness, { threadId: agent.threadId });
      expect(session.snapshot().pendingWaits).toHaveLength(1);
      await session.close();
    } finally {
      await f.close();
    }
  });
}

test("remember scope matches native rules, survives restart, and removal clears open-session copies", async () => {
  const f = await codingFixture();
  try {
    let agent = f.agent();
    const thread = agent.threadId;
    await f.settings.set(thread, "default");
    await send(agent);
    const preview = agent.state.plugins[PREVIEW_PLUGIN].calls;
    const expected = Object.values(preview)[0] as { rules: unknown[] };
    const interrupt = agent.pendingInterrupts[0]!;
    await agent.runAgent({
      runId: randomUUID(),
      resume: [{ interruptId: interrupt.id, status: "resolved", payload: "always" }],
    });
    expect(await f.settings.list()).toEqual(expected.rules);
    f.tool("write_file", { path: "other.txt", content: "other" });
    await send(agent);
    expect(agent.pendingInterrupts).toHaveLength(1);
    await f.restart();
    agent = f.agent(thread);
    expect(await f.settings.list()).toEqual(expected.rules);
    const other = agent.pendingInterrupts;
    expect(other).toHaveLength(0); // fresh client, server retains the pause
    const second = f.agent();
    await f.settings.set(second.threadId, "default");
    f.tool("write_file", { path: "hello.txt", content: "again" });
    await send(second);
    expect(second.pendingInterrupts).toHaveLength(0);
    // Save in this open session, then remove: native memory must not retain it.
    f.tool("write_file", { path: "fresh.txt", content: "fresh" });
    await send(second);
    await second.runAgent({
      runId: randomUUID(),
      resume: [
        { interruptId: second.pendingInterrupts[0]!.id, status: "resolved", payload: "always" },
      ],
    });
    const rule = (await f.settings.list()).find((r) => r.resource === "fresh.txt")!;
    await f.settings.remove(rule);
    f.tool("write_file", { path: "fresh.txt", content: "after removal" });
    await send(second);
    expect(second.pendingInterrupts).toHaveLength(1);
  } finally {
    await f.close();
  }
});

test("duplicate approval after restart never repeats a shell side effect", async () => {
  const f = await codingFixture();
  try {
    let agent = f.agent();
    const thread = agent.threadId;
    f.tool("bash", { command: "printf x >> count.txt" });
    await send(agent);
    const resume = [
      { interruptId: agent.pendingInterrupts[0]!.id, status: "resolved" as const, payload: "once" },
    ];
    const runId = randomUUID();
    await agent.runAgent({ runId, resume });
    expect(await readFile(join(f.root, "count.txt"), "utf8")).toBe("x");
    await f.restart();
    agent = f.agent(thread);
    // A duplicate can return a replay or refusal. Neither can run the shell again.
    await agent.runAgent({ runId, resume }).catch(() => {});
    expect(await readFile(join(f.root, "count.txt"), "utf8")).toBe("x");
  } finally {
    await f.close();
  }
});

test("mode changes during a turn apply only to the next turn", async () => {
  const root = await mkdtemp(join(tmpdir(), "mode-boundary-"));
  const store = openLogStore(join(root, "state.sqlite"));
  const host = createHarnessHost({
    persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
  });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let started!: () => void;
  const entered = new Promise<void>((r) => (started = r));
  const adapter = scriptedAdapter(async function* () {
    started();
    await gate;
    yield {
      type: EventType.RUN_STARTED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
    };
    yield {
      type: EventType.TOOL_CALL_START,
      toolCallId: "write",
      toolCallName: "write_file",
      timestamp: Date.now(),
    };
    yield {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: "write",
      delta: JSON.stringify({ path: "hello.txt", content: "hello" }),
      timestamp: Date.now(),
    };
    yield { type: EventType.TOOL_CALL_END, toolCallId: "write", timestamp: Date.now() };
    yield {
      type: EventType.RUN_FINISHED,
      runId: "provider",
      threadId: "provider",
      timestamp: Date.now(),
      metadata: { tanstack: { finishReason: "tool_calls" } },
    };
  });
  const harness = defineHarness({
    name: "test/boundary",
    adapter,
    plugins: () => [workspaceTools({ root, web: false }), permissions({ root })],
  });
  const settings = createPermissionSettings({ host, harness, root, store });
  const agent = createHarnessAgent({ host, harness, initialize: settings.initialize });
  agent.threadId = randomUUID();
  try {
    await settings.set(agent.threadId, "default");
    const running = send(agent);
    await entered;
    await settings.set(agent.threadId, "bypass");
    release();
    await running;
    expect(agent.pendingInterrupts).toHaveLength(1);
    await expect(readFile(join(root, "hello.txt"))).rejects.toThrow();
    expect((await settings.read(agent.threadId)).mode).toBe("bypass");
  } finally {
    release();
    await host.close();
    store.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("multiple approvals retain separate scopes and execute only approved calls", async () => {
  const f = await codingFixture();
  try {
    const agent = f.agent();
    await f.settings.set(agent.threadId, "default");
    f.tools([
      { name: "write_file", args: { path: "one.txt", content: "one" } },
      { name: "write_file", args: { path: "two.txt", content: "two" } },
    ]);
    await send(agent);
    expect(agent.pendingInterrupts).toHaveLength(2);
    expect(Object.keys(agent.state.plugins[PREVIEW_PLUGIN].calls)).toHaveLength(2);
    await agent.runAgent({
      runId: randomUUID(),
      resume: agent.pendingInterrupts.map((item, index) => ({
        interruptId: item.id,
        status: "resolved",
        payload: index === 0 ? "once" : "reject",
      })),
    });
    expect(await readFile(join(f.root, "one.txt"), "utf8")).toBe("one");
    await expect(readFile(join(f.root, "two.txt"))).rejects.toThrow();
  } finally {
    await f.close();
  }
});

for (const tool of [
  {
    name: "patch",
    args: { patch: "*** Begin Patch\n*** Add File: patch.txt\n+hello\n*** End Patch" },
  },
  { name: "bash", args: { command: "printf one && printf two" } },
])
  test(`scope preview matches native saved rules for ${tool.name}`, async () => {
    const f = await codingFixture();
    try {
      const agent = f.agent();
      await f.settings.set(agent.threadId, "default");
      f.tool(tool.name, tool.args);
      await send(agent);
      const previews = Object.values(agent.state.plugins[PREVIEW_PLUGIN].calls) as {
        rules: unknown[];
      }[];
      await agent.runAgent({
        runId: randomUUID(),
        resume: [
          { interruptId: agent.pendingInterrupts[0]!.id, status: "resolved", payload: "always" },
        ],
      });
      expect(await f.settings.list()).toEqual(previews[0]!.rules);
    } finally {
      await f.close();
    }
  });
