# Technical decisions

This file records the technology choices behind Waveform and the reasons for them. Each
decision is an architecture decision record (ADR). The system they produce is described in
[ARCHITECTURE.md](ARCHITECTURE.md); the order of work is in [ROADMAP.md](ROADMAP.md).

ADR statuses:

- **Accepted**: in force. Changing it needs a new ADR that supersedes it.
- **Provisional**: in force, but tied to a gate or benchmark that can overturn it.
- **Deferred**: deliberately undecided; the record says what blocks the decision.

## Verified versions

Checked on **2026-10-05** against npm, crates.io, PyPI, nodejs.org and the projects' own
release pages. Versions are pinned in the repository and changed only deliberately.

pnpm refuses npm releases younger than one day (`minimumReleaseAge`, a supply-chain
safeguard that Waveform keeps). Where the newest release was younger than that on
2026-10-05, the table shows the release before it, which is what the repository pins:
shadcn 4.21.1 (not 4.21.2), `@vitejs/plugin-react` 6.1.1 (not 6.1.2), and typescript-eslint
8.71.0 (not 8.71.1).

| Area                 | Component                                       | Version                 | Notes                                                                                   |
| -------------------- | ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| JavaScript toolchain | Node.js                                         | 26.10.0                 | Pinned in `.node-version`. Verified locally on 26.8.1. Node 24 is the current LTS line. |
|                      | pnpm                                            | 12.9.1                  | Pinned in `devEngines.packageManager` and `packageManager`.                             |
|                      | Turborepo                                       | 2.11.7                  |                                                                                         |
|                      | TypeScript (native compiler)                    | 7.0.2                   | Runs `tsc` type-checking. See ADR-013.                                                  |
|                      | TypeScript (compiler API)                       | 6.0.2                   | `@typescript/typescript6`, for tools that import the API.                               |
| Application shell    | Tauri (crate, CLI, `@tauri-apps/api`)           | 2.12.1                  | `tauri-build` 2.7.1. Tauri 3.0.0-alpha.4 exists and is not used.                        |
|                      | tauri-specta / specta                           | 2.0.0-rc.25             | Release candidates, pinned exactly. `specta-typescript` 0.0.12.                         |
| UI                   | React / React DOM                               | 19.3.0                  |                                                                                         |
|                      | Vite                                            | 8.3.2                   | `@vitejs/plugin-react` 6.1.1.                                                           |
|                      | Next.js                                         | 16.3.8                  |                                                                                         |
|                      | Tailwind CSS                                    | 4.3.3                   |                                                                                         |
|                      | shadcn CLI                                      | 4.21.1                  | Monorepo mode, React Aria base.                                                         |
|                      | react-aria-components                           | 1.21.1                  | `react-aria` 3.52.1.                                                                    |
|                      | Phosphor icons (`@phosphor-icons/react`)        | 2.1.10                  |                                                                                         |
|                      | Motion                                          | 14.0.0                  | Adopted when first needed (ADR-011).                                                    |
|                      | Zustand                                         | 5.0.15                  | Adopted when first needed (ADR-011).                                                    |
| Media                | MediaBunny                                      | 1.61.1                  | Phase 4. MPL-2.0.                                                                       |
| Native               | JUCE                                            | 9.0.3                   | Released 2026-09-28. AGPLv3 or commercial; see [LICENSING.md](LICENSING.md).            |
|                      | Catch2                                          | 3.16.0                  |                                                                                         |
|                      | CMake / Ninja                                   | 4.4.4 / 1.13.2          | Local versions. JUCE requires CMake 3.22 or newer.                                      |
|                      | Rust                                            | 1.99.0                  | Released 2026-09-28. Edition 2024. Pinned in `rust-toolchain.toml`.                     |
|                      | cxx / cxx-build                                 | 1.0.202                 |                                                                                         |
|                      | cmake (crate)                                   | 0.1.58                  | Drives the CMake build from `build.rs`.                                                 |
| Data and AI          | SQLite                                          | 3.53.4                  | Phase 4, through `rusqlite`'s bundled build.                                            |
|                      | rusqlite / rusqlite_migration                   | 0.40.2 / 2.6.0          | Phase 4.                                                                                |
|                      | ONNX Runtime                                    | 1.30.0                  | Phase 9 or later. The Rust binding `ort` is at 2.0.0-rc.13.                             |
| Quality              | ESLint / typescript-eslint                      | 10.12.0 / 8.71.0        | typescript-eslint supports TypeScript versions below 6.1.                               |
|                      | eslint-plugin-react-hooks                       | 7.1.1                   |                                                                                         |
|                      | Prettier / prettier-plugin-tailwindcss          | 3.9.9 / 0.8.1           |                                                                                         |
|                      | clang-format                                    | 23.1.2                  | PyPI wheel, run through `uvx` or `pipx`. Pinned in `scripts/check-native-format.sh`.    |
|                      | actionlint / ShellCheck                         | 1.7.12 / 0.11.0         | Local checks of the CI workflow and shell scripts.                                      |
|                      | Vitest                                          | 5.0.3                   |                                                                                         |
|                      | Testing Library (react / user-event / jest-dom) | 16.3.3 / 14.6.7 / 7.0.1 | `@testing-library/dom` 10.4.2.                                                          |
|                      | jsdom                                           | 30.1.2                  |                                                                                         |
|                      | Playwright / @axe-core/playwright               | 1.63.0 / 4.13.0         |                                                                                         |

