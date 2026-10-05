#[test]
fn reports_the_engine_and_juce_versions() {
    let info = waveform_engine::build_info();
    // The engine's version comes from CMake; it must match the crate's.
    assert_eq!(info.engine_version, env!("CARGO_PKG_VERSION"));
    assert_eq!(info.juce_version, "9.0.3");
    assert!(!info.compiler.is_empty());
    assert!(!info.build_type.is_empty());
}

#[test]
fn names_the_operating_system() {
    let name = waveform_engine::operating_system_name();
    if cfg!(target_os = "macos") {
        assert!(name.starts_with("macOS "), "unexpected name {name:?}");
    } else {
        assert!(!name.is_empty());
    }
}
