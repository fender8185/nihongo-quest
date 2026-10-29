# 第 0 週題目：最基本的句型（1.0.16） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第 0 週加 20 題純假名的基本句型（AはBです／ではありません、〜ですか、こそあど、も、は・へ・を 的唸法）。題目在入門階段假名門檻過了以後每天出幾題，算進入門階段測驗，第 0 週頁面可以像其他週一樣練習；講義第 2–4 節跟著改寫。

**Architecture:** 第 0 週是假單元 `m0`：不進 `DATA.UNITS`，但 `unitById('m0')` 回傳 `INTRO_UNIT`、`unitOrder('m0')` 是 −1。講義從 index.html 的 `INTRO_LESSON` 搬到 data.js 的 `DATA.LESSONS.m0`，所以講義卡、`lessonSecKey`、生成清單和 test.sh 的 sec 檢查都不用改。第 0 週頁改走 `renderUnit(view, 'm0', tab)`。入門階段的新文法只來自 m0；第 1 週以後 m0 不參與補位，例外是 `state.introPending`。

**Tech Stack:** 單檔 index.html、data.js（第 3 行一整行 JSON），e2e 測試用 `tests/e2e/cdp.py` 的 headless Chrome。

**Spec:** `docs/superpowers/specs/2026-10-29-week0-questions-design.md`

## Global Constraints

- 分支 `feat/week0-questions`（從 main 的 1.0.15 開出；Pages 推上去後指過來給使用者試）。最後一個 task 才把 `APP_VERSION` 改成 `'1.0.16'`、sw.js 的 `CACHE` 改成 `'nq-v1.0.16'`。
- data.js 從 Task 1 起就會改，所以 Task 1 同時把 `DATA_VERSION 14` 改成 `15`，三處一起改：data.js 檔頭、index.html 的 `<script src="./data.js?v=15">`、sw.js 的 PRECACHE `'./data.js?v=15'`。
- data.js 寫回時用 `json.dumps(D, ensure_ascii=False, separators=(',', ':'))`，放回第 3 行 `const DATA = …;`，其他行不動（已驗證這樣寫回會和原檔逐位元組相同）。
- m0 題目的 id 是 `m0-1` 到 `m0-20`；`u: 'm0'`、`lv: 'N5'`、`sec` 只能是 1、2、3。日文欄位不能有漢字。
- 五個考點名稱照 spec §2.1，一字不改：`AはBです・ではありません`（sec 1）、`〜ですか・はい／いいえ`（sec 1）、`こそあど`（sec 2）、`も（也）`（sec 2）、`は・へ・を 的唸法`（sec 3）。
- 名詞只用單字庫裡現有的片假名外來語：ペン、コーヒー、カメラ、ケーキ、ホテル、トイレ、テレビ、ノート（使用者 2026-10-29 已同意）。
- 文節之間空一個半形空格（只有第 0 週這樣寫）。「ではありません」中間不空格。
- 每個 task 先寫測試、看它失敗，再實作。每個 task 結束時 `bash scripts/test.sh > log; echo $?` 要是 0。cdp.py 啟動時偶爾出現 `tabs` 錯誤，那是已知的測試環境問題，重跑即可。
- commit 結尾照舊加兩行（Co-Authored-By、Claude-Session）。

## Review Focus

1. 已經在第 3 週以後、有文法紀錄的帳號：每日練習、加練、單元補位都不能冒出 m0 的題目（只有 `introPending` 時才會）。→ Task 2 `test_main_accounts_never_get_week0_items_unless_pending`。
2. 1.0.16 之前就在入門、單字和假名都已經看過的帳號：更新後要繼續留在入門，把 m0 學完才自動結束，每天的新文法只從 m0 來。→ Task 3 `test_pre_account_with_words_done_stays_until_week0_is_seen`。
3. 練習中 m0 的第一題要先跳講義卡，卡上的「看完整講義」連到 `#/course/m0?tab=lesson`，那一頁要真的打得開。→ Task 1 `test_week0_page_is_a_unit_page` 和 Task 3 `test_week0_items_follow_lesson_order_with_a_lesson_card_first`。
4. 新句子要能朗讀：20 題的完整句和講義例句都要在生成清單裡（文節間的空格不能讓雜湊對不上）。→ Task 2 `test_week0_items_are_kana_only_and_cover_five_points` 裡的 `inGen` 斷言。
5. 入門測驗通過後，第 0 週句型選「不記得」要能復原：`introPending` 跟其他狀態一起被 `bulkUndo` 還原。→ Task 4 `test_pre_pass_asks_four_choices_then_enters_week_1`。

