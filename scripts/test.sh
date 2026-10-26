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
for t in tests/e2e/test_storage.py tests/e2e/test_pwa.py tests/e2e/test_sync.py tests/e2e/test_sync_ui.py tests/e2e/test_fixes.py tests/e2e/test_vocab.py; do python3 -I "$t" | tail -1; done
echo ALL_OK
