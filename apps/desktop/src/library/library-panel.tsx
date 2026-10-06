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
  const [stemPath, setStemPath] = useState("")
  const [downloadingModel, setDownloadingModel] = useState(false)
  const [playlist, setPlaylist] = useState("")
  const [kind, setKind] = useState("playlist")
  const [minBpm, setMinBpm] = useState("110")
  const [maxBpm, setMaxBpm] = useState("140")
  const [musicalKey, setMusicalKey] = useState("")
  const [title, setTitle] = useState("")
  const [tag, setTag] = useState("")
  const [folders, setFolders] = useState<string[]>([])

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
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const path = stemPath.trim()
          if (path.length === 0) return
          onOpen(path)
          setStatus(
            "Loaded that file on deck A. This plays a file already on disk. It does not separate the track."
          )
        }}
      >
        <div className="flex gap-2">
          <input
            aria-label="Stem audio file"
            value={stemPath}
            onChange={(event) => {
              setStemPath(event.target.value)
            }}
            className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
          />
          <Button type="submit" variant="outline">
            Load stem on deck A
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          isDisabled={downloadingModel}
          onPress={() => {
            setDownloadingModel(true)
            setStatus(
              "Downloading Open-Unmix UMX-HQ. Nothing is separated until a model actually runs, and this one does not."
            )
            void commands
              .downloadStemModel()
              .then((result) => {
                setDownloadingModel(false)
                setStatus(
                  result.status === "error" ? result.error : result.data
                )
              })
              .catch((reason: unknown) => {
                setDownloadingModel(false)
                setStatus(
                  reason instanceof Error ? reason.message : String(reason)
                )
              })
          }}
        >
          Download stem model
        </Button>
        <p className="text-caption text-muted-foreground">
          The download is 142,551,184 bytes from Zenodo, under the MIT licence.
          Waveform checks the SHA-256 before it treats the files as installed.
          They are PyTorch weights. ONNX Runtime is not linked, so separation
          does not run.
        </p>
      </form>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const name = playlist.trim()
          if (name.length === 0) return
          void commands
            .createCollection(
              name,
              kind,
              kind === "smart" ? Number(minBpm) : null,
              kind === "smart" ? Number(maxBpm) : null,
              kind === "smart" && musicalKey.trim().length > 0
                ? musicalKey.trim()
                : null
            )
            .then(async (created) => {
              if (created.status === "error") {
                setStatus(created.error)
                return
              }
              const first = tracks[0]
              if (first) {
                const added = await commands.addToCollection(
                  created.data.id,
                  first.id
                )
                if (added.status === "error") {
                  setStatus(added.error)
                  return
                }
              }
              if (first) {
                const listed = await commands.collectionTracks(created.data.id)
                if (listed.status === "ok") setTracks(listed.data)
              }
              setStatus(`Playlist ${created.data.name}.`)
            })
        }}
      >
        <input
          aria-label="Playlist name"
          value={playlist}
          onChange={(event) => {
            setPlaylist(event.target.value)
          }}
          className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
        />
        {kind === "smart" ? (
          <>
            <input
              aria-label="Minimum BPM"
              value={minBpm}
              onChange={(event) => {
                setMinBpm(event.target.value)
              }}
              className="w-20 rounded-md border border-divider bg-surface px-2 py-2"
            />
            <input
              aria-label="Maximum BPM"
              value={maxBpm}
              onChange={(event) => {
                setMaxBpm(event.target.value)
              }}
              className="w-20 rounded-md border border-divider bg-surface px-2 py-2"
            />
            <input
              aria-label="Key"
              value={musicalKey}
              onChange={(event) => {
                setMusicalKey(event.target.value)
              }}
              className="w-16 rounded-md border border-divider bg-surface px-2 py-2"
            />
          </>
        ) : null}
        <label className="flex items-center gap-2">
          <span className="faceplate text-muted-foreground">Kind</span>
          <select
            aria-label="Collection kind"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value)
            }}
            className="rounded-md border border-divider bg-surface px-2 py-2"
          >
            <option value="playlist">Playlist</option>
            <option value="crate">Crate</option>
            <option value="smart">Smart playlist</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Create
        </Button>
      </form>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const first = tracks[0]
          const nextTag = tag.trim()
          if (!first || nextTag.length === 0) return
          void commands.tagTrack(first.id, nextTag).then((result) => {
            setStatus(
              result.status === "error" ? result.error : `Tagged ${nextTag}.`
            )
          })
        }}
      >
        <input
          aria-label="Tag"
          value={tag}
          onChange={(event) => {
            setTag(event.target.value)
          }}
          className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
        />
        <Button type="submit" variant="outline">
          Tag
        </Button>
        <Button
          type="button"
          variant="outline"
          onPress={() => {
            void commands.recentPlays().then((result) => {
              if (result.status === "error") {
                setStatus(result.error)
                return
              }
              setTracks(result.data)
              setStatus(
                result.data.length === 0 ? "No plays yet." : "Recent plays."
              )
            })
            void commands.listFolders().then((result) => {
              if (result.status === "ok") setFolders(result.data)
            })
          }}
        >
          Recent
        </Button>
      </form>
      {folders.length > 0 ? (
        <ul className="text-caption text-muted-foreground">
          {folders.map((folder) => (
            <li key={folder}>{folder}</li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const first = tracks[0]
          const nextTitle = title.trim()
          if (!first || nextTitle.length === 0) return
          void commands
            .setTrackMetadata(first.id, nextTitle, first.artist)
            .then((result) => {
              setStatus(
                result.status === "error"
                  ? result.error
                  : `Renamed to ${nextTitle}.`
              )
            })
        }}
      >
        <input
          aria-label="New title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          className="min-w-0 flex-1 rounded-md border border-divider bg-surface px-3 py-2"
        />
        <Button type="submit" variant="outline">
          Rename
        </Button>
      </form>
      <TrackList
        tracks={tracks}
        onOpen={onOpen}
        onRate={(id) => {
          void commands.setTrackRating(id, 5).then((result) => {
            setStatus(result.status === "error" ? result.error : "Rated 5.")
          })
        }}
      />
    </section>
  )
}

export { LibraryPanel }
