#pragma once

#include <cmath>

namespace waveform::dsp {

/// Linear amplitude for a gain in decibels. −100 dB and below is silence.
/// Real-time safe.
[[nodiscard]] inline float decibelsToLinear(float decibels) noexcept {
    if (!(decibels > -100.0f)) {
        return 0.0f;
    }
    return std::pow(10.0f, decibels * 0.05f);
}

/// Decibels for a linear amplitude. Silence is reported as −100 dB.
/// Real-time safe.
[[nodiscard]] inline float linearToDecibels(float linear) noexcept {
    if (!(linear > 1.0e-5f)) {
        return -100.0f;
    }
    return 20.0f * std::log10(linear);
}

} // namespace waveform::dsp
