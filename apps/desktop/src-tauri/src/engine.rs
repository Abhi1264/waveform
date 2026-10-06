//! The audio engine as the frontend sees it.

use std::sync::atomic::Ordering;
use std::sync::{PoisonError, RwLock};
use std::time::Duration;

use serde::Serialize;
use specta::Type;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};
use waveform_engine::{Runtime, Session, Transport};

/// How long JUCE's message loop has to answer a ping before it counts as not
/// responding.
const PING_TIMEOUT_MS: u32 = 1000;

/// Owns the engine's JUCE runtime for the life of the app.
pub struct Engine {
    runtime: RwLock<Option<Runtime>>,
    session: std::sync::Mutex<Option<Session>>,
    start_error: Option<String>,
    watch_generation: std::sync::atomic::AtomicU64,
}

impl Engine {
    /// Starts JUCE's message system. Call on the main thread once Tauri's event
    /// loop exists, which is the case in `setup`. On macOS, JUCE must not start
    /// before Tauri has created the application object.
    pub fn start() -> Self {
        match Runtime::start() {
            Ok(runtime) => {
                let session = Session::start().ok();
                Self {
                    runtime: RwLock::new(Some(runtime)),
                    session: std::sync::Mutex::new(session),
                    start_error: None,
                    watch_generation: std::sync::atomic::AtomicU64::new(0),
                }
            }
            Err(error) => Self {
                runtime: RwLock::new(None),
                session: std::sync::Mutex::new(None),
                start_error: Some(error.to_string()),
                watch_generation: std::sync::atomic::AtomicU64::new(0),
            },
        }
    }

    /// Shuts JUCE down. Call on the main thread.
    pub fn stop(&self) {
        drop(
            self.session
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .take(),
        );
        let runtime = self
            .runtime
            .write()
            .unwrap_or_else(PoisonError::into_inner)
            .take();
        drop(runtime);
    }

    fn session(&self) -> Result<std::sync::MutexGuard<'_, Option<Session>>, String> {
        let guard = self
            .session
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if guard.is_none() {
            return Err(self
                .start_error
                .clone()
                .unwrap_or_else(|| "The audio engine is not running.".to_owned()));
        }
        Ok(guard)
    }

    /// Pings JUCE's message thread. Blocks for up to the ping timeout, so call
    /// it off the main thread.
    fn message_loop_status(&self) -> MessageLoopStatus {
        let runtime = self.runtime.read().unwrap_or_else(PoisonError::into_inner);
        let Some(runtime) = runtime.as_ref() else {
            return MessageLoopStatus::Unavailable {
                reason: self
                    .start_error
                    .clone()
                    .unwrap_or_else(|| "The engine has stopped.".to_owned()),
            };
        };

        match runtime.ping_message_thread(Duration::from_millis(PING_TIMEOUT_MS.into())) {
            Ok(Some(round_trip)) => MessageLoopStatus::Responding {
                round_trip_micros: u32::try_from(round_trip.as_micros()).unwrap_or(u32::MAX),
            },
            Ok(None) => MessageLoopStatus::NotResponding {
                timeout_millis: PING_TIMEOUT_MS,
            },
            Err(error) => MessageLoopStatus::Unavailable {
                reason: error.to_string(),
            },
        }
    }
}

/// Whether JUCE's message loop delivers messages. Device management, timers,
/// and engine callbacks all depend on it.
#[derive(Debug, Serialize, Type)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum MessageLoopStatus {
    #[serde(rename_all = "camelCase")]
    Responding { round_trip_micros: u32 },
    #[serde(rename_all = "camelCase")]
    NotResponding { timeout_millis: u32 },
    #[serde(rename_all = "camelCase")]
    Unavailable { reason: String },
}

/// Versions and health of the app and its audio engine.
#[derive(Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EngineInfo {
    app_version: String,
    engine_version: String,
    /// Reported by the linked JUCE library itself.
    juce_version: String,
    compiler: String,
    build_type: String,
    operating_system: String,
    architecture: String,
    tauri_version: String,
    /// Null when the system webview's version cannot be read.
    webview_version: Option<String>,
    message_loop: MessageLoopStatus,
}

/// Versions and health of the app and its audio engine, for the About view.
#[tauri::command(async)]
#[specta::specta]
pub fn engine_info(app: AppHandle, engine: State<'_, Engine>) -> EngineInfo {
    let build = waveform_engine::build_info();
    EngineInfo {
        app_version: app.package_info().version.to_string(),
        engine_version: build.engine_version,
        juce_version: build.juce_version,
        compiler: build.compiler,
        build_type: build.build_type,
        operating_system: waveform_engine::operating_system_name(),
        architecture: std::env::consts::ARCH.to_owned(),
        tauri_version: tauri::VERSION.to_owned(),
        webview_version: tauri::webview_version().ok(),
        message_loop: engine.message_loop_status(),
    }
}

/// Runs `--self-test`: checks that JUCE messages are delivered through Tauri's
/// event loop, prints the result, and exits with status 0 if they are.
pub fn spawn_self_test(app: AppHandle) {
    std::thread::spawn(move || {
        let engine = app.state::<Engine>();
        // The first ping waits for the event loop to start, so it measures
        // startup time; the second measures a running loop.
        let startup = engine.message_loop_status();
        let running = engine.message_loop_status();
        let passed = [&startup, &running]
            .iter()
            .all(|status| matches!(status, MessageLoopStatus::Responding { .. }));
        println!("Waveform self-test: JUCE message loop at startup: {startup:?}");
        println!("Waveform self-test: JUCE message loop when running: {running:?}");
        app.exit(if passed { 0 } else { 1 });
    });
}

