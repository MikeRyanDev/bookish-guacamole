import { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import type { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { WorkspaceError, type openWorkspaceRegistry } from "./registry.js";

const membership = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const threadAssignment = z.object({
  agentId: z.string(),
  learningContainerIds: z.array(membership),
  lastRunAt: z.string().nullish(),
});

/** Resolves workspace defaults and backend-owned conversation assignments without moving evidence. */
export function createWorkspaceLearning({
  intelligence,
  workspaces,
  defaultContainerId,
}: {
  intelligence: CopilotKitIntelligence;
  workspaces: Pick<
    Awaited<ReturnType<typeof openWorkspaceRegistry>>,
    "get" | "getLearningAssignment"
  >;
  defaultContainerId: string;
}) {
  const registries = new Map<string, SkillRegistry>();
  function assignment(workspaceId: string): string | null {
    workspaces.get(workspaceId);
    const selected = workspaces.getLearningAssignment(workspaceId);
    return selected === undefined ? defaultContainerId : selected;
  }
  async function readThread(workspaceId: string, threadId: string) {
    workspaces.get(workspaceId);
    const result = threadAssignment.safeParse(
      await intelligence.getThread({ threadId, userId: "local-developer" }),
    );
    if (!result.success)
      throw new WorkspaceError(
        "Learning assignment is unavailable. Retry after checking Intelligence.",
        502,
      );
    const agentId = workspaceId === "default" ? "coder" : `coder-${workspaceId}`;
    if (result.data.agentId !== agentId)
      throw new WorkspaceError("This conversation belongs to a different workspace.", 404);
    return result.data;
  }
  function registryForContainers(containerIds: readonly string[]) {
    if (!containerIds.length) return null;
    const key = JSON.stringify(containerIds);
    let registry = registries.get(key);
    if (!registry) {
      registry = new SkillRegistry({
        client: intelligence,
        ...(containerIds.length === 1
          ? { containerId: containerIds[0]! }
          : { containers: containerIds.map((id) => ({ id })) }),
        freshnessWindowMs: 0,
      });
      registries.set(key, registry);
    }
    return registry;
  }
  return {
    assignment,
    /** Only new/unstarted Threads receive the current choice; an omitted selector preserves plural memberships. */
    async containerForRun(workspaceId: string, threadId: string): Promise<string | null> {
      const current = assignment(workspaceId);
      let thread;
      try {
        thread = await readThread(workspaceId, threadId);
      } catch (error) {
        if (
          !(error instanceof WorkspaceError) &&
          error instanceof Error &&
          "status" in error &&
          error.status === 404
        )
          return current;
        throw error;
      }
      if (thread.learningContainerIds.length)
        return thread.learningContainerIds.length === 1 ? thread.learningContainerIds[0]! : null;
      return thread.lastRunAt ? null : current;
    },
    /** Reads confirmed membership after runtime admission, before each harness turn. */
    async registryForThread(workspaceId: string, threadId: string) {
      const thread = await readThread(workspaceId, threadId);
      return registryForContainers(thread.learningContainerIds);
    },
    /** The workspace inspector shows the current selection, independently of an older conversation. */
    registryForWorkspace(workspaceId: string) {
      const selected = assignment(workspaceId);
      return registryForContainers(selected ? [selected] : []);
    },
  };
}
