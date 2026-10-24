import { chromium, expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
import { fixtureUrl } from "./fixture-url";

test("Impeccable scans rendered tools and approvals in both themes and sizes", async ({}, testInfo) => {
  test.setTimeout(240_000);
  const profile = await mkdtemp(join(tmpdir(), "starter-design-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: ["--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1"],
  });
  try {
    const port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]!;
    const page = context.pages()[0]!;
    for (const target of [
      "tools",
      "activity",
      "approval=bash",
      "approval=patch",
      "permission-scope",
      "permission-modes",
      "permission-list",
    ]) {
      for (const theme of ["light", "dark"]) {
        await page.goto(
          target.startsWith("permission-")
            ? `${fixtureUrl}/permissions.html?theme=${theme}`
            : `${fixtureUrl}/?${target}`,
        );
        if (target === "permission-scope" || target === "permission-list") {
          await page.getByRole("button", { name: "Remember this permission" }).click();
        }
        if (target === "permission-modes")
          await page.getByRole("button", { name: "Approval mode: Allow file edits" }).click();
        if (target === "permission-list") {
          await page.getByRole("button", { name: "Save and allow" }).click();
          await page.getByRole("button", { name: "Workspace permissions", exact: true }).click();
          await expect(
            page.getByRole("button", { name: "Remove permission for bash pnpm test" }),
          ).toBeVisible();
        }
        if (target === "activity") await page.getByRole("button", { name: /8 tool calls/ }).click();
        if (target !== "permission-list")
          await expect(page.locator(".tool-call").first()).toBeVisible();
        for (const summary of await page.locator(".tool-details > summary").all()) {
          if (!(await summary.evaluate((element) => element.parentElement?.hasAttribute("open"))))
            await summary.click();
        }
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 960 });
          const name = `${target}-${theme}-${width}`;
          // A process error (including detector exit 2) fails the test. Never treat
          // empty JSON from a failed or partial scan as a successful check.
          const { stdout, stderr } = await execute(
            process.execPath,
            [
              resolve("node_modules/impeccable/cli/bin/cli.js"),
              "detect",
              "--json",
              "--cdp",
              port,
              "--target",
              new URL(fixtureUrl).host,
            ],
            { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
          ).catch(async (error) => {
            await testInfo.attach(`${name}-failed-scan`, {
              body: String(error.stdout) + String(error.stderr),
              contentType: "text/plain",
            });
            throw new Error(
              `Impeccable scan failed (${error.code}): ${error.stdout} ${error.stderr}`,
            );
          });
          const findings = JSON.parse(stdout) as { advisory?: boolean }[];
          await testInfo.attach(`${name}-findings`, {
            body: stdout + stderr,
            contentType: "text/plain",
          });
          expect(Array.isArray(findings)).toBe(true);
          expect(findings.filter((finding) => !finding.advisory)).toEqual([]);
          await testInfo.attach(name, {
            body: await page.screenshot({ fullPage: true }),
            contentType: "image/png",
          });
        }
      }
    }
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
