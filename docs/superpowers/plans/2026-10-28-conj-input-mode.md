# 活用題輸入模式 ＋ 生成式變化練習 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 活用題在熟練度 1 以上改成拼／打出答案；再練一次與換個方式再考沿用輸入；新增以形態為單位排程、動詞隨機抽的「變化練習」。

**Architecture:** 全部在 `index.html`（單檔 app）。沿用既有的「custom 題」機制（`q.custom`、`customInteractionHtml`、`finishCustom` → `answerCurrent`）加兩個新格式 `g-conj-type`／`g-adj-type`；判答核心是三個純函式（`kanaKey`、`answerKana`、`conjMatch`）。變化練習是新的 item kind `c`，掛在 `REG.drills`，由 `dailyPlan` 以「到期＋新」納入每日清單，題目在 `makeConjDrillQuestion` 即時生成。

**Tech Stack:** vanilla JS in `index.html`；JConj（`index.html:597–914`）；e2e 測試為 Python CDP（`tests/e2e/cdp.py`），新檔 `tests/e2e/test_conj.py`，由 `scripts/test.sh` 平行執行。

**Spec:** `docs/superpowers/specs/2026-10-28-conj-input-mode.md`

## Global Constraints

- 分支 `feat/conj-input`；`APP_VERSION = '1.0.4'`（`index.html:920`）與 `sw.js:2` 的 `CACHE = 'nq-v1.0.4'` 同步；`CHANGELOG[0].v` 必須等於 APP_VERSION（既有測試檢查）。
- 文案全部繁體中文，照規格第 4 節逐字。
- `data.js` 不動（DATA_VERSION 不變）。
- `state.srs` 紀錄欄位不變；舊 state 沒有 `settings.conjInput`、`settings.conjDrillPerDay`、`today.newC` 時以預設值運作，不報錯。
- 每日清單仍只有「到期」與「新」兩種理由（2026-10-27 排程規格）。
- 測試執行：`bash scripts/test.sh > /tmp/t.log; echo $?` 看 exit code；`cdp.py` 偶發 `UnboundLocalError: tabs` 是 harness flake，重跑。
- 測試檔 PORT 用 8797（其他檔用 8791、8794、8795、8796、8798、8799）。

## Review Focus

1. 鍵盤輸入含全形／半形空白、片假名（「　イッテ 」）→ 仍判對。測試在 Task 1。
2. 答案含括號讀音（`来[こ]ない`）→ 磁貼顯示振假名不顯示 `[`，鍵盤輸入「こない」判對。測試在 Task 1、Task 2。
3. 全新 state（還沒學過任何動詞）→ 變化練習仍能出題（退回全部動詞），`makeQuestion` 不回 null。測試在 Task 4。
4. `g-identify` 變體在設定 `tiles` 下仍會出現（b ≥ 2 時）。測試在 Task 2。
5. 變化練習的錯題（key `c:te`）在錯題本翻卡與錯題練習不崩：`mistakeCardFaces` 回傳字串、`buildMistakeQueue` 的項目能 `makeQuestion`。測試在 Task 4。

---

### Task 1: 分支、版本、測試骨架、判答核心

**Files:**
- Modify: `index.html:920`（APP_VERSION）、`index.html:925–928`（CHANGELOG 新群組）、`sw.js:2`
- Modify: `index.html` 在 `function jaPlain`（`:985`）之後新增四個函式
- Create: `tests/e2e/test_conj.py`
- Modify: `scripts/test.sh`（兩處 for 迴圈清單加 `tests/e2e/test_conj.py`）

**Interfaces:**
- Produces:
  - `kanaKey(s: string): string` — 去 `\s` 與 `　`、片假名（U+30A1–U+30F6）轉平假名（減 0x60）、再 `JConj.normJa`。
  - `answerKana(ans: string): string` — 以 `readingMapFrom(ans)`（`index.html:~2735`，已存在）把每段漢字換成讀音；查不到的漢字保留。
  - `conjMatch(typed: string, ans: string): boolean` — `kanaKey(typed) === kanaKey(ans) || kanaKey(typed) === kanaKey(answerKana(ans))`，`typed` 空字串回 false。
  - `conjTokens(ans: string): string[]` — 漢字連續段（含其後 `[ぁ-ゖー]+]`）一塊、其餘每個字元一塊。
  - `conjTiles(ans: string, wrongs: string[]): string[]` — `conjTokens(ans)` 加上 `wrongs` 各自 `conjTokens` 後、不在答案塊裡的假名塊（去重，取前 4，至少 3；不足時從 `KANA_ROMAJI` 鍵補），`shuffle`。
  - `firstDiff(a: string, b: string): number` — 第一個不同字元的索引（以 `[...s]` 計），全同回 -1。

