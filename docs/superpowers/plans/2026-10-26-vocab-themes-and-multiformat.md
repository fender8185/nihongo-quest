# Vocabulary Themes and Multi-Format Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the built-in vocabulary by its existing theme field (single-level tab + themed practice), and make every word prove itself in several question formats: a preview card before the first question, two same-session encores in different formats, per-format tracking, and 已熟練 only after three formats passed.

**Architecture:** Everything lives in the single-file app `index.html` (sections marked `// ---- NN_name.js ----`). Data already carries `c` (theme) on all 1400 built-in words; no data changes. Per-format history is stored on the SRS record itself (`state.srs[key].f`), so it syncs with everything else. Tests are headless-Chrome e2e scripts under `tests/e2e/` driven by `tests/e2e/cdp.py`, run by `scripts/test.sh`.

**Tech Stack:** Vanilla JS in `index.html`, Python e2e via CDP, Node test for `sync-core.js` (untouched here).

**Spec:** The agreed proposal in this conversation (2026-10-26): block 一 (theme grouping + themed practice) and block 三 (preview card, 2 encores, per-format tracking, mastered = 3 formats; existing mastered words may drop to 熟悉). Block 二 (new words by theme, two themes interleaved per day) is deferred.

## Global Constraints

- All UI copy in Traditional Chinese, matching existing tone (short, no exclamation marks).
- `APP_VERSION` and `sw.js` `CACHE` must be bumped together (`'13'` / `'nq-v13'`) with a `CHANGELOG` entry dated 2026-10-26; `scripts/test.sh` fails otherwise.
- Follow TDD: each task's e2e test is written and seen failing before the code.
- Encore and preview entries never call `srsAnswer`; only the first answer of a word in a session schedules it.
- Custom/imported cards have no theme; they stay in the 自訂／匯入 deck and are excluded from theme views.

## Review Focus

1. A session with many new words grows by two questions per new word; the Today button count is measured at start. Pinned by Task 5 test (entries grow by exactly 2 per new word, none for words already in `state.srs`).
2. A word whose only buildable format is `v-meaning` (custom card, no speech) must not loop or produce a duplicate encore. Pinned by Task 5 test (`makeQuestion` with every vocab format avoided returns `null`).
3. Legacy SRS records for words (no `f`) must not display 已熟練; grammar/kanji records are untouched. Pinned by Task 3 test.
4. Theme view must account for every built-in word exactly once, including the two `舊版` words. Pinned by Task 1 test.
5. Preview card must not block keyboard flow (Enter/Space continues; digits do nothing). Pinned by Task 4 test.

---

### Task 1: Theme model and 主題 tab

**Files:**
- Modify: `index.html` — `// ---- 73_vocab.js ----` region near `const DECKS` (~line 3559), `vocabTabs`, `renderVocab`, `renderVocabList`
- Create: `tests/e2e/test_vocab.py` (PORT 8799; copy the harness shape of `tests/e2e/test_fixes.py`)
- Modify: `scripts/test.sh` — add `tests/e2e/test_vocab.py` to the loop

