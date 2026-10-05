import { describe, expect, it } from "vitest"

import { MINUS_SIGN } from "./number"
import { formatTrackTime } from "./time"

function parseTrackTime(text: string): number {
  const negative = text.startsWith(MINUS_SIGN)
  const parts = text.replace(MINUS_SIGN, "").split(":").map(Number)
  const seconds = parts.reduce((total, part) => total * 60 + part, 0)
  return negative ? -seconds : seconds
}

describe("formatTrackTime", () => {
  it.each([
    [0, "00:00.0"],
    [0.3, "00:00.3"],
    [59.99, "00:59.9"],
    [205.47, "03:25.4"],
    [3599.95, "59:59.9"],
    [3723.5, "1:02:03.5"],
  ])("formats %s as %s", (seconds, expected) => {
    expect(formatTrackTime(seconds)).toBe(expected)
  })

  it("honours the decimals option", () => {
    expect(formatTrackTime(205.9, { decimals: 0 })).toBe("03:25")
    expect(formatTrackTime(205.479, { decimals: 2 })).toBe("03:25.47")
    expect(formatTrackTime(1.0005, { decimals: 3 })).toBe("00:01.000")
  })

  it("prefixes negative values with a minus sign", () => {
    expect(formatTrackTime(-151.4)).toBe(`${MINUS_SIGN}02:31.4`)
  })

  it("does not sign a negative value that truncates to zero", () => {
    expect(formatTrackTime(-0.04)).toBe("00:00.0")
  })

  it("never shows a time ahead of the real one, and lags by less than one step", () => {
    for (let tenths = 0; tenths <= 40_000; tenths += 7) {
      const seconds = tenths / 10 + 0.05
      const shown = parseTrackTime(formatTrackTime(seconds))
      expect(shown).toBeLessThanOrEqual(seconds + 1e-9)
      expect(seconds - shown).toBeLessThan(0.1 + 1e-9)
    }
  })

  it("rejects non-finite values", () => {
    expect(() => formatTrackTime(Number.NaN)).toThrow(RangeError)
  })
})
