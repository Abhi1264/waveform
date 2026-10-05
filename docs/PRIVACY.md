# Privacy

Waveform is local-first (ADR-019). It collects nothing, needs no account, and makes no
network request without a clear reason that the user can see.

## The desktop app

- **No network activity.** The app makes no network requests. Checked on macOS on
  2026-10-05: with the app running, neither its process nor its WebKit helper processes
  held a network socket (`lsof -i`). JUCE is built without its networking code
  (`JUCE_USE_CURL=0`) or web-browser component, and the content security policy blocks
  every remote origin.
- **No telemetry, analytics or crash reporting.** None is built in, and none will be
  added without being opt-in and documented here first.
- **No account.** Nothing requires signing in.
- **Only appearance choices are stored.** Changing the theme, density or motion setting
  saves the choice in the webview's local storage on the device, under `waveform.theme`,
  `waveform.density` and `waveform.motion`. A setting left at its default saves nothing.
  From Phase 4 the music library lives in the app's data and cache directories on the
  user's device; see [ARCHITECTURE.md](ARCHITECTURE.md).

The system webview belongs to the operating system. It creates its own data and cache
folders when the app starts; on macOS these are `~/Library/WebKit/<app identifier>` and
`~/Library/Caches/<app identifier>`. Its other behaviour, such as WebView2's diagnostic
data on Windows, follows the operating system's privacy settings.

## The website

The website is static files. It sets no cookies, includes no analytics, and loads nothing
from other origins; a Playwright test fails if the page requests any third-party URL.

## Development and CI

Some tools collect usage data by default. Waveform's scripts and CI turn it off:

| Tool      | Default      | In this repository                                  |
| --------- | ------------ | --------------------------------------------------- |
| Next.js   | Telemetry on | Off: `NEXT_TELEMETRY_DISABLED=1` in scripts and CI  |
| Turborepo | Telemetry on | Off: `TURBO_TELEMETRY_DISABLED=1` in scripts and CI |

Running `next` or `turbo` directly bypasses the scripts; see
[DEVELOPMENT.md](DEVELOPMENT.md) for how to opt out permanently.

Building does make network requests, each for a stated reason:

| Request                       | When                             | Why                                             |
| ----------------------------- | -------------------------------- | ----------------------------------------------- |
| npm registry                  | `pnpm install`                   | JavaScript dependencies, pinned by the lockfile |
| crates.io                     | First `cargo` build              | Rust dependencies, pinned by `Cargo.lock`       |
| GitHub release archives       | First CMake or `cargo` build     | JUCE and Catch2, verified by SHA-256            |
| Playwright's browser download | `playwright install`             | Chromium and WebKit for the browser tests       |
| PyPI                          | `scripts/check-native-format.sh` | The pinned clang-format                         |
