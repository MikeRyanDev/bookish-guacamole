import { test, expect } from "@playwright/test";
import type { ConnectionsResponse, ConnectionsStatusResponse } from "../src/shared/connections";
const fixture = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";

test("execution drafts survive category changes and failed saves", async ({ page }) => {
  let fail = true;
  let saved = {
    revision: null as string | null,
    settings: {
      autoCompact: true,
      compactAt: 75,
      tokenLimit: null as number | null,
      costLimit: null,
      maxRetries: 3,
      codeMode: false,
      models: {
        first: { contextWindow: 32768, prices: null },
        second: { contextWindow: 32768, prices: null },
      },
    },
  };
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/execution?*", (route) => {
    if (route.request().method() === "PUT") {
      if (fail)
        return route.fulfill({ status: 503, json: { error: "The local server is unavailable." } });
      saved = { ...route.request().postDataJSON(), revision: "saved" };
    }
    return route.fulfill({ json: saved });
  });
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Execution", exact: true }).click();
  await page.getByLabel("Token limit", { exact: true }).fill("100000");
  await page.getByLabel("Enable code mode", { exact: true }).check();
  await page.getByRole("tab", { name: "Appearance", exact: true }).click();
  await page.getByRole("tab", { name: "Execution", exact: true }).click();
  await expect(page.getByLabel("Token limit", { exact: true })).toHaveValue("100000");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.getByLabel("Token limit", { exact: true })).toHaveValue("100000");
  fail = false;
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("alert")).not.toBeVisible();
  expect(saved.settings.tokenLimit).toBe(100000);
  expect(saved.settings.codeMode).toBe(true);
  await page.getByLabel("Token limit", { exact: true }).fill("200000");
  await page.getByRole("button", { name: "Cancel changes", exact: true }).click();
  await expect(page.getByLabel("Token limit", { exact: true })).toHaveValue("100000");
  await expect(page.getByRole("tab", { name: "Diagnostics", exact: true })).toHaveCount(0);
});

test("connections add a disabled server and expose explicit OAuth and cancel actions", async ({
  page,
}) => {
  let saved: ConnectionsResponse = { revision: null, connections: [] };
  let signIn: ConnectionsStatusResponse["signIn"] = null;
  await page.route("**/api/defaults?*", (route) =>
    route.fulfill({ json: { modelId: "first", permissions: "acceptEdits" } }),
  );
  await page.route("**/api/permissions?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/connections**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/sign-in"))
      signIn = { connectionId: "docs", status: "waiting", url: "https://example.com/authorize" };
    if (path.endsWith("/cancel-sign-in")) signIn = null;
    if (path.endsWith("/status"))
      return route.fulfill({
        json: {
          connections: saved.connections.map((entry) => ({
            id: entry.id,
            status: entry.enabled ? "sign-in-required" : "disabled",
            toolCount: 0,
          })),
          signIn,
          applying: false,
          error: null,
        },
      });
    if (route.request().method() === "PUT")
      saved = {
        ...route.request().postDataJSON(),
        revision: String(Number(saved.revision ?? 0) + 1),
      };
    return route.fulfill({ json: saved });
  });
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Connections", exact: true }).click();
  await page.getByRole("button", { name: "Add connection", exact: true }).click();
  await page.getByLabel("Connection name", { exact: true }).fill("docs");
  await page.getByLabel("Server URL", { exact: true }).fill("https://example.com/mcp");
  await page.getByRole("combobox", { name: "Authentication", exact: true }).selectOption("oauth");
  await page.getByRole("button", { name: "Save connection", exact: true }).click();
  expect(saved.connections[0]?.enabled).toBe(false);
  await page.getByRole("button", { name: "Connect docs", exact: true }).click();
  await page.getByRole("button", { name: "Sign in to docs", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open sign-in", exact: true })).toHaveAttribute(
    "href",
    "https://example.com/authorize",
  );
  await page.getByRole("button", { name: "Cancel sign-in", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open sign-in", exact: true })).not.toBeVisible();
});

test("price drafts survive toggles and saving retains keyboard focus", async ({ page }) => {
  await page.goto(`${fixture}/settings.html?review=1`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Execution", exact: true }).click();
  await page.getByText("Model limits and prices", { exact: true }).click();
  const toggle = page.getByLabel("Set prices for First model", { exact: true });
  await toggle.check();
  for (const label of ["Input", "Output", "Cache read", "Cache write"])
    await page.getByLabel(`${label} price for First model`, { exact: true }).fill("2.5");
  await toggle.uncheck();
  await toggle.check();
  await expect(page.getByLabel("Input price for First model", { exact: true })).toHaveValue("2.5");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Execution settings", exact: true })).toBeFocused();
});

test("a stale connection draft has an explicit discard-and-reload recovery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/connections?*", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 409,
          json: { error: "Connections changed in another window. Reload before saving." },
        })
      : route.fulfill({ json: { revision: "fresh", connections: [] } }),
  );
  await page.route("**/api/connections/status?*", (route) =>
    route.fulfill({ json: { connections: [], signIn: null, applying: false, error: null } }),
  );
  await page.goto(`${fixture}/settings.html`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Connections", exact: true }).click();
  await page.getByRole("button", { name: "Add connection", exact: true }).click();
  await page.getByLabel("Connection name", { exact: true }).fill("docs");
  await page.getByLabel("Server URL", { exact: true }).fill("https://example.com/mcp");
  await page.getByRole("button", { name: "Save connection", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("another window");
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page
    .getByRole("button", { name: "Discard draft and reload", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/stale-connection-dark-390.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Discard draft and reload", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add connection", exact: true })).toBeVisible();
  await expect(page.getByLabel("Connection name", { exact: true })).toHaveCount(0);
});
