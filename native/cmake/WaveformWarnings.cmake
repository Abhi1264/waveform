# Strict warnings for Waveform's own targets. Third-party headers are included
# as SYSTEM headers, so these flags do not apply to them.
function(waveform_set_warnings target)
    if(MSVC)
        target_compile_options(${target} PRIVATE /W4 /permissive- /utf-8)
        if(WAVEFORM_WARNINGS_AS_ERRORS)
            target_compile_options(${target} PRIVATE /WX)
        endif()
    else()
        target_compile_options(${target} PRIVATE
            -Wall
            -Wextra
            -Wpedantic
            -Wconversion
            -Wsign-conversion
            -Wshadow
            -Wdouble-promotion
            -Wnon-virtual-dtor
            -Woverloaded-virtual
            -Wimplicit-fallthrough)
        if(WAVEFORM_WARNINGS_AS_ERRORS)
            target_compile_options(${target} PRIVATE -Werror)
        endif()
    endif()
endfunction()
