import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureUrl } from "./fixture-url";
for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    test(`model selection ${theme} ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${fixtureUrl}/composer.html?models&theme=${theme}`);
      const trigger = page.getByRole("button", { name: "Model: Local coder" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: "Choose model" })).toBeVisible();
      await page.getByRole("radio", { name: /Remote coder/ }).check();
      await expect(page.getByRole("radio", { name: /Remote coder/ })).toBeChecked();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Model: Remote coder" })).toBeFocused();
      await page.getByRole("button", { name: "Model: Remote coder" }).click();
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath("models.png") });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.keyboard.press("Escape");
      await page.getByLabel("Fixture state").selectOption("active");
      await expect(page.getByRole("button", { name: "Model: Remote coder" })).toBeDisabled();
    });
  }
}
