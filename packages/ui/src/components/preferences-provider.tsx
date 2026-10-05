"use client"

import { IconContext, type IconProps } from "@phosphor-icons/react"
import {
  defaultDensity,
  type Density,
  type Theme,
} from "@waveform/design-tokens"
import {
  createContext,
  use,
  useEffect,
  useMemo,
  type Context,
  type ReactNode,
} from "react"

import { useMediaQuery } from "@waveform/ui/hooks/use-media-query"
import { usePreference } from "@waveform/ui/hooks/use-preference"
import {
  densityPreferences,
  motionPreferences,
  preferenceKeys,
  themePreferences,
  type DensityPreference,
  type MotionPreference,
  type ThemePreference,
} from "@waveform/ui/lib/preferences"

interface ThemeState {
  preference: ThemePreference
  /** The theme in effect, after following the system if the preference is "system". */
  theme: Theme
  setPreference: (preference: ThemePreference) => void
}

interface DensityState {
  preference: DensityPreference
  /** The density in effect: touch for a coarse pointer when the preference is "auto". */
  density: Density
  setPreference: (preference: DensityPreference) => void
}

interface MotionState {
  preference: MotionPreference
  reducedMotion: boolean
  setPreference: (preference: MotionPreference) => void
}

const ThemeContext = createContext<ThemeState | null>(null)
const DensityContext = createContext<DensityState | null>(null)
const MotionContext = createContext<MotionState | null>(null)

/**
 * Applies the theme. With "system" the root element gets no class and the
 * tokens follow `prefers-color-scheme`; otherwise it gets `light` or `dark`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = usePreference(
    preferenceKeys.theme,
    themePreferences,
    "system"
  )
  const systemIsDark = useMediaQuery("(prefers-color-scheme: dark)")
  const theme: Theme =
    preference === "system" ? (systemIsDark ? "dark" : "light") : preference

  useEffect(() => {
    const { classList } = document.documentElement
    classList.toggle("light", preference === "light")
    classList.toggle("dark", preference === "dark")
    return () => {
      classList.remove("light", "dark")
    }
  }, [preference])

  const value = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference]
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}

/**
 * Applies the density, and draws icons bold in compact density, where
 * Phosphor's regular strokes would be thinner than a pixel.
 */
export function DensityProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = usePreference(
    preferenceKeys.density,
    densityPreferences,
    "auto"
  )
  const coarsePointer = useMediaQuery("(pointer: coarse)")
  const density: Density =
    preference === "auto"
      ? coarsePointer
        ? "touch"
        : defaultDensity
      : preference

  useEffect(() => {
    const root = document.documentElement
    if (preference === "auto") {
      root.removeAttribute("data-density")
    } else {
      root.setAttribute("data-density", preference)
    }
    return () => {
      root.removeAttribute("data-density")
    }
  }, [preference])

  const value = useMemo(
    () => ({ preference, density, setPreference }),
    [preference, density, setPreference]
  )
  const icons = useMemo<IconProps>(
    () => ({ weight: density === "compact" ? "bold" : "regular" }),
    [density]
  )
  return (
    <DensityContext value={value}>
      <IconContext value={icons}>{children}</IconContext>
    </DensityContext>
  )
}

/** Applies the motion preference; "system" follows `prefers-reduced-motion`. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = usePreference(
    preferenceKeys.motion,
    motionPreferences,
    "system"
  )
  const systemReducesMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const reducedMotion =
    preference === "system" ? systemReducesMotion : preference === "reduced"

  useEffect(() => {
    const root = document.documentElement
    if (preference === "system") {
      root.removeAttribute("data-motion")
    } else {
      root.setAttribute("data-motion", preference)
    }
    return () => {
      root.removeAttribute("data-motion")
    }
  }, [preference])

  const value = useMemo(
    () => ({ preference, reducedMotion, setPreference }),
    [preference, reducedMotion, setPreference]
  )
  return <MotionContext value={value}>{children}</MotionContext>
}

/** The theme, density and motion providers together. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DensityProvider>
        <MotionProvider>{children}</MotionProvider>
      </DensityProvider>
    </ThemeProvider>
  )
}

function useRequired<T>(context: Context<T | null>, name: string): T {
  const value = use(context)
  if (value === null) {
    throw new Error(`${name} must be used inside its provider`)
  }
  return value
}

export function useTheme(): ThemeState {
  return useRequired(ThemeContext, "useTheme")
}

export function useDensity(): DensityState {
  return useRequired(DensityContext, "useDensity")
}

export function useMotion(): MotionState {
  return useRequired(MotionContext, "useMotion")
}
