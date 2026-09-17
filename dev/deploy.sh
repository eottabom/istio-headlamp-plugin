#!/usr/bin/env bash
# Build once and push the result everywhere it is being viewed.
#
# There are two places a plugin gets loaded during development, and forgetting
# one means reviewing a stale build: the desktop app's plugin directory, and
# any Headlamp server container with the plugin directory mounted.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

# Copy all of dist, not just main.js: the build also emits dist/locales, and
# leaving it behind means the plugin silently falls back to English.
install_to() {
  local dest="$1"
  mkdir -p "$dest"
  rm -rf "$dest/locales"
  cp -R dist/. "$dest/"
  cp package.json "$dest/"
  echo "-> $dest"
}

install_to "$HOME/.config/Headlamp/plugins/headlamp-istio"
for extra in "$@"; do
  install_to "$extra/headlamp-istio"
done

echo
echo "Reload the page (or restart the desktop app) to pick it up."
shasum -a 256 dist/main.js
