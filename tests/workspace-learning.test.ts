import { expect, test, vi } from "vitest";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { createWorkspaceLearning } from "../src/server/workspaces/learning.js";

/** Uses backend Thread records without creating local transcript state. */
function setup() {
  const thread = {
    id: "existing",
    name: null,
    agentId: "coder",
    learningContainerId: "original",
    learningContainerIds: ["original"],
    lastRunAt: "2026-10-24T00:00:00Z",
  };
  const intelligence = new CopilotKitIntelligence({
    apiKey: "test",
    apiUrl: "http://localhost:9",
    wsUrl: "ws://localhost:9",
  });
  const getThread = vi.spyOn(intelligence, "getThread").mockResolvedValue(thread);
  let choice: string | null | undefined;
  const registry = {
    get: vi.fn((id: string) => {
      if (id !== "default") throw new Error("Unknown workspace");
      return { id, name: "Workspace", path: "/workspace", createdAt: "2026-10-24" };
    }),
    getLearningAssignment: vi.fn(() => choice),
  };
  const service = createWorkspaceLearning({
    intelligence,
    workspaces: registry,
    defaultContainerId: "default-space",
  });
  return {
    service,
    getThread,
    thread,
    registry,
    select: (next: string | null | undefined) => {
      choice = next;
    },
  };
}

test("workspace changes apply to new conversations while existing memberships stay fixed", async () => {
  const { service, getThread, thread, select } = setup();
  select("new-space");
  expect(await service.containerForRun("default", "existing")).toBe("original");
  getThread.mockRejectedValueOnce(Object.assign(new Error("Missing"), { status: 404 }));
  expect(await service.containerForRun("default", "new")).toBe("new-space");
  getThread.mockResolvedValueOnce({
    ...thread,
    learningContainerId: null,
    learningContainerIds: [],
  });
  expect(await service.containerForRun("default", "previously-off")).toBeNull();
  getThread.mockResolvedValueOnce({
    ...thread,
    lastRunAt: undefined,
    learningContainerId: null,
    learningContainerIds: [],
  });
  expect(await service.containerForRun("default", "empty-new-thread")).toBe("new-space");
  select(null);
  getThread.mockRejectedValueOnce(Object.assign(new Error("Missing"), { status: 404 }));
  expect(await service.containerForRun("default", "new-off")).toBeNull();
});

test("Skill sources use confirmed conversation memberships and do not guess after a failed read", async () => {
  const { service, getThread, thread, select } = setup();
  const original = await service.registryForThread("default", "existing");
  select("new-space");
  expect(await service.registryForThread("default", "existing")).toBe(original);
  getThread.mockResolvedValueOnce({
    ...thread,
    learningContainerId: null,
    learningContainerIds: [],
  });
  expect(await service.registryForThread("default", "off")).toBeNull();
  getThread.mockResolvedValueOnce({ id: "existing", name: null, agentId: "coder" });
  await expect(service.registryForThread("default", "unknown")).rejects.toThrow(
    "Learning assignment is unavailable",
  );
  getThread.mockRejectedValueOnce(Object.assign(new Error("Unavailable"), { status: 503 }));
  await expect(service.containerForRun("default", "existing")).rejects.toThrow("Unavailable");
  getThread.mockResolvedValueOnce({ ...thread, agentId: "coder-other" });
  await expect(service.registryForThread("default", "other")).rejects.toThrow(
    "different workspace",
  );
});

test("multiple existing memberships are preserved without sending a conflicting singular assignment", async () => {
  const { service, getThread, thread } = setup();
  getThread.mockResolvedValue({
    ...thread,
    learningContainerId: null,
    learningContainerIds: ["original", "second"],
  });
  expect(await service.containerForRun("default", "existing")).toBeNull();
  expect(await service.registryForThread("default", "existing")).not.toBeNull();
});
