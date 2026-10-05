# Development

How to set up a machine, build Waveform, and run its checks. macOS is the primary
development platform and the only one verified so far ([PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md)).

## Prerequisites

| Tool           | Version          | Notes                                                                                                                          |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Node.js        | 26.10.0          | Pinned in `.node-version`. Any 26.8 or later works (`engines` in `package.json`).                                              |
| pnpm           | 12.9.1           | See below.                                                                                                                     |
| Rust           | 1.99.0           | Install [rustup](https://rustup.rs); it reads `rust-toolchain.toml` and installs the pinned toolchain with rustfmt and clippy. |
| CMake, Ninja   | 4.4.4, 1.13.2    | CI uses these exact versions. CMake 3.25 or later is the minimum.                                                              |
| C++20 compiler | Platform default | Xcode (or its command line tools) on macOS, Visual Studio 2022 on Windows, GCC or Clang on Linux.                              |
| uv or pipx     | Any              | Runs the pinned clang-format and ShellCheck without a global install.                                                          |

**pnpm.** The repository pins pnpm 12.9.1 in `packageManager` and `devEngines`, and a
newer pnpm downloads that exact version by itself. An older global pnpm (11 or earlier)
cannot switch to pnpm 12 this way, so upgrade it first, for example with
`brew upgrade pnpm` or `npm install --global pnpm@12`.

**macOS.** Xcode or its command line tools; nothing else.

**Windows.** Visual Studio 2022 with the "Desktop development with C++" workload, and the
WebView2 runtime (preinstalled on Windows 11). Run CMake builds from a Developer
PowerShell so Ninja finds the compiler.

**Linux (Ubuntu 24.04 or similar).** The packages CI installs:

```sh
sudo apt-get install build-essential file libasound2-dev librsvg2-dev libssl-dev \
  libwebkit2gtk-4.1-dev libxdo-dev
```

## First build

```sh
pnpm install
pnpm --filter @waveform/desktop tauri dev
```

The first build downloads JUCE and Catch2 (about 26 MB together, checked against pinned
SHA-256 hashes) and compiles JUCE, which takes a few minutes. Later builds reuse both.

## Everyday commands

| Task                                   | Command                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run the desktop app                    | `pnpm --filter @waveform/desktop tauri dev`                                                                                                                           |
| Run the website                        | `pnpm --filter @waveform/web dev`                                                                                                                                     |
| Format all TypeScript, CSS, JSON, YAML | `pnpm format` (check only: `pnpm format:check`)                                                                                                                       |
| Lint, including package boundaries     | `pnpm lint`                                                                                                                                                           |
| Type-check                             | `pnpm typecheck`                                                                                                                                                      |
| Unit and component tests               | `pnpm test` (watch mode: `pnpm test:watch`)                                                                                                                           |
| Build the website and desktop frontend | `pnpm build`                                                                                                                                                          |
| Browser tests (Chromium and WebKit)    | `pnpm test:e2e` (first time: `pnpm --filter @waveform/web exec playwright install chromium webkit`)  |
| Format C++                             | `scripts/check-native-format.sh --fix` (check only: no flag)                                                                                                          |
| Build and test the C++ engine          | `cmake --workflow --preset dev` (or `ci`: optimised, warnings as errors)                                                                                              |
| Format, lint and test Rust             | `cargo fmt --all`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`                                                                  |
| Build the desktop app                  | `pnpm --filter @waveform/desktop tauri build --debug`                                                                                                                 |
| Check the engine inside the app        | `target/debug/waveform-desktop --self-test`                                                                                                                           |
| Prove a fresh clone works              | `scripts/verify-clean-checkout.sh`                                                                                                                                    |

`pnpm test:e2e` runs the website checks and captures the desktop About and appearance
screenshots.

`--self-test` starts the app, checks that JUCE's message loop delivers messages through
Tauri's event loop, prints the result and exits with status 0 if it does.

Debug builds print `JUCE v9.0.3` to standard error at startup. That is JUCE's own debug
banner, not an error.

## Generated files

| File                                    | Regenerate with                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/desktop/src/bindings.ts`          | `cargo test -p waveform-desktop export_bindings`. CI fails if it is out of date.   |
| `apps/desktop/src-tauri/icons/`         | `pnpm --filter @waveform/desktop tauri icon ../../assets/brand/icon-manifest.json` |
| `packages/design-tokens/src/tokens.css` | `pnpm --filter @waveform/design-tokens generate`. A test fails if it is stale.     |

The desktop crate embeds the built frontend at compile time, so `apps/desktop/dist` must
exist before any `cargo` command that compiles it. `pnpm build` (or
`pnpm --filter @waveform/desktop build`) creates it.

## Native dependencies

JUCE 9.0.3 and Catch2 3.16.0 are downloaded once into `.cache/downloads/` and verified
against the SHA-256 hashes in `native/cmake/WaveformDependencies.cmake` before every use.
Each build directory extracts its own copy.

- `WAVEFORM_DOWNLOAD_CACHE=<dir>` moves the cache, for example to share it between
  checkouts.
- `-DFETCHCONTENT_SOURCE_DIR_JUCE=<path>` (and `..._CATCH2`) builds against a local
  checkout instead of the pinned archive.

## Adding npm packages

Versions live in the catalog in `pnpm-workspace.yaml`; packages refer to them as
`catalog:`. pnpm refuses releases younger than one day (`minimumReleaseAge`). If the
newest release is too new, pin the one before it rather than overriding the safeguard,
and note it in [TECH_DECISIONS.md](TECH_DECISIONS.md).

## Telemetry in tools

Waveform's scripts and CI turn off the telemetry of the tools that collect it by default:
Next.js (`NEXT_TELEMETRY_DISABLED=1`) and Turborepo (`TURBO_TELEMETRY_DISABLED=1`). If you
run `next` or `turbo` directly, set those variables yourself or opt out once with
`pnpm exec next telemetry disable` and `pnpm exec turbo telemetry disable`.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

| Job           | Runs on                | What it checks                                                                  |
| ------------- | ---------------------- | ------------------------------------------------------------------------------- |
| JavaScript    | Ubuntu                 | Format, lint, type-check, unit tests, builds, Playwright in Chromium and WebKit |
| Rust          | Ubuntu                 | rustfmt, clippy, `cargo test`, and that `bindings.ts` is current                |
| Native engine | macOS, Windows, Ubuntu | clang-format (Ubuntu), then `cmake --workflow --preset ci`                      |
| Desktop app   | macOS, Windows, Ubuntu | `tauri build --debug` with one bundle format each, then `--self-test`           |

Actions are pinned to commit hashes. Check the workflow locally before pushing:

```sh
go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12 \
  -shellcheck "$(uvx --from shellcheck-py@0.11.0.1 python -c 'import shutil; print(shutil.which("shellcheck"))')"
```
