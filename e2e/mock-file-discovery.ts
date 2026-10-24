import type { Page } from "@playwright/test";
import { buildFileTree } from "../web/src/file-tree";

/** Supplies the paginated discovery contract for viewer-only fixtures; real API coverage is separate. */
export async function mockFileDiscovery(
  page: Page,
  files: string[],
  getStatus: () => Record<string, string> = () => ({}),
) {
  await page.route("**/api/workspace/directory?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const directory = params.get("path") ?? "";
    let children = buildFileTree(files, getStatus());
    for (const segment of directory.split("/").filter(Boolean))
      children = children.find((node) => node.name === segment)?.children ?? [];
    const offset = Number(params.get("cursor") ?? 0);
    const entries = children.slice(offset, offset + 100);
    return route.fulfill({
      json: {
        entries: entries.map((node) => ({
          path: node.path,
          kind: node.folder ? "directory" : "file",
        })),
        nextCursor: offset + 100 < children.length ? String(offset + 100) : undefined,
        git: {
          available: true,
          entries: Object.fromEntries(
            entries
              .filter((node) => node.code || node.changes.length)
              .map((node) => [
                node.path,
                node.code ??
                  {
                    modified: " M",
                    added: "A ",
                    deleted: "D ",
                    untracked: "??",
                    renamed: "R ",
                    conflict: "UU",
                  }[node.changes[0]!],
              ]),
          ),
        },
      },
    });
  });
  await page.route("**/api/workspace/search?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const matches = files
      .filter((path) => path.toLowerCase().includes((params.get("q") ?? "").toLowerCase()))
      .sort();
    const offset = Number(params.get("cursor") ?? 0);
    return route.fulfill({
      json: {
        files: matches.slice(offset, offset + 100),
        nextCursor: offset + 100 < matches.length ? String(offset + 100) : undefined,
        git: { available: true, entries: getStatus() },
      },
    });
  });
}
