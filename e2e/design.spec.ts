import { chromium, expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

test("Impeccable scans rendered tools and approvals in both themes and sizes", async ({}, testInfo) => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), "starter-design-"));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: ["--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1"],
  });
  try {
    const port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]!;
    const page = context.pages()[0]!;
    for (const target of ["tools", "approval=bash", "approval=patch"]) {
      await page.goto(`http://127.0.0.1:4174/?${target}`);
      await expect(page.locator(".tool-call").first()).toBeVisible();
      for (const summary of await page.locator(".tool-details:not([open]) > summary").all())
        await summary.click();
      await page.evaluate(() => document.fonts.ready);
      for (const theme of ["light", "dark"]) {
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
              "127.0.0.1:4174",
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
