import { z } from "zod";
import { useLayoutEffect, useRef, useState } from "react";
import type { Message, InterruptRenderProps } from "@copilotkit/react-core/v2";
import { ToolCall } from "./tool-call";

/** Correlates SDK approval metadata with its original transcript call. */
export function approvalToolCallId(interrupt: InterruptRenderProps["interrupt"]) {
  const payload = interrupt?.metadata?.["tanstack:interruptPayload"];
  return typeof payload === "object" &&
    payload !== null &&
    "toolCallId" in payload &&
    typeof payload.toolCallId === "string"
    ? payload.toolCallId
    : undefined;
}

const previewSchema = z.object({
  rules: z.array(
    z.object({ tool: z.string(), resource: z.string().optional(), decision: z.literal("allow") }),
  ),
  partial: z.boolean(),
});
/** Reads only server-generated scope descriptions, never model claims. */
function previewOf(state: unknown, id: string | undefined) {
  const parsed = z
    .object({
      plugins: z.object({
        "starter/permission-preview": z.object({ calls: z.record(z.string(), previewSchema) }),
      }),
    })
    .safeParse(state);
  return id && parsed.success
    ? parsed.data.plugins["starter/permission-preview"].calls[id]
    : undefined;
}

/** Displays exactly the tool arguments the user is being asked to approve. */
export function Permission({
  interrupt,
  resolve,
  messages,
  state,
  onResolved,
}: Pick<InterruptRenderProps, "interrupt" | "resolve"> & {
  messages: Message[];
  state?: unknown;
  onResolved?: () => void;
}) {
  const locked = useRef(false);
  const [remember, setRemember] = useState(false);
  const rememberButton = useRef<HTMLButtonElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const previousRemember = useRef(false);
  useLayoutEffect(() => {
    if (remember) saveButton.current?.focus();
    else if (previousRemember.current) rememberButton.current?.focus();
    previousRemember.current = remember;
  }, [remember]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = approvalToolCallId(interrupt);
  const preview = previewOf(state, id);
  const call = messages
    .flatMap((message) => (message.role === "assistant" ? (message.toolCalls ?? []) : []))
    .find((tool) => tool.id === id);
  async function decide(answer: "once" | "always" | "reject") {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await resolve(answer, interrupt?.id);
      onResolved?.();
    } catch {
      locked.current = false;
      setError("Could not submit this decision. Try again.");
      setBusy(false);
    }
  }
  return (
    <section className="permission" aria-label="Permission request">
      {call ? (
        <ToolCall
          name={call.function.name}
          args={call.function.arguments}
          running={false}
          awaitingApproval
        />
      ) : (
        <p>{interrupt?.message ?? "This action needs your approval."}</p>
      )}
      {error && <p role="alert">{error}</p>}
      {remember && preview && (
        <div className="permission-scope">
          <p>Save these permissions for this workspace?</p>
          <ul>
            {preview.rules.map((rule) => (
              <li key={JSON.stringify(rule)}>
                Allow <strong>{rule.tool}</strong>:{" "}
                <code>{rule.resource ?? "every call of this tool"}</code>
              </li>
            ))}
          </ul>
          <p>All conversations in this workspace can use this permission.</p>
          {preview.partial && <p>Some parts cannot be remembered. Those parts will ask again.</p>}
          <button
            ref={saveButton}
            className="primary"
            disabled={busy}
            onClick={() => {
              void decide("always");
            }}
          >
            Approve and Save
          </button>
          <button disabled={busy} onClick={() => setRemember(false)}>
            Cancel
          </button>
        </div>
      )}
      {!remember && (
        <footer>
          <button
            disabled={busy}
            onClick={() => {
              decide("reject");
            }}
          >
            Reject
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              decide("once");
            }}
          >
            {busy ? "Submitting…" : "Approve Once"}
          </button>
          {preview && preview.rules.length > 0 && (
            <button
              ref={rememberButton}
              className="primary"
              disabled={busy}
              onClick={() => setRemember(true)}
            >
              Always Approve
            </button>
          )}
        </footer>
      )}
    </section>
  );
}
