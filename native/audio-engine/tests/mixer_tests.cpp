#include <waveform/engine/mixer.hpp>

#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <thread>
#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

using Catch::Matchers::WithinAbs;
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

EngineSnapshot render(Mixer& mixer, const std::vector<Command>& commands, std::vector<float>& output,
                      int frames) {
    EngineSnapshot snapshot;
    mixer.process(commands.data(), static_cast<int>(commands.size()), output.data(), frames,
                  snapshot);
    return snapshot;
}

} // namespace

TEST_CASE("A paused deck is silent and cue returns it to the start", "[mixer]") {
    Mixer mixer;
    mixer.prepare(48000.0, 512);
    std::vector<float> output(512 * 2);
    const auto paused = render(mixer, {}, output, 512);
    REQUIRE(rms(output) == 0.0f);
    REQUIRE(paused.playing[0] == 0);

    render(mixer, {Command{CommandKind::Play, 0, 0}}, output, 512);
    const auto after = render(mixer, {Command{CommandKind::Cue, 0, 0}}, output, 512);
    REQUIRE_THAT(after.positionSeconds[0], WithinAbs(0.0, 1.0e-6));
    REQUIRE(after.playing[0] == 0);
}

TEST_CASE("Deck gain and a hard-left crossfader silence the other deck", "[mixer]") {
    Mixer mixer;
    mixer.prepare(48000.0, 4800);
    std::vector<float> output(4800 * 2);
    const std::vector<Command> commands = {
        Command{CommandKind::SetCrossfader, 0, 0.0f},
        Command{CommandKind::SetGainDb, 0, -6.0206f},
        Command{CommandKind::Play, 0, 0},
        Command{CommandKind::Play, 1, 0},
    };
    const auto snapshot = render(mixer, commands, output, 4800);
    // A full-scale sine is −3 dB RMS; −6 dB of gain puts it near −9 dB RMS.
    REQUIRE_THAT(static_cast<double>(rms(output)), WithinAbs(0.3535, 0.02));
    REQUIRE(snapshot.levelDb[1] > -6.0f);
    REQUIRE(snapshot.playing[0] == 1);
    REQUIRE(snapshot.playing[1] == 1);
}

TEST_CASE("The centre of the crossfader keeps constant power", "[mixer]") {
    Mixer mixer;
    mixer.prepare(48000.0, 4800);
    std::vector<float> one(4800 * 2);
    std::vector<float> both(4800 * 2);
    render(mixer,
           {Command{CommandKind::SetCrossfader, 0, 0.0f},
            Command{CommandKind::SetToneFrequency, 1, 440.0f}, Command{CommandKind::Play, 0, 0}},
           one, 4800);
    Mixer second;
    second.prepare(48000.0, 4800);
    render(second,
           {Command{CommandKind::SetCrossfader, 0, 0.5f},
            Command{CommandKind::SetToneFrequency, 0, 440.0f},
            Command{CommandKind::SetToneFrequency, 1, 440.0f}, Command{CommandKind::Play, 0, 0},
            Command{CommandKind::Play, 1, 0}},
           both, 4800);
    // Two equal sines at equal power sum about 3 dB above one of them alone.
    REQUIRE_THAT(static_cast<double>(rms(both) / rms(one)), WithinAbs(std::sqrt(2.0), 0.08));
}

