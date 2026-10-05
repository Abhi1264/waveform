#include "waveform-engine/bridge/engine_bridge.h"

#include <chrono>

#include <waveform/engine/build_info.hpp>

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

} // namespace waveform::bridge
