# Database

The Rust crate `crates/waveform-library` owns SQLite. The webview never sees SQL.

## File

`<app data dir>/library.sqlite`, opened in WAL mode with foreign keys on. Before each open
of an existing file, the crate copies it to `library.sqlite.bak`.

## Schema

`tracks` holds one row per content hash: path, title, artist, optional duration, BPM, key,
rating, notes, and a failure string when the file could not be read. `track_search` is an
FTS5 table over title and artist. `collections` stores playlists, crates, and smart
playlists (a tempo and key filter). `collection_tracks`, `track_tags`, `play_history`, and
`controller_mappings` hang off that. Migrations live in `schema.rs` and run through
`rusqlite_migration`.

Local files are the only music source (`local_file_source`). It can edit metadata and
cannot stream or download. A later streaming source would be another value of that type.

Large bytes (peaks, artwork, stems) are files named by the content hash, as in
[ARCHITECTURE.md](ARCHITECTURE.md). The hash is BLAKE3 (see below).

## Content hash

Measured on macOS 27, Apple silicon, 6 October 2026: 100,000 small files in one directory.

| Algorithm | Time to read and hash |
| --------- | --------------------- |
| BLAKE3    | 7.86 s                |
| XXH3-128  | 11.33 s               |

BLAKE3 was faster on this set and is the name used in the cache. XXH3 stays in the crate so
the measurement can be repeated. Codec coverage is unchanged from ADR-008: native decoding
is authoritative because MediaBunny cannot read AIFF or ALAC.

## Tests

`cargo test -p waveform-library` covers migration, search, a corrupt file, a background
import that returns before the worker finishes, playlists, smart playlists, ratings, tags,
history, folders, mappings, and the 100,000-file hash.
