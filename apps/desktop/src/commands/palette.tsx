import { useState } from "react"

import type { Registry } from "./registry"

function CommandPalette({ registry }: { registry: Registry }) {
  const [query, setQuery] = useState("")
  const commands = registry.matching(query)
  return (
    <section aria-labelledby="palette-heading" className="flex flex-col gap-3">
      <h2 id="palette-heading" className="text-title">
        Commands
      </h2>
      <input
        aria-label="Find a command"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
        }}
        className="rounded-md border border-divider bg-surface px-3 py-2"
      />
      <ul className="flex flex-col gap-1">
        {commands.map((command) => (
          <li key={command.id}>
            <div className="flex min-h-11 items-center gap-2">
              <button
                type="button"
                className="flex min-h-11 flex-1 items-center justify-between rounded-md px-3 text-left hover:bg-control disabled:opacity-50"
                disabled={!command.available()}
                onClick={() => {
                  registry.run(command.id)
                }}
              >
                <span>{command.label}</span>
                {!command.available() && command.reason ? (
                  <span className="text-caption text-muted-foreground">
                    {command.reason}
                  </span>
                ) : null}
              </button>
              <input
                aria-label={`Shortcut for ${command.label}`}
                defaultValue={command.shortcut}
                onBlur={(event) => {
                  registry.setShortcut(command.id, event.target.value)
                }}
                className="w-28 rounded-md border border-divider bg-surface px-2 py-1"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { CommandPalette }
