import { ApprovalControls } from "../../web/src/components/approval-settings";
import { ModelSelector } from "../../web/src/components/model-selector";
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
  const [planOnly, setPlanOnly] = useState(false);
  const [permissionMode, setPermissionMode] = useState<"acceptEdits" | "bypass">("acceptEdits");
  const [selectedModel, setSelectedModel] = useState("local");
  const [state, setState] = useState("none");
  const [draft, setDraft] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [submittedGoal, setSubmittedGoal] = useState("");
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
            : submittedGoal || "Add keyboard navigation and verify it on mobile.",
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
      {!params.has("review") && (
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
      )}
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
          approvals={
            params.has("models") ? (
              <>
                <ApprovalControls
                  mode={permissionMode}
                  planOnly={planOnly}
                  onMode={setPermissionMode}
                  onPlanOnly={setPlanOnly}
                  onRefresh={() => {}}
                />
                <ModelSelector
                  models={[
                    { id: "local", label: "Local coder", provider: "ollama", model: "my-model" },
                    {
                      id: "remote",
                      label: "Remote coder",
                      provider: "openai-compatible",
                      model: "my-other-model",
                    },
                  ]}
                  selected={selectedModel}
                  onSelect={setSelectedModel}
                  disabled={state === "active" || state === "approval"}
                />
              </>
            ) : undefined
          }
          draft={mode ? goalDraft : draft}
          onDraftChange={mode ? setGoalDraft : setDraft}
          goalMode={mode}
          onGoalModeChange={setMode}
          input={input}
          goal={goal}
          running={state === "active"}
          connecting={state === "restoring"}
          ready
          pendingApproval={state === "approval"}
          onSend={() => {
            if (mode) {
              setSubmittedGoal(goalDraft);
              setGoalDraft("");
              setState("active");
              setMode(false);
            } else setDraft("");
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
