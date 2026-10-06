#pragma once

#include <waveform/engine/snapshot.hpp>

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace waveform::engine {

struct OutputDevice {
    std::string typeName;
    std::string name;
};

/// Opens an output device and runs the mixer on its callback.
///
/// The JUCE runtime must already be running, and this object must be destroyed
/// before that runtime. Device calls are marshalled onto JUCE's message thread.
class Session {
public:
    Session();
    ~Session();

    Session(const Session&) = delete;
    Session& operator=(const Session&) = delete;

    [[nodiscard]] std::vector<OutputDevice> outputDevices() const;

    /// Empty string on success. A non-empty string is the device's own error.
    [[nodiscard]] std::string openDefaultOutput();
    [[nodiscard]] std::string openOutput(const std::string& name);
    void close();

    void play(int deck);
    void pause(int deck);
    void cue(int deck);
    void setGainDb(int deck, float decibels);
    void setCrossfader(float position);
    void setToneFrequency(int deck, float hertz);
    void setNoise(int deck, bool noise);
    /// `kind` is a `CommandKind`. `slot` selects an EQ band or hot cue.
    void command(std::uint8_t kind, int deck, float value, float value2, std::uint8_t slot);

    [[nodiscard]] EngineSnapshot snapshot() const;

    /// Mixes without a device. `sampleRate` and `frames` may differ from the
    /// open device; a change of rate rebuilds the mixer the way a device would.
    void processOffline(float* interleavedStereo, int frames, double sampleRate);

    /// The same notifications a device sends when it is unplugged or reopened.
    void simulateDeviceStopped();
    void simulateDeviceStarted(double sampleRate, int bufferSize, const std::string& name);

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace waveform::engine
