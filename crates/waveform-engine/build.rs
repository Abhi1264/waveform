use std::env;
use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("set by Cargo"));
    let repo_root = manifest_dir.join("../..");

    // Compiled before the engine libraries so that single-pass linkers see the
    // bridge first and then the libraries it calls.
    let mut bridge = cxx_build::bridge("src/lib.rs");
    bridge
        .file("bridge/engine_bridge.cc")
        .include(repo_root.join("native/audio-engine/include"))
        .include(repo_root.join("native/dsp/include"))
        .std("c++20");
    // Keep the bridge from pragma-commenting JUCE's ATL library. See
    // native/juce/CMakeLists.txt.
    if std::env::var("CARGO_CFG_TARGET_OS").ok().as_deref() == Some("windows") {
        bridge.define("JUCE_DONT_AUTOLINK_TO_WIN32_LIBRARIES", "1");
    }
    bridge.compile("waveform_engine_bridge");

    let mut native_build = cmake::Config::new(&repo_root);
    native_build.define("WAVEFORM_BUILD_TESTS", "OFF");
    // Debug defines `_DEBUG`, and JUCE then autolinks `comsuppwd.lib` (the
    // ATL debug CRT). Rust links `/MD` in every profile, and that debug
    // library is not what the desktop job can resolve. RelWithDebInfo keeps
    // the release CRT and `comsuppw.lib`, which the native CI job already uses.
    if std::env::var("CARGO_CFG_TARGET_OS").ok().as_deref() == Some("windows") {
        native_build.profile("RelWithDebInfo");
    }
    let native = native_build.build();
    println!(
        "cargo:rustc-link-search=native={}",
        native.join("lib").display()
    );
    println!("cargo:rustc-link-lib=static=waveform_engine");
    println!("cargo:rustc-link-lib=static=waveform_dsp");
    println!("cargo:rustc-link-lib=static=waveform_juce");

    link_system_libraries();

    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:rerun-if-changed=bridge");
    for path in ["CMakeLists.txt", "native"] {
        println!("cargo:rerun-if-changed={}", repo_root.join(path).display());
    }
    println!("cargo:rerun-if-env-changed=WAVEFORM_DOWNLOAD_CACHE");
}

/// The system libraries JUCE's modules declare (OSXFrameworks and linuxLibs in
/// each module header). CMake links these itself; Cargo needs them spelled out.
fn link_system_libraries() {
    match env::var("CARGO_CFG_TARGET_OS")
        .expect("set by Cargo")
        .as_str()
    {
        "macos" => {
            for framework in [
                "Accelerate",
                "AudioToolbox",
                "Cocoa",
                "CoreAudio",
                "CoreMIDI",
                "Foundation",
                "IOKit",
                "QuartzCore",
                "Security",
            ] {
                println!("cargo:rustc-link-lib=framework={framework}");
            }
        }
        "linux" => {
            for library in ["asound", "dl", "pthread", "rt", "stdc++"] {
                println!("cargo:rustc-link-lib={library}");
            }
        }
        // JUCE's autolink is off (see native/juce/CMakeLists.txt) so the ATL
        // `comsupp` library is not requested. Cargo still has to name the SDK
        // libraries that CMake would have pulled in.
        "windows" => {
            for library in [
                "advapi32", "cfgmgr32", "dbghelp", "ole32", "oleaut32", "shell32", "shcore",
                "shlwapi", "user32", "version", "wininet", "winmm", "ws2_32",
            ] {
                println!("cargo:rustc-link-lib={library}");
            }
        }
        _ => {}
    }
}
