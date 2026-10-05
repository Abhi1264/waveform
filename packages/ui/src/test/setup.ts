import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

import { installMatchMedia, resetMediaQueries } from "./media"

installMatchMedia()

afterEach(() => {
  cleanup()
  resetMediaQueries()
  localStorage.clear()
})
