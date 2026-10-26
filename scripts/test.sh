#!/usr/bin/env bash
# Runs every automated check: syntax, unit tests, headless-Chrome e2e.
set -euo pipefail
cd "$(dirname "$0")/.."
node --check sw.js && node --check sync-core.js && node --check data.js
# the version shown in settings must match the service-worker cache name
[ "$(grep -o "nq-v[0-9]*" sw.js | head -1 | tr -d -c 0-9)" = "$(grep -o "const APP_VERSION = '[0-9]*'" index.html | tr -d -c 0-9)" ] || { echo "APP_VERSION and sw.js CACHE differ"; exit 1; }
# the data file version must agree in index.html (<script src>), sw.js (PRECACHE) and data.js (header)
dv="$(grep -o 'data.js?v=[0-9]*' index.html | tr -d -c 0-9)"
[ "$dv" = "$(grep -o 'data.js?v=[0-9]*' sw.js | tr -d -c 0-9)" ] && [ "$dv" = "$(grep -o 'DATA_VERSION [0-9]*' data.js | tr -d -c 0-9)" ] || { echo "data.js version differs between index.html, sw.js and data.js"; exit 1; }
node tests/sync-core.test.js | grep -E "^# (pass|fail)"
# a release must carry a new version: app files changed against origin/main ⇒ APP_VERSION differs; data.js changed ⇒ data version differs
if git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  if ! git diff --quiet origin/main -- index.html sw.js sync-core.js; then
    [ "$(git show origin/main:index.html | grep -o "const APP_VERSION = '[0-9]*'")" != "$(grep -o "const APP_VERSION = '[0-9]*'" index.html)" ] || { echo "index.html/sw.js/sync-core.js changed since origin/main but APP_VERSION is unchanged"; exit 1; }
  fi
  if ! git diff --quiet origin/main -- data.js; then
    [ "$(git show origin/main:data.js 2>/dev/null | grep -o 'DATA_VERSION [0-9]*')" != "$(grep -o 'DATA_VERSION [0-9]*' data.js)" ] || { echo "data.js changed since origin/main but its DATA_VERSION is unchanged"; exit 1; }
  fi
fi
# e2e files run in parallel (each starts its own http.server port and headless Chrome); results are printed per file
tmp="$(mktemp -d)"; pids=()
for t in tests/e2e/test_storage.py tests/e2e/test_pwa.py tests/e2e/test_sync.py tests/e2e/test_sync_ui.py tests/e2e/test_fixes.py tests/e2e/test_vocab.py; do
  ( python3 -I "$t" > "$tmp/$(basename "$t").log" 2>&1; echo $? > "$tmp/$(basename "$t").rc" ) & pids+=($!)
done
wait "${pids[@]}"
fail=0
for t in tests/e2e/test_storage.py tests/e2e/test_pwa.py tests/e2e/test_sync.py tests/e2e/test_sync_ui.py tests/e2e/test_fixes.py tests/e2e/test_vocab.py; do
  n="$(basename "$t")"; rc="$(cat "$tmp/$n.rc")"; echo "$n: $(tail -1 "$tmp/$n.log")"
  if [ "$rc" != "0" ]; then fail=1; grep -E "^(FAIL|not ok)" "$tmp/$n.log" | head -5; fi
done
rm -rf "$tmp"; [ "$fail" = "0" ] || exit 1
echo ALL_OK
