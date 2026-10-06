# Polish

Measured on macOS 27, Apple silicon, 6 October 2026. Debug builds.

| Check                                                   | Result                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Search, 100,000 catalog rows                            | 4.8 ms for `Track 42`                                                     |
| Hash, 100,000 small files                               | BLAKE3 7.86 s, XXH3-128 11.33 s                                           |
| Engine Catch2 suite                                     | 34 cases passed, including the two-file mix and the default output device |
| Four decks, filter, delay, reverb, 128 frames at 48 kHz | 24 µs per buffer, offline, debug build. The buffer budget is 2.67 ms.     |
| Installers                                              | Not built. The licence, bundle id, and signing identities are still open. |

The 24 µs figure is `Mixer::process` on this machine, not a CoreAudio callback and not a
release build. Startup-to-interactive was not timed. Waveform frame rate was not counted
with a profiler. Those stay open until a release build exists.

What was removed along the way is listed in the changelog. There is still no telemetry.
