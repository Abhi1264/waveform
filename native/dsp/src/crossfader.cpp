#include <waveform/dsp/crossfader.hpp>

#include <algorithm>
#include <cmath>
#include <numbers>

namespace waveform::dsp {

namespace {

float clampPosition(float position) noexcept {
    if (std::isnan(position)) {
        return 0.5f;
    }
    return std::clamp(position, 0.0f, 1.0f);
}

/// Equal-power gain for a side that is `amount` of the way open, from 0 to 1.
/// sin() reaches exactly 0 and 1 at the ends, so the endpoints are exact.
float equalPower(float amount) noexcept {
    return std::sin(amount * (std::numbers::pi_v<float> / 2.0f));
}

} // namespace

CrossfaderGains crossfaderGains(float position, CrossfaderCurve curve) noexcept {
    const float p = clampPosition(position);

    switch (curve) {
    case CrossfaderCurve::Linear:
        return {1.0f - p, p};
    case CrossfaderCurve::ConstantPower:
        return {equalPower(1.0f - p), equalPower(p)};
    case CrossfaderCurve::Cut:
        return {equalPower(std::min(1.0f, (1.0f - p) / kCrossfaderCutWidth)),
                equalPower(std::min(1.0f, p / kCrossfaderCutWidth))};
    }

    // Only reachable with a value cast from outside the enumeration.
    return {1.0f - p, p};
}

} // namespace waveform::dsp
