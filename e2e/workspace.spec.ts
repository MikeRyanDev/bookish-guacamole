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
  await page.locator(".inspector").getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.getByLabel("Learning space", { exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Toggle files", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Workspace inspector" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle files", exact: true }).click();
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
    await page.locator(".inspector").evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`header Learning and Files labels fit their controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const header = page.locator(".workspace-header");
    for (const name of ["Learning", "Toggle files"]) {
      const button = header.getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
      const fits = await button.evaluate((element) => {
        const control = element.getBoundingClientRect();
        const label = element.querySelector("span")!.getBoundingClientRect();
        return label.left >= control.left && label.right <= control.right;
      });
      expect(fits, `${name} label must stay inside its hit target`).toBe(true);
    }
    await header.getByRole("button", { name: "Learning", exact: true }).click();
    await expect(page.getByLabel("Learning space", { exact: true })).toBeVisible();
    await header.getByRole("button", { name: "Toggle files", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open greet.js", exact: true })).toBeVisible();
  });
}
