import type { TokenName } from "./tokens"

/** A token as a CSS `var()` reference, for inline styles. */
export function cssVar(name: TokenName): string {
  return `var(--wf-${name})`
}

/**
 * A token's current value, for code that cannot use CSS, such as canvas
 * renderers. Read it again when the theme or density changes.
 */
export function readToken(
  name: TokenName,
  element: Element = document.documentElement
): string {
  return getComputedStyle(element).getPropertyValue(`--wf-${name}`).trim()
}
