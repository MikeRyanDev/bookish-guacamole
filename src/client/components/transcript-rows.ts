import type { Message } from "@copilotkit/react-core/v2";
import { contentToText } from "@ag-ui/client";
import { toolOutcome } from "./tool-outcome.js";

type Assistant = Extract<Message, { role: "assistant" }>;
export type TranscriptCall = {
  call: NonNullable<Assistant["toolCalls"]>[number];
  result: Extract<Message, { role: "tool" }> | undefined;
};
export type TranscriptRow =
  | { id: string; kind: "text"; role: "user" | "assistant"; text: string }
  | { id: string; kind: "activity"; calls: TranscriptCall[] }
  | { id: string; kind: "call"; entry: TranscriptCall };

/** Projects SDK messages into view rows without storing a second transcript.
 * Text and approvals break sequences; exceptional or unfinished calls never hide in a group.
 */
export function transcriptRows(
  messages: readonly Message[],
  pendingIds: ReadonlySet<string | undefined>,
): TranscriptRow[] {
  const results = new Map(messages.filter((m) => m.role === "tool").map((m) => [m.toolCallId, m]));
  const rows: TranscriptRow[] = [];
  let group: Extract<TranscriptRow, { kind: "activity" }> | undefined;
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const text = contentToText(message.content);
    if (text || message.role === "user") {
      group = undefined;
      if (text) rows.push({ id: `text:${message.id}`, kind: "text", role: message.role, text });
    }
    if (message.role !== "assistant") continue;
    for (const call of message.toolCalls ?? []) {
      if (pendingIds.has(call.id)) {
        group = undefined;
        continue;
      }
      const result = results.get(call.id);
      const entry = { call, result };
      if (!result || toolOutcome(contentToText(result.content)).failed) {
        group = undefined;
        rows.push({ id: `call:${call.id}`, kind: "call", entry });
      } else {
        if (!group) {
          group = { id: `activity:${call.id}`, kind: "activity", calls: [] };
          rows.push(group);
        }
        group.calls.push(entry);
      }
    }
  }
  return rows;
}

/** Reports performed call types, not inferred file changes or fabricated durations. */
export function activitySummary(calls: readonly TranscriptCall[]) {
  const counts = new Map<string, number>();
  for (const { call } of calls) {
    const name = call.function.name;
    const category =
      name === "read_file"
        ? "read"
        : ["patch", "edit_file", "write_file"].includes(name)
          ? "edit"
          : name === "bash"
            ? "command"
            : ["search", "grep", "list_files", "glob"].includes(name)
              ? "search"
              : "other";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts]
    .map(
      ([name, count]) =>
        `${count} ${name}${count === 1 || name === "other" ? "" : name === "search" ? "es" : "s"}`,
    )
    .join(" · ");
}
