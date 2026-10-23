import { randomBytes } from 'node:crypto';
import {
  type BaseEvent,
  EventType,
  HttpAgent,
  type RunAgentInput,
} from '@ag-ui/client';
import type { AnyHarness, HarnessHost } from '@tanstack/ai-harness';
import { createHarnessHandler } from '@tanstack/ai-harness/server';
import { Observable } from 'rxjs';

type Handler = (request: Request) => Promise<Response>;

/** Bridges the private TanStack transport into the Intelligence agent contract. */
class HarnessAgent extends HttpAgent {
  constructor(private readonly handler: Handler) {
    super({
      agentId: 'coder',
      description: 'TanStack coding harness backed by CopilotKit Intelligence',
      url: 'http://harness.internal/run',
      fetch: (url, init) => handler(new Request(url, init)),
    });
  }

  /** Provider lifecycle IDs must never replace the Intelligence run identity. */
  override run(input: RunAgentInput): Observable<BaseEvent> {
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
          if (event.type === 'RUN_STARTED') return;
          if (event.type === 'RUN_FINISHED') {
            finish = { ...event, threadId: input.threadId, runId: input.runId };
            return;
          }
          if (event.type === 'RUN_ERROR') {
            terminal = true;
            finish = undefined;
          }
          if (event.type === 'RUN_ERROR') {
            subscriber.next({
              ...event,
              threadId: input.threadId,
              runId: input.runId,
            });
          } else subscriber.next(event);
        },
        error: (error) => subscriber.error(error),
        complete: () => {
          if (finish && !terminal) {
            terminal = true;
            subscriber.next(finish);
          }
          if (!terminal)
            subscriber.error(
              new Error('Harness stream ended without a terminal event'),
            );
          else subscriber.complete();
        },
      });
      return () => {
        subscription.unsubscribe();
        if (!terminal) {
          // A dropped SSE reader does not stop a TanStack operation by itself.
          // Intelligence's stop tears down this subscription, so cancel that run.
          this.handler(
            new Request('http://harness.internal/control', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                threadId: input.threadId,
                input: { op: 'cancel', operationId: input.runId },
              }),
            }),
          )
            .then((response) => {
              if (!response.ok)
                console.error(
                  `Harness cancellation failed: HTTP ${response.status}`,
                );
            })
            .catch((error) =>
              console.error('Harness cancellation failed', error),
            );
        }
      };
    });
  }

  /** Runtime clones retain the bridge and share the harness host's sessions. */
  override clone(): HarnessAgent {
    const clone = new HarnessAgent(this.handler);
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
}): HttpAgent {
  const handler = createHarnessHandler({
    ...options,
    openAccess: true,
    media: { secret: randomBytes(32).toString('hex') },
  });
  return new HarnessAgent(handler);
}
