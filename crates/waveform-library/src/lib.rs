//! The music library. SQLite holds metadata; large bytes stay in files named by
//! content hash. The audio thread never calls this crate.

mod hash;
mod jobs;
pub mod midi;
pub mod models;
mod schema;
pub mod stems;
mod tags;

use std::path::{Path, PathBuf};

use rusqlite::{Connection, OpenFlags, OptionalExtension, params};

pub use hash::{HashAlgorithm, content_hash, hash_file, time_directory_hash};
pub use jobs::{ImportJob, JobQueue};
pub use schema::MIGRATIONS;

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
