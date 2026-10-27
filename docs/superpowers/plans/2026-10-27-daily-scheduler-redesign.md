# 今日練習排程重整 + 錯題快速循環 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 今日練習只由「到期複習 + 今天的新題額度」組成，同日重複只剩不寫排程的學習步驟，做完顯示完成並提供標示清楚的加練；錯題本加一個翻卡快速循環。

**Architecture:** 全部在 `index.html`（單檔 vanilla JS）。`dailyPlan()` 改為回傳今天剩下的工作（含 `r.last !== t` 過濾與聽力／閱讀上限），`buildDailyQueue()` 瘦身成「取 day list 前 N 題、新題平均散佈」，三條補位函式刪除；`answerCurrent()` 的再練一次複本不再呼叫 `srsAnswer`；新增 `extraQueue()`（加練）、`themeLane` 主題輪替、`MLOOP` 錯題循環頁（仿 FLASH）。

**Tech Stack:** Vanilla JS 單檔、Python CDP e2e（`tests/e2e/test_fixes.py`）、`scripts/test.sh`。

**Spec:** `docs/superpowers/specs/2026-10-27-daily-scheduler-redesign.md`

## Global Constraints

- 分支 `daily-rules`；`APP_VERSION '63'`、`sw.js CACHE 'nq-v63'`、CHANGELOG 一則日期 2026-10-27，與程式同一次 commit（Task 7）。
- 文案一律繁體中文，照 spec §5。
- `fsrsNext`、`fsrsDays`、retention 設定、`addMistake`、`onCorrectForMistake` 不動。
- `state.srs` 紀錄欄位不變；舊 state 殘留 `mistakesPerDay`、`vocabShare` 不報錯。
- 每個 task 跑 `python3 -I tests/e2e/test_fixes.py`（會跑整檔，約 2–4 分鐘）；最後 `scripts/test.sh` 直接看 exit code。
- e2e 測試寫法照既有檔：`b.run([("nav", URL), ("wait", READY), ("eval", js)])`，JS 回 `JSON.stringify`，測試結尾把動過的 `state` 還原（或只在 `nav` 後的新 state 裡動）。

## Review Focus

1. 一題今天在「單字練習」答過，之後開今日練習：不得再出（`r.last === t` 過濾要套用到五個軌）。→ Task 2 測試 `test_daily_queue_has_only_due_or_new` 加一筆「單字練習答過」的紀錄。
2. 新單字第一次答錯 → 再練一次答對 → 明天到期，而且 `換個方式再考` 仍只排一次。→ Task 1 測試。
3. 長假回來到期 300 題：day list 全出但分多組；首頁「開始練習・20 題」與「做完還有 N 題」要正確，新題仍每組都有。→ Task 2 測試 `test_new_items_spread_across_sessions`。
4. 加練做完再回首頁：按鈕應消失（沒有明後天到期、也沒有額度外新題時），不可空場開始。→ Task 3 測試最後一段。
5. 錯題循環在今天已答過的項目上評「忘了」：SRS 不動但 `m.count` 加一；非課程錯題評「記得」兩次同一天不得變 mastered。→ Task 6 測試。

---

### Task 1: 答錯一律明天；再練一次不寫排程

**Files:**
- Modify: `index.html` `srsAnswer` (~1333, `r.due = g === 1 ? ...` 那行)、`answerCurrent` (~3430)
- Test: `tests/e2e/test_fixes.py`（改 `test_wrong_non_vocab_item_waits_until_tomorrow_but_wrong_vocab_stays_due_today`，新增一個）

**Interfaces:**
- Produces: `srsAnswer(key, false)` → `rec.due === addDays(t, 1)` 對五種 kind。`answerCurrent(i)` 在 `e.requeued` 時：不呼叫 `srsAnswer`、`recordFormat`、`recordAccuracy`、`addMistake`、`onCorrectForMistake`、`scheduleEncores`、`statsFmt`；只 `recordAction`、`SESSION.results.push`、render。

- [ ] **Step 1: 改測試**

把 `test_wrong_non_vocab_item_waits_until_tomorrow_but_wrong_vocab_stays_due_today` 改名 `test_every_wrong_answer_waits_until_tomorrow`，斷言 `r == {'g': 1, 'l': 1, 'r': 1, 'k': 1, 'v': 1}`。新增：

