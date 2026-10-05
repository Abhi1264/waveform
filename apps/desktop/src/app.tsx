import { getCurrentWindow } from "@tauri-apps/api/window"
import { AppearanceSettings } from "@waveform/ui/components/appearance-settings"

import { AboutView } from "@/about/about-view"
import { commands } from "@/bindings"
import { useWindowTheme, type WindowTheme } from "@/window-theme"

function setWindowTheme(theme: WindowTheme): Promise<void> {
  return getCurrentWindow().setTheme(theme)
}

export function App() {
  useWindowTheme(setWindowTheme)

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-8 py-10">
      <AboutView loadEngineInfo={commands.engineInfo} />
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
