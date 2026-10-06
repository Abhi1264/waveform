import { globalIgnores } from "eslint/config"

import { reactConfig } from "@waveform/config/eslint/react"

export default [
  globalIgnores([
    "src-tauri/**",
    "src/bindings.ts",
    "e2e/**",
    "playwright.config.ts",
  ]),
  ...reactConfig(import.meta.dirname, { vite: true }),
]
