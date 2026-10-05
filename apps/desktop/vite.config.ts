import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Tauri prints its own output; keep Vite from clearing it.
  clearScreen: false,
  server: {
    // Must match build.devUrl in src-tauri/tauri.conf.json.
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // WebKit in macOS 14 (Safari 17) and Linux WebKitGTK; WebView2 on Windows.
    target: ["es2023", "safari17", "chrome120"],
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
})
