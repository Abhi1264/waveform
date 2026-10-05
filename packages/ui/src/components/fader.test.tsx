import { formatDecibels } from "@waveform/core-utils"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Fader } from "./fader"
import { closest } from "../test/dom"

function renderVolumeFader() {
  render(
    <Fader
      label="Volume"
      minValue={-60}
      maxValue={0}
      step={1}
      defaultValue={-6}
      formatValue={(value) => formatDecibels(value)}
    />
  )
  return screen.getByRole("slider", { name: "Volume" })
}

describe("Fader", () => {
  it("is a vertical slider that announces the value with its unit", () => {
    const slider = renderVolumeFader()
    expect(slider).toHaveAttribute("aria-orientation", "vertical")
    expect(slider).toHaveAttribute("aria-valuetext", "\u22126.0\u00a0dB")
  })

  it("supports the arrow, Page Up, Page Down, Home and End keys", async () => {
    const slider = renderVolumeFader()
    slider.focus()

    await userEvent.keyboard("{ArrowUp}")
    expect(slider).toHaveValue("-5")
    await userEvent.keyboard("{ArrowLeft}")
    expect(slider).toHaveValue("-6")
    await userEvent.keyboard("{PageDown}")
    expect(slider).toHaveValue("-12")
    await userEvent.keyboard("{End}")
    expect(slider).toHaveAttribute("aria-valuetext", "0.0\u00a0dB")
    await userEvent.keyboard("{Home}")
    expect(slider).toHaveValue("-60")
  })

  it("ignores clicks on the track", async () => {
    const slider = renderVolumeFader()
    await userEvent.click(closest(slider, "[data-slot=fader-track]"))
    expect(slider).toHaveValue("-6")
  })

  it("can be horizontal, as a crossfader is", () => {
    render(
      <Fader
        label="Crossfader"
        orientation="horizontal"
        minValue={-1}
        maxValue={1}
        step={0.01}
        defaultValue={0}
      />
    )
    expect(screen.getByRole("slider", { name: "Crossfader" })).toHaveAttribute(
      "aria-orientation",
      "horizontal"
    )
  })
})
