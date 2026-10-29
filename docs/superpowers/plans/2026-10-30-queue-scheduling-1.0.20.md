# 分層 queue 出題規則（1.0.20） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三顆以下照間隔複習（每天最多 50 題），四顆、五顆、錯題本各是一個每天出固定比例的 queue；新題數看最近 100 題正確率和錯題本，照各題庫還沒學的比例分配；拿掉負荷上限；通過測驗自動設四顆，入門測驗改成選三到五顆。

**Architecture:** 分層不另外存，看星星決定：`tierOf(key)` 由 `r.b`、`r.rl`、`r.out` 算出。`srsAnswer` 負責升級（四顆答對 → 五顆）和入門題目移出（`r.out`）。`computeDailyPlan` 改寫成五段：三顆以下到期（上限 50）、四顆、五顆、錯題本三個 queue、新題（`newCountToday` + `splitNew`）、聽力閱讀；1.0.19 的「今天的清單」照舊把結果凍結一天。

**Tech Stack:** 單檔 `index.html`；e2e 用 `tests/e2e/cdp.py`；模擬程式 `scripts/sim-schedule.js`（Node）。

**Spec:** `docs/superpowers/specs/2026-10-30-queue-scheduling-design.md`

## Global Constraints

- 分支 `feat/today-queues`，接在 1.0.19 的 release commit 之後。最後一個 task 才改 `APP_VERSION = '1.0.20'`、`sw.js` 的 `CACHE = 'nq-v1.0.20'`。
- 常數（`index.html`，放在 `RELEARN_GAPS` 附近）：`SRS_DAILY_CAP = 50`、`QUEUE_RATE = { q4: 0.05, q5: 0.03, mk: 0.10 }`、`QUEUE_MIN = 1`、`QUEUE_MAX = 30`、`LISTEN_PER_DAY = 3`、`NEW_STEPS = [[0.9, 20], [0.8, 15], [0.7, 10], [0, 5]]`、`NEW_DEFAULT = 15`、`NEW_MIN = 3`、`NEW_MAX = 20`、`RECENT_MAX = 100`。四顆 = `LEVEL_FROM_S[3]`（10），五顆 = `LEVEL_FROM_S[4]`（21）。
- 分層名稱：`'new'`、`'out'`、`'srs'`、`'q4'`、`'q5'`；聽力（`l:`）、閱讀（`r:`）的 `tierOf` 回傳 `null`。
- 一天要抽幾題：`clamp(Math.round(數量 × 比例), QUEUE_MIN, QUEUE_MAX)`，數量是 0 時就是 0。
- 今天清單的 key 清單多 `q4`、`q5`、`mk`；手動錯題的 key 是 `'m:' + id`（1.0.19 已用這個格式記作答）。
- 文字：結果頁「已把第 X 階段以前、還不到四顆的 N 題設成四顆。」；入門四題的選項「三顆」「四顆」「五顆」，預選的那個加 chip「建議」；「我會了」的提示「已標成五顆，之後會排進五顆的複習」；加練說明「今天的進度已完成，這組是 N 題額外的新內容」。
- e2e 用 `.superpowers/sdd/2026-10-30-today-list-1.0.19/e2e-ok.sh`（全部檔案，只容許 `test_check_vocab_script_flags_bad_candidates` 這個 `python3 -I` 環境失敗）。新測試檔 `tests/e2e/test_queues.py` 用 `PORT = 8801`。
- 每個 task 先寫測試、看它失敗，再實作；commit 結尾加兩行（Co-Authored-By、Claude-Session）。

## Review Focus

