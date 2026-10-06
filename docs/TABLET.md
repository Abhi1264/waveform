# Tablet spike

Checked on 6 October 2026 from the macOS tree. No Android or iPad project is configured, and
no tablet was attached, so this spike did not compile a Tauri Android activity.

## Decision

Keep device I/O on JUCE. If a later Android build shows that JUCE cannot run inside Tauri's
activity, switch only the device open/close path to Oboe and leave the mixer as it is. That
is the fallback already written in [PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md). App Store and
Play Store builds stay blocked until the app licence and the JUCE licence allow them.

## Layout

Touch density already uses 44 px targets. The command palette buttons use that minimum
height. Portrait and landscape arrangements of the same decks are still to be drawn against
a device, not inferred from a desktop window.
