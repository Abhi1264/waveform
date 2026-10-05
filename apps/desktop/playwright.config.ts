import { defineConfig, devices } from "@playwright/test"

const port = 4174
const ci = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  forbidOnly: ci,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec vite preview --host 127.0.0.1 --port 4174 --strictPort",
    url: `http://127.0.0.1:${String(port)}`,
    reuseExistingServer: !ci,
  },
})
