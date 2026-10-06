#include <waveform/engine/mixer.hpp>

#include <chrono>
#include <cmath>
#include <thread>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <juce_audio_formats/juce_audio_formats.h>

using waveform::engine::Command;
using waveform::engine::CommandKind;
using waveform::engine::EngineSnapshot;
using waveform::engine::Mixer;

namespace {

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