TEST_CASE("Sync, looping and EQ do what a DJ expects", "[mixer]") {
    Mixer synced;
    synced.prepare(48000.0, 4800);
    std::vector<float> output(4800 * 2);
    const auto after = render(synced, {Command{CommandKind::Sync, 0, 0}, Command{CommandKind::Play, 0, 0}},
                              output, 4800);
    // Deck A is 120 BPM and deck B is 128, so sync speeds A up by 128/120.
    REQUIRE_THAT(static_cast<double>(after.positionSeconds[0]),
                 WithinAbs(4800.0 / 48000.0 * (128.0 / 120.0), 0.002));

    Mixer looped;
    looped.prepare(48000.0, 48000);
    std::vector<float> loopOut(48000 * 2);
    const auto loopedSnapshot = render(
        looped,
        {Command{CommandKind::SetLoop, 0, 0.0f, 0.05f, 1}, Command{CommandKind::Play, 0, 0}},
        loopOut, 48000);
    REQUIRE(loopedSnapshot.positionSeconds[0] < 0.05f);

    Mixer quietLow;
    quietLow.prepare(48000.0, 4800);
    std::vector<float> flat(4800 * 2);
    std::vector<float> cut(4800 * 2);
    render(quietLow, {Command{CommandKind::SetToneFrequency, 0, 80.0f}, Command{CommandKind::Play, 0, 0}},
           flat, 4800);
    Mixer cutLow;
    cutLow.prepare(48000.0, 4800);
    render(cutLow,
           {Command{CommandKind::SetToneFrequency, 0, 80.0f}, Command{CommandKind::SetEq, 0, -24.0f, 0.0f, 0},
            Command{CommandKind::Play, 0, 0}},
           cut, 4800);
    REQUIRE(rms(cut) < rms(flat) * 0.5f);

    Mixer cues;
    cues.prepare(48000.0, 256);
    std::vector<float> cueOut(256 * 2);
    const auto jumped = render(
        cues, {Command{CommandKind::SetHotCue, 0, 2.0f, 0.0f, 3}, Command{CommandKind::JumpHotCue, 0, 0, 0, 3}},
        cueOut, 256);
    REQUIRE_THAT(static_cast<double>(jumped.positionSeconds[0]), WithinAbs(2.0, 0.01));
}

TEST_CASE("Seek, beat jump, a filter, the sampler and recording", "[mixer]") {
    Mixer mixer;
    mixer.prepare(48000.0, 512);
    std::vector<float> output(512 * 2);

    const auto sought = render(mixer, {Command{CommandKind::Seek, 0, 3.0f}}, output, 512);
    REQUIRE_THAT(static_cast<double>(sought.positionSeconds[0]), WithinAbs(3.0, 0.001));

    const auto jumped =
        render(mixer, {Command{CommandKind::BeatJump, 0, 4.0f}}, output, 512);
    // 120 BPM, four beats, from 3 seconds, lands at 5 seconds.
    REQUIRE_THAT(static_cast<double>(jumped.positionSeconds[0]), WithinAbs(5.0, 0.001));

    std::vector<float> open(4800 * 2);
    std::vector<float> closed(4800 * 2);
    Mixer dry;
    dry.prepare(48000.0, 4800);
    render(dry, {Command{CommandKind::SetToneFrequency, 0, 4000.0f}, Command{CommandKind::Play, 0, 0}},
           open, 4800);
    Mixer filtered;
    filtered.prepare(48000.0, 4800);
    render(filtered,
           {Command{CommandKind::SetToneFrequency, 0, 4000.0f},
            Command{CommandKind::SetEffect, 0, 1.0f, 0.0f, 0}, Command{CommandKind::Play, 0, 0}},
           closed, 4800);
    REQUIRE(rms(closed) < rms(open) * 0.5f);

    Mixer sampler;
    sampler.prepare(48000.0, 512);
    std::vector<float> pad(512 * 2);
    render(sampler, {Command{CommandKind::TriggerSampler, 0, 0}}, pad, 512);
    REQUIRE(rms(pad) > 0.01f);

    Mixer recorder;
    recorder.prepare(48000.0, 512);
    std::vector<float> taken(512 * 2);
    render(recorder, {Command{CommandKind::ArmRecord, 0, 1.0f}, Command{CommandKind::Play, 0, 0}}, taken,
           512);
    std::vector<float> stored(static_cast<std::size_t>(recorder.recordingCapacity()));
    const int copied = recorder.copyRecording(stored.data(), static_cast<int>(stored.size()));
    REQUIRE(copied == 512 * 2);
    stored.resize(static_cast<std::size_t>(copied));
    REQUIRE(rms(stored) > 0.1f);
}

