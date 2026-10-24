import { useState } from "react";
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

/** Displays exactly the tool arguments the user is being asked to approve. */
export function Permission({
  interrupt,
  resolve,
  messages,
}: Pick<InterruptRenderProps, "interrupt" | "resolve"> & { messages: Message[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = approvalToolCallId(interrupt);
  const call = messages
    .flatMap((message) => (message.role === "assistant" ? (message.toolCalls ?? []) : []))
    .find((tool) => tool.id === id);
  async function decide(answer: "once" | "reject") {
    setBusy(true);
    setError("");
    try {
      await resolve(answer, interrupt?.id);
    } catch {
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
      <footer>
        <span className="approval-scope">This tool call only</span>
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
          {busy ? "Submitting…" : "Allow once"}
        </button>
      </footer>
    </section>
  );
}
