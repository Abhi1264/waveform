import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BottomSheet, TabletFrame } from "./layout"

describe("tablet layout", () => {
  it("names portrait and landscape and opens a sheet", () => {
    render(
      <TabletFrame orientation="portrait">
        <BottomSheet label="Library">
          <p>Tracks</p>
        </BottomSheet>
      </TabletFrame>
    )
    expect(
      screen.getByText("Tracks").closest("[data-orientation]")
    ).toHaveAttribute("data-orientation", "portrait")
    expect(screen.getByText("Library")).toBeVisible()
  })
})
