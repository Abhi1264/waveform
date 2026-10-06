use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use sha2::{Digest, Sha256};
use ureq::Agent;

/// A model the user can choose to download. Nothing is fetched from here.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModelManifest {
    pub id: String,
    pub version: String,
    pub url: String,
    pub sha256: String,
    pub licence: String,
    pub size_bytes: u64,
}

/// SHA-256 of `bytes`, lowercase hex.
pub fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// True when `bytes` hash to `expected_sha256`.
pub fn sha256_matches(bytes: &[u8], expected_sha256: &str) -> bool {
    sha256_hex(bytes).eq_ignore_ascii_case(expected_sha256)
}

/// What a music source can do. Local files are the only source.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SourceCapabilities {
    pub id: &'static str,
    pub can_stream: bool,
    pub can_edit_metadata: bool,
    pub can_download: bool,
}

/// Files on this machine. Streaming is a later source, not a rewrite of this one.
pub fn local_file_source() -> SourceCapabilities {
    SourceCapabilities {
        id: "local-files",
        can_stream: false,
        can_edit_metadata: true,
        can_download: false,
    }
}

/// Why a model-backed action cannot run. Nothing is downloaded from here.
pub fn recommendation_unavailable() -> &'static str {
    "A recommendation model is not installed. Tempo and key filters still work, and nothing is downloaded."
}

/// A coarse energy label from tempo alone.
pub fn energy_from_bpm(bpm: f32) -> &'static str {
    if bpm < 100.0 {
        "low"
    } else if bpm < 128.0 {
        "medium"
    } else {
        "high"
    }
}

/// Start times of 32-beat phrases. This is the phrase fallback when no model is installed.
pub fn phrase_starts(bpm: f32, duration_seconds: f32) -> Vec<f32> {
    if bpm <= 0.0 || duration_seconds <= 0.0 {
        return Vec::new();
    }
    let phrase = 60.0_f32 / bpm * 32.0;
    let mut starts = Vec::new();
    let mut time = 0.0_f32;
    while time < duration_seconds && starts.len() < 64 {
        starts.push(time);
        time += phrase;
    }
    starts
}

fn pitch_class(key: &str) -> Option<i32> {
    const NAMES: [&str; 12] = [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    let trimmed = key.trim().trim_end_matches(['m', 'M']);
    NAMES
        .iter()
        .position(|name| trimmed.eq_ignore_ascii_case(name))
        .map(|index| i32::try_from(index).unwrap_or(0))
}

/// Same name, a neighbour, or a relative major or minor. Camelot labels compare as text.
pub fn keys_are_compatible(key_a: &str, key_b: &str) -> bool {
    if key_a.eq_ignore_ascii_case(key_b) {
        return true;
    }
    let (Some(a), Some(b)) = (pitch_class(key_a), pitch_class(key_b)) else {
        return false;
    };
    let distance = (a - b).abs();
    let wrapped = distance.min(12 - distance);
    wrapped <= 1 || wrapped == 3
}

/// Tempos within 6% and compatible keys. This does not load a model.
pub fn tracks_are_compatible(bpm_a: f32, bpm_b: f32, key_a: &str, key_b: &str) -> bool {
    if bpm_a <= 0.0 || bpm_b <= 0.0 {
        return false;
    }
    let ratio = bpm_a / bpm_b;
    (0.94..=1.06).contains(&ratio) && keys_are_compatible(key_a, key_b)
}

/// One Open-Unmix UMX-HQ weight file. The bytes are not in the repository.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StemWeight {
    pub stem: &'static str,
    pub file_name: &'static str,
    pub url: &'static str,
    pub sha256: &'static str,
    pub size_bytes: u64,
}

/// Why a download was not stored.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ModelError {
    #[error("The file is {actual} bytes. The manifest expects {expected}. It was not installed.")]
    Size { expected: u64, actual: u64 },
    #[error("SHA-256 did not match the manifest. The file was not installed.")]
    Hash,
    #[error("Could not download the model: {0}")]
    Download(String),
    #[error("Could not store the model: {0}")]
    Store(String),
}

/// Zenodo record 3370489, checked on 2026-10-06. Each URL was downloaded once
/// to compute the SHA-256; tests do not fetch them again.
const STEM_WEIGHTS: [StemWeight; 4] = [
    StemWeight {
        stem: "bass",
        file_name: "bass-8d85a5bd.pth",
        url: "https://zenodo.org/api/records/3370489/files/bass-8d85a5bd.pth/content",
        sha256: "8d85a5bd3f996a8867fca0e8442e077e5a3f5ec747a6112742452a8f347b39c8",
        size_bytes: 35_637_796,
    },
    StemWeight {
        stem: "drums",
        file_name: "drums-9619578f.pth",
        url: "https://zenodo.org/api/records/3370489/files/drums-9619578f.pth/content",
        sha256: "9619578f885c54737cb0234f9f9a4a679ee4f31438fd77fd1dbe02bb16c2da0a",
        size_bytes: 35_637_796,
    },
    StemWeight {
        stem: "vocals",
        file_name: "vocals-b62c91ce.pth",
        url: "https://zenodo.org/api/records/3370489/files/vocals-b62c91ce.pth/content",
        sha256: "b62c91cedbc7a066f1778ead5b5cecb377aa3a46a31af1cce7c5c8769339d083",
        size_bytes: 35_637_796,
    },
    StemWeight {
        stem: "other",
        file_name: "other-b52fbbf7.pth",
        url: "https://zenodo.org/api/records/3370489/files/other-b52fbbf7.pth/content",
        sha256: "b52fbbf76479e752bd72e02304c602ac7802aa5bfbfb9cd12054b2695d5093ab",
        size_bytes: 35_637_796,
    },
];