## Decisions

### ADR-001: Monorepo with one language per top-level folder

**Status:** Accepted

**Context.** Waveform mixes TypeScript (UI, website), Rust (Tauri app core) and C++ (real-time
engine). Each language has its own mature build tool. Forcing one tool over all three
produces worse builds than letting each tool do its job.

**Decision.**

- `apps/` and `packages/` hold TypeScript, managed by **pnpm 12** workspaces and
  **Turborepo** tasks. Shared versions live in pnpm catalogs.
- `crates/` holds Rust in a **Cargo workspace** (edition 2024). The Tauri app crate sits in
  `apps/desktop/src-tauri` and joins the same workspace.
- `native/` holds C++20, built with **CMake presets** and Ninja.
- Turborepo boundaries tags enforce the package dependency rules in
  [ARCHITECTURE.md](ARCHITECTURE.md#repository-layout-and-dependency-rules).

**Consequences.** One `pnpm install` and one `turbo run` cover the JavaScript side. Native
code is also built by `cargo` (through `build.rs`) and directly by `cmake` for C++ tests,
so the two paths must share configuration (ADR-004).

**Rejected.** Nx (more machinery than the repository needs), npm/Yarn workspaces (pnpm is
what the spec mandates and has stricter dependency isolation), Bazel (high adoption cost for
contributors).

### ADR-002: Tauri 2 as the application shell

**Status:** Accepted

**Context.** The spec mandates Tauri 2 for macOS, Windows, Linux, iPadOS and Android.
Tauri 3 is in alpha (3.0.0-alpha.4 on 2026-10-05).

**Decision.** Use Tauri **2.12.x**. Revisit when Tauri 3 is stable and its mobile support is
at least as complete as 2.x.

**Consequences.** Each platform uses its system webview: WKWebView (macOS, iPadOS),
WebView2 (Windows), WebKitGTK (Linux) and Android System WebView. UI code has to be tested
against several engines; Playwright covers Chromium and WebKit (ADR-015).

**Rejected.** Electron (bundles Chromium and Node; much larger downloads and memory use;
not what the spec mandates). Tauri 3 alpha (unstable API).

### ADR-003: C++20 and JUCE engine, linked into the app process

**Status:** Provisional (gate: JUCE message loop inside Tauri on macOS, ADR-005)

**Context.** The live audio path must be native, real-time-safe code (spec §9–§10). JUCE
provides device I/O for CoreAudio, WASAPI, ASIO, ALSA, JACK, iOS and Android, plus audio
formats, MIDI and DSP building blocks.

**Decision.** The engine is a C++20 static library built on **JUCE 9.0.3** and linked into
the Tauri Rust process. All JUCE modules are compiled into one static target,
`waveform_juce`, so JUCE symbols exist exactly once. Waveform's own libraries
(`waveform_dsp`, `waveform_engine`) link against it. Public engine headers expose no JUCE
types: the facade uses the PIMPL pattern.

**Consequences.**

- One process on every platform. iPadOS does not allow apps to spawn helper processes, so
  this is the only arrangement that works on all five targets.
- An engine crash takes the app down with it. The mitigation is real-time-safe design,
  sanitizers, and tests (ADR-015), not process isolation.
- The engine API is message-based (ADR-006), so moving the engine into a separate process
  on desktop later would not require redesigning it.

**Rejected.**

- **Out-of-process engine host.** It gives crash isolation, but iPadOS cannot run it and it
  adds an IPC hop for every command and snapshot. It remains the desktop fallback if the
  ADR-005 gate fails.
- **Web Audio API.** Forbidden by the spec for the live path. It also cannot select ASIO
  or route cue and master to separate outputs in every webview (`setSinkId` is missing in
  WebKit), and it is subject to garbage-collection pauses and engine differences between
  webviews.
- **Rust-only audio (for example `cpal` plus Rust DSP).** It would rebuild device, format and
  MIDI support that JUCE already provides, which the reuse-first rule (spec §27) forbids.

### ADR-004: `cxx` bridge, with Cargo driving CMake

**Status:** Accepted

**Context.** Rust must call the C++ engine, and the C++ build must work both alone (for
Catch2 tests) and from Cargo (for the app).

**Decision.**

- `crates/waveform-engine` uses **`cxx`** for a type-checked bridge in both directions. Its
  `build.rs` uses the **`cmake`** crate to build `native/` (tests off), then `cxx-build`
  compiles the bridge and links the static libraries plus each platform's system
  frameworks.
- The C++ standard, macOS deployment target (14.0, proposed) and MSVC runtime (`/MD`) are
  set in one place per tool and kept identical across CMake, Cargo
  (`MACOSX_DEPLOYMENT_TARGET`) and Tauri (`minimumSystemVersion`).
- C++ exceptions never unwind into Rust. C++ functions that can fail are declared in the
  bridge as returning `Result`; `cxx` catches the exception and returns it to Rust as an
  `Err`.

**Consequences.** The first `cargo build` compiles JUCE and takes minutes; later builds are
incremental. Dependency archives live in one shared download cache (ADR-016), so the
Cargo-driven build and the standalone CMake build don't download twice.

**Rejected.** A hand-written C ABI with `bindgen` (unsafe glue on both sides, no checking of
C++ types). The `cxx-juce` crate (useful prior art, but it wraps JUCE types directly, which
would leak JUCE into the Rust API).

### ADR-005: JUCE message loop inside Tauri

**Status:** Accepted on macOS: the gate passed on 2026-10-05. Provisional on Windows and
Linux until the CI self-test has run there.

**Context.** JUCE's `MessageManager` runs device management, timers and async callbacks. In
a normal JUCE app, JUCE owns the main event loop; here Tauri's event loop (tao) owns it.

**Decision.**

- **macOS:** initialise JUCE in Tauri's `setup` hook on the main thread, after tao has
  created `NSApplication`. JUCE then runs non-standalone, as it does inside a plugin host,
  and posts its messages to the main run loop that tao is already running.
- **Windows:** JUCE's hidden message window lives on the main thread and is serviced by
  tao's message pump.
- **Linux:** JUCE's Linux message queue is not driven by the GTK main loop, so JUCE gets a
  dedicated message thread.
- **The gate:** the desktop app must complete a `MessageManager::callAsync` round trip on
  macOS and report it in the About view. If it fails, stop and revisit ADR-003 (fallback:
  out-of-process engine on desktop).

**Result.** The round trip works on macOS 27: messages posted from another thread are
delivered by tao's run loop in tens of microseconds once the app is running (startup takes
up to about 300 ms, because the loop is not running yet). The About view shows it, and
`waveform-desktop --self-test` checks it from the command line. CI runs the same self-test
on Windows and on Linux (under Xvfb).

