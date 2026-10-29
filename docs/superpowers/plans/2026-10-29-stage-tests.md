# 四個階段、階段測驗與批次標記（1.0.11） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 課程頁變成四張對等的階段卡（入門、第一、二、三階段），第 0 週搬進入門卡，整頁只有一個「目前」；每個階段有一份 40 題不計時、不影響排程的階段測驗；通過後可把該階段與之前所有階段的內容批次標成 已學／熟悉／熟練。

**Architecture:** 階段是 index.html 裡從 `DATA.PHASES` 推出的常數 `STAGES`，項目歸屬用 `stageItems(id)` 現算（文法與變化練習照單元，單字／漢字／聽力／閱讀照等級，入門加假名）。測驗跑在現有練習 runner：`startSession('stage', …)` 設 `SESSION.test`，`answerCurrent` 開頭一個分支只計分；題目用 `makeQuestion(item, { choiceOnly: true })`。批次標記 `bulkMark(stageId, level)` 直接寫 `state.srs`，到期日分散；復原用課程頁上的「復原」按鈕（和單字頁 `LAST_BULK_KNOWN` 同一個做法，spec 說的 toast 復原改成這樣，因為 `toast()` 只放文字）。

**Tech Stack:** 同前（單檔 index.html、無框架；e2e 測試用 `tests/e2e/cdp.py` 的 headless Chrome）。

**Spec:** `docs/superpowers/specs/2026-10-29-stage-tests-design.md`

## Global Constraints

- 分支 `feat/pre-n5`；push 前 `APP_VERSION = '1.0.11'`、sw.js `CACHE = 'nq-v1.0.11'`；data.js 不動。CHANGELOG 第一組 `v: '1.0.11'`。
- 測試新檔 `tests/e2e/test_stage_tests.py`，`PORT = 8790`（8791–8799 已被用），並加進 `scripts/test.sh` 的兩個檔案清單；先紅後綠；最後 `bash scripts/test.sh` 直接看 exit code 為 0。
- 測驗固定 40 題、通過門檻 `Math.ceil(total * 0.8)`（40 題即 32）；配額照 spec §4.1。
- 到期分散區間（天）：seen 1–14、learned 5–14、known 35–56。
- 介面文字：「階段測驗」「標記到這裡為止」「已學／熟悉／熟練」；等級名用 `lvLabel()`。
- 既有 data-act 不改名；新 data-act：`stage-test`、`stage-mark`、`stage-again`、`stage-practice`、`bulk-mark-go`、`bulk-mark-undo`；新 data-change：`bulk-level`。
- commit 結尾兩行同前（Co-Authored-By、Claude-Session）。

## Review Focus

1. 全新帳號（`state.srs = {}`）也要組得出四份完整的卷：沒學過的項目也會被抽到，題目產生器不能因為沒有紀錄而回 null。→ Task 3 `test_stage_test_builds_on_an_empty_account`。
2. 設定 `conjInput: 'type'` 或某題只有排序格式時，測驗裡不能出現磁貼／鍵盤／排序題。→ Task 3 `test_stage_test_questions_are_all_choice`（含 `g.t === 'order'` 排除與 conjInput 設 type）。
3. 中途離開測驗不能留下任何紀錄（`stageTests`、`dailyLogs` 的 x、`srs`）。→ Task 3 `test_leaving_a_stage_test_leaves_no_trace`。
4. 批次標記不能降級、不能碰自訂字卡與隱藏項目，且同一天到期的數量不能爆：已學 1,000 個項目攤 14 天，單日最多約 72。→ Task 4 `test_bulk_mark_never_downgrades_and_spreads_due`。
5. 從雲端同步下來的舊 state 沒有 `stageTests` 欄位時課程頁不能壞。→ Task 2 `test_course_page_survives_missing_stage_tests`。

---

### Task 1: 階段模型

**Files:**
- Modify: `index.html`（在 `// ---- 72_course.js ----`（~4631）之前新增區塊 `// ---- 階段（四個）與階段項目 ----`）
- Modify: `scripts/test.sh`（兩個清單各加 `tests/e2e/test_stage_tests.py`）
- Test: `tests/e2e/test_stage_tests.py`（新檔，開頭照 `test_pre_n5.py`：`PORT = 8790`、`ev()`、`READY`）

**Interfaces:**
- Produces: `const STAGES = [{ id: 'pre', title: '入門', sub: '假名與入門單字，不算週數，單字都看過就進第 1 週', units: [], lv: 'PRE_N5' }, { id: 'p1', title, sub: ph.span, units: ['m1',…,'m6'], lv: 'N5' }, { id: 'p2', …m7–m12, lv: null }, { id: 'p3', …m13–m18, lv: 'N4' }]`。`title`／`sub` 取 `DATA.PHASES[i].title`／`.span`；`units` = `DATA.UNITS.filter(u => u.ph === ph.id).map(u => u.id)`。
- Produces: `function stageById(id) -> stage|undefined`、`function stageIndex(id) -> 0..3`、`function stagesUpTo(id) -> STAGES.slice(0, stageIndex(id) + 1)`。
- Produces: `function stageItems(id) -> item[]`：`REG.grammar`／`REG.drills` 中 `units.includes(x.u)` 的；`lv` 非空時加 `REG.vocab`（`builtin && v.lv === lv`）、`REG.kanji`、`REG.listen`、`REG.read` 中 `x.lv === lv` 的；`pre` 加全部 `REG.kana`。（REG 已排除隱藏項目。）
- Produces: `function stageOfUnit(uid) -> stageId`（找不到回 `'p1'`）、`function currentStageId() -> stageId`（`inPreStage()` 回 `'pre'`，否則 `stageOfUnit(state.currentUnit)`）。
- Produces: `function nextUnitAfterStage(id) -> unitId`：下一階段第一個單元；`p3` 回 `'m18'`；`pre` 回 `'m1'`。