- [ ] **Step 1: 開分支、改版本**

```bash
git checkout -b feat/conj-input
```
`index.html:920` → `'1.0.4'`（註解裡的 `nq-v1.0.3` 也改）；`sw.js:2` → `'nq-v1.0.4'`；`CHANGELOG` 最前面插入 `{ v: '1.0.4', date: '2026-10-28', items: ['（施工中）'] },`。

- [ ] **Step 2: 建測試檔骨架**

`tests/e2e/test_conj.py`：複製 `tests/e2e/test_vocab.py` 的開頭（docstring、import、`ROOT`、`PORT = 8797`、`URL`、`READY`、`ev`）與結尾的 `TESTS = [...]`／`__main__` 區塊；`scripts/test.sh` 兩個 for 清單尾端加 `tests/e2e/test_conj.py`。

- [ ] **Step 3: 寫判答核心的失敗測試**

```python
def test_conj_match_accepts_kana_kanji_katakana_and_spaces(b):
    js = """JSON.stringify({
      a: conjMatch('いって', '行って'), b: conjMatch('行って', '行って'), c: conjMatch('　イッテ ', '行って'),
      d: conjMatch('いきて', '行って'), e: conjMatch('こない', '来[こ]ない'), f: conjMatch('来ない', '来[こ]ない'),
      g: conjMatch('', '行って'), h: conjMatch('べんきょうして', '勉強して'),
      k: answerKana('勉強して'), d1: firstDiff('行いて', '行って'), d2: firstDiff('行って', '行って') })"""
    r = json.loads(ev(b, js))
    assert r['a'] and r['b'] and r['c'] and not r['d'] and r['e'] and r['f'] and not r['g'] and r['h'], r
    assert r['k'] == 'べんきょうして' and r['d1'] == 1 and r['d2'] == -1, r

def test_conj_tiles_keep_kanji_runs_whole_and_add_wrong_kana(b):
    js = """(() => { const t1 = conjTokens('来[こ]ない'), t2 = conjTokens('勉強して');
      const tiles = conjTiles('行って', JConj.verbDistractors('行く', '5', 'te', '行って'));
      return JSON.stringify({ t1, t2, n: tiles.length, has: ['行', 'っ', 'て'].every(x => tiles.includes(x)), extra: tiles.filter(x => !['行', 'っ', 'て'].includes(x)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['t1'] == ['来[こ]', 'な', 'い'] and r['t2'] == ['勉強', 'し', 'て'], r
    assert r['has'] and 3 <= len(r['extra']) <= 4 and r['n'] == 3 + len(r['extra']), r
```

- [ ] **Step 4: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_conj.py`
Expected: 兩個 FAIL，訊息含 `conjMatch is not defined`。

- [ ] **Step 5: 實作六個函式**（`index.html`，`jaPlain` 之後）

依 Interfaces 的簽名；`conjTokens` 用 regex `/[一-鿿々〆ヶ]+(?:\[[ぁ-ゖー]+\])?|[\s\S]/gu`。

- [ ] **Step 6: 跑測試確認通過**

Run: `python3 -I tests/e2e/test_conj.py`
Expected: `ok   test_conj_match_…`、`ok   test_conj_tiles_…`、`ALL PASS`。

- [ ] **Step 7: Commit**

```bash
git add index.html sw.js scripts/test.sh tests/e2e/test_conj.py
git commit -m "feat: 活用題判答核心（假名正規化、漢字塊磁貼）＋ 1.0.4 版號與測試骨架"
```

---

### Task 2: 活用題輸入格式（磁貼／鍵盤）

**Files:**
- Modify: `index.html:997–1022`（`defaultSettings` 加 `conjInput: 'auto'`）
- Modify: `index.html:2637–2690`（`makeGrammarQuestion` 的 conj/adj 分支）
- Modify: `index.html:3535`（`customInteractionHtml` 新分支）、`index.html:3575`（`feedbackHtml` 加「你的答案」列）
- Modify: `index.html:3627`（`recordFormat` 條件）
- Modify: `index.html:3891`（`ACTIONS` 加 `conj-tap`、`conj-back`、`conj-submit`）、`index.html:3962`（`custom-giveup` 加分支）
- Modify: `index.html:4022`（`handleKey`：`.conj-in` 上的 Enter 送出，放在 INPUT 早退之前）
- Modify: `index.html:6428–6437`（設定頁加 `selRow('conjInput', …)`）、`index.html:6806`（`FMT_NAME` 加兩格式）
- Modify: `index.html:414–420`（CSS：`.conj-tile` 沿用 `.spell-tile` 的選擇器，加 `.conj-in`、`.fb-diff mark`）
- Test: `tests/e2e/test_conj.py`

**Interfaces:**
- Consumes: Task 1 的 `conjMatch`、`conjTokens`、`conjTiles`、`firstDiff`。
- Produces:
  - `conjInputMode(rec): 'choice' | 'tiles' | 'type'` — 依 `state.settings.conjInput`：`choice`/`tiles`/`type` 直接回；`auto` 時 `rec && rec.b >= 1 ? 'tiles' : 'choice'`。
  - 題目欄位：`q.fmt ∈ {'g-conj-type','g-adj-type'}`、`q.custom = q.fmt`、`q.inputMode ∈ {'tiles','type'}`、`q.tiles: string[]`（tiles 模式）、`q.options = [{text: ans, jp: true}, {text: '', jp: true}]`、`q.answer = 0`、`q.answerText = ans`、`q.fullJp`、`q.mistakePrompt`（沿用 `${pre}（${base}→　）${post}`）。
  - entry 欄位：`e.conj: number[]`（已點的磁貼索引）、`e.typed: string`（鍵盤）。
  - `ctx.forceFmt === 'g-conj-type' | 'g-adj-type'` 強制輸入版；`ctx.forceFmt === 'g-conj' | 'g-adj'` 強制四選一（模擬考沿用）。
  - 新 setting `conjInput`，選項值 `auto | choice | tiles | type`。

- [ ] **Step 1: 寫失敗測試**

```python
CONJ_ITEM = "REG.grammar.find(g => g.t === 'conj' && g.g === '5' && g.f === 'te')"
def setup(mode):   # 一題て形五段動詞，已答對一次（b = 1），指定作答方式，開一場 items 練習
    return f"""const g = {CONJ_ITEM}; state.settings.conjInput = '{mode}'; srsAnswer(g.key, true); state.srs[g.key].b = 1;
      startSession('items', {{ items: [g] }}); const e = currentEntry(); e.q = makeGrammarQuestion(g, {{}}); renderPractice(); const q = e.q;
      const ans = JConj.conjVerb(g.v, g.g, g.f);"""
