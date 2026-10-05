import { defineConfig } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"

import { baseConfig } from "./base.js"

/**
 * React packages and Vite apps.
 *
 * @param {string} tsconfigRootDir
 * @param {{ vite?: boolean }} [options] enable Fast Refresh export checks
 */
export function reactConfig(tsconfigRootDir, options = {}) {
  return defineConfig(
    baseConfig(tsconfigRootDir),
    reactHooks.configs.flat.recommended,
    options.vite ? reactRefresh.configs.vite : {},
    {
      languageOptions: {
        globals: globals.browser,
      },
    }
  )
}
