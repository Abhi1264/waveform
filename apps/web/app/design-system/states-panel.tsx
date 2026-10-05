"use client"

import { PlayIcon, SpeakerHighIcon } from "@phosphor-icons/react"
import { Button } from "@waveform/ui/components/button"
import { Kbd, KbdGroup } from "@waveform/ui/components/kbd"
import { Toggle } from "@waveform/ui/components/toggle"

import { Panel } from "./panel"

const iconSizes = [14, 16, 20, 24, 32] as const

function StatesPanel() {
  return (
    <Panel
      id="states"
      eyebrow="States"
      title="Hover, press, focus, select, engage, disable."
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Focus is a 2 px ring with a gap, shown for the keyboard only. Selected
        controls invert. Engaged deck controls light in that deck’s colour.
        Disabled controls fade and explain why elsewhere.
      </p>

      <div className="flex flex-col gap-3">
        <h3 className="text-title">Buttons</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button isDisabled>Disabled</Button>
          <Button>
            <PlayIcon data-icon="inline-start" />
            Play
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title">Toggles</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Toggle>Off</Toggle>
          <Toggle defaultSelected>Selected</Toggle>
          <Toggle variant="outline">Outline</Toggle>
          <div data-deck="a" className="flex flex-wrap gap-2">
            <Toggle variant="deck">Sync</Toggle>
            <Toggle variant="deck" defaultSelected>
              Sync
            </Toggle>
          </div>
          <Toggle isDisabled>Disabled</Toggle>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title">Keyboard</h3>
        <p className="text-body text-muted-foreground">
          Shortcuts sit next to the action they trigger.
        </p>
        <p className="flex flex-wrap items-center gap-2 text-body">
          Play
          <KbdGroup>
            <Kbd>Space</Kbd>
          </KbdGroup>
          Cue
          <Kbd>C</Kbd>
          Sync
          <KbdGroup>
            <Kbd>S</Kbd>
          </KbdGroup>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title">Icons</h3>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Phosphor, regular from 16 px up. Compact density switches them to bold
          so the stroke stays at least a pixel. Fill marks an engaged state.
          Cue, sync and loop stay words: that is how the hardware writes them.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          {iconSizes.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1">
              <SpeakerHighIcon size={size} aria-hidden />
              <span className="readout text-readout-sm">{size}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

export { StatesPanel }
