#!/bin/bash
# Renders the artwork to PNG with headless Chrome. Usage: CHROME=/path/to/chrome ./render.sh [out-dir]
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$HERE/../../.github/images}
CHROME=${CHROME:-$(ls ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome 2>/dev/null | tail -1)}
shot() { # name width height scale output
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor="$4" --window-size="$2,$3" --virtual-time-budget=8000 \
    --screenshot="$OUT/$5" "file://$HERE/$1.html" >/dev/null 2>&1
  echo "$OUT/$5"
}
shot social-preview 1280 640 1 social-preview.png
shot header 1500 500 2 header.png
shot diagram 1500 780 2 mmsp.png
