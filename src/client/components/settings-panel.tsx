import { useId, useRef, useState } from "react";
import { Palette, SlidersHorizontal, ShieldCheck, Workflow, Plug } from "lucide-react";
import type { AppConfig } from "../api";
import type { Accent, Theme } from "../appearance";
import { AppearanceSettings } from "./appearance-settings";
import { ConversationDefaults } from "./conversation-defaults";
import { WorkspacePermissions } from "./approval-settings";
import { ExecutionSettings } from "./execution-settings";
import { ConnectionSettings } from "./connection-settings";

const categories = [
  { id: "appearance", label: "Appearance", Icon: Palette },
  { id: "models", label: "Models", Icon: SlidersHorizontal },
  { id: "permissions", label: "Permissions", Icon: ShieldCheck },
  { id: "execution", label: "Execution", Icon: Workflow },
  { id: "connections", label: "Connections", Icon: Plug },
] as const;
type Category = (typeof categories)[number]["id"];

/** Keeps the category rail fixed and drafts mounted while each pane scrolls independently. */
export function SettingsPanel({
  config,
  initialCategory = "appearance",
  ...appearance
}: {
  config: AppConfig;
  initialCategory?: Category;
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  storageError?: boolean;
  retryStorage?: () => void;
}) {
  const id = useId();
  const [active, setActive] = useState<Category>(initialCategory);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="settings-layout">
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Settings categories"
        aria-orientation="vertical"
      >
        {categories.map(({ id: category, label, Icon }, index) => (
          <button
            key={category}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-${category}-tab`}
            aria-controls={`${id}-${category}-panel`}
            aria-selected={active === category}
            tabIndex={active === category ? 0 : -1}
            onClick={() => setActive(category)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowDown"
                  ? (index + 1) % categories.length
                  : event.key === "ArrowUp"
                    ? (index + categories.length - 1) % categories.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? categories.length - 1
                        : undefined;
              if (next === undefined) return;
              event.preventDefault();
              setActive(categories[next]!.id);
              tabs.current[next]?.focus();
            }}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {categories.map(({ id: category }) => (
        <div
          key={category}
          className="settings-tab-panel"
          role="tabpanel"
          id={`${id}-${category}-panel`}
          aria-labelledby={`${id}-${category}-tab`}
          hidden={active !== category}
          tabIndex={0}
        >
          {category === "appearance" ? (
            <>
              <AppearanceSettings {...appearance} />
              {appearance.storageError && (
                <div className="settings-inline-error" role="status">
                  <span>Appearance is session-only.</span>
                  <button onClick={appearance.retryStorage}>Retry storage</button>
                </div>
              )}
            </>
          ) : category === "models" ? (
            <ConversationDefaults config={config} field="modelId" />
          ) : category === "execution" ? (
            <ExecutionSettings config={config} active={active === category} />
          ) : category === "connections" ? (
            <ConnectionSettings config={config} active={active === category} />
          ) : (
            <>
              <ConversationDefaults config={config} field="permissions" />
              <WorkspacePermissions config={config} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
