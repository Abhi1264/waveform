#include "waveform-engine/bridge/engine_bridge.h"

#include <chrono>
#include <cstring>
#include <string>

#include <waveform/engine/build_info.hpp>
#include <waveform/engine/command.hpp>

#include "waveform-engine/src/lib.rs.h"

namespace waveform::bridge {

BuildInfo build_info() {
    const auto info = engine::buildInfo();
    return BuildInfo{
        .engine_version = rust::String(info.engineVersion),
        .juce_version = rust::String(info.juceVersion),
        .compiler = rust::String(info.compiler),
        .build_type = rust::String(info.buildType),
    };
}

rust::String operating_system_name() {
    return rust::String(engine::operatingSystemName());
}

std::unique_ptr<engine::Runtime> start_runtime() {
    return std::make_unique<engine::Runtime>();
}

std::int64_t ping_message_thread(const engine::Runtime& runtime, std::uint32_t timeout_ms) {
    const auto roundTrip = runtime.pingMessageThread(std::chrono::milliseconds(timeout_ms));
    return roundTrip ? roundTrip->count() : -1;
}

std::unique_ptr<engine::Session> start_session() {
    return std::make_unique<engine::Session>();
}

rust::Vec<OutputDevice> list_output_devices(const engine::Session& session) {
    rust::Vec<OutputDevice> devices;
    for (const auto& device : session.outputDevices()) {
        devices.push_back(OutputDevice{
            .type_name = rust::String(device.typeName),
            .name = rust::String(device.name),
        });
    }
    return devices;
}

rust::String open_default_output(engine::Session& session) {
    return rust::String(session.openDefaultOutput());
}

rust::String open_named_output(engine::Session& session, rust::Str name) {
    return rust::String(session.openOutput(std::string(name.data(), name.size())));
}

void close_output(engine::Session& session) {
    session.close();
}

void session_command(engine::Session& session, std::uint8_t kind, std::uint8_t deck, float value) {
    switch (static_cast<engine::CommandKind>(kind)) {
    case engine::CommandKind::Play:
        session.play(deck);
        break;
    case engine::CommandKind::Pause:
        session.pause(deck);
        break;
    case engine::CommandKind::Cue:
        session.cue(deck);
        break;
    case engine::CommandKind::SetGainDb:
        session.setGainDb(deck, value);
        break;
    case engine::CommandKind::SetCrossfader:
        session.setCrossfader(value);
        break;
    case engine::CommandKind::SetToneFrequency:
        session.setToneFrequency(deck, value);
        break;
    case engine::CommandKind::SetNoise:
        session.setNoise(deck, value >= 0.5f);
        break;
    case engine::CommandKind::SetPitch:
    case engine::CommandKind::SetEq:
    case engine::CommandKind::SetLoop:
    case engine::CommandKind::SetHotCue:
    case engine::CommandKind::JumpHotCue:
    case engine::CommandKind::Sync:
    case engine::CommandKind::Seek:
    case engine::CommandKind::BeatJump:
    case engine::CommandKind::SetEffect:
    case engine::CommandKind::ArmRecord:
    case engine::CommandKind::TriggerSampler:
    case engine::CommandKind::SetInputGain:
        session.command(kind, deck, value, 0.0f, 0);
        break;
    }
}

void submit_transport(engine::Session& session, std::uint8_t kind, std::uint8_t deck, float value) {
    session_command(session, kind, deck, value);
}

void submit_command(engine::Session& session, std::uint8_t kind, std::uint8_t deck, float value,
                    float value2, std::uint8_t slot) {
    session.command(kind, deck, value, value2, slot);
}

AudioSnapshot read_snapshot(const engine::Session& session) {
    const auto snapshot = session.snapshot();
    return AudioSnapshot{
        .sample_rate = snapshot.sampleRate,
        .buffer_size = snapshot.bufferSize,
        .callback_count = snapshot.callbackCount,
        .xrun_count = snapshot.xrunCount,
        .dropped_commands = snapshot.droppedCommands,
        .deck_a_position_seconds = snapshot.positionSeconds[0],
        .deck_b_position_seconds = snapshot.positionSeconds[1],
        .deck_a_gain_db = snapshot.gainDb[0],
        .deck_b_gain_db = snapshot.gainDb[1],
        .deck_a_level_db = snapshot.levelDb[0],
        .deck_b_level_db = snapshot.levelDb[1],
        .master_level_db = snapshot.masterLevelDb,
        .crossfader = snapshot.crossfader,
        .deck_a_playing = snapshot.playing[0] != 0,
        .deck_b_playing = snapshot.playing[1] != 0,
        .device_open = snapshot.deviceOpen != 0,
        .device_name = rust::String(snapshot.deviceName),
    };
}

void render_offline(engine::Session& session, rust::Slice<float> interleaved, double sample_rate) {
    const auto frames = static_cast<int>(interleaved.size() / 2);
    session.processOffline(interleaved.data(), frames, sample_rate);
}

rust::String load_deck_file(engine::Session& session, std::uint8_t deck, rust::Str path) {
    return rust::String(
        session.loadFile(static_cast<int>(deck), std::string(path.data(), path.size())));
}

rust::Vec<float> deck_peaks(const engine::Session& session, std::uint8_t deck) {
    rust::Vec<float> peaks;
    for (float peak : session.peaks(static_cast<int>(deck))) {
        peaks.push_back(peak);
    }
    return peaks;
}

rust::Vec<float> deck_beats(const engine::Session& session, std::uint8_t deck) {
    rust::Vec<float> beats;
    for (float beat : session.beats(static_cast<int>(deck))) {
        beats.push_back(beat);
    }
    return beats;
}

rust::String write_recording(engine::Session& session, rust::Str path) {
    return rust::String(session.writeRecording(std::string(path.data(), path.size())));
}

DeckAnalysis deck_analysis(const engine::Session& session, std::uint8_t deck) {
    const int index = static_cast<int>(deck);
    return DeckAnalysis{
        .bpm = session.bpm(index),
        .musical_key = rust::String(session.key(index)),
        .duration_seconds = static_cast<float>(session.duration(index)),
    };
}

} // namespace waveform::bridge
