import type { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import type { createWorkspaceLearning } from "../workspaces/learning.js";
import type { WorkspaceEntry, openWorkspaceRegistry } from "../workspaces/registry.js";
import type { ModelCatalog } from "../agent/models.js";
import type { createWorkspaceRuntime } from "../agent/runtime.js";

/** Services owned by the application, borrowed by HTTP route factories. */
export interface ApiDependencies {
  token: string;
  intelligence: CopilotKitIntelligence;
  learning: ReturnType<typeof createWorkspaceLearning>;
  workspaces: Awaited<ReturnType<typeof openWorkspaceRegistry>>;
  models: ModelCatalog;
  runtimeFor: (workspace: WorkspaceEntry) => ReturnType<typeof createWorkspaceRuntime>;
  selectedWorkspace: (url: URL) => WorkspaceEntry;
}
