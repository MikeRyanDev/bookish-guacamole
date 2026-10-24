import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { EventType } from "@tanstack/ai";
import { createHarnessHost } from "@tanstack/ai-harness";
import { expect, test, vi } from "vitest";
import { createHarnessAgent } from "../src/server/agent/bridge.js";
import { createCodingHarness } from "../src/server/agent/harness.js";
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
            text: "---\nname: validation\ndescription: Validate names\n---\nReject blank names",
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
      { name: "load_skill", args: { name: "validation" } },
      {
        name: "read_skill_resource",
        args: { skill: "validation", path: "examples.txt" },
      },
      { name: "read_skill_resource", args: { skill: "validation", path: "../outside.txt" } },
      { name: "read_skill_resource", args: { skill: "validation", path: "missing.txt" } },
      { name: "read_skill_resource", args: { skill: "unknown", path: "examples.txt" } },
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
    expect(prompts[0]).toContain("load_skill");
    expect(names).toContain("load_skill");
    expect(names).toContain("read_skill_resource");
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(prompts[0]).not.toContain("Reject blank names");
    expect(results.slice(0, 2).map((result) => JSON.parse(result))).toContainEqual({
      skill: "validation",
      content: "Reject blank names",
      resources: ["examples.txt"],
      scripts: [],
    });
    expect(results.slice(0, 2).map((result) => JSON.parse(result))).toContainEqual({
      skill: "validation",
      path: "examples.txt",
      content: "Test spaces",
      encoding: "utf8",
    });
    expect(results[2]).toContain("unsafe resource path");
    expect(results[3]).toContain("has no resource");
    expect(results[4]).toContain("no skill named");
    expect(names).not.toContain("list_learned_skills");
    expect(names).not.toContain("copilotkit_load_skill");
    expect(names).not.toContain("copilotkit_read_skill_file");
    snapshot.mockResolvedValueOnce({
      revision: "2",
      etag: "next",
      skills: [
        {
          name: "validation",
          description: "Updated validation",
          files: [
            { path: "SKILL.md", size: 1, sha256: "test", text: "New instructions" },
            { path: "examples.txt", size: 1, sha256: "test", text: "New example" },
          ],
        },
      ],
    });
    call = 0;
    agent.addMessage({ id: randomUUID(), role: "user", content: "Use the updated skill." });
    await agent.runAgent({ runId: randomUUID() });
    expect(snapshot).toHaveBeenCalledTimes(2);
    expect(JSON.parse(results[5]!)).toMatchObject({ content: "New instructions" });
    expect(JSON.parse(results[6]!)).toMatchObject({ content: "New example" });
    expect(prompts[6]).toContain("Updated validation");
    expect(prompts[6]).not.toContain("Validate names");
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

for (const failure of ["network", "corrupt"] as const) {
  test(`real SDK rejects ${failure} stale fallback and recovers on the next turn`, async () => {
    const root = await mkdtemp(join(tmpdir(), "skills-sdk-"));
    const bytes = await readFile(new URL("./fixtures/learned-skill.zip", import.meta.url));
    const etag = `"${createHash("sha256").update(bytes).digest("hex")}"`;
    const intelligence = new CopilotKitIntelligence({
      apiKey: "test",
      apiUrl: "http://localhost:9",
      wsUrl: "ws://localhost:9",
    });
    const fetch = vi
      .spyOn(intelligence, "getLearnedSkillsSnapshot")
      .mockResolvedValueOnce({
        status: "snapshot",
        revision: "1",
        etag,
        contentType: "application/zip",
        bytes,
      })
      .mockImplementationOnce(async () => {
        if (failure === "network") throw new Error("Network unavailable");
        return {
          status: "snapshot",
          revision: "2",
          etag,
          contentType: "application/zip",
          bytes: Buffer.from("corrupt archive"),
        };
      })
      .mockResolvedValueOnce({ status: "unchanged", revision: "1", etag });
    const prompts: string[] = [];
    const tools: string[][] = [];
    const host = createHarnessHost();
    const agent = createHarnessAgent({
      host,
      harness: createCodingHarness({
        root,
        intelligence,
        containerId: "coding-lessons",
        adapter: scriptedAdapter(async function* (options) {
          prompts.push(JSON.stringify(options.systemPrompts));
          tools.push((options.tools ?? []).map((tool) => tool.name));
          yield* answer();
        }),
      }),
    });
    try {
      for (let turn = 0; turn < 3; turn++) {
        agent.addMessage({ id: randomUUID(), role: "user", content: `Turn ${turn}` });
        await agent.runAgent({ runId: randomUUID() });
      }
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(prompts[0]).toContain("Validate names");
      expect(tools[0]).toContain("load_skill");
      expect(prompts[1]).toContain("could not be loaded");
      expect(prompts[1]).not.toContain("Validate names");
      expect(tools[1]).not.toContain("load_skill");
      expect(prompts[2]).toContain("Validate names");
      expect(tools[2]).toContain("load_skill");
      expect(fetch.mock.calls[1]?.[0].ifNoneMatch).toBe(etag);
    } finally {
      fetch.mockRestore();
      await host.close();
      await rm(root, { recursive: true, force: true });
    }
  });
}
