import type { KeyNotation, MusicalKey, PitchClass } from "@waveform/types"
import { describe, expect, it } from "vitest"

import { formatKey } from "./key"

// Camelot and Open Key columns copied from the published wheels, so they check
// the circle-of-fifths arithmetic independently.
const KEYS: [PitchClass, MusicalKey["mode"], string, string, string][] = [
  [0, "major", "C", "8B", "1d"],
  [1, "major", "D♭", "3B", "8d"],
  [2, "major", "D", "10B", "3d"],
  [3, "major", "E♭", "5B", "10d"],
  [4, "major", "E", "12B", "5d"],
  [5, "major", "F", "7B", "12d"],
  [6, "major", "F♯", "2B", "7d"],
  [7, "major", "G", "9B", "2d"],
  [8, "major", "A♭", "4B", "9d"],
  [9, "major", "A", "11B", "4d"],
  [10, "major", "B♭", "6B", "11d"],
  [11, "major", "B", "1B", "6d"],
  [0, "minor", "Cm", "5A", "10m"],
  [1, "minor", "C♯m", "12A", "5m"],
  [2, "minor", "Dm", "7A", "12m"],
  [3, "minor", "E♭m", "2A", "7m"],
  [4, "minor", "Em", "9A", "2m"],
  [5, "minor", "Fm", "4A", "9m"],
  [6, "minor", "F♯m", "11A", "4m"],
  [7, "minor", "Gm", "6A", "11m"],
  [8, "minor", "G♯m", "1A", "6m"],
  [9, "minor", "Am", "8A", "1m"],
  [10, "minor", "B♭m", "3A", "8m"],
  [11, "minor", "Bm", "10A", "3m"],
]

describe("formatKey", () => {
  it.each(KEYS)(
    "formats tonic %s %s as %s, %s and %s",
    (tonic, mode, standard, camelot, openKey) => {
      const key = { tonic, mode }
      expect(formatKey(key, "standard")).toBe(standard)
      expect(formatKey(key, "camelot")).toBe(camelot)
      expect(formatKey(key, "open-key")).toBe(openKey)
    }
  )

  it.each<KeyNotation>(["standard", "camelot", "open-key"])(
    "gives all 24 keys distinct %s names",
    (notation) => {
      const names = KEYS.map(([tonic, mode]) =>
        formatKey({ tonic, mode }, notation)
      )
      expect(new Set(names).size).toBe(24)
    }
  )
})
