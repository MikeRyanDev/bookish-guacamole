import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

test("mobile file entry remains visible and pointer-accessible beside the development Inspector", async ({
  page,
  request,
}) => {
  const origin = process.env.FILE_VIEWER_APP_URL ?? "http://127.0.0.1:4173";
  const config = await (await request.get(`${origin}/api/config`)).json();
  const headers = { authorization: `Bearer ${config.token}` };
  const response = await request.post(`${origin}/api/workspaces`, {
    headers,
    data: { name: "File navigation review", mode: "create" },
  });
  expect(response.ok()).toBe(true);
  const workspace = await response.json();
  await writeFile(join(workspace.path, "greet.js"), "export function greet() { return 'hello'; }");
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/?workspace=${workspace.id}`);
    await expect(page.getByRole("button", { name: "Web Inspector", exact: true })).toBeVisible();
    const toggle = page.getByRole("button", { name: "Toggle files", exact: true });
    await expect
      .poll(() =>
        toggle.evaluate((button) => {
          const box = button.getBoundingClientRect();
          return button.contains(
            document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
          );
        }),
      )
      .toBe(true);
    await expect(toggle).toHaveText("Files");
    await page.getByRole("button", { name: "Use project overview prompt", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Message your coding agent", exact: true }),
    ).toHaveValue("Read the project instructions and explain the current code and tests.");
    await toggle.click();
    await expect(page.getByRole("textbox", { name: "Search files", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Search files", exact: true }).fill("greet.js");
    await page.getByRole("button", { name: "Open greet.js", exact: true }).click();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText(
      "function greet",
    );
    await page.getByRole("button", { name: "Back to files", exact: true }).click();
    await page.getByRole("button", { name: "Clear file search", exact: true }).click();
    await page.locator(".inspector").getByRole("button", { name: "Learning", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.getByRole("textbox", { name: "Search files", exact: true })).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(
      page.getByRole("textbox", { name: "Message your coding agent", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await request.delete(`${origin}/api/workspaces/${workspace.id}`, { headers });
  }
});
