import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationCapabilities } from "../../src/client/components/conversation-capabilities";
import { useAppearance } from "../../src/client/appearance";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import { installCapabilitiesReview, applyReviewHistory } from "./capabilities-review";
installCapabilitiesReview();
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  useAppearance();
  const [result, setResult] = useState("");
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        minHeight: "95vh",
      }}
    >
      <p data-testid="history-result">{result}</p>
      <ConversationCapabilities
        config={{
          token: "fixture",
          runtimeUrl: "/unused",
          workspace: "fixture",
          workspaceId: "fixture",
          workspaceName: "Fixture",
          agentId: "fixture",
          containerId: "fixture",
          defaultModel: "first",
          models: [{ id: "first", label: "First model", provider: "openai", model: "first" }],
        }}
        threadId="one"
        modelId="first"
        busy={false}
        onExecutionSettings={() => setResult("execution")}
        onHistory={async (action, revision) => {
          applyReviewHistory(action);
          setResult(`${action}:${revision}`);
        }}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <Fixture />
  </QueryClientProvider>,
);
