import { useState } from "react"

import { Button } from "@waveform/ui/components/button"
import { Channel } from "@tauri-apps/api/core"

import { commands, type ImportProgress, type LibraryTrack } from "@/bindings"

import { TrackList } from "./track-list"

function LibraryPanel({ onOpen }: { onOpen: (path: string) => void }) {
  const [query, setQuery] = useState("")
  const [folder, setFolder] = useState("")
  const [tracks, setTracks] = useState<LibraryTrack[]>([])
  const [status, setStatus] = useState("")

  return (
    <section aria-labelledby="library-heading" className="flex flex-col gap-3">
      <h2 id="library-heading" className="text-title">
        Library
      </h2>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          commands
            .searchTracks(query)
            .then((result) => {
              if (result.status === "error") {
                setStatus(result.error)
                return
              }
              setTracks(result.data)
              setStatus(
                result.data.length === 0
                  ? "No tracks matched."
                  : `${result.data.length} tracks.`
              )
            })
            .catch((reason: unknown) => {
              setStatus(
                reason instanceof Error ? reason.message : String(reason)
              )
            })
        }}
      >
        <input
          aria-label="Search tracks"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
        />
        <Button type="submit">Search</Button>
      </form>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const channel = new Channel<ImportProgress>()
          channel.onmessage = (progress) => {
            setStatus(
              progress.failure
                ? `${progress.done} of ${progress.total}: ${progress.failure}`
                : `Imported ${progress.done} of ${progress.total}.`
            )
          }
          void commands.importFolder(folder, channel).then((result) => {
            if (result.status === "error") setStatus(result.error)
          })
        }}
      >
        <input
          aria-label="Folder to import"
          value={folder}
          onChange={(event) => {
            setFolder(event.target.value)
          }}
          className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
        />
        <Button type="submit" variant="outline">
          Import
        </Button>
      </form>
      <p role="status" className="text-caption text-muted-foreground">
        {status}
      </p>
      <TrackList tracks={tracks} onOpen={onOpen} />
    </section>
  )
}

export { LibraryPanel }
