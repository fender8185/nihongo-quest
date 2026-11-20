# 駅前の打工（N5）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 駅前 becomes the N5 work area — a new ホーム scene, four jobs (駅弁, きっぷ売り場, 落とし物, タクシー), and tickets/train rides — pushed to the test site stage by stage.

**Architecture:** (new files all `js/71w_*.js`, loaded after `71v_rairai.js`) WORK (`js/71r_work.js`) gets areas with an opening rule and units per job; each new job is a JOBS-style runner in its own file that registers with WORK and draws a `CLASS.card` close-up. The ホーム is a new outdoor place in its own file (like `71o_china.js`), wired into the same tables as 中華街大通り. Line data (みなと線, timetable, all job lines) lives in `events.js` under `TOWN.EKI`.

**Tech Stack:** vanilla JS + inline SVG, CSS in `css/app.css`, e2e via `tests/e2e/cdp.py` (headless Chrome), Node checks in `scripts/`.

**Spec:** `docs/superpowers/specs/2026-11-20-ekimae-work-design.md`

## Global Constraints

- Every push to `test` bumps `sw.js` CACHE: first push `nq-v1.19.0-test.1`, then `.2`, … ; new js files go in `index.html` `<script>` order and `sw.js` PRECACHE; `events.js` changes bump EVENTS_VERSION (now 84) in its header, `index.html` and `sw.js`.
- Japanese lines in `events.js`: every kanji as `{漢字|かな}`, above-level words `{漢字|かな|中文}`; `node scripts/check-events.js` passes.
- New CSS classes carry a module prefix (`ek-`, `bt-`, `md-`, `lf-`, `tx-`, `pf-`, `kb-`); grep `css/app.css` before adding any bare class.
- No real railway names, departure melodies or brand marks; places are the town's own.
- Laughs/cries/elongated shouts never read by TTS (SFX or a plain rewrite).
- Pay: 駅弁 120, きっぷ売り場 140, 落とし物 160, タクシー 180; units m1, m2, m3, m4; area opens at 中華街打工證 一人前.
- みなと線 fares from みなと: 白鷺 310/160, 大川 260/130, 花田 220/110, 川口 170/90, みなと港 140/70; 快速 stops 川口・白鷺・みなと港; 1番線 白鷺方面, 2番線 みなと港方面; timetable each hour 6–22: 白鷺行き 普通 :10 :40, 快速 :25 :55; みなと港行き 普通 :02 :32, 快速 :17 :47.
- Before each push: the job's e2e file, then one full `bash scripts/test.sh` (ALL_OK), screenshots at 390×844 and 1280×800 looked at by me.
- Remind the user to press 生成 with the count of new voiced lines after each push.

## Review Focus

1. A shift left halfway and resumed (card shut, app reloaded) — each new job must pick up at `ctx.done` without double-counting or redrawing a finished task as unfinished (test per job: resume after 3 tasks).
2. A phone 360–390 px wide — every new card fits without horizontal scroll and the tap targets stay ≥ 40 px (test_phone_layout additions per card).
3. A learner below the job's unit or without 中華街 一人前 who taps the keeper — gets the reason, never an empty card (test in Task 1).
4. Night and day (`--day`) — the ホーム and every close-up stay readable by night (screenshot check each stage, hc() colours).
5. The voice queue — a new customer or announcement never cuts a line being said (use `said()` chains like 站櫃; test that the next task waits for the last line).

---

### Task 1: WORK by area and unit; 駅前's 求人看板 (stage 1a)

**Files:**
- Modify: `js/71r_work.js` (AREAS, PLACES, can, here, board, book, intro RULES, test switch)
- Modify: `js/71b_places.js` (`PLACE_USE.station` board entry), `js/71c_town.js` (`stationHtml` board art)
- Modify: `events.js` (`TOWN.WORK.hello/yes/first` for haru, harada, kobayashi, suzuki; `TOWN.EKI` skeleton)
- Test: `tests/e2e/test_ekimae.py` (new, PORT 8834), `scripts/test.sh` list if files are listed

**Interfaces:**
- Produces: `WORK.AREAS.ekimae = { name: '駅前', ranks: ['新人', '一人前'], after: 'chinatown' }`; `PLACES[job].unit` ('m1'…'m4'); `WORK.areaOpen(area) -> bool`; `WORK.board(area = 'chinatown')`; `PLACES[job].hours` or `who` presence for `here()`; `WORK.ekiTool()` (test-site switch `nq_work_eki`).
- Job ids: `bento`, `window`, `lost`, `taxi`.

