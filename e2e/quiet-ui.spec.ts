import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`${theme} workspace removes decorative framing and idle metadata`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => localStorage.setItem("starter-theme", value), theme);
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("TanStack AI");
    await expect(
      page
        .locator("button")
        .filter({ has: page.locator(".starter-composer-model-selector-label") }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("coding-lessons");
    await expect(page.getByText("Ready", { exact: true })).toHaveCount(0);
    for (const selector of [
      ".starter-workspace-workspace-header",
      ".starter-workspace-sessions",
      ".starter-files-inspector",
      ".starter-workspace-conversation-header",
      ".starter-composer-composer",
      ".starter-workspace-session-search",
    ]) {
      const widths = await page.locator(selector).evaluate((element) => {
        const css = getComputedStyle(element);
        return [
          css.borderTopWidth,
          css.borderRightWidth,
          css.borderBottomWidth,
          css.borderLeftWidth,
        ];
      });
      expect(widths, selector).toEqual(["0px", "0px", "0px", "0px"]);
    }
    if (theme === "dark") {
      const bg = await page
        .locator("html")
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(bg).toBe("rgb(20, 21, 23)");
    }
    await page.getByRole("textbox", { name: "Message your coding agent" }).focus();
    await expect(page.locator(".starter-composer-composer")).toHaveCSS("outline-width", "2px");
    await expect(page.locator(".starter-composer-composer textarea")).toHaveCSS(
      "outline-style",
      "none",
    );
    await page.screenshot({
      path: testInfo.outputPath(`quiet-workspace-${theme}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Settings" });
    await expect(settings.getByRole("radio")).toHaveCount(11);
    await expect(settings.getByRole("radio", { name: "System", exact: true })).toBeVisible();
    await expect(settings.getByRole("tab")).toHaveText([
      "Appearance",
      "Models",
      "Permissions",
      "Execution",
      "Connections",
    ]);
    await expect(settings).not.toContainText("Learning");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Command menu" }).click();
    await expect(page.getByRole("link", { name: "Harness documentation" })).toBeVisible();
  });
}
