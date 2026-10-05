import { isInSrgbGamut, oklch, type Oklch } from "./color"

export const themes = ["light", "dark"] as const
export type Theme = (typeof themes)[number]

export const densities = ["compact", "comfortable", "touch"] as const
export type Density = (typeof densities)[number]

type Themed<T> = Readonly<Record<Theme, T>>
type ByDensity = Readonly<Record<Density, string>>

/** The neutral hue, a faint blue taken from the app icon's #0e0e10 tile. */
const NEUTRAL_HUE = 286

function neutral(light: number, dark: number, chroma = 0.004): Themed<Oklch> {
  return {
    light: oklch(light, light === 1 ? 0 : chroma, NEUTRAL_HUE),
    dark: oklch(dark, chroma, NEUTRAL_HUE),
  }
}

/**
 * Lightness shared by every signal colour in a theme. In light, 0.55 keeps
 * 3:1 against every surface and 4.5:1 for white labels; in dark, 0.76 keeps
 * both against the canvas and near-black labels.
 */
const SIGNAL_LIGHTNESS: Themed<number> = { light: 0.55, dark: 0.76 }
const SIGNAL_MAX_CHROMA = 0.16

/** The most saturated colour sRGB can show at this lightness and hue, up to a cap. */
function strongestInGamut(lightness: number, hue: number): Oklch {
  let chroma = SIGNAL_MAX_CHROMA
  while (chroma > 0 && !isInSrgbGamut(oklch(lightness, chroma, hue))) {
    chroma = Number((chroma - 0.002).toFixed(3))
  }
  return oklch(lightness, chroma, hue)
}

function signal(hue: number): Themed<Oklch> {
  return {
    light: strongestInGamut(SIGNAL_LIGHTNESS.light, hue),
    dark: strongestInGamut(SIGNAL_LIGHTNESS.dark, hue),
  }
}

/**
 * Colour roles. The chrome is neutral; hue appears only where it carries
 * meaning: frequency bands, decks, cue points, levels and status.
 */
export const colors = {
  // Surfaces, from the app background up.
  canvas: neutral(0.985, 0.164),
  sunken: neutral(0.945, 0.13),
  surface: neutral(0.965, 0.195, 0.003),
  raised: neutral(1, 0.235, 0.006),
  control: neutral(0.935, 0.27, 0.006),
  "control-hover": neutral(0.905, 0.31, 0.007),

  // Lines. Dividers are decoration; control borders identify controls, so they keep 3:1.
  divider: neutral(0.91, 0.29, 0.006),
  "control-border": neutral(0.6, 0.55, 0.008),
  focus: neutral(0.18, 0.965, 0.004),

  // Text.
  text: neutral(0.18, 0.965, 0.004),
  "text-muted": neutral(0.47, 0.74, 0.009),

  // The primary action inverts the chrome rather than adding a hue.
  primary: neutral(0.18, 0.965, 0.004),
  "primary-text": neutral(0.985, 0.164),

  // Status.
  danger: { light: oklch(0.52, 0.17, 27), dark: oklch(0.74, 0.15, 25) },
  "danger-surface": {
    light: oklch(0.955, 0.02, 25),
    dark: oklch(0.26, 0.06, 25),
  },
  warning: { light: oklch(0.5, 0.108, 70), dark: oklch(0.82, 0.14, 80) },
  "warning-surface": {
    light: oklch(0.96, 0.03, 85),
    dark: oklch(0.26, 0.05, 75),
  },
  positive: { light: oklch(0.5, 0.12, 150), dark: oklch(0.8, 0.15, 150) },
  "positive-surface": {
    light: oklch(0.96, 0.025, 150),
    dark: oklch(0.26, 0.05, 150),
  },

  // Waveform frequency bands, warm for bass to cool for treble.
  "band-low": signal(28),
  "band-mid": signal(90),
  "band-high": signal(225),

  // Deck identity.
  "deck-a": signal(250),
  "deck-b": signal(345),
  "deck-c": signal(160),
  "deck-d": signal(300),

  // Default hot cue colours, evenly spaced around the hue circle.
  "cue-1": signal(25),
  "cue-2": signal(60),
  "cue-3": signal(95),
  "cue-4": signal(145),
  "cue-5": signal(190),
  "cue-6": signal(240),
  "cue-7": signal(290),
  "cue-8": signal(335),

  // Level meters: normal, within 6 dB of full scale, and clipping.
  "level-safe": signal(150),
  "level-hot": signal(75),
  "level-clip": signal(27),

  /** Text and icons drawn on any signal colour. */
  "on-signal": {
    light: oklch(1, 0, 0),
    dark: oklch(0.164, 0.004, NEUTRAL_HUE),
  },
} as const satisfies Record<string, Themed<Oklch>>

