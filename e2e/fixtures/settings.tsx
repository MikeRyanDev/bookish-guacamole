import settingsStyles from "../../src/client/styles/settings.module.css";
import sharedStyles from "../../src/client/styles/shared.module.css";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../src/client/components/icon-button";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazySettingsPanel } from "../../src/client/components/lazy-settings-panel";
import { useAppearance } from "../../src/client/appearance";
import "../../src/client/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import { installCapabilitiesReview } from "./capabilities-review";
installCapabilitiesReview();
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const appearance = useAppearance();
  const [generation, setGeneration] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <main>
      <button
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        Settings
      </button>
      <dialog
        ref={dialog}
        onClose={() => {
          setOpen(false);
          setGeneration((value) => value + 1);
        }}
        className={[sharedStyles.commandDialog, settingsStyles.settingsDialog].join(" ")}
        aria-labelledby="settings-heading"
      >
        <header>
          <h2 id="settings-heading">Settings</h2>
          <IconButton label="Close settings" onClick={() => dialog.current?.close()}>
            <X size={16} />
          </IconButton>
        </header>
        {open && (
          <LazySettingsPanel
            key={generation}
            {...appearance}
            config={{
              token: "fixture",
              runtimeUrl: "/unused",
              workspace: "fixture",
              workspaceId: "fixture",
              workspaceName: "Fixture",
              agentId: "fixture",
              containerId: "fixture",
              defaultModel: "first",
              models: location.search.includes("empty-models")
                ? []
                : [
                    { id: "first", label: "First model", provider: "openai", model: "first" },
                    { id: "second", label: "Second model", provider: "anthropic", model: "second" },
                  ],
            }}
          />
        )}
      </dialog>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <Fixture />
  </QueryClientProvider>,
);
