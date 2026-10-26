import { expect, test } from "@playwright/test";

test("existing backend transcript restores as grouped activity", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  test.skip(
    !process.env.TOOL_REPLAY_URL,
    "Set an existing local conversation URL; this test does not invoke a model.",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.TOOL_REPLAY_URL!);
  await expect(page.getByRole("button", { name: /6 tool calls/ })).toBeVisible({ timeout: 30000 });
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1512, height: 741 });
  await page.screenshot({ path: testInfo.outputPath("tool-stack-replay-collapsed.png") });
  const group = page.getByRole("button", { name: /6 tool calls/ });
  const origin = await group.boundingBox();
  await group.click();
  await expect(page.locator(".starter-tools-tool-call")).toHaveCount(6);
  await page.waitForTimeout(250);
  expect(Math.abs((await group.boundingBox())!.y - origin!.y)).toBeLessThan(3);
  await page.screenshot({ path: testInfo.outputPath("tool-stack-replay-expanded.png") });
  await page.reload();
  await expect(page.getByRole("button", { name: /6 tool calls/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