- [ ] **Step 1: Failing tests** — `test_ekimae_opens_after_chinatown_and_by_unit`: with no 中華街 S shifts every eki job `can().ok` is false and `why` names 一人前; after four S shifts and `state.currentUnit = 'm1'` only `bento` opens; m2 adds `window`, m3 `lost`, m4 `taxi`; the test switch opens all. `test_ekimae_board_lists_four_jobs`: `WORK.board('ekimae')` card has four `.wk-job` rows and the line 「先在中華街拿到打工證「一人前」」 while not open.
- [ ] **Step 2:** run `.venv/bin/python3 -I tests/e2e/test_ekimae.py` — FAIL.
- [ ] **Step 3:** implement; keep 中華街 behaviour identical (test_work.py unchanged and passing).
- [ ] **Step 4:** test_ekimae + test_work pass.
- [ ] **Step 5:** commit.

### Task 2: みなと線 data and the timetable (stage 1b)

**Files:** `events.js` (`TOWN.EKI.LINE`, `TOWN.EKI.TIMES`), new `js/71w_eki.js` (EKI helpers), `js/71c_town.js` (駅前 LED board text from EKI.next), `scripts/check-events.js` (EKI checks)

**Interfaces:**
- Produces: `EKI.line() -> [{ id, name, kana, fare, child, rapid }]` (from みなと), `EKI.next(h, m, n = 4, from = 'minato') -> [{ t: 'HH:MM', kind: '普通'|'快速', to: id, track: 1|2 }]`, `EKI.fare(from, to, child) -> 円`, `EKI.stops(kind, to) -> [ids]`.

- [ ] Test `test_timetable_next_trains`: at 10:24 → `[10:25 快速 shirasagi 1, 10:32 普通 minatoko 2, 10:40 普通 shirasagi 1, 10:47 快速 minatoko 2]`; at 22:58 → first is 6:05 next day; fare(minato, hanada, child) = 110; rapid to shirasagi stops [kawaguchi, shirasagi].
- [ ] Implement, run, commit.

### Task 3: the ホーム scene (stage 1c)

**Files:** new `js/71w_platform.js` (`platformHtml()`, train runner `PLATFORM`, `PLACE_USE.platform`), `js/71c_town.js` (PLACE_ROUTE, PLACE_NAME, ADJ, WAYS station↔platform, yardHtml switch), `js/71b_places.js` (WALK_TOP, WALK_BLOCK, WALK_GROUND), `js/71a_yard.js` (anything place-keyed: camera, sky), `events.js` (PLACES, SPOTS.platform, CAST.haru with hours [7,19,'platform','stand']), `js/80_tts.js` (CAST_VOICE.haru), `js/82_sound.js` (ambience, USE_SND, train SFX synth), `css/app.css` (pf- classes), `index.html`, `sw.js`

**Interfaces:**
- Produces: place id `platform`, route `#/platform`; `PLATFORM.train()` state `{ dir: 1|2, phase: 'in'|'stop'|'out', doors }`; `PLATFORM.call(dir) -> Promise` (a train for that direction pulls in and stops; used by Task 8); SFX `train-in`, `train-out`, `door-chime`, `dep-bell` (synth).

- [ ] Test `test_platform_way_in_and_out`: tapping 駅前's 改札 use lands on `#/platform`; the stairs way returns to `#/station`; ハル is there at 12:00, not at 21:00.
- [ ] Test `test_platform_trains_come_and_go`: with `PLATFORM.speed = 20`, within 6 s a `.pf-train` reaches phase `stop` then `out`.
- [ ] Draw per spec §3.2 (day/night via `hc()`), screenshot 390×844 and 1280×800 day and night, look, fix.
- [ ] Full test.sh ALL_OK; bump sw.js `nq-v1.19.0-test.1`; push `test`; report (stage 1 = Tasks 1–3).

### Task 4: 駅弁の立ち売り (stage 2)

**Files:** new `js/71w_bento.js` (runner `bento`), `events.js` (`TOWN.EKI.bento`: goods `[id, word, pic, counter 'つ'|'本'|'', hot?]`, lines), `css/app.css` (bt-), `pics.js` only if a tea bottle with cap colour is needed (else drawn in the runner)

**Interfaces:**
- Consumes: WORK ctx; `JOBS.said`, `JOBS.pat` (export `said`, `clock` from 71s_jobs if not already: add to its return object).
- Produces: `BENTO.make(unitIdx) -> trains [[order, …] ×3]`, order `{ who, items: [[good, n]], kind: 'order'|'have'|'usual', line: [ja, zh] }`; `BENTO.now()` for tests.

- [ ] Tests: `test_bento_orders_follow_the_unit` (m1: no hot/cold; m2: some with あたたかい/つめたい; counts 1–3; ≤2 items); `test_bento_shift_runs_three_trains` (hand right items → ctx.right; leave a window → scored 3 when the train goes; ten tasks; paid 120+bonus); `test_bento_resume` (3 done, reopen: train 2 begins); `test_bento_counter_readings` (二本 にほん, 三本 さんぼん, 一本 いっぽん in lines).
- [ ] Draw the car, windows, clock, box; screenshots; fix; full suite; push `-test.2`; report.

