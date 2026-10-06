import { useCallback, useEffect, useState } from "react"

import { Button } from "@waveform/ui/components/button"
import { Fader } from "@waveform/ui/components/fader"
import { Knob } from "@waveform/ui/components/knob"
import { LevelMeter } from "@waveform/ui/components/level-meter"

import type { AudioSnapshot, OutputDevice } from "@/bindings"
import { useDeckSelection, type DeckIndex } from "@/decks/selection"
import { WaveformView } from "@/waveforms/waveform-view"

import { StemSection } from "./stems"

interface AudioApi {
  listOutputDevices: () => Promise<OutputDevice[]>
  openDefaultOutput: () => Promise<void>
  openOutput: (name: string) => Promise<void>
  closeOutput: () => Promise<void>
  playDeck: (deck: number) => Promise<void>
  pauseDeck: (deck: number) => Promise<void>
  cueDeck: (deck: number) => Promise<void>
  setDeckGain: (deck: number, decibels: number) => Promise<void>
  setInputGain: (gain: number) => Promise<void>
  setCrossfader: (position: number) => Promise<void>
  loadDeckFile: (deck: number, path: string) => Promise<number[]>
  deckAnalysis: (deck: number) => Promise<{
    bpm: number | null
    musicalKey: string
    durationSeconds: number | null
  }>
  deckBeats: (deck: number) => Promise<number[]>
  syncDeck: (deck: number) => Promise<void>
  setDeckLoop: (deck: number, start: number, end: number) => Promise<void>
  seekDeck: (deck: number, seconds: number) => Promise<void>
  setDeckPitch: (deck: number, pitch: number) => Promise<void>
  setDeckEq: (deck: number, band: number, decibels: number) => Promise<void>
  setHotCue: (deck: number, slot: number, seconds: number) => Promise<void>
  jumpHotCue: (deck: number, slot: number) => Promise<void>
  beatJump: (deck: number, beats: number) => Promise<void>
  setEffect: (deck: number, slot: number, amount: number) => Promise<void>
  armRecording: (armed: boolean) => Promise<void>
  triggerSampler: () => Promise<void>
  saveRecording: (path: string) => Promise<void>
  prepareStemPreview: (path: string) => Promise<{
    vocals: string
    drums: string
    bass: string
    other: string
    notice: string
  }>
  loadStemSlot: (slot: number, path: string) => Promise<void>
  setStemPlaying: (slot: number, playing: boolean) => Promise<void>
  listStemAudio: (directory: string) => Promise<string[]>
  trackFilters: (
    bpm: number,
    durationSeconds: number
  ) => Promise<{ energy: string; phraseStarts: number[] }>
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

const deckIndexes = [0, 1, 2, 3] as const
const deckLetters = ["A", "B", "C", "D"] as const

interface LoadedDeck {
  peaks: number[]
  bpm: number | null
  musicalKey: string
  durationSeconds: number
  beats: number[]
}

const tonePeaks = Array.from({ length: 160 }, (_, index) => {
  const max = 0.25 + 0.6 * Math.abs(Math.sin(index / 7))
  return [-max, max]
}).flat()

function keyLabel(key: string | undefined): string {
  if (key == null || key.length === 0) return "—"
  return key
}

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
  const [loaded, setLoaded] = useState<Record<number, LoadedDeck>>({})
  const [filters, setFilters] = useState<{
    bpm: number
    energy: string
    phrases: number
  } | null>(null)
  const [cues, setCues] = useState<Record<string, number>>({})
  const [recordingPath, setRecordingPath] = useState("")
  const [recording, setRecording] = useState(false)
  const [saved, setSaved] = useState("")
  const [extraPlaying, setExtraPlaying] = useState<Record<number, boolean>>({})
  const deck = useDeckSelection((state) => state.deck)
  const selectDeck = useDeckSelection((state) => state.select)
  const loadToken = useDeckSelection((state) => state.loadToken)
  const view = loaded[deck]
  const peaks = view && view.peaks.length > 0 ? view.peaks : tonePeaks
  const beats = view?.beats ?? []
  const durationSeconds =
    view && view.durationSeconds > 0 ? view.durationSeconds : 8

