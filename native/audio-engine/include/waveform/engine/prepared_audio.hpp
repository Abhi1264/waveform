#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <thread>
#include <vector>

namespace waveform::engine {

/// A file decoded into fixed chunks ahead of the playhead.
///
/// The loader thread fills chunks. `render` only reads a chunk whose index has
/// been published, so it does not open the file, allocate, or lock.
class PreparedAudio {
public:
    PreparedAudio() = default;
    ~PreparedAudio();

    PreparedAudio(const PreparedAudio&) = delete;
    PreparedAudio& operator=(const PreparedAudio&) = delete;

    /// Starts a loader. Returns an empty string, or the reader error.
    [[nodiscard]] std::string load(const std::string& path);

    void render(float* interleavedStereo, int frames, float pitch) noexcept;
    void seek(double positionSamples) noexcept;
    void reset() noexcept;

    [[nodiscard]] double positionSamples() const noexcept;
    [[nodiscard]] bool ready() const noexcept;
    [[nodiscard]] std::vector<float> peaks() const;
    [[nodiscard]] float bpm() const noexcept { return bpm_; }
    [[nodiscard]] const std::string& key() const noexcept { return key_; }
    [[nodiscard]] const std::vector<double>& beats() const noexcept { return beats_; }
    [[nodiscard]] double durationSeconds() const noexcept;

private:
    void stopLoader();
    void loaderMain();

    static constexpr int kChunkFrames = 4096;
    static constexpr int kChunkCount = 8;

    struct Chunk {
        std::atomic<std::int64_t> readyFor{-1};
        float samples[static_cast<std::size_t>(kChunkFrames) * 2] = {};
    };

    Chunk chunks_[kChunkCount];
    std::vector<float> peaks_;
    std::vector<double> beats_;
    std::string key_;
    float bpm_ = 0.0f;
    std::atomic<double> position_{0.0};
    std::atomic<bool> stop_{false};
    std::atomic<bool> active_{false};
    double fileRate_ = 48000.0;
    std::int64_t fileLength_ = 0;
    std::string path_;
    std::thread loader_;
};

} // namespace waveform::engine
