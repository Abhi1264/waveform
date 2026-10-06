fn main() {
    // Listing the app's commands makes each one need an explicit permission in
    // capabilities/, instead of being callable by every window by default.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "engine_info",
            "list_output_devices",
            "open_default_output",
            "open_output",
            "close_output",
            "play_deck",
            "pause_deck",
            "cue_deck",
            "set_deck_gain",
            "set_crossfader",
            "audio_snapshot",
            "watch_audio",
        ]),
    ))
    .expect("tauri-build failed");
}
