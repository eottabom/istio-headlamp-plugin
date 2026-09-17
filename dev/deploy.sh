#!/usr/bin/env bash
# Build once and push the result everywhere it is being viewed.
#
# There are two places a plugin gets loaded during development, and forgetting
# one means reviewing a stale build: the desktop app's plugin directory, and
# any Headlamp server container with the plugin directory mounted.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

DESKTOP="$HOME/.config/Headlamp/plugins/headlamp-istio"
mkdir -p "$DESKTOP"
cp dist/main.js package.json "$DESKTOP/"
echo "-> $DESKTOP"

for extra in "$@"; do
  mkdir -p "$extra/headlamp-istio"
  cp dist/main.js package.json "$extra/headlamp-istio/"
  echo "-> $extra/headlamp-istio"
done

echo
echo "Reload the page (or restart the desktop app) to pick it up."
shasum -a 256 dist/main.js
