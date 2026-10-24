import type { AnyTextAdapter } from "@tanstack/ai";
import { definePlugin, type AnyHarness, type HarnessHost } from "@tanstack/ai-harness";
import { goal } from "@tanstack/ai-harness/plugins";
import { WorkspaceError } from "../workspaces/registry.js";

/** Keeps each native Goal judge on the model captured at that turn's start. */
export function selectedModelGoal(models: Record<string, AnyTextAdapter>, defaultModel: string) {
  return definePlugin({
    name: "tanstack/goal",
    setup: async (ctx) => {
      const options = { judge: models[defaultModel]!, maxRounds: 20 };
      const native = goal(options);
      const contributions = await native.setup(ctx);
      return {
        ...contributions,
        onTurnStart: () => {
          options.judge =
            models[ctx.session.threadSettings().model ?? defaultModel] ?? models[defaultModel]!;
        },
      };
    },
  });
}

/** Stores only a configured model ID in the native thread log; keys stay server-side. */
export function createModelSettings({
  host,
  harness,
  defaultModel,
  models,
}: {
  host: HarnessHost;
  harness: AnyHarness;
  defaultModel: string;
  models: Record<string, AnyTextAdapter>;
}) {
  function validateThread(threadId: string) {
    if (!threadId || threadId.length > 200) throw new WorkspaceError("Invalid conversation.");
  }
  return {
    async read(threadId: string) {
      validateThread(threadId);
      const session = await host.open(harness, { threadId });
      try {
        const snapshot = session.snapshot();
        return {
          modelId: session.threadSettings().model ?? defaultModel,
          status: snapshot.status,
          pending: snapshot.pendingWaits.length,
        };
      } finally {
        await session.close();
      }
    },
    async set(threadId: string, modelId: string) {
      validateThread(threadId);
      if (!Object.hasOwn(models, modelId)) throw new WorkspaceError("Choose a configured model.");
      const session = await host.open(harness, { threadId });
      try {
        const snapshot = session.snapshot();
        if (snapshot.status === "running" || snapshot.pendingWaits.length)
          throw new WorkspaceError(
            "Finish or stop the current operation before changing models.",
            409,
          );
        const receipt = await session.updateThreadSettings({ settings: { model: modelId } });
        if (receipt.status === "rejected")
          throw new WorkspaceError("Could not change the model.", 409);
        return { modelId, status: snapshot.status, pending: snapshot.pendingWaits.length };
      } finally {
        await session.close();
      }
    },
  };
}
