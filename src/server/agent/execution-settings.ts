import type { MetadataStore } from "@tanstack/ai";
import { z } from "zod";
import type { ExecutionSettingsResponse } from "../../shared/execution.js";
import { WorkspaceError } from "../workspaces/registry.js";

const price = z.number().finite().min(0).max(100000);
export const executionSettingsSchema = z
  .object({
    autoCompact: z.boolean(),
    compactAt: z.number().int().min(50).max(90),
    tokenLimit: z.number().int().min(1000).max(1_000_000_000).nullable(),
    costLimit: z.number().finite().positive().max(100000).nullable(),
    maxRetries: z.number().int().min(0).max(5),
    codeMode: z.boolean(),
    models: z.record(
      z.string().min(1).max(64),
      z
        .object({
          contextWindow: z.number().int().min(4096).max(10_000_000),
          prices: z
            .object({ input: price, output: price, cacheRead: price, cacheWrite: price })
            .strict()
            .nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export const executionUpdateSchema = z
  .object({
    settings: executionSettingsSchema,
    revision: z.string().nullable(),
  })
  .strict();

/** Stores execution policy in workspace metadata, with atomic stale-write rejection. */
export function createExecutionSettings(metadata: MetadataStore, modelIds: readonly string[]) {
  const modelDefaults = () =>
    Object.fromEntries(modelIds.map((id) => [id, { contextWindow: 32768, prices: null }]));
  async function read(): Promise<ExecutionSettingsResponse> {
    const stored = await metadata.getVersioned!("starter/execution", "settings");
    const parsed = stored ? executionSettingsSchema.parse(stored.value) : null;
    return {
      revision: stored?.revision ?? null,
      settings: {
        autoCompact: true,
        compactAt: 75,
        tokenLimit: null,
        costLimit: null,
        maxRetries: 3,
        codeMode: false,
        ...parsed,
        models: Object.fromEntries(
          modelIds.map((id) => [id, parsed?.models[id] ?? modelDefaults()[id]!]),
        ),
      },
    };
  }
  return {
    read,
    async save(input: ExecutionSettingsResponse): Promise<ExecutionSettingsResponse> {
      const parsed = executionUpdateSchema.safeParse(input);
      if (!parsed.success) throw new WorkspaceError("Check the execution limits and model values.");
      if (
        Object.keys(parsed.data.settings.models).some((id) => !modelIds.includes(id)) ||
        modelIds.some((id) => !Object.hasOwn(parsed.data.settings.models, id))
      )
        throw new WorkspaceError("Use one entry for each configured model.");
      const result = await metadata.setIf!(
        "starter/execution",
        "settings",
        parsed.data.settings,
        parsed.data.revision,
      );
      if (!result.ok)
        throw new WorkspaceError(
          "Settings changed in another window. Reload them before saving.",
          409,
        );
      return { settings: parsed.data.settings, revision: result.revision };
    },
  };
}
