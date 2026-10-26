import composerStyles from "../styles/composer.module.css";
import sharedStyles from "../styles/shared.module.css";
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronUp, X } from "lucide-react";
import { IconButton } from "./icon-button";

/** Non-modal details in the top layer; opening them never resizes the transcript. */
export function ComposerPopover({
  label,
  title,
  children,
  disabled,
}: {
  label: ReactNode;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const position = useCallback(() => {
    if (!trigger.current || !panel.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const anchorTop = rect.top;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? innerWidth;
    const top = viewport?.offsetTop ?? 0;
    const left = viewport?.offsetLeft ?? 0;
    panel.current.style.left = `${Math.max(left + 12, Math.min(rect.left, left + width - Math.min(360, innerWidth - 24) - 12))}px`;
    panel.current.style.bottom = `${innerHeight - anchorTop + 8}px`;
    panel.current.style.maxHeight = `${Math.max(80, anchorTop - top - 20)}px`;
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    position();
    const observer = new ResizeObserver(position);
    if (trigger.current) observer.observe(trigger.current);
    if (trigger.current?.closest("form")) observer.observe(trigger.current.closest("form")!);
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, position]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        className={sharedStyles.composerControl}
        popoverTarget={id}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label}
        <ChevronUp size={13} aria-hidden="true" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        className={composerStyles.composerPopover}
        onBeforeToggle={(event) => {
          if (event.newState === "open") position();
        }}
        onToggle={(event) => setOpen(event.newState === "open")}
      >
        <div className={composerStyles.composerPopoverHeading}>
          <h2 id={`${id}-title`}>{title}</h2>
          <IconButton
            label={`Close ${title.toLowerCase()}`}
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            <X size={16} />
          </IconButton>
        </div>
        {children}
      </div>
    </>
  );
}
