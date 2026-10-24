import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureUrl } from "./fixture-url";
for (const theme of ["light", "dark"])
  for (const width of [1440, 390]) {
    test(`permission tasks ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${fixtureUrl}/permissions.html?theme=${theme}`);
      await page.getByRole("button", { name: "Approval mode: Allow file edits" }).click();
      await page.getByRole("radio", { name: /YOLO/ }).check();
      await expect(page.getByRole("button", { name: "Approval mode: YOLO" })).toBeVisible();
      await expect(
        page.getByText("Run tools without approval. Ignore permission rules."),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Remember this permission" }).click();
      await expect(
        page.getByText("All conversations in this workspace can use this permission."),
      ).toBeVisible();
      await page.getByRole("button", { name: "Save and allow" }).click();
      await expect(page.getByText("Decision: always")).toBeVisible();
      await page.getByRole("button", { name: "Workspace permissions", exact: true }).click();
      await page.getByRole("button", { name: "Remove permission for bash pnpm test" }).click();
      await expect(page.getByText("No saved permissions.")).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
test("permission errors preserve decisions and mode; double clicks submit once", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/permissions.html?fail`);
  await page.getByRole("button", { name: "Allow once" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not submit");
  await expect(page.getByRole("button", { name: "Allow once" })).toBeEnabled();
  await page.getByRole("button", { name: "Approval mode: Allow file edits" }).click();
  await page.getByRole("radio", { name: /YOLO/ }).click();
  await expect(page.getByText("Could not change mode. Try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approval mode: Allow file edits" })).toBeVisible();
  await page.goto(`${fixtureUrl}/permissions.html?slow`);
  await page.getByRole("button", { name: "Allow once" }).dblclick();
  await expect(page.getByText("Submissions: 1")).toBeVisible();
});

test("scope confirmation keeps keyboard focus and cancel preserves the pending decision", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/permissions.html`);
  const remember = page.getByRole("button", { name: "Remember this permission" });
  await remember.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Save and allow" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(remember).toBeFocused();
  await expect(page.getByText("Submissions: 0")).toBeVisible();
});
