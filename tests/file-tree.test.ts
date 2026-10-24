import { test, expect } from "vitest";
import { buildFileTree, visibleFileRows, gitChange } from "../src/client/file-tree.js";
import { parseGitStatus } from "../src/server/workspaces/git-status.js";

test("tree sorts folders first at every level, aggregates states, and retains collapsed search state", () => {
  const roots = buildFileTree(
    ["a.ts", "z/file10.ts", "z/file2.ts", "z/nested/file.ts", "folder/readme.md"],
    {
      "z/file2.ts": " M",
      "z/nested/file.ts": "A ",
      "folder/readme.md": "??",
    },
  );
  expect(roots.map((node) => node.name)).toEqual(["folder", "z", "a.ts"]);
  expect(roots[1]!.children.map((node) => node.name)).toEqual(["nested", "file2.ts", "file10.ts"]);
  expect(roots[1]!.changes).toEqual(["modified", "added"]);
  expect(visibleFileRows(roots, new Set(), "").map((row) => row.node.path)).toEqual([
    "folder",
    "z",
    "a.ts",
  ]);
  expect(visibleFileRows(roots, new Set(), "file2").map((row) => row.node.path)).toEqual([
    "z",
    "z/file2.ts",
  ]);
  expect(visibleFileRows(roots, new Set(), "")).toHaveLength(3);
});
test("rename sources, unusual names, conflict states, and subdirectory boundaries are preserved", () => {
  expect(
    parseGitStatus(
      "R  app/new name.ts\0app/old.ts\0UU app/conflict.ts\0?? app/a\nb.ts\0 M apple/outside.ts\0 M app/.private/x\0",
      "app/",
    ),
  ).toEqual({
    "new name.ts": "R ",
    "conflict.ts": "UU",
    "a\nb.ts": "??",
  });
  for (const code of ["UU", "AA", "DD", "DU", "UD"]) expect(gitChange(code)).toBe("conflict");
  expect(gitChange("AM")).toBe("modified");
  expect(gitChange("R ")).toBe("renamed");
  expect(gitChange(" D")).toBe("deleted");
});
test("a deleted tracked file replaced by a directory remains expandable", () => {
  const roots = buildFileTree(["item", "item/child.ts"], { item: " D", "item/child.ts": "??" });
  expect(roots[0]!.folder).toBe(true);
  expect(visibleFileRows(roots, new Set(["item"]), "").map((row) => row.node.path)).toEqual([
    "item",
    "item/child.ts",
  ]);
});

test("filenames matching Object prototype keys remain ordinary files", () => {
  const roots = buildFileTree(["__proto__", "constructor", "toString"], {});
  expect(roots).toHaveLength(3);
  expect(roots.every((node) => node.changes.length === 0)).toBe(true);
});
