import { expect, test } from "@playwright/test";

const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
test("Learning opens a workspace modal and returns focus without changing the conversation", async ({
  page,
}) => {
  await page.goto(`${fixture}/learning.html`);
  const entry = page
    .locator(".workspace-header")
    .getByRole("button", { name: "Learning", exact: true });
  await entry.click();
  const dialog = page.getByRole("dialog", { name: "Learning · Demo project", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning · Demo project" })).toBeFocused();
  await expect(page.locator(".inspector").getByRole("button", { name: "Learning" })).toHaveCount(0);
  const box = await dialog.boundingBox();
  expect(box!.width).toBeGreaterThan(1000);
  expect(box!.height).toBeGreaterThan(700);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(entry).toBeFocused();
  await entry.click();
  await page.getByRole("button", { name: "Close Learning" }).click();
  await expect(entry).toBeFocused();
  await expect(page.getByRole("heading", { name: "What are we building?" })).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`long Markdown remains readable with persistent decisions: ${theme} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${fixture}/learning.html?long=1&ready=1&theme=${theme}`);
      await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
      await page.getByRole("button", { name: "Learning", exact: true }).click();
      await page.getByRole("button", { name: "Test before editing" }).click();
      await page.evaluate(async () => {
        await document.fonts.load('15px "Manrope Variable"');
        await document.fonts.load('13px "IBM Plex Mono"');
      });
      const reader = page.locator(".learning-document");
      await expect(page.getByRole("heading", { name: "Test before editing" })).toBeFocused();
      const box = await reader.boundingBox();
      expect(box!.width).toBeGreaterThan(width === 1440 ? 800 : 350);
      expect(box!.height).toBeGreaterThan(450);
      expect(await reader.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
        true,
      );
      await expect(page.getByRole("button", { name: "Approve skill" })).toBeInViewport();
      await page.screenshot({ path: `.impeccable/review/dialog-${theme}-${width}.png` });
      await reader.focus();
      await page.keyboard.press("End");
      await expect(page.getByText("Skill metadata", { exact: true })).toBeInViewport();
      await expect(page.getByRole("button", { name: "Reject skill" })).toBeInViewport();
      await page.getByRole("button", { name: "Supporting evidence" }).click();
      await expect(
        page.getByText("Please run the tests first so we know which behavior is broken."),
      ).toBeVisible();
      await page.screenshot({ path: `.impeccable/review/dialog-evidence-${theme}-${width}.png` });
      if (width === 390) {
        await page.getByRole("button", { name: "Back to skills" }).click();
        await expect(page.getByRole("button", { name: "Test before editing" })).toBeFocused();
      } else {
        await expect(page.getByRole("button", { name: "Back to skills" })).not.toBeVisible();
        await expect(page.getByRole("button", { name: "Test before editing" })).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Learning", exact: true })).toBeFocused();
    });
  }
}

