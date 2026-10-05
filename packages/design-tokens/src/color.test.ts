import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  isInSrgbGamut,
  oklch,
  relativeLuminance,
  toCss,
  toHex,
} from "./color"

const white = oklch(1, 0, 0)
const black = oklch(0, 0, 0)

describe("toHex", () => {
  it("converts the ends of the lightness range", () => {
    expect(toHex(white)).toBe("#ffffff")
    expect(toHex(black)).toBe("#000000")
  })

  it("converts sRGB red from its published OKLCH value", () => {
    expect(toHex(oklch(0.62796, 0.25768, 29.2339))).toBe("#ff0000")
  })

  it("clamps colours outside sRGB", () => {
    expect(toHex(oklch(0.7, 0.4, 150))).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe("isInSrgbGamut", () => {
  it("accepts greys and rejects colours more saturated than sRGB allows", () => {
    expect(isInSrgbGamut(oklch(0.5, 0, 0))).toBe(true)
    expect(isInSrgbGamut(oklch(0.7, 0.4, 150))).toBe(false)
  })
})

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(relativeLuminance(white)).toBeCloseTo(1, 6)
    expect(relativeLuminance(black)).toBe(0)
    expect(contrastRatio(black, white)).toBeCloseTo(21, 6)
    expect(contrastRatio(white, white)).toBe(1)
  })

  it("matches the WCAG ratio for #777777 on white", () => {
    // #777777 is the classic grey that just misses 4.5:1 on white.
    const grey = oklch(0.5693, 0, 0)
    expect(toHex(grey)).toBe("#777777")
    expect(contrastRatio(grey, white)).toBeCloseTo(4.48, 2)
  })

  it("does not depend on argument order", () => {
    const blue = oklch(0.55, 0.15, 250)
    expect(contrastRatio(blue, white)).toBe(contrastRatio(white, blue))
  })
})

describe("toCss", () => {
  it("rounds to the precision CSS needs", () => {
    expect(toCss(oklch(0.123456, 0.0456789, 250.04))).toBe(
      "oklch(0.123 0.046 250)"
    )
  })
})
