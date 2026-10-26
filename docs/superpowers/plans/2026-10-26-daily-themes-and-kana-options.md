# Daily Themes and Kana Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New built-in words enter the daily plan from two active themes at a time (interleaved), and vocabulary multiple-choice options are sometimes shown in kana instead of kanji so a Chinese reader cannot read the answer off the characters.

**Architecture:** Both changes live in `index.html`. Theme ordering reuses `THEME_ORDER` / `vocabTheme()` (v13) inside `newVocabCandidates`, which every new-word path already calls (daily plan, flashcards, 單字測驗). Kana options are a per-question flag set in `makeVocabQuestion` and honoured by `optionHtml`/`feedbackHtml`; the data needed (readings) already exists on every built-in word.

**Tech Stack:** Vanilla JS single file, Python CDP e2e (`tests/e2e/test_vocab.py`), `scripts/test.sh`.

**Spec:** User request 2026-10-26: block 二 of the vocabulary proposal with the user's decision "two themes interleaved per day" (reviews stay mixed; similar themes thus split across days automatically), plus "單字類型題目偶爾選項可以用平片假名取代漢字". Work on a feature branch, pushed, so the user can review before merge.

## Global Constraints

- `APP_VERSION '14'` / `sw.js CACHE 'nq-v14'` / `CHANGELOG` entry dated 2026-10-26 in one commit.
- TDD per task; copy in Traditional Chinese.
- N4 words still open only after every N5 word has been introduced (unless the learner picks N4/a theme on purpose) — unchanged rule.
- Kana options never apply to a word's very first question (the learner must see its written form once) nor to formats whose options are not words (`v-meaning`, `v-listen`, `v-reading`, `v-kanji`, `v-sentence`).

## Review Focus

1. Theme exhaustion: when only one theme (or none) still has new words, candidates must still flow (single theme, then the rest) — Task 1 test.
2. Custom cards keep interleaving with built-ins as before — Task 1 test asserts the custom/built-in alternation is untouched.
3. Kana options must be uniform: either every option is kana or none; an option whose kana is unknown forces kanji for all — Task 2 test.
4. Feedback after a kana-option answer shows the written form with its reading — Task 2 test.
5. Mock exam formats (`forceFmt` v-reading/v-kanji) are untouched — Task 2 test asserts `kanaOptions` is never set there.

---

### Task 1: Two active themes feed the new-word order

**Files:** `index.html` — `newVocabCandidates` (~line 2619), Today page plan-line (~line 3315). Test: `tests/e2e/test_vocab.py`.

**Interfaces:**
- Produces: `activeThemes(pool, allowN4) -> string[]` (0–2 theme names: the first themes in `THEME_ORDER` order that still have unintroduced built-in words of the lowest open level), `newVocabCandidates(pool, allowN4)` orders built-ins as: words of theme A and theme B interleaved (id order within a theme), then the rest (level, theme rank, id); custom cards still alternate with built-ins. Today page shows `今天的主題：A・B` in the plan line when there are new words.

