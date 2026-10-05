import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

function renderThemeChoice(onSelectionChange = vi.fn()) {
  render(
    <ToggleGroup
      aria-label="Theme"
      selectionMode="single"
      disallowEmptySelection
      defaultSelectedKeys={["system"]}
      onSelectionChange={onSelectionChange}
      variant="outline"
      spacing={0}
      className="custom-group"
    >
      <ToggleGroupItem id="system">System</ToggleGroupItem>
      <ToggleGroupItem id="light">Light</ToggleGroupItem>
      <ToggleGroupItem id="dark">Dark</ToggleGroupItem>
    </ToggleGroup>
  )
  return onSelectionChange
}

describe("ToggleGroup", () => {
  it("is a radio group when one choice is allowed", () => {
    renderThemeChoice()
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toHaveClass(
      "custom-group"
    )
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked()
  })

  it("selects with a click and moves between choices with the arrow keys", async () => {
    const onSelectionChange = renderThemeChoice()

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }))
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked()
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["dark"]))

    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("radio", { name: "Light" })).toHaveFocus()
  })
})
