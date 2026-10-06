import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("says what Waveform is and where it stands", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle("Waveform")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A DJ workstation, in early development."
  )
  await expect(
    page.getByRole("heading", { name: "Where it stands" })
  ).toBeVisible()
  await expect(
    page.getByText("There is nothing to download yet.")
  ).toBeVisible()
})

test("has no serious or critical axe violations", async ({ page }) => {
  await page.goto("/")
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical"
  )
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
})

test("loads without errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))

  await page.goto("/", { waitUntil: "networkidle" })
  expect(errors).toEqual([])
})

test("makes no third-party requests", async ({ page }) => {
  const origins = new Set<string>()
  page.on("request", (request) => origins.add(new URL(request.url()).origin))

  await page.goto("/", { waitUntil: "networkidle" })
  expect([...origins]).toEqual([new URL(page.url()).origin])
})

test("uses the Waveform mark as a colour-scheme-aware favicon", async ({
  page,
  request,
}) => {
  await page.goto("/")
  const href = await page
    .locator('link[rel="icon"][type="image/svg+xml"]')
    .getAttribute("href")
  expect(href).toMatch(/^\/icon\.svg/)

  const icon = await request.get("/icon.svg")
  expect(icon.headers()["content-type"]).toBe("image/svg+xml")
  expect(await icon.text()).toContain("prefers-color-scheme: dark")
})
