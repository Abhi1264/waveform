"use client"

import { Button } from "@waveform/ui/components/button"
import { useState } from "react"

import { Panel } from "./panel"

function MotionDemo({
  mode,
  label,
}: {
  mode: "full" | "reduced"
  label: string
}) {
  const [shifted, setShifted] = useState(false)

  return (
    <div
      data-motion={mode}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-divider bg-surface p-4"
    >
      <p className="faceplate text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3">
        <div
          data-testid={`motion-sample-${mode}`}
          className="size-8 rounded-sm bg-primary transition-transform duration-(--wf-duration-base) ease-standard"
          style={{
            transform: shifted ? "translateX(2.5rem)" : "translateX(0)",
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            setShifted((value) => !value)
          }}
        >
          {shifted ? "Return" : "Move"}
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">
        {mode === "full"
          ? "140 ms, ease-standard, transform only."
          : "Duration tokens are 0. The bar jumps."}
      </p>
    </div>
  )
}

function MotionPanel() {
  return (
    <Panel
      id="motion"
      eyebrow="Motion"
      title="Motion confirms. It never decorates."
    >
      <p className="max-w-2xl text-pretty text-muted-foreground">
        Transitions are short and only acknowledge a change of state. Meters and
        waveforms move because the audio moves, so reduced motion leaves those
        running. The page follows the system unless you override it above; the
        two faces below pin their own preference.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <MotionDemo mode="full" label="Full" />
        <MotionDemo mode="reduced" label="Reduced" />
      </div>
    </Panel>
  )
}

export { MotionPanel }
