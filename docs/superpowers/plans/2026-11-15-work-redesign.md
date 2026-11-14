# 打工改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every 中華街 job needs real Japanese: 整理貨架 by ear, 包包子 as a fast six-cell kana board with a bun close-up, 外送 replaced by a 外場 job inside a walk-in らいらいけん.

**Architecture:** Jobs stay WORK runners (`WORK.register(job, { run, lines })`, ctx = `{ yard, n, job, done, right(k, misses), finish(extra, ms), on() }`). 整理貨架 and 包包子 stay cards (CLASS.card). らいらいけん is a new ISO indoor place `rairai` (like shokudo: `INDOOR`, `WALK_TOP`, `PLACE_ROUTE`, `PLACE_NAME`, `ADJ`, `WAYS`, `SPOTS`, render switch, `PLACE_USE`); 外場 runs in the scene itself (js/71u_hall.js), not a card.

**Tech Stack:** vanilla JS classic scripts, SVG, CDP e2e tests (Python), `./scripts/test.sh`.

**Spec:** docs/superpowers/specs/2026-11-15-work-redesign-design.md

## Global Constraints

- Every push to `test`: bump `sw.js` CACHE `nq-v1.18.0-test.N` (10, 11, 12, 13); a new js file goes in index.html and sw.js PRECACHE; events.js changed → bump EVENTS_VERSION with `events.js?v=` in index.html and sw.js.
- No level literals in code (test_pre_n5); ≥10 chat lines per cast member (check-events); CAST_VOICE count in test_sound.
- Kana sounds through `speak(ch)` (existing clips); people's lines through `speakAs(who, line)` and listed in the job's `lines(add)` for 生成.
- Hero limbs: no arms in close-ups (a floating round hand).
- Old `state.work.res` records with `place: 'deliver'` keep showing as 外送.
- Full `./scripts/test.sh` → ALL_OK before each push.

## Review Focus

1. A shift left halfway and resumed (整理貨架, 包包子 at tap 3·done, 外場 at task done) picks up where it was and pays once.
2. The card or the scene left mid-task (route away from らいらいけん, close the card): no timer writes into a later scene; customers and pick panel gone.
3. Phone width 360×640: the six-cell board, the bun close-up, the 外場 pick panel and every use-btn in らいらいけん fit.
4. A learner missing the words a D situation needs never meets it; one without いらっしゃいませ/どうぞ/はい cannot start 外場 and is told why.
5. Old 'deliver' records: 打工證 and 求人看板 render without errors.

---

### Task 1: 整理貨架 by ear (A, test.10)

**Files:** Modify `js/71s_jobs.js` (shelfMake, shelfRun), `css/app.css`, `events.js` (TOWN.WORK.first.shelf), `index.html`/`sw.js` versions; Test `tests/e2e/test_work.py`.

- [ ] Tests first: `test_the_shelf_label_is_heard_not_read` (item shows `.wk-ear`, no label text; tapping it speaks the label; two misses or a right put show the label) and `test_shelf_cells_hold_sound_alikes` (with seen すつしち…, a task for す has つ among its bins over many makes). Run → FAIL.
- [ ] Add `KANA_SOUNDALIKE` (js/71s_jobs.js) pairs: す/つ, し/ち, じ/ぢ, ず/づ, お/を, わ/は, え/へ, い/え, ち/き, ぬ/む, ら/な; shelfMake picks look-alikes then sound-alikes (seen only), then the rest. shelfRun: label hidden (`.wk-ear` 🔊), tap → `speak(label)`; shown on right or the second miss.
- [ ] events.js first.shelf → `['zhang', 'きいて。おなじ ところへ。', '聽我念，放到一樣的格子。']`; bump versions.
- [ ] Run test_work.py → PASS; full test.sh → ALL_OK; commit + push test.10.

### Task 2: 包包子 close-up and six-cell board (B, test.11)

