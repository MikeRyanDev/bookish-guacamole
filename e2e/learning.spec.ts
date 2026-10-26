import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockFileDiscovery } from "./mock-file-discovery";

test("assigns a named space, starts Learning, and reviews a proposal with evidence", async ({
  page,
}) => {
  let selection: string | null = null;
  let reviewed = false;
  let started = false;
  const id = "0198a012-a20f-77c0-9e33-8992f18e74a1";
  const proposal = {
    id,
    title: "Test before editing",
    description: "Run focused tests",
    reason: "Repeated corrections",
    operation: "add",
    status: "pending_review",
  };
  await mockFileDiscovery(page, []);
  await page.route("**/api/skills**", (route) =>
    route.fulfill({
      json: {
        revision: "1",
        skills: reviewed
          ? [
              {
                name: "test-first",
                description: "Run focused tests",
                content: "# Test first\n\nRun the tests before editing.",
              },
            ]
          : [],
      },
    }),
  );
  await page.route("**/api/learning**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const body = route.request().method() === "GET" ? undefined : route.request().postDataJSON();
    let result: unknown;
    if (path.endsWith("/spaces"))
      result = { spaces: [{ id: "coding", name: "Coding lessons" }], nextCursor: null };
    else if (path.endsWith("/review")) {
      expect(body).toEqual({ containerId: "coding", action: "approve" });
      reviewed = true;
      result = { status: "approved" };
    } else if (path.endsWith("/evidence"))
      result = {
        sources: [
          {
            id: "thread",
            label: "Fix greeting tests",
            available: true,
            unavailable: null,
            items: [{ label: "user", content: "Please run the tests first." }],
          },
        ],
      };
    else if (path.endsWith(`/candidates/${id}`))
      result = {
        ...proposal,
        status: reviewed ? "approved" : "pending_review",
        files: [{ path: "SKILL.md", content: "# Test first\n\nRun the tests before editing." }],
        supportingInsights: [
          {
            id,
            alias: "test-first",
            impact: "Fewer regressions",
            statement: "Tests catch mistakes",
          },
        ],
      };
    else if (path.endsWith("/candidates")) result = { candidates: reviewed ? [] : [proposal] };
    else if (path.endsWith("/runs")) {
      if (body) {
        expect(body).toEqual({ containerId: "coding" });
        started = true;
      }
      const run = {
        id,
        status: "succeeded",
        candidateCount: 1,
        createdAt: "2026-10-24T00:00:00Z",
        failureCode: null,
      };
      result = body ? { run } : { runs: started ? [run] : [] };
    } else {
      if (body) selection = body.containerId;
      result = {
        containerId: selection,
        inherited: false,
        space: selection ? { id: selection, name: "Coding lessons" } : null,
      };
    }
    await route.fulfill({ json: result });
  });
  await page.goto(
    `${process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174"}/inspector.html`,
  );
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("coding");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Learning space saved.", { exact: true })).toBeVisible();
  await expect(page.getByText("Uses saved conversations in Coding lessons.")).toBeVisible();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.getByText("Learning finished")).toBeVisible();
  await page.getByRole("button", { name: "Test before editing" }).click();
  await expect(page.getByText("Run the tests before editing.")).toBeVisible();
  await page.getByText("Supporting evidence", { exact: true }).click();
  await expect(page.getByText("Please run the tests first.")).toBeVisible();
  await page.getByRole("button", { name: "Approve skill", exact: true }).click();
  await expect(page.getByText("Approved. Published to Coding lessons.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to skills" })).not.toBeVisible();
  await page.getByRole("button", { name: /Published skills/ }).click();
  await page.getByText("test-first", { exact: true }).click();
  await expect(page.getByText("Run the tests before editing.")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".starter-learning-learning-dialog").analyze())
      .violations,
  ).toEqual([]);
});

