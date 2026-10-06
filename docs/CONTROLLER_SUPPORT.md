# Controller support

## MIDI

Channel voice messages are parsed in `waveform-library` (`parse_midi`). A message is three
bytes with a status from `0x80` to `0xEF`. The parser does not open a port. Wiring a port
into the engine, so faders do not round-trip through the webview, is the next step on a
machine with a controller attached.

## HID

The library to use is [hidapi](https://github.com/libusb/hidapi) via the Rust crate `hidapi`.
That choice stands. The crate is not linked: it needs a native HID stack on each platform,
and no controller was attached while this was written. A dependency that cannot build on
this Mac without a device was not added.

Mappings store a control name and a command id in `controller_mappings`, and the same pair
in the desktop command registry. Time-critical MIDI does not wait for the webview: CC 1
sets the crossfader and a note-on starts the sampler inside the mixer (`Mixer::applyMidi`).
`command_for_midi` returns the matching command id for the registry.

## ASIO

`WAVEFORM_ENABLE_ASIO` defaults to **off**. CI does not pass it, and ASIO is not compiled
in that configuration. Windows output is WASAPI.

The project is AGPL-3.0-only, so the ASIO SDK's GPLv3 terms are the compatible option.
Steinberg's separate licence is the alternative for a commercial-JUCE build, which this
project is not. JUCE 9.0.3 already contains the ASIO headers under those two licences
(`modules/juce_audio_devices/native/asio/`). This repository does not commit a second copy
and does not download one.

On Windows, turn it on with a local SDK:

```sh
cmake -DWAVEFORM_ENABLE_ASIO=ON -DWAVEFORM_ASIO_SDK_DIR=/path/to/asio-sdk ..
```

The directory must contain `common/iasiodrv.h`, or `iasiodrv.h` itself. If the option is
on and that header is missing, CMake stops and ASIO is not compiled. With the option on
and `WAVEFORM_ASIO_SDK_DIR` empty, the build uses the headers bundled in the JUCE download,
under the GPLv3 terms. On macOS and Linux the option does not compile ASIO: it is
Windows-only, and the configure log says it was not compiled.
