use rusqlite_migration::{M, Migrations};

/// Schema changes. The first migration creates the tables; later ones append.
pub static MIGRATIONS: std::sync::LazyLock<Migrations<'static>> = std::sync::LazyLock::new(|| {
    Migrations::new(vec![M::up(
        "CREATE TABLE tracks (
            id INTEGER PRIMARY KEY,
            content_hash TEXT NOT NULL UNIQUE,
            path TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            artist TEXT NOT NULL DEFAULT '',
            duration_seconds REAL,
            bpm REAL,
            musical_key TEXT,
            failure TEXT
        );
        CREATE VIRTUAL TABLE track_search USING fts5(
            title,
            artist,
            path UNINDEXED,
            content_hash UNINDEXED
        );",
    )])
});
