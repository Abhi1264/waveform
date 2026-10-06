# Changelog

Notable changes to Waveform. Nothing has been released yet, so everything below is
unreleased work, grouped by [roadmap](docs/ROADMAP.md) phase.

## Unreleased

### Licence and models

- The project licence is GNU AGPL-3.0-only (`LICENSE`). Packages stay private and are not
  published to npm or crates.io. Their SPDX field is `AGPL-3.0-only`.
- Contributions use a Developer Certificate of Origin sign-off. There is no CLA.
- The iOS and Mac App Store stay blocked. AGPL conflicts with Apple's terms. No store
  binary is built.
- `WAVEFORM_ENABLE_ASIO` compiles ASIO on Windows when the GPLv3 headers are present. It
  defaults off, and CI does not compile ASIO. `hidapi` stays the controller library and is
  not linked.
- Open-Unmix UMX-HQ can be downloaded when the user asks. The SHA-256 is checked before
  the files count as installed. ONNX Runtime is not linked, and no neural separation runs.
  Stem audio that is already on disk plays through the deck loader.

### Phases 4–13

Added:

- `waveform-library`: SQLite, FTS5 search, BLAKE3 content hashes, a background import queue,
  playlists, crates, smart playlists, ratings, tags, history, folders, and controller mappings.
- Search of 100,000 catalog rows returned in 4.8 ms on this Mac.
- Four mixer decks with seek, pitch, EQ, loops, hot cues, beat jump, a filter, delay, reverb,
  a sampler pad, and master recording. An offline test mixes two loaded files.
- Tempo, key, and a beat grid from the first eight seconds of a file. Sync waits for that grid.
- MIDI CC 1 moves the crossfader on the audio thread. Mappings store command ids.
- A command registry, palette, shortcuts, and a transport menu.
- Website sections for philosophy, features, and platforms. There is still nothing to download.

### Phase 3: Audio engine foundation

Added:

- Tone decks, a constant-power crossfader and master output in the C++ engine, driven by a
  lock-free command queue and a seqlock snapshot.
- Device open, close, unplug and sample-rate change, with offline renders for the mix path.
- Desktop Audio panel: default output, two tone decks, crossfader and a live snapshot.
- ADR-021: file-backed audio will be a chunked cache. Tones do not use it.

### Phase 2: Design system

Added:

- `@waveform/design-tokens`: OKLCH colour, type, density, radius, motion, layer and
  touch-target tokens, with contrast and completeness tests.
- Theme, density and motion providers, and an appearance control, in `@waveform/ui`.
- Token-mapped shadcn components (React Aria) and DJ controls: `Knob`, `Fader`,
  `Readout`, `LevelMeter`, with keyboard and ARIA tests.
- The website's `/design-system` examples page: live contrast ratios, type specimens,
  density comparison, states, motion, and labelled deck-header and transport specimens.
- Playwright axe, keyboard, reduced-motion and 44 px touch-target checks in Chromium
  and WebKit.
- Desktop window theme follows the chosen appearance through Tauri's window API.
- Archivo and Martian Mono, bundled locally under the SIL Open Font License.

### Phase 1: Monorepo foundation

Added:

- A pnpm 12 workspace with Turborepo, TypeScript 7 type-checking, ESLint 10, Prettier 3,
  Vitest 5 and Playwright 1.63, plus rustfmt, clippy and a pinned clang-format.
- The desktop app (`apps/desktop`): a Tauri 2.12 shell whose About view shows the app,
  engine, JUCE and platform versions, and whether JUCE's message loop responds. A
  `--self-test` flag checks the message loop from the command line.
- The website (`apps/web`): a static status page.
- The native engine: JUCE 9.0.3 and Catch2 3.16 through pinned, hash-verified downloads;
  `waveform_dsp` with crossfader curves; `waveform_engine` with build information and the
  JUCE runtime lifecycle.
- `crates/waveform-engine`, the Rust bridge to the engine, built with cxx.
- Shared packages: `@waveform/ui` (shadcn components on React Aria, and the Waveform mark),
  `@waveform/core-utils` (formatting for levels, tempo, pitch, time, keys and durations),
  `@waveform/types` and `@waveform/config`.
- App icons for every platform and an adaptive favicon, derived from the official mark.
- Continuous integration for JavaScript, Rust, the native engine on macOS, Windows and
  Linux, and desktop builds with the self-test on all three.
- README, CONTRIBUTING, SECURITY and THIRD_PARTY_LICENSES; DEVELOPMENT, PLATFORM_SUPPORT,
  PRIVACY and AUDIO_ENGINE in `docs/`.

### Phase 0: Discovery and architecture

Added:

- ARCHITECTURE, TECH_DECISIONS (ADR-001 to ADR-020), ROADMAP and LICENSING in `docs/`.
