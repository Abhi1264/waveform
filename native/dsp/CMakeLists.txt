# Pure DSP math with no JUCE dependency, so it can be tested and reused alone.
add_library(waveform_dsp STATIC src/crossfader.cpp src/tone.cpp)
add_library(waveform::dsp ALIAS waveform_dsp)
target_include_directories(waveform_dsp PUBLIC include)
waveform_set_warnings(waveform_dsp)
install(TARGETS waveform_dsp ARCHIVE DESTINATION lib)

if(WAVEFORM_BUILD_TESTS)
    add_executable(waveform_dsp_tests tests/crossfader_tests.cpp tests/tone_tests.cpp)
    target_link_libraries(waveform_dsp_tests PRIVATE waveform_dsp Catch2::Catch2WithMain)
    waveform_set_warnings(waveform_dsp_tests)
    catch_discover_tests(waveform_dsp_tests)
endif()