```python
def test_miss_then_requeue_does_not_return_today(b):
    js = """(() => { const t = todayStr(); const out = {};
      for (const kind of ['g', 'v']) {
        const it = kind === 'g' ? REG.grammar.find(x => !state.srs[x.key]) : REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
        const fill = REG.grammar.filter(x => !state.srs[x.key] && x !== it).slice(0, 10);
        startSession('items', { items: [it, ...fill] }); let e = currentEntry(); e.previewDone = true;
        answerCurrent((e.q.answer + 1) % e.q.options.length);                       // miss
        const n1 = state.srs[it.key].n; const mist = state.mistakes.length;
        while (!(currentEntry() || {}).requeued) { nextQuestion(); const c = currentEntry(); if (!c) break; if (!c.requeued) { c.previewDone = true; answerCurrent(c.q.answer); } }
        e = currentEntry(); answerCurrent(e.q.answer);                                 // the 再練一次 copy, right
        out[kind] = { n: state.srs[it.key].n, due: daysBetween(t, state.srs[it.key].due), n1, mistakes: state.mistakes.length - mist,
          inDaily: dailyQueue(20).items.some(x => x.key === it.key), encores: SESSION.entries.filter(x => x.encore && x.item.key === it.key).length };
        SESSION = null; document.body.classList.remove('practicing');
      }
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    for kind in ('g', 'v'):
        assert r[kind]['n'] == 1 and r[kind]['n1'] == 1 and r[kind]['due'] == 1 and r[kind]['mistakes'] == 1 and not r[kind]['inDaily'], r
    assert r['v']['encores'] == 1, r
```

