import { expect, test, type Locator } from "@playwright/test";
import { fixtureUrl } from "./fixture-url";
const endGap = (element: Locator) =>
  element.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop);

test("goal changes do not resize the output viewport", async ({ page }) => {
  await page.goto(`${fixtureUrl}/composer.html?long`);
  const transcript = page.getByRole("region", { name: "Conversation transcript" });
  await expect.poll(() => endGap(transcript)).toBeLessThan(5);
  const before = await transcript.boundingBox();
  for (const state of ["active", "paused", "approval", "met", "stopped", "none"]) {
    await page.getByLabel("Fixture state").selectOption(state);
    expect(await transcript.boundingBox()).toEqual(before);
    await expect.poll(() => endGap(transcript)).toBeLessThan(5);
  }
});

import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
for (const theme of ["light", "dark"]) {
  for (const width of [1440, 390]) {
    test(`composer interaction and reading position ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${fixtureUrl}/composer.html?theme=${theme}`);
      await page.evaluate(() => document.fonts.ready);
      const transcript = page.getByRole("region", { name: "Conversation transcript" });
      await expect.poll(() => endGap(transcript)).toBeLessThan(5);
      await transcript.evaluate((node) => {
        node.scrollTop -= 1200;
      });
      await expect(page.getByRole("button", { name: "Jump to latest" })).toBeVisible();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      const position = await transcript.evaluate((node) => node.scrollTop);
      const bounds = await transcript.boundingBox();
      await page.getByLabel("Fixture state").selectOption("paused");
      const trigger = page.getByRole("button", { name: /View goal.*Paused/ });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const panel = page.getByRole("dialog", { name: "Session goal" });
      await expect(panel).toBeVisible();
      expect(await transcript.boundingBox()).toEqual(bounds);
      expect(await transcript.evaluate((node) => node.scrollTop)).toBeCloseTo(position, 0);
      await expect(page.getByRole("button", { name: "Resume goal" })).toBeEnabled();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await mkdir(".impeccable/review", { recursive: true });
      await page.screenshot({
        path: `.impeccable/review/${theme}-${width}-goal.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      const draft = page.getByRole("textbox", { name: "Message your coding agent" });
      await draft.fill("A draft that should stay available.\n".repeat(25));
      expect(await transcript.evaluate((node) => node.scrollTop)).toBeCloseTo(position, 0);
      expect(await draft.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
      await page.getByRole("button", { name: "Append output" }).click();
      expect(await transcript.evaluate((node) => node.scrollTop)).toBeCloseTo(position, 0);
      await page.getByRole("button", { name: "Jump to latest" }).click();
      await expect.poll(() => endGap(transcript)).toBeLessThan(5);
      await page.getByRole("button", { name: "Stream output" }).click();
      await expect.poll(() => endGap(transcript)).toBeLessThan(5);
      await draft.fill("Short draft");
      await expect.poll(() => endGap(transcript)).toBeLessThan(5);
      await page.getByLabel("Fixture state").selectOption("approval");
      await expect(page.getByRole("button", { name: "Approve Once" })).toBeInViewport();
      await page.screenshot({
        path: `.impeccable/review/${theme}-${width}-approval.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: /View goal.*Approval required/ }).click();
      await expect(page.getByRole("button", { name: "Resume goal" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Stop goal", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
      await page.keyboard.press("Escape");
      await page.getByLabel("Fixture state").selectOption("active");
      await page.getByRole("button", { name: "Stop run" }).click();
      await page.getByRole("button", { name: /View goal.*Paused/ }).click();
      await page.getByRole("button", { name: "Stop goal", exact: true }).click();
      await page.getByRole("button", { name: "Create new goal" }).click();
      const objective = page.getByRole("textbox", { name: "Goal objective" });
      await expect(objective).toHaveValue("");
      await expect(objective).toBeFocused();
      await expect(page.getByText(/Continues automatically/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Start goal", exact: true })).toBeDisabled();
      await page.screenshot({
        path: `.impeccable/review/${theme}-${width}-new.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(draft).toHaveValue("Short draft");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
}

test("long goal details stay within a short mobile viewport and dismiss outside", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto(`${fixtureUrl}/composer.html?long`);
  await page.getByLabel("Fixture state").selectOption("error");
  await page.getByRole("button", { name: /View goal.*Paused/ }).click();
  const panel = page.getByRole("dialog", { name: "Session goal" });
  await expect(panel).toBeInViewport();
  const rect = await panel.boundingBox();
  expect(rect!.y).toBeGreaterThanOrEqual(12);
  expect(rect!.x).toBeGreaterThanOrEqual(12);
  await page.getByRole("button", { name: "Resume goal" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Resume goal" })).toBeInViewport();
  await page.screenshot({ path: ".impeccable/review/short-long-goal.png", fullPage: true });
  await page.getByRole("textbox", { name: "Message your coding agent" }).click();
  await expect(panel).toBeHidden();
});

test("empty, restoring and completed states retain a usable composer", async ({ page }) => {
  await page.goto(`${fixtureUrl}/composer.html?empty`);
  await expect(page.getByRole("heading", { name: "What are we building?" })).toBeVisible();
  await page.getByLabel("Fixture state").selectOption("restoring");
  await page.getByRole("textbox").fill("Keep this draft");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  await page.getByLabel("Fixture state").selectOption("met");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: /View goal.*Complete · agent assessed/ }).click();
  await expect(page.getByRole("button", { name: "Resume goal" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create new goal" })).toBeEnabled();
});
