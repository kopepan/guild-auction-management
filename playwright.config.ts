import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

// The global setup talks to the database directly, and this config is evaluated
// before it, so the connection string has to be in place by now.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Generous, because the dev server compiles routes on first visit.
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
    trace: "off",
  },
});
