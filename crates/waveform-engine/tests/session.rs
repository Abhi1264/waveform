//! Runs on the process's main thread, like `runtime.rs`.

use std::time::Duration;

use waveform_engine::{Runtime, Session, Transport};

fn rms(samples: &[f32]) -> f32 {
    let sum: f32 = samples.iter().map(|sample| sample * sample).sum();
    (sum / samples.len() as f32).sqrt()
}

fn main() {
    let runtime = Runtime::start().expect("the runtime starts on the main thread");
    let mut session = Session::start().expect("the session starts");

    let error = session
        .submit(Transport::Play, 4, 0.0)
        .expect_err("only four decks");
    assert!(error.to_string().contains("four decks"));

    session.submit(Transport::Play, 0, 0.0).expect("play");
    let audio = session.render_offline(4_800, 48_000.0);
    let snapshot = session.snapshot();
    assert!(snapshot.deck_a_playing);
    assert!(snapshot.deck_a_position_seconds > 0.0);
    assert!(rms(&audio) > 0.2, "a playing tone is audible in the render");

    session.submit(Transport::Cue, 0, 0.0).expect("cue");
    let _ = session.render_offline(256, 48_000.0);
    let cued = session.snapshot();
    assert!(!cued.deck_a_playing);
    assert_eq!(cued.deck_a_position_seconds, 0.0);

    if session.open_default_output().is_ok() {
        session
            .submit(Transport::Play, 0, 0.0)
            .expect("play through the device");
        let mut heard = false;
        for _ in 0..25 {
            std::thread::sleep(Duration::from_millis(20));
            let live = session.snapshot();
            if live.device_open && live.callback_count > 0 {
                heard = true;
                break;
            }
        }
        assert!(heard, "the default output runs the callback");
        session.close();
    }

    drop(session);
    drop(runtime);
}
