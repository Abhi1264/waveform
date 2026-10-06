#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <vector>

#include <waveform/dsp/tone.hpp>
#include <waveform/engine/command.hpp>
#include <waveform/engine/prepared_audio.hpp>
#include <waveform/engine/snapshot.hpp>

namespace waveform::engine {

/// Two tone decks, a crossfader, and a master output.
///
/// `prepare` may allocate and runs off the audio thread. `apply` and `process`
/// do not: they are the audio callback.
class Mixer {
public:
    Mixer();

    void prepare(double sampleRate, int maxFrames);

    /// Decodes `path` on a loader thread into deck `deck`. Empty string on success.
    [[nodiscard]] std::string loadFile(int deck, const std::string& path);
    /// Decodes `path` into a stem slot. Slots sum into the master and do not
    /// replace a deck, so the full mix can keep playing. Empty string on success.
    [[nodiscard]] std::string loadStem(int slot, const std::string& path);
    [[nodiscard]] std::vector<float> peaks(int deck) const;
    [[nodiscard]] float bpm(int deck) const;
    [[nodiscard]] std::string key(int deck) const;
    [[nodiscard]] double duration(int deck) const;
    /// Beat times in seconds. Empty until a file has been analysed.
    [[nodiscard]] std::vector<float> beats(int deck) const;

    /// Adds a device input onto an already-rendered stereo buffer. No allocation.
    void addInput(float* interleavedStereo, const float* const* input, int channels,
                  int frames) noexcept;

    /// Copies the master recording into `destination`. Returns the number of samples.
    [[nodiscard]] int copyRecording(float* destination, int capacity) const;
    [[nodiscard]] int recordingCapacity() const noexcept;

    /// Applies one MIDI channel message on the audio thread. CC 1 is the crossfader.
    void applyMidi(std::uint8_t status, std::uint8_t data1, std::uint8_t data2) noexcept;

    /// Applies every queued command, then mixes `frames` of stereo output into
    /// `interleavedStereo`. `frames` must be no greater than the prepared maximum.
    void process(const Command* commands, int commandCount, float* interleavedStereo, int frames,
                 EngineSnapshot& snapshot) noexcept;

    [[nodiscard]] int maxFrames() const noexcept { return maxFrames_; }
    [[nodiscard]] double sampleRate() const noexcept { return sampleRate_; }

private:
    struct Deck {
        dsp::ToneSource source;
        PreparedAudio file;
        bool useFile = false;
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
        float filterAmount = 0.0f;
        float filterState = 0.0f;
        float delayMix = 0.0f;
        float reverbMix = 0.0f;
        float reverbState = 0.0f;
        int delayCursor = 0;
    };

    /// File playback that sums with the decks. Not a deck: the crossfader does not own it.
    struct Stem {
        PreparedAudio file;
        bool useFile = false;
        bool playing = false;
        float gain = 1.0f;
    };

    void apply(const Command& command) noexcept;
    void renderDeck(int deckIndex, Deck& deck, float* interleavedStereo, int frames,
                    float& levelDb) noexcept;
    void fillSampler() noexcept;

    Deck decks_[4]{};
    Stem stems_[4]{};
    float crossfader_ = 0.5f;
    float inputGain_ = 0.0f;
    bool recording_ = false;
    double sampleRate_ = 48000.0;
    int maxFrames_ = 0;
    int delayFrames_ = 1;
    int samplerFrames_ = 1;
    int samplerCursor_ = 1;
    std::atomic<int> recordCount_{0};
    std::vector<float> scratch_;
    std::vector<float> delay_;
    std::vector<float> record_;
    std::vector<float> sampler_;
};

} // namespace waveform::engine
