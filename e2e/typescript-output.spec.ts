import { expect, test } from "@playwright/test";
import { fixtureUrl } from "./fixture-url";

test("source has comfortable inset on all sides and output exposes native semantics", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?typescript`);
  await page.locator("summary.starter-tools-tool-header").click();
  const padding = await page.getByLabel("TypeScript source", { exact: true }).evaluate((el) => {
    const css = getComputedStyle(el);
    return [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft].map(parseFloat);
  });
  expect(padding.every((value) => value >= 16)).toBe(true);
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Return value", { exact: true })).toContainText('"greeting"');
  await expect(page.getByLabel("Console output", { exact: true })).toHaveText("Hello, Ada");
  await expect(page.getByText('"success"', { exact: true })).toBeHidden();
});

test("failure puts its message and line before logs and keeps diagnostics optional", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?typescript`);
  await page.getByLabel("Fixture state").selectOption("error");
  await expect(page.getByText("Execution failed", { exact: true })).toBeVisible();
  await expect(page.getByText("Unexpected token", { exact: true })).toBeVisible();
  await expect(page.getByText("Line 2", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Console output", { exact: true })).toHaveText("Started");
});

test("all native return types and missing evidence are explicit", async ({ page }) => {
  await page.goto(`${fixtureUrl}/?typescript`);
  for (const [state, value] of [
    ["false", "false"],
    ["zero", "0"],
    ["null", "null"],
    ["empty-string", '""'],
    ["empty-array", "[]"],
    ["empty-object", "{}"],
  ]) {
    await page.getByLabel("Fixture state").selectOption(state!);
    await page.locator("summary.starter-tools-tool-header").click();
    await expect(page.getByLabel("Return value", { exact: true })).toHaveText(value!);
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
    await expect(page.getByText("No value returned.", { exact: true })).toHaveCount(0);
  }
  for (const [state, text] of [
    ["native-empty", "No value returned."],
    ["no-error-details", "No error details returned."],
    ["empty-error", "No error message returned."],
    ["timeout", "Execution timed out"],
    ["cancelled", "Execution was cancelled"],
    ["conflict", "Conflicting outcome"],
  ]) {
    await page.getByLabel("Fixture state").selectOption(state!);
    if (
      !(await page
        .locator(".starter-tools-tool-details")
        .evaluate((el) => (el as HTMLDetailsElement).open))
    )
      await page.locator("summary.starter-tools-tool-header").click();
    await expect(page.getByText(text!, { exact: true })).toBeVisible();
  }
});

test("diagnostics and copies retain full response and partial execution evidence", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${fixtureUrl}/?typescript`);
  await page.getByLabel("Fixture state").selectOption("stack");
  await expect(page.getByText("Partial return value", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy return value JSON" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{"processed":2}');
  await expect(page.getByLabel("Stack trace", { exact: true })).toBeHidden();
  await page.getByText("Stack trace", { exact: true }).click();
  await expect(page.getByLabel("Stack trace", { exact: true })).toContainText("program.ts:4:9");
  await page.getByRole("button", { name: "Copy console output" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Started\nERROR: stopped");
  await page.getByText("Raw response", { exact: true }).click();
  await page.getByRole("button", { name: "Copy response JSON" }).click();
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toMatchObject({
    success: false,
    error: { line: 4 },
    result: { processed: 2 },
  });
  await page.getByLabel("Fixture state").selectOption("logs-only");
  await page.locator("summary.starter-tools-tool-header").click();
  await expect(page.getByText("Empty line", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy console output" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Reading files\nWARN: skipped empty file\n",
  );
  await page.getByLabel("Fixture state").selectOption("unknown-fields");
  await page.locator("summary.starter-tools-tool-header").click();
  await page.getByText("Raw response", { exact: true }).click();
  await expect(page.getByLabel("Raw response JSON", { exact: true })).toContainText(
    "provider evidence",
  );
});

test("unrecognized and untrusted content is readable text without an invented success", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?typescript`);
  for (const state of ["invalid-json", "invalid-envelope", "untrusted"]) {
    await page.getByLabel("Fixture state").selectOption(state);
    if (
      !(await page
        .locator(".starter-tools-tool-details")
        .evaluate((el) => (el as HTMLDetailsElement).open))
    )
      await page.locator("summary.starter-tools-tool-header").click();
    await expect(page.getByText("Completed", { exact: true })).toHaveCount(0);
    await expect(
      page.locator(".starter-tools-typescript-output img, .starter-tools-typescript-output script"),
    ).toHaveCount(0);
    if (state !== "untrusted")
      await expect(page.getByText("Unrecognized response", { exact: true })).toBeVisible();
    else
      await expect(page.getByLabel("Console output", { exact: true })).toHaveText(
        "<script>alert(1)</script>",
      );
  }
});

test("outcome states remain readable, padded, and accessible across themes and widths", async ({
  page,
}, testInfo) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${fixtureUrl}/?typescript`);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 960 });
      for (const state of [
        "complete",
        "stack",
        "native-empty",
        "logs-only",
        "running",
        "invalid-envelope",
        "long-native",
        "long-error",
      ]) {
        await page.getByLabel("Fixture state").selectOption(state);
        if (
          !(await page
            .locator(".starter-tools-tool-details")
            .evaluate((el) => (el as HTMLDetailsElement).open))
        )
          await page.locator("summary.starter-tools-tool-header").click();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const insets = await page
          .getByLabel("TypeScript source", { exact: true })
          .evaluate((el) => {
            const pre = el.getBoundingClientRect();
            const code = el.querySelector("code")!.getBoundingClientRect();
            return { left: code.left - pre.left, top: code.top - pre.top };
          });
        expect(insets.left).toBeGreaterThanOrEqual(16);
        expect(insets.top).toBeGreaterThanOrEqual(16);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath(`${theme}-${width}-${state}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }
});
