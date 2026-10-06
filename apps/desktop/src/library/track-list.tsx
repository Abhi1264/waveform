import { useState } from "react"

interface TrackRow {
  id: number
  title: string
  artist: string
  path: string
}

const rowHeight = 36
const viewHeight = 240

/** Renders only the rows inside the scroll window. */
function TrackList({
  tracks,
  onOpen,
  onRate,
}: {
  tracks: readonly TrackRow[]
  onOpen: (path: string) => void
  onRate?: (id: number) => void
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const start = Math.min(tracks.length, Math.floor(scrollTop / rowHeight))
  const visibleCount = Math.ceil(viewHeight / rowHeight) + 1
  const visible = tracks.slice(start, start + visibleCount)

  return (
    <div
      data-testid="track-list"
      className="overflow-auto rounded-md border border-divider"
      style={{ height: viewHeight }}
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop)
      }}
    >
      <div style={{ height: tracks.length * rowHeight, position: "relative" }}>
        {visible.map((track, index) => (
          <div
            key={track.id}
            className="absolute inset-x-0"
            style={{ top: (start + index) * rowHeight, height: rowHeight }}
          >
            <button
              type="button"
              className="flex h-full w-full items-baseline gap-3 px-3 text-left hover:bg-control"
              onClick={() => {
                onOpen(track.path)
              }}
            >
              <span className="truncate">{track.title}</span>
              <span className="truncate text-caption text-muted-foreground">
                {track.artist}
              </span>
            </button>
            {onRate ? (
              <button
                type="button"
                className="absolute top-0 right-2 h-full text-caption"
                onClick={() => {
                  onRate(track.id)
                }}
              >
                Rate
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export { TrackList, type TrackRow }
