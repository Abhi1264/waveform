#pragma once

namespace waveform::dsp {

/// How the two sides of a crossfader are blended.
enum class CrossfaderCurve {
    /// Gains change linearly; at the centre each side is 6 dB down.
    Linear,
    /// Equal-power blend; at the centre each side is 3 dB down and the summed
    /// power is constant across the travel.
    ConstantPower,
    /// Both sides stay at full level except in the last few percent of travel,
    /// as scratch DJs expect.
    Cut,
};

/// Fraction of the travel over which the Cut curve fades a side in or out.
inline constexpr float kCrossfaderCutWidth = 0.04f;

/// Linear gain multipliers for the left and right sides.
struct CrossfaderGains {
    float left;
    float right;
};

/// Returns the gains for a crossfader `position` from 0 (fully left) to 1
/// (fully right). Positions outside that range are clamped, and NaN is treated
/// as the centre.
///
/// Real-time safe: does not allocate, lock, or call into the system.
[[nodiscard]] CrossfaderGains crossfaderGains(float position, CrossfaderCurve curve) noexcept;

} // namespace waveform::dsp
