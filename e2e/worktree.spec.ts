import { expect, test } from "@playwright/test";

const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
test("managed fixture loads this checkout and refuses unauthenticated identity access", async ({
  page,
  request,
}) => {
  test.skip(!process.env.STARTER_WORKTREE_ROOT, "Run wt check for managed worktree coverage");
  const response = await request.get(`${fixture}/__worktree`);
  expect(response.status()).toBe(401);
  const foreign = await request.get(`${fixture}/__worktree`, {
    headers: {
      origin: "https://example.com",
      authorization: `Bearer ${process.env.STARTER_WORKTREE_TOKEN}`,
    },
  });
  expect(foreign.status()).toBe(403);
  await page.goto(`${fixture}/`);
  await expect(page.locator("body")).not.toBeEmpty();
  expect((await page.request.get(`${fixture}/`)).status()).toBe(200);
});

test("managed connected app loads the isolated workspace", async ({ page }) => {
  test.skip(
    process.env.STARTER_WORKTREE_MODE !== "connected",
    "Connected acceptance requires existing local backend configuration",
  );
  await page.goto(process.env.FILE_VIEWER_APP_URL!);
  await expect(page.getByRole("textbox", { name: "Message your coding agent" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
});