**Interfaces:**
- Produces: `vocabTheme(v) -> string` (built-in word's `c`, with `'舊版'` → `'其他'`), `vocabThemes() -> [{ c, total, seen, learned, mastered, due, N5, N4 }]` ordered by `THEME_ORDER` then alphabetical, `renderVocabThemes(view)` at route `#/vocab/themes`, `renderVocabList` honours `params.c`.

- [ ] **Step 1: Write the failing tests** in `tests/e2e/test_vocab.py`

```python
def test_themes_cover_every_builtin_word_once(b):
    js = """(() => { const th = vocabThemes(); const n = REG.vocab.filter(v => v.builtin).length;
      return JSON.stringify({ sum: th.reduce((a, t) => a + t.total, 0), n, old: th.some(t => t.c === '舊版'), first: th[0].c, hasOther: th.some(t => t.c === '其他') }); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r['sum'] == r['n'] and not r['old'] and r['hasOther'] and r['first'] == '問候', r

def test_theme_tab_lists_cards_and_opens_the_word_table(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "location.hash = '#/vocab/themes'; true"), ("wait", "document.querySelectorAll('.theme-card').length > 0"),
        ("eval", "JSON.stringify({ cards: document.querySelectorAll('.theme-card').length, themes: vocabThemes().length, pressed: document.querySelector('.seg [aria-pressed=\\"true\\"]').textContent })"),
        ("eval", "document.querySelector('.theme-card[data-c=\\"飲食\\"] [data-act=nav]').click(); true"),
        ("wait", "location.hash.includes('c=')"),
        ("eval", "JSON.stringify({ hash: decodeURIComponent(location.hash), rows: document.querySelectorAll('tbody tr').length, total: vocabThemes().find(t => t.c === '飲食').total, sub: document.querySelector('.page-sub').textContent })")])
    a = json.loads(out[-3]); assert a['cards'] == a['themes'] and a['pressed'] == '主題', a
    r = json.loads(out[-1]); assert r['hash'] == '#/vocab/list?c=飲食' and r['rows'] == r['total'] and '飲食' in r['sub'], r
```

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -I tests/e2e/test_vocab.py` → both FAIL (`vocabThemes is not defined`).

- [ ] **Step 3: Implement**

In `73_vocab.js` region add:
- `const THEME_ORDER = ['問候','指示','代名詞','疑問','數量','時間','人物','家庭','身體','飲食','生活','地點','位置','移動','交通','學校','工作','購物','衣物','顏色','天氣','自然','興趣','休閒','動作','形容','副詞','接續','狀態','溝通','健康','旅行','社會','抽象','心情','情感','思考','人際','自他動詞','其他'];`
- `function vocabTheme(v)` → `v.c === '舊版' || !v.c ? '其他' : v.c`.
- `function vocabThemes()` → aggregate over `REG.vocab.filter(v => v.builtin)`; `learned` = `r.b >= SRS_LEARNED`, `mastered` = `srsLevelLabel(r) === '已熟練'`, `due` = `r.due <= todayStr()`; sort by `THEME_ORDER.indexOf` (unknown → after, by `localeCompare`).
- `function renderVocabThemes(view)` → page head + `vocabTabs('themes')` + `<div class="grid grid-3 theme-grid">` of `<div class="card theme-card" data-c="...">` each with name, `N5 a・N4 b`, a `.bar` whose fill is `learned/total`, text `已學 seen／熟悉 learned／熟練 mastered`, and two buttons: `data-act="nav" data-route="#/vocab/list?c=<enc>"` labelled 字表 and `data-act="start-vocab" data-filter="c:<theme>"` labelled 練習.
- `vocabTabs`: add `<button ... aria-pressed="${tab === 'themes'}" data-act="nav" data-route="#/vocab/themes">主題</button>` after 字卡.
- `renderVocab`: `if (tab === 'themes') return renderVocabThemes(view);`
- `renderVocabList`: when `params.c`, filter `v.builtin && vocabTheme(v) === params.c`; page-sub becomes `主題「${c}」・${list.length} 個字`; add a 練習這個主題 button (`data-act="start-vocab" data-filter="c:<c>"`) and keep the search box. `vocab-filter`/`vocab-search` actions preserve `c` in the hash when present.
- CSS: `.theme-grid { }`, `.grid-3` exists? If not, add `.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }` and a phone-width fallback to 1 column next to the existing `.grid-4` rule.

- [ ] **Step 4: Run tests** → PASS. Also `python3 -I tests/e2e/test_fixes.py | tail -1` → ALL PASS.

- [ ] **Step 5: Commit** `feat: 主題 tab groups the built-in vocabulary by theme`

### Task 2: Themed practice queue

**Files:**
- Modify: `index.html` — `buildVocabQueue` (~line 2591), `'start-vocab'` action (~line 3099)
- Test: `tests/e2e/test_vocab.py`

**Interfaces:**
- Consumes: `vocabTheme(v)` from Task 1.
- Produces: `buildVocabQueue('c:<theme>', size)` → only words of that theme (N4 allowed); `startSession('vocab', { filter: 'c:<theme>' })` titles the session `主題練習・<theme>`.

- [ ] **Step 1: Write the failing test**

```python
def test_themed_practice_uses_only_that_theme(b):
    js = """(() => { startSession('vocab', { filter: 'c:飲食' }); const ks = SESSION.entries.map(e => vocabTheme(e.item));
      const out = { n: ks.length, all: ks.every(k => k === '飲食'), title: SESSION.title }; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r['n'] > 0 and r['all'] and r['title'] == '主題練習・飲食', r
```

- [ ] **Step 2: Run** → FAIL (`all` false or title mismatch).
- [ ] **Step 3: Implement** — in `buildVocabQueue`, before the pool line: `const theme = filter.startsWith('c:') ? filter.slice(2) : null;` pool = `theme ? REG.vocab.filter(v => v.builtin && vocabTheme(v) === theme) : <existing>`, `n4Open = theme || filter === 'N4' || n5WordsLeft() === 0`. In `startSession` `vocab` branch: `if ((opt.filter || '').startsWith('c:')) opt.title = opt.title || '主題練習・' + opt.filter.slice(2);` (set before `SESSION` is built).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: practise one vocabulary theme at a time`

### Task 3: Per-format record and the three-format mastery rule

**Files:**
- Modify: `index.html` — `// ---- 20_srs.js ----` region: `srsLevelLabel` (~line 1227), `normalizeState` (~line 865); `answerCurrent` (~line 2813); `'flash-rate'` action (~line 3742); `vocabFormats` (~line 1893)
- Test: `tests/e2e/test_vocab.py`

**Interfaces:**
- Produces: `recordFormat(rec, fmt, ok)` (creates `rec.f[fmt] = [ok, ng]`), `formatsPassed(rec) -> number`, `srsLevelLabel(rec)` returns `'已熟練'` for a record with `f` only when `formatsPassed(rec) >= 3`; records without `f` (grammar, kanji …) keep the old rule. `normalizeState` gives every `v:` record an `f` (`{}` when missing). `vocabFormats(v)` multiplies the weight of a not-yet-passed format by 3 once `b >= 1`.

- [ ] **Step 1: Write the failing tests**

```python
def test_mastered_needs_three_passed_formats_for_words_only(b):
    js = """(() => { const mk = (f) => Object.assign({ b: 6, due: '2099-01-01', n: 9, ok: 9, ng: 0, s: 60, d: 5 }, f === undefined ? {} : { f });
      const legacy = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { srs: { 'v:x': mk(), 'g:y': mk() } }));
      return JSON.stringify({ none: srsLevelLabel(mk({})), two: srsLevelLabel(mk({ 'v-meaning': [3, 0], 'v-recall': [1, 2], 'v-cloze': [0, 2] })),
        three: srsLevelLabel(mk({ 'v-meaning': [3, 0], 'v-recall': [1, 2], 'v-listen': [1, 0] })), grammar: srsLevelLabel(mk()),
        legacyWord: srsLevelLabel(legacy.srs['v:x']), legacyGrammar: srsLevelLabel(legacy.srs['g:y']) }); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r == {'none': '熟悉', 'two': '熟悉', 'three': '已熟練', 'grammar': '已熟練', 'legacyWord': '熟悉', 'legacyGrammar': '已熟練'}, r

