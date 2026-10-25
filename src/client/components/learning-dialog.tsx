import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { AppConfig } from "../api";
import { IconButton } from "./icon-button";
import { LearningPanel } from "./learning-panel";

/** A workspace-scoped, native modal. Mount to open; closing discards unsaved UI drafts. */
export function LearningDialog({ config, onClose }: { config: AppConfig; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="learning-dialog"
      aria-labelledby="learning-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <header className="learning-dialog-heading">
        <h1 ref={heading} tabIndex={-1} id="learning-title">
          Learning · {config.workspaceName}
        </h1>
        <div className="learning-dialog-actions">
          <IconButton
            label="Close Learning"
            onClick={() => {
              dialog.current?.close();
              onClose();
            }}
          >
            <X size={18} />
          </IconButton>
        </div>
      </header>
      <LearningPanel config={config} />
    </dialog>
  );
}
