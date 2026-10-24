import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("each thread keeps its own planning and permission choices through navigation and reload", async ({
  page,
}) => {
  process.loadEnvFile(".env");
  const backend = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  const config = await (await page.request.get("/api/config")).json();
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const names = ids.map(
    (id, index) => `Permissions ${["YOLO", "Plan", "Required"][index]} ${id.slice(0, 8)}`,
  );
  for (const [index, id] of ids.entries())
    await backend.createThread({
      threadId: id,
      userId: "local-developer",
      agentId: config.agentId,
      name: names[index]!,
    });
  await page.goto("/");
  const plan = page.getByRole("button", { name: "Plan mode", exact: true });
  const select = async (index: number) => {
    await page.getByRole("link", { name: names[index]!, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`thread=${ids[index]}`));
    await expect(plan).toBeEnabled();
  };
  await select(0);
  await page.getByRole("button", { name: "Require permissions", exact: true }).click();
  await page.getByRole("radio", { name: "YOLO", exact: true }).click();
  await expect(page.getByRole("button", { name: "YOLO", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await select(1);
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Require permissions", exact: true }),
  ).toBeVisible();
  await plan.click();
  await expect(plan).toHaveAttribute("aria-pressed", "true");
  await select(2);
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Require permissions", exact: true }),
  ).toBeVisible();
  for (const index of [0, 1, 2]) {
    await select(index);
    await page.reload();
    await expect(plan).toHaveAttribute("aria-pressed", index === 1 ? "true" : "false");
    await expect(
      page.getByRole("button", { name: index === 0 ? "YOLO" : "Require permissions", exact: true }),
    ).toBeVisible();
  }
  // A late save from the old thread must not change the newly selected thread.
  await select(1);
  await page.route("**/api/approval-mode?**", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ response });
  });
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/api/approval-mode") && response.request().method() === "PUT",
  );
  await plan.click();
  await select(0);
  await saved;
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "YOLO", exact: true })).toBeVisible();
  await page.unroute("**/api/approval-mode?**");
  await select(1);
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await plan.click();
  await expect(plan).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await expect(plan).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Require permissions", exact: true }),
  ).toBeVisible();
});
