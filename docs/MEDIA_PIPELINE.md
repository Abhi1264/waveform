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
- Tags are read with `lofty` 0.25.4 when the file has them. The filename is the title when
  it does not. That native read is the import path. A MediaBunny worker for artwork and
  export is still to be added in the webview, and it will stay off the audio callback.

## What a later import step stores

Peaks, BPM, beat grid, key, loudness. Each step can fail on its own. A track may play once
its audio is decodable; sync waits for a beat grid.
