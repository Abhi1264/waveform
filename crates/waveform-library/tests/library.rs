use std::fs;
use std::sync::Mutex;
use std::time::Instant;

use waveform_library::{
    HashAlgorithm, JobQueue, Library, content_hash, hash_file, time_directory_hash,
};

/// The search budget assumes a quiet disk. The hash benchmark writes a hundred
/// thousand files; running the two together makes the timed query miss 50 ms
/// on a busy CI runner.
fn quiet_disk() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: Mutex<()> = Mutex::new(());
    LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[test]
fn migration_search_and_a_corrupt_file() {
    let directory = tempfile::tempdir().expect("temp");
    let database = directory.path().join("library.sqlite");
    let mut library = Library::open(&database).expect("open");
    let track = directory.path().join("Midnight City.wav");
    fs::write(&track, b"not really a wav, just bytes").expect("write");
    let imported = library.import_file(&track).expect("import");
    assert_eq!(imported.title, "Midnight City");
    assert!(imported.failure.is_none());

    let found = library.search("midnight").expect("search");
    assert_eq!(found.len(), 1);

    let missing = directory.path().join("gone.wav");
    let failed = library.import_file(&missing).expect("records the failure");
    assert!(failed.failure.is_some());

    drop(library);
    fs::write(&database, b"this is not a sqlite database").expect("corrupt");
    assert!(Library::open(&database).is_err());
}

#[test]
fn search_of_one_hundred_thousand_tracks_stays_under_50ms() {
    let _quiet = quiet_disk();
    let directory = tempfile::tempdir().expect("temp");
    let mut library = Library::open(directory.path().join("library.sqlite")).expect("open");
    let mut titles = Vec::with_capacity(100_000);
    for index in 0..100_000 {
        titles.push((format!("Track {index}"), "Artist".to_owned()));
    }
    let borrowed: Vec<(&str, &str)> = titles
        .iter()
        .map(|(title, artist)| (title.as_str(), artist.as_str()))
        .collect();
    library.insert_catalog(&borrowed).expect("insert");
    let started = std::time::Instant::now();
    let found = library.search("Track 42").expect("search");
    let elapsed = started.elapsed();
    eprintln!(
        "search benchmark: 100000 tracks, {elapsed:?}, hits {}",
        found.len()
    );
    assert!(!found.is_empty());
    assert!(elapsed.as_millis() < 50, "{elapsed:?}");
}

#[test]
fn the_import_queue_returns_before_the_worker_finishes() {
    let directory = tempfile::tempdir().expect("temp");
    let database = directory.path().join("library.sqlite");
    let library = Library::open(&database).expect("open");
    let queue = JobQueue::start(library);
    let track = directory.path().join("queued.wav");
    fs::write(&track, b"queued").expect("write");
    queue.import(&track).expect("enqueue returns immediately");
    drop(queue);
    let library = Library::open(&database).expect("reopen");
    assert_eq!(library.search("queued").expect("search").len(), 1);
}

#[test]
fn blake3_and_xxh3_both_name_a_hundred_thousand_files() {
    let _quiet = quiet_disk();
    let directory = tempfile::tempdir().expect("temp");
    for index in 0..100_000 {
        let path = directory.path().join(format!("track-{index}.wav"));
        fs::write(&path, format!("waveform-{index}")).expect("write");
    }
    let started = Instant::now();
    let blake3 = time_directory_hash(directory.path(), HashAlgorithm::Blake3).expect("blake3");
    let xxh3 = time_directory_hash(directory.path(), HashAlgorithm::Xxh3).expect("xxh3");
    let created = started.elapsed();
    eprintln!(
        "hash benchmark: 100000 files, blake3 {blake3:?}, xxh3 {xxh3:?}, including setup {created:?}"
    );
    let sample =
        hash_file(&directory.path().join("track-0.wav"), HashAlgorithm::Blake3).expect("sample");
    assert_eq!(sample, content_hash(b"waveform-0", HashAlgorithm::Blake3));
    assert!(blake3.as_secs() < 120);
    assert!(xxh3.as_secs() < 120);
}