test("mobile assignment survives a failed save, cancellation, reload, and workspace switching", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `${process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174"}/learning.html?theme=dark&failure=save`,
  );
  await page
    .locator(".starter-workspace-workspace-header")
    .getByRole("button", { name: "Learning", exact: true })
    .click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("coding");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByLabel("Learning space", { exact: true })).toHaveValue("coding");
  await page.screenshot({ path: ".impeccable/review/learning-mobile-error.png", fullPage: true });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Learning space saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change space" }).click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("writing");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Coding lessons", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close Learning" }).click();
  await page.getByLabel("Workspace", { exact: true }).selectOption("second");
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.getByLabel("Learning space", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Close Learning" }).click();
  await page.getByLabel("Workspace", { exact: true }).selectOption("default");
  await page.reload();
  await page
    .locator(".starter-workspace-workspace-header")
    .getByRole("button", { name: "Learning", exact: true })
    .click();
  await expect(page.getByText("Coding lessons", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.getByText("Learning queued")).toBeVisible();
  await expect(page.getByRole("button", { name: "Learn", exact: true })).toBeDisabled();
  await page.screenshot({ path: ".impeccable/review/learning-mobile-running.png", fullPage: true });
  await expect(page.getByText("Learning finished")).toBeVisible();
  await page.getByRole("button", { name: "Test before editing" }).click();
  await page.getByText("Supporting evidence", { exact: true }).click();
  await expect(
    page.getByText("Please run the tests first so we know which behavior is broken."),
  ).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/learning-mobile-review.png", fullPage: true });
  await page.getByRole("button", { name: "Reject skill", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/learning-mobile-decision.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reject skill", exact: true }).click();
  await expect(page.getByText("Rejected. This proposal was not published.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include(".starter-workspace-workspace").analyze()).violations,
  ).toEqual([]);
});

test("a failed review preserves the proposal and recovers without publishing automatically", async ({
  page,
}) => {
  await page.goto(
    `${process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174"}/learning.html?failure=review`,
  );
  await page
    .locator(".starter-workspace-workspace-header")
    .getByRole("button", { name: "Learning", exact: true })
    .click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("coding");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.getByText("Learning finished")).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/learning-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Test before editing" }).click();
  await page.getByRole("button", { name: "Approve skill", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button", { name: "Approve skill", exact: true })).toBeEnabled();
  await page.getByText("Supporting evidence", { exact: true }).click();
  await expect(
    page.getByText("Please run the tests first so we know which behavior is broken."),
  ).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/learning-desktop-review.png", fullPage: true });
  await page.getByRole("button", { name: "Approve skill", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/learning-desktop-decision.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Approve skill", exact: true }).click();
  await expect(page.getByText("Approved. Published to Coding lessons.")).toBeVisible();
});

test("an uncertain review cannot repeat until the proposal state refreshes", async ({ page }) => {
  await page.goto(
    `${process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174"}/learning.html?failure=review-state`,
  );
  await page
    .locator(".starter-workspace-workspace-header")
    .getByRole("button", { name: "Learning", exact: true })
    .click();
  await page.getByLabel("Learning space", { exact: true }).selectOption("coding");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.getByText("Learning finished")).toBeVisible();
  await page.getByRole("button", { name: "Test before editing" }).click();
  await page.getByRole("button", { name: "Approve skill", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve skill", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve skill", exact: true })).toBeEnabled();
});

for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test(`Learning controls support ${theme} at ${width}px with reduced motion`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(
        `${process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174"}/learning.html?theme=${theme}`,
      );
      await page
        .locator(".starter-workspace-workspace-header")
        .getByRole("button", { name: "Learning", exact: true })
        .click();
      const choice = page.getByLabel("Learning space", { exact: true });
      await choice.selectOption("coding");
      await choice.focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Save", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByText("Learning space saved.")).toBeVisible();
      await page.getByRole("button", { name: "Learn", exact: true }).click();
      await expect(page.getByRole("button", { name: "Test before editing" })).toBeVisible();
      await page.getByRole("button", { name: "Test before editing" }).click();
      await page.getByRole("button", { name: "Approve skill", exact: true }).click();
      await expect(page.getByText("Approved. Published to Coding lessons.")).toBeVisible();
      if (width === 390) await page.getByRole("button", { name: "Back to skills" }).click();
      await page.getByRole("button", { name: "Published skills" }).click();
      await page.getByText("test-first", { exact: true }).click();
      await expect(
        page.getByText(
          "Run the focused tests before editing. After the change, run them again and report the result.",
        ),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).include(".starter-learning-learning-dialog").analyze())
          .violations,
      ).toEqual([]);
    });
  }
}
