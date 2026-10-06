#include <waveform/dsp/analysis.hpp>

#include <algorithm>
#include <cmath>
#include <numbers>

namespace waveform::dsp {

namespace {

constexpr int kHop = 512;

float goertzel(const float* samples, int frames, double frequency, double sampleRate) {
    const double omega = 2.0 * std::numbers::pi * frequency / sampleRate;
    const double coefficient = 2.0 * std::cos(omega);
    double previous = 0.0;
    double before = 0.0;
    for (int index = 0; index < frames; ++index) {
        const double next = static_cast<double>(samples[index]) + coefficient * previous - before;
        before = previous;
        previous = next;
    }
    const double power = before * before + previous * previous - coefficient * before * previous;
    return static_cast<float>(std::sqrt(std::max(0.0, power)));
}

} // namespace

Analysis analyse(const float* mono, int frames, double sampleRate) {
    Analysis result;
    if (mono == nullptr || frames < kHop * 4 || sampleRate <= 0.0) {
        return result;
    }

    const int hops = frames / kHop;
    std::vector<float> flux(static_cast<std::size_t>(hops));
    float previousEnergy = 0.0f;
    for (int hop = 0; hop < hops; ++hop) {
        double energy = 0.0;
        const float* window = mono + static_cast<std::ptrdiff_t>(hop) * kHop;
        for (int index = 0; index < kHop; ++index) {
            energy += static_cast<double>(window[index]) * static_cast<double>(window[index]);
        }
        const float level = static_cast<float>(energy);
        flux[static_cast<std::size_t>(hop)] = std::max(0.0f, level - previousEnergy);
        previousEnergy = level;
    }

    float bestScore = 0.0f;
    float bestBpm = 0.0f;
    for (int bpm = 80; bpm <= 180; ++bpm) {
        const double period =
            60.0 / static_cast<double>(bpm) * sampleRate / static_cast<double>(kHop);
        const int lag = std::max(1, static_cast<int>(std::lround(period)));
        if (lag >= hops / 2) {
            continue;
        }
        double score = 0.0;
        for (int index = 0; index + lag < hops; ++index) {
            score += static_cast<double>(flux[static_cast<std::size_t>(index)]) *
                     static_cast<double>(flux[static_cast<std::size_t>(index + lag)]);
        }
        if (score > static_cast<double>(bestScore)) {
            bestScore = static_cast<float>(score);
            bestBpm = static_cast<float>(bpm);
        }
    }
    result.bpm = bestBpm;

    if (bestBpm > 0.0f) {
        const double periodSamples = 60.0 / static_cast<double>(bestBpm) * sampleRate;
        int first = 0;
        float peak = 0.0f;
        for (int hop = 0; hop < hops; ++hop) {
            if (flux[static_cast<std::size_t>(hop)] > peak) {
                peak = flux[static_cast<std::size_t>(hop)];
                first = hop;
            }
        }
        for (double sample = static_cast<double>(first) * kHop;
             sample < static_cast<double>(frames); sample += periodSamples) {
            result.beats.push_back(sample / sampleRate);
            if (result.beats.size() > 256) {
                break;
            }
        }
    }

    float chroma[12] = {};
    float loudest = 0.0f;
    int winner = 0;
    const int analysed = std::min(frames, static_cast<int>(sampleRate * 4.0));
    for (int pitchClass = 0; pitchClass < 12; ++pitchClass) {
        const double frequency = 440.0 * std::pow(2.0, (pitchClass - 9) / 12.0);
        chroma[pitchClass] = goertzel(mono, analysed, frequency, sampleRate);
        if (chroma[pitchClass] > loudest) {
            loudest = chroma[pitchClass];
            winner = pitchClass;
        }
    }
    float others = 0.0f;
    for (float magnitude : chroma) {
        others += magnitude;
    }
    if (loudest > 0.0f && loudest > others * 0.2f) {
        static constexpr const char* kPitchClass[] = {"C",  "C#", "D",  "D#", "E",  "F",
                                                      "F#", "G",  "G#", "A",  "A#", "B"};
        result.key = kPitchClass[winner];
    }
    return result;
}

} // namespace waveform::dsp
