import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Goal } from "@tanstack/ai-harness/plugins";
import { ConversationComposer } from "../../web/src/components/conversation-composer";
import { Permission } from "../../web/src/components/tool-approval";
import { VirtualTranscript } from "../../web/src/components/virtual-transcript";
import { applyAppearance } from "../../web/src/appearance";
import "../../web/src/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";

const params = new URLSearchParams(location.search);
applyAppearance({ theme: params.get("theme") === "dark" ? "dark" : "light", accent: "moss" });
function Fixture() {
  const [state, setState] = useState("none");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const [items, setItems] = useState(() =>
    Array.from({ length: params.has("empty") ? 0 : 120 }, (_, i) => ({
      id: `message-${i}`,
      text: `Message ${i}. Actual fixture output for checking reading position.\n`.repeat(3),
    })),
  );
  const goal: Goal | null =
    state === "none" || state === "restoring"
      ? null
      : {
          text: params.has("long")
            ? "Verify every project requirement with evidence. ".repeat(85)
            : "Add keyboard navigation and verify it on mobile.",
          status: state === "approval" || state === "error" ? "paused" : (state as Goal["status"]),
          round: 3,
          reason: "Keyboard navigation passes. Mobile verification remains.",
          note:
            state === "error"
              ? "The last turn failed. Run /goal resume to try again."
              : state === "approval"
                ? "The last turn waits for approval. Answer it, then run /goal resume."
                : "",
          queued: "",
        };
  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 1000,
        margin: "auto",
      }}
    >
      <header style={{ display: "flex", gap: 8, padding: 8, flexWrap: "wrap" }}>
        <label>
          Fixture state{" "}
          <select
            aria-label="Fixture state"
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            {["none", "active", "paused", "approval", "met", "stopped", "restoring", "error"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <button
          onClick={() =>
            setItems((previous) => [
              ...previous,
              {
                id: `message-${previous.length}`,
                text: `Message ${previous.length}. Streamed output.\n`.repeat(4),
              },
            ])
          }
        >
          Append output
        </button>
        <button
          onClick={() =>
            setItems((previous) =>
              previous.map((item, index) =>
                index === previous.length - 1
                  ? { ...item, text: item.text + "More streamed content.\n".repeat(8) }
                  : item,
              ),
            )
          }
        >
          Stream output
        </button>
      </header>
      <section className="conversation" aria-label="Coding conversation">
        <VirtualTranscript
          items={items}
          renderItem={(item) => (
            <article data-testid={item.id} style={{ paddingBottom: 20, whiteSpace: "pre-wrap" }}>
              {item.text}
            </article>
          )}
          busy={state === "restoring"}
          footer={
            <>
              {state === "approval" && (
                <Permission
                  interrupt={{
                    id: "fixture-approval",
                    reason: "approval",
                    message: "Run the project tests?",
                  }}
                  messages={[]}
                  resolve={async () => {
                    setState("paused");
                  }}
                />
              )}
              {state === "error" && (
                <p role="alert">The last turn failed. Resume the goal to try again.</p>
              )}
              {state === "restoring" && <p role="status">Restoring session…</p>}
            </>
          }
          empty={
            <div className="empty">
              <h1>What are we building?</h1>
            </div>
          }
        />
        <ConversationComposer
          draft={draft}
          onDraftChange={setDraft}
          goalMode={mode}
          onGoalModeChange={setMode}
          input={input}
          goal={goal}
          running={state === "active"}
          connecting={state === "restoring"}
          ready
          pendingApproval={state === "approval"}
          onSend={() => {
            setDraft("");
            if (mode) {
              setState("active");
              setMode(false);
            }
          }}
          onStopRun={() => setState("paused")}
          onResumeGoal={() => setState("active")}
          onStopGoal={() => setState("stopped")}
        />
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