1. 已經有很多四顆、五顆題目的舊帳號更新後第一天：每個 queue 最多 30 題，一天的總量要消化得了。→ Task 3 `test_queue_draws_follow_the_rates_and_caps`（700 題只抽 30）。
2. 四顆的題目在字卡或錯題循環答對（不是在每日練習）：照樣升五顆，因為規則看星星。→ Task 1 `test_four_star_right_anywhere_becomes_five`。
3. 手動錯題（沒有對到課程）被錯題本 queue 抽到：要在每日練習裡出成錯題卡，答了算進今天做了和圓圈。→ Task 3 `test_handmade_mistakes_come_as_cards_in_the_daily_set`。
4. 通過階段測驗當天：標成四顆的題目不能塞進今天的清單（清單已凍結），隔天才出現在四顆 queue。→ Task 6 `test_passing_a_stage_marks_four_stars_and_leaves_today_alone`。
5. 入門、假名門檻還沒開：新題名額全部給假名，不能因為單字、文法還不能出就少給。→ Task 2 `test_split_follows_unseen_shares_and_passes_on_blocked_slots`。

---

### Task 1: 分層與升級

**Files:**
- Modify: `index.html`：常數區（`RELEARN_GAPS` 附近，約 1540）、`srsAnswer`（約 1607）、`isDueToday`（約 3269）
- Test: 新增 `tests/e2e/test_queues.py`

**Interfaces:**
- Produces: `tierOf(key: string): 'new'|'out'|'srs'|'q4'|'q5'|null`。`isPreItem(key: string): boolean`（假名 `a:`、PRE_N5 內建單字、`u === 'm0'` 的文法）。`isDueToday(x, t)` 只在 `tierOf(x.key) === 'srs'`（或聽力、閱讀照日期）時為真。`dailyLogs[日期].fresh`：`srsAnswer` 遇到第一次作答時加 1。

- [ ] **Step 1：寫會失敗的測試**

`tests/e2e/test_queues.py` 照 `test_today_list.py` 的骨架。`rec(b, extra)` 寫一筆紀錄：`{ b, s: LEVEL_FROM_S[b - 1] || 0.5, d: 5, due: addDays(t, 3), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -10), lapse: 0, intro: addDays(t, -30) }`。
- `test_tier_follows_stars_ladder_and_out`：b=2 → `'srs'`、b=3 → `'srs'`、b=4 → `'q4'`、b=6 → `'q5'`、b=4 但 `rl = 0` → `'srs'`、b=6 且 `out = 1` → `'out'`、沒有紀錄 → `'new'`、`l:` 的 key → `null`。
- `test_four_star_right_anywhere_becomes_five`：一個單字 b=4，`srsAnswer(key, true)` 後 `state.srs[key].b >= 5`、`tierOf === 'q5'`。
- `test_pre_items_leave_after_a_five_star_right_answer`：`a:あ` b=6 答對 → `out === 1`、`tierOf === 'out'`；再答錯 → `out` 不在、`tierOf === 'srs'`。一個 N5 單字 b=6 答對 → 沒有 `out`。
- `test_only_srs_tier_items_are_due`：b=4、`due` 是昨天 → `isDueToday` 為假；b=2、`due` 是昨天 → 為真。
- `test_first_answers_are_tallied_as_fresh`：兩個新單字各答一次、其中一個再答一次 → `dailyLogs[今天].fresh === 2`；`bulkMark` 標記不改 `fresh`。

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/e2e/test_queues.py`
Expected: 五個 FAIL（`tierOf` 未定義、b 停在 4、`fresh` 為 undefined）。

- [ ] **Step 3：實作**

- `tierOf`、`isPreItem` 照 Interfaces。
- `srsAnswer`：算完 `r.b` 後，`g > 1 && before === 4` 時 `r.s = Math.max(r.s, LEVEL_FROM_S[4])` 並重算 `r.b`；`g > 1 && before >= 5 && isPreItem(key)` 時 `r.out = 1`；`g === 1` 時 `delete r.out`。`isNew` 時 `logEntry().fresh = (logEntry().fresh || 0) + 1`。
- `isDueToday`：`const tier = tierOf(x.key); if (tier !== null && tier !== 'srs') return false;` 再照原本判斷。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/e2e/test_queues.py`，再跑 `e2e-ok.sh`
Expected: `ALL PASS`；`E2E OK`。既有測試若用 b ≥ 4 的到期紀錄當「到期複習」，改用 b ≤ 3。

- [ ] **Step 5：Commit**：`feat: 分層看星星：四顆答對升五顆、入門題目五顆答對移出、只有三顆以下照到期日出`

