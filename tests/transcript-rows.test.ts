import { describe, expect, it } from "vitest";
import type { Message } from "@copilotkit/react-core/v2";
import { transcriptRows } from "../src/client/components/transcript-rows.js";
const call = (id: string): Message => ({
  id,
  role: "assistant",
  toolCalls: [{ id, type: "function", function: { name: "read_file", arguments: "{}" } }],
});
const result = (id: string, content = "file content"): Message => ({
  id: `result:${id}`,
  role: "tool",
  toolCallId: id,
  content,
});

describe("transcript activity projection", () => {
  it("groups across result messages without changing SDK messages", () => {
    const messages = [call("a"), result("a"), call("b"), result("b")];
    const before = JSON.stringify(messages);
    const rows = transcriptRows(messages, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind === "activity" && rows[0].calls.map((e) => e.call.id)).toEqual(["a", "b"]);
    expect(JSON.stringify(messages)).toBe(before);
  });
  it("preserves narrative, user, and pending approval boundaries", () => {
    const rows = transcriptRows(
      [
        call("a"),
        result("a"),
        { id: "text", role: "assistant", content: "Checking next" },
        call("b"),
        result("b"),
        call("approval"),
        call("c"),
        result("c"),
        { id: "user", role: "user", content: "Continue" },
        call("d"),
        result("d"),
      ],
      new Set(["approval"]),
    );
    expect(rows.map((r) => r.kind)).toEqual([
      "activity",
      "text",
      "activity",
      "activity",
      "text",
      "activity",
    ]);
    expect(JSON.stringify(rows)).not.toContain('"id":"approval"');
  });
  it.each([
    "exit code: 1\nfailed",
    "Error: denied",
    '{"error":"network"}',
    "The user denied this tool call",
  ])("keeps exceptional results visible: %s", (content) => {
    expect(transcriptRows([call("a"), result("a", content)], new Set())[0]?.kind).toBe("call");
  });
  it("does not call missing results completed; empty results count as received", () => {
    expect(transcriptRows([call("a")], new Set())[0]?.kind).toBe("call");
    expect(transcriptRows([call("a"), result("a", "")], new Set())[0]?.kind).toBe("activity");
  });
  it("drops empty assistant shells and keeps the group's identity stable as calls append", () => {
    const first = transcriptRows([call("a"), result("a")], new Set());
    const next = transcriptRows(
      [
        call("a"),
        result("a"),
        { id: "empty", role: "assistant", content: "" },
        call("b"),
        result("b"),
      ],
      new Set(),
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe(first[0]?.id);
  });
});