---

### Task 1: 假單元 m0、講義搬到 data.js、第 0 週頁改用單元頁

**Files:**
- Modify: `data.js`：第 3 行加 `LESSONS.m0`，檔頭改 `DATA_VERSION 15`
- Modify: `index.html`：`UNIT_INDEX` 那一段（約 1453–1456）、`renderCourse` 的 `introRow`（約 5016）、`INTRO_LESSON`（約 5097，刪除）、`renderIntro`（約 5213，刪除）、`renderUnit`（約 5252）、`route()` 的 course 分支（約 4230）、`<script src>`（第 15 行）
- Modify: `sw.js` 第 15 行
- Test: `tests/e2e/test_vocab.py`（改 `test_intro_lesson_renders_with_kana_table_and_marks_itself_seen`）、`tests/e2e/test_pre_n5.py`（新增）

**Interfaces:**
- Produces:
  - `INTRO_UNIT = { id: 'm0', ph: 0, weeks: '第 0 週', lv: 'PRE_N5', short: '基本句型', title: '開始之前：假名、基本句型、品詞名稱', desc: '入門用的講解；第 2–4 節的句型每天會出幾題。' }`
  - `unitById('m0') → INTRO_UNIT`、`unitOrder('m0') → -1`
  - `DATA.LESSONS.m0`：共 13 節，sections[0] 有 `kana: true`；sections[1..3] 是三節句型（sec 1–3）
  - 路由 `#/course/intro` 和 `#/course/m0` 都走 `renderUnit(view, 'm0', tab)`

- [ ] **Step 1: 寫會失敗的測試**

`tests/e2e/test_pre_n5.py` 新增：
```python
def test_week0_is_a_pseudo_unit_m0(b):
    js = """(() => JSON.stringify({ weeks: unitById('m0').weeks, order: unitOrder('m0'), m1: unitOrder('m1'), units: DATA.UNITS.length, total: courseProgress().total,
      secs: DATA.LESSONS.m0.sections.length, kana: DATA.LESSONS.m0.sections[0].kana === true, unknown: unitById('zz').id }))()"""
    r = json.loads(ev(b, js))
    assert r == {'weeks': '第 0 週', 'order': -1, 'm1': 0, 'units': 18, 'total': 18, 'secs': 13, 'kana': True, 'unknown': 'm1'}, r

def test_week0_page_is_a_unit_page(b):
    js = """(() => { const at = (h) => { location.hash = h; route(); const v = document.getElementById('view'); return { start: Boolean(v.querySelector('[data-act="start-unit"][data-unit="m0"]')), setCur: Boolean(v.querySelector('[data-act="set-current"]')),
        tabs: v.querySelectorAll('.seg [data-route^="#/course/m0"]').length, h3: v.querySelectorAll('.lesson h3').length }; };
      state.introSeen = false; const intro = at('#/course/intro'); const seen = state.introSeen; const lesson = at('#/course/m0?tab=lesson');
      location.hash = '#/course'; route(); const row = document.querySelector('.unit-row[data-route="#/course/intro"]');
      return JSON.stringify({ intro, seen, lesson, rowBar: Boolean(row && row.querySelector('.bar.stack')), rowCur: Boolean(row && row.querySelector('.chip-accent')) }); })()"""
    r = json.loads(ev(b, js))
    page = {'start': True, 'setCur': False, 'tabs': 2, 'h3': 13}
    assert r == {'intro': page, 'seen': True, 'lesson': page, 'rowBar': True, 'rowCur': False}, r
```
在 `tests/e2e/test_vocab.py` 的 `test_intro_lesson_renders_with_kana_table_and_marks_itself_seen` 裡，把 `r['h3'] >= 8` 改成 `r['h3'] == 13`，其他照舊。

