import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"

const screenshotDir = resolve(import.meta.dirname, "../../../docs/screenshots")

async function openDesignSystem(page: Page) {
  await page.goto("/design-system", { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
}

async function focusedName(page: Page): Promise<string> {
  const name = await page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement)) return ""
    const labelled = element.getAttribute("aria-label")
    if (labelled) return labelled
    return (
      (element.innerText || element.textContent || "").trim().split("\n")[0] ??
      ""
    )
  })
  return name.toLocaleLowerCase()
}

function cssTimeToMs(value: string): number {
  const amount = Number.parseFloat(value)
  if (value.endsWith("ms")) return amount
  if (value.endsWith("s")) return amount * 1000
  return amount
}

async function focusRingVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement)) return false
    const candidates = [
      element,
      element.closest("[data-slot]"),
      element.parentElement,
    ]
    return candidates.some((node) => {
      if (!(node instanceof HTMLElement)) return false
      if (node.matches(":focus-visible")) return true
      const style = getComputedStyle(node)
      const outline = Number.parseFloat(style.outlineWidth)
      if (
        (outline > 0 && style.outlineStyle !== "none") ||
        style.boxShadow !== "none"
      ) {
        return true
      }
      // WebKit in Playwright often omits :focus-visible after a scripted
      // focus(); the ring utilities are still on the control.
      return (
        node.matches(":focus") &&
        /outline-focus|focus-visible:outline/.test(node.className)
      )
    })
  })
}

test.describe("design system", () => {
  test("names the page and labels specimens", async ({ page }) => {
    await openDesignSystem(page)
    await expect(page).toHaveTitle("Design system · Waveform")
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "The screen is the second instrument.",
      })
    ).toBeVisible()
    await expect(page.getByText("Not a working deck.")).toBeVisible()
    await expect(page.getByText("Not a working mixer.")).toBeVisible()
    await expect(page.getByTestId("deck-header-specimen")).toBeVisible()
    await expect(page.getByTestId("transport-specimen")).toBeVisible()
  })

  test("has no serious or critical axe violations", async ({ page }) => {
    await openDesignSystem(page)
    const results = await new AxeBuilder({ page }).analyze()
    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    )
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  })

  test("tabs in order and keeps focus visible", async ({ page }) => {
    await openDesignSystem(page)

    const order = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        ),
      ]
        .filter((element) => {
          const style = getComputedStyle(element)
          return style.visibility !== "hidden" && style.display !== "none"
        })
        .map((element) => {
          const name =
            element.getAttribute("aria-label") ??
            element.innerText.trim().split("\n")[0] ??
            ""
          return name.toLocaleLowerCase()
        })
        .filter((name): name is string => Boolean(name))
    )
    expect(order.slice(0, 4)).toEqual([
      "skip to content",
      "waveform",
      "colour",
      "type",
    ])

    await page.getByRole("link", { name: /waveform/i }).focus()
    await page.keyboard.press("Tab")
    expect(await focusedName(page)).toMatch(/colour|type|density|system/)
    expect(await focusRingVisible(page)).toBe(true)

    await page.getByRole("link", { name: /skip to content/i }).press("Enter")
    await expect(page.locator("#content")).toBeFocused()
  })

  test("reduced motion zeroes transition durations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openDesignSystem(page)

    const rootDuration = await page
      .locator("html")
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--wf-duration-base").trim()
      )
    expect(cssTimeToMs(rootDuration)).toBe(0)

    const localDuration = await page
      .locator("[data-motion=reduced]")
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--wf-duration-base").trim()
      )
    expect(cssTimeToMs(localDuration)).toBe(0)

    const sampleDuration = await page
      .getByTestId("motion-sample-reduced")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).transitionDuration)
      )
    expect(sampleDuration).toBeLessThan(0.02)
  })

  test("touch density gives targets of at least 44 px", async ({ page }) => {
    await openDesignSystem(page)
    await page.getByRole("radio", { name: "Touch" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-density", "touch")

    const sizes = await page.evaluate(() => {
      const root = document.querySelector("#states")
      if (!root) return []
      return [
        ...root.querySelectorAll<HTMLElement>(
          "[data-slot=button], [data-slot=toggle]"
        ),
      ].map((element) => {
        const box = element.getBoundingClientRect()
        return {
          width: box.width,
          height: box.height,
          name: element.innerText.trim(),
        }
      })
    })

    expect(sizes.length).toBeGreaterThan(0)
    for (const size of sizes) {
      expect(size.height, size.name).toBeGreaterThanOrEqual(44)
      expect(size.width, size.name).toBeGreaterThanOrEqual(44)
    }

    const knob = await page
      .getByTestId("transport-specimen")
      .locator("[data-slot=knob-face]")
      .first()
      .boundingBox()
    expect(knob, "transport knob face").toBeTruthy()
    if (!knob) return
    expect(Math.min(knob.width, knob.height)).toBeGreaterThanOrEqual(44)
  })

  test("captures light and dark screenshots", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "One screenshot pair is enough."
    )
    await mkdir(screenshotDir, { recursive: true })
    await openDesignSystem(page)

    await page.getByRole("radio", { name: "Light" }).click()
    await page.screenshot({
      path: resolve(screenshotDir, "design-system-light.png"),
      fullPage: true,
    })

    await page.getByRole("radio", { name: "Dark" }).click()
    await page.screenshot({
      path: resolve(screenshotDir, "design-system-dark.png"),
      fullPage: true,
    })
  })
})
