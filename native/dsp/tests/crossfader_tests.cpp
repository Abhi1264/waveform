#include <waveform/dsp/crossfader.hpp>

#include <cmath>
#include <limits>

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

using Catch::Matchers::WithinAbs;
using waveform::dsp::CrossfaderCurve;
using waveform::dsp::crossfaderGains;
using waveform::dsp::kCrossfaderCutWidth;

namespace {

constexpr int kSteps = 4096;

float positionAt(int step) {
    return static_cast<float>(step) / static_cast<float>(kSteps);
}

void requireSameGains(float a, float b, CrossfaderCurve curve) {
    const auto gainsA = crossfaderGains(a, curve);
    const auto gainsB = crossfaderGains(b, curve);
    REQUIRE(gainsA.left == gainsB.left);
    REQUIRE(gainsA.right == gainsB.right);
}

} // namespace

TEST_CASE("Every curve stays between silence and unity, and moves one way", "[crossfader]") {
    const auto curve =
        GENERATE(CrossfaderCurve::Linear, CrossfaderCurve::ConstantPower, CrossfaderCurve::Cut);

    auto previous = crossfaderGains(0.0f, curve);
    for (int step = 0; step <= kSteps; ++step) {
        const auto gains = crossfaderGains(positionAt(step), curve);
        REQUIRE(gains.left >= 0.0f);
        REQUIRE(gains.left <= 1.0f);
        REQUIRE(gains.right >= 0.0f);
        REQUIRE(gains.right <= 1.0f);
        REQUIRE(gains.left <= previous.left);
        REQUIRE(gains.right >= previous.right);
        previous = gains;
    }
}

TEST_CASE("Every curve is symmetric and exact at the ends", "[crossfader]") {
    const auto curve =
        GENERATE(CrossfaderCurve::Linear, CrossfaderCurve::ConstantPower, CrossfaderCurve::Cut);

    for (int step = 0; step <= kSteps; ++step) {
        const auto gains = crossfaderGains(positionAt(step), curve);
        const auto mirrored = crossfaderGains(1.0f - positionAt(step), curve);
        REQUIRE_THAT(gains.left, WithinAbs(static_cast<double>(mirrored.right), 1e-6));
    }

    const auto fullyLeft = crossfaderGains(0.0f, curve);
    REQUIRE(fullyLeft.left == 1.0f);
    REQUIRE(fullyLeft.right == 0.0f);

    const auto fullyRight = crossfaderGains(1.0f, curve);
    REQUIRE(fullyRight.left == 0.0f);
    REQUIRE(fullyRight.right == 1.0f);
}

TEST_CASE("Linear gains always sum to unity", "[crossfader]") {
    for (int step = 0; step <= kSteps; ++step) {
        const auto gains = crossfaderGains(positionAt(step), CrossfaderCurve::Linear);
        REQUIRE_THAT(gains.left + gains.right, WithinAbs(1.0, 1e-6));
    }
    REQUIRE(crossfaderGains(0.5f, CrossfaderCurve::Linear).left == 0.5f);
}

TEST_CASE("Constant-power gains keep the summed power at unity", "[crossfader]") {
    for (int step = 0; step <= kSteps; ++step) {
        const auto gains = crossfaderGains(positionAt(step), CrossfaderCurve::ConstantPower);
        REQUIRE_THAT(gains.left * gains.left + gains.right * gains.right, WithinAbs(1.0, 1e-5));
    }

    const auto centre = crossfaderGains(0.5f, CrossfaderCurve::ConstantPower);
    REQUIRE_THAT(20.0 * std::log10(static_cast<double>(centre.left)), WithinAbs(-3.0103, 1e-3));
}

TEST_CASE("The cut curve keeps both sides at unity away from the edges", "[crossfader]") {
    for (int step = 0; step <= kSteps; ++step) {
        const float position = positionAt(step);
        if (position < kCrossfaderCutWidth || position > 1.0f - kCrossfaderCutWidth) {
            continue;
        }
        const auto gains = crossfaderGains(position, CrossfaderCurve::Cut);
        REQUIRE(gains.left == 1.0f);
        REQUIRE(gains.right == 1.0f);
    }

    const auto partlyIn = crossfaderGains(kCrossfaderCutWidth / 2.0f, CrossfaderCurve::Cut);
    REQUIRE(partlyIn.right > 0.0f);
    REQUIRE(partlyIn.right < 1.0f);
}

TEST_CASE("Out-of-range positions are clamped and NaN is the centre", "[crossfader]") {
    const auto curve =
        GENERATE(CrossfaderCurve::Linear, CrossfaderCurve::ConstantPower, CrossfaderCurve::Cut);
    constexpr float infinity = std::numeric_limits<float>::infinity();

    requireSameGains(-1.0f, 0.0f, curve);
    requireSameGains(-infinity, 0.0f, curve);
    requireSameGains(2.0f, 1.0f, curve);
    requireSameGains(infinity, 1.0f, curve);
    requireSameGains(std::numeric_limits<float>::quiet_NaN(), 0.5f, curve);
}
