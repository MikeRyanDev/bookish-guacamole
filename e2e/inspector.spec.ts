import { expect, test } from "@playwright/test";

test("CopilotKit Inspector opens, exposes agent events, and closes back to the starter", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Web Inspector", exact: true }).click();
  const inspector = page.locator("cpk-web-inspector");
  await expect(inspector.getByRole("button", { name: "Close Web Inspector" })).toBeVisible();
  await inspector.getByRole("button", { name: "AG-UI Events", exact: true }).click();
  await expect(inspector.getByText("AG-UI Events", { exact: true }).first()).toBeVisible();
  await page.screenshot({
    path: "docs/proof/copilotkit-inspector.png",
    fullPage: true,
    animations: "disabled",
  });
  await inspector.getByRole("button", { name: "Close Web Inspector" }).click();
  await expect(inspector.getByRole("button", { name: "Close Web Inspector" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeVisible();
});
