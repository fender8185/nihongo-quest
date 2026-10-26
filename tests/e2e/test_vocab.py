"""2026-10-26: vocabulary themes (主題 tab, themed practice) and multi-format practice (preview card, encores,
per-format record, 已熟練 needs three formats)."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8799
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# ---- Task 1: themes ----
def test_themes_cover_every_builtin_word_once(b):
    js = """(() => { const th = vocabThemes(); const n = REG.vocab.filter(v => v.builtin).length;
      return JSON.stringify({ sum: th.reduce((a, t) => a + t.total, 0), n, old: th.some(t => t.c === '舊版'), first: th[0].c, hasOther: th.some(t => t.c === '其他') }); })()"""
    r = json.loads(ev(b, js))
    assert r['sum'] == r['n'] and not r['old'] and r['hasOther'] and r['first'] == '問候', r

def test_theme_tab_lists_cards_and_opens_the_word_table(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "location.hash = '#/vocab/themes'; true"), ("wait", "document.querySelectorAll('.theme-card').length > 0"),
        ("eval", "JSON.stringify({ cards: document.querySelectorAll('.theme-card').length, themes: vocabThemes().length, pressed: document.querySelector('.seg [aria-pressed=\"true\"]').textContent })"),
        ("eval", "document.querySelector('.theme-card[data-c=\"飲食\"] [data-act=nav]').click(); true"),
        ("wait", "location.hash.includes('c=')"),
        ("eval", "JSON.stringify({ hash: decodeURIComponent(location.hash), rows: document.querySelectorAll('tbody tr').length, total: vocabThemes().find(t => t.c === '飲食').total, sub: document.querySelector('.page-sub').textContent })")])
    a = json.loads(out[-3]); assert a['cards'] == a['themes'] and a['pressed'] == '主題', a
    r = json.loads(out[-1]); assert r['hash'] == '#/vocab/list?c=飲食' and r['rows'] == r['total'] and '飲食' in r['sub'], r

# ---- Task 2: themed practice ----
def test_themed_practice_uses_only_that_theme(b):
    js = """(() => { startSession('vocab', { filter: 'c:飲食' }); const ks = SESSION.entries.map(e => vocabTheme(e.item));
      const out = { n: ks.length, all: ks.every(k => k === '飲食'), title: SESSION.title }; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] > 0 and r['all'] and r['title'] == '主題練習・飲食', r

# ---- Task 3: per-format record, 已熟練 needs three formats ----
def test_mastered_needs_three_passed_formats_for_words_only(b):
    js = """(() => { const mk = (f) => Object.assign({ b: 6, due: '2099-01-01', n: 9, ok: 9, ng: 0, s: 60, d: 5 }, f === undefined ? {} : { f });
      const legacy = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { srs: { 'v:x': mk(), 'g:y': mk() } }));
      return JSON.stringify({ none: srsLevelLabel(mk({})), two: srsLevelLabel(mk({ 'v-meaning': [3, 0], 'v-recall': [1, 2], 'v-cloze': [0, 2] })),
        three: srsLevelLabel(mk({ 'v-meaning': [3, 0], 'v-recall': [1, 2], 'v-listen': [1, 0] })), grammar: srsLevelLabel(mk()),
        legacyWord: srsLevelLabel(legacy.srs['v:x']), legacyGrammar: srsLevelLabel(legacy.srs['g:y']) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'none': '熟悉', 'two': '熟悉', 'three': '已熟練', 'grammar': '已熟練', 'legacyWord': '熟悉', 'legacyGrammar': '已熟練'}, r

def test_answering_records_the_format_and_flash_ratings_count_as_one(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
      startSession('items', { items: [v] }); const e = currentEntry(); e.previewDone = true; const fmt = e.q.fmt; answerCurrent(e.q.answer);
      const f1 = JSON.parse(JSON.stringify(state.srs[v.key].f)); SESSION = null; document.body.classList.remove('practicing');
      recordFormat(state.srs[v.key], 'flash', true);
      return JSON.stringify({ fmt, f1, passed: formatsPassed(state.srs[v.key]) }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['f1'] == {r['fmt']: [1, 0]} and r['passed'] == 2, r

def test_unpassed_formats_are_preferred_on_review(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.exZh && /[一-龯]/.test(x.w) && x.r);
      state.srs[v.key] = { b: 2, due: todayStr(), n: 5, ok: 5, ng: 0, s: 3, d: 5, f: { 'v-meaning': [5, 0], 'v-recall': [3, 0] } };
      const w = Object.fromEntries(vocabFormats(v)); return JSON.stringify({ cloze: w['v-cloze'], meaning: w['v-meaning'], recall: w['v-recall'] }); })()"""
    r = json.loads(ev(b, js))
    assert r['cloze'] == 9 and r['meaning'] == 2 and r['recall'] == 2, r

# ---- Task 4: preview card ----
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
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['before']['preview'] and r['before']['opts'] == 0 and r['before']['word'] == r['w'] and r['stillPreview'], r
    assert not r['after']['preview'] and r['after']['opts'] == 4 and r['after']['n'] == r['before']['n'] == 1, r

# ---- Task 5: encores ----
def test_a_new_word_comes_back_twice_in_other_formats_without_rescheduling(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));
      const fill = REG.grammar.filter(g => state.srs[g.key] === undefined).slice(0, 12);
      startSession('items', { items: [v, ...fill] }); const n0 = SESSION.entries.length;
      const e = currentEntry(); e.previewDone = true; const fmt1 = e.q.fmt; answerCurrent(e.q.answer);
      const enc = SESSION.entries.filter(x => x.encore && x.item.key === v.key);
      const positions = SESSION.entries.map((x, i) => x.encore ? i : -1).filter(i => i >= 0);
      let guard = 0;
      while (!currentEntry().encore && guard++ < 30) { if (!currentEntry().done) answerCurrent(currentEntry().q.answer); nextQuestion(); }
      const q2 = currentEntry().q; answerCurrent(q2.answer);
      const out = { grew: SESSION.entries.length - n0, enc: enc.length, positions, fmt1, fmt2: q2.fmt, n: state.srs[v.key].n, fmts: Object.keys(state.srs[v.key].f).length,
        chip: document.querySelector('.q-label .chip-warn') ? document.querySelector('.q-label .chip-warn').textContent : '' };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['grew'] == 2 and r['enc'] == 2 and r['fmt2'] != r['fmt1'] and r['n'] == 1 and r['fmts'] == 2 and r['chip'] == '換個方式再考', r
    assert 3 <= r['positions'][0] <= 5 and 8 <= r['positions'][1] <= 11, r

