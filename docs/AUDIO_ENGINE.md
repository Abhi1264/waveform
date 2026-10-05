# Audio engine

What the engine is today, how it is built, and how it is tested. The design it grows into
is in [ARCHITECTURE.md](ARCHITECTURE.md) (audio engine boundary, real-time rules); the
reasons are in ADR-003 to ADR-006 of [TECH_DECISIONS.md](TECH_DECISIONS.md).

## What exists (Phase 1)

The engine does not touch audio devices yet. Phase 1 proves the parts everything else
stands on: JUCE builds on every platform, its message loop runs inside the Tauri app, and
the engine can be called safely from Rust.

| Part                                      | Contents                                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `native/dsp` (`waveform_dsp`)             | Crossfader gain curves: linear, constant power, and cut. Pure C++20, no JUCE, real-time safe.                        |
| `native/audio-engine` (`waveform_engine`) | Build information, and `Runtime`, which starts and stops JUCE's message system.                                      |
| `native/juce` (`waveform_juce`)           | The JUCE 9.0.3 modules, compiled once into a static library.                                                         |
| `crates/waveform-engine`                  | The Rust interface: `build_info()`, `operating_system_name()`, `Runtime::start()`, `Runtime::ping_message_thread()`. |
| `apps/desktop/src-tauri`                  | Starts the runtime when the app starts, and serves `engine_info` to the About view.                                  |

Not built yet, and arriving in Phase 3: device discovery and selection, the audio callback,
decks, transport, mixer, and the lock-free command and snapshot paths.

## The JUCE runtime

JUCE's message system handles device notifications, timers and asynchronous callbacks.
`waveform::engine::Runtime` owns it, with these rules, which the code enforces:

- Only one runtime exists at a time; starting a second throws.
- **macOS and Windows:** the runtime must be created on the main thread (checked on macOS)
  after the app's event loop exists. Tauri's event loop then delivers JUCE's messages, so
  the runtime is started in Tauri's `setup` hook and stopped on the main thread when the
  app exits.
- **Linux:** JUCE's message queue is not part of GTK's main loop, so the runtime runs JUCE's
  dispatch loop on a thread of its own.
- `pingMessageThread` posts a message and waits for it to be delivered. It answers whether
  the loop is alive, and how quickly. It refuses to run on the message thread itself,
  which would deadlock.

On the Rust side, `Runtime` is `Send` and `Sync`, so Tauri can share it with command
handlers. Dropping it on a thread other than the one that started it would shut JUCE down
on the wrong thread; on macOS and Windows the drop leaks the runtime instead and logs why.

### Measurements

On macOS 27 (Apple silicon, debug build), from `--self-test` and the About view:

| Situation                                   | Round trip        |
| ------------------------------------------- | ----------------- |
| Posted during startup, before the loop runs | 80 to 300 ms      |
| Idle, running app                           | 10 to 74 µs       |
| Just after startup, while the window loads  | Up to about 20 ms |

## Build

CMake builds the engine; Cargo drives CMake from `crates/waveform-engine/build.rs` (ADR-004).

- JUCE and Catch2 come from pinned archives verified by SHA-256 (ADR-016); see
  [DEVELOPMENT.md](DEVELOPMENT.md).
- JUCE is used as plain modules (`JUCE_MODULES_ONLY`): no JUCE app wrapper and no
  `juceaide` helper.
- Modules compiled: `juce_core`, `juce_events`, `juce_audio_basics`, `juce_audio_devices`
  and `juce_audio_formats`. The linker keeps only what the engine calls: today, parts of
  `juce_core` and `juce_events`.
- Options: `JUCE_USE_CURL=0` and `JUCE_WEB_BROWSER=0` (no networking or web views), and
  `JUCE_MODAL_LOOPS_PERMITTED=1`, which lets tests pump the message loop on the main thread.
- Warnings: `-Wall -Wextra -Wpedantic -Wconversion -Wsign-conversion -Wshadow` and more (`/W4` on MSVC), and
  errors in the `ci` preset. JUCE's own headers are treated as system headers.
- Platform libraries linked by `build.rs`: macOS frameworks (Accelerate, AudioToolbox,
  Cocoa, CoreAudio, CoreMIDI, Foundation, IOKit, QuartzCore, Security); on Linux, ALSA,
  `dl`, `pthread`, `rt` and the C++ standard library. On Windows, JUCE names its libraries in its own source.

## Tests

| Suite                            | What it covers                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `waveform_dsp_tests` (Catch2)    | Crossfader curves over 4096 positions: range, monotonicity, symmetry, exact endpoints, constant power (−3.01 dB at the centre), cut width, clamping and NaN.                                                                         |
| `waveform_engine_tests` (Catch2) | Build information; messages posted from another thread arrive; stop and restart; one runtime at a time; no pumping means no delivery; pinging from the message thread is refused; on macOS, starting off the main thread is refused. |
| `cargo test -p waveform-engine`  | The same behaviour across the FFI boundary, including a real `CFRunLoop` round trip on macOS.                                                                                                                                        |
| `--self-test` (desktop app)      | JUCE messages are delivered through Tauri's real event loop. Runs in CI on all three platforms.                                                                                                                                      |
