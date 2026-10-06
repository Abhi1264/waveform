#pragma once

#include <array>
#include <atomic>
#include <cstddef>
#include <type_traits>

namespace waveform::engine {

/// A bounded single-producer, single-consumer queue. `push` and `pop` do not
/// allocate or lock. Capacity must be a power of two.
template <typename T, std::size_t Capacity>
class CommandQueue {
    static_assert(std::is_trivially_copyable_v<T>);
    static_assert(Capacity >= 2 && (Capacity & (Capacity - 1)) == 0);

public:
    [[nodiscard]] bool push(const T& item) noexcept {
        const auto tail = tail_.load(std::memory_order_relaxed);
        const auto next = (tail + 1) & mask_;
        if (next == head_.load(std::memory_order_acquire)) {
            return false;
        }
        slots_[tail] = item;
        tail_.store(next, std::memory_order_release);
        return true;
    }

    [[nodiscard]] bool pop(T& item) noexcept {
        const auto head = head_.load(std::memory_order_relaxed);
        if (head == tail_.load(std::memory_order_acquire)) {
            return false;
        }
        item = slots_[head];
        head_.store((head + 1) & mask_, std::memory_order_release);
        return true;
    }

private:
    static constexpr std::size_t mask_ = Capacity - 1;
    std::array<T, Capacity> slots_{};
    std::atomic<std::size_t> head_{0};
    std::atomic<std::size_t> tail_{0};
};

} // namespace waveform::engine