- [ ] **Step 2: 跑測試，確認失敗**

Run: `python3 -I tests/e2e/test_pre_n5.py test_week0_is_a_pseudo_unit_m0 test_week0_page_is_a_unit_page`
Expected: 兩題都 FAIL（`DATA.LESSONS.m0` 是 undefined，單元頁上沒有 `start-unit[data-unit=m0]`）。

- [ ] **Step 3: 把講義搬到 data.js，照 spec §7 改寫**

寫一支一次性的 Python 腳本，放在 scratchpad：
- 從 index.html 取出 `INTRO_LESSON` 物件（formula、overview、11 節 sections、tip），轉成 JSON。
- 照 spec §7 改寫：
  - 第 1 節「は／へ／を 唸法」那一點，改成「助詞 は・へ・を 的唸法見第 4 節」。
  - 原第 2 節換成 spec §7 的三節：最基本的句型：AはBです、これ・それ・あれ 與 も、助詞的唸法：は・へ・を。rule、points、ex 照 spec §7 原文。例句文節之間空半形空格，名詞不能和 20 題的完整句重複。
  - 原第 3–11 節變成第 5–13 節：標題的編號重排，節內「第 9 節」這類參照改成新節號，最後一節的結尾句照 spec §7 改。
  - 改 `formula`、`overview`、`tip`。
- 寫進 `DATA.LESSONS.m0`。

- [ ] **Step 4: 實作 index.html**

- 刪掉 `INTRO_LESSON` 和 `renderIntro`。
- 加 `INTRO_UNIT`（值照 Interfaces）。`unitById(id)`：id 是 `'m0'` 時回 `INTRO_UNIT`，其餘照舊。`unitOrder(id)`：id 是 `'m0'` 時回 `-1`。
- `route()` 的 course 分支：`parts[1] === 'intro'` 改成 `renderUnit(view, 'm0', r.params.tab || 'lesson')`。
- `renderUnit`：
  - `u = uid === 'm0' ? INTRO_UNIT : DATA.UNITS.find(…)`。
  - m0 時：進頁面設 `state.introSeen = true` 並 saveState；副標用 `${u.weeks}・${lvLabel(u.lv)}`；不出「設為目前單元」和「目前單元」chip；不出「用 AI 為本單元多出 5 題」（這些題目必須是純假名）。
  - 兩個分頁按鈕的 route 照用 `#/course/${uid}`。
- `renderCourse` 的 `introRow`：
  - 右欄改成和其他週一樣：狀態 chip（完成／進行中／空白，不出「目前」）、百分比、`unitBarHtml(unitStats('m0'), 'thin mt-1')`。
  - `unit-desc` 改用 `INTRO_UNIT.desc`，`unit-title` 改用 `INTRO_UNIT.title`。
- `<script src="./data.js?v=15">`，sw.js PRECACHE 的版本也改成 15，data.js 檔頭改成 `DATA_VERSION 15`。

- [ ] **Step 5: 跑測試，確認通過**

Run: `python3 -I tests/e2e/test_pre_n5.py test_week0_is_a_pseudo_unit_m0 test_week0_page_is_a_unit_page && python3 -I tests/e2e/test_vocab.py`
Expected: 兩題都 ok，test_vocab 印出 ALL PASS。再跑 `bash scripts/test.sh > log; echo $?`，結果要是 0。這一步特別要看 `test_fixes.py` 的 `test_phone_pages_do_not_repeat_the_topbar_title_but_keep_distinct_ones` 有沒有過：第 0 週頁的標題現在是單元標題。

- [ ] **Step 6: Commit**

```bash
git add data.js index.html sw.js tests/e2e/test_pre_n5.py tests/e2e/test_vocab.py
git commit -m "feat: 第 0 週成為假單元 m0（講義搬進 data.js、單元頁、課程列進度條）"
```

### Task 2: 20 題資料、檢查腳本、第 1 週以後不補位

**Files:**
- Modify: `data.js`（GRAMMAR 加 20 筆）
- Modify: `scripts/check-grammar.py`
- Modify: `index.html`：`newGrammarCandidates`（約 3376）
- Test: `tests/e2e/test_content.py`、`tests/e2e/test_pre_n5.py`

