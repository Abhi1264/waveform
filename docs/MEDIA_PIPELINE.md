# Media pipeline

Import turns a folder of files into library rows without running on the audio thread.

## What runs today

- `waveform-library` hashes a file with BLAKE3, stores the row, and records a plain-language
  failure when the file cannot be read. See [DATABASE.md](DATABASE.md) for the hash measurement.
- `JobQueue` imports on a background thread. Submitting a job returns immediately. The latest
  submission is processed next, so a track the DJ just asked for jumps the queue.
- Playback of music files is not wired yet. Decks still play tones (Phase 3) until Phase 5
  attaches prepared audio. Native decode remains the authority (ADR-008). MediaBunny, when
  added for tags and artwork, stays in a webview worker and off the audio callback.

## What a later import step stores

Peaks, BPM, beat grid, key, loudness. Each step can fail on its own. A track may play once
its audio is decodable; sync waits for a beat grid.
