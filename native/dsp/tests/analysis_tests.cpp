#include <waveform/dsp/analysis.hpp>

#include <cmath>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

using Catch::Matchers::WithinAbs;

TEST_CASE("Clicks at 120 BPM are heard as 120", "[analysis]") {
    constexpr double kRate = 48000.0;
    constexpr int kFrames = 48000 * 4;
    std::vector<float> mono(static_cast<std::size_t>(kFrames));
    const int period = static_cast<int>(60.0 / 120.0 * kRate);
    for (int sample = 0; sample < kFrames; sample += period) {
        mono[static_cast<std::size_t>(sample)] = 1.0f;
    }
    const auto analysis = waveform::dsp::analyse(mono.data(), kFrames, kRate);
    REQUIRE_THAT(static_cast<double>(analysis.bpm), WithinAbs(120.0, 2.0));
    REQUIRE(analysis.beats.size() > 4);
}

TEST_CASE("A 440 Hz tone is the key of A", "[analysis]") {
    constexpr double kRate = 48000.0;
    constexpr int kFrames = 48000;
    std::vector<float> mono(static_cast<std::size_t>(kFrames));
    for (int index = 0; index < kFrames; ++index) {
        mono[static_cast<std::size_t>(index)] =
            static_cast<float>(std::sin(2.0 * 3.141592653589793 * 440.0 * index / kRate));
    }
    const auto analysis = waveform::dsp::analyse(mono.data(), kFrames, kRate);
    REQUIRE(analysis.key == "A");
}
