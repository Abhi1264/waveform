//! The music library. SQLite holds metadata; large bytes stay in files named by
//! content hash. The audio thread never calls this crate.

mod hash;
mod jobs;
pub mod midi;
pub mod models;
mod schema;
pub mod stems;
mod tags;

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use rusqlite::{Connection, OpenFlags, OptionalExtension, params};

pub use hash::{HashAlgorithm, content_hash, hash_file, time_directory_hash};
pub use jobs::{ImportJob, JobQueue};
pub use schema::MIGRATIONS;

/// A playlist, crate, or saved smart playlist.
#[derive(Debug, Clone, PartialEq)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub kind: String,
}

/// A controller control stored against a command id.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ControllerMapping {
    pub control: String,
    pub command_id: String,
}

/// A track row the UI is allowed to see. No SQL leaves this crate.
#[derive(Debug, Clone, PartialEq)]
pub struct Track {
    pub id: i64,
    pub content_hash: String,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub failure: Option<String>,
}

/// Opens or creates the library at `path`, after copying the previous file
/// aside when a migration is about to run.
pub struct Library {
    connection: Connection,
    path: PathBuf,
}

impl Library {
    /// Opens `path`, backs it up when it already exists, and migrates.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, LibraryError> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent()
            && !parent.as_os_str().is_empty()
        {
            std::fs::create_dir_all(parent)?;
        }
        if path.exists() {
            let backup = backup_path(&path);
            if let Some(parent) = backup.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(&path, backup)?;
        }
        let mut connection = Connection::open(&path)?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.pragma_update(None, "foreign_keys", "ON")?;
        MIGRATIONS.to_latest(&mut connection)?;
        Ok(Self { connection, path })
    }

    /// A connection that cannot write. The writer must have created the file first.
    pub fn open_readonly(path: impl AsRef<Path>) -> Result<Self, LibraryError> {
        let path = path.as_ref().to_path_buf();
        let connection = Connection::open_with_flags(
            &path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )?;
        Ok(Self { connection, path })
    }

    /// Where the database file lives.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Registers a file. Hashing uses [`HashAlgorithm::Blake3`]. A file that
    /// cannot be read is stored with `failure` set, so import can resume.
    pub fn import_file(&mut self, path: impl AsRef<Path>) -> Result<Track, LibraryError> {
        let path = path.as_ref();
        let path_text = path.display().to_string();
        let (hash, failure) = match hash_file(path, HashAlgorithm::Blake3) {
            Ok(hash) => (hash, None),
            Err(error) => ("unreadable".to_owned(), Some(error.to_string())),
        };
        let (title, artist) = tags::read_tags(path).unwrap_or_else(|| {
            (
                path.file_stem()
                    .map(|stem| stem.to_string_lossy().into_owned())
                    .unwrap_or_else(|| path_text.clone()),
                String::new(),
            )
        });
        self.connection.execute(
            "INSERT INTO tracks (content_hash, path, title, artist, failure)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(content_hash) DO UPDATE SET
               path = excluded.path,
               title = excluded.title,
               artist = excluded.artist,
               failure = excluded.failure",
            params![hash, path_text, title, artist, failure],
        )?;
        self.connection.execute(
            "INSERT INTO track_search (title, artist, path, content_hash) VALUES (?1, ?2, ?3, ?4)",
            params![title, artist, path_text, hash],
        )?;
        self.track_by_hash(&hash)?
            .ok_or_else(|| LibraryError::Missing(hash))
    }

    /// Stores the tempo and key found while decoding `path`.
    pub fn set_analysis(&mut self, path: &str, bpm: f32, key: &str) -> Result<(), LibraryError> {
        self.connection.execute(
            "UPDATE tracks SET bpm = ?1, musical_key = ?2 WHERE path = ?3",
            params![bpm, key, path],
        )?;
        Ok(())
    }

    /// Inserts catalog rows directly. Used to measure search; import still hashes files.
    pub fn insert_catalog(&mut self, tracks: &[(&str, &str)]) -> Result<(), LibraryError> {
        let transaction = self.connection.transaction()?;
        for (index, (title, artist)) in tracks.iter().enumerate() {
            let hash = format!("catalog-{index}");
            let path = format!("catalog/{index}");
            transaction.execute(
                "INSERT INTO tracks (content_hash, path, title, artist) VALUES (?1, ?2, ?3, ?4)",
                params![hash, path, title, artist],
            )?;
            transaction.execute(
                "INSERT INTO track_search (title, artist, path, content_hash) VALUES (?1, ?2, ?3, ?4)",
                params![title, artist, path, hash],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    /// Creates a playlist, a crate, or a smart playlist. Smart playlists store a tempo and key filter.
    pub fn create_collection(
        &mut self,
        name: &str,
        kind: &str,
        min_bpm: Option<f32>,
        max_bpm: Option<f32>,
        musical_key: Option<&str>,
    ) -> Result<Collection, LibraryError> {
        self.connection.execute(
            "INSERT INTO collections (name, kind, min_bpm, max_bpm, musical_key)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![name, kind, min_bpm, max_bpm, musical_key],
        )?;
        Ok(Collection {
            id: self.connection.last_insert_rowid(),
            name: name.to_owned(),
            kind: kind.to_owned(),
        })
    }

    /// Appends a track to a playlist or crate.
    pub fn add_to_collection(
        &mut self,
        collection_id: i64,
        track_id: i64,
    ) -> Result<(), LibraryError> {
        self.connection.execute(
            "INSERT INTO collection_tracks (collection_id, track_id, position)
             VALUES (?1, ?2, COALESCE((SELECT MAX(position) + 1 FROM collection_tracks WHERE collection_id = ?1), 0))
             ON CONFLICT(collection_id, track_id) DO NOTHING",
            params![collection_id, track_id],
        )?;
        Ok(())
    }

    /// Tracks in a playlist, or the tracks a smart playlist currently matches.
    pub fn collection_tracks(&self, collection_id: i64) -> Result<Vec<Track>, LibraryError> {
        let (kind, min_bpm, max_bpm, musical_key): (
            String,
            Option<f32>,
            Option<f32>,
            Option<String>,
        ) = self.connection.query_row(
            "SELECT kind, min_bpm, max_bpm, musical_key FROM collections WHERE id = ?1",
            params![collection_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?;
        if kind == "smart" {
            return self.matching_tracks(
                min_bpm.unwrap_or(0.0),
                max_bpm.unwrap_or(999.0),
                musical_key.as_deref().unwrap_or(""),
            );
        }
        let mut statement = self.connection.prepare(
            "SELECT t.id, t.content_hash, t.path, t.title, t.artist, t.failure
             FROM collection_tracks ct
             JOIN tracks t ON t.id = ct.track_id
             WHERE ct.collection_id = ?1
             ORDER BY ct.position",
        )?;
        let rows = statement.query_map(params![collection_id], row_to_track)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(LibraryError::from)
    }

    /// Tracks whose stored tempo and key fall inside the filter. An empty key matches any key.
    pub fn matching_tracks(
        &self,
        min_bpm: f32,
        max_bpm: f32,
        musical_key: &str,
    ) -> Result<Vec<Track>, LibraryError> {
        let mut statement = self.connection.prepare(
            "SELECT id, content_hash, path, title, artist, failure
             FROM tracks
             WHERE bpm >= ?1 AND bpm <= ?2
               AND (?3 = '' OR musical_key = ?3 COLLATE NOCASE)
             ORDER BY title
             LIMIT 50",
        )?;
        let rows = statement.query_map(params![min_bpm, max_bpm, musical_key], row_to_track)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(LibraryError::from)
    }

    /// Rating is stored from 0 to 5.
    pub fn set_rating(&mut self, track_id: i64, rating: i64) -> Result<(), LibraryError> {
        let rating = rating.clamp(0, 5);
        let changed = self.connection.execute(
            "UPDATE tracks SET rating = ?1 WHERE id = ?2",
            params![rating, track_id],
        )?;
        if changed == 0 {
            return Err(LibraryError::Missing(track_id.to_string()));
        }
        Ok(())
    }

    /// Replaces the title and artist, including the search index.
    pub fn set_metadata(
        &mut self,
        track_id: i64,
        title: &str,
        artist: &str,
    ) -> Result<(), LibraryError> {
        let (hash, path): (String, String) = self.connection.query_row(
            "SELECT content_hash, path FROM tracks WHERE id = ?1",
            params![track_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        self.connection.execute(
            "UPDATE tracks SET title = ?1, artist = ?2 WHERE id = ?3",
            params![title, artist, track_id],
        )?;
        self.connection.execute(
            "DELETE FROM track_search WHERE content_hash = ?1",
            params![hash],
        )?;
        self.connection.execute(
            "INSERT INTO track_search (title, artist, path, content_hash) VALUES (?1, ?2, ?3, ?4)",
            params![title, artist, path, hash],
        )?;
        Ok(())
    }

    /// Parent folders of imported files, sorted.
    pub fn folders(&self) -> Result<Vec<String>, LibraryError> {
        let mut statement = self.connection.prepare("SELECT path FROM tracks")?;
        let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
        let mut folders = BTreeSet::new();
        for path in rows {
            let path = path?;
            if let Some(parent) = Path::new(&path).parent() {
                let text = parent.display().to_string();
                if !text.is_empty() {
                    folders.insert(text);
                }
            }
        }
        Ok(folders.into_iter().collect())
    }

    /// Attaches a tag. Repeating it does nothing.
    pub fn add_tag(&mut self, track_id: i64, tag: &str) -> Result<(), LibraryError> {
        self.connection.execute(
            "INSERT OR IGNORE INTO track_tags (track_id, tag) VALUES (?1, ?2)",
            params![track_id, tag],
        )?;
        Ok(())
    }

    /// Records that a track was played. `played_at` is an opaque timestamp from the caller.
    pub fn record_play(&mut self, track_id: i64, played_at: &str) -> Result<(), LibraryError> {
        self.connection.execute(
            "INSERT INTO play_history (track_id, played_at) VALUES (?1, ?2)",
            params![track_id, played_at],
        )?;
        Ok(())
    }

    /// The most recently played tracks, newest first.
    pub fn recent_plays(&self) -> Result<Vec<Track>, LibraryError> {
        let mut statement = self.connection.prepare(
            "SELECT t.id, t.content_hash, t.path, t.title, t.artist, t.failure
             FROM play_history h
             JOIN tracks t ON t.id = h.track_id
             ORDER BY h.id DESC
             LIMIT 50",
        )?;
        let rows = statement.query_map([], row_to_track)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(LibraryError::from)
    }

    /// Remembers which command a controller control should run.
    pub fn set_mapping(&mut self, control: &str, command_id: &str) -> Result<(), LibraryError> {
        self.connection.execute(
            "INSERT INTO controller_mappings (control, command_id) VALUES (?1, ?2)
             ON CONFLICT(control) DO UPDATE SET command_id = excluded.command_id",
            params![control, command_id],
        )?;
        Ok(())
    }

    /// Every stored controller mapping.
    pub fn mappings(&self) -> Result<Vec<ControllerMapping>, LibraryError> {
        let mut statement = self
            .connection
            .prepare("SELECT control, command_id FROM controller_mappings ORDER BY control")?;
        let rows = statement.query_map([], |row| {
            Ok(ControllerMapping {
                control: row.get(0)?,
                command_id: row.get(1)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(LibraryError::from)
    }

    /// Full-text search over title and artist. An empty query returns nothing.
    pub fn search(&self, query: &str) -> Result<Vec<Track>, LibraryError> {
        let query = query.trim();
        if query.is_empty() {
            return Ok(Vec::new());
        }
        let mut statement = self.connection.prepare(
            "SELECT t.id, t.content_hash, t.path, t.title, t.artist, t.failure
             FROM track_search
             JOIN tracks t ON t.content_hash = track_search.content_hash
             WHERE track_search MATCH ?1
             ORDER BY rank
             LIMIT 50",
        )?;
        let rows = statement.query_map(params![query], row_to_track)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(LibraryError::from)
    }

    fn track_by_hash(&self, hash: &str) -> Result<Option<Track>, LibraryError> {
        self.connection
            .query_row(
                "SELECT id, content_hash, path, title, artist, failure FROM tracks WHERE content_hash = ?1",
                params![hash],
                row_to_track,
            )
            .optional()
            .map_err(LibraryError::from)
    }
}

fn row_to_track(row: &rusqlite::Row<'_>) -> rusqlite::Result<Track> {
    Ok(Track {
        id: row.get(0)?,
        content_hash: row.get(1)?,
        path: row.get(2)?,
        title: row.get(3)?,
        artist: row.get(4)?,
        failure: row.get(5)?,
    })
}

impl Drop for Library {
    fn drop(&mut self) {
        // Make the backup copy self-contained. WAL would otherwise hold the rows.
        let _ = self
            .connection
            .pragma_update(None, "wal_checkpoint", "TRUNCATE");
    }
}

fn backup_path(database: &Path) -> PathBuf {
    let mut backup = database.to_path_buf();
    backup.set_extension("sqlite.bak");
    backup
}

/// A failure from the library, in words a person can read.
#[derive(Debug, thiserror::Error)]
pub enum LibraryError {
    #[error("{0}")]
    Database(#[from] rusqlite::Error),
    #[error("{0}")]
    Migration(#[from] rusqlite_migration::Error),
    #[error("Could not read the library files: {0}")]
    Io(#[from] std::io::Error),
    #[error("The imported track {0} was not stored.")]
    Missing(String),
}
