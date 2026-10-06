#include <waveform/engine/mixer.hpp>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <thread>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <juce_audio_formats/juce_audio_formats.h>

using Catch::Matchers::WithinAbs;

using waveform::engine::Command;
using waveform::engine::CommandKind;
using waveform::engine::EngineSnapshot;
using waveform::engine::Mixer;

namespace {

void writeClicks(const juce::File& file, double bpm, double seconds) {
    file.deleteFile();
    juce::WavAudioFormat wav;
    auto fileStream = std::make_unique<juce::FileOutputStream>(file);
    REQUIRE(fileStream->openedOk());
    std::unique_ptr<juce::OutputStream> stream = std::move(fileStream);
    const auto options = juce::AudioFormatWriter::Options{}
                             .withSampleRate(48000.0)
                             .withNumChannels(2)
                             .withBitsPerSample(16);
    auto writer = wav.createWriterFor(stream, options);
    REQUIRE(writer != nullptr);
    const int frames = static_cast<int>(48000.0 * seconds);
    const int period = std::max(1, static_cast<int>(60.0 / bpm * 48000.0));
    juce::AudioBuffer<float> buffer(2, frames);
    for (int index = 0; index < frames; ++index) {
        const float sample = index % period < 80 ? 0.8f : 0.0f;
        buffer.setSample(0, index, sample);
        buffer.setSample(1, index, sample);
    }
    REQUIRE(writer->writeFromAudioSampleBuffer(buffer, 0, frames));
    writer.reset();
}

float rms(const std::vector<float>& interleaved) {
    double sum = 0.0;
    for (float sample : interleaved) {
        sum += static_cast<double>(sample) * static_cast<double>(sample);
    }
    return static_cast<float>(std::sqrt(sum / static_cast<double>(interleaved.size())));
}

} // namespace

TEST_CASE("A wav file plays from prepared chunks and yields peaks", "[file]") {
    const auto directory =
        juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("waveform-file-test");
    directory.createDirectory();
    const auto file = directory.getChildFile("tone.wav");
    file.deleteFile();

    juce::WavAudioFormat wav;
    auto fileStream = std::make_unique<juce::FileOutputStream>(file);
    REQUIRE(fileStream->openedOk());
    std::unique_ptr<juce::OutputStream> stream = std::move(fileStream);
    const auto options = juce::AudioFormatWriter::Options{}
                             .withSampleRate(48000.0)
                             .withNumChannels(2)
                             .withBitsPerSample(16);
    auto writer = wav.createWriterFor(stream, options);
    REQUIRE(writer != nullptr);

    juce::AudioBuffer<float> buffer(2, 48000);
    for (int index = 0; index < buffer.getNumSamples(); ++index) {
        const auto sample = static_cast<float>(std::sin(2.0 * 3.141592653589793 * 440.0 * index / 48000.0));
        buffer.setSample(0, index, static_cast<float>(sample));
        buffer.setSample(1, index, static_cast<float>(sample));
    }
    REQUIRE(writer->writeFromAudioSampleBuffer(buffer, 0, buffer.getNumSamples()));
    writer.reset();

    Mixer mixer;
    mixer.prepare(48000.0, 2048);
    REQUIRE(mixer.loadFile(0, file.getFullPathName().toStdString()).empty());
    REQUIRE(mixer.key(0) == "A");
    const auto peaks = mixer.peaks(0);
    REQUIRE(peaks.size() > 16);

    const Command play{CommandKind::Play, 0, 0.0f};
    std::vector<float> output(2048 * 2);
    bool heard = false;
    for (int attempt = 0; attempt < 40; ++attempt) {
        EngineSnapshot snapshot;
        mixer.process(&play, 1, output.data(), 2048, snapshot);
        if (rms(output) > 0.05f) {
            heard = true;
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    REQUIRE(heard);
}

TEST_CASE("Two loaded files can be beat-matched, crossfaded, looped and cued", "[mix]") {
    const auto directory =
        juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("waveform-mix-test");
    directory.createDirectory();
    const auto deckA = directory.getChildFile("a.wav");
    const auto deckB = directory.getChildFile("b.wav");
    writeClicks(deckA, 120.0, 4.0);
    writeClicks(deckB, 128.0, 4.0);

    Mixer mixer;
    mixer.prepare(48000.0, 2048);
    REQUIRE(mixer.loadFile(0, deckA.getFullPathName().toStdString()).empty());
    REQUIRE(mixer.loadFile(1, deckB.getFullPathName().toStdString()).empty());
    REQUIRE_THAT(static_cast<double>(mixer.bpm(0)), WithinAbs(120.0, 2.0));
    REQUIRE_THAT(static_cast<double>(mixer.bpm(1)), WithinAbs(128.0, 2.0));
    REQUIRE(mixer.beats(0).size() > 4);
    REQUIRE(mixer.beats(1).size() > 4);

    const std::vector<Command> mix = {
        Command{CommandKind::Play, 0, 0.0f},
        Command{CommandKind::Play, 1, 0.0f},
        Command{CommandKind::Sync, 0, 0.0f},
        Command{CommandKind::SetCrossfader, 0, 0.5f},
        Command{CommandKind::SetLoop, 0, 0.0f, 0.5f, 1},
        Command{CommandKind::SetHotCue, 1, 1.0f, 0.0f, 2},
        Command{CommandKind::JumpHotCue, 1, 0.0f, 0.0f, 2},
        Command{CommandKind::Seek, 0, 0.1f},
    };
    std::vector<float> output(2048 * 2);
    bool heard = false;
    EngineSnapshot snapshot;
    for (int attempt = 0; attempt < 40; ++attempt) {
        mixer.process(attempt == 0 ? mix.data() : nullptr, attempt == 0 ? static_cast<int>(mix.size()) : 0,
                      output.data(), 2048, snapshot);
        if (rms(output) > 0.02f) {
            heard = true;
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    REQUIRE(heard);
    REQUIRE(snapshot.positionSeconds[0] < 0.5f);
    REQUIRE_THAT(static_cast<double>(snapshot.crossfader), WithinAbs(0.5, 0.001));
}
