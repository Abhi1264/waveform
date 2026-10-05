#pragma once

#include <string>

namespace waveform::engine {

struct BuildInfo {
    /// The engine's version, for example "0.1.0".
    std::string engineVersion;
    /// The version of the linked JUCE library, as JUCE reports it, for example "9.0.3".
    std::string juceVersion;
    /// The C++ compiler and its version, for example "AppleClang 17.0.0.17000013".
    std::string compiler;
    /// The CMake configuration, for example "Debug" or "Release".
    std::string buildType;
};

/// Describes this build of the engine.
[[nodiscard]] BuildInfo buildInfo();

/// The operating system the engine is running on, as JUCE detects it, for
/// example "macOS 26.0" or "Windows 11".
[[nodiscard]] std::string operatingSystemName();

} // namespace waveform::engine
