import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { firstValueFrom, toArray } from "rxjs";
import { createHarnessHost, defineHarness, definePlugin } from "@tanstack/ai-harness";
import { workspaceTools, snapshots } from "@tanstack/ai-harness/plugins/coding";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { EventType } from "@tanstack/ai";
import { createUndo, historyOwnership } from "../src/server/agent/undo.js";
import { answer, scriptedAdapter } from "./provider.js";
import { createHarnessAgent } from "../src/server/agent/bridge.js";

test("native undo and redo reject later edits and retain outer message identities", async () => {
  const directory = await mkdtemp(join(tmpdir(), "starter-undo-"));
  const root = join(directory, "work");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(root);
  await writeFile(join(root, "file.txt"), "before");
  const persistence = memoryPersistence();
  const history = snapshots({ root, dataDir: join(directory, "snapshots") });
  let step = 0;
  const harness = defineHarness({
    name: "undo-test",
    adapter: scriptedAdapter(async function* () {
      if (step++ > 0) {
        yield* answer();
        return;
      }
      yield {
        type: EventType.TOOL_CALL_START,
        toolCallId: "write",
        toolCallName: "write_file",
        timestamp: Date.now(),
      };
      yield {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: "write",
        delta: JSON.stringify({ path: "file.txt", content: "after" }),
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
    }),
    plugins: () => [workspaceTools({ root, web: false }), history, historyOwnership()],
  });
  const host = createHarnessHost({ persistence });
  const undo = createUndo({ host, harness, history, metadata: persistence.stores.metadata! });
  try {
    const threadId = "one";
    const runId = randomUUID();
    const user = { id: "outer-user", role: "user" as const, content: "Change the file" };
    await undo.rememberInput({ threadId, runId, messages: [user] });
    const session = await host.open(harness, { threadId });
    await session.send(user.content, { inputId: runId });
    expect(await readFile(join(root, "file.txt"), "utf8")).toBe("after");
    const preview = await undo.preview(threadId);
    expect(preview.undo.available).toBe(true);
    expect(preview.undo.files).toEqual(["file.txt"]);
    await writeFile(join(root, "file.txt"), "human edit");
    await expect(undo.execute(threadId, "undo", preview.undo.revision!, [user])).rejects.toThrow(
      /changed/,
    );
    expect(await readFile(join(root, "file.txt"), "utf8")).toBe("human edit");
    const agent = createHarnessAgent({ host, harness, history: undo });
    const events = await firstValueFrom(
      agent
        .run({
          threadId,
          runId: randomUUID(),
          messages: [user],
          state: {},
          tools: [],
          context: [],
          forwardedProps: { starterHistory: { action: "undo", revision: preview.undo.revision } },
        })
        .pipe(toArray()),
    );
    expect(events.map((event) => event.type)).toEqual(["RUN_STARTED", "CUSTOM", "RUN_FINISHED"]);
    expect(events[1]).toMatchObject({
      name: "starter.history.rejected",
      value: { message: expect.stringContaining("Files changed after") },
    });
    expect(await readFile(join(root, "file.txt"), "utf8")).toBe("human edit");
    expect(await session.transcript()).not.toEqual([]);
    await writeFile(join(root, "file.txt"), "after");
    const removed = await undo.execute(threadId, "undo", preview.undo.revision!, [user]);
    expect(removed).toEqual([]);
    expect(await readFile(join(root, "file.txt"), "utf8")).toBe("before");
    const redo = await undo.preview(threadId);
    expect(redo.redo.available).toBe(true);
    const restored = await undo.execute(threadId, "redo", redo.redo.revision!, []);
    expect(restored.filter((message) => message.role === "user")).toEqual([user]);
    expect(await readFile(join(root, "file.txt"), "utf8")).toBe("after");
    await session.close();
  } finally {
    await host.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

test("the public bridge applies authoritative history snapshots without duplicate messages", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bridge-undo-"));
  const { mkdir } = await import("node:fs/promises");
  const root = join(directory, "work");
  await mkdir(root);
  const persistence = memoryPersistence();
  const history = snapshots({ root, dataDir: join(directory, "snapshots") });
  let reject = false;
  const harness = defineHarness({
    name: "undo-bridge",
    adapter: scriptedAdapter(answer),
    plugins: () => [
      workspaceTools({ root, web: false }),
      history,
      historyOwnership(),
      definePlugin({
        name: "admission",
        setup: () => ({
          middleware: [
            {
              onConfig: () => {
                if (reject) throw new Error("Limit reached");
              },
            },
          ],
        }),
      }),
    ],
  });
  const host = createHarnessHost({ persistence });
  const undo = createUndo({ host, harness, history, metadata: persistence.stores.metadata! });
  const agent = createHarnessAgent({ host, harness, history: undo });
  agent.threadId = "conversation";
  agent.messages = [{ id: "outer-user", role: "user", content: "Remember this" }];
  try {
    await agent.runAgent({ runId: randomUUID() });
    const originalIds = agent.messages.map((message) => message.id);
    const before = await undo.preview(agent.threadId);
    await agent.runAgent({
      runId: randomUUID(),
      forwardedProps: { starterHistory: { action: "undo", revision: before.undo.revision } },
    });
    expect(agent.messages).toEqual([]);
    const after = await undo.preview(agent.threadId);
    await agent.runAgent({
      runId: randomUUID(),
      forwardedProps: { starterHistory: { action: "redo", revision: after.redo.revision } },
    });
    expect(agent.messages.map((message) => message.id)).toEqual(originalIds);
    expect(agent.messages.filter((message) => message.role === "user")).toHaveLength(1);
    expect(JSON.stringify(agent.state)).not.toContain("tanstack/snapshots");
    reject = true;
    agent.messages.push({ id: "rejected-user", role: "user", content: "This call is blocked" });
    await agent.runAgent({ runId: randomUUID() }).catch(() => {});
    expect((await undo.preview(agent.threadId)).undo.available).toBe(false);
  } finally {
    await host.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
