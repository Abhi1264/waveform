#!/usr/bin/env bash
# Proves that a fresh clone builds and passes every check. Copies the files Git
# would commit (tracked files plus untracked files that are not ignored) into a
# temporary directory and runs the full pipeline there, so nothing from local
# build output, caches, or ignored files can hide a problem.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
copy="$(mktemp -d "${TMPDIR:-/tmp}/waveform-clean.XXXXXX")"

cleanup() {
  if [[ $? -eq 0 ]]; then
    rm -rf "$copy"
  else
    echo "Failed. The copy is kept for inspection at $copy" >&2
  fi
}
trap cleanup EXIT

step() {
  printf '\n==> %s\n' "$*"
}

step "Copying the checkout to $copy"
(
  cd "$repo"
  git ls-files -z --cached --others --exclude-standard |
    while IFS= read -r -d '' file; do
      # Skip tracked files that have been deleted from the working tree.
      if [[ -e "$file" ]]; then printf '%s\0' "$file"; fi
    done |
    tar --null -T - -cf -
) | tar -xf - -C "$copy"
cd "$copy"

# The JUCE and Catch2 archives are reused from the shared download cache; they
# are checked against their pinned SHA-256 before use.
export WAVEFORM_DOWNLOAD_CACHE="${WAVEFORM_DOWNLOAD_CACHE:-$repo/.cache/downloads}"

step "JavaScript: install, format, lint, type-check, test, build"
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e

step "C++: formatting"
scripts/check-native-format.sh

step "C++: configure, build and test (CMake ci preset)"
cmake --workflow --preset ci

step "Rust: format, lint, test"
cp apps/desktop/src/bindings.ts "$copy/bindings.committed.ts"
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
if ! cmp -s apps/desktop/src/bindings.ts "$copy/bindings.committed.ts"; then
  echo "error: apps/desktop/src/bindings.ts is out of date." >&2
  echo "Run 'cargo test -p waveform-desktop export_bindings' and commit the result." >&2
  exit 1
fi

step "Desktop app: build and self-test"
pnpm --filter @waveform/desktop tauri build --debug --no-bundle
self_test=(target/debug/waveform-desktop --self-test)
if [[ "$(uname -s)" == "Linux" && -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  self_test=(xvfb-run -a "${self_test[@]}")
fi
"${self_test[@]}"

step "A clean checkout builds and passes every check."
