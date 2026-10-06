use rusqlite_migration::{M, Migrations};

/// Schema changes. The first migration creates the tables; later ones append.
pub static MIGRATIONS: std::sync::LazyLock<Migrations<'static>> = std::sync::LazyLock::new(|| {
    Migrations::new(vec![
        M::up(
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
        ),
        M::up(
            "ALTER TABLE tracks ADD COLUMN rating INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE tracks ADD COLUMN notes TEXT NOT NULL DEFAULT '';
        CREATE TABLE collections (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            kind TEXT NOT NULL,
            min_bpm REAL,
            max_bpm REAL,
            musical_key TEXT
        );
        CREATE TABLE collection_tracks (
            collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            position INTEGER NOT NULL,
            PRIMARY KEY (collection_id, track_id)
        );
        CREATE TABLE track_tags (
            track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            tag TEXT NOT NULL,
            PRIMARY KEY (track_id, tag)
        );
        CREATE TABLE play_history (
            id INTEGER PRIMARY KEY,
            track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            played_at TEXT NOT NULL
        );
        CREATE TABLE controller_mappings (
            control TEXT PRIMARY KEY,
            command_id TEXT NOT NULL
        );",
        ),
    ])
});
