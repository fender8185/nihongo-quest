# 學習分析分級進度、課程進度推估與考試目標（1.0.26） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 學習分析頁的改動：
- 總進度分四種範圍。
- 過去 7 天改成摘要加趨勢線。
- 正確率改看 100 題。
- 課程進度合成一張卡，照分題庫的算法推估 N5／N4 什麼時候學完。

另外設定加上考試級別，模擬考頁的考試倒數也照目標級別推估。

**Architecture:** 全部改在 `index.html` 現有的區塊。
- 新的純函式：`itemLevel`、`progressTotals(kind, scope)`、`weekSummary`、`coursePace`、`courseText`。
- 新的畫面函式：`weekCardHtml`、`courseCardHtml`。
- `renderStats` 和 `examCountdownHtml` 改呼叫這些函式。
- 拿掉 `paceAdvice`、`finishText`、`grammarPace`、`courseLeft`、`planAdviceHtml`。
- 新設定 `examLevel`。

**Tech Stack:** 單檔 `index.html`（原生 JS，函式都是全域）；e2e 測試 `tests/e2e/*.py`（headless Chrome、`cdp.py`）。

**Spec:** `docs/superpowers/specs/2026-10-31-stats-level-progress-design.md`

## Global Constraints

**分支與版本**
- 從 `main`（f1a347d）開分支 `feat/stats-levels`。開始前先 commit 這份計畫，以及寫計畫時順手改的 spec（§5.4 太吃力那句、§5.5 時間軸），commit 訊息：`docs: 學習分析分級進度（1.0.26）實作計畫`。
- Task 1 就把 `APP_VERSION` 改成 `'1.0.26'`（註解裡的 `'nq-v1.0.26'` 一起改），`sw.js` 的 `CACHE` 改成 `'nq-v1.0.26'`。`scripts/test.sh` 會檢查「`index.html` 跟 origin/main 不同時，版本號要變」，先改版本，每個 task 才都能跑整套測試。
- `data.js` 不動。

**數值和文字**
- 設定：`examLevel` 只能是 `'N5'` 或 `'N4'`，預設 `'N4'`。
- 期限是 `examDate − 21` 天。速度看最近 14 天。正確率用 `RECENT_MAX`（100）。
- 日期一律用斜線寫：`d.replace(/-/g, '/')`，例如 `2027/04/03`。
- 各種文字照 spec §4.2、§5.4、§5.5 和 §6 的原文。只有 §5.4 太吃力那句改成：「要趕上，每天約需 NEED 題新內容（現在約 P 題），等於每天加練 K 次，太吃力了：可以考慮先考 N5，或把考試日期往後延（JLPT 每年 7 月、12 月各一次）。」目標是 N5 時拿掉「先考 N5，或」。spec 那句會一起改。
- 寫法跟周圍的程式碼一樣：程式註解用英文、很精簡，畫面上的字用繁體中文，CSS class 和現有的一樣是短名字。

**測試**
- 新增 `tests/e2e/test_stats_levels.py`，port 8802。檔頭和最後的執行段照抄 `tests/e2e/test_queues.py`，只改 docstring 和 `PORT`。加進 `scripts/test.sh` 的 `e2e=(...)` 清單。
- 單檔執行：`.venv/bin/python3 -I tests/e2e/<檔名>.py [測試名…]`。Task 1 會讓 `test_fixes.py` 也能指定測試名稱。
- 兩套測試不能同時跑，因為每個檔案用固定的 port。
- 負載高時，單獨重跑會過的 TypeError 和 timeout 是負載造成的（見記憶裡的 e2e 筆記）。
- 每個 task 最後都跑一次 `bash scripts/test.sh`，要看到 `ALL_OK`。

**發布**：Task 6 跑出 `ALL_OK` 後，合併回 main 並推上去。使用者 2026-10-31 授權過，不用再問。

## Review Focus

1. **全新帳號**（沒有作答紀錄、沒有 `dailyLogs`）：學習分析頁要畫得出來；課程進度的文字裡不能有 `null`、`NaN`、`undefined`；7 天那張寫「這 7 天還沒有練習」。測試在 Task 5。
2. **考試剛好在 21 天後**：期限是今天，要顯示「不到三週」那句（`close`）；22 天後就照一般情況推估。測試在 Task 4。
3. **速度很慢，預計學完的日子遠在考試之後**：時間軸的長度最多到考試日的兩倍，超過的點放在最右邊，標籤後面加「→」，下面的文字照樣寫真正的日期。測試在 Task 5。
4. **手機寬度 390px**：學習分析頁和模擬考頁都不能左右捲動，也就是 `scrollWidth <= 390`。測試在 Task 5。
5. **AI 出的文法題**（`state.customGrammar`）：單元是 `m3` 的算在總進度和 N5；單元不存在的只算在總進度。測試在 Task 1。

---

### Task 1: 總進度卡的四種範圍

**Files:**
- Modify: `index.html`
  - `lvLabel` 附近（約 7764 行）加 `itemLevel`。
  - `progressTotals`（7776）。
  - `renderStats`（7888）的 `progressCard`。
  - `const ACTIONS`（4533）那一帶的動作表加 `'stats-scope'`。
  - `APP_VERSION`（942）。
- Modify: `sw.js:2`
- Create: `tests/e2e/test_stats_levels.py`
- Modify:
  - `scripts/test.sh` 的 `e2e=(...)`。
  - `tests/e2e/test_fixes.py`：`__main__` 加上 `only = sys.argv[1:]` 的篩選，寫法照 `test_queues.py`。`test_stats_shows_the_past_week_of_practice_and_what_was_learned` 的儀表部分也要改。
  - `tests/e2e/test_pre_n5.py`：`test_stats_progress_shows_kana_and_counts_it_as_learned`。

**Interfaces:**
- Produces:
  - `itemLevel(it) -> 'PRE_N5' | 'N5' | 'N4' | null`。單元不存在的文法回傳 `null`。
  - `progressTotals(kind: 'v'|'g'|'lr'|'k'|'a', scope: 'all'|'pre'|'n5'|'n4' = 'all') -> { kind, total, seen, learned, mastered, n5, pct }`。
  - `let statsScope = 'all'`。
  - `STATS_SCOPES = [['all','總進度'], ['pre','入門'], ['n5','N5'], ['n4','N4']]`。
  - 範圍按鈕：`[data-act=stats-scope][data-scope=…]`，選中的那個是 `aria-pressed="true"`。

