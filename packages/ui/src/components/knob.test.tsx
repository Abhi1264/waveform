import { formatDecibels } from "@waveform/core-utils"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Knob } from "./knob"
import { closest } from "../test/dom"

function renderGainKnob(onChange = vi.fn()) {
  render(
    <Knob
      label="Gain"
      minValue={-12}
      maxValue={12}
      step={0.5}
      defaultValue={0}
      formatValue={(value) => formatDecibels(value, { signed: true })}
      onChange={onChange}
    />
  )
  return { slider: screen.getByRole("slider", { name: "Gain" }), onChange }
}

describe("Knob", () => {
  it("is a slider named by its label, announcing the value with its unit", () => {
    const { slider } = renderGainKnob()
    expect(slider).toHaveAttribute("aria-valuetext", "0.0\u00a0dB")
    expect(slider).toHaveAttribute("aria-orientation", "vertical")
    expect(screen.getByText("0.0 dB")).toBeInTheDocument()
  })

  it("moves one step with the arrow keys", async () => {
    const { slider, onChange } = renderGainKnob()
    slider.focus()

    await userEvent.keyboard("{ArrowUp}")
    expect(slider).toHaveAttribute("aria-valuetext", "+0.5\u00a0dB")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(slider).toHaveAttribute("aria-valuetext", "\u22120.5\u00a0dB")
    expect(onChange).toHaveBeenLastCalledWith(-0.5)
  })

  it("moves a larger step with Page Up, Page Down and Shift with an arrow", async () => {
    const { slider } = renderGainKnob()
    slider.focus()

    // A tenth of the 24 dB range, rounded to the 0.5 dB step.
    await userEvent.keyboard("{PageUp}")
    expect(slider).toHaveValue("2.5")
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}")
    expect(slider).toHaveValue("5")
    await userEvent.keyboard("{PageDown}{PageDown}{PageDown}")
    expect(slider).toHaveValue("-2.5")
  })

  it("goes to the ends of the range with Home and End", async () => {
    const { slider } = renderGainKnob()
    slider.focus()

    await userEvent.keyboard("{End}")
    expect(slider).toHaveAttribute("aria-valuetext", "+12.0\u00a0dB")
    await userEvent.keyboard("{Home}")
    expect(slider).toHaveAttribute("aria-valuetext", "\u221212.0\u00a0dB")
  })

  it("does not jump when pressed, and a double-click returns it to the default", async () => {
    const { slider } = renderGainKnob()
    slider.focus()
    await userEvent.keyboard("{End}")

    const face = closest(slider, "[data-slot=knob-face]")
    await userEvent.click(face)
    expect(slider).toHaveValue("12")

    await userEvent.dblClick(face)
    expect(slider).toHaveValue("0")
  })

  it("can be disabled", () => {
    render(<Knob label="Filter" isDisabled defaultValue={0} />)
    expect(screen.getByRole("slider", { name: "Filter" })).toBeDisabled()
  })
})
