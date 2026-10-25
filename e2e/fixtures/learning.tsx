import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LearningDialog } from "../../src/client/components/learning-dialog";
import { Inspector } from "../../src/client/components/inspector";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const id = "0198a012-a20f-77c0-9e33-8992f18e74a1";
const spaces = [
  { id: "coding", name: "Coding lessons" },
  { id: "writing", name: "Writing lessons" },
];
const instruction =
  "# Test first\n\nRun the focused tests before editing. After the change, run them again and report the result.";
const longInstruction =
  "---\nname: test-first\ndescription: Verify behavior with focused tests\n---\n\n" +
  instruction +
  Array.from(
    { length: 12 },
    (_, index) =>
      `\n\n## ${index + 1}. Verify the behavior\n\nReproduce the reported issue with a focused test. Record the result before changing the implementation. Keep unrelated work intact and check the final behavior against the original request.\n\n\`\`\`sh\npnpm test -- affected.test.ts\n\`\`\`\n\n| Check | Expected result |\n| --- | --- |\n| Regression | Fails before the fix |\n| Verification | Passes after the fix |`,
  ).join("");
const content = params.has("long") ? longInstruction : instruction;
const originalFetch = window.fetch.bind(window);
let fail = params.get("failure");
const states = new Map<string, { started: number; reviewed?: "approved" | "rejected" }>();
const proposal = {
  id,
  title: params.has("longtitle")
    ? "Preserve workspace changes during multi-package release preparation and final verification"
    : "Test before editing",
  description: params.has("duplicate")
    ? "Use when When implementing or updating a greet-like function that receives user-supplied names. Do not use for Do not use for non-greet functions or when input names are never user-supplied."
    : "Check behavior before changing code",
  reason: "Repeated corrections in saved conversations",
  operation: params.has("remove") ? "remove" : "add",
  status: "pending_review",
};
/** Isolated in-browser service: this fixture never calls Intelligence or a model. */
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    location.href,
  );
  if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);
  init?.signal?.throwIfAborted();
  await new Promise((resolve) =>
    setTimeout(resolve, params.has("slow") ? 1200 : url.pathname.endsWith("/candidates") ? 40 : 20),
  );
  init?.signal?.throwIfAborted();
  const workspace = url.searchParams.get("workspace") ?? "default";
  const key = `learning-fixture-${workspace}`;
  const selected = localStorage.getItem(key);
  const state = states.get(selected ?? "") ?? {
    started: params.has("ready") ? Date.now() - 10000 : 0,
  };
  states.set(selected ?? "", state);
  const { started, reviewed } = state;
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
  const path = url.pathname;
  const category = path.endsWith("/spaces")
    ? "spaces"
    : path.endsWith("/review")
      ? "review"
      : path.endsWith("/runs") && body
        ? "run"
        : path === "/api/learning" && body
          ? "save"
          : path === "/api/skills"
            ? "skills"
            : path === "/api/learning"
              ? "settings"
              : path.endsWith("/runs")
                ? "status"
                : path.endsWith("/candidates")
                  ? "candidates"
                  : path.endsWith("/evidence")
                    ? "evidence"
                    : path.endsWith(`/candidates/${id}`)
                      ? "candidate"
                      : undefined;
  if (category === "review" && fail === "review-state") {
    fail = "candidate-state";
    return Response.json({ error: "Review result unavailable" }, { status: 503 });
  }
  if (path.endsWith(`/candidates/${id}`) && fail === "candidate-state") {
    fail = null;
    return Response.json({ error: "State unavailable" }, { status: 503 });
  }
  if (category && fail === category) {
    fail = null;
    return Response.json(
      { error: "The Learning service is temporarily unavailable. Retry." },
      { status: 503 },
    );
  }
  if (path === "/api/skills")
    return Response.json({
      revision: "1",
      skills:
        reviewed === "approved" || params.has("published")
          ? [
              {
                name: "test-first",
                description: proposal.description,
                content,
              },
            ]
          : [],
    });
  if (path.endsWith("/spaces"))
    return Response.json({ spaces: params.has("empty") ? [] : spaces, nextCursor: null });
  if (path === "/api/learning") {
    if (body) {
      if (body.containerId) localStorage.setItem(key, body.containerId);
      else localStorage.removeItem(key);
    }
    const containerId = body ? body.containerId : selected;
    return Response.json({
      containerId,
      inherited: false,
      space: spaces.find((space) => space.id === containerId) ?? null,
    });
  }
  if (path.endsWith("/runs")) {
    if (body) state.started = Date.now();
    const run = {
      id,
      status: params.has("runfailed")
        ? "failed"
        : Date.now() - state.started > 900
          ? "succeeded"
          : "queued",
      candidateCount: 1,
      createdAt: new Date().toISOString(),
      failureCode: null,
    };
    return Response.json(body ? { run } : { runs: started ? [run] : [] });
  }
  if (path.endsWith("/candidates"))
    return Response.json({
      candidates: started && Date.now() - started > 900 && !reviewed ? [proposal] : [],
    });
  if (path.endsWith("/review")) {
    state.reviewed = body.action === "approve" ? "approved" : "rejected";
    return Response.json({ status: state.reviewed });
  }
  if (path.endsWith(`/candidates/${id}`))
    return Response.json({
      ...proposal,
      status: reviewed ?? proposal.status,
      files: [
        {
          path: "SKILL.md",
          content,
        },
      ],
      supportingInsights: params.has("noevidence")
        ? []
        : [
            {
              id,
              alias: "test-first",
              statement: "Run tests before editing code",
              impact: "A failing test identifies the behavior to fix.",
            },
          ],
    });
  if (path.endsWith("/evidence"))
    return Response.json({
      sources: [
        {
          id: "conversation",
          label: "Fix greeting tests",
          available: !params.has("unavailable"),
          unavailable: params.has("unavailable") ? "Source removed" : null,
          items: [
            {
              label: "user",
              content: "Please run the tests first so we know which behavior is broken.",
            },
            {
              label: "assistant",
              content: "The greeting test failed before the fix and passed after it.",
            },
          ],
        },
      ],
    });
  return Response.json({ entries: [], git: { available: false, entries: {} } });
};
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const [workspace, setWorkspace] = useState("default");
  const [open, setOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [file, setFile] = useState<string>();
  const name = workspace === "default" ? "Demo project" : "Second project";
  return (
    <QueryClientProvider client={client}>
      <div className={`workspace ${open ? "" : "hide-inspector"}`}>
        <header className="workspace-header">
          <div className="header-left">
            <select
              aria-label="Workspace"
              value={workspace}
              onChange={(event) => setWorkspace(event.target.value)}
            >
              <option value="default">Demo project</option>
              <option value="second">Second project</option>
            </select>
            <button className="workspace-learning-entry" onClick={() => setLearningOpen(true)}>
              Learning
            </button>
          </div>
          <div className="header-actions">
            <button onClick={() => setOpen(!open)}>Files</button>
          </div>
        </header>
        <aside className="sessions" aria-label="Sessions" />
        <main className="main-pane">
          <div className="empty-state">
            <h1>What are we building?</h1>
          </div>
        </main>
        <Inspector
          config={{
            token: "fixture",
            workspaceId: workspace,
            workspace: "/demo",
            workspaceName: name,
            runtimeUrl: "",
            agentId: "coder",
            models: [],
            defaultModel: "",
            containerId: null,
          }}
          file={file}
          onFile={setFile}
        />
        {learningOpen && (
          <LearningDialog
            key={workspace}
            config={{
              token: "fixture",
              workspaceId: workspace,
              workspace: "/demo",
              workspaceName: name,
              runtimeUrl: "",
              agentId: "coder",
              models: [],
              defaultModel: "",
              containerId: null,
            }}
            onClose={() => setLearningOpen(false)}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
