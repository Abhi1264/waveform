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

# Code that includes JUCE headers must see the configuration the modules were
# compiled with.
target_compile_definitions(waveform_juce
    INTERFACE $<TARGET_PROPERTY:waveform_juce,COMPILE_DEFINITIONS>)
target_include_directories(waveform_juce SYSTEM
    INTERFACE $<TARGET_PROPERTY:waveform_juce,INCLUDE_DIRECTORIES>)

install(TARGETS waveform_juce ARCHIVE DESTINATION lib)
