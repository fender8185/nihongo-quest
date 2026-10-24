#!/usr/bin/env bash
# Runs every automated check: syntax, unit tests, headless-Chrome e2e.
set -euo pipefail
cd "$(dirname "$0")/.."
node --check sw.js && node --check sync-core.js
node tests/sync-core.test.js | grep -E "^# (pass|fail)"
for t in tests/e2e/test_storage.py tests/e2e/test_pwa.py tests/e2e/test_sync.py tests/e2e/test_sync_ui.py; do python3 -I "$t" | tail -1; done
echo ALL_OK
