use std::env;
use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("set by Cargo"));
    let repo_root = manifest_dir.join("../..");

    // Compiled before the engine libraries so that single-pass linkers see the
    // bridge first and then the libraries it calls.
    cxx_build::bridge("src/lib.rs")
        .file("bridge/engine_bridge.cc")
        .include(repo_root.join("native/audio-engine/include"))
        .include(repo_root.join("native/dsp/include"))
        .std("c++20")
        .compile("waveform_engine_bridge");

    let native = cmake::Config::new(&repo_root)
        .define("WAVEFORM_BUILD_TESTS", "OFF")
        .build();
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
        // JUCE names its Windows libraries with #pragma comment(lib), which the
        // MSVC linker picks up from the object files.
        _ => {}
    }
}
