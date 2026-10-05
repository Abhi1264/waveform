import nextPlugin from "@next/eslint-plugin-next"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"

import { reactConfig } from "./react.js"

/**
 * Next.js apps.
 *
 * @param {string} tsconfigRootDir
 */
export function nextConfig(tsconfigRootDir) {
  return defineConfig(
    globalIgnores([".next/**", "next-env.d.ts"]),
    reactConfig(tsconfigRootDir),
    {
      plugins: { "@next/next": nextPlugin },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs["core-web-vitals"].rules,
      },
    },
    {
      files: ["*.config.{js,mjs,ts}"],
      languageOptions: { globals: globals.node },
    }
  )
}
