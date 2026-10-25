import { randomUUID } from "node:crypto";
import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { expect, test, vi } from "vitest";
import { createHarnessAgent } from "../src/server/agent/bridge.js";
import { learnedSkills } from "../src/server/agent/learned-skills.js";
import { answer, scriptedAdapter } from "./provider.js";

test("each conversation resolves its own Skill source on every turn and clears unavailable catalogs", async () => {
  const intelligence = new CopilotKitIntelligence({
    apiKey: "test",
    apiUrl: "http://localhost:9",
    wsUrl: "ws://localhost:9",
  });
  const registry = new SkillRegistry({
    client: intelligence,
    containerId: "original",
    freshnessWindowMs: 0,
  });
  const acquire = vi.spyOn(registry, "acquireSnapshot").mockResolvedValue({
    revision: "1",
    etag: "one",
    skills: [{ name: "original", description: "Original space instructions", files: [] }],
  });
  const resolve = vi.fn(async (threadId: string) => (threadId === "old-thread" ? registry : null));
  const prompts: string[] = [];
  const adapter = scriptedAdapter(async function* (options) {
    prompts.push(JSON.stringify(options.systemPrompts));
    yield* answer();
  });
  const harness = defineHarness({
    name: "learning-session-test",
    adapter,
    plugins: () => [learnedSkills(resolve)],
  });
  const host = createHarnessHost();
  const old = createHarnessAgent({ host, harness });
  old.threadId = "old-thread";
  const disabled = createHarnessAgent({ host, harness });
  disabled.threadId = "disabled-thread";
  try {
    old.addMessage({ id: randomUUID(), role: "user", content: "First" });
    await old.runAgent({ runId: randomUUID() });
    expect(prompts[0]).toContain("Original space instructions");
    disabled.addMessage({ id: randomUUID(), role: "user", content: "Second" });
    await disabled.runAgent({ runId: randomUUID() });
    expect(prompts[1]).not.toContain("Original space instructions");
    expect(prompts[1]).toContain("Learning is off for this conversation");
    acquire.mockRejectedValueOnce(new Error("Unavailable"));
    old.addMessage({ id: randomUUID(), role: "user", content: "Third" });
    await old.runAgent({ runId: randomUUID() });
    expect(prompts[2]).not.toContain("Original space instructions");
    expect(prompts[2]).toContain("could not be loaded");
    expect(resolve.mock.calls.map(([threadId]) => threadId)).toEqual([
      "old-thread",
      "disabled-thread",
      "old-thread",
    ]);
  } finally {
    acquire.mockRestore();
    await host.close();
  }
});
