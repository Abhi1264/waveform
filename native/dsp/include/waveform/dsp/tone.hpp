#pragma once

#include <cstdint>

#include <waveform/dsp/audio_source.hpp>

namespace waveform::dsp {

/// A sine or white-noise generator. Used until a deck has prepared audio.
class ToneSource final : public AudioSource {
public:
    void prepare(double sampleRate) noexcept override;
    void render(float* interleavedStereo, int frames) noexcept override;
    void reset() noexcept override;

    void setFrequency(float hertz) noexcept;
    void setNoise(bool noise) noexcept;

    [[nodiscard]] float frequency() const noexcept { return frequency_; }
    [[nodiscard]] bool noise() const noexcept { return noise_; }

private:
    double sampleRate_ = 48000.0;
    double phase_ = 0.0;
    float frequency_ = 440.0f;
    bool noise_ = false;
    std::uint32_t rng_ = 0xA3C59AC3u;
};

} // namespace waveform::dsp
