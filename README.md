# Waveform

A DJ workstation for macOS, Windows, Linux, iPad and Android, built around a native
real-time audio engine.

> **Status: early development.** Waveform cannot play music yet. The desktop app starts its
> audio engine and reports what it finds; decks, the music library and audio output arrive
> in later phases. See the [roadmap](docs/ROADMAP.md) for what is done and what is next.

## Principles

- **Works offline.** Core DJ features never need an internet connection, an account, a
  subscription or telemetry. See [privacy](docs/PRIVACY.md).
- **Native real-time audio.** Playback and mixing run in a C++20 engine built on JUCE,
  never in JavaScript or the webview.
- **Local files first.** Waveform does not download from streaming sites, bypass DRM, or
  scrape services.
- **Simple on top.** The interface stays calm and readable however much runs underneath.

## Repository

| Path                     | Contents                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `apps/desktop`           | The desktop app: Tauri 2 shell, React UI, Rust app core        |
| `apps/web`               | The website: Next.js, exported as static files                 |
| `packages/`              | Shared TypeScript: tokens, UI, types, formatting, config       |
| `crates/waveform-engine` | Safe Rust interface to the C++ engine                          |
| `native/`                | The C++20 engine and DSP code, built with CMake                |
| `assets/brand`           | The official icon and the app-icon sources derived from it     |
| `docs/`                  | Architecture, decisions, roadmap, development and policy notes |

[ARCHITECTURE.md](docs/ARCHITECTURE.md) explains how the pieces fit together, and
[TECH_DECISIONS.md](docs/TECH_DECISIONS.md) explains why each one was chosen.

## Building

You need Node.js 26, pnpm 12, Rust (installed through rustup), CMake 4.4 and Ninja, plus
the platform's C++ compiler. [DEVELOPMENT.md](docs/DEVELOPMENT.md) has the full list and
per-platform notes.

```sh
pnpm install
pnpm --filter @waveform/desktop tauri dev   # run the desktop app
pnpm lint && pnpm typecheck && pnpm test    # the JavaScript checks
cmake --workflow --preset ci                # build and test the C++ engine
cargo test --workspace                      # the Rust tests
```

## Licence

No licence has been chosen yet; [LICENSING.md](docs/LICENSING.md) sets out the options.
Until one is chosen, all rights are reserved and outside contributions cannot be accepted.

**JUCE notice.** Waveform uses [JUCE](https://juce.com), which is available under AGPLv3 or
a commercial licence. **A commercial JUCE licence may be required**, depending on how
Waveform is licensed and distributed. [LICENSING.md](docs/LICENSING.md) explains when.

Third-party components and their licences are listed in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
