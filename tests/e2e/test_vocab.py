"""2026-10-26: vocabulary themes (主題 tab, themed practice) and multi-format practice (preview card, encores,
per-format record; since 1.0.21 a word is 已熟練 at five stars once its 假名拼字 has been right)."""
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
    assert r['sum'] == r['n'] and not r['old'] and not r['hasOther'] and r['first'] == '問候', r   # every built-in word has a theme since DATA_VERSION 3

def test_theme_tab_lists_cards_and_opens_the_word_table(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "location.hash = '#/vocab/level?lv=N5'; true"), ("wait", "document.querySelectorAll('.theme-card').length > 0"),   # 1.0.9: themes live on the level pages
        ("eval", "JSON.stringify({ cards: document.querySelectorAll('.theme-card').length, themes: themeStats('N5').length, pressed: document.querySelector('.seg [aria-pressed=\"true\"]').textContent })"),
        ("eval", "document.querySelector('.theme-card[data-c=\"飲食\"] [data-act=nav]').click(); true"),
        ("wait", "location.hash.includes('c=')"),
        ("eval", "JSON.stringify({ hash: decodeURIComponent(location.hash), rows: document.querySelectorAll('tbody tr').length, total: themeStats('N5').find(t => t.c === '飲食').total, sub: document.querySelector('.page-sub').textContent })")])
    a = json.loads(out[-3]); assert a['cards'] == a['themes'] and a['pressed'] == 'N5', a
    r = json.loads(out[-1]); assert r['hash'] == '#/vocab/list?lv=N5&c=飲食' and r['rows'] == r['total'] and '飲食' in r['sub'], r

# ---- Task 2: themed practice ----
def test_themed_practice_uses_only_that_theme(b):
    js = """(() => { startSession('vocab', { filter: 'c:飲食' }); const ks = SESSION.entries.map(e => vocabTheme(e.item));
      const out = { n: ks.length, all: ks.every(k => k === '飲食'), title: SESSION.title }; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] > 0 and r['all'] and r['title'] == '主題練習・飲食', r

# ---- Task 3: per-format record; 1.0.21: 已熟練 is five stars, and for a word with a 假名拼字 question its spelling right ----
# three other formats are not enough, nor is 我會了; a word with no spelling question (目), grammar, kanji (an old bulk
# mark's empty `f` included), a custom card, and a record with no key count at five stars
def test_mastered_means_five_stars_and_a_spelled_reading(b):
    js = """(() => { const w = __W__; const me = REG.vocab.find(v => v.builtin && v.w === '目'); const g = REG.grammar[0]; const k = REG.kanji[0];
      state.vocab.push({ id: 'cm_sp', w: '猫', r: 'ねこ', m: '貓' }); buildRegistry(); const c = REG.vocab.find(x => x.id === 'cm_sp');
      const mk = (f, extra) => Object.assign({ b: 6, due: '2099-01-01', n: 9, ok: 9, ng: 0, s: 60, d: 5 }, f === undefined ? {} : { f }, extra || {});
      const out = { three: srsLevelLabel(mk({ 'v-meaning': [3, 0], 'v-recall': [1, 2], 'v-listen': [1, 0] }), w.key), spell: srsLevelLabel(mk({ 'v-spell': [1, 0] }), w.key),
        known: srsLevelLabel(mk({ 'v-meaning': [1, 0] }, { known: 1 }), w.key), me: srsLevelLabel(mk({}), me.key), grammarEmptyF: srsLevelLabel(mk({}), g.key),
        kanjiEmptyF: srsLevelLabel(mk({}), k.key), custom: srsLevelLabel(mk({ 'v-meaning': [1, 0] }), c.key), noKey: srsLevelLabel(mk({})),
        gone: typeof formatsPassed === 'undefined' && typeof MASTER_FORMATS === 'undefined' };
      state.vocab = state.vocab.filter(x => x.id !== 'cm_sp'); buildRegistry(); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD)
    r = json.loads(ev(b, js))
    assert r == {'three': '熟悉', 'spell': '已熟練', 'known': '熟悉', 'me': '已熟練', 'grammarEmptyF': '已熟練', 'kanjiEmptyF': '已熟練', 'custom': '已熟練', 'noKey': '已熟練', 'gone': True}, r

# 1.0.21: a word at four stars or more that has not been spelled yet is asked as 假名拼字 in practice, whatever format came
# just before, but not where only options or one set format will do (階段測驗, the mock exam); once spelled the formats
# take turns again; below four stars nothing is forced; a word with no spelling question (目) never gets one
def test_four_star_words_not_yet_spelled_are_asked_to_spell(b):
    js = """(() => { const w = __W__; const t = todayStr(); const me = REG.vocab.find(v => v.builtin && v.w === '目');
      const wk = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && __SP__ && x.key !== w.key && meaningOptions(x));
      const set = (v, b, f) => { state.srs[v.key] = { b, s: LEVEL_FROM_S[b - 1], d: 5, due: addDays(t, 3), n: 4, ok: 4, ng: 0, st: 4, last: addDays(t, -10), lapse: 0, intro: addDays(t, -40), f }; };
      const fmts = (v, ctx, n) => [...new Set(Array.from({ length: n }, () => { const q = makeQuestion(v, Object.assign({}, ctx)); return q && q.fmt; }))];
      set(w, 4, { 'v-meaning': [2, 0] }); set(wk, 4, { 'v-meaning': [2, 0] }); set(me, 4, { 'v-meaning': [2, 0] });
      const ch = makeQuestion(w, { choiceOnly: true });
      const out = { daily: fmts(w, {}, 10), avoid: makeQuestion(w, { avoidFmt: 'v-spell' }).fmt, choice: Boolean(ch && ch.options.length >= 2 && ch.fmt !== 'v-spell'),
        forced: makeVocabQuestion(wk, { forceFmt: 'v-reading' }).fmt, me: !fmts(me, {}, 30).includes('v-spell') };
      state.srs[w.key].f['v-spell'] = [1, 0]; out.afterSpell = fmts(w, {}, 30).length > 1;
      set(w, 3, { 'v-meaning': [2, 0] }); out.three = fmts(w, {}, 30).length > 1;
      [w, wk, me].forEach(v => { delete state.srs[v.key]; }); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD).replace('__SP__', 'x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8')
    r = json.loads(ev(b, js))
    assert r == {'daily': ['v-spell'], 'avoid': 'v-spell', 'choice': True, 'forced': 'v-reading', 'afterSpell': True, 'three': True, 'me': True}, r

def test_answering_records_the_format_and_flash_ratings_count_as_one(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
      startSession('items', { items: [v] }); const e = currentEntry(); e.previewDone = true; const fmt = e.q.fmt; answerCurrent(e.q.answer);
      const f1 = JSON.parse(JSON.stringify(state.srs[v.key].f)); SESSION = null; document.body.classList.remove('practicing');
      recordFormat(state.srs[v.key], 'flash', true);
      return JSON.stringify({ fmt, f1, passed: Object.keys(state.srs[v.key].f).length }); })()"""
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
def test_a_new_word_comes_back_once_in_another_format_without_rescheduling(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));
      const fill = REG.grammar.filter(g => state.srs[g.key] === undefined).slice(0, 12);
      startSession('items', { items: [v, ...fill] }); const n0 = SESSION.entries.length;
      const e = currentEntry(); e.previewDone = true; const fmt1 = e.q.fmt; answerCurrent(e.q.answer);
      const enc = SESSION.entries.filter(x => x.encore && x.item.key === v.key);
      const positions = SESSION.entries.map((x, i) => x.encore ? i : -1).filter(i => i >= 0);
      let guard = 0;
      while (!(currentEntry().encore && currentEntry().item.key === v.key) && guard++ < 40) { if (!currentEntry().done) answerCurrent(currentEntry().q.answer); nextQuestion(); }   // v65: new grammar gets encores too, skip those
      const q2 = currentEntry().q; answerCurrent(q2.answer);
      const out = { grew: SESSION.entries.length - n0, enc: enc.length, positions, fmt1, fmt2: q2.fmt, n: state.srs[v.key].n, fmts: Object.keys(state.srs[v.key].f).length,
        chip: document.querySelector('.q-label .chip-warn') ? document.querySelector('.q-label .chip-warn').textContent : '' };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['grew'] >= 1 and r['enc'] == 1 and r['fmt2'] != r['fmt1'] and r['n'] == 1 and r['fmts'] == 2 and r['chip'] == '換個方式再考', r
    assert 8 <= r['positions'][0] <= 11, r

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
    assert len(r['pos']) == 3 and not r['adjacent'], r
    assert r['f'] == {r['fmt1']: [0, 1]}, r

