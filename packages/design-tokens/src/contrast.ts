import { contrastRatio } from "./color"
import { colors, signalColors, type ColorName, type Theme } from "./tokens"

/** WCAG 2.2 AA minimums: 4.5:1 for text (1.4.3), 3:1 for controls and graphics (1.4.11). */
export const TEXT_CONTRAST = 4.5
export const GRAPHICS_CONTRAST = 3

export interface ContrastRequirement {
  readonly foreground: ColorName
  readonly background: ColorName
  readonly minimum: typeof TEXT_CONTRAST | typeof GRAPHICS_CONTRAST
}

export interface ContrastResult extends ContrastRequirement {
  readonly ratio: number
}

function pairs(
  foregrounds: readonly ColorName[],
  backgrounds: readonly ColorName[],
  minimum: ContrastRequirement["minimum"]
): ContrastRequirement[] {
  return foregrounds.flatMap((foreground) =>
    backgrounds.map((background) => ({ foreground, background, minimum }))
  )
}

const surfaces = [
  "canvas",
  "sunken",
  "surface",
  "raised",
  "control",
  "control-hover",
] as const satisfies readonly ColorName[]

/** Every pairing the interface draws, with the contrast it must keep in both themes. */
export const contrastRequirements: readonly ContrastRequirement[] = [
  ...pairs(["text", "text-muted"], surfaces, TEXT_CONTRAST),
  ...pairs(["primary-text"], ["primary"], TEXT_CONTRAST),
  ...pairs(
    ["danger"],
    ["canvas", "surface", "raised", "danger-surface"],
    TEXT_CONTRAST
  ),
  ...pairs(
    ["warning"],
    ["canvas", "surface", "raised", "warning-surface"],
    TEXT_CONTRAST
  ),
  ...pairs(
    ["positive"],
    ["canvas", "surface", "raised", "positive-surface"],
    TEXT_CONTRAST
  ),
  ...pairs(["on-signal"], signalColors, TEXT_CONTRAST),
  ...pairs(
    ["control-border", "focus"],
    ["canvas", "surface", "raised", "control"],
    GRAPHICS_CONTRAST
  ),
  ...pairs(
    signalColors,
    ["canvas", "sunken", "surface", "raised", "control"],
    GRAPHICS_CONTRAST
  ),
]

export function checkContrast(theme: Theme): ContrastResult[] {
  return contrastRequirements.map((requirement) => ({
    ...requirement,
    ratio: contrastRatio(
      colors[requirement.foreground][theme],
      colors[requirement.background][theme]
    ),
  }))
}