- [ ] **Step 1: 建立測試檔與 test.sh 清單，寫失敗測試**

```python
def test_stages_partition_every_item(b):
    js = """(() => { const S = STAGES.map(s => stageItems(s.id)); const keys = S.map(l => l.map(x => x.key));
      const all = new Set(keys.flat()); const dup = keys.flat().length - all.size;
      const expect = REG.kana.length + REG.vocab.filter(v => v.builtin).length + REG.grammar.length + REG.kanji.length + REG.listen.length + REG.read.length + REG.drills.length;
      return JSON.stringify({ ids: STAGES.map(s => s.id), units: STAGES.map(s => s.units.length), dup, total: all.size, expect,
        p2v: S[2].filter(x => x.kind === 'v').length, n4In: S.map(l => l.filter(x => x.kind === 'v' && x.lv === 'N4').length),
        kana: S[0].filter(x => x.kind === 'a').length, next: STAGES.map(s => nextUnitAfterStage(s.id)), of: [stageOfUnit('m7'), stageOfUnit('m18')] }); })()"""
    r = json.loads(ev(b, js))
    assert r['ids'] == ['pre', 'p1', 'p2', 'p3'] and r['units'] == [0, 6, 6, 6], r
    assert r['dup'] == 0 and r['total'] == r['expect'], r
    assert r['p2v'] == 0 and r['n4In'][:3] == [0, 0, 0] and r['n4In'][3] > 0 and r['kana'] == 142, r
    assert r['next'] == ['m1', 'm7', 'm13', 'm18'] and r['of'] == ['p2', 'p3'], r

def test_current_stage_follows_stage_and_unit(b):
    js = """(() => { const keep = [state.stage, state.currentUnit]; const out = [];
      state.stage = 'pre'; out.push(currentStageId()); state.stage = 'main'; state.currentUnit = 'm1'; out.push(currentStageId()); state.currentUnit = 'm13'; out.push(currentStageId());
      [state.stage, state.currentUnit] = keep; return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == ['pre', 'p1', 'p3']
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: FAIL，`STAGES is not defined`

- [ ] **Step 3: 實作 `STAGES` 與六個函式**（Interfaces 的簽名；`STAGES` 必須在 `DATA` 載入後、`renderCourse` 之前定義）

- [ ] **Step 4: 跑測試確認通過**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 兩個測試 ok

- [ ] **Step 5: Commit**

```bash
git add index.html scripts/test.sh tests/e2e/test_stage_tests.py
git commit -m "feat: 四個階段的模型（STAGES、stageItems、currentStageId）"
```

---

### Task 2: 課程頁四張卡、單一「目前」、`state.stageTests`

**Files:**
- Modify: `index.html`：`defaultState()`（~1120）加 `stageTests: {}`；`normalizeState`（~1174 附近）補 `if (!out.stageTests || typeof out.stageTests !== 'object') out.stageTests = {}`；`renderCourse`（4634–4677）重寫卡片。
- Test: `tests/e2e/test_stage_tests.py`

**Interfaces:**
- Consumes: Task 1 的 `STAGES`、`currentStageId()`。
- Produces: `state.stageTests: { [stageId]: Array<{ date, correct, total, passed }> }`（最新在前，最多 10 筆）。
- Produces: `function stagePassed(id) -> boolean`（`(state.stageTests[id] || []).some(h => h.passed)`）。
- Produces: `function stageFootHtml(id) -> string`：`<div class="row-wrap mt-3 stage-foot">` 內含 `<button data-act="stage-test" data-stage="${id}">階段測驗</button>`、最近一筆結果 chip（`chip-ok`「上次 34／40・通過」或 chip「上次 20／40・未通過」，沒紀錄不出）、`stagePassed(id)` 時 `<button data-act="stage-mark" data-stage="${id}">標記到這裡為止</button>`。Task 3／4 接 data-act。
- 課程頁結構：四張 `.card`，每張 `card-head`（title 用 `STAGES[i].title`，入門卡 title 後加 `<span class="chip">PRE_N5</span>`，sub 用 `STAGES[i].sub`）＋ `.list`（入門：`introRow` ＋ 三條 `line()`；其他：該階段的 `unit-row`）＋ `stageFootHtml`。入門卡的按鈕列（練假名、我已認得假名、進入第 1 週／回到入門）併進 `stage-foot` 同一列的前面。
- 「目前」規則：`inPreStage()` 時只有入門卡 title 的 `<span class="chip chip-accent">目前</span>` 且入門卡加 `current` class；否則只有 `u.id === state.currentUnit` 的 `unit-row` 有 chip 與 `.current`。階段卡 `card-head` 永遠不放 chip。
- 頁首副標：「四個階段：入門與 18 個單元（每單元約兩週）。整體完成度 ${cp.pct}%」。

- [ ] **Step 1: 寫失敗測試**

```python
COURSE = [("nav", URL + "#/course"), ("wait", "document.querySelectorAll('#view .card').length >= 4")]

