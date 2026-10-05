/** Pitch class of a key's tonic, where 0 is C and 11 is B. */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export type MusicalMode = "major" | "minor"

export interface MusicalKey {
  readonly tonic: PitchClass
  readonly mode: MusicalMode
}

/**
 * How a key is written in the interface:
 * - `standard`: note names, for example "A♭" and "F♯m".
 * - `camelot`: the Camelot wheel, for example "4B" and "11A".
 * - `open-key`: Open Key notation, for example "9d" and "4m".
 */
export type KeyNotation = "standard" | "camelot" | "open-key"
