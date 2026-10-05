/** The nearest element around `element` matching `selector`, failing the test if there is none. */
export function closest(element: Element, selector: string): HTMLElement {
  const match = element.closest<HTMLElement>(selector)
  if (match === null) {
    throw new Error(`Nothing matching ${selector} contains the element`)
  }
  return match
}
