import filesStyles from "../styles/files.module.css";
import sharedStyles from "../styles/shared.module.css";
import { useId, useMemo, useRef, useState } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, FileCode2, Folder, FolderOpen } from "lucide-react";
import { buildFileTree, visibleFileRows, gitLabels, gitBadges } from "../file-tree";
import type { FileTreeNode } from "../file-tree";
import type { WorkspaceGitStatus } from "../../shared/workspace";

/** Virtualized ARIA tree: one tab stop, stable path identities, and collapsed initial folders. */
export function FileTree({
  paths,
  git,
  filter,
  selected,
  onFile,
  nodes,
  expandedPaths,
  onToggle,
  onAction,
}: {
  paths?: string[];
  nodes?: FileTreeNode[];
  expandedPaths?: ReadonlySet<string>;
  onToggle?: (path: string) => void;
  onAction?: (path: string) => void;
  git?: WorkspaceGitStatus;
  filter: string;
  selected?: string;
  onFile: (path: string) => void;
}) {
  const [localExpanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const expanded = expandedPaths ?? localExpanded;
  const [activePath, setActivePath] = useState<string>();
  const scroll = useRef<HTMLDivElement>(null);
  const id = useId();
  const roots = useMemo(
    () => nodes ?? buildFileTree(paths ?? [], git?.available ? git.entries : undefined),
    [nodes, paths, git],
  );
  const rows = useMemo(() => visibleFileRows(roots, expanded, filter), [roots, expanded, filter]);
  const active = Math.max(
    0,
    rows.findIndex((row) => row.node.path === activePath),
  );
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => 36,
    overscan: 8,
    getItemKey: (index) => rows[index]!.node.path,
    rangeExtractor: (range) =>
      [...new Set([...defaultRangeExtractor(range), active])]
        .filter((index) => index < rows.length)
        .sort((a, b) => a - b),
  });
  const typeahead = useRef({ value: "", time: 0 });
  function focus(index: number) {
    const row = rows[index];
    if (!row) return;
    setActivePath(row.node.path);
    virtual.scrollToIndex(index, { align: "auto" });
  }
  function toggle(path: string) {
    if (onToggle) {
      onToggle(path);
      return;
    }
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }
  function activate(index: number) {
    const row = rows[index];
    if (!row) return;
    if (row.node.action) {
      onAction?.(row.node.path);
      return;
    }
    if (row.node.folder) toggle(row.node.path);
    else if (!(row.node.code?.includes("D") && !row.node.changes.includes("conflict")))
      onFile(row.node.path);
  }
  return (
    <div
      ref={scroll}
      className={filesStyles.fileTree}
      role="tree"
      aria-label="Workspace files"
      aria-busy={rows.some((row) => row.node.action === "loading") || undefined}
      tabIndex={0}
      aria-activedescendant={rows.length ? `${id}-${active}` : undefined}
      onKeyDown={(event) => {
        const row = rows[active];
        if (!row || event.altKey || event.metaKey || event.ctrlKey) return;
        switch (event.key) {
          case "ArrowDown":
            focus(Math.min(rows.length - 1, active + 1));
            break;
          case "ArrowUp":
            focus(Math.max(0, active - 1));
            break;
          case "Home":
            focus(0);
            break;
          case "End":
            focus(rows.length - 1);
            break;
          case "ArrowRight":
            if (row.node.folder) {
              if (!row.expanded) toggle(row.node.path);
              else focus(Math.min(rows.length - 1, active + 1));
            }
            break;
          case "ArrowLeft":
            if (row.expanded && !filter) toggle(row.node.path);
            else if (row.parent) focus(rows.findIndex((item) => item.node.path === row.parent));
            break;
          case "Enter":
          case " ":
            activate(active);
            break;
          default: {
            if (event.key.length !== 1) return;
            const now = Date.now();
            const value =
              (now - typeahead.current.time < 700 ? typeahead.current.value : "") +
              event.key.toLocaleLowerCase();
            typeahead.current = { value, time: now };
            const index = rows.findIndex((_, offset) =>
              rows[(active + offset + 1) % rows.length]!.node.name.toLocaleLowerCase().startsWith(
                value,
              ),
            );
            if (index >= 0) focus((active + index + 1) % rows.length);
          }
        }
        event.preventDefault();
      }}
    >
      <div
        role="none"
        className={filesStyles.fileTreeRows}
        style={{ height: virtual.getTotalSize() }}
      >
        {virtual.getVirtualItems().map((item) => {
          const row = rows[item.index]!;
          const node = row.node;
          const change = node.changes[0];
          const description = node.changes.map((status) => gitLabels[status]).join(", ");
          const disabled =
            node.action === "loading" ||
            node.action === "empty" ||
            (!node.folder && node.code?.includes("D") && !node.changes.includes("conflict"));
          const Icon = node.folder ? (row.expanded ? FolderOpen : Folder) : FileCode2;
          return (
            <div
              key={node.path}
              id={`${id}-${item.index}`}
              role="treeitem"
              aria-level={row.depth}
              aria-posinset={row.position}
              aria-setsize={row.siblings}
              aria-expanded={node.folder ? row.expanded : undefined}
              aria-selected={selected === node.path}
              aria-description={description || undefined}
              aria-disabled={disabled || undefined}
              data-path={node.path}
              data-git-status={change}
              className={`${filesStyles.fileTreeItem} ${selected === node.path ? sharedStyles.selected : ""} ${active === item.index ? filesStyles.treeActive : ""}`}
              style={{
                transform: `translateY(${item.start}px)`,
                paddingInlineStart: 6 + (row.depth - 1) * 16,
                height: item.size,
              }}
            >
              <button
                tabIndex={-1}
                onFocus={() => setActivePath(node.path)}
                disabled={disabled || undefined}
                aria-label={
                  node.action
                    ? node.name
                    : node.folder
                      ? `${row.expanded ? "Collapse" : "Expand"} ${node.path}`
                      : `Open ${node.path}`
                }
                title={
                  node.action
                    ? node.name
                    : `${node.path}${description ? ` — ${node.folder ? "Contains: " : ""}${description}` : ""}${node.code ? ` (${node.code})` : ""}`
                }
                onClick={() => {
                  setActivePath(node.path);
                  scroll.current?.focus();
                  activate(item.index);
                }}
              >
                {node.folder ? (
                  <ChevronRight
                    size={12}
                    className={row.expanded ? filesStyles.treeChevronOpen : ""}
                    aria-hidden="true"
                  />
                ) : (
                  <span className={filesStyles.treeIconSpacer} />
                )}
                {!node.action && <Icon size={14} aria-hidden="true" />}
                <span className={filesStyles.treeName}>{node.name}</span>
              </button>
              {change && (
                <span className={filesStyles.gitBadge} aria-hidden="true">
                  {gitBadges[change]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