- [ ] **Step 1: 建立測試檔，寫會失敗的測試**

`tests/e2e/test_stats_levels.py` 照 Global Constraints 建好檔頭和執行段，再加：

```python
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"

def test_each_scope_shows_its_banks_and_totals(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route();
      const pick = (s) => { document.querySelector(`[data-act=stats-scope][data-scope=${s}]`).click();
        return [...document.querySelectorAll('#progressCard .gauge')].map(g => [g.dataset.kind, +g.dataset.total, !!g.querySelector('.tick'), g.querySelector('strong').textContent]); };
      const n5u = new Set(DATA.UNITS.filter(u => u.lv === 'N5').map(u => u.id)), n4u = new Set(DATA.UNITS.filter(u => u.lv === 'N4').map(u => u.id));
      const V = REG.vocab.filter(v => v.builtin), LR = REG.listen.concat(REG.read), G = REG.grammar;
      const want = {
        all: [['v', V.length, true, '單字'], ['g', G.length, true, '文法'], ['lr', LR.length, true, '聽力＋閱讀'], ['k', REG.kanji.length, true, '漢字']],
        pre: [['a', REG.kana.length, false, '假名'], ['v', V.filter(v => v.lv === 'PRE_N5').length, false, '入門單字'], ['g', G.filter(g => g.u === 'm0').length, false, '入門文法']],
        n5: [['v', V.filter(v => v.lv === 'N5').length, false, '單字'], ['g', G.filter(g => n5u.has(g.u)).length, false, '文法'], ['lr', LR.filter(x => x.lv === 'N5').length, false, '聽力＋閱讀'], ['k', REG.kanji.filter(k => k.lv === 'N5').length, false, '漢字']],
        n4: [['v', V.filter(v => v.lv === 'N4').length, false, '單字'], ['g', G.filter(g => n4u.has(g.u)).length, false, '文法'], ['lr', LR.filter(x => x.lv === 'N4').length, false, '聽力＋閱讀'], ['k', REG.kanji.filter(k => k.lv === 'N4').length, false, '漢字']] };
      const got = {}; ['pre', 'n5', 'n4', 'all'].forEach(s => { got[s] = pick(s); });
      const part = (i, j) => want.n5[i][1] + want.n4[i][1] + (j === null ? 0 : want.pre[j][1]) === want.all[i][1];   // every item is in one level view
      return JSON.stringify({ got, want, part: [part(0, 1), part(1, 2), part(2, null), part(3, null)] }); })()"""
    r = json.loads(ev(b, js))
    assert r['got'] == r['want'], r
    assert r['part'] == [True, True, True, True], r['part']

def test_the_scope_is_kept_while_the_app_is_open(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route(); document.querySelector('[data-act=stats-scope][data-scope=n5]').click();
      location.hash = '#/today'; route(); location.hash = '#/stats'; route();
      return document.querySelector('[data-act=stats-scope][aria-pressed=true]').dataset.scope; })()"""
    assert ev(b, js) == 'n5'

def test_listening_and_reading_steps_follow_right_answers(b):
    js = "(() => { " + FRESH + """ state.srs = {}; const t = todayStr(); const [a, c, d] = REG.listen.slice(0, 3); const e = REG.read[0];
      const rec = (ok, n) => ({ b: 1, due: addDays(t, 7), n, ok, ng: n - ok, s: 2, d: 5, last: addDays(t, -1) });
      state.srs[a.key] = rec(0, 1); state.srs[c.key] = rec(1, 1); state.srs[d.key] = rec(2, 2); state.srs[e.key] = rec(1, 2);
      const x = progressTotals('lr'); return JSON.stringify([x.seen, x.learned, x.mastered]); })()"""
    assert json.loads(ev(b, js)) == [1, 2, 1]

def test_ai_made_grammar_counts_in_its_units_level(b):   # Review Focus 5
    js = "(() => { " + FRESH + """ const n = (s) => progressTotals('g', s).total; const before = ['all', 'n5', 'n4', 'pre'].map(n);
      state.customGrammar = [{ id: 'ai-n5', u: 'm3' }, { id: 'ai-x', u: 'zz' }]; buildRegistry();
      return JSON.stringify(['all', 'n5', 'n4', 'pre'].map((s, i) => n(s) - before[i])); })()"""
    assert json.loads(ev(b, js)) == [2, 1, 0, 0]
```