**Interfaces:**
- Consumes: Task 1 的 `DATA.LESSONS.m0`、`unitById('m0')`、`unitOrder('m0') === -1`
- Produces:
  - `REG.grammar` 裡有 20 筆 `u === 'm0'` 的題目，每筆都有 `zh` 和 `why`（meaning 題的 `zh` 就是正解的中文）
  - `newGrammarCandidates()` 在沒帶參數時，`earlier` 會排除 `g.u === 'm0'`

- [ ] **Step 1: 寫會失敗的測試**

`tests/e2e/test_content.py`：
```python
WEEK0_PTS = {'AはBです・ではありません': 1, '〜ですか・はい／いいえ': 1, 'こそあど': 2, 'も（也）': 2, 'は・へ・を 的唸法': 3}

def test_week0_items_are_kana_only_and_cover_five_points(b):
    js = """(() => { const G = REG.grammar.filter(g => g.u === 'm0'); const ja = (g) => [g.jp, g.a].concat(g.t === 'meaning' ? [] : g.op).filter(Boolean).join(' ');
      const words = new Set(REG.vocab.map(v => v.w)); const gen = new Set(cloudAudioTexts().map(x => x.text)); const full = (g) => g.t === 'choice' ? g.jp.replace(/（[^）]*）/, g.a) : g.t === 'correct' ? g.a : g.jp;
      return JSON.stringify({ n: G.length, pts: G.reduce((m, g) => (m[g.pt] = (m[g.pt] || 0) + 1, m), {}), secs: G.map(g => [g.pt, g.sec]),
        kanji: G.filter(g => /[一-龯々]/.test(ja(g))).map(g => g.id), kata: [...new Set(G.flatMap(g => ja(g).match(/[ァ-ヶー]{2,}/g) || []))].filter(w => !words.has(w)),
        dupFull: G.length - new Set(G.map(full)).size, built: G.filter(g => { const q = makeQuestion(g, {}); return q && q.options.length === 4; }).length,
        fmts: G.filter(g => g.t === 'choice').every(g => ['g-choice', 'g-correct', 'g-meaning'].every(f => makeGrammarQuestion(g, { forceFmt: f }))),
        inGen: G.filter(g => !gen.has(ttsText(full(g)))).map(g => g.id) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 20 and r['pts'] == {k: 4 for k in WEEK0_PTS}, r
    assert all(sec == WEEK0_PTS[pt] for pt, sec in r['secs']), r
    assert r['kanji'] == [] and r['kata'] == [] and r['dupFull'] == 0, r
    assert r['built'] == 20 and r['fmts'] and r['inGen'] == [], r
```
`tests/e2e/test_pre_n5.py`：
```python
def test_main_accounts_never_get_week0_items_unless_pending(b):
    js = """(() => { const t = todayStr(); state.stage = 'main'; state.currentUnit = 'm3'; state.srs = {}; const g3 = REG.grammar.find(x => x.u === 'm3'); state.srs[g3.key] = { b: 2, due: addDays(t, 3), n: 1, ok: 1, ng: 0, s: 3, d: 5, last: t }; DAILY_CACHE = null;
      const out = { cand: newGrammarCandidates().filter(g => g.u === 'm0').length, plan: dailyPlan().newG.filter(g => g.u === 'm0').length, extra: extraQueue(20).items.filter(x => x.u === 'm0').length,
        unit: buildUnitQueue('m0').filter(x => x.u === 'm0').length };
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['cand'] == 0 and r['plan'] == 0 and r['extra'] == 0 and r['unit'] > 0, r
```
（`introPending` 的情況放在 Task 4 測，因為那個欄位在 Task 4 才出現。）

- [ ] **Step 2: 跑測試，確認失敗**

Run: `python3 -I tests/e2e/test_content.py test_week0_items_are_kana_only_and_cover_five_points; python3 -I tests/e2e/test_pre_n5.py test_main_accounts_never_get_week0_items_unless_pending`
Expected: 兩題都 FAIL，原因是 `n == 0` 和 `unit == 0`。

- [ ] **Step 3: 讓 check-grammar.py 支援 m0**

