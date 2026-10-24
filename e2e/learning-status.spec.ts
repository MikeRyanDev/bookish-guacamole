import { expect, test } from "@playwright/test";

test("a failed Learning read is unavailable rather than disabled", async ({ page }) => {
  await page.route("**/inspector-learning**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Inspector Learning is temporarily unavailable" },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Web Inspector", exact: true }).click();
  const inspector = page.locator("cpk-web-inspector");
  await expect(inspector.locator('[data-inspector-service="memory"]')).toContainText(
    "Learning status unavailable",
  );
  await expect(
    inspector.getByRole("button", { name: "Retry Learning status", exact: true }),
  ).toBeVisible();
});