（`nextQuestion` 若需要先 `e.done`，照 `answerCurrent` 後的狀態即可；`startSession('items')` 不會 `dailyQueue` 快取，但 `DAILY_CACHE` 以 `state.updatedAt` 為 key，`saveState()` 已在 `answerCurrent` 內呼叫。）

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_fixes.py 2>&1 | tail -5`
Expected: 兩個測試 FAIL（`v` 的 due 是 0；requeue 後 `n` 是 2）。

- [ ] **Step 3: 實作**

`srsAnswer`：`r.due = g === 1 ? addDays(t, 1) : addDays(t, fsrsDays(r.s, key));`，註解改為「答錯一律明天；同一天的再看一次是場內的再練一次，不寫排程」。
`answerCurrent`：在 `e.done = true; e.chosen = i; const ok = ...; SESSION.lastFmt = q.fmt;` 之後加 `if (e.requeued) { recordAction(...同現有算法...); SESSION.results.push({ key: q.key, ok, q, chosen: i, requeued: true }); saveState(); renderPractice(); if (state.settings.autoSpeak) {...同現有...} return; }`。把現有的 autoSpeak 區塊抽成 `speakAnswered(q)` 以免重複。`e.undo` 區塊與其餘不變。

- [ ] **Step 4: 跑測試通過**

Run: `python3 -I tests/e2e/test_fixes.py 2>&1 | tail -5`
Expected: 全部 pass（`test_a_slip_undoes_the_schedule_the_notebook_and_the_requeue` 仍過）。

- [ ] **Step 5: Commit** `fix: 答錯一律明天再出；再練一次不寫入排程`

---

### Task 2: day list 與一場的組成（刪掉補位）

**Files:**
- Modify: `index.html` `dailyPlan` (~2955)、`extrasPlan` (~2933)、`buildDailyQueue` (~3003)、`dailyQueue` (~3079)、`renderToday` (~3892–3935)、`sessionTopicsHtml` (~3871)、`extraNote` (~3071)、設定頁 (~5756、5759)、`planAdvice` (~6194–6195、6339)、`EXPERIENCED_SETTINGS` 不含這兩欄（確認即可）、`defaultSettings` (~904、921)。刪除 `reinforcementItems`、`aheadItems`、`dailyMistakeItems`、`focusThemes`、`interleave` 以外不再被呼叫的東西（`grep` 確認）。
- Test: `tests/e2e/test_fixes.py`

**Interfaces:**
- Produces: `dailyPlan()` → `{ dueV, dueG, dueK, dueL, dueR, newV, newG, newK, newL, newR, note, factor, n4Open, remaining }`，每個 due 陣列只含 `r.due <= t && r.last !== t` 且在範圍內的項目；`dueL`+`newL` 合計 ≤ `listenPerDay`（先到期後新）；`dueR`+`newR` ≤ 1；`remaining` = 五軌總數。`buildDailyQueue(size)` → `{ items, plan, newCount, reviewCount, total }`，`items` 為 day list 前 `size` 題（新題平均散佈後再 `interleave` + 聽力插入 + 閱讀最後），`total` = day list 長度。移除 `extra`、`mistakeKeys`、`mistakeN`、`focus`。
- `settings.mistakesPerDay`、`settings.vocabShare` 不再存在於 `defaultSettings`；設定頁與 `planAdvice` 不再提。

- [ ] **Step 1: 刪除舊測試、寫新測試**

刪除：`test_reinforcement_takes_only_items_two_days_quiet_with_a_short_correct_streak`、`test_an_extra_session_brings_new_material_and_upcoming_reviews_instead_of_todays_answers`、`test_linked_mistakes_join_the_daily_mix_by_priority_up_to_the_setting`、`test_carried_mistakes_keep_two_days_of_spacing_unless_the_last_answer_was_wrong`；`MIST_SEED` 去掉 `state.settings.mistakesPerDay = 1;`；`test_stats_recommends_daily_quotas…` 的 probe 去掉 `share: s.vocabShare`，斷言去掉 `30 <= r['share'] <= 70`。新增：

```python
def test_daily_queue_has_only_due_or_new(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs);
      const rec = (it, o) => { state.srs[it.key] = Object.assign({ b: 1, n: 3, ok: 2, ng: 1, s: 2, d: 6, intro: addDays(t, -9), f: {} }, o); };
      const gs = REG.grammar.filter(g => g.u === 'm1'); const vs = REG.vocab.filter(v => v.builtin && v.lv === 'N5');
      rec(gs[0], { due: t, last: addDays(t, -3) });                 // due → in
      rec(gs[1], { due: addDays(t, -5), last: addDays(t, -9) });    // overdue → in, first
      rec(gs[2], { due: addDays(t, 1), last: addDays(t, -3) });     // tomorrow → out
      rec(gs[3], { due: t, last: t });                              // answered today (e.g. in 單元練習) → out
      rec(vs[0], { due: t, last: addDays(t, -2) });
      rec(vs[1], { due: addDays(t, 2), last: addDays(t, -3), b: 0, st: 0 });   // weak but not due → out
      rec(vs[2], { due: t, last: t });                              // answered today in 單字練習 → out
      saveState(); DAILY_CACHE = null; const q = dailyQueue(20); const keys = q.items.map(x => x.key);
      const bad = q.items.filter(it => { const r = state.srs[it.key]; return r && (r.due > t || r.last === t); }).map(x => x.key);
      const out = { bad, has: [gs[0], gs[1], vs[0]].map(g => keys.includes(g.key)), gFirst: keys.indexOf(gs[1].key) < keys.indexOf(gs[0].key), extra: 'extra' in q, mist: 'mistakeKeys' in q };
      state.srs = JSON.parse(keep); saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['bad'] == [] and r['has'] == [True, True, True] and r['gFirst'], r
    assert not r['extra'] and not r['mist'], r

def test_listening_and_reading_are_capped_per_day(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const s = state.settings.listenPerDay; state.settings.listenPerDay = 3;
      listenReachable().slice(0, 10).forEach(x => { state.srs[x.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -15), intro: addDays(t, -20) }; });
      REG.read.filter(x => unitOrder(x.u) <= unitOrder(state.currentUnit)).slice(0, 3).forEach(x => { state.srs[x.key] = { b: 2, due: t, n: 1, ok: 1, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -4) }; });
      saveState(); DAILY_CACHE = null; const p = dailyPlan(); const out = { l: p.dueL.length + p.newL.length, r: p.dueR.length + p.newR.length };
      state.srs = JSON.parse(keep); state.settings.listenPerDay = s; saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r == {'l': 3, 'r': 1}, r

