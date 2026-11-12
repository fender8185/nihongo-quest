#!/usr/bin/env bash
# Runs every automated check: syntax, unit tests, headless-Chrome e2e.
set -euo pipefail
cd "$(dirname "$0")/.."
node --check sw.js && node --check sync-core.js && node --check data.js && node --check data-n3.js && node --check events.js && node --check pics.js
# every built-in grammar item names the lesson section it belongs to (-1 = none; the practice card is skipped for those)
node scripts/data-file.js --check   # one entry per line, so grep finds an item (node scripts/data-file.js puts it back)
node -e "const D=require('./scripts/data-file').load();const bad=D.GRAMMAR.filter(g=>!Number.isInteger(g.sec)||g.sec<-1||g.sec>=(D.LESSONS[g.u]||{sections:[]}).sections.length);if(bad.length){console.log('grammar items without a valid sec:',bad.slice(0,5).map(g=>g.id).join(' '),bad.length);process.exit(1)}"
node scripts/check-zh-tiles.js | tail -1   # 句意拼貼: the pieces join to the item's Chinese, two or three decoys, none of them a piece
# every file index.html loads from this folder is precached by sw.js, so the app works offline (and in the store builds, which ship these files)
for f in $(grep -oE '(src|href)="\./[^"]+"' index.html | sed -E 's/^(src|href)="//; s/"$//'); do grep -qF "'$f'" sw.js || { echo "index.html loads $f but sw.js does not precache it"; exit 1; }; done
# the version shown in settings must match the service-worker cache name
[ "$(grep -o "nq-v[0-9.]*" sw.js | head -1 | tr -d -c 0-9.)" = "$(grep -o "const APP_VERSION = '[0-9.]*'" js/40_core.js | tr -d -c 0-9.)" ] || { echo "APP_VERSION (js/40_core.js) and sw.js CACHE differ"; exit 1; }
# the data file version must agree in index.html (<script src>), sw.js (PRECACHE) and data.js (header)
dv="$(grep -o 'data.js?v=[0-9]*' index.html | tr -d -c 0-9)"
[ "$dv" = "$(grep -o 'data.js?v=[0-9]*' sw.js | tr -d -c 0-9)" ] && [ "$dv" = "$(grep -o 'DATA_VERSION [0-9]*' data.js | tr -d -c 0-9)" ] || { echo "data.js version differs between index.html, sw.js and data.js"; exit 1; }
# the N3 data file (2026-11-11): the same, with DATA_N3_VERSION
d3="$(grep -o 'data-n3.js?v=[0-9]*' index.html | tr -d -c 0-9)"
[ -n "$d3" ] && [ "$d3" = "$(grep -o 'data-n3.js?v=[0-9]*' sw.js | tr -d -c 0-9)" ] && [ "$d3" = "$(grep -o 'DATA_N3_VERSION [0-9]*' data-n3.js | tr -d -c 0-9)" ] || { echo "data-n3.js version differs between index.html, sw.js and data-n3.js"; exit 1; }
# the town's events (events.js): its version agrees in index.html, sw.js and its header; the checker passes (kanji marked, levels, grammar, people)
ev="$(grep -o 'events.js?v=[0-9]*' index.html | tr -d -c 0-9)"
[ "$ev" = "$(grep -o 'events.js?v=[0-9]*' sw.js | tr -d -c 0-9)" ] && [ "$ev" = "$(grep -o 'EVENTS_VERSION [0-9]*' events.js | tr -d -c 0-9)" ] || { echo "events.js version differs between index.html, sw.js and events.js"; exit 1; }
# the words' pictures (pics.js): its version agrees in index.html, sw.js and its header
pv="$(grep -o 'pics.js?v=[0-9]*' index.html | tr -d -c 0-9)"
[ -n "$pv" ] && [ "$pv" = "$(grep -o 'pics.js?v=[0-9]*' sw.js | tr -d -c 0-9)" ] && [ "$pv" = "$(grep -o 'PICS_VERSION [0-9]*' pics.js | tr -d -c 0-9)" ] || { echo "pics.js version differs between index.html, sw.js and pics.js"; exit 1; }
node --test-reporter=tap tests/events.test.js | grep -E "^# (pass|fail)"
node scripts/check-events.js | tail -1
# events.js changed since the last push (main or test) ⇒ its version changed too, or phones keep the old copy (the service worker reuses ?v= files)
for base in origin/main origin/test; do
  if git rev-parse --verify -q "$base" >/dev/null 2>&1 && git cat-file -e "$base:events.js" 2>/dev/null && ! git diff --quiet "$base" -- events.js; then
    [ "$(git show "$base:events.js" | grep -o 'EVENTS_VERSION [0-9]*')" != "$(grep -o 'EVENTS_VERSION [0-9]*' events.js)" ] || { echo "events.js changed since $base but its EVENTS_VERSION is unchanged"; exit 1; }
  fi
