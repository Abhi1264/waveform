#include <waveform/engine/mixer.hpp>

#include <waveform/dsp/crossfader.hpp>
#include <waveform/dsp/gain.hpp>

#include <algorithm>
#include <cmath>
#include <cstring>

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
    delayFrames_ = std::max(1, static_cast<int>(sampleRate_ * 0.25));
    delay_.assign(static_cast<std::size_t>(delayFrames_) * kChannels * 4, 0.0f);
    record_.assign(static_cast<std::size_t>(sampleRate_ * 2.0) * kChannels, 0.0f);
    recordCount_.store(0, std::memory_order_relaxed);
    samplerFrames_ = std::max(1, static_cast<int>(sampleRate_ * 0.05));
    sampler_.assign(static_cast<std::size_t>(samplerFrames_) * kChannels, 0.0f);
    fillSampler();
    for (auto& deck : decks_) {
        deck.source.prepare(sampleRate_);
        deck.delayCursor = 0;
        deck.filterState = 0.0f;
        deck.reverbState = 0.0f;
    }
}

void Mixer::fillSampler() noexcept {
    samplerCursor_ = samplerFrames_;
    for (int index = 0; index < samplerFrames_; ++index) {
        const float envelope = 1.0f - static_cast<float>(index) / static_cast<float>(samplerFrames_);
        const float sample = envelope * static_cast<float>(std::sin(2.0 * 3.141592653589793 * 880.0 *
                                                                     static_cast<double>(index) / sampleRate_));
        sampler_[static_cast<std::size_t>(index) * kChannels] = sample;
        sampler_[static_cast<std::size_t>(index) * kChannels + 1] = sample;
    }
}

void Mixer::apply(const Command& command) noexcept {
    if (command.kind == CommandKind::SetCrossfader) {
        crossfader_ = std::clamp(command.value, 0.0f, 1.0f);
        return;
    }
    if (command.kind == CommandKind::SetInputGain) {
        inputGain_ = std::clamp(command.value, 0.0f, 1.0f);
        return;
    }
    if (command.kind == CommandKind::ArmRecord) {
        recording_ = command.value >= 0.5f;
        return;
    }
    if (command.kind == CommandKind::TriggerSampler) {
        samplerCursor_ = 0;
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
    case CommandKind::Seek:
        deck.positionSamples = std::max(0.0, static_cast<double>(command.value) * sampleRate_);
        if (deck.useFile) {
            deck.file.seek(deck.positionSamples);
        }
        break;
    case CommandKind::BeatJump:
        if (deck.bpm > 0.0f) {
            const double beats = static_cast<double>(command.value) * sampleRate_ * 60.0 /
                                 static_cast<double>(deck.bpm);
            deck.positionSamples = std::max(0.0, deck.positionSamples + beats);
            if (deck.useFile) {
                deck.file.seek(deck.positionSamples);
            }
        }
        break;
    case CommandKind::SetEffect:
        if (command.slot == 0) {
            deck.filterAmount = std::clamp(command.value, 0.0f, 1.0f);
        } else if (command.slot == 1) {
            deck.delayMix = std::clamp(command.value, 0.0f, 1.0f);
        } else if (command.slot == 2) {
            deck.reverbMix = std::clamp(command.value, 0.0f, 1.0f);
        }
        break;
    case CommandKind::SetCrossfader:
    case CommandKind::ArmRecord:
    case CommandKind::TriggerSampler:
    case CommandKind::SetInputGain:
        break;
    }
}

