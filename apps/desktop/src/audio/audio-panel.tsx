import { useEffect, useState } from "react"

import { Button } from "@waveform/ui/components/button"
import { Fader } from "@waveform/ui/components/fader"
import { LevelMeter } from "@waveform/ui/components/level-meter"

import type { AudioSnapshot, OutputDevice } from "@/bindings"
import { useDeckSelection } from "@/decks/selection"
import { WaveformView } from "@/waveforms/waveform-view"

interface AudioApi {
  listOutputDevices: () => Promise<OutputDevice[]>
  openDefaultOutput: () => Promise<void>
  closeOutput: () => Promise<void>
  playDeck: (deck: number) => Promise<void>
  pauseDeck: (deck: number) => Promise<void>
  cueDeck: (deck: number) => Promise<void>
  setCrossfader: (position: number) => Promise<void>
  loadDeckFile: (deck: number, path: string) => Promise<number[]>
  syncDeck: (deck: number) => Promise<void>
  setDeckLoop: (deck: number, start: number, end: number) => Promise<void>
  audioSnapshot: () => Promise<AudioSnapshot>
  watchAudio: (
    onSnapshot: (snapshot: AudioSnapshot) => void
  ) => Promise<() => void>
}

const quiet: AudioSnapshot = {
  sampleRate: 0,
  bufferSize: 0,
  callbackCount: 0,
  xrunCount: 0,
  droppedCommands: 0,
  deckAPositionSeconds: 0,
  deckBPositionSeconds: 0,
  deckAGainDb: 0,
  deckBGainDb: 0,
  deckALevelDb: -100,
  deckBLevelDb: -100,
  masterLevelDb: -100,
  crossfader: 0.5,
  deckAPlaying: false,
  deckBPlaying: false,
  deviceOpen: false,
  deviceName: "",
}

const tonePeaks = Array.from({ length: 160 }, (_, index) => {
  const max = 0.25 + 0.6 * Math.abs(Math.sin(index / 7))
  return [-max, max]
}).flat()

function formatRate(snapshot: AudioSnapshot): string {
  if (!snapshot.deviceOpen) return "Closed"
  const rate = snapshot.sampleRate.toLocaleString("en")
  return `${snapshot.deviceName || "Output"} · ${rate} Hz · ${snapshot.bufferSize} frames`
}

function AudioPanel({ api }: { api: AudioApi }) {
  const [devices, setDevices] = useState<OutputDevice[]>([])
  const [snapshot, setSnapshot] = useState<AudioSnapshot>(quiet)
  const [error, setError] = useState("")
  const [filePath, setFilePath] = useState("")
  const [peaks, setPeaks] = useState<number[]>(tonePeaks)
  const deck = useDeckSelection((state) => state.deck)
  const selectDeck = useDeckSelection((state) => state.select)

  useEffect(() => {
    let stop: () => void = () => undefined
    api
      .listOutputDevices()
      .then(setDevices)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason))
      })
    api
      .watchAudio((next) => {
        setSnapshot(next)
      })
      .then((cancel) => {
        stop = cancel
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      stop()
    }
  }, [api])

  const run = (action: () => Promise<void>) => {
    action().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }

  return (
    <section aria-labelledby="audio-heading" className="flex flex-col gap-4">
      <h2 id="audio-heading" className="text-title">
        Audio
      </h2>
      <p className="text-muted-foreground">
        Two tone decks through the engine. Music files arrive in a later phase.
      </p>
      <p className="readout text-readout-sm" role="status">
        {formatRate(snapshot)}
        {snapshot.xrunCount > 0 ? ` · ${snapshot.xrunCount} xruns` : ""}
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const path = filePath.trim()
          if (path.length === 0) return
          api
            .loadDeckFile(deck, path)
            .then((nextPeaks) => {
              if (nextPeaks.length > 0) setPeaks(nextPeaks)
            })
            .catch((reason: unknown) => {
              setError(
                reason instanceof Error ? reason.message : String(reason)
              )
            })
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="faceplate text-muted-foreground">File</span>
          <input
            value={filePath}
            onChange={(event) => {
              setFilePath(event.target.value)
            }}
            placeholder="Path to a wav or aiff file"
            className="rounded-md border border-divider bg-surface px-3 py-2"
          />
        </label>
        <Button type="submit">Load</Button>
      </form>
      <WaveformView
        peaks={peaks.length > 0 ? peaks : tonePeaks}
        positionSeconds={
          (deck === 0
            ? snapshot.deckAPositionSeconds
            : snapshot.deckBPositionSeconds) ?? 0
        }
        durationSeconds={8}
        color={deck === 0 ? "#0574c7" : "#af4387"}
      />
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          onPress={() => {
            run(api.openDefaultOutput)
          }}
        >
          Use default output
        </Button>
        <Button
          variant="outline"
          onPress={() => {
            run(api.closeOutput)
          }}
        >
          Close output
        </Button>
      </div>
      {devices.length > 0 ? (
        <ul className="text-caption text-muted-foreground">
          {devices.map((device) => (
            <li key={`${device.typeName}:${device.name}`}>
              {device.typeName}: {device.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-end gap-8">
        {([0, 1] as const).map((deck) => {
          const playing =
            deck === 0 ? snapshot.deckAPlaying : snapshot.deckBPlaying
          const level =
            (deck === 0 ? snapshot.deckALevelDb : snapshot.deckBLevelDb) ?? -100
          return (
            <div
              key={deck}
              className="flex flex-col gap-2"
              data-deck={deck === 0 ? "a" : "b"}
            >
              <p className="faceplate text-muted-foreground">
                Deck {deck === 0 ? "A" : "B"}
              </p>
              <div className="flex gap-2">
                <Button
                  onPress={() => {
                    selectDeck(deck)
                    run(() => api.playDeck(deck))
                  }}
                >
                  Play
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    run(() =>
                      playing ? api.pauseDeck(deck) : api.cueDeck(deck)
                    )
                  }}
                >
                  {playing ? "Pause" : "Cue"}
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    selectDeck(deck)
                    run(() => api.syncDeck(deck))
                  }}
                >
                  Sync
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    selectDeck(deck)
                    run(() => api.setDeckLoop(deck, 0, 4))
                  }}
                >
                  Loop
                </Button>
              </div>
              <LevelMeter
                label={`Deck ${deck === 0 ? "A" : "B"} level`}
                level={level}
              />
            </div>
          )
        })}
        <Fader
          label="Crossfader"
          orientation="horizontal"
          minValue={0}
          maxValue={1}
          step={0.01}
          defaultValue={0.5}
          formatValue={(value) => value.toFixed(2)}
          onChange={(value) => {
            run(() => api.setCrossfader(value))
          }}
          onChangeEnd={(value) => {
            run(() => api.setCrossfader(value))
          }}
        />
      </div>
    </section>
  )
}

export { AudioPanel, type AudioApi }
