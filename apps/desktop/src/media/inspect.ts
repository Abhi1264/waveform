import { ALL_FORMATS, BlobSource, Input } from "mediabunny"

/** Tags and whether cover art is present. Inspection never touches the audio thread. */
interface Inspection {
  title: string
  artist: string
  artwork: boolean
  error: string
}

async function inspectAudio(data: Blob): Promise<Inspection> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(data),
  })
  try {
    const tags = await input.getMetadataTags()
    return {
      title: tags.title ?? "",
      artist: tags.artist ?? "",
      artwork: (tags.images?.length ?? 0) > 0,
      error: "",
    }
  } catch (reason: unknown) {
    return {
      title: "",
      artist: "",
      artwork: false,
      error: reason instanceof Error ? reason.message : String(reason),
    }
  } finally {
    input[Symbol.dispose]()
  }
}

export { inspectAudio, type Inspection }