TEARDOWN = "SESSION = null; document.body.classList.remove('practicing');"

def test_learned_conj_item_is_asked_with_tiles_and_tapping_the_answer_is_right(b):
    js = "(() => { " + setup('auto') + """
      const out = { fmt: q.fmt, custom: q.custom, mode: q.inputMode, opts: document.querySelectorAll('.opt').length, tiles: document.querySelectorAll('.conj-tile').length, n: q.tiles.length, noBracket: ![...document.querySelectorAll('.conj-tile')].some(t => t.textContent.includes('[')) };
      for (const tok of conjTokens(ans)) { [...document.querySelectorAll('.conj-tile:not([disabled])')].find(t => t.dataset.tok === tok).click(); }
      out.done = e.done; out.ok = e.chosen === q.answer; out.gf = state.srs[g.key].gf['g-conj-type']; out.sf = state.statsFmt['g-conj-type'];
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fmt'] == 'g-conj-type' and r['custom'] == 'g-conj-type' and r['mode'] == 'tiles' and r['opts'] == 0 and r['tiles'] == r['n'] and r['noBracket'], r
    assert r['done'] and r['ok'] and r['gf'] == [1, 0] and r['sf'] == {'ok': 1, 'ng': 0}, r

def test_new_item_or_choice_setting_keeps_four_options(b):
    js = f"""(() => {{ const g = {CONJ_ITEM}; state.settings.conjInput = 'auto'; const q1 = makeGrammarQuestion(g, {{}});
      srsAnswer(g.key, true); state.srs[g.key].b = 1; state.settings.conjInput = 'choice'; const q2 = makeGrammarQuestion(g, {{}});
      state.settings.conjInput = 'tiles'; const q3 = makeGrammarQuestion(g, {{ forceFmt: 'g-conj' }});
      return JSON.stringify({{ f1: q1.fmt, f2: q2.fmt, f3: q3.fmt, o: q2.options.length }}); }})()"""
    r = json.loads(ev(b, js))
    assert r == {'f1': 'g-conj', 'f2': 'g-conj', 'f3': 'g-conj', 'o': 4}, r

def test_typing_mode_accepts_kana_and_marks_the_first_wrong_character(b):
    js = "(() => { " + setup('type') + """
      const inp = document.querySelector('input.conj-in'); const out = { mode: q.inputMode, hasInput: Boolean(inp), tiles: document.querySelectorAll('.conj-tile').length };
      inp.value = '　' + answerKana(ans) + ' '; document.querySelector('[data-act=conj-submit]').click(); out.ok1 = e.done && e.chosen === q.answer;
      // 第二場：故意打錯（包在區塊裡，避免 const 重複宣告）
      """ + TEARDOWN + " { " + setup('type') + """
      const bad = answerKana(ans).slice(0, -1) + 'た'; document.querySelector('input.conj-in').value = bad; document.querySelector('[data-act=conj-submit]').click();
      out.ok2 = e.chosen === q.answer; out.head = document.querySelector('.fb-head').textContent.includes(jaPlain(ans)); out.diff = Boolean(document.querySelector('.fb-diff mark')); out.wrong = q.options[1].text === bad; }
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['mode'] == 'type' and r['hasInput'] and r['tiles'] == 0 and r['ok1'], r
    assert not r['ok2'] and r['head'] and r['diff'] and r['wrong'], r

