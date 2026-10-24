import type { MetadataStore } from "@tanstack/ai";
import type { ConversationDefaults } from "../../shared/settings.js";
import { WorkspaceError } from "../workspaces/registry.js";

/** Stores workspace preferences separately from existing thread settings. */
export function createConversationDefaults({
  metadata,
  models,
  defaultModel,
}: {
  metadata: MetadataStore;
  models: object;
  defaultModel: string;
}) {
  async function read(): Promise<ConversationDefaults> {
    const stored = await metadata.get("starter/defaults", "conversation");
    const value =
      stored && typeof stored === "object" ? (stored as Partial<ConversationDefaults>) : undefined;
    return {
      modelId:
        typeof value?.modelId === "string" && Object.hasOwn(models, value.modelId)
          ? value.modelId
          : defaultModel,
      permissions: value?.permissions === "bypass" ? "bypass" : "acceptEdits",
    };
  }
  let pending: Promise<unknown> = Promise.resolve();
  return {
    read,
    async set(value: Partial<ConversationDefaults>) {
      const update = pending
        .catch(() => {})
        .then(async () => {
          if (value.modelId !== undefined && !Object.hasOwn(models, value.modelId))
            throw new WorkspaceError("Choose a configured model.");
          if (
            value.permissions !== undefined &&
            value.permissions !== "acceptEdits" &&
            value.permissions !== "bypass"
          )
            throw new WorkspaceError("Choose a supported permission setting.");
          await metadata.set("starter/defaults", "conversation", { ...(await read()), ...value });
          return read();
        });
      pending = update;
      return update;
    },
  };
}
