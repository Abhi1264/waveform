# Platform support

What runs where today, and how it was checked. "Verified" means built, tested and run on
that platform; "CI defined" means the workflow exists but has not run yet, because the
repository has not been pushed.

## Status

| Platform | Minimum            | Webview                | Status (Phase 1)                                                                    |
| -------- | ------------------ | ---------------------- | ----------------------------------------------------------------------------------- |
| macOS    | 14.0 (Sonoma)      | WKWebView              | **Verified** on macOS 27 (Apple silicon): builds, all tests, app and self-test run. |
| Windows  | 10 or 11           | WebView2               | CI defined (build, tests, app build and self-test). Not yet verified.               |
| Linux    | Ubuntu 24.04 class | WebKitGTK 4.1          | CI defined (build, tests, app build and self-test under Xvfb). Not yet verified.    |
| iPadOS   | To be decided      | WKWebView              | Not started (Phase 8).                                                              |
| Android  | To be decided      | Android System WebView | Not started (Phase 8).                                                              |

Intel Macs are expected to work, since nothing in the build is architecture-specific, but
they have not been tested.

## App icon

The desktop bundle uses PNG, ICNS and ICO files generated from
`assets/brand/icon-manifest.json`. A macOS 26 Liquid Glass `.icon` is not bundled yet:
Tauri's `actool` path still crashes ([tauri-apps/tauri#15315](https://github.com/tauri-apps/tauri/issues/15315),
open as of 2026-10-04 on CLI 2.12.1). Details are in
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#macos-liquid-glass-icon).

## Minimum versions

- **macOS 14.0.** One value, kept in step in three places: `CMAKE_OSX_DEPLOYMENT_TARGET`
  (root `CMakeLists.txt`), `MACOSX_DEPLOYMENT_TARGET` (`.cargo/config.toml`) and
  `bundle.macOS.minimumSystemVersion` (`tauri.conf.json`).
- **Windows 10 or 11** with the WebView2 runtime, which Windows 11 includes and the Tauri
  installer can add on Windows 10.
- **Linux** needs WebKitGTK 4.1 and ALSA. Distributions of the Ubuntu 22.04 generation and
  later ship both.

## Audio

No platform plays audio yet. Phase 3 brings device output through JUCE:

| Platform | Audio API (through JUCE)                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| macOS    | CoreAudio                                                                                                          |
| Windows  | WASAPI. ASIO compiles only when `WAVEFORM_ENABLE_ASIO` is ON and the headers are present. The option defaults off. |
| Linux    | ALSA, with JACK where available (PipeWire provides both)                                                           |
| iPadOS   | iOS audio session                                                                                                  |
| Android  | JUCE's Android audio (Oboe)                                                                                        |

## How JUCE runs inside the app

JUCE needs a message loop for device notifications and timers. Phase 1's gate was to
prove that it runs inside Tauri's process (ADR-005):

- **macOS and Windows:** JUCE shares the main thread with Tauri's event loop, which
  delivers JUCE's messages. Verified on macOS by `--self-test` and the About view.
- **Linux:** JUCE's message queue is not integrated with GTK's main loop, so JUCE runs its
  own dispatch loop on a dedicated thread. Covered by the engine's tests and the CI
  self-test, neither of which has run on Linux yet.
