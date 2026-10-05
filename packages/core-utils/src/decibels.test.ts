import { describe, expect, it } from "vitest"

import { formatDecibels } from "./decibels"

describe("formatDecibels", () => {
  it.each([
    [-3.5, "−3.5\u00a0dB"],
    [-3.45, "−3.5\u00a0dB"],
    [0, "0.0\u00a0dB"],
    [-0.04, "0.0\u00a0dB"],
    [6, "6.0\u00a0dB"],
    [-60, "−60.0\u00a0dB"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatDecibels(value)).toBe(expected)
  })

  it("writes silence as minus infinity", () => {
    expect(formatDecibels(Number.NEGATIVE_INFINITY)).toBe("−∞\u00a0dB")
  })

  it("signs gains when asked", () => {
    expect(formatDecibels(6, { signed: true })).toBe("+6.0\u00a0dB")
    expect(formatDecibels(-6, { signed: true })).toBe("−6.0\u00a0dB")
    expect(formatDecibels(0, { signed: true })).toBe("0.0\u00a0dB")
  })

  it("honours the decimals option", () => {
    expect(formatDecibels(-12.345, { decimals: 2 })).toBe("−12.35\u00a0dB")
    expect(formatDecibels(-12.345, { decimals: 0 })).toBe("−12\u00a0dB")
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (value) => {
    expect(() => formatDecibels(value)).toThrow(RangeError)
  })
})
