/** U+2212, which screen readers announce as "minus" (a hyphen may be read as "dash"). */
export const MINUS_SIGN = "\u2212"

/** Keeps a number and its unit on the same line. */
export const NO_BREAK_SPACE = "\u00a0"

export function assertFinite(value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Expected a finite number, got ${value}`)
  }
}

/**
 * Formats a finite number with a fixed number of decimals, rounding halves
 * away from zero. Values that round to zero are never signed, so the output is
 * never "−0.0".
 */
export function formatFixed(
  value: number,
  decimals: number,
  { signed = false }: { signed?: boolean } = {}
): string {
  assertFinite(value)
  const digits = Math.abs(value).toFixed(decimals)
  if (Number(digits) === 0) {
    return digits
  }
  if (value < 0) {
    return MINUS_SIGN + digits
  }
  return signed ? `+${digits}` : digits
}
