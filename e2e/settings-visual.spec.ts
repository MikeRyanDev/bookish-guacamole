import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
for (const theme of ["Light", "Dark"])
  for (const width of [1440, 390])
    test(`settings categories ${theme} ${width}`, async ({ page }, testInfo) => {
      await page.route("**/api/defaults?*", (route) =>
        route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
      );
      await page.route("**/api/permissions?*", (route) =>
        route.fulfill({
          json: [
            {
              tool: "bash",
              resource: "pnpm test --filter packages/a-very-long-workspace-name",
              decision: "allow",
            },
          ],
        }),
      );
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${fixture}/settings.html`);
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("radio", { name: theme, exact: true }).check();
      for (const category of ["Appearance", "Models", "Permissions"]) {
        await page.getByRole("tab", { name: category, exact: true }).click();
        await page.getByRole("tab", { name: category, exact: true }).hover();
        expect(
          (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
            .violations,
        ).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`${category}-${theme}-${width}.png`) });
      }
      await page.getByRole("tab", { name: "Appearance", exact: true }).click();
      await page.getByRole("button", { name: "Add color", exact: true }).click();
      await page.getByLabel("Color format", { exact: true }).selectOption("RGBA");
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`Color-${theme}-${width}.png`) });
      await page.getByRole("textbox", { name: "R", exact: true }).fill("999");
      await page.screenshot({ path: testInfo.outputPath(`Invalid-${theme}-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
