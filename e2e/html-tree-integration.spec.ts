import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("real Git changes refresh the tree while original HTML runs in the sandbox", async ({
  page,
  request,
}) => {
  const origin = process.env.FILE_VIEWER_APP_URL ?? "http://127.0.0.1:4173";
  const root = await mkdtemp(join(tmpdir(), "html-tree-browser-"));
  const git = (...args: string[]) =>
    promisify(execFile)(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args],
      { cwd: root },
    );
  const config = await (await request.get(`${origin}/api/config`)).json();
  const headers = { authorization: `Bearer ${config.token}` };
  let id: string | undefined;
  try {
    await git("init", "-q");
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/app.ts"), "export const count = 0;\n");
    await writeFile(
      join(root, "index.html"),
      `<!doctype html><html lang="en"><head><title>Counter preview</title><style>body{font-family:system-ui;padding:24px;background:#faf9f6;color:#272a25}button{font:inherit;padding:8px 16px}</style></head><body><h1>Counter preview</h1><p>This file runs inside its own sandbox.</p><button onclick="this.textContent='Count '+(++window.count)">Count 0</button><script>window.count=0;fetch('/api/config').then(()=>document.body.dataset.host='readable').catch(()=>document.body.dataset.host='blocked')</script></body></html>`,
    );
    await git("add", ".");
    await git("commit", "-qm", "fixture");
    await writeFile(join(root, "src/app.ts"), "export const count = 1;\n");
    const created = await request.post(`${origin}/api/workspaces`, {
      headers,
      data: { name: "HTML and Git tree", mode: "open", path: root },
    });
    expect(created.ok()).toBe(true);
    id = (await created.json()).id;
    await page.goto(`${origin}/?workspace=${id}`);
    const tree = page.getByRole("tree", { name: "Workspace files" });
    await expect(tree.locator('[data-path="src"]')).toHaveAttribute("aria-expanded", "false");
    await expect(tree.locator('[data-path="src"]')).toHaveAttribute("data-git-status", "modified");
    await page.getByRole("button", { name: "Expand src", exact: true }).click();
    await expect(tree.locator('[data-path="src/app.ts"]')).toHaveAttribute(
      "data-git-status",
      "modified",
    );
    await git("add", ".");
    await git("commit", "-qm", "updated");
    await page.getByRole("button", { name: "Refresh inspector" }).click();
    await expect(tree.locator('[data-path="src/app.ts"]')).not.toHaveAttribute("data-git-status");
    await expect(tree.locator('[data-path="src"]')).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Open index.html", exact: true }).click();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const frame = page.frameLocator('iframe[title="HTML preview"]');
    await frame.getByRole("button", { name: "Count 0" }).click();
    await expect(frame.getByRole("button", { name: "Count 1" })).toBeVisible();
    await expect(frame.locator("body")).toHaveAttribute("data-host", "blocked");
    await page.getByRole("button", { name: "Expand file viewer" }).click();
    for (const theme of ["light", "dark"]) {
      if (theme === "dark") await page.getByRole("button", { name: "Use dark theme" }).click();
      await page.mouse.move(0, 0);
      await expect(page.locator(".inspector")).toHaveCSS("opacity", "1");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      // The original document is cross-origin by design; axe examines the host UI only.
      expect(
        (await new AxeBuilder({ page }).include(".inspector").exclude("iframe").analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: `docs/proof/html-tree-workspace-${theme}.png`,
        animations: "disabled",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("button", { name: "Toggle files" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      // The SDK Inspector overlay retains its desktop position after resizing; use the host keyboard control.
      await page.getByRole("button", { name: "Toggle files" }).focus();
      await page.keyboard.press("Enter");
      await expect(frame.getByRole("button", { name: "Count 1" })).toBeVisible();
      await page.screenshot({
        path: `docs/proof/html-tree-workspace-mobile-${theme}.png`,
        animations: "disabled",
      });
      await page.setViewportSize({ width: 1440, height: 960 });
    }
  } finally {
    if (id) await request.delete(`${origin}/api/workspaces/${id}`, { headers });
    await rm(root, { recursive: true, force: true });
  }
});
