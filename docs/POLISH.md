# Polish

Measured on macOS 27, Apple silicon, 6 October 2026. Debug builds.

| Check                        | Result                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| Search, 100,000 catalog rows | 4.8 ms for `Track 42`                                                     |
| Hash, 100,000 small files    | BLAKE3 7.86 s, XXH3-128 11.33 s                                           |
| Engine Catch2 suite          | 16 cases, including sync, loop, EQ, and the default output device         |
| Installers                   | Not built. The licence, bundle id, and signing identities are still open. |

Audio at 128 frames with four decks and a full effect load was not measured on hardware
beyond the offline renders. Startup-to-interactive was not timed. Those stay open until a
release build exists.

What was removed along the way is listed in the changelog. There is still no telemetry.
