import { defineConfig, devices } from "@playwright/test";

const userWebPort = Number(process.env.USER_WEB_PORT ?? 5187);
const therapistWebPort = Number(process.env.THERAPIST_WEB_PORT ?? 5186);
const adminWebPort = Number(process.env.ADMIN_WEB_PORT ?? 5188);
const host = "127.0.0.1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results/playwright-artifacts",
  use: {
    baseURL: `http://${host}:${userWebPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  webServer: [
    {
      command: `corepack pnpm --filter @neuro-cog-rehab/user-web exec vite --host ${host} --port ${userWebPort}`,
      url: `http://${host}:${userWebPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `corepack pnpm --filter @neuro-cog-rehab/therapist-web exec vite --host ${host} --port ${therapistWebPort}`,
      url: `http://${host}:${therapistWebPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `corepack pnpm --filter @neuro-cog-rehab/admin-web exec vite --host ${host} --port ${adminWebPort}`,
      url: `http://${host}:${adminWebPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
