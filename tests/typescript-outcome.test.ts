import { expect, test } from "vitest";
import { toolOutcome } from "../src/client/components/tool-outcome.js";
import { transcriptRows } from "../src/client/components/transcript-rows.js";

test("native TypeScript failures stay outside completed activity without changing other tools", () => {
  const result = JSON.stringify({
    success: false,
    logs: ["started"],
    error: { message: "Timed out" },
  });
  expect(toolOutcome(result, "execute_typescript").failed).toBe(true);
  expect(toolOutcome(result, "custom_tool").failed).toBe(false);
  const rows = transcriptRows(
    [
      {
        id: "a",
        role: "assistant",
        toolCalls: [
          { id: "first", type: "function", function: { name: "read_file", arguments: "{}" } },
          {
            id: "failed",
            type: "function",
            function: { name: "execute_typescript", arguments: "{}" },
          },
          { id: "last", type: "function", function: { name: "read_file", arguments: "{}" } },
        ],
      },
      { id: "r1", role: "tool", toolCallId: "first", content: "ok" },
      { id: "r2", role: "tool", toolCallId: "failed", content: result },
      { id: "r3", role: "tool", toolCallId: "last", content: "ok" },
    ],
    new Set(),
  );
  expect(rows.map((row) => row.kind)).toEqual(["activity", "call", "activity"]);
});

test("success envelopes, scalar output, and malformed results keep existing completion semantics", () => {
  for (const result of [
    undefined,
    "",
    "null",
    "0",
    "false",
    "{broken",
    '{"success":true}',
    '{"success":"false"}',
    "[]",
  ]) {
    expect(toolOutcome(result, "execute_typescript").failed).toBe(false);
  }
  expect(
    toolOutcome(
      JSON.stringify(JSON.stringify({ success: false, error: { message: "Syntax error" } })),
      "execute_typescript",
    ).failed,
  ).toBe(true);
  expect(toolOutcome("The user denied this tool call", "execute_typescript").denied).toBe(true);
});
