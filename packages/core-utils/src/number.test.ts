import { describe, expect, it } from "vitest"

import { formatFixed, MINUS_SIGN } from "./number"

describe("formatFixed", () => {
  it("uses the typographic minus sign", () => {
    expect(formatFixed(-3.5, 1)).toBe(`${MINUS_SIGN}3.5`)
    expect(formatFixed(-3.5, 1)).not.toContain("-")
  })

  it("rounds halves away from zero symmetrically", () => {
    expect(formatFixed(2.25, 1)).toBe("2.3")
    expect(formatFixed(-2.25, 1)).toBe(`${MINUS_SIGN}2.3`)
  })

  it("prefixes positive values with + only when signed", () => {
    expect(formatFixed(1.5, 1)).toBe("1.5")
    expect(formatFixed(1.5, 1, { signed: true })).toBe("+1.5")
  })

  it("never signs a value that rounds to zero", () => {
    for (let value = -0.049; value <= 0.049; value += 0.001) {
      expect(formatFixed(value, 1, { signed: true })).toBe("0.0")
    }
    expect(formatFixed(-0, 1)).toBe("0.0")
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects %s",
    (value) => {
      expect(() => formatFixed(value, 1)).toThrow(RangeError)
    }
  )
})