- [ ] **Step 1: Failing test**
```python
def test_new_words_come_from_two_themes_interleaved(b):
    js = """(() => { const pool = REG.vocab.filter(v => v.builtin);
      const th = activeThemes(pool, false); const c = newVocabCandidates(pool, false).slice(0, 8).map(vocabTheme);
      // finish theme A: every word of it gets a record → the pair advances
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === th[0]).forEach(v => { state.srs[v.key] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, f: {} }; });
      const th2 = activeThemes(pool, false); const c2 = newVocabCandidates(pool, false).slice(0, 6).map(vocabTheme);
      // all N5 but one theme done → single theme flows, then N4 stays closed
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) !== '副詞').forEach(v => { state.srs[v.key] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, f: {} }; });
      const th3 = activeThemes(pool, false); const c3 = newVocabCandidates(pool, false).slice(0, 4);
      return JSON.stringify({ th, c, th2, c2, th3, c3: c3.map(vocabTheme), lv3: c3.map(v => v.lv) }); })()"""
    r = json.loads(ev(b, js))
    assert r['th'] == ['問候', '指示'] and r['c'] == ['問候', '指示'] * 4, r
    assert r['th2'] == ['指示', '代名詞'] and r['c2'] == ['指示', '代名詞'] * 3, r
    assert r['th3'] == ['副詞'] and r['c3'] == ['副詞'] * 4 and r['lv3'] == ['N5'] * 4, r

def test_custom_cards_still_alternate_with_builtins(b):
    js = """(() => { state.vocab.push({ id: 'c1', w: '猫', r: 'ねこ', m: '貓' }, { id: 'c2', w: '犬', r: 'いぬ', m: '狗' }); buildRegistry();
      const c = newVocabCandidates(REG.vocab, false).slice(0, 4).map(v => v.builtin ? 'b' : 'c'); return JSON.stringify(c); })()"""
    assert ev(b, js) == '["b","c","b","c"]'

def test_today_names_the_active_themes(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; route(); document.querySelector('.plan-line').textContent")])
    assert '今天的主題：問候・指示' in out[-1], out[-1]
```
- [ ] **Step 2: Run** `python3 -I tests/e2e/test_vocab.py <names>` → FAIL (`activeThemes is not defined`; plan line lacks the text).
- [ ] **Step 3: Implement**
  - `function themeRank(c)` = index in `THEME_ORDER` (unknown → length).
  - `function activeThemes(pool, allowN4)`: `fresh = pool.filter(v => v.builtin && !state.srs[v.key] && (v.lv === 'N5' || allowN4))`; `lv = fresh.some(v => v.lv === 'N5') ? 'N5' : 'N4'`; distinct themes of `fresh.filter(v => v.lv === lv)` sorted by `themeRank` then `localeCompare`; return first two.
  - `newVocabCandidates`: replace the `built` sort with: `const th = activeThemes(pool, allowN4); const key = (v) => [th.indexOf(vocabTheme(v)) < 0 ? 1 : 0, v.lv === 'N4' ? 1 : 0, themeRank(vocabTheme(v)), v.id]`; sort by that key; then re-order the leading active-theme block by interleaving theme A and theme B lists (A, B, A, B … then leftovers of the longer one). Custom alternation loop unchanged.
  - Today plan-line: after the 新內容 span, `${plan.newV.length ? `<span>今天的主題：${esc(activeThemes(REG.vocab, plan.n4Open).join('・'))}</span>` : ''}`.
- [ ] **Step 4: Run** → PASS; `test_fixes.py` ALL PASS.
- [ ] **Step 5: Commit** `feat: new words come from two active themes, interleaved`

### Task 2: Kana options for 中翻日 and 例句填空

**Files:** `index.html` — `recallOptions`, `clozeOptions` (~line 1790), `makeVocabQuestion` tryBuild for `v-recall`/`v-cloze`, `optionHtml` (~line 2746), `feedbackHtml`; constant near `FMT_NAME`. Test: `tests/e2e/test_vocab.py`.

