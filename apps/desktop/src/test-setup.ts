import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// jsdom has no matchMedia; no media query matches in these tests.
window.matchMedia = (query: string) =>
  ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  }) as MediaQueryList

afterEach(() => {
  cleanup()
  localStorage.clear()
})
