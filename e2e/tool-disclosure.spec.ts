import { expect, test } from "@playwright/test";

test("tool activity can collapse without hiding status and copy preserves the command", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("http://127.0.0.1:4174/?tools");
  const tool = page.getByRole("region", { name: "bash tool call" });
  await expect(tool.getByText("Exit 1", { exact: true })).toBeVisible();
  await tool.getByRole("button", { name: "Copy command", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm test -- --runInBand");
  await tool.locator("summary.tool-header").click();
  await expect(tool.locator(".shell-command")).toBeHidden();
  await expect(tool.getByText("Exit 1", { exact: true })).toBeVisible();
  await tool.locator("summary.tool-header").focus();
  await page.keyboard.press("Enter");
  await expect(tool.locator(".shell-command")).toBeVisible();
  await tool.getByText("Raw details", { exact: true }).click();
  await expect(tool.locator(".tool-arguments pre")).toContainText(
    '"command":"npm test -- --runInBand"',
  );
});

test("streaming, missing results, and unknown-tool failures stay honest", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/?states");
  const running = page.getByRole("region", { name: "bash tool call" });
  await expect(running.getByText("Running", { exact: true })).toBeVisible();
  await expect(running.locator(".tool-arguments pre")).toHaveText('{"command":"npm');
  await expect(
    page
      .getByRole("region", { name: "read_file tool call" })
      .getByText("No result", { exact: true }),
  ).toBeVisible();
  const failed = page.getByRole("region", { name: "custom_tool tool call" });
  await expect(failed.getByText("Error", { exact: true })).toBeVisible();
  await expect(failed.locator(".tool-output")).toHaveText("Error: <script>unexpected</script>");
  expect(await failed.locator("script, img").count()).toBe(0);
});

test("copy failure reports the problem without claiming success", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/?tools");
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("denied")),
    }),
  );
  const tool = page.getByRole("region", { name: "bash tool call" });
  await tool.getByRole("button", { name: "Copy command", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Copy failed");
  await expect(tool.getByRole("button", { name: "Copy command", exact: true })).toBeVisible();
});

test("copy confirmation does not survive a changed streaming payload", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("http://127.0.0.1:4174/?streamcopy");
  await page.getByRole("button", { name: "Copy command", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Complete arguments", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy command", exact: true })).toBeVisible();
});
