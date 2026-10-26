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

TESTS = [test_themes_cover_every_builtin_word_once, test_theme_tab_lists_cards_and_opens_the_word_table, test_themed_practice_uses_only_that_theme,
         test_mastered_needs_three_passed_formats_for_words_only, test_answering_records_the_format_and_flash_ratings_count_as_one, test_unpassed_formats_are_preferred_on_review]

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
