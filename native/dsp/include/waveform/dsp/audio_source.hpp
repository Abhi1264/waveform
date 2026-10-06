#pragma once

namespace waveform::dsp {

/// Something a deck can read. Implementations are prepared off the audio thread
/// and `render` runs on it, so `render` must not allocate, lock, or throw.
class AudioSource {
public:
    virtual ~AudioSource() = default;

    virtual void prepare(double sampleRate) noexcept = 0;
    /// Interleaved stereo, `frames` pairs. The caller owns the buffer.
    virtual void render(float* interleavedStereo, int frames) noexcept = 0;
    virtual void reset() noexcept = 0;
};

} // namespace waveform::dsp
