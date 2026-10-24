import { expect, test } from "@playwright/test";
import { fixtureUrl } from "./fixture-url";

test("goal creation has an explicit entry, explanation, submit and cancel", async ({ page }) => {
  await page.goto(`${fixtureUrl}/composer.html?empty`);
  const message = page.getByRole("textbox", { name: "Message your coding agent" });
  await message.fill("Keep my message draft");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  const objective = page.getByRole("textbox", { name: "Goal objective" });
  await expect(objective).toHaveValue("");
  await expect(objective).toBeFocused();
  await expect(page.getByText(/Continues automatically/)).toBeVisible();
  await expect(page.getByRole("button", { name: "20 rounds" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start goal", exact: true })).toHaveText(
    "Start goal",
  );
  await expect(page.getByRole("button", { name: "Start goal", exact: true })).toBeDisabled();
  await objective.fill("Verify keyboard navigation");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(message).toHaveValue("Keep my message draft");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(objective).toHaveValue("Verify keyboard navigation");
  await page.getByRole("button", { name: "Start goal", exact: true }).click();
  await expect(message).toHaveValue("Keep my message draft");
  await expect(message).toBeFocused();
  await page.getByRole("button", { name: /View goal/ }).click();
  await expect(page.getByRole("dialog", { name: "Session goal" })).toContainText(
    "Verify keyboard navigation",
  );
});

test("opening creation follows the latest output only when already at the end", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/composer.html`);
  const transcript = page.getByRole("region", { name: "Conversation transcript" });
  const gap = () => transcript.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop);
  await expect.poll(gap).toBeLessThan(5);
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect.poll(gap).toBeLessThan(5);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await transcript.evaluate((el) => {
    el.scrollTop -= 1000;
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const before = await transcript.evaluate((el) => el.scrollTop);
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  expect(await transcript.evaluate((el) => el.scrollTop)).toBeCloseTo(before, 0);
});
