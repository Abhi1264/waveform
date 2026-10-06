import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TrackList } from "./track-list"

describe("TrackList", () => {
  it("does not mount a row for every track", () => {
    const tracks = Array.from({ length: 1000 }, (_, index) => ({
      id: index,
      title: `Track ${index}`,
      artist: "Artist",
      path: `/music/${index}.wav`,
    }))
    render(
      <TrackList
        tracks={tracks}
        onOpen={() => {
          return undefined
        }}
      />
    )
    expect(screen.getAllByRole("button").length).toBeLessThan(20)
    expect(screen.getByRole("button", { name: /Track 0/ })).toBeVisible()
  })
})
