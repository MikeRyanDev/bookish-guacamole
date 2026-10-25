import type {
  AnyTextAdapter,
  ChatMiddleware,
  ChatMiddlewareContext,
  MetadataStore,
  TokenUsage,
} from "@tanstack/ai";
import { definePlugin } from "@tanstack/ai-harness";
import type { ConversationUsage, ModelPrices } from "../../shared/execution.js";
import type { createExecutionSettings } from "./execution-settings.js";

const emptyUsage = (): ConversationUsage => ({
  calls: 0,
  reportedCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  knownCost: 0,
  unpricedCalls: 0,
  contextTokens: null,
});

/** Uses explicit prices, including cache rates, only when the provider gives no cost. */
export function costOf(usage: TokenUsage, prices: ModelPrices | null | undefined): number | null {
  if (typeof usage.cost === "number" && Number.isFinite(usage.cost) && usage.cost >= 0)
    return usage.cost;
  if (!prices) return null;
  const read = usage.promptTokensDetails?.cachedTokens ?? 0;
  const write = usage.promptTokensDetails?.cacheWriteTokens ?? 0;
  return (
    (Math.max(0, usage.promptTokens - read - write) * prices.input +
      usage.completionTokens * prices.output +
      read * prices.cacheRead +
      write * prices.cacheWrite) /
    1_000_000
  );
}

/**
 * Counts model calls in private workspace metadata and checks limits before each
 * call, including native Goal judges and summaries. Limits are stop thresholds:
 * an in-flight call can cross them. Unknown usage fails closed when a limit is set.
 */