### Task 2: 新題數與分配

**Files:**
- Modify: `index.html`：`recordAccuracy`（約 1750，上限 100）、`adaptiveFactor`（約 3452，刪除）、新增 `newCountToday`、`splitNew`（放在 `computeDailyPlan` 前面）
- Test: `tests/e2e/test_queues.py`

**Interfaces:**
- Produces: `newCountToday(): { n: number, base: number, acc: number|null, mistakes: number }`。`splitNew(n: number, skip?: Set<string>): { a: item[], v: item[], g: item[], k: item[] }`：照各題庫還沒學的比例分 n 個名額（最大餘數法），用現有候選函式挑題，跳過 `skip` 裡的 key；某題庫候選不夠時，剩的名額照權重依序讓給其他題庫。題庫：正課 `v` = 內建單字（還沒學的）、`g` = `REG.grammar`、`k` = `REG.kanji`；入門 `a` = `REG.kana`、`v` = PRE_N5 內建單字、`g` = `m0` 文法、`k` = PRE_N5 漢字。入門的假名門檻沒開時，`v`、`g`、`k` 的候選是空的。

- [ ] **Step 1：寫會失敗的測試**

- `test_new_count_follows_recent_accuracy_and_the_notebook`：`state.recent` 設成 100 筆（95% 對）、錯題 0 → `n === 20`；85%、34 條錯題 → 12；60%、200 條 → 3；只有 20 筆作答 → 15。
- `test_split_follows_unseen_shares_and_passes_on_blocked_slots`：正課新帳號（`FRESH`）`splitNew(15)` 的總數是 15，`v`、`g`、`k` 的數量分別等於照「還沒學的題數」用最大餘數法算出來的 7、6、2（測試裡自己算 expected）；入門、假名門檻沒開（`state.stage = 'pre'; state.kanaKnown = false`、假名都沒學）時，`splitNew(15).a.length === 15`，其他都是 0。
- `test_recent_keeps_the_last_hundred_answers`：連答 120 題後 `state.recent.length === 100`。

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/e2e/test_queues.py`
Expected: 三個新測試 FAIL。

- [ ] **Step 3：實作**

`recordAccuracy` 改用 `RECENT_MAX`。`newCountToday`：`acc = recentAccuracy(100)`（不到 30 筆為 null），`base` 由 `NEW_STEPS` 決定，null 時 `NEW_DEFAULT`，`n = clamp(base − floor(activeMistakes().length / 10), NEW_MIN, NEW_MAX)`。`recentAccuracy` 的「不到幾筆算沒資料」改成參數：`recentAccuracy(n = 40, min = 12)`，`newCountToday` 用 `(100, 30)`。`adaptiveFactor` 刪掉（Task 3 不再用它）。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/e2e/test_queues.py`
Expected: `ALL PASS`。

- [ ] **Step 5：Commit**：`feat: 新題數看最近 100 題正確率和錯題本，照各題庫還沒學的比例分配`

### Task 3: 今天的清單照分層排

**Files:**
- Modify: `index.html`：`computeDailyPlan`（約 3500，改寫）、`extrasPlan`（約 3475，聽力上限改常數、拿掉 `newK`／`newL` 的負荷上限部分）、`PLAN_LISTS`、`dailyPlan`／`todayPlanKeys`（`m:` key）、`buildDailyQueue`、`dailyQueue`（`kind === 'm'` 用 `makeMistakeCard`）、`startSession` 的 daily 分支（`kind === 'm'` 變成 `{ mistake }`）、`renderToday` 的範圍分頁與說明、`audioPrefetchItems`
- Test: `tests/e2e/test_queues.py`

**Interfaces:**
- Consumes: Task 1 `tierOf`、`isDueToday`；Task 2 `newCountToday`、`splitNew`。
- Produces: `computeDailyPlan()` 多回傳 `q4`、`q5`、`mk`（項目陣列；手動錯題是 `{ key: 'm:<id>', kind: 'm', mistake }`）、`n`、`split`（`{ a, v, g, k }` 各幾題），不再回傳 `factor`。`PLAN_LISTS` 加 `'q4', 'q5', 'mk'`；`state.today.plan` 存 `n`、`split`。

