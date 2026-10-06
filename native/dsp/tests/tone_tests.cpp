#include <waveform/dsp/tone.hpp>

#include <cmath>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

using Catch::Matchers::WithinAbs;

namespace {

int risingCrossings(const std::vector<float>& interleaved) {
    int crossings = 0;
    const auto frames = static_cast<int>(interleaved.size() / 2);
    for (int frame = 1; frame < frames; ++frame) {
        const float previous = interleaved[static_cast<size_t>(frame - 1) * 2];
        const float sample = interleaved[static_cast<size_t>(frame) * 2];
        if (previous <= 0.0f && sample > 0.0f) {
            ++crossings;
        }
    }
    return crossings;
}

} // namespace

TEST_CASE("A sine tone has the requested frequency and unit peak", "[tone]") {
    waveform::dsp::ToneSource tone;
    tone.prepare(48000.0);
    tone.setFrequency(440.0f);

    std::vector<float> buffer(48000 * 2);
    tone.render(buffer.data(), 48000);

    float peak = 0.0f;
    for (float sample : buffer) {
        peak = std::max(peak, std::abs(sample));
    }
    REQUIRE_THAT(peak, WithinAbs(1.0, 1.0e-4));
    REQUIRE_THAT(static_cast<double>(risingCrossings(buffer)), WithinAbs(440.0, 2.0));
    REQUIRE(buffer[0] == buffer[1]);
}

TEST_CASE("Resetting a tone starts the phase again", "[tone]") {
    waveform::dsp::ToneSource tone;
    tone.prepare(48000.0);
    std::vector<float> first(256);
    std::vector<float> second(256);
    tone.render(first.data(), 128);
    tone.reset();
    tone.render(second.data(), 128);
    REQUIRE(first == second);
}

TEST_CASE("Noise is not a sine", "[tone]") {
    waveform::dsp::ToneSource tone;
    tone.prepare(48000.0);
    tone.setNoise(true);
    std::vector<float> buffer(4096);
    tone.render(buffer.data(), 2048);
    REQUIRE(risingCrossings(buffer) > 20);
}
