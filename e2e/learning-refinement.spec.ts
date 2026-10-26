import { expect, test } from "@playwright/test";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";

test("desktop reader has one alignment edge and compact navigation", async ({ page }) => {
  await page.goto(`${fixture}/learning.html?ready=1&long=1&duplicate=1&published=1`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(
    page.getByText(
      "New conversations use this space. Existing conversations keep their assignment.",
    ),
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh Learning" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh status" })).toHaveCount(0);
  await page.getByRole("button", { name: "Published skills" }).click();
  const row = page.locator(".starter-learning-learning-skill-row");
  await row.click();
  await expect(page.getByRole("button", { name: "Back to skills" })).not.toBeVisible();
  const title = await page.locator(".starter-learning-learning-reader-heading h2").boundingBox();
  for (const selector of [
    ".starter-learning-learning-document > p",
    ".starter-learning-learning-document .starter-shared-markdown h3",
    ".starter-learning-learning-document .starter-shared-markdown > p",
  ]) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box!.x).toBeCloseTo(title!.x, 0);
  }
  const preview = await row.locator("small").evaluate((el) => ({
    height: el.clientHeight,
    line: parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(preview.height).toBeLessThanOrEqual(preview.line * 2 + 1);
  await expect(page.locator(".starter-learning-learning-document > p")).not.toContainText(
    "Use when When",
  );
  await expect(page.locator(".starter-learning-learning-document > p")).not.toContainText(
    "for Do not use for",
  );
});

test("refresh errors preserve the selected published document", async ({ page }) => {
  await page.goto(`${fixture}/learning.html?ready=1&long=1&published=1`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Published skills" }).click();
  await page.getByRole("button", { name: /test-first/ }).click();
  // Fixture requests bypass browser routing, so inject a single response at its fetch boundary.
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      if (String(input).includes("/api/skills"))
        return Response.json({ error: "Unavailable" }, { status: 503 });
      return original(input, init);
    };
  });
  await page.getByRole("button", { name: "Refresh skills", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page
      .locator(".starter-learning-learning-document")
      .getByRole("heading", { name: "Test first", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.starter-learning-learning-skill-row[aria-pressed="true"]'),
  ).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  for (const width of [320, 390, 768, 1440, 1512, 2048]) {
    test(`long titles and documents stay aligned and usable: ${theme} ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(
        `${fixture}/learning.html?ready=1&long=1&longtitle=1&duplicate=1&published=1&theme=${theme}`,
      );
      await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
      await page.getByRole("button", { name: "Learning", exact: true }).click();
      const row = page.locator(".starter-learning-learning-skill-row");
      await expect(row).toBeVisible();
      await row.hover();
      await row.focus();
      await page.keyboard.press("Enter");
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expect(page.locator(".starter-learning-learning-reader-heading h2")).toBeFocused();
      const doc = page.locator(".starter-learning-learning-document");
      const heading = await page
        .locator(".starter-learning-learning-reader-heading h2")
        .boundingBox();
      const markdown = await doc.locator(".starter-shared-markdown > h3").boundingBox();
      expect(markdown!.x).toBeCloseTo(heading!.x, 0);
      expect(
        await page
          .locator(".starter-learning-learning-review")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      expect((await doc.boundingBox())!.height).toBeGreaterThan(250);
      await expect(page.getByRole("button", { name: "Approve skill" })).toBeInViewport();
      if (width <= 700)
        await expect(page.getByRole("button", { name: "Back to skills" })).toBeVisible();
      else await expect(page.getByRole("button", { name: "Back to skills" })).not.toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`reader-${theme}-${width}.png`) });
      const { default: AxeBuilder } = await import("@axe-core/playwright");
      expect(
        (await new AxeBuilder({ page }).include(".starter-learning-learning-dialog").analyze())
          .violations,
      ).toEqual([]);
      await doc.focus();
      await page.keyboard.press("End");
      await expect(page.getByText("Skill metadata", { exact: true })).toBeInViewport();
      await page.getByText("Skill metadata", { exact: true }).click();
      await expect(page.locator(".starter-learning-learning-metadata pre")).toContainText(
        "name: test-first",
      );
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Learning", exact: true })).toBeFocused();
    });
  }
}

test("refresh preserves review content and explains disabled decisions", async ({ page }) => {
  await page.goto(`${fixture}/learning.html?ready=1&long=1&slow=1`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Test before editing" }).click();
  await expect(
    page.locator(".starter-learning-learning-document .starter-shared-markdown"),
  ).toBeVisible();
  const before = await page.getByRole("button", { name: "Approve skill" }).boundingBox();
  await page.getByRole("button", { name: "Refresh skills", exact: true }).click();
  await expect(page.getByText("Refreshing review state…")).toBeVisible();
  await expect(
    page.locator(".starter-learning-learning-document .starter-shared-markdown"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve skill" })).toBeDisabled();
  const during = await page.getByRole("button", { name: "Approve skill" }).boundingBox();
  expect(during!.x).toBeCloseTo(before!.x, 0);
  expect(during!.y).toBeCloseTo(before!.y, 0);
  await expect(page.getByRole("button", { name: "Approve skill" })).toBeEnabled();
});

test("successful recovery clears an uncertain review error", async ({ page }) => {
  await page.goto(`${fixture}/learning.html?ready=1&failure=review-state`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Test before editing" }).click();
  await page.getByRole("button", { name: "Approve skill" }).click();
  await expect(page.getByRole("button", { name: "Approve skill" })).toBeDisabled();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve skill" })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("short viewport equivalent to 200 percent zoom keeps decisions visible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 756, height: 370 });
  await page.goto(`${fixture}/learning.html?ready=1&long=1&longtitle=1`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.locator(".starter-learning-learning-skill-row").click();
  const modal = await page.getByRole("dialog").boundingBox();
  const action = await page.getByRole("button", { name: "Approve skill" }).boundingBox();
  expect(action!.y + action!.height).toBeLessThanOrEqual(modal!.y + modal!.height);
  expect(
    (await page.locator(".starter-learning-learning-document").boundingBox())!.height,
  ).toBeGreaterThan(50);
  await page.getByRole("button", { name: "Supporting evidence" }).click();
  await expect(
    page.getByText("Please run the tests first so we know which behavior is broken."),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("short-viewport.png") });
});

test("list, loading, and empty layouts expose accurate next actions", async ({
  page,
}, testInfo) => {
  for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${fixture}/learning.html?ready=1&duplicate=1&theme=${theme}`);
    await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
    await page.getByRole("button", { name: "Learning", exact: true }).click();
    await expect(page.locator(".starter-learning-learning-skill-row")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`list-${theme}.png`) });
    await page.getByRole("button", { name: "Published skills" }).click();
    await expect(page.getByText(/No published Skills yet/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`empty-${theme}.png`) });
  }
  await page.goto(`${fixture}/learning.html?slow=1&failure=candidate&ready=1`);
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.getByText("Loading Learning…")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("loading.png") });
  await page.getByRole("button", { name: "Test before editing" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("error.png") });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Loading proposal…")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Approve skill" })).toBeEnabled();
});
