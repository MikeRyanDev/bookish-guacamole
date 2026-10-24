import AxeBuilder from "@axe-core/playwright";
import { ACCENTS } from "../src/client/appearance";
import { expect, test } from "@playwright/test";
import { fixtureUrl } from "./fixture-url";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`tool reveal is user-triggered and respects ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`${fixtureUrl}/?activity`);
    const group = page.getByRole("button", { name: /8 tool calls/ });
    await group.click();
    const body = page.locator(".activity-calls");
    const animations = await body.evaluate((el) => el.getAnimations().length);
    expect(animations).toBe(reducedMotion === "reduce" ? 0 : 1);
    await page.waitForTimeout(250);
    const command = page.getByRole("region", { name: "bash tool call" });
    await command.locator(".tool-header").click();
    await expect(command.locator(".shell-command")).toBeVisible();
    await page.waitForTimeout(250);
    await group.click();
    await group.click();
    // Restored nested disclosures must not replay their own entrance.
    expect(await command.locator(".tool-body").evaluate((el) => el.getAnimations().length)).toBe(0);
  });
}

test("approval emphasis stays accessible across every accent and theme", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${fixtureUrl}/?approval=patch`);
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"] as const) {
    for (const accent of ACCENTS) {
      await page.evaluate(
        ({ theme, color }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.setProperty("--accent", color);
        },
        { theme, color: accent[theme] },
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations, `${theme} / ${accent.name}`).toEqual([]);
    }
  }
});

test("tool previews load the design system fonts", async ({ page }) => {
  await page.goto(`${fixtureUrl}/?tools`);
  const fonts = await page.evaluate(async () => {
    const [body, source] = await Promise.all([
      document.fonts.load('550 12px "Manrope Variable"'),
      document.fonts.load('400 12px "IBM Plex Mono"'),
    ]);
    return [body.length, source.length];
  });
  expect(fonts.every((count) => count > 0)).toBe(true);
});
