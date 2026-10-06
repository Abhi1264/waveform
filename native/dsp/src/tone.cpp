#include <waveform/dsp/tone.hpp>

#include <cmath>
#include <cstdint>
#include <numbers>

namespace waveform::dsp {

void ToneSource::prepare(double sampleRate) noexcept {
    if (sampleRate > 0.0) {
        sampleRate_ = sampleRate;
    }
}

void ToneSource::reset() noexcept {
    phase_ = 0.0;
}

void ToneSource::setFrequency(float hertz) noexcept {
    if (hertz > 0.0f && hertz < 20000.0f) {
        frequency_ = hertz;
    }
}

void ToneSource::setNoise(bool noise) noexcept {
    noise_ = noise;
}

void ToneSource::render(float* interleavedStereo, int frames) noexcept {
    if (interleavedStereo == nullptr || frames <= 0) {
        return;
    }

    if (noise_) {
        for (int frame = 0; frame < frames; ++frame) {
            rng_ ^= rng_ << 13;
            rng_ ^= rng_ >> 17;
            rng_ ^= rng_ << 5;
            const float sample =
                static_cast<float>(static_cast<std::int32_t>(rng_)) / static_cast<float>(INT32_MAX);
            interleavedStereo[frame * 2] = sample;
            interleavedStereo[frame * 2 + 1] = sample;
        }
        return;
    }

    const double step = 2.0 * std::numbers::pi * static_cast<double>(frequency_) / sampleRate_;
    for (int frame = 0; frame < frames; ++frame) {
        const float sample = static_cast<float>(std::sin(phase_));
        phase_ += step;
        if (phase_ > 2.0 * std::numbers::pi) {
            phase_ -= 2.0 * std::numbers::pi;
        }
        interleavedStereo[frame * 2] = sample;
        interleavedStereo[frame * 2 + 1] = sample;
    }
}

} // namespace waveform::dsp
