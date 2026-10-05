import { formatFixed, NO_BREAK_SPACE } from "./number"

/** Formats a short duration in milliseconds, for example "0.42 ms". */
export function formatMilliseconds(milliseconds: number, decimals = 2): string {
  return `${formatFixed(milliseconds, decimals)}${NO_BREAK_SPACE}ms`
}
