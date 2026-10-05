import { defineConfig, devices } from "@playwright/test"

const port = 4173
const ci = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  forbidOnly: ci,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "node e2e/serve.ts",
    url: `http://127.0.0.1:${String(port)}`,
    env: { PORT: String(port) },
    reuseExistingServer: !ci,
  },
})
