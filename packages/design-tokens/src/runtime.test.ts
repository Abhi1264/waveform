// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"

import { cssVar, readToken } from "./runtime"

afterEach(() => {
  document.documentElement.removeAttribute("style")
  document.body.replaceChildren()
})

describe("cssVar", () => {
  it("references the token's custom property", () => {
    expect(cssVar("color-canvas")).toBe("var(--wf-color-canvas)")
  })
})

describe("readToken", () => {
  it("reads the value on the root element", () => {
    document.documentElement.style.setProperty(
      "--wf-color-canvas",
      " oklch(0.164 0.004 286)"
    )
    expect(readToken("color-canvas")).toBe("oklch(0.164 0.004 286)")
  })

  it("reads the value on a given element", () => {
    const panel = document.createElement("div")
    panel.style.setProperty("--wf-radius-md", "0.36rem")
    document.body.append(panel)
    expect(readToken("radius-md", panel)).toBe("0.36rem")
  })

  it("returns an empty string for a token that is not set", () => {
    expect(readToken("layer-drag")).toBe("")
  })
})
