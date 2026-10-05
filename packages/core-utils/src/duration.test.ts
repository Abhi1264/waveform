import { describe, expect, it } from "vitest"

import { formatMilliseconds } from "./duration"

describe("formatMilliseconds", () => {
  it.each([
    [0.42, 2, "0.42\u00a0ms"],
    [0.031, 2, "0.03\u00a0ms"],
    [12.5, 1, "12.5\u00a0ms"],
    [1000, 0, "1000\u00a0ms"],
  ])("formats %s with %s decimals as %s", (value, decimals, expected) => {
    expect(formatMilliseconds(value, decimals)).toBe(expected)
  })

  it("rejects non-finite values", () => {
    expect(() => formatMilliseconds(Number.NaN)).toThrow(RangeError)
  })
})
