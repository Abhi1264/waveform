find_package(Threads REQUIRED)
include(CheckCXXCompilerFlag)

# The engine's public headers use only standard C++ types; JUCE stays private.
add_library(waveform_engine STATIC src/build_info.cpp src/runtime.cpp src/mixer.cpp src/session.cpp)
add_library(waveform::engine ALIAS waveform_engine)
target_include_directories(waveform_engine PUBLIC include)
target_link_libraries(waveform_engine PUBLIC waveform_dsp PRIVATE waveform_juce Threads::Threads)

# RealtimeSanitizer instruments the code that runs on the audio thread. Apple
# clang does not ship it; the CI job uses LLVM clang when this flag is absent.
check_cxx_compiler_flag("-fsanitize=realtime" WAVEFORM_HAS_REALTIME_SANITIZER)
if(WAVEFORM_HAS_REALTIME_SANITIZER)
    target_compile_options(waveform_engine PRIVATE -fsanitize=realtime)
    target_link_options(waveform_engine PUBLIC -fsanitize=realtime)
endif()
target_compile_definitions(waveform_engine
    PRIVATE
        WAVEFORM_ENGINE_VERSION="${PROJECT_VERSION}"
        WAVEFORM_COMPILER="${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}"
        WAVEFORM_BUILD_TYPE="$<CONFIG>")
waveform_set_warnings(waveform_engine)

install(TARGETS waveform_engine ARCHIVE DESTINATION lib)

if(WAVEFORM_BUILD_TESTS)
    add_executable(waveform_engine_tests
        tests/build_info_tests.cpp tests/runtime_tests.cpp tests/mixer_tests.cpp tests/session_tests.cpp)
    # The runtime tests include JUCE to pump messages, standing in for the
    # host event loop that the desktop app provides.
    target_link_libraries(waveform_engine_tests
        PRIVATE waveform_engine waveform_juce Catch2::Catch2WithMain)
    target_compile_definitions(waveform_engine_tests
        PRIVATE
            WAVEFORM_EXPECTED_ENGINE_VERSION="${PROJECT_VERSION}"
            WAVEFORM_EXPECTED_JUCE_VERSION="${WAVEFORM_JUCE_VERSION}")
    waveform_set_warnings(waveform_engine_tests)
    # One process per test case: JUCE's message manager is a process-wide singleton.
    catch_discover_tests(waveform_engine_tests)
endif()
