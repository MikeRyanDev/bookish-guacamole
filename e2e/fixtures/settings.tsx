import { useRef } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppearanceSettings } from "../../src/client/components/appearance-settings";
import { ConversationDefaults } from "../../src/client/components/conversation-defaults";
import { useAppearance } from "../../src/client/appearance";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const appearance = useAppearance();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <main>
      <button onClick={() => dialog.current?.showModal()}>Settings</button>
      <dialog ref={dialog} className="command-dialog" aria-labelledby="settings-heading">
        <header>
          <h2 id="settings-heading">Settings</h2>
          <button aria-label="Close settings" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </header>
        <div className="settings-content">
          <AppearanceSettings {...appearance} />
          <ConversationDefaults
            config={{
              token: "fixture",
              runtimeUrl: "/unused",
              workspace: "fixture",
              workspaceId: "fixture",
              workspaceName: "Fixture",
              agentId: "fixture",
              containerId: "fixture",
              defaultModel: "first",
              models: [
                { id: "first", label: "First model", provider: "openai", model: "first" },
                { id: "second", label: "Second model", provider: "anthropic", model: "second" },
              ],
            }}
          />
        </div>
      </dialog>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <Fixture />
  </QueryClientProvider>,
);
