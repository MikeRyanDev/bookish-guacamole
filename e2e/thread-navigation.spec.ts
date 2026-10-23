import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";

test("thread selection keeps saved session nodes and positions stable", async ({ page }) => {
  process.loadEnvFile(".env");
  const backend = new CopilotKitIntelligence({
    apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
    apiUrl: process.env.INTELLIGENCE_API_URL!,
    wsUrl: process.env.INTELLIGENCE_GATEWAY_WS_URL!,
  });
  // Seed real empty sessions so a fresh starter does not need earlier model conversations.
  const response = await page.request.get("/api/config");
  const config = await response.json();
  for (const label of ["first", "second"]) {
    await backend.createThread({
      threadId: randomUUID(),
      userId: "local-developer",
      agentId: config.agentId,
      name: `Navigation proof ${label}`,
    });
  }
  await page.goto("/");
  const history = page.getByRole("navigation", { name: "Conversation history" });
  const rows = history.locator(".session-row").filter({ hasNotText: "New session" });
  await expect.poll(() => rows.count()).toBeGreaterThan(1);
  await page.waitForTimeout(300);
  await history.evaluate((element) => {
    const state = {
      removed: 0,
      nodes: [...element.querySelectorAll(".session-row")].filter(
        (row) => row.textContent !== "New session",
      ),
    };
    Object.assign(window, { navigationProof: state });
    new MutationObserver((records) => {
      for (const record of records)
        for (const removed of record.removedNodes)
          if (state.nodes.includes(removed as Element)) state.removed++;
    }).observe(element, { childList: true, subtree: true });
  });
  const before = await rows.nth(0).boundingBox();
  await rows.nth(0).click();
  await expect(page).toHaveURL(/thread=/);
  await expect(rows.nth(0)).toHaveAttribute("aria-current", "page");
  expect((await rows.nth(0).boundingBox())?.y).toBe(before?.y);
  await rows.nth(1).click();
  await expect(rows.nth(1)).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(rows.nth(0)).toHaveAttribute("aria-current", "page");
  expect(
    await page.evaluate(
      () => (window as unknown as { navigationProof: { removed: number } }).navigationProof.removed,
    ),
  ).toBe(0);
});
