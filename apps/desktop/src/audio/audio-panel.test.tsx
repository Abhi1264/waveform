import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AudioSnapshot } from "@/bindings"
import { useDeckSelection } from "@/decks/selection"

import { AudioPanel, type AudioApi } from "./audio-panel"

const snapshot: AudioSnapshot = {
  sampleRate: 48000,
  bufferSize: 256,
  callbackCount: 4,
  xrunCount: 0,
  droppedCommands: 0,
  deckAPositionSeconds: 1,
  deckBPositionSeconds: 0,
  deckAGainDb: 0,
  deckBGainDb: 0,
  deckALevelDb: -12,
  deckBLevelDb: -100,
  masterLevelDb: -12,
  crossfader: 0.5,
  deckAPlaying: true,
  deckBPlaying: false,
  deviceOpen: true,
  deviceName: "Default",
}

function api(overrides: Partial<AudioApi> = {}): AudioApi {
  return {
    listOutputDevices: vi.fn(() =>
      Promise.resolve([{ typeName: "CoreAudio", name: "Default" }])
    ),
    openDefaultOutput: vi.fn(() => Promise.resolve()),
    openOutput: vi.fn(() => Promise.resolve()),
    closeOutput: vi.fn(() => Promise.resolve()),
    playDeck: vi.fn(() => Promise.resolve()),
    pauseDeck: vi.fn(() => Promise.resolve()),
    cueDeck: vi.fn(() => Promise.resolve()),
    setCrossfader: vi.fn(() => Promise.resolve()),
    setDeckGain: vi.fn(() => Promise.resolve()),
    setInputGain: vi.fn(() => Promise.resolve()),
    loadDeckFile: vi.fn(() => Promise.resolve([])),
    deckAnalysis: vi.fn(() =>
      Promise.resolve({ bpm: 120, musicalKey: "A", durationSeconds: 1 })
    ),
    deckBeats: vi.fn(() => Promise.resolve([0, 0.5])),
    syncDeck: vi.fn(() => Promise.resolve()),
    setDeckLoop: vi.fn(() => Promise.resolve()),
    seekDeck: vi.fn(() => Promise.resolve()),
    setDeckPitch: vi.fn(() => Promise.resolve()),
    setDeckEq: vi.fn(() => Promise.resolve()),
    setHotCue: vi.fn(() => Promise.resolve()),
    jumpHotCue: vi.fn(() => Promise.resolve()),
    beatJump: vi.fn(() => Promise.resolve()),
    setEffect: vi.fn(() => Promise.resolve()),
    armRecording: vi.fn(() => Promise.resolve()),
    triggerSampler: vi.fn(() => Promise.resolve()),
    saveRecording: vi.fn(() => Promise.resolve()),
    prepareStemPreview: vi.fn(() =>
      Promise.resolve({
        vocals: "/tmp/vocals.wav",
        drums: "/tmp/drums.wav",
        bass: "/tmp/bass.wav",
        other: "/tmp/other.wav",
        notice: "Filter-bank preview. This is not a neural stem separation.",
      })
    ),
    loadStemSlot: vi.fn(() => Promise.resolve()),
    setStemPlaying: vi.fn(() => Promise.resolve()),
    listStemAudio: vi.fn(() => Promise.resolve([])),
    trackFilters: vi.fn(() =>
      Promise.resolve({ energy: "medium", phraseStarts: [0, 16] })
    ),
    audioSnapshot: vi.fn(() => Promise.resolve(snapshot)),
    watchAudio: vi.fn((onSnapshot: (next: AudioSnapshot) => void) => {
      onSnapshot(snapshot)
      return Promise.resolve(() => undefined)
    }),
    ...overrides,
  }
}

describe("AudioPanel", () => {
  beforeEach(() => {
    useDeckSelection.setState({
      deck: 0,
      loadToken: 0,
      loadPath: "",
      loadDeck: 0,
    })
  })

  it("shows the open device and plays a deck", async () => {
    const audio = api()
    render(<AudioPanel api={audio} />)
    expect(
      await screen.findByText(/Default · 48,000 Hz · 256 frames/)
    ).toBeVisible()
    const [play] = screen.getAllByRole("button", { name: "Play" })
    if (play === undefined) {
      throw new Error("Play is missing")
    }
    await userEvent.click(play)
    expect(audio.playDeck).toHaveBeenCalledWith(0)
    expect(screen.getAllByRole("button", { name: "Sync" })[0]).toBeDisabled()
  })

  it("opens a named output and saves a recording the user names", async () => {
    const audio = api()
    render(<AudioPanel api={audio} />)
    await userEvent.click(
      await screen.findByRole("button", { name: "CoreAudio: Default" })
    )
    expect(audio.openOutput).toHaveBeenCalledWith("Default")
    const recording = screen.getByPlaceholderText("Path for the recorded wav")
    await userEvent.type(recording, "/tmp/mix.wav")
    await userEvent.click(
      screen.getByRole("button", { name: "Save recording" })
    )
    expect(audio.saveRecording).toHaveBeenCalledWith("/tmp/mix.wav")
    expect(await screen.findByText("Saved /tmp/mix.wav")).toBeVisible()
  })

  it("keeps sync off until the loaded deck has a beat grid", async () => {
    const audio = api()
    render(<AudioPanel api={audio} />)
    const file = screen.getByPlaceholderText(
      "Path to a wav, aiff, flac, mp3, or ogg file"
    )
    await userEvent.type(file, "/tmp/song.wav")
    await userEvent.click(screen.getByRole("button", { name: "Load" }))
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Sync" })[0]).toBeEnabled()
    })
    expect(screen.getAllByRole("button", { name: "Sync" })[1]).toBeDisabled()
    expect(audio.loadDeckFile).toHaveBeenCalledWith(0, "/tmp/song.wav")
    expect(await screen.findByText(/medium energy/)).toBeVisible()
  })

  it("writes a stem preview and says it is not neural", async () => {
    const audio = api()
    render(<AudioPanel api={audio} />)
    expect(
      screen.getByText(
        "Filter-bank preview. This is not a neural stem separation."
      )
    ).toBeVisible()
    const file = screen.getByPlaceholderText(
      "Path to a wav, aiff, flac, mp3, or ogg file"
    )
    await userEvent.type(file, "/tmp/song.wav")
    await userEvent.click(
      screen.getByRole("button", { name: "Write stem preview" })
    )
    expect(audio.prepareStemPreview).toHaveBeenCalledWith("/tmp/song.wav")
    const slot = await screen.findByRole("button", { name: "Vocals stem slot" })
    await waitFor(() => {
      expect(slot).toBeEnabled()
    })
    await userEvent.click(slot)
    expect(audio.loadStemSlot).toHaveBeenCalledWith(0, "/tmp/vocals.wav")
    const playVocals = screen.getByRole("button", { name: "Play vocals" })
    await waitFor(() => {
      expect(playVocals).toBeEnabled()
    })
    await userEvent.click(playVocals)
    expect(audio.setStemPlaying).toHaveBeenCalledWith(0, true)
  })

  it("loads a library track onto the selected deck", async () => {
    const audio = api()
    useDeckSelection.getState().select(1)
    render(<AudioPanel api={audio} />)
    useDeckSelection.getState().requestLoad("/tmp/from-library.wav")
    await waitFor(() => {
      expect(audio.loadDeckFile).toHaveBeenCalledWith(
        1,
        "/tmp/from-library.wav"
      )
    })
  })
})
