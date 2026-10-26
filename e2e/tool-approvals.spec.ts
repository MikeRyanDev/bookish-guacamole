import { fixtureUrl } from "./fixture-url";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const kind of ["bash", "patch"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${theme} ${kind} approval shares the tool preview and safely retries a failed decision`, async ({
      page,
    }, testInfo) => {
      await page.goto(`${fixtureUrl}/?approval=${kind}&fail`);
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      const permission = page.getByRole("region", { name: "Permission request" });
      await expect(permission.locator(".starter-tools-tool-call")).toBeVisible();
      await expect(permission).toContainText("Approval required");
      if (kind === "bash")
        await expect(permission.locator(".starter-tools-shell-command")).toContainText(
          "npm test -- --runInBand",
        );
      else {
        await expect(permission.getByLabel("Proposed patch")).toContainText("+return name.trim();");
        await expect(permission.getByLabel("1 lines added, 1 lines removed")).toBeVisible();
      }
      await permission.screenshot({
        path: testInfo.outputPath(`approval-${kind}-${theme}.png`),
        animations: "disabled",
      });
      await permission.getByRole("button", { name: "Approve Once", exact: true }).click();
      await expect(permission.getByRole("button", { name: "Reject", exact: true })).toBeDisabled();
      await expect(permission.getByRole("alert")).toContainText("Try again");
      await permission.getByRole("button", { name: "Reject", exact: true }).click();
      await expect(page.getByLabel("Decision")).toHaveText("reject");
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    });
  }
}

test("patch approval stays readable and keyboard operable on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixtureUrl}/?approval=patch`);
  const permission = page.getByRole("region", { name: "Permission request" });
  await expect(permission.getByLabel("Proposed patch")).toContainText("name.trim()");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("approval-patch-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await permission.getByRole("button", { name: "Approve Once" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Decision")).toHaveText("once");
});
