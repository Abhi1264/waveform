"use client"

import {
  checkContrast,
  colors,
  contrastRatio,
  GRAPHICS_CONTRAST,
  TEXT_CONTRAST,
  toCss,
  toHex,
  type ColorName,
  type Theme,
} from "@waveform/design-tokens"
import { useTheme } from "@waveform/ui/components/preferences-provider"

import { Panel } from "./panel"

const groups: readonly { label: string; names: readonly ColorName[] }[] = [
  {
    label: "Surfaces",
    names: [
      "canvas",
      "sunken",
      "surface",
      "raised",
      "control",
      "control-hover",
    ],
  },
  {
    label: "Lines and text",
    names: ["divider", "control-border", "focus", "text", "text-muted"],
  },
  {
    label: "Primary and status",
    names: [
      "primary",
      "primary-text",
      "danger",
      "danger-surface",
      "warning",
      "warning-surface",
      "positive",
      "positive-surface",
    ],
  },
  { label: "Frequency bands", names: ["band-low", "band-mid", "band-high"] },
  { label: "Decks", names: ["deck-a", "deck-b", "deck-c", "deck-d"] },
  {
    label: "Cues",
    names: [
      "cue-1",
      "cue-2",
      "cue-3",
      "cue-4",
      "cue-5",
      "cue-6",
      "cue-7",
      "cue-8",
    ],
  },
  {
    label: "Levels",
    names: ["level-safe", "level-hot", "level-clip", "on-signal"],
  },
]

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`
}

function Swatch({ name, theme }: { name: ColorName; theme: Theme }) {
  const color = colors[name][theme]
  const onCanvas = contrastRatio(color, colors.canvas[theme])

  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <div
        className="h-12 rounded-md border border-divider"
        style={{ backgroundColor: toCss(color) }}
      />
      <p className="truncate faceplate text-muted-foreground">{name}</p>
      <p className="readout text-readout-sm" translate="no">
        {toHex(color)}
      </p>
      <p className="text-caption text-muted-foreground">
        {formatRatio(onCanvas)} on canvas
      </p>
    </li>
  )
}

function ColorPanel() {
  const { theme } = useTheme()
  const results = checkContrast(theme)
  const failures = results.filter((result) => result.ratio < result.minimum)
  const textPairs = results.filter(
    (result) => result.minimum === TEXT_CONTRAST
  ).length
  const graphicPairs = results.filter(
    (result) => result.minimum === GRAPHICS_CONTRAST
  ).length

  return (
    <Panel
      id="colour"
      eyebrow="Colour"
      title="Monochrome chrome. Hue only where it means something."
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Neutrals carry a faint blue from the mark. Signal colours share one
        lightness per theme so no hue shouts louder than another. Ratios below
        are live for the theme in effect now ({theme}).
      </p>

      <p role="status" className="text-body">
        {failures.length === 0
          ? `All ${String(results.length)} required pairs meet WCAG 2.2 AA: ${String(textPairs)} text pairs at ${String(TEXT_CONTRAST)}:1, ${String(graphicPairs)} graphic pairs at ${String(GRAPHICS_CONTRAST)}:1.`
          : `${String(failures.length)} of ${String(results.length)} pairs fail AA in the ${theme} theme.`}
      </p>

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-3">
          <h3 className="text-title">{group.label}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {group.names.map((name) => (
              <Swatch key={name} name={name} theme={theme} />
            ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <h3 className="text-title">Text on surfaces</h3>
        <p className="text-caption text-muted-foreground">
          The pairings people read. Every required pair, including signals, is
          checked by the token tests; the count above is that full set.
        </p>
        <div className="rounded-lg border border-divider bg-surface">
          <table className="w-full text-left text-caption">
            <caption className="sr-only">
              Contrast of text and muted text on each surface in the {theme}{" "}
              theme.
            </caption>
            <thead className="border-b border-divider">
              <tr className="faceplate text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Foreground
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Background
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ratio
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Need
                </th>
              </tr>
            </thead>
            <tbody>
              {results
                .filter(
                  (result) =>
                    result.foreground === "text" ||
                    result.foreground === "text-muted"
                )
                .map((result) => (
                  <tr
                    key={`${result.foreground}-${result.background}`}
                    className="border-b border-divider last:border-0"
                  >
                    <td className="px-3 py-1.5" translate="no">
                      {result.foreground}
                    </td>
                    <td className="px-3 py-1.5" translate="no">
                      {result.background}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="readout text-readout-sm">
                        {formatRatio(result.ratio)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {formatRatio(result.minimum)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  )
}

export { ColorPanel }