**Consequences.** Engine control calls that JUCE requires on its message thread are
marshalled there by the engine itself; callers never need to know which thread that is.

### ADR-006: Engine API is commands in, snapshots out

**Status:** Accepted (implemented from Phase 3)

**Decision.**

- Callers send small, fixed-size commands. They are serialised onto one control producer
  and handed to the audio thread through a pre-allocated single-producer/single-consumer
  lock-free queue.
- The audio thread publishes state (positions, levels, flags) through a lock-free snapshot
  (triple buffer or seqlock) and atomic meter accumulators. A publisher on the Rust side
  reads at display rate.
- Large objects, such as decoded audio or new processing graphs, are built off the audio
  thread and swapped in by pointer. The old object is returned through a second queue and
  freed on the control thread, so the audio thread never frees memory.

**Consequences.** No shared mutable state between threads and no locks on the audio
thread. The same API works in-process today and could work across processes later.

### ADR-007: Typed IPC between the UI and the Rust core

**Status:** Accepted (`tauri-specta` provisional while it is a release candidate)

**Decision.**

- Tauri commands are written in Rust and their TypeScript bindings are generated by
  **tauri-specta 2.0.0-rc.25**, pinned exactly. A test regenerates the bindings and CI fails
  if the committed file differs.
- High-rate engine state is streamed over Tauri `Channel`s, latest value wins. The UI
  extrapolates playhead positions between snapshots with `requestAnimationFrame`.
