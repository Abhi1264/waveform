# Licensing

Status: **the project licence is not decided.** The project owner deferred the decision on
2026-10-05 (ADR-020). This document lays out the facts and options so it can be made
deliberately. It is not legal advice: confirm the final choice with a lawyer, especially
for App Store distribution and any commercial use.

Facts below were checked on 2026-10-05 against JUCE 9.0.3's `LICENSE.md`, its software bill
of materials (`JUCE.spdx.json`), the JUCE 9 end user licence agreement (EULA) at
juce.com/legal/juce-9-licence, and the package registries.

## Rules until a licence is chosen

- There is no LICENSE file. Without one, the code is "all rights reserved": nobody else may
  legally use, modify or redistribute it, even if the repository becomes public.
- Every package is marked `"private": true` and `"license": "UNLICENSED"`; Rust crates set
  `publish = false`.
- No public binaries are released and no outside contributions are accepted.
- Dependencies are chosen so that no option below is ruled out: no GPL-only dependencies
  and no dependencies whose licences are incompatible with AGPLv3.

## JUCE

JUCE's modules are dual-licensed: **AGPLv3**, or the **commercial JUCE 9 licence**. JUCE's
README asks that users be told plainly: **a commercial JUCE licence may be required**,
depending on how Waveform is licensed and distributed.

### Using JUCE under AGPLv3

- No fee and no revenue limit.
- Any binary that contains JUCE is distributed under AGPLv3 as a whole: recipients get the
  complete corresponding source, including Waveform's own code, under terms compatible
  with AGPLv3.
- AGPLv3 §13 also requires offering source to users who interact with a modified version
  over a network. That matters only if Waveform ever offers a network-facing service built
  on JUCE.
- **App Store distribution is effectively ruled out.** Apple's App Store terms add usage
  restrictions that the Free Software Foundation considers incompatible with the GPL
  family; this is why VLC was removed from the App Store in 2011. This affects iPadOS (and
  the Mac App Store, if ever used). Direct downloads on macOS, Windows and Linux, and
  Android distribution through stores or F-Droid, are not affected in the same way.

### Using JUCE under the commercial licence

Tiers in the JUCE 9 EULA:

| Tier        | Annual revenue or funding limit | Subscription                               | Perpetual                                               |
| ----------- | ------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Starter     | Up to $20,000                   | Not offered                                | Free                                                    |
| Indie       | Up to $300,000                  | $40 per user per month                     | $800 per user                                           |
| Pro         | No limit                        | $175 per user per month (12-month minimum) | $3,500 per user                                         |
| Educational | No limit                        | Not offered                                | Free (eligible institutions and academic research only) |

Clauses that constrain Waveform's own licence:

- **§2.3:** the licensee must not cause JUCE to become subject to an open-source licence
  that requires JUCE, or software combined or distributed with it, to be disclosed in
  source form, licensed for making derivative works, or redistributable at no charge. In
  practice, Waveform code under GPL or AGPL cannot be combined with commercially licensed
  JUCE.
- **§1.13:** products made under different licence types (for example Starter and Indie)
  must not be combined.
- The limits count revenue **or funding**, so donations and grants need checking against
  §1.2.1 of the EULA.

### What JUCE bundles

JUCE 9.0.3's bill of materials lists the third-party code it vendors. Relevant to Waveform:

| Component                                 | Licence                                | Relevance                                        |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| zlib 1.3.2                                | Zlib                                   | Compiled into `juce_core`.                       |
| FLAC 1.5.0, libogg 1.3.6, libvorbis 1.3.7 | BSD-3-Clause                           | FLAC and Ogg Vorbis decoding.                    |
| Opus 1.6.1, opusfile, libopusenc          | BSD-3-Clause                           | Opus support.                                    |
| Oboe 1.10.0                               | Apache-2.0                             | Android audio.                                   |
| ASIO SDK 2.3                              | Steinberg ASIO licence or GPL-3.0-only | Low-latency Windows audio, optional (see below). |
| VST3 SDK 3.8.0, AudioUnitSDK, LV2         | MIT, Apache-2.0, ISC                   | Plugin hosting, if ever added.                   |

JUCE's examples are ISC-licensed. Waveform's `THIRD_PARTY_LICENSES.md` (Phase 1) lists
what Waveform actually compiles in.

### ASIO on Windows

The ASIO SDK is available under GPLv3 or under Steinberg's own licence. A GPLv3-compatible
Waveform build (any option below combined with AGPL JUCE) can use the GPLv3 option. A
build using commercially licensed JUCE would need Steinberg's licence instead. Without
ASIO, Windows audio still works through WASAPI. Decided in Phase 7.

## Options for Waveform's own code

