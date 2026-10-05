import { describe, expect, it } from "vitest"

import { formatBpm, formatPitchPercent } from "./tempo"

describe("formatBpm", () => {
  it.each([
    [128, 2, "128.00"],
    [127.996, 2, "128.00"],
    [174.5, 1, "174.5"],
    [90.25, 0, "90"],
  ])("formats %s with %s decimals as %s", (bpm, decimals, expected) => {
    expect(formatBpm(bpm, decimals)).toBe(expected)
  })

  it.each([0, -120, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s",
    (bpm) => {
      expect(() => formatBpm(bpm)).toThrow(RangeError)
    }
  )
})

describe("formatPitchPercent", () => {
  it.each([
    [3.2, "+3.20%"],
    [-1.5, "−1.50%"],
    [0, "0.00%"],
    [-0.001, "0.00%"],
    [8, "+8.00%"],
  ])("formats %s as %s", (percent, expected) => {
    expect(formatPitchPercent(percent)).toBe(expected)
  })
})
