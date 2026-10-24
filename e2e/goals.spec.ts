import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

for (const theme of ["light", "dark"] as const) {
  test(`Goal composer preserves drafts and keyboard access in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("starter-theme", value), theme);
    await page.goto("/");
    const message = page.getByRole("textbox", { name: "Message your coding agent" });
    await message.fill("Inspect the project and verify its tests");
    await page.getByRole("button", { name: "Set a goal", exact: true }).click();
    const objective = page.getByRole("textbox", { name: "Goal objective" });
    await expect(objective).toHaveValue("Inspect the project and verify its tests");
    await expect(objective).toBeFocused();
    await expect(page.getByRole("button", { name: "Start goal", exact: true })).toBeEnabled();
    await expect(page.getByText(/Keeps working for up to 20 rounds/)).toBeVisible();
    await objective.fill("");
    await expect(page.getByRole("button", { name: "Start goal", exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole("button", { name: "Switch to message" }).click();
    await expect(message).toBeFocused();
  });
}

test("live Goal runs with approval and persists its completion and evidence", async ({ page }) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Opt in to configured model use.");
  test.setTimeout(180_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Set a goal", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Goal objective" })
    .fill(
      "Read greet.js and its tests. Run npm test once and explain the actual result. Do not edit any files. When you have reported the passing test result, this goal is complete.",
    );
  await page.getByRole("button", { name: "Start goal", exact: true }).click();
  await expect(page.locator(".goal-status")).toBeVisible();
  const permission = page.getByRole("region", { name: "Permission request" });
  await expect(permission).toBeVisible({ timeout: 60_000 });
  await expect(permission.locator(".shell-command code")).toHaveText("npm test");
  await permission.getByRole("button", { name: "Allow once" }).click();
  await expect(page.getByRole("button", { name: "Stop run", exact: true })).toBeHidden({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "Resume goal", exact: true }).click();
  await expect(page.locator(".goal-status")).toContainText("Complete · agent assessed", {
    timeout: 60_000,
  });
  const url = page.url();
  const threadId = new URL(url).searchParams.get("thread")!;
  await page.reload();
  await expect(page.locator(".goal-status")).toContainText("Complete · agent assessed", {
    timeout: 30_000,
  });
  await expect(page.locator(".message.assistant .markdown").last()).toContainText(/pass/i);
  process.loadEnvFile(".env");
  const intelligence = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  const saved = await intelligence.getThreadEvents({ threadId });
  expect(saved.decodeErrorRowIds).toEqual([]);
  expect(saved.truncated).toBe(false);
  expect(
    saved.events.some(
      (event) => event.type === "STATE_SNAPSHOT" && JSON.stringify(event).includes('"met"'),
    ),
  ).toBe(true);
  expect(
    saved.events.some((event) => event.type === "TOOL_CALL_START" && event.toolCallName === "bash"),
  ).toBe(true);
  await mkdir(".data/goals", { recursive: true });
  await writeFile(".data/goals/live-proof.json", JSON.stringify({ threadId, url, events: saved }));
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    await page.screenshot({ path: `.data/goals/${theme}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `.data/goals/${theme}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 960 });
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`long Goal disclosure keeps composer and controls reachable in ${theme}`, async ({
    page,
  }) => {
    const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
    await page.goto(`${fixture}/goal.html?long`);
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    await page.setViewportSize({ width: 390, height: 844 });
    const summary = page.locator(".goal-status summary");
    await expect(summary).toHaveCSS("cursor", "pointer");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".goal-status details")).toHaveAttribute("open", "");
    await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeInViewport();
    await summary.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Resume goal" }).click();
    await expect(page.locator(".goal-status")).toContainText("Ready to resume");
    await page.getByRole("button", { name: "Stop goal" }).click();
    await expect(page.locator(".goal-status")).toContainText("Stopped");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
