use std::fs::File;
use std::io::{self, Read};
use std::path::Path;
use std::time::Instant;

/// How a file becomes the name of its cache entry.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HashAlgorithm {
    /// BLAKE3. Chosen after the Phase 4 scan (see DATABASE.md).
    Blake3,
    /// XXH3-128. Measured, then rejected: faster on tiny files, not a cryptographic name.
    Xxh3,
}

/// Hashes `bytes` and returns a lowercase hex string.
pub fn content_hash(bytes: &[u8], algorithm: HashAlgorithm) -> String {
    match algorithm {
        HashAlgorithm::Blake3 => blake3::hash(bytes).to_hex().to_string(),
        HashAlgorithm::Xxh3 => format!("{:032x}", xxhash_rust::xxh3::xxh3_128(bytes)),
    }
}

/// Reads `path` and hashes it. The whole file is read, which is what the import
/// benchmark measures; playback never does this on the audio thread.
pub fn hash_file(path: &Path, algorithm: HashAlgorithm) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    Ok(content_hash(&bytes, algorithm))
}

/// How long it took to hash every file directly inside `directory`.
pub fn time_directory_hash(
    directory: &Path,
    algorithm: HashAlgorithm,
) -> io::Result<std::time::Duration> {
    let started = Instant::now();
    for entry in std::fs::read_dir(directory)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            hash_file(&entry.path(), algorithm)?;
        }
    }
    Ok(started.elapsed())
}