def test_course_has_one_current_chip_and_week0_in_pre_card(b):
    js = """(() => { const cards = [...document.querySelectorAll('#view .card')].slice(0, 4);
      const chips = [...document.querySelectorAll('#view .chip-accent')].filter(c => c.textContent.trim() === '目前');
      return JSON.stringify({ n: cards.length, titles: cards.map(c => c.querySelector('.card-title').textContent.trim().slice(0, 2)),
        week0In: cards.map(c => c.textContent.includes('第 0 週')), chips: chips.length, chipIn: chips.map(c => Boolean(c.closest('.unit-row')) ? 'row' : 'head'),
        tests: document.querySelectorAll('[data-act="stage-test"]').length, marks: document.querySelectorAll('[data-act="stage-mark"]').length }); })()"""
    r = json.loads(ev(b, js, [("eval", "state.stage = 'main'; state.currentUnit = 'm2'; state.stageTests = {}; saveState(); true")] + COURSE))
    assert r['n'] == 4 and r['titles'] == ['入門', '第一', '第二', '第三'], r
    assert r['week0In'] == [True, False, False, False] and r['chips'] == 1 and r['chipIn'] == ['row'], r
    assert r['tests'] == 4 and r['marks'] == 0, r
    r = json.loads(ev(b, js, [("eval", "state.stage = 'pre'; saveState(); true")] + COURSE))
    assert r['chips'] == 1 and r['chipIn'] == ['head'], r

def test_course_shows_last_result_and_mark_button_after_a_pass(b):
    pre = [("eval", "state.stage = 'main'; state.stageTests = { p1: [{ date: todayStr(), correct: 34, total: 40, passed: true }], p2: [{ date: todayStr(), correct: 10, total: 40, passed: false }] }; saveState(); true")] + COURSE
    js = """(() => { const foot = [...document.querySelectorAll('.stage-foot')]; return JSON.stringify({ txt: foot.map(f => f.textContent.replace(/\\s+/g, ' ').trim()),
      marks: foot.map(f => f.querySelectorAll('[data-act="stage-mark"]').length), passed: [stagePassed('p1'), stagePassed('p2'), stagePassed('p3')] }); })()"""
    r = json.loads(ev(b, js, pre))
    assert '上次 34／40・通過' in r['txt'][1] and '上次 10／40・未通過' in r['txt'][2], r
    assert r['marks'] == [0, 1, 0, 0] and r['passed'] == [True, False, False], r

def test_course_page_survives_missing_stage_tests(b):
    js = "(() => { delete state.stageTests; renderCourse(document.getElementById('view')); return document.querySelectorAll('[data-act=\"stage-test\"]').length; })()"
    assert ev(b, js) == '4'
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 新的三個 FAIL（卡數不是 4／`stagePassed` 未定義）

- [ ] **Step 3: 實作**：`defaultState`／normalize 的 `stageTests`；`stagePassed`、`stageFootHtml`；重寫 `renderCourse` 成四張卡（`DATA.PHASES.map` 改成 `STAGES.map`，`introRow` 只進入門卡，第一階段不再 `pi === 0 ? introRow : ''`）；`stagePassed` 內用 `(state.stageTests || {})` 以防舊 state。頁首副標與 CHANGELOG 第 975 行句尾加「（1.0.11 起第 0 週在入門卡裡）」。

