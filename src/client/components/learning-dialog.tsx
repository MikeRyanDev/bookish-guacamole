import { X } from "lucide-react";
import { lazy, useEffect, useRef } from "react";
import type { AppConfig } from "../api";
import learningStyles from "../styles/learning.module.css";
import { IconButton } from "./icon-button";
import { DeferredPanel } from "./deferred-panel";

const LearningPanel = lazy(() =>
  import("./learning-panel").then(({ LearningPanel }) => ({ default: LearningPanel })),
);

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
      className={learningStyles.learningDialog}
      aria-labelledby="learning-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <header className={learningStyles.learningDialogHeading}>
        <h1 ref={heading} tabIndex={-1} id="learning-title">
          Learning · {config.workspaceName}
        </h1>
        <div className={learningStyles.learningDialogActions}>
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
      <DeferredPanel label="Learning">
        <LearningPanel config={config} />
      </DeferredPanel>
    </dialog>
  );
}