/// One output the engine can open.
#[derive(Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OutputDevice {
    type_name: String,
    name: String,
}

/// Levels, transport and the open device, as the audio thread last published them.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioSnapshot {
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

fn published(snapshot: waveform_engine::AudioSnapshot) -> AudioSnapshot {
    AudioSnapshot {
        sample_rate: snapshot.sample_rate,
        buffer_size: snapshot.buffer_size,
        callback_count: snapshot.callback_count,
        xrun_count: snapshot.xrun_count,
        dropped_commands: snapshot.dropped_commands,
        deck_a_position_seconds: snapshot.deck_a_position_seconds,
        deck_b_position_seconds: snapshot.deck_b_position_seconds,
        deck_a_gain_db: snapshot.deck_a_gain_db,
        deck_b_gain_db: snapshot.deck_b_gain_db,
        deck_a_level_db: snapshot.deck_a_level_db,
        deck_b_level_db: snapshot.deck_b_level_db,
        master_level_db: snapshot.master_level_db,
        crossfader: snapshot.crossfader,
        deck_a_playing: snapshot.deck_a_playing,
        deck_b_playing: snapshot.deck_b_playing,
        device_open: snapshot.device_open,
        device_name: snapshot.device_name,
    }
}

fn with_session<T>(
    engine: &Engine,
    body: impl FnOnce(&mut Session) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = engine.session()?;
    let session = guard.as_mut().expect("checked");
    body(session)
}

/// Output devices the host reports.
#[tauri::command]
#[specta::specta]
pub fn list_output_devices(engine: State<'_, Engine>) -> Result<Vec<OutputDevice>, String> {
    let guard = engine.session()?;
    Ok(guard
        .as_ref()
        .expect("checked")
        .output_devices()
        .into_iter()
        .map(|device| OutputDevice {
            type_name: device.type_name,
            name: device.name,
        })
        .collect())
}

/// Opens the default output and starts the tone decks' callback.
#[tauri::command]
#[specta::specta]
pub fn open_default_output(engine: State<'_, Engine>) -> Result<(), String> {
    with_session(&engine, |session| {
        session
            .open_default_output()
            .map_err(|error| error.to_string())
    })
}

/// Opens a named output.
#[tauri::command]
#[specta::specta]
pub fn open_output(engine: State<'_, Engine>, name: String) -> Result<(), String> {
    with_session(&engine, |session| {
        session
            .open_output(&name)
            .map_err(|error| error.to_string())
    })
}

/// Closes the output device.
#[tauri::command]
#[specta::specta]
pub fn close_output(engine: State<'_, Engine>) -> Result<(), String> {
    with_session(&engine, |session| {
        session.close();
        Ok(())
    })
}

fn transport(engine: &Engine, command: Transport, deck: u8, value: f32) -> Result<(), String> {
    with_session(engine, |session| {
        session
            .submit(command, deck, value)
            .map_err(|error| error.to_string())
    })
}

/// Starts a tone deck. `deck` is 0 or 1.
#[tauri::command]
#[specta::specta]
pub fn play_deck(engine: State<'_, Engine>, deck: u8) -> Result<(), String> {
    transport(&engine, Transport::Play, deck, 0.0)
}

/// Pauses a tone deck.
#[tauri::command]
#[specta::specta]
pub fn pause_deck(engine: State<'_, Engine>, deck: u8) -> Result<(), String> {
    transport(&engine, Transport::Pause, deck, 0.0)
}

/// Stops a tone deck and returns it to the start.
#[tauri::command]
#[specta::specta]
pub fn cue_deck(engine: State<'_, Engine>, deck: u8) -> Result<(), String> {
    transport(&engine, Transport::Cue, deck, 0.0)
}

/// Sets a deck's gain in decibels.
#[tauri::command]
#[specta::specta]
pub fn set_deck_gain(engine: State<'_, Engine>, deck: u8, decibels: f32) -> Result<(), String> {
    transport(&engine, Transport::SetGainDb, deck, decibels)
}

/// Moves the crossfader. 0 is fully deck A, 1 is fully deck B.
#[tauri::command]
#[specta::specta]
pub fn set_crossfader(engine: State<'_, Engine>, position: f32) -> Result<(), String> {
    transport(&engine, Transport::SetCrossfader, 0, position)
}

/// The latest engine snapshot.
#[tauri::command]
#[specta::specta]
pub fn audio_snapshot(engine: State<'_, Engine>) -> Result<AudioSnapshot, String> {
    let guard = engine.session()?;
    Ok(published(guard.as_ref().expect("checked").snapshot()))
}

/// Streams snapshots until the next call replaces it, or the webview goes away.
#[tauri::command]
#[specta::specta]
pub fn watch_audio(app: AppHandle, channel: Channel<AudioSnapshot>) {
    let engine = app.state::<Engine>();
    let generation = engine.watch_generation.fetch_add(1, Ordering::Relaxed) + 1;
    std::thread::spawn(move || {
        loop {
            let engine = app.state::<Engine>();
            if engine.watch_generation.load(Ordering::Relaxed) != generation {
                break;
            }
            let snapshot = engine
                .session
                .lock()
                .ok()
                .and_then(|guard| guard.as_ref().map(|session| published(session.snapshot())));
            let Some(snapshot) = snapshot else {
                break;
            };
            if channel.send(snapshot).is_err() {
                break;
            }
            std::thread::sleep(Duration::from_millis(33));
        }
    });
}
