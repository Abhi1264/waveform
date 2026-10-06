use waveform_library::Library;
use waveform_library::midi::{command_for_midi, parse_midi};
use waveform_library::models::{
    energy_from_bpm, local_file_source, phrase_starts, recommendation_unavailable, sha256_matches,
    tracks_are_compatible,
};
use waveform_library::stems::write_stems;

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
}
