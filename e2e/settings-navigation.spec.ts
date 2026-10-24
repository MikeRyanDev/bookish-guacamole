import { test, expect } from "@playwright/test";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
test("left categories preserve drafts and support keyboard navigation", async ({ page }) => {
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const appearance = page.getByRole("tab", { name: "Appearance", exact: true });
  await expect(appearance).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await page.getByRole("textbox", { name: "HEX", exact: true }).fill("#bad-draft");
  await page.getByRole("tab", { name: "Models", exact: true }).click();
  await expect(page.getByLabel("Default model", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "HEX", exact: true })).not.toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: "Permissions", exact: true })).toBeFocused();
  await expect(page.getByLabel("Default permissions", { exact: true })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(appearance).toBeFocused();
  await expect(page.getByRole("textbox", { name: "HEX", exact: true })).toHaveValue("#bad-draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeFocused();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const nav = await page.getByRole("tablist").boundingBox(),
      panel = await page.getByRole("tabpanel", { name: "Appearance", exact: true }).boundingBox();
    expect(nav!.x + nav!.width).toBeLessThanOrEqual(panel!.x + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("model loading, save failure and retry retain a confirmed selection", async ({
  page,
}, testInfo) => {
  let releaseRead!: () => void;
  const readGate = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  let failRead = true,
    failSave = true;
  let releaseSave!: () => void;
  let saveGate = Promise.resolve();
  let defaults = { modelId: "first", permissions: "acceptEdits" };
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/defaults?*", async (route) => {
    if (route.request().method() === "PATCH") {
      await saveGate;
      if (failSave) return route.fulfill({ status: 500, json: { error: "Save failed" } });
      defaults = { ...defaults, ...route.request().postDataJSON() };
    } else {
      await readGate;
      if (failRead) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    }
    await route.fulfill({ json: defaults });
  });
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Models", exact: true }).click();
  await expect(page.getByRole("status", { name: "Loading models" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("models-loading.png") });
  releaseRead();
  await expect(page.getByRole("alert")).toContainText("Couldn’t load");
  await expect(page.getByLabel("Default model", { exact: true })).toBeDisabled();
  failRead = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Default model", { exact: true })).toHaveValue("first");
  saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.getByLabel("Default model", { exact: true }).selectOption("second");
  await expect(page.getByRole("status", { name: "Saving", exact: true })).toBeVisible();
  await expect(page.getByLabel("Default model", { exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("models-saving.png") });
  releaseSave();
  await expect(page.getByRole("alert")).toContainText("Couldn’t save");
  await expect(page.getByLabel("Default model", { exact: true })).toHaveValue("first");
  await page.screenshot({ path: testInfo.outputPath("models-error.png") });
  failSave = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Default model", { exact: true })).toHaveValue("second");
  await expect(page.getByRole("alert")).not.toBeVisible();
});

test("saved rules distinguish load errors, empty, refreshing, removal and failed removal", async ({
  page,
}, testInfo) => {
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  let failRead = true,
    failRemove = true;
  let initialRead!: () => void;
  let gate = new Promise<void>((resolve) => {
    initialRead = resolve;
  });
  let release!: () => void;
  let rules = [{ tool: "bash", resource: "pnpm test", decision: "allow" }];
  await page.route("**/api/permissions?*", async (route) => {
    await gate;
    if (route.request().method() === "DELETE") {
      if (failRemove) return route.fulfill({ status: 500, json: { error: "Remove failed" } });
      rules = [];
    } else if (failRead) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    await route.fulfill({ json: rules });
  });
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Permissions", exact: true }).click();
  await expect(page.getByRole("status", { name: "Loading saved rules" })).toBeVisible();
  initialRead();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("No saved rules.", { exact: true })).not.toBeVisible();
  failRead = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("pnpm test", { exact: true })).toBeVisible();
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole("button", { name: "Refresh permissions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Refresh permissions", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("pnpm test", { exact: true })).toBeVisible();
  release();
  await expect(
    page.getByRole("button", { name: "Refresh permissions", exact: true }),
  ).toBeEnabled();
  gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole("button", { name: "Remove permission for bash pnpm test" }).click();
  await expect(page.getByRole("status")).toContainText("Removing");
  await expect(
    page.getByRole("button", { name: "Remove permission for bash pnpm test" }),
  ).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("rules-removing.png") });
  release();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("pnpm test", { exact: true })).toBeVisible();
  failRemove = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No saved rules.", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("rules-empty.png") });
});

test("appearance keeps usable session values when storage fails and can retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, "storageBlocked", { value: true, writable: true });
    Storage.prototype.setItem = function (key, value) {
      if ((window as unknown as { storageBlocked: boolean }).storageBlocked) throw Error("blocked");
      original.call(this, key, value);
    };
  });
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("Appearance is session-only.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await page.getByRole("textbox", { name: "HEX", exact: true }).fill("#123456");
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await expect(page.getByText("Colors are session-only.", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { storageBlocked: boolean }).storageBlocked = false;
  });
  await page.getByRole("button", { name: "Retry colors", exact: true }).click();
  await page.getByRole("button", { name: "Retry storage", exact: true }).click();
  await expect(page.getByText("Appearance is session-only.", { exact: true })).not.toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "#123456");
});

test("custom colors cover capacity, numeric errors, keyboard sliders and cancellation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "starter-custom-colors",
      JSON.stringify(Array.from({ length: 24 }, (_, i) => "#" + i.toString(16).padStart(6, "0"))),
    );
  });
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Remove #000000", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use #000001", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "HEX", exact: true })).toBeFocused();
  await page.getByLabel("Color format", { exact: true }).selectOption("RGBA");
  await page.getByRole("textbox", { name: "R", exact: true }).fill("256");
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "R", exact: true }).fill("255");
  await page.getByRole("textbox", { name: "A", exact: true }).fill("0.5");
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeEnabled();
  await page.getByRole("slider", { name: "Opacity", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("slider", { name: "Opacity", exact: true })).toHaveValue("51");
  await page.getByLabel("Color format", { exact: true }).selectOption("HSV");
  await page.getByRole("textbox", { name: "H", exact: true }).fill("361");
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeDisabled();
  await page.getByLabel("Color format", { exact: true }).selectOption("CMYK");
  await page.getByRole("textbox", { name: "K", exact: true }).fill("-1");
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add color", exact: true })).toBeFocused();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("starter-custom-colors")!).length),
  ).toBe(23);
});

test("an empty model catalog remains clear and disabled", async ({ page }) => {
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.goto(`${fixture}/settings.html?empty-models`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Models", exact: true }).click();
  await expect(page.getByLabel("Default model", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Default model", { exact: true })).toHaveText(
    "No models configured",
  );
});
