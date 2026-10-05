import { readFileSync, writeFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { renderTokensCss } from "./css"
import {
  colors,
  densities,
  density,
  durationTokens,
  tokenNames,
} from "./tokens"

const committedFile = new URL("./tokens.css", import.meta.url)
const css = renderTokensCss()

/** The declarations inside the first rule with exactly this selector. */
function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) {
    throw new Error(`tokens.css has no rule for ${selector}`)
  }
  return css.slice(start, css.indexOf("}", start))
}

describe("tokens.css", () => {
  it("matches src/tokens.ts", () => {
    if (process.env.WAVEFORM_UPDATE_TOKENS_CSS === "1") {
      writeFileSync(committedFile, css)
    }
    expect(
      readFileSync(committedFile, "utf8"),
      "tokens.css is out of date: run `pnpm --filter @waveform/design-tokens generate`"
    ).toBe(css)
  })

  it("declares every token on the root element", () => {
    const root = ruleBody(":root")
    expect(
      tokenNames.filter((name) => !root.includes(`--wf-${name}:`))
    ).toEqual([])
  })

  it.each([":root:not(.light)", ":root.dark"])(
    "gives the dark theme every colour in %s",
    (selector) => {
      const body = ruleBody(selector)
      expect(
        Object.keys(colors).filter(
          (name) => !body.includes(`--wf-color-${name}:`)
        )
      ).toEqual([])
      expect(body).toContain("color-scheme: dark;")
    }
  )

  it.each(densities)("gives the %s density every density token", (mode) => {
    const body = ruleBody(`[data-density="${mode}"]`)
    for (const [name, values] of Object.entries(density)) {
      expect(body).toContain(`--wf-${name}: ${values[mode]};`)
    }
  })

  it("uses touch sizes for coarse pointers unless a density is chosen", () => {
    expect(css).toContain(
      "@media (pointer: coarse) {\n  :root:not([data-density]) {"
    )
    expect(ruleBody(":root:not([data-density])")).toContain(
      `--wf-control-height: ${density["control-height"].touch};`
    )
  })

  it.each([':root:not([data-motion="full"])', '[data-motion="reduced"]'])(
    "stops transitions in %s",
    (selector) => {
      const body = ruleBody(selector)
      for (const name of durationTokens) {
        expect(body).toContain(`--wf-${name}: 0ms;`)
      }
    }
  )

  it("restores durations when a region asks for full motion", () => {
    const body = ruleBody('[data-motion="full"]')
    expect(body).toContain("--wf-duration-fast: 80ms;")
    expect(body).toContain("--wf-duration-base: 140ms;")
    expect(body).toContain("--wf-duration-slow: 220ms;")
  })
})
