import { randomBytes } from "node:crypto";
import { type BaseEvent, EventType, HttpAgent, type RunAgentInput } from "@ag-ui/client";
import type { AnyHarness, HarnessHost } from "@tanstack/ai-harness";
import { createHarnessHandler } from "@tanstack/ai-harness/server";
import { defer, Observable, switchMap } from "rxjs";
import { z } from "zod";
import { withGoalCommands } from "./goals.js";
import type { createUndo } from "./undo.js";
import { WorkspaceError } from "../workspaces/registry.js";

const historyCommand = z
  .object({ action: z.enum(["undo", "redo"]), revision: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();

/** Keep native recovery buffers private; clients get history previews through the settings API. */
function publicPlugins(plugins: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(plugins)
      .filter(([name]) => name !== "tanstack/snapshots")
      .map(([name, value]) => {
        if (name !== "tanstack/mcp") return [name, value];
        const parsed = z
          .object({
            servers: z.array(
              z.object({ name: z.string(), status: z.string(), toolCount: z.number() }),
            ),
          })
          .safeParse(value);
        return [name, parsed.success ? parsed.data : { servers: [] }];
      }),
  );
}

type Handler = (request: Request) => Promise<Response>;

/** Bridges the private TanStack transport into the Intelligence agent contract. */
class HarnessAgent extends HttpAgent {
  constructor(
    private readonly handler: Handler,
    private readonly readPlugins: (threadId: string) => Promise<Record<string, unknown>>,
    agentId = "coder",
    private readonly history?: ReturnType<typeof createUndo>,
  ) {
    super({
      agentId,
      description: "TanStack coding harness backed by CopilotKit Intelligence",
      url: "http://harness.internal/run",
      fetch: (url, init) => handler(new Request(url, init)),
    });
  }

  /** Provider lifecycle IDs must never replace the Intelligence run identity. */
  override run(input: RunAgentInput): Observable<BaseEvent> {
    if (!this.history) return this.stream(input);
    const history = this.history;
    return defer(() => history.rememberInput(input)).pipe(
      switchMap(() => {
        if (input.forwardedProps?.starterHistory === undefined) return this.stream(input);
        return new Observable<BaseEvent>((subscriber) => {
          subscriber.next({
            type: EventType.RUN_STARTED,
            threadId: input.threadId,
            runId: input.runId,
          });
          const work = async () => {
            const command = historyCommand.safeParse(input.forwardedProps.starterHistory);
            if (!command.success)
              throw new WorkspaceError("Review the affected files before changing history.");
            const messages = await history.execute(
              input.threadId,
              command.data.action,
              command.data.revision,
              input.messages,
            );
            if (subscriber.closed) return;
            subscriber.next({ type: EventType.MESSAGES_SNAPSHOT, messages });
            subscriber.next({
              type: EventType.STATE_SNAPSHOT,
              snapshot: { ...input.state, plugins: await this.readPlugins(input.threadId) },
            });
            subscriber.next({
              type: EventType.RUN_FINISHED,
              threadId: input.threadId,
              runId: input.runId,
            });
          };
          work()
            .catch((error: unknown) => {
              if (subscriber.closed) return;
              // A refused history command is an expected result, not a failed model run.
              // Keep the refusal local to the dialog without triggering SDK crash reporting.
              if (error instanceof WorkspaceError && error.status === 409) {
                subscriber.next({
                  type: EventType.CUSTOM,
                  name: "starter.history.rejected",
                  value: { message: error.message },
                });
                subscriber.next({
                  type: EventType.RUN_FINISHED,
                  threadId: input.threadId,
                  runId: input.runId,
                });
              } else
                subscriber.next({
                  type: EventType.RUN_ERROR,
                  message:
                    error instanceof WorkspaceError
                      ? error.message
                      : "Could not change history. Reload the conversation and review its files before retrying.",
                });
            })
            .finally(() => subscriber.complete());
        });
      }),
    );
  }

  private stream(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((subscriber) => {
      let terminal = false;
      let finish: BaseEvent | undefined;
      subscriber.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      });
      const subscription = super.run(input).subscribe({
        next: (event) => {
          if (event.type === "RUN_STARTED") return;
          // Harness pause snapshots use private user/result IDs. Intelligence
          // owns the outer transcript and already has every streamed message.
          // Merging these snapshots would duplicate tool rows on each resume.
          if (event.type === "MESSAGES_SNAPSHOT") return;
          if (event.type === "STATE_SNAPSHOT") {
            const parsed = z
              .object({ plugins: z.record(z.string(), z.unknown()) })
              .loose()
              .safeParse(event.snapshot);
            if (parsed.success) {
              subscriber.next({
                ...event,
                snapshot: { ...parsed.data, plugins: publicPlugins(parsed.data.plugins) },
              });
              return;
            }
          }
          if (event.type === "RUN_FINISHED") {
            finish = { ...event, threadId: input.threadId, runId: input.runId };
            return;
          }
          if (event.type === "RUN_ERROR") {
            terminal = true;
            finish = { ...event, threadId: input.threadId, runId: input.runId };
            return;
          }
          subscriber.next(event);
        },
        error: (error) => subscriber.error(error),
        complete: () => {
          // The stock per-operation stream omits session plugin state. Publish
          // the authoritative state before the outer terminal, also on follow-ups.
          this.readPlugins(input.threadId)
            .then((plugins) => {
              if (subscriber.closed) return;
              subscriber.next({
                type: EventType.STATE_SNAPSHOT,
                snapshot: { ...input.state, plugins },
              });
              if (finish) {
                terminal = true;
                subscriber.next(finish);
                subscriber.complete();
              } else subscriber.error(new Error("Harness stream ended without a terminal event"));
            })
            .catch((error) => subscriber.error(error));
        },
      });
      return () => {
        subscription.unsubscribe();
        if (!terminal) {
          // A dropped SSE reader does not stop a TanStack operation by itself.
          // Intelligence's stop tears down this subscription, so cancel that run.
          this.handler(
            new Request("http://harness.internal/control", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                threadId: input.threadId,
                input: { op: "cancel", operationId: input.runId },
              }),
            }),
          )
            .then((response) => {
              if (!response.ok)
                console.error(`Harness cancellation failed: HTTP ${response.status}`);
            })
            .catch((error) => console.error("Harness cancellation failed", error));
        }
      };
    });
  }

  /** Runtime clones retain the bridge and share the harness host's sessions. */
  override clone(): HarnessAgent {
    const clone = new HarnessAgent(this.handler, this.readPlugins, this.agentId, this.history);
    clone.threadId = this.threadId;
    clone.messages = structuredClone(this.messages);
    clone.state = structuredClone(this.state);
    return clone;
  }
}

/**
 * Creates an in-process AG-UI transport; no unauthenticated HTTP port is opened.
 * Tools, results, interrupts, and custom harness events remain in the stream.
 */
export function createHarnessAgent(options: {
  host: HarnessHost;
  harness: AnyHarness;
  agentId?: string;
  initialize?: (threadId: string) => Promise<void>;
  history?: ReturnType<typeof createUndo>;
}): HttpAgent {
  const handler = createHarnessHandler({
    ...options,
    openAccess: true,
    media: { secret: randomBytes(32).toString("hex") },
  });
  const goalHandler = withGoalCommands(handler, options.host, options.harness);
  return new HarnessAgent(
    async (request) => {
      if (options.initialize && new URL(request.url).pathname.endsWith("/run")) {
        const body = await request.clone().json();
        await options.initialize(body.threadId);
      }
      return goalHandler(request);
    },
    async (threadId) => {
      const session = await options.host.open(options.harness, { threadId });
      try {
        return publicPlugins(session.snapshot().plugins);
      } finally {
        await session.close();
      }
    },
    options.agentId,
    options.history,
  );
}