- [ ] **Step 2: 跑測試，確認會失敗**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py`
Expected：4 個 FAIL，原因是找不到 `[data-act=stats-scope]`（null 的 `.click`），或是 `progressTotals('lr')` 的數字不對。

- [ ] **Step 3: 實作**

- `itemLevel(it)`：
  - 文法：`m0` 回傳 `'PRE_N5'`；單元在 `DATA.UNITS` 裡就回傳那個單元的 `lv`；都不是就回傳 `null`。單元對級別的表建一次就好。
  - 假名：`'PRE_N5'`。
  - 其他（單字、漢字、聽力、閱讀）：`it.lv || 'N5'`。
- `progressTotals(kind, scope)`：照 spec §3.2。範圍對級別：`pre` 是 `PRE_N5`，`n5` 是 `N5`，`n4` 是 `N4`。`n5` 欄位只在 `scope === 'all'` 而且 `kind !== 'a'` 時計算，算 `itemLevel !== 'N4'` 的題數；其他情況是 0。
- `progressCard`：說明下面加一排 `.seg`，用 `STATS_SCOPES` 產生按鈕。儀表照 spec §3.2 的表，標題和標籤照表上寫的。
- `ACTIONS['stats-scope'] = (el) => { statsScope = el.dataset.scope; route(); }`。
- 版本號：照 Global Constraints 改成 1.0.26。
- 舊測試：
  - `test_stats_progress_shows_kana_and_counts_it_as_learned`：先點 `[data-scope=pre]`，再比對 `gauges == ['a','v','g']`，其他斷言不變。
  - `test_stats_shows_the_past_week…` 的儀表斷言改成 `set(g) == {'v','g','lr','k'}`；`g['a']` 那兩行拿掉；`v`、`g` 的刻度斷言保留。

- [ ] **Step 4: 跑測試，確認通過**

Run:
```bash
.venv/bin/python3 -I tests/e2e/test_stats_levels.py
.venv/bin/python3 -I tests/e2e/test_pre_n5.py test_stats_progress_shows_kana_and_counts_it_as_learned test_week0_items_count_as_n5_grammar_in_the_stats
.venv/bin/python3 -I tests/e2e/test_fixes.py test_stats_shows_the_past_week_of_practice_and_what_was_learned
```
Expected：都是 `ALL PASS`。

然後跑 `bash scripts/test.sh`，Expected：`ALL_OK`。

- [ ] **Step 5: Commit**

```bash
git add index.html sw.js scripts/test.sh tests/e2e/test_stats_levels.py tests/e2e/test_fixes.py tests/e2e/test_pre_n5.py
git commit -m "feat: 學習分析總進度分總進度／入門／N5／N4 四種範圍，聽力＋閱讀照答對次數分三階"
```

---

### Task 2: 過去 7 天改成摘要加趨勢線，正確率看 100 題

**Files:**
- Modify: `index.html`
  - `weekPractice` 旁邊（約 7767 行）加 `weekSummary` 和 `weekCardHtml`。
  - `renderStats`：原本 7 天的直條和 `acc`。
  - CSS（519–538）：拿掉 `.cols`、`.col-axis`、`.collabel`、`.colbar`，加上新卡片的樣式。
- Test: `tests/e2e/test_stats_levels.py`
- Modify: `tests/e2e/test_fixes.py`：`test_stats_shows_the_past_week…` 的 7 天部分。

**Interfaces:**
- Produces:
  - `weekSummary() -> { days, total, avg, change: number|null, share: { v, g, q } }`，`days` 是 `weekPractice(7)`。
  - 卡片 `#weekCard`：三個 `.week-stat`，每個裡面有 `.week-stat-v`；`svg.week-line` 裡有 7 個 `circle.week-dot`，今天那個多一個 `today` class；占比條 `.week-share`，文字 `.week-share-l`；沒練習時改成 `.week-empty`；底下是收合的明細表格。

- [ ] **Step 1: 寫會失敗的測試**

```python
WEEK = """const t = todayStr(); state.dailyLogs = {};
  const put = (i, v, g, q) => { const d = addDays(t, -i); state.dailyLogs[d] = { date: d, vocabCount: v, grammarCount: g, quizCount: q, bonusCount: 0, minutes: 0, topics: [] }; };
  const V = [10, 0, 20, 5, 30, 15, 8], G = [4, 0, 6, 2, 10, 5, 2], Q = [1, 0, 2, 0, 3, 1, 1];   // six days ago … today
  V.forEach((v, i) => put(6 - i, v, G[i], Q[i]));"""
PREV = lambda mul: "[20, 10, 15, 15, 10, 20, 10].forEach((v, i) => put(13 - i, v * %s, 0, 0));" % mul   # the week before: 100 × mul

def test_week_card_sums_seven_days_and_compares_with_the_week_before(b):
    js = "(() => { " + FRESH + WEEK + PREV('1') + """ saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('weekCard');
      const dots = [...c.querySelectorAll('.week-dot')]; const md = (i) => { const d = addDays(t, -i); return d.slice(5).replace('-', '/') + '（' + '日一二三四五六'[parseDate(d).getDay()] + '）'; };
      return JSON.stringify({ s: weekSummary(), stats: [...c.querySelectorAll('.week-stat-v')].map(x => x.textContent.trim()), up: c.querySelectorAll('.week-stat-v')[2].classList.contains('up'),
        share: c.querySelector('.week-share-l').textContent, n: dots.length, today: dots[6].classList.contains('today'),
        peak: [dots[4].dataset.tipTitle, dots[4].dataset.tipBody], rest: dots[1].dataset.tipTitle, wantPeak: md(2) + '：43 題', wantRest: md(5) + '：沒有練習', last: dots[6].dataset.tipTitle,
        rows: c.querySelectorAll('details tbody tr').length }); })()"""
    r = json.loads(ev(b, js))
    assert r['s']['total'] == 125 and r['s']['avg'] == 18 and r['s']['change'] == 25 and r['s']['share'] == {'v': 88, 'g': 29, 'q': 8}, r['s']
    assert r['stats'] == ['125', '18', '+25%'] and r['up'] and r['share'] == '單字 70%・文法 23%・其他 6%', r
    assert r['n'] == 7 and r['today'] and r['peak'] == [r['wantPeak'], '單字 30・文法 10・其他 3'] and r['rest'] == r['wantRest'] and r['last'] == '今天：11 題' and r['rows'] == 7, r

def test_week_card_shows_a_dash_without_the_week_before_and_a_plain_drop(b):
    js = "(() => { " + FRESH + WEEK + """ saveState(); location.hash = '#/stats'; route(); const change = () => document.querySelectorAll('#weekCard .week-stat-v')[2];
      const dash = change().textContent.trim(); """ + PREV('2.5') + """ saveState(); route();   // the week before: 250, so 125 is half of it
      return JSON.stringify({ dash, drop: change().textContent.trim(), up: change().classList.contains('up') }); })()"""
    assert json.loads(ev(b, js)) == {'dash': '—', 'drop': '−50%', 'up': False}

def test_week_card_without_practice_says_so(b):
    js = "(() => { " + FRESH + """ state.dailyLogs = {}; saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('weekCard');
      return JSON.stringify({ stats: [...c.querySelectorAll('.week-stat-v')].map(x => x.textContent.trim()), empty: (c.querySelector('.week-empty') || {}).textContent, bar: !!c.querySelector('.week-share') }); })()"""
    assert json.loads(ev(b, js)) == {'stats': ['0', '0', '—'], 'empty': '這 7 天還沒有練習', 'bar': False}

def test_accuracy_tile_reads_the_last_hundred_answers(b):
    js = "(() => { " + FRESH + """ state.recent = Array(40).fill(0).concat(Array(60).fill(1)); saveState(); location.hash = '#/stats'; route();
      const l = [...document.querySelectorAll('.stat-l')].find(x => /正確率/.test(x.textContent)); return JSON.stringify([l.textContent, l.previousElementSibling.textContent]); })()"""
    assert json.loads(ev(b, js)) == ['最近 100 題正確率', '60%']
```

