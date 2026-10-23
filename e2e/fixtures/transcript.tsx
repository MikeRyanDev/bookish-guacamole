import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VirtualTranscript } from "../../web/src/components/virtual-transcript";
import "../../web/src/styles.css";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/spline-sans-mono";
import { ToolCall } from "../../web/src/components/tool-call";

function Fixture() {
  const [items, setItems] = useState(() =>
    Array.from({ length: 1000 }, (_, i) => ({
      id: `message-${i}`,
      text: `Message ${i}`,
      lines: (i % 5) + 1,
    })),
  );
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
