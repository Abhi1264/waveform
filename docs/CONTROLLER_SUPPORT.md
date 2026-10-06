# Controller support

## MIDI

Channel voice messages are parsed in `waveform-library` (`parse_midi`). A message is three
bytes with a status from `0x80` to `0xEF`. The parser does not open a port. Wiring a port
into the engine, so faders do not round-trip through the webview, is the next step on a
machine with a controller attached.

## HID

The library to use is [hidapi](https://github.com/libusb/hidapi) via the Rust crate `hidapi`.
It was not linked in this tree: it needs a native HID stack on each platform, and no
controller was attached while this was written. Mappings will store command ids from the
registry in `apps/desktop/src/commands/registry.ts`.

## ASIO

ASIO stays off. Windows output is WASAPI until a Steinberg or GPL licence path is chosen.
See [LICENSING.md](LICENSING.md).
