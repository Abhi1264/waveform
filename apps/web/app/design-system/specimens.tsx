"use client"

import { PlayIcon } from "@phosphor-icons/react"
import {
  formatBpm,
  formatDecibels,
  formatKey,
  formatPitchPercent,
  formatTrackTime,
} from "@waveform/core-utils"
import { Badge } from "@waveform/ui/components/badge"
import { Button } from "@waveform/ui/components/button"
import { Fader } from "@waveform/ui/components/fader"
import { Knob } from "@waveform/ui/components/knob"
import { LevelMeter } from "@waveform/ui/components/level-meter"
import { Readout, ReadoutGroup } from "@waveform/ui/components/readout"
import { Toggle } from "@waveform/ui/components/toggle"

import { Panel } from "./panel"

const track = {
  title: "Midnight City",
  artist: "M83",
  album: "Hurry Up, We're Dreaming",
  bpm: 128,
  key: { tonic: 8 as const, mode: "major" as const },
  pitch: 0,
  remain: -134.3,
  gain: -1.5,
  level: -8,
  peak: -3,
}

function DeckHeaderSpecimen() {
  return (
    <Panel
      id="deck-header"
      eyebrow="Deck header"
      title="Identity, then the numbers a glance needs."
      specimen
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Not a working deck. The strip shows how a loaded track reads: deck
        colour for identity, condensed labels, tabular values that do not shift
        as they change.
      </p>
      <div
        data-deck="a"
        data-testid="deck-header-specimen"
        className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="rounded-sm bg-deck px-1.5 py-0.5 faceplate text-on-signal">
              Deck A
            </span>
            <div className="min-w-0">
              <p className="truncate text-title">{track.title}</p>
              <p className="truncate text-caption text-muted-foreground">
                {track.artist}
                <span aria-hidden> · </span>
                {track.album}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle variant="deck" defaultSelected>
              Sync
            </Toggle>
            <Toggle variant="deck">Cue</Toggle>
            <Badge variant="outline">Specimen</Badge>
          </div>
        </div>
        <ReadoutGroup>
          <Readout
            label="Tempo"
            value={formatBpm(track.bpm)}
            unit="BPM"
            width={6}
          />
          <Readout
            label="Key"
            value={formatKey(track.key, "standard")}
            width={3}
          />
          <Readout
            label="Pitch"
            value={formatPitchPercent(track.pitch)}
            width={8}
          />
          <Readout
            label="Remain"
            value={formatTrackTime(track.remain)}
            width={8}
          />
        </ReadoutGroup>
      </div>
    </Panel>
  )
}

function TransportSpecimen() {
  return (
    <Panel
      id="transport"
      eyebrow="Transport"
      title="Play, cue, gain, EQ, fader, meter."
      specimen
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Not a working mixer. The knobs and fader take input so keyboard and
        screen-reader behaviour can be checked; they are not connected to audio.
      </p>
      <div
        data-deck="a"
        data-testid="transport-specimen"
        className="flex flex-col gap-5 rounded-lg border border-divider bg-surface p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <PlayIcon data-icon="inline-start" />
            Play
          </Button>
          <Button variant="outline">Cue</Button>
          <Toggle variant="deck" defaultSelected>
            Sync
          </Toggle>
          <Toggle variant="outline">Loop</Toggle>
          <Badge variant="outline">Specimen</Badge>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <Knob
            label="Gain"
            minValue={-12}
            maxValue={12}
            step={0.5}
            defaultValue={track.gain}
            formatValue={(value) => formatDecibels(value, { signed: true })}
          />
          <Knob
            label="Low"
            minValue={-12}
            maxValue={12}
            step={0.5}
            defaultValue={0}
            formatValue={(value) => formatDecibels(value, { signed: true })}
          />
          <Knob
            label="Mid"
            minValue={-12}
            maxValue={12}
            step={0.5}
            defaultValue={0}
            formatValue={(value) => formatDecibels(value, { signed: true })}
          />
          <Knob
            label="High"
            minValue={-12}
            maxValue={12}
            step={0.5}
            defaultValue={0}
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
          <div className="flex flex-col items-center gap-1">
            <p className="faceplate text-muted-foreground">Level</p>
            <LevelMeter
              label="Deck A level"
              level={track.level}
              peak={track.peak}
            />
          </div>
        </div>
      </div>
    </Panel>
  )
}

export { DeckHeaderSpecimen, TransportSpecimen }
