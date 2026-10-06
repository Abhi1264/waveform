#include <waveform/engine/runtime.hpp>
#include <waveform/engine/session.hpp>

#include <chrono>
#include <string>
#include <thread>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <juce_events/juce_events.h>

using namespace std::chrono_literals;

TEST_CASE("Unplugging a device clears it, and opening it again restores the rate", "[session]") {
    const waveform::engine::Runtime runtime;
    waveform::engine::Session session;
    session.simulateDeviceStarted(48000.0, 256, "Test output");
    auto snapshot = session.snapshot();
    REQUIRE(snapshot.deviceOpen == 1);
    REQUIRE(snapshot.sampleRate == 48000);
    REQUIRE(std::string(snapshot.deviceName) == "Test output");

    session.simulateDeviceStopped();
    snapshot = session.snapshot();
    REQUIRE(snapshot.deviceOpen == 0);
    REQUIRE(snapshot.bufferSize == 0);

    session.simulateDeviceStarted(96000.0, 128, "Test output");
    snapshot = session.snapshot();
    REQUIRE(snapshot.deviceOpen == 1);
    REQUIRE(snapshot.sampleRate == 96000);
    REQUIRE(snapshot.bufferSize == 128);
}

TEST_CASE("Offline playback follows play and cue", "[session]") {
    const waveform::engine::Runtime runtime;
    waveform::engine::Session session;
    std::vector<float> buffer(256 * 2);
    session.play(0);
    session.processOffline(buffer.data(), 256, 48000.0);
    const auto playing = session.snapshot();
    REQUIRE(playing.playing[0] == 1);
    REQUIRE(playing.positionSeconds[0] > 0.0f);

    session.cue(0);
    session.processOffline(buffer.data(), 256, 48000.0);
    const auto cued = session.snapshot();
    REQUIRE(cued.playing[0] == 0);
    REQUIRE(cued.positionSeconds[0] == 0.0f);
}

TEST_CASE("The default output device runs the callback", "[session][device]") {
    const waveform::engine::Runtime runtime;
    waveform::engine::Session session;
    const auto error = session.openDefaultOutput();
    if (!error.empty()) {
        SKIP(error);
    }
    session.play(0);
    bool heard = false;
    for (int attempt = 0; attempt < 50; ++attempt) {
#if !(JUCE_LINUX || JUCE_BSD)
        juce::MessageManager::getInstance()->runDispatchLoopUntil(20);
#else
        std::this_thread::sleep_for(20ms);
#endif
        if (session.snapshot().callbackCount > 0 && session.snapshot().deviceOpen == 1) {
            heard = true;
            break;
        }
    }
    REQUIRE(heard);
    REQUIRE(session.snapshot().sampleRate > 0);
    session.close();
}
