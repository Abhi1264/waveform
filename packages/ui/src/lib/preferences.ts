export const themePreferences = ["system", "light", "dark"] as const
export type ThemePreference = (typeof themePreferences)[number]

export const densityPreferences = [
  "auto",
  "compact",
  "comfortable",
  "touch",
] as const
export type DensityPreference = (typeof densityPreferences)[number]

export const motionPreferences = ["system", "full", "reduced"] as const
export type MotionPreference = (typeof motionPreferences)[number]

/** Local storage keys. Nothing is stored for a choice left at its default. */
export const preferenceKeys = {
  theme: "waveform.theme",
  density: "waveform.density",
  motion: "waveform.motion",
} as const

interface SavedChoice {
  key: string
  values: readonly string[]
  /** "class" adds the value as a class on the root element; anything else is an attribute name. */
  target: string
}

const savedChoices: readonly SavedChoice[] = [
  {
    key: preferenceKeys.theme,
    values: themePreferences.filter((value) => value !== "system"),
    target: "class",
  },
  {
    key: preferenceKeys.density,
    values: densityPreferences.filter((value) => value !== "auto"),
    target: "data-density",
  },
  {
    key: preferenceKeys.motion,
    values: motionPreferences.filter((value) => value !== "system"),
    target: "data-motion",
  },
]

// Serialised into an inline script, so it may only use its argument and browser globals.
function restoreSavedChoices(choices: readonly SavedChoice[]): void {
  try {
    const root = document.documentElement
    for (const { key, values, target } of choices) {
      const value = localStorage.getItem(key)
      if (value === null || !values.includes(value)) continue
      if (target === "class") {
        root.classList.add(value)
      } else {
        root.setAttribute(target, value)
      }
    }
  } catch {
    // Storage can be disabled; the defaults apply.
  }
}

/** Applies saved appearance choices to the root element. Call before the first render. */
export function applySavedPreferences(): void {
  restoreSavedChoices(savedChoices)
}

/**
 * The same as an inline script for the document head, so a server-rendered
 * page does not show the default theme before it hydrates.
 */
export const savedPreferencesScript = `(${restoreSavedChoices.toString()})(${JSON.stringify(savedChoices)})`
