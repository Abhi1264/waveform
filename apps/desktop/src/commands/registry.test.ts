import { describe, expect, it, vi } from "vitest"

import { createRegistry } from "./registry"

describe("command registry", () => {
  it("runs a command from its id and hides unavailable ones from execution", () => {
    const registry = createRegistry()
    const play = vi.fn()
    registry.register({
      id: "deck.play",
      label: "Play",
      shortcut: "Space",
      available: () => true,
      execute: play,
    })
    registry.register({
      id: "deck.sync",
      label: "Sync",
      shortcut: "S",
      available: () => false,
      execute: () => {
        throw new Error("sync should not run")
      },
    })
    registry.run("deck.play")
    registry.run("deck.sync")
    expect(play).toHaveBeenCalledOnce()
    expect(registry.matching("syn").map((command) => command.id)).toEqual([
      "deck.sync",
    ])
    registry.setShortcut("deck.play", "Shift+Space")
    expect(registry.commandForShortcut("shift+space")).toBe("deck.play")
    registry.mapControl("midi:cc:1", "deck.play")
    expect(registry.commandForControl("midi:cc:1")).toBe("deck.play")
  })
})
