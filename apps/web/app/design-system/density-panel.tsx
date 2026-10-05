"use client"

import { formatDecibels } from "@waveform/core-utils"
import { densities, type Density } from "@waveform/design-tokens"
import { Button } from "@waveform/ui/components/button"
import { Fader } from "@waveform/ui/components/fader"
import { Knob } from "@waveform/ui/components/knob"

import { Panel } from "./panel"

const copy: Record<Density, string> = {
  compact: "Mouse and keyboard on a small screen. Targets stay at 24 px.",
  comfortable: "The default for a precise pointer.",
  touch: "Every target is at least 44 px.",
}

function DensityFace({ mode }: { mode: Density }) {
  return (
    <div
      data-density={mode}
      data-testid={`density-${mode}`}
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-divider bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="faceplate text-muted-foreground">{mode}</p>
        <p className="text-caption text-muted-foreground">{copy[mode]}</p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Button>Play</Button>
        <Knob
          label="Gain"
          minValue={-12}
          maxValue={12}
          step={0.5}
          defaultValue={-1.5}
          formatValue={(value) => formatDecibels(value, { signed: true })}
        />
        <Fader
          label="Volume"
          minValue={-60}
          maxValue={0}
          step={1}
          defaultValue={-6}
          formatValue={(value) => formatDecibels(value)}
        />
      </div>
    </div>
  )
}

function DensityPanel() {
  return (
    <Panel
      id="density"
      eyebrow="Density"
      title="Size follows the input, not the viewport."
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Compact and comfortable suit a mouse. Touch is chosen automatically on a
        coarse pointer, or here so the three sizes can sit side by side. Each
        face pins its own density and does not follow the page setting.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {densities.map((mode) => (
          <DensityFace key={mode} mode={mode} />
        ))}
      </div>
    </Panel>
  )
}

export { DensityPanel }
