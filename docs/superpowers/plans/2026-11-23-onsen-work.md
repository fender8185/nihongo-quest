# 湯の花温泉（N4 打工）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hot-spring town reached by train (やまなみ線 from 白鷺) with five new places and four N4 jobs (観光案内所 m7, 仲居 m8, おみやげ屋 m11, フロント m15), then one push of this and the cruise plan to the test site.

**Architecture:** The line is data in `events.js` `TOWN.EKI.YAMA`; `EKI` (`js/71w_eki.js`) and `RIDE` (`js/71w_ride.js`) learn a second line with a change at 白鷺. Each place is its own file (`js/71y_onsen.js`, `71y_yudori.js`, `71y_yubatake.js`, `71y_ryokan.js`) wired into the same tables as 駅前's ホーム. WORK (`js/71r_work.js`) gets the `onsen` area; each job is a runner in its own file (`71y_annai.js`, `71y_nakai.js`, `71y_miyage.js`, `71y_front.js`) drawing a `CLASS.card` close-up, its lines in `events.js` `TOWN.ONSEN`.

**Tech Stack:** vanilla JS + inline SVG, `css/app.css`, e2e via `tests/e2e/cdp.py`, Node checks in `scripts/`, `scripts/music-synth.js`.

**Spec:** `docs/superpowers/specs/2026-11-23-onsen-work-design.md` (and, for Task 8's review and push, `docs/superpowers/specs/2026-11-23-cruise-t3-t6-design.md`)

## Global Constraints

- Local commits on `test`; the one push happens in Task 8 with sw.js CACHE `nq-v1.21.0-test.1`.
- EVENTS_VERSION 98 and PICS_VERSION 15 (bumped once by the cruise plan; if that has not happened yet, bump now) — header, `index.html` `?v=`, `sw.js`.
- New js files: `index.html` `<script>` order (after `71x_sushi.js`) and `sw.js` PRECACHE.
- Japanese in `events.js`: `{漢字|かな}` for every kanji, above-level `{漢字|かな|中文}`; `node scripts/check-events.js` passes and checks `TOWN.ONSEN`.
- Pay: 観光案内所 200, 仲居 220, おみやげ屋 240, フロント 260; units m7, m8, m11, m15; area need 2 (ベテラン); grade bonus and +2% steps unchanged.
- Fares (km from みなと港): 森下 31, 湯の花 38; new bands ≤40 km 420 円, ≤50 km 480 円; child half, under 10 円 dropped; やまなみ線 times: 白鷺 :05 :35, 湯の花 :20 :50, 6–22.
- Customers' lines heard first (🔊, replay pauses the clock); text shown after right, two misses or leaving; the hero's reply Japanese + reading, Chinese only on a job's first shift.
- Decoys clearly wrong (never a ら抜き form as a decoy; never a plain-but-fine phrase in フロント).
- CSS prefixes: `os-` (駅前), `yd-` (通り), `yb-` (湯畑), `rk-` (旅館), `an-` (案内所), `nk-` (仲居), `om-` (おみやげ屋), `fr-` (フロント); grep `css/app.css` before adding any class.
- Laughs and cries never read by TTS; no real onsen, ryokan, railway or brand names.
- Food: picture, `DISH`, ≥3 look, ≥5 say.
- Every card fits 360–390 px wide with tap targets ≥40 px; scenes and cards readable by night (`hc()`).
- Each task runs `tests/e2e/test_onsen.py` (PORT 8836, added to `scripts/test.sh`'s e2e list in Task 1) plus the files it touches; screenshots at 390×844 and 1280×800 day and night looked at before each commit.

## Review Focus

1. A learner in N5 with no ベテラン rides to 湯の花: every place, menu and keeper works; each keeper's work reply says what is missing; no job card opens — test in Task 4.
2. A shift left halfway (card shut or app reloaded) resumes at `ctx.done` without double-counting, in every job — test in each job task (resume after 3).
3. A ticket bought at みなと for less than 湯の花 (310 to 白鷺) and ridden on: 乗り越し精算 charges the difference at 湯の花 — test in Task 1.
4. A device on 1.21.0 syncs with records of `annai`/`nakai`/`miyage`/`front` and the once-a-day keys: nothing dropped, the new device shows them — test in Task 4.
5. The voice queue: a new tourist, guest or announcement never cuts a line being said (the transfer announcement, each job's next customer) — test in Task 1 and each job task.

---

### Task 1: やまなみ線, the ride with a change at 白鷺, and 湯の花駅前

**Files:**
- Create: `js/71y_onsen.js` (`onsenHtml()`, `PLACE_USE.onsen`: 足湯 sit, 観光案内所 window, map board, 求人看板 slot, 人力車, the station's 改札 → machine)
- Modify: `events.js` (`TOWN.EKI.YAMA`, `TOWN.EKI.FARES` two bands, ride lines for the change and the mountain stops, `SPOTS.onsen`, `CAST.akari` hours 9–18), `js/71w_eki.js` (fares, `next`, `label` across both lines), `js/71w_ride.js` (`SCENE.yunohana = 'onsen'`, change phase, mountain scenery and tunnels, machine at 湯の花 and the yamanami part of every chart), `js/71c_town.js` (PLACE_ROUTE `#/onsen`, PLACE_NAME, ADJ, yardHtml switch, map ring: onsen places only while in the onsen), `js/71b_places.js` (WALK_*), `js/80_tts.js` (`CAST_VOICE.akari`), `js/82_sound.js` (ambience, diesel, horn, bridge, tunnel), `css/app.css`, `index.html`, `sw.js`, `scripts/test.sh`
- Test: `tests/e2e/test_onsen.py` (new, PORT 8836)

**Interfaces:**
- Produces: `EKI.fare('minato', 'yunohana') === 420`, child 210; `EKI.fare('shirasagi', 'yunohana') === 260`; `EKI.next(h, m, n, 'yunohana')` (やまなみ線 departures); `RIDE.go(from, to)` handles `yunohana` with `R.phase` passing `'change'` at 白鷺; place `onsen`; first-arrival greeting stored once (`state.town.seen.onsen`).

- [ ] **Step 1: Failing tests** — `test_fares_and_times_reach_yunohana` (the values above; 6:00 first, 22:50 last from 湯の花); `test_a_ride_to_yunohana_changes_at_shirasagi` (buy 420 at みなと, board, `RIDE.speed = 20`: phases include `change`, ends on `#/onsen`, ticket used); `test_short_ticket_pays_the_rest_at_yunohana` (310 ticket → 110 more charged on arrival); `test_the_way_home_from_yunohana` (改札 → machine with 湯の花 現在地 → ride → `#/platform`); `test_foot_bath_and_first_greeting` (足湯 sit works; あかり's greeting toast once, not on the second arrival); `test_the_change_announcement_is_not_cut` (the next announcement waits for it).
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** data, EKI, RIDE; draw 湯の花駅前 per spec §3.1 day/night; wire the place.
- [ ] **Step 4:** test_onsen + test_ekimae (no regression in みなと線) pass; screenshots looked at.
- [ ] **Step 5:** commit `test: やまなみ線和湯の花駅前`.

### Task 2: 湯けむり通り, 湯畑, food and 射的

**Files:**
- Create: `js/71y_yudori.js` (street seen down its length, like `71q_dori.js`; doors to ゆのはな堂 and 旅館), `js/71y_yubatake.js` (湯畑, 無人販売所)
- Modify: `js/71c_town.js`, `js/71b_places.js` (tables as Task 1), `events.js` (`TOWN.MENU.yunohanado` 温泉まんじゅう 120, `TOWN.MENU.tamago` 温泉たまご 100 gated on たまご; `DISH`, look/say; `SPOTS`; passers in yukata), `pics.js` (`PICS_TOWN` まんじゅう, 温泉たまご), `js/82_sound.js` (geta steps, steam, water), `css/app.css`
- Test: `tests/e2e/test_onsen.py`

**Interfaces:**
- Produces: places `yudori`, `yubatake`; ADJ onsen↔yudori↔yubatake; `PLACE_USE.yudori` (`shateki`: 300 円, once a day, random prize toast), `PLACE_USE.yubatake` (`tamago` box pays directly, no keeper).

- [ ] **Step 1: Failing tests** — `test_the_town_walks_station_street_yubatake` (ways both directions); `test_manju_and_eggs_are_bought_and_eaten` (まんじゅう open with no course word; 温泉たまご locked until たまご is learned; buying takes 円; eat scene look ≥3 / say ≥5); `test_shateki_once_a_day` (300 円 the first time, refused the second the same day, again the next day).
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** draw per spec §3.2–3.3 (two-storey wooden fronts all different, lanterns, steam gutters, yukata passers; 湯樋, the green pool, steam animation, light-up by night); wire.
- [ ] **Step 4:** tests pass; screenshots looked at and fixed.
- [ ] **Step 5:** commit `test: 湯けむり通り、湯畑、溫泉饅頭和溫泉蛋`.

### Task 3: 旅館 花月 — the lobby, 桜の間 and the people

**Files:**
- Create: `js/71y_ryokan.js` (`ryokanHtml()`, `washitsuHtml()`, ISO props, 鹿威し)
- Modify: `js/71b_places.js` (`INDOOR` + `ryokan`, `washitsu`; ISO walk blocks; `PLACE_USE` tea, sofa, 広縁 chairs, 座椅子, welcome まんじゅう once a day), `js/71c_town.js` (tables; yudori ↔ ryokan ↔ washitsu), `events.js` (`CAST.chiyo` 8–21, `CAST.sato` 7–11 & 14–22, `CAST.makoto` 9–21 at ゆのはな堂; chat lines by unit from m1; `SPOTS`), `js/80_tts.js` (three voices), `js/82_sound.js` (shishi-odoshi, wind chime), `css/app.css`
- Test: `tests/e2e/test_onsen.py`

**Interfaces:**
- Produces: places `ryokan`, `washitsu`; keepers `chiyo`, `sato`, `makoto` with `TOWN.WORK.hello/yes` entries for Task 4–7; `washitsuArt(state)` — the room drawn from a state object `{ window, shoji, light, ac, tv, futon, zabuton, tea, yukata, flower }` (booleans or counts), reused by the 仲居 card.

- [ ] **Step 1: Failing tests** — `test_the_ryokan_and_its_room` (yudori door → `#/ryokan`; stairs → `#/washitsu`; back out); `test_keepers_by_their_hours` (佐藤 at 9:00 and 15:00, not at 12:00; 千代 at 12:00; 竹内 at 20:00); `test_welcome_manju_once_a_day_and_free_tea` (no 円 taken; second まんじゅう the same day refused).
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** draw per spec §3.4–3.5; `washitsuArt` renders every state combination without overlap (screenshot of all-on and all-off).
- [ ] **Step 4:** tests pass; screenshots looked at.
- [ ] **Step 5:** commit `test: 旅館花月（大廳和桜の間）和溫泉町的人`.

### Task 4: The onsen work area and 観光案内所

**Files:**
- Create: `js/71y_annai.js` (runner `annai`)
- Modify: `js/71r_work.js` (`AREAS.onsen` need 2 with hours text; `PLACES.annai/nakai/miyage/front` — pay, `course`, keeper, hours, `tune: 'onsen'`; test switch `nq_work_onsen`; `board('onsen')`), `js/71y_onsen.js` (求人看板 opens `WORK.board('onsen')`), `events.js` (`TOWN.ONSEN.annai`: facility variants, questions, options, lines; `TOWN.WORK` hello/yes for akari), `scripts/check-events.js` (`TOWN.ONSEN`), `css/app.css` (`an-`)
- Test: `tests/e2e/test_onsen.py`

**Interfaces:**
- Consumes: Task 1's place and あかり.
- Produces: `ANNAI.make(unitIdx, seed) -> { board: [facility], tasks: [task] }`, facility `{ id, name, hours: [h0, h1], price, dog: bool, kids: bool, towel: price|null, rent: bool, night: bool }`, task `{ kind: 'can'|'time'|'rule'|'dekiru'|'mieru', who, q: [ja, zh], opts: [[ja, zh, right]] }`.

- [ ] **Step 1: Failing tests** — `test_onsen_work_opens_at_veteran_and_by_unit` (xp 19 → closed with 「ベテラン」 in the reason; xp 20 + m7 → only annai; m8 nakai; m11 miyage; m15 front; the switch opens all); `test_an_n5_visitor_gets_the_reason_not_a_card` (m3 learner taps あかり → reply says the unit and the card step; no `.cls`); `test_annai_answers_come_from_the_board` (two seeds with different dog/towel facts → the right option flips; no option is a ら抜き form; three distinct options); `test_annai_shift_grade_pay_and_resume` (ten tourists; all right → S, 200 + 50 + raise; card shut after 3 → reopened at task 4); `test_new_job_records_survive_an_old_merge` (a res record with place `annai` through `normalizeState` and `mergeStates` with a state lacking it: kept).
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** WORK area and jobs; the runner and card per spec §5.1; lines in `TOWN.ONSEN.annai`.
- [ ] **Step 4:** test_onsen + test_work + test_ekimae pass; screenshots of the card at 390×844 looked at.
- [ ] **Step 5:** commit `test: 湯の花温泉打工區和觀光服務台`.

### Task 5: 仲居

**Files:**
- Create: `js/71y_nakai.js` (runner `nakai`)
- Modify: `events.js` (`TOWN.ONSEN.nakai`: instructions, checks, guest lines; verb pairs), `css/app.css` (`nk-`)
- Test: `tests/e2e/test_onsen.py`

**Interfaces:**
- Consumes: `washitsuArt(state)` (Task 3), WORK ctx.
- Produces: `NAKAI.make(unitIdx) -> rooms: [{ name: '桜'|'菊'|'松', start: roomState, tasks: [task] }]`, task `{ kind: 'do', target: [key, value], line } | { kind: 'check', key, opts } | { kind: 'guest', line, opts }`; `NAKAI.tap(key)` toggles one thing.

- [ ] **Step 1: Failing tests** — `test_nakai_do_by_tapping_the_right_thing` (an instruction エアコンを つけて おいて: tapping the light is a miss and reverts, tapping the AC makes it right); `test_nakai_checks_follow_the_room` (お茶 laid → 用意して あります is right; not laid → まだ 用意して いません; 用意して います never right); `test_nakai_guest_reply_never_jidoushi_with_teoku` (no right option contains 開いて おきました); `test_nakai_clock_fails_what_is_left` (`NAKAI.speed = 30`, room 1 left undone → its do-tasks scored 3); `test_nakai_three_rooms_ten_tasks_and_resume`.
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** runner and card per spec §5.2 (cat on the futon, 千代 doing one herself).
- [ ] **Step 4:** tests pass; screenshots looked at.
- [ ] **Step 5:** commit `test: 仲居的打工`.

### Task 6: おみやげ屋

**Files:**
- Create: `js/71y_miyage.js` (runner `miyage`)
- Modify: `events.js` (`TOWN.ONSEN.miyage`: goods `[id, name, price, pack]`, customers, offers), `pics.js` (`PICS_TOWN`: the eight goods not already pictured), `css/app.css` (`om-`)
- Test: `tests/e2e/test_onsen.py`

**Interfaces:**
- Produces: `MIYAGE.make(unitIdx) -> [customer]`, customer `{ who, kind: 'count'|'two'|'got'|'budget'|'reply'|'offer'|'elder'|'all', line: [ja, zh], want: [goodIds] | ((ids) => bool), opts? }`.

- [ ] **Step 1: Failing tests** — `test_miyage_ten_people_need_the_box_of_twelve` (6個入 is a miss, 12個入 right); `test_miyage_two_people_two_things_any_order`; `test_miyage_what_they_were_given` (the received good, not another); `test_miyage_budget_of_500` (any good ≤500 right, >500 a miss); `test_miyage_reply_keeps_the_giving_the_right_way` (包んで もらえますか → 包みますね right; もらいます / くれます wrong); `test_miyage_kaneda_takes_all_eight`; `test_miyage_shift_and_resume`.
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** runner, card and pictures per spec §5.3.
- [ ] **Step 4:** tests pass; screenshots looked at.
- [ ] **Step 5:** commit `test: 伴手禮店的打工`.

### Task 7: フロント

**Files:**
- Create: `js/71y_front.js` (runner `front`)
- Modify: `events.js` (`TOWN.ONSEN.front`: guest names with readings, ledger memos, tasks, keigo options), `css/app.css` (`fr-`)
- Test: `tests/e2e/test_onsen.py`

**Interfaces:**
- Produces: `FRONT.make(unitIdx, morning) -> { book: [{ name, kana, n, room, dinner, memo }], tasks: [task] }`, task kinds `checkin` (right key from the book), `luggage`, `dinner`, `request`, `where`, `memo`, `checkout` (morning only).

- [ ] **Step 1: Failing tests** — `test_front_checkin_finds_the_key_in_the_book` (the guest's room key right, another key a miss); `test_front_keigo_decoys_are_direction_errors` (every wrong option uses 尊敬 for the hero or 謙譲 for the guest, or いらっしゃる for a thing; none is plain); `test_front_checkout_only_in_the_morning`; `test_front_birthday_line_adds_a_tip`; `test_front_shift_and_resume`.
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** runner and card per spec §5.4.
- [ ] **Step 4:** tests pass; screenshots looked at.
- [ ] **Step 5:** commit `test: 旅館櫃台的打工`.

### Task 8: Music, sounds, review, the push

**Files:**
- Modify: `scripts/music-synth.js` (score `onsen`), `music/onsen-1.m4a`, `js/71a_yard.js` (`MUSIC.RECORDS` place music for the five onsen places and work tune), `sounds/SOURCES.md`, whatever the reviews find
- Test: `tests/e2e/test_sound.py`, the whole suite

- [ ] **Step 1:** make the `onsen` tune (koto/shamisen/shakuhachi feel, ~70 s loop); wire place and work music; test_sound picks it in the five places and while a job card is up.
- [ ] **Step 2:** two fresh reviewers on `892885c..HEAD` — code (bugs, sync, resume, phone layout, voice queue) and Japanese content (naturalness, level, decoys that are also fair, kanji marks, Chinese wording); fix what holds up.
- [ ] **Step 3:** `bash scripts/test.sh` → `ALL_OK` (CACHE already `-test.1`, so the release gate is skipped by design).
- [ ] **Step 4:** set sw.js CACHE `nq-v1.21.0-test.1`; commit; `git push origin test`; confirm the test site serves `nq-v1.21.0-test.1` and nihongoquest.app still serves `nq-v1.21.0`.
- [ ] **Step 5:** report to the user in Chinese: what is in, how to try it on the test site (the switches), the count of new voiced lines to 生成, open items, phone checks.
