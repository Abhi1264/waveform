#!/bin/sh
# Compiles the audio-thread sources with -fsanitize=realtime.
# Apple clang does not provide the sanitizer; set WAVEFORM_CLANG to an LLVM
# clang, or install Homebrew LLVM so this can find it.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
compiler=${WAVEFORM_CLANG:-}

if [ -z "$compiler" ]; then
  for candidate in \
    /opt/homebrew/opt/llvm/bin/clang++ \
    /usr/local/opt/llvm/bin/clang++ \
    clang++
  do
    if [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" -fsanitize=realtime -x c++ -c /dev/null -o /dev/null >/dev/null 2>&1; then
        compiler=$candidate
        break
      fi
    fi
  done
fi

if [ -z "$compiler" ]; then
  echo "No clang with -fsanitize=realtime was found (Apple clang does not ship it)." >&2
  if [ -n "${CI:-}" ]; then
    exit 1
  fi
  exit 0
fi

echo "Realtime sanitizer: $compiler"
"$compiler" --version | head -n 1

compile() {
  "$compiler" -std=c++20 -fsanitize=realtime -c "$1" -I "$root/native/dsp/include" \
    -I "$root/native/audio-engine/include" -o /dev/null
}

compile "$root/native/dsp/src/tone.cpp"
compile "$root/native/audio-engine/src/mixer.cpp"
echo "Audio-thread translation units compiled with -fsanitize=realtime."