- [ ] **Step 2: 跑測試，確認會失敗**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py test_week_card_sums_seven_days_and_compares_with_the_week_before test_week_card_shows_a_dash_without_the_week_before_and_a_plain_drop test_week_card_without_practice_says_so test_accuracy_tile_reads_the_last_hundred_answers`
Expected：4 個 FAIL，原因是 `weekSummary is not defined`、找不到 `#weekCard`，或標籤還是「最近 60 題正確率」。

- [ ] **Step 3: 實作**

- `weekSummary()`：照 spec §4.1。
- `weekCardHtml(s)`：照 spec §4.2。
  - 「比前 7 天」的數字：大於 0 寫 `+N%` 並加 `up` class；小於 0 寫 `−N%`，用 U+2212 負號；等於 0 寫 `0%`；`null` 寫 `—`。
  - 趨勢線：`viewBox` 寬 280、高 60，上下各留 5，最大值是 7 天裡最多的那天（至少 1）。沒練習的點畫在最底下。
  - 點的提示：`data-tip-title` 是 `今天` 或 `MM/DD（X）`，接「：N 題」，沒練習寫「：沒有練習」；`data-tip-body` 寫 `單字 v・文法 g・其他 q`，沒練習時留空。
  - 占比的百分比各自用 `Math.round` 四捨五入。
- `renderStats`：
  - 原本 7 天的那張卡換成 `weekCardHtml(weekSummary())`，明細表格照舊。
  - `recentAccuracy(60)` 改成 `recentAccuracy(RECENT_MAX)`，標籤寫 `最近 ${RECENT_MAX} 題正確率`。
- 舊測試 `test_stats_shows_the_past_week…`：
  - 「有 7 根直條、昨天那根的分段」改成：`#weekCard .week-dot` 有 7 個，昨天那個（index 5）的 `data-tip-body` 是 `'單字 4・文法 2・其他 1'`。
  - `order` 改看 `#weekCard`。
  - `summary == '明細'` 和圖例的斷言保留。

- [ ] **Step 4: 跑測試，確認通過**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py`，以及 `.venv/bin/python3 -I tests/e2e/test_fixes.py test_stats_shows_the_past_week_of_practice_and_what_was_learned`
Expected：都是 `ALL PASS`。然後跑 `bash scripts/test.sh`，Expected：`ALL_OK`。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stats_levels.py tests/e2e/test_fixes.py
git commit -m "feat: 過去 7 天改成合計／平均／比前 7 天＋趨勢線＋占比，正確率改看最近 100 題"
```

---

### Task 3: 設定加上考試級別

**Files:**
- Modify: `index.html`：`defaultSettings`（1159）、`normalizeState`（1240，接在 1.0.25 刪 `sessionSize` 那行後面）、`settingsLearn`（7394）。
- Test: `tests/e2e/test_stats_levels.py`

**Interfaces:**
- Produces：`state.settings.examLevel`，值是 `'N5'` 或 `'N4'`。設定頁的下拉選單是 `select[data-key=examLevel]`。

- [ ] **Step 1: 寫會失敗的測試**

```python
def test_exam_row_has_the_level_and_the_date(b):
    js = """(() => { openSettings('learn'); const m = document.querySelector('.modal'); const sel = m.querySelector('select[data-key=examLevel]');
      const row = sel && sel.closest('.setting-row'); const out = { opts: sel ? [...sel.options].map(o => o.value) : null, value: sel && sel.value, date: !!(row && row.querySelector('input[data-key=examDate]')),
        label: row && row.querySelector('.label').textContent, hint: row && row.querySelector('.hint').textContent }; closeModal(true); return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == {'opts': ['N5', 'N4'], 'value': 'N4', 'date': True, 'label': '考試', 'hint': '學習分析和模擬考頁會照這個級別和日期推估進度。'}

def test_exam_level_is_n4_unless_n5_was_saved(b):
    js = """JSON.stringify([defaultSettings().examLevel, ...[{ examLevel: 'N3' }, { examLevel: 'N5' }, {}].map(s => normalizeState({ settings: s }).settings.examLevel)])"""
    assert json.loads(ev(b, js)) == ['N4', 'N4', 'N5', 'N4']

def test_picking_n5_saves_it(b):
    js = """(() => { openSettings('learn'); const sel = document.querySelector('select[data-key=examLevel]'); sel.value = 'N5'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      closeModal(true); return state.settings.examLevel; })()"""
    assert ev(b, js) == 'N5'
```

- [ ] **Step 2: 跑測試，確認會失敗**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py test_exam_row_has_the_level_and_the_date test_exam_level_is_n4_unless_n5_was_saved test_picking_n5_saves_it`
Expected：3 個 FAIL，因為選單不存在，`examLevel` 是 `undefined`。

- [ ] **Step 3: 實作**

- `defaultSettings()` 加上 `examLevel: 'N4'`。
- `normalizeState` 加一行：`if (!['N5', 'N4'].includes(out.settings.examLevel)) out.settings.examLevel = 'N4';`。
- `settingsLearn()` 的考試日期那一列改成 spec §6 的「考試」：label 是「考試」，hint 用 spec 的原文。控制項用 `<div class="row">` 放級別選單和原本的日期欄位。級別選單照 `selRow` 裡 `<select>` 的寫法：`data-change="setting" data-key="examLevel"`，選項是 `N5`、`N4`。

- [ ] **Step 4: 跑測試，確認通過**

Run: 跟 Step 2 一樣。Expected：`ALL PASS`。然後跑 `bash scripts/test.sh`，Expected：`ALL_OK`。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stats_levels.py
git commit -m "feat: 設定的考試可以選 N5 或 N4（預設 N4）"
```

---

### Task 4: `coursePace()` 與 `courseText()`

**Files:**
- Modify: `index.html`：在 `paceAdvice`（7828）旁邊加 `coursePace`、`courseText`。舊的函式先留著，Task 5 再拿掉。
- Test: `tests/e2e/test_stats_levels.py`
- Modify: `tests/e2e/test_queues.py` 的 `test_exam_pace_counts_days_without_new_items`：`paceAdvice().perDay` 改成 `coursePace().perDay`，期望值不變，還是 48/7。

