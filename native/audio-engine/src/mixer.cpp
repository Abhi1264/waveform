#include <waveform/engine/mixer.hpp>

#include <waveform/dsp/crossfader.hpp>
#include <waveform/dsp/gain.hpp>

#include <algorithm>
#include <cmath>

namespace waveform::engine {

Mixer::Mixer() {
    decks_[1].source.setFrequency(554.37f);
    decks_[1].bpm = 128.0f;
}

namespace {

constexpr int kChannels = 2;

float peakToDecibels(float peak) noexcept {
    return dsp::linearToDecibels(peak);
}

} // namespace

void Mixer::prepare(double sampleRate, int maxFrames) {
    if (sampleRate > 0.0) {
        sampleRate_ = sampleRate;
    }
    maxFrames_ = std::max(maxFrames, 1);
    scratch_.assign(static_cast<std::size_t>(maxFrames_) * kChannels * 4, 0.0f);
    for (auto& deck : decks_) {
        deck.source.prepare(sampleRate_);
    }
}

void Mixer::apply(const Command& command) noexcept {
    if (command.kind == CommandKind::SetCrossfader) {
        crossfader_ = std::clamp(command.value, 0.0f, 1.0f);
        return;
    }
    if (command.deck > 3) {
        return;
    }
    auto& deck = decks_[command.deck];
    switch (command.kind) {
    case CommandKind::Play:
        deck.playing = true;
        break;
    case CommandKind::Pause:
        deck.playing = false;
        break;
    case CommandKind::Cue:
        deck.playing = false;
        deck.positionSamples = 0.0;
        deck.source.reset();
        deck.file.seek(0.0);
        break;
    case CommandKind::SetGainDb:
        deck.gainDb = std::clamp(command.value, -100.0f, 12.0f);
        break;
    case CommandKind::SetToneFrequency:
        deck.source.setFrequency(command.value);
        break;
    case CommandKind::SetNoise:
        deck.source.setNoise(command.value >= 0.5f);
        break;
    case CommandKind::SetPitch:
        deck.pitch = std::clamp(command.value, 0.5f, 2.0f);
        break;
    case CommandKind::SetEq:
        if (command.slot < 3) {
            deck.eqDb[command.slot] = std::clamp(command.value, -24.0f, 12.0f);
        }
        break;
    case CommandKind::SetLoop:
        deck.loopStart = static_cast<double>(command.value) * sampleRate_;
        deck.loopEnd = static_cast<double>(command.value2) * sampleRate_;
        deck.loopEnabled = command.slot != 0 && deck.loopEnd > deck.loopStart;
        break;
    case CommandKind::SetHotCue:
        if (command.slot < 8) {
            deck.hotCues[command.slot] = command.value;
        }
        break;
    case CommandKind::JumpHotCue:
        if (command.slot < 8) {
            deck.positionSamples = static_cast<double>(deck.hotCues[command.slot]) * sampleRate_;
            deck.file.seek(deck.positionSamples);
        }
        break;
    case CommandKind::Sync:
        if (deck.bpm > 0.0f) {
            const auto& other = decks_[command.deck == 0 ? 1 : 0];
            deck.pitch = std::clamp(other.bpm / deck.bpm, 0.5f, 2.0f);
        }
        break;
    case CommandKind::SetCrossfader:
        break;
    }
}

void Mixer::renderDeck(Deck& deck, float* interleavedStereo, int frames, float& levelDb) noexcept {
    const auto samples = static_cast<std::size_t>(frames) * kChannels;
    std::fill_n(interleavedStereo, samples, 0.0f);
    if (!deck.playing) {
        levelDb = -100.0f;
        return;
    }

    if (deck.useFile) {
        deck.file.render(interleavedStereo, frames, deck.pitch);
        deck.positionSamples = deck.file.positionSamples();
    } else {
        const float baseFrequency = deck.source.frequency();
        deck.source.setFrequency(baseFrequency * deck.pitch);
        deck.source.render(interleavedStereo, frames);
        deck.source.setFrequency(baseFrequency);
        deck.positionSamples += static_cast<double>(frames) * static_cast<double>(deck.pitch);
    }
    const float low = dsp::decibelsToLinear(deck.eqDb[0]);
    const float high = dsp::decibelsToLinear(deck.eqDb[2]);
    const float gain = dsp::decibelsToLinear(deck.gainDb + deck.eqDb[1]);
    constexpr float kLowCoefficient = 0.02f;
    float peak = 0.0f;
    for (int frame = 0; frame < frames; ++frame) {
        for (int channel = 0; channel < kChannels; ++channel) {
            const auto offset = static_cast<std::size_t>(frame) * kChannels +
                                static_cast<std::size_t>(channel);
            deck.lowState += kLowCoefficient * (interleavedStereo[offset] - deck.lowState);
            const float highPassed = interleavedStereo[offset] - deck.lowState;
            interleavedStereo[offset] = (deck.lowState * low + highPassed * high) * gain;
            peak = std::max(peak, std::abs(interleavedStereo[offset]));
        }
    }
    if (deck.loopEnabled) {
        const double length = deck.loopEnd - deck.loopStart;
        while (deck.positionSamples >= deck.loopEnd && length > 0.0) {
            deck.positionSamples -= length;
        }
        if (deck.useFile) {
            deck.file.seek(deck.positionSamples);
        }
    }
    levelDb = peakToDecibels(peak);
}

void Mixer::process(const Command* commands, int commandCount, float* interleavedStereo, int frames,
                    EngineSnapshot& snapshot) noexcept {
    if (commands != nullptr) {
        for (int index = 0; index < commandCount; ++index) {
            apply(commands[index]);
        }
    }

    if (interleavedStereo == nullptr || frames <= 0 || frames > maxFrames_ || scratch_.empty()) {
        snapshot.xrunCount += 1;
        return;
    }

    float* rendered[4];
    rendered[0] = scratch_.data();
    for (int deck = 1; deck < 4; ++deck) {
        rendered[deck] = rendered[deck - 1] + static_cast<std::ptrdiff_t>(maxFrames_) * kChannels;
    }
    float levels[4] = {-100.0f, -100.0f, -100.0f, -100.0f};
    for (int deck = 0; deck < 4; ++deck) {
        renderDeck(decks_[deck], rendered[deck], frames, levels[deck]);
    }

    const auto gains = dsp::crossfaderGains(crossfader_, dsp::CrossfaderCurve::ConstantPower);
    float masterPeak = 0.0f;
    for (int frame = 0; frame < frames; ++frame) {
        for (int channel = 0; channel < kChannels; ++channel) {
            const auto offset = static_cast<std::size_t>(frame) * kChannels +
                                static_cast<std::size_t>(channel);
            // Decks A and B sit on the crossfader. Decks C and D sum at unity.
            const float sample = rendered[0][offset] * gains.left + rendered[1][offset] * gains.right +
                                 rendered[2][offset] + rendered[3][offset];
            interleavedStereo[offset] = sample;
            masterPeak = std::max(masterPeak, std::abs(sample));
        }
    }

    snapshot.sampleRate = static_cast<std::uint32_t>(sampleRate_);
    snapshot.crossfader = crossfader_;
    snapshot.masterLevelDb = peakToDecibels(masterPeak);
    for (int deck = 0; deck < 2; ++deck) {
        snapshot.positionSeconds[deck] =
            static_cast<float>(decks_[deck].positionSamples / sampleRate_);
        snapshot.gainDb[deck] = decks_[deck].gainDb;
        snapshot.playing[deck] = decks_[deck].playing ? 1 : 0;
        snapshot.usingNoise[deck] = decks_[deck].source.noise() ? 1 : 0;
    }
    snapshot.levelDb[0] = levels[0];
    snapshot.levelDb[1] = levels[1];
}

std::string Mixer::loadFile(int deck, const std::string& path) {
    if (deck < 0 || deck > 3) {
        return "Waveform has four decks, numbered 0 to 3.";
    }
    const auto error = decks_[deck].file.load(path);
    decks_[deck].useFile = error.empty();
    if (error.empty()) {
        decks_[deck].positionSamples = 0.0;
    }
    return error;
}

std::vector<float> Mixer::peaks(int deck) const {
    if (deck < 0 || deck > 3) {
        return {};
    }
    return decks_[deck].file.peaks();
}

} // namespace waveform::engine
