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

/// Tempos within 6% and the same key name. This does not load a model.
pub fn tracks_are_compatible(bpm_a: f32, bpm_b: f32, key_a: &str, key_b: &str) -> bool {
    if bpm_a <= 0.0 || bpm_b <= 0.0 {
        return false;
    }
    let ratio = bpm_a / bpm_b;
    (0.94..=1.06).contains(&ratio) && key_a.eq_ignore_ascii_case(key_b)
}
