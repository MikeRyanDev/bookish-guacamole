import { Component, Suspense, type ReactNode } from "react";
import sharedStyles from "../styles/shared.module.css";

/** Keeps the owning dialog mounted when an optional feature loads or fails to download. */
export function DeferredPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <PanelErrorBoundary label={label}>
      <Suspense
        fallback={
          <p role="status" className={sharedStyles.panelFeedback}>
            Loading {label}…
          </p>
        }
      >
        {children}
      </Suspense>
    </PanelErrorBoundary>
  );
}

class PanelErrorBoundary extends Component<
  { label: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className={sharedStyles.panelFeedback}>
        <p>Could not load {this.props.label}. Reload the app to try again.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload app
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
