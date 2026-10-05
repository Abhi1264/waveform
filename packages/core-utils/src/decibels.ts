import { formatFixed, MINUS_SIGN, NO_BREAK_SPACE } from "./number"

export interface DecibelFormatOptions {
  /** Digits after the decimal point. Defaults to 1. */
  decimals?: number
  /** Prefix positive values with "+", as gain controls do. Defaults to false. */
  signed?: boolean
}

/**
 * Formats a level or gain in decibels, for example "−3.5 dB". Silence
 * (negative infinity) is written "−∞ dB".
 */
export function formatDecibels(
  value: number,
  { decimals = 1, signed = false }: DecibelFormatOptions = {}
): string {
  const number =
    value === Number.NEGATIVE_INFINITY
      ? `${MINUS_SIGN}∞`
      : formatFixed(value, decimals, { signed })
  return `${number}${NO_BREAK_SPACE}dB`
}
