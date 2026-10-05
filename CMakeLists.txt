cmake_minimum_required(VERSION 3.25...4.4)

# Keep in step with MACOSX_DEPLOYMENT_TARGET (.cargo/config.toml) and
# bundle.macOS.minimumSystemVersion (apps/desktop/src-tauri/tauri.conf.json).
set(CMAKE_OSX_DEPLOYMENT_TARGET "14.0" CACHE STRING "Minimum macOS version")

# Rust links the release C runtime (/MD) in every profile, so the native
# libraries must use it too or the final link mixes runtimes.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")

# Keep in step with the version in Cargo.toml and package.json.
project(waveform_native VERSION 0.1.0 LANGUAGES C CXX)

option(WAVEFORM_BUILD_TESTS "Build the Catch2 test suites" ON)
option(WAVEFORM_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(WAVEFORM_BUILD_TESTS)
    enable_testing()
endif()

add_subdirectory(native)
