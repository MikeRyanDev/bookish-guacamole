import { expect, test } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("Luna patch approval previews the exact change, waits for consent, and persists after reload", async ({
  page,
}) => {
  test.skip(process.env.LIVE_MODEL !== "1", "Uses the configured OpenAI account.");
  test.setTimeout(120_000);
  await mkdir(".data/patch-proof", { recursive: true });
  const folder = await mkdtemp(resolve(".data/patch-proof/run-"));
  const filename = join(folder, "greeting.txt");
  await writeFile(filename, "Hello before approval.\n");
  await page.goto("/");
  await page.getByRole("button", { name: "Change workspace" }).click();
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Workspace name" })
    .fill(`Patch proof ${folder.split("/").at(-1)}`);
  await page.getByRole("radio", { name: "Open existing folder" }).check();
  await page.getByRole("textbox", { name: "Existing folder path" }).fill(folder);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("button", { name: "greeting.txt", exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message your coding agent" })
    .fill(
      'Read greeting.txt, then use the patch tool to replace its only line "Hello before approval." with "Hello after approval.". Use patch, not write_file or bash. After the patch succeeds, say "Patch complete." Do not make other changes.',
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const permission = page.getByRole("region", { name: "Permission request" });
  await expect(permission.getByLabel("Proposed patch")).toContainText("+Hello after approval.", {
    timeout: 60000,
  });
  await expect(permission.getByLabel("Proposed patch")).toContainText("-Hello before approval.");
  await expect(page.getByRole("region", { name: "patch tool call", exact: true })).toHaveCount(1);
  await expect(permission.getByText("Approval required", { exact: true })).toBeVisible();
  expect(await readFile(filename, "utf8")).toBe("Hello before approval.\n");
  await page.screenshot({ path: "docs/proof/live-patch-approval.png", animations: "disabled" });
  await permission.getByRole("button", { name: "Approve Once", exact: true }).click();
  await expect(permission).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0, { timeout: 45000 });
  expect(await readFile(filename, "utf8")).toBe("Hello after approval.\n");
  const finalText = await page.locator(".message.assistant .markdown").last().innerText();
  expect(finalText).toContain("Patch complete");
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
  expect(
    saved.events.filter(
      (event) => event.type === "TOOL_CALL_START" && event.toolCallName === "patch",
    ),
  ).toHaveLength(1);
  await page.reload();
  await expect(page.locator(".message.assistant .markdown").last()).toHaveText(finalText);
  await expect(page.getByRole("region", { name: "patch tool call", exact: true })).toHaveCount(1);
  expect(await readFile(filename, "utf8")).toBe("Hello after approval.\n");
  const replay = await backend.getThreadEvents({ threadId });
  expect(
    replay.events.filter(
      (event) => event.type === "TOOL_CALL_START" && event.toolCallName === "patch",
    ),
  ).toHaveLength(1);
  await writeFile(
    ".data/new-live-patch-proof.json",
    JSON.stringify({ threadId, folder, eventCount: saved.events.length, finalText }),
  );
});
