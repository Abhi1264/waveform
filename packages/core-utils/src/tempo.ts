import { formatFixed } from "./number"

/** Formats a tempo in beats per minute, for example "128.00". */
export function formatBpm(bpm: number, decimals = 2): string {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError(`Expected a positive tempo in BPM, got ${bpm}`)
  }
  return bpm.toFixed(decimals)
}

/**
 * Formats a tempo adjustment as a signed percentage, for example "+3.20%" or
 * "−1.50%".
 */
export function formatPitchPercent(percent: number, decimals = 2): string {
  return `${formatFixed(percent, decimals, { signed: true })}%`
}