| Question                             | A: AGPLv3 or GPLv3                                                                                                           | B: Permissive (MIT or Apache-2.0)                                       | C: MPL-2.0                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Desktop and Android builds           | JUCE under AGPLv3, no fee                                                                                                    | JUCE under AGPLv3, no fee                                               | JUCE under AGPLv3, no fee                                                  |
| iPadOS App Store                     | Blocked, unless every copyright holder agrees to a separate licence (requires a CLA) and a commercial JUCE licence is bought | Possible with a commercial JUCE licence (Starter is free up to $20,000) | Likely possible with a commercial JUCE licence; confirm §2.3 with a lawyer |
| Can others ship closed-source forks? | No                                                                                                                           | Yes, but they need their own JUCE licence for binaries                  | Only if they leave Waveform's files open                                   |
| Contributor terms                    | DCO, or a CLA if dual licensing is wanted                                                                                    | DCO                                                                     | DCO                                                                        |
| ASIO (GPLv3) in desktop builds       | Compatible                                                                                                                   | Compatible (the binary is AGPLv3 anyway)                                | Compatible (through MPL's secondary-licence clause)                        |

Notes:

- **A** keeps every derivative open, at the cost of the App Store and of contributor
  friction if dual licensing is ever needed. GPLv3 for Waveform's own files is allowed
  alongside AGPLv3 JUCE (GPLv3 §13), but the combined binary is still AGPLv3.
- **B** keeps every distribution route open. Desktop binaries that include AGPL JUCE are
  still AGPLv3 as a whole. Apache-2.0 adds an explicit patent grant; MIT is shorter. Both
  are compatible with GPLv3 and AGPLv3.
- **C** is file-level copyleft: changes to Waveform's files stay open, while new code may
  use other licences. MediaBunny uses MPL-2.0, and MPL-2.0 apps already ship on the App
  Store (for example Firefox for iOS).

To decide, the project owner needs to answer:

1. Is iPadOS App Store distribution a goal?
2. Should others be allowed to build closed-source products from Waveform's code?
3. Would the project buy a commercial JUCE licence if revenue or funding passes $20,000?
4. Who holds the copyright: an individual, a company or a foundation?

## Contributor terms: CLA or DCO

- **Developer Certificate of Origin (DCO):** each commit carries a `Signed-off-by` line
  certifying the contributor's right to submit it. Low friction. It does not allow
  relicensing.
- **Contributor Licence Agreement (CLA):** contributors grant the project rights over
  their contributions, which can include relicensing. It is needed for dual licensing
  under option A. Higher friction; some contributors refuse to sign CLAs.

## Other dependencies

| Licence                                                                         | Policy                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| MIT, ISC, BSD-2/3-Clause, Apache-2.0, Zlib, 0BSD, BSL-1.0, Unicode-3.0, CC0-1.0 | Allowed.                                                                                         |
| MPL-2.0                                                                         | Allowed. Modified files must stay MPL-2.0. MediaBunny 1.61.1 is MPL-2.0.                         |
| SIL OFL 1.1 (fonts)                                                             | Allowed. Ship the licence text; never sell the fonts on their own.                               |
| LGPL                                                                            | Needs a recorded decision: static and mobile builds make its relinking obligations hard to meet. |
| GPL or AGPL (other than JUCE and the ASIO SDK)                                  | Needs a recorded decision: it would force option A.                                              |
| Non-commercial, no-derivatives, or no licence at all                            | Not allowed.                                                                                     |

## Codecs and patents

| Format                 | Decoder                                                                 | Notes                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WAV, AIFF              | JUCE                                                                    | Uncompressed PCM; no patent concerns.                                                                                                                           |
| FLAC, Ogg Vorbis, Opus | JUCE (bundled reference libraries)                                      | Royalty-free formats.                                                                                                                                           |
| MP3                    | Operating system or JUCE's own decoder                                  | The MP3 patents have expired. Which decoder each platform uses is decided in Phase 4.                                                                           |
| AAC                    | Operating system only (CoreAudio, Media Foundation, Android MediaCodec) | Still patent-licensed. Waveform does not ship an AAC decoder; the OS vendor licenses it. Linux support depends on the user's system and is assessed in Phase 4. |
| ALAC                   | CoreAudio on Apple platforms                                            | Apple released ALAC under Apache-2.0. Support elsewhere is decided in Phase 4.                                                                                  |

Patent law differs by country. Get advice before any commercial distribution.

## AI models

Model weights often have licences different from the code that runs them, and some forbid
commercial use. Each model is tracked separately in its download manifest (ADR-018), and
only models whose weights may be redistributed and used commercially are offered. No model
files are committed to the repository.

## Trademarks

Tracktion Corporation sells a DAW called **Waveform**. Using the same name for audio
software risks a trademark conflict. A trademark search, and possibly a new name, are needed
before any public release. Tracked in the [roadmap's open decisions](ROADMAP.md#open-decisions).