- 單元查找：`const u = x.u === 'm0' ? unitById('m0') : DATA.UNITS.find(…)`。
- `x.u === 'm0'` 時：
  - pt 必須是五個考點之一，而且 sec 要對應（對照表照 Global Constraints），不套用「pt 必須是本節已有題目用過的」那條規則。
  - 日文欄位有漢字就 `P('week 0 is kana only')`。
  - 連續兩個以上的片假名（含ー）不在 `DATA.VOCAB` 的 `w` 裡，就 `P('loanword not in the word bank: …')`。

- [ ] **Step 4: 寫 20 題，檢查後放進 data.js**

- 照 spec §2.3 第 1–20 題寫成 JSON 陣列，放在 scratchpad，欄位照 check-grammar.py 的說明。
- `d` 的規則：填空、選正確句給 1，句意給 2。
- `why` 用中文寫清楚規則：はい 的 は 唸 ha、助詞 は 唸 wa 這類。
- 跑 `python3 scripts/check-grammar.py <file>.json`，要 0 problems 才能寫進 data.js 的 `GRAMMAR`，接在 m1 的題目前面。

- [ ] **Step 5: `newGrammarCandidates` 排除 m0**

`earlier` 的 filter 加一個條件 `g.u !== 'm0'`，並在旁邊加註解：「第 0 週只在入門或 introPending 時出新題」。

- [ ] **Step 6: 跑測試，確認通過**

Run: Step 2 的兩條指令。接著跑 `bash scripts/test.sh > log; echo $?`，結果要是 0。

- [ ] **Step 7: Commit**

```bash
git add data.js scripts/check-grammar.py index.html tests/e2e/test_content.py tests/e2e/test_pre_n5.py
git commit -m "feat: 第 0 週 20 題基本句型（純假名），第 1 週以後不補位"
```

### Task 3: 入門階段排進第 0 週的題目

**Files:**
- Modify: `index.html`，改 `dailyPlan`、`extraQueue`、`preDone`、`finishPreIfReady`、今日頁入門那一行（約 4607）
- Test: `tests/e2e/test_pre_n5.py`

**Interfaces:**
- Consumes: Task 2 的 m0 題目，以及現有的 `unitNewOrder(uid)`、`kanaGateOpen()`
- Produces:
  - `introLeft() → number`：m0 裡還沒有 SRS 紀錄的題數
  - `preDone()` 多一個條件 `introLeft() === 0`
  - `finishPreIfReady()` 進第 1 週時，把 `'m0'` 加進 `completedUnits`

- [ ] **Step 1: 寫會失敗的測試**

改 `test_pre_stage_plan_has_only_kana_until_the_seion_gate_opens`：
- 門檻前的斷言照舊（`g == 0`）。
- 門檻後多收：
  - `out.g2 = p2.newG.map(x => x.u)`
  - `out.q = newQuota('g')`
  - `kinds` 允許 `'g'`

