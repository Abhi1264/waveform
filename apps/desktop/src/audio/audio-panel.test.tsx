import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AudioSnapshot } from "@/bindings"

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
    closeOutput: vi.fn(() => Promise.resolve()),
    playDeck: vi.fn(() => Promise.resolve()),
    pauseDeck: vi.fn(() => Promise.resolve()),
    cueDeck: vi.fn(() => Promise.resolve()),
    setCrossfader: vi.fn(() => Promise.resolve()),
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
    audioSnapshot: vi.fn(() => Promise.resolve(snapshot)),
    watchAudio: vi.fn((onSnapshot: (next: AudioSnapshot) => void) => {
      onSnapshot(snapshot)
      return Promise.resolve(() => undefined)
    }),
    ...overrides,
  }
}

describe("AudioPanel", () => {
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
  })
})
