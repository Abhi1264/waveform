import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@waveform/ui/globals.css"
import { PreferencesProvider } from "@waveform/ui/components/preferences-provider"
import { applySavedPreferences } from "@waveform/ui/lib/preferences"

import { App } from "@/app"

const container = document.getElementById("root")
if (!container) {
  throw new Error("index.html is missing the #root element")
}

applySavedPreferences()

createRoot(container).render(
  <StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </StrictMode>
)
