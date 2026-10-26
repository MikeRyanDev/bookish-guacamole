import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("the selected model loads a learned Skill, executes approved tests, and restores without duplicate tools", async ({
  page,
}) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Opt in: this uses the configured provider account.");
  test.setTimeout(180_000);
  const modelConfig = await (await page.request.get("/api/config")).json();
  const configuredModel = modelConfig.models.find(
    (model: { id: string }) => model.id === modelConfig.defaultModel,
  );
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message your coding agent" })
    .fill(
      "Inspect greet.js and its tests. Explain how blank and padded names are handled. Apply any relevant learned Skill. Run npm test, then run npm test once more as a separate tool call. Do not edit files. Report both actual test results.",
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page).toHaveURL(/thread=/);
  let approvals = 0;
  for (let attempt = 0; attempt < 150; attempt++) {
    const permission = page.getByRole("region", { name: "Permission request" });
    if (await permission.isVisible()) {
      await expect(permission.locator(".starter-tools-shell-command code")).toHaveText("npm test");
      if (approvals === 0)
        await page.screenshot({
          path: "docs/proof/live-bash-approval.png",
          animations: "disabled",
        });
      await permission.getByRole("button", { name: "Approve Once" }).click();
      approvals++;
    }
    if (
      approvals >= 2 &&
      (await page
        .locator(".starter-transcript-message.assistant .starter-shared-markdown")
        .last()
        .isVisible()) &&
      !(await page.getByRole("button", { name: "Stop run" }).isVisible())
    )
      break;
    await page.waitForTimeout(500);
  }
  expect(approvals).toBe(2);
  await expect(
    page.locator(".starter-transcript-message.assistant .starter-shared-markdown").last(),
  ).toContainText(/pass/i);
  const url = page.url();
  const threadId = new URL(url).searchParams.get("thread");
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
  const calls = saved.events.filter((event) => event.type === "TOOL_CALL_START");
  expect(calls.filter((event) => event.toolCallName === "load_skill")).toHaveLength(1);
  expect(calls.filter((event) => event.toolCallName === "bash")).toHaveLength(2);
  expect(new Set(calls.map((event) => event.toolCallId)).size).toBe(calls.length);
  expect(saved.events.some((event) => event.type === "MESSAGES_SNAPSHOT")).toBe(false);
  const toolCount = calls.length;
  const finalText = await page
    .locator(".starter-transcript-message.assistant .starter-shared-markdown")
    .last()
    .innerText();
  await page.reload();
  await expect(
    page.locator(".starter-transcript-message.assistant .starter-shared-markdown").last(),
  ).toHaveText(finalText);
  const reloaded = await intelligence.getThreadEvents({ threadId: threadId! });
  expect(reloaded.events.filter((event) => event.type === "TOOL_CALL_START")).toHaveLength(
    toolCount,
  );
  await writeFile(".data/model-browser-events.json", JSON.stringify(saved));
  await mkdir("docs/proof", { recursive: true });
  await page.screenshot({
    path: "docs/proof/luna-light.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await page.screenshot({
    path: "docs/proof/luna-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  await writeFile(
    ".data/model-browser-proof.json",
    JSON.stringify({ url, approvals, toolCount, model: configuredModel }),
  );
});
