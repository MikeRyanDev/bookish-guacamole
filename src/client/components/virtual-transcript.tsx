import transcriptStyles from "../styles/transcript.module.css";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { observeElementRect, useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { IconButton } from "./icon-button";

/** Measures visible rows and follows output only while the reader is at the end. */
export function VirtualTranscript<T extends { id: string }>({
  items,
  renderItem,
  footer,
  empty,
  busy,
}: {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  footer?: ReactNode;
  empty?: ReactNode;
  busy?: boolean;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [disclosing, setDisclosing] = useState(false);
  const virtualizer = useVirtualizer({
    count: items.length + 1,
    getScrollElement: () => scroll.current,
    observeElementRect: (instance, notify) =>
      observeElementRect(instance, (rect) => {
        // Remember the end position before the composer changes viewport height.
        // Row measurement still belongs to TanStack; readers inspecting older output stay put.
        const follow =
          instance.scrollRect !== null &&
          instance.scrollRect.height !== rect.height &&
          instance.options.anchorTo === "end" &&
          instance.scrollElement !== null &&
          instance.scrollElement.scrollHeight -
            instance.scrollRect.height -
            instance.scrollElement.scrollTop <=
            instance.options.scrollEndThreshold;
        notify(rect);
        if (follow) instance.scrollToEnd();
      }),
    estimateSize: (index) => (index === items.length ? 24 : 160),
    getItemKey: (index) =>
      index === items.length
        ? `transcript-footer:${items.at(-1)?.id ?? "empty"}`
        : `message:${items[index]!.id}`,
    anchorTo: disclosing ? "start" : "end",
    followOnAppend: !disclosing,
    scrollEndThreshold: 24,
    overscan: 4,
  });
  useLayoutEffect(() => {
    // New agent data may resume following when inspection still leaves us at
    // the end. UI-only disclosures keep their anchor even if tool renderers
    // mount asynchronously several frames after the click.
    const element = scroll.current;
    if (element && element.scrollHeight - element.clientHeight - element.scrollTop <= 24)
      setDisclosing(false);
  }, [items]);
  useLayoutEffect(() => {
    if (!initialized.current && items.length) {
      initialized.current = true;
      virtualizer.scrollToEnd();
    }
  }, [items.length, virtualizer]);
  return (
    <div className={transcriptStyles.transcriptShell}>
      <div
        ref={scroll}
        className={transcriptStyles.transcript}
        role="region"
        aria-label="Conversation transcript"
        aria-busy={busy}
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.scrollHeight - element.clientHeight - element.scrollTop <= 24)
            setDisclosing(false);
        }}
        onClickCapture={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(`summary, .${transcriptStyles.activitySummary}`)
          )
            setDisclosing(true);
        }}
      >
        <div
          className={transcriptStyles.virtualItems}
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((row) => {
            const item = items[row.index];
            return (
              <div
                key={row.key}
                data-index={row.index}
                data-message-id={item?.id}
                ref={virtualizer.measureElement}
                className={transcriptStyles.virtualRow}
                style={{ transform: `translateY(${row.start}px)` }}
              >
                {item ? (
                  renderItem(item)
                ) : (
                  <>
                    {!items.length && empty}
                    {footer}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {items.length > 0 && !virtualizer.isAtEnd() && (
        <div className={transcriptStyles.jumpLatest}>
          <IconButton
            label="Jump to latest"
            onClick={() => {
              setDisclosing(false);
              virtualizer.scrollToEnd();
            }}
          >
            <ArrowDown size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