export type ColorName = keyof typeof colors

export const signalColors = [
  "band-low",
  "band-mid",
  "band-high",
  "deck-a",
  "deck-b",
  "deck-c",
  "deck-d",
  "cue-1",
  "cue-2",
  "cue-3",
  "cue-4",
  "cue-5",
  "cue-6",
  "cue-7",
  "cue-8",
  "level-safe",
  "level-hot",
  "level-clip",
] as const satisfies readonly ColorName[]

/** Shadows, which differ per theme because dark surfaces show elevation by lightness. */
export const elevation = {
  "shadow-raised": {
    light:
      "0 1px 2px oklch(0.2 0.01 286 / 0.08), 0 1px 1px oklch(0.2 0.01 286 / 0.04)",
    dark: "0 1px 2px oklch(0 0 0 / 0.5)",
  },
  "shadow-overlay": {
    light:
      "0 8px 24px oklch(0.2 0.01 286 / 0.14), 0 2px 6px oklch(0.2 0.01 286 / 0.08)",
    dark: "0 12px 32px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.06)",
  },
} as const satisfies Record<string, Themed<string>>

export const fonts = {
  // Archivo and Martian Mono lack ♭, ♯ and ∞; the system fonts listed after them supply those glyphs.
  "font-sans":
    '"Archivo Variable", ui-sans-serif, system-ui, sans-serif, "Apple Symbols", "Segoe UI Symbol", "DejaVu Sans"',
  "font-mono":
    '"Martian Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',
  /** Hardware-style labels use Archivo's width axis. */
  "font-stretch-label": "75%",
  /** Readouts narrow Martian Mono so long values fit beside each other. */
  "font-stretch-readout": "87.5%",
} as const

/** Fixed type roles. Body text depends on density and lives with the density tokens. */
export const typeScale = {
  label: {
    size: "0.6875rem",
    leading: "1rem",
    weight: "600",
    tracking: "0.06em",
  },
  caption: {
    size: "0.75rem",
    leading: "1rem",
    weight: "400",
    tracking: "0em",
  },
  title: {
    size: "0.9375rem",
    leading: "1.25rem",
    weight: "600",
    tracking: "0em",
  },
  heading: {
    size: "1.25rem",
    leading: "1.75rem",
    weight: "600",
    tracking: "-0.01em",
  },
  display: {
    size: "2.75rem",
    leading: "1",
    weight: "700",
    tracking: "-0.02em",
  },
  "readout-sm": {
    size: "0.75rem",
    leading: "1rem",
    weight: "400",
    tracking: "0em",
  },
  readout: {
    size: "0.9375rem",
    leading: "1.25rem",
    weight: "450",
    tracking: "0em",
  },
  "readout-lg": {
    size: "1.5rem",
    leading: "1.75rem",
    weight: "500",
    tracking: "-0.01em",
  },
  "readout-xl": {
    size: "2.75rem",
    leading: "1",
    weight: "500",
    tracking: "-0.02em",
  },
} as const satisfies Record<
  string,
  { size: string; leading: string; weight: string; tracking: string }
>

export type TypeRole = keyof typeof typeScale

/**
 * Sizes that follow the input method. Touch keeps every target at least
 * 44 px; compact suits a mouse and keyboard on a small screen.
 */
