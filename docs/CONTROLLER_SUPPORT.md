# Controller support

## MIDI

Channel voice messages are parsed in `waveform-library` (`parse_midi`). A message is three
bytes with a status from `0x80` to `0xEF`. The parser does not open a port. Wiring a port
into the engine, so faders do not round-trip through the webview, is the next step on a
machine with a controller attached.

## HID

The library to use is [hidapi](https://github.com/libusb/hidapi) via the Rust crate `hidapi`.
It was not linked in this tree: it needs a native HID stack on each platform, and no
controller was attached while this was written.

Mappings store a control name and a command id in `controller_mappings`, and the same pair
in the desktop command registry. Time-critical MIDI does not wait for the webview: CC 1
sets the crossfader and a note-on starts the sampler inside the mixer (`Mixer::applyMidi`).
`command_for_midi` returns the matching command id for the registry.

## ASIO

ASIO stays off. Windows output is WASAPI until a Steinberg or GPL licence path is chosen.
See [LICENSING.md](LICENSING.md).
