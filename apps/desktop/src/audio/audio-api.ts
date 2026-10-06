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
  syncDeck: (deck) => command(commands.syncDeck(deck)),
  setDeckLoop: (deck, start, end) =>
    command(commands.setDeckLoop(deck, start, end)),
  audioSnapshot: () => unwrap(commands.audioSnapshot()),
  watchAudio: (onSnapshot) => {
    const channel = new Channel<AudioSnapshot>()
    channel.onmessage = onSnapshot
    return commands.watchAudio(channel).then(() => () => undefined)
  },
}

export { liveAudio }