- [ ] **Step 1：寫會失敗的測試**

- `test_queue_draws_follow_the_rates_and_caps`：四顆 40 題 → 清單 `q4` 2 題；700 題 → 30；1 題 → 1；五顆 100 題 → `q5` 3 題；25 條還沒清掉的錯題 → `mk` 3 條；每個 queue 都是 `last`（錯題是 `mistakeLast`）最舊的那幾題。
- `test_srs_dues_are_capped_at_fifty_oldest_first`：三顆以下到期 80 題（`due` 從 80 天前到昨天各一題）→ 清單的到期複習 50 題，正好是最舊的 50 題。
- `test_new_items_and_drills_follow_the_rule`：正確率 95%、錯題 0 → 清單新題（`newV + newG + newK + newA`）20 題；`currentUnit = 'm18'`、變化練習都沒學 → `newC.length === 1`。
- `test_handmade_mistakes_come_as_cards_in_the_daily_set`：四條手動錯題（同 `test_today_list.py` 的寫法）→ 清單 `mk` 含 `m:` key；開一組每日練習，裡面有 `kind === 'm'` 的錯題卡，答完 `answeredToday('m:' + id)`，`dayProgress().done` 加 1。
- `test_the_plan_keeps_its_queues_all_day`：排好後把一題四顆答對（變五顆），`dayProgress().total` 不變，`state.today.plan.n` 與 `split` 有存。

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/e2e/test_queues.py`
Expected: 五個新測試 FAIL。

- [ ] **Step 3：實作**

`computeDailyPlan`：
1. 範圍照原本（單字 `vocabEligibleForDaily`／入門的規則、文法 `grammarInReach`、漢字 N4 要等 N5、假名 `kanaPlan` 的到期、變化練習已到的單元）。
2. 三顆以下到期：範圍內 `isDueToday` 的單字、文法、漢字、假名、變化練習，合在一起照 `due` 排，取前 `SRS_DAILY_CAP`，再依種類放回 `dueV`、`dueG`、`dueK`、`dueA`、`dueC`。
3. `q4`、`q5`：範圍內該層、今天沒答過的題，照 `last` 由舊到新，取 Global Constraints 的題數。
4. `mk`：`activeMistakes()` 中今天沒答過（`answeredToday(m.key || 'm:' + m.id)`）、不在 1–3 的題，照 `mistakeLast` 由舊到新，取 `clamp(round(0.10 × activeMistakes().length), 1, 30)`。對到課程的放項目本身，手動的放 `{ key, kind: 'm', mistake }`。
5. 新題：`const nc = newCountToday(); const s = splitNew(nc.n);` → `newV`、`newG`、`newK`、`newA`；`split` 記各幾題。變化練習：範圍內第一個還沒學的，`state.today.newC < 1` 時放進 `newC`。
6. 聽力：`LISTEN_PER_DAY` 減今天答過的，先到期再新題（入門沒有新聽力）；閱讀照舊每天 1 篇。
7. `note`：`nc.n < nc.base` 或 `nc.base < 15` 時寫「最近 100 題正確率 X%、錯題本 Y 條，今天新內容 N 題。」（acc 為 null 時不寫正確率）。

`buildDailyQueue`：`q4`、`q5`、`mk` 放進「複習」那一側（`kind` 為 `g`、`c` 的到文法側，其餘含 `m` 到單字側）。`dailyQueue` 檢查能否出題時，`kind === 'm'` 用 `makeMistakeCard(it.mistake)`。`startSession` daily 分支把 `kind === 'm'` 轉成 `{ mistake: it.mistake }`。`dailyPlan` 還原 `m:` key 時找 `state.mistakes` 裡還沒清掉的那一條，`todayPlanKeys` 也認得 `m:`。今日頁範圍分頁的「待複習」加上「四顆 N・五顆 N・錯題 N」。`audioPrefetchItems` 改成取 `PLAN_LISTS` 全部（略過 `kind === 'm'`）。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/e2e/test_queues.py`、`python3 tests/e2e/test_today_list.py`，再跑 `e2e-ok.sh`
Expected: 全部通過。既有測試裡算「新題配額」「負荷上限減新題」的（例如 `test_fixes.py::test_load_cap_replaces_the_daily_goal_and_brakes_new_items_in_order`、`test_pre_n5.py::test_load_cap_counts_kana`、離線語音的 `v50`），改寫成照新規則的期望值；只是讀新題數的，換成 `computeDailyPlan().split`。

