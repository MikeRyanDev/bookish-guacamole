import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { EventType } from "@tanstack/ai";
import { createHarnessHost } from "@tanstack/ai-harness";
import { expect, test, vi } from "vitest";
import { createHarnessAgent } from "../src/bridge.js";
import { createCodingHarness } from "../src/harness.js";
import { answer, scriptedAdapter } from "./provider.js";

test("catalog instructions point to callable tools that load skills and supporting files", async () => {
  const root = await mkdtemp(join(tmpdir(), "coding-skills-"));
  const snapshot = vi.spyOn(SkillRegistry.prototype, "acquireSnapshot").mockResolvedValue({
    revision: "1",
    etag: "test",
    skills: [
      {
        name: "validation",
        description: "Validate names",
        files: [
          {
            path: "SKILL.md",
            size: 17,
            sha256: "test",
            text: "Reject blank names",
          },
          {
            path: "examples.txt",
            size: 12,
            sha256: "test",
            text: "Test spaces",
          },
        ],
      },
    ],
  });
  const host = createHarnessHost();
  let call = 0;
  const names: string[] = [];
  const prompts: string[] = [];
  const adapter = scriptedAdapter(async function* (options) {
    prompts.push(JSON.stringify(options.systemPrompts));
    names.push(...(options.tools ?? []).map((tool) => tool.name));
    const request = [
      { name: "list_learned_skills", args: {} },
      { name: "copilotkit_load_skill", args: { name: "validation" } },
      {
        name: "copilotkit_read_skill_file",
        args: { name: "validation", path: "examples.txt" },
      },
    ][call++];
    if (!request) {
      yield* answer();
      return;
    }
    const timestamp = Date.now();
    const toolCallId = randomUUID();
    yield {
      type: EventType.RUN_STARTED,
      runId: "provider",
      threadId: "provider",
      timestamp,
    };
    yield {
      type: EventType.TOOL_CALL_START,
      toolCallId,
      toolCallName: request.name,
      timestamp,
    };
    yield {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: JSON.stringify(request.args),
      timestamp,
    };
    yield { type: EventType.TOOL_CALL_END, toolCallId, timestamp };
    yield {
      type: EventType.RUN_FINISHED,
      runId: "provider",
      threadId: "provider",
      timestamp,
      metadata: { tanstack: { finishReason: "tool_calls" } },
    };
  });
  const agent = createHarnessAgent({
    host,
    harness: createCodingHarness({
      root,
      adapter,
      intelligence: new CopilotKitIntelligence({
        apiKey: "test",
        apiUrl: "http://localhost:9",
        wsUrl: "ws://localhost:9",
      }),
      containerId: "coding-lessons",
    }),
  });
  const results: string[] = [];
  agent.subscribe({
    onToolCallResultEvent: ({ event }) => {
      results.push(String(event.content));
    },
  });
  agent.addMessage({
    id: randomUUID(),
    role: "user",
    content: "Use validation skills.",
  });
  try {
    await agent.runAgent({ runId: randomUUID() });
    expect(prompts[0]).toContain("Validate names");
    expect(prompts[0]).toContain("copilotkit_load_skill");
    expect(names).toContain("copilotkit_load_skill");
    expect(names).toContain("copilotkit_read_skill_file");
    expect(results.join("\n")).toContain("Reject blank names");
    expect(results).toContain("Test spaces");
  } finally {
    snapshot.mockRestore();
    await host.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("each turn refreshes its catalog and a failed refresh cannot reuse old skills", async () => {
  const root = await mkdtemp(join(tmpdir(), "skills-refresh-"));
  const registry = vi
    .spyOn(SkillRegistry.prototype, "acquireSnapshot")
    .mockResolvedValueOnce({
      revision: "1",
      etag: "one",
      skills: [{ name: "first", description: "First catalog", files: [] }],
    })
    .mockResolvedValueOnce({
      revision: "2",
      etag: "two",
      skills: [{ name: "second", description: "Second catalog", files: [] }],
    })
    .mockRejectedValueOnce(new Error("Registry unavailable"));
  const prompts: string[] = [];
  const host = createHarnessHost();
  const agent = createHarnessAgent({
    host,
    harness: createCodingHarness({
      root,
      intelligence: new CopilotKitIntelligence({
        apiKey: "test",
        apiUrl: "http://localhost:9",
        wsUrl: "ws://localhost:9",
      }),
      containerId: "coding-lessons",
      adapter: scriptedAdapter(async function* (options) {
        prompts.push(JSON.stringify(options.systemPrompts));
        yield* answer();
      }),
    }),
  });
  try {
    for (let turn = 0; turn < 3; turn++) {
      agent.addMessage({ id: randomUUID(), role: "user", content: `Turn ${turn}` });
      await agent.runAgent({ runId: randomUUID() });
    }
    expect(registry).toHaveBeenCalledTimes(3);
    expect(prompts[0]).toContain("First catalog");
    expect(prompts[1]).toContain("Second catalog");
    expect(prompts[1]).not.toContain("First catalog");
    expect(prompts[2]).toContain("could not be loaded");
    expect(prompts[2]).not.toContain("Second catalog");
  } finally {
    registry.mockRestore();
    await host.close();
    await rm(root, { recursive: true, force: true });
  }
});
