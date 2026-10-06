use waveform_library::Library;
use waveform_library::midi::{command_for_midi, parse_midi};
use waveform_library::models::{
    energy_from_bpm, install_verified, local_file_source, onnx_runtime_status, phrase_starts,
    recommendation_unavailable, sha256_hex, sha256_matches, stem_weight_licence, stem_weights,
    tracks_are_compatible,
};
use waveform_library::stems::{stem_audio_paths, write_stems};

#[test]
fn midi_note_on_is_three_bytes() {
    let message = parse_midi(&[0x90, 60, 100]).expect("note on");
    assert_eq!(message.data1, 60);
    assert!(parse_midi(&[0x90, 60]).is_none());
    assert_eq!(command_for_midi(message), Some("sampler.trigger"));
    let fader = parse_midi(&[0xB0, 1, 64]).expect("cc");
    assert_eq!(command_for_midi(fader), Some("mixer.crossfader"));
}

#[test]
fn compatibility_does_not_need_a_model() {
    assert!(tracks_are_compatible(128.0, 126.0, "8A", "8a"));
    assert!(!tracks_are_compatible(128.0, 100.0, "8A", "8A"));
    assert!(tracks_are_compatible(120.0, 120.0, "A", "C"));
    assert_eq!(energy_from_bpm(120.0), "medium");
    assert_eq!(phrase_starts(120.0, 40.0).len(), 3);
    assert!(!recommendation_unavailable().is_empty());
    assert!(!local_file_source().can_stream);
    assert!(local_file_source().can_edit_metadata);
    let bytes = b"not a model";
    assert!(sha256_matches(
        bytes,
        &waveform_library::models::sha256_hex(bytes)
    ));
    assert!(!sha256_matches(bytes, "00"));
}

#[test]
fn playlists_ratings_tags_history_and_mappings() {
    let directory = tempfile::tempdir().expect("temp");
    let mut library = Library::open(directory.path().join("library.sqlite")).expect("open");
    let file = directory.path().join("Night.wav");
    std::fs::write(&file, b"bytes").expect("write");
    let track = library.import_file(&file).expect("import");
    library
        .set_analysis(&file.display().to_string(), 126.0, "Am")
        .expect("analysis");
    library.set_rating(track.id, 5).expect("rating");
    library
        .set_metadata(track.id, "Night Drive", "Ada")
        .expect("metadata");
    library.add_tag(track.id, "closing").expect("tag");
    library.record_play(track.id, "1").expect("play");

    let found = library.search("drive").expect("search");
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].title, "Night Drive");

    let playlist = library
        .create_collection("Friday", "playlist", None, None, None)
        .expect("playlist");
    library
        .add_to_collection(playlist.id, track.id)
        .expect("add");
    assert_eq!(
        library.collection_tracks(playlist.id).expect("list").len(),
        1
    );

    let smart = library
        .create_collection("Around 126", "smart", Some(120.0), Some(130.0), Some("Am"))
        .expect("smart");
    assert_eq!(
        library
            .collection_tracks(smart.id)
            .expect("smart list")
            .len(),
        1
    );
    assert_eq!(library.recent_plays().expect("history").len(), 1);

    library.add_tag(track.id, "closing").expect("tag");
    assert_eq!(library.folders().expect("folders").len(), 1);
    library
        .set_mapping("midi:cc:1", "mixer.crossfader")
        .expect("map");
    let mappings = library.mappings().expect("mappings");
    assert_eq!(mappings[0].command_id, "mixer.crossfader");
}

#[test]
fn stem_files_are_written_beside_playback() {
    let directory = tempfile::tempdir().expect("temp");
    write_stems(directory.path(), "abc", b"pcm").expect("write");
    for name in ["vocals", "drums", "bass", "other"] {
        let path = directory.path().join("abc").join(format!("{name}.bin"));
        assert_eq!(std::fs::read(path).expect("read"), b"pcm");
    }
    assert!(stem_audio_paths(&directory.path().join("abc")).is_empty());
    std::fs::write(directory.path().join("abc").join("vocals.wav"), b"wav").expect("wav");
    std::fs::write(directory.path().join("abc").join("drums.aiff"), b"aiff").expect("aiff");
    let playable = stem_audio_paths(&directory.path().join("abc"));
    assert_eq!(playable.len(), 2);
    assert!(playable[0].ends_with("vocals.wav"));
    assert!(playable[1].ends_with("drums.aiff"));
}

#[test]
fn stem_manifest_installs_only_when_the_hash_matches() {
    assert_eq!(stem_weight_licence(), "MIT");
    assert!(onnx_runtime_status().contains("not linked"));
    let weights = stem_weights();
    assert_eq!(weights.len(), 4);
    let mut total = 0_u64;
    for weight in weights {
        assert!(
            weight
                .url
                .starts_with("https://zenodo.org/api/records/3370489/files/")
        );
        assert_eq!(weight.sha256.len(), 64);
        assert_eq!(weight.size_bytes, 35_637_796);
        total += weight.size_bytes;
        let directory = tempfile::tempdir().expect("temp");
        let destination = directory.path().join(weight.file_name);
        let rejected = install_verified(b"nope", weight.sha256, weight.size_bytes, &destination);
        assert!(rejected.is_err());
        assert!(!destination.exists());
    }
    assert_eq!(total, 142_551_184);

    let bytes = b"local-weight";
    let directory = tempfile::tempdir().expect("temp");
    let destination = directory.path().join("vocals.pth");
    install_verified(bytes, &sha256_hex(bytes), bytes.len() as u64, &destination).expect("install");
    assert_eq!(std::fs::read(&destination).expect("read"), bytes);
    let wrong_hash = directory.path().join("rejected.pth");
    assert!(install_verified(bytes, "00", bytes.len() as u64, &wrong_hash).is_err());
    assert!(!wrong_hash.exists());
}
