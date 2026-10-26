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
    out = b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; route(); document.querySelector('.plan-topics').textContent")])
    assert '問候・指示' in out[-1], out[-1]

TESTS += [test_new_words_come_from_two_themes_interleaved, test_custom_cards_still_alternate_with_builtins, test_today_names_the_active_themes]

# ---- 2026-10-26 (2): kana options ----
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
    assert f"{r['w']}（{r['r']}）" in r['head'], r

TESTS += [test_kana_options_replace_kanji_uniformly, test_kana_options_only_after_the_first_sighting_and_sometimes, test_feedback_shows_written_form_and_reading_after_a_kana_question]

def test_kana_options_need_four_distinct_readings(b):
    js = """(() => { const mk = (texts, kana) => ({ options: texts.map(t => ({ text: t, jp: true })), optKana: kana });
      const dup = mk(['花', '鼻', '山', '川'], { 花: 'はな', 鼻: 'はな', 山: 'やま', 川: 'かわ' });
      const ok = mk(['花', '犬', '山', '川'], { 花: 'はな', 犬: 'いぬ', 山: 'やま', 川: 'かわ' });
      const missing = mk(['花', '犬', '山', '川'], { 花: 'はな', 犬: 'いぬ', 山: 'やま' });
      return JSON.stringify([kanaOptionsDistinct(dup), kanaOptionsDistinct(ok), kanaOptionsDistinct(missing)]); })()"""
    assert ev(b, js) == '[false,true,false]'

def test_homophones_never_produce_two_identical_kana_options(b):
    js = """(() => { const byR = {}; REG.vocab.filter(v => v.builtin).forEach(v => (byR[v.p + '|' + v.r] = byR[v.p + '|' + v.r] || []).push(v));
      const targets = Object.values(byR).filter(g => g.length > 1).map(g => g[0]).slice(0, 12);
      let builds = 0, dups = 0;
      for (const v of targets) { srsAnswer(v.key, true); for (const fmt of ['v-recall', 'v-cloze']) for (let i = 0; i < 40; i++) {
        const q = makeVocabQuestion(v, { forceFmt: fmt, kana: true }); if (!q || !q.kanaOptions) continue; builds++;
        const shown = q.options.map(o => optionHtml(q, o)); if (new Set(shown).size < shown.length) dups++; } }
      return JSON.stringify({ targets: targets.length, builds, dups }); })()"""
    r = json.loads(ev(b, js))
    assert r['targets'] >= 5 and r['builds'] > 100 and r['dups'] == 0, r

TESTS += [test_kana_options_need_four_distinct_readings, test_homophones_never_produce_two_identical_kana_options]

# ---- 2026-10-26 (3): stacked theme bars, Today outline ----
def test_theme_card_bar_has_three_segments_for_seen_learned_mastered(b):
    js = """(() => { const ws = REG.vocab.filter(v => v.builtin && vocabTheme(v) === '顏色');
      const rec = (b, f) => ({ b, due: '2099-01-01', n: 5, ok: 5, ng: 0, s: 30, d: 5, f });
      ws.slice(0, 2).forEach(v => { state.srs[v.key] = rec(6, { 'v-meaning': [1, 0], 'v-recall': [1, 0], 'v-cloze': [1, 0] }); });
      ws.slice(2, 5).forEach(v => { state.srs[v.key] = rec(3, {}); });
      ws.slice(5, 9).forEach(v => { state.srs[v.key] = rec(1, {}); });
      location.hash = '#/vocab/themes'; route();
      const card = document.querySelector('.theme-card[data-c="顏色"]');
      const bar = card.querySelector('.bar.stack'); const d = bar.dataset; const bg = getComputedStyle(bar).backgroundImage;
      return JSON.stringify({ total: ws.length, segs: [Number(d.mastered), Number(d.learned), Number(d.seen)], gradient: bg.startsWith('linear-gradient'), stops: (bg.match(/%/g) || []).length }); })()"""
    r = json.loads(ev(b, js))
    assert r['segs'] == [2, 3, 4] and r['gradient'] and r['stops'] >= 6, r