def test_new_items_spread_across_sessions(b):
    # 60 due reviews + the default new quotas, sessionSize 20: every session holds new items and the button counts the rest
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const size = state.settings.sessionSize; state.settings.sessionSize = 20;
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 60).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      saveState(); DAILY_CACHE = null; const q = dailyQueue(20);
      const firstNew = q.items.filter(it => !state.srs[it.key]).length;
      location.hash = '#/today'; route(); const btn = document.querySelector('[data-act=start-daily]').textContent; const rest = (document.querySelector('.hero .row-wrap .small') || {}).textContent || '';
      state.srs = JSON.parse(keep); state.settings.sessionSize = size; saveState(); DAILY_CACHE = null; return JSON.stringify({ n: q.items.length, total: q.total, firstNew, btn, rest }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['n'] == 20 and r['total'] > 60 and 2 <= r['firstNew'] <= 8, r
    assert '開始練習・20 題' in r['btn'] and f"做完還有 {r['total'] - 20} 題" in r['rest'], r
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_fixes.py 2>&1 | tail -8`
Expected: 三個新測試 FAIL（`bad` 非空／`extra` 存在、聽力 10、`total` 未定義）。

- [ ] **Step 3: 實作 `dailyPlan` 與 `extrasPlan`**

- 共用 `const isDue = (x) => { const r = state.srs[x.key]; return r && r.due <= t && r.last !== t; }`（取代兩處各自的 isDue／filter）。
- `extrasPlan`：`dueL = lPool.filter(isDue).sort(byDue).slice(0, listenPerDay)`；`newL` 只補到 `listenPerDay - dueL.length` 且不超過剩餘額度；`dueR.slice(0, 1)`、`newR` 只在 `dueR` 為空時取 1。
- `dailyPlan` 回傳多 `remaining: dueV.length + dueG.length + newV.length + newG.length + ex.dueK.length + ex.newK.length + ex.dueL.length + ex.newL.length + ex.dueR.length + ex.newR.length`。其餘（adaptiveFactor、room/wantV）不動。

- [ ] **Step 4: 重寫 `buildDailyQueue(size)`**

```js
function buildDailyQueue(size = state.settings.sessionSize) {
  const plan = dailyPlan(size);
  const byPractice = (a, b) => ((state.srs[a.key].ok || 0) - (state.srs[b.key].ok || 0)) || byDue(a, b);
  const reviews = plan.dueV.concat(plan.dueK).sort(byDue).concat(plan.dueG.slice().sort(byPractice));   // then interleave decides the order
  const fresh = plan.newV.concat(plan.newK, plan.newG);
  const day = spreadEvenly(reviews, fresh);            // fresh placed every reviews.length/fresh.length positions
  const L = plan.dueL.concat(plan.newL); const R = plan.dueR.concat(plan.newR);
  const total = day.length + L.length + R.length;
  const take = day.slice(0, Math.max(0, size - Math.min(L.length, Math.round(size * 0.2)) - (R.length ? 1 : 0)));
  const vList = shuffle(take.filter(x => x.kind !== 'g' && state.srs[x.key])).concat(take.filter(x => x.kind !== 'g' && !state.srs[x.key]));
  const gList = shuffle(take.filter(x => x.kind === 'g' && state.srs[x.key])).concat(take.filter(x => x.kind === 'g' && !state.srs[x.key]));
  const items = interleave(vList, gList, state.settings.order);
  const Ls = L.slice(0, Math.min(L.length, Math.round(size * 0.2)));   // listening spread through the session, reading last
  Ls.forEach((x, i) => items.splice(Math.min(items.length, Math.round((i + 1) * items.length / (Ls.length + 1)) + i), 0, x));
  items.push(...R.slice(0, 1));
  const isNew = (x) => !state.srs[x.key];
  return { items, plan, total, newCount: items.filter(isNew).length, reviewCount: items.filter(x => !isNew(x)).length };
}
```
`spreadEvenly(base, inserts)` 新函式：回傳 base 中每隔 `Math.max(1, Math.floor(base.length / inserts.length))` 個插入一個 insert（base 為空時直接回 inserts）。`vList`/`gList` 的排序只是讓一場內複習洗牌、新題在後（現況）；day list 順序由 `take` 決定取到哪些。
`dailyQueue`：去掉 `mistakeN`；`DAILY_CACHE` key 不變。`extraNote(q)` 改在 Task 3 重寫，此處先回 `''`。

- [ ] **Step 5: 刪函式與設定、改首頁**

- 刪 `reinforcementItems`、`aheadItems`、`dailyMistakeItems`、`focusThemes`、`quietDays`（若無他處使用；`buildUnitQueue` 用到的在 Task 4 一起處理，此 task 先保留 `quietDays`）。
- `defaultSettings` 去掉 `vocabShare`、`mistakesPerDay`；設定頁刪兩個 `numRow`；`planAdvice` 的 `vocabShare` 計算與 `rec.vocabShare`、6339 文案中的「單字比例 …%・」刪除；`sessionSize` 說明改為 spec §5 文案。
- `renderToday`：`extraN = exK + exL + exR`（去 `exM`、`extraText` 的錯題）；`sessionN = dailyQueue(size).items.length + encoreEstimate(...)`；「做完還有 N 題」用 `dailyQueue(size).total - dailyQueue(size).items.length`；`startSession('daily')` 的 `entries` 不再標 `fromMistake`。
- `sessionTopicsHtml`：`q.focus` 相關改成直接列 `present`。

- [ ] **Step 6: 跑測試通過**

Run: `python3 -I tests/e2e/test_fixes.py 2>&1 | tail -5` 以及 `python3 -I tests/e2e/test_vocab.py 2>&1 | tail -3`
Expected: 全 pass。`grep -n "reinforcementItems\|aheadItems\|dailyMistakeItems\|mistakesPerDay\|vocabShare\|focusThemes" index.html` 只剩 `buildUnitQueue`/`buildVocabQueue`/`buildKanjiQueue` 的呼叫（Task 4 處理）。

- [ ] **Step 7: Commit** `feat: 今日練習只含到期複習與新題額度；拿掉補位、提前複習、錯題夾帶與單字比例設定`

---

### Task 3: 完成態與加練

**Files:**
- Modify: `index.html` `renderToday` (~3915 的 `if (reviewN + newN + extraN === 0)` 分支)、新增 `extraQueue(size)`、`extraNote(q)`、`startSession('daily', { extra: true })`、ACTIONS `'start-extra'`
- Test: `tests/e2e/test_fixes.py`

**Interfaces:**
- Produces: `extraQueue(size = sessionSize)` → `{ items, aheadN, newN }`：`items` = 明後天到期且 `last !== t` 的單字／文法／漢字（`byDue`）接額度外新題（`newGrammarPerDay > 0` 才取文法、`newVocabPerDay > 0` 才取單字，各 `Math.ceil(cap/2)`，新題合計 ≤ `Math.ceil(size / 2)`），總長 ≤ `size`。`extraNote(q)` 回 spec §5 的加練開頭文案（`q.aheadN`/`q.newN` 為 0 的部分省略）。`startSession('daily', { extra: true })` 用 `extraQueue`，`meta.note = extraNote(q)`。
- 首頁 day list 為空時：`<h2>今天完成了</h2>`、「今天做了 N 題，答對 P%」（P 用 `recentAccuracy()` 當天的紀錄：`state.dailyLogs[t]` 沒有正確率欄位，改用 `SESSION` 無關的 `state.recent` 過濾今天，若無則省略這句）、`extraQueue().items.length ? 「加練・N 題」(data-act="start-extra") : 「明天再來，或到課程頁預習下一單元。」`。

- [ ] **Step 1: 測試**

```python
def test_done_state_and_extra_session(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify({ srs: state.srs, today: state.today, settings: state.settings });
      Object.assign(state.settings, { newVocabPerDay: 4, newGrammarPerDay: 2, newKanjiPerDay: 0, listenPerDay: 0, sessionSize: 20 }); Object.assign(state.today, { newV: 4, newG: 2 });
      Object.keys(state.srs).forEach(k => { if (state.srs[k].due <= t) state.srs[k].last = t; });   // nothing due left
      const ahead = REG.vocab.filter(v => v.builtin && !state.srs[v.key]).slice(0, 3);
      ahead.forEach(v => { state.srs[v.key] = { b: 3, due: addDays(t, 2), n: 3, ok: 3, ng: 0, s: 6, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      saveState(); DAILY_CACHE = null;
      location.hash = '#/today'; route(); const h2 = document.querySelector('.hero h2').textContent; const btn = document.querySelector('[data-act=start-extra]');
      const q = extraQueue(20); const aheadIn = ahead.filter(v => q.items.some(x => x.key === v.key)).length;
      const bad = q.items.filter(it => { const r = state.srs[it.key]; return r && (r.due <= t || r.last === t || r.due > addDays(t, 2)); }).length;
      startSession('daily', { extra: true }); const note = SESSION.meta.note; SESSION = null; document.body.classList.remove('practicing');
      // nothing to pull forward and no new quota: the button goes away
      ahead.forEach(v => { state.srs[v.key].last = t; }); Object.assign(state.settings, { newVocabPerDay: 0, newGrammarPerDay: 0 }); saveState(); DAILY_CACHE = null; route();
      const gone = !document.querySelector('[data-act=start-extra]'); const tomorrow = /明天再來/.test(document.querySelector('.hero').textContent);
      const k = JSON.parse(keep); state.srs = k.srs; state.today = k.today; state.settings = k.settings; saveState(); DAILY_CACHE = null;
      return JSON.stringify({ h2, btn: btn ? btn.textContent : null, n: q.items.length, aheadIn, bad, newN: q.newN, aheadN: q.aheadN, note, gone, tomorrow }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['h2'] == '今天完成了' and r['btn'] and r['btn'].startswith('加練・') and r['n'] > 0, r
    assert r['aheadIn'] == 3 and r['aheadN'] == 3 and r['bad'] == 0 and 0 < r['newN'] <= 10, r
    assert '3 題提前複習' in r['note'] and '額外的新內容' in r['note'] and r['gone'] and r['tomorrow'], r
```

- [ ] **Step 2: 跑測試確認失敗** — `extraQueue is not defined`。
- [ ] **Step 3: 實作**（介面如上；首頁分支改寫；`'start-extra': () => startSession('daily', { extra: true })`；`startSession` 內 `const r = opt.extra ? extraQueue(...) : dailyQueue(...)`，extra 時 `meta.note = extraNote(r)`，否則 `meta.note = r.plan.note`）。
- [ ] **Step 4: 跑測試通過**。
- [ ] **Step 5: Commit** `feat: 今日練習做完顯示今天完成了；加練按鈕明確列出提前複習與額外新題`

---

### Task 4: 單元／單字／漢字練習不再補位

**Files:**
- Modify: `index.html` `buildUnitQueue` (~3091)、`buildVocabQueue` (~3102)、`buildKanjiQueue` (~6080)、`startSession` 的 unit/vocab/kanji 分支（`meta.note`）
- Test: `tests/e2e/test_fixes.py` 改 `test_unit_and_vocab_practice_do_not_repeat_todays_correct_answers`

**Interfaces:**
- Produces: 三個函式都回 `items` 陣列但多一個屬性 `items.drill = true`（當 1、2 不足 5 題而用 3 補時），`startSession` 看到 `drill` 就把 `meta.note` 設成 spec §5「這個範圍今天沒有到期的題目，這組是加練，挑最不穩的先練。」。共用新函式 `scopeQueue(pool, fresh, size)`：`due = pool.filter(isDue).sort(byDue)`；`list = due.slice(0,size)` + `fresh.slice(0, size - list.length)`；若 `list.length < 5`，補 `pool.filter(r && r.last !== t && due > t)` 依 `(st||0)`、`b` 升冪，標 `drill`。新題額度：unit 用 `newGrammarPerDay - today.newG`，vocab 用 `newVocabPerDay - today.newV`，kanji 用 `newKanjiPerDay - today.newK`（不再 `Math.min(5, …)` 的額度外新題）。`isDue` 與 Task 2 共用（提到頂層）。

- [ ] **Step 1: 改測試**

`test_unit_and_vocab_practice_do_not_repeat_todays_correct_answers` 改為：m1 全部今天答過 → `buildUnitQueue('m1')` 長度 0 且不 drill；改成昨天答過 → 長度 ≥ 5 且 `.drill === true`；單字主題全部今天答過 → `buildVocabQueue('c:'+theme)` 長度 0；補一段：`state.today.newV = newVocabPerDay` 時 `buildVocabQueue('all', 20)` 不含任何 `!state.srs[key]` 的字（額度外新題不再自動出）。斷言寫成 `assert r == {'unit': 0, 'unitDrill': False, 'unitY': True, 'repeats': 0, 'vq': 0, 'freshOverQuota': 0}` 形式（`unitY` = `len >= 5 and drill`）。

- [ ] **Step 2: 跑測試確認失敗**。
- [ ] **Step 3: 實作**（`scopeQueue` + 三處改寫；刪 `quietDays` 若已無人用）。
- [ ] **Step 4: 跑測試通過**；`grep -c "reinforcementItems\|aheadItems" index.html` 為 0。
- [ ] **Step 5: Commit** `feat: 單元／單字／漢字練習只出到期與剩餘額度，不足時標示為加練`

---

### Task 5: 主題線輪替

**Files:**
- Modify: `index.html` `activeThemes` (~2842)、`newVocabCandidates` (~2849)、`srsAnswer`（新單字 `isNew && key.startsWith('v:')` 時計數）、`normalizeState`（`themeLane` 預設）、`defaultState`
- Test: `tests/e2e/test_fixes.py`

**Interfaces:**
- Produces: `state.themeLane = { order: string[], count: { [theme]: number } }`。`laneOrder()` → 初始化（`order` 為空時複製 `THEME_ORDER`；`THEME_ORDER` 裡有而 `order` 沒有的主題補到最後）並回 `order`。`activeThemes(pool, allowN4)` 改用 `laneOrder()` 取前兩個「還有未出字」的主題。`srsAnswer` 新單字（builtin、`isNew`）時 `count[theme]++`；達 `3 * newVocabPerDay` 時 `count[theme] = 0` 並把該主題移到 `order` 末尾，`DAILY_CACHE = null`。

- [ ] **Step 1: 測試**

```python
def test_theme_lane_rotates_after_three_days_of_words(b):
    js = """(() => { const keep = JSON.stringify({ srs: state.srs, lane: state.themeLane, q: state.settings.newVocabPerDay }); state.settings.newVocabPerDay = 8; state.themeLane = { order: [], count: {} };
      const pool = REG.vocab.filter(v => v.builtin); const th0 = activeThemes(pool, false);
      const big = th0[0]; const words = newVocabCandidates(pool, false).filter(v => vocabTheme(v) === big);
      words.slice(0, 23).forEach(v => srsAnswer(v.key, true)); const th23 = activeThemes(pool, false); const c23 = state.themeLane.count[big];
      srsAnswer(words[23].key, true); const th24 = activeThemes(pool, false);
      const out = { th0, th23, c23, th24, count: state.themeLane.count[big] || 0, last: state.themeLane.order[state.themeLane.order.length - 1], left: words.length - 24 };
      const k = JSON.parse(keep); state.srs = k.srs; state.themeLane = k.lane; state.settings.newVocabPerDay = k.q; saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['left'] > 0 and r['th23'] == r['th0'] and r['c23'] == 23, r      # pick a theme with more than 24 words left: 問候 has 23, so the first lane may already be 指示; the test only needs th0[0] to have > 24
    assert r['th24'][0] != r['th0'][0] and r['count'] == 0 and r['last'] == r['th0'][0], r
```

（實作者注意：`THEME_ORDER` 開頭的問候 23 字、指示 12 字都不到 24；測試前先用 `state.srs` 把 `問候`、`指示`、`代名詞`、`疑問` 標為全出過（`due: '2099-01-01'`），讓 `th0[0]` 是數量 56 的「數量」。把這段 seed 加進測試 js 的開頭。）

- [ ] **Step 2: 跑測試確認失敗**。
- [ ] **Step 3: 實作**（如 Interfaces；`activeThemes` 內仍先算 `lv`，候選主題必須在該 `lv` 還有未出字）。
- [ ] **Step 4: 跑測試通過**，`test_vocab.py` 也要過（`test_new_words_come_from_two_themes_interleaved` 的前段仍成立，因為未達 24 字不輪替）。
- [ ] **Step 5: Commit** `feat: 新單字主題線最多連續三天份就換下一個主題`

---

### Task 6: 錯題快速循環

**Files:**
- Modify: `index.html` `renderMistakes` (~4787，清單上方加卡片)、`route()`（`#/mistakes/loop` → `renderMistakeLoop`）、新增 `let MLOOP = null`、`buildMistakeLoop()`、`renderMistakeLoop(view)`、ACTIONS `'mloop-start'`、`'mloop-flip'`、`'mloop-rate'`、`'mloop-again'`、鍵盤 `mloopKey`（掛在現有 `flashKey` 的同一個 keydown 分派處）、CSS 沿用 `.flash` 樣式類別
- Test: `tests/e2e/test_fixes.py`

**Interfaces:**
- Produces: `buildMistakeLoop(max = 30)` → `string[]`（`activeMistakes().sort(mistakePriority)` 的 `id`）。`MLOOP = { queue, idx, flipped, again: [], rated: {}, date, stats: { ok: 0, ng: 0, left: 0 } }`。`mloopRate(g)`（`g` 為 `'good' | 'again'`）照 spec §3.7 寫入；回傳後 `idx++`；`again` 卡在 `idx === queue.length` 時接到 queue 末尾（`rated[id]` 已有 → 第二次只看不評，按鈕只有「下一張」）。`renderMistakeLoop` 顯示 `第 n / N 張`、正面、看答案鍵；翻面後背面 + 兩鍵（`data-act="mloop-rate" data-g="again|good"`）；結束畫面顯示「這一輪：記得 x・忘了 y」、「今天移出錯題本 z 題」、「再一輪」（`again` 優先）與「回錯題本」。
- 卡片內容函式 `mistakeCardFaces(m)` → `{ front: html, back: html }`，依 spec §3.7 三種情況。

- [ ] **Step 1: 測試**

```python
def test_mistake_loop_grades_once_per_day(b):
    js = """(() => { const t = todayStr(); const m0 = state.mistakes[0]; const u = state.mistakes[3];   // MIST_SEED: m0 linked (count 5), u unlinked
      location.hash = '#/mistakes'; route(); const entry = document.querySelector('[data-act=mloop-start]'); const label = entry ? entry.textContent : null;
      ACTIONS['mloop-start'](); const first = MLOOP.queue[0] === m0.id; const n0 = state.srs[m0.key].n;
      ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'good' } }); const n1 = state.srs[m0.key].n; const last1 = state.srs[m0.key].last;
      // the same card again today: no second SRS write, but the notebook still notes the look
      MLOOP.queue.push(m0.id); MLOOP.idx = MLOOP.queue.length - 1; ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'again' } });
      const n2 = state.srs[m0.key].n; const count = m0.count; const due = daysBetween(t, state.srs[m0.key].due);
      // unlinked: 記得 twice the same day stays active
      MLOOP.queue.push(u.id, u.id); MLOOP.idx = MLOOP.queue.length - 2; ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'good' } }); ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'good' } });
      return JSON.stringify({ label, first, n0, n1, last1: last1 === t, n2, count, due, uActive: !u.mastered, done: /這一輪/.test(document.getElementById('view').textContent) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", MIST_SEED), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['label'] and '快速過一輪' in r['label'] and r['first'], r
    assert r['n0'] == 14 and r['n1'] == 15 and r['last1'] and r['n2'] == 15 and r['count'] == 6 and r['due'] >= 1, r
    assert r['uActive'] and r['done'], r
```

- [ ] **Step 2: 跑測試確認失敗** — `mloop-start` 不存在。
- [ ] **Step 3: 實作**（介面如上；`renderMistakes` 在 `catChips` 之前插入卡片 `快速過一輪・${active.length} 張`，`active.length === 0` 時不顯示；鍵盤：Space 翻／翻面後 `1`=忘了 `2`=記得；`MLOOP.date !== todayStr()` 時重建）。
- [ ] **Step 4: 跑測試通過**，`test_mistakes_page_is_a_compact_list_with_sort_filter_and_grammar_point_groups` 仍過（它數 `.mrow`，新卡片不是 `.mrow`）。
- [ ] **Step 5: Commit** `feat: 錯題本快速循環——翻卡、忘了／記得，一天只有第一次評分寫入排程`

---

### Task 7: 版本、文案、發佈

**Files:**
- Modify: `index.html` `APP_VERSION` (813)、`CHANGELOG` (817)、首頁 hero 說明文字 (~3965 的「答對的題目會隔幾天再出現…」改為「每一題都是今天到期的複習或今天的新內容；答錯會在幾題後再練一次，明天再正式複習。」)、`sw.js` CACHE
- Test: `scripts/test.sh`

- [ ] **Step 1: 改版本與 CHANGELOG**（v63，一則，條列：今日練習只含到期與新題／答錯一律明天、再練一次不計／做完顯示完成與加練／主題線輪替／錯題快速循環／設定頁移除兩列）。
- [ ] **Step 2: `bash scripts/test.sh; echo exit=$?`** — Expected: `exit=0`。
- [ ] **Step 3: Commit** `feat: 今日練習規則重整——只出到期複習與新題額度，做完即完成；錯題本快速循環；主題線輪替 (v63)`
- [ ] **Step 4: `git push -u origin daily-rules && bash scripts/pages-branch.sh daily-rules`**（照 `branch-workflow` 記憶：Pages 指到分支給使用者試用）。
