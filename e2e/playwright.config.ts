import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout : l'appli de production (next start) sur une base Supabase
 * jetable, avec des comptes fictifs. Lancés par .github/workflows/bout-en-bout.yml.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  outputDir: "resultats/traces",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { outputFolder: "resultats/rapport", open: "never" }]],
  use: {
    ...devices["Pixel 7"],
    channel: "chrome",
    baseURL: process.env.E2E_URL ?? "http://localhost:3000",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
