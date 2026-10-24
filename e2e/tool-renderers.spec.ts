import { fixtureUrl } from "./fixture-url";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("coding tools show commands, honest exit status, readable diffs, and numbered file content", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?tools`);
  await expect(page.getByText("npm test -- --runInBand", { exact: true })).toBeVisible();
  await expect(page.getByText("Exit 1", { exact: true })).toBeVisible();
  const patch = page.getByRole("region", { name: "patch tool call" });
  await expect(patch.locator(".diff-line.removed")).toHaveText("-return `Hello, ${name}`;");
  await expect(patch.locator(".diff-line.added")).toHaveText("+return `Hello, ${name.trim()}`;");
  const read = page.getByRole("region", { name: "read_file tool call" });
  await read.locator("summary.tool-header").click();
  await expect(read.locator(".tool-surface-heading code")).toHaveText("src/greet.ts");
  await expect(read.locator(".line-number").first()).toHaveText("10");
  await expect(read.locator(".code-line").first()).toContainText("export function greet(name)");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: `docs/proof/tool-cards-${theme}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
