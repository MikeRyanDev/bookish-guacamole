import { z } from "zod";
import { expect, test } from "@playwright/test";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { writeFile } from "node:fs/promises";

test("two configured models execute tools in the same persisted conversation", async ({
  page,
}, testInfo) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Opt in: uses the configured provider accounts.");
  test.setTimeout(180000);
  const config = await (await page.request.get("/api/config")).json();
  expect(config.models.length).toBeGreaterThanOrEqual(2);
  await page.goto("/");
  for (const [index, model] of config.models.slice(0, 2).entries()) {
    await page.getByRole("button", { name: /^Model: / }).click();
    await page.getByRole("radio", { name: new RegExp(model.label) }).click();
    await expect(page.getByRole("radio", { name: new RegExp(model.label) })).toBeChecked();
    await page.keyboard.press("Escape");
    await page
      .getByRole("textbox", { name: "Message your coding agent" })
      .fill(
        index === 0
          ? "Run exactly npm test once with bash. Do not change files. Report the actual test result."
          : "Run npm test again NOW as a NEW bash tool call, even though it passed earlier. Do not reuse the previous result. Do not change files. Report the new tool result.",
      );
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    const approval = page.getByRole("region", { name: "Permission request" });
    await expect(approval).toBeVisible({ timeout: 60000 });
    await expect(approval.locator(".shell-command code")).toHaveText("npm test");
    await expect(page.getByRole("button", { name: `Model: ${model.label}` })).toBeDisabled();
    await approval.getByRole("button", { name: "Approve Once" }).click();
    await expect(approval).toBeHidden({ timeout: 60000 });
    await expect(page.getByRole("button", { name: "Stop run" })).toBeHidden({ timeout: 60000 });
    await expect(page.locator(".message.assistant .markdown").last()).toContainText(/pass/i);
    await page.reload();
    await expect(page.getByRole("button", { name: `Model: ${model.label}` })).toBeEnabled();
  }
  const threadId = new URL(page.url()).searchParams.get("thread")!;
  process.loadEnvFile(".env");
  const backend = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  const saved = await backend.getThreadEvents({ threadId });
  expect(saved.decodeErrorRowIds).toEqual([]);
  expect(saved.truncated).toBe(false);
  const sourceSchema = z.object({
    metadata: z.object({ tanstack: z.object({ source: z.object({ model: z.string() }) }) }),
  });
  const observedModels = new Set(
    saved.events.flatMap((event) => {
      const parsed = sourceSchema.safeParse(event);
      return parsed.success ? [parsed.data.metadata.tanstack.source.model] : [];
    }),
  );
  for (const model of config.models.slice(0, 2)) expect(observedModels.has(model.model)).toBe(true);
  expect(
    saved.events.filter(
      (event) => event.type === "TOOL_CALL_START" && event.toolCallName === "bash",
    ),
  ).toHaveLength(2);
  await writeFile(
    testInfo.outputPath("model-selection.json"),
    JSON.stringify({ threadId, models: config.models.slice(0, 2), events: saved }, null, 2),
  );
});