**Interfaces:**
- Consumes：`state.settings.examLevel`（Task 3）、`examPace()`、`dailyPlan()`、`introLeft()`、`inPreStage()`。
- Produces：
  - `coursePace() -> { perDay, fallback, round, level, exam, deadline, left: {N5, N4}, days: {N5, N4}, finish: {N5, N4}, state, late, need, gap, plan }`。
    - `days` 是整數天數（無條件進位），`finish` 是 ISO 日期。
    - `state` 是 `'passed' | 'close' | 'done' | 'ok' | 'late'`。
    - `plan` 是 `{ every } | { times, heavy }`，只在 `'late'` 時有。
  - `courseAdvice(p) -> string`：只有 `'late'` 時有內容，是「要趕上，每天約需……」那一段；其他狀態回傳 `''`。
  - `courseText(p) -> string`：`'late'` 時是推估的那句加上 `courseAdvice(p)`。

- [ ] **Step 1: 寫會失敗的測試**

```python
# seen(list): learned once; only(list): everything but these learned; pace(n): n new items a day for 14 days
PACE = """const seen = (list) => { const d = todayStr(); list.forEach(x => { state.srs[x.key] = { b: 2, due: addDays(d, 5), n: 1, ok: 1, ng: 0, s: 3, d: 5, last: addDays(d, -1), intro: addDays(d, -1) }; }); };
  const only = (keep) => { const k = new Set(keep.map(x => x.key)); seen(REG.vocab.filter(v => v.builtin && !k.has(v.key)).concat(REG.grammar.filter(g => !k.has(g.key)), REG.kanji.filter(x => !k.has(x.key)))); };
  const pace = (n) => { for (let i = 1; i <= 14; i++) state.dailyLogs[addDays(todayStr(), -i)] = { vocabCount: n, fresh: n }; };
  const w5 = REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 30), w4 = REG.vocab.filter(v => v.builtin && v.lv === 'N4').slice(0, 60);
  const g5 = REG.grammar.filter(g => DATA.UNITS.some(u => u.id === g.u && u.lv === 'N5')).slice(0, 20);
  const T = todayStr(); const sl = (n) => addDays(T, n).replace(/-/g, '/'); const exam = (n) => { state.settings.examDate = addDays(T, n); };"""

def test_course_pace_finds_the_slowest_bank(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(51); const out = [];
      only(w5); out.push(coursePace().days); state.srs = {}; only(w5.concat(w4)); out.push(coursePace().days); state.srs = {}; only(w5.concat(w4, g5)); out.push(coursePace().days);
      return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == [{'N5': 3, 'N4': 3}, {'N5': 3, 'N4': 9}, {'N5': 11, 'N4': 11}]

def test_course_text_when_on_time_and_when_late(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); only(w5.concat(w4, g5)); const out = {}; const run = (n, lv) => { exam(n); state.settings.examLevel = lv; const p = coursePace(); return [p.state, p.need || null, p.plan || null, courseText(p)]; };
      out.ok = run(51, 'N4'); out.daily = run(26, 'N4'); out.every = run(30, 'N4'); out.twice = run(24, 'N4'); out.heavy = run(22, 'N4'); out.heavy5 = run(22, 'N5');
      return JSON.stringify({ out, round: dailyPlan().n, f: sl(11), d: [sl(30), sl(5)] }); })()"""
    r = json.loads(ev(b, js)); o = r['out']; f = r['f']
    assert r['round'] == 15, r
    assert o['ok'][0] == 'ok' and o['ok'][3] == f'照最近每天約 10 題新內容的速度，預計 {f} 學完 N4 的單字、文法、漢字，比 {r["d"][0]}（考前三週）早 19 天。', o['ok']
    assert o['daily'][:3] == ['late', 22, {'every': 1}] and o['daily'][3] == f'照最近每天約 10 題新內容的速度，預計 {f} 學完 N4 的單字、文法、漢字，比 {r["d"][1]}（考前三週）晚 6 天。要趕上，每天約需 22 題新內容（現在約 10 題）：每天做完當天的練習後按 1 次加練就趕得上。', o['daily']
    assert o['every'][1:3] == [13, {'every': 5}] and o['every'][3].endswith('要趕上，每天約需 13 題新內容（現在約 10 題）：大約每 5 天，做完當天的練習後按 1 次加練就趕得上。'), o['every']
    assert o['twice'][1:3] == [37, {'times': 2}] and o['twice'][3].endswith('要趕上，每天約需 37 題新內容（現在約 10 題）：每天做完當天的練習後按 2 次加練就趕得上。'), o['twice']
    assert o['heavy'][1:3] == [110, {'times': 7, 'heavy': True}] and o['heavy'][3].endswith('要趕上，每天約需 110 題新內容（現在約 10 題），等於每天加練 7 次，太吃力了：可以考慮先考 N5，或把考試日期往後延（JLPT 每年 7 月、12 月各一次）。'), o['heavy']
    assert '學完 N5 的' in o['heavy5'][3] and o['heavy5'][3].endswith('等於每天加練 7 次，太吃力了：可以考慮把考試日期往後延（JLPT 每年 7 月、12 月各一次）。'), o['heavy5']

def test_course_text_for_a_passed_or_close_exam_and_a_finished_level(b):   # Review Focus 2: 21 days is close, 22 is not
    js = "(() => { " + FRESH + PACE + """ pace(10); const out = {}; const run = (n, lv) => { exam(n); state.settings.examLevel = lv; const p = coursePace(); return [p.state, courseText(p)]; };
      only(w5.concat(w4, g5)); out.passed = run(-1, 'N4'); out.close = run(21, 'N4'); out.notClose = run(22, 'N4')[0];
      state.srs = {}; only(w4); out.done5 = run(51, 'N5'); state.srs = {}; only([]); out.done4 = run(51, 'N4');
      return JSON.stringify({ out, n4: sl(6) }); })()"""
    r = json.loads(ev(b, js)); o = r['out']
    assert o['passed'] == ['passed', '考試日期已經過了。到設定裡改成下一次的日期，這裡會重新計算。'], o
    assert o['close'] == ['close', '距離考試只剩 21 天，不到三週：建議只做每天的練習與模擬考。'] and o['notClose'] == 'late', o
    assert o['done5'] == ['done', f'N5 的單字、文法、漢字都學過一次了：接下來照複習排程走，考前三週做模擬考。照現在的速度，預計 {r["n4"]} 學完 N4。'], o
    assert o['done4'] == ['done', '單字、文法、漢字都學過一次了：接下來照複習排程走，考前三週做模擬考。'], o

def test_course_pace_falls_back_to_the_days_count_without_new_items(b):
    js = "(() => { " + FRESH + PACE + """ for (let i = 1; i <= 14; i++) state.dailyLogs[addDays(T, -i)] = { vocabCount: 5, fresh: 0 }; exam(400);
      const p = coursePace(); return JSON.stringify([p.fallback, p.perDay, courseText(p)]); })()"""
    fb, per, text = json.loads(ev(b, js))
    assert fb is True and per == 15 and text.startswith('最近 14 天沒有學新內容，照每天排到的 15 題新內容推算，預計 ') and not any(s in text for s in ['null', 'NaN', 'undefined']), text

def test_course_pace_in_the_intro_stage_adds_what_is_left_of_it(b):
    js = "(() => { " + FRESH + PACE + """ state.stage = 'pre'; pace(10); exam(400); only(w5);
      seen(REG.kana.slice(20)); seen(REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5')); seen(REG.grammar.filter(g => g.u === 'm0'));   // 20 kana left
      return JSON.stringify([introLeft(), coursePace().days]); })()"""
    assert json.loads(ev(b, js)) == [0, {'N5': 5, 'N4': 5}]
```

