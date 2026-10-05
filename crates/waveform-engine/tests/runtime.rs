//! Runs on the process's main thread (`harness = false` in Cargo.toml), which
//! is JUCE's message thread on macOS and Windows.

use std::thread;
use std::time::Duration;

use waveform_engine::Runtime;

fn main() {
    let runtime = Runtime::start().expect("the runtime starts on the main thread");
    assert!(Runtime::start().is_err(), "a second runtime is refused");

    #[cfg(not(target_os = "linux"))]
    {
        assert!(
            runtime
                .ping_message_thread(Duration::from_millis(10))
                .is_err(),
            "pinging from the message thread is refused"
        );
        let unanswered = thread::scope(|scope| {
            scope
                .spawn(|| runtime.ping_message_thread(Duration::from_millis(50)))
                .join()
                .expect("the pinging thread does not panic")
        });
        assert_eq!(
            unanswered.expect("the ping is accepted"),
            None,
            "nothing services the message queue, so the ping times out"
        );
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        let round_trip = ping_while_servicing_messages(&runtime);
        assert!(round_trip.is_some(), "the ping is delivered");
    }

    drop(runtime);
    let restarted = Runtime::start().expect("the runtime starts again after stopping");
    drop(restarted);

    println!("runtime: all checks passed");
}

/// Pings from a worker thread. On macOS this thread services the main run
/// loop meanwhile, as the desktop app's event loop does.
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn ping_while_servicing_messages(runtime: &Runtime) -> Option<Duration> {
    thread::scope(|scope| {
        let pinger = scope.spawn(|| runtime.ping_message_thread(Duration::from_secs(5)));
        #[cfg(target_os = "macos")]
        while !pinger.is_finished() {
            main_run_loop::run_for(Duration::from_millis(5));
        }
        pinger
            .join()
            .expect("the pinging thread does not panic")
            .expect("the ping is accepted")
    })
}

#[cfg(target_os = "macos")]
#[allow(unsafe_code)]
mod main_run_loop {
    use std::ffi::c_void;
    use std::time::Duration;

    #[link(name = "CoreFoundation", kind = "framework")]
    unsafe extern "C" {
        static kCFRunLoopDefaultMode: *const c_void;
        fn CFRunLoopRunInMode(mode: *const c_void, seconds: f64, return_after_source: u8) -> i32;
    }

    pub fn run_for(duration: Duration) {
        // SAFETY: called on the main thread with CoreFoundation's own mode constant.
        unsafe {
            CFRunLoopRunInMode(kCFRunLoopDefaultMode, duration.as_secs_f64(), 1);
        }
    }
}
