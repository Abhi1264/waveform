import { getCurrentWindow } from "@tauri-apps/api/window"
import { AppearanceSettings } from "@waveform/ui/components/appearance-settings"

import { AboutView } from "@/about/about-view"
import { liveAudio } from "@/audio/audio-api"
import { AudioPanel } from "@/audio/audio-panel"
import { commands } from "@/bindings"
import { CommandPalette } from "@/commands/palette"
import { createRegistry } from "@/commands/registry"
import { useWindowTheme, type WindowTheme } from "@/window-theme"

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
  available: () => false,
  execute: () => undefined,
})

export function App() {
  useWindowTheme(setWindowTheme)

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-8 py-10">
      <AboutView loadEngineInfo={commands.engineInfo} />
      <AudioPanel api={liveAudio} />
      <CommandPalette registry={commandRegistry} />
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
