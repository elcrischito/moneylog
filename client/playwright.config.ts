import { defineConfig, devices } from "@playwright/test";

// E2E against a running stack: API on :4000 and Vite on :5173 (see README).
// Each test resets the demo data first with `npm --prefix ../server run demo:reset`
// (override with E2E_RESET_CMD).
export default defineConfig({
  testDir: "./tests-e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
  ],
});
