import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureUrl } from "./fixture-url";
for (const theme of ["light", "dark"])
  for (const width of [1440, 390]) {
    test(`permission tasks ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${fixtureUrl}/permissions.html?theme=${theme}`);
      await page.getByRole("button", { name: "Require permissions" }).click();
      await page.getByRole("radio", { name: /YOLO/ }).check();
      await expect(page.getByRole("button", { name: "YOLO" })).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "Permissions", exact: true }).locator("p"),
      ).toHaveCount(0);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Always Approve" }).click();
      await expect(page.getByText("Allow in all workspace conversations:")).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByRole("button", { name: "Approve and Save" }).click();
      await expect(page.getByRole("textbox")).toBeFocused();
      await expect(page.getByText("Decision: always")).toBeVisible();
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("button", { name: "Remove permission for bash pnpm test" }).click();
      await expect(page.getByText("No saved rules.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh permissions" })).toBeFocused();
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
  await page.getByRole("button", { name: "Approve Once" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not submit");
  await expect(page.getByRole("button", { name: "Approve Once" })).toBeEnabled();
  await page.getByRole("button", { name: "Require permissions" }).click();
  await page.getByRole("radio", { name: /YOLO/ }).click();
  await expect(page.getByText("Could not change mode. Try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Require permissions" })).toBeVisible();
  await page.goto(`${fixtureUrl}/permissions.html?slow`);
  await page.getByRole("button", { name: "Approve Once" }).dblclick();
  await expect(page.getByRole("button", { name: "Approve Once", exact: true })).toBeDisabled();
  await expect(page.getByText("Submitting…", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Submissions: 1")).toBeVisible();
});

test("scope confirmation keeps keyboard focus and cancel preserves the pending decision", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/permissions.html`);
  const remember = page.getByRole("button", { name: "Always Approve" });
  await remember.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Approve and Save" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(remember).toBeFocused();
  await expect(page.getByText("Submissions: 0")).toBeVisible();
});

for (const scenario of ["command", "patch"]) {
  test(`long ${scenario} preserves transcript position when modes open`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${fixtureUrl}/permissions.html?long&theme=dark`);
    await page.getByLabel("Scenario").selectOption(scenario);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const transcript = page.locator(".transcript");
    const before = await transcript.evaluate((element) => ({
      top: element.scrollTop,
      height: element.clientHeight,
    }));
    await page.getByRole("button", { name: "Require permissions" }).click();
    await expect(page.getByRole("radio", { name: /YOLO/ })).toBeVisible();
    expect(
      await transcript.evaluate((element) => ({
        top: element.scrollTop,
        height: element.clientHeight,
      })),
    ).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("planning stays separate from permission policy and saved rules live in Settings", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/permissions.html`);
  await expect(page.locator(".composer").getByText("Workspace permissions")).toHaveCount(0);
  await page.getByRole("button", { name: "Require permissions", exact: true }).click();
  await expect(page.getByRole("radio")).toHaveCount(2);
  await expect(page.getByRole("radio", { name: /Plan only|Review changes/ })).toHaveCount(0);
  await page.getByRole("radio", { name: /YOLO/ }).check();
  await page.keyboard.press("Escape");
  const plan = page.getByRole("button", { name: "Plan mode", exact: true });
  await plan.click();
  await expect(plan).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "YOLO", exact: true })).toBeVisible();
  await plan.click();
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "YOLO", exact: true })).toBeVisible();
  const footer = page.locator(".permission footer");
  await expect(footer.getByRole("button")).toHaveText(["Reject", "Approve Once", "Always Approve"]);
  await expect(footer.locator("button.primary")).toHaveText(["Approve Once", "Always Approve"]);
});

test("plan toggle keeps toolbar labels and geometry stable during save", async ({ page }) => {
  await page.goto(`${fixtureUrl}/permissions.html?slow`);
  const toolbar = page.locator(".composer-tools");
  await expect(toolbar.getByRole("button")).toHaveText([
    "Create goal",
    "Plan",
    "Require permissions",
  ]);
  const plan = page.getByRole("button", { name: "Plan mode", exact: true });
  const before = await toolbar.boundingBox();
  await plan.click();
  await expect(plan).toBeDisabled();
  await expect(page.getByText("Saving…", { exact: true })).toHaveCount(0);
  expect(await toolbar.boundingBox()).toEqual(before);
  await expect(plan).toHaveAttribute("aria-pressed", "true");
  await expect(plan).toBeEnabled();
});
