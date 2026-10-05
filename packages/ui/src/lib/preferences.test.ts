import { afterEach, describe, expect, it } from "vitest"

import {
  applySavedPreferences,
  preferenceKeys,
  savedPreferencesScript,
} from "./preferences"

const root = document.documentElement

afterEach(() => {
  root.className = ""
  root.removeAttribute("data-density")
  root.removeAttribute("data-motion")
})

describe("applySavedPreferences", () => {
  it("applies saved choices to the root element", () => {
    localStorage.setItem(preferenceKeys.theme, "dark")
    localStorage.setItem(preferenceKeys.density, "touch")
    localStorage.setItem(preferenceKeys.motion, "reduced")
    applySavedPreferences()

    expect(root).toHaveClass("dark")
    expect(root).toHaveAttribute("data-density", "touch")
    expect(root).toHaveAttribute("data-motion", "reduced")
  })

  it("ignores values it does not know", () => {
    localStorage.setItem(preferenceKeys.theme, "sepia")
    localStorage.setItem(preferenceKeys.density, "auto")
    applySavedPreferences()

    expect(root.className).toBe("")
    expect(root).not.toHaveAttribute("data-density")
  })
})

describe("savedPreferencesScript", () => {
  it("does the same work as an inline script in the page head", () => {
    localStorage.setItem(preferenceKeys.theme, "light")
    localStorage.setItem(preferenceKeys.density, "compact")
    const script = document.createElement("script")
    script.textContent = savedPreferencesScript
    document.head.append(script)
    script.remove()

    expect(root).toHaveClass("light")
    expect(root).toHaveAttribute("data-density", "compact")
  })
})
