import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { AppearanceSettings } from "./appearance-settings"
import { PreferencesProvider } from "./preferences-provider"
import { setMediaQuery } from "../test/media"

function renderSettings() {
  render(
    <PreferencesProvider>
      <AppearanceSettings />
    </PreferencesProvider>
  )
}

describe("AppearanceSettings", () => {
  it("offers each preference as a labelled single choice", () => {
    renderSettings()
    for (const name of ["Theme", "Density", "Motion"]) {
      expect(screen.getByRole("radiogroup", { name })).toBeInTheDocument()
    }
    expect(screen.getByRole("radio", { name: "Automatic" })).toBeChecked()
  })

  it("says what the system setting resolves to", () => {
    setMediaQuery("(prefers-color-scheme: dark)", true)
    renderSettings()
    expect(
      screen.getByRole("radiogroup", { name: "Theme" })
    ).toHaveAccessibleDescription("Follows the system, which is dark now.")
  })

  it("applies a choice to the document", async () => {
    renderSettings()
    await userEvent.click(screen.getByRole("radio", { name: "Compact" }))
    expect(document.documentElement).toHaveAttribute("data-density", "compact")
    expect(screen.getByRole("radio", { name: "Compact" })).toBeChecked()
  })
})
