import {
  formatBpm,
  formatDecibels,
  formatKey,
  formatPitchPercent,
  formatTrackTime,
} from "@waveform/core-utils"
import { typeScale, type TypeRole } from "@waveform/design-tokens"
import { Readout, ReadoutGroup } from "@waveform/ui/components/readout"

import { Panel } from "./panel"

const roles: readonly {
  role: TypeRole
  sample: string
  className: string
}[] = [
  { role: "label", sample: "Tempo", className: "faceplate" },
  {
    role: "caption",
    sample: "Remaining time on the loaded track.",
    className: "text-caption",
  },
  {
    role: "title",
    sample: "Audio engine",
    className: "text-title",
  },
  {
    role: "heading",
    sample: "Early development",
    className: "text-heading",
  },
  {
    role: "display",
    sample: "Waveform",
    className: "text-display",
  },
  {
    role: "readout-sm",
    sample: formatDecibels(-3.5),
    className: "readout text-readout-sm",
  },
  {
    role: "readout",
    sample: formatBpm(128),
    className: "readout text-readout",
  },
  {
    role: "readout-lg",
    sample: formatTrackTime(-134.3),
    className: "readout text-readout-lg",
  },
  {
    role: "readout-xl",
    sample: formatBpm(174),
    className: "readout text-readout-xl",
  },
]

function TypePanel() {
  return (
    <Panel
      id="type"
      eyebrow="Type"
      title="Condensed labels over tabular readouts."
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Archivo at 75% width for the legends printed on mixer hardware. Martian
        Mono at 87.5% width for tempo, time, key, pitch and gain, with digits
        that keep their place. Both faces are bundled; nothing is fetched from a
        font service.
      </p>

      <div className="rounded-lg border border-divider bg-surface p-5">
        <p className="faceplate text-muted-foreground">Deck readout</p>
        <ReadoutGroup className="mt-3">
          <Readout label="Tempo" value={formatBpm(128)} unit="BPM" width={6} />
          <Readout
            label="Key"
            value={formatKey({ tonic: 8, mode: "major" }, "standard")}
            width={3}
          />
          <Readout label="Pitch" value={formatPitchPercent(0)} width={8} />
          <Readout label="Remain" value={formatTrackTime(-134.3)} width={8} />
          <Readout
            label="Gain"
            value={formatDecibels(-1.5, { signed: true })}
            width={8}
          />
        </ReadoutGroup>
      </div>

      <ol className="flex flex-col gap-4">
        {roles.map(({ role, sample, className }) => (
          <li
            key={role}
            className="grid gap-2 border-b border-divider pb-4 last:border-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:items-baseline"
          >
            <div className="flex flex-col gap-0.5">
              <span className="faceplate text-muted-foreground">{role}</span>
              <span className="readout text-readout-sm text-muted-foreground">
                {typeScale[role].size}
              </span>
            </div>
            <p className={`${className} min-w-0 text-pretty`}>{sample}</p>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export { TypePanel }
