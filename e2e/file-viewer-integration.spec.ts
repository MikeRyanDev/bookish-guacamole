import { expect, test } from "@playwright/test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { officeFixture } from "../tests/fixtures/office";

test("real workspace file reads preserve URL navigation, refresh, and asset isolation", async ({
  page,
  request,
}) => {
  const origin = process.env.FILE_VIEWER_APP_URL ?? "http://127.0.0.1:4173";
  const root = await mkdtemp(join(tmpdir(), "viewer-browser-"));
  const config = await (await request.get(`${origin}/api/config`)).json();
  const headers = { authorization: `Bearer ${config.token}` };
  let id: string | undefined;
  try {
    await mkdir(join(root, "src"));
    await writeFile(
      join(root, "src", "greet.ts"),
      "export function greet(name: string) {\n  return `Hello ${name}`;\n}\n",
    );
    await writeFile(join(root, "README.md"), "# Viewer integration\n\nA real local file.");
    await writeFile(join(root, "document.docx"), officeFixture("document"));
    await writeFile(
      join(root, "image.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#c88073"/></svg>',
    );
    const created = await request.post(`${origin}/api/workspaces`, {
      headers,
      data: { name: "File viewer proof", mode: "open", path: root },
    });
    expect(created.ok()).toBe(true);
    id = (await created.json()).id;
    await page.goto(`${origin}/?workspace=${id}&file=src%2Fgreet.ts`);
    await expect(page.getByRole("region", { name: "File contents" })).toContainText(
      "export function greet",
    );
    await page.getByRole("button", { name: "Back to files" }).click();
    await page.getByRole("button", { name: "Open README.md", exact: true }).click();
    await expect(page).toHaveURL(/file=README/);
    await page.goBack();
    await expect(page.getByRole("textbox", { name: "Search files" })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText(
      "Viewer integration",
    );
    await page.reload();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText(
      "Viewer integration",
    );
    await writeFile(join(root, "README.md"), "# Updated content");
    await page.getByRole("button", { name: "Refresh inspector" }).click();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText(
      "Updated content",
    );
    await page.getByRole("button", { name: "Expand file viewer" }).click();
    await expect(page.getByRole("navigation", { name: "Workspace files" })).toBeVisible();
    await page.getByRole("button", { name: "Open document.docx", exact: true }).click();
    await expect(page.getByText("Quarterly report & review", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Open image.svg", exact: true }).click();
    await expect(page.getByRole("img", { name: "image.svg" })).toBeVisible();
    await page.getByRole("button", { name: "Toggle files" }).click();
    await expect(page.locator(".starter-workspace-main-pane")).toBeVisible();
    await page.getByRole("button", { name: "Toggle files" }).click();
    await expect(page.getByRole("img", { name: "image.svg" })).toBeVisible();
    const other = await request.get(
      `${origin}/api/workspace/asset?workspace=default&path=document.docx`,
      { headers },
    );
    expect(other.ok()).toBe(false);
    await page.mouse.move(0, 0);
    await expect(page.locator(".starter-files-inspector")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: "docs/proof/file-viewer-workspace.png", animations: "disabled" });
  } finally {
    if (id) await request.delete(`${origin}/api/workspaces/${id}`, { headers });
    await rm(root, { recursive: true, force: true });
  }
});
