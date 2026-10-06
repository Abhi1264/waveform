use std::fs;
use std::path::{Path, PathBuf};

const STEMS: [&str; 4] = ["vocals", "drums", "bass", "other"];

/// Shown wherever a filter-bank preview is offered. This is not a neural stem.
pub const PREVIEW_NOTICE: &str = "Filter-bank preview. This is not a neural stem separation.";

/// The sentence the preview writer and the desktop UI both show.
pub fn stem_preview_notice() -> &'static str {
    PREVIEW_NOTICE
}
const AUDIO_EXTENSIONS: [&str; 6] = ["wav", "aiff", "aif", "flac", "mp3", "ogg"];

/// Writes one file per stem under `root/<hash>/`. The bytes are the caller's
/// already-separated audio. This does not run a model and does not touch the
/// audio callback.
pub fn write_stems(root: &Path, hash: &str, audio: &[u8]) -> std::io::Result<()> {
    let directory = root.join(hash);
    fs::create_dir_all(&directory)?;
    for name in STEMS {
        fs::write(directory.join(format!("{name}.bin")), audio)?;
    }
    Ok(())
}

/// Audio files a deck can load. `.bin` copies from [`write_stems`] are not
/// included. Finding a path does not mean a model separated the track.
pub fn stem_audio_paths(directory: &Path) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for name in STEMS {
        for extension in AUDIO_EXTENSIONS {
            let path = directory.join(format!("{name}.{extension}"));
            if path.is_file() {
                paths.push(path);
                break;
            }
        }
    }
    paths
}
