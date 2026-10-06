/** One action the palette, a shortcut, a menu, or a controller can run. */
interface Command {
  id: string
  label: string
  shortcut: string
  /** Shown when the command is disabled. */
  reason?: string
  /** When this returns false the command is shown disabled. */
  available: () => boolean
  execute: () => void
}

interface Registry {
  register: (command: Command) => void
  list: () => readonly Command[]
  run: (id: string) => void
  matching: (query: string) => readonly Command[]
  setShortcut: (id: string, shortcut: string) => void
  commandForShortcut: (shortcut: string) => string | undefined
  mapControl: (control: string, id: string) => void
  commandForControl: (control: string) => string | undefined
}

function createRegistry(): Registry {
  const commands = new Map<string, Command>()
  const controls = new Map<string, string>()
  return {
    register(command) {
      commands.set(command.id, command)
    },
    list() {
      return [...commands.values()]
    },
    run(id) {
      const command = commands.get(id)
      if (command?.available()) {
        command.execute()
      }
    },
    matching(query) {
      const needle = query.trim().toLocaleLowerCase()
      return [...commands.values()].filter((command) => {
        if (needle.length === 0) return true
        return (
          command.label.toLocaleLowerCase().includes(needle) ||
          command.id.toLocaleLowerCase().includes(needle)
        )
      })
    },
    setShortcut(id, shortcut) {
      const command = commands.get(id)
      if (!command) return
      const next = shortcut.trim()
      commands.set(id, { ...command, shortcut: next })
      try {
        const raw = localStorage.getItem("waveform.shortcuts")
        const stored: Record<string, string> = {}
        if (raw) {
          const parsed: unknown = JSON.parse(raw)
          if (typeof parsed === "object" && parsed !== null) {
            for (const [key, value] of Object.entries(parsed)) {
              if (typeof value === "string") stored[key] = value
            }
          }
        }
        if (next.length > 0) stored[id] = next
        const kept = Object.fromEntries(
          Object.entries(stored).filter(
            ([key]) => next.length > 0 || key !== id
          )
        )
        localStorage.setItem("waveform.shortcuts", JSON.stringify(kept))
      } catch {
        // Storage can be unavailable. The shortcut still works for this session.
      }
    },
    commandForShortcut(shortcut) {
      const needle = shortcut.trim().toLocaleLowerCase()
      if (needle.length === 0) return undefined
      for (const command of commands.values()) {
        if (command.shortcut.toLocaleLowerCase() === needle) return command.id
      }
      return undefined
    },
    mapControl(control, id) {
      controls.set(control, id)
    },
    commandForControl(control) {
      return controls.get(control)
    },
  }
}

export { createRegistry, type Command, type Registry }