- Bulk binary data, such as waveform peaks, is returned as raw bytes
  (`tauri::ipc::Response`) and arrives in JavaScript as an `ArrayBuffer`, never as JSON.

**Consequences.** One source of truth for IPC types; type drift becomes a build failure.

**Rejected.** Hand-written TypeScript types (they drift). Tauri global events for streams
(JSON-encoded and broadcast to every listener). A localhost WebSocket server (extra attack
surface, firewall prompts). If `tauri-specta` stalls, the fallback is `ts-rs` 12.0.1 for
type generation with hand-written command wrappers.

### ADR-008: Native decoding is authoritative; MediaBunny handles inspection and export

**Status:** Provisional (benchmark at the start of Phase 4)

**Context.** The spec makes MediaBunny the media toolkit but forbids it as the live engine.
MediaBunny runs in the webview on WebCodecs. It does not read AIFF or ALAC, both common in
DJ libraries, and WebCodecs support differs between WebKitGTK, WKWebView and WebView2.

**Decision.**

- Decoding for playback and analysis happens natively: JUCE audio formats plus the
  operating system's codecs (CoreAudio for AAC and ALAC, Media Foundation on Windows).
- MediaBunny runs in a webview Web Worker for container inspection, format detection, tags
  and cover art (`getMetadataTags()`), and export or conversion workflows.
- Phase 4 starts with a benchmark (100,000 files, codec coverage per platform including
  WebKitGTK) before the bulk-import path is chosen. A native tag reader, such as the Rust
  crate `lofty` 0.25.4, is the candidate if worker-side reading is too slow or incomplete.

**Rejected.** MediaBunny on the live path (forbidden). Bundling FFmpeg (licence and patent
complexity, large binaries, and it duplicates codecs the OS already provides).

### ADR-009: SQLite owned by the Rust core

**Status:** Accepted (implemented in Phase 4)

**Decision.**

- The Rust core owns the database through **`rusqlite`** (bundled SQLite with FTS5, WAL
  mode, foreign keys on) and **`rusqlite_migration`**. Migrations exist from the first
  table, and the database is backed up before each migration runs.
