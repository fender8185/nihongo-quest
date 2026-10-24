#!/usr/bin/env bash
# Render icons/icon.svg to the PNG sizes the manifest and iOS need.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
render() { # size, out
  qlmanage -t -s "$1" -o "$tmp" icons/icon.svg >/dev/null 2>&1 || true
  if [ -f "$tmp/icon.svg.png" ]; then mv "$tmp/icon.svg.png" "$2"; else
    python3 -c "from PIL import Image; Image.new('RGB',($1,$1),(14,15,19)).save('$2')"; fi
}
render 192 icons/icon-192.png
render 512 icons/icon-512.png
render 180 icons/apple-touch-icon.png
rm -rf "$tmp"
for f in icons/icon-192.png icons/icon-512.png icons/apple-touch-icon.png; do sips -g pixelWidth "$f" | tail -1; done