  useEffect(() => {
    let stop: () => void = () => undefined
    api
      .listOutputDevices()
      .then((next) => {
        setDevices(Array.isArray(next) ? next : [])
      })
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

  const rememberLoad = useCallback(
    (
      deckIndex: DeckIndex,
      path: string,
      nextPeaks: number[],
      next: {
        bpm: number | null
        musicalKey: string
        durationSeconds: number | null
      },
      nextBeats: number[]
    ) => {
      selectDeck(deckIndex)
      setFilePath(path)
      setLoaded((current) => ({
        ...current,
        [deckIndex]: {
          peaks: nextPeaks,
          bpm: next.bpm,
          musicalKey: next.musicalKey,
          durationSeconds: next.durationSeconds ?? 8,
          beats: nextBeats,
        },
      }))
    },
    [selectDeck]
  )

  useEffect(() => {
    if (loadToken === 0) return
    const requested = useDeckSelection.getState()
    let cancelled = false
    api
      .loadDeckFile(requested.loadDeck, requested.loadPath)
      .then((nextPeaks) => {
        if (cancelled) return undefined
        return api.deckAnalysis(requested.loadDeck).then((next) =>
          api.deckBeats(requested.loadDeck).then((nextBeats) => {
            if (cancelled) return
            rememberLoad(
              requested.loadDeck,
              requested.loadPath,
              nextPeaks,
              next,
              nextBeats
            )
          })
        )
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })
    return () => {
      cancelled = true
    }
  }, [api, loadToken, rememberLoad])

  useEffect(() => {
    if (view?.bpm == null || view.durationSeconds <= 0) return
    const bpm = view.bpm
    const durationSeconds = view.durationSeconds
    let cancelled = false
    api
      .trackFilters(bpm, durationSeconds)
      .then((next) => {
        if (!cancelled) {
          setFilters({
            bpm,
            energy: next.energy,
            phrases: next.phraseStarts.length,
          })
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })
    return () => {
      cancelled = true
    }
  }, [api, view?.bpm, view?.durationSeconds])

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
        Load a wav, aiff, flac, mp3, or ogg file, or play the built-in tones.
        Sync stays off until that deck has a beat grid. C and D stay in the mix.
        The crossfader is A and B.
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
            .then((nextPeaks) =>
              api.deckAnalysis(deck).then((next) =>
                api.deckBeats(deck).then((nextBeats) => {
                  rememberLoad(deck, path, nextPeaks, next, nextBeats)
                })
              )
            )
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
            placeholder="Path to a wav, aiff, flac, mp3, or ogg file"
            className="rounded-md border border-divider bg-surface px-3 py-2"
          />
        </label>
        <Button type="submit">Load</Button>
      </form>
      <WaveformView
        peaks={peaks}
        positionSeconds={
          deck === 0
            ? (snapshot.deckAPositionSeconds ?? 0)
            : deck === 1
              ? (snapshot.deckBPositionSeconds ?? 0)
              : 0
        }
        durationSeconds={durationSeconds}
        beats={beats}
        color={deck === 0 ? "#0574c7" : "#af4387"}
        onSeek={(seconds) => {
          run(() => api.seekDeck(deck, seconds))
        }}
      />
      {deck > 1 ? (
        <p className="text-caption text-muted-foreground">
          The playhead is drawn for decks A and B. Seek on C and D still moves
          the audio.
        </p>
      ) : null}
      <p className="readout text-readout">
        {keyLabel(view?.musicalKey)}
        <span className="faceplate text-muted-foreground"> key </span>
        {view?.bpm == null ? "—" : view.bpm.toFixed(1)}
        <span className="faceplate text-muted-foreground"> BPM</span>
        {view?.bpm != null && filters?.bpm === view.bpm ? (
          <span className="faceplate text-muted-foreground">
            {" "}
            · {filters.energy} energy · {filters.phrases} phrases
          </span>
        ) : null}
      </p>
      <p className="text-caption text-muted-foreground">
        Tempo, key, energy, and phrases do not download a model.
      </p>
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
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <li key={`${device.typeName}:${device.name}`}>
              <Button
                variant="outline"
                onPress={() => {
                  run(() => api.openOutput(device.name))
                }}
              >
                {device.typeName}: {device.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-end gap-8">
        {deckIndexes.map((deckIndex) => {
          const playing =
            deckIndex === 0
              ? snapshot.deckAPlaying
              : deckIndex === 1
                ? snapshot.deckBPlaying
                : extraPlaying[deckIndex] === true
          const level =
            (deckIndex === 0 ? snapshot.deckALevelDb : snapshot.deckBLevelDb) ??
            -100
          const letter = deckLetters[deckIndex]
          return (
            <div
              key={deckIndex}
              className="flex flex-col gap-2"
              data-deck={letter.toLowerCase()}
            >
              <Button
                variant={deck === deckIndex ? "default" : "outline"}
                onPress={() => {
                  selectDeck(deckIndex)
                }}
              >
                Deck {letter}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  onPress={() => {
                    selectDeck(deckIndex)
                    run(() =>
                      api.playDeck(deckIndex).then(() => {
                        if (deckIndex > 1) {
                          setExtraPlaying((current) => ({
                            ...current,
                            [deckIndex]: true,
                          }))
                        }
                      })
                    )
                  }}
                >
                  Play
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    selectDeck(deckIndex)
                    run(() =>
                      (playing
                        ? api.pauseDeck(deckIndex)
                        : api.cueDeck(deckIndex)
                      ).then(() => {
                        if (deckIndex > 1) {
                          setExtraPlaying((current) => ({
                            ...current,
                            [deckIndex]: false,
                          }))
                        }
                      })
                    )
                  }}
                >
                  {playing ? "Pause" : "Cue"}
                </Button>
                <Button
                  variant="outline"
                  isDisabled={(loaded[deckIndex]?.beats.length ?? 0) === 0}
                  onPress={() => {
                    selectDeck(deckIndex)
                    run(() => api.syncDeck(deckIndex))
                  }}
                >
                  Sync
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    selectDeck(deckIndex)
                    run(() => api.setDeckLoop(deckIndex, 0, 4))
                  }}
                >
                  Loop
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    selectDeck(deckIndex)
                    run(() => api.beatJump(deckIndex, -1))
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    selectDeck(deckIndex)
                    run(() => api.beatJump(deckIndex, 1))
                  }}
                >
                  Forward
                </Button>
                {[0, 1, 2, 3].map((slot) => {
                  const key = `${deckIndex}:${slot}`
                  const stored = cues[key]
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      onPress={() => {
                        selectDeck(deckIndex)
                        const position =
                          (deckIndex === 0
                            ? snapshot.deckAPositionSeconds
                            : snapshot.deckBPositionSeconds) ?? 0
                        if (stored === undefined) {
                          setCues((current) => ({
                            ...current,
                            [key]: position,
                          }))
                          run(() => api.setHotCue(deckIndex, slot, position))
                        } else {
                          run(() => api.jumpHotCue(deckIndex, slot))
                        }
                      }}
                    >
                      {stored === undefined
                        ? `Cue ${slot + 1}`
                        : `Jump ${slot + 1}`}
                    </Button>
                  )
                })}
              </div>
              {deckIndex < 2 ? (
                <LevelMeter label={`Deck ${letter} level`} level={level} />
              ) : (
                <p className="text-caption text-muted-foreground">
                  Deck {letter} stays in the mix.
                </p>
              )}
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
      <div className="flex flex-wrap items-end gap-4">
        {(
          [
            ["Low", 0],
            ["Mid", 1],
            ["High", 2],
          ] as const
        ).map(([label, band]) => (
          <Knob
            key={label}
            label={label}
            minValue={-24}
            maxValue={12}
            step={0.1}
            defaultValue={0}
            formatValue={(value) => `${value.toFixed(1)} dB`}
            onChange={(value) => {
              run(() => api.setDeckEq(deck, band, value))
            }}
          />
        ))}
        <Knob
          label="Gain"
          minValue={-24}
          maxValue={12}
          step={0.1}
          defaultValue={0}
          formatValue={(value) => `${value.toFixed(1)} dB`}
          onChange={(value) => {
            run(() => api.setDeckGain(deck, value))
          }}
        />
        <Knob
          label="Pitch"
          minValue={0.5}
          maxValue={2}
          step={0.01}
          defaultValue={1}
          formatValue={(value) => value.toFixed(2)}
          onChange={(value) => {
            run(() => api.setDeckPitch(deck, value))
          }}
        />
        <Knob
          label="Input"
          minValue={0}
          maxValue={1}
          step={0.01}
          defaultValue={0}
          formatValue={(value) => value.toFixed(2)}
          onChange={(value) => {
            run(() => api.setInputGain(value))
          }}
        />
        {(
          [
            ["Filter", 0],
            ["Delay", 1],
            ["Reverb", 2],
          ] as const
        ).map(([label, slot]) => (
          <Knob
            key={label}
            label={label}
            minValue={0}
            maxValue={1}
            step={0.01}
            defaultValue={0}
            formatValue={(value) => value.toFixed(2)}
            onChange={(value) => {
              run(() => api.setEffect(deck, slot, value))
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onPress={() => {
            run(api.triggerSampler)
          }}
        >
          Sampler
        </Button>
        <Button
          variant="outline"
          onPress={() => {
            const next = !recording
            setRecording(next)
            run(() => api.armRecording(next))
          }}
        >
          {recording ? "Stop recording" : "Record"}
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">
        Record arms the master. Save writes a wav at the path you type. The
        buffer holds about 30 seconds. Input raises a live input on the open
        output. Choosing that input still needs the device.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const path = recordingPath.trim()
          if (path.length === 0) return
          setSaved("")
          api
            .saveRecording(path)
            .then(() => {
              setSaved(`Saved ${path}`)
            })
            .catch((reason: unknown) => {
              setError(
                reason instanceof Error ? reason.message : String(reason)
              )
            })
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="faceplate text-muted-foreground">Recording</span>
          <input
            value={recordingPath}
            onChange={(event) => {
              setRecordingPath(event.target.value)
            }}
            placeholder="Path for the recorded wav"
            className="rounded-md border border-divider bg-surface px-3 py-2"
          />
        </label>
        <Button type="submit" variant="outline">
          Save recording
        </Button>
      </form>
      {saved ? (
        <p role="status" className="text-caption text-muted-foreground">
          {saved}
        </p>
      ) : null}
      <StemSection
        api={api}
        sourcePath={filePath}
        deckLetter={deckLetters[deck]}
        onLoadDeck={(path) => {
          api
            .loadDeckFile(deck, path)
            .then((nextPeaks) =>
              api.deckAnalysis(deck).then((next) =>
                api.deckBeats(deck).then((nextBeats) => {
                  rememberLoad(deck, path, nextPeaks, next, nextBeats)
                })
              )
            )
            .catch((reason: unknown) => {
              setError(
                reason instanceof Error ? reason.message : String(reason)
              )
            })
        }}
        onError={setError}
      />
    </section>
  )
}

export { AudioPanel, type AudioApi }
