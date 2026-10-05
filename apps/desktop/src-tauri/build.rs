fn main() {
    // Listing the app's commands makes each one need an explicit permission in
    // capabilities/, instead of being callable by every window by default.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["engine_info"])),
    )
    .expect("tauri-build failed");
}
