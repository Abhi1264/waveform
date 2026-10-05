#include <waveform/engine/runtime.hpp>

#include <atomic>
#include <chrono>
#include <optional>
#include <stdexcept>
#include <thread>

#include <catch2/catch_test_macros.hpp>
#include <juce_events/juce_events.h>

using namespace std::chrono_literals;
using waveform::engine::Runtime;

namespace {

/// Pings from a worker thread. Where JUCE relies on the host's event loop
/// (macOS and Windows), this thread pumps messages in its place.
std::optional<std::chrono::microseconds> pingWhilePumping(const Runtime& runtime) {
    std::optional<std::chrono::microseconds> roundTrip;
    std::atomic<bool> finished{false};
    std::thread pinger([&] {
        roundTrip = runtime.pingMessageThread(5s);
        finished = true;
    });
#if !(JUCE_LINUX || JUCE_BSD)
    while (!finished) {
        juce::MessageManager::getInstance()->runDispatchLoopUntil(5);
    }
#endif
    pinger.join();
    return roundTrip;
}

} // namespace

TEST_CASE("Messages posted from another thread run on the message thread", "[runtime]") {
    const Runtime runtime;
    const auto roundTrip = pingWhilePumping(runtime);
    REQUIRE(roundTrip.has_value());
    CHECK(*roundTrip < 1s);
}

TEST_CASE("The runtime can be stopped and started again", "[runtime]") {
    for (int attempt = 0; attempt < 3; ++attempt) {
        const Runtime runtime;
        REQUIRE(pingWhilePumping(runtime).has_value());
    }
}

TEST_CASE("Only one runtime can exist at a time", "[runtime]") {
    const Runtime runtime;
    REQUIRE_THROWS_AS(Runtime{}, std::logic_error);
}

#if !(JUCE_LINUX || JUCE_BSD)

TEST_CASE("A ping times out when nothing services the message queue", "[runtime]") {
    const Runtime runtime;
    std::optional<std::chrono::microseconds> roundTrip = 0us;
    std::thread pinger([&] { roundTrip = runtime.pingMessageThread(50ms); });
    pinger.join();
    REQUIRE_FALSE(roundTrip.has_value());
}

TEST_CASE("Pinging from the message thread is refused", "[runtime]") {
    const Runtime runtime;
    REQUIRE_THROWS_AS(runtime.pingMessageThread(10ms), std::logic_error);
}

#endif

#if JUCE_MAC

TEST_CASE("On macOS the runtime refuses to start off the main thread", "[runtime]") {
    bool refused = false;
    std::thread starter([&] {
        try {
            const Runtime runtime;
        } catch (const std::logic_error&) {
            refused = true;
        }
    });
    starter.join();
    REQUIRE(refused);
}

#endif
