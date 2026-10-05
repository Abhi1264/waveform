//! The audio engine as the frontend sees it.

use std::sync::{PoisonError, RwLock};
use std::time::Duration;

use serde::Serialize;
use specta::Type;
use tauri::{AppHandle, Manager, State};
use waveform_engine::Runtime;

/// How long JUCE's message loop has to answer a ping before it counts as not
/// responding.
const PING_TIMEOUT_MS: u32 = 1000;

/// Owns the engine's JUCE runtime for the life of the app.
pub struct Engine {
    runtime: RwLock<Option<Runtime>>,
    start_error: Option<String>,
}

impl Engine {
    /// Starts JUCE's message system. Call on the main thread once Tauri's event
    /// loop exists, which is the case in `setup`. On macOS, JUCE must not start
    /// before Tauri has created the application object.
    pub fn start() -> Self {
        match Runtime::start() {
            Ok(runtime) => Self {
                runtime: RwLock::new(Some(runtime)),
                start_error: None,
            },
            Err(error) => Self {
                runtime: RwLock::new(None),
                start_error: Some(error.to_string()),
            },
        }
    }

    /// Shuts JUCE down. Call on the main thread.
    pub fn stop(&self) {
        let runtime = self
            .runtime
            .write()
            .unwrap_or_else(PoisonError::into_inner)
            .take();
        drop(runtime);
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
