import { createConversationDefaults } from "./conversation-defaults.js";
import { resolve } from "node:path";
import { CopilotRuntime, type CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { createCopilotHonoHandler } from "@copilotkit/runtime/v2/hono";
import { createHarnessHost } from "@tanstack/ai-harness";
import { defineAIPersistence } from "@tanstack/ai-persistence";
import type { WorkspaceEntry } from "../workspaces/registry.js";
import type { ModelCatalog } from "./models.js";
import { createPermissionSettings } from "./permission-settings.js";
import { createModelSettings } from "./model-settings.js";
import { createHarnessAgent } from "./bridge.js";
import { createCodingHarness } from "./harness.js";
import { openLogStore } from "../storage/log-store.js";
/** Keeps each workspace's agent identity, tools, and execution log separate. */
export function createWorkspaceRuntime(
  workspace: WorkspaceEntry,
  dependencies: {
    dataDirectory: string;
    intelligence: CopilotKitIntelligence;
    containerId: string;
    models: ModelCatalog;
  },
) {
  const { dataDirectory, intelligence, containerId, models } = dependencies;
  const agentId = workspace.id === "default" ? "coder" : `coder-${workspace.id}`;
  const basePath =
    workspace.id === "default" ? "/api/copilotkit" : `/api/workspaces/${workspace.id}/copilotkit`;
  const store = openLogStore(
    resolve(
      dataDirectory,
      workspace.id === "default" ? "harness.sqlite" : `harness-${workspace.id}.sqlite`,
    ),
  );
  const host = createHarnessHost({
    persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
  });
  const harness = createCodingHarness({
    root: workspace.path,
    intelligence,
    containerId,
    models,
  });
  const defaults = createConversationDefaults({
    metadata: store.metadata,
    models: models.adapters,
    defaultModel: models.defaultModel,
  });
  const approvalSettings = createPermissionSettings({
    host,
    harness,
    store,
    root: workspace.path,
    defaults: defaults.read,
  });
  const modelSettings = createModelSettings({
    host,
    harness,
    defaultModel: models.defaultModel,
    models: models.adapters,
    initialize: approvalSettings.initialize,
  });
  const runtime = new CopilotRuntime({
    agents: {
      [agentId]: createHarnessAgent({
        host,
        harness,
        agentId,
        initialize: approvalSettings.initialize,
      }),
    },
    intelligence,
    identifyUser: () => ({ id: "local-developer", name: "Local developer" }),
  });
  return {
    agentId,
    basePath,
    defaults,
    approvalSettings,
    modelSettings,
    handler: createCopilotHonoHandler({ runtime, basePath }),
    close: async () => {
      try {
        await host.close();
      } finally {
        store.close();
      }
    },
  };
}
