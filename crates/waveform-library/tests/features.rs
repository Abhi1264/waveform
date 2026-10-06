use waveform_library::midi::parse_midi;
use waveform_library::models::{sha256_matches, tracks_are_compatible};
use waveform_library::stems::write_stems;

#[test]
fn midi_note_on_is_three_bytes() {
    let message = parse_midi(&[0x90, 60, 100]).expect("note on");
    assert_eq!(message.data1, 60);
    assert!(parse_midi(&[0x90, 60]).is_none());
}

#[test]
fn compatibility_does_not_need_a_model() {
    assert!(tracks_are_compatible(128.0, 126.0, "8A", "8a"));
    assert!(!tracks_are_compatible(128.0, 100.0, "8A", "8A"));
    let bytes = b"not a model";
    assert!(sha256_matches(
        bytes,
        &waveform_library::models::sha256_hex(bytes)
    ));
    assert!(!sha256_matches(bytes, "00"));
}

#[test]
fn stem_files_are_written_beside_playback() {
    let directory = tempfile::tempdir().expect("temp");
    write_stems(directory.path(), "abc", b"pcm").expect("write");
    for name in ["vocals", "drums", "bass", "other"] {
        let path = directory.path().join("abc").join(format!("{name}.bin"));
        assert_eq!(std::fs::read(path).expect("read"), b"pcm");
    }
}
