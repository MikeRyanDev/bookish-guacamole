import { expect, test } from "@playwright/test";

test("a developer can create, switch, rename, and remove named workspaces", async ({ page }) => {
  const name = `Browser workspace ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("button", { name: "Change workspace" }).click();
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await page.getByRole("textbox", { name: "Workspace name" }).fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/workspace=/);
  await expect(page.getByRole("button", { name: "Change workspace" })).toContainText(name);
  await expect(page.getByRole("heading", { name: "New session", exact: true })).toBeVisible();
  await expect(page.getByText("No files yet.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Change workspace" })).toContainText(name);
  await page.getByRole("button", { name: "Change workspace" }).click();
  await page.getByRole("button", { name: `Rename ${name}`, exact: true }).click();
  await page.getByRole("textbox", { name: "Workspace name" }).fill(`${name} renamed`);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(
    page.getByRole("button", { name: `Open ${name} renamed`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Remove ${name} renamed`, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Files and saved conversations stay on disk",
  );
  await page.getByRole("button", { name: "Remove from list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Change workspace" })).not.toContainText(name);
});