export function createExecutionUsage({
  metadata,
  settings,
  models,
  defaultModel,
}: {
  metadata: MetadataStore;
  settings: ReturnType<typeof createExecutionSettings>;
  models: Record<string, AnyTextAdapter>;
  defaultModel?: string;
}) {
  const selectedModels = new Map<string, () => string | undefined>();
  const pending = new Map<string, Promise<unknown>>();
  const active = new Map<
    ChatMiddlewareContext,
    { threadId: string; prices: ModelPrices | null; reported: boolean }
  >();
  const namespace = "starter/usage";
  async function read(threadId: string): Promise<ConversationUsage> {
    const saved = await metadata.get(namespace, threadId);
    return saved ? { ...emptyUsage(), ...(saved as ConversationUsage) } : emptyUsage();
  }
  function serial<T>(threadId: string, work: () => Promise<T>): Promise<T> {
    const next = (pending.get(threadId) ?? Promise.resolve()).catch(() => {}).then(work);
    pending.set(threadId, next);
    void next
      .finally(() => {
        if (pending.get(threadId) === next) pending.delete(threadId);
      })
      .catch(() => {});
    return next;
  }
  const finish = (ctx: ChatMiddlewareContext) => {
    active.delete(ctx);
  };
  const accounting: ChatMiddleware = {
    name: "starter/usage-limits",
    onConfig: async (ctx) => {
      if (ctx.phase !== "beforeModel" && ctx.phase !== "structuredOutput") return;
      // The previous iteration without usage remains an unknown call in storage.
      active.delete(ctx);
      await serial(ctx.threadId, async () => {
        const { settings: policy } = await settings.read();
        const totals = await read(ctx.threadId);
        if ((policy.tokenLimit !== null || policy.costLimit !== null) && totals.historyIncomplete)
          throw new Error(
            "Usage accounting is incomplete for earlier calls. Start a new conversation to enforce limits, or remove the limits.",
          );
        const selected = selectedModels.get(ctx.threadId)?.() ?? defaultModel;
        const matches = (id: string) =>
          models[id]?.model === ctx.model && models[id]?.name === ctx.provider;
        const modelId =
          selected && matches(selected) ? selected : Object.keys(models).find(matches);
        const prices = modelId ? (policy.models[modelId]?.prices ?? null) : null;
        const inFlight = [...active.values()].filter(
          (call) => call.threadId === ctx.threadId && !call.reported,
        ).length;
        const missing = totals.calls - totals.reportedCalls - inFlight;
        if ((policy.tokenLimit !== null || policy.costLimit !== null) && missing > 0)
          throw new Error(
            "Usage is unavailable for an earlier call. Remove the limit or start a new conversation.",
          );
        if (policy.tokenLimit !== null && totals.totalTokens >= policy.tokenLimit)
          throw new Error(
            "Conversation token limit reached. Raise the limit in Execution settings to continue.",
          );
        if (policy.costLimit !== null) {
          if (totals.unpricedCalls > 0)
            throw new Error(
              "Earlier calls have unknown costs. Start a new conversation or remove the cost limit.",
            );
          if (!prices)
            throw new Error(
              "Cost limit cannot be enforced with unknown prices. Configure model prices or use a token limit.",
            );
          if (totals.knownCost >= policy.costLimit)
            throw new Error(
              "Conversation cost limit reached. Raise the limit in Execution settings to continue.",
            );
        }
        await metadata.set(namespace, ctx.threadId, { ...totals, calls: totals.calls + 1 });
        active.set(ctx, { threadId: ctx.threadId, prices, reported: false });
      });
    },
    onUsage: async (ctx, reported) => {
      const call = active.get(ctx);
      if (!call || call.reported) return;
      await serial(ctx.threadId, async () => {
        const current = await read(ctx.threadId);
        const cost = costOf(reported, call.prices);
        const next: ConversationUsage = {
          ...current,
          calls: current.calls,
          reportedCalls: current.reportedCalls + 1,
          inputTokens: current.inputTokens + reported.promptTokens,
          outputTokens: current.outputTokens + reported.completionTokens,
          totalTokens: current.totalTokens + reported.totalTokens,
          knownCost: current.knownCost + (cost ?? 0),
          unpricedCalls: current.unpricedCalls + (cost === null ? 1 : 0),
          contextTokens:
            ctx.context &&
            typeof ctx.context === "object" &&
            "run" in ctx.context &&
            typeof ctx.context.run === "object" &&
            ctx.context.run &&
            "source" in ctx.context.run &&
            typeof ctx.context.run.source === "string" &&
            ctx.context.run.source !== "turn"
              ? current.contextTokens
              : reported.promptTokens,
        };
        await metadata.set(namespace, ctx.threadId, next);
        call.reported = true;
        ctx.emitCustomEvent("starter:usage", next);
      });
    },
    onFinish: finish,
    onError: finish,
    onAbort: finish,
  };
  const isMain = (ctx: ChatMiddlewareContext) => {
    const value = ctx.context;
    return (
      !!value &&
      typeof value === "object" &&
      "run" in value &&
      !!value.run &&
      typeof value.run === "object" &&
      "source" in value.run &&
      value.run.source === "turn"
    );
  };
  const middleware: ChatMiddleware = {
    ...accounting,
    onConfig: (ctx, config) => (isMain(ctx) ? undefined : accounting.onConfig?.(ctx, config)),
  };
  // Register after context management: its summary can consume the remaining
  // budget before the main call is admitted. Harness middleware covers judges.
  const plugin = definePlugin({
    name: "starter/usage-admission",
    setup: async (ctx) => {
      await ctx.resources.acquire(
        () => {
          const select = () => ctx.session.threadSettings().model;
          selectedModels.set(ctx.session.threadId, select);
          return select;
        },
        (select) => {
          if (selectedModels.get(ctx.session.threadId) === select)
            selectedModels.delete(ctx.session.threadId);
        },
      );
      await serial(ctx.session.threadId, async () => {
        if (await metadata.get(namespace, ctx.session.threadId)) return;
        const native = ctx.session.snapshot().usage.total;
        const hasHistory = (await ctx.session.transcript()).length > 0;
        const initial: ConversationUsage = {
          ...emptyUsage(),
          calls: native.calls,
          reportedCalls: native.calls,
          inputTokens: native.promptTokens,
          outputTokens: native.completionTokens,
          totalTokens: native.totalTokens,
          knownCost: native.cost ?? 0,
          unpricedCalls: native.calls,
          historyIncomplete: hasHistory,
        };
        await metadata.setIf!(namespace, ctx.session.threadId, initial, null);
      });
      return {
        middleware: [
          {
            name: "starter/main-admission",
            onConfig: (ctx, config) => accounting.onConfig?.(ctx, config),
          },
        ],
      };
    },
  });
  return { read, middleware, plugin };
}