- One writer connection on its own thread; read-only connections for queries.
- Large data (waveform peaks, artwork, stems, analysis output) lives in files named by
  content hash. SQLite stores references and metadata only.
- The webview never sees SQL. It calls typed commands such as `search_tracks`.

**Rejected.**

- `tauri-plugin-sql`: it hands raw SQL to the webview, which breaks the layering and turns
  any script injection into database access.
- Webview storage (IndexedDB, localStorage): can be evicted by the browser engine, and
  cannot be shared with native analysis.
- `sqlx` (async, with compile-time checks against a live database) and ORMs such as Diesel
  or SeaORM: more machinery than an embedded single-user database needs.

### ADR-010: shadcn/ui monorepo on React Aria, Tailwind v4 tokens, Phosphor icons

**Status:** Accepted

**Decision.**

- `packages/ui` is the shared shadcn workspace, installed and updated with the official
  CLI in monorepo mode. Both apps consume it.
- The shadcn **React Aria** base. Its press and move interactions behave the same across
  touch, mouse and keyboard, which knobs, faders and jog controls need. It also provides
  accessible virtualised collections and keyboard-accessible drag and drop, which a
  100,000-track library needs.
- Tailwind CSS v4 with design tokens as CSS variables (`packages/design-tokens`,
  Phase 2). No hard-coded colours or sizes in components.
- **Phosphor icons** (`@phosphor-icons/react`), configured as shadcn's icon library.
  This replaces the spec's Lucide icons by the project owner's decision on 2026-10-05.

**Consequences.** shadcn's React Aria base was introduced in July 2026 and has fewer
community examples than the Radix base. React Aria itself is mature, which limits the risk.