def test_preview_card_speaks_the_new_word_even_if_auto_reading_was_saved_off(b):
    # 1.0.15: 作答後自動朗讀 is always on; a value an older version saved as off is ignored
    js = """(() => { const calls = []; const orig = speak; speak = (t) => calls.push(t);
      const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
      state.settings.autoSpeak = false; startSession('items', { items: [v] }); renderPractice();
      return new Promise(r => setTimeout(r, 300)).then(() => { SESSION = null; document.body.classList.remove('practicing'); speak = orig; return JSON.stringify({ calls: calls.length }); }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r == {'calls': 1}, r

TESTS = [test_themes_cover_every_builtin_word_once, test_theme_tab_lists_cards_and_opens_the_word_table, test_themed_practice_uses_only_that_theme,
         test_mastered_means_five_stars_and_a_spelled_reading, test_four_star_words_not_yet_spelled_are_asked_to_spell, test_answering_records_the_format_and_flash_ratings_count_as_one, test_unpassed_formats_are_preferred_on_review,
         test_new_word_shows_a_preview_card_before_its_question,
         test_a_new_word_comes_back_once_in_another_format_without_rescheduling, test_no_encore_when_no_other_format_can_be_built, test_words_already_known_get_no_encore,
         test_wrong_first_answer_keeps_requeue_and_encores_apart_and_requeue_does_not_count_as_a_pass, test_preview_card_speaks_the_new_word_even_if_auto_reading_was_saved_off]

# ---- 2026-10-26 (2): two active themes feed the new-word order ----
def test_new_words_come_from_two_themes_interleaved(b):
    # since 1.0.6 the PRE_N5 words not yet seen ride a lane of their own beside the two N5 theme lanes (three lanes interleaved)
    js = """(() => { const pool = REG.vocab.filter(v => v.builtin);
      const th = activeThemes(pool, false); const c = newVocabCandidates(pool, false).slice(0, 9);
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === th[0]).forEach(v => { state.srs[v.key] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, f: {} }; });
      const th2 = activeThemes(pool, false); const c2 = newVocabCandidates(pool, false).slice(0, 9);
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) !== '副詞與接續').forEach(v => { state.srs[v.key] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, f: {} }; });
      const th3 = activeThemes(pool, false); const c3 = newVocabCandidates(pool, false).slice(0, 6);
      const pick = (arr) => arr.map(v => [v.lv, vocabTheme(v)]);
      return JSON.stringify({ th, c: pick(c), th2, c2: pick(c2), th3, c3: pick(c3) }); })()"""
    r = json.loads(ev(b, js))
    def check(th, c):
        pre = [x for x in c if x[0] == 'PRE_N5']; n5 = [x for x in c if x[0] == 'N5']
        assert c[0][0] == 'PRE_N5' and len(pre) >= 3 and all(x[1] == '問候' for x in pre), c   # the PRE_N5 lane (問候 first) is interleaved, not a block (a nearly empty theme lane leaves it more slots)
        assert n5 and all(x[1] in th for x in n5) and n5[0][1] == th[0], (th, c)                   # the other slots come from the two active N5 themes
    assert len(r['th']) == 2, r
    check(r['th'], r['c']); assert r['th2'][0] == r['th'][1], r; check(r['th2'], r['c2'])
    assert r['th3'] == ['副詞與接續'] and all(x == ['PRE_N5', '問候'] or x == ['N5', '副詞與接續'] for x in r['c3']), r

def test_custom_cards_still_alternate_with_builtins(b):
    js = """(() => { state.vocab.push({ id: 'c1', w: '猫', r: 'ねこ', m: '貓' }, { id: 'c2', w: '犬', r: 'いぬ', m: '狗' }); buildRegistry();
      const c = newVocabCandidates(REG.vocab, false).slice(0, 4).map(v => v.builtin ? 'b' : 'c'); return JSON.stringify(c); })()"""
    assert ev(b, js) == '["b","c","b","c"]'

def test_today_names_the_active_themes(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; route(); JSON.stringify({ t: document.querySelector('.plan-topics').textContent, th: activeThemes(REG.vocab.filter(v => v.builtin), false) })")])
    r = json.loads(out[-1])
    assert '問候' in r['t'] and all(th in r['t'] for th in r['th']), r   # the PRE_N5 lane (問候 first) and the two active N5 themes

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
    js = """(() => { const ws = REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === '身體與健康');
      const rec = (b, f) => ({ b, due: '2099-01-01', n: 5, ok: 5, ng: 0, s: 30, d: 5, f });
      ws.slice(0, 2).forEach(v => { state.srs[v.key] = rec(6, { 'v-meaning': [1, 0], 'v-spell': [1, 0] }); });   // 已熟練: five stars, spelled
      ws.slice(2, 5).forEach(v => { state.srs[v.key] = rec(3, {}); });
      ws.slice(5, 9).forEach(v => { state.srs[v.key] = rec(1, {}); });
      location.hash = '#/vocab/level?lv=N5'; route();
      const card = document.querySelector('.theme-card[data-c="身體與健康"]');
      const bar = card.querySelector('.bar.stack'); const d = bar.dataset; const bg = getComputedStyle(bar).backgroundImage;
      return JSON.stringify({ total: ws.length, segs: [Number(d.mastered), Number(d.learned), Number(d.seen)], gradient: bg.startsWith('linear-gradient'), stops: (bg.match(/%/g) || []).length }); })()"""
    r = json.loads(ev(b, js))
    assert r['segs'] == [2, 3, 4] and r['gradient'] and r['stops'] >= 6, r

def test_today_lists_the_vocab_themes_and_grammar_points_of_the_session(b):
    js = """(() => { location.hash = '#/today'; route();
      const box = document.querySelector('.plan-topics'); const text = box ? box.textContent.replace(/\\s+/g, ' ') : '';
      const q = dailyQueue();
      const pts = [...new Set(q.items.filter(it => it.kind === 'g').map(it => it.pt).filter(Boolean))];
      recentAccuracy = () => 0.5; delete state.today.plan; route();
      return JSON.stringify({ text, themes: activeThemes(REG.vocab, false).join('・'), pts, outline: !!document.querySelector('.plan-outline'), planLine: document.querySelector('.plan-line').textContent,
        note: (document.querySelector('.plan-note') || {}).textContent || '' }); })()"""
    r = json.loads(ev(b, js))
    assert r['themes'] and r['themes'] in r['text'] and '單字主題' in r['text'], r
    assert r['pts'] and '文法' in r['text'] and sum(1 for p in r['pts'] if p in r['text']) >= min(3, len(r['pts'])), r
    assert not r['outline'] and '今天的主題' not in r['planLine'] and '正確率' in r['note'], r

TESTS += [test_theme_card_bar_has_three_segments_for_seen_learned_mastered, test_today_lists_the_vocab_themes_and_grammar_points_of_the_session]

# ---- 2026-10-26 (4): the daily session keeps its words within 1–3 themes ----
DUE = "(v) => { state.srs[v.key] = { b: 2, due: addDays(todayStr(), -1), n: 3, ok: 3, ng: 0, s: 3, d: 5, f: {}, last: addDays(todayStr(), -4) }; }"

# ---- 2026-10-26 (5): new grammar first, least-practised reviews first ----
def test_new_grammar_is_not_squeezed_out_by_a_review_backlog(b):
    js = """(() => { const due = (v, ok) => { state.srs[v.key] = { b: 2, due: addDays(todayStr(), -1), n: ok, ok, ng: 0, s: 3, d: 5, f: {}, last: addDays(todayStr(), -4) }; };
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 40).forEach(v => due(v, 2)); saveState();
      const plan = computeDailyPlan(20); return JSON.stringify({ newG: plan.newG.length, limit: plan.split.g, dueV: plan.dueV.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['dueV'] == 40 and r['newG'] == r['limit'] and r['limit'] > 0, r   # 1.0.20: the backlog never shrinks the day's share of new grammar

def test_grammar_slots_take_new_items_first_then_the_least_practised_reviews(b):
    js = """(() => { const due = (g, ok) => { state.srs[g.key] = { b: 2, due: addDays(todayStr(), -2 - (ok % 3)), n: ok, ok, ng: 0, s: 3, d: 5, last: addDays(todayStr(), -5) }; };
      const gs = REG.grammar.filter(g => g.u === 'm1'); gs.slice(0, 10).forEach(g => due(g, 3)); gs.slice(10, 15).forEach(g => due(g, 1)); delete state.today.plan; saveState();
      const q = dailyQueue(20); const G = q.items.filter(it => it.kind === 'g'); const all = dailyQueue(q.total).items.filter(it => it.kind === 'g');
      const fresh = G.filter(it => !state.srs[it.key]).length; const revOk = G.filter(it => state.srs[it.key]).map(it => state.srs[it.key].ok);
      return JSON.stringify({ fresh, dayFresh: all.filter(it => !state.srs[it.key]).length, revOk, limit: dailyPlan().split.g }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] >= 2 and r['dayFresh'] == r['limit'], r   # a session holds its share of the day's new grammar; the whole day holds the quota
    assert sum(1 for ok in r['revOk'] if ok == 1) == 5, r   # every least-practised item is in before any well-known one

TESTS += [test_new_grammar_is_not_squeezed_out_by_a_review_backlog, test_grammar_slots_take_new_items_first_then_the_least_practised_reviews]

# ---- 2026-10-26 (6): the 單字主題 line never vanishes ----
def test_topics_line_names_custom_cards_or_a_finished_day_instead_of_disappearing(b):
    js = """(() => { const snap = () => { location.hash = '#/today'; route(); const t = document.querySelector('.plan-topics'); return t ? t.textContent.replace(/\\s+/g, ' ').trim() : null; };
      state.today.newV = 99; state.today.newG = 99;   // today's new-word and new-grammar quota already used
      for (let i = 0; i < 6; i++) { state.vocab.push({ id: 'cx' + i, w: '猫' + i, r: 'ねこ', m: '貓' + i }); }
      buildRegistry(); REG.vocab.filter(v => !v.builtin).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(todayStr(), -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, f: {}, last: addDays(todayStr(), -3) }; });
      delete state.today.plan; saveState(); const customOnly = snap();
      const words = dailyQueue().items.filter(it => it.kind === 'v');
      state.settings.includeImported = 'off'; delete state.today.plan; saveState(); const noWords = snap();
      const words2 = dailyQueue().items.filter(it => it.kind === 'v');
      return JSON.stringify({ customOnly, allCustom: words.length > 0 && words.every(it => !it.builtin), noWords, none: words2.length === 0 }); })()"""
    r = json.loads(ev(b, js))
    assert r['allCustom'] and r['customOnly'] and '單字主題' in r['customOnly'] and '自訂字卡' in r['customOnly'], r
    assert r['none'] and r['noWords'] and '單字主題今天的單字已完成' in r['noWords'] and '明天' not in r['noWords'], r

TESTS += [test_topics_line_names_custom_cards_or_a_finished_day_instead_of_disappearing]

# ---- 2026-10-26 (7): every example sentence has a play button ----
def test_example_sentences_have_play_buttons_on_preview_feedback_and_footer(b):
    js = """(() => { const calls = []; const orig = speak; speak = (t) => calls.push(t);
      const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.ex && meaningOptions(x)); const ex = exPlain(v.ex); const exs = vocabExamples(v).map(x => exPlain(x.ex));   // a question uses either example
      startSession('items', { items: [v] }); renderPractice();
      const pv = document.querySelector('.preview .example [data-act=speak]');
      const out = { preview: pv ? pv.dataset.text === ex : false };
      ACTIONS['preview-go'](); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice();
      const foot = document.querySelector('.pr-actions [data-act=speak-example]'); out.footBefore = !!foot;
      let spoken = ''; if (foot) { foot.click(); spoken = calls[calls.length - 1]; out.footSpeaks = exs.includes(spoken); }
      answerCurrent(e.q.answer);
      const fb = document.querySelector('.feedback .example [data-act=speak]'); out.feedback = fb ? exs.includes(fb.dataset.text) && fb.dataset.text === spoken : false;
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
      location.hash = '#/course/m1'; route(); const unit = read(document.querySelector('.bar.stack')); const legend = document.body.textContent.includes('熟練 4');
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
    assert r['h3'] == 13 and r['kana'] >= 46 and r['seen'] and r['hasAdj'] and r['hasVerbs'] and r['card'], r

def test_new_user_banner_points_to_the_intro_until_dismissed(b):
    js = """(() => { state.startChosen = true; location.hash = '#/today'; route(); const before = !!document.querySelector('.intro-banner');   // after the 起點 choice (1.0.6) the 第 0 週 banner shows
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

# ---- 2026-10-26 (10): grammar fill-in items also appear as 句意 (1.0.23: no longer as 選正確句) ----
def test_grammar_choice_item_builds_two_formats_on_demand(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1'); srsAnswer(g.key, true);
      const b0 = splitBlank(g.jp); const full = b0.pre + parenReadingToBracket(g.a) + b0.post;
      const m = makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); const o = makeGrammarQuestion(g, { forceFmt: 'g-choice' });
      const txt = (q) => q.options.map(x => x.text);
      return JSON.stringify({ fmts: grammarFormats(g),
        mFmt: m.fmt, mAns: txt(m)[m.answer] === g.zh || txt(m)[m.answer] === g.pt, mZhHidden: m.zhText === '', mStem: jaPlain(m.fullJp) === jaPlain(full), mDistinct: new Set(txt(m)).size === 4,
        oFmt: o.fmt, oAns: txt(o)[o.answer] === parenReadingToBracket(g.a) }); })()"""
    r = json.loads(ev(b, js))
    assert r['fmts'] == ['g-choice', 'g-meaning'], r
    assert r['mFmt'] == 'g-meaning' and r['mAns'] and r['mZhHidden'] and r['mStem'] and r['mDistinct'], r
    assert r['oFmt'] == 'g-choice' and r['oAns'], r

def test_grammar_formats_rotate_after_the_first_sighting_and_prefer_unpassed(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1');
      const dist = () => { const d = {}; for (let i = 0; i < 150; i++) { const q = makeGrammarQuestion(g, {}); d[q.fmt] = (d[q.fmt] || 0) + 1; } return d; };
      const fresh = dist(); srsAnswer(g.key, true); state.srs[g.key].gf = { 'g-choice': [3, 0] }; const seen = dist();
      return JSON.stringify({ fresh, seen }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] == {'g-choice': 150}, r
    assert set(r['seen']) == {'g-choice', 'g-meaning'} and r['seen']['g-choice'] < r['seen']['g-meaning'], r

def test_answering_a_grammar_variant_records_gf_but_not_the_word_format_record(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1');
      startSession('items', { items: [g] }); const e = currentEntry(); e.q = makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); renderPractice(); answerCurrent(e.q.answer);
      const r = state.srs[g.key]; const out = { gf: r.gf, f: r.f, label: srsLevelLabel(r) }; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['gf'] == {'g-meaning': [1, 0]} and r.get('f') is None, r

TESTS += [test_grammar_choice_item_builds_two_formats_on_demand, test_grammar_formats_rotate_after_the_first_sighting_and_prefer_unpassed, test_answering_a_grammar_variant_records_gf_but_not_the_word_format_record]

# ---- 2026-10-26 (11): N4 listening and reading pools are deep enough for a two-week unit ----
def test_every_n4_unit_has_enough_listening_and_reading_and_all_build(b):
    js = """(() => { const units = DATA.UNITS.filter(u => u.lv === 'N4').map(u => u.id);
      const per = units.map(u => ({ u, l: REG.listen.filter(x => x.u === u).length, r: REG.read.filter(x => x.u === u).length }));
      const ids = new Set(); let dup = 0; [...DATA.LISTEN, ...DATA.READ].forEach(x => { if (ids.has(x.id)) dup++; ids.add(x.id); });
      const bad = REG.listen.concat(REG.read).filter(it => !makeQuestion(it, {})).map(it => it.id);
      const schema = DATA.LISTEN.filter(x => !(x.op && x.op.includes(x.a) && ((x.t === 'dialog' && x.op.length === 4 && x.script && x.q) || (x.t === 'resp' && x.op.length === 3 && x.line) || (x.t === 'scene' && x.op.length === 3 && x.scene)))).map(x => x.id)
        .concat(DATA.READ.filter(x => !(x.op && x.op.length === 4 && x.op.includes(x.a) && x.passage && x.q && x.zh)).map(x => x.id));
      return JSON.stringify({ per, dup, bad, schema }); })()"""
    r = json.loads(ev(b, js))
    assert all(x['l'] >= 11 and x['r'] >= 3 for x in r['per']), r['per']
    assert r['dup'] == 0 and r['bad'] == [] and r['schema'] == [], r

TESTS += [test_every_n4_unit_has_enough_listening_and_reading_and_all_build]

# ---- 2026-10-26 (12): kana spelling and matching formats ----
SPELL_WORD = "REG.vocab.find(x => x.builtin && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 3 && x.r.length <= 6 && meaningOptions(x) && recallOptions(x))"
def test_kana_spelling_question_is_answered_by_tapping_tiles(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true); state.srs[v.key].due = todayStr();
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
      const q = e.q; const tiles = [...document.querySelectorAll('.spell-tile')];
      const out = { fmt: q.fmt, custom: q.custom, opts: document.querySelectorAll('.opt').length, tiles: tiles.length, covers: [...v.r].every(ch => q.tiles.filter(t => t === ch).length >= [...v.r].filter(c => c === ch).length), extra: q.tiles.length > v.r.length, ans: q.options[q.answer].text === v.r };
      for (const ch of v.r) { const t = [...document.querySelectorAll('.spell-tile:not([disabled])')].find(el => el.dataset.ch === ch); t.click(); }
      out.done = e.done; out.ok = e.chosen === q.answer; out.f = state.srs[v.key].f['v-spell'];
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fmt'] == 'v-spell' and r['opts'] == 0 and r['covers'] and r['extra'] and r['ans'] and r['done'] and r['ok'] and r['f'] == [1, 0], r

# 1.0.22: no 退一格 button; a placed kana is tapped on the line above to send it back
def test_wrong_spelling_shows_the_right_reading_and_a_placed_kana_taps_back(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
      const wrong = e.q.tiles.findIndex(t => t !== v.r[0]); document.querySelector(`.spell-tile[data-i="${wrong}"]`).click();
      const typed1 = document.querySelector('.spell-out').textContent; const noBack = !document.querySelector('[data-act=spell-back]') && !document.getElementById('view').textContent.includes('退一格');
      document.querySelector('.spell-out [data-act=spell-untap]').click(); const typed2 = document.querySelector('.spell-out').textContent;
      const freed = !document.querySelector(`.spell-tile[data-i="${wrong}"]`).disabled;
      // now spell it wrong on purpose: first tile wrong, then fill up to length
      document.querySelector(`.spell-tile[data-i="${wrong}"]`).click();
      while (!e.done) { const t = document.querySelector('.spell-tile:not([disabled])'); if (!t) break; t.click(); }
      const head = document.querySelector('.fb-head').textContent; const out = { typed1, typed2, noBack, freed, done: e.done, ok: e.chosen === e.q.answer, showsRight: head.includes(v.r), piecesAfter: document.querySelectorAll('.spell-out [data-act]').length };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert len(r['typed1']) == 1 and r['typed2'] == '' and r['noBack'] and r['freed'] and r['done'] and not r['ok'] and r['showsRight'], r
    assert r['piecesAfter'] == 0, r   # answered: the line is plain text

# 1.0.24: 配對 takes its other five words from the learned ones; this gives every built-in word of v's part of speech a record
LEARN_KIND = "((v) => { const t = todayStr(); REG.vocab.filter(x => x.builtin && x.p === v.p && x.key !== v.key && !state.srs[x.key]).forEach(x => { state.srs[x.key] = { b: 2, due: addDays(t, 5), n: 2, ok: 2, ng: 0, st: 2, s: 3, d: 5, last: t, lapse: 0 }; }); })"
# 花 and five nature nouns, all with different meanings and readings; 鼻 also reads はな and 食べる is a verb
MATCH_SET = """const id = (i) => REG.byKey.get('v:' + i); const t = todayStr();
      const rec = () => ({ b: 3, due: addDays(t, 5), n: 3, ok: 3, ng: 0, st: 3, s: 8, d: 5, last: addDays(t, -2), lapse: 0, f: {} });
      const T = id('n5a-150'), P = ['n5a-153', 'n5a-154', 'n5a-147', 'n5a-156', 'n5a-140'].map(id), homo = id('n5a-127'), verb = id('n5c-067');"""

def test_matching_question_pairs_six_words_with_their_meanings(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true); __L__(v);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      const q = e.q; const out = { fmt: q.fmt, pairs: q.pairs.length, hasTarget: q.pairs.some(p => p[0] === jaPlain(v.w) && p[1] === v.m), words: document.querySelectorAll('.match-word').length, meanings: document.querySelectorAll('.match-meaning').length, opts: document.querySelectorAll('.opt').length };
      // a wrong tap on the word itself first, then match everything
      const w0 = document.querySelector(`.match-word[data-w="${jaPlain(v.w)}"]`); w0.click(); const wrongM = [...document.querySelectorAll('.match-meaning')].find(m => m.dataset.m !== v.m); wrongM.click();
      out.afterWrong = document.querySelectorAll('.match-word.matched').length;
      for (const [w, m] of q.pairs) { document.querySelector(`.match-word[data-w="${w}"]`).click(); document.querySelector(`.match-meaning[data-m="${m}"]`).click(); }
      out.matched = document.querySelectorAll('.match-word.matched').length; out.done = e.done; out.ok = e.chosen === q.answer; out.f = state.srs[v.key].f['v-match'];
      out.book = state.mistakes.some(m => m.key === v.key && !m.mastered);
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD).replace('__L__', LEARN_KIND)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fmt'] == 'v-match' and r['pairs'] == 6 and r['hasTarget'] and r['words'] == 6 and r['meanings'] == 6 and r['opts'] == 0, r
    assert r['afterWrong'] == 0 and r['matched'] == 6 and r['done'] and not r['ok'] and r['f'] == [0, 1] and r['book'], r

def test_new_formats_join_the_rotation_after_the_first_sighting(b):
    js = """(() => { const v = __W__; __L__(v); const fresh = vocabFormats(v).map(x => x[0]); srsAnswer(v.key, true); const seen = vocabFormats(v).map(x => x[0]);
      return JSON.stringify({ fresh, seen }); })()""".replace('__W__', SPELL_WORD).replace('__L__', LEARN_KIND)
    r = json.loads(ev(b, js))
    assert 'v-spell' not in r['fresh'] and 'v-match' not in r['fresh'] and 'v-spell' in r['seen'] and 'v-match' in r['seen'], r

# 1.0.24: six pairs, the word and five learned words of its part of speech, no two read alike (the left column shows kana
# only); with four such words learned the question is not asked
def test_matching_takes_five_learned_words_of_its_kind_and_shows_their_kana(b):
    js = """(() => { __S__
      [T, ...P.slice(0, 4), homo, verb].forEach(x => { state.srs[x.key] = rec(); });
      const has = () => vocabFormats(T).map(x => x[0]).includes('v-match');
      const out = { four: matchPairs(T) === null, fourOffered: has() };
      state.srs[P[4].key] = rec();
      out.sets = [...new Set(Array.from({ length: 12 }, () => (matchPairs(T) || []).map(p => p[0]).sort().join('')))]; out.offered = has();
      startSession('items', { items: [T] }); const e = currentEntry(); e.q = makeVocabQuestion(T, { forceFmt: 'v-match' }); renderPractice();
      const texts = (sel) => [...document.querySelectorAll(sel)].map(el => el.textContent.trim()).sort().join('');
      out.left = texts('.match-word'); out.right = texts('.match-meaning');
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__S__', MATCH_SET)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['four'] and not r['fourOffered'] and r['offered'], r
    assert r['sets'] == [''.join(sorted('花犬猫山魚雨'))], r
    assert r['left'] == ''.join(sorted(['はな', 'いぬ', 'ねこ', 'やま', 'さかな', 'あめ'])) and r['right'] == ''.join(sorted('花狗貓山魚雨')), r

# 1.0.24: a word paired wrong is answered wrong on its own (fewer stars, the 1/3/7 ladder, the notebook, 再練一次); the word
# whose meaning it took is untouched and the target, paired right, counts as right. The session list names that word,
# 重練答錯的題目 asks it, and 手滑 puts every record back
def test_matching_puts_only_the_word_paired_wrong_in_the_notebook(b):
    js = """(() => { __S__
      [T, ...P].forEach(x => { state.srs[x.key] = rec(); }); saveState();
      const snap = (x) => JSON.stringify(state.srs[x.key]); const before = [T, ...P].map(snap); const mist = state.mistakes.length;
      const inBook = (x) => state.mistakes.some(m => m.key === x.key && !m.mastered);
      const play = () => { startSession('items', { items: [T] }); const e = currentEntry(); e.q = makeVocabQuestion(T, { forceFmt: 'v-match' }); renderPractice();
        const word = (w) => document.querySelector(`.match-word[data-w="${w}"]`), meaning = (m) => document.querySelector(`.match-meaning[data-m="${m}"]`);
        word('犬').click(); meaning('貓').click();   // 犬 given 猫's meaning
        for (const [w, m] of e.q.pairs) { word(w).click(); meaning(m).click(); }
        return e; };
      let e = play(); const dog = state.srs[P[0].key], fl = state.srs[T.key], entry = state.mistakes.find(m => m.key === P[0].key) || {};
      const out = { done: e.done, wrong: e.chosen !== e.q.answer && SESSION.stats.wrong === 1,
        dog: { rl: dog.rl, book: inBook(P[0]), answer: entry.answer, chose: entry.wrong, retry: SESSION.entries.some(x => x.requeued && x.item === P[0]) }, dogStars: dog.b,
        untouched: [1, 2, 3, 4].map(k => snap(P[k]) === before[k + 1]),
        target: { ok: fl.ok, rl: 'rl' in fl, book: inBook(T), retry: SESSION.entries.some(x => x.requeued && x.item === T) },
        head: document.querySelector('.fb-head').textContent };
      ACTIONS.slip();
      out.slip = { records: [T, ...P].map(snap).every((s, k) => s === before[k]), book: state.mistakes.length === mist, retry: SESSION.entries.filter(x => x.requeued).length };
      play(); SESSION.idx = SESSION.entries.length; renderPractice();
      out.summary = [...document.querySelectorAll('#view .list-item')].map(el => el.textContent);
      ACTIONS['retry-wrong'](); out.retryItems = SESSION.entries.map(x => x.item.w);
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__S__', MATCH_SET)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['done'] and r['wrong'], r
    assert r['dog'] == {'rl': 0, 'book': True, 'answer': '狗', 'chose': '貓', 'retry': True} and r['dogStars'] <= 1, r
    assert r['untouched'] == [True] * 4 and r['target'] == {'ok': 4, 'rl': False, 'book': False, 'retry': False}, r
    assert 'いぬ' in r['head'] and '正確答案' not in r['head'], r
    assert r['slip'] == {'records': True, 'book': True, 'retry': 0}, r
    assert len(r['summary']) == 1 and all(s in r['summary'][0] for s in ('犬', '狗', '貓')) and '花' not in r['summary'][0], r
    assert r['retryItems'] == ['犬'], r

# 1.0.24: a matching question has no sentence of its own: nothing is read once the last pair is made (each word is read as
# it is tapped), no example is shown or listed, and there is no 例句 or 發音 button; the explanation gives every reading
def test_matching_reads_and_shows_no_example_sentence(b):
    js = """(() => { __S__
      [T, ...P].forEach(x => { state.srs[x.key] = rec(); });
      startSession('items', { items: [T] }); const e = currentEntry(); e.q = makeVocabQuestion(T, { forceFmt: 'v-match' }); renderPractice();
      const buttons = () => ({ example: !!document.querySelector('[data-act=speak-example]'), replay: !!document.querySelector('.pr-actions [data-act=replay]') });
      const before = buttons();
      window.__spoken = []; window.speak = (t, o) => { __spoken.push(t); return Promise.resolve(); };
      for (const [w, m] of e.q.pairs) { document.querySelector(`.match-word[data-w="${w}"]`).click(); document.querySelector(`.match-meaning[data-m="${m}"]`).click(); }
      const why = (document.querySelector('.fb-why') || {}).textContent || '';
      const out = { done: e.done, ok: e.chosen === e.q.answer, spoken: __spoken.slice().sort(), before, after: buttons(), block: !!document.querySelector('.feedback .example'),
        listed: e.q.why.includes('例：'), readings: ['はな', 'いぬ', 'ねこ', 'やま', 'さかな', 'あめ'].every(x => why.includes(x)) };
      ACTIONS.replay(); out.afterReplay = __spoken.length;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__S__', MATCH_SET)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['done'] and r['ok'] and r['spoken'] == sorted('花犬猫山魚雨'), r   # the six words as they were tapped, then nothing
    assert r['before'] == {'example': False, 'replay': False} and r['after'] == {'example': False, 'replay': False} and not r['block'], r
    assert not r['listed'] and r['readings'] and r['afterReplay'] == 6, r

# 1.0.24 review: 犬 missed on its own, then paired wrong in 花's 配對 together with 猫. 重練答錯的題目 asks each word once;
# 手滑 on the 配對 puts both records and notebook entries back as they were after 犬's own miss and keeps that miss's 再練一次
def test_matching_slip_keeps_an_earlier_retry_and_retry_asks_each_word_once(b):
    js = """(() => { __S__
      const snap = (x) => JSON.stringify(state.srs[x.key]); const book = (x) => JSON.stringify(state.mistakes.find(m => m.key === x.key) || null);
      const copies = (x) => SESSION.entries.filter(y => y.requeued && y.item && y.item.key === x.key).length;
      const word = (w) => document.querySelector(`.match-word[data-w="${w}"]`), meaning = (m) => document.querySelector(`.match-meaning[data-m="${m}"]`);
      const play = () => {
        [T, ...P].forEach(x => { state.srs[x.key] = rec(); }); state.mistakes = [];
        startSession('items', { items: [P[0], T] }); let e = currentEntry(); e.q = makeVocabQuestion(P[0], { forceFmt: 'v-meaning' }); renderPractice();
        answerCurrent((e.q.answer + 1) % e.q.options.length);
        const mid = { dog: snap(P[0]), dogBook: book(P[0]), cat: snap(P[1]), n: state.mistakes.length };
        nextQuestion(); e = currentEntry(); e.q = makeVocabQuestion(T, { forceFmt: 'v-match' }); renderPractice();
        word('犬').click(); meaning('貓').click(); word('猫').click(); meaning('狗').click();
        for (const [w, m] of e.q.pairs) { word(w).click(); meaning(m).click(); }
        return mid; };
      let mid = play();
      const out = { dogCopies: copies(P[0]), catCopies: copies(P[1]), book: state.mistakes.length };
      SESSION.idx = SESSION.entries.length; renderPractice(); ACTIONS['retry-wrong'](); out.retry = SESSION.entries.map(x => x.item.w).sort().join('');
      mid = play(); ACTIONS.slip();
      out.slip = { dogCopies: copies(P[0]), catCopies: copies(P[1]), dog: snap(P[0]) === mid.dog, dogBook: book(P[0]) === mid.dogBook, cat: snap(P[1]) === mid.cat, book: state.mistakes.length === mid.n };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__S__', MATCH_SET)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['dogCopies'] == 2 and r['catCopies'] == 1 and r['book'] == 2 and r['retry'] == ''.join(sorted('犬猫')), r
    assert r['slip'] == {'dogCopies': 1, 'catCopies': 0, 'dog': True, 'dogBook': True, 'cat': True, 'book': True}, r

# 1.0.24 review: an encore or 再練一次 asks the one word again, so it is never a 配對 (five other words would ride along);
# a 配對 answered wrong without a single tap (as some test helpers do) counts the word asked as wrong
def test_matching_is_never_an_encore_and_an_untapped_wrong_answer_misses_the_word(b):
    js = """(() => { __S__
      [T, ...P].forEach(x => { state.srs[x.key] = rec(); });
      const out = { offered: vocabFormats(T).some(x => x[0] === 'v-match'), encore: Array.from({ length: 60 }, () => (makeVocabQuestion(T, { encore: true }) || {}).fmt).includes('v-match') };
      startSession('items', { items: [T] }); const e = currentEntry(); e.q = makeVocabQuestion(T, { forceFmt: 'v-match' }); renderPractice();
      answerCurrent(1);
      out.untapped = { rl: state.srs[T.key].rl, book: state.mistakes.some(m => m.key === T.key && !m.mastered), retry: SESSION.entries.some(x => x.requeued && x.item === e.item) };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__S__', MATCH_SET)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r == {'offered': True, 'encore': False, 'untapped': {'rl': 0, 'book': True, 'retry': True}}, r

TESTS += [test_kana_spelling_question_is_answered_by_tapping_tiles, test_wrong_spelling_shows_the_right_reading_and_a_placed_kana_taps_back, test_matching_question_pairs_six_words_with_their_meanings, test_new_formats_join_the_rotation_after_the_first_sighting,
          test_matching_takes_five_learned_words_of_its_kind_and_shows_their_kana, test_matching_puts_only_the_word_paired_wrong_in_the_notebook, test_matching_reads_and_shows_no_example_sentence,
          test_matching_slip_keeps_an_earlier_retry_and_retry_asks_each_word_once, test_matching_is_never_an_encore_and_an_untapped_wrong_answer_misses_the_word]


# ---- 2026-10-26 (14): review leftovers — furigana known rule, theme list deck button, encore feedback, session counts ----
def test_furigana_known_hiding_follows_the_mastered_label(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.w === '今日'); const rec = (f) => ({ b: 6, due: '2099-01-01', n: 9, ok: 9, ng: 0, s: 60, d: 5, f });
      state.srs[v.key] = rec({ 'v-meaning': [1, 0], 'v-recall': [1, 0], 'v-cloze': [1, 0] }); const a = /class="known"/.test(furi('今日は'));   // three formats, not spelled
      state.srs[v.key] = rec({ 'v-spell': [1, 0] }); const c = /class="known"/.test(furi('今日は'));
      return JSON.stringify({ a, c }); })()"""
    assert ev(b, js) == '{"a":false,"c":true}'

def test_theme_word_table_hides_the_custom_deck_button(b):
    js = """(() => { location.hash = '#/vocab/list?c=飲食'; route(); const inTheme = !!document.querySelector('.seg [data-lv=custom]');
      location.hash = '#/vocab/list'; route(); const plain = !!document.querySelector('.seg [data-lv=custom]'); return JSON.stringify({ inTheme, plain }); })()"""
    assert ev(b, js) == '{"inTheme":false,"plain":true}'

def test_encore_feedback_shows_the_level_and_says_it_does_not_reschedule(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));
      const fill = REG.grammar.filter(g => !state.srs[g.key]).slice(0, 12); startSession('items', { items: [v, ...fill] });
      const e = currentEntry(); e.previewDone = true; answerCurrent(e.q.answer);
      let guard = 0; while (!currentEntry().encore && guard++ < 30) { if (!currentEntry().done) answerCurrent(currentEntry().q.answer); nextQuestion(); }
      answerCurrent(currentEntry().q.answer); const meta = document.querySelector('.fb-meta').textContent;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify({ meta }); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert '不影響排程' in r['meta'] and ('學習中' in r['meta'] or '待加強' in r['meta'] or '熟悉' in r['meta']), r

def test_vocab_practice_buttons_show_the_question_count(b):
    js = """(() => { location.hash = '#/vocab/level?lv=N5'; route(); const card = document.querySelector('.theme-card[data-c="飲食"] [data-act=start-vocab]').textContent;
      const want = (f) => { const items = buildVocabQueue(f, 20); return items.length + encoreEstimate(items); };
      const level = document.querySelector('.page-head [data-act=start-vocab]').textContent;
      location.hash = '#/vocab/cards'; route(); const head = document.querySelector('.page-head [data-act=start-vocab]').textContent;
      location.hash = '#/vocab/list?c=飲食'; route(); const detail = document.querySelector('.page-head [data-act=start-vocab]').textContent;
      return JSON.stringify({ card, cardWant: want('t:N5:飲食'), level, levelWant: want('N5'), head, headWant: want('all'), detail, detailWant: want('c:飲食') }); })()"""
    r = json.loads(ev(b, js))
    assert r['card'] == f"練習・{r['cardWant']} 題" and r['level'] == f"練這個等級・{r['levelWant']} 題" and r['head'] == f"單字測驗・{r['headWant']} 題" and r['detail'] == f"練習這個主題・{r['detailWant']} 題", r

TESTS += [test_furigana_known_hiding_follows_the_mastered_label, test_theme_word_table_hides_the_custom_deck_button, test_encore_feedback_shows_the_level_and_says_it_does_not_reschedule, test_vocab_practice_buttons_show_the_question_count]

# ---- 2026-10-27: content pass (DATA_VERSION 3) ----
def test_vocab_content_pass_adds_keigo_common_words_and_removes_duplicates(b):
    js = """(() => { const V = REG.vocab.filter(v => v.builtin); const byW = (w) => V.find(v => v.w === w);
      const dupM = {}; V.forEach(v => { dupM[v.m] = (dupM[v.m] || 0) + 1; }); const dups = Object.entries(dupM).filter(([, n]) => n > 1).map(([m]) => m);
      const keigo = V.filter(v => v.c === '溝通與敬語').map(v => v.w);
      const raw = ['吸う', '鳴く', 'かぶる'].map(w => vSurfaceInfo(byW(w)).form);
      const bare = V.filter(v => /^(n5e|n4f)-/.test(v.id)).filter(v => /[一-龯]/.test(furi(v.ex.replace(/[{}]/g, '')).replace(/<ruby>.*?<[/]ruby>/g, '')) ).map(v => v.w);
      return JSON.stringify({ n: V.length, dups, keigo, old: V.filter(v => v.c === '舊版').length, themes: THEME_ORDER.includes('溝通與敬語'),
        added: ['おにぎり', '紫', '村', '役に立つ', '召し上がる', 'ピンク'].map(w => Boolean(byW(w))), merged: [Boolean(byW('旅行')), Boolean(byW('旅行する')), Boolean(byW('運動')), Boolean(byW('運動する'))], raw, bare }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] >= 1440 and r['dups'] == [] and r['old'] == 0 and r['themes'], r
    assert len(r['keigo']) >= 14 and all(w in r['keigo'] for w in ['いらっしゃる', 'おっしゃる', '召し上がる', '申し上げる', '伺う', 'いただく']), r['keigo']
    assert all(r['added']) and r['merged'] == [False, True, False, True], r
    assert all(f != 'raw' for f in r['raw']) and r['bare'] == [], r

def test_kanji_table_covers_the_frequent_kanji_of_the_vocabulary(b):
    js = """(() => { const K = REG.kanji || DATA.KANJI; const has = (c) => K.some(k => k.k === c);
      const want = '冷予晩留機当失結変番約内昨階全部背晴飛交誰礼消熱汚夫嫌初具席成法議付案美術段相連決残無再鳴割訳最歳両歯腹曇向黄園差';
      const missing = [...want].filter(c => !has(c));
      const bad = K.filter(k => !k.m || !(k.ex || []).some(([w, r]) => w && r && r.length >= 2 && w !== r)).map(k => k.k);
      const used = new Set(); REG.vocab.filter(v => v.builtin).forEach(v => [...jaPlain(v.w)].forEach(ch => { if (/[一-龯]/.test(ch)) used.add(ch); }));
      return JSON.stringify({ n: K.length, missing, bad, notInTable: [...used].filter(c => !has(c)).length }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] >= 340 and r['missing'] == [] and r['bad'] == [], r
    assert r['notInTable'] < 530, r   # 1.0.8 added 200 words (牛丼、味噌汁…); kanji outside the table still get furigana from the word itself

def test_records_of_merged_builtin_words_move_to_the_kept_entry(b):
    js = """(() => { const rec = (n) => ({ b: 2, due: todayStr(), n, ok: n, ng: 0, s: 3, d: 5, last: todayStr(), f: {} });
      const s1 = normalizeState({ srs: { 'v:n5b-118': rec(4) } });                                    // only the dropped 旅行 → moves to 旅行する
      const s2 = normalizeState({ srs: { 'v:n4a-051': rec(7), 'v:n4b-103': rec(2) } });               // both 卒業 and 卒業する → the one answered more wins
      return JSON.stringify({ moved: s1.srs['v:n5c-105'] && s1.srs['v:n5c-105'].n, gone: 'v:n5b-118' in s1.srs, kept: s2.srs['v:n4b-103'].n, gone2: 'v:n4a-051' in s2.srs }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'moved': 4, 'gone': False, 'kept': 7, 'gone2': False}, r

TESTS += [test_vocab_content_pass_adds_keigo_common_words_and_removes_duplicates, test_kanji_table_covers_the_frequent_kanji_of_the_vocabulary, test_records_of_merged_builtin_words_move_to_the_kept_entry]

# ---- 2026-10-27: a word may carry a second example (ex2 / exZh2) ----
def test_questions_pick_either_of_a_words_two_examples_and_cards_show_both(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.w === '書く'); v.ex2 = '名前を{書いて}ください。'; v.exZh2 = '請寫名字。';
      state.srs[v.key] = { b: 2, due: todayStr(), n: 3, ok: 3, ng: 0, s: 4, d: 5, last: todayStr(), f: {} };
      const seen = new Set(); for (let i = 0; i < 40; i++) seen.add(makeVocabQuestion(v, { forceFmt: 'v-cloze' }).fullJp);
      const fixed = makeVocabQuestion(v, { forceFmt: 'v-cloze', exIndex: 1 });
      startSession('items', { items: [v] }); const e = currentEntry(); e.preview = true; e.previewDone = false; renderPractice(); const n = document.querySelectorAll('.example').length; SESSION = null; document.body.classList.remove('practicing');
      const r = { seen: [...seen].sort(), fixedFull: fixed.fullJp, fixedZh: fixed.fullZh, itemEx: fixed.item.ex, n, why: fixed.why, canCloze: vocabFormats(v).some(x => x[0] === 'v-cloze') };
      delete v.ex2; delete v.exZh2; delete state.srs[v.key]; return JSON.stringify(r); })()"""
    r = json.loads(ev(b, js))
    assert len(r['seen']) == 2 and '名前を書いてください。' in r['seen'], r
    assert r['fixedFull'] == '名前を書いてください。' and r['fixedZh'] == '請寫名字。' and r['itemEx'] == '名前を{書いて}ください。', r
    assert r['n'] == 2 and '名前を書いてください' in r['why'] and r['canCloze'], r

TESTS += [test_questions_pick_either_of_a_words_two_examples_and_cards_show_both]

def test_every_builtin_word_has_a_usable_second_example(b):
    js = """(() => { const V = REG.vocab.filter(v => v.builtin && v.lv !== 'PRE_N5'); const bad = [];   // 入門 words carry one example by design (spec §4.2)
      V.forEach(v => { if (!v.ex2 || !v.exZh2) { bad.push(v.w + ':missing'); return; }
        const info = vSurfaceInfo(withExample(v, 1)); if (!info || info.form === 'raw') bad.push(v.w + ':form');
        if (v.ex2.replace(/[{}]/g, '') === v.ex.replace(/[{}]/g, '')) bad.push(v.w + ':same');
        if (/[一-龯]/.test(furi(v.ex2.replace(/[{}]/g, '')).replace(/<ruby>.*?<[/]ruby>/g, ''))) bad.push(v.w + ':furi'); });
      return JSON.stringify({ n: V.length, bad: bad.slice(0, 20), nbad: bad.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['nbad'] == 0, r

TESTS += [test_every_builtin_word_has_a_usable_second_example]

# 1.0.22: a question on a word's second example still carries the first: its explanation (and so the notebook entry it
# writes) lists the question's example and then the other one, not the second example twice (1.0.24: 配對 lists none); a
# notebook entry saved that way before is mended when the state loads, and nothing else is touched
def test_a_question_on_the_second_example_lists_both_and_old_notebook_entries_are_mended(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.ex2 && x.exZh && x.exZh2 && usableExamples(x).length === 2); __L__(v);
      const line = (ex, zh) => '\\n- 例：' + jaPlain(exPlain(ex)) + '（' + zh + '）'; const first = line(v.ex, v.exZh), second = line(v.ex2, v.exZh2);
      const q1 = makeVocabQuestion(v, { forceFmt: 'v-cloze', exIndex: 1 }), q0 = makeVocabQuestion(v, { forceFmt: 'v-cloze', exIndex: 0 }), m1 = makeVocabQuestion(v, { forceFmt: 'v-match', exIndex: 1 });
      const old = vocabWhy(v).replace(first + second, second + second);   // what 1.0.21 wrote for a question on the second example
      const s = normalizeState({ mistakes: [{ id: 'mk_a', key: v.key, cat: '單字', prompt: 'a', answer: 'b', why: old, count: 1 }, { id: 'mk_b', key: 'g:x', cat: '文法', prompt: 'c', answer: 'd', why: 'x' + second + second, count: 1 }] });
      return JSON.stringify({ why1: q1.why.endsWith(second + first), why0: q0.why.endsWith(first + second), matchNone: m1.fmt === 'v-match' && !m1.why.includes('例：'), itemEx: q1.item.ex === v.ex2 && q1.item.ex2 === v.ex,
        fullJp: q1.fullJp === exPlain(v.ex2), mended: s.mistakes[0].why === vocabWhy(v).replace(first + second, second + first), grammarKept: s.mistakes[1].why === 'x' + second + second,
        twice: normalizeState(s).mistakes[0].why === s.mistakes[0].why }); })()""".replace('__L__', LEARN_KIND)
    r = json.loads(ev(b, js))
    assert r == {'why1': True, 'why0': True, 'matchNone': True, 'itemEx': True, 'fullJp': True, 'mended': True, 'grammarKept': True, 'twice': True}, r

TESTS += [test_a_question_on_the_second_example_lists_both_and_old_notebook_entries_are_mended]

# ---- 2026-10-27: 「我會了」 sets five stars until the word is missed; 1.0.21: it reads 已熟練 once its 假名拼字 has been right ----
def test_i_know_gives_five_stars_and_mastery_waits_for_the_spelling(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8); const theme = vocabTheme(v); const before = vocabThemes().find(g => g.c === theme).mastered;
      ACTIONS['vocab-known']({ dataset: { key: v.key } }); const r = state.srs[v.key];
      const out = { label: srsLevelLabel(r, v.key), b: r.b, due: daysBetween(todayStr(), r.due), mastered: vocabThemes().find(g => g.c === theme).mastered - before, known: r.known };
      recordFormat(r, 'v-spell', true); out.afterSpell = srsLevelLabel(r, v.key);
      srsAnswer(v.key, false); out.afterMiss = srsLevelLabel(state.srs[v.key], v.key); out.knownAfterMiss = state.srs[v.key].known || null;
      ACTIONS['vocab-known']({ dataset: { key: v.key } }); ACTIONS['vocab-unknown']({ dataset: { key: v.key } }); out.afterUndo = srsLevelLabel(state.srs[v.key], v.key);
      delete state.srs[v.key]; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['label'] == '熟悉' and r['b'] >= 5 and r['due'] >= 30 and r['mastered'] == 0 and r['known'] == 1, r
    assert r['afterSpell'] == '已熟練' and r['afterMiss'] != '已熟練' and r['knownAfterMiss'] is None and r['afterUndo'] == '熟悉', r

def test_i_know_this_word_button_is_on_the_word_list_and_the_practice_feedback(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x) && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8); const theme = vocabTheme(v);
      renderVocabList(document.getElementById('view'), { c: theme }); const row = document.querySelector(`[data-act=vocab-known][data-key="${v.key}"]`); const out = { listBtn: !!row };
      startSession('items', { items: [v] }); const e = currentEntry(); e.preview = false; e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice(); answerCurrent(e.q.answer);
      const btn = document.querySelector('.feedback [data-act=vocab-known]'); out.fbBtn = !!btn; if (btn) btn.click();
      out.meta = (document.querySelector('.fb-meta') || {}).textContent || ''; out.encoresLeft = SESSION.entries.filter(x => x.encore && x.item.key === v.key).length; out.label = srsLevelLabel(state.srs[v.key], v.key);
      renderPractice(); out.fbAfter = Boolean(document.querySelector('.feedback [data-act=vocab-known]'));   // vouched for: not offered again
      SESSION = null; document.body.classList.remove('practicing'); delete state.srs[v.key]; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['listBtn'] and r['fbBtn'] and r['label'] == '熟悉' and '熟悉' in r['meta'] and r['fbAfter'] is False and r['encoresLeft'] == 0, r

# final review: on the flashcard page too, a word vouched for with 我會了 is not offered 我會了 again (it reads 熟悉 until spelled)
def test_flashcard_i_know_is_not_offered_again_once_vouched(b):
    js = """(() => { const t = todayStr(); const w = REG.vocab.find(x => x.builtin && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8 && meaningOptions(x));
      state.srs[w.key] = { b: 2, s: 3, d: 5, due: t, n: 2, ok: 2, ng: 0, st: 2, last: addDays(t, -3), lapse: 0, intro: addDays(t, -9), f: {} };
      FLASH = { deck: 'all', queue: [w.key], idx: 0, flipped: false, extraNew: 0, date: t, done: 0 };
      location.hash = '#/vocab/cards'; route(); const btn = () => document.querySelector(`#view [data-act="vocab-known"][data-key="${w.key}"]`);
      const out = { before: Boolean(btn()) }; btn().click();
      Object.assign(out, { after: Boolean(btn()), known: state.srs[w.key].known, label: srsLevelLabel(state.srs[w.key], w.key) });
      delete state.srs[w.key]; FLASH = null; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'before': True, 'after': False, 'known': 1, 'label': '熟悉'}, r

TESTS += [test_i_know_gives_five_stars_and_mastery_waits_for_the_spelling, test_i_know_this_word_button_is_on_the_word_list_and_the_practice_feedback, test_flashcard_i_know_is_not_offered_again_once_vouched]

# ---- 2026-10-27: matching — a wrong pair flashes red, the feedback explains every pair ----
def test_matching_flashes_a_wrong_pair_and_explains_every_pair_afterwards(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true); __L__(v);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice(); const q = e.q;
      const w0 = document.querySelector('.match-word'); const w = w0.dataset.w; w0.click();
      const wrongM = [...document.querySelectorAll('.match-meaning')].find(m => m.dataset.m !== q.pairs.find(p => p[0] === w)[1]); const wm = wrongM.dataset.m; wrongM.click();
      const out = { flashW: !!document.querySelector(`.match-word[data-w="${w}"].wrong-flash`), flashM: !!document.querySelector(`.match-meaning[data-m="${wm}"].wrong-flash`), flashOthers: document.querySelectorAll('.wrong-flash').length };
      for (const [pw, pm] of q.pairs) { document.querySelector(`.match-word[data-w="${pw}"]`).click(); document.querySelector(`.match-meaning[data-m="${pm}"]`).click(); }
      const fb = (document.querySelector('.feedback') || {}).textContent || '';
      out.allWords = q.pairs.every(p => fb.includes(p[0]) && fb.includes(p[1])); out.done = e.done;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD).replace('__L__', LEARN_KIND)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['flashW'] and r['flashM'] and r['flashOthers'] == 2, r
    assert r['done'] and r['allWords'], r

TESTS += [test_matching_flashes_a_wrong_pair_and_explains_every_pair_afterwards]

# ---- 2026-10-27: 句意 distractors — particle questions ask for the usage (point names), others use look-alike sentences ----
def test_particle_questions_ask_for_the_usage_with_other_points_as_options(b):
    js = """(() => { const g = REG.grammar.find(x => x.u === 'm1' && (x.t || 'choice') === 'choice' && x.pt === '動作場所'); srsAnswer(g.key, true);
      const q = makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); const opts = q.options.map(o => o.text);
      const sameParticle = (pt) => REG.grammar.some(y => y.pt === pt && y.a === g.a);
      const shared = (a, b2) => [...new Set(a)].filter(c => b2.includes(c)).length;
      const badSynonym = opts.filter(o => o !== g.pt && sameParticle(o) && shared(o, g.pt) >= 2);
      return JSON.stringify({ fmt: q.fmt, ans: opts[q.answer], n: new Set(opts).size, instr: q.instr, allPts: opts.every(o => REG.grammar.some(y => y.pt === o)), badSynonym, hasExistence: opts.includes('靜態存在場所') || opts.some(o => /存在/.test(o)), stem: /uline/.test(q.stemHtml), zh: q.zhText }); })()"""
    r = json.loads(ev(b, js))
    assert r['fmt'] == 'g-meaning' and r['ans'] == '動作場所' and r['n'] == 4 and r['allPts'] and r['badSynonym'] == [] and r['stem'] and r['zh'] == '', r
    assert '用法' in r['instr'] or '表示' in r['instr'], r

def test_meaning_distractors_for_other_items_are_look_alike_sentences(b):
    js = """(() => { const g = REG.grammar.find(x => x.u === 'm7' && (x.t || 'choice') === 'choice' && x.zh && !/^[にでをがへとはの]$/.test(x.a)); srsAnswer(g.key, true);
      const content = (z) => [...z].filter(c => /[\u4e00-\u9fff]/.test(c) && !'的了是我你他她在有不也和就都很'.includes(c));
      const shared = (z) => content(z).filter(c => g.zh.includes(c)).length;
      const q = makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); const d = q.options.map(o => o.text).filter(t => t !== g.zh);
      const pool = REG.grammar.filter(x => x.key !== g.key && x.zh && x.zh !== g.zh).map(x => shared(x.zh)); const best = pool.sort((a, b2) => b2 - a).slice(0, 3);
      return JSON.stringify({ fmt: q.fmt, ans: q.options[q.answer].text === g.zh, d: d.map(shared), best, nd: d.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['fmt'] == 'g-meaning' and r['ans'] and r['nd'] == 3, r
    assert min(r['d']) >= 2 and r['best'][0] >= 2, r   # every distractor shares content characters with the right sentence

TESTS += [test_particle_questions_ask_for_the_usage_with_other_points_as_options, test_meaning_distractors_for_other_items_are_look_alike_sentences]

# ---- 2026-10-27: learners with a base — open N4 words early, bulk 我會了, 我會了 on the preview card, one-click fast settings ----
# 1.0.32 每一級封死: N4 opens once N5's words, kanji and units are all done (seeing every N5 word is no longer enough)
def test_n4_words_open_once_n5_words_kanji_and_units_are_done(b):
    js = """(() => { const keep = JSON.stringify(state.srs); const units = state.completedUnits.slice(); state.stage = 'main';
      const met = (x) => { state.srs[x.key] = { b: 1, due: addDays(todayStr(), 3), n: 1, ok: 1, ng: 0, s: 3, d: 5, f: {}, last: todayStr() }; };
      const open = () => n4WordsOpen() && deckAllowsN4('all') && curLevel() === 'N4';
      const out = { left: n5WordsLeft(), closed: !open() };
      REG.vocab.filter(x => x.builtin && x.lv !== 'N4').forEach(met); out.wordsOnly = open();
      REG.kanji.filter(k => k.lv !== 'N4').forEach(met); state.completedUnits = DATA.UNITS.filter(u => u.lv === 'N5').map(u => u.id); out.open = open();
      state.srs = JSON.parse(keep); state.completedUnits = units; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['left'] > 0 and r['closed'] and r['wordsOnly'] is False and r['open'], r

def test_bulk_i_know_marks_the_filtered_words_and_can_be_undone(b):
    js = """(() => { const theme = vocabThemes().find(g => g.c && REG.vocab.filter(v => v.builtin && vocabTheme(v) === g.c && !state.srs[v.key]).length >= 3).c;
      const words = REG.vocab.filter(v => v.builtin && vocabTheme(v) === theme); const snapshot = JSON.stringify(words.map(v => state.srs[v.key] || null));
      const todo = words.filter(v => !(state.srs[v.key] && state.srs[v.key].known)).length;
      history.replaceState(null, '', '#/vocab/list?c=' + encodeURIComponent(theme)); renderVocabList(document.getElementById('view'), { c: theme });
      const btn = document.querySelector('[data-act=vocab-known-all]'); const out = { btn: !!btn, count: btn ? Number(btn.dataset.n) : 0, todo };
      ACTIONS['vocab-known-all'](); out.known = words.filter(v => state.srs[v.key] && state.srs[v.key].known).length; out.total = words.length;
      out.undoBtn = !!document.querySelector('[data-act=vocab-known-undo]');
      ACTIONS['vocab-known-undo'](); out.restored = JSON.stringify(words.map(v => state.srs[v.key] || null)) === snapshot; out.undoGone = !document.querySelector('[data-act=vocab-known-undo]');
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['btn'] and r['count'] == r['todo'] and r['known'] == r['total'] and r['undoBtn'] and r['restored'] and r['undoGone'], r

def test_preview_card_has_i_know_which_skips_the_word_and_its_encore(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8); const others = REG.vocab.filter(x => x.builtin && x.key !== v.key).slice(0, 3);
      startSession('items', { items: [v, ...others] }); renderPractice();
      const btn = document.querySelector('.pr-actions [data-act=preview-known]'); const out = { btn: !!btn, len0: SESSION.entries.length };
      ACTIONS['preview-known'](); const r = state.srs[v.key];
      Object.assign(out, { known: r && r.known === 1, label: srsLevelLabel(r, v.key), gone: SESSION.entries.every(x => !x.item || x.item.key !== v.key), len: SESSION.entries.length, idx: SESSION.idx, next: currentEntry() && currentEntry().item.key !== v.key });
      SESSION = null; document.body.classList.remove('practicing'); delete state.srs[v.key]; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['btn'] and r['known'] and r['label'] == '熟悉' and r['gone'] and r['len'] == 3 and r['idx'] == 0 and r['next'], r   # five stars, 已熟練 once spelled

def test_experienced_shortcut_in_the_level_picker_turns_chinese_off(b):
    js = """(() => { const keep = JSON.stringify(state.settings); const unit = state.currentUnit;
      Object.assign(state.settings, { loadCap: 100, showZh: true });
      openModal('x', levelPickerHtml()); const out = { box: !!document.getElementById('startExperienced'), rowGone: !document.querySelector('[data-act="apply-experienced"]') }; document.getElementById('startUnit').value = 'm7'; document.getElementById('startExperienced').checked = true;
      ACTIONS['start-apply'](); out.unit = state.currentUnit; out.cap = state.settings.loadCap; out.zh = state.settings.showZh;
      Object.assign(state.settings, JSON.parse(keep)); state.currentUnit = unit; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['box'] and r['rowGone'] and r['unit'] == 'm7' and r['cap'] == 100 and r['zh'] is False, r   # 1.0.20: no load cap to raise; new items follow the recent answers

def test_vocab_search_filters_live_on_input_and_preserves_focus(b):
    js = """(() => {
      location.hash = '#/vocab/list?lv=N5'; route();
      const inp = document.getElementById('vocabSearch');
      const rows0 = document.querySelectorAll('#vocabListBody tbody tr').length;
      inp.focus(); inp.value = '食べ'; inp.setSelectionRange(2, 2);
      inp.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: false }));
      const rows1 = document.querySelectorAll('#vocabListBody tbody tr').length;
      const sameEl = document.activeElement === inp;
      const caret = inp.selectionStart;
      return JSON.stringify({ rows0, rows1, sameEl, caret, hash: decodeURIComponent(location.hash) });
    })()"""
    r = json.loads(ev(b, js))
    assert r['rows0'] > r['rows1'] >= 1 and r['sameEl'] is True and r['caret'] == 2 and 'q=食べ' in r['hash'], r

TESTS += [test_n4_words_open_once_n5_words_kanji_and_units_are_done, test_bulk_i_know_marks_the_filtered_words_and_can_be_undone, test_preview_card_has_i_know_which_skips_the_word_and_its_encore, test_experienced_shortcut_in_the_level_picker_turns_chinese_off, test_vocab_search_filters_live_on_input_and_preserves_focus]

# ---- 1.0.27: no 字表 button; a theme card opens its word table wherever its own buttons are not ----
MAIN = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"

def test_a_theme_card_opens_its_word_table_except_on_its_buttons(b):
    js = "(() => { " + MAIN + """ const card = () => { location.hash = '#/vocab/level?lv=N5'; route(); return document.querySelector('.theme-card[data-c="飲食"]'); };
      const out = {};
      card().querySelector('.bar.stack').click(); out.bar = decodeURIComponent(location.hash);
      card().querySelector('.card-title').click(); out.title = decodeURIComponent(location.hash);
      const chip = card().querySelector('[data-act=kanji-open]'); const k = chip.dataset.k; chip.click();
      out.chip = { hash: location.hash, modal: document.getElementById('modalRoot').textContent.includes('漢字「' + k + '」') }; closeModal(true);
      card().querySelector('[data-act=start-vocab]').click(); out.practice = { hash: decodeURIComponent(location.hash), mode: SESSION && SESSION.mode };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['bar'] == '#/vocab/list?lv=N5&c=飲食' and r['title'] == '#/vocab/list?lv=N5&c=飲食', r
    assert r['chip'] == {'hash': '#/vocab/level?lv=N5', 'modal': True}, r
    assert r['practice']['mode'] == 'vocab' and r['practice']['hash'] != '#/vocab/list?lv=N5&c=飲食', r

TESTS += [test_a_theme_card_opens_its_word_table_except_on_its_buttons]

# ---- 1.0.27: 播放字卡: a word's card lists the kanji it is written with (once each, only those in the kanji table) and their meanings ----
HUSH = "speak = () => new Promise(() => {}); speakZh = () => new Promise(() => {});"   # speech that never ends: a playing player stays on its item
PLAY = """const play = (w) => { const v = REG.vocab.find(x => x.builtin && jaPlain(x.w) === w);
  startListen({ kind: 'theme', theme: vocabTheme(v) }); route(); listenPause(); LISTEN.idx = LISTEN.items.findIndex(e => e.word === w); listenRenderNow(); };"""

def test_a_word_card_in_the_player_lists_its_kanji(b):
    js = "(() => { " + MAIN + HUSH + PLAY + """ const kanji = (w) => { play(w); return [...document.querySelectorAll('#listenCard [data-k]')].map(c => [c.dataset.k, c.textContent.replace(c.dataset.k, '').trim()]); };
      const out = { tenki: kanji('天気'), densha: kanji('電車'), tomodachi: kanji('友達'), nichiyoubi: kanji('日曜日'), kore: kanji('これ') };
      listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tenki': [['天', '天、天空'], ['気', '氣、精神、心情']], 'densha': [['電', ''], ['車', '']],   # a meaning that is the kanji itself is left out
                 'tomodachi': [['友', '朋友']], 'nichiyoubi': [['日', '日、太陽、日子'], ['曜', '星期（曜日）']], 'kore': []}, r   # 達 is not in the kanji table

def test_tapping_a_kanji_in_the_player_pauses_it_and_opens_the_kanji(b):
    js = "(() => { " + MAIN + HUSH + PLAY + """ play('天気'); listenPlay(); const playing = LISTEN.playing;
      document.querySelector('#listenCard [data-k="気"]').click();
      const out = { playing, after: LISTEN.playing, word: listenCurrent().word, modal: document.getElementById('modalRoot').textContent.includes('漢字「気」') };
      closeModal(true); listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'playing': True, 'after': False, 'word': '天気', 'modal': True}, r

TESTS += [test_a_word_card_in_the_player_lists_its_kanji, test_tapping_a_kanji_in_the_player_pauses_it_and_opens_the_kanji]

# ---- 1.0.28: 播放字卡: a theme's rotation has a card for each kanji its words use (in the kanji table, once each); without
# shuffle it plays in the theme's order, each kanji card right after the first word that uses it ----
THEME_SEQ = ['お願いします', '失礼します', '【失】', '【礼】', '話', '【話】', 'どうも', 'お疲れ様でした', 'よろしくお願いします',
             'おめでとうございます', 'お大事に', '【大】', '【事】', 'お元気ですか', '【元】', '【気】',
             'さあ', 'ええと', 'オーケー', 'お元気で', 'お邪魔します', 'こちらこそ', 'ごめんください', 'サンキュー', 'バイバイ']   # 問候與溝通 as data.js lists it (1.0.31 added the last nine); 願 疲 様 邪 魔 are not in the kanji table
LABELS = "const labels = () => LISTEN.items.map(e => e.kind === 'k' ? '【' + e.k.k + '】' : e.word);"

def test_a_theme_plays_a_card_for_each_kanji_its_words_use(b):
    js = "(() => { " + MAIN + HUSH + LABELS + """ startListen({ kind: 'theme', theme: '問候與溝通' }); route(); listenPause(); const shuffled = labels();
      const v = REG.vocab.find(x => x.builtin && jaPlain(x.w) === 'お元気ですか'); state.mistakes = [{ id: 'mk1', key: v.key, cat: '單字', prompt: '「' + v.m + '」的日文', answer: jaPlain(v.w), count: 1, mastered: false, date: todayStr(), last: todayStr() }]; saveState();
      startListen({ kind: 'mistakes', cat: '' }); route(); listenPause(); const notebook = labels();
      listenStop(true); state.mistakes = []; saveState(); localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ shuffled, notebook }); })()"""
    r = json.loads(ev(b, js))
    assert sorted(r['shuffled']) == sorted(THEME_SEQ), r   # 隨機 (the default): the kanji cards are shuffled in with the words
    assert r['notebook'] == ['お元気ですか'], r   # the notebook player gets no kanji cards

def test_without_shuffle_a_theme_plays_in_its_order_each_kanji_after_its_first_word(b):
    js = "(() => { " + MAIN + HUSH + LABELS + """ startListen({ kind: 'theme', theme: '問候與溝通' }); route();
      let error = null; try { ACTIONS['listen-cycle']({ dataset: { key: 'order' } }); } catch (e) { error = e.message; }   // before 1.0.28 this threw: it sorted a theme's words by their mistake count
      const out = { error, order: LISTEN.order, seq: labels(), playing: LISTEN.playing, pillOn: document.querySelector('[data-act=listen-cycle][data-key=order]').classList.contains('on') };
      listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'error': None, 'order': 'count', 'seq': THEME_SEQ, 'playing': True, 'pillOn': False}, r

def test_the_review_theme_gets_cards_for_the_kanji_of_its_words(b):
    js = "(() => { " + MAIN + HUSH + LABELS + """ const t = todayStr(); state.srs = {};
      const met = (w, extra) => { const v = REG.vocab.find(x => x.builtin && jaPlain(x.w) === w); state.srs[v.key] = Object.assign({ b: 1, due: addDays(t, 3), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -1), intro: addDays(t, -9), f: {} }, extra || {}); };
      met('天気'); met('雨'); met('山', { b: SRS_MASTERED, known: true, f: { 'v-spell': [1, 0] } }); saveState();
      startListen({ kind: 'theme', theme: '初識單詞' }); route(); let error = null; try { ACTIONS['listen-cycle']({ dataset: { key: 'order' } }); } catch (e) { error = e.message; }
      const seq = labels(); listenStop(true); state.srs = {}; saveState(); localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ error, seq }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'error': None, 'seq': ['天気', '【天】', '【気】', '雨', '【雨】']}, r   # 山 is mastered: neither the word nor its kanji

def test_a_kanji_card_shows_the_kanji_its_meaning_readings_and_first_example(b):
    js = "(() => { " + MAIN + HUSH + """ startListen({ kind: 'theme', theme: '自然與天氣' }); route(); listenPause();
      const t = (el) => el ? el.textContent.replace(/\\s+/g, ' ').trim() : null;
      const card = (k) => { LISTEN.idx = LISTEN.items.findIndex(e => e.kind === 'k' && e.k.k === k); listenRenderNow(); const f = document.querySelector('#listenCard .flash');
        return { caption: t(f.querySelector('.small')), kanji: t(f.querySelector('.word')), meaning: t(f.querySelector('.meaning')), readings: [...f.querySelectorAll('.listen-reads .chip')].map(t), ex: t(f.querySelector('.listen-kex')) }; };
      const out = { ten: card('天'), hi: card('日') }; listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['ten'] == {'caption': '漢字', 'kanji': '天', 'meaning': '天、天空', 'readings': ['音 テン'], 'ex': '天気 てんき 天氣'}, r   # the kanji table gives 天 no 訓
    assert r['hi'] == {'caption': '漢字', 'kanji': '日', 'meaning': '日、太陽、日子', 'readings': ['音 ニチ・ジツ', '訓 ひ・か'], 'ex': '日曜日 にちようび 星期日'}, r

def test_a_kanji_card_reads_its_example_and_then_the_kanjis_meaning(b):
    js = "(() => { " + MAIN + HUSH + """ startListen({ kind: 'theme', theme: '自然與天氣' }); route(); listenPause(); const e = LISTEN.all.find(x => x.kind === 'k' && x.k.k === '天');
      if (!e) { listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ card: false }); }
      const calls = []; speak = (t, o) => { calls.push(['ja', String(t), (o && o.reading) || '']); return Promise.resolve(); }; speakZh = (t) => { calls.push(['zh', String(t)]); return Promise.resolve(); };
      const run = (twice) => { calls.length = 0; LISTEN.twice = twice; return listenSpeak(e, () => true).then(ok => [ok, calls.slice()]); };
      return run(true).then(two => run(false).then(one => { listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ two, one }); })); })()"""
    r = json.loads(ev(b, js))
    assert r.get('two') == [True, [['ja', 'てんき', ''], ['zh', '天、天空'], ['ja', 'てんき', '']]], r   # the example in kana (the clip the kanji sheet plays), the kanji's meaning, the example again
    assert r['one'] == [True, [['ja', 'てんき', ''], ['zh', '天、天空']]], r   # 「1」: once

def test_tapping_the_kanji_on_a_kanji_card_pauses_the_player_and_opens_the_kanji(b):
    js = "(() => { " + MAIN + HUSH + """ startListen({ kind: 'theme', theme: '自然與天氣' }); route(); listenPause(); LISTEN.idx = LISTEN.items.findIndex(e => e.kind === 'k' && e.k.k === '天'); listenRenderNow();
      listenPlay(); const playing = LISTEN.playing; const btn = document.querySelector('#listenCard .word [data-k="天"]'); if (btn) btn.click();
      const out = { btn: !!btn, playing, after: LISTEN.playing, modal: document.getElementById('modalRoot').textContent.includes('漢字「天」') };
      closeModal(true); listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'btn': True, 'playing': True, 'after': False, 'modal': True}, r

