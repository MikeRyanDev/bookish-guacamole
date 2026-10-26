import permissionsStyles from "../../src/client/styles/permissions.module.css";
import transcriptStyles from "../../src/client/styles/transcript.module.css";
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ApprovalControls, SavedPermissions } from "../../src/client/components/approval-settings";
import { Permission } from "../../src/client/components/tool-approval";
import { ConversationComposer } from "../../src/client/components/conversation-composer";
import { VirtualTranscript } from "../../src/client/components/virtual-transcript";
import { applyAppearance } from "../../src/client/appearance";

import type { PermissionRule } from "@tanstack/ai-harness/plugins";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
const params = new URLSearchParams(location.search);
applyAppearance({ theme: params.get("theme") === "dark" ? "dark" : "light", accent: "moss" });
const rule: PermissionRule = { tool: "bash", resource: "pnpm test", decision: "allow" };
function Prototype() {
  const [mode, setMode] = useState<"acceptEdits" | "bypass">("acceptEdits");
  const [saving, setSaving] = useState(false);
  const [planOnly, setPlanOnly] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const [rules, setRules] = useState<PermissionRule[]>([]);
  const [decision, setDecision] = useState("");
  const [submissions, setSubmissions] = useState(0);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [goalMode, setGoalMode] = useState(false);
  const [scenario, setScenario] = useState("command");
  const input = useRef<HTMLTextAreaElement>(null);
  const patch =
    '*** Begin Patch\n*** Update File: src/greet.ts\n@@\n-export const greet = () => "hello";\n+export const greet = () => "Hello!";\n*** End Patch';
  const tool = scenario === "patch" ? "patch" : "bash";
  const args =
    scenario === "patch"
      ? { patch: params.has("long") ? patch.repeat(30) : patch }
      : {
          command: params.has("long")
            ? "pnpm test --filter " + "packages/very-long-name/".repeat(30)
            : "pnpm test",
        };
  const scope =
    scenario === "patch"
      ? { tool: "patch", resource: "src/greet.ts", decision: "allow" as const }
      : rule;
  const items = Array.from({ length: 50 }, (_, i) => ({
    id: String(i),
    text: `Project note ${i + 1}. Inspect the command or patch before you decide.\n`.repeat(2),
  }));
  return (
    <main className={permissionsStyles.permissionPrototype}>
      <header>
        <h1>Approval prototype</h1>
        <button onClick={() => settingsDialog.current?.showModal()}>Settings</button>
        <label>
          Scenario{" "}
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              setDecision("");
            }}
          >
            <option value="command">Command</option>
            <option value="patch">Patch</option>
          </select>
        </label>
        <button onClick={() => setDecision("")}>Reset approval</button>
      </header>
      <section className={transcriptStyles.conversation} aria-label="Coding conversation">
        <VirtualTranscript
          items={items}
          renderItem={(item) => <p>{item.text}</p>}
          busy={false}
          footer={
            <>
              {!decision && (
                <Permission
                  key={scenario}
                  onResolved={() => input.current?.focus()}
                  interrupt={{
                    id: "fixture",
                    reason: "approval",
                    metadata: { "tanstack:interruptPayload": { toolCallId: "call" } },
                  }}
                  messages={[
                    {
                      id: "assistant",
                      role: "assistant",
                      toolCalls: [
                        {
                          id: "call",
                          type: "function",
                          function: { name: tool, arguments: JSON.stringify(args) },
                        },
                      ],
                    },
                  ]}
                  state={{
                    plugins: {
                      "starter/permission-preview": {
                        calls: { call: { rules: [scope], partial: false } },
                      },
                    },
                  }}
                  resolve={async (value) => {
                    setSubmissions((n) => n + 1);
                    if (params.has("slow")) await new Promise((r) => setTimeout(r, 500));
                    if (params.has("fail")) throw Error("fixture");
                    setDecision(String(value));
                    if (value === "always") setRules([scope]);
                  }}
                />
              )}
              {decision && <p role="status">Decision: {decision}</p>}
              <p>Submissions: {submissions}</p>
            </>
          }
        />
        <ConversationComposer
          draft={draft}
          onDraftChange={setDraft}
          goalMode={goalMode}
          onGoalModeChange={setGoalMode}
          input={input}
          goal={null}
          running={false}
          connecting={false}
          ready
          pendingApproval={!decision}
          onSend={() => setDraft("")}
          onStopRun={() => {}}
          onResumeGoal={() => {}}
          onStopGoal={() => {}}
          approvals={
            <ApprovalControls
              mode={mode}
              planOnly={planOnly}
              busy={saving}
              onPlanOnly={(enabled) => {
                if (params.has("slow")) {
                  setSaving(true);
                  setTimeout(() => {
                    setPlanOnly(enabled);
                    setSaving(false);
                  }, 500);
                } else setPlanOnly(enabled);
              }}
              error={error}
              onMode={(value) => {
                if (params.has("fail")) setError("Could not change mode. Try again.");
                else setMode(value);
              }}
              onRefresh={() => {}}
            />
          }
        />
      </section>
      <dialog ref={settingsDialog} aria-label="Settings">
        <button onClick={() => settingsDialog.current?.close()}>Close settings</button>
        <SavedPermissions
          rules={rules}
          onRemove={(target) => setRules((old) => old.filter((r) => r !== target))}
          onRefresh={() => {}}
        />
      </dialog>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Prototype />);