def test_give_up_and_empty_submit(b):
    js = "(() => { " + setup('type') + """
      document.querySelector('[data-act=conj-submit]').click(); const stillOpen = !e.done;
      document.querySelector('[data-act=custom-giveup]').click(); const out = { stillOpen, done: e.done, ok: e.chosen === q.answer, mistakes: state.mistakes.filter(m => m.key === g.key).length };
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['stillOpen'] and r['done'] and not r['ok'] and r['mistakes'] == 1, r

def test_identify_variant_still_appears_under_tiles_setting(b):
    js = f"""(() => {{ const g = {CONJ_ITEM}; state.settings.conjInput = 'tiles'; srsAnswer(g.key, true); state.srs[g.key].b = 3;
      const r0 = Math.random; Math.random = () => 0; const q = makeGrammarQuestion(g, {{}}); Math.random = r0; return q.fmt; }})()"""
    assert ev(b, js) == 'g-identify'

def test_settings_page_offers_the_input_mode(b):
    js = "(() => { location.hash = '#/settings'; route(); const s = document.querySelector('select[data-key=conjInput]'); return JSON.stringify(s ? [...s.options].map(o => o.value) : null); })()"
    assert json.loads(ev(b, js)) == ['auto', 'choice', 'tiles', 'type']
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_conj.py`
Expected: 新增六個測試 FAIL（`q.fmt` 仍是 `g-conj`、找不到 `.conj-tile`／`select[data-key=conjInput]`）。

- [ ] **Step 3: 設定與格式名**

`defaultSettings` 加 `conjInput: 'auto'`；`FMT_NAME` 加 `'g-conj-type': '文法・動詞變化（拼寫）', 'g-adj-type': '文法・形容詞變化（拼寫）'`；設定頁在 `selRow('order', …)` 之前加：
```js
${selRow('conjInput', '活用題作答方式', '自動：剛學的題選答案，熟了之後改成自己拼出來。鍵盤輸入在 iPhone 請先到「設定 › 一般 › 鍵盤」加入日文鍵盤。', [['auto', '自動（熟了之後改成拼出來）'], ['choice', '一律選擇'], ['tiles', '一律假名磁貼'], ['type', '鍵盤輸入']])}
```
新增 `function conjInputMode(rec)`（放 `FORM_LABEL` 之後）。

- [ ] **Step 4: `makeGrammarQuestion` 的 conj/adj 分支**

在 `g-identify` 判斷之後、`q.fmt = isV ? 'g-conj' : 'g-adj'` 之前插入：
```js
const typedFmt = isV ? 'g-conj-type' : 'g-adj-type';
const mode = ctx.forceFmt === typedFmt ? (state.settings.conjInput === 'type' ? 'type' : 'tiles') : (ctx.forceFmt === 'g-conj' || ctx.forceFmt === 'g-adj') ? 'choice' : conjInputMode(rec);
if (mode !== 'choice') { /* 填 q.fmt/custom/inputMode/tiles/options/answerText/fullJp/mistakePrompt/instr/stemHtml/why；return q */ }
```
`instr`：tiles → 「點假名，拼出正確的動詞變化」／「…形容詞變化」；type → 「輸入正確的動詞變化」／「…形容詞變化」。`stemHtml` 與四選一相同（`blankChip(base)`）。`q.tiles = conjTiles(ans, wrongs)`（wrongs 為該分支已算好的 distractor 全集）。

- [ ] **Step 5: 互動 HTML、動作、鍵盤**

`customInteractionHtml`：`q.custom === 'g-conj-type' || q.custom === 'g-adj-type'` 分支。tiles 模式輸出與 `v-spell` 相同結構，但 class `conj-tile`、`data-act="conj-tap"`、`data-tok`，`spell-out` 內容用 `furi(built)`；下方「退一格」（`conj-back`）、「看答案」（`custom-giveup`）。type 模式：`<input class="input jp conj-in" lang="ja" autocomplete="off" autocapitalize="off" value="${esc(e.typed || '')}">` ＋ `<button class="btn btn-primary" data-act="conj-submit">確定</button>` ＋「看答案」。
`ACTIONS`：
- `conj-tap`：push 索引；`built = e.conj.map(i => q.tiles[i]).join('')`；當 `e.conj.length >= conjTokens(q.options[0].text).length` → `finishCustom(e, conjMatch(built, q.options[0].text), jaPlain(built))`，否則 `renderPractice()`。
- `conj-back`：pop、`renderPractice()`。
- `conj-submit`：讀 `input.conj-in` 的值到 `e.typed`；空字串（`kanaKey` 後為空）只 `toast('先輸入答案')`；否則 `finishCustom(e, conjMatch(e.typed, ans), e.typed)`。
- `custom-giveup`：新分支 `e.conj = conjTokens(ans).map(t => q.tiles.indexOf(t))`（tiles 顯示正解），`finishCustom(e, false, '（看了答案）')`。
`handleKey` 第一行之前：`if (ev.key === 'Enter' && ev.target && ev.target.classList && ev.target.classList.contains('conj-in')) { ev.preventDefault(); ACTIONS['conj-submit'](); return; }`。

- [ ] **Step 6: 回饋與格式紀錄**

`feedbackHtml`：`!ok && q.custom && (q.custom.endsWith('-type'))` 且 `q.options[1].text` 非空且不是「（看了答案）」時，在 `fb-head` 之後加 `<div class="fb-diff jp">你的答案：${擷取：以 firstDiff(jaPlain(typed), jaPlain(right.text)) 為界，前段原樣、該字包 <mark>、後段原樣}</div>`。
`answerCurrent` 第 3627 行條件改為 `q.kind === 'g' && q.item && ((q.item.t || 'choice') === 'choice' || (q.fmt && q.fmt.endsWith('-type'))) && q.fmt`。
CSS：`.spell-tile` 的三條規則選擇器加上 `, .conj-tile`；`.conj-in { font-size: 24px; text-align: center; max-width: 320px; margin: 0 auto 10px; display: block; }`；`.fb-diff mark { background: var(--bad-line, #e5484d33); color: var(--bad); border-radius: 4px; padding: 0 2px; }`。

- [ ] **Step 7: 跑測試確認通過**

Run: `python3 -I tests/e2e/test_conj.py`
Expected: `ALL PASS`。再跑 `python3 -I tests/e2e/test_vocab.py`（spell 題不受影響）。Expected: `ALL PASS`。

- [ ] **Step 8: Commit**

```bash
git add index.html tests/e2e/test_conj.py
git commit -m "feat: 活用題在熟練度 1 以上改成假名磁貼或鍵盤輸入作答；設定「活用題作答方式」；答錯標出第一個分歧的字"
```

---

### Task 3: 再練一次／換個方式再考沿用輸入版

**Files:**
- Modify: `index.html:3341`（`grammarHasFormats`）、`index.html:3320–3330`（`prepareEntry` 的 requeued 分支）
- Modify: `index.html:2637–2690`（conj/adj 分支處理 `ctx.avoidFmts`）
- Test: `tests/e2e/test_conj.py`

**Interfaces:**
- Consumes: Task 2 的 `conjInputMode`、`typedFmt`、`ctx.forceFmt`。
- Produces:
  - `grammarHasFormats(g)`：`g.t ∈ {conj, adj}` 時回 `state.settings.conjInput !== 'choice'`；其餘不變。
  - conj/adj 分支：`ctx.avoidFmts` 含 `'g-conj'`／`'g-adj'` → 走輸入版；含輸入版且設定為 `auto` → 四選一；含輸入版且設定為 `tiles`/`type` → 回 `null`。
  - `prepareEntry`：`e.requeued && e.orig && e.orig.fmt && e.orig.fmt.endsWith('-type')` → `e.q = makeQuestion(e.item, { forceFmt: e.orig.fmt })`（優先於 `otherFormatQuestion`）。

- [ ] **Step 1: 寫失敗測試**

```python
def test_new_conj_item_answered_right_comes_back_typed_and_a_typed_miss_requeues_typed(b):
    js = f"""(() => {{ const g = {CONJ_ITEM}; state.settings.conjInput = 'auto';
      startSession('items', {{ items: [g, g, g, g, g, g, g, g, g, g, g, g] }}); const e = currentEntry(); e.q = makeGrammarQuestion(g, {{}}); renderPractice();
      answerCurrent(e.q.answer);   // 新題四選一答對 → 排一個 encore
      const enc = SESSION.entries.find(x => x.encore); for (const x of SESSION.entries) if (x.encore) prepareEntry(SESSION.entries.indexOf(x));
      const out = {{ first: e.q.fmt, encore: enc ? enc.q && enc.q.fmt : null }};
      {TEARDOWN}
      // 第二場：輸入版答錯 → 再練一次仍是輸入版
      state.srs[g.key].b = 1; startSession('items', {{ items: [g, g, g, g, g, g, g] }}); const e2 = currentEntry(); e2.q = makeGrammarQuestion(g, {{}}); renderPractice();
      e2.q.options[1].text = 'x'; answerCurrent(1);
      const rq = SESSION.entries.find(x => x.requeued); prepareEntry(SESSION.entries.indexOf(rq));
      out.second = e2.q.fmt; out.requeued = rq.q.fmt; out.rqCustom = rq.q.custom;
      state.settings.conjInput = 'choice'; out.noFormats = grammarHasFormats(g);
      {TEARDOWN} return JSON.stringify(out); }})()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['first'] == 'g-conj' and r['encore'] == 'g-conj-type', r
    assert r['second'] == 'g-conj-type' and r['requeued'] == 'g-conj-type' and r['rqCustom'] == 'g-conj-type' and r['noFormats'] is False, r
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_conj.py test_new_conj_item_answered_right_comes_back_typed_and_a_typed_miss_requeues_typed`
Expected: FAIL（`encore` 為 `None`：conj 題目前沒有 encore）。

- [ ] **Step 3: 實作三處**（依 Interfaces）

- [ ] **Step 4: 跑測試確認通過**

Run: `python3 -I tests/e2e/test_conj.py` 與 `python3 -I tests/e2e/test_fixes.py`
Expected: 兩檔 `ALL PASS`（fixes 檔有 encore／requeue 的既有測試）。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_conj.py
git commit -m "feat: 活用題的「換個方式再考」與「再練一次」都走輸入版"
```

