import type { SkillRegistry } from "@copilotkit/runtime/internal/learned-skills";
import type { WorkspaceEntry, openWorkspaceRegistry } from "../workspaces/registry.js";
import type { ModelCatalog } from "../agent/models.js";
import type { createWorkspaceRuntime } from "../agent/runtime.js";

/** Services owned by the application, borrowed by HTTP route factories. */
export interface ApiDependencies {
  token: string;
  workspaces: Awaited<ReturnType<typeof openWorkspaceRegistry>>;
  models: ModelCatalog;
  containerId: string;
  skillRegistry: SkillRegistry;
  runtimeFor: (workspace: WorkspaceEntry) => ReturnType<typeof createWorkspaceRuntime>;
  selectedWorkspace: (url: URL) => WorkspaceEntry;
}
