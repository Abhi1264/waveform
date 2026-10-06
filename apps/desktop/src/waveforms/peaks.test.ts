import { describe, expect, it } from "vitest"

import { beatFractions } from "./peaks"

describe("beatFractions", () => {
  it("places beats across the track", () => {
    expect(beatFractions([0, 0.5, 1], 1)).toEqual([0, 0.5, 1])
    expect(beatFractions([0.5], 0)).toEqual([])
  })
})