**Rejected.** The Radix and Base UI bases: both are good, but neither offers React Aria's
breadth of interaction hooks (`usePress`, `useMove`, `useSlider`), virtualised collections
and accessible drag and drop. Lucide icons (replaced by the project owner's choice).

### ADR-011: Client state and animation libraries arrive when first needed

**Status:** Accepted

**Decision.** Zustand 5 and Motion 14 are the chosen libraries for client state and UI
animation, but neither is installed until a feature needs it. Zustand arrives when engine
state reaches the UI (expected in Phase 3). Motion arrives when an animation needs more than
CSS transitions. The Phase 2 motion tokens are plain CSS.

**Rejected.** Redux Toolkit, Jotai, React Spring: no advantage over the spec's choices.

### ADR-012: Next.js website as a static export

**Status:** Accepted

**Decision.** `apps/web` is Next.js 16 with `output: "export"`. It has no server runtime, so
it can be hosted on any static host and has no backend to secure. A documentation framework
(for example Fumadocs) is evaluated in Phase 12, not before.

### ADR-013: TypeScript 7 for type-checking, TypeScript 6 for tools

**Status:** Provisional (until typescript-eslint and Next.js support TypeScript 7's API)

**Context.** TypeScript 7 is the native (Go) compiler. Tools that import the compiler API,
such as typescript-eslint (which supports versions below 6.1) and Next.js, need the 6.x
JavaScript API.

**Decision.** Follow Microsoft's side-by-side setup. The package name `typescript` is
aliased to `@typescript/typescript6`, so tools get the 6.x API. The native compiler is
installed under an alias (`@typescript/native`, which points to `typescript@7`), and its
`tsc` runs type-checking.

**Consequences.** Two TypeScript versions in the lockfile. Remove the alias once the tools
support 7.x.

### ADR-014: ESLint and Prettier, rustfmt and clippy, clang-format

**Status:** Accepted

**Decision.**

- ESLint 10 flat config with typescript-eslint (type-aware rules),
  eslint-plugin-react-hooks 7, and Next.js rules for the website. Shared configs live in
  `packages/config`.
- Prettier with the Tailwind class-sorting plugin.
- `cargo fmt` and `cargo clippy -D warnings` for Rust; `clang-format` for C++.
- clang-format's output changes between major versions, so one version is pinned and
  fetched as a PyPI wheel (through `uvx` or `pipx`) both locally and in CI, rather than
  using whatever the system or Xcode provides.

**Rejected.** Biome. It is faster, but it lacks the React Compiler-based hooks rules,
Next.js rules and type-aware lint coverage that this stack relies on. Revisit when it
reaches parity.

### ADR-015: Testing strategy

**Status:** Accepted

| Layer                  | Tool                                | What is tested                                                                                                                                            |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C++ DSP and engine     | Catch2 3                            | Pure DSP functions with property-style generators; offline rendering of engine graphs with synthetic signals; sample-rate and channel-routing edge cases. |
| Real-time safety       | RealtimeSanitizer (LLVM)            | From Phase 3: audio-thread functions run under `-fsanitize=realtime` in CI to catch allocations, locks and blocking calls.                                |
| Rust core and bridge   | `cargo test`                        | Calls across the FFI boundary; later, database migrations, queries, corruption recovery, and the job system.                                              |
| TypeScript logic       | Vitest                              | Formatting, token completeness, colour contrast.                                                                                                          |
| Components             | Vitest + React Testing Library      | Behaviour: keyboard interaction, ARIA roles and values, focus. Not implementation details.                                                                |
| End-to-end and a11y    | Playwright (Chromium, WebKit) + axe | Rendered pages: no serious or critical axe issues, tab order, visible focus, reduced motion, touch-target size.                                           |
| Desktop app end-to-end | `tauri-driver` (WebDriver)          | Planned. Works on Windows and Linux only; macOS's WKWebView has no WebDriver.                                                                             |

Tests check behaviour and output, not implementation details (spec §31). Audio tests compare
rendered output with expected signals within stated tolerances.

**Rejected.** Jest (slower, weaker ESM support than Vitest). GoogleTest (heavier than Catch2,
with no advantage here).

### ADR-016: Native dependencies through CMake FetchContent

**Status:** Accepted

**Decision.** JUCE and Catch2 come from release archives pinned by version and SHA-256 hash
(`native/cmake/WaveformDependencies.cmake`). Each archive is downloaded once into a shared
cache (`.cache/downloads`, or `$WAVEFORM_DOWNLOAD_CACHE`), verified, and then extracted by
`FetchContent` into each build tree. The cache is implemented directly because, since policy
CMP0168, `FetchContent` ignores `DOWNLOAD_DIR` and always downloads into the build tree. A
local checkout can be substituted with `FETCHCONTENT_SOURCE_DIR_<NAME>` for offline work.

**Rejected.** Git submodules (fragile clones, easy to desynchronise). vcpkg and Conan (a
package-manager layer that two dependencies don't justify).

### ADR-017: Fonts and assets ship with the app

**Status:** Accepted (fonts chosen in Phase 2)

**Decision.** Fonts are open-source (SIL OFL) and bundled from Fontsource packages, with
their licences. No font or asset CDN: the app must work offline, and a CDN request is a
network call the user did not ask for.

### ADR-018: Optional local AI through ONNX Runtime

**Status:** Accepted (implemented in Phase 9 or later)

**Decision.**

- Inference runs locally with ONNX Runtime, in background jobs, never on the audio thread.
- Models are never committed to git. They are downloaded only when the user asks, from a
  manifest that records source URL, size, SHA-256 and licence for each model.
- Every AI feature has a deterministic path or degrades gracefully when no model is
  installed.

### ADR-019: Privacy by default

**Status:** Accepted

**Decision.** No telemetry, no analytics, no crash upload, no account. Every network
request comes from an explicit user action, or from a setting the user turned on, and is
listed in `docs/PRIVACY.md` (Phase 1).

### ADR-020: Licence

**Status:** Deferred (project owner's decision, 2026-10-05)

**Decision.** No LICENSE file yet, and every package is marked `private` and `UNLICENSED`.
The options and their consequences are analysed in [LICENSING.md](LICENSING.md). A decision
is required before the first public binary release or the first outside contribution.
