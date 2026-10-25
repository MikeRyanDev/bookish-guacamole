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
import { createExecutionSettings } from "./execution-settings.js";
import { createExecutionUsage } from "./execution-usage.js";
import { createRecovery } from "./recovery.js";
import { WorkspaceError } from "../workspaces/registry.js";
import { memoryCredentialStore } from "@tanstack/ai/byok/server";
import { createConnections } from "./connections.js";
import { createConnectionManagement } from "./connection-management.js";
import { snapshots } from "@tanstack/ai-harness/plugins/coding";
import { createUndo } from "./undo.js";
import { contextStateSchema } from "./context-management.js";
import type { ConversationExecutionStatus } from "../../shared/execution.js";
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
  const credentials = memoryCredentialStore();
  const host = createHarnessHost({
    credentials,
    persistence: defineAIPersistence({ stores: { log: store.log, metadata: store.metadata } }),
  });
  const executionSettings = createExecutionSettings(store.metadata, Object.keys(models.adapters));
  const executionUsage = createExecutionUsage({
    metadata: store.metadata,
    settings: executionSettings,
    models: models.adapters,
    defaultModel: models.defaultModel,
  });
  const recovery = createRecovery(executionSettings);
  const connectionSettings = createConnections(store.metadata, { root: workspace.path });
  const history = snapshots({
    root: workspace.path,
    dataDir: resolve(dataDirectory, "snapshots", workspace.id),
  });
  const harness = createCodingHarness({
    root: workspace.path,
    intelligence,
    containerId,
    models,
    history,
    execution: { settings: executionSettings, ledger: executionUsage, recovery },
    connections: connectionSettings,
  });
  const connections = createConnectionManagement({
    host,
    harness,
    settings: connectionSettings,
    credentials,
  });
  const undo = createUndo({ host, harness, history, metadata: store.metadata });
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
        history: undo,
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
    executionSettings,
    connections,
    undo,
    async executionStatus(threadId: string): Promise<ConversationExecutionStatus> {
      if (!threadId || threadId.length > 200) throw new WorkspaceError("Invalid conversation.");
      await approvalSettings.initialize(threadId);
      const session = await host.open(harness, { threadId });
      try {
        const snapshot = session.snapshot();
        const context = contextStateSchema.safeParse(snapshot.plugins["starter/context"]);
        return {
          usage: await executionUsage.read(threadId),
          context: context.success ? context.data : null,
          recovery: recovery.read(threadId),
          status: snapshot.status,
          pending: snapshot.pendingWaits.length,
        };
      } finally {
        await session.close();
      }
    },
    async scheduleCompaction(threadId: string) {
      if (!threadId || threadId.length > 200) throw new WorkspaceError("Invalid conversation.");
      const session = await host.open(harness, { threadId });
      try {
        if (session.snapshot().status === "running" || session.snapshot().pendingWaits.length)
          throw new WorkspaceError("Finish or stop the current operation first.", 409);
        await session.runCommand({ name: "compact-next" });
        return { scheduled: true };
      } finally {
        await session.close();
      }
    },
    handler: createCopilotHonoHandler({ runtime, basePath }),
    close: async () => {
      try {
        // Host shutdown cancels running turns before waiting for pending reloads.
        try {
          await host.close();
        } finally {
          await connections.close();
        }
      } finally {
        store.close();
      }
    },
  };
}