def test_answering_records_the_format_and_flash_ratings_count_as_one(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
      startSession('items', { items: [v] }); const e = currentEntry(); e.previewDone = true; const fmt = e.q.fmt; answerCurrent(e.q.answer);
      const f1 = JSON.parse(JSON.stringify(state.srs[v.key].f)); SESSION = null; document.body.classList.remove('practicing');
      recordFormat(state.srs[v.key], 'flash', true);
      return JSON.stringify({ fmt, f1, passed: formatsPassed(state.srs[v.key]) }); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r['f1'] == {r['fmt']: [1, 0]} and r['passed'] == 2, r

def test_unpassed_formats_are_preferred_on_review(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.exZh && /[一-龯]/.test(x.w) && x.r);
      state.srs[v.key] = { b: 2, due: todayStr(), n: 5, ok: 5, ng: 0, s: 3, d: 5, f: { 'v-meaning': [5, 0], 'v-recall': [3, 0] } };
      const w = Object.fromEntries(vocabFormats(v)); return JSON.stringify({ cloze: w['v-cloze'], meaning: w['v-meaning'], recall: w['v-recall'] }); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r['cloze'] == 9 and r['meaning'] == 2 and r['recall'] == 2, r
```

- [ ] **Step 2: Run** → FAIL (`recordFormat is not defined`, labels wrong, cloze weight 3).
- [ ] **Step 3: Implement**
  - `const MASTER_FORMATS = 3;` next to `SRS_MASTERED`.
  - `function recordFormat(rec, fmt, ok) { if (!rec || !fmt) return; rec.f = rec.f || {}; const x = rec.f[fmt] || (rec.f[fmt] = [0, 0]); x[ok ? 0 : 1]++; }`
  - `function formatsPassed(rec) { return rec && rec.f ? Object.values(rec.f).filter(x => x[0] > 0).length : 0; }`
  - `srsLevelLabel`: `if (rec.b >= SRS_MASTERED && (!rec.f || formatsPassed(rec) >= MASTER_FORMATS)) return '已熟練';`
  - `normalizeState`: after `ensureFsrs` loop: `Object.entries(out.srs).forEach(([k, r]) => { if (k.startsWith('v:') && (!r.f || typeof r.f !== 'object')) r.f = {}; });`
  - `answerCurrent`: after the `srsAnswer` block (and for encore entries too), `if (q.kind === 'v' && q.fmt && q.fmt.startsWith('v-')) recordFormat(state.srs[q.key], q.fmt, ok);` (record exists after `srsAnswer`; for encores it already exists).
  - `'flash-rate'`: after `srsAnswer(...)`, `recordFormat(res.rec, 'flash', g !== 'again');`
  - `vocabFormats`: after `weights` is chosen and `b >= 1`: `for (const f in weights) if (!rec.f || !rec.f[f] || rec.f[f][0] === 0) weights[f] *= 3;`
- [ ] **Step 4: Run** → PASS; `test_fixes.py` still ALL PASS.
- [ ] **Step 5: Commit** `feat: track which question formats each word has passed; 已熟練 needs three`

### Task 4: Preview card before a word's first question

**Files:**
- Modify: `index.html` — `startSession` (~line 2646), `renderPractice` (~line 2730), `handleKey` (~line 5330), `ACTIONS` (add `'preview-go'`), CSS near `.flash`
- Test: `tests/e2e/test_vocab.py`

**Interfaces:**
- Produces: entry flag `e.preview === true` for `item.kind === 'v' && !state.srs[item.key]` (set in `startSession`, never for `mistakes` entries); `e.previewDone` set by action `'preview-go'`; `previewHtml(e)` renders `.q-card .preview` with `.word`, `.reading`, `.meaning`, example + Chinese, a 發音 button (`data-act="replay"`), and `<button class="btn btn-primary" data-act="preview-go">開始作答 (Enter)</button>`.

- [ ] **Step 1: Write the failing test**

```python
def test_new_word_shows_a_preview_card_before_its_question(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
      startSession('items', { items: [v] }); renderPractice();
      const before = { preview: !!document.querySelector('.preview'), opts: document.querySelectorAll('.opt').length, word: (document.querySelector('.preview .word') || {}).textContent, n: SESSION.entries.length };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      const stillPreview = !!document.querySelector('.preview') && !currentEntry().done;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const after = { preview: !!document.querySelector('.preview'), opts: document.querySelectorAll('.opt').length, n: SESSION.entries.length };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ before, stillPreview, after, w: jaPlain(v.w) }); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; true"), ("eval", js)])[-1])
    assert r['before']['preview'] and r['before']['opts'] == 0 and r['before']['word'] == r['w'] and r['stillPreview'], r
    assert not r['after']['preview'] and r['after']['opts'] == 4 and r['after']['n'] == r['before']['n'] == 1, r