**Files:** Modify `js/71s_jobs.js` (bunMake/bunsRun/bunsLines replaced), `css/app.css`, `events.js` (say.buns without steps; first.buns chen line); Test `tests/e2e/test_work.py` (replace the old buns tests).

- [ ] Tests first: `test_the_bun_board_says_a_kana_on_it` (6 cells, distinct kana, the said one on the board), `test_a_right_tap_moves_the_bun_and_swaps_the_cell` (step 1→2, tapped cell's kana changed, a new kana said), `test_three_taps_make_one_task` (after 3 rights ctx done 1; after 30 the shift pays), `test_a_shift_resumed_starts_at_its_tap` (done 4 → bun 3 step 1 i.e. tap 12), `test_all_right_in_time_fills_the_steamer` (30 rights fast → `.wk-shine-all`, 5 buns in `.wk-steamer`), `test_the_bun_card_fits_a_phone`.
- [ ] Implement: `BUN_STEPS = ['こねる','のばす','のせる','つつむ','ならべる','むす']`; `bunArt(step, flaw)` SVG; close-up with `HERO.head(look,'bust')` arms removed; board refill `next()`; timer 120 s (`.wk-clock`); ctx.right every 3 taps with that trio's misses; perfect bun (6 steps, no miss) → `wk-shine` + `say.buns.shine`; all 30 right within 120 s → `wk-shine-all` + `say.buns.all`; one 陳 gag. `JOBS.buns.now()` → `{ target, board, tap }`.
- [ ] Run → PASS; full → ALL_OK; commit + push test.11.

### Task 3: らいらいけん walk-in + 外送 removed (C part 1)

**Files:** Create `js/71v_rairai.js` (rairaiHtml, RAIRAI geometry, PLACE_USE.rairai); Modify `js/71b_places.js` (INDOOR, WALK_TOP), `js/71c_town.js` (PLACE_ROUTE, PLACE_NAME, ADJ, WAYS, render switch), `js/71q_dori.js` (rairai tap → walk in), `js/71s_jobs.js` + `js/71r_work.js` (deliver gone; NAMES keep 外送), `events.js` (HOURS.rairai [10,20], SPOTS.rairai huang at the pass, say/first.deliver gone), `js/82_sound.js`, `css/app.css`, index.html, sw.js; Test: create `tests/e2e/test_rairai.py` (PORT 8833), update test_work.py / test_dori.py, add to scripts/test.sh.
- [ ] Tests first: walk in from 大通り and back; every use-btn answers; fits a phone; night shut; an old deliver record shows 外送 in 打工證.
- [ ] Implement the room (round tables, register, pass with 黄, lanterns, menu strips, poster, toilet door).

### Task 4: 外場 core (C part 2, test.12)

**Files:** Create `js/71u_hall.js` (HALL: shift state, customers, spots, pick panel, lines); Modify `js/71r_work.js` (PLACES.waiter, can: words), `events.js` (TOWN.WORK.say.waiter, first.waiter, huang chat), `css/app.css`; Test `tests/e2e/test_rairai.py`.
- [ ] Tests first: can() needs 30 kana + いらっしゃいませ/どうぞ/はい; greet at the door → pick いらっしゃいませ right; seat → こちらへ どうぞ; call → はい; serve the right table → どうぞ, wrong table → すみません task; checkout → ありがとうございました; ten answers pay; leaving the room mid-shift and back resumes at done; pick panel fits a phone.
- [ ] Implement; full → ALL_OK; commit + push test.12.

### Task 5: 外場 D situations (test.13)

- [ ] Tests first: これ/それ/あれ order picks the right of three by where it is; toilet only from far tables → あそこです; dropped chopsticks → どういたしまして; regulars greet by the clock; each only when its words are learned.
- [ ] Implement; full → ALL_OK; commit + push test.13.

### Task 6: Final review

- [ ] review-package, fresh reviewer, one fix pass, report.
