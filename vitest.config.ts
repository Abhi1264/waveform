import { defineConfig } from "vitest/config"

// One Vitest process for every package, for watch mode during development.
// CI runs each package's own `test` script through Turborepo instead.
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
  },
})
