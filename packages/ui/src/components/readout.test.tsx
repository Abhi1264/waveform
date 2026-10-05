import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Readout, ReadoutGroup } from "./readout"

describe("Readout", () => {
  it("pairs its label and value as a description list entry", () => {
    render(
      <ReadoutGroup>
        <Readout label="Tempo" value="128.00" unit="BPM" />
        <Readout label="Key" value="8A" />
      </ReadoutGroup>
    )
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      ["Tempo", "Key"]
    )
    expect(
      screen.getAllByRole("definition").map((value) => value.textContent)
    ).toEqual(["128.00BPM", "8A"])
  })

  it("reserves room for its widest value", () => {
    render(
      <ReadoutGroup>
        <Readout label="Tempo" value="98.00" width={6} />
      </ReadoutGroup>
    )
    expect(screen.getByText("98.00")).toHaveStyle({ "--readout-width": "6ch" })
  })
})