另外把 `test_queues.py` 的 `test_exam_pace_counts_days_without_new_items` 改成呼叫 `coursePace().perDay`。

- [ ] **Step 2: 跑測試，確認會失敗**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py test_course_pace_finds_the_slowest_bank test_course_text_when_on_time_and_when_late test_course_text_for_a_passed_or_close_exam_and_a_finished_level test_course_pace_falls_back_to_the_days_count_without_new_items test_course_pace_in_the_intro_stage_adds_what_is_left_of_it`
Expected：5 個 FAIL，原因是 `coursePace is not defined`。

- [ ] **Step 3: 實作**

`coursePace()`：照 spec §5.1–§5.3。速度的算法從 `paceAdvice` 搬過來，再加上 `fallback`。核心是下面這段，其他部分照 spec 寫：

```js
// per-bank model (spec §5.2): each bank shrinks in proportion, so its N5 part is done at ΣU·N/U of the way
const U = { v, g, k }, N = { v: n5v, g: n5g, k: n5k };   // unseen counts; 入門 words left out of both while inPreStage()
const sum = U.v + U.g + U.k;
const w5 = Math.max(0, ...['v', 'g', 'k'].filter(i => U[i] > 0).map(i => sum * N[i] / U[i]));
const work = { N5: pre + w5, N4: pre + sum };   // pre = unseen kana + unseen 入門 words + introLeft() while inPreStage(), else 0
// days[L] = Math.ceil(work[L] / perDay); need = Math.ceil(work[level] / daysToDeadline)
```

- `state` 照 spec §5.3 的順序判斷。
- `plan` 照 spec §5.3，`heavy` 只在 `times >= 3` 時出現。
- `courseAdvice(p)`：§5.4 `late` 後半那段，各種情況的完整文字就是測試裡的字串。
- `courseText(p)`：
  - 照 spec §5.4 和 Global Constraints 的改寫，日期用斜線，P 是 `Math.round(p.perDay)`。
  - 照最近速度的那句是「照最近每天約 P 題新內容的速度，」；`fallback` 時換成「最近 14 天沒有學新內容，照每天排到的 P 題新內容推算，」。
  - 接著寫「預計 X 學完 {級別} 的單字、文法、漢字，比 D（考前三週）早／晚 N 天。」

- [ ] **Step 4: 跑測試，確認通過**

Run: 跟 Step 2 一樣，加上 `.venv/bin/python3 -I tests/e2e/test_queues.py test_exam_pace_counts_days_without_new_items`
Expected：`ALL PASS`。然後跑 `bash scripts/test.sh`，Expected：`ALL_OK`。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stats_levels.py tests/e2e/test_queues.py
git commit -m "feat: coursePace 分題庫推估 N5／N4 學完的日子，courseText／courseAdvice 的加練建議"
```

---

### Task 5: 課程進度卡、模擬考頁的考試倒數、AI 建議提示

**Files:**
- Modify: `index.html`
  - 加 `courseCardHtml()`，取代 `planAdviceHtml`（7969）。
  - `renderStats`：拿掉「課程進度預估」卡和 `grammarPace` 的用法；「還沒學的文法題」那張數字卡改成直接數。
  - `examCountdownHtml`（6711）。
  - `aiStudyAdvice`（9194）。
  - 動作表加 `'settings-learn'`。
  - 刪掉 `courseLeft`、`paceAdvice`、`finishText`、`grammarPace`、`planAdviceHtml`。
  - 加上新卡片的 CSS。
- Test: `tests/e2e/test_stats_levels.py`
- Modify:
  - `tests/e2e/test_fixes.py`：`test_stats_projects_the_finish_date_from_the_recent_pace`、`test_exam_page_projects_the_finish_date_and_suggests_extra_practice_when_late`。
  - `tests/e2e/test_queues.py`：`test_exam_countdown_projects_the_finish_date`。
  - `tests/e2e/test_pre_n5.py`：`test_stats_tables_name_kana_rows_and_formats`。

**Interfaces:**
- Consumes：`coursePace()`、`courseText()` 和 `courseAdvice()`（Task 4）。
- Produces：
  - 卡片 `#courseCard`，裡面有：
    - 狀態標籤 `.card-head .chip`。
    - 說明列 `.course-sub`。
    - `passed`、`close`、`done` 時多一段 `p.course-text`，寫 `courseText(p)`。
      - `passed`、`close` 時不畫時間軸，也不列兩行文字。
      - `done` 時時間軸和兩行文字都照樣有；已經學完的那一級不畫點，那一行寫「都學過一次了」。
    - 時間軸 `svg.course-line`，點是 `circle.course-dot[data-level=N5|N4]`；目標是 `late` 時，那個點多一個 `late` class。
    - 兩行文字 `.course-row[data-level=…]`。
    - 建議框 `.course-advice`。
    - 收合的明細 `details.course-banks`。
  - 按鈕 `[data-act=settings-learn]`。
  - 模擬考頁的 `.hero-advice` 文字等於 `courseText(coursePace())`。

