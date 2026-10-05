type Listener = (event: MediaQueryListEvent) => void

const matches = new Map<string, boolean>()
const listeners = new Map<string, Set<Listener>>()

/** jsdom has no matchMedia. This stand-in lets tests decide which media queries match. */
export function installMatchMedia(): void {
  window.matchMedia = (query: string) => {
    const queryListeners = listeners.get(query) ?? new Set<Listener>()
    listeners.set(query, queryListeners)
    return {
      media: query,
      get matches() {
        return matches.get(query) ?? false
      },
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => {
        queryListeners.add(listener)
      },
      removeEventListener: (_type: string, listener: Listener) => {
        queryListeners.delete(listener)
      },
      addListener: (listener: Listener) => {
        queryListeners.add(listener)
      },
      removeListener: (listener: Listener) => {
        queryListeners.delete(listener)
      },
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }
}

export function setMediaQuery(query: string, value: boolean): void {
  matches.set(query, value)
  for (const listener of listeners.get(query) ?? []) {
    listener({ matches: value, media: query } as MediaQueryListEvent)
  }
}

export function resetMediaQueries(): void {
  matches.clear()
}
