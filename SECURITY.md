# Security

## Supported versions

There are no releases yet, so no version receives security fixes. This section will list
supported versions once the first release ships.

## Reporting a vulnerability

Please report vulnerabilities privately, never in a public issue. Once the repository is
published, use its private vulnerability reporting ("Report a vulnerability" on the
Security tab). Include what you found, how to reproduce it, and the version or commit.

## Security model

What the desktop app does today to limit what can go wrong:

- **Bundled content only.** The webview loads only files shipped with the app. A strict
  content security policy blocks remote scripts, styles, images, fonts and connections;
  the only permitted connection is Tauri's own IPC channel.
- **Least privilege.** The window can call one command, `engine_info`, and nothing else.
  JavaScript has no generic access to the filesystem, shell, network or other Tauri APIs.
- **No network access.** The app makes no network requests, and JUCE is built without its
  networking (`JUCE_USE_CURL=0`) and web-browser components.
- **Pinned supply chain.** Dependencies are pinned to exact versions, C++ archives are
  verified against SHA-256 hashes, CI actions are pinned to commit hashes, and npm
  packages younger than a day are refused.

See the security section of [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the rules that
later phases follow.