def test_today_lists_the_vocab_themes_and_grammar_points_of_the_session(b):
    js = """(() => { location.hash = '#/today'; route();
      const box = document.querySelector('.plan-topics'); const text = box ? box.textContent.replace(/\\s+/g, ' ') : '';
      const q = dailyQueue(state.settings.sessionSize);
      const pts = [...new Set(q.items.filter(it => it.kind === 'g').map(it => it.pt).filter(Boolean))];
      recentAccuracy = () => 0.5; route();
      return JSON.stringify({ text, themes: activeThemes(REG.vocab, false).join('・'), pts, outline: !!document.querySelector('.plan-outline'), planLine: document.querySelector('.plan-line').textContent,
        note: (document.querySelector('.plan-note') || {}).textContent || '' }); })()"""
    r = json.loads(ev(b, js))
    assert r['themes'] and r['themes'] in r['text'] and '單字主題' in r['text'], r
    assert r['pts'] and '文法' in r['text'] and sum(1 for p in r['pts'] if p in r['text']) >= min(3, len(r['pts'])), r
    assert not r['outline'] and '今天的主題' not in r['planLine'] and '正確率' in r['note'], r

TESTS += [test_theme_card_bar_has_three_segments_for_seen_learned_mastered, test_today_lists_the_vocab_themes_and_grammar_points_of_the_session]

# ---- 2026-10-26 (4): the daily session keeps its words within 1–3 themes ----
DUE = "(v) => { state.srs[v.key] = { b: 2, due: addDays(todayStr(), -1), n: 3, ok: 3, ng: 0, s: 3, d: 5, f: {}, last: addDays(todayStr(), -4) }; }"
def test_daily_reviews_prefer_the_active_themes_plus_one_more(b):
    js = """(() => { const due = __DUE__; const by = (c) => REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === c);
      by('飲食').slice(0, 12).forEach(due); ['交通', '天氣', '自然', '身體', '衣物'].forEach(c => by(c).slice(0, 2).forEach(due)); saveState();
      const q = dailyQueue(20); const words = q.items.filter(it => it.kind === 'v' && it.builtin);
      const themes = [...new Set(words.map(vocabTheme))]; const reviews = words.filter(it => state.srs[it.key]).map(vocabTheme);
      return JSON.stringify({ themes, reviews, active: activeThemes(REG.vocab, false), focus: q.focus }); })()""".replace('__DUE__', DUE)
    r = json.loads(ev(b, js))
    assert len(r['themes']) <= 3 and set(r['themes']) <= set(r['active'] + ['飲食']), r
    assert r['reviews'] and all(t == '飲食' for t in r['reviews']), r
    assert r['focus'] == r['active'] + ['飲食'], r

def test_daily_reviews_fill_from_other_themes_only_when_the_chosen_ones_run_out(b):
    js = """(() => { const due = __DUE__; state.settings.newVocabPerDay = 0; saveState();
      ['飲食', '交通', '天氣', '自然'].forEach(c => REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === c).slice(0, 3).forEach(due)); saveState();
      const q = dailyQueue(20); const words = q.items.filter(it => it.kind === 'v' && it.builtin && state.srs[it.key]);
      const seq = words.map(vocabTheme); const firstThree = [...new Set(seq.slice(0, 7))];
      return JSON.stringify({ n: seq.length, firstThree, focus: q.focus, fresh: q.items.filter(it => it.kind === 'v' && !state.srs[it.key]).length }); })()""".replace('__DUE__', DUE)
    r = json.loads(ev(b, js))
    assert r['fresh'] == 0 and len(r['focus']) == 3 and set(r['focus']) <= {'飲食', '交通', '天氣', '自然'}, r
    assert r['n'] >= 7 and len(r['firstThree']) <= 3 and set(r['firstThree']) <= set(r['focus']), r

TESTS += [test_daily_reviews_prefer_the_active_themes_plus_one_more, test_daily_reviews_fill_from_other_themes_only_when_the_chosen_ones_run_out]

