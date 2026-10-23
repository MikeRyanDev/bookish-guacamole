import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("a newly published Learning Skill reaches the next browser turn without restart", async ({
  page,
}) => {
  test.skip(
    process.env.LIVE_LEARNING !== "1",
    "Requires the installed Learning publication proof.",
  );
  test.setTimeout(120_000);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message your coding agent" })
    .fill(
      "Plan how to expand regression coverage for behavior that is already implemented. Apply the relevant learned procedure from your available Skills. Explain the baseline, test-only change, and final verification steps. Do not run commands or change files in this turn.",
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page).toHaveURL(/thread=/);
  await expect(page.locator(".message.assistant .markdown").last()).toContainText(/baseline/i, {
    timeout: 90_000,
  });
  await expect(page.getByRole("button", { name: "Stop run" })).not.toBeVisible({ timeout: 90_000 });
  const threadId = new URL(page.url()).searchParams.get("thread");
  expect(threadId).toBeTruthy();
  process.loadEnvFile(".env");
  const intelligence = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  const saved = await intelligence.getThreadEvents({ threadId: threadId! });
  expect(saved.decodeErrorRowIds).toEqual([]);
  expect(saved.truncated).toBe(false);
  const loads = saved.events.filter(
    (event) => event.type === "TOOL_CALL_START" && event.toolCallName === "copilotkit_load_skill",
  );
  expect(loads.length).toBeGreaterThan(0);
  const ids = new Set(loads.map((event) => event.toolCallId));
  const args = saved.events
    .filter((event) => event.type === "TOOL_CALL_ARGS" && ids.has(event.toolCallId))
    .map((event) => event.delta)
    .join("");
  expect(args).toContain("regression-only-coverage");
  expect(
    saved.events.some(
      (event) =>
        event.type === "TOOL_CALL_START" &&
        typeof event.toolCallName === "string" &&
        ["bash", "apply_patch"].includes(event.toolCallName),
    ),
  ).toBe(false);
  const answer = await page.locator(".message.assistant .markdown").last().innerText();
  await page.reload();
  await expect(page.locator(".message.assistant .markdown").last()).toHaveText(answer);
  await page.screenshot({
    path: "docs/proof/learned-skill-refresh.png",
    fullPage: true,
    animations: "disabled",
  });
  await writeFile(
    ".data/flue2-browser-learning-proof.json",
    JSON.stringify(
      { threadId, skill: "regression-only-coverage", model: "gpt-6-luna", answer, events: saved },
      null,
      2,
    ),
  );
});