```python
    assert r['g2'] and set(r['g2']) == {'m0'} and len(r['g2']) == min(r['q'], 20), r
    assert set(r['kinds']) <= {'a', 'v', 'k', 'g'}, r
```
新增：
```python
def test_week0_items_follow_lesson_order_with_a_lesson_card_first(b):
    js = """(() => { REG.kana.filter(x => x.seion).forEach(x => { state.srs[x.key] = { b: 1, due: addDays(todayStr(), 5), n: 1, ok: 1, ng: 0, s: 2, d: 5, last: addDays(todayStr(), -1) }; }); DAILY_CACHE = null;
      const first = dailyPlan().newG; startSession('unit', { unit: 'm0' }); const e = SESSION.entries.find(x => x.preview);   // the lesson card comes in daily and unit sessions only
      return JSON.stringify({ secs: first.map(g => g.sec), pts: new Set(first.filter(g => g.sec === 1).map(g => g.pt)).size, card: Boolean(e) && lessonSecKey(e.item) === 'm0:1', link: Boolean(e) && grammarPreviewHtml(e, 0).includes('#/course/m0?tab=lesson') }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['secs'] == sorted(r['secs']) and r['secs'][0] == 1 and r['pts'] == 2 and r['card'] and r['link'], r

def test_pre_account_with_words_done_stays_until_week0_is_seen(b):
    js = """(() => { const t = todayStr(); const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5').forEach(mark); REG.kana.filter(x => x.seion).forEach(mark); state.recent = Array(40).fill(1);
      const today = () => { DAILY_CACHE = null; location.hash = '#/today'; route(); return document.getElementById('view').textContent; };
      const out = { left: introLeft(), done: preDone() }; const txt = today(); out.stage1 = state.stage; const g1 = dailyPlan().newG; out.newG = g1.length > 0 && g1.every(g => g.u === 'm0'); out.line = txt.includes('句型 0／20');
      REG.grammar.filter(g => g.u === 'm0').forEach(mark); today(); out.stage2 = state.stage; out.m0Done = state.completedUnits.includes('m0');
      state.stage = 'pre'; state.srs = {}; REG.kana.filter(x => x.seion).forEach(mark); REG.grammar.filter(g => g.u === 'm0').forEach(mark);
      state.recent = Array(34).fill(1).concat(Array(6).fill(0)); DAILY_CACHE = null;   // 85%: factor 1, so 8 new words at the default load cap
      out.newV = dailyPlan().newV.length;   // week 0 all seen: its unused grammar quota must not become 6 extra words
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r == {'left': 20, 'done': False, 'stage1': 'pre', 'newG': True, 'line': True, 'stage2': 'main', 'm0Done': True, 'newV': 8}, r
```
1.0.15 的兩個測試也要改：`test_pre_stage_ends_by_itself_once_everything_is_seen_and_accuracy_holds` 和 `test_pre_stage_end_keeps_the_unit_of_a_learner_with_grammar_records`。它們的「全部看過」都要把 m0 的題目一起標記，第一題寫成 `words.concat(REG.grammar.filter(g => g.u === 'm0')).forEach(mark)`，第二題寫在 `finish()` 裡。

- [ ] **Step 2: 跑測試，確認失敗**

Run: `python3 -I tests/e2e/test_pre_n5.py test_pre_stage_plan_has_only_kana_until_the_seion_gate_opens test_week0_items_follow_lesson_order_with_a_lesson_card_first test_pre_account_with_words_done_stays_until_week0_is_seen`
Expected: 三題都 FAIL。前兩題是因為入門的 `newG` 是空的，第三題是因為 `introLeft is not defined`。

- [ ] **Step 3: 實作**

- `introLeft()`：放在 `preWordsLeft` 旁邊。
- `preDone()` 加條件 `&& introLeft() === 0`。
- `finishPreIfReady()` 進第 1 週時加 'm0' 到 `completedUnits`。
- `dailyPlan`：
  - `maxG` 在入門而且門檻還沒開時才是 0。
  - 入門的 `newG` 取 `kanaGateOpen() ? unitNewOrder('m0') : []`，再 `.slice(0, wantG)`。
  - `newV` 的額外額度 `Math.max(0, wantG - newG.length)` 在入門改成 0。
- `extraQueue`：入門而且門檻開了的時候，`gs` 也取 `unitNewOrder('m0')`。門檻前照舊不出文法，原本「extra practice has no grammar」的測試還是成立。
- 今日頁入門那一行，在單字後面加 `・句型 ${看過}／${總數}`，總數是 `unitItems('m0').length`。
- 註解：`dailyPlan` 那句「入門: no new grammar…」改寫成「入門：新文法只有第 0 週的句型，假名門檻開了才出；用不完的額度不轉給單字」。

- [ ] **Step 4: 跑測試，確認通過**

