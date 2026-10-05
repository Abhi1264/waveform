import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"

const screenshotDir = resolve(import.meta.dirname, "../../../docs/screenshots")

const engineInfo = {
  appVersion: "0.1.0",
  engineVersion: "0.1.0",
  juceVersion: "9.0.3",
  compiler: "AppleClang 17.0.0",
  buildType: "Debug",
  operatingSystem: "macOS 26.0",
  architecture: "aarch64",
  tauriVersion: "2.12.1",
  webviewVersion: "Safari 26.0",
  messageLoop: { state: "responding", roundTripMicros: 420 },
}

async function openAbout(page: Page) {
  await page.addInitScript((info) => {
    const callbacks = new Map()
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        callbacks,
        invoke: async (cmd) => {
          if (cmd === "engine_info") return info
          if (cmd === "plugin:window|set_theme") return
          return null
        },
        transformCallback: (callback) => {
          const id = crypto.getRandomValues(new Uint32Array(1))[0]
          callbacks.set(id, callback)
          return id
        },
        unregisterCallback: (id) => {
          callbacks.delete(id)
        },
        runCallback: (id, data) => {
          const callback = callbacks.get(id)
          if (callback) callback(data)
        },
      },
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: () => undefined,
      },
    })
  }, engineInfo)

  await page.goto("/", { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByText("9.0.3")).toBeVisible()
}

test("captures About and appearance in light and dark", async ({ page }) => {
  await mkdir(screenshotDir, { recursive: true })
  await openAbout(page)

  await page.getByRole("radio", { name: "Light" }).click()
  await expect(page.locator("html")).toHaveClass(/light/)
  await page.screenshot({
    path: resolve(screenshotDir, "desktop-light.png"),
  })

  await page.getByRole("radio", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.screenshot({
    path: resolve(screenshotDir, "desktop-dark.png"),
  })
})