---

### Task 4: 生成式變化練習（kind `c`）

**Files:**
- Modify: `index.html:997–1022`（`conjDrillPerDay: 3`）、`index.html:1046` 與 `index.html:8980`（`state.today` 加 `newC: 0`）、`index.html:1471–1475`（`srsAnswer` isNew 計數加 `c:` → `newC`）
- Modify: `index.html:1388`（`RELEARN_KINDS = /^[vgkc]:/`）
- Modify: `index.html:1337–1356`（`buildRegistry` 加 `drills`）
- Modify: `index.html:2016`（`FORM_LABEL` 之後加 `GROUP_LABEL`、`formHint`）
- Modify: `index.html:2692`（`makeQuestion` 分派 `c`）＋ 新函式 `makeConjDrillQuestion`
- Modify: `index.html:3121`（`dailyPlan` 加 `dueC`/`newC`）、`index.html:3173`（`buildDailyQueue`）、`index.html:3602`（`answerCurrent` 的 kinds 清單與 `recordAction`）
- Modify: `index.html:4130–4135`（今日頁「新內容」「待複習」列）、`index.html:6428–6437`（設定 `numRow('conjDrillPerDay', …)`）
- Test: `tests/e2e/test_conj.py`

**Interfaces:**
- Consumes: Task 1 `conjTiles`/`conjTokens`/`conjMatch`；Task 2 的題目欄位與 `conjInputMode`、互動 HTML（`q.custom` 用同一對格式名，所以 UI 與 ACTIONS 不必改）。
- Produces:
  - `REG.drills: Array<{key: 'c:'+fam, kind: 'c', id: 'c-'+fam, fam, forms: string[], u: unitId, builtin: true}>`，每個也放進 `REG.byKey`。建法：遍歷 `DATA.GRAMMAR` 中 `t === 'conj'` 的題，`fam = formFamily(g.f)`，只收 `FORM_LABEL[fam]` 存在且 `fam !== 'dict'` 的；`forms` 去重；`u` 取 `unitOrder` 最小者。
  - `GROUP_LABEL = { '5': '五段動詞', '1': '一段動詞', 's': 'する動詞', 'k': '来る' }`；`VERB_GROUP = { v5: '5', v1: '1', vs: 's', vk: 'k' }`。
  - `formHint(f): string` = `JConj.conjVerb('食べる', '1', f) || ''`。
  - `drillVerbs(): item[]` — `REG.vocab` 中 `builtin && VERB_GROUP[v.p]` 且 `state.srs[v.key] && state.srs[v.key].b >= 1`；少於 5 個時回全部符合 `VERB_GROUP[v.p]` 的 builtin 動詞。
  - `makeConjDrillQuestion(item, ctx): q | null` — 隨機 `f ∈ item.forms`、隨機 `v ∈ drillVerbs()`，`g = VERB_GROUP[v.p]`，`ans = JConj.conjVerb(v.w, g, f)`；`ans` 為空或 `verbDistractors` 少於 3 時換一個（最多試 8 次，仍失敗回 null）。欄位：`q.kind = 'c'`、`q.fmt = 'g-conj-type'`、`q.custom = q.fmt`、`q.inputMode = state.settings.conjInput === 'type' ? 'type' : 'tiles'`、`q.tiles`、`q.options`、`q.answer = 0`、`q.answerText = ans`、`q.fullJp = ans`、`q.label = '變化練習 · ' + FORM_LABEL[item.fam]`、`q.instr = (tiles ? '點假名，拼出' : '輸入') + '這個動詞的' + FORM_LABEL[item.fam]`、`q.stemHtml = <div class="q-stem word jp">${furi(v.w)}</div><div class="small muted mt-1">→ ${FORM_LABEL[fam]}${f !== fam ? '，像「' + esc(formHint(f)) + '」' : ''}</div>`、`q.zhText = v.m`、`q.cat = '變化練習'`、`q.point = FORM_LABEL[item.fam]`、`q.mistakePrompt = ${jaPlain(v.w)} → ${FORM_LABEL[fam]}${f !== fam ? '（像 ' + formHint(f) + '）' : ''}`、`q.why = 「${v.w}」是${GROUP_LABEL[g]}，${FORM_LABEL[fam]}是「${jaPlain(ans)}」。`、`q.unit = item.u`。
  - `dailyPlan` 回傳多 `dueC`、`newC`：`pool = REG.drills.filter(d => unitOrder(d.u) <= curIdx)`；`dueC = pool.filter(isDueToday).sort(byDue)`；`newC = pool.filter(d => !state.srs[d.key]).sort((a, b) => unitOrder(a.u) - unitOrder(b.u)).slice(0, max(0, conjDrillPerDay - today.newC))`；兩者合計再截到 `conjDrillPerDay`（到期優先）；`remaining` 與負荷 `over` 的加總都計入，不削減。
  - `buildDailyQueue`：`reviews` 的文法側 `plan.dueG.concat(plan.dueC)`；`fresh` 的文法側 `plan.newG.concat(plan.newC)`；三處 `x.kind === 'g'` 的分流改成 `isG(x)`（`x.kind === 'g' || x.kind === 'c'`）。
  - `answerCurrent`：`['v','g','l','r','k','c'].includes(q.kind)`；`recordAction` 的 type/kind 對 `c` 都給 `'g'`；topic 給 `'變化練習'`。
  - 今日頁：待複習與新內容的文法數字後，若 `plan.dueC.length`／`plan.newC.length` > 0 加 `・變化 n`。
  - 設定：`numRow('conjDrillPerDay', '每天變化練習', '以形態為單位排程，動詞從你學過的單字裡隨機抽；只出目前單元以前教過的形態。', 0, 10, 1, '題')`。

