import { expect, test } from "@playwright/test";
import { fixtureUrl } from "./fixture-url";

test("Settings code loads on demand and keeps the dialog usable", async ({ page }) => {
  const loaded: string[] = [];
  page.on("request", (request) => loaded.push(new URL(request.url()).pathname));
  await page.goto(`${fixtureUrl}/settings.html?review=1`);
  expect(loaded.some((path) => path.endsWith("/settings-panel.tsx"))).toBe(false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Connections", exact: true })).toBeVisible();
  expect(loaded.some((path) => path.endsWith("/settings-panel.tsx"))).toBe(true);
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("a slow Settings download leaves the close control available", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/components/settings-panel.tsx*", async (route) => {
    await waiting;
    await route.continue();
  });
  await page.goto(`${fixtureUrl}/settings.html?review=1`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Loading settings…");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  release();
});

test("a failed Settings download offers recovery inside the dialog", async ({ page }) => {
  await page.route("**/components/settings-panel.tsx*", (route) => route.abort());
  await page.goto(`${fixtureUrl}/settings.html?review=1`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not load settings");
  await expect(page.getByRole("button", { name: "Reload app" })).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