- [ ] **Step 4: 跑測試確認通過；手動開 `#/course` 看四張卡在手機寬度不破版**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 全部 ok

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stage_tests.py
git commit -m "feat: 課程頁四張階段卡、第 0 週移入入門、單一「目前」、stageTests 欄位"
```

---

### Task 3: 階段測驗

**Files:**
- Modify: `index.html`：`makeQuestion`（2910）、`conjInputMode`（2132）、`vocabFormats` 權重（2412–2413）、`startSession`（3538：新 mode `'stage'`、`MODE_TITLE`）、`prepareEntry`（3590）、`answerCurrent`（3899）、回饋列的 我會了／手滑（3878、3894）、`renderSummary`（3976）、ACTIONS（`stage-test`、`stage-again`、`stage-practice`）。
- Test: `tests/e2e/test_stage_tests.py`

**Interfaces:**
- Consumes: Task 1 `stageItems`、`stageById`；Task 2 `state.stageTests`、`stageFootHtml` 的 `data-act="stage-test"`。
- Produces: `const STAGE_TEST_QUOTA = { pre: [['a', 12], ['v', 24], ['k', 4]], p1: [['g', 20], ['v', 10], ['k', 4], ['l', 3], ['r', 3]], p2: [['g', 32], ['c', 8]], p3: [['g', 20], ['v', 10], ['k', 4], ['l', 3], ['r', 3]] }`。
- Produces: `function buildStageTest(id) -> item[]`：每類從 `stageItems(id)` 隨機抽配額；文法類先排除 `g.t === 'order'`，再平均分到 `units`（每單元 `floor(n/6)`，餘數隨機分給不同單元，單元不夠補其他單元）；某類不足的缺額照配額表順序由其他類補；結果 `shuffle`，長度 ≤ 40、無重複 key。
- Produces: `function stageTestNeed(total) -> number`（`Math.ceil(total * 0.8)`）。
- Produces: `makeQuestion(item, ctx)` 支援 `ctx.choiceOnly: true`：回傳的 q 沒有 `custom`，否則 null。做法：`conjInputMode(rec, ctx)` 在 `ctx && ctx.choiceOnly` 時回 `'choice'`（兩個呼叫處把 ctx 傳進去）；`vocabFormats` 的權重物件在 `choiceOnly` 時刪 `v-spell`、`v-match`；`makeQuestion` 最後保險：`choiceOnly` 且 `q.custom` 時最多重試 6 次，仍失敗回 null。
- Produces: `startSession('stage', { stage: id })`：`entries = buildStageTest(id).map(item => ({ item }))`，不設任何 `preview`，`SESSION.test = { stage: id }`，title `${stageById(id).title}・階段測驗`（入門卡 title 是「入門」）。
- `prepareEntry`：`SESSION.test` 時一律 `makeQuestion(e.item, { choiceOnly: true, avoidFmt: SESSION.lastFmt })`。
- `answerCurrent`：`e.done`／`e.chosen`、`ok`、`SESSION.lastFmt = q.fmt` 之後立刻 `if (SESSION.test) { SESSION.stats[ok ? 'correct' : 'wrong']++; SESSION.results.push({ key: q.key, ok, q, chosen: i }); if (SESSION.results.length === SESSION.entries.length) finishStageTest(); renderPractice(); speakAnswered(q); return; }`。
- 回饋列：`SESSION.test` 時不輸出 `slip` 與「這個字我已經會了」。
- Produces: `function finishStageTest()`：`const total = SESSION.entries.length, correct = SESSION.stats.correct, passed = correct >= stageTestNeed(total)`；`(state.stageTests[id] = state.stageTests[id] || []).unshift({ date: todayStr(), correct, total, passed })` 並 `.slice(0, 10)`；`recordAction('q', null, 'x')` 一次；`SESSION.test.result = { correct, total, passed }`；`saveState()`。
- Produces: `function renderStageSummary(view)`，`renderSummary` 開頭 `if (SESSION.test) return renderStageSummary(view)`。內容：頂部一句「40 題、不計時、不影響排程；答對 ${need} 題算通過。」；有 `result` 時標題「${correct}／${total}・通過」或「${correct}／${total}・未通過（需 ${need} 題）」，沒有 `result`（中途離開）標題「未完成，不計紀錄」；各類對／總（`LOG_KINDS` 的中文名，只列有出題的類）；錯題清單沿用現有 `wrongList`；按鈕：通過 → `<button data-act="stage-mark" data-stage=…>標記到這裡為止</button>` ＋ `close-summary`（文字「回課程頁」，`lastMainRoute` 已是 `#/course`）；未通過或未完成 → `stage-again`（再考一次）、`stage-practice`（去練這個階段）、`close-summary`。
- ACTIONS：`'stage-test': (el) => startSession('stage', { stage: el.dataset.stage })`；`'stage-again': () => { const id = SESSION.test.stage; SESSION = null; startSession('stage', { stage: id }); }`；`'stage-practice': () => { const id = SESSION.test.stage; SESSION = null; document.body.classList.remove('practicing'); if (id === 'pre') startSession('kana'); else { const u = stageById(id).units.find(x => !state.completedUnits.includes(x)) || stageById(id).units[0]; startSession('unit', { unit: u, title: `${unitById(u).short}・單元練習` }); } }`。

- [ ] **Step 1: 寫失敗測試**

