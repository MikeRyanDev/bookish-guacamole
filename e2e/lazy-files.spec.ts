import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = process.env.FILE_VIEWER_APP_URL ?? "http://127.0.0.1:4173";
test("real directory pages and workspace search reach files beyond 1,000 without eager tree loading", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const root = await mkdtemp(join(tmpdir(), "lazy-files-browser-"));
  const config = await (await request.get(`${origin}/api/config`)).json();
  const headers = { authorization: `Bearer ${config.token}` };
  let id: string | undefined;
  try {
    await mkdir(join(root, "many"));
    await mkdir(join(root, "unopened"));
    await Promise.all(
      Array.from({ length: 1105 }, (_, i) =>
        writeFile(
          join(root, "many", `file-${String(i).padStart(4, "0")}.ts`),
          `export const index = ${i};`,
        ),
      ),
    );
    await writeFile(join(root, "unopened/target.ts"), "export const target = true;");
    const created = await request.post(`${origin}/api/workspaces`, {
      headers,
      data: { name: "Lazy file proof", mode: "open", path: root },
    });
    expect(created.ok()).toBe(true);
    id = (await created.json()).id;
    const requests: string[] = [];
    page.on("request", (req) => {
      if (/\/api\/workspace\/(directory|search|files)\?/.test(req.url())) requests.push(req.url());
    });
    await page.goto(`${origin}/?workspace=${id}`);
    await expect(page.getByRole("button", { name: "Expand many", exact: true })).toBeVisible();
    expect(new Set(requests).size).toBe(1);
    expect(new URL(requests[0]!).pathname).toBe("/api/workspace/directory");
    expect(new URL(requests[0]!).searchParams.get("path")).toBe("");
    await page.getByRole("button", { name: "Expand many", exact: true }).click();
    const tree = page.getByRole("tree", { name: "Workspace files" });
    await expect(
      page.getByRole("button", { name: "Open many/file-0000.ts", exact: true }),
    ).toBeVisible();
    // Keyboard End reaches the next-page control; each page adds only 100 server entries.
    for (let index = 0; index < 11; index++) {
      await tree.focus();
      await page.keyboard.press("End");
      const next = page.getByRole("button", { name: "Load more in many", exact: true });
      // Root's unopened folder sorts after many, so use the virtual scroll if End selects that folder.
      if (!(await next.isVisible())) {
        await page.keyboard.press("ArrowUp");
      }
      await expect(next).toBeVisible();
      await next.click();
      await expect(page.getByRole("button", { name: "Loading many…", exact: true })).toHaveCount(0);
    }
    await tree.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowUp");
    await expect(
      page.getByRole("button", { name: "Open many/file-1104.ts", exact: true }),
    ).toBeVisible();
    expect(await tree.getByRole("treeitem").count()).toBeLessThan(70);
    await page.getByRole("textbox", { name: "Search files" }).fill("target");
    await expect(
      page.getByRole("button", { name: "Open unopened/target.ts", exact: true }),
    ).toBeVisible();
    expect(requests.some((url) => new URL(url).searchParams.get("path") === "unopened")).toBe(
      false,
    );
    await page.getByRole("textbox", { name: "Search files" }).fill("file-1104");
    await page.getByRole("button", { name: "Open many/file-1104.ts", exact: true }).click();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText("1104");
    await expect(page).toHaveURL(/file=many/);
    await page.reload();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText("1104");
    await page.getByRole("button", { name: "Back to files" }).click();
    await page.getByRole("textbox", { name: "Search files" }).fill("file-");
    await expect(page.getByRole("button", { name: "Load more results" })).toBeVisible();
    for (let index = 0; index < 11; index++) {
      await page.getByRole("button", { name: "Load more results" }).click();
      await expect(page.getByText("Searching…", { exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: "Load more results" })).toHaveCount(0);
    await tree.focus();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("button", { name: "Open many/file-1104.ts", exact: true }),
    ).toBeVisible();
    const dismissInspector = page.getByRole("button", {
      name: "Hide Inspector for a day",
      exact: true,
    });
    if (await dismissInspector.isVisible()) await dismissInspector.click();
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", {
            name: theme === "dark" ? "Use dark theme" : "Use light theme",
            exact: true,
          })
          .click();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        if (!(await page.locator(".inspector").isVisible()))
          await page.getByRole("button", { name: "Toggle files", exact: true }).click();
        await expect(page.locator(".inspector")).toBeVisible();
        await expect(page.locator(".inspector")).toHaveCSS("opacity", "1");
        await tree.focus();
        await page.keyboard.press("End");
        await expect(
          page.getByRole("button", { name: "Open many/file-1104.ts", exact: true }),
        ).toBeVisible();
        expect((await new AxeBuilder({ page }).include(".inspector").analyze()).violations).toEqual(
          [],
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: `docs/proof/lazy-files-${theme}-${width}.png`,
          animations: "disabled",
        });
      }
    }
    // Inserting before an old boundary must invalidate the subsequent cursor chain.
    await writeFile(join(root, "many/file-0000a.ts"), "new file before cursor");
    await page.getByRole("button", { name: "Refresh inspector", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Load more results", exact: true }),
    ).toBeVisible();
    await tree.focus();
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("button", { name: "Open many/file-0000a.ts", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Load more results", exact: true }).click();
    await expect(page.getByText("Searching…", { exact: true })).toHaveCount(0);
    await tree.focus();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("button", { name: "Open many/file-0198.ts", exact: true }),
    ).toBeVisible();
  } finally {
    if (id) await request.delete(`${origin}/api/workspaces/${id}`, { headers });
    await rm(root, { recursive: true, force: true });
  }
});