/// The only stem weights this app will download.
pub fn stem_weights() -> &'static [StemWeight] {
    &STEM_WEIGHTS
}

/// Weight licence of Open-Unmix UMX-HQ, from the Zenodo record.
pub fn stem_weight_licence() -> &'static str {
    "MIT"
}

/// ONNX Runtime is MIT, which AGPL can include, and it is not linked.
/// UMX-HQ weights are PyTorch checkpoints, so the runtime would not run them.
pub fn onnx_runtime_status() -> &'static str {
    "ONNX Runtime is not linked. The licence is MIT, which this AGPL app could include, but Open-Unmix UMX-HQ weights are PyTorch checkpoints and ONNX Runtime cannot run them. No separation runs."
}

/// Writes `bytes` to `destination` only when the size and SHA-256 match.
/// This does not open a network connection.
pub fn install_verified(
    bytes: &[u8],
    expected_sha256: &str,
    expected_size: u64,
    destination: &Path,
) -> Result<(), ModelError> {
    let actual = u64::try_from(bytes.len()).unwrap_or(u64::MAX);
    if actual != expected_size {
        return Err(ModelError::Size {
            expected: expected_size,
            actual,
        });
    }
    if !sha256_matches(bytes, expected_sha256) {
        return Err(ModelError::Hash);
    }
    if let Some(parent) = destination.parent()
        && !parent.as_os_str().is_empty()
    {
        fs::create_dir_all(parent).map_err(|error| ModelError::Store(error.to_string()))?;
    }
    let partial = destination.with_extension("partial");
    fs::write(&partial, bytes).map_err(|error| ModelError::Store(error.to_string()))?;
    fs::rename(&partial, destination).map_err(|error| ModelError::Store(error.to_string()))?;
    Ok(())
}

fn file_matches(path: &Path, weight: &StemWeight) -> bool {
    let Ok(bytes) = fs::read(path) else {
        return false;
    };
    u64::try_from(bytes.len()).unwrap_or(u64::MAX) == weight.size_bytes
        && sha256_matches(&bytes, weight.sha256)
}

/// True when every weight file in `directory` matches the manifest.
/// Reads local files only.
pub fn stem_weights_installed(directory: &Path) -> bool {
    STEM_WEIGHTS
        .iter()
        .all(|weight| file_matches(&directory.join(weight.file_name), weight))
}

/// Downloads UMX-HQ into `directory`. Call this only from a user action.
/// A file is installed only after its SHA-256 matches the manifest.
pub fn download_stem_model(directory: &Path) -> Result<(), ModelError> {
    fs::create_dir_all(directory).map_err(|error| ModelError::Store(error.to_string()))?;
    if stem_weights_installed(directory) {
        return Ok(());
    }
    let config = Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(300)))
        .build();
    let agent: Agent = config.into();
    for weight in &STEM_WEIGHTS {
        let destination = directory.join(weight.file_name);
        if file_matches(&destination, weight) {
            continue;
        }
        let bytes = fetch_weight(&agent, weight)?;
        install_verified(&bytes, weight.sha256, weight.size_bytes, &destination)?;
    }
    Ok(())
}

fn fetch_weight(agent: &Agent, weight: &StemWeight) -> Result<Vec<u8>, ModelError> {
    let mut response = agent
        .get(weight.url)
        .header("User-Agent", "Waveform/0.1 (explicit model download)")
        .call()
        .map_err(|error| ModelError::Download(error.to_string()))?;
    let bytes = response
        .body_mut()
        .with_config()
        .limit(weight.size_bytes.saturating_add(1))
        .read_to_vec()
        .map_err(|error| ModelError::Download(error.to_string()))?;
    let actual = u64::try_from(bytes.len()).unwrap_or(u64::MAX);
    if actual != weight.size_bytes {
        return Err(ModelError::Size {
            expected: weight.size_bytes,
            actual,
        });
    }
    Ok(bytes)
}

/// Where a downloaded model lives, relative to the app data directory.
pub fn stem_model_relative_dir() -> PathBuf {
    PathBuf::from("models")
        .join("open-unmix-umxhq")
        .join("3370489")
}
