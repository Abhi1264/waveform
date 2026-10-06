import { useEffect, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { AppearanceSettings } from "@waveform/ui/components/appearance-settings"

import { AboutView } from "@/about/about-view"
import { liveAudio } from "@/audio/audio-api"
import { AudioPanel } from "@/audio/audio-panel"
import { commands } from "@/bindings"
import { CommandPalette } from "@/commands/palette"
import { LibraryPanel } from "@/library/library-panel"
import { createRegistry } from "@/commands/registry"
import { useDeckSelection } from "@/decks/selection"
import { BottomSheet, TabletFrame } from "@/tablet/layout"
import { useWindowTheme, type WindowTheme } from "@/window-theme"

function readShortcuts(): Map<string, string> {
  const stored = new Map<string, string>()
  try {
    const raw = localStorage.getItem("waveform.shortcuts")
    if (!raw) return stored
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return stored
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") stored.set(key, value)
    }
  } catch {
    return stored
  }
  return stored
}

function useStageOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "landscape"
  )
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)")
    const apply = () => {
      setOrientation(query.matches ? "portrait" : "landscape")
    }
    apply()
    query.addEventListener("change", apply)
    return () => {
      query.removeEventListener("change", apply)
    }
  }, [])
  return orientation
}

function setWindowTheme(theme: WindowTheme): Promise<void> {
  return getCurrentWindow().setTheme(theme)
}

const commandRegistry = createRegistry()
commandRegistry.register({
  id: "deck.a.play",
  label: "Play deck A",
  shortcut: "Space",
  available: () => true,
  execute: () => {
    void liveAudio.playDeck(0)
  },
})
commandRegistry.register({
  id: "deck.b.play",
  label: "Play deck B",
  shortcut: "Shift+Space",
  available: () => true,
  execute: () => {
    void liveAudio.playDeck(1)
  },
})
commandRegistry.register({
  id: "library.recommend",
  label: "Recommend a track",
  shortcut: "",
  reason:
    "A recommendation model is not installed. Tempo, key, energy, and phrase filters still work, and nothing is downloaded.",
  available: () => false,
  execute: () => undefined,
})

export function App() {
  useWindowTheme(setWindowTheme)
  const orientation = useStageOrientation()
  const [control, setControl] = useState("midi:cc:1")
  const [commandId, setCommandId] = useState("mixer.crossfader")

  useEffect(() => {
    for (const [id, shortcut] of readShortcuts()) {
      commandRegistry.setShortcut(id, shortcut)
    }
    void commands.listMappings().then((result) => {
      if (result.status !== "ok" || !Array.isArray(result.data)) return
      for (const mapping of result.data) {
        commandRegistry.mapControl(mapping.control, mapping.commandId)
      }
    })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }
      const key = event.key === " " ? "Space" : event.key
      const parts = [
        event.metaKey ? "Meta" : "",
        event.ctrlKey ? "Ctrl" : "",
        event.altKey ? "Alt" : "",
        event.shiftKey ? "Shift" : "",
        key,
      ].filter((part) => part.length > 0)
      const id = commandRegistry.commandForShortcut(parts.join("+"))
      if (!id) return
      event.preventDefault()
      commandRegistry.run(id)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-8 py-10">
      <AboutView loadEngineInfo={commands.engineInfo} />
      <nav aria-label="Transport" className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md px-3 hover:bg-control"
          onClick={() => {
            commandRegistry.run("deck.a.play")
          }}
        >
          Play deck A
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md px-3 hover:bg-control"
          onClick={() => {
            commandRegistry.run("deck.b.play")
          }}
        >
          Play deck B
        </button>
      </nav>
      <TabletFrame orientation={orientation}>
        <AudioPanel api={liveAudio} />
        <LibraryPanel
          onOpen={(path) => {
            useDeckSelection.getState().requestLoad(path)
          }}
        />
      </TabletFrame>
      <CommandPalette registry={commandRegistry} />
      <BottomSheet label="Controller mapping">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            commandRegistry.mapControl(control, commandId)
            void commands.saveMapping(control, commandId)
          }}
        >
          <input
            aria-label="Controller control"
            value={control}
            onChange={(event) => {
              setControl(event.target.value)
            }}
            className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
          />
          <input
            aria-label="Command id"
            value={commandId}
            onChange={(event) => {
              setCommandId(event.target.value)
            }}
            className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
          />
          <button
            type="submit"
            className="min-h-11 rounded-md px-3 hover:bg-control"
          >
            Save mapping
          </button>
        </form>
      </BottomSheet>
      <section
        aria-labelledby="appearance-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="appearance-heading" className="text-title">
          Appearance
        </h2>
        <AppearanceSettings />
      </section>
    </main>
  )
}