TEST_CASE("A MIDI fader moves the crossfader and a note triggers the sampler", "[midi]") {
    Mixer mixer;
    mixer.prepare(48000.0, 256);
    mixer.applyMidi(0xB0, 1, 127);
    std::vector<float> output(256 * 2);
    const auto snapshot = render(mixer, {}, output, 256);
    REQUIRE_THAT(static_cast<double>(snapshot.crossfader), WithinAbs(1.0, 0.01));

    mixer.applyMidi(0x90, 60, 100);
    render(mixer, {}, output, 256);
    REQUIRE(rms(output) > 0.01f);
}

TEST_CASE("External input is mixed only after its gain is raised", "[input]") {
    Mixer mixer;
    mixer.prepare(48000.0, 128);
    std::vector<float> output(128 * 2, 0.0f);
    std::vector<float> input(128, 0.5f);
    const float* channels[2] = {input.data(), input.data()};
    mixer.addInput(output.data(), channels, 2, 128);
    REQUIRE(rms(output) == 0.0f);

    render(mixer, {Command{CommandKind::SetInputGain, 0, 1.0f}}, output, 128);
    std::fill(output.begin(), output.end(), 0.0f);
    mixer.addInput(output.data(), channels, 2, 128);
    REQUIRE(rms(output) > 0.1f);
}

TEST_CASE("Four decks and effects finish a 128-frame buffer", "[budget]") {
    Mixer mixer;
    mixer.prepare(48000.0, 128);
    std::vector<Command> commands;
    for (std::uint8_t deck = 0; deck < 4; ++deck) {
        commands.push_back(Command{CommandKind::Play, deck, 0.0f});
        commands.push_back(Command{CommandKind::SetEffect, deck, 0.4f, 0.0f, 0});
        commands.push_back(Command{CommandKind::SetEffect, deck, 0.15f, 0.0f, 1});
        commands.push_back(Command{CommandKind::SetEffect, deck, 0.1f, 0.0f, 2});
    }
    std::vector<float> output(128 * 2);
    render(mixer, commands, output, 128);
    const auto start = std::chrono::steady_clock::now();
    EngineSnapshot snapshot;
    for (int index = 0; index < 200; ++index) {
        snapshot = render(mixer, {}, output, 128);
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::steady_clock::now() - start);
    const auto perBuffer = elapsed.count() / 200;
    std::cout << "four-deck 128-frame buffer microseconds " << perBuffer << "\n";
    CAPTURE(perBuffer);
    REQUIRE(snapshot.xrunCount == 0);
    REQUIRE(perBuffer < 20000);
    REQUIRE(rms(output) > 0.01f);
}

TEST_CASE("A background write does not create an xrun while four decks play", "[stems]") {
    Mixer mixer;
    mixer.prepare(48000.0, 256);
    std::vector<float> output(256 * 2);
    std::atomic<bool> writing{true};
    std::thread worker([&writing] {
        std::vector<char> block(1 << 20, 1);
        while (writing.load()) {
            volatile char sink = block[block.size() / 2];
            (void)sink;
        }
    });
    EngineSnapshot snapshot;
    for (int index = 0; index < 50; ++index) {
        const Command play{CommandKind::Play, 0, 0.0f};
        snapshot = render(mixer, {play, Command{CommandKind::Play, 1, 0.0f},
                                   Command{CommandKind::Play, 2, 0.0f},
                                   Command{CommandKind::Play, 3, 0.0f}},
                          output, 256);
    }
    writing.store(false);
    worker.join();
    REQUIRE(snapshot.xrunCount == 0);
    REQUIRE(rms(output) > 0.01f);
}

TEST_CASE("Changing the sample rate rebuilds the mixer without dropping the deck", "[mixer]") {
    Mixer mixer;
    mixer.prepare(48000.0, 256);
    std::vector<float> output(1024 * 2);
    render(mixer, {Command{CommandKind::Play, 0, 0}}, output, 256);
    mixer.prepare(44100.0, 1024);
    const auto snapshot = render(mixer, {}, output, 1024);
    REQUIRE(snapshot.sampleRate == 44100);
    REQUIRE(snapshot.playing[0] == 1);
    REQUIRE(snapshot.positionSeconds[0] > 0.0f);
}
