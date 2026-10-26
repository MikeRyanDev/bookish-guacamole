import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
for (const theme of ["light", "dark"])
  for (const width of [1440, 390, 320]) {
    test(`capability surfaces remain accessible at ${width} in ${theme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const capture = async (name: string) => {
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(scan.violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: testInfo.outputPath(`${name}-${theme}-${width}.png`),
          animations: "disabled",
          fullPage: true,
        });
      };
      await page.goto(`${fixture}/settings.html?review=1`);
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
        localStorage.setItem("starter.theme", value);
      }, theme);
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("tab", { name: "Execution", exact: true }).click();
      await expect(page.getByText("Conversation limits", { exact: true })).toBeVisible();
      await capture("execution");
      await page.getByText("Model limits and prices", { exact: true }).click();
      await page.getByLabel("Set prices for First model", { exact: true }).check();
      await page
        .getByLabel("Input price for First model", { exact: true })
        .scrollIntoViewIfNeeded();
      await capture("model-prices");
      await page.getByRole("tab", { name: "Connections", exact: true }).click();
      await page.getByRole("button", { name: "Try local guide", exact: true }).click();
      await expect(page.getByText("Connected · 1 tool", { exact: true })).toBeVisible();
      await capture("connections");
      await page.getByRole("button", { name: "Add connection", exact: true }).click();
      await page.getByLabel("Connection name", { exact: true }).fill("documentation");
      await capture("connection-form");
      await page.goto(`${fixture}/capabilities.html?review=1`);
      await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
      await page.getByRole("button", { name: "Usage", exact: true }).click();
      await expect(page.getByText("12,450", { exact: false }).first()).toBeVisible();
      await capture("usage");
      await page.getByRole("button", { name: "Close conversation usage", exact: true }).click();
      await page.getByRole("button", { name: "Undo last turn", exact: true }).click();
      await expect(page.getByRole("button", { name: "Undo turn", exact: true })).toBeEnabled();
      await capture("undo");
    });
  }
