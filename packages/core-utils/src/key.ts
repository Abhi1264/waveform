import type { KeyNotation, MusicalKey } from "@waveform/types"

// Spellings with the fewest accidentals, as DJ software conventionally shows them.
const MAJOR_NAMES = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
] as const

const MINOR_NAMES = [
  "Cm",
  "C♯m",
  "Dm",
  "E♭m",
  "Em",
  "Fm",
  "F♯m",
  "Gm",
  "G♯m",
  "Am",
  "B♭m",
  "Bm",
] as const

/** Steps from C around the circle of fifths to the key or its relative major. */
function fifthsFromC(key: MusicalKey): number {
  const majorTonic = key.mode === "major" ? key.tonic : (key.tonic + 3) % 12
  return (majorTonic * 7) % 12
}

/** Formats a musical key, for example "A♭" (standard), "4B" (Camelot) or "9d" (Open Key). */
export function formatKey(key: MusicalKey, notation: KeyNotation): string {
  switch (notation) {
    case "standard":
      return (key.mode === "major" ? MAJOR_NAMES : MINOR_NAMES)[key.tonic]
    case "camelot":
      return `${((fifthsFromC(key) + 7) % 12) + 1}${key.mode === "major" ? "B" : "A"}`
    case "open-key":
      return `${fifthsFromC(key) + 1}${key.mode === "major" ? "d" : "m"}`
  }
}
