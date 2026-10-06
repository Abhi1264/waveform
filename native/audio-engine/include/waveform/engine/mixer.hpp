#pragma once

#include <waveform/dsp/tone.hpp>
#include <waveform/engine/command.hpp>
#include <waveform/engine/snapshot.hpp>

#include <vector>

namespace waveform::engine {

/// Two tone decks, a crossfader, and a master output.
///
/// `prepare` may allocate and runs off the audio thread. `apply` and `process`
/// do not: they are the audio callback.
class Mixer {
public:
    Mixer();

    void prepare(double sampleRate, int maxFrames);

    /// Applies every queued command, then mixes `frames` of stereo output into
    /// `interleavedStereo`. `frames` must be no greater than the prepared maximum.
    void process(const Command* commands, int commandCount, float* interleavedStereo, int frames,
                 EngineSnapshot& snapshot) noexcept;

    [[nodiscard]] int maxFrames() const noexcept { return maxFrames_; }
    [[nodiscard]] double sampleRate() const noexcept { return sampleRate_; }

private:
    struct Deck {
        dsp::ToneSource source;
        bool playing = false;
        bool loopEnabled = false;
        double positionSamples = 0.0;
        double loopStart = 0.0;
        double loopEnd = 0.0;
        float gainDb = 0.0f;
        float pitch = 1.0f;
        float eqDb[3] = {};
        float hotCues[8] = {};
        float bpm = 120.0f;
        float lowState = 0.0f;
    };

    void apply(const Command& command) noexcept;
    void renderDeck(Deck& deck, float* interleavedStereo, int frames, float& levelDb) noexcept;

    Deck decks_[4]{};
    float crossfader_ = 0.5f;
    double sampleRate_ = 48000.0;
    int maxFrames_ = 0;
    std::vector<float> scratch_;
};

} // namespace waveform::engine