- [ ] **Step 1: 寫會失敗的測試**

```python
def test_course_card_shows_both_levels_and_the_target(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(51); only(w5.concat(w4)); saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      const row = (lv) => c.querySelector(`.course-row[data-level=${lv}]`).textContent.replace(/\\s+/g, ' ');
      return JSON.stringify({ chip: c.querySelector('.card-head .chip').textContent, sub: c.querySelector('.course-sub').textContent, n5: row('N5'), n4: row('N4'), want: [sl(3), sl(9)],
        dots: [...c.querySelectorAll('.course-dot')].map(x => x.dataset.level), advice: !!c.querySelector('.course-advice'), old: !!document.getElementById('planAdvice') }); })()"""
    r = json.loads(ev(b, js))
    assert r['chip'] == '趕得上' and '目標 N4' in r['sub'] and '照最近 14 天每天約 10 題新內容推算' in r['sub'], r
    assert f"預計 {r['want'][0]} 學過一次" in r['n5'] and '還有 30 題' in r['n5'] and f"預計 {r['want'][1]} 學過一次" in r['n4'] and '還有 90 題' in r['n4'] and '目標，比期限早 21 天' in r['n4'], r
    assert r['dots'] == ['N5', 'N4'] and not r['advice'] and not r['old'], r

def test_course_card_gives_extra_practice_advice_when_late(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(26); only(w5.concat(w4, g5)); saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      return JSON.stringify({ chip: c.querySelector('.card-head .chip').textContent, advice: c.querySelector('.course-advice').textContent, late: c.querySelector('.course-dot[data-level=N4]').classList.contains('late'),
        note: c.querySelector('.course-row[data-level=N4]').textContent.includes('目標，比期限晚 6 天') }); })()"""
    assert json.loads(ev(b, js)) == {'chip': '稍慢', 'advice': '要趕上，每天約需 22 題新內容（現在約 10 題）：每天做完當天的練習後按 1 次加練就趕得上。', 'late': True, 'note': True}

def test_change_target_opens_the_learning_settings_and_details_list_every_bank(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      const rows = [...c.querySelectorAll('details.course-banks tbody tr')].map(r => [r.cells[0].textContent, r.cells[1].textContent]);
      c.querySelector('[data-act=settings-learn]').click(); const open = !!document.querySelector('.modal select[data-key=examLevel]'); closeModal(true);
      return JSON.stringify({ names: rows.map(r => r[0]), kana: rows[0][1], open }); })()"""
    assert json.loads(ev(b, js)) == {'names': ['假名', '單字', '文法', '漢字', '聽力', '閱讀'], 'kana': '0 / 142', 'open': True}

def test_exam_countdown_follows_the_target_level(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(26); only(w5.concat(w4, g5)); state.settings.examLevel = 'N5'; saveState(); location.hash = '#/exam'; route(); const v = document.getElementById('view');
      return JSON.stringify({ level: v.textContent.includes(`距離 ${sl(26)} JLPT N5`), same: document.querySelector('.hero-advice').textContent === courseText(coursePace()), units: /每個單元/.test(v.textContent),
        chip: [...v.querySelectorAll('.card')].find(x => /考試倒數/.test(x.textContent)).querySelector('.chip').textContent }); })()"""
    assert json.loads(ev(b, js)) == {'level': True, 'same': True, 'units': False, 'chip': '稍慢'}

def test_ai_advice_names_the_target_level(b):
    js = "(async () => { " + FRESH + """ state.settings.examLevel = 'N5'; let prompt = ''; isAiConfigured = () => true; callAi = async (p) => { prompt = p; return '- 好'; };
      await aiStudyAdvice(document.createElement('button')); return /距離 JLPT N5（/.test(prompt); })()"""
    assert ev(b, js) is True

def test_a_brand_new_account_renders_the_stats(b):   # Review Focus 1: a fresh profile, nothing set up
    js = """(() => { location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      return JSON.stringify({ bad: /null|NaN|undefined/.test(c.textContent), empty: (document.querySelector('#weekCard .week-empty') || {}).textContent }); })()"""
    assert json.loads(ev(b, js)) == {'bad': False, 'empty': '這 7 天還沒有練習'}

def test_a_far_finish_is_pinned_to_the_end_of_the_timeline(b):   # Review Focus 3
    js = "(() => { " + FRESH + PACE + """ pace(1); exam(100); saveState(); location.hash = '#/stats'; route(); const d = document.querySelector('#courseCard .course-dot[data-level=N4]');
      const label = [...document.querySelectorAll('#courseCard .course-line text')].map(x => x.textContent).find(x => x.includes('N4'));
      return JSON.stringify({ cx: Number(d.getAttribute('cx')), label, row: document.querySelector('#courseCard .course-row[data-level=N4]').textContent.includes(sl(coursePace().days.N4)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['cx'] >= 390 and r['label'] == 'N5、N4 →' and r['row'], r   # both are years away: one label at the end

def test_stats_and_exam_pages_fit_a_phone(b):   # Review Focus 4
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", FRESH + " location.hash = '#/stats'; route(); document.documentElement.scrollWidth"),
                 ("eval", "location.hash = '#/exam'; route(); document.documentElement.scrollWidth")])
    assert out[-2] <= 390 and out[-1] <= 390, out
```

時間軸的座標照 Task 5 Step 3 的規則，所以測試寫 `cx >= 390`（軸的終點是 392）。

舊測試要改的地方：
- `test_stats_projects_the_finish_date_from_the_recent_pace`：改看 `#courseCard`。
  - 斷言 `'每天約 10 題' in text`，以及 `('預計 ' + want 換成斜線) in text`。
  - `examDate` 是 121 天後，會太慢，所以也要有 `'加練'`。
  - 明細表格有 6 行。
  - 卡片現在有「更改目標」按鈕，所以原本的 `not r['button']` 改成「沒有 `[data-act=apply-advice]`」。
