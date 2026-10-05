#pragma once

#include <chrono>
#include <memory>
#include <optional>

namespace waveform::engine {

/// Starts JUCE's message system and shuts it down again on destruction.
///
/// On macOS and Windows, JUCE delivers messages through the host's event loop
/// on the main thread, so the runtime must be created and destroyed on the main
/// thread while that loop runs. On Linux the runtime runs JUCE's message loop
/// on a thread of its own. Only one runtime can exist at a time.
class Runtime {
public:
    /// Throws std::logic_error if a runtime already exists, or on macOS if
    /// called off the main thread.
    Runtime();
    ~Runtime();

    Runtime(const Runtime&) = delete;
    Runtime& operator=(const Runtime&) = delete;
    Runtime(Runtime&&) = delete;
    Runtime& operator=(Runtime&&) = delete;

    /// Posts a message to JUCE's message thread and waits for it to run.
    /// Returns the round-trip time, or nothing if the message was not
    /// delivered within `timeout`.
    ///
    /// Throws std::logic_error if called on the message thread, which would
    /// otherwise wait on itself.
    [[nodiscard]] std::optional<std::chrono::microseconds>
    pingMessageThread(std::chrono::milliseconds timeout) const;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace waveform::engine
