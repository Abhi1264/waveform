use std::fs;
use std::path::Path;

const STEMS: [&str; 4] = ["vocals", "drums", "bass", "other"];

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
