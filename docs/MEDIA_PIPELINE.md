# Media pipeline

Import turns a folder of files into library rows without running on the audio thread.

## What runs today

- `waveform-library` hashes a file with BLAKE3, stores the row, and records a plain-language
  failure when the file cannot be read. See [DATABASE.md](DATABASE.md) for the hash measurement.
- `JobQueue` imports on a background thread. Submitting a job returns immediately. The latest
  submission is processed next, so a track the DJ just asked for jumps the queue.
- A wav file is decoded on a loader thread into fixed chunks. The audio callback only reads
  a chunk that has been published. Peaks (min/max pairs) are computed during that load.
  A Catch2 test writes a one-second sine, loads it, and checks that playback and peaks appear.
- Tags on import are read with `lofty` 0.25.4. The filename is the title when a file has
  no tags.
- MediaBunny 1.61.1 inspects a blob in `apps/desktop/src/media/inspect.worker.ts`. It reads
  title, artist and whether cover art is present. It does not decode for playback.

Stem weights, when the user downloads them, are described in [MODELS.md](MODELS.md). That
download does not decode audio and does not run on the audio thread. A stem that already
exists as an audio file is just another file for the deck loader.

## What a later import step stores

Peaks, BPM, beat grid, key, loudness. Each step can fail on its own. A track may play once
its audio is decodable; sync waits for a beat grid.
