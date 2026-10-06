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
        let imported = writer
            .import_file(Path::new(&path))
            .map_err(|error| error.to_string())?;
        let played_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|elapsed| elapsed.as_secs().to_string())
            .unwrap_or_else(|_| "0".to_owned());
        let _ = writer.record_play(imported.id, &played_at);
    }
    engine
        .load_file(deck, &path)
        .map_err(|error| error.to_string())?;
    if let Ok(analysis) = engine.analysis(deck) {
        let mut writer = library
            .writer
            .lock()
            .map_err(|_| "The library is unavailable.".to_owned())?;
        let _ = writer.set_analysis(&path, analysis.bpm, &analysis.musical_key);
    }
    engine.peaks(deck)
}

fn writer(library: &LibraryState) -> Result<std::sync::MutexGuard<'_, Library>, String> {
    library
        .writer
        .lock()
        .map_err(|_| "The library is unavailable.".to_owned())
}

fn to_track(track: waveform_library::Track) -> LibraryTrack {
    LibraryTrack {
        id: i32::try_from(track.id).unwrap_or(i32::MAX),
        title: track.title,
        artist: track.artist,
        path: track.path,
        failure: track.failure,
    }
}

/// A playlist, crate, or smart playlist.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LibraryCollection {
    id: i32,
    name: String,
    kind: String,
}

/// A stored controller mapping.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LibraryMapping {
    control: String,
    command_id: String,
}

/// Creates a playlist (`playlist` or `crate`) or a smart playlist (`smart`).
#[tauri::command]
#[specta::specta]
pub fn create_collection(
    library: State<'_, LibraryState>,
    name: String,
    kind: String,
    min_bpm: Option<f32>,
    max_bpm: Option<f32>,
    musical_key: Option<String>,
) -> Result<LibraryCollection, String> {
    let collection = writer(&library)?
        .create_collection(&name, &kind, min_bpm, max_bpm, musical_key.as_deref())
        .map_err(|error| error.to_string())?;
    Ok(LibraryCollection {
        id: i32::try_from(collection.id).unwrap_or(i32::MAX),
        name: collection.name,
        kind: collection.kind,
    })
}

/// Adds a track to a playlist or crate.
#[tauri::command]
#[specta::specta]
pub fn add_to_collection(
    library: State<'_, LibraryState>,
    collection_id: i32,
    track_id: i32,
) -> Result<(), String> {
    writer(&library)?
        .add_to_collection(i64::from(collection_id), i64::from(track_id))
        .map_err(|error| error.to_string())
}

/// Lists a playlist, or the tracks a smart playlist matches.
#[tauri::command]
#[specta::specta]
pub fn collection_tracks(
    library: State<'_, LibraryState>,
    collection_id: i32,
) -> Result<Vec<LibraryTrack>, String> {
    let tracks = Library::open_readonly(&library.path)
        .and_then(|reader| reader.collection_tracks(i64::from(collection_id)))
        .map_err(|error| error.to_string())?;
    Ok(tracks.into_iter().map(to_track).collect())
}

/// Stores a rating from 0 to 5.
#[tauri::command]
#[specta::specta]
pub fn set_track_rating(
    library: State<'_, LibraryState>,
    track_id: i32,
    rating: i32,
) -> Result<(), String> {
    writer(&library)?
        .set_rating(i64::from(track_id), i64::from(rating))
        .map_err(|error| error.to_string())
}

/// Replaces a track's title and artist in the library and the search index.
#[tauri::command]
#[specta::specta]
pub fn set_track_metadata(
    library: State<'_, LibraryState>,
    track_id: i32,
    title: String,
    artist: String,
) -> Result<(), String> {
    writer(&library)?
        .set_metadata(i64::from(track_id), &title, &artist)
        .map_err(|error| error.to_string())
}

/// Remembers which command a controller control runs.
#[tauri::command]
#[specta::specta]
pub fn save_mapping(
    library: State<'_, LibraryState>,
    control: String,
    command_id: String,
) -> Result<(), String> {
    writer(&library)?
        .set_mapping(&control, &command_id)
        .map_err(|error| error.to_string())
}

/// Parent folders of imported tracks.
#[tauri::command]
#[specta::specta]
pub fn list_folders(library: State<'_, LibraryState>) -> Result<Vec<String>, String> {
    Library::open_readonly(&library.path)
        .and_then(|reader| reader.folders())
        .map_err(|error| error.to_string())
}

/// Attaches a tag to a track.
#[tauri::command]
#[specta::specta]
pub fn tag_track(
    library: State<'_, LibraryState>,
    track_id: i32,
    tag: String,
) -> Result<(), String> {
    writer(&library)?
        .add_tag(i64::from(track_id), &tag)
        .map_err(|error| error.to_string())
}

/// Recently played tracks, newest first.
#[tauri::command]
#[specta::specta]
pub fn recent_plays(library: State<'_, LibraryState>) -> Result<Vec<LibraryTrack>, String> {
    let tracks = Library::open_readonly(&library.path)
        .and_then(|reader| reader.recent_plays())
        .map_err(|error| error.to_string())?;
    Ok(tracks.into_iter().map(to_track).collect())
}

/// Stored controller mappings.
#[tauri::command]
#[specta::specta]
pub fn list_mappings(library: State<'_, LibraryState>) -> Result<Vec<LibraryMapping>, String> {
    let mappings = Library::open_readonly(&library.path)
        .and_then(|reader| reader.mappings())
        .map_err(|error| error.to_string())?;
    Ok(mappings
        .into_iter()
        .map(|mapping| LibraryMapping {
            control: mapping.control,
            command_id: mapping.command_id,
        })
        .collect())
}