```python
def test_stage_test_builds_on_an_empty_account(b):
    js = """(() => { const keep = JSON.stringify(state.srs); state.srs = {}; const out = {};
      STAGES.forEach(s => { const items = buildStageTest(s.id); const qs = items.map(it => makeQuestion(it, { choiceOnly: true }));
        out[s.id] = { n: items.length, uniq: new Set(items.map(x => x.key)).size, kinds: items.reduce((m, x) => (m[x.kind] = (m[x.kind] || 0) + 1, m), {}), nullQ: qs.filter(q => !q).length }; });
      state.srs = JSON.parse(keep); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    for sid in ['pre', 'p1', 'p2', 'p3']:
        assert r[sid]['n'] == 40 and r[sid]['uniq'] == 40 and r[sid]['nullQ'] == 0, (sid, r[sid])
    assert r['pre']['kinds'] == {'a': 12, 'v': 24, 'k': 4} and r['p2']['kinds'] == {'g': 32, 'c': 8}, r
    assert r['p1']['kinds'] == {'g': 20, 'v': 10, 'k': 4, 'l': 3, 'r': 3}, r

def test_stage_test_questions_are_all_choice(b):
    js = """(() => { const keep = state.settings.conjInput; state.settings.conjInput = 'type'; const bad = []; let order = 0;
      for (let round = 0; round < 3; round++) STAGES.forEach(s => buildStageTest(s.id).forEach(it => { if (it.kind === 'g' && it.t === 'order') order++;
        const q = makeQuestion(it, { choiceOnly: true }); if (!q || q.custom) bad.push(it.key + ':' + (q ? q.custom : 'null')); }));
      const g = REG.grammar.filter(x => x.t === 'conj')[0]; state.srs[g.key] = { b: 3, due: todayStr(), s: 5, d: 5, n: 3, ok: 3, ng: 0, last: addDays(todayStr(), -1) };
      const qc = makeQuestion(g, { choiceOnly: true }); delete state.srs[g.key];
      const v = REG.vocab.find(x => x.builtin && x.r && x.r.length >= 3 && !/[一-龯]/.test(x.r)); const fm = {}; for (let i = 0; i < 60; i++) { const q = makeQuestion(v, { choiceOnly: true }); fm[q.fmt] = 1; }
      state.settings.conjInput = keep; return JSON.stringify({ bad: bad.slice(0, 5), order, conj: qc && (qc.custom || 'choice'), fmts: Object.keys(fm) }); })()"""
    r = json.loads(ev(b, js))
    assert r['bad'] == [] and r['order'] == 0 and r['conj'] == 'choice', r
    assert 'v-spell' not in r['fmts'] and 'v-match' not in r['fmts'] and len(r['fmts']) >= 2, r

def test_stage_test_scores_without_touching_srs(b):
    js = """(() => { const before = JSON.stringify([state.srs, state.mistakes, state.statsFmt]); const log0 = JSON.stringify(logEntry()); state.stageTests = {};
      startSession('stage', { stage: 'p1' }); const title = SESSION.title; const previews = SESSION.entries.filter(e => e.preview).length; let wrongAt = -1;
      for (let i = 0; i < 40; i++) { const e = currentEntry(); const right = i < 33; if (!right && wrongAt < 0) wrongAt = i; answerCurrent(right ? e.q.answer : (e.q.answer + 1) % e.q.options.length);
        if (i === wrongAt) { var slip = document.querySelector('[data-act="slip"]'), known = document.querySelector('[data-act="vocab-known"]'); } nextQuestion(); }
      const same = JSON.stringify([state.srs, state.mistakes, state.statsFmt]) === before; const e1 = logEntry(); const l0 = JSON.parse(log0);
      const h = state.stageTests.p1[0]; const view = document.getElementById('view').textContent;
      return JSON.stringify({ title, previews, same, x: (e1.kX || 0) - (l0.kX || 0), v: (e1.vocabCount || 0) - (l0.vocabCount || 0), g: (e1.grammarCount || 0) - (l0.grammarCount || 0),
        h: { correct: h.correct, total: h.total, passed: h.passed }, len: state.stageTests.p1.length, entries: SESSION.entries.length, slip: Boolean(slip), known: Boolean(known),
        passText: view.includes('33／40・通過'), markBtn: Boolean(document.querySelector('[data-act="stage-mark"]')), need: stageTestNeed(40) }); })()"""
    r = json.loads(ev(b, js))
    assert r['title'] == '第一階段：N5 文法・階段測驗' and r['previews'] == 0 and r['same'], r
    assert r['x'] == 1 and r['v'] == 0 and r['g'] == 0 and r['entries'] == 40, r
    assert r['h'] == {'correct': 33, 'total': 40, 'passed': True} and r['len'] == 1 and r['need'] == 32, r
    assert not r['slip'] and not r['known'] and r['passText'] and r['markBtn'], r

def test_stage_test_fail_offers_retry_and_practice(b):
    js = """(() => { state.stageTests = {}; startSession('stage', { stage: 'pre' });
      for (let i = 0; i < 40; i++) { const e = currentEntry(); answerCurrent(i < 10 ? e.q.answer : (e.q.answer + 1) % e.q.options.length); nextQuestion(); }
      const view = document.getElementById('view'); const txt = view.textContent;
      return JSON.stringify({ passed: state.stageTests.pre[0].passed, fail: txt.includes('10／40・未通過（需 32 題）'), again: Boolean(view.querySelector('[data-act="stage-again"]')), prac: Boolean(view.querySelector('[data-act="stage-practice"]')), mark: Boolean(view.querySelector('[data-act="stage-mark"]')) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'passed': False, 'fail': True, 'again': True, 'prac': True, 'mark': False}, r

def test_leaving_a_stage_test_leaves_no_trace(b):
    js = """(() => { state.stageTests = {}; const log0 = JSON.parse(JSON.stringify(logEntry())); startSession('stage', { stage: 'p3' });
      for (let i = 0; i < 5; i++) { const e = currentEntry(); answerCurrent(e.q.answer); nextQuestion(); }
      exitPractice(); const unfinished = document.getElementById('view').textContent.includes('未完成，不計紀錄'); exitPractice();
      return JSON.stringify({ tests: Object.keys(state.stageTests).length, x: (logEntry().kX || 0) - (log0.kX || 0), unfinished, session: SESSION === null }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tests': 0, 'x': 0, 'unfinished': True, 'session': True}, r
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 五個新測試 FAIL（`buildStageTest` 未定義）

- [ ] **Step 3: 實作 Interfaces 列的全部**（`STAGE_TEST_QUOTA`、`buildStageTest`、`stageTestNeed`、`choiceOnly`、`startSession('stage')`、`prepareEntry`、`answerCurrent` 分支、回饋列隱藏、`finishStageTest`、`renderStageSummary`、三個 ACTIONS、`MODE_TITLE.stage = '階段測驗'`）

- [ ] **Step 4: 跑測試確認通過；手動從課程頁按一次「階段測驗」走完流程，確認聽力題能播、結束畫面手機寬度正常**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 全部 ok

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stage_tests.py
git commit -m "feat: 階段測驗——40 題選擇題、不寫排程、通過門檻 80%、結果寫 stageTests"
```

