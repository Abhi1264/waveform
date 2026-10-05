#!/usr/bin/env bash
# Checks the repository's C++ files with a pinned clang-format. With --fix,
# formats them instead. Needs uv or pipx, which fetch that clang-format.
set -euo pipefail

version=23.1.2

mode=(--dry-run --Werror)
done_message="formatted correctly"
if [[ "${1:-}" == "--fix" ]]; then
  mode=(-i)
  done_message="formatted"
fi

if command -v uvx >/dev/null; then
  clang_format=(uvx "clang-format@${version}")
elif command -v pipx >/dev/null; then
  clang_format=(pipx run "clang-format==${version}")
else
  echo "error: install uv (https://docs.astral.sh/uv/) or pipx to run clang-format ${version}" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

files=()
while IFS= read -r -d '' file; do
  files+=("$file")
done < <(git ls-files -z --cached --others --exclude-standard -- '*.cpp' '*.hpp' '*.cc' '*.h')

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No C++ files to check."
  exit 0
fi

"${clang_format[@]}" "${mode[@]}" "${files[@]}"
echo "clang-format ${version}: ${#files[@]} files ${done_message}."