# every kanji card fits the Today card's player box (260px on a computer) without scrolling, on a computer and on a phone
def test_every_kanji_card_fits_the_today_player_without_scrolling(b):
    js = "(() => { " + MAIN + HUSH + """ setListenPref({ source: 'theme', theme: '自然與天氣' }); LISTEN = null; location.hash = '#/today'; route(); ACTIONS['today-tab']({ dataset: { tab: 'theme' } });
      const card = document.getElementById('listenCard'); const seen = new Set(); const over = [];
      vocabThemes().forEach(g => listenSourceEntries({ kind: 'theme', theme: g.c }).forEach(e => { if (e.kind !== 'k' || seen.has(e.id)) return; seen.add(e.id);
        LISTEN.items = [e]; LISTEN.idx = 0; listenRenderNow(); if (card.scrollHeight > card.clientHeight + 1) over.push(e.k.k); }));
      LISTEN = null; localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ n: seen.size, over, h: card.clientHeight }); })()"""
    for size in ((1280, 800, False), (390, 844)):
        r = json.loads(b.run([("metrics", size), ("nav", URL), ("wait", READY), ("eval", js)], timeout=60)[-1])
        assert r['n'] > 300 and r['over'] == [], (size, r)

# 沉浸播放: the kanji is drawn large, and the kanji, its meaning, readings and example stay stacked, centred and inside the box
def test_a_kanji_card_fills_the_full_screen_player_and_stays_inside_it(b):
    js = "(() => { " + MAIN + HUSH + """ LISTEN = null; setListenPref({ source: 'theme', theme: '自然與天氣' }); location.hash = '#/vocab/listen'; route(); listenPause();
      const card = document.getElementById('listenCard'); const box = (el) => ({ top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight, mid: el.offsetLeft + el.offsetWidth / 2 });   // layout coordinates: the page may be turned 90°
      const out = []; LISTEN.items.forEach((e, i) => { if (e.kind !== 'k') return; LISTEN.idx = i; listenRenderNow(); const f = card.querySelector('.flash');
        const rows = ['.word', '.meaning', '.listen-reads', '.listen-kex'].map(s => f.querySelector(s)).filter(Boolean).map(box);
        out.push({ k: e.k.k, rows: rows.length, px: parseFloat(f.querySelector('.word').style.fontSize), inside: f.scrollHeight <= card.clientHeight + 1 && f.scrollWidth <= f.clientWidth + 1,
          stacked: rows.every((r, j) => !j || r.top >= rows[j - 1].bottom - 2), centred: rows.every(r => Math.abs(r.mid - box(f).mid) < 6) }); });
      listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(out); })()"""
    for size in ((390, 844), (844, 390)):
        r = json.loads(b.run([("metrics", size), ("nav", URL), ("wait", READY), ("eval", js)], timeout=45)[-1])
        bad = [x for x in r if not (x['rows'] == 4 and x['inside'] and x['stacked'] and x['centred'] and x['px'] >= 60)]
        assert len(r) == 29 and not bad, (size, len(r), bad[:3])   # 自然與天氣 uses 29 kanji of the table

