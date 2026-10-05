import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"

/**
 * Type-aware rules for every TypeScript package. Each package's
 * eslint.config.js passes its own directory so the project service finds the
 * right tsconfig.
 *
 * @param {string} tsconfigRootDir
 */
export function baseConfig(tsconfigRootDir) {
  return defineConfig(
    globalIgnores(["dist/**", "out/**", "build/**", "coverage/**"]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      linterOptions: {
        reportUnusedDisableDirectives: "error",
      },
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          { allowNumber: true },
        ],
      },
    },
    {
      files: ["**/*.js", "**/*.mjs"],
      extends: [tseslint.configs.disableTypeChecked],
    }
  )
}
