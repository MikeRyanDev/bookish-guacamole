import { expect, test } from "@playwright/test";

test("session history loads on scroll, bounds rows, and retries a failed page", async ({
  page,
}) => {
  const cursors: string[] = [];
  let fail = true;
  await page.route("**/threads?*", async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor") ?? "0";
    cursors.push(cursor);
    if (cursor === "30" && fail) {
      await route.fulfill({ status: 500, json: { error: "Pagination unavailable" } });
      return;
    }
    const start = Number(cursor);
    await route.fulfill({
      json: {
        threads: Array.from({ length: 30 }, (_, index) => ({
          id: `scroll-session-${start + index}`,
          name: `Scroll session ${start + index}`,
          agentId: "coder",
          createdAt: new Date(Date.UTC(2026, 0, 1) - (start + index) * 1000).toISOString(),
          updatedAt: new Date(Date.UTC(2026, 0, 1) - (start + index) * 1000).toISOString(),
        })),
        nextCursor: start < 90 ? String(start + 30) : null,
      },
    });
  });
  await page.goto("/");
  const history = page.getByRole("navigation", { name: "Conversation history" });
  await expect(history.getByText("Scroll session 0", { exact: true })).toBeVisible();
  await expect(history.getByRole("button", { name: "Load more" })).toHaveCount(0);
  await history.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(history.getByRole("alert")).toHaveText("Could not load more sessions.");
  await page.waitForTimeout(300);
  expect(cursors.filter((cursor) => cursor === "30")).toHaveLength(1);
  fail = false;
  await history.getByRole("button", { name: "Retry" }).click();
  await expect.poll(() => cursors.filter((cursor) => cursor === "30").length).toBe(2);
  for (const cursor of ["60", "90"]) {
    await history.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect.poll(() => cursors.includes(cursor)).toBe(true);
  }
  await expect(async () => {
    await history.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(history.getByText("Scroll session 119", { exact: true })).toBeVisible();
  }).toPass();
  expect(await history.locator(".starter-workspace-session-row").count()).toBeLessThan(40);
  await page.waitForTimeout(300);
  expect(cursors.filter((cursor) => cursor !== "0")).toEqual(["30", "30", "60", "90"]);
  await page.getByRole("textbox", { name: "Search sessions" }).fill("Scroll session 1");
  await expect(history.getByText("Scroll session 1", { exact: true })).toBeVisible();
});

for (const mobile of [false, true]) {
  test(`filtered history fills short pages and supports keyboard navigation (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const cursors: string[] = [];
    await page.route("**/threads?*", async (route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor") ?? "0";
      cursors.push(cursor);
      await route.fulfill({
        json: {
          threads: [
            {
              id: `short-${cursor}`,
              createdAt: new Date(Date.UTC(2026, 0, 1) - Number(cursor) * 1000).toISOString(),
              name: cursor === "2" ? "Needle session" : `Other session ${cursor}`,
              agentId: "coder",
            },
          ],
          nextCursor: Number(cursor) < 2 ? String(Number(cursor) + 1) : null,
        },
      });
    });
    await page.goto("/");
    if (mobile) await page.getByRole("button", { name: "Toggle sessions" }).click();
    const search = page.getByRole("textbox", { name: "Search sessions" });
    await search.fill("Needle");
    const history = page.getByRole("navigation", { name: "Conversation history" });
    const link = history.getByRole("link", { name: "Needle session" });
    await expect(link).toBeVisible();
    expect(cursors.filter((cursor) => cursor !== "0")).toEqual(["1", "2"]);
    await search.press("Tab");
    await expect(history).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    await search.fill("No such session");
    await expect(history.getByText("No matching sessions.")).toBeVisible();
  });
}
