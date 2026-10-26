import { fixtureUrl } from "./fixture-url";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("coding tools show commands, honest exit status, readable diffs, and numbered file content", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?tools`);
  await expect(page.locator(".starter-tools-shell-command code")).toBeVisible();
  await expect(page.getByText("Exit 1", { exact: true })).toBeVisible();
  const patch = page.getByRole("region", { name: "patch tool call" });
  await patch.locator("summary.starter-tools-tool-header").click();
  await expect(patch.locator(".starter-tools-diff-line.starter-tools-removed")).toHaveText(
    "-return `Hello, ${name}`;",
  );
  await expect(patch.locator(".starter-tools-diff-line.starter-tools-added")).toHaveText(
    "+return `Hello, ${name.trim()}`;",
  );
  const read = page.getByRole("region", { name: "read_file tool call" });
  await read.locator("summary.starter-tools-tool-header").click();
  await expect(read.locator(".starter-tools-tool-surface-heading code")).toHaveText("src/greet.ts");
  await expect(read.locator(".starter-shared-line-number").first()).toHaveText("10");
  await expect(read.locator(".starter-tools-code-line").first()).toContainText(
    "export function greet(name)",
  );
  const program = page.getByRole("region", { name: "execute_typescript tool call" });
  await program.locator("summary.starter-tools-tool-header").click();
  await expect(program.locator(".starter-tools-tool-surface-heading").first()).toContainText(
    "TypeScript",
  );
  await expect(program.locator(".starter-tools-tool-surface")).toContainText(
    'external_read_file({ path: "notes.txt" })',
  );
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
