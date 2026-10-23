import { test, expect } from "@playwright/test";
import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

/** Uses the same backend as the browser; no transcript fixtures stand in for persisted events. */
function backend() {
  process.loadEnvFile(".env");
  return new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
}

test("rejecting a browser permission prevents a real Luna write and survives reload", async ({
  page,
}) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Uses the configured OpenAI account.");
  test.setTimeout(90000);
  const filename = `rejected-browser-${Date.now()}.txt`;
  await page.goto("/");
  const config = await (await page.request.get("/api/config")).json();
  await page
    .getByRole("textbox", { name: "Message your coding agent" })
    .fill(
      `Use write_file to create ${filename} containing "permission proof". Do not use shell tools. If permission is denied, stop and report the refusal without retrying.`,
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const permission = page.getByRole("region", { name: "Permission request" });
  await expect(permission).toBeVisible({ timeout: 45000 });
  await expect(permission).toContainText(filename);
  await permission.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(permission).toHaveCount(0);
  await expect(page.locator(".message.assistant .markdown").last()).toContainText(
    /denied|refus|not.*creat/i,
    { timeout: 45000 },
  );
  await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0);
  await expect(access(resolve(config.workspace, filename))).rejects.toThrow();
  const threadId = new URL(page.url()).searchParams.get("thread")!;
  const saved = await backend().getThreadEvents({ threadId });
  expect(saved.decodeErrorRowIds).toEqual([]);
  expect(saved.truncated).toBe(false);
  expect(JSON.stringify(saved.events)).toContain("The user denied this tool call");
  await page.reload();
  await expect(page.locator(".message.assistant .markdown").last()).toContainText(
    /denied|refus|not.*creat/i,
  );
  await writeFile(
    ".data/browser-rejection-proof.json",
    JSON.stringify({ threadId, filename, events: saved.events }),
  );
});

test("stopping a streaming Luna run records cancellation in Intelligence", async ({ page }) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Uses the configured OpenAI account.");
  test.setTimeout(90000);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Message your coding agent" })
    .fill(
      "Write a detailed 5000-word guide to TypeScript type inference. Start the answer now, do not use tools or inspect files.",
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.assistant .markdown").last()).not.toBeEmpty({
    timeout: 45000,
  });
  await expect(page.getByRole("button", { name: "Change workspace" })).toBeDisabled();
  await expect(page.locator('.session-row[aria-disabled="true"]').first()).toBeVisible();
  await page.getByRole("button", { name: "Stop run" }).click();
  await expect(page.getByRole("button", { name: "Change workspace" })).toBeEnabled();
  await expect(page.locator('.session-row[aria-disabled="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0);
  const threadId = new URL(page.url()).searchParams.get("thread")!;
  const intelligence = backend();
  await expect
    .poll(
      async () => {
        const saved = await intelligence.getThreadEvents({ threadId });
        return saved.events
          .filter((event) => event.type === "RUN_FINISHED")
          .map((event) => {
            const outcome = event.outcome;
            return typeof outcome === "object" && outcome !== null && "type" in outcome
              ? outcome.type
              : undefined;
          });
      },
      { timeout: 15000 },
    )
    .toContain("cancelled");
  const saved = await intelligence.getThreadEvents({ threadId });
  expect(saved.decodeErrorRowIds).toEqual([]);
  await writeFile(
    ".data/browser-cancellation-proof.json",
    JSON.stringify({ threadId, events: saved.events }),
  );
  await page.reload();
  await expect(page.locator(".message.assistant .markdown").last()).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0);
});
