import { describe, expect, it } from "vitest"

import { inspectAudio } from "./inspect"

describe("MediaBunny inspection", () => {
  it("reports a file it cannot read without throwing", async () => {
    const result = await inspectAudio(new Blob(["not audio"]))
    expect(result.title).toBe("")
    expect(result.error.length).toBeGreaterThan(0)
  })
})
