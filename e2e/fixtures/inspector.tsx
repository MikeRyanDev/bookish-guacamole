import workspaceStyles from "../../src/client/styles/workspace.module.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LearningDialog } from "../../src/client/components/learning-dialog";
import { Inspector } from "../../src/client/components/inspector";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const [learningOpen, setLearningOpen] = useState(false);
  const [file, setFile] = useState<string>();
  return (
    <QueryClientProvider client={client}>
      <div className={[workspaceStyles.workspace, workspaceStyles.hideSidebar].join(" ")}>
        <header className={workspaceStyles.workspaceHeader}>
          File viewer fixture<button onClick={() => setLearningOpen(true)}>Learning</button>
        </header>
        <main className={workspaceStyles.mainPane}>
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
          file={file}
          onFile={setFile}
        />
        {learningOpen && (
          <LearningDialog
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
            onClose={() => setLearningOpen(false)}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
