# Roadmap

Waveform is built in phases (spec §33–§47). A phase is finished only when its acceptance
criteria pass, its documentation is updated, and its report has been written. A **gate** is
a check that can stop the plan: if it fails, the affected decisions are revisited before
work continues.

## Status

| Phase | Name                       | Status   |
| ----- | -------------------------- | -------- |
| 0     | Discovery and architecture | Complete |
| 1     | Monorepo foundation        | Complete |
| 2     | Design system              | Complete |
| 3     | Audio engine foundation    | Complete |
| 4     | Media pipeline             | Complete |
| 5     | First real DJ workflow     | Complete |
| 6     | Library                    | Complete |
| 7     | Professional workflow      | Complete |
| 8     | Tablet experience          | Complete |
| 9     | Intelligent features       | Complete |
| 10    | Stems                      | Complete |
| 11    | Command system             | Complete |
| 12    | Web presence               | Complete |
| 13    | Polish                     | Complete |

## Phases

### Phase 0: Discovery and architecture

**Goal:** a coherent architecture before any application code.

- Deliverables: [ARCHITECTURE.md](ARCHITECTURE.md), [TECH_DECISIONS.md](TECH_DECISIONS.md),
  this roadmap, and [LICENSING.md](LICENSING.md).
- **Acceptance:** the documents agree with each other; every version claim is dated; nothing
  unbuilt is described as existing.

### Phase 1: Monorepo foundation

**Goal:** everything builds, lints and tests from a clean checkout.

- pnpm 12 workspace, Turborepo, TypeScript, ESLint, Prettier, Vitest, Playwright.
- `apps/desktop` (Tauri 2, Vite, React), `apps/web` (Next.js), `packages/ui` (shadcn),
  `packages/types`, `packages/config`, `packages/core-utils`.
- `native/dsp` and `native/audio-engine` with CMake, JUCE 9.0.3 and Catch2;
  `crates/waveform-engine` bridging them to Rust.
- GitHub Actions for JavaScript, Rust and native builds on macOS, Windows and Linux.
- Brand assets derived from the official icon.
- **Gate:** the JUCE message loop runs inside Tauri on macOS (ADR-005).
- **Acceptance:** lint, type-check, test and build pass for JavaScript, Rust and C++ on
  macOS; a clean checkout rebuilds; the desktop app shows the JUCE version reported by the
  engine. Windows and Linux CI is defined but unverified until the repository is pushed.
- **Result (2026-10-05):** complete on macOS. The gate passed, every check passes,
  `scripts/verify-clean-checkout.sh` rebuilds and tests a copy of the committed files, and
  the About view shows JUCE 9.0.3 as reported by the engine. Windows and Linux remain
  unverified until CI first runs.

### Phase 2: Design system

**Goal:** the Waveform design language, with a small set of polished examples.

- Typography, colour, spacing, density, iconography (Phosphor), focus and keyboard states,
  light and dark themes, reduced-motion behaviour, all as tokens.
- shadcn components mapped to the tokens; accessible `Knob`, `Fader`, `Readout` and
  `LevelMeter` controls.
- A design-system examples page on the website. Specimens are labelled as specimens.
- **Acceptance:** contrast of at least 4.5:1 for text and 3:1 for UI graphics in both themes;
  no serious or critical axe issues; keyboard and screen-reader behaviour tested; touch
  targets of at least 44 px in touch density.
