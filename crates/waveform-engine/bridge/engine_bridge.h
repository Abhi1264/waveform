#pragma once

#include <cstdint>
#include <memory>

#include <waveform/engine/runtime.hpp>

#include "rust/cxx.h"

// Adapts the engine's C++ API to types the cxx bridge can carry.
namespace waveform::bridge {

struct BuildInfo;

BuildInfo build_info();
rust::String operating_system_name();
std::unique_ptr<engine::Runtime> start_runtime();

/// The round trip in microseconds, or -1 if the ping timed out.
std::int64_t ping_message_thread(const engine::Runtime& runtime, std::uint32_t timeout_ms);

} // namespace waveform::bridge
