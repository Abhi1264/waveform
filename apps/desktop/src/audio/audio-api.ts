import { Channel } from "@tauri-apps/api/core"

import { commands, type AudioSnapshot } from "@/bindings"

import type { AudioApi } from "./audio-panel"

async function unwrap<T>(
  result: Promise<
    { status: "ok"; data: T } | { status: "error"; error: string }
  >
): Promise<T> {
  const value = await result
  if (value.status === "error") {
    throw new Error(value.error)
  }
  return value.data
}

function command(
  result: Promise<
    { status: "ok"; data: null } | { status: "error"; error: string }
  >
) {
  return unwrap(result).then(() => undefined)
}

const liveAudio: AudioApi = {
  listOutputDevices: () => unwrap(commands.listOutputDevices()),
  openDefaultOutput: () => command(commands.openDefaultOutput()),
  closeOutput: () => command(commands.closeOutput()),
  playDeck: (deck) => command(commands.playDeck(deck)),
  pauseDeck: (deck) => command(commands.pauseDeck(deck)),
  cueDeck: (deck) => command(commands.cueDeck(deck)),
  setCrossfader: (position) => command(commands.setCrossfader(position)),
  loadDeckFile: async (deck, path) => {
    const peaks = await unwrap(commands.loadDeckFile(deck, path))
    return peaks.filter((peak): peak is number => peak !== null)
  },
  deckAnalysis: (deck) => unwrap(commands.deckAnalysis(deck)),
  deckBeats: async (deck) => {
    const beats = await unwrap(commands.deckBeats(deck))
    return beats.filter((beat): beat is number => beat !== null)
  },
  syncDeck: (deck) => command(commands.syncDeck(deck)),
  setDeckLoop: (deck, start, end) =>
    command(commands.setDeckLoop(deck, start, end)),
  seekDeck: (deck, seconds) => command(commands.seekDeck(deck, seconds)),
  setDeckPitch: (deck, pitch) => command(commands.setDeckPitch(deck, pitch)),
  setDeckEq: (deck, band, decibels) =>
    command(commands.setDeckEq(deck, band, decibels)),
  setHotCue: (deck, slot, seconds) =>
    command(commands.setHotCue(deck, slot, seconds)),
  jumpHotCue: (deck, slot) => command(commands.jumpHotCue(deck, slot)),
  beatJump: (deck, beats) => command(commands.beatJump(deck, beats)),
  setEffect: (deck, slot, amount) =>
    command(commands.setEffect(deck, slot, amount)),
  armRecording: (armed) => command(commands.armRecording(armed)),
  triggerSampler: () => command(commands.triggerSampler()),
  saveRecording: (path) => command(commands.saveRecording(path)),
  audioSnapshot: () => unwrap(commands.audioSnapshot()),
  watchAudio: (onSnapshot) => {
    const channel = new Channel<AudioSnapshot>()
    channel.onmessage = onSnapshot
    return commands.watchAudio(channel).then(() => () => undefined)
  },
}

export { liveAudio }
