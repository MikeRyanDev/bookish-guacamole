import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const origin = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/skills", (route) => route.fulfill({ json: { skills: [] } }));
  await page.route("**/api/workspace/files?*", (route) =>
    route.fulfill({
      json: {
        files: ["z.txt", "a.html", "src/z.ts", "src/nested/a.ts", "assets/icon.png", "gone.ts"],
        truncated: false,
        git: {
          available: true,
          entries: {
            "src/z.ts": " M",
            "src/nested/a.ts": "A ",
            "assets/icon.png": "??",
            "gone.ts": "D ",
          },
        },
      },
    }),
  );
});
test("nested tree sorts folders first, starts collapsed, and supports keyboard and search", async ({
  page,
}) => {
  await page.goto(`${origin}/inspector.html`);
  const tree = page.getByRole("tree", { name: "Workspace files" });
  await expect(tree.getByRole("treeitem")).toHaveCount(5);
  await expect(tree.getByRole("treeitem").first()).toContainText("assets");
  await expect(page.getByRole("button", { name: "Open src/z.ts", exact: true })).toHaveCount(0);
  await tree.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Open src/z.ts", exact: true })).toBeVisible();
  await expect(tree.locator('[data-path="src"]')).toHaveAttribute("data-git-status", "modified");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Open src/nested/a.ts", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search files" }).fill("icon");
  await expect(
    page.getByRole("button", { name: "Open assets/icon.png", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear file search" }).click();
  await expect(tree.locator('[data-path="assets"]')).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Open gone.ts", exact: true })).toBeDisabled();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    expect((await new AxeBuilder({ page }).include(".inspector").analyze()).violations).toEqual([]);
    await page.getByRole("tree").focus();
    await page.screenshot({ path: `docs/proof/html-tree-${theme}.png`, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).include(".inspector").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/proof/html-tree-mobile-${theme}.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 960 });
  }
});
test("HTML runs unchanged inside a sandbox without parent access or navigation privileges", async ({
  page,
}) => {
  const html = `<!doctype html><html><head><style>h1 { color: rgb(120, 30, 50) }</style></head><body>
  <h1>Interactive document</h1><button id="counter">Count 0</button><output id="isolation"></output>
  <button id="escape">Try popup and form</button><output id="popup"></output>
  <form id="form" action="${origin}/blocked-preview/form"><input name="value" value="blocked"></form>
  <script>
    document.getElementById('escape').onclick = () => {
      document.getElementById('popup').textContent = window.open('${origin}/blocked-preview/popup') === null ? 'blocked' : 'opened';
      document.getElementById('form').requestSubmit();
    };
    let count = 0;
    document.getElementById('counter').onclick = () => document.getElementById('counter').textContent = 'Count ' + (++count);
    const blocked = [];
    try { parent.document.body.dataset.compromised = 'yes'; } catch { blocked.push('parent'); }
    try { localStorage.setItem('attack', 'yes'); } catch { blocked.push('storage'); }
    try { top.location.href = 'https://example.com/escape'; } catch { blocked.push('navigation'); }
    document.getElementById('isolation').textContent = blocked.join(', ');
  </script></body></html>`;
  await page.route("**/api/workspace/file?*", (route) =>
    route.fulfill({ json: { path: "a.html", content: html } }),
  );
  const escaped: string[] = [];
  await page.context().route("**/blocked-preview/**", (route) => {
    escaped.push(route.request().url());
    return route.abort();
  });
  await page.goto(`${origin}/inspector.html`);
  await page.getByRole("button", { name: "Open a.html", exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const iframe = page.locator('iframe[title="HTML preview"]');
  const frame = page.frameLocator('iframe[title="HTML preview"]');
  await expect(iframe).toHaveAttribute("srcdoc", html);
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  await expect(frame.getByRole("heading", { name: "Interactive document" })).toHaveCSS(
    "color",
    "rgb(120, 30, 50)",
  );
  await frame.getByRole("button", { name: "Count 0" }).click();
  await expect(frame.getByRole("button", { name: "Count 1" })).toBeVisible();
  await expect(frame.locator("#isolation")).toHaveText("parent, storage, navigation");
  await frame.getByRole("button", { name: "Try popup and form" }).click();
  await expect(frame.locator("#popup")).toHaveText("blocked");
  expect(escaped).toEqual([]);
  await expect(page.locator("body")).not.toHaveAttribute("data-compromised", "yes");
  await expect(page).toHaveURL(`${origin}/inspector.html`);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    await page.screenshot({ path: `docs/proof/html-preview-${theme}.png`, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(frame.getByRole("button", { name: "Count 1" })).toBeVisible();
    await page.screenshot({
      path: `docs/proof/html-preview-mobile-${theme}.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 960 });
  }
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.getByRole("region", { name: "File contents" })).toContainText(
    "<!doctype html>",
  );
});

test("tree bounds mounted rows, reaches the last file with the keyboard, and keeps state through refresh", async ({
  page,
}) => {
  let status = " M";
  const files = Array.from(
    { length: 1000 },
    (_, index) => `file-${String(index).padStart(4, "0")}.ts`,
  );
  await page.route("**/api/workspace/files?*", (route) =>
    route.fulfill({
      json: {
        files,
        truncated: true,
        git: { available: true, entries: { "file-0999.ts": status } },
      },
    }),
  );
  await page.route("**/api/workspace/file?*", (route) =>
    route.fulfill({ json: { path: "file-0999.ts", content: "last file" } }),
  );
  await page.goto(`${origin}/inspector.html`);
  const tree = page.getByRole("tree");
  await expect.poll(() => tree.getByRole("treeitem").count()).toBeLessThan(80);
  await tree.focus();
  await page.keyboard.press("End");
  const last = tree.locator('[data-path="file-0999.ts"]');
  await expect(last).toBeVisible();
  await expect(last).toHaveAttribute("data-git-status", "modified");
  status = "A ";
  await page.getByRole("button", { name: "Refresh inspector" }).click();
  await expect(last).toHaveAttribute("data-git-status", "added");
  await tree.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "File contents" })).toContainText("last file");
});
