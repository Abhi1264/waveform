#include <waveform/engine/build_info.hpp>

#include <juce_core/juce_core.h>

namespace waveform::engine {

BuildInfo buildInfo() {
    return BuildInfo{
        .engineVersion = WAVEFORM_ENGINE_VERSION,
        // JUCE reports itself as "JUCE v9.0.3".
        .juceVersion = juce::SystemStats::getJUCEVersion()
                           .fromFirstOccurrenceOf("JUCE v", false, false)
                           .toStdString(),
        .compiler = WAVEFORM_COMPILER,
        .buildType = WAVEFORM_BUILD_TYPE,
    };
}

std::string operatingSystemName() {
    auto name = juce::SystemStats::getOperatingSystemName();
    // JUCE still uses the old "Mac OSX" name.
    if (name.startsWith("Mac OSX ")) {
        name = "macOS " + name.fromFirstOccurrenceOf("Mac OSX ", false, false);
    }
    return name.toStdString();
}

} // namespace waveform::engine
