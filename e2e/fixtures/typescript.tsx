import { useState } from "react";
import { ToolCall } from "../../src/client/components/tool-call";

export const source =
  'const greeting: string = "Hello, Ada";\nconsole.log(greeting);\nreturn { greeting };\n';
const output = JSON.stringify({
  success: true,
  result: { greeting: "Hello, Ada" },
  logs: ["Hello, Ada"],
});

const nativeStates: Record<string, unknown> = {
  "native-empty": { success: true },
  false: { success: true, result: false },
  zero: { success: true, result: 0 },
  null: { success: true, result: null },
  "empty-string": { success: true, result: "" },
  "empty-array": { success: true, result: [] },
  "empty-object": { success: true, result: {} },
  "logs-only": { success: true, logs: ["Reading files", "WARN: skipped empty file", ""] },
  stack: {
    success: false,
    result: { processed: 2 },
    logs: ["Started", "ERROR: stopped"],
    error: {
      name: "TypeError",
      message: "Cannot read properties of undefined",
      line: 4,
      stack: "TypeError: Cannot read properties of undefined\n    at inspect (program.ts:4:9)",
    },
  },
  timeout: {
    success: false,
    logs: ["Started"],
    error: { name: "TimeoutError", message: "Execution timed out" },
  },
  cancelled: { success: false, error: { name: "AbortError", message: "Execution was cancelled" } },
  "no-error-details": { success: false },
  "empty-error": { success: false, error: { message: "" } },
  conflict: { success: true, error: { message: "Failure despite success flag" } },
  "invalid-envelope": { success: true, logs: [42] },
  "unknown-fields": { success: true, result: { found: true }, extra: "provider evidence" },
  "long-error": {
    success: false,
    logs: ["Started"],
    error: {
      name: "RuntimeError",
      message: "A very long error detail. ".repeat(200),
      stack: "at inspect (program.ts:4:9)\n".repeat(100),
    },
  },
  "long-native": {
    success: true,
    result: Array.from({ length: 100 }, (_, index) => ({
      path: `src/long-folder-${index}/` + "long-file-name-".repeat(15),
      changed: false,
    })),
    logs: Array.from({ length: 100 }, (_, index) => `Read file ${index}`),
  },
  untrusted: {
    success: false,
    error: { message: '<img src=x onerror="alert(1)">' },
    logs: ["<script>alert(1)</script>"],
  },
};

/** Isolated renderer states. These controls simulate transport; they execute no code. */
export function TypeScriptFixture() {
  if (new URLSearchParams(location.search).has("lifecycle")) return <TypeScriptLifecycle />;
  const [state, setState] = useState("complete");
  const args =
    state === "partial"
      ? '{"typescriptCode":"const greet'
      : state === "malformed"
        ? '{"other":42}'
        : JSON.stringify({
            typescriptCode:
              state === "empty-source"
                ? ""
                : ["long", "long-native"].includes(state)
                  ? source.repeat(100)
                  : source,
          });
  const result = Object.hasOwn(nativeStates, state)
    ? JSON.stringify(nativeStates[state])
    : state === "invalid-json"
      ? "{broken response"
      : state === "precision"
        ? '{"success":true,"result":{"id":9007199254740993,"literal":"{ [ , : \\"quoted\\" ] }","empty":[],"nested":[{},[false,null,0]]},"logs":["line\\nnext"]}'
        : ["running", "partial", "missing", "approval"].includes(state)
          ? undefined
          : state === "error"
            ? JSON.stringify({
                success: false,
                logs: ["Started"],
                error: { name: "TypeScriptError", message: "Unexpected token", line: 2 },
              })
            : state === "denied"
              ? "The user denied this tool call"
              : state === "empty"
                ? ""
                : state === "long"
                  ? "Long output line\n".repeat(300)
                  : state === "unsafe"
                    ? '<script>alert("hello")</script>'
                    : output;
  return (
    <main style={{ maxWidth: 760, margin: "24px auto", padding: 20 }}>
      <label>
        Fixture state{" "}
        <select value={state} onChange={(event) => setState(event.target.value)}>
          {[
            "complete",
            "running",
            "partial",
            "malformed",
            "missing",
            "approval",
            "error",
            "denied",
            "empty",
            "empty-source",
            "long",
            "unsafe",
            "precision",
            "invalid-json",
            ...Object.keys(nativeStates),
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <ToolCall
        key={state}
        name="execute_typescript"
        args={args}
        result={result}
        running={["running", "partial"].includes(state)}
        awaitingApproval={state === "approval"}
      />
    </main>
  );
}

/** Exercises updates to one call identity, matching streamed SDK props. */
function TypeScriptLifecycle() {
  const [phase, setPhase] = useState(0);
  return (
    <main style={{ maxWidth: 760, margin: "24px auto", padding: 20 }}>
      <button onClick={() => setPhase(1)}>Complete arguments</button>
      <button onClick={() => setPhase(2)}>Finish execution</button>
      <ToolCall
        name="execute_typescript"
        args={phase === 0 ? '{"typescriptCode":"const' : JSON.stringify({ typescriptCode: source })}
        result={phase === 2 ? output : undefined}
        running={phase < 2}
      />
    </main>
  );
}