Run: Step 2 的指令，再加上 1.0.15 的兩題。三題加兩題全部 ok 之後，跑 `bash scripts/test.sh > log; echo $?`，結果要是 0。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_pre_n5.py
git commit -m "feat: 入門階段假名門檻後每天出第 0 週句型，全部出過才自動進第 1 週"
```

### Task 4: 入門測驗加句型、通過後的第四題、introPending

**Files:**
- Modify: `index.html`，改這些地方：
  - `STAGES` 入門那一項的 `units`
  - `STAGE_TEST_QUOTA`
  - `PRE_MARK_GROUPS`、`preMarkStepHtml`、`preMarkApply`
  - `bulkSnapshot`、`bulkUndo`
  - `newGrammarCandidates`
  - `normalizeState`
- Test: `tests/e2e/test_stage_tests.py`、`tests/e2e/test_pre_n5.py`

**Interfaces:**
- Consumes: Task 2 的 m0 題目，Task 3 的 `introLeft()`
- Produces:
  - `state.introPending: boolean`（`normalizeState` 會把它轉成 boolean，預設 false）
  - `STAGES[0].units = ['m0']`
  - `STAGE_TEST_QUOTA.pre = [['a', 14], ['v', 18], ['g', 8]]`

- [ ] **Step 1: 寫會失敗的測試**

`tests/e2e/test_stage_tests.py` 要改的地方：
- `test_stages_partition_every_item`：`r['units'] == [1, 6, 6, 6]`
- `test_stage_test_builds_on_an_empty_account`：`r['pre']['kinds'] == {'a': 14, 'v': 18, 'g': 8}`
- `test_bulk_mark_levels_and_side_effects`：`L['units'] == ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']`
- `test_bulk_mark_to_p3_finishes_the_course_and_undo_restores`：`r['after']['units'] == 19`，`pct` 仍然是 100
- `test_pre_pass_asks_three_choices_then_enters_week_1` 改名為 `test_pre_pass_asks_four_choices_then_enters_week_1`：
  - 題號的 regex 改成 `第 (\d)／4 題`
  - 第三次點 `seen` 之後多一步 `out.s4 = step()`，第四題點 `none`
  - 斷言 `r['s4']['q'] == '4'`、`r['pending'] is True`（新增 `out.pending = state.introPending`）
  - label 改成 `'平假名：掌握、片假名：不記得、入門單字：記得、第 0 週句型：不記得'`
  - 復原後 `state.introPending === false`，收成 `out.pendingAfterUndo`

新增：
```python
def test_pre_pass_marking_week0_learned_completes_it(b):
    js = "(() => { " + PRE_PASS + """ preMarkApply({ hira: 'none', kata: 'none', v: 'none', g: 'learned' }); const G = REG.grammar.filter(g => g.u === 'm0');
      return JSON.stringify({ all: G.every(g => state.srs[g.key] && state.srs[g.key].b >= SRS_LEARNED), done: state.completedUnits.includes('m0'), pending: state.introPending,
        lessons: (state.lessonSeen || []).filter(k => k.startsWith('m0:')).length }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'all': True, 'done': True, 'pending': False, 'lessons': 3}, r
```
`tests/e2e/test_pre_n5.py` 新增：
```python
def test_week0_pending_puts_its_items_before_the_current_unit(b):
    js = """(() => { state.stage = 'main'; state.currentUnit = 'm1'; state.srs = {}; state.introPending = true; const c = newGrammarCandidates().slice(0, 3).map(g => g.u);
      const norm = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { introPending: 'yes' })).introPending;
      state.introPending = false; return JSON.stringify({ c, after: newGrammarCandidates()[0].u, norm }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'c': ['m0', 'm0', 'm0'], 'after': 'm1', 'norm': True}, r
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `python3 -I tests/e2e/test_stage_tests.py; python3 -I tests/e2e/test_pre_n5.py test_week0_pending_puts_its_items_before_the_current_unit`
Expected: 上面列出的 stage 測試都 FAIL（units 是 `[0, 6, 6, 6]`，配額還是 a16 v24），pending 那題也 FAIL。

- [ ] **Step 3: 實作**

- 階段與測驗：
  - `STAGES` 入門那一項的 `units: ['m0']`，副標暫不改（Task 5 才改）。
  - `STAGE_TEST_QUOTA.pre` 改成 Interfaces 寫的值。
- 通過後的第四題：
  - `PRE_MARK_GROUPS` 加 `['g', '第 0 週句型', () => REG.grammar.filter(g => g.u === 'm0')]`。
  - `preMarkStepHtml` 的「／3 題」改成 `／${PRE_MARK_GROUPS.length} 題`。
- `preMarkApply` 對 `g` 這組：
  - 選 `none` 就設 `state.introPending = true`。
  - 選其他等級就 bulkApply，再把 'm0' 加進 `completedUnits`，把 m0 每一節的 `lessonSecKey` 加進 `lessonSeen`，並設 `state.introPending = false`。
- 復原：`bulkSnapshot` 多存 `introPending`，`bulkUndo` 多還原 `introPending`。
- 排程與狀態：
  - `newGrammarCandidates()` 沒帶參數時，`state.introPending` 為真就把 `unitNewOrder('m0')` 放在最前面。
  - `normalizeState` 加 `out.introPending = Boolean(out.introPending)`，舊帳號沒有這個欄位時會是 false。

- [ ] **Step 4: 跑測試，確認通過**

Run: Step 2 的指令。接著跑 `bash scripts/test.sh > log; echo $?`，結果要是 0。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stage_tests.py tests/e2e/test_pre_n5.py
git commit -m "feat: 入門測驗含 8 題句型，通過後第四題「第 0 週句型」，不記得就先學句型"
```

