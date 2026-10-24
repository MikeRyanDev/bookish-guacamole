import { useState } from "react";
import { ToolCall } from "../../web/src/components/tool-call";
import { TranscriptMessages } from "../../web/src/components/transcript-messages";
import { contentToText, type Message } from "@copilotkit/react-core/v2";

const toolSamples: [string, Record<string, unknown>, string][] = [
  ["list_files", { path: "src" }, "src/greet.ts\nsrc/greet.test.ts"],
  ["read_file", { path: "src/greet.ts" }, "1\texport const greet = (name) => name.trim();"],
  [
    "read_file",
    { path: "src/greet.test.ts" },
    "1\ttest('trims names', () => expect(greet(' Ada ')).toBe('Ada'));",
  ],
  ["search", { query: "greet" }, "src/greet.ts:1\nsrc/greet.test.ts:1"],
  [
    "load_skill",
    { name: "regression-only-coverage" },
    "Write a failing regression before changing behavior.",
  ],
  ["bash", { command: "node --test src/greet.test.ts" }, "exit code: 0\n1 test passed"],
  [
    "patch",
    {
      patch:
        "*** Begin Patch\n*** Update File: src/greet.ts\n@@\n-export const greet = (name) => name.trim();\n+export const greet = (name = '') => name.trim();\n*** End Patch",
    },
    "Updated src/greet.ts",
  ],
  ["custom_tool", { format: "summary" }, "Review complete"],
];
export const activityMessages: Message[] = [
  {
    id: "intro",
    role: "assistant",
    content: "I’ll inspect the greeting helper and its tests, then check the change.",
  },
  ...toolSamples.flatMap(([name, args, result], index): Message[] => [
    {
      id: `message-${index}`,
      role: "assistant",
      toolCalls: [
        {
          id: `call-${index}`,
          type: "function",
          function: { name, arguments: JSON.stringify(args) },
        },
      ],
    },
    { id: `result-${index}`, role: "tool", toolCallId: `call-${index}`, content: result },
  ]),
  {
    id: "end",
    role: "assistant",
    content:
      "The helper now handles a missing name. The existing trim test passed; add a regression for the default next.",
  },
];

/** Synthetic transcript using production tool surfaces; no model is involved. */
export function ToolActivityFixture() {
  const [more, setMore] = useState(false);
  const [finished, setFinished] = useState(false);
  const edge = new URLSearchParams(location.search).has("edge");
  const messages: Message[] = [
    ...activityMessages,
    ...(edge
      ? [
          {
            id: "failed",
            role: "assistant" as const,
            toolCalls: [
              {
                id: "failed",
                type: "function" as const,
                function: {
                  name: "bash",
                  arguments: JSON.stringify({
                    command: "node --test a-very-long-path/with-many-nested-folders/greet.test.ts",
                  }),
                },
              },
            ],
          },
          {
            id: "failed-result",
            role: "tool" as const,
            toolCallId: "failed",
            content: "exit code: 1\nExpected a non-empty name",
          },
          {
            id: "denied",
            role: "assistant" as const,
            toolCalls: [
              {
                id: "denied",
                type: "function" as const,
                function: {
                  name: "write_file",
                  arguments: JSON.stringify({ path: "src/greet.ts", content: "" }),
                },
              },
            ],
          },
          {
            id: "denied-result",
            role: "tool" as const,
            toolCallId: "denied",
            content: "The user denied this tool call",
          },
          {
            id: "stream",
            role: "assistant" as const,
            toolCalls: [
              {
                id: "stream",
                type: "function" as const,
                function: { name: "custom_tool", arguments: '{"query":"working"}' },
              },
            ],
          },
          ...(finished
            ? [
                {
                  id: "stream-result",
                  role: "tool" as const,
                  toolCallId: "stream",
                  content: "Finished checking",
                },
              ]
            : []),
        ]
      : []),
    ...(more
      ? Array.from({ length: 100 }, (_, i): Message => ({
          id: `extra-${i}`,
          role: "assistant",
          content: `Additional response ${i}. The transcript must retain disclosure choices while older rows are virtualized.`,
        }))
      : []),
  ];
  return (
    <main
      style={{
        height: "100vh",
        maxWidth: 900,
        margin: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ padding: "0 16px" }}>Tool activity layout fixture · synthetic data</p>
      <div>
        <button onClick={() => setMore(!more)}>Toggle long history</button>
        {edge && <button onClick={() => setFinished(true)}>Finish call</button>}
      </div>
      <TranscriptMessages
        messages={messages}
        pendingIds={new Set()}
        onCopyError={() => {}}
        renderCall={({ call, result }) => (
          <ToolCall
            name={call.function.name}
            args={call.function.arguments}
            result={result ? contentToText(result.content) : undefined}
            running={call.id === "stream" && !finished}
          />
        )}
      />
    </main>
  );
}
