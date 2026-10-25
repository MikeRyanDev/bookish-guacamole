import { test, expect } from "@playwright/test";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";

test("usage keeps unknown cost explicit and Undo requires a reviewed revision", async ({
  page,
}) => {
  const action = {
    available: true,
    revision: "a".repeat(64),
    files: ["src/example.ts"],
    conflicts: [],
    reason: null,
  };
  await page.route("**/api/history?*", (route) =>
    route.fulfill({
      json: {
        undo: action,
        redo: {
          ...action,
          available: false,
          revision: null,
          files: [],
          reason: "Nothing to redo.",
        },
      },
    }),
  );
  await page.route("**/api/execution/status?*", (route) =>
    route.fulfill({
      json: {
        usage: {
          calls: 2,
          reportedCalls: 2,
          inputTokens: 1000,
          outputTokens: 100,
          totalTokens: 1100,
          knownCost: 0,
          unpricedCalls: 2,
          contextTokens: 900,
        },
        context: { status: "ready", before: null, after: null, error: null },
        recovery: null,
        status: "idle",
        pending: 0,
      },
    }),
  );
  await page.route("**/api/execution?*", (route) =>
    route.fulfill({
      json: {
        revision: null,
        settings: {
          autoCompact: true,
          compactAt: 75,
          tokenLimit: null,
          costLimit: null,
          maxRetries: 3,
          codeMode: false,
          models: { first: { contextWindow: 32768, prices: null } },
        },
      },
    }),
  );
  await page.goto(`${fixture}/capabilities.html`);
  await page.getByRole("button", { name: "Usage", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Conversation usage" })).toContainText("Unknown");
  await expect(page.getByRole("dialog", { name: "Conversation usage" })).toContainText("1,100");
  await page.getByRole("button", { name: "Close conversation usage", exact: true }).click();
  await page.getByRole("button", { name: "Undo last turn", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Undo last turn?", exact: true });
  await expect(review).toContainText("src/example.ts");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo last turn", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Undo last turn", exact: true }).click();
  await review.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(page.getByTestId("history-result")).toHaveText(`undo:${"a".repeat(64)}`);
});
