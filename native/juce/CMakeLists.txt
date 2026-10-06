# Every JUCE module Waveform uses, compiled once into one static library.
# Headless: no GUI modules, so no windowing or font libraries are needed.
add_library(waveform_juce STATIC)

target_link_libraries(waveform_juce
    PRIVATE
        juce::juce_core
        juce::juce_events
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_recommended_config_flags)

target_compile_definitions(waveform_juce
    PRIVATE
        JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        # Lets hosts without their own event loop, such as the test suites,
        # pump messages with MessageManager::runDispatchLoopUntil.
        JUCE_MODAL_LOOPS_PERMITTED=1)

# JUCE's Windows headers pragma-comment `comsuppw.lib` / `comsuppwd.lib`.
# Those ATL libraries are not on the link path rustc uses for the desktop
# app, and the debug one disagrees with Rust's /MD runtime. Name the SDK
# libraries ourselves instead.
if(MSVC)
    target_compile_definitions(waveform_juce
        PUBLIC JUCE_DONT_AUTOLINK_TO_WIN32_LIBRARIES=1)
    target_link_libraries(waveform_juce
        PUBLIC
            advapi32
            cfgmgr32
            dbghelp
            ole32
            oleaut32
            shell32
            shcore
            shlwapi
            user32
            version
            wininet
            winmm
            ws2_32)
endif()

# ASIO is Windows-only. The default is off, so a configure that does not pass
# WAVEFORM_ENABLE_ASIO does not compile it. JUCE 9.0.3 ships the ASIO headers
# under a Steinberg licence or GPLv3; this option uses the GPLv3 terms.
# A SDK path that does not contain the header fails on every host, so a missing
# SDK is never reported as a successful ASIO build.
if(WAVEFORM_ENABLE_ASIO AND NOT "${WAVEFORM_ASIO_SDK_DIR}" STREQUAL "")
    if(EXISTS "${WAVEFORM_ASIO_SDK_DIR}/common/iasiodrv.h")
        set(_waveform_asio_include "${WAVEFORM_ASIO_SDK_DIR}/common")
    elseif(EXISTS "${WAVEFORM_ASIO_SDK_DIR}/iasiodrv.h")
        set(_waveform_asio_include "${WAVEFORM_ASIO_SDK_DIR}")
    else()
        message(FATAL_ERROR
            "WAVEFORM_ENABLE_ASIO is ON but ${WAVEFORM_ASIO_SDK_DIR} has no iasiodrv.h. "
            "ASIO was not compiled. Point WAVEFORM_ASIO_SDK_DIR at a local GPLv3 ASIO SDK. "
            "This build does not download the SDK.")
    endif()
    if(WIN32)
        target_compile_definitions(waveform_juce PUBLIC JUCE_ASIO=1 JUCE_ASIO_USE_EXTERNAL_SDK=1)
        target_include_directories(waveform_juce PRIVATE "${_waveform_asio_include}")
        message(STATUS "ASIO: compiling with the SDK at ${_waveform_asio_include}")
    else()
        target_compile_definitions(waveform_juce PUBLIC JUCE_ASIO=0)
        message(STATUS
            "ASIO: headers found at ${_waveform_asio_include}, and this host is not Windows. ASIO was not compiled.")
    endif()
elseif(WAVEFORM_ENABLE_ASIO AND WIN32)
    set(_waveform_asio_bundled
        "${juce_SOURCE_DIR}/modules/juce_audio_devices/native/asio/iasiodrv.h")
    if(NOT EXISTS "${_waveform_asio_bundled}")
        message(FATAL_ERROR
            "WAVEFORM_ENABLE_ASIO is ON but JUCE's bundled ASIO header is missing "
            "(${_waveform_asio_bundled}). ASIO was not compiled.")
    endif()
    target_compile_definitions(waveform_juce PUBLIC JUCE_ASIO=1)
    message(STATUS "ASIO: compiling with the GPLv3 headers bundled in JUCE")
else()
    target_compile_definitions(waveform_juce PUBLIC JUCE_ASIO=0)
    if(WAVEFORM_ENABLE_ASIO)
        message(STATUS "ASIO: WAVEFORM_ENABLE_ASIO is ON, and this host is not Windows. ASIO was not compiled.")
    else()
        message(STATUS "ASIO: not compiled (WAVEFORM_ENABLE_ASIO is OFF)")
    endif()
endif()

# Code that includes JUCE headers must see the configuration the modules were
# compiled with.
target_compile_definitions(waveform_juce
    INTERFACE $<TARGET_PROPERTY:waveform_juce,COMPILE_DEFINITIONS>)
target_include_directories(waveform_juce SYSTEM
    INTERFACE $<TARGET_PROPERTY:waveform_juce,INCLUDE_DIRECTORIES>)

install(TARGETS waveform_juce ARCHIVE DESTINATION lib)
