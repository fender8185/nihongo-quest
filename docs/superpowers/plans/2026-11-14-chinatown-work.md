# 中華街大通り＋打工 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Walk through 中華街's 牌樓 into a new look-down-the-street scene (中華街大通り), and give beginners four part-time jobs there that pay a little 円, at most one workplace a day.

**Architecture:** A new outdoor place `chinadori` whose ground is a trapezoid seen in one-point perspective (its own scale, walk top and no camera swipe, hooked into the existing yard walking). A new `WORK` module owns the rules (one workplace a day, shifts, grades, pay, 打工證), the result screen, `state.work` and its sync merge; each job is a small runner WORK calls with a shared task/score API. Content (owners' lines, goods, shop names, instructions) lives in `events.js` as `TOWN.WORK`.

**Tech Stack:** vanilla JS (classic scripts in `js/`, loaded by `index.html`), SVG scenes, `sync-core.js` (node-tested), e2e tests in Python over CDP (`tests/e2e/cdp.py`).

**Spec:** `docs/superpowers/specs/2026-11-14-chinatown-work-design.md`

## Global Constraints

- Code reads like its neighbours: dense prose comments with the date and the user's words; Traditional Chinese UI text; action buttons in Japanese kana (`はたらく`, like `ちゅうもんする`).
- New CSS classes are prefixed (`dr-` street, `wk-` work) — `.got`, `.hint`, `.empty`, `.bob` are global in `css/app.css`.
- Never add attributes to `<ruby>`/`<rt>` (exact-match regexes elsewhere).
- New JS files: a `<script>` in `index.html` after `js/71p_write.js` and an entry in `sw.js` PRECACHE. Every push to test bumps `sw.js` `CACHE` to `'nq-v1.18.0-test.N'` (test.1 is taken: next is test.2).
- Workplaces open by kana seen (`kanaSeen()`, the classroom's count; all open when `state.kanaKnown === true` or past 入門): 整理貨架 5, 站櫃 15, 外送 30, 包包子 46.
- Pay (user, 2026-11-14): 打工證 by shifts finished — 1 新人 100 円, 5 アルバイト 120, 15 ベテラン 150, 30 バイトリーダー 200; grade bonus S +50, A +30, B +20, C +10, D/E 0; delivery tip ≤ 30. Grade by first-try share S≥.95 A≥.85 B≥.70 C≥.50 D≥.30 else E. 10 tasks a shift. 円 only, no 言靈.
- One workplace a day, the day being `dateStr(TOWNEV.today())` (the town's day, as YEN uses). Leaving mid-shift keeps its progress for that day and that place only.
- Shop hours: 大通り's shops 10–19 (`HOURS`), 福明 while 王 is at the stand.
- Content only at 入門 level: seen kana, kana-only 入門 words, number words once learned, prices ≤ 1,000 円, no kanji.
- New spoken lines go through each module's `lines(add)` so the generator makes clips; tell the user to press 生成 after each push.
- Before each push: `scripts/test.sh` prints `ALL_OK`; while iterating run only the related e2e file (`.venv/bin/python -I tests/e2e/test_<x>.py`).

## Review Focus

- A shift left halfway (✕, route change, bus) and picked up later the same day at the same place resumes at its count; any other workplace says today's is taken — test in Task 3.
- A shift begun before closing time (18:59) runs to its end; only *starting* checks the hours — test in Task 3.
- The town's day rolling over mid-shift: the shift is saved under the day it began — test in Task 3.
- Two devices that worked different places the same day: the merge keeps one record (finished beats unfinished, then more 円, then more done) — node test in Task 3.
- A 360×640 phone: the street needs no swipe and every shop's tap area is on screen; job cards fit without page scroll — tests in Task 2 and each job task.

---

## Stage 1 — 中華街大通り (push as test.2)

### Task 1: The street's ground — perspective scale, trapezoid, no swipe

**Files:**
- Create: `js/71q_dori.js` (DORI geometry; the scene art comes in Task 2)
- Modify: `js/71a_yard.js:955` (`yScale`), `js/71a_yard.js` `yCamMax`, `js/71b_places.js:56-57` (`WALK_TOP`, `walkTop`)
- Modify: `index.html`, `sw.js` (new file)
- Test: `tests/e2e/test_dori.py` (new; copy the harness from `test_classroom.py`, PORT 8831)

**Interfaces:**
- Produces: `DORI = { H: 430, Y0: 12, FAR: 270, HALF0: 110, scale(Y) -> number, half(Y) -> number, top(X) -> number }` — `H` the horizon in hero Y units, `FAR` the deepest walkable Y, `HALF0` the street's half width at `Y0`. `scale(Y) = 0.5 * (H - Y) / (H - Y0)`; `half(Y) = HALF0 * (H - Y) / (H - Y0)`; `top(X) = min(FAR, H - |X| * (H - Y0) / HALF0)`.
- `yScale(Y)` returns `DORI.scale(Y)` when `yPlace === 'chinadori'`; `walkTop('chinadori', X)` returns `DORI.top(X)` (X undefined: `FAR`); `yCamMax()` returns 0 in `chinadori`.

- [ ] **Step 1: Write the failing test** `test_the_street_narrows_and_the_hero_shrinks`: go to `#/chinadori` (route() after setting hash), then assert `DORI.scale(12) == 0.5`, `DORI.scale(DORI.FAR) < 0.2`, `walkTop('chinadori', 0) == DORI.FAR`, `walkTop('chinadori', DORI.HALF0) == 12`, `yScale(100) == DORI.scale(100)`, `yCamMax() == 0`; send the hero `yHeroWalk(yard, [0, 400])` and `[300, 30]`, wait for him to stop, assert `yh.Y <= DORI.FAR` and `abs(yh.X) <= DORI.half(yh.Y) + 1`.
- [ ] **Step 2: Run it** — `.venv/bin/python -I tests/e2e/test_dori.py` → FAIL (`DORI is not defined` / no route; the route itself comes in Task 2, so for this task register `chinadori` in `PLACE_ROUTE`/`PLACE_NAME` with a placeholder `chinadoriHtml()` returning an empty land, completed in Task 2).
- [ ] **Step 3: Implement** DORI and the three hooks; the hero's walking speed in `yHeroWalk` is multiplied by `DORI.scale(Y)/0.5` at the walk's start Y in `chinadori` (far steps are short).
- [ ] **Step 4: Run it** → PASS.
- [ ] **Step 5: Commit** `test: 大通り的地面（遠近縮放、梯形、不滑）`.

### Task 2: The street drawn, the gate walked through, its shops answering taps

**Files:**
- Modify: `js/71q_dori.js` (`chinadoriHtml()`, `DORI.SHOPS`)
- Modify: `js/71c_town.js` — `PLACE_ROUTE` (1506), `PLACE_NAME` (218), `ADJ` (213), `WAYS` (1513), render switch (2439), `reach` in `due()` (131), `sig` (203) for the hours, `SEEN_UNMET` (192) add `chinadori`
- Modify: `js/71b_places.js` — `PLACE_USE.chinatown.gate` (291: drop `fx`/`fxc`, `open: (y) => yGo(y, 'chinadori')`), new `PLACE_USE.chinadori`
- Modify: `js/82_sound.js` — `GROUND`, `AMB` (as chinatown), `USE_SND` with existing sound names only
- Modify: `events.js` — `TOWN.PLACES` add `chinadori`, `TOWN.SPOTS.chinadori` (spots `ranran`, `fuku`, `rairai`, `board`), `TOWN.HOURS` add `dori: [10, 19]`
- Modify: `css/app.css` (`dr-` classes: lit lanterns at night, shut shutters)
- Test: `tests/e2e/test_dori.py`, update `tests/e2e/test_chinatown.py` if its use-button set asserts the gate's `fx`

**Interfaces:**
- Consumes: `DORI` (Task 1).
- Produces: `DORI.SHOPS = [{ id, side: 'L'|'R', y0, y1 /* hero Y range of its front */, sign /* kana */, name /* Chinese */, job? }]` with exactly these six: `ranran` L らんらん おみやげ屋 job `counter`; `fuku` L ふく 中華食材店 job `shelf`; `toka` L とうか 茶館; `rairai` R らいらいけん 出前 job `deliver`; `kuriya` R くりや 天津甘栗; `kohaku` R こはく 雜貨攤. Near→far in that order per side. Their blade signs (facing the viewer) show `sign` in kana. `DORI.door(id) -> [X, Y]` where the hero stands to deal with a shop. `chinadoriHtml()` includes `castHtml('chinadori')`, the 求人看板 (`PLACE_USE.chinadori` id `board`, opened in Task 4), the temple at the far end, the lantern strings (shared look with chinatown), a way back at the bottom (`.way-btn data-act="go-place" data-to="chinatown"`).
- `WAYS['chinatown>chinadori']`: out under the gate at X −360; in at `[0, 4]` walking to `[0, 40]`. `WAYS['chinadori>chinatown']`: out at `[0, 12]` (free); in at `[-360, 130]` walking to `[-360, 100]`.

- [ ] **Step 1: Write the failing tests** in `test_dori.py`:
  - `test_the_gate_leads_into_the_street_and_back`: at chinatown 12:00, click `.use-btn[data-use="gate"]`; within 8 s `location.hash == '#/chinadori'`; click `.way-btn[data-to="chinatown"]`; within 8 s back at `#/chinatown`; `__errs == []`.
  - `test_every_thing_on_the_street_answers_a_tap`: at 12:00 every `PLACE_USE.chinadori` id has a `.use-btn`; clicking each (closing any dialog after) raises no error; the six blade signs carry their kana.
  - `test_the_street_fits_a_phone`: viewport 360×640 → `yCamMax() == 0` and every `.use-btn` rect lies inside the viewport.
  - `test_the_street_by_night`: at 22:00 the `.dr-shut` shutters are down on all six shops and lanterns carry the lit class.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the art (one-point perspective, vanishing point at land x 600; two rows of three shopfronts receding; blade signs facing the viewer; stone paving; temple at `FAR`), the registries, the gate and the way back; the street's shops answer a tap with a short `say` (no job yet).
- [ ] **Step 4: Run** `test_dori.py`, `test_chinatown.py`, `test_town_events.py`, `test_sound.py` → PASS.
- [ ] **Step 5:** Screenshot `#/chinadori` at 390×844 and 1280×800 by day and night (scratchpad); look at them; fix what reads badly.
- [ ] **Step 6:** `scripts/test.sh` → `ALL_OK`; bump `CACHE` to test.2; commit `test: 版本 1.18.0-test.2：中華街大通り…`; push `test`.

## Stage 2 — 打工的規則＋整理貨架 (push as test.3)

### Task 3: WORK core — rules, shifts, pay, 打工證, results, state and sync

**Files:**
- Create: `js/71r_work.js` (`WORK`)
- Modify: `js/40_core.js` — default `work: { res: {} }` beside `cruise`/`purse` (~323), its fix-up beside `out.purse` (~399), `yenEarned` (1127) adds `state.work.res[*].yen`
- Modify: `sync-core.js` — `mergeWork(o, n)` and its call beside `mergeCruise` (~203)
- Modify: `index.html`, `sw.js`, `css/app.css` (`wk-` result screen reuses the `cr-result` look)
- Test: `tests/sync-core.test.js`, `tests/e2e/test_work.py` (new, PORT 8832)

**Interfaces:**
- Produces:
  - `state.work.res[day] = { place, done: number, score: { [task]: misses }, yen?, grade?, tip? }` (`yen` set ⇔ finished).
  - `WORK.PLACES = { shelf: { place: 'chinadori', shop: 'fuku', who: 'zhang', kana: 5 }, counter: { place: 'chinadori', shop: 'ranran', who: 'zhou', kana: 15 }, deliver: { place: 'chinadori', shop: 'rairai', who: 'huang', kana: 30 }, buns: { place: 'chinatown', shop: 'seiro', who: 'wang', kana: 46 } }`.
  - `WORK.can(job) -> { ok: boolean, why?: string }` — why in Chinese: not enough kana (`再學 N 個假名就能來`), closed, today taken elsewhere.
  - `WORK.start(yard, job)` → resumes or begins today's shift; calls `JOBS[job].run(ctx)` with `ctx = { yard, n: 10, done, task(k), right(k, misses), finish(extra), lines }`.
  - `WORK.register(job, { run, lines })` — each job module registers itself.
  - `WORK.pay(shifts, grade /* 'S'…'E' */, tip) -> { base, bonus, tip, yen }`; `WORK.grade(score) -> 'S'…'E'`; `WORK.rank(shifts) -> '新人'|'アルバイト'|'ベテラン'|'バイトリーダー'|''`; `WORK.shifts() -> number` (finished records); `WORK.today() -> record|null`.
  - `WORK.book()` — 町の手帳's 打工證 page (rank, shifts, shifts per workplace, best grade), a tab beside 美食手帳 (`js/71c_town.js:384`) once a shift is finished.
  - `WORK.results(job, rec, before)` — the counting-up screen (as `CRUISE.results`): 一次就對 n/10, 底薪, 評級加給, 小費 (deliver), 錢包, grade stamp, `打工證：<rank>` with 升級！.
  - `mergeWork(o, n)`: per day, a finished record beats an unfinished one; both finished: more `yen`; both unfinished: more `done`; days only on one side kept.
- [ ] **Step 1: Write failing node tests** in `tests/sync-core.test.js`: `mergeStates: the work of either device is kept, one record a day (finished, then more 円, then further on)` — cover finished vs unfinished, two finished (5400-style yen compare), two unfinished different places, a day only on one side, and `mergeStates({v:3},{v:3}).work === undefined`.
- [ ] **Step 2: Write failing e2e tests** in `test_work.py` (job runners stubbed by `WORK.register('test', …)` where needed):
  - `test_the_jobs_open_by_kana_seen`: with 4 / 5 / 15 / 30 / 46 kana seen, `WORK.can(job).ok` flips at 5, 15, 30, 46.
  - `test_one_workplace_a_day_and_a_shift_left_halfway_waits`: `WORK.start(yard, 'shelf')`, answer 3, close; `WORK.can('counter').ok == False` with a why naming today's place; `WORK.start(yard, 'shelf')` resumes at done 3.
  - `test_a_shift_begun_before_closing_runs_to_its_end`: start at 18:59, set the clock to 19:30, finish → paid; `WORK.can` at 19:30 for a fresh day is closed.
  - `test_the_shift_keeps_the_day_it_began`: start, move `TOWNEV.clock` to the next day, finish → the record sits under the first day.
  - `test_pay_grade_and_licence`: `WORK.pay(1, 'S', 0).yen == 150`, `WORK.pay(5, 'B', 0).yen == 140`, `WORK.pay(30, 'E', 30).yen == 230`; `WORK.rank(0..30)` at 0/1/5/15/30; grade from shares .95/.85/.70/.50/.30/.29.
  - `test_the_pay_goes_into_the_wallet`: finishing a shift raises `yenEarned()` by its `yen`; the results screen shows the counted 円 and 打工證; 町の手帳 then has the 打工證 tab.
- [ ] **Step 3: Run** both → FAIL. **Step 4: Implement.** **Step 5: Run** → PASS. **Step 6: Commit** `test: 打工的規則、薪水、打工證、同步`.

### Task 4: The street's people, はたらく, the 求人看板, 陳's invitation

**Files:**
- Modify: `events.js` — `TOWN.CAST` add `zhou` (周おばあさん, らんらん, 70s, slow, haggles), `zhang` (張さん, ふく, meticulous), `huang` (黄さん, らいらいけん, always in a hurry: はやく！はやく！) with looks, bios, `hours: [[10, 19, 'chinadori', '<spot>']]` and a small `roam` round their shop fronts (the town's strolling, few people); their chat lines (as other cast); event `cnw` (`kana: 5, who: 'chen', at: 'chinatown', after: 'cn2'`, before `cn3` in the array) 「バイト、しない？」 — 陳 works at 福明, shows the way through the 牌樓 to the board; one `ask` in the classroom's style
- Modify: `js/80_tts.js` `CAST_VOICE`: `zhou: ['Pulcherrima', 0.9], zhang: ['Achird', 0.96], huang: ['Puck', 1.14]`
- Modify: `js/71c_town.js` `talk()` (251–265): when `WORK.offer(id)` names a job here, the pick gets `['はたらく', () => WORK.start(yard, job)]` beside `ちゅうもんする`/`おしゃべりする`
- Modify: `js/71r_work.js` — `WORK.offer(id) -> job|null`, `WORK.lines(add)` (owners' fixed lines for the generator), `WORK.board(yard)` (the four jobs: where, kana needed, hours, today's), each owner's first-day opening lines (`TOWN.WORK.hello[job]`)
- Test: `tests/e2e/test_work.py`, `tests/events.test.js` / `scripts/check-events.js` must pass

- [ ] **Step 1: Failing tests**: `test_the_owners_offer_work_when_it_is_open` (tap `zhang` at 12:00 with 5 kana → a `はたらく` button; with 4 kana → none; 王 offers it at 46 beside `ちゅうもんする`); `test_the_board_lists_the_four_jobs` (rows for 整理貨架/站櫃/外送/包包子 with 5/15/30/46 and today's mark); `test_chen_asks_at_five_kana` (`cnw` due at 5 kana after `cn2`, not before); `test_the_generator_has_the_street_lines` (`talkLines` holds each owner's lines).
- [ ] **Step 2–5:** run → FAIL, implement, run (`test_work.py`, `test_chinatown.py`, `test_town_events.py`, `node scripts/check-events.js`) → PASS, commit.

### Task 5: 整理貨架 (ふく, 張さん)

**Files:**
- Create: `js/71s_jobs.js` (all four job runners, each `WORK.register(...)`; this task adds `shelf`)
- Modify: `events.js` `TOWN.WORK.shelf` (張's lines: `ちがう！`, praise, opening), `index.html`, `sw.js`, `css/app.css`
- Test: `tests/e2e/test_work.py`

**Interfaces:**
- Consumes: `WORK.register`, `ctx` (Task 3).
- Produces: `JOBS.shelf.make(seen, words) -> [{ label, bins: [4 labels] }] × 10` — labels are single seen hiragana (katakana mixed once any is seen); once kana-only 入門 words are learned (`REG.vocab` `lv === 'PRE_N5'`, `w === r`, in `state.srs`), up to half the labels are those words; bins hold the label plus three others, look-alikes first when seen (`KANA_LOOK` if present, else random seen).
- UI: a `CLASS.card('wk-shelf', …)` with the box (one item at a time, its label read out) and four bins; tap a bin (or drag the item onto it). Wrong: 張 `ちがう！`, the item returns; a second miss on it lights the right bin. Ten items → `ctx.finish()`.

- [ ] **Step 1: Failing tests**: `test_shelf_labels_come_from_what_is_seen` (5 kana seen → every label and bin in あいうえお); `test_shelf_mixes_words_once_learned` (with `これ`, `それ` learned → some labels are words, bins hold words); `test_a_shelf_shift_pays_and_grades` (answer 9 right first try, 1 after a miss → grade A, 新人 → 130 円 recorded); `test_the_shelf_card_fits_a_phone` (360×640: the card's bottom ≤ viewport).
- [ ] **Step 2–5:** run → FAIL, implement, run → PASS, commit.
- [ ] **Step 6:** screenshots (phone/desktop) looked at; `scripts/test.sh` → `ALL_OK`; CACHE test.3; commit `test: 版本 1.18.0-test.3：打工（規則、打工證、整理貨架）…`; push; tell the user to press 生成.

## Stage 3 — 站櫃 (push as test.4)

### Task 6: 站櫃 (らんらん, 周おばあさん)

**Files:**
- Modify: `js/71s_jobs.js` (`counter`), `events.js` `TOWN.WORK.counter` (goods, customer lines), `pics.js` `PICS_TOWN` add `こけし` (bump `PICS_VERSION`, its `index.html` query and sw), `css/app.css`
- Test: `tests/e2e/test_work.py`

**Interfaces:**
- Goods `[kana, picKey]`: かさ/傘, すし/寿司, いす/椅子, こけし/こけし, とけい/時計, はし/箸, ほん/本, ぼうし/帽子, くつ/靴, かばん/かばん, かぎ/鍵, ちず/地図, かがみ/鏡, はさみ/はさみ, さら/皿, なべ/鍋, せっけん/石けん, ふで/筆, あめ/飴, パンダ/パンダ — offered only when every kana in the name is seen (≥ 4 at 15 kana: かさ, すし, いす, こけし).
- Customers: the cruise's passengers (`kaneda, umeko, yuta, rina, yoshimoto, ken, ai, michiyama, mike`; faces by `CRUISE.face`, voices theirs); each good is said by one fixed passenger (`{good}を ください。`), so clips stay few.
- Kinds of task: `name` (say a good → tap it); `two` once `ふたつ`/`みっつ` are learned (`ふたつ ください` → tap it twice, a counter shows); `price` once `いくら` is learned (`これ、いくらですか` with a good held up → choose the reading of its tag among three, `YEN` reading). Hero says `いらっしゃいませ` before, `ありがとうございました` after (Chinese shown the first shift).

- [ ] **Step 1: Failing tests**: `test_counter_offers_only_readable_goods` (15 kana → goods ⊆ {かさ, すし, いす, こけし}); `test_counter_asks_two_and_prices_once_learned`; `test_a_counter_shift_pays`; `test_the_counter_card_fits_a_phone`; `test_the_generator_has_the_counter_lines`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit. **Step 6:** screenshots; `ALL_OK`; CACHE test.4; push; 生成 reminder.

## Stage 4 — 外送 (push as test.5)

### Task 7: 外送 (らいらいけん, 黄さん)

**Files:**
- Modify: `js/71s_jobs.js` (`deliver`), `js/71b_places.js` (`PLACE_USE.chinadori` shop `open`s hand the tap to `WORK.deliverTo(yard, shopId)` while delivering), `events.js` `TOWN.WORK.deliver` (黄's はやく！, each keeper's thanks, `うちじゃ ないよ！`), `css/app.css` (`wk-slip` bar)
- Test: `tests/e2e/test_work.py`

**Interfaces:**
- A slip bar at the top of the street (`.wk-slip`): `とどけさき：<sign>`, n/10, time. The hero carries an 岡持ち (a class on `.yhero`). Destinations: the other five shops whose sign kana are all seen (≥ 3 at 30 kana: ふく, とうか, こはく). Tap a shop → he walks to `DORI.door(id)` → right: thanks, back to らいらいけん for the next slip (tap it); wrong: `うちじゃ ないよ！`, a miss, the slip stays.
- Tip by the shift's time from first slip to last delivery: ≤ 90 s 30, ≤ 150 s 20, ≤ 240 s 10, else 0.
- Leaving the street mid-shift keeps today's count (Task 3 rules).

- [ ] **Step 1: Failing tests**: `test_delivery_goes_only_to_readable_shops`; `test_a_wrong_shop_says_not_here_and_counts_a_miss`; `test_a_delivery_shift_pays_a_tip` (fake clock: 80 s → tip 30); `test_the_slip_bar_leaves_the_signs_tappable_on_a_phone`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit. **Step 6:** screenshots; `ALL_OK`; CACHE test.5; push; 生成 reminder.

## Stage 5 — 包包子 (push as test.6)

### Task 8: 包包子 (福明, 王 and 陳)

**Files:**
- Modify: `js/71s_jobs.js` (`buns`), `events.js` `TOWN.WORK.buns` (王's instructions, 陳's slips and 王's retorts; 陳's Chinese-only lines as elsewhere), `css/app.css` (six action pictures drawn inline: こねて, まるめて, にくを のせて, あんを のせて, つつんで, むして)
- Test: `tests/e2e/test_work.py`

**Interfaces:**
- A bun = steps `こねて → まるめて → (にく|あん)を のせて → つつんで → むして`, the filling random per bun; buttons are the six pictures (no words), shuffled each step; the instruction is said and shown, with its picture beside it until that instruction has been answered right 3 times (count kept in `state.work.seenSteps`, merged by max). A bun scores its misses across its steps; 10 buns a shift.
- 王 is the keeper: offered only while 王 is at the stand (Task 3 `WORK.can`).

- [ ] **Step 1: Failing tests**: `test_buns_steps_in_order_with_the_filling_heard`; `test_the_pictures_go_after_three_right`; `test_a_bun_shift_pays`; `test_buns_only_while_wang_is_there`; `test_the_bun_card_fits_a_phone`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit. **Step 6:** screenshots; `ALL_OK`; CACHE test.6; push; 生成 reminder.

### Task 9: Whole-branch review and wrap-up

- [ ] **Step 1:** One fresh reviewer (most capable model) reads the spec, this plan and `git diff 471d8fb..HEAD`; fix what it confirms; re-run `scripts/test.sh` → `ALL_OK`.
- [ ] **Step 2:** Update the spec's 狀態 line and the memory notes (`chinatown-work`, `release-1-18-0`); push the fixes as the next test.N; report to the user with the list of lines to 生成 and the phone checks.
