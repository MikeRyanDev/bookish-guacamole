import { fixtureUrl } from "./fixture-url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("completed calls across messages share a compact expandable activity group", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?activity`);
  await page.evaluate(() => document.fonts.ready);
  const group = page.getByRole("button", { name: /8 tool calls/ });
  await expect(group).toBeVisible();
  await expect(page.locator(".starter-tools-tool-call")).toHaveCount(0);
  await group.click();
  await expect(page.locator(".starter-tools-tool-call")).toHaveCount(8);
  const headers = await page.locator(".starter-tools-tool-header").all();
  for (let i = 1; i < headers.length; i++) {
    const a = await headers[i - 1]!.boundingBox();
    const b = await headers[i]!.boundingBox();
    expect(b!.y - (a!.y + a!.height)).toBeLessThanOrEqual(4);
  }
  await group.press("Enter");
  await expect(page.locator(".starter-tools-tool-call")).toHaveCount(0);
});

test("activity disclosure retains exact evidence and choices through remounts", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${fixtureUrl}/?activity`);
  const group = page.getByRole("button", { name: /8 tool calls/ });
  await group.click();
  const bash = page.getByRole("region", { name: "bash tool call" });
  await bash.locator("summary").first().click();
  await bash.getByRole("button", { name: "Copy command", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "node --test src/greet.test.ts",
  );
  await page.getByRole("button", { name: "Toggle long history" }).click();
  const transcript = page.getByLabel("Conversation transcript");
  await transcript.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(group).toHaveCount(0);
  await transcript.evaluate((el) => (el.scrollTop = 0));
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await expect(bash.locator(".starter-tools-shell-command")).toBeVisible();
  await group.click();
  await group.click();
  await expect(bash.locator(".starter-tools-shell-command")).toBeVisible();
});

test("failures, denial and active calls remain visible outside completed groups", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?activity&edge`);
  await expect(page.getByText("Exit 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Denied", { exact: true })).toBeVisible();
  await expect(page.getByText("Running", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /8 tool calls/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("button", { name: "Finish call" }).click();
  await expect(page.getByText("Running", { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "custom_tool tool call" })
      .locator(".starter-tools-tool-status"),
  ).toHaveAttribute("title", "Result received");
});

test("grouped activity is accessible in both themes and at narrow widths", async ({
  page,
}, testInfo) => {
  await page.goto(`${fixtureUrl}/?activity`);
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      const group = page.getByRole("button", { name: /8 tool calls/ });
      await group.focus();
      await page.screenshot({
        animations: "disabled",
        path: testInfo.outputPath(`after-${theme}-${width}-collapsed.png`),
      });
      await group.press("Enter");
      await expect(page.locator(".starter-tools-tool-call")).toHaveCount(8);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        animations: "disabled",
        path: testInfo.outputPath(`after-${theme}-${width}-expanded.png`),
      });
      await page
        .getByRole("region", { name: "patch tool call" })
        .locator("summary.starter-tools-tool-header")
        .click();
      await expect(page.getByLabel("Proposed patch")).toBeVisible();
      await expect
        .poll(async () => {
          const activity = await page
            .getByRole("region", { name: "Completed tool activity" })
            .boundingBox();
          const narrative = await page
            .getByRole("article", { name: "Agent response" })
            .last()
            .boundingBox();
          return narrative!.y - (activity!.y + activity!.height);
        })
        .toBeGreaterThanOrEqual(0);
      await page.screenshot({ path: testInfo.outputPath(`after-${theme}-${width}-detail.png`) });
      await page
        .getByRole("region", { name: "patch tool call" })
        .locator("summary.starter-tools-tool-header")
        .click();
      await group.click();
    }
  }
});

test("expanding activity keeps its control in place in a short transcript viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 420 });
  await page.goto(`${fixtureUrl}/?activity`);
  const group = page.getByRole("button", { name: /8 tool calls/ });
  const before = await group.boundingBox();
  await group.click();
  await expect(page.locator(".starter-tools-tool-call")).toHaveCount(8);
  await page.waitForTimeout(200);
  const after = await group.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(3);
  await page.getByRole("button", { name: "Jump to latest" }).click();
  await page.getByRole("button", { name: "Toggle long history" }).click();
  await expect(page.getByText(/^Additional response 99\./)).toBeVisible();
  const transcript = page.getByLabel("Conversation transcript");
  await expect
    .poll(() => transcript.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
    .toBeLessThan(5);
  await page.getByRole("button", { name: "Toggle long history" }).click();
  await group.click();
  await expect(group).toHaveAttribute("aria-expanded", "false");
});