---

### Task 4: 批次標記

**Files:**
- Modify: `index.html`：`markKnown`（1588：加 `dueDays`）、`vocab-known-all`（5386：分散到期）、新區塊 `// ---- 批次標記（標記到這裡為止） ----` 放 Task 1 區塊後、`renderCourse`（復原列）、ACTIONS／CHANGE_ACTIONS。
- Test: `tests/e2e/test_stage_tests.py`

**Interfaces:**
- Consumes: Task 1 `stagesUpTo`、`stageItems`、`nextUnitAfterStage`、`stageIndex`；Task 2 `stagePassed`、`data-act="stage-mark"`；`lessonSecKey(g)`（7493）、`markKnown`、`LEVEL_FROM_S`、`levelFromS`、`srsLevelLabel`。
- Produces: `markKnown(key, save = true, dueDays)`：`dueDays` 給了就 `r.due = addDays(t, dueDays)`，否則照原本 `fsrsDays`。
- Produces: `const BULK_DUE = { seen: [1, 14], learned: [5, 14], known: [35, 56] }`；`function spreadDue(i, level) -> number`（`lo + (i % (hi - lo + 1))`）。
- Produces: `function bulkMarkTargets(stageId, level) -> item[]`：`stagesUpTo(stageId)` 的 `stageItems` 串起來，濾掉已達標的：`seen` 濾 `state.srs[key]` 存在；`learned` 濾 `r && r.b >= SRS_LEARNED`；`known` 濾 `r && srsLevelLabel(r, key) === '已熟練'`。
- Produces: `function bulkMark(stageId, level) -> { changed: number }`：
  1. 快照 `LAST_BULK_MARK = { stageId, level, srs: {key→舊紀錄或 null}（只含會改的）, mistakes: JSON copy, completedUnits, lessonSeen, currentUnit, stage, introSeen, kanaKnown }`。
  2. 對 `bulkMarkTargets` 第 i 個：`seen` → `state.srs[key] = { b: 1, s: 1, d: 5, due, n: 0, ok: 0, ng: 0, st: 0, last: null, lapse: 0, intro: t, lrn: t, f: {} }`（先 `ensureFsrs` 有的欄位照它）；`learned` → 沒紀錄就先建上面那筆，然後 `r.s = Math.max(r.s || 0, LEVEL_FROM_S[SRS_LEARNED - 1]); r.b = levelFromS(r.s); if (!r.lrn) r.lrn = t; r.due = …`；`known` → `markKnown(key, false, spreadDue(i, 'known'))`。`due = addDays(t, spreadDue(i, level))`。
  3. 連帶：`stagesUpTo(stageId).flatMap(s => s.units)` 進 `completedUnits`（去重）；這些單元的 `REG.grammar` 的 `lessonSecKey` 進 `lessonSeen`（去重）；`introSeen = true; kanaKnown = true; stage = 'main'`；`const nu = nextUnitAfterStage(stageId); if (unitOrder(nu) > unitOrder(state.currentUnit)) state.currentUnit = nu;`；`DAILY_CACHE = null; saveState()`。