- [ ] **Step 1: 寫失敗測試**

```python
def test_drills_exist_per_form_family_and_reach_follows_the_unit(b):
    js = """(() => { const fams = REG.drills.map(d => d.fam).sort(); const te = REG.drills.find(d => d.fam === 'te');
      state.currentUnit = 'm3'; const p3 = dailyPlan(); state.currentUnit = 'm18'; const p18 = dailyPlan();
      return JSON.stringify({ fams, teUnit: te && te.u, teForms: te && te.forms, byKey: Boolean(REG.byKey.get('c:te')), n3: p3.newC.map(d => d.fam), n18: p18.newC.length, cap: state.settings.conjDrillPerDay }); })()"""
    r = json.loads(ev(b, js))
    assert set(r['fams']) >= {'te', 'ta', 'nai', 'pot', 'vol', 'pass', 'caus', 'ba'} and 'dict' not in r['fams'], r
    assert r['teUnit'] == 'm3' and 'te' in r['teForms'] and r['byKey'], r
    assert set(r['n3']) <= {'te', 'masu', 'nai', 'ta'} and 1 <= len(r['n3']) <= 3 and r['n18'] == 3 and r['cap'] == 3, r

def test_drill_question_is_generated_from_a_learned_verb_and_a_miss_schedules_tomorrow(b):
    js = """(() => { const d = REG.drills.find(x => x.fam === 'te'); state.currentUnit = 'm18';
      const fresh = makeQuestion(d, {});   // 還沒學過任何動詞：退回全部動詞，仍要能出題
      const v = REG.vocab.find(x => x.builtin && x.p === 'v5'); srsAnswer(v.key, true); state.srs[v.key].b = 2;
      const qs = []; for (let i = 0; i < 20; i++) qs.push(makeQuestion(d, {}));
      const q = qs[0]; const ok = qs.every(x => x && x.kind === 'c' && x.custom === 'g-conj-type' && x.key === 'c:te' && x.options[0].text && x.tiles.length >= conjTokens(x.options[0].text).length + 3);
      const verbs = new Set(qs.map(x => x.item && x.stemHtml)); 
      startSession('items', { items: [d] }); const e = currentEntry(); renderPractice(); e.q.options[1].text = 'x'; answerCurrent(1);
      const r = state.srs['c:te']; const m = state.mistakes.find(x => x.key === 'c:te'); const faces = mistakeCardFaces(m);
      const mq = buildMistakeQueue(5).find(x => x.item && x.item.key === 'c:te'); const mqq = mq && makeQuestion(mq.item, {});
      const out = { fresh: Boolean(fresh), ok, varied: verbs.size >= 2, due: r.due, tomorrow: todayStr(1), rl: r.rl, mistake: Boolean(m), prompt: m && m.prompt, faces: Boolean(faces && faces.front && faces.back), mqq: Boolean(mqq && mqq.kind === 'c'), label: q.label, newC: state.today.newC, log: logEntry().grammarCount };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fresh'] and r['ok'] and r['varied'], r
    assert r['due'] == r['tomorrow'] and r['rl'] == 0 and r['mistake'] and '→' in r['prompt'] and r['faces'] and r['mqq'], r
    assert r['label'].startswith('變化練習 · て形') and r['newC'] == 1 and r['log'] == 1, r

def test_daily_queue_carries_the_drills_and_the_today_page_counts_them(b):
    js = """(() => { state.currentUnit = 'm18'; const dq = dailyQueue(); const c = dq.items.filter(x => x.kind === 'c').length; const plan = dq.plan;
      location.hash = '#/today'; route(); const txt = document.querySelector('#view').textContent;
      return JSON.stringify({ c, newC: plan.newC.length, remaining: plan.remaining >= plan.newC.length, shows: txt.includes('變化') }); })()"""
    r = json.loads(ev(b, js))
    assert r['c'] >= 1 and r['c'] <= 3 and r['newC'] == r['c'] and r['remaining'] and r['shows'], r
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `python3 -I tests/e2e/test_conj.py`
Expected: 三個新測試 FAIL（`REG.drills` undefined）。

- [ ] **Step 3: 實作**（依 Interfaces；順序：settings/today → registry → labels/helpers → `makeConjDrillQuestion` + 分派 → `dailyPlan`/`buildDailyQueue` → `answerCurrent` → 今日頁與設定頁）

- [ ] **Step 4: 跑測試確認通過**

Run: `python3 -I tests/e2e/test_conj.py && python3 -I tests/e2e/test_fixes.py`
Expected: 兩檔 `ALL PASS`。fixes 檔的 `test_daily_queue_has_only_due_or_new` 類測試若斷言每題 `kind` 在既有集合內，把 `c` 加入該斷言（它確實只有到期或新兩種理由）。

- [ ] **Step 5: Commit**

```bash
git add index.html tests/e2e/test_conj.py tests/e2e/test_fixes.py
git commit -m "feat: 變化練習——以形態為單位排程、動詞從已學單字隨機抽，每天最多 3 題，答錯走錯題階梯"
```

---

### Task 5: 版本紀錄、全套測試、推分支、Pages

**Files:**
- Modify: `index.html:925–945`（CHANGELOG 1.0.4 內容；1.0.0 現況裡每日規則與練習題型兩條）

- [ ] **Step 1: 版本紀錄**

1.0.4 群組三條：
1. 「活用題（動詞、形容詞變化）熟了之後不再給四個選項，改成自己用假名磁貼拼出來；設定頁可改成一律選擇、一律磁貼或鍵盤輸入。答錯時標出第一個拼錯的字。」
2. 「活用題的「換個方式再考」與「再練一次」都用拼寫版，不退回選擇題；學習分析分開看選擇與拼寫的正確率。」
3. 「新增變化練習：每天最多 3 題（可調），以形態（て形、受身形…）為單位排程，動詞從你學過的單字裡隨機抽，只出目前單元以前教過的形態；答錯一樣走 1／3／7 天階梯進錯題本。」
1.0.0 現況：「每日練習的規則」那條在「新單字從兩條主題線交錯供應」後加「；變化練習以形態為單位排程」；若有列題型的條目，加「活用題拼寫」。

- [ ] **Step 2: 全套測試**

Run: `bash scripts/test.sh > /tmp/conj-test.log 2>&1; echo EXIT=$?; tail -12 /tmp/conj-test.log`
Expected: `EXIT=0`、最後一行 `ALL_OK`。`cdp.py` 的 `tabs` flake → 重跑一次再判斷。

- [ ] **Step 3: Commit、push、切 Pages**

```bash
git add index.html
git commit -m "release: 1.0.4 版本紀錄"
git push -u origin feat/conj-input
scripts/pages-branch.sh feat/conj-input
```
告知使用者：線上網址約一分鐘後是 feat/conj-input；main 暫時不在線上；核准後 `git checkout main && git merge --ff-only feat/conj-input && git push && scripts/pages-branch.sh`，之後才刪分支。