- [ ] **Step 5：Commit**：`feat: 今天的清單照分層排：三顆以下最多 50 題、四顆 5%、五顆 3%、錯題本 10%，新題照規則分配`

### Task 4: 拿掉負荷上限

**Files:**
- Modify: `index.html`：`NEW_SHARE`、`newQuota`（約 1138，刪除）、`laneCap`（約 3355）、`bulkDailyBudget`（約 4967）、`EXPERIENCED_SETTINGS`（約 5366）、`kanaPlan`（約 3279，不再用 `newKanaPerDay`）、字卡新卡名額（約 5540）、`buildUnitQueue`／`buildVocabQueue`（約 3625）、漢字頁（約 7660）、設定頁（約 7329–7331，拿掉「每天負荷上限」「每天新假名」兩列）、`planAdvice`／`planAdviceHtml`（約 7756–7920）、模擬考頁的 `hero-advice`（約 6644）
- Test: `tests/e2e/test_queues.py`

**Interfaces:**
- Consumes: Task 3 存的 `state.today.plan.split`。
- Produces: `todayNewLeft(kind: 'v'|'g'|'k'|'a'): number` = `max(0, (dailyPlan() 存的 split[kind] || 0) − (state.today['new' + kind.toUpperCase()] || 0))`，給字卡、單元練習、單字練習、漢字頁用。`paceAdvice(): { perDay, left, finish, target, late }`。

- [ ] **Step 1：寫會失敗的測試**

- `test_settings_have_no_load_cap_or_kana_per_day`：設定頁的 HTML 不含「每天負荷上限」「每天新假名」。
- `test_quota_users_follow_todays_split`：`todayNewLeft('v')` 等於清單的 `split.v`；字卡練習在今天沒其他新單字時，新卡最多 `split.v` 張。
- `test_exam_countdown_projects_the_finish_date`：`dailyLogs` 最近 10 天各 `fresh: 12`、考試日設在 400 天後 → `paceAdvice().perDay === 12`、`finish` 是今天加「還沒學的單字＋文法＋漢字」除以 12（無條件進位）；模擬考頁的提示含「預計」和那個日期；考試日改成 100 天後 → `late > 0`，文字含「加練」。

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/e2e/test_queues.py`
Expected: 三個新測試 FAIL。

- [ ] **Step 3：實作**

照 spec §6.3 與 §9。`paceAdvice`：`perDay` = 最近 14 天裡有 `fresh` 欄位的日子的平均（都沒有時用今天的 `plan.n`）；`left` = 還沒學的內建單字＋文法＋漢字；`finish = addDays(今天, ceil(left / perDay))`；`target = addDays(考試日, −21)`；`late = daysBetween(target, finish)`。`planAdviceHtml` 改寫成：「照最近每天約 X 題新內容的速度，預計 YYYY-MM-DD 學完單字、文法、漢字（考前三週是 YYYY-MM-DD）。」晚的話加「要趕上，每天約需 Y 題新內容，可以做完當天的練習後按加練。」拿掉「套用」按鈕和它的動作。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/e2e/test_queues.py`，再跑 `e2e-ok.sh`
Expected: 全部通過。既有測試 `test_fixes.py::test_today_offers_the_exam_pace_quotas_when_behind`、`test_stats_recommends_daily_quotas_from_the_remaining_banks_and_applies_them` 照新文字改寫。

- [ ] **Step 5：Commit**：`feat: 拿掉每天負荷上限與每天新假名；考試倒數改成預計學完的日期`

### Task 5: 加練只給新題

