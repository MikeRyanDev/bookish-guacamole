import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureUrl } from "./fixture-url";
for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    test(`model selection ${theme} ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${fixtureUrl}/composer.html?models&theme=${theme}`);
      const trigger = page.getByRole("button", { name: "Local coder", exact: true });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: "Choose model" })).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "Local coder (ollama)", exact: true }),
      ).toBeVisible();
      const name = await page.locator(".model-choice strong").first().boundingBox();
      const provider = await page.locator(".model-choice .muted").first().boundingBox();
      expect(provider!.y).toBeCloseTo(name!.y, 0);
      await page.getByRole("radio", { name: /Remote coder/ }).check();
      await expect(page.getByRole("radio", { name: /Remote coder/ })).toBeChecked();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Remote coder", exact: true })).toBeFocused();
      await page.getByRole("button", { name: "Remote coder", exact: true }).click();
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
      await expect(page.getByRole("button", { name: "Remote coder", exact: true })).toBeDisabled();
    });
  }
}

for (const width of [1440, 390]) {
  test(`composer disclosures anchor to their own controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${fixtureUrl}/composer.html?models`);
    await page.getByLabel("Fixture state").selectOption("paused");
    for (const [label, title] of [
      [/View goal/, "Session goal"],
      [/Require permissions/, "Permissions"],
      [/Local coder/, "Choose model"],
    ] as const) {
      const trigger = page.getByRole("button", { name: label });
      await trigger.click();
      const panel = page.getByRole("dialog", { name: title });
      await expect(panel).toBeVisible();
      const control = (await trigger.boundingBox())!;
      const bounds = (await panel.boundingBox())!;
      expect(bounds.y + bounds.height).toBeCloseTo(control.y - 8, 0);
      expect(bounds.x).toBeCloseTo(Math.max(12, Math.min(control.x, width - bounds.width - 12)), 0);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
  });
}
