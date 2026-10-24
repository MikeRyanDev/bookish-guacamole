import { fixtureUrl } from "./fixture-url";
import { expect, test, type Locator } from "@playwright/test";

async function distanceFromEnd(transcript: Locator) {
  return transcript.evaluate(
    (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
  );
}

test("long transcripts render a bounded window, follow streaming, and preserve reading position", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}`);
  const transcript = page.getByLabel("Conversation transcript");
  await expect(transcript.locator("article").last()).toContainText("Message 999");
  expect(await transcript.locator("article").count()).toBeLessThan(40);
  await expect.poll(() => distanceFromEnd(transcript)).toBeLessThan(5);

  await page.getByRole("button", { name: "Stream more" }).click();
  await expect.poll(() => distanceFromEnd(transcript)).toBeLessThan(5);
  await page.getByRole("button", { name: "Append", exact: true }).click();
  await expect(transcript.locator("article").last()).toContainText("Message 1000");
  await expect.poll(() => distanceFromEnd(transcript)).toBeLessThan(5);

  await transcript.hover();
  await page.mouse.wheel(0, -900);
  await expect(page.getByRole("button", { name: "Jump to latest" })).toBeVisible();
  await expect.poll(() => transcript.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  // Wait for the actual scroll position to settle before comparing updates.
  await page.waitForTimeout(200);
  const before = await transcript.evaluate((element) => element.scrollTop);
  await page.getByRole("button", { name: "Stream more" }).click();
  await page.getByRole("button", { name: "Append", exact: true }).click();
  await page.waitForTimeout(200);
  expect(
    Math.abs((await transcript.evaluate((element) => element.scrollTop)) - before),
  ).toBeLessThan(5);

  await page.getByRole("button", { name: "Jump to latest" }).click();
  await expect.poll(() => distanceFromEnd(transcript)).toBeLessThan(5);
  await expect(transcript.locator("article").last()).toContainText("Message 1001");
});

test("jump control stays circular while hovered and keyboard focused", async ({ page }) => {
  await page.goto(`${fixtureUrl}`);
  const transcript = page.getByLabel("Conversation transcript");
  await expect(transcript.locator("article").last()).toContainText("Message 999");
  await transcript.hover();
  await page.mouse.wheel(0, -900);
  const jump = page.getByRole("button", { name: "Jump to latest" });
  await expect(jump).toBeVisible();
  await jump.hover();
  await expect(jump).toHaveCSS("border-radius", "50%");
  await jump.focus();
  await expect(jump).toHaveCSS("border-radius", "50%");
  await page.keyboard.press("Enter");
  await expect.poll(() => distanceFromEnd(transcript)).toBeLessThan(5);
});
