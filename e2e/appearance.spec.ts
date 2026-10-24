import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const names = ["Moss", "Ochre", "Apricot", "Coral", "Rose", "Plum", "Iris", "Denim"];

test("eight accents work in both themes, persist, and remain keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog.getByRole("radio")).toHaveCount(10);
  for (const mode of ["Light", "Dark"]) {
    await dialog.getByRole("radio", { name: mode, exact: true }).check();
    for (const name of names) {
      await dialog.getByRole("radio", { name, exact: true }).check();
      await expect(page.locator("html")).toHaveAttribute("data-accent", name.toLowerCase());
      await expect(page.locator("html")).toHaveAttribute("data-theme", mode.toLowerCase());
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations, `${mode} / ${name}`).toEqual([]);
    }
    await dialog.screenshot({
      path: `docs/proof/appearance-${mode.toLowerCase()}.png`,
      animations: "disabled",
    });
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "denim");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const denim = page.getByRole("radio", { name: "Denim", exact: true });
  await denim.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Moss", exact: true })).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: "docs/proof/appearance-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("invalid saved appearance falls back to a usable theme", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("starter-theme", "invalid");
    localStorage.setItem("starter-accent", "invalid");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "moss");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
