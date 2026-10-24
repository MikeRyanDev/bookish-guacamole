import { EventType, toServerSentEventsResponse, type StreamChunk } from "@tanstack/ai";
import type { AnyHarness, HarnessHost, HarnessSession } from "@tanstack/ai-harness";
import { selectGoal } from "@tanstack/ai-harness/plugins";
import { z } from "zod";

const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("start"),
      objective: z
        .string()
        .trim()
        .min(1)
        .max(4000)
        .refine((text) => text !== "stop" && text !== "resume", "Use a descriptive objective."),
    })
    .strict(),
  z.object({ action: z.enum(["resume", "stop"]) }).strict(),
]);

type Handler = (request: Request) => Promise<Response>;

/**
 * Streams native Goal commands and all their queued turns through the same
 * Intelligence request. Ordinary prompts and approvals keep the stock transport.
 * The session owns goal state; forwarded state never determines it.
 */
export function withGoalCommands(
  handler: Handler,
  host: HarnessHost,
  harness: AnyHarness,
): Handler {
  const active = new Map<string, { runId: string; session?: HarnessSession; cancelled: boolean }>();
  return async (request) => {
    if (request.method !== "POST") return handler(request);
    const body = await request.clone().json();
    const route = new URL(request.url).pathname;
    const running = active.get(body.threadId);
    if (
      route.endsWith("/control") &&
      body.input?.op === "cancel" &&
      running &&
      body.input.operationId === running.runId
    ) {
      // Native stop removes queued work; cancellation stops the current model/tool.
      running.cancelled = true;
      if (running.session) {
        await running.session.runCommand({ name: "goal", input: "stop" });
        await running.session.cancel();
      }
      return Response.json({ status: "accepted" });
    }
    if (!route.endsWith("/run")) return handler(request);
    if (running)
      return Response.json({ error: "This session already has a running goal." }, { status: 409 });
    if (body.forwardedProps?.starterGoal === undefined) return handler(request);
    const parsed = commandSchema.safeParse(body.forwardedProps.starterGoal);
    if (!parsed.success || typeof body.threadId !== "string" || typeof body.runId !== "string")
      return Response.json(
        { error: "Invalid goal command. Use an objective of 1–4,000 characters." },
        { status: 400 },
      );
    // Reserve before opening the host: two requests must not both pass admission.
    const entry: { runId: string; session?: HarnessSession; cancelled: boolean } = {
      runId: body.runId,
      cancelled: false,
    };
    active.set(body.threadId, entry);
    let session: HarnessSession;
    try {
      session = await host.open(harness, { threadId: body.threadId });
      entry.session = session;
    } catch (error) {
      active.delete(body.threadId);
      throw error;
    }
    const command = parsed.data;
    const snapshot = session.snapshot();
    const saved = selectGoal(snapshot);
    if (
      entry.cancelled ||
      snapshot.status === "running" ||
      snapshot.pendingWaits.length > 0 ||
      (command.action === "start" && saved && ["active", "paused"].includes(saved.status))
    ) {
      active.delete(body.threadId);
      await session.close();
      return Response.json(
        { error: "Finish the pending action or stop the existing goal first." },
        { status: 409 },
      );
    }
    const queue: StreamChunk[] = [];
    let wake: (() => void) | undefined;
    let done = false;
    let failed = false;
    let terminal: StreamChunk | undefined;
    const push = (event: StreamChunk) => {
      queue.push(event);
      wake?.();
    };
    const unsubscribe = session.onEvent(({ event }) => {
      if (event.type === EventType.RUN_STARTED || event.type === EventType.MESSAGES_SNAPSHOT)
        return;
      if (event.type === EventType.RUN_FINISHED) {
        terminal = event;
        return;
      }
      if (event.type === EventType.RUN_ERROR) {
        failed = true;
        terminal = event;
        return;
      }
      push(event);
    });
    const input = command.action === "start" ? command.objective : command.action;
    const work = (async () => {
      try {
        await session.runCommand({ name: "goal", input, inputId: body.runId });
        await session.whenIdle();
      } catch (error) {
        failed = true;
        terminal = {
          type: EventType.RUN_ERROR,
          message: error instanceof Error ? error.message : "Goal failed.",
          timestamp: Date.now(),
        };
      } finally {
        push({
          type: EventType.STATE_SNAPSHOT,
          snapshot: { plugins: session.snapshot().plugins },
          timestamp: Date.now(),
        });
        if (terminal || !failed)
          push(
            terminal ?? {
              type: EventType.RUN_FINISHED,
              threadId: body.threadId,
              runId: body.runId,
              timestamp: Date.now(),
            },
          );
        done = true;
        wake?.();
      }
    })();
    async function* events(): AsyncGenerator<StreamChunk> {
      try {
        while (!done || queue.length) {
          const event = queue.shift();
          if (event) yield event;
          else
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
        }
        await work;
      } finally {
        unsubscribe();
        active.delete(body.threadId);
        await session.close();
      }
    }
    return toServerSentEventsResponse(events());
  };
}
