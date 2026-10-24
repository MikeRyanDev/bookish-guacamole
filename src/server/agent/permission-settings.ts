import type { ConversationDefaults } from "../../shared/settings.js";
import { logIdOf, type AnyHarness, type HarnessHost } from "@tanstack/ai-harness";
import {
  listSavedPermissions,
  deleteSavedPermission,
  type PermissionRule,
} from "@tanstack/ai-harness/plugins";
import type { openLogStore } from "../storage/log-store.js";
import { WorkspaceError } from "../workspaces/registry.js";

import {
  approvalModes,
  type ApprovalMode,
  type ApprovalSettings,
} from "../../shared/permissions.js";
export { approvalModes } from "../../shared/permissions.js";
export type { ApprovalMode, ApprovalSettings } from "../../shared/permissions.js";
export function isApprovalMode(value: unknown): value is ApprovalMode {
  return approvalModes.some((mode) => mode === value);
}

/** Uses native session settings. Existing logs retain their native default. */
export function createPermissionSettings({
  host,
  harness,
  store,
  root,
  defaults,
}: {
  host: HarnessHost;
  harness: AnyHarness;
  store: ReturnType<typeof openLogStore>;
  root: string;
  defaults?: () => Promise<ConversationDefaults>;
}) {
  const initializing = new Map<string, Promise<void>>();
  async function initialize(threadId: string) {
    if (!threadId || threadId.length > 200) throw new WorkspaceError("Invalid conversation.");
    const previous = initializing.get(threadId);
    if (previous) return previous;
    const task = (async () => {
      const entries = await store.log.read({ logId: logIdOf({ logId: threadId }), limit: 1 });
      const session = await host.open(harness, { threadId });
      try {
        if (!entries.length) {
          const preferences = await defaults?.();
          if (preferences) {
            const modelReceipt = await session.updateThreadSettings({
              settings: { model: preferences.modelId },
            });
            if (modelReceipt.status === "rejected") throw new Error("Could not initialize model.");
          }
          if (!session.pluginSettings().mode) return;
          const receipt = await session.setPluginSetting({
            key: "mode",
            value: preferences?.permissions ?? "acceptEdits",
          });
          if (receipt.status === "rejected") throw new Error("Could not initialize approval mode.");
        }
      } finally {
        await session.close();
      }
    })();
    initializing.set(threadId, task);
    try {
      await task;
    } finally {
      initializing.delete(threadId);
    }
  }
  async function read(threadId: string): Promise<ApprovalSettings> {
    await initialize(threadId);
    const session = await host.open(harness, { threadId });
    try {
      const mode = session.pluginSettings().mode?.value;
      const snapshot = session.snapshot();
      return {
        mode: isApprovalMode(mode) ? mode : "default",
        permissionMode:
          mode === "plan"
            ? (await store.metadata.get("starter/permission-preference", threadId)) === "bypass"
              ? "bypass"
              : "acceptEdits"
            : mode === "bypass"
              ? "bypass"
              : "acceptEdits",
        planOnly: mode === "plan",
        status: snapshot.status,
        pending: snapshot.pendingWaits.length,
      };
    } finally {
      await session.close();
    }
  }
  async function setNative(threadId: string, value: ApprovalMode) {
    const session = await host.open(harness, { threadId });
    try {
      const receipt = await session.setPluginSetting({ key: "mode", value });
      if (receipt.status === "rejected")
        throw new WorkspaceError("Could not change approval mode.", 409);
    } finally {
      await session.close();
    }
  }
  const updates = new Map<string, Promise<unknown>>();
  async function change(threadId: string, action: () => Promise<ApprovalSettings>) {
    const previous = updates.get(threadId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(action);
    updates.set(threadId, next);
    try {
      return await next;
    } finally {
      if (updates.get(threadId) === next) updates.delete(threadId);
    }
  }
  return {
    initialize,
    setPermissions(threadId: string, value: "acceptEdits" | "bypass") {
      return change(threadId, async () => {
        const current = await read(threadId);
        await store.metadata.set("starter/permission-preference", threadId, value);
        if (!current.planOnly) await setNative(threadId, value);
        return read(threadId);
      });
    },
    setPlanOnly(threadId: string, enabled: boolean) {
      return change(threadId, async () => {
        const current = await read(threadId);
        await store.metadata.set("starter/permission-preference", threadId, current.permissionMode);
        await setNative(threadId, enabled ? "plan" : current.permissionMode);
        return read(threadId);
      });
    },
    read,
    async set(threadId: string, value: unknown) {
      if (!isApprovalMode(value)) throw new WorkspaceError("Choose a supported approval mode.");
      await initialize(threadId);
      const session = await host.open(harness, { threadId });
      try {
        const receipt = await session.setPluginSetting({ key: "mode", value });
        if (receipt.status === "rejected")
          throw new WorkspaceError("Could not change approval mode.", 409);
      } finally {
        await session.close();
      }
      return read(threadId);
    },
    list: () => listSavedPermissions({ metadata: store.metadata }, root),
    async remove(rule: PermissionRule) {
      await deleteSavedPermission({ metadata: store.metadata }, root, rule);
      // Native approvals also keep an in-memory copy. Reload waits for active
      // turns and discards that copy before the next turn can start.
      await host.reload(harness);
      return listSavedPermissions({ metadata: store.metadata }, root);
    },
  };
}