### Task 5: 學習分析、文案、版本紀錄，發 1.0.16

**Files:**
- Modify: `index.html`，改這些地方：
  - `progressTotals`（約 7697）
  - `STAGES` 入門的副標
  - 今日頁兩個新使用者橫幅
  - `APP_VERSION`、`CHANGELOG`
- Modify: `sw.js`（`CACHE`）
- Test: `tests/e2e/test_pre_n5.py`

**Interfaces:**
- Consumes: 前面四個 task 的全部成果

- [ ] **Step 1: 寫會失敗的測試**

```python
def test_week0_items_count_as_n5_grammar_in_the_stats(b):
    js = """(() => { const t = progressTotals('g'); const n5 = REG.grammar.filter(g => g.u === 'm0' || DATA.UNITS.some(u => u.id === g.u && u.lv === 'N5')).length; return JSON.stringify({ n5: t.n5, want: n5 }); })()"""
    r = json.loads(ev(b, js))
    assert r['n5'] == r['want'], r
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `python3 -I tests/e2e/test_pre_n5.py test_week0_items_count_as_n5_grammar_in_the_stats`
Expected: FAIL，`n5` 會比預期少 20。

- [ ] **Step 3: 實作**

- `progressTotals` 的 `n5Units` 加上 `'m0'`。
- `STAGES` 入門副標改成：`'假名、入門單字與第 0 週的句型；都看過、正確率到 80% 就自動進第 1 週'`。
- 今日頁新使用者橫幅裡的「句子骨架」改成「最基本的句型」。
- `APP_VERSION = '1.0.16'`，sw.js 改 `CACHE = 'nq-v1.0.16'`。
- `CHANGELOG` 最前面加一組 `{ v: '1.0.16', date: '2026-10-29', items: [...] }`，四點照 spec §10。
- 1.0.0 現況裡兩句要更新：
  - 「入門（PRE_N5）…」那句，加上「假名門檻過了以後每天幾題第 0 週句型」。
  - 「課程…第 0 週：開始之前」那句，改成「第 0 週有 20 題基本句型」。

- [ ] **Step 4: 驗證**

- Run: `python3 -I tests/e2e/test_pre_n5.py test_week0_items_count_as_n5_grammar_in_the_stats`，Expected: ok。
- Run: `bash scripts/test.sh > log; echo $?`，Expected: `0`，最後一行是 `ALL_OK`。
- 用 390×844 的手機畫面截圖看兩頁：
  - 第 0 週頁：有練習按鈕、兩個分頁、13 節講義。
  - 課程頁：第 0 週那一列有進度條。

- [ ] **Step 5: Commit 並 push**

```bash
git add index.html sw.js tests/e2e/test_pre_n5.py
git commit -m "release: 1.0.16 第 0 週 20 題基本句型（入門每天幾題、入門測驗含句型、第四題標記），講義第 2–4 節改寫"
git push
```
Pages 已經指向這個分支，所以 push 完就會重新建置。用 `curl -s https://fender8185.github.io/nihongo-quest/sw.js | grep -o "nq-v[0-9.]*"` 確認線上已經是 `nq-v1.0.16`。最後提醒使用者：新句子要再跑一次「管理者：生成雲端音檔」。