**Files:**
- Modify: `index.html`：`extraQueue`（約 3590）、`extraNote`
- Test: `tests/e2e/test_queues.py`

**Interfaces:**
- Consumes: Task 2 `splitNew`；Task 3 `plan.n`。

- [ ] **Step 1：寫會失敗的測試**

- `test_extra_round_is_new_items_only`：把今天的清單全部答完，`extraQueue()` 的題目都沒有紀錄、數量等於 `plan.n`、不含今天清單的 key；答完這一輪後 `extraQueue()` 又有 `plan.n` 題（新的一批）；說明文字等於 Global Constraints 的那句。

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/e2e/test_queues.py test_extra_round_is_new_items_only`
Expected: FAIL（現在含提前複習、題數是 sessionSize 的一半）。

- [ ] **Step 3：實作**

`extraQueue()`：`const p = dailyPlan(); const s = splitNew(p.n || NEW_DEFAULT, new Set(todayPlanKeys().concat(state.today.ans || [])));`，題目 = `interleave(s.a.concat(s.v, s.k), s.g, 'mixed')`，回傳 `{ items, plan: p, aheadN: 0, newN, newCount: newN, reviewCount: 0 }`。`extraNote` 只剩新題那一句。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/e2e/test_queues.py`，再跑 `e2e-ok.sh`
Expected: 全部通過；`test_fixes.py::test_done_state_and_extra_session` 照新規則改寫（不再有提前複習）。

- [ ] **Step 5：Commit**：`feat: 加練只給新題，一輪等於今天的新題數`

### Task 6: 通過測驗自動設四顆、入門四題選三到五顆

**Files:**
- Modify: `index.html`：`BULK_LEVELS`（約 4960，加 `four`）、`bulkMarkTargets`／`bulkApply`／`bulkMark`（約 4978–5030）、`finishStageTest`（約 4892）、`renderStageSummary`（約 4916）、刪除 `bulkMarkDialog` 與 `'stage-mark'` 動作、`stageFootHtml`（約 5122，拿掉按鈕）、`PRE_MARK_LEVELS`／`preMarkStepHtml`／`preMarkApply`／`preAutoChoices`（約 4906、5069–5110）、`markKnown` 的提示（`'vocab-known'`、`'preview-known'`、`'vocab-known-all'`）
- Test: `tests/e2e/test_queues.py`；改寫 `tests/e2e/test_stage_tests.py` 中用到等級對話框與舊三階的測試

**Interfaces:**
- Produces: `BULK_LEVELS.four = { name: '四顆', due: [5, 14], lr: [90, 270] }`（`s = LEVEL_FROM_S[3]`）。`passMarkTargets(stageId: string, skip: Set<string>): item[]`：`stagesUpTo(stageId)` 的題目，排除聽力、閱讀以外 `b ≥ 4` 的、`skip` 裡的（測驗答錯的 key 加錯題本裡的 key）；聽力、閱讀照 `bulkMarkTargets(stageId, 'learned')` 的規則。`preSuggest(score: [ok, n]): 3|4|5`：≥ 0.9 → 5，≥ 0.8 → 4，其他 3。

- [ ] **Step 1：寫會失敗的測試**

