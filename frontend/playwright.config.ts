import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:5288",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" }
    }
  ],
  webServer: [
    {
      command: "node node_modules/tsx/dist/cli.mjs backend/src/server.ts",
      cwd: "..",
      env: {
        NODE_ENV: "e2e",
        CRM_STORE: "memory",
        PORT: "4288"
      },
      url: "http://127.0.0.1:4288/api/health",
      reuseExistingServer: false,
      timeout: 60_000
    },
    {
      command: "node node_modules/vite/bin/vite.js frontend --host 127.0.0.1 --port 5288",
      cwd: "..",
      env: {
        VITE_API_TARGET: "http://127.0.0.1:4288"
      },
      url: "http://127.0.0.1:5288/",
      reuseExistingServer: false,
      timeout: 30_000
    }
  ]
});
