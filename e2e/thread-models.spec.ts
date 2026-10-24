import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("model choices persist per thread and failed saves retain the previous choice", async ({
  page,
}) => {
  process.loadEnvFile(".env");
  const backend = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  const config = await (await page.request.get("/api/config")).json();
  test.skip(config.models.length < 2, "Configure two coding models for selection acceptance.");
  const first = config.models.find((item: { id: string }) => item.id === config.defaultModel);
  const second = config.models.find((item: { id: string }) => item.id !== config.defaultModel);
  const ids = [randomUUID(), randomUUID()];
  const names = ids.map((id) => `Model selection ${id.slice(0, 8)}`);
  for (const [index, id] of ids.entries())
    await backend.createThread({
      threadId: id,
      userId: "local-developer",
      agentId: config.agentId,
      name: names[index]!,
    });
  await page.goto("/");
  const select = async (index: number) => {
    await page.getByRole("link", { name: names[index]!, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`thread=${ids[index]}`));
    await expect(page.getByRole("button", { name: /^Model: / })).toBeEnabled();
  };
  await select(0);
  await page.getByRole("button", { name: `Model: ${first.label}` }).click();
  await page.getByRole("radio", { name: new RegExp(second.label) }).click();
  await expect(page.getByRole("radio", { name: new RegExp(second.label) })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("button", { name: `Model: ${second.label}` })).toBeVisible();
  await select(1);
  await expect(page.getByRole("button", { name: `Model: ${first.label}` })).toBeVisible();
  await page.route("**/api/model?**", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    await route.fulfill({ status: 409, json: { error: "Model save failed. Try again." } });
  });
  await page.getByRole("textbox", { name: "Message your coding agent" }).fill("Keep my draft");
  await page.getByRole("button", { name: `Model: ${first.label}` }).click();
  await page.getByRole("radio", { name: new RegExp(second.label) }).click();
  await expect(page.getByRole("alert")).toHaveText("Model save failed. Try again.");
  await expect(page.getByRole("radio", { name: new RegExp(first.label) })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toHaveValue(
    "Keep my draft",
  );
  await page.unroute("**/api/model?**");
  await select(0);
  await expect(page.getByRole("button", { name: `Model: ${second.label}` })).toBeVisible();
});
