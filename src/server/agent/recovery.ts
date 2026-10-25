import {
  isTransientModelError,
  retryTransientErrors,
  type ModelErrorContext,
} from "@tanstack/ai-harness";
import type { createExecutionSettings } from "./execution-settings.js";

/** Native retry policy with bounded waits and a content-free status for the UI. */
export function createRecovery(
  settings: ReturnType<typeof createExecutionSettings>,
  options: { baseDelayMs?: number } = {},
) {
  const waiting = new Map<string, { attempt: number; maxRetries: number }>();
  return {
    read: (threadId: string) => waiting.get(threadId) ?? null,
    async onModelError(ctx: ModelErrorContext) {
      const { settings: policy } = await settings.read();
      if (
        !isTransientModelError(ctx.error) ||
        ctx.retries >= policy.maxRetries ||
        ctx.signal.aborted
      )
        return;
      if ((ctx.error.retryAfterMs ?? 0) > 30000) return;
      waiting.set(ctx.session.threadId, {
        attempt: ctx.retries + 1,
        maxRetries: policy.maxRetries,
      });
      try {
        const answer = await retryTransientErrors({
          maxRetries: policy.maxRetries,
          baseDelayMs: options.baseDelayMs ?? 1000,
          maxRetryAfterMs: 30000,
        })(ctx);
        return ctx.signal.aborted ? undefined : answer;
      } finally {
        waiting.delete(ctx.session.threadId);
      }
    },
  };
}
