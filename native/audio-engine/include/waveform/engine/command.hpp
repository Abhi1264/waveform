#pragma once

#include <cstdint>

namespace waveform::engine {

/// A fixed-size message for the audio thread. Producers are serialised before
/// these are queued, so the queue itself has one producer.
enum class CommandKind : std::uint8_t {
    Play,
    Pause,
    Cue,
    SetGainDb,
    SetCrossfader,
    SetToneFrequency,
    SetNoise,
    /// `value` is a playback rate, 1 at the original tempo.
    SetPitch,
    /// `slot` is 0 low, 1 mid, 2 high. `value` is decibels.
    SetEq,
    /// `value` is the loop start in seconds, `value2` the end. `slot` 1 enables it.
    SetLoop,
    /// `slot` is the hot-cue index. `value` is seconds.
    SetHotCue,
    JumpHotCue,
    /// Match this deck's pitch to the other deck's tempo.
    Sync,
    /// `value` is a position in seconds.
    Seek,
    /// `value` is a number of beats, and may be negative.
    BeatJump,
    /// `slot` 0 is a low-pass amount, 1 delay mix, 2 reverb mix. `value` is 0 to 1.
    SetEffect,
    /// `value` at least 0.5 arms the master recording.
    ArmRecord,
    /// Starts the built-in sampler pad from the beginning.
    TriggerSampler,
    /// `value` is a linear gain for a device input, 0 to 1.
    SetInputGain,
};

struct Command {
    CommandKind kind = CommandKind::Pause;
    /// 0 or 1. Ignored for SetCrossfader.
    std::uint8_t deck = 0;
    float value = 0.0f;
    float value2 = 0.0f;
    std::uint8_t slot = 0;
};

} // namespace waveform::engine
