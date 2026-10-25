import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
const originalFetch = window.fetch.bind(window);
let fail = params.get("failure");
const states = new Map<string, { started: number; reviewed?: "approved" | "rejected" }>();
const proposal = {
  id,
  title: "Test before editing",
  description: "Check behavior before changing code",
  reason: "Repeated corrections in saved conversations",
  operation: "add",
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
  const workspace = url.searchParams.get("workspace") ?? "default";
  const key = `learning-fixture-${workspace}`;
  const selected = localStorage.getItem(key);
  const state = states.get(selected ?? "") ?? { started: 0 };
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
        reviewed === "approved"
          ? [
              {
                name: "test-first",
                description: proposal.description,
                content:
                  "# Test first\n\nRun the focused tests before editing. After the change, run them again and report the result.",
              },
            ]
          : [],
    });
  if (path.endsWith("/spaces")) return Response.json({ spaces, nextCursor: null });
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
      status: Date.now() - state.started > 900 ? "succeeded" : "queued",
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
          content:
            "# Test first\n\nRun the focused tests before editing. After the change, run them again and report the result.",
        },
      ],
      supportingInsights: [
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
          available: true,
          unavailable: null,
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
  const [panel, setPanel] = useState<"files" | "skills">("files");
  const [file, setFile] = useState<string>();
  const name = workspace === "default" ? "Demo project" : "Second project";
  return (
    <QueryClientProvider client={client}>
      <div className={`workspace ${open ? "" : "hide-inspector"}`}>
        <header className="workspace-header">
          <select
            aria-label="Workspace"
            value={workspace}
            onChange={(event) => setWorkspace(event.target.value)}
          >
            <option value="default">Demo project</option>
            <option value="second">Second project</option>
          </select>
          <div className="header-actions">
            <button
              aria-pressed={open && panel === "skills"}
              onClick={() => {
                setPanel("skills");
                setOpen(!open || panel !== "skills");
              }}
            >
              Learning
            </button>
            <button
              aria-pressed={open && panel === "files"}
              onClick={() => {
                setPanel("files");
                setOpen(!open || panel !== "files");
              }}
            >
              Files
            </button>
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
          panel={panel}
          file={file}
          onPanel={setPanel}
          onFile={setFile}
        />
      </div>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
