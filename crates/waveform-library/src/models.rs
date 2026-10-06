use sha2::{Digest, Sha256};

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