**Interfaces:**
- Produces: `KANA_OPTION_RATE = 1 / 3`; `kanaOfInflected(word, info) -> string|null` (reading of a peer word in the target's form: `word.r` for `as-is`, conjugated reading for verbs/i-adjectives, else null); `recallOptions(v, zh, kana)` and `clozeOptions(v, info, zh, kana)` fill `kana[optionText] = reading`; `makeVocabQuestion(v, ctx)` sets `q.optKana` and `q.kanaOptions = true` when (`ctx.kana === true`, or `ctx.kana === undefined` and the word has an SRS record and `Math.random() < KANA_OPTION_RATE`) and every option has a kana reading; `optionHtml` returns the kana for such options; `feedbackHtml` shows `<written>（<kana>）` for the correct answer.

- [ ] **Step 1: Failing tests**
```python
def test_kana_options_replace_kanji_uniformly(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && x.exZh && recallOptions(x)); srsAnswer(v.key, true);
      const k = makeVocabQuestion(v, { forceFmt: 'v-recall', kana: true }); const n = makeVocabQuestion(v, { forceFmt: 'v-recall', kana: false });
      const cz = makeVocabQuestion(v, { forceFmt: 'v-cloze', kana: true });
      const html = (q) => q.options.map(o => optionHtml(q, o));
      const kanji = (s) => /[一-龯]/.test(s);
      return JSON.stringify({ k: !!k.kanaOptions, kAll: html(k).every(h => !kanji(h)), kAns: optionHtml(k, k.options[k.answer]) === v.r,
        n: !!n.kanaOptions, nSome: html(n).some(kanji), cz: cz ? [!!cz.kanaOptions, html(cz).every(h => !kanji(h))] : 'nocloze' }); })()"""
    r = json.loads(ev(b, js))
    assert r['k'] and r['kAll'] and r['kAns'] and not r['n'] and r['nSome'], r
    assert r['cz'] == 'nocloze' or r['cz'] == [True, True], r

def test_kana_options_only_after_the_first_sighting_and_sometimes(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && recallOptions(x));
      const build = () => { let n = 0; for (let i = 0; i < 120; i++) if (makeVocabQuestion(v, { forceFmt: 'v-recall' }).kanaOptions) n++; return n; };
      const fresh = build(); srsAnswer(v.key, true); const seen = build();
      const exam = makeVocabQuestion(REG.vocab.find(x => x.builtin && x.r && /[一-龯]/.test(x.w)), { forceFmt: 'v-reading', kana: true });
      return JSON.stringify({ fresh, seen, exam: !!(exam && exam.kanaOptions) }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] == 0 and 15 <= r['seen'] <= 70 and not r['exam'], r

def test_feedback_shows_written_form_and_reading_after_a_kana_question(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && recallOptions(x)); srsAnswer(v.key, true); state.srs[v.key].due = todayStr();
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-recall', kana: true }); renderPractice();
      answerCurrent((e.q.answer + 1) % 4); const head = document.querySelector('.fb-head').textContent;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify({ head, w: jaPlain(v.w), r: v.r }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['w'] in r['head'] and r['r'] in r['head'], r
```
- [ ] **Step 2: Run** → FAIL (`kanaOptions` undefined, counts 0).
- [ ] **Step 3: Implement** as the Interfaces block says. `kanaOfInflected(word, info)`: `if (!word.r) return null; if (!info || info.form === 'as-is') return word.r; const [kind, f] = info.form.split(':'); if (kind === 'v') { const g = vGroup(word); return g ? jaKana(JConj.conjVerb(word.r, g, f) || '') || null : null; } if (kind === 'i') return word.p === 'i' ? JConj.conjAdj(word.r, 'i', f) : null; return null;`. In `optionHtml`, right after `if (!o.jp) return esc(o.text);` add `if (q.kanaOptions && q.optKana && q.optKana[o.text]) return esc(q.optKana[o.text]);`. In `feedbackHtml`, the correct-answer span: `q.kanaOptions ? `${esc(jaPlain(right.text))}（${esc(q.optKana[right.text])}）` : <existing>`.
- [ ] **Step 4: Run** → PASS; full `bash scripts/test.sh` ALL_OK.
- [ ] **Step 5: Commit** `feat: vocabulary options sometimes in kana instead of kanji`

### Task 3: Version and branch hand-off

- [ ] `APP_VERSION '14'`, `sw.js 'nq-v14'`, changelog: `每天的新單字改為從兩個主題交錯出現，首頁顯示今天的主題。`, `中翻日與例句填空的選項有時改用假名顯示，避免直接從漢字看出答案。`
- [ ] `bash scripts/test.sh` → ALL_OK; commit `feat: daily themes and kana options (v14)`; push branch; open a PR against main.
