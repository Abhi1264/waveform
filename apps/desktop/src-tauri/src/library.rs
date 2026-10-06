//! The music library as the frontend sees it. SQL stays in this process.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use specta::Type;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};
use waveform_library::Library;

/// One search hit. Paths are included so the user can load the file they picked.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTrack {
    id: i32,
    title: String,
    artist: String,
    path: String,
    failure: Option<String>,
}

/// Progress for a folder import. `done` counts files finished, including failures.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgress {
    done: u32,
    total: u32,
    path: String,
    failure: Option<String>,
}

pub struct LibraryState {
    path: PathBuf,
    writer: Mutex<Library>,
}

impl LibraryState {
    pub fn open(app: &AppHandle) -> Result<Self, String> {
        let directory = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        let path = directory.join("library.sqlite");
        let writer = Library::open(&path).map_err(|error| error.to_string())?;
        Ok(Self {
            path,
            writer: Mutex::new(writer),
        })
    }
}

fn audio_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("wav" | "aiff" | "aif" | "flac" | "mp3" | "ogg")
    )
}

fn collect_files(root: &Path, files: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_files(&path, files);
        } else if audio_file(&path) {
            files.push(path);
        }
    }
}

/// Search titles and artists. Uses a read-only connection so an import can write.
#[tauri::command]
#[specta::specta]
pub fn search_tracks(
    library: State<'_, LibraryState>,
    query: String,
) -> Result<Vec<LibraryTrack>, String> {
    let reader = Library::open_readonly(&library.path).map_err(|error| error.to_string())?;
    let tracks = reader.search(&query).map_err(|error| error.to_string())?;
    Ok(tracks
        .into_iter()
        .map(|track| LibraryTrack {
            id: i32::try_from(track.id).unwrap_or(i32::MAX),
            title: track.title,
            artist: track.artist,
            path: track.path,
            failure: track.failure,
        })
        .collect())
}

/// Imports audio files under `folder` on a background thread and reports progress.
#[tauri::command]
#[specta::specta]
pub fn import_folder(
    app: AppHandle,
    folder: String,
    channel: Channel<ImportProgress>,
) -> Result<(), String> {
    let root = PathBuf::from(&folder);
    if !root.is_dir() {
        return Err(format!("{folder} is not a folder."));
    }
    let mut files = Vec::new();
    collect_files(&root, &mut files);
    let total = u32::try_from(files.len()).unwrap_or(u32::MAX);
    std::thread::Builder::new()
        .name("waveform-import".into())
        .spawn(move || {
            let library = app.state::<LibraryState>();
            let Ok(mut writer) = library.writer.lock() else {
                return;
            };
            for (index, path) in files.into_iter().enumerate() {
                let imported = writer.import_file(&path);
                let failure = match imported {
                    Ok(track) => track.failure,
                    Err(error) => Some(error.to_string()),
                };
                let progress = ImportProgress {
                    done: u32::try_from(index + 1).unwrap_or(u32::MAX),
                    total,
                    path: path.display().to_string(),
                    failure,
                };
                if channel.send(progress).is_err() {
                    break;
                }
            }
        })
        .map_err(|error| error.to_string())?;
    Ok(())
}

/// Loads one file the user named onto a deck, and registers it in the library.
#[tauri::command]
#[specta::specta]
pub fn load_deck_file(
    library: State<'_, LibraryState>,
    engine: State<'_, crate::engine::Engine>,
    deck: u8,
    path: String,
) -> Result<Vec<f32>, String> {
    {
        let mut writer = library
            .writer
            .lock()
            .map_err(|_| "The library is unavailable.".to_owned())?;
        writer
            .import_file(Path::new(&path))
            .map_err(|error| error.to_string())?;
    }
    engine
        .load_file(deck, &path)
        .map_err(|error| error.to_string())?;
    engine.peaks(deck)
}