### Task 5: きっぷ売り場 (stage 3)

**Files:** new `js/71w_window.js` (runner `window`), `events.js` (`TOWN.EKI.window` lines), css (md-)

**Interfaces:** Consumes `EKI.*`. Produces `MADO.make(h, m) -> [task]`, task `{ kind: 'fare'|'next'|'track'|'stop'|'buy', who, q: [ja, zh], opts: [[ja, zh, right]], buy? }`.

- [ ] Tests: each kind's right answer comes from EKI (fare to 川口 170, next 白鷺行き after 10:24 = 10:35, 快速 to 花田 = 止まりません); options are three distinct; `buy` sums one adult + one child only; resume.
- [ ] Draw window, glass, route chart, departure board; screenshots; fix; suite; push `-test.3`; report.

### Task 6: 落とし物 (stage 4)

**Files:** new `js/71w_lost.js` (runner `lost`, item art `LOSTART(kind, attrs)`), `events.js` (`TOWN.EKI.lost`), css (lf-)

**Interfaces:** Produces `LOST.make(unitIdx) -> { shelf: [item], tasks: [task] }`, item `{ id, kind, color, size, len, age, key?, inside: [words] }`, task `{ who, want: itemId|null, ask: bool, twin: itemId|null, gag?: 'glasses'|'hat'|'doll' }`.

- [ ] Tests: every wanted item has a look-alike on the shelf; descriptions match attributes (黒くて 小さい ↔ color black size small); `twin` tasks need the 中に… step; `null` want → ありません is right; m3 says あります, m4+ says 入って います; resume.
- [ ] Draw shelf and items (each kind × colours), counter, peek view; screenshots; fix; suite; push `-test.4`; report.

### Task 7: タクシー (stage 5)

**Files:** new `js/71w_taxi.js` (runner `taxi`, map art, route logic), `events.js` (`TOWN.EKI.taxi`: map buildings, lines), css (tx-)

**Interfaces:** Produces `TAXI.MAP = { cols: 4, rows: 3, corners: { 'c,r,q': building } }`, `TAXI.turn(heading, choice) -> heading`, `TAXI.make(unitIdx) -> [ride]`, ride `{ who, to, guided: bool, steps: [{ at: 'c,r', say: [ja, zh], want: 'left'|'straight'|'right'|'stop' }] }`.

- [ ] Tests: relative turns (heading south + 右 → west); guided steps lead to the destination corner; 二つ目 makes the first junction 'straight'; self-routed rides accept any route ending at the target; no choice in 6 s → straight; five rides, credit grading; おつり tip only on a ride with no miss; resume mid-shift starts the next ride.
- [ ] Draw the map (buildings with PICS icons and ruby signs), taxi with indicators; screenshots; fix; suite; push `-test.5`; report.

### Task 8: 券売機 and the train (stage 6)

**Files:** new `js/71w_ride.js` (KENBAI card, RIDE card), `js/71w_platform.js` (board a stopped train), `js/71c_town.js` (castle/harbor way-edge signs to their station, arrival WAYS), `js/71b_places.js` (`PLACE_USE.station` 券売機), `sync-core.js` only if `state.ticket` needs keeping, css (kb-)

**Interfaces:** Consumes `EKI.fare`, `PLATFORM.call`. Produces `state.ticket = { from, fare, day }`, `RIDE.go(from, to)`.

- [ ] Tests: buying 310 at みなと takes 310 円 and sets the ticket; too little money refuses; boarding without a ticket refuses; a ride to 白鷺 ends on `#/castle`, to みなと港 on `#/harbor`; a 170 ticket ridden to 白鷺 charges 140 more (乗り越し精算); the way back from 白鷺 lands on `#/platform`; the ticket is used up.
- [ ] Draw machine, chart, ticket, carriage with scenery; screenshots; fix; suite; push `-test.6`; report.

### Task 9: music, sounds, review (stage 7)

**Files:** `scripts/music-synth.js` (score `ekimae`), `music/ekimae-1.m4a`, `js/71a_yard.js` (MUSIC.RECORDS entry place 'work'), `js/71r_work.js` (tune per job), `sounds/SOURCES.md`

- [ ] Make the tune; wire `tune: 'ekimae'` on the four jobs; test_sound picks it while a card is up.
- [ ] Two fresh reviewers (code; Japanese content + learning value) on everything since 6462154; fix what holds up; suite; push `-test.7`; report with open items and the 生成 count.
