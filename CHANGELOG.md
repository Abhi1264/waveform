# Changelog

Notable changes to Waveform. Nothing has been released yet, so everything below is
unreleased work, grouped by [roadmap](docs/ROADMAP.md) phase.

## Unreleased

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
