# Models

Checked on 2026-10-06. Weight licences are not the same thing as code licences. Waveform
offers a model only when the **weights** may be redistributed inside an AGPL-3.0-only
application. No weight file, checkpoint, or ONNX graph is committed. See ADR-018 and
[PRIVACY.md](PRIVACY.md).

## Decision

**Stem model: Open-Unmix UMX-HQ.** The user downloads four PyTorch checkpoints from Zenodo.
Bundling those files in an installer would be legal under their MIT weight licence. They
are still an explicit download, because they are 142,551,184 bytes together, because
ADR-018 says models are downloaded when the user asks, and because fetching them at
startup would be a network action the user did not take (ADR-019).

**Separation does not run.** The checkpoints are PyTorch `.pth` files. ONNX Runtime is not
linked. Loading a stem that is already a wav, aiff, flac, mp3, or ogg file uses the
existing deck loader. That playback is the file, not a neural split.

**No recommendation model and no chatbot.** Tempo, key, energy, and 32-beat phrases stay
available without a download.

## What is installed

Zenodo record [10.5281/zenodo.3370489](https://doi.org/10.5281/zenodo.3370489), published
2019-08-14, licence id `mit-license`. Each URL below was fetched once on 2026-10-06. The
size matched the Zenodo record, the MD5 matched the record, and the SHA-256 was computed
from those bytes. Tests check the hash function locally and do not fetch the files.

| Stem   | File                  |      Bytes | SHA-256                                                            |
| ------ | --------------------- | ---------: | ------------------------------------------------------------------ |
| bass   | `bass-8d85a5bd.pth`   | 35,637,796 | `8d85a5bd3f996a8867fca0e8442e077e5a3f5ec747a6112742452a8f347b39c8` |
| drums  | `drums-9619578f.pth`  | 35,637,796 | `9619578f885c54737cb0234f9f9a4a679ee4f31438fd77fd1dbe02bb16c2da0a` |
| vocals | `vocals-b62c91ce.pth` | 35,637,796 | `b62c91cedbc7a066f1778ead5b5cecb377aa3a46a31af1cce7c5c8769339d083` |
| other  | `other-b52fbbf7.pth`  | 35,637,796 | `b52fbbf76479e752bd72e02304c602ac7802aa5bfbfb9cd12054b2695d5093ab` |

The download URL for each file is
`https://zenodo.org/api/records/3370489/files/<file>/content`. The files are stored under
the app data directory at `models/open-unmix-umxhq/3370489/` only after the SHA-256 matches.
A mismatch does not write that file.

The button that starts this download is in the library panel. Nothing in startup calls it.

## Stem separation research

| Model                                                  | Code licence                                                                       | Weight licence                                                                                                                                                                                                                                                                         | Redistribute in this AGPL app | Commercial use of the weights                        | Approximate size                           | Offered                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Demucs, including Hybrid Transformer Demucs (HTDemucs) | MIT (Meta, `facebookresearch/demucs` `LICENSE`, README on `main` and tag `v4.0.1`) | Not MIT. Alexandre Défossez, 2022-05-23, on [issue 327](https://github.com/facebookresearch/demucs/issues/327): the weights are not covered by the MIT licence and are provided only for scientific purposes.                                                                          | No                            | No                                                   | Not measured. Not offered.                 | No                                                                                                            |
| Open-Unmix UMX and UMX-HQ                              | MIT (Inria, `sigsep/open-unmix-pytorch` `LICENSE`)                                 | MIT on Zenodo records 3370486 (UMX) and 3370489 (UMX-HQ)                                                                                                                                                                                                                               | Yes. The weights stay MIT.    | Yes, under MIT                                       | UMX-HQ is 142,551,184 bytes for four stems | UMX-HQ yes, as a download. UMX is the same licence and a lower-bandwidth model, so it is not the one offered. |
| Open-Unmix UMX-L                                       | MIT code, same repository                                                          | CC BY-NC-SA 4.0 on Zenodo record 5069601. The README says the same.                                                                                                                                                                                                                    | No                            | No                                                   | Not measured                               | No                                                                                                            |
| MDX-Net (`kuielab/mdx-net`)                            | MIT, copyright 2020 KINoAI, repository `LICENSE`                                   | No weight licence in that repository. The README is training code.                                                                                                                                                                                                                     | No verified weight grant      | Not established                                      | Not measured                               | No                                                                                                            |
| UVR / MDX family as shipped by Ultimate Vocal Remover  | GUI code is MIT (`Anjok07/ultimatevocalremovergui` README)                         | The README asks third parties who use "our models" to honour the MIT licence and give credit. The same package also ships Demucs v3 and v4 weights, which the Demucs author excluded from MIT. There is no per-file weight licence and hash we could verify for a UVR-only ONNX model. | No                            | Not established for the files we would actually ship | Not measured                               | No                                                                                                            |
| Smaller ONNX stem model                                | —                                                                                  | No ONNX stem graph was found whose weights are under MIT, Apache-2.0, BSD, or another licence that allows AGPL redistribution, separate from the Demucs and UVR cases above.                                                                                                           | —                             | —                                                    | —                                          | No                                                                                                            |

UMX-HQ was trained on MUSDB18-HQ. The [MUSDB18 page](https://sigsep.github.io/datasets/musdb.html)
says the tracks are for academic use, and some of them are CC BY-NC-SA. That restricts the
dataset. The weight files themselves were published by the Open-Unmix authors, who include
MUSDB curators, under MIT on the Zenodo record. Waveform redistributes those weight files
under that MIT grant. It does not redistribute MUSDB audio.

## ONNX Runtime

ONNX Runtime's `LICENSE` at tag `v1.22.0` is MIT, which an AGPL application may include.
It is not linked. The stem weights are PyTorch checkpoints, so the runtime would not
execute them. No compile of the `ort` crate was attempted, and there is no build error to
record: the runtime is absent because it cannot run the model we are allowed to ship.

## Optional DJ helpers

These were reviewed so a recommendation model would not be bundled by accident. None is
offered.

| Model             | What was checked                                                           | Result                                                                                  |
| ----------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| OpenL3            | Code `LICENSE` on `marl/openl3` `master` is MIT                            | No separate weight URL, size, and SHA-256 were verified, so there is no manifest entry. |
| LAION CLAP        | README on `main` points at a Clotho download and a Google Drive checkpoint | No SPDX weight licence was stated on the files. Not offered.                            |
| A general chatbot | Not reviewed as a dependency                                               | Not included.                                                                           |

Deterministic tempo, key, energy, and phrase helpers stay in `waveform-library` and do not
download anything.
