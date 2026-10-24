import { useEffect, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { type AppConfig, directoryQuery, searchFilesQuery } from "../api";
import { buildFileTree, gitChange, type FileTreeNode } from "../file-tree";
import { FileTree } from "./file-tree";

type Pages = Record<string, (string | undefined)[]>;
const initialPages: Pages = { "": [undefined] };

/** Query owns server pages; React owns expansion and explicit page requests, never copied file data. */
export function WorkspaceFileBrowser({
  config,
  filter,
  selected,
  onFile,
}: {
  config: AppConfig;
  filter: string;
  selected?: string;
  onFile: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [pages, setPages] = useState<Pages>(initialPages);
  const [settledSearch, setSearch] = useState(filter);
  const search = filter ? settledSearch : "";
  // Debounce the network request; changing the Query key cancels obsolete reads.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filter), 200);
    return () => clearTimeout(timer);
  }, [filter]);
  const requests = Object.entries(pages)
    .filter(
      ([path]) =>
        !search &&
        (!path ||
          path
            .split("/")
            .every((_, index, parts) => expanded.has(parts.slice(0, index + 1).join("/")))),
    )
    .flatMap(([path, cursors]) => {
      // Refreshed pages can move the next boundary. Discard stale descendants of that cursor.
      const valid: { path: string; cursor: string | undefined; page: number }[] = [];
      for (const [index, cursor] of cursors.entries()) {
        if (
          index > 0 &&
          queryClient.getQueryData(
            directoryQuery(config.token, config.workspaceId, path, cursors[index - 1]).queryKey,
          )?.nextCursor !== cursor
        )
          break;
        valid.push({ path, cursor, page: index });
      }
      return valid;
    });
  const results = useQueries({
    queries: requests.map(({ path, cursor }) =>
      directoryQuery(config.token, config.workspaceId, path, cursor),
    ),
  });
  const nodes = new Map<string, FileTreeNode>();
  const roots: FileTreeNode[] = [];
  const actions = new Map<string, () => void>();
  let unavailable = false;
  function action(
    parent: string,
    kind: NonNullable<FileTreeNode["action"]>,
    label: string,
    run?: () => void,
  ): FileTreeNode {
    const path = `${parent}/\0${kind}`;
    if (run) actions.set(path, run);
    return { path, name: label, folder: false, children: [], changes: [], action: kind };
  }
  // Parents can arrive after descendants on a refresh; assemble nodes before connecting children.
  requests.forEach((request, index) => {
    const data = results[index]?.data;
    if (data?.git?.available === false) unavailable = true;
    for (const entry of data?.entries ?? []) {
      const code = data?.git?.entries[entry.path];
      const changes = [
        ...new Set(
          [code, ...(data?.git?.directories?.[entry.path] ?? [])]
            .map(gitChange)
            .filter((value) => value !== undefined),
        ),
      ];
      nodes.set(entry.path, {
        path: entry.path,
        name: entry.path.split("/").at(-1)!,
        folder: entry.kind === "directory",
        children: [],
        code,
        changes,
      });
    }
    const last = requests[index + 1]?.path !== request.path;
    if (!last) return;
    const result = results[index]!;
    const label = request.path || "workspace";
    let control: FileTreeNode | undefined;
    if (result.isPending) control = action(request.path, "loading", `Loading ${label}…`);
    else if (result.isError)
      control = action(request.path, "error", `Retry ${label}`, () => {
        void result.refetch();
      });
    else if (data?.nextCursor)
      control = action(request.path, "more", `Load more in ${label}`, () => {
        setPages((previous) => ({
          ...previous,
          [request.path]: [
            ...(previous[request.path] ?? [undefined]).slice(0, request.page + 1),
            data.nextCursor,
          ],
        }));
      });
    else if (request.cursor === undefined && data?.entries.length === 0)
      control = action(
        request.path,
        "empty",
        request.path ? "No files in this folder." : "No files yet.",
      );
    if (control) nodes.set(control.path, control);
  });
  for (const node of nodes.values()) {
    const parent = node.path.slice(0, node.path.lastIndexOf("/"));
    if (!parent || !node.path.includes("/")) roots.push(node);
    else nodes.get(parent)?.children.push(node);
  }
  const sort = (list: FileTreeNode[]) =>
    list.sort(
      (a, b) =>
        Number(Boolean(a.action)) - Number(Boolean(b.action)) ||
        Number(b.folder) - Number(a.folder) ||
        (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
    );
  sort(roots);
  for (const node of nodes.values()) sort(node.children);
  function toggle(path: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    setPages((previous) => (previous[path] ? previous : { ...previous, [path]: [undefined] }));
  }
  return (
    <>
      {filter !== search && (
        <p role="status" className="muted">
          Searching…
        </p>
      )}
      {search ? (
        <FileSearch
          key={search}
          config={config}
          query={search}
          selected={selected}
          onFile={onFile}
        />
      ) : (
        <>
          <FileTree
            nodes={roots}
            filter=""
            expandedPaths={expanded}
            onToggle={toggle}
            onAction={(path) => actions.get(path)?.()}
            selected={selected}
            onFile={onFile}
          />
          {results.some((result) => result.isError) && (
            <p role="alert" className="muted">
              Could not load files. Retry the affected folder.
            </p>
          )}
          {unavailable && (
            <p role="status" className="muted">
              Git status unavailable. Refresh to retry.
            </p>
          )}
        </>
      )}
    </>
  );
}

/** Server search remains independent of loaded directories and restores the browsing tree on clear. */
function FileSearch({
  config,
  query,
  selected,
  onFile,
}: {
  config: AppConfig;
  query: string;
  selected?: string;
  onFile: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const validCursors = cursors.filter(
    (cursor, index) =>
      index === 0 ||
      cursors
        .slice(1, index + 1)
        .every(
          (value, offset) =>
            queryClient.getQueryData(
              searchFilesQuery(config.token, config.workspaceId, query, cursors[offset]).queryKey,
            )?.nextCursor === value,
        ),
  );
  const results = useQueries({
    queries: validCursors.map((cursor) =>
      searchFilesQuery(config.token, config.workspaceId, query, cursor),
    ),
  });
  const last = results.at(-1)!;
  const files = [...new Set(results.flatMap((result) => result.data?.files ?? []))];
  const statuses = Object.assign({}, ...results.map((result) => result.data?.git?.entries ?? {}));
  const roots = buildFileTree(files, statuses);
  return (
    <>
      {files.length > 0 && (
        <FileTree nodes={roots} filter={query} selected={selected} onFile={onFile} />
      )}
      {last.isPending && (
        <p role="status" className="muted">
          Searching…
        </p>
      )}
      {last.isError && (
        <div role="alert">
          <p>Could not search files.</p>
          <button onClick={() => void last.refetch()}>Retry search</button>
        </div>
      )}
      {!last.isPending && !last.isError && files.length === 0 && (
        <p className="muted">No files match “{query}”.</p>
      )}
      {last.data?.nextCursor && (
        <button
          disabled={last.isFetching}
          onClick={() =>
            setCursors((previous) => [
              ...previous.slice(0, validCursors.length),
              last.data!.nextCursor,
            ])
          }
        >
          Load more results
        </button>
      )}
      {results.some((result) => result.data?.git?.available === false) && (
        <p role="status" className="muted">
          Git status unavailable. Refresh to retry.
        </p>
      )}
    </>
  );
}
