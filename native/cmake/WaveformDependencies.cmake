include(FetchContent)

# Archives are downloaded once into this cache, verified against the pinned
# SHA-256, and extracted separately by each build tree. Set the
# WAVEFORM_DOWNLOAD_CACHE environment variable to share it between checkouts.
if(DEFINED ENV{WAVEFORM_DOWNLOAD_CACHE})
    set(_waveform_download_cache_default "$ENV{WAVEFORM_DOWNLOAD_CACHE}")
else()
    set(_waveform_download_cache_default "${PROJECT_SOURCE_DIR}/.cache/downloads")
endif()
set(WAVEFORM_DOWNLOAD_CACHE "${_waveform_download_cache_default}" CACHE PATH
    "Directory that keeps downloaded dependency archives between build trees")

# Sets out_var to the cached copy of an archive, downloading it first if the
# cache has no copy with the expected hash. FetchContent's own DOWNLOAD_DIR
# cannot be used for this: since policy CMP0168 it always downloads into the
# build tree.
function(waveform_cached_archive out_var file_name url sha256)
    set(path "${WAVEFORM_DOWNLOAD_CACHE}/${file_name}")
    if(EXISTS "${path}")
        file(SHA256 "${path}" actual)
        if(actual STREQUAL sha256)
            set(${out_var} "${path}" PARENT_SCOPE)
            return()
        endif()
        file(REMOVE "${path}")
    endif()

    message(STATUS "Downloading ${url}")
    # A unique partial name keeps concurrent configures from colliding.
    string(RANDOM LENGTH 8 suffix)
    set(partial "${path}.${suffix}.part")
    file(DOWNLOAD "${url}" "${partial}"
        EXPECTED_HASH SHA256=${sha256}
        TLS_VERIFY ON
        STATUS status)
    list(GET status 0 code)
    if(NOT code EQUAL 0)
        list(GET status 1 reason)
        file(REMOVE "${partial}")
        message(FATAL_ERROR "Could not download ${url}: ${reason}")
    endif()
    file(RENAME "${partial}" "${path}")
    set(${out_var} "${path}" PARENT_SCOPE)
endfunction()

# Bump each version together with its hash. To build offline from an existing
# source tree, set FETCHCONTENT_SOURCE_DIR_JUCE or FETCHCONTENT_SOURCE_DIR_CATCH2.
set(WAVEFORM_JUCE_VERSION "9.0.3")
set(WAVEFORM_JUCE_SHA256 "a81e5508b8a0efa483917794ebeaff56aed3075730c405a947734413f40c1aba")
set(WAVEFORM_CATCH2_VERSION "3.16.0")
set(WAVEFORM_CATCH2_SHA256 "0957cae5821b17ce07f0833aaa52b5137643a8382203221f363a8303c109af34")

# Only the module targets: skips the juceaide helper, which needs GUI libraries.
set(JUCE_MODULES_ONLY ON)

if(NOT FETCHCONTENT_SOURCE_DIR_JUCE)
    waveform_cached_archive(juce_archive "JUCE-${WAVEFORM_JUCE_VERSION}.tar.gz"
        "https://github.com/juce-framework/JUCE/archive/refs/tags/${WAVEFORM_JUCE_VERSION}.tar.gz"
        ${WAVEFORM_JUCE_SHA256})
endif()
FetchContent_Declare(JUCE
    URL "${juce_archive}"
    URL_HASH SHA256=${WAVEFORM_JUCE_SHA256}
    EXCLUDE_FROM_ALL
    SYSTEM)
FetchContent_MakeAvailable(JUCE)

if(WAVEFORM_BUILD_TESTS)
    if(NOT FETCHCONTENT_SOURCE_DIR_CATCH2)
        waveform_cached_archive(catch2_archive "Catch2-${WAVEFORM_CATCH2_VERSION}.tar.gz"
            "https://github.com/catchorg/Catch2/archive/refs/tags/v${WAVEFORM_CATCH2_VERSION}.tar.gz"
            ${WAVEFORM_CATCH2_SHA256})
    endif()
    FetchContent_Declare(Catch2
        URL "${catch2_archive}"
        URL_HASH SHA256=${WAVEFORM_CATCH2_SHA256}
        EXCLUDE_FROM_ALL
        SYSTEM)
    FetchContent_MakeAvailable(Catch2)
    list(APPEND CMAKE_MODULE_PATH "${catch2_SOURCE_DIR}/extras")
    include(Catch)
endif()
