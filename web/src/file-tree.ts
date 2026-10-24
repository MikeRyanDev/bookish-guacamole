export type GitChange = "conflict" | "deleted" | "modified" | "renamed" | "added" | "untracked";
export const gitLabels: Record<GitChange, string> = {
  conflict: "Conflicted",
  deleted: "Deleted",
  modified: "Modified",
  renamed: "Renamed",
  added: "Added",
  untracked: "Untracked",
};
export const gitBadges: Record<GitChange, string> = {
  conflict: "!",
  deleted: "D",
  modified: "M",
  renamed: "R",
  added: "A",
  untracked: "U",
};
const priority: GitChange[] = ["conflict", "deleted", "modified", "renamed", "added", "untracked"];
/** Combines index and worktree status without treating an unresolved merge as a deletion. */
export function gitChange(code?: string): GitChange | undefined {
  if (!code) return;
  if (code.includes("U") || ["AA", "DD"].includes(code)) return "conflict";
  if (code === "??") return "untracked";
  if (code.includes("D")) return "deleted";
  if (/[MT]/.test(code)) return "modified";
  if (/[RC]/.test(code)) return "renamed";
  if (code.includes("A")) return "added";
}
export interface FileTreeNode {
  path: string;
  name: string;
  folder: boolean;
  children: FileTreeNode[];
  changes: GitChange[];
  code?: string;
  action?: "more" | "loading" | "error" | "empty";
}
export interface FileTreeRow {
  node: FileTreeNode;
  depth: number;
  parent?: string;
  expanded: boolean;
  position: number;
  siblings: number;
}
/** Builds actual ancestry once, sorts each sibling group folder-first, and aggregates Git states. */
export function buildFileTree(
  paths: string[],
  statuses: Record<string, string> = {},
): FileTreeNode[] {
  const root: FileTreeNode = { path: "", name: "", folder: true, children: [], changes: [] };
  const nodes = new Map<string, FileTreeNode>([["", root]]);
  for (const path of paths) {
    const parts = path.split("/");
    let parent = root;
    parts.forEach((name, index) => {
      const key = parts.slice(0, index + 1).join("/");
      let node = nodes.get(key);
      if (!node) {
        const folder = index < parts.length - 1;
        const code = !folder && Object.hasOwn(statuses, path) ? statuses[path] : undefined;
        const change = gitChange(code);
        node = { path: key, name, folder, children: [], code, changes: change ? [change] : [] };
        nodes.set(key, node);
        parent.children.push(node);
      }
      if (index < parts.length - 1) node.folder = true;
      parent = node;
    });
  }
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  // Children are inserted after parents; reverse traversal aggregates bottom-up without recursion.
  for (const node of [...nodes.values()].reverse()) {
    if (!node.folder) continue;
    node.children.sort(
      (a, b) =>
        Number(b.folder) - Number(a.folder) ||
        collator.compare(a.name, b.name) ||
        a.name.localeCompare(b.name),
    );
    const changes = new Set([...node.changes, ...node.children.flatMap((child) => child.changes)]);
    node.changes = priority.filter((change) => changes.has(change));
  }
  return root.children;
}
/** Filters keep matching ancestry visible without changing the user's expansion choices. */
export function visibleFileRows(
  roots: FileTreeNode[],
  expanded: ReadonlySet<string>,
  filter: string,
): FileTreeRow[] {
  const query = filter.toLocaleLowerCase();
  const matches = new Set<string>();
  if (query) {
    const pending = [...roots];
    while (pending.length) {
      const node = pending.pop()!;
      pending.push(...node.children);
      if (!node.path.toLocaleLowerCase().includes(query)) continue;
      const parts = node.path.split("/");
      parts.forEach((_, index) => matches.add(parts.slice(0, index + 1).join("/")));
    }
  }
  const rows: FileTreeRow[] = [];
  const append = (nodes: FileTreeNode[], depth: number, parent?: string) => {
    const siblings = query ? nodes.filter((node) => matches.has(node.path)) : nodes;
    siblings.forEach((node, index) => {
      const open = node.folder && (Boolean(query) || expanded.has(node.path));
      rows.push({
        node,
        depth,
        parent,
        expanded: open,
        position: index + 1,
        siblings: siblings.length,
      });
      if (open) append(node.children, depth + 1, node.path);
    });
  };
  append(roots, 1);
  return rows;
}
