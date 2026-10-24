import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";

/** Virtualizes SDK-owned sessions and requests one page when the visible range reaches its end.
 * The caller owns request errors and loading state; errors suspend automatic pagination until retry.
 */
export function ThreadHistory<T extends { id: string }>({
  items,
  filter,
  renderItem,
  loading,
  error,
  hasMore,
  fetchingMore,
  fetchMoreError,
  fetchMore,
  retry,
}: {
  items: readonly T[];
  filter: string;
  renderItem: (item: T) => ReactNode;
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  fetchingMore: boolean;
  fetchMoreError: unknown;
  fetchMore: () => void;
  retry: () => void;
}) {
  const scroll = useRef<HTMLElement>(null);
  const [focusedId, setFocusedId] = useState<string>();
  const focusedIndex = items.findIndex((item) => item.id === focusedId);
  const virtualizer = useVirtualizer({
    count: items.length + 1,
    getScrollElement: () => scroll.current,
    estimateSize: () => 40,
    getItemKey: (index) => items[index]?.id ?? "thread-history-footer",
    overscan: 4,
    rangeExtractor: (range) => {
      const indices = defaultRangeExtractor(range);
      // Keep a focused link mounted even when the pointer scrolls it out of view.
      return focusedIndex < 0 || indices.includes(focusedIndex)
        ? indices
        : [...indices, focusedIndex].sort((a, b) => a - b);
    },
  });
  useLayoutEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [filter, virtualizer]);
  const endIndex = virtualizer.range?.endIndex;
  useEffect(() => {
    if (
      endIndex !== undefined &&
      endIndex >= items.length - 4 &&
      hasMore &&
      !loading &&
      !error &&
      !fetchingMore &&
      !fetchMoreError
    ) {
      fetchMore();
    }
  }, [endIndex, items.length, hasMore, loading, error, fetchingMore, fetchMoreError, fetchMore]);
  return (
    <nav ref={scroll} aria-label="Conversation history" tabIndex={0}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index];
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
              }}
              onFocusCapture={() => setFocusedId(item?.id)}
              onBlurCapture={() => setFocusedId(undefined)}
            >
              {item ? (
                renderItem(item)
              ) : (
                <>
                  {(loading || fetchingMore) && (
                    <p className="muted" role="status">
                      Loading sessions…
                    </p>
                  )}
                  {error ? (
                    <div className="inline-error">
                      <p role="alert">Could not load sessions.</p>
                      <button onClick={retry}>Retry</button>
                    </div>
                  ) : fetchMoreError ? (
                    <div className="inline-error">
                      <p role="alert">Could not load more sessions.</p>
                      <button disabled={fetchingMore} onClick={fetchMore}>
                        Retry
                      </button>
                    </div>
                  ) : !loading && !hasMore && items.length === 0 ? (
                    <p className="muted">{filter ? "No matching sessions." : "No sessions yet."}</p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
