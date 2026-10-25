import { ToolActivityFixture } from "./tool-activity";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VirtualTranscript } from "../../src/client/components/virtual-transcript";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { Permission } from "../../src/client/components/tool-approval";
import { ToolCall } from "../../src/client/components/tool-call";

function Fixture() {
  if (new URLSearchParams(location.search).has("activity")) return <ToolActivityFixture />;
  const [decision, setDecision] = useState("");
  const [streamCommand, setStreamCommand] = useState("npm test");
  const [attempts, setAttempts] = useState(0);
  const [items, setItems] = useState(() =>
    Array.from({ length: 1000 }, (_, i) => ({
      id: `message-${i}`,
      text: `Message ${i}`,
      lines: (i % 5) + 1,
    })),
  );
  if (new URLSearchParams(location.search).has("streamcopy"))
    return (
      <main>
        <ToolCall name="bash" args={JSON.stringify({ command: streamCommand })} running />
        <button onClick={() => setStreamCommand("npm test -- --runInBand")}>
          Complete arguments
        </button>
      </main>
    );
  if (new URLSearchParams(location.search).has("states"))
    return (
      <main style={{ maxWidth: 760, margin: "24px auto", padding: 20 }}>
        <ToolCall name="bash" args={'{"command":"npm'} running />
        <ToolCall name="read_file" args='{"path":"waiting.ts"}' running={false} />
        <ToolCall
          name="custom_tool"
          args='{"value":"<img src=x onerror=alert(1)>"}'
          result="Error: <script>unexpected</script>"
          running={false}
        />
      </main>
    );
  const approval = new URLSearchParams(location.search).get("approval");
  if (approval) {
    const name = approval === "patch" ? "patch" : "bash";
    const args =
      name === "patch"
        ? {
            patch:
              "*** Begin Patch\n*** Update File: src/greet.ts\n@@\n-return name;\n+return name.trim();\n*** End Patch",
          }
        : { command: "npm test -- --runInBand" };
    return (
      <main style={{ maxWidth: 760, margin: "24px auto", padding: 20 }}>
        <Permission
          interrupt={{
            id: "approval-test",
            reason: "approval",
            metadata: { "tanstack:interruptPayload": { toolCallId: "call-test" } },
          }}
          messages={[
            {
              id: "proposal",
              role: "assistant",
              toolCalls: [
                {
                  id: "call-test",
                  type: "function",
                  function: { name, arguments: JSON.stringify(args) },
                },
              ],
            },
          ]}
          resolve={async (answer) => {
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (new URLSearchParams(location.search).has("fail") && attempts === 0) {
              setAttempts(1);
              throw new Error("Fixture network failure");
            }
            setDecision(String(answer));
          }}
        />
        <output aria-label="Decision">{decision}</output>
      </main>
    );
  }
  if (new URLSearchParams(location.search).has("tools"))
    return (
      <main style={{ maxWidth: 760, margin: "24px auto", padding: 20 }}>
        <ToolCall
          name="bash"
          args={JSON.stringify({ command: "npm test -- --runInBand" })}
          result={"exit code: 1\nFAIL greet.test.js\nExpected empty name to be rejected"}
          running={false}
        />
        <ToolCall
          name="patch"
          args={JSON.stringify({
            patch:
              "*** Begin Patch\n*** Update File: src/greet.ts\n@@\n-return `Hello, ${name}`;\n+return `Hello, ${name.trim()}`;\n*** End Patch",
          })}
          result="Updated src/greet.ts"
          running={false}
        />
        <ToolCall
          name="read_file"
          args={JSON.stringify({ path: "src/greet.ts", offset: 10, limit: 2 })}
          result={"10\texport function greet(name) {\n11\t  return name.trim();"}
          running={false}
        />
        <ToolCall
          name="execute_typescript"
          args={JSON.stringify({
            typescriptCode:
              'const notes = await external_read_file({ path: "notes.txt" });\nreturn notes;',
          })}
          result="Read-only result"
          running={false}
        />
      </main>
    );
  return (
    <>
      <div style={{ display: "flex", gap: 12, padding: 10 }}>
        <button
          onClick={() =>
            setItems((current) => [
              ...current,
              { id: `message-${current.length}`, text: `Message ${current.length}`, lines: 3 },
            ])
          }
        >
          Append
        </button>
        <button
          onClick={() =>
            setItems((current) =>
              current.map((item, i) =>
                i === current.length - 1 ? { ...item, lines: item.lines + 5 } : item,
              ),
            )
          }
        >
          Stream more
        </button>
        <button
          onClick={() =>
            setItems((current) => [
              { id: "older-message", text: "Older history", lines: 4 },
              ...current,
            ])
          }
        >
          Prepend
        </button>
      </div>
      <div style={{ height: 520, display: "flex", flexDirection: "column", maxWidth: 800 }}>
        <VirtualTranscript
          items={items}
          renderItem={(item) => (
            <article aria-label={item.text} className="message">
              <strong>{item.text}</strong>
              {Array.from({ length: item.lines }, (_, i) => (
                <p key={i}>
                  Variable height content line {i}. This is a layout fixture, not model output.
                </p>
              ))}
            </article>
          )}
        />
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
