import { useState } from "react";
import { ToolCall } from "../../src/client/components/tool-call";

export const source =
  'const greeting: string = "Hello, Ada";\nconsole.log(greeting);\nreturn { greeting };\n';
const output = JSON.stringify({
  success: true,
  result: { greeting: "Hello, Ada" },
  logs: ["Hello, Ada"],
});

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
              state === "empty-source" ? "" : state === "long" ? source.repeat(100) : source,
          });
  const result =
    state === "precision"
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
