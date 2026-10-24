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

for (const theme of ["light", "dark"]) {
  test(`composer placeholders have readable contrast in ${theme}`, async ({ page }) => {
    await page.goto(`${fixtureUrl}/composer.html?empty&theme=${theme}`);
    for (const label of ["Message your coding agent", "Goal objective"]) {
      if (label === "Goal objective")
        await page.getByRole("button", { name: "Create goal", exact: true }).click();
      const ratio = await page.getByRole("textbox", { name: label }).evaluate((element) => {
        const luminance = (color: string) => {
          const values = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((value) => {
              const s = value / 255;
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            });
          return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
        };
        const foreground = luminance(getComputedStyle(element, "::placeholder").color);
        const background = luminance(getComputedStyle(element.closest("form")!).backgroundColor);
        return (
          (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
        );
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
}