- Produces: `function bulkUndo()`：把快照寫回（srs 逐 key 還原或刪除、其餘整個欄位覆蓋）、`LAST_BULK_MARK = null`、`DAILY_CACHE = null`、`saveState()`。
- Produces: `function bulkMarkDialog(stageId)`：`stagePassed(stageId)` 不成立就 `toast('先通過這個階段的測驗')` 並返回。`openModal('標記到〈' + title + '〉為止', html, { width: 520 })`，html：說明句（spec §5.1 第一行，階段名用頓號串）、三個 `<label class="switch"><input type="radio" name="bulkLevel" value="seen|learned|known" data-change="bulk-level" …>` 各帶 spec 的說明句，預設 `learned` checked；`<div class="hint mt-3" id="bulkCount">會影響 N 個項目</div>`；提示「無法復原（課程頁上有一次「復原」），建議先到設定下載備份。」；`<button class="btn btn-primary" data-act="bulk-mark-go" data-stage=…>確定</button>`。
- `CHANGE_ACTIONS['bulk-level']`：更新 `#bulkCount` 為 `bulkMarkTargets(stage, el.value).length`。`ACTIONS['stage-mark']: (el) => bulkMarkDialog(el.dataset.stage)`；`ACTIONS['bulk-mark-go']: (el)`：讀 checked 的 radio、`bulkMark`、`closeModal()`、`SESSION = null; document.body.classList.remove('practicing')`（從測驗 summary 進來時）、`toast('已把 N 個項目標成熟悉。目前單元：第 13–14 週・可能形')`、`go('#/course')`。`ACTIONS['bulk-mark-undo']: () => { bulkUndo(); toast('已復原'); route(); }`。
- `renderCourse`：`LAST_BULK_MARK` 有值時在頁首下方一列 `<div class="banner"><div class="grow">已把 N 個項目標成〈熟悉〉</div><button data-act="bulk-mark-undo">復原</button></div>`。
- `vocab-known-all`：改成 `keys.forEach((k, i) => { …; markKnown(k, false, spreadDue(i, 'known')); })`，toast 文字改「約五到八週後再各確認一次」。

- [ ] **Step 1: 寫失敗測試**

```python
SNAP = "JSON.stringify([state.srs, state.mistakes, state.completedUnits, state.lessonSeen, state.currentUnit, state.stage, state.introSeen, state.kanaKnown])"
RESET = "state.srs = {}; state.mistakes = []; state.completedUnits = []; state.lessonSeen = []; state.currentUnit = 'm1'; state.stage = 'pre'; state.introSeen = false; state.kanaKnown = false; state.stageTests = { p1: [{ date: todayStr(), correct: 33, total: 40, passed: true }] }; DAILY_CACHE = null; "

def test_bulk_mark_levels_and_side_effects(b):
    js = RESET + """(() => { const t = todayStr(); const out = {};
      const n = bulkMarkTargets('p1', 'learned').length; const r1 = bulkMark('p1', 'learned');
      const items = stagesUpTo('p1').flatMap(s => stageItems(s.id)); const recs = items.map(x => state.srs[x.key]);
      out.learned = { n, changed: r1.changed, allB3: recs.every(r => r && r.b === 3), dueMin: Math.min(...recs.map(r => daysBetween(t, r.due))), dueMax: Math.max(...recs.map(r => daysBetween(t, r.due))),
        units: state.completedUnits.slice(), cur: state.currentUnit, stage: state.stage, intro: state.introSeen, kana: state.kanaKnown, lessons: state.lessonSeen.filter(k => k.startsWith('m1:')).length > 0,
        n4Open: n4WordsOpen(), banner: (renderCourse(document.getElementById('view')), Boolean(document.querySelector('[data-act="bulk-mark-undo"]'))) };
      const r2 = bulkMark('p1', 'known'); out.known = { changed: r2.changed, allKnown: items.every(x => state.srs[x.key].known === 1 && srsLevelLabel(state.srs[x.key], x.key) === '已熟練'), dueMin: Math.min(...items.map(x => daysBetween(t, state.srs[x.key].due))) };
      const r3 = bulkMark('p1', 'seen'); out.seenAfterKnown = { changed: r3.changed, stillKnown: items.every(x => state.srs[x.key].known === 1) };
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    L = r['learned']
    assert L['n'] > 500 and L['changed'] == L['n'] and L['allB3'] and L['dueMin'] == 5 and L['dueMax'] == 14, L
    assert L['units'] == ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] and L['cur'] == 'm7' and L['stage'] == 'main' and L['intro'] and L['kana'] and L['lessons'] and L['n4Open'] and L['banner'], L
    assert r['known']['changed'] > 0 and r['known']['allKnown'] and r['known']['dueMin'] == 35, r['known']
    assert r['seenAfterKnown'] == {'changed': 0, 'stillKnown': True}, r

def test_bulk_mark_never_downgrades_and_spreads_due(b):
    js = RESET + """(() => { const t = todayStr(); const v = stageItems('pre').find(x => x.kind === 'v'); markKnown(v.key, false); state.currentUnit = 'm9';
      const custom = { id: 'u_test', w: 'テスト', r: 'てすと', m: '測試' }; state.vocab.push(custom); buildRegistry();
      const r = bulkMark('p1', 'seen'); const byDay = {}; const fresh = Object.values(state.srs).filter(x => !x.known); fresh.forEach(x => { const d = daysBetween(t, x.due); byDay[d] = (byDay[d] || 0) + 1; });
      const n = fresh.length; const maxDay = Math.max(...Object.values(byDay));
      const out = { changed: r.changed, known: state.srs[v.key].known, cur: state.currentUnit, custom: Boolean(state.srs['v:u_test']), maxDay, cap: Math.ceil(n / 14) + 1, days: Object.keys(byDay).map(Number).sort((a, b) => a - b) };
      state.vocab = state.vocab.filter(x => x.id !== 'u_test'); buildRegistry(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['known'] == 1 and r['cur'] == 'm9' and not r['custom'], r
    assert r['maxDay'] <= r['cap'] and r['days'][0] == 1 and r['days'][-1] == 14, r

def test_bulk_mark_to_p3_finishes_the_course_and_undo_restores(b):
    js = RESET + "state.stageTests = { p3: [{ date: todayStr(), correct: 40, total: 40, passed: true }] }; const before = " + SNAP + """;
      bulkMark('p3', 'learned'); const after = { cur: state.currentUnit, pct: courseProgress().pct, units: state.completedUnits.length, items: Object.keys(state.srs).length };
      bulkUndo(); const restored = """ + SNAP + """ === before && LAST_BULK_MARK === null;
      return JSON.stringify({ after, restored });"""
    r = json.loads(ev(b, "(() => { " + js + " })()"))
    assert r['after']['cur'] == 'm18' and r['after']['pct'] == 100 and r['after']['units'] == 18 and r['after']['items'] > 1500, r
    assert r['restored'], r

def test_bulk_mark_dialog_requires_a_pass_and_counts_live(b):
    js = RESET + """(() => { bulkMarkDialog('p2'); const noModal = !document.querySelector('#modalBody');
      bulkMarkDialog('p1'); const body = document.getElementById('modalBody'); const radios = [...body.querySelectorAll('input[name="bulkLevel"]')];
      const checked = radios.find(x => x.checked).value; const c1 = body.querySelector('#bulkCount').textContent;
      radios.find(x => x.value === 'known').checked = true; CHANGE_ACTIONS['bulk-level'](radios.find(x => x.value === 'known'));
      const c2 = body.querySelector('#bulkCount').textContent; const txt = body.textContent; closeModal();
      return JSON.stringify({ noModal, n: radios.length, checked, c1, c2, title: txt.includes('入門、第一階段'), go: Boolean(body.querySelector('[data-act="bulk-mark-go"]')) }); })()"""
    r = json.loads(ev(b, js))
    assert r['noModal'] and r['n'] == 3 and r['checked'] == 'learned' and r['title'] and r['go'], r
    assert r['c1'] != r['c2'] and '個項目' in r['c1'], r

def test_vocab_known_all_spreads_due(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); state.srs = {}; location.hash = '#/vocab/list?lv=PRE_N5'; route();
      ACTIONS['vocab-known-all'](); const days = new Set(Object.values(state.srs).map(r => daysBetween(t, r.due))); const n = Object.keys(state.srs).length;
      state.srs = JSON.parse(keep); LAST_BULK_KNOWN = null; saveState(); return JSON.stringify({ n, min: Math.min(...days), max: Math.max(...days), spread: days.size }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] > 0 and r['min'] >= 35 and r['max'] <= 56 and r['spread'] >= 10, r
```