export const density = {
  "control-height-sm": {
    compact: "1.5rem",
    comfortable: "1.75rem",
    touch: "2.75rem",
  },
  "control-height": { compact: "1.75rem", comfortable: "2rem", touch: "3rem" },
  "control-height-lg": {
    compact: "2rem",
    comfortable: "2.5rem",
    touch: "3.5rem",
  },
  "control-padding-x": {
    compact: "0.5rem",
    comfortable: "0.625rem",
    touch: "1rem",
  },
  "control-gap": {
    compact: "0.25rem",
    comfortable: "0.375rem",
    touch: "0.5rem",
  },
  "icon-size": { compact: "0.875rem", comfortable: "1rem", touch: "1.25rem" },
  "target-min": { compact: "1.5rem", comfortable: "1.75rem", touch: "2.75rem" },
  "row-height": { compact: "1.75rem", comfortable: "2rem", touch: "3rem" },
  "knob-size": { compact: "2.5rem", comfortable: "3rem", touch: "4rem" },
  "fader-length": { compact: "7.5rem", comfortable: "9rem", touch: "12rem" },
  "text-body-size": {
    compact: "0.8125rem",
    comfortable: "0.875rem",
    touch: "1rem",
  },
  "text-body-leading": {
    compact: "1.25rem",
    comfortable: "1.375rem",
    touch: "1.5rem",
  },
} as const satisfies Record<string, ByDensity>

export type DensityTokenName = keyof typeof density

/** The density used when nothing chooses one and the pointer is precise. */
export const defaultDensity: Density = "comfortable"

/** The shadcn "small" radius preset (0.45rem), scaled the way shadcn scales it. */
const RADIUS_BASE_REM = 0.45

function radiusRem(scale: number): string {
  return `${Number((RADIUS_BASE_REM * scale).toFixed(3))}rem`
}

export const radius = {
  "radius-sm": radiusRem(0.6),
  "radius-md": radiusRem(0.8),
  "radius-lg": radiusRem(1),
  "radius-xl": radiusRem(1.4),
  "radius-full": "9999px",
} as const

export const motion = {
  /** Press and toggle feedback. */
  "duration-fast": "80ms",
  /** Hover and state changes. */
  "duration-base": "140ms",
  /** Panels and overlays entering or leaving. */
  "duration-slow": "220ms",
  "ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
  "ease-enter": "cubic-bezier(0, 0, 0.2, 1)",
  "ease-exit": "cubic-bezier(0.4, 0, 1, 1)",
} as const

export const durationTokens = [
  "duration-fast",
  "duration-base",
  "duration-slow",
] as const satisfies readonly (keyof typeof motion)[]

/** Stacking order for app structure. Overlay components stack themselves at 50, the overlay layer. */
export const layers = {
  "layer-base": "0",
  "layer-raised": "1",
  "layer-sticky": "10",
  "layer-drag": "20",
  "layer-overlay": "50",
} as const

export type TokenName =
  | `color-${ColorName}`
  | keyof typeof elevation
  | keyof typeof fonts
  | `text-${TypeRole}-${"size" | "leading" | "weight" | "tracking"}`
  | DensityTokenName
  | keyof typeof radius
  | keyof typeof motion
  | keyof typeof layers

function keysOf<T extends object>(record: T): (keyof T & string)[] {
  return Object.keys(record) as (keyof T & string)[]
}

/** Every token, as the name of its CSS custom property without the "--wf-" prefix. */
export const tokenNames: readonly TokenName[] = [
  ...keysOf(colors).map((name) => `color-${name}` as const),
  ...keysOf(elevation),
  ...keysOf(fonts),
  ...keysOf(typeScale).flatMap((role) =>
    (["size", "leading", "weight", "tracking"] as const).map(
      (part) => `text-${role}-${part}` as const
    )
  ),
  ...keysOf(density),
  ...keysOf(radius),
  ...keysOf(motion),
  ...keysOf(layers),
]
