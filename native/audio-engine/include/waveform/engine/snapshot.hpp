#pragma once

#include <atomic>
#include <cstdint>
#include <cstring>
#include <type_traits>

namespace waveform::engine {

/// What the audio thread last published. Plain bytes, so it can cross the
/// real-time boundary without allocation.
struct EngineSnapshot {
    std::uint32_t sampleRate = 48000;
    std::uint32_t bufferSize = 0;
    std::uint32_t callbackCount = 0;
    std::uint32_t xrunCount = 0;
    std::uint32_t droppedCommands = 0;
    float positionSeconds[2] = {};
    float gainDb[2] = {0.0f, 0.0f};
    float levelDb[2] = {-100.0f, -100.0f};
    float masterLevelDb = -100.0f;
    float crossfader = 0.5f;
    std::uint8_t playing[2] = {};
    std::uint8_t deviceOpen = 0;
    std::uint8_t usingNoise[2] = {};
    char deviceName[64] = {};
};

static_assert(std::is_trivially_copyable_v<EngineSnapshot>);

/// Publishes a snapshot from the audio thread and lets any other thread read
/// the latest complete copy. The transfer is a seqlock over atomic words, so
/// neither side waits.
class SnapshotPublisher {
public:
    void publish(const EngineSnapshot& snapshot) noexcept {
        Raw raw{};
        std::memcpy(raw.words, &snapshot, sizeof(snapshot));
        sequence_.fetch_add(1, std::memory_order_release);
        for (std::size_t index = 0; index < kWords; ++index) {
            words_[index].store(raw.words[index], std::memory_order_relaxed);
        }
        sequence_.fetch_add(1, std::memory_order_release);
    }

    [[nodiscard]] EngineSnapshot read() const noexcept {
        Raw raw{};
        std::uint32_t before = 0;
        std::uint32_t after = 1;
        while (before != after || (before & 1U) != 0U) {
            before = sequence_.load(std::memory_order_acquire);
            if ((before & 1U) != 0U) {
                continue;
            }
            for (std::size_t index = 0; index < kWords; ++index) {
                raw.words[index] = words_[index].load(std::memory_order_relaxed);
            }
            std::atomic_thread_fence(std::memory_order_acquire);
            after = sequence_.load(std::memory_order_acquire);
        }
        EngineSnapshot snapshot{};
        std::memcpy(&snapshot, raw.words, sizeof(snapshot));
        return snapshot;
    }

private:
    static constexpr std::size_t kWords = (sizeof(EngineSnapshot) + 7) / 8;

    struct Raw {
        std::uint64_t words[kWords] = {};
    };

    std::atomic<std::uint64_t> words_[kWords]{};
    std::atomic<std::uint32_t> sequence_{0};
};

} // namespace waveform::engine
