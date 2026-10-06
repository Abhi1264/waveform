#include <waveform/engine/mixer.hpp>

#include <cmath>
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
