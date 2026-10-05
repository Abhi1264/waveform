import { useTheme } from "@waveform/ui/components/preferences-provider"
import { useEffect } from "react"

export type WindowTheme = "light" | "dark" | null

/**
 * Keeps the native title bar in step with the chosen theme. `null` hands the
 * window back to the system appearance.
 */
export function useWindowTheme(
  setWindowTheme: (theme: WindowTheme) => Promise<void>
): void {
  const { preference } = useTheme()

  useEffect(() => {
    const theme = preference === "system" ? null : preference
    setWindowTheme(theme).catch((error: unknown) => {
      console.warn("Could not set the window theme", error)
    })
  }, [preference, setWindowTheme])
}
