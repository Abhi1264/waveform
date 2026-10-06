# Third-party licences

This file lists the third-party code that Waveform compiles into what it ships, and the
tools it uses only to build and test. It was checked on 2026-10-05 against the built
binaries and the lockfiles; the commands at the end reproduce the checks.

This is a summary, not a notices file. Before the first binary release it will be
replaced by generated notices that include each licence's full text, as most of these
licences require for binary distribution.

## Desktop app

### JUCE

| Component | Version | Licence                                                                         |
| --------- | ------- | ------------------------------------------------------------------------------- |
| JUCE      | 9.0.3   | AGPLv3 or the commercial JUCE 9 licence (see [LICENSING.md](docs/LICENSING.md)) |

Waveform is AGPL-3.0-only and uses JUCE under AGPLv3. A commercial JUCE licence was not
purchased. A commercial JUCE licence may be required for a build that is not AGPL.

Waveform builds the `juce_core`, `juce_events`, `juce_audio_basics`, `juce_audio_devices`
and `juce_audio_formats` modules. The linker keeps only the code the engine uses, and
today that is part of `juce_core` and `juce_events` (the message loop). Checked with
`nm` on the macOS binary:

| Bundled with JUCE                         | Licence            | In the app binary today                            |
| ----------------------------------------- | ------------------ | -------------------------------------------------- |
| zlib 1.3.2                                | Zlib               | No                                                 |
| FLAC 1.5.0, libogg 1.3.6, libvorbis 1.3.7 | BSD-3-Clause       | No; compiled, linked once audio files are decoded  |
| Opus 1.6.1, opusfile, libopusenc 0.3      | BSD-3-Clause       | No; compiled, linked once audio files are decoded  |
| JUCE's MP3 decoder                        | JUCE's own licence | No                                                 |
| ASIO SDK, Oboe                            | See LICENSING.md   | Not compiled. `WAVEFORM_ENABLE_ASIO` defaults off. |

### Rust crates

333 third-party crates are linked into the app across all target platforms (proc-macro
crates run only at build time and are not counted). Every one declares an SPDX licence
expression. "Any of" means the crate may be used under whichever listed licence suits.

| Declared licence                                               | Crates |
| -------------------------------------------------------------- | -----: |
| MIT or Apache-2.0 (in either order or notation)                |    187 |
| MIT                                                            |     85 |
| Zlib, Apache-2.0 or MIT (any of)                               |     18 |
| Unicode-3.0, or (MIT or Apache-2.0) and Unicode-3.0            |     16 |
| Unlicense or MIT                                               |      6 |
| MPL-2.0                                                        |      4 |
| Apache-2.0 with the LLVM exception, Apache-2.0 or MIT (any of) |      3 |
| Apache-2.0                                                     |      2 |
| BSD-3-Clause                                                   |      2 |
| MIT, Apache-2.0 or LGPL-2.1-or-later (any of)                  |      2 |
| BSD-2-Clause                                                   |      1 |
| BSD-3-Clause and MIT                                           |      1 |
| BSD-3-Clause or MIT                                            |      1 |
| BSD-3-Clause, MIT or Apache-2.0 (any of)                       |      1 |
| 0BSD, MIT or Apache-2.0 (any of)                               |      1 |
| CC0-1.0, MIT-0 or Apache-2.0 (any of)                          |      1 |
| Apache-2.0 and MIT                                             |      1 |
| Zlib                                                           |      1 |

Notes:

- `ureq` 3.4.2 (MIT OR Apache-2.0) was added on 2026-10-06 so the user can download the stem
  model. It pulls in rustls. The crate counts in the table above were taken on 2026-10-05
  and were not regenerated.
- The four MPL-2.0 crates are `cssparser`, `dtoa-short`, `selectors` (used by Tauri's
  HTML processing) and `option-ext`. MPL-2.0 is file-level copyleft: their source files,
  including any changes to them, must stay available under MPL-2.0. It is compatible with
  every option in LICENSING.md.
- `r-efi` offers MIT, Apache-2.0 or LGPL-2.1-or-later; Waveform uses it under MIT or
  Apache-2.0.

### JavaScript production dependencies

The bundler includes only the code that is actually imported, so some of these
contribute little or nothing yet (the Phosphor icons, for example, are not used in the
app so far).

| Package                                                                                | Licence           |
| -------------------------------------------------------------------------------------- | ----------------- |
| React, React DOM, scheduler, use-sync-external-store                                   | MIT               |
| `@tauri-apps/api`                                                                      | Apache-2.0 or MIT |
| React Aria Components, React Aria, React Stately, `@react-types`, `@internationalized` | Apache-2.0        |
| class-variance-authority, `@swc/helpers`                                               | Apache-2.0        |
| clsx, cn, aria-hidden, client-only, tw-animate-css, Phosphor icons                     | MIT               |
| tslib                                                                                  | 0BSD              |
| Tailwind CSS (generated styles)                                                        | MIT               |
| Archivo (Omnibus-Type), Martian Mono (Evil Martians), via Fontsource                   | OFL-1.1           |

## Website

The website bundles the same React, React Aria and shadcn-related packages as the app,
plus:

| Package                                            | Licence      |
| -------------------------------------------------- | ------------ |
| Next.js, `@next/env`, next-themes, nanoid, PostCSS | MIT          |
| picocolors                                         | ISC          |
| source-map-js                                      | BSD-3-Clause |
| baseline-browser-mapping                           | Apache-2.0   |
| caniuse-lite (browser support data)                | CC-BY-4.0    |

## Build and test tools (not shipped)

Catch2 3.16.0 (BSL-1.0), Vitest, Testing Library, jsdom, Playwright, ESLint,
typescript-eslint, Prettier, Turborepo, TypeScript, Vite, the Tauri CLI, the shadcn CLI,
clang-format, actionlint and ShellCheck. None of them is included in the app or the
website.

## Reproducing these checks

```sh
# Rust crates linked into the desktop app, for every target platform
cargo tree -p waveform-desktop -e normal --target all --prefix none
cargo metadata --format-version 1 --locked   # licence field of each crate

# npm packages that are bundled (workspace packages are listed separately)
(cd apps/desktop && pnpm licenses list --prod)
(cd apps/web && pnpm licenses list --prod)
(cd packages/ui && pnpm licenses list --prod)

# JUCE code that reached the app binary (macOS; use the matching tool elsewhere)
nm target/debug/waveform-desktop | grep -c juce
```