（`vocabListFiltered` 的篩選參數若不是 `lv`，照單字頁實際的網址參數改 `location.hash`。）

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 五個新測試 FAIL（`bulkMark` 未定義／到期日沒分散）

- [ ] **Step 3: 實作 Interfaces 列的全部**

- [ ] **Step 4: 跑測試確認通過；手動：考過一次 → 標記 → 看今日頁計畫沒有爆量 → 課程頁按復原**

Run: `python3 -I tests/e2e/test_stage_tests.py`
Expected: 全部 ok

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stage_tests.py
git commit -m "feat: 標記到這裡為止——通過階段測驗後批次標成已學／熟悉／熟練，到期分散，可復原"
```

---

### Task 5: 版本、changelog、全套測試

**Files:**
- Modify: `index.html`（931 `APP_VERSION`、937 CHANGELOG 新增第一組）、`sw.js`（2 `CACHE`）

- [ ] **Step 1: 版本與 changelog**

`APP_VERSION = '1.0.11'`、`CACHE = 'nq-v1.0.11'`。CHANGELOG 最前面加：

```js
{ v: '1.0.11', date: '2026-10-29', items: [
  '課程頁改成四個對等的階段：入門、第一、二、三階段；第 0 週搬進入門卡；整頁只剩一個「目前」。',
  '每個階段有「階段測驗」：40 題選擇題、不計時、不影響排程，答對 32 題算通過；結果記在卡上。',
  '通過後可「標記到這裡為止」：把該階段與之前所有內容一次標成已學／熟悉／熟練，到期日分散在幾週內；課程頁可復原一次。「這 N 個字我都會了」的到期日也改成分散。'
] },
```

- [ ] **Step 2: 跑全套**

Run: `bash scripts/test.sh; echo EXIT=$?`
Expected: 最後一行 `ALL_OK` 且 `EXIT=0`（`cdp.py` 的 `tabs` 偶發錯誤就重跑一次）

- [ ] **Step 3: Commit 與 push**

```bash
git add index.html sw.js
git commit -m "release: 1.0.11 四個階段、階段測驗與標記到這裡為止"
git push origin feat/pre-n5
```

Pages 已指 `feat/pre-n5`，push 後請使用者在手機上試：課程頁四張卡、入門測驗一次、標記後今日頁的量。
