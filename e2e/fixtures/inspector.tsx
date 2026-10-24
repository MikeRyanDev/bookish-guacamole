import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inspector } from "../../src/client/components/inspector";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const [file, setFile] = useState<string>();
  const [panel, setPanel] = useState<"files" | "skills">("files");
  return (
    <QueryClientProvider client={client}>
      <div className="workspace hide-sidebar">
        <header className="workspace-header">File viewer fixture</header>
        <main className="main-pane">
          <h1>Conversation stays here</h1>
        </main>
        <Inspector
          config={{
            token: "fixture",
            workspaceId: "fixture",
            workspace: "/fixture",
            workspaceName: "Fixture",
            runtimeUrl: "",
            agentId: "",
            models: [],
            defaultModel: "",
            containerId: "",
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