def test_no_encore_when_no_other_format_can_be_built(b):
    # encores are built after the word's first answer, so the word already has a record (wider format choice than a brand-new word)
    js = """(() => { const v = REG.vocab.find(x => x.builtin && meaningOptions(x) && recallOptions(x)); srsAnswer(v.key, true); const all = Object.keys(FMT_NAME).filter(f => f.startsWith('v-'));
      const q = makeQuestion(v, { encore: true, avoidFmts: all }); const q2 = makeQuestion(v, { encore: true, avoidFmts: ['v-meaning'] });
      return JSON.stringify({ none: q === null, other: q2 ? q2.fmt : null }); })()"""
    r = json.loads(ev(b, js))
    assert r['none'] and r['other'] not in (None, 'v-meaning'), r

def test_words_already_known_get_no_encore(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && meaningOptions(x)); srsAnswer(v.key, true); state.srs[v.key].due = todayStr();
      startSession('items', { items: [v] }); const e = currentEntry(); answerCurrent(e.q.answer); const n = SESSION.entries.length;
      SESSION = null; document.body.classList.remove('practicing'); return n; })()"""
    assert ev(b, js, [("eval", "location.hash = '#/today'; true")]) == 1

# ---- review fixes ----
def test_wrong_first_answer_keeps_requeue_and_encores_apart_and_requeue_does_not_count_as_a_pass(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));
      const fill = REG.grammar.filter(g => !state.srs[g.key]).slice(0, 14);
      startSession('items', { items: [v, ...fill] }); const e = currentEntry(); e.previewDone = true; const fmt1 = e.q.fmt;
      answerCurrent((e.q.answer + 1) % e.q.options.length);
      const pos = SESSION.entries.map((x, i) => x.item && x.item.key === v.key ? i : -1).filter(i => i >= 0);
      const adjacent = pos.some((p, i) => i > 0 && p === pos[i - 1] + 1);
      let guard = 0; while (!currentEntry().requeued && guard++ < 30) { if (!currentEntry().done) answerCurrent(currentEntry().q.answer); nextQuestion(); }
      answerCurrent(currentEntry().q.answer);
      const f = JSON.parse(JSON.stringify(state.srs[v.key].f)); SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ pos, adjacent, f, fmt1 }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert len(r['pos']) == 4 and not r['adjacent'], r
    assert r['f'] == {r['fmt1']: [0, 1]}, r

def test_preview_card_only_speaks_when_auto_reading_is_on(b):
    js = """(() => { const calls = []; const orig = speak; speak = (t) => calls.push(t);
      const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
      const run = () => { startSession('items', { items: [v] }); renderPractice(); return new Promise(r => setTimeout(r, 300)).then(() => { SESSION = null; document.body.classList.remove('practicing'); }); };
      state.settings.autoSpeak = false;
      return run().then(() => { const off = calls.length; state.settings.autoSpeak = true; return run().then(() => { speak = orig; return JSON.stringify({ off, on: calls.length - off }); }); }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r == {'off': 0, 'on': 1}, r

TESTS = [test_themes_cover_every_builtin_word_once, test_theme_tab_lists_cards_and_opens_the_word_table, test_themed_practice_uses_only_that_theme,
         test_mastered_needs_three_passed_formats_for_words_only, test_answering_records_the_format_and_flash_ratings_count_as_one, test_unpassed_formats_are_preferred_on_review,
         test_new_word_shows_a_preview_card_before_its_question,
         test_a_new_word_comes_back_twice_in_other_formats_without_rescheduling, test_no_encore_when_no_other_format_can_be_built, test_words_already_known_get_no_encore,
         test_wrong_first_answer_keeps_requeue_and_encores_apart_and_requeue_does_not_count_as_a_pass, test_preview_card_only_speaks_when_auto_reading_is_on]

# ---- 2026-10-26 (2): two active themes feed the new-word order ----
def test_new_words_come_from_two_themes_interleaved(b):
    js = """(() => { const pool = REG.vocab.filter(v => v.builtin);
      const th = activeThemes(pool, false); const c = newVocabCandidates(pool, false).slice(0, 8).map(vocabTheme);
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === th[0]).forEach(v => { state.srs[v.key] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, f: {} }; });
      const th2 = activeThemes(pool, false); const c2 = newVocabCandidates(pool, false).slice(0, 6).map(vocabTheme);
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

TESTS += [test_new_words_come_from_two_themes_interleaved, test_custom_cards_still_alternate_with_builtins, test_today_names_the_active_themes]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    only = sys.argv[1:]
    failed = 0
    try:
        for t in TESTS:
            if only and t.__name__ not in only: continue
            with Browser() as b:
                try:
                    t(b); print("ok  ", t.__name__)
                except Exception as e:
                    failed += 1; print("FAIL", t.__name__, "-", str(e)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
