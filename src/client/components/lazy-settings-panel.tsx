import { lazy, type ComponentProps } from "react";
import { DeferredPanel } from "./deferred-panel";
import type { SettingsPanel } from "./settings-panel";

const Settings = lazy(() =>
  import("./settings-panel").then(({ SettingsPanel }) => ({ default: SettingsPanel })),
);

/** Defers settings code until its dialog opens, without delaying the dialog controls. */
export function LazySettingsPanel(props: ComponentProps<typeof SettingsPanel>) {
  return (
    <DeferredPanel label="settings">
      <Settings {...props} />
    </DeferredPanel>
  );
}
