import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixtureUrl } from "./fixture-url";

const source =
  'const greeting: string = "Hello, Ada";\nconsole.log(greeting);\nreturn { greeting };\n';

test("one disclosure reveals exact TypeScript and output, with independent copy actions", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${fixtureUrl}/?typescript`);
  await expect(page.getByLabel("TypeScript source", { exact: true })).toBeHidden();
  await page.locator("summary.tool-header").click();
  expect(await page.getByLabel("TypeScript source", { exact: true }).textContent()).toBe(source);
  await expect(page.getByLabel("Execution output", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy TypeScript", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source);
  await expect(page.getByLabel("Return value", { exact: true })).toContainText(
    '"greeting": "Hello, Ada"',
  );
  await expect(page.getByLabel("Console output", { exact: true })).toHaveText("Hello, Ada");
  await page.getByText("Raw response", { exact: true }).click();
  await page.getByRole("button", { name: "Copy response JSON", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    JSON.stringify({ success: true, result: { greeting: "Hello, Ada" }, logs: ["Hello, Ada"] }),
  );
  await page.getByText("Raw details", { exact: true }).click();
  await expect(page.locator(".tool-arguments pre")).toHaveText(
    JSON.stringify({ typescriptCode: source }),
  );
});

test("execution states distinguish pending, missing, empty, denied, and structured errors", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?typescript`);
  for (const [state, text] of [
    ["running", "Waiting for output"],
    ["partial", "Receiving TypeScript…"],
    ["approval", "Awaiting approval"],
    ["error", "Execution failed"],
    ["denied", "Denied"],
  ]) {
    await page.getByLabel("Fixture state").selectOption(state!);
    await expect(page.getByText(text!, { exact: true })).toBeVisible();
  }
  for (const [state, text] of [
    ["missing", "No result received"],
    ["empty", "No output"],
    ["empty-source", "Empty TypeScript source"],
    ["malformed", "TypeScript source unavailable. Inspect Raw details."],
  ]) {
    await page.getByLabel("Fixture state").selectOption(state!);
    await page.locator("summary.tool-header").click();
    await expect(page.getByText(text!, { exact: true })).toBeVisible();
  }
  await page.getByLabel("Fixture state").selectOption("unsafe");
  await page.locator("summary.tool-header").click();
  await expect(page.getByLabel("Original output", { exact: true })).toHaveText(
    '<script>alert("hello")</script>',
  );
  await expect(page.locator(".typescript-surface script")).toHaveCount(0);
});

test("large evidence, keyboard access, copy failure, and both themes at desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.goto(`${fixtureUrl}/?typescript`);
  await page.getByLabel("Fixture state").selectOption("long");
  await page.locator("summary.tool-header").focus();
  await page.keyboard.press("Enter");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("Denied")),
    });
  });
  await page.getByRole("button", { name: "Copy TypeScript", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Copy failed. Select the text to copy it.");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const sourceBox = page.getByLabel("TypeScript source", { exact: true });
      expect(await sourceBox.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await sourceBox.focus();
      await page.keyboard.press("End");
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}.png`), fullPage: true });
    }
  }
});

test("streamed props preserve a reader's disclosure choice and source identity", async ({
  page,
}) => {
  await page.goto(`${fixtureUrl}/?typescript&lifecycle`);
  await expect(page.getByText("Receiving TypeScript…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Complete arguments" }).click();
  expect(await page.getByLabel("TypeScript source", { exact: true }).textContent()).toBe(source);
  await page
    .getByLabel("TypeScript source", { exact: true })
    .evaluate((el) => el.setAttribute("data-retained", "yes"));
  await page.locator("summary.tool-header").click();
  await page.getByRole("button", { name: "Finish execution" }).click();
  await expect(page.locator(".tool-details")).not.toHaveAttribute("open");
  await page.locator("summary.tool-header").click();
  await expect(page.getByLabel("TypeScript source", { exact: true })).toHaveAttribute(
    "data-retained",
    "yes",
  );
  await expect(page.getByLabel("Execution output", { exact: true })).toBeVisible();
  await expect(page.locator(".tool-status")).toHaveAttribute("title", "Result received");
});

test("structured output keeps numeric literals and escaped text intact", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${fixtureUrl}/?typescript`);
  await page.getByLabel("Fixture state").selectOption("precision");
  await page.locator("summary.tool-header").click();
  const output = await page.getByLabel("Return value", { exact: true }).textContent();
  expect(output).toContain('"id": 9007199254740993');
  expect(output).toContain('"literal": "{ [ , : \\"quoted\\" ] }"');
  expect(output).toContain('"empty": []');
  await expect(page.getByLabel("Console output", { exact: true })).toHaveText("line\nnext");
  await page.getByText("Raw response", { exact: true }).click();
  await page.getByRole("button", { name: "Copy response JSON", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('"id":9007199254740993');
  expect(copied).not.toContain("\n");
});
