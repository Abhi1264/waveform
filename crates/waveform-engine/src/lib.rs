//! Safe Rust interface to Waveform's C++ audio engine (`native/audio-engine`).
//!
//! The engine is linked into the app process. Callers send fixed-size commands
//! and read snapshots; the audio thread never calls back into Rust.

use std::thread::{self, ThreadId};
use std::time::Duration;

pub use ffi::{AudioSnapshot, BuildInfo, OutputDevice};

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

    /// An output the engine can open.
    #[derive(Debug, Clone, PartialEq, Eq)]
    struct OutputDevice {
        type_name: String,
        name: String,
    }

    /// The latest state published by the audio thread.
    #[derive(Debug, Clone, PartialEq)]
    struct AudioSnapshot {
        sample_rate: u32,
        buffer_size: u32,
        callback_count: u32,
        xrun_count: u32,
        dropped_commands: u32,
        deck_a_position_seconds: f32,
        deck_b_position_seconds: f32,
        deck_a_gain_db: f32,
        deck_b_gain_db: f32,
        deck_a_level_db: f32,
        deck_b_level_db: f32,
        master_level_db: f32,
        crossfader: f32,
        deck_a_playing: bool,
        deck_b_playing: bool,
        device_open: bool,
        device_name: String,
    }

    unsafe extern "C++" {
        include!("waveform-engine/bridge/engine_bridge.h");

        #[namespace = "waveform::engine"]
        type Runtime;
        #[namespace = "waveform::engine"]
        type Session;

        fn build_info() -> BuildInfo;
        fn operating_system_name() -> String;
        fn start_runtime() -> Result<UniquePtr<Runtime>>;
        fn ping_message_thread(runtime: &Runtime, timeout_ms: u32) -> Result<i64>;

        fn start_session() -> Result<UniquePtr<Session>>;
        fn list_output_devices(session: &Session) -> Vec<OutputDevice>;
        fn open_default_output(session: Pin<&mut Session>) -> String;
        fn open_named_output(session: Pin<&mut Session>, name: &str) -> String;
        fn close_output(session: Pin<&mut Session>);
        fn submit_transport(session: Pin<&mut Session>, kind: u8, deck: u8, value: f32);
        fn submit_command(
            session: Pin<&mut Session>,
            kind: u8,
            deck: u8,
            value: f32,
            value2: f32,
            slot: u8,
        );
        fn read_snapshot(session: &Session) -> AudioSnapshot;
        fn render_offline(session: Pin<&mut Session>, interleaved: &mut [f32], sample_rate: f64);
        fn load_deck_file(session: Pin<&mut Session>, deck: u8, path: &str) -> String;
        fn deck_peaks(session: &Session, deck: u8) -> Vec<f32>;
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

/// Which command to send a deck.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Transport {
    Play = 0,
    Pause = 1,
    Cue = 2,
    SetGainDb = 3,
    SetCrossfader = 4,
    SetToneFrequency = 5,
    SetNoise = 6,
    SetPitch = 7,
    SetEq = 8,
    SetLoop = 9,
    SetHotCue = 10,
    JumpHotCue = 11,
    Sync = 12,
}

/// Two tone decks and an output device. Requires a running [`Runtime`].
pub struct Session {
    inner: cxx::UniquePtr<ffi::Session>,
}

// SAFETY: commands are serialised inside the C++ session. Snapshots are
// published without sharing mutable aliases with Rust.
#[allow(unsafe_code)]
unsafe impl Send for Session {}
#[allow(unsafe_code)]
unsafe impl Sync for Session {}

impl Session {
    /// Creates a session. The runtime must outlive it.
    pub fn start() -> Result<Self, EngineError> {
        Ok(Self {
            inner: ffi::start_session()?,
        })
    }

    /// Output devices the host currently reports.
    pub fn output_devices(&self) -> Vec<OutputDevice> {
        ffi::list_output_devices(&self.inner)
    }

    /// Opens the default output. The error string is empty on success.
    pub fn open_default_output(&mut self) -> Result<(), EngineError> {
        empty_is_ok(ffi::open_default_output(self.inner.pin_mut()))
    }

    /// Opens a named output. The error string is empty on success.
    pub fn open_output(&mut self, name: &str) -> Result<(), EngineError> {
        empty_is_ok(ffi::open_named_output(self.inner.pin_mut(), name))
    }

    /// Closes the output device.
    pub fn close(&mut self) {
        ffi::close_output(self.inner.pin_mut());
    }

    /// Sends a command to one deck, or to the crossfader when `deck` is ignored.
    pub fn submit(&mut self, command: Transport, deck: u8, value: f32) -> Result<(), EngineError> {
        if !matches!(command, Transport::SetCrossfader) && deck > 3 {
            return Err(EngineError(
                "Waveform has four decks, numbered 0 to 3.".into(),
            ));
        }
        ffi::submit_transport(self.inner.pin_mut(), command as u8, deck, value);
        Ok(())
    }

    /// A mix command with a second value and a slot, for EQ, loops and hot cues.
    pub fn command(
        &mut self,
        command: Transport,
        deck: u8,
        value: f32,
        value2: f32,
        slot: u8,
    ) -> Result<(), EngineError> {
        if deck > 3 {
            return Err(EngineError(
                "Waveform has four decks, numbered 0 to 3.".into(),
            ));
        }
        ffi::submit_command(
            self.inner.pin_mut(),
            command as u8,
            deck,
            value,
            value2,
            slot,
        );
        Ok(())
    }

    /// The latest snapshot. Cheap, and safe to call from a UI thread.
    pub fn snapshot(&self) -> AudioSnapshot {
        ffi::read_snapshot(&self.inner)
    }

    /// Decodes `path` onto a deck. The loader thread fills chunks; this returns
    /// once the file has been opened and its peaks are known.
    pub fn load_file(&mut self, deck: u8, path: &str) -> Result<(), EngineError> {
        if deck > 3 {
            return Err(EngineError(
                "Waveform has four decks, numbered 0 to 3.".into(),
            ));
        }
        empty_is_ok(ffi::load_deck_file(self.inner.pin_mut(), deck, path))
    }

    /// Interleaved min/max peak pairs for a loaded file.
    pub fn peaks(&self, deck: u8) -> Vec<f32> {
        ffi::deck_peaks(&self.inner, deck)
    }

    /// Mixes `frames` of stereo audio without opening a device.
    pub fn render_offline(&mut self, frames: usize, sample_rate: f64) -> Vec<f32> {
        let mut interleaved = vec![0.0; frames.saturating_mul(2)];
        ffi::render_offline(self.inner.pin_mut(), &mut interleaved, sample_rate);
        interleaved
    }
}

fn empty_is_ok(error: String) -> Result<(), EngineError> {
    if error.is_empty() {
        Ok(())
    } else {
        Err(EngineError(error))
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
