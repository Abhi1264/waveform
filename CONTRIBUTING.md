# Contributing

Waveform is AGPL-3.0-only ([LICENSING.md](docs/LICENSING.md)). Contributions are accepted
under that licence. Add a `Signed-off-by` line to each commit (Developer Certificate of
Origin). There is no contributor licence agreement. This guide describes how work is done
in the repository.

## Ground rules

- **Nothing pretends to work.** A feature that is not built is shown as unavailable, never
  faked. Specimens and examples are labelled as such.
- **The audio thread is sacred.** Code on the real-time audio thread never touches files,
  the network or the database, never allocates or locks where it can be avoided, and never
  logs through anything that can block. See [ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **No hidden network calls.** Every network request needs a clear, user-visible reason.
  There is no telemetry. See [PRIVACY.md](docs/PRIVACY.md).
- **Respect other people's work.** Do not copy proprietary designs, assets, branding or
  code, and do not copy code under a licence that is incompatible with the project's
  options.
- **Never overwrite files blindly.** Check what a generator or script will replace first.

## Before you send a change

Run the checks that CI runs. [DEVELOPMENT.md](docs/DEVELOPMENT.md) explains each one.

```sh
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e
scripts/check-native-format.sh
cmake --workflow --preset ci
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Before a phase is declared finished, `scripts/verify-clean-checkout.sh` rebuilds and tests
everything from a copy of the committed files.

## Adding a dependency

Reuse what the repository already has first. A new dependency needs:

- a reason, written in the change description or the relevant ADR in
  [TECH_DECISIONS.md](docs/TECH_DECISIONS.md);
- a licence compatible with AGPL-3.0-only, as recorded in [LICENSING.md](docs/LICENSING.md);
- an exact version: npm packages through the catalog in `pnpm-workspace.yaml`, crates in the
  root `Cargo.toml`, C++ libraries with a pinned URL and SHA-256 in
  `native/cmake/WaveformDependencies.cmake`;
- a release at least one day old. pnpm enforces this for npm (`minimumReleaseAge`); apply
  the same rule elsewhere.

## Tests

Test behaviour, not implementation details, with the tool for each layer:

| Code                 | Tool                                     | Location                       |
| -------------------- | ---------------------------------------- | ------------------------------ |
| C++ DSP and engine   | Catch2                                   | `native/*/tests/`              |
| Rust core and bridge | `cargo test`                             | `crates/*/tests/`, inline      |
| TypeScript logic     | Vitest                                   | next to the code, `*.test.ts`  |
| React components     | Vitest and React Testing Library         | next to the code, `*.test.tsx` |
| Rendered pages       | Playwright (Chromium and WebKit) and axe | `apps/web/e2e/`                |

## Generated files

Do not edit these by hand; regenerate them:

| File                            | Regenerate with                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/desktop/src/bindings.ts`  | `cargo test -p waveform-desktop export_bindings`                                   |
| `apps/desktop/src-tauri/icons/` | `pnpm --filter @waveform/desktop tauri icon ../../assets/brand/icon-manifest.json` |
| `pnpm-lock.yaml`, `Cargo.lock`  | `pnpm install`, `cargo update -p <crate>`                                          |

## Documentation

A change that alters behaviour updates the documents that describe it: the status tags in
[ARCHITECTURE.md](docs/ARCHITECTURE.md), [ROADMAP.md](docs/ROADMAP.md), and
[CHANGELOG.md](CHANGELOG.md).