- `test_passing_a_stage_marks_four_stars_and_leaves_today_alone`：`FRESH`、排好今天的清單、記下 `dayProgress()`；跑 p1 測驗，其中三題答錯，並先放一條 p1 單字的錯題。斷言：範圍內原本不到四顆的題目都是 b=4，答錯的三題和那條錯題的題目沒被改；聽力、閱讀的 `due` 在 90–270 天後；`dayProgress()` 跟測驗前一樣；結果頁含「設成四顆」與「復原」按鈕、沒有「標記到這裡為止」；`bulkUndo()` 後全部還原。把日期當成隔天（`delete state.today.plan` 並把 `state.today.date` 改掉後 `checkDayRollover()`），清單的 `q4` 有題目。
- `test_pre_test_asks_three_to_five_stars_with_a_suggestion`：舊帳號（1.0.17 的情況）和新帳號各跑一次入門測驗並通過，結果頁都出現四題；平假名全對時預選「五顆」並有「建議」；選完後平假名 b=6、選四顆的 b=4、選三顆的 b=3。
- `test_i_know_this_says_five_stars`：預覽卡按「我會了」，提示含「已標成五顆」，該字 `tierOf === 'q5'`。

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/e2e/test_queues.py`
Expected: 三個新測試 FAIL。

- [ ] **Step 3：實作**

照 spec §8。`finishStageTest`：通過而且 `T.stage !== 'pre'` 時，`skip` = 答錯的 key 加 `activeMistakes()` 的 key，`bulkApply(passMarkTargets(...), 'four', snap)` 加上 `bulkMark` 原本的其他副作用（單元完成、講義、`stage`、`currentUnit`），`T.marked = 筆數`；入門照 §8.2 一律進四題。`preMarkStepHtml` 的選項換成三個，預選用 `preSuggest(T.preScores[g])`；`preMarkApply` 的 `'3'`、`'4'`、`'5'` 對應 `learned`、`four`、`known`。刪掉 `bulkMarkDialog`、`'stage-mark'`、`stageFootHtml` 的那顆按鈕、`T.auto` 的自動套用。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/e2e/test_queues.py`、`python3 tests/e2e/test_stage_tests.py`，再跑 `e2e-ok.sh`
Expected: 全部通過。`test_stage_tests.py` 裡測等級對話框、三種等級、1.0.17 自動標記的測試，改成測新流程（不是刪掉）。

- [ ] **Step 5：Commit**：`feat: 通過階段測驗自動設四顆（答錯與錯題本的不動）、入門四題選三到五顆並依成績預選`

### Task 7: 模擬程式、說明文字、發佈 1.0.20

**Files:**
- Create: `scripts/sim-schedule.js`
- Modify: `index.html`：今日頁說明分頁、`APP_VERSION`、changelog；`sw.js` 的 `CACHE`

- [ ] **Step 1：模擬程式**

`scripts/sim-schedule.js`：用法 `node scripts/sim-schedule.js [index.html]`。從 `index.html` 抓 `clamp`、`FSRS_W`、`FSRS_DECAY`、`FSRS_FACTOR`、`LEVEL_FROM_S`、`RELEARN_GAPS`、`levelFromS`、`fsrsD0`、`fsrsR`、`fsrsNext`，以及本計畫的常數；模擬強、中、弱三種學習者（實際記得 = R^0.6／R／R^1.8、第一次答對 90%／80%／65%）照 Task 1–3 的規則學 3550 題、300 天，每人印一行：每天新題平均、哪天學完、每天題數平均與最多、錯題本平均、考試日平均記得。抓不到函式時印出缺哪一個並以 1 結束。

Run: `node scripts/sim-schedule.js`
Expected: 三行結果，考試日平均記得都在 90% 以上。

- [ ] **Step 2：說明文字與版本**

今日頁說明分頁改寫成：「今天的題目在第一次打開時排好，當天不會變。三顆以下照記憶強度排複習，每天最多 50 題；四顆每天出 5%、五顆每天出 3%、錯題本每天出 10%（各最少 1 題、最多 30 題），都是等最久的先出。新題數看最近 100 題的正確率和錯題本，照還沒學的比例分給單字、文法、漢字。做完還想多學可以按加練。」`APP_VERSION = '1.0.20'`、`CACHE = 'nq-v1.0.20'`，changelog 加一條（照 spec §2 用白話寫）。

- [ ] **Step 3：跑全部檢查**

Run: `node --check sw.js && node --check sync-core.js && node --check data.js && node scripts/sim-schedule.js && node tests/sync-core.test.js 2>&1 | grep -E "ℹ (pass|fail)"`，再跑 `e2e-ok.sh`
Expected: `ℹ fail 0`；`E2E OK`。

- [ ] **Step 4：Commit**：`release: 1.0.20 分層 queue 出題：三顆以下每天最多 50 題、四顆／五顆／錯題本每天固定比例、新題看正確率與錯題本、拿掉負荷上限、通過測驗自動設四顆`
