import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: process.env.LIVE_MODEL === "1" ? ".data/playwright-live" : "test-results",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.FILE_VIEWER_APP_URL ?? "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: {
    command: `pnpm exec vite --config e2e/fixtures/vite.config.ts --port ${new URL(process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174").port}`,
    url: process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
  },
});
