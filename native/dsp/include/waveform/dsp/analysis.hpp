#pragma once

#include <string>
#include <vector>

namespace waveform::dsp {

/// Tempo, key and a beat grid for one deck. Empty key means the estimate was too weak.
struct Analysis {
    float bpm = 0.0f;
    std::string key;
    /// Beat times in seconds from the start of the analysed audio.
    std::vector<double> beats;
};

/// Estimates tempo and key from mono audio. Runs off the audio thread.
[[nodiscard]] Analysis analyse(const float* mono, int frames, double sampleRate);

} // namespace waveform::dsp
