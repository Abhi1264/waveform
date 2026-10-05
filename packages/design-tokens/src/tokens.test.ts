import { describe, expect, it } from "vitest"

import { isInSrgbGamut, toHex } from "./color"
import { checkContrast, contrastRequirements } from "./contrast"
import {
  colors,
  densities,
  density,
  signalColors,
  themes,
  tokenNames,
  type DensityTokenName,
} from "./tokens"

/** Rem values in pixels at the default 16 px root font size. */
function pixels(value: string): number {
  if (!value.endsWith("rem")) {
    throw new Error(`expected a rem value, got ${value}`)
  }
  return Number.parseFloat(value) * 16
}

describe("colours", () => {
  it.each(themes)("fit inside sRGB in the %s theme", (theme) => {
    const outside = Object.entries(colors)
      .filter(([, value]) => !isInSrgbGamut(value[theme]))
      .map(([name]) => name)
    expect(outside).toEqual([])
  })

  it.each(themes)("keep WCAG AA contrast in the %s theme", (theme) => {
    const failures = checkContrast(theme)
      .filter((result) => result.ratio < result.minimum)
      .map(
        (result) =>
          `${result.foreground} on ${result.background}: ${result.ratio.toFixed(2)}:1, needs ${result.minimum}:1`
      )
    expect(failures).toEqual([])
  })

  it("checks every signal colour against the surfaces it is drawn on", () => {
    for (const name of signalColors) {
      expect(
        contrastRequirements.filter((pair) => pair.foreground === name)
      ).not.toHaveLength(0)
    }
  })

  it("uses the app icon's tile colour for the dark canvas", () => {
    expect(toHex(colors.canvas.dark)).toBe("#0e0e10")
  })
})

describe("density", () => {
  const interactiveSizes: DensityTokenName[] = [
    "control-height-sm",
    "control-height",
    "control-height-lg",
    "target-min",
    "row-height",
  ]

  it.each(interactiveSizes)("keeps %s at least 44 px for touch", (name) => {
    expect(pixels(density[name].touch)).toBeGreaterThanOrEqual(44)
  })

  it("keeps every target at least 24 px, the WCAG 2.2 minimum", () => {
    for (const mode of densities) {
      expect(pixels(density["target-min"][mode])).toBeGreaterThanOrEqual(24)
    }
  })

  it.each(Object.keys(density) as DensityTokenName[])(
    "grows %s from compact to touch",
    (name) => {
      const [compact, comfortable, touch] = densities.map((mode) =>
        pixels(density[name][mode])
      )
      expect(compact).toBeLessThanOrEqual(comfortable ?? 0)
      expect(comfortable).toBeLessThanOrEqual(touch ?? 0)
    }
  )
})

describe("token names", () => {
  it("are unique", () => {
    expect(new Set(tokenNames).size).toBe(tokenNames.length)
  })
})