- `test_exam_page_projects_the_finish_date_…`：`paceAdvice()` 改成 `coursePace()`，`a.late > 0` 改成 `a.state == 'late'`，`'預計 ' + a.finish` 改成 `'預計 ' + a.finish.N4.replace(/-/g, '/')`。
- `test_exam_countdown_projects_the_finish_date`：`a.finish === want` 改成 `a.finish.N4 === want`，`a.late <= 0` 改成 `a.state === 'ok'`，`a2.late > 0` 改成 `a2.state === 'late'`，`hint.includes(want)` 改用斜線格式的 `want`。
- `test_stats_tables_name_kana_rows_and_formats`：`#planAdvice tbody tr` 改成 `#courseCard details.course-banks tbody tr`。

- [ ] **Step 2: 跑測試，確認會失敗**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py`
Expected：Task 5 新加的 8 個測試 FAIL，原因是找不到 `#courseCard`、模擬考頁沒有「JLPT N5」、提示裡沒有級別；前面 task 的測試照樣通過。

- [ ] **Step 3: 實作**

- `courseCardHtml()`：照 spec §5.5。時間軸的規則：
  - `viewBox="0 0 400 76"`，點的 x 是 `8 + 384 * Math.min(d, max) / max`。
  - `max` 取考試日和各預計日（天數）裡最大的那個，但最多是考試日天數的兩倍。
  - 超過 `max` 的點都放在 x = 392，共用一個標籤：級別用「、」連起來，後面加「 →」，例如 `N4 →` 或 `N5、N4 →`。日期寫在下面的兩行文字裡。
  - 沒有超過 `max` 的點，標籤是 `N5 MM/DD`。
  - x 大於 345 的標籤靠右對齊，小於 40 的靠左對齊，其他置中。
  - 已經學完的那一級不畫點。
- 建議框 `.course-advice` 的內容就是 `courseAdvice(p)`，只在 `late` 時出現。
- 明細表格：直接搬 `planAdviceHtml` 那張表，放進 `<details class="course-banks"><summary>各題庫明細</summary>…`。
- `renderStats`：原本「課程進度預估」卡的位置放 `courseCardHtml()`，拿掉 `${planAdviceHtml()}`。「還沒學的文法題」改成 `REG.grammar.filter(g => !state.srs[g.key]).length`。
- `examCountdownHtml()`：照 spec §5.6，狀態標籤的對應跟課程進度卡共用一個小函式 `courseChip(p)`。
- `aiStudyAdvice`：`距離 JLPT（${pace.exam}）` 改成 `距離 JLPT ${state.settings.examLevel}（${pace.exam}）`。
- `ACTIONS['settings-learn'] = () => openSettings('learn')`。
- 刪掉 `courseLeft`、`paceAdvice`、`finishText`、`grammarPace`、`planAdviceHtml`。刪完用 `grep -n "paceAdvice\|finishText\|grammarPace\|courseLeft\|planAdviceHtml" index.html tests/e2e/*.py` 確認已經沒有地方在用。

- [ ] **Step 4: 跑測試，確認通過**

Run:
```bash
.venv/bin/python3 -I tests/e2e/test_stats_levels.py
.venv/bin/python3 -I tests/e2e/test_fixes.py test_stats_projects_the_finish_date_from_the_recent_pace test_exam_page_projects_the_finish_date_and_suggests_extra_practice_when_late
.venv/bin/python3 -I tests/e2e/test_queues.py test_exam_countdown_projects_the_finish_date
.venv/bin/python3 -I tests/e2e/test_pre_n5.py test_stats_tables_name_kana_rows_and_formats
```
Expected：都是 `ALL PASS`。然後跑 `bash scripts/test.sh`，Expected：`ALL_OK`。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_stats_levels.py tests/e2e/test_fixes.py tests/e2e/test_queues.py tests/e2e/test_pre_n5.py
git commit -m "feat: 課程進度卡合併學完的預估，模擬考頁與 AI 建議照目標級別推估"
```

---

### Task 6: 發布 1.0.26

**Files:**
- Modify: `index.html` 的 `CHANGELOG`（947）。
- Test: `tests/e2e/test_stats_levels.py`

- [ ] **Step 1: 寫會失敗的測試**

```python
def test_the_1_0_26_changelog_says_what_changed(b):
    items = json.loads(ev(b, "JSON.stringify((CHANGELOG.find(x => x.v === '1.0.26') || {}).items || [])"))
    text = ''.join(items)
    assert all(s in text for s in ['總進度', '入門', 'N5', 'N4', '過去 7 天', '最近 100 題', '課程進度', '加練', '考試']), items
```

- [ ] **Step 2: 跑測試，確認會失敗**

Run: `.venv/bin/python3 -I tests/e2e/test_stats_levels.py test_the_1_0_26_changelog_says_what_changed`
Expected：FAIL，`items` 是 `[]`。

- [ ] **Step 3: 在 `CHANGELOG` 最前面加 1.0.26（日期 2026-10-31）**

寫 3 條給人看的說明，口吻照 1.0.24、1.0.25 那幾條：
1. 總進度可以切四種範圍。
2. 過去 7 天的新畫法，正確率改看 100 題。
3. 課程進度卡會推估 N5／N4 什麼時候學完、太慢時建議加練；設定可以選要考的級別，模擬考頁也跟著目標級別推估。

- [ ] **Step 4: 驗證**

- `.venv/bin/python3 -I tests/e2e/test_stats_levels.py`，Expected：`ALL PASS`。
- `bash scripts/test.sh`，Expected：`ALL_OK`。出現單獨重跑會過的負載型失敗時，重跑整套直到 `ALL_OK`；真的失敗就修好再跑。
- 截圖檢查：用 `cdp.py` 的 `('metrics', (390, 844))` 加 `('shot', …)`，截學習分析頁（四種範圍各一張）和模擬考頁，用眼睛看有沒有重疊、被切掉或左右捲動。

- [ ] **Step 5: Commit、合併、發布**

```bash
git add index.html tests/e2e/test_stats_levels.py
git commit -m "release: 1.0.26 學習分析總進度分總進度／入門／N5／N4、過去 7 天改成摘要＋趨勢線、正確率看 100 題、課程進度卡照分題庫推估 N5／N4 並建議加練、設定可選考 N5 或 N4"
git checkout main && git merge --ff-only feat/stats-levels && git push origin main
```

推上去後，用 `gh api repos/fender8185/nihongo-quest/pages/builds/latest` 看建置狀態，要是 `built`，而且 commit 是剛推的那個。再看網站上的 `sw.js` 第 2 行，要是 `nq-v1.0.26`。