```

- [ ] **Step 2: Run** → FAIL (no `.preview`).
- [ ] **Step 3: Implement**
  - `startSession`: after `entries` built and non-empty, `if (mode !== 'mistakes') entries.forEach(e => { if (e.item && e.item.kind === 'v' && !state.srs[e.item.key]) e.preview = true; });`
  - `renderPractice`: after `const q = currentEntry().q;` → `if (e.preview && !e.previewDone) { view.innerHTML = previewHtml(e, total); if (!e.autoPlayedPreview) { e.autoPlayedPreview = true; setTimeout(() => speak(q.speakWord || jaPlain(e.item.w)), 150); } return; }`
  - `function previewHtml(e, total)`: same `.pr-top` bar as the question; `.q-card` with `<div class="q-label"><span>新單字</span><span class="chip chip-accent">新</span></div>`, `.preview` block: `<div class="word jp">`, `<div class="reading jp">` (when `r !== w`), `<div class="meaning">`, pos chip, example `furi(exPlain(v.ex))` + `exZh`; `.pr-actions` with 發音 (`data-act="replay"`), 振假名 toggle, and the primary `preview-go` button on the right.
  - `ACTIONS['preview-go'] = () => { const e = currentEntry(); if (e) { e.previewDone = true; renderPractice(); } }`.
  - `handleKey` practice branch: first line `if (e && e.preview && !e.previewDone) { if (k === 'Enter' || k === ' ') { ev.preventDefault(); ACTIONS['preview-go'](); } else if (k === 'r' || k === 'R') { ev.preventDefault(); ACTIONS.replay(); } else if (k === 'Escape') { ev.preventDefault(); exitPractice(); } return; }`
  - `ACTIONS.replay` must speak the word on a preview: check its body; if it reads `q.audio`/`q.speakWord`, no change needed.
  - CSS: `.preview { text-align: center; padding: 20px 10px; } .preview .word { font-size: 44px; font-weight: 600; } .preview .reading { color: var(--fg-3); font-size: 18px; } .preview .meaning { font-size: 22px; font-weight: 600; margin-top: 6px; } .preview .example { margin-top: 14px; text-align: left; }`
- [ ] **Step 4: Run** → PASS; `test_fixes.py` ALL PASS (its `test_today_button_count_matches_the_session` must still hold: preview does not change entry count).
- [ ] **Step 5: Commit** `feat: show a preview card before a new word's first question`

