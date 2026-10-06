#pragma once

#include <cstdint>
#include <memory>

#include <waveform/engine/runtime.hpp>
#include <waveform/engine/session.hpp>

#include "rust/cxx.h"

// Adapts the engine's C++ API to types the cxx bridge can carry.
namespace waveform::bridge {

struct BuildInfo;

BuildInfo build_info();
rust::String operating_system_name();
std::unique_ptr<engine::Runtime> start_runtime();

/// The round trip in microseconds, or -1 if the ping timed out.
std::int64_t ping_message_thread(const engine::Runtime& runtime, std::uint32_t timeout_ms);

struct OutputDevice;
struct AudioSnapshot;

std::unique_ptr<engine::Session> start_session();
rust::Vec<OutputDevice> list_output_devices(const engine::Session& session);
/// Empty on success.
rust::String open_default_output(engine::Session& session);
rust::String open_named_output(engine::Session& session, rust::Str name);
void close_output(engine::Session& session);
void submit_transport(engine::Session& session, std::uint8_t kind, std::uint8_t deck, float value);
void submit_command(engine::Session& session, std::uint8_t kind, std::uint8_t deck, float value,
                    float value2, std::uint8_t slot);
AudioSnapshot read_snapshot(const engine::Session& session);
void render_offline(engine::Session& session, rust::Slice<float> interleaved, double sample_rate);
rust::String load_deck_file(engine::Session& session, std::uint8_t deck, rust::Str path);
rust::String load_stem(engine::Session& session, std::uint8_t slot, rust::Str path);
/// Empty on success. Writes a filter-bank preview, not a neural separation.
rust::String write_stem_preview(rust::Str source, rust::Str directory);
rust::Vec<float> deck_peaks(const engine::Session& session, std::uint8_t deck);

struct DeckAnalysis;

DeckAnalysis deck_analysis(const engine::Session& session, std::uint8_t deck);
rust::Vec<float> deck_beats(const engine::Session& session, std::uint8_t deck);
rust::String write_recording(engine::Session& session, rust::Str path);

} // namespace waveform::bridge
