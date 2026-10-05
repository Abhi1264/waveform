import { assertFinite, MINUS_SIGN } from "./number"

export interface TrackTimeFormatOptions {
  /** Digits after the seconds. Defaults to 1 (tenths). */
  decimals?: 0 | 1 | 2 | 3
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

/**
 * Formats a track position or duration as "mm:ss.t", or "h:mm:ss.t" from one
 * hour. Values are truncated, never rounded up, so a readout never shows a
 * moment that has not been reached. Negative values, such as remaining time,
 * get a leading minus sign.
 */
export function formatTrackTime(
  seconds: number,
  { decimals = 1 }: TrackTimeFormatOptions = {}
): string {
  assertFinite(seconds)
  const scale = 10 ** decimals
  // The epsilon absorbs binary error such as 0.3 * 10 === 2.9999999999999996.
  const units = Math.floor(Math.abs(seconds) * scale + 1e-6)
  const wholeSeconds = Math.floor(units / scale)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor(wholeSeconds / 60) % 60
  const clock =
    hours > 0
      ? `${hours}:${pad2(minutes)}:${pad2(wholeSeconds % 60)}`
      : `${pad2(minutes)}:${pad2(wholeSeconds % 60)}`
  const text =
    decimals > 0
      ? `${clock}.${String(units % scale).padStart(decimals, "0")}`
      : clock
  return seconds < 0 && units > 0 ? MINUS_SIGN + text : text
}
