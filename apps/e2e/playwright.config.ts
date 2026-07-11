import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(dir, ".env") });

const backend = process.env.E2E_BACKEND_API ?? "http://localhost:8080";
const webBaseURL = process.env.E2E_WEB_BASE_URL ?? "http://localhost:3000";
const adminBaseURL = process.env.E2E_ADMIN_BASE_URL ?? "http://localhost:5173";
const repoRoot = resolve(dir, "../..");

export default defineConfig({
  testDir: dir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  webServer: [
    {
      command: "pnpm --filter web build && pnpm --filter web start",
      cwd: repoRoot,
      url: webBaseURL,
      env: { API_BASE_URL: backend },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter admin dev -- --port 5173",
      cwd: repoRoot,
      url: adminBaseURL,
      env: { VITE_DEV_BACKEND_URL: backend },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],

  projects: [
    {
      name: "web",
      testMatch: /web\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: webBaseURL },
    },
    {
      name: "admin-setup",
      testMatch: /admin\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: adminBaseURL },
    },
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["admin-setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: adminBaseURL,
        storageState: resolve(dir, ".auth/admin.json"),
      },
    },
  ],
});
