import { expect, test } from "vitest";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { createHarnessAgent } from "../src/bridge.js";
import { answer, scriptedAdapter } from "./provider.js";

test("workspace agent identity survives the runtime clone boundary", async () => {
  const host = createHarnessHost({ persistence: memoryPersistence() });
  try {
    const harness = defineHarness({ name: "test/workspace", adapter: scriptedAdapter(answer) });
    const agent = createHarnessAgent({ host, harness, agentId: "coder-project-a" });

    expect(agent.agentId).toBe("coder-project-a");
    expect(agent.clone().agentId).toBe("coder-project-a");
  } finally {
    await host.close();
  }
});