# ---- 2026-10-26 (5): new grammar first, least-practised reviews first ----
def test_new_grammar_is_not_squeezed_out_by_a_review_backlog(b):
    js = """(() => { const due = (v, ok) => { state.srs[v.key] = { b: 2, due: addDays(todayStr(), -1), n: ok, ok, ng: 0, s: 3, d: 5, f: {}, last: addDays(todayStr(), -4) }; };
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 40).forEach(v => due(v, 2)); saveState();
      const plan = dailyPlan(20); return JSON.stringify({ newG: plan.newG.length, limit: state.settings.newGrammarPerDay, dueV: plan.dueV.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['dueV'] == 40 and r['newG'] == r['limit'], r

def test_grammar_slots_take_new_items_first_then_the_least_practised_reviews(b):
    js = """(() => { const due = (g, ok) => { state.srs[g.key] = { b: 2, due: addDays(todayStr(), -2 - (ok % 3)), n: ok, ok, ng: 0, s: 3, d: 5, last: addDays(todayStr(), -5) }; };
      const gs = REG.grammar.filter(g => g.u === 'm1'); gs.slice(0, 10).forEach(g => due(g, 3)); gs.slice(10, 15).forEach(g => due(g, 1)); saveState();
      const q = dailyQueue(20); const G = q.items.filter(it => it.kind === 'g');
      const fresh = G.filter(it => !state.srs[it.key]).length; const revOk = G.filter(it => state.srs[it.key]).map(it => state.srs[it.key].ok);
      return JSON.stringify({ fresh, revOk, limit: state.settings.newGrammarPerDay }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] >= min(r['limit'], 5), r
    assert sum(1 for ok in r['revOk'] if ok == 1) == 5, r   # every least-practised item is in before any well-known one

TESTS += [test_new_grammar_is_not_squeezed_out_by_a_review_backlog, test_grammar_slots_take_new_items_first_then_the_least_practised_reviews]

# ---- 2026-10-26 (6): the 單字主題 line never vanishes ----
def test_topics_line_names_custom_cards_or_a_finished_day_instead_of_disappearing(b):
    js = """(() => { const snap = () => { location.hash = '#/today'; route(); const t = document.querySelector('.plan-topics'); return t ? t.textContent.replace(/\\s+/g, ' ').trim() : null; };
      state.settings.newVocabPerDay = 0;
      for (let i = 0; i < 6; i++) { state.vocab.push({ id: 'cx' + i, w: '猫' + i, r: 'ねこ', m: '貓' + i }); }
      buildRegistry(); REG.vocab.filter(v => !v.builtin).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(todayStr(), -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, f: {}, last: addDays(todayStr(), -3) }; });
      saveState(); const customOnly = snap();
      const words = dailyQueue(state.settings.sessionSize).items.filter(it => it.kind === 'v');
      state.settings.includeImported = 'off'; saveState(); const noWords = snap();
      const words2 = dailyQueue(state.settings.sessionSize).items.filter(it => it.kind === 'v');
      return JSON.stringify({ customOnly, allCustom: words.length > 0 && words.every(it => !it.builtin), noWords, none: words2.length === 0 }); })()"""
    r = json.loads(ev(b, js))
    assert r['allCustom'] and r['customOnly'] and '單字主題' in r['customOnly'] and '自訂字卡' in r['customOnly'], r
    assert r['none'] and r['noWords'] and '單字主題今天的單字已完成' in r['noWords'] and '明天' not in r['noWords'], r

TESTS += [test_topics_line_names_custom_cards_or_a_finished_day_instead_of_disappearing]

# ---- 2026-10-26 (7): every example sentence has a play button ----
def test_example_sentences_have_play_buttons_on_preview_feedback_and_footer(b):
    js = """(() => { const calls = []; const orig = speak; speak = (t) => calls.push(t);
      const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.ex && meaningOptions(x)); const ex = exPlain(v.ex);
      startSession('items', { items: [v] }); renderPractice();
      const pv = document.querySelector('.preview .example [data-act=speak]');
      const out = { preview: pv ? pv.dataset.text === ex : false };
      ACTIONS['preview-go'](); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice();
      const foot = document.querySelector('.pr-actions [data-act=speak-example]'); out.footBefore = !!foot;
      if (foot) { foot.click(); out.footSpeaks = calls[calls.length - 1] === ex; }
      answerCurrent(e.q.answer);
      const fb = document.querySelector('.feedback .example [data-act=speak]'); out.feedback = fb ? fb.dataset.text === ex : false;
      out.whyHasNoDuplicateExample = !document.querySelector('.fb-why') || !document.querySelector('.fb-why').textContent.includes('例：');
      SESSION = null; document.body.classList.remove('practicing'); speak = orig; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r == {'preview': True, 'footBefore': True, 'footSpeaks': True, 'feedback': True, 'whyHasNoDuplicateExample': True}, r

TESTS += [test_example_sentences_have_play_buttons_on_preview_feedback_and_footer]

# ---- 2026-10-26 (8): grammar progress bars in three segments ----
def test_grammar_progress_bars_show_ok3_ok1_and_seen_segments(b):
    js = """(() => { const gs = REG.grammar.filter(g => g.u === 'm1'); const rec = (ok) => ({ b: 2, due: '2099-01-01', n: ok + 1, ok, ng: ok ? 0 : 1, s: 3, d: 5 });
      gs.slice(0, 4).forEach(g => { state.srs[g.key] = rec(3); }); gs.slice(4, 7).forEach(g => { state.srs[g.key] = rec(1); }); gs.slice(7, 9).forEach(g => { state.srs[g.key] = rec(0); });
      const read = (el) => el ? [Number(el.dataset.mastered), Number(el.dataset.learned), Number(el.dataset.seen)] : null;
      location.hash = '#/course'; route(); const course = read(document.querySelector('.unit-row[data-route="#/course/m1"] .bar.stack'));
      location.hash = '#/course/m1'; route(); const unit = read(document.querySelector('.bar.stack')); const legend = document.body.textContent.includes('答對 3 次以上 4');
      location.hash = '#/today'; route(); const today = read(document.querySelector('.bar.stack'));
      const st = unitStats('m1'); return JSON.stringify({ course, unit, today, legend, stats: [st.ok3, st.ok1, st.seen0] }); })()"""
    r = json.loads(ev(b, js))
    assert r['stats'] == [4, 3, 2] and r['course'] == [4, 3, 2] and r['unit'] == [4, 3, 2] and r['today'] == [4, 3, 2] and r['legend'], r

TESTS += [test_grammar_progress_bars_show_ok3_ok1_and_seen_segments]

# ---- 2026-10-26 (9): 第 0 週 primer, new-user banner, glossary chips ----
def test_intro_lesson_renders_with_kana_table_and_marks_itself_seen(b):
    js = """(() => { location.hash = '#/course/intro'; route();
      const h3 = document.querySelectorAll('.lesson h3').length, kana = document.querySelectorAll('.kana-grid [data-act=speak]').length;
      const text = document.querySelector('.lesson').textContent; location.hash = '#/course'; route();
      const card = document.querySelector('[data-route="#/course/intro"]');
      return JSON.stringify({ h3, kana, seen: state.introSeen === true, hasAdj: text.includes('い形容詞') && text.includes('な形容詞'), hasVerbs: text.includes('五段') && text.includes('一段'), card: !!card }); })()"""
    r = json.loads(ev(b, js))
    assert r['h3'] >= 8 and r['kana'] >= 46 and r['seen'] and r['hasAdj'] and r['hasVerbs'] and r['card'], r

def test_new_user_banner_points_to_the_intro_until_dismissed(b):
    js = """(() => { location.hash = '#/today'; route(); const before = !!document.querySelector('.intro-banner');
      document.querySelector('.intro-banner [data-act=intro-dismiss]').click(); const after = !!document.querySelector('.intro-banner');
      return JSON.stringify({ before, after, seen: state.introSeen === true }); })()"""
    assert ev(b, js) == '{"before":true,"after":false,"seen":true}'

def test_part_of_speech_chip_opens_the_glossary(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.p === 'i' && meaningOptions(x));
      startSession('items', { items: [v] }); const e = currentEntry(); e.previewDone = true; e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice();
      const chip = document.querySelector('.q-sub [data-act=glossary]'); if (chip) chip.click();
      const text = modalOpen() ? document.querySelector('.modal').textContent : ''; closeModal(); SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ chip: !!chip, term: chip ? chip.dataset.term : null, explains: text.includes('い形容詞') && text.length > 40, link: text.includes('第 0 週') }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['chip'] and r['term'] == 'i' and r['explains'] and r['link'], r

TESTS += [test_intro_lesson_renders_with_kana_table_and_marks_itself_seen, test_new_user_banner_points_to_the_intro_until_dismissed, test_part_of_speech_chip_opens_the_glossary]

# ---- 2026-10-26 (10): grammar fill-in items also appear as 選正確句 and 句意 ----
def test_grammar_choice_item_builds_three_formats_on_demand(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1'); srsAnswer(g.key, true);
      const b0 = splitBlank(g.jp); const full = b0.pre + parenReadingToBracket(g.a) + b0.post;
      const c = makeGrammarQuestion(g, { forceFmt: 'g-correct' }); const m = makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); const o = makeGrammarQuestion(g, { forceFmt: 'g-choice' });
      const txt = (q) => q.options.map(x => x.text);
      return JSON.stringify({ cFmt: c.fmt, cAns: txt(c)[c.answer] === full, cAll: txt(c).every(t => t.startsWith(b0.pre) && t.endsWith(b0.post)) && new Set(txt(c)).size === 4,
        mFmt: m.fmt, mAns: txt(m)[m.answer] === g.zh, mZhHidden: m.zhText === '', mStem: jaPlain(m.fullJp) === jaPlain(full), mDistinct: new Set(txt(m)).size === 4,
        oFmt: o.fmt, oAns: txt(o)[o.answer] === parenReadingToBracket(g.a) }); })()"""
    r = json.loads(ev(b, js))
    assert r['cFmt'] == 'g-correct' and r['cAns'] and r['cAll'], r
    assert r['mFmt'] == 'g-meaning' and r['mAns'] and r['mZhHidden'] and r['mStem'] and r['mDistinct'], r
    assert r['oFmt'] == 'g-choice' and r['oAns'], r

def test_grammar_formats_rotate_after_the_first_sighting_and_prefer_unpassed(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1');
      const dist = () => { const d = {}; for (let i = 0; i < 150; i++) { const q = makeGrammarQuestion(g, {}); d[q.fmt] = (d[q.fmt] || 0) + 1; } return d; };
      const fresh = dist(); srsAnswer(g.key, true); state.srs[g.key].gf = { 'g-choice': [3, 0] }; const seen = dist();
      return JSON.stringify({ fresh, seen }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] == {'g-choice': 150}, r
    assert set(r['seen']) == {'g-choice', 'g-correct', 'g-meaning'} and r['seen']['g-choice'] < r['seen']['g-correct'] and r['seen']['g-choice'] < r['seen']['g-meaning'], r

def test_answering_a_grammar_variant_records_gf_but_not_the_word_format_record(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1');
      startSession('items', { items: [g] }); const e = currentEntry(); e.q = makeGrammarQuestion(g, { forceFmt: 'g-correct' }); renderPractice(); answerCurrent(e.q.answer);
      const r = state.srs[g.key]; const out = { gf: r.gf, f: r.f, label: srsLevelLabel(r) }; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['gf'] == {'g-correct': [1, 0]} and r.get('f') is None, r

TESTS += [test_grammar_choice_item_builds_three_formats_on_demand, test_grammar_formats_rotate_after_the_first_sighting_and_prefer_unpassed, test_answering_a_grammar_variant_records_gf_but_not_the_word_format_record]

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
