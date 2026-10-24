import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
test("settings support system theme, four color formats, persistence, defaults and mobile", async ({
  page,
}, testInfo) => {
  let defaults = { modelId: "first", permissions: "acceptEdits" };
  await page.route("**/api/defaults?*", async (route) => {
    if (route.request().method() === "PATCH")
      defaults = { ...defaults, ...route.request().postDataJSON() };
    await route.fulfill({ json: defaults });
  });
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: "System", exact: true }).check();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await page.getByRole("textbox", { name: "HEX", exact: true }).fill("#zzzz");
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "HEX", exact: true }).fill("#cc663380");
  for (const format of ["RGBA", "HSV", "CMYK", "HEX"])
    await page.getByLabel("Color format", { exact: true }).selectOption(format);
  await expect(page.getByRole("textbox", { name: "HEX", exact: true })).toHaveValue("#cc663380");
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use #cc663380" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("Default permissions", { exact: true }).selectOption("bypass");
  await page.getByLabel("Default model", { exact: true }).selectOption("second");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: "System", exact: true })).toBeChecked();
  await expect(page.getByRole("button", { name: "Use #cc663380" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Default model", { exact: true })).toHaveValue("second");
  await expect(page.getByLabel("Default permissions", { exact: true })).toHaveValue("bypass");
  for (const width of [1440, 390])
    for (const theme of ["Light", "Dark"]) {
      await page.setViewportSize({ width, height: 960 });
      await page.getByRole("radio", { name: theme, exact: true }).check();
      await page.getByRole("button", { name: "Add color", exact: true }).click();
      await expect(page.getByLabel("Color format", { exact: true })).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`settings-${theme}-${width}.png`),
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    }
  await page.getByRole("button", { name: "Remove #cc663380" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "moss");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("workspace defaults reach new native conversations without changing existing ones", async ({
  page,
  request,
}, testInfo) => {
  const origin = process.env.SETTINGS_APP_URL;
  test.skip(!origin, "Requires isolated settings runtime");
  const config = await (await request.get(`${origin}/api/config`)).json();
  const headers = { authorization: `Bearer ${config.token}` };
  const existing = `settings-existing-${Date.now()}`,
    fresh = `settings-new-${Date.now()}`;
  await request.patch(`${origin}/api/defaults`, {
    headers,
    data: { modelId: "first", permissions: "acceptEdits" },
  });
  await request.get(`${origin}/api/model?thread=${existing}`, { headers });
  await page.goto(origin!);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Default permissions", { exact: true }).selectOption("bypass");
  await page.getByLabel("Default model", { exact: true }).selectOption("second");
  await expect(page.getByLabel("Default permissions", { exact: true })).toHaveValue("bypass");
  await expect(page.getByLabel("Default model", { exact: true })).toHaveValue("second");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Default permissions", { exact: true })).toHaveValue("bypass");
  expect(
    await (await request.get(`${origin}/api/model?thread=${fresh}`, { headers })).json(),
  ).toMatchObject({ modelId: "second" });
  expect(
    await (await request.get(`${origin}/api/approval-mode?thread=${fresh}`, { headers })).json(),
  ).toMatchObject({ permissionMode: "bypass", planOnly: false });
  expect(
    await (await request.get(`${origin}/api/model?thread=${existing}`, { headers })).json(),
  ).toMatchObject({ modelId: "first" });
  expect(
    await (await request.get(`${origin}/api/approval-mode?thread=${existing}`, { headers })).json(),
  ).toMatchObject({ permissionMode: "acceptEdits" });
  for (const width of [1440, 390])
    for (const theme of ["Light", "Dark"]) {
      await page.setViewportSize({ width, height: 960 });
      await page.getByRole("radio", { name: theme, exact: true }).check();
      await page.getByRole("button", { name: "Add color", exact: true }).click();
      await page.screenshot({
        path: testInfo.outputPath(`actual-${theme}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    }
});