void Mixer::renderDeck(int deckIndex, Deck& deck, float* interleavedStereo, int frames,
                       float& levelDb) noexcept {
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
            float sample = (deck.lowState * low + highPassed * high) * gain;
            if (deck.filterAmount > 0.0f) {
                const float coefficient = 0.05f + (1.0f - deck.filterAmount) * 0.9f;
                deck.filterState += coefficient * (sample - deck.filterState);
                sample = deck.filterState;
            }
            if (deck.delayMix > 0.0f && !delay_.empty()) {
                const auto cursor = static_cast<std::size_t>(deck.delayCursor) * kChannels +
                                    static_cast<std::size_t>(channel);
                const auto slot = static_cast<std::size_t>(deckIndex) *
                                      static_cast<std::size_t>(delayFrames_) * kChannels +
                                  cursor;
                const float delayed = delay_[slot];
                delay_[slot] = sample;
                sample += delayed * deck.delayMix;
            }
            if (deck.reverbMix > 0.0f) {
                deck.reverbState = sample + deck.reverbState * 0.7f;
                sample = sample * (1.0f - deck.reverbMix) + deck.reverbState * deck.reverbMix;
            }
            interleavedStereo[offset] = sample;
            peak = std::max(peak, std::abs(sample));
        }
        deck.delayCursor += 1;
        if (deck.delayCursor >= delayFrames_) {
            deck.delayCursor = 0;
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
        renderDeck(deck, decks_[deck], rendered[deck], frames, levels[deck]);
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

    if (samplerCursor_ < samplerFrames_) {
        for (int frame = 0; frame < frames && samplerCursor_ < samplerFrames_; ++frame) {
            for (int channel = 0; channel < kChannels; ++channel) {
                const auto offset = static_cast<std::size_t>(frame) * kChannels +
                                    static_cast<std::size_t>(channel);
                const auto source = static_cast<std::size_t>(samplerCursor_) * kChannels +
                                    static_cast<std::size_t>(channel);
                interleavedStereo[offset] += sampler_[source];
                masterPeak = std::max(masterPeak, std::abs(interleavedStereo[offset]));
            }
            samplerCursor_ += 1;
        }
    }

    if (recording_ && !record_.empty()) {
        const int samples = frames * kChannels;
        const int used = recordCount_.load(std::memory_order_relaxed);
        if (used >= 0 && samples > 0 && used + samples <= static_cast<int>(record_.size())) {
            std::memcpy(record_.data() + used, interleavedStereo,
                        sizeof(float) * static_cast<std::size_t>(samples));
            recordCount_.store(used + samples, std::memory_order_release);
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
        if (decks_[deck].file.bpm() > 0.0f) {
            decks_[deck].bpm = decks_[deck].file.bpm();
        }
    }
    return error;
}

std::vector<float> Mixer::peaks(int deck) const {
    if (deck < 0 || deck > 3) {
        return {};
    }
    return decks_[deck].file.peaks();
}

float Mixer::bpm(int deck) const {
    if (deck < 0 || deck > 3) {
        return 0.0f;
    }
    return decks_[deck].bpm;
}

std::string Mixer::key(int deck) const {
    if (deck < 0 || deck > 3) {
        return {};
    }
    return decks_[deck].file.key();
}

double Mixer::duration(int deck) const {
    if (deck < 0 || deck > 3) {
        return 0.0;
    }
    return decks_[deck].file.durationSeconds();
}

std::vector<float> Mixer::beats(int deck) const {
    std::vector<float> times;
    if (deck < 0 || deck > 3) {
        return times;
    }
    times.reserve(std::min<std::size_t>(decks_[deck].file.beats().size(), 256));
    for (double beat : decks_[deck].file.beats()) {
        times.push_back(static_cast<float>(beat));
        if (times.size() == 256) {
            break;
        }
    }
    return times;
}

void Mixer::addInput(float* interleavedStereo, const float* const* input, int channels, int frames) noexcept {
    if (interleavedStereo == nullptr || input == nullptr || channels <= 0 || frames <= 0 ||
        inputGain_ <= 0.0f) {
        return;
    }
    for (int frame = 0; frame < frames; ++frame) {
        for (int channel = 0; channel < kChannels; ++channel) {
            const int sourceChannel = std::min(channel, channels - 1);
            const float* source = input[sourceChannel];
            if (source == nullptr) {
                continue;
            }
            const auto offset = static_cast<std::size_t>(frame) * kChannels + static_cast<std::size_t>(channel);
            interleavedStereo[offset] += source[frame] * inputGain_;
        }
    }
}

int Mixer::copyRecording(float* destination, int capacity) const {
    const int count = std::min(recordCount_.load(std::memory_order_acquire), std::max(capacity, 0));
    if (count > 0 && destination != nullptr) {
        std::memcpy(destination, record_.data(), sizeof(float) * static_cast<std::size_t>(count));
    }
    return count;
}

int Mixer::recordingCapacity() const noexcept { return static_cast<int>(record_.size()); }

void Mixer::applyMidi(std::uint8_t status, std::uint8_t data1, std::uint8_t data2) noexcept {
    if ((status & 0xF0) == 0xB0 && data1 == 1) {
        Command command;
        command.kind = CommandKind::SetCrossfader;
        command.value = static_cast<float>(data2) / 127.0f;
        apply(command);
        return;
    }
    if ((status & 0xF0) == 0x90 && data2 > 0) {
        Command command;
        command.kind = CommandKind::TriggerSampler;
        apply(command);
    }
}

} // namespace waveform::engine
