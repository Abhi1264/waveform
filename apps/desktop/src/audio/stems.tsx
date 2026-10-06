import { useState } from "react"

import { Button } from "@waveform/ui/components/button"

/** Keep this sentence identical to `stem_preview_notice` in the library crate. */
const stemPreviewNotice =
  "Filter-bank preview. This is not a neural stem separation."

const stemNames = ["vocals", "drums", "bass", "other"] as const

interface StemPreview {
  vocals: string
  drums: string
  bass: string
  other: string
  notice: string
}

interface StemApi {
  prepareStemPreview: (path: string) => Promise<StemPreview>
  loadStemSlot: (slot: number, path: string) => Promise<void>
  setStemPlaying: (slot: number, playing: boolean) => Promise<void>
  listStemAudio: (directory: string) => Promise<string[]>
}

function slotFromPath(path: string): number | null {
  const file = path.split(/[/\\]/).pop()?.toLowerCase() ?? ""
  const index = stemNames.findIndex((name) => file.startsWith(name))
  return index >= 0 ? index : null
}

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function StemSection({
  api,
  sourcePath,
  deckLetter,
  onLoadDeck,
  onError,
}: {
  api: StemApi
  sourcePath: string
  deckLetter: string
  onLoadDeck: (path: string) => void
  onError: (message: string) => void
}) {
  const [folder, setFolder] = useState("")
  const [found, setFound] = useState<string[]>([])
  const [preview, setPreview] = useState<StemPreview | null>(null)
  const [loaded, setLoaded] = useState<Record<number, string>>({})
  const [playing, setPlaying] = useState<Record<number, boolean>>({})
  const [message, setMessage] = useState("")

  const fail = (reason: unknown) => {
    onError(reason instanceof Error ? reason.message : String(reason))
  }

  const rows = stemNames.map((name, slot) => {
    const fromPreview = preview?.[name] ?? ""
    const fromFolder = found.find((path) => slotFromPath(path) === slot) ?? ""
    return {
      slot,
      name,
      path: fromPreview || fromFolder,
    }
  })

  return (
    <section aria-labelledby="stems-heading" className="flex flex-col gap-3">
      <h3 id="stems-heading" className="text-title">
        Stems
      </h3>
      <p className="text-muted-foreground">{stemPreviewNotice}</p>
      <p className="text-caption text-muted-foreground">
        Open-Unmix weights are PyTorch checkpoints, and ONNX Runtime is not
        linked, so this does not run a neural model. Stem slots sum with the
        decks. The full mix stays on its deck.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          isDisabled={sourcePath.trim().length === 0}
          onPress={() => {
            const path = sourcePath.trim()
            setMessage("Writing a filter-bank preview.")
            api
              .prepareStemPreview(path)
              .then((next) => {
                setPreview(next)
                setMessage(next.notice)
              })
              .catch(fail)
          }}
        >
          Write stem preview
        </Button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const directory = folder.trim()
          if (directory.length === 0) return
          api
            .listStemAudio(directory)
            .then((paths) => {
              setFound(paths)
              setMessage(
                paths.length === 0
                  ? "No vocals, drums, bass, or other audio files in that folder."
                  : "Found stem audio. Loading one does not separate a track."
              )
            })
            .catch(fail)
        }}
      >
        <input
          aria-label="Stem folder"
          value={folder}
          onChange={(event) => {
            setFolder(event.target.value)
          }}
          placeholder="Folder of vocals, drums, bass, and other"
          className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
        />
        <Button type="submit" variant="outline">
          Find stem audio
        </Button>
      </form>
      {message ? (
        <p role="status" className="text-caption text-muted-foreground">
          {message}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const label = titleCase(row.name)
          const armed = loaded[row.slot] === row.path && row.path.length > 0
          const isPlaying = playing[row.slot] === true
          return (
            <li key={row.name} className="flex flex-wrap items-center gap-2">
              <span className="w-16 faceplate text-muted-foreground">
                {label}
              </span>
              <Button
                variant="outline"
                isDisabled={row.path.length === 0}
                onPress={() => {
                  api
                    .loadStemSlot(row.slot, row.path)
                    .then(() => {
                      setLoaded((current) => ({
                        ...current,
                        [row.slot]: row.path,
                      }))
                      setPlaying((current) => ({
                        ...current,
                        [row.slot]: false,
                      }))
                      setMessage(
                        `${label} is on its stem slot. Press play to hear it with the decks.`
                      )
                    })
                    .catch(fail)
                }}
              >
                {label} stem slot
              </Button>
              <Button
                variant="outline"
                isDisabled={!armed}
                onPress={() => {
                  const next = !isPlaying
                  api
                    .setStemPlaying(row.slot, next)
                    .then(() => {
                      setPlaying((current) => ({
                        ...current,
                        [row.slot]: next,
                      }))
                    })
                    .catch(fail)
                }}
              >
                {isPlaying ? `Stop ${row.name}` : `Play ${row.name}`}
              </Button>
              <Button
                variant="outline"
                isDisabled={row.path.length === 0}
                onPress={() => {
                  onLoadDeck(row.path)
                }}
              >
                {label} on deck {deckLetter}
              </Button>
            </li>
          )
        })}
      </ul>
      {found
        .filter((path) => slotFromPath(path) === null)
        .map((path) => (
          <Button
            key={path}
            variant="outline"
            onPress={() => {
              onLoadDeck(path)
            }}
          >
            {path.split(/[/\\]/).pop()} on deck {deckLetter}
          </Button>
        ))}
    </section>
  )
}

export { StemSection, stemPreviewNotice }
