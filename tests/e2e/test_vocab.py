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
    assert r['sum'] == r['n'] and not r['old'] and not r['hasOther'] and r['first'] == '問候', r   # every built-in word has a theme since DATA_VERSION 3

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
         test_a_new_word_comes_back_once_in_another_format_without_rescheduling, test_no_encore_when_no_other_format_can_be_built, test_words_already_known_get_no_encore,
         test_wrong_first_answer_keeps_requeue_and_encores_apart_and_requeue_does_not_count_as_a_pass, test_preview_card_only_speaks_when_auto_reading_is_on]

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
    js = """(() => { const ws = REG.vocab.filter(v => v.builtin && vocabTheme(v) === '身體與顏色');
      const rec = (b, f) => ({ b, due: '2099-01-01', n: 5, ok: 5, ng: 0, s: 30, d: 5, f });
      ws.slice(0, 2).forEach(v => { state.srs[v.key] = rec(6, { 'v-meaning': [1, 0], 'v-recall': [1, 0], 'v-cloze': [1, 0] }); });
      ws.slice(2, 5).forEach(v => { state.srs[v.key] = rec(3, {}); });
      ws.slice(5, 9).forEach(v => { state.srs[v.key] = rec(1, {}); });
      location.hash = '#/vocab/themes'; route();
      const card = document.querySelector('.theme-card[data-c="身體與顏色"]');
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
      const q = dailyQueue(20); const G = q.items.filter(it => it.kind === 'g'); const all = dailyQueue(q.total).items.filter(it => it.kind === 'g');
      const fresh = G.filter(it => !state.srs[it.key]).length; const revOk = G.filter(it => state.srs[it.key]).map(it => state.srs[it.key].ok);
      return JSON.stringify({ fresh, dayFresh: all.filter(it => !state.srs[it.key]).length, revOk, limit: state.settings.newGrammarPerDay }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] >= 2 and r['dayFresh'] == r['limit'], r   # a session holds its share of the day's new grammar; the whole day holds the quota
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
    assert r['h3'] >= 8 and r['kana'] >= 46 and r['seen'] and r['hasAdj'] and r['hasVerbs'] and r['card'], r

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

# ---- 2026-10-26 (10): grammar fill-in items also appear as 選正確句 and 句意 ----
def test_grammar_choice_item_builds_three_formats_on_demand(b):
    js = """(() => { const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && x.op && x.op.length >= 4 && x.u === 'm1'); srsAnswer(g.key, true);
      const b0 = splitBlank(g.jp); const full = b0.pre + parenReadingToBracket(g.a) + b0.post;
      const c = makeGrammarQuestion(g, { forceFmt: 'g-correct' }); const m = makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); const o = makeGrammarQuestion(g, { forceFmt: 'g-choice' });
      const txt = (q) => q.options.map(x => x.text);
      return JSON.stringify({ cFmt: c.fmt, cAns: txt(c)[c.answer] === full, cAll: txt(c).every(t => t.startsWith(b0.pre) && t.endsWith(b0.post)) && new Set(txt(c)).size === 4,
        mFmt: m.fmt, mAns: txt(m)[m.answer] === g.zh || txt(m)[m.answer] === g.pt, mZhHidden: m.zhText === '', mStem: jaPlain(m.fullJp) === jaPlain(full), mDistinct: new Set(txt(m)).size === 4,
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

def test_wrong_spelling_shows_the_right_reading_and_backspace_works(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
      const wrong = e.q.tiles.findIndex(t => t !== v.r[0]); document.querySelector(`.spell-tile[data-i="${wrong}"]`).click();
      const typed1 = document.querySelector('.spell-out').textContent; document.querySelector('[data-act=spell-back]').click(); const typed2 = document.querySelector('.spell-out').textContent;
      // now spell it wrong on purpose: first tile wrong, then fill up to length
      document.querySelector(`.spell-tile[data-i="${wrong}"]`).click();
      while (!e.done) { const t = document.querySelector('.spell-tile:not([disabled])'); if (!t) break; t.click(); }
      const head = document.querySelector('.fb-head').textContent; const out = { typed1, typed2, done: e.done, ok: e.chosen === e.q.answer, showsRight: head.includes(v.r) };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert len(r['typed1']) == 1 and r['typed2'] == '' and r['done'] and not r['ok'] and r['showsRight'], r

def test_matching_question_pairs_four_words_with_their_meanings(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      const q = e.q; const out = { fmt: q.fmt, pairs: q.pairs.length, hasTarget: q.pairs.some(p => p[0] === jaPlain(v.w) && p[1] === v.m), words: document.querySelectorAll('.match-word').length, meanings: document.querySelectorAll('.match-meaning').length, opts: document.querySelectorAll('.opt').length };
      // one wrong tap first, then match everything
      const w0 = document.querySelector('.match-word'); w0.click(); const wrongM = [...document.querySelectorAll('.match-meaning')].find(m => m.dataset.m !== q.pairs.find(p => p[0] === w0.dataset.w)[1]); wrongM.click();
      out.afterWrong = document.querySelectorAll('.match-word.matched').length;
      for (const [w, m] of q.pairs) { document.querySelector(`.match-word[data-w="${w}"]`).click(); document.querySelector(`.match-meaning[data-m="${m}"]`).click(); }
      out.matched = document.querySelectorAll('.match-word.matched').length; out.done = e.done; out.ok = e.chosen === q.answer; out.f = state.srs[v.key].f['v-match'];
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD)
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fmt'] == 'v-match' and r['pairs'] == 4 and r['hasTarget'] and r['words'] == 4 and r['meanings'] == 4 and r['opts'] == 0, r
    assert r['afterWrong'] == 0 and r['matched'] == 4 and r['done'] and not r['ok'] and r['f'] == [0, 1], r

def test_new_formats_join_the_rotation_after_the_first_sighting(b):
    js = """(() => { const v = __W__; const fresh = vocabFormats(v).map(x => x[0]); srsAnswer(v.key, true); const seen = vocabFormats(v).map(x => x[0]);
      return JSON.stringify({ fresh, seen }); })()""".replace('__W__', SPELL_WORD)
    r = json.loads(ev(b, js))
    assert 'v-spell' not in r['fresh'] and 'v-match' not in r['fresh'] and 'v-spell' in r['seen'] and 'v-match' in r['seen'], r

TESTS += [test_kana_spelling_question_is_answered_by_tapping_tiles, test_wrong_spelling_shows_the_right_reading_and_backspace_works, test_matching_question_pairs_four_words_with_their_meanings, test_new_formats_join_the_rotation_after_the_first_sighting]

# ---- 2026-10-26 (13): custom cards reach 已熟練 with two formats ----
def test_custom_cards_are_mastered_with_two_formats_builtins_still_need_three(b):
    js = """(() => { state.vocab.push({ id: 'cm1', w: '猫', r: 'ねこ', m: '貓' }); buildRegistry();
      const c = REG.vocab.find(x => x.id === 'cm1'); const v = REG.vocab.find(x => x.builtin);
      const rec = () => ({ b: 6, due: '2099-01-01', n: 9, ok: 9, ng: 0, s: 60, d: 5, f: { 'v-meaning': [2, 0], flash: [1, 0] } });
      state.srs[c.key] = rec(); state.srs[v.key] = rec();
      return JSON.stringify({ custom: srsLevelLabel(state.srs[c.key], c.key), builtin: srsLevelLabel(state.srs[v.key], v.key), noKey: srsLevelLabel(state.srs[v.key]) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'custom': '已熟練', 'builtin': '熟悉', 'noKey': '熟悉'}, r

TESTS += [test_custom_cards_are_mastered_with_two_formats_builtins_still_need_three]

# ---- 2026-10-26 (14): review leftovers — furigana known rule, theme list deck button, encore feedback, session counts ----
def test_furigana_known_hiding_follows_the_mastered_label(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.w === '今日'); const rec = (f) => ({ b: 6, due: '2099-01-01', n: 9, ok: 9, ng: 0, s: 60, d: 5, f });
      state.srs[v.key] = rec({}); const a = /class="known"/.test(furi('今日は'));
      state.srs[v.key] = rec({ 'v-meaning': [1, 0], 'v-recall': [1, 0], 'v-cloze': [1, 0] }); const c = /class="known"/.test(furi('今日は'));
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
    js = """(() => { location.hash = '#/vocab/themes'; route(); const card = document.querySelector('.theme-card[data-c="飲食"] [data-act=start-vocab]').textContent;
      const want = (f) => { const items = buildVocabQueue(f, 20); return items.length + encoreEstimate(items); };
      location.hash = '#/vocab'; route(); const head = document.querySelector('.page-head [data-act=start-vocab]').textContent;
      location.hash = '#/vocab/list?c=飲食'; route(); const detail = document.querySelector('.page-head [data-act=start-vocab]').textContent;
      return JSON.stringify({ card, cardWant: want('c:飲食'), head, headWant: want('all'), detail }); })()"""
    r = json.loads(ev(b, js))
    assert r['card'] == f"練習・{r['cardWant']} 題" and r['head'] == f"單字測驗・{r['headWant']} 題" and r['detail'] == f"練習這個主題・{r['cardWant']} 題", r

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

# ---- 2026-10-27: 「我會了」 marks a word mastered until it is missed ----
def test_i_know_this_word_marks_it_mastered_until_it_is_missed(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key]); const theme = vocabTheme(v); const before = vocabThemes().find(g => g.c === theme).mastered;
      ACTIONS['vocab-known']({ dataset: { key: v.key } }); const r = state.srs[v.key];
      const out = { label: srsLevelLabel(r, v.key), due: daysBetween(todayStr(), r.due), mastered: vocabThemes().find(g => g.c === theme).mastered - before, known: r.known };
      srsAnswer(v.key, false); out.afterMiss = srsLevelLabel(state.srs[v.key], v.key); out.knownAfterMiss = state.srs[v.key].known || null;
      ACTIONS['vocab-known']({ dataset: { key: v.key } }); ACTIONS['vocab-unknown']({ dataset: { key: v.key } }); out.afterUndo = srsLevelLabel(state.srs[v.key], v.key);
      delete state.srs[v.key]; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['label'] == '已熟練' and r['due'] >= 30 and r['mastered'] == 1 and r['known'] == 1, r
    assert r['afterMiss'] != '已熟練' and r['knownAfterMiss'] is None and r['afterUndo'] == '熟悉', r

def test_i_know_this_word_button_is_on_the_word_list_and_the_practice_feedback(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x)); const theme = vocabTheme(v);
      renderVocabList(document.getElementById('view'), { c: theme }); const row = document.querySelector(`[data-act=vocab-known][data-key="${v.key}"]`); const out = { listBtn: !!row };
      startSession('items', { items: [v] }); const e = currentEntry(); e.preview = false; e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice(); answerCurrent(e.q.answer);
      const btn = document.querySelector('.feedback [data-act=vocab-known]'); out.fbBtn = !!btn; if (btn) btn.click();
      out.meta = (document.querySelector('.fb-meta') || {}).textContent || ''; out.encoresLeft = SESSION.entries.filter(x => x.encore && x.item.key === v.key).length; out.label = srsLevelLabel(state.srs[v.key], v.key);
      SESSION = null; document.body.classList.remove('practicing'); delete state.srs[v.key]; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['listBtn'] and r['fbBtn'] and r['label'] == '已熟練' and '已熟練' in r['meta'] and r['encoresLeft'] == 0, r

TESTS += [test_i_know_this_word_marks_it_mastered_until_it_is_missed, test_i_know_this_word_button_is_on_the_word_list_and_the_practice_feedback]

# ---- 2026-10-27: matching — a wrong pair flashes red, the feedback explains all four pairs ----
def test_matching_flashes_a_wrong_pair_and_explains_every_pair_afterwards(b):
    js = """(() => { const v = __W__; srsAnswer(v.key, true);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice(); const q = e.q;
      const w0 = document.querySelector('.match-word'); const w = w0.dataset.w; w0.click();
      const wrongM = [...document.querySelectorAll('.match-meaning')].find(m => m.dataset.m !== q.pairs.find(p => p[0] === w)[1]); const wm = wrongM.dataset.m; wrongM.click();
      const out = { flashW: !!document.querySelector(`.match-word[data-w="${w}"].wrong-flash`), flashM: !!document.querySelector(`.match-meaning[data-m="${wm}"].wrong-flash`), flashOthers: document.querySelectorAll('.wrong-flash').length };
      for (const [pw, pm] of q.pairs) { document.querySelector(`.match-word[data-w="${pw}"]`).click(); document.querySelector(`.match-meaning[data-m="${pm}"]`).click(); }
      const fb = (document.querySelector('.feedback') || {}).textContent || '';
      out.allWords = q.pairs.every(p => fb.includes(p[0]) && fb.includes(p[1])); out.done = e.done;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""".replace('__W__', SPELL_WORD)
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
def test_n4_words_can_be_opened_before_n5_is_finished(b):
    js = """(() => { const n4 = REG.vocab.find(x => x.builtin && x.lv === 'N4' && !state.srs[x.key]); const was = state.settings.n4Words; state.settings.n4Words = 'auto';
      const out = { left: n5WordsLeft(), closed: !n4WordsOpen() && !inDailyReach(n4) && !deckAllowsN4('all') };
      state.settings.n4Words = 'open'; out.open = n4WordsOpen() && inDailyReach(n4) && deckAllowsN4('all');
      location.hash = '#/vocab'; route(); out.text = document.getElementById('view').textContent.includes('N4 已開放');   // the note moved to the vocab page header
      state.settings.n4Words = was; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['left'] > 0 and r['closed'] and r['open'] and r['text'], r

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
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key]); const others = REG.vocab.filter(x => x.builtin && x.key !== v.key).slice(0, 3);
      startSession('items', { items: [v, ...others] }); renderPractice();
      const btn = document.querySelector('.pr-actions [data-act=preview-known]'); const out = { btn: !!btn, len0: SESSION.entries.length };
      ACTIONS['preview-known'](); const r = state.srs[v.key];
      Object.assign(out, { known: r && r.known === 1, label: srsLevelLabel(r, v.key), gone: SESSION.entries.every(x => !x.item || x.item.key !== v.key), len: SESSION.entries.length, idx: SESSION.idx, next: currentEntry() && currentEntry().item.key !== v.key });
      SESSION = null; document.body.classList.remove('practicing'); delete state.srs[v.key]; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['btn'] and r['known'] and r['label'] == '已熟練' and r['gone'] and r['len'] == 3 and r['idx'] == 0 and r['next'], r

def test_experienced_shortcut_applies_the_fast_settings_from_settings_and_the_level_picker(b):
    js = """(() => { const keep = JSON.stringify(state.settings); const unit = state.currentUnit;
      Object.assign(state.settings, { newVocabPerDay: 8, newGrammarPerDay: 6, n4Words: 'auto', showZh: true });
      ACTIONS['apply-experienced'](); const s = state.settings; const out = { v: s.newVocabPerDay, g: s.newGrammarPerDay, n4: s.n4Words, zh: s.showZh };
      Object.assign(state.settings, { newVocabPerDay: 8, n4Words: 'auto', showZh: true });
      openModal('x', levelPickerHtml()); out.box = !!document.getElementById('startExperienced'); document.getElementById('startUnit').value = 'm7'; document.getElementById('startExperienced').checked = true;
      ACTIONS['start-apply'](); out.unit = state.currentUnit; out.v2 = state.settings.newVocabPerDay; out.n42 = state.settings.n4Words;
      Object.assign(state.settings, JSON.parse(keep)); state.currentUnit = unit; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['v'] == 20 and r['g'] == 10 and r['n4'] == 'open' and r['zh'] is False, r
    assert r['box'] and r['unit'] == 'm7' and r['v2'] == 20 and r['n42'] == 'open', r

TESTS += [test_n4_words_can_be_opened_before_n5_is_finished, test_bulk_i_know_marks_the_filtered_words_and_can_be_undone, test_preview_card_has_i_know_which_skips_the_word_and_its_encore, test_experienced_shortcut_applies_the_fast_settings_from_settings_and_the_level_picker]

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
