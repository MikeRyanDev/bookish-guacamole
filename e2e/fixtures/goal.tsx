import { useState } from "react";
import { createRoot } from "react-dom/client";
import { GoalStatus } from "../../web/src/components/goal-status";
import type { Goal } from "@tanstack/ai-harness/plugins";
import "../../web/src/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";

function Fixture() {
  const [status, setStatus] = useState<Goal["status"]>("paused");
  const long = new URLSearchParams(location.search).has("long");
  return (
    <main className="conversation" style={{ height: "100vh", maxWidth: 800, margin: "0 auto" }}>
      <div className="transcript-shell">
        <h1>Goal controls</h1>
      </div>
      <GoalStatus
        goal={{
          text: long
            ? "Verify every project requirement. ".repeat(100)
            : "Implement accessible keyboard navigation and verify the tests",
          status,
          round: 3,
          reason: "The keyboard tests pass. Mobile verification remains.",
          note: "Waiting for approval.",
          queued: "",
        }}
        running={false}
        disabled={false}
        onResume={() => setStatus("active")}
        onStop={() => setStatus("stopped")}
      />
      <form className="composer">
        <label className="sr-only" htmlFor="draft">
          Message your coding agent
        </label>
        <textarea id="draft" placeholder="Ask your agent to build something…" rows={3} />
      </form>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
