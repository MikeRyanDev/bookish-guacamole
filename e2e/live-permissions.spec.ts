import { test, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("native approvals, remembered scope, reload, and YOLO cross the real Intelligence bridge", async ({
  page,
}) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Opt in to the configured local model account.");
  test.setTimeout(180000);
  const modelConfig = await (await page.request.get("/api/config")).json();
  const configuredModel = modelConfig.models.find(
    (model: { id: string }) => model.id === modelConfig.defaultModel,
  );
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Require permissions" })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Message your coding agent" });
  await input.fill(
    "Run exactly npm test once with bash in this workspace. Do not edit files. Report the actual result.",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const permission = page.getByRole("region", { name: "Permission request" });
  await expect(permission).toBeVisible({ timeout: 60000 });
  await expect(permission.locator(".shell-command code")).toHaveText("npm test");
  await permission.getByRole("button", { name: "Always Approve" }).click();
  await expect(permission.getByText("Allow in all workspace conversations:")).toBeVisible();
  await permission.getByRole("button", { name: "Approve and Save" }).click();
  await expect(permission).toBeHidden({ timeout: 60000 });
  await expect(page.getByRole("button", { name: "Stop run" })).toBeHidden({ timeout: 60000 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Permissions", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove permission for bash npm test" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await input.fill(
    "Run exactly npm test once again as a new bash tool call. Do not edit files. Report its actual result.",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop run" })).toBeHidden({ timeout: 60000 });
  await expect(permission).toBeHidden();
  const url = page.url();
  const threadId = new URL(url).searchParams.get("thread")!;
  await page.reload();
  await expect(page.getByRole("button", { name: "Require permissions" })).toBeVisible();
  await page.getByRole("button", { name: "Require permissions" }).click();
  await page.getByRole("radio", { name: /YOLO/ }).click();
  await expect(page.getByRole("button", { name: "YOLO" })).toBeVisible();
  await page.keyboard.press("Escape");
  const plan = page.getByRole("button", { name: "Plan mode", exact: true });
  await plan.click();
  await expect(plan).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(plan).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "YOLO", exact: true })).toBeVisible();
  await plan.click();
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await input.fill(
    "Run exactly printf permissions-yolo with bash. Do not edit files. Report the output.",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop run" })).toBeHidden({ timeout: 60000 });
  await expect(permission).toBeHidden();
  await page.getByRole("button", { name: "YOLO" }).click();
  await page.getByRole("radio", { name: /Require permissions/ }).click();
  await expect(page.getByRole("button", { name: "Require permissions" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Permissions", exact: true }).click();
  await page.getByRole("button", { name: "Remove permission for bash npm test" }).click();
  await expect(page.getByText("No saved rules.")).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
  process.loadEnvFile(".env");
  const intelligence = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  const events = await intelligence.getThreadEvents({ threadId });
  expect(events.decodeErrorRowIds).toEqual([]);
  expect(events.truncated).toBe(false);
  const calls = events.events.filter(
    (e) => e.type === "TOOL_CALL_START" && e.toolCallName === "bash",
  );
  expect(calls).toHaveLength(3);
  expect(new Set(calls.map((e) => e.toolCallId)).size).toBe(3);
  await page.reload();
  await expect(page.getByRole("button", { name: "Require permissions" })).toBeVisible();
  const reloaded = await intelligence.getThreadEvents({ threadId });
  expect(
    reloaded.events.filter((e) => e.type === "TOOL_CALL_START" && e.toolCallName === "bash"),
  ).toHaveLength(3);
  await mkdir(".data", { recursive: true });
  await writeFile(
    ".data/live-permissions-proof.json",
    JSON.stringify({
      url,
      threadId,
      bashCalls: 3,
      events: events.events.length,
      model: configuredModel,
    }),
  );
  await page.screenshot({ path: ".data/live-permissions.png", fullPage: true });
});
