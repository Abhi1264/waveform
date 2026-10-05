import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  PreferencesProvider,
  useTheme,
} from "@waveform/ui/components/preferences-provider"
import { describe, expect, it, vi } from "vitest"

import { useWindowTheme, type WindowTheme } from "./window-theme"

function ThemeSwitcher({
  setWindowTheme,
}: {
  setWindowTheme: (theme: WindowTheme) => Promise<void>
}) {
  useWindowTheme(setWindowTheme)
  const { setPreference } = useTheme()
  return (
    <>
      <button
        onClick={() => {
          setPreference("dark")
        }}
      >
        Dark
      </button>
      <button
        onClick={() => {
          setPreference("system")
        }}
      >
        System
      </button>
    </>
  )
}

describe("useWindowTheme", () => {
  it("follows the system until a theme is chosen, then sets it on the window", async () => {
    const setWindowTheme = vi.fn(() => Promise.resolve())
    render(
      <PreferencesProvider>
        <ThemeSwitcher setWindowTheme={setWindowTheme} />
      </PreferencesProvider>
    )
    expect(setWindowTheme).toHaveBeenLastCalledWith(null)

    await userEvent.click(screen.getByRole("button", { name: "Dark" }))
    expect(setWindowTheme).toHaveBeenLastCalledWith("dark")

    await userEvent.click(screen.getByRole("button", { name: "System" }))
    expect(setWindowTheme).toHaveBeenLastCalledWith(null)
  })

  it("keeps working when the window refuses", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    render(
      <PreferencesProvider>
        <ThemeSwitcher
          setWindowTheme={() => Promise.reject(new Error("not allowed"))}
        />
      </PreferencesProvider>
    )
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        "Could not set the window theme",
        expect.any(Error)
      )
    })
    warn.mockRestore()
  })
})
