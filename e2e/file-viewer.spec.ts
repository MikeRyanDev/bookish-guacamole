import { mockFileDiscovery } from "./mock-file-discovery";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await mockFileDiscovery(page, ["README.md", "src/greet.ts", "src/empty.ts"]);
  await page.route("**/api/skills", (route) => route.fulfill({ json: { skills: [] } }));
  await page.route("**/api/workspace/file?*", (route) => {
    const path = new URL(route.request().url()).searchParams.get("path");
    return route.fulfill({
      json: {
        path,
        content:
          path === "README.md"
            ? "# Hello viewer\n\n**Readable** documentation."
            : path === "src/empty.ts"
              ? ""
              : "export function greet(name: string) {\n  return `Hello ${name}`;\n}\n",
      },
    });
  });
  await page.goto(
    `${process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174"}/inspector.html`,
  );
});

test("finds a nested file and opens a dedicated reader with source controls", async ({ page }) => {
  await page.getByRole("textbox", { name: "Search files" }).fill("greet");
  await page.getByRole("button", { name: "Open src/greet.ts", exact: true }).click();
  await expect(page.getByRole("region", { name: "File contents" })).toContainText(
    "export function greet",
  );
  await page.getByRole("button", { name: "Find in file", exact: true }).click();
  await page.getByRole("textbox", { name: "Find in file", exact: true }).fill("name");
  await expect(page.getByRole("status")).toContainText("1 of 2");
  await page.getByRole("button", { name: "Next match" }).click();
  await expect(page.getByRole("status")).toContainText("2 of 2");
  await page.getByRole("button", { name: "Expand file viewer" }).click();
  await expect(page.getByRole("region", { name: "File contents" })).toBeVisible();
});

test("renders Markdown and distinguishes an empty file", async ({ page }) => {
  await page.getByRole("button", { name: "Open README.md", exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hello viewer" })).toBeVisible();
  await page.getByRole("button", { name: "Back to files" }).click();
  await page.getByRole("textbox", { name: "Search files" }).fill("empty");
  await page.getByRole("button", { name: "Open src/empty.ts", exact: true }).click();
  await expect(page.getByText("This file is empty.")).toBeVisible();
});

test("retries an unavailable file without showing stale contents", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/workspace/file?*", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 404, json: { error: "Missing" } })
      : route.fulfill({ json: { path: "README.md", content: "Restored content" } });
  });
  await page.getByRole("button", { name: "Open README.md", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to open this file");
  await page.getByRole("button", { name: "Retry file" }).click();
  await expect(page.getByRole("region", { name: "File contents" })).toContainText(
    "Restored content",
  );
});

test("copies exact contents, reports denial, and downloads the loaded text", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("textbox", { name: "Search files" }).fill("greet");
  await page.getByRole("button", { name: "Open src/greet.ts", exact: true }).click();
  await page.getByRole("button", { name: "Copy file contents" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "export function greet(name: string) {\n  return `Hello ${name}`;\n}\n",
  );
  await page.getByRole("button", { name: "Copy file path" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("src/greet.ts");
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("Denied"));
  });
  await page.getByRole("button", { name: "Copy file contents" }).click();
  await expect(page.getByRole("alert")).toContainText("Copy failed");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download file" }).click();
  expect((await download).suggestedFilename()).toBe("greet.ts");
});

test("bounds a large file DOM and navigates to an offscreen line", async ({ page }) => {
  await page.route("**/api/workspace/file?*", (route) =>
    route.fulfill({
      json: {
        path: "README.md",
        content: Array.from({ length: 10000 }, (_, i) => `line ${i + 1}`).join("\n"),
      },
    }),
  );
  await page.getByRole("button", { name: "Open README.md", exact: true }).click();
  await page.getByRole("button", { name: "Go to line", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Line number" }).fill("9000");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.getByRole("region", { name: "File contents" })).toContainText("line 9000");
  expect(await page.locator(".source-line").count()).toBeLessThan(100);
  await page.getByRole("button", { name: "Find in file", exact: true }).click();
  await page.getByRole("textbox", { name: "Find in file", exact: true }).fill("line 1234");
  await expect(page.locator("mark.current-match")).toHaveText("line 1234");
});

test("Markdown does not execute HTML or request external images", async ({ page }) => {
  let remote = false;
  await page.route("https://example.com/**", (route) => {
    remote = true;
    return route.abort();
  });
  await page.route("**/api/workspace/file?*", (route) =>
    route.fulfill({
      json: {
        path: "README.md",
        content:
          '# Safe\n<img src=x onerror="alert(1)">\n![Secret](https://example.com/tracker)\n[Unsafe](javascript:alert(1))',
      },
    }),
  );
  await page.getByRole("button", { name: "Open README.md", exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Safe" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "File contents" }).locator("img,script,a"),
  ).toHaveCount(0);
  expect(remote).toBe(false);
});

for (const theme of ["light", "dark"]) {
  test(`viewer is accessible and contained in ${theme} desktop and mobile`, async ({ page }) => {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    await page.getByRole("textbox", { name: "Search files" }).fill("greet");
    await page.getByRole("button", { name: "Open src/greet.ts", exact: true }).click();
    await page.getByRole("button", { name: "Expand file viewer" }).click();
    await expect(page.getByRole("region", { name: "File contents" })).toContainText(
      "export function",
    );
    expect((await new AxeBuilder({ page }).include(".inspector").analyze()).violations).toEqual([]);
    await expect(page.locator(".source-token").first()).toBeVisible();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `docs/proof/file-viewer-${theme}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Wrap lines" }).click();
    await expect(page.getByRole("region", { name: "File contents" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).include(".inspector").analyze()).violations).toEqual([]);
    await page.screenshot({ path: `docs/proof/file-viewer-mobile-${theme}.png` });
  });
}

test("keyboard opens a file, searches it, and returns focus when find closes", async ({ page }) => {
  await page.getByRole("textbox", { name: "Search files" }).fill("greet");
  const file = page.getByRole("button", { name: "Open src/greet.ts", exact: true });
  await file.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "File contents" })).toBeFocused();
  await page.keyboard.press("Control+f");
  await expect(page.getByRole("textbox", { name: "Find in file", exact: true })).toBeFocused();
  await page.keyboard.type("name");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("2 of 2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "File contents" })).toBeFocused();
  await page.getByRole("button", { name: "Back to files" }).click();
  await expect(page.getByRole("textbox", { name: "Search files" })).toHaveValue("greet");
});

test("switching files during a pending read never shows the old response", async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/workspace/file?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("path") === "README.md") {
      await pending;
      await route.fulfill({ json: { path: "README.md", content: "STALE FILE" } }).catch(() => {});
    } else await route.fulfill({ json: { path: "src/greet.ts", content: "CURRENT FILE" } });
  });
  await page.getByRole("button", { name: "Open README.md", exact: true }).click();
  await expect(page.getByText("Loading file…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to files" }).click();
  await page.getByRole("textbox", { name: "Search files" }).fill("greet");
  await page.getByRole("button", { name: "Open src/greet.ts", exact: true }).click();
  await expect(page.getByRole("region", { name: "File contents" })).toHaveText(/CURRENT FILE/);
  release();
  await expect(page.getByText("STALE FILE", { exact: true })).toHaveCount(0);
});
