//! Safe Rust interface to Waveform's C++ audio engine (`native/audio-engine`).
//!
//! The engine is linked into the app process. Only build information and the
//! JUCE runtime's lifetime exist so far; audio arrives in Phase 3.

use std::thread::{self, ThreadId};
use std::time::Duration;

pub use ffi::BuildInfo;

// The bridge expands to the unsafe FFI glue; cxx checks every signature against
// the C++ declarations at build time.
#[allow(unsafe_code)]
#[cxx::bridge(namespace = "waveform::bridge")]
mod ffi {
    /// Describes this build of the engine.
    #[derive(Debug, Clone, PartialEq, Eq)]
    struct BuildInfo {
        /// The engine's version, for example "0.1.0".
        engine_version: String,
        /// The version of the linked JUCE library, as JUCE reports it.
        juce_version: String,
        /// The C++ compiler and its version.
        compiler: String,
        /// The CMake configuration, for example "Debug" or "Release".
        build_type: String,
    }

    unsafe extern "C++" {
        include!("waveform-engine/bridge/engine_bridge.h");

        #[namespace = "waveform::engine"]
        type Runtime;

        fn build_info() -> BuildInfo;
        fn operating_system_name() -> String;
        fn start_runtime() -> Result<UniquePtr<Runtime>>;
        fn ping_message_thread(runtime: &Runtime, timeout_ms: u32) -> Result<i64>;
    }
}

/// An error reported by the C++ engine.
#[derive(Debug, thiserror::Error)]
#[error("{0}")]
pub struct EngineError(String);

impl From<cxx::Exception> for EngineError {
    fn from(error: cxx::Exception) -> Self {
        Self(error.what().to_owned())
    }
}

/// Describes this build of the engine.
pub fn build_info() -> BuildInfo {
    ffi::build_info()
}

/// The operating system the engine is running on, as JUCE detects it, for
/// example "macOS 26.0".
pub fn operating_system_name() -> String {
    ffi::operating_system_name()
}

/// JUCE's message system, running for as long as this value lives.
///
/// On macOS and Windows, JUCE delivers messages through the host's event loop
/// on the main thread, so the runtime must be started on the main thread and
/// dropped there too. On Linux it runs a message thread of its own. Only one
/// runtime can exist at a time.
pub struct Runtime {
    inner: cxx::UniquePtr<ffi::Runtime>,
    owner: ThreadId,
}

// SAFETY: the C++ runtime can be pinged from any thread. Dropping it on the
// wrong thread is the one unsafe use, and Drop below refuses to do that.
#[allow(unsafe_code)]
unsafe impl Send for Runtime {}
#[allow(unsafe_code)]
unsafe impl Sync for Runtime {}

impl Runtime {
    /// Starts JUCE's message system. Fails if a runtime already exists, or on
    /// macOS if called off the main thread.
    pub fn start() -> Result<Self, EngineError> {
        Ok(Self {
            inner: ffi::start_runtime()?,
            owner: thread::current().id(),
        })
    }

    /// Posts a message to JUCE's message thread and waits for it to run.
    /// Returns the round-trip time, or `None` if the message was not delivered
    /// within `timeout`. Fails if called on the message thread itself.
    pub fn ping_message_thread(&self, timeout: Duration) -> Result<Option<Duration>, EngineError> {
        let timeout_ms = u32::try_from(timeout.as_millis()).unwrap_or(u32::MAX);
        let micros = ffi::ping_message_thread(&self.inner, timeout_ms)?;
        Ok(u64::try_from(micros).ok().map(Duration::from_micros))
    }
}

impl Drop for Runtime {
    fn drop(&mut self) {
        let off_message_thread = cfg!(any(target_os = "macos", target_os = "windows"))
            && thread::current().id() != self.owner;
        if off_message_thread {
            // Shutting JUCE down off its message thread would corrupt it, so
            // leak the runtime instead; the operating system reclaims it at exit.
            eprintln!(
                "waveform-engine: Runtime dropped off the main thread; JUCE was not shut down"
            );
            std::mem::forget(std::mem::replace(&mut self.inner, cxx::UniquePtr::null()));
        }
    }
}
