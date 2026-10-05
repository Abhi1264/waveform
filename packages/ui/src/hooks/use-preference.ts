import { useCallback, useSyncExternalStore } from "react"

// Choices made while storage is unavailable, so they still apply until the app closes.
const sessionValues = new Map<string, string>()
const listeners = new Set<() => void>()

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function readPreference<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T
): T {
  const value = sessionValues.get(key) ?? readStored(key)
  return options.find((option) => option === value) ?? fallback
}

/**
 * Saves a choice in local storage. Choosing the default removes the entry, so
 * nothing is stored until someone changes a setting.
 */
function writePreference(key: string, value: string, fallback: string): void {
  try {
    if (value === fallback) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
    sessionValues.delete(key)
  } catch {
    // Storage can be disabled; keep the choice for this session instead.
    sessionValues.set(key, value)
  }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null) {
      sessionValues.delete(event.key)
    }
    listener()
  }
  listeners.add(listener)
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * A setting saved on this device, such as the theme. Server rendering and the
 * first client render use the fallback, so hydration matches.
 */
export function usePreference<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readPreference(key, options, fallback),
    () => fallback
  )
  const setValue = useCallback(
    (next: T) => {
      writePreference(key, next, fallback)
    },
    [key, fallback]
  )
  return [value, setValue]
}
