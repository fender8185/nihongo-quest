#!/usr/bin/env bash
# Runs every automated check: syntax, unit tests, headless-Chrome e2e.
set -euo pipefail
cd "$(dirname "$0")/.."
node --check sw.js && node --check sync-core.js && node --check data.js
# every built-in grammar item names the lesson section it belongs to (-1 = none; the practice card is skipped for those)
node -e "const D=JSON.parse(require('fs').readFileSync('data.js','utf8').split('\n')[2].replace(/^const DATA = /,'').replace(/;\s*$/,''));const bad=D.GRAMMAR.filter(g=>!Number.isInteger(g.sec)||g.sec<-1||g.sec>=(D.LESSONS[g.u]||{sections:[]}).sections.length);if(bad.length){console.log('grammar items without a valid sec:',bad.slice(0,5).map(g=>g.id).join(' '),bad.length);process.exit(1)}"
# the version shown in settings must match the service-worker cache name
[ "$(grep -o "nq-v[0-9.]*" sw.js | head -1 | tr -d -c 0-9.)" = "$(grep -o "const APP_VERSION = '[0-9.]*'" index.html | tr -d -c 0-9.)" ] || { echo "APP_VERSION and sw.js CACHE differ"; exit 1; }
# the data file version must agree in index.html (<script src>), sw.js (PRECACHE) and data.js (header)
dv="$(grep -o 'data.js?v=[0-9]*' index.html | tr -d -c 0-9)"
[ "$dv" = "$(grep -o 'data.js?v=[0-9]*' sw.js | tr -d -c 0-9)" ] && [ "$dv" = "$(grep -o 'DATA_VERSION [0-9]*' data.js | tr -d -c 0-9)" ] || { echo "data.js version differs between index.html, sw.js and data.js"; exit 1; }
node --test-reporter=tap tests/sync-core.test.js | grep -E "^# (pass|fail)"   # tap: Node 23+ prints "ℹ pass" by default
node --test-reporter=tap tests/curriculum.test.js | grep -E "^# (pass|fail)"   # the N3–N1 curriculum outline: sources, candidates, checker
# a release must carry a new version: app files changed against origin/main ⇒ APP_VERSION differs; data.js changed ⇒ data version differs
if git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  if ! git diff --quiet origin/main -- index.html sw.js sync-core.js; then
    [ "$(git show origin/main:index.html | grep -o "const APP_VERSION = '[0-9.]*'")" != "$(grep -o "const APP_VERSION = '[0-9.]*'" index.html)" ] || { echo "index.html/sw.js/sync-core.js changed since origin/main but APP_VERSION is unchanged"; exit 1; }
  fi
  if ! git diff --quiet origin/main -- data.js; then
    [ "$(git show origin/main:data.js 2>/dev/null | grep -o 'DATA_VERSION [0-9]*')" != "$(grep -o 'DATA_VERSION [0-9]*' data.js)" ] || { echo "data.js changed since origin/main but its DATA_VERSION is unchanged"; exit 1; }
  fi
fi
# e2e files run in parallel, three at a time (E2E_JOBS=n changes it; each starts its own http.server port and headless Chrome); results are printed per file
# with the project venv when there is one (/usr/bin/python3 -m venv .venv && .venv/bin/pip install websockets): -I keeps the user site out,
# and Homebrew Python 3.15 on this Mac spends 35 s resolving 127.0.0.1 each time http.server starts
py=python3; [ -x .venv/bin/python3 ] && py=.venv/bin/python3
e2e=(tests/e2e/test_storage.py tests/e2e/test_pwa.py tests/e2e/test_sync.py tests/e2e/test_sync_ui.py tests/e2e/test_fixes.py tests/e2e/test_vocab.py tests/e2e/test_conj.py tests/e2e/test_content.py tests/e2e/test_pre_n5.py tests/e2e/test_stage_tests.py tests/e2e/test_today_list.py tests/e2e/test_queues.py tests/e2e/test_stats_levels.py)
tmp="$(mktemp -d)"; pids=()
for t in "${e2e[@]}"; do
  while [ "$(jobs -rp | wc -l)" -ge "${E2E_JOBS:-3}" ]; do sleep 0.2; done   # three at once: six still pushed this 12-core Mac past a load of 20, so pages missed data.js and the fans ran
  ( set +e; "$py" -I "$t" > "$tmp/$(basename "$t").log" 2>&1; echo $? > "$tmp/$(basename "$t").rc" ) & pids+=($!)   # set +e: a failing file must still record its exit code
done
wait "${pids[@]}"
fail=0
for t in "${e2e[@]}"; do
  n="$(basename "$t")"; rc="$(cat "$tmp/$n.rc" 2>/dev/null || echo 1)"; echo "$n: $(tail -1 "$tmp/$n.log")"
  if [ "$rc" != "0" ]; then fail=1; grep -E "^(FAIL|not ok)" "$tmp/$n.log" | head -5; fi
done
rm -rf "$tmp"; [ "$fail" = "0" ] || exit 1
echo ALL_OK
