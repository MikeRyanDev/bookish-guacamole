import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  const virtualizer = useVirtualizer({
    count: items.length + 1,
    getScrollElement: () => scroll.current,
    estimateSize: (index) => (index === items.length ? 24 : 160),
    getItemKey: (index) =>
      index === items.length
        ? `transcript-footer:${items.at(-1)?.id ?? "empty"}`
        : `message:${items[index]!.id}`,
    anchorTo: "end",
    followOnAppend: true,
    scrollEndThreshold: 24,
    overscan: 4,
  });
  useLayoutEffect(() => {
    if (!initialized.current && items.length) {
      initialized.current = true;
      virtualizer.scrollToEnd();
    }
  }, [items.length, virtualizer]);
  return (
    <div className="transcript-shell">
      <div
        ref={scroll}
        className="transcript"
        role="region"
        aria-label="Conversation transcript"
        aria-busy={busy}
        tabIndex={0}
      >
        <div className="virtual-items" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => {
            const item = items[row.index];
            return (
              <div
                key={row.key}
                data-index={row.index}
                data-message-id={item?.id}
                ref={virtualizer.measureElement}
                className="virtual-row"
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
        <div className="jump-latest">
          <IconButton label="Jump to latest" onClick={() => virtualizer.scrollToEnd()}>
            <ArrowDown size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
