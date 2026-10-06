/** One action the palette, a shortcut, or a controller can run. */
interface Command {
  id: string
  label: string
  shortcut: string
  /** When this returns false the command is shown disabled. */
  available: () => boolean
  execute: () => void
}

interface Registry {
  register: (command: Command) => void
  list: () => readonly Command[]
  run: (id: string) => void
  matching: (query: string) => readonly Command[]
}

function createRegistry(): Registry {
  const commands = new Map<string, Command>()
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
  }
}

export { createRegistry, type Command, type Registry }
