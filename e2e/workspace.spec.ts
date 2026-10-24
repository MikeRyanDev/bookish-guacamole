import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("real workspace supports files, skills, themes, commands, and new sessions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open greet.js", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open greet.js", exact: true }).click();
  await expect(page.locator(".file-preview")).toContainText("function greet");
  await page.getByRole("button", { name: "Learned skills", exact: true }).click();
  await expect(
    page.locator(".skill").or(page.getByText("No published Skills yet.")).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Command menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New session", exact: true }).first().click();
  await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile exposes both side panels without hiding the conversation forever", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle inspector", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Workspace inspector" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle inspector", exact: true }).click();
  await page.getByRole("button", { name: "Toggle sessions" }).click();
  await expect(page.getByRole("complementary", { name: "Sessions", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle sessions" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme} workspace has no WCAG AA violations`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("starter-theme", value), theme);
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