for (const failure of [
  "settings",
  "spaces",
  "status",
  "candidates",
  "candidate",
  "evidence",
  "skills",
]) {
  test(`local ${failure} failure has an explicit retry`, async ({ page }) => {
    await page.goto(`${fixture}/learning.html?ready=1&failure=${failure}`);
    if (failure !== "settings" && failure !== "spaces")
      await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
    await page.getByRole("button", { name: "Learning", exact: true }).click();
    if (["candidate", "evidence"].includes(failure))
      await page.getByRole("button", { name: "Test before editing" }).click();
    if (failure === "evidence")
      await page.getByRole("button", { name: "Supporting evidence" }).click();
    if (failure === "skills") await page.getByRole("button", { name: "Published skills" }).click();
    await expect(page.getByRole("alert")).toContainText("Request failed (503)");
    if (["settings", "spaces"].includes(failure))
      await expect(page.getByLabel("Learning space", { exact: true })).toBeDisabled();
    if (failure === "status")
      await expect(page.getByRole("button", { name: "Learn", exact: true })).toBeDisabled();
    await page.screenshot({ path: `.impeccable/review/dialog-error-${failure}.png` });
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("loading and pending saves prevent duplicate actions; close discards only unsaved drafts", async ({
  page,
}) => {
  await page.goto(`${fixture}/learning.html?slow=1`);
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.getByLabel("Learning space", { exact: true })).toBeDisabled();
  await expect(page.getByText("Loading spaces…")).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/dialog-loading.png" });
  await expect(page.getByLabel("Learning space", { exact: true })).toBeEnabled();
  await page.getByLabel("Learning space", { exact: true }).selectOption("coding");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Change space" })).toBeVisible();
  await page.getByRole("button", { name: "Change space" }).click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("writing");
  await page.getByRole("button", { name: "Close Learning" }).click();
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.getByText("Coding lessons", { exact: true })).toBeVisible();
});

test("unsaved space changes cannot run Learning against a different saved space", async ({
  page,
}) => {
  await page.goto(`${fixture}/learning.html?ready=1&failure=save`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Change space" }).click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("writing");
  await expect(page.getByRole("button", { name: "Learn", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Learn", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Coding lessons", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Learn", exact: true })).toBeEnabled();
});

test("empty spaces, failed runs, and empty published lists explain the next action", async ({
  page,
}) => {
  await page.goto(`${fixture}/learning.html?empty=1`);
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(
    page.getByText("No Learning spaces yet. Create one in Intelligence, then refresh the spaces."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh spaces" })).toBeEnabled();
  await page.screenshot({ path: ".impeccable/review/dialog-empty.png" });
  await page.goto(`${fixture}/learning.html?ready=1&runfailed=1`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.getByText("Learning failed", { exact: true })).toBeVisible();
  await expect(page.getByText("Check Learning in Intelligence, then try again.")).toBeVisible();
  await page.getByRole("button", { name: "Published skills" }).click();
  await expect(page.getByText(/No published Skills yet/)).toBeVisible();
  await expect(
    page.getByText(
      "Choose a Skill to read the instructions available to conversations in this space.",
    ),
  ).not.toBeVisible();
});

test("removal proposals and unavailable evidence state their consequences", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${fixture}/learning.html?ready=1&remove=1&unavailable=1`);
  await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Test before editing" }).click();
  await expect(page.getByText("This proposal removes the published Skill.")).toBeVisible();
  await expect(page.getByText("Approve removes this Skill from Coding lessons.")).toBeVisible();
  await page.getByRole("button", { name: "Supporting evidence" }).click();
  await expect(page.getByText("The source is no longer available.")).toBeVisible();
  await page.getByRole("button", { name: "Approve skill" }).click();
  await expect(page.getByText("Approved. Removed from Coding lessons.")).toBeVisible();
  await page.getByRole("button", { name: "Back to skills" }).click();
  await expect(page.getByRole("button", { name: "Review skills (0)" })).toBeFocused();
});

for (const width of [390, 1440]) {
  test(`pending review retains stable controls at ${width}px and cannot be submitted twice`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${fixture}/learning.html?ready=1&slow=1&noevidence=1`);
    await page.evaluate(() => localStorage.setItem("learning-fixture-default", "coding"));
    await page.getByRole("button", { name: "Learning", exact: true }).click();
    await page.getByRole("button", { name: "Test before editing" }).click();
    await expect(page.getByText("Loading proposal…")).toBeVisible();
    await page.getByRole("button", { name: "Supporting evidence" }).click();
    await expect(page.getByText("No supporting evidence was returned.")).toBeVisible();
    const before = await page.getByRole("button", { name: "Reject skill" }).boundingBox();
    await page.getByRole("button", { name: "Reject skill" }).click();
    await expect(page.getByText("Saving review…")).toBeVisible();
    const pending = await page.getByRole("button", { name: "Reject skill" }).boundingBox();
    expect(pending!.x).toBeCloseTo(before!.x, 0);
    expect(pending!.y).toBeCloseTo(before!.y, 0);
    await expect(page.getByRole("button", { name: "Approve skill" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reject skill" })).toBeDisabled();
    await page.screenshot({ path: `.impeccable/review/dialog-review-pending-${width}.png` });
    await expect(page.getByText("Rejected. This proposal was not published.")).toBeVisible();
  });
}
