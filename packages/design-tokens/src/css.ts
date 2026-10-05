import { toCss } from "./color"
import {
  colors,
  defaultDensity,
  densities,
  density,
  durationTokens,
  elevation,
  fonts,
  layers,
  motion,
  radius,
  typeScale,
  type Density,
  type Theme,
} from "./tokens"

type Declaration = readonly [name: string, value: string]

const HEADER =
  "/* Generated from src/tokens.ts. Do not edit: run `pnpm --filter @waveform/design-tokens generate`. */"

function themeDeclarations(theme: Theme): Declaration[] {
  return [
    ["color-scheme", theme],
    ...Object.entries(colors).map(([name, value]): Declaration => [
      `--wf-color-${name}`,
      toCss(value[theme]),
    ]),
    ...Object.entries(elevation).map(([name, value]): Declaration => [
      `--wf-${name}`,
      value[theme],
    ]),
  ]
}

function densityDeclarations(mode: Density): Declaration[] {
  return Object.entries(density).map(([name, value]) => [
    `--wf-${name}`,
    value[mode],
  ])
}

function plain(group: Readonly<Record<string, string>>): Declaration[] {
  return Object.entries(group).map(([name, value]) => [`--wf-${name}`, value])
}

function fixedDeclarations(): Declaration[] {
  const typeDeclarations = Object.entries(typeScale).flatMap(
    ([role, style]): Declaration[] => [
      [`--wf-text-${role}-size`, style.size],
      [`--wf-text-${role}-leading`, style.leading],
      [`--wf-text-${role}-weight`, style.weight],
      [`--wf-text-${role}-tracking`, style.tracking],
    ]
  )
  return [
    ...plain(fonts),
    ...typeDeclarations,
    ...plain(radius),
    ...plain(motion),
    ...plain(layers),
  ]
}

function rule(
  selector: string,
  declarations: Declaration[],
  depth = 0
): string {
  const indent = "  ".repeat(depth)
  const body = declarations
    .map(([name, value]) => `${indent}  ${name}: ${value};`)
    .join("\n")
  return `${indent}${selector} {\n${body}\n${indent}}`
}

function atRule(
  condition: string,
  selector: string,
  declarations: Declaration[]
): string {
  return `${condition} {\n${rule(selector, declarations, 1)}\n}`
}

const noMotion = durationTokens.map((name): Declaration => [
  `--wf-${name}`,
  "0ms",
])

/**
 * The tokens as CSS custom properties. With no attributes on the root
 * element, the theme, density and motion follow the system; the `light` or
 * `dark` class and the `data-density` and `data-motion` attributes override it.
 */
export function renderTokensCss(): string {
  return `${[
    HEADER,
    rule(":root", [
      ...fixedDeclarations(),
      ...themeDeclarations("light"),
      ...densityDeclarations(defaultDensity),
    ]),
    atRule(
      "@media (prefers-color-scheme: dark)",
      ":root:not(.light)",
      themeDeclarations("dark")
    ),
    rule(":root.dark", themeDeclarations("dark")),
    atRule(
      "@media (pointer: coarse)",
      ":root:not([data-density])",
      densityDeclarations("touch")
    ),
    // Any element can pin a density, so the examples page can show all three.
    ...densities.map((mode) =>
      rule(`[data-density="${mode}"]`, densityDeclarations(mode))
    ),
    atRule(
      "@media (prefers-reduced-motion: reduce)",
      ':root:not([data-motion="full"])',
      noMotion
    ),
    rule('[data-motion="reduced"]', noMotion),
    rule(
      '[data-motion="full"]',
      durationTokens.map((name): Declaration => [`--wf-${name}`, motion[name]])
    ),
  ].join("\n\n")}\n`
}