done
for base in origin/main origin/test; do   # the same for pics.js
  if git rev-parse --verify -q "$base" >/dev/null 2>&1 && git cat-file -e "$base:pics.js" 2>/dev/null && ! git diff --quiet "$base" -- pics.js; then
    [ "$(git show "$base:pics.js" | grep -o 'PICS_VERSION [0-9]*')" != "$(grep -o 'PICS_VERSION [0-9]*' pics.js)" ] || { echo "pics.js changed since $base but its PICS_VERSION is unchanged"; exit 1; }
  fi
done
node --test-reporter=tap tests/sync-core.test.js | grep -E "^# (pass|fail)"   # tap: Node 23+ prints "ℹ pass" by default
node --test-reporter=tap tests/curriculum.test.js | grep -E "^# (pass|fail)"   # the N3–N1 curriculum outline: sources, candidates, checker
node scripts/curriculum/check-outline.js | tail -1   # the outline files themselves pass the checker (exit 1 on any problem)
# a release must carry a new version: app files changed against origin/main ⇒ APP_VERSION differs; data.js changed ⇒ data version differs
if git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  if ! git diff --quiet origin/main -- index.html sw.js sync-core.js js css; then   # APP_VERSION lives in js/40_core.js since 2026-11-11 (in index.html before)
    [ "$( (git show origin/main:js/40_core.js 2>/dev/null || git show origin/main:index.html) | grep -o "const APP_VERSION = '[0-9.]*'")" != "$(grep -o "const APP_VERSION = '[0-9.]*'" js/40_core.js)" ] || { echo "the app (index.html, js/, css/, sw.js, sync-core.js) changed since origin/main but APP_VERSION is unchanged"; exit 1; }
  fi
  if ! git diff --quiet origin/main -- data.js; then
    [ "$(git show origin/main:data.js 2>/dev/null | grep -o 'DATA_VERSION [0-9]*')" != "$(grep -o 'DATA_VERSION [0-9]*' data.js)" ] || { echo "data.js changed since origin/main but its DATA_VERSION is unchanged"; exit 1; }
  fi
  if git cat-file -e origin/main:data-n3.js 2>/dev/null && ! git diff --quiet origin/main -- data-n3.js; then
    [ "$(git show origin/main:data-n3.js | grep -o 'DATA_N3_VERSION [0-9]*')" != "$(grep -o 'DATA_N3_VERSION [0-9]*' data-n3.js)" ] || { echo "data-n3.js changed since origin/main but its DATA_N3_VERSION is unchanged"; exit 1; }
  fi
fi
# e2e files run in parallel, three at a time (E2E_JOBS=n changes it; each starts its own http.server port and headless Chrome); results are printed per file
# with the project venv when there is one (/usr/bin/python3 -m venv .venv && .venv/bin/pip install websockets): -I keeps the user site out,
# and Homebrew Python 3.15 on this Mac spends 35 s resolving 127.0.0.1 each time http.server starts
py=python3; [ -x .venv/bin/python3 ] && py=.venv/bin/python3
e2e=(tests/e2e/test_storage.py tests/e2e/test_pwa.py tests/e2e/test_sync.py tests/e2e/test_sync_ui.py tests/e2e/test_fixes.py tests/e2e/test_vocab.py tests/e2e/test_conj.py tests/e2e/test_content.py tests/e2e/test_pre_n5.py tests/e2e/test_stage_tests.py tests/e2e/test_today_list.py tests/e2e/test_queues.py tests/e2e/test_stats_levels.py tests/e2e/test_levels_n3.py tests/e2e/test_motion.py tests/e2e/test_phone_layout.py tests/e2e/test_tiles.py tests/e2e/test_shop.py tests/e2e/test_town_events.py tests/e2e/test_sound.py)
tmp="$(mktemp -d)"; pids=()
for t in "${e2e[@]}"; do
  while [ "$(jobs -rp | wc -l)" -ge "${E2E_JOBS:-3}" ]; do sleep 0.2; done   # three at once: six still pushed this 12-core Mac past a load of 20, so pages missed data.js and the fans ran
  ( set +e; "$py" -I "$t" > "$tmp/$(basename "$t").log" 2>&1; echo $? > "$tmp/$(basename "$t").rc" ) & pids+=($!)   # set +e: a failing file must still record its exit code
done
wait "${pids[@]}"
fail=0
for t in "${e2e[@]}"; do
  n="$(basename "$t")"; rc="$(cat "$tmp/$n.rc" 2>/dev/null || echo 1)"; echo "$n: $(tail -1 "$tmp/$n.log")"
  if [ "$rc" != "0" ]; then fail=1; grep -E "^(FAIL|not ok)" "$tmp/$n.log" | head -5 || true; fi   # a file that dies without a FAIL line (a hang, a crash) must not end the report here
done
rm -rf "$tmp"; [ "$fail" = "0" ] || exit 1
echo ALL_OK
