import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LevelMeter } from "./level-meter"

function litZones(meter: HTMLElement): string[] {
  return [...meter.querySelectorAll("[data-lit]")].map(
    (segment) => segment.getAttribute("data-zone") ?? ""
  )
}

describe("LevelMeter", () => {
  it("is a meter that announces the level in decibels", () => {
    render(<LevelMeter label="Deck A level" level={-12} />)
    const meter = screen.getByRole("meter", { name: "Deck A level" })
    expect(meter).toHaveAttribute("aria-valuenow", "-12")
    expect(meter).toHaveAttribute("aria-valuemin", "-48")
    expect(meter).toHaveAttribute("aria-valuemax", "0")
    expect(meter).toHaveAttribute("aria-valuetext", "\u221212.0\u00a0dB")
  })

  it("lights safe segments, then hot ones from 6 dB below full scale", () => {
    render(<LevelMeter label="Level" level={-3} segments={9} min={-48} />)
    // Thresholds are -48, -42, …, -6, and 0 for the clip segment.
    expect(litZones(screen.getByRole("meter"))).toEqual([
      "safe",
      "safe",
      "safe",
      "safe",
      "safe",
      "safe",
      "safe",
      "hot",
    ])
  })

  it("lights the clip segment only at full scale", () => {
    render(<LevelMeter label="Level" level={0} segments={9} />)
    expect(litZones(screen.getByRole("meter")).at(-1)).toBe("clip")
  })

  it("holds the peak as a lit segment above the level", () => {
    render(<LevelMeter label="Level" level={-40} peak={-6} segments={9} />)
    expect(litZones(screen.getByRole("meter"))).toEqual(["safe", "safe", "hot"])
  })

  it("shows silence as an empty meter", () => {
    render(
      <LevelMeter label="Level" level={Number.NEGATIVE_INFINITY} segments={9} />
    )
    const meter = screen.getByRole("meter")
    expect(litZones(meter)).toEqual([])
    expect(meter).toHaveAttribute("aria-valuenow", "-48")
    expect(meter).toHaveAttribute("aria-valuetext", "\u2212\u221e\u00a0dB")
  })
})