### Task 5: Two encores per new word in the same session

**Files:**
- Modify: `index.html` — `answerCurrent`, `prepareEntry`, `makeVocabQuestion` (~line 1917) + `weightedPick`, `renderPractice` label chip
- Test: `tests/e2e/test_vocab.py`

**Interfaces:**
- Consumes: `recordFormat` (Task 3), `e.preview` (Task 4).
- Produces: `weightedPick(pairs, avoid)` accepts a string or an array; `makeVocabQuestion(v, { avoidFmts: [...], encore: true })` returns `null` when no unused format can be built (no fallback); `scheduleEncores(e)` inserts two entries `{ item, encore: true, avoidFmts }` at `idx + 3..5` and `idx + 8..11` (clamped to the end); encore entries never call `srsAnswer`, are not re-queued after a miss, and show a chip `換個方式再考`.

- [ ] **Step 1: Write the failing tests**

```python
def test_a_new_word_comes_back_twice_in_other_formats_without_rescheduling(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));
      const fill = REG.grammar.filter(g => state.srs[g.key] === undefined).slice(0, 12);
      startSession('items', { items: [v, ...fill] }); const n0 = SESSION.entries.length;
      const e = currentEntry(); e.previewDone = true; const fmt1 = e.q.fmt; answerCurrent(e.q.answer);
      const enc = SESSION.entries.filter(x => x.encore && x.item.key === v.key);
      const positions = SESSION.entries.map((x, i) => x.encore ? i : -1).filter(i => i >= 0);
      while (!currentEntry().encore) { if (!currentEntry().done) answerCurrent(currentEntry().q.answer); nextQuestion(); }
      const q2 = currentEntry().q; answerCurrent(q2.answer);
      const out = { grew: SESSION.entries.length - n0, enc: enc.length, positions, fmt1, fmt2: q2.fmt, n: state.srs[v.key].n, fmts: Object.keys(state.srs[v.key].f).length,
        chip: document.querySelector('.q-label .chip-warn') ? document.querySelector('.q-label .chip-warn').textContent : '' };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; true"), ("eval", js)])[-1])
    assert r['grew'] == 2 and r['enc'] == 2 and r['fmt2'] != r['fmt1'] and r['n'] == 1 and r['fmts'] == 2 and r['chip'] == '換個方式再考', r
    assert 3 <= r['positions'][0] <= 5 and 8 <= r['positions'][1] <= 11, r

def test_no_encore_when_no_other_format_can_be_built(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && meaningOptions(x)); const all = Object.keys(FMT_NAME).filter(f => f.startsWith('v-'));
      const q = makeQuestion(v, { encore: true, avoidFmts: all }); const q2 = makeQuestion(v, { encore: true, avoidFmts: ['v-meaning'] });
      return JSON.stringify({ none: q === null, other: q2 ? q2.fmt : null }); })()"""
    r = json.loads(b.run([("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r['none'] and r['other'] not in (None, 'v-meaning'), r

def test_words_already_known_get_no_encore(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && meaningOptions(x)); srsAnswer(v.key, true); state.srs[v.key].due = todayStr();
      startSession('items', { items: [v] }); const e = currentEntry(); answerCurrent(e.q.answer); const n = SESSION.entries.length;
      SESSION = null; document.body.classList.remove('practicing'); return n; })()"""
    assert b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; true"), ("eval", js)])[-1] == 1
```

