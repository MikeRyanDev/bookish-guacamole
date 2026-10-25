import { expect, test } from "vitest";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { answer, scriptedAdapter } from "./provider.js";
import { createConnections, connectionsUpdateSchema } from "../src/server/agent/connections.js";

test("connections default off, persist references only, and reject stale changes", async () => {
  const persistence = memoryPersistence();
  const controller = createConnections(persistence.stores.metadata!, { root: process.cwd() });
  const initial = await controller.read();
  expect(initial.connections).toEqual([]);
  const saved = await controller.save({
    ...initial,
    connections: [
      {
        id: "docs",
        enabled: false,
        transport: {
          type: "http",
          url: "https://example.com/mcp",
          auth: "environment",
          tokenVariable: "STARTER_DOCS_TOKEN",
        },
      },
    ],
  });
  expect(saved.connections).toEqual(
    (await createConnections(persistence.stores.metadata!, { root: process.cwd() }).read())
      .connections,
  );
  await expect(controller.save(initial)).rejects.toThrow(/changed/);
  expect(
    connectionsUpdateSchema.safeParse({
      ...saved,
      connections: [...saved.connections, ...saved.connections],
    }).success,
  ).toBe(false);
  expect(
    connectionsUpdateSchema.safeParse({
      ...saved,
      connections: [
        {
          id: "bad",
          enabled: true,
          transport: { type: "http", url: "https://user:secret@example.com", auth: "none" },
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    connectionsUpdateSchema.safeParse({
      ...saved,
      connections: [
        {
          id: "bad",
          enabled: true,
          transport: { type: "http", url: "https://example.com?token=secret", auth: "none" },
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    connectionsUpdateSchema.safeParse({
      ...saved,
      connections: [
        {
          id: "bad",
          enabled: true,
          transport: {
            type: "stdio",
            command: "node",
            args: [],
            environment: { TOKEN: "raw-secret" },
          },
        },
      ],
    }).success,
  ).toBe(false);
});

test("the optional local MCP example connects and disappears after disabling and reload", async () => {
  const persistence = memoryPersistence();
  const controller = createConnections(persistence.stores.metadata!, { root: process.cwd() });
  const catalogs: string[][] = [];
  const harness = defineHarness({
    name: "mcp-test",
    adapter: scriptedAdapter(async function* (options) {
      catalogs.push(options.tools?.map((tool) => tool.name) ?? []);
      yield* answer();
    }),
    plugins: () => [controller.plugin()],
  });
  const host = createHarnessHost({ persistence });
  try {
    const session = await host.open(harness, { threadId: "one" });
    await session.send("List tools");
    expect(catalogs[0]).not.toContain("guide_starter_guide");
    const initial = await controller.read();
    const enabled = await controller.save({
      ...initial,
      connections: [{ id: "guide", enabled: true, transport: { type: "example" } }],
    });
    await host.reload(harness);
    await session.send("Read the guide");
    expect(catalogs[1]).toContain("guide_starter_guide");
    expect(await controller.status(session.snapshot().plugins["tanstack/mcp"])).toEqual([
      { id: "guide", status: "connected", toolCount: 1 },
    ]);
    await controller.save({
      ...enabled,
      connections: [{ ...enabled.connections[0]!, enabled: false }],
    });
    await host.reload(harness);
    await session.send("List tools again");
    expect(catalogs[2]).not.toContain("guide_starter_guide");
    await session.close();
  } finally {
    await host.close();
  }
}, 20000);

test("external MCP tools require approval and denial does not execute them", async () => {
  const { EventType } = await import("@tanstack/ai");
  const { createHarnessAgent } = await import("../src/server/agent/bridge.js");
  for (const approved of [false, true]) {
    const persistence = memoryPersistence();
    const controller = createConnections(persistence.stores.metadata!, { root: process.cwd() });
    await controller.save({
      ...(await controller.read()),
      connections: [
        {
          id: "external",
          enabled: true,
          transport: {
            type: "stdio",
            command: process.execPath,
            args: ["scripts/mcp-guide.mjs"],
            environment: {},
          },
        },
      ],
    });
    let iteration = 0;
    const adapter = scriptedAdapter(async function* () {
      if (iteration++ > 0) {
        yield* answer();
        return;
      }
      yield {
        type: EventType.TOOL_CALL_START,
        toolCallId: "external-call",
        toolCallName: "external_starter_guide",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: "external-call",
        delta: "{}",
        timestamp: Date.now(),
      };
      yield { type: EventType.TOOL_CALL_END, toolCallId: "external-call", timestamp: Date.now() };
      yield {
        type: EventType.RUN_FINISHED,
        runId: "provider",
        threadId: "provider",
        timestamp: Date.now(),
        metadata: { tanstack: { finishReason: "tool_calls" } },
      };
    });
    const harness = defineHarness({
      name: "mcp-approval",
      adapter,
      plugins: () => [controller.plugin()],
    });
    const host = createHarnessHost({ persistence });
    const agent = createHarnessAgent({ host, harness });
    agent.threadId = "mcp-approval";
    agent.messages = [{ id: "outer-user", role: "user", content: "Read the external guide" }];
    try {
      await agent.runAgent({ runId: crypto.randomUUID() });
      expect(agent.pendingInterrupts).toHaveLength(1);
      expect(JSON.stringify(agent.messages)).not.toContain("CopilotKit owns the conversation");
      const interrupt = agent.pendingInterrupts[0]!;
      await agent.runAgent({
        runId: crypto.randomUUID(),
        resume: [{ interruptId: interrupt.id, status: "resolved", payload: approved }],
      });
      expect(agent.pendingInterrupts).toHaveLength(0);
      expect(JSON.stringify(agent.messages).includes("CopilotKit owns the conversation")).toBe(
        approved,
      );
    } finally {
      await host.close();
    }
  }
}, 20000);