# the lock screen names a kanji card by the kanji and its meaning; the clips fetched ahead are the ones the card reads
def test_a_kanji_card_names_itself_on_the_lock_screen_and_its_clips_are_fetched_ahead(b):
    js = "(() => { " + MAIN + HUSH + """ state.ttsConfig = Object.assign(state.ttsConfig || {}, { engine: 'cloud' }); startListen({ kind: 'theme', theme: '自然與天氣' }); route(); listenPause();
      const e = LISTEN.all.find(x => x.kind === 'k' && x.k.k === '天'); if (!e) { listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ card: false }); }
      LISTEN.idx = LISTEN.items.indexOf(e); listenRenderNow(); const ms = navigator.mediaSession ? navigator.mediaSession.metadata && navigator.mediaSession.metadata.title : 'none';
      const fetched = []; engineBlob = (t, g, o) => { fetched.push([t, (o && o.lang) || '']); return Promise.resolve(null); }; listenPrefetch(e);
      listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ ms, fetched }); })()"""
    r = json.loads(ev(b, js))
    assert r.get('ms') in ('天　天、天空', 'none'), r   # (no media session in this browser: nothing to check)
    assert r['fetched'] == [['てんき', ''], ['天、天空', 'zh']], r

TESTS += [test_a_kanji_card_names_itself_on_the_lock_screen_and_its_clips_are_fetched_ahead]

TESTS += [test_a_theme_plays_a_card_for_each_kanji_its_words_use, test_without_shuffle_a_theme_plays_in_its_order_each_kanji_after_its_first_word,
          test_the_review_theme_gets_cards_for_the_kanji_of_its_words, test_a_kanji_card_shows_the_kanji_its_meaning_readings_and_first_example,
          test_a_kanji_card_reads_its_example_and_then_the_kanjis_meaning, test_tapping_the_kanji_on_a_kanji_card_pauses_the_player_and_opens_the_kanji,
          test_every_kanji_card_fits_the_today_player_without_scrolling, test_a_kanji_card_fills_the_full_screen_player_and_stays_inside_it]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    only = sys.argv[1:]
    failed = 0
    try:
        for t in TESTS:
            if only and t.__name__ not in only: continue
            err = None
            for attempt in (1, 2):   # a second try with a fresh browser absorbs load-related flakiness
                with Browser() as b:
                    try:
                        t(b); print("ok  ", t.__name__ + (" (retry)" if attempt == 2 else "")); err = None; break
                    except Exception as e:
                        err = e
            if err is not None:
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