- [ ] **Step 2: Run** → FAIL (`grew` 0; `none` false because of the fallback).
- [ ] **Step 3: Implement**
  - `weightedPick(pairs, avoid)`: `const av = Array.isArray(avoid) ? avoid : [avoid]; let list = pairs.filter(([f]) => !av.includes(f));`
  - `makeVocabQuestion`: `const avoid = ctx.avoidFmts || ctx.avoidFmt;` → pick with it. When `ctx.encore`: the candidate list is `formats.filter(([f]) => !avoid.includes(f))`; if empty return `null`; try candidates in weighted order (loop: `weightedPick` on the remaining list, `tryBuild`, remove on failure); return `null` when none builds — no `order` fallback for encores. Non-encore path unchanged.
  - `scheduleEncores(e)`: `const at = (lo, hi) => Math.min(SESSION.entries.length, SESSION.idx + lo + Math.floor(Math.random() * (hi - lo + 1)));` insert `{ item: e.item, encore: true, avoidFmts: [e.q.fmt] }` at `at(3, 5)`, then a second at `at(8, 11)` (computed after the first insert); the second's `avoidFmts` is filled lazily in `prepareEntry` from all formats this word has used in the session (`SESSION.results.filter(r => r.key === key).map(r => r.q.fmt)` plus the first's `avoidFmts`).
  - `prepareEntry`: `else if (e.encore) e.q = makeQuestion(e.item, { encore: true, avoidFmts: usedFormats(e) });` keep the existing splice-on-null.
  - `answerCurrent`: SRS block becomes `if (['v','g','l','r','k'].includes(q.kind) && !e.encore) { e.srs = srsAnswer(...); ... }`; after it `recordFormat` (Task 3) runs for encores too; the wrong-answer requeue condition becomes `if (!e.requeued && !e.encore)`; at the end, `if (e.srs && e.srs.isNew && q.kind === 'v' && !e.requeued) scheduleEncores(e);`
  - `renderPractice` label: `${e.encore ? '<span class="chip chip-warn">換個方式再考</span>' : ''}` next to the 再練一次 chip.
- [ ] **Step 4: Run** → PASS; full `bash scripts/test.sh` → ALL_OK.
- [ ] **Step 5: Commit** `feat: a new word is asked twice more in the same session, in other formats`

### Task 6: Version, changelog, docs

**Files:**
- Modify: `index.html` (`APP_VERSION`, `CHANGELOG`), `sw.js`, memory note for deferred block 二.

- [ ] **Step 1:** `APP_VERSION = '13'`, `sw.js` `CACHE = 'nq-v13'`, changelog entry: `單字頁新增「主題」分頁，可依主題看字表與練習。`, `新單字先顯示預習卡，同一組練習裡會換兩種題型再考一次；每個字記錄各題型是否答對，三種題型都過才算「已熟練」（既有的熟練字可能先回到「熟悉」）。`
- [ ] **Step 2:** `bash scripts/test.sh` → ALL_OK.
- [ ] **Step 3:** Commit `feat: vocabulary themes and multi-format practice (v13)` and push.