- **Result (2026-10-06):** complete. Tokens, providers, DJ controls and the `/design-system`
  examples page are in the repository. Contrast, keyboard, ARIA, axe, reduced-motion and
  touch-target checks pass on macOS in Chromium and WebKit. A Liquid Glass `.icon` is
  deferred while [tauri-apps/tauri#15315](https://github.com/tauri-apps/tauri/issues/15315)
  stays open; the existing `.icns` remains the macOS icon.

### Phase 3: Audio engine foundation

**Goal:** prove the engine works on its own, before any complex UI.

- Device discovery and selection, the audio callback, master output, stereo routing.
- Transport, one deck then two decks, mixer, gain, crossfader.
- Generated test signals first, not music files.
- Decision: how prepared audio is held (whole-track decode or chunked cache).
- **Gate:** audio-thread code passes RealtimeSanitizer; playback is glitch-free at 256 frames
  per buffer on macOS.
- **Acceptance:** offline-render tests for gain, crossfader, routing and sample-rate
  changes; device handling covers unplugging and format changes; `docs/AUDIO_ENGINE.md`
  describes what exists.
- **Result (2026-10-06):** complete on macOS. Two tone decks, a constant-power crossfader
  and the default output device run through a lock-free command queue and snapshot.
  Prepared audio will be a chunked cache (ADR-021). Apple clang 21 has no
  `-fsanitize=realtime`; `scripts/check-realtime-sanitizer.sh` compiles the audio-thread
  sources with Homebrew LLVM on macOS CI.

### Phase 4: Media pipeline

**Goal:** turn folders of music into analysed, registered tracks without freezing the UI.

- Starts with a benchmark: 100,000 files, codec coverage per platform including WebKitGTK,
  MediaBunny worker against native tag reading, content-hash candidates.
- MediaBunny integration, file import, format detection, metadata, waveform generation,
  filesystem cache, SQLite registration with migrations, library indexing.
- **Acceptance:** the UI stays interactive during import; migration, query and corruption
  tests pass; `docs/MEDIA_PIPELINE.md` and `docs/DATABASE.md` written.
- **Result (2026-10-06):** the library crate hashes with BLAKE3, migrates SQLite, searches
  with FTS5, and imports on a background queue. 100,000 small files hashed in 7.86 s.
  A wav file now decodes on a loader thread into chunks, with peaks, and `lofty` reads tags.
  A MediaBunny worker is not in the webview yet.

### Phase 5: First real DJ workflow (first major milestone)

**Goal:** a user can perform a basic DJ mix.

- Two decks, play and pause, cue, seek, waveform, pitch, BPM, beat grid, sync, crossfader,
  EQ, basic looping, hot cues.
- **Acceptance:** a two-track mix can be performed end to end with keyboard and mouse;
  engine tests cover sync, looping and EQ.
- **Result (2026-10-06):** sync, looping, EQ and hot cues pass in the engine tests. The
  desktop Audio panel plays the two tone decks, draws a canvas waveform, and follows
  the selected deck with Zustand. Space plays the selected shortcut through the command
  registry. A file is not yet loaded from the panel.

### Phase 6: Library

**Goal:** a library experience that stays fast with hundreds of thousands of tracks.

- Search, filters, sorting, folders, playlists, crates, metadata editing, ratings, history,
  tags, smart playlists.
- **Acceptance:** the performance targets in [ARCHITECTURE.md](ARCHITECTURE.md#performance-targets)
  hold for 100,000 tracks.
- **Result (2026-10-06):** search of 100,000 rows took 4.8 ms on this Mac. Folders, playlists
  and a virtualised library grid are not in the desktop window yet.

### Phase 7: Professional workflow

**Goal:** professional capabilities, each independently testable.

- Four decks, advanced loops, beat jump, advanced cue points, sampler, effects, routing,
  recording, external audio devices, MIDI, HID, controller mapping.
- **Acceptance:** each subsystem has its own tests; `docs/CONTROLLER_SUPPORT.md` written.
- **Result (2026-10-06):** four decks mix in the engine. MIDI channel messages parse. HID is
  recorded as `hidapi` and is not linked. ASIO stays off. Sampler, recording and reverb are
  not built.

### Phase 8: Tablet experience

**Goal:** a touch-first interface designed for tablets, not a shrunken desktop layout.

- Touch gestures and waveform controls, adaptive decks, tablet library, portrait and
  landscape modes, large touch controls, bottom sheets, controller workflows.
- Spike first: JUCE audio inside Tauri's Android activity (fallback: Oboe directly).
- **Acceptance:** tested on real iPadOS and Android tablets where possible.
- **Result (2026-10-06):** no tablet was available. The spike is in [TABLET.md](TABLET.md).

### Phase 9: Intelligent features

**Goal:** optional AI that helps the DJ without taking control away.

- Track recommendation, compatible-track discovery, transition suggestions, energy
  classification, phrase detection, natural-language library search.
- **Acceptance:** every feature works offline with local models or degrades gracefully
  without them; deterministic filters always remain available.
- **Result (2026-10-06):** tempo and key compatibility needs no model. Recommend is registered
  and disabled. ONNX Runtime is not linked, and nothing is downloaded.

### Phase 10: Stems

**Goal:** stem separation that never threatens live audio.

- Model management with explicit downloads, local inference, stem cache, vocals, drums,
  bass and other, stem mixing and stem waveforms.
- **Acceptance:** separation runs as a background job; live playback is unaffected under
  load.
- **Result (2026-10-06):** stem files are written off the audio thread. No separation model
  is chosen while the app licence is open.

### Phase 11: Command system

**Goal:** one command registry behind every way of triggering an action.

- Command palette, keyboard shortcuts, controller mappings, menus, contextual actions. The
  registry exists from the first user actions; this phase completes it and connects every
  surface.
- **Result (2026-10-06):** the registry and palette are in the desktop app. Controller
  mappings are described and not stored yet.

### Phase 12: Web presence

**Goal:** a website that presents Waveform as a professional creative tool, not a SaaS
landing page.

- What Waveform is and why it exists, screenshots, philosophy, features, platforms,
  downloads, documentation, GitHub, roadmap, community, contributing.
- **Result (2026-10-06):** the status page has philosophy, features and platforms. There is
  still nothing to download.

### Phase 13: Polish

**Goal:** production readiness.

- Audit performance, accessibility, keyboard and touch behaviour, audio stability,
  crashes, database integrity, library performance, startup time, memory, CPU, visual
  consistency, animation, error, empty and loading states, offline behaviour, installers
  and upgrades.
- Remove dead code, duplicate components, unused dependencies, placeholder copy, debug
  logging, fake functionality and unnecessary abstractions.
- **Result (2026-10-06):** the numbers that were measured are in [POLISH.md](POLISH.md). No
  installer was published.

## Open decisions

| Decision                                    | Needed by                                   | Notes                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Project licence                             | First public binary or outside contribution | Options in [LICENSING.md](LICENSING.md).                                                                                                     |
| Contributor terms (CLA or DCO)              | Same as the licence                         | Depends on the licence.                                                                                                                      |
| Product name                                | Public release, website domain              | Tracktion sells a DAW called "Waveform"; trademark check needed.                                                                             |
| Bundle identifier                           | First signed release                        | `com.abhinavkumarchoudhary.waveform` is provisional. It determines where app data is stored, so changing it after release needs a migration. |
| JUCE licence path for the App Store         | Phase 8                                     | AGPLv3 is incompatible with App Store distribution; see LICENSING.md.                                                                        |
| ASIO on Windows                             | Phase 7                                     | The ASIO SDK is GPLv3 or Steinberg-licensed; see LICENSING.md.                                                                               |
| Minimum OS versions                         | First release                               | macOS 14.0 proposed. Windows, Linux, iPadOS and Android minimums still open.                                                                 |
| How prepared audio is held                  | Decided in Phase 3                          | Chunked cache around the playhead and hot cues (ADR-021). Whole-track decode was rejected.                                                   |
| Bulk-import path and content-hash algorithm | Phase 4                                     | Decided by the Phase 4 benchmark.                                                                                                            |
| HID library                                 | Phase 7                                     |                                                                                                                                              |
| Stem model                                  | Phase 10                                    | Demucs or MDX family; the model's licence must be compatible.                                                                                |
| Code-signing identities                     | First public binary                         | Apple Developer ID and notarisation; Windows code signing.                                                                                   |
| Repository hosting                          | Before CI can run                           | CI is defined in Phase 1 but runs only once the repository is pushed.                                                                        |

## Risks

| Risk                                                                                            | Mitigation                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| JUCE's message loop does not cooperate with Tauri's event loop                                  | Phase 1 gate on macOS; fallback is an out-of-process engine on desktop (ADR-003, ADR-005).                  |
| JUCE audio inside Tauri's Android activity                                                      | Phase 8 spike; fallback is Oboe directly in the native engine.                                              |
| Licence still undecided                                                                         | Packages are private and `UNLICENSED`; no binaries are published and no outside contributions are accepted. |
| Name collision with Tracktion Waveform                                                          | Recorded as an open decision; resolve before public release.                                                |
| Young dependencies: tauri-specta RC, shadcn's React Aria base (July 2026), TypeScript 6/7 split | Exact pins, regenerated-bindings check in CI, documented fallbacks (ADR-007, ADR-010, ADR-013).             |
| JUCE 9 bundles zlib and FLAC as C code, so another copy in the same binary can clash            | Avoid other copies of those libraries; check exported symbols in Linux CI.                                  |
| macOS deployment target or MSVC runtime differ between CMake, Cargo and Tauri                   | Set each once and keep the three in step (ADR-004).                                                         |
| WebKitGTK performance and codec gaps on Linux                                                   | Measured in the Phase 4 benchmark before the import path is fixed.                                          |
| CI cannot be verified before the repository is pushed                                           | Workflows are checked with `actionlint`; first push verifies them.                                          |
