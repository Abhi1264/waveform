#include <waveform/engine/build_info.hpp>

#include <catch2/catch_test_macros.hpp>

TEST_CASE("Build info reports the engine and the pinned JUCE version", "[build-info]") {
    const auto info = waveform::engine::buildInfo();
    CHECK(info.engineVersion == WAVEFORM_EXPECTED_ENGINE_VERSION);
    CHECK(info.juceVersion == WAVEFORM_EXPECTED_JUCE_VERSION);
    CHECK_FALSE(info.compiler.empty());
    CHECK_FALSE(info.buildType.empty());
}

TEST_CASE("The operating system is named", "[build-info]") {
    const auto name = waveform::engine::operatingSystemName();
#if defined(__APPLE__)
    CHECK(name.starts_with("macOS "));
#elif defined(_WIN32)
    CHECK(name.starts_with("Windows"));
#elif defined(__linux__)
    CHECK(name.starts_with("Linux"));
#else
    CHECK_FALSE(name.empty());
#endif
}
