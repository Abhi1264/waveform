import { IconContext } from "@phosphor-icons/react"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { use } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  PreferencesProvider,
  useDensity,
  useMotion,
  useTheme,
} from "./preferences-provider"
import { setMediaQuery } from "../test/media"

function Preferences() {
  const theme = useTheme()
  const density = useDensity()
  const motion = useMotion()
  const icons = use(IconContext)
  return (
    <div>
      <p>Theme: {theme.theme}</p>
      <p>Density: {density.density}</p>
      <p>Icon weight: {icons.weight}</p>
      <p>Reduced motion: {motion.reducedMotion ? "yes" : "no"}</p>
      <button
        onClick={() => {
          theme.setPreference("light")
        }}
      >
        Light
      </button>
      <button
        onClick={() => {
          theme.setPreference("dark")
        }}
      >
        Dark
      </button>
      <button
        onClick={() => {
          theme.setPreference("system")
        }}
      >
        System theme
      </button>
      <button
        onClick={() => {
          density.setPreference("compact")
        }}
      >
        Compact
      </button>
      <button
        onClick={() => {
          density.setPreference("auto")
        }}
      >
        Automatic density
      </button>
      <button
        onClick={() => {
          motion.setPreference("full")
        }}
      >
        Full motion
      </button>
      <button
        onClick={() => {
          motion.setPreference("reduced")
        }}
      >
        Reduced motion
      </button>
    </div>
  )
}

function renderPreferences() {
  return render(
    <PreferencesProvider>
      <Preferences />
    </PreferencesProvider>
  )
}

const root = document.documentElement

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ThemeProvider", () => {
  it("follows the system until a theme is chosen", async () => {
    setMediaQuery("(prefers-color-scheme: dark)", true)
    renderPreferences()

    expect(screen.getByText("Theme: dark")).toBeInTheDocument()
    expect(root).not.toHaveClass("dark")
    expect(root).not.toHaveClass("light")

    act(() => {
      setMediaQuery("(prefers-color-scheme: dark)", false)
    })
    expect(screen.getByText("Theme: light")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Dark" }))
    expect(screen.getByText("Theme: dark")).toBeInTheDocument()
    expect(root).toHaveClass("dark")
    expect(localStorage.getItem("waveform.theme")).toBe("dark")
  })

  it("stores nothing for the default and clears the class when going back to it", async () => {
    renderPreferences()
    await userEvent.click(screen.getByRole("button", { name: "Light" }))
    expect(root).toHaveClass("light")

    await userEvent.click(screen.getByRole("button", { name: "System theme" }))
    expect(root).not.toHaveClass("light")
    expect(localStorage.getItem("waveform.theme")).toBeNull()
  })

  it("restores a saved theme and ignores values it does not know", () => {
    localStorage.setItem("waveform.theme", "dark")
    localStorage.setItem("waveform.density", "enormous")
    renderPreferences()

    expect(screen.getByText("Theme: dark")).toBeInTheDocument()
    expect(root).toHaveClass("dark")
    expect(screen.getByText("Density: comfortable")).toBeInTheDocument()
  })

  it("keeps a choice for the session when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage is disabled")
    })
    renderPreferences()

    await userEvent.click(screen.getByRole("button", { name: "Dark" }))
    expect(screen.getByText("Theme: dark")).toBeInTheDocument()

    vi.restoreAllMocks()
    await userEvent.click(screen.getByRole("button", { name: "System theme" }))
  })
})

describe("DensityProvider", () => {
  it("uses touch density for a coarse pointer unless a density is chosen", async () => {
    setMediaQuery("(pointer: coarse)", true)
    renderPreferences()

    expect(screen.getByText("Density: touch")).toBeInTheDocument()
    expect(root).not.toHaveAttribute("data-density")

    await userEvent.click(screen.getByRole("button", { name: "Compact" }))
    expect(screen.getByText("Density: compact")).toBeInTheDocument()
    expect(root).toHaveAttribute("data-density", "compact")

    await userEvent.click(
      screen.getByRole("button", { name: "Automatic density" })
    )
    expect(root).not.toHaveAttribute("data-density")
  })

  it("draws icons bold only in compact density", async () => {
    renderPreferences()
    expect(screen.getByText("Icon weight: regular")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Compact" }))
    expect(screen.getByText("Icon weight: bold")).toBeInTheDocument()
  })
})

describe("MotionProvider", () => {
  it("follows the system, and an explicit choice overrides it", async () => {
    setMediaQuery("(prefers-reduced-motion: reduce)", true)
    renderPreferences()

    expect(screen.getByText("Reduced motion: yes")).toBeInTheDocument()
    expect(root).not.toHaveAttribute("data-motion")

    await userEvent.click(screen.getByRole("button", { name: "Full motion" }))
    expect(screen.getByText("Reduced motion: no")).toBeInTheDocument()
    expect(root).toHaveAttribute("data-motion", "full")

    await userEvent.click(
      screen.getByRole("button", { name: "Reduced motion" })
    )
    expect(root).toHaveAttribute("data-motion", "reduced")
  })
})

describe("the hooks", () => {
  it("explain when they are used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    expect(() => render(<Preferences />)).toThrow(
      "useTheme must be used inside its provider"
    )
  })
})
