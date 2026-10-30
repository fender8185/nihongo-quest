"""2026-10-29: PRE_N5 入門等級——假名辨識（kind a）、入門階段（state.stage）、起點選擇、PRE_N5 單字與漢字。"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser, free_port
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8792
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_kana_registry_has_142_items_in_row_order(b):
    js = """(() => { const k = REG.kana; return JSON.stringify({ n: k.length, first: k.slice(0, 12).map(x => x.ch), seion: k.filter(x => x.seion).length,
      last: k[k.length - 1].ch, pair: k.find(x => x.ch === 'か').pair, roma: k.find(x => x.ch === 'ジ').roma, byKey: REG.byKey.get('a:ぱ').kind,
      look: kanaLookalikes(REG.byKey.get('a:あ')).length, lookScript: kanaLookalikes(REG.byKey.get('a:シ')).every(c => /[ァ-ヶ]/.test(c)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 142 and r['seion'] == 92 and r['last'] == 'ポ', r
    assert r['first'] == ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ', 'か', 'き'], r
    assert r['pair'] == 'カ' and r['roma'] == 'ji' and r['byKey'] == 'a', r
    assert r['look'] >= 3 and r['lookScript'], r

def test_kana_question_formats_build_and_first_look_is_read(b):
    js = """(() => { const it = REG.byKey.get('a:あ'); delete state.srs[it.key];
      const q0 = makeQuestion(it, {}); const fmts = {}; for (let i = 0; i < 60; i++) { const q = makeQuestion(it, {}); fmts[q.fmt] = 1; }
      state.srs[it.key] = { b: 2, due: todayStr(), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(todayStr(), -3) };
      const seen = {}; for (let i = 0; i < 80; i++) { const q = makeQuestion(it, {}); seen[q.fmt] = (seen[q.fmt] || 0) + 1; }
      const s = makeQuestion(it, { forceFmt: 'a-sound' }), p = makeQuestion(it, { forceFmt: 'a-pair' }), r = makeQuestion(it, { forceFmt: 'a-read' });
      delete state.srs[it.key];
      return JSON.stringify({ first: q0.fmt, newFmts: Object.keys(fmts), seen: Object.keys(seen).sort(),
        sound: { n: s.options.length, ans: s.options[s.answer].text, audio: s.audio, allHira: s.options.every(o => /^[ぁ-ゖ]$/.test(o.text)) },
        pair: { ans: p.options[p.answer].text, allKata: p.options.every(o => /^[ァ-ヶ]$/.test(o.text)) },
        read: { ans: r.options[r.answer].text, distinct: new Set(r.options.map(o => o.text)).size, kind: r.kind, prompt: r.mistakePrompt } }); })()"""
    r = json.loads(ev(b, js))
    assert r['first'] == 'a-read' and r['newFmts'] == ['a-read'], r
    assert r['seen'] == ['a-pair', 'a-read', 'a-sound'], r
    assert r['sound'] == {'n': 4, 'ans': 'あ', 'audio': 'あ', 'allHira': True}, r
    assert r['pair']['ans'] == 'ア' and r['pair']['allKata'], r
    assert r['read'] == {'ans': 'a', 'distinct': 4, 'kind': 'a', 'prompt': '假名「あ」'}, r

def test_kana_mistake_card_and_undo(b):
    js = """(() => { const it = REG.byKey.get('a:か'); const keep = JSON.stringify(state.srs); const mk = state.mistakes.length; const t = todayStr();
      delete state.srs[it.key]; state.today.newA = 0; startSession('items', { items: [it] }); const e = currentEntry(); e.q = makeQuestion(it, { forceFmt: 'a-read' }); renderPractice();
      answerCurrent((e.q.answer + 1) % 4);
      const after = { due: daysBetween(t, state.srs[it.key].due), rl: state.srs[it.key].rl, mistakes: state.mistakes.length - mk, newA: state.today.newA };
      const m = state.mistakes.find(x => x.key === it.key); const faces = mistakeCardFaces(m); const speak = mloopSpeakText(m);
      const undoBtn = document.querySelector('[data-act="slip"]'); if (undoBtn) undoBtn.click();
      const undone = { rec: Boolean(state.srs[it.key]), mistakes: state.mistakes.length - mk, btn: Boolean(undoBtn) };
      state.srs = JSON.parse(keep); saveState();
      return JSON.stringify({ after, front: faces.front.includes('か'), back: faces.back.includes('ka') && faces.back.includes('カ'), speak, undone }); })()"""
    r = json.loads(ev(b, js))
    assert r['after'] == {'due': 1, 'rl': 0, 'mistakes': 1, 'newA': 1}, r
    assert r['front'] and r['back'] and r['speak'] == 'か', r
    assert r['undone'] == {'rec': False, 'mistakes': 0, 'btn': True}, r

# until the data pass (Task 5) tags real PRE_N5 words, the tests tag a few in memory so the stage logic can be checked on its own
TAG_PRE = "if (!REG.vocab.some(v => v.builtin && v.lv === 'PRE_N5')) { REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 40).forEach(v => { v.lv = 'PRE_N5'; }); REG.kanji.filter(k => k.lv === 'N5').slice(0, 5).forEach(k => { k.lv = 'PRE_N5'; }); } "
PRE_STATE = TAG_PRE + "state.stage = 'pre'; state.kanaKnown = false; state.srs = {}; state.today = { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 }; DAILY_CACHE = null; true"

def test_pre_stage_plan_has_only_kana_until_the_seion_gate_opens(b):
    js = """(() => { const p = dailyPlan(); const out = { a: p.newA.map(x => x.ch), g: p.dueG.length + p.newG.length, l: p.dueL.length + p.newL.length, r: p.dueR.length + p.newR.length,
        c: (p.dueC || []).length + (p.newC || []).length, v: p.newV.length, k: p.newK.map(x => x.lv) };
      REG.kana.filter(x => x.seion).forEach(x => { state.srs[x.key] = { b: 1, due: addDays(todayStr(), 5), n: 1, ok: 1, ng: 0, s: 2, d: 5, last: addDays(todayStr(), -1) }; }); delete state.today.plan; DAILY_CACHE = null;
      const p2 = dailyPlan(); out.v2 = p2.newV.map(x => x.lv); out.a2 = p2.newA.map(x => x.ch); out.k2 = [...new Set(p2.newK.map(x => x.lv))]; out.g2 = p2.newG.map(x => x.u); out.split = p2.split;
      const q = dailyQueue(20).items; out.kinds = [...new Set(q.map(x => x.kind))].sort();
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['a'] == ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ', 'か', 'き', 'く', 'け', 'こ'], r
    assert r['g'] == 0 and r['l'] == 0 and r['r'] == 0 and r['c'] == 0 and r['v'] == 0, r
    assert all(l == 'PRE_N5' for l in r['k']), r
    assert r['v2'] and all(l == 'PRE_N5' for l in r['v2']) and r['a2'][:2] == ['が', 'ぎ'] and r['k2'] == [], r   # 1.0.12: no 入門 kanji
    assert r['g2'] and set(r['g2']) == {'m0'} and (len(r['a2']), len(r['v2']), len(r['g2'])) == (r['split']['a'], r['split']['v'], r['split']['g']), r   # 1.0.16: 第 0 週 grammar once the kana gate is open; 1.0.20: the day's new items shared by what is left
    assert set(r['kinds']) <= {'a', 'v', 'k', 'g'}, r

def test_main_stage_never_schedules_new_kana_but_reviews_practised_ones(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); state.stage = 'main'; DAILY_CACHE = null;
      const p = dailyPlan(); const out = { newA: p.newA.length };
      state.srs['a:あ'] = { b: 1, due: t, n: 1, ok: 1, ng: 0, s: 2, d: 5, last: addDays(t, -2) }; delete state.today.plan; DAILY_CACHE = null;
      const p2 = dailyPlan(); out.dueA = p2.dueA.map(x => x.ch); out.inQueue = dailyQueue(60).items.some(x => x.key === 'a:あ');
      state.srs = JSON.parse(keep); saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'newA': 0, 'dueA': ['あ'], 'inQueue': True}, r

def test_new_kana_follow_the_days_new_count_not_the_old_settings(b):
    js = """(() => { state.settings.loadCap = 10; state.settings.newKanaPerDay = 15; state.mistakes = []; state.recent = Array.from({ length: 100 }, (_, i) => (i < 60 ? 1 : 0));   // 60%: 5 new items
      DAILY_CACHE = null; delete state.today.plan; const p = dailyPlan();
      return JSON.stringify({ a: p.newA.length, note: String(p.note || '') }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['a'] == 5 and '今天新內容 5 題' in r['note'], r   # 1.0.20: the day's new count decides; 負荷上限 and 每天新假名 no longer do

def test_pre_stage_ends_by_itself_once_everything_is_seen_and_accuracy_holds(b):
    # 1.0.15: no 進入第 1 週／再練一陣子 question — kana gate open + every 入門 word seen + recent accuracy ≥ 80% moves on by itself
    js = """(() => { const t = todayStr(); const words = REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5');
      const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      const today = () => { DAILY_CACHE = null; location.hash = '#/today'; route(); return document.getElementById('view').textContent; };
      const out = { n: words.length };
      words.concat(REG.grammar.filter(g => g.u === 'm0')).forEach(mark); state.recent = Array(40).fill(1); today(); out.wordsOnly = state.stage;
      REG.kana.filter(x => x.seion).forEach(mark); state.recent = Array(30).fill(1).concat(Array(10).fill(0));   // 75%
      const low = today(); out.low = { stage: state.stage, says: low.includes('75%') && low.includes('80%'), ask: Boolean(document.querySelector('[data-act="enter-main"], [data-act="pre-done-later"]')) };
      state.recent = Array(34).fill(1).concat(Array(6).fill(0));   // 85%
      const ok = today(); out.ok = { stage: state.stage, unit: state.currentUnit, says: ok.includes('入門完成') || ok.includes('已自動進入第 1 週') };   // silent: no notice on the today page
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['n'] > 0 and r['wordsOnly'] == 'pre', r
    assert r['low'] == {'stage': 'pre', 'says': True, 'ask': False}, r
    assert r['ok'] == {'stage': 'main', 'unit': 'm1', 'says': False}, r

FRESH = TAG_PRE + "state.srs = {}; state.startChosen = false; state.stage = 'main'; state.kanaKnown = false; DAILY_CACHE = null; location.hash = '#/today'; true"

def test_new_account_banner_sets_the_stage(b):
    js = """(() => { route(); const out = { btns: ['start-zero', 'start-test'].map(a => Boolean(document.querySelector(`[data-act="${a}"]`))) };
      document.querySelector('[data-act="start-zero"]').click(); out.stage = state.stage; out.gone = !document.querySelector('[data-act="start-zero"]');
      state.startChosen = false; route(); ACTIONS['start-basics'](); out.stage2 = state.stage; out.known = state.kanaKnown;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", FRESH)]))
    assert r == {'btns': [True, True], 'stage': 'pre', 'gone': True, 'stage2': 'main', 'known': True}, r

def test_pre_choice_raises_every_item_below_the_chosen_level_including_ones_with_history(b):
    js = """(() => { const ws = REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5').slice(0, 6); const t = todayStr();
      const mk = (bb, s, extra) => Object.assign({ b: bb, due: addDays(t, 2), n: 3, ok: 3, ng: 0, s, d: 5, last: addDays(t, -3), f: {} }, extra || {});
      state.srs[ws[0].key] = mk(1, 2); state.srs[ws[1].key] = mk(SRS_LEARNED, 12); state.srs[ws[2].key] = mk(SRS_MASTERED, 40); state.srs[ws[3].key] = mk(0, 0.5, { lapse: 2 });
      preMarkApply({ hira: 'none', kata: 'none', v: 'known' });
      return JSON.stringify(ws.map(w => srsLevelLabel(state.srs[w.key], w.key))); })()"""
    assert json.loads(ev(b, js, [("eval", FRESH)])) == ['已熟練'] * 6

def test_course_card_and_kana_session(b):
    js = """(() => { state.stage = 'pre'; location.hash = '#/course'; route();
      const card = document.querySelector('.card.pre-card'); const out = { card: Boolean(card), text: card ? card.textContent : '', btns: [...card.querySelectorAll('button')].map(b => b.dataset.act) };
      location.hash = '#/vocab/level?lv=PRE_N5'; route();   // 1.0.12: the 入門 card has one button (階段測驗); 練假名 lives on the 單字 page
      document.querySelector('[data-act="kana-practice"]').click(); out.kinds = [...new Set(SESSION.entries.map(e => e.item && e.item.kind))];
      out.first = SESSION.entries[0].item.ch; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", FRESH)]))
    assert r['card'] and '入門' in r['text'] and '漢字' not in r['text'] and '單字' in r['text'], r   # 1.0.12: 入門 has no kanji, so the card lists kana and words only
    assert r['btns'] == ['stage-test'] and r['kinds'] == ['a'] and r['first'] == 'あ', r

def test_i_know_kana_opens_words_without_marking_kana_seen(b):
    js = """(() => { state.stage = 'pre'; location.hash = '#/course'; route(); ACTIONS['kana-known'](); DAILY_CACHE = null;   // 1.0.12: no button on the card; the start choice 已會假名 sets the same flag
      const p = dailyPlan(); openSettings('learn'); const row = Boolean(document.querySelector('[data-key="newKanaPerDay"]')); closeModal(true);
      return JSON.stringify({ open: kanaGateOpen(), v: p.newV.length, a: p.newA.length, seen: Object.keys(state.srs).filter(k => k.startsWith('a:')).length, row }); })()"""
    r = json.loads(ev(b, js, [("eval", FRESH)]))
    assert r['open'] and r['v'] > 0 and r['a'] > 0 and r['seen'] == 0 and not r['row'], r   # 1.0.20: 每天新假名 is no longer a setting

PRE_KANJI = []   # 1.0.12: the 27 入門 kanji (數字、曜日、年時分人大小) went back to N5

def test_pre_n5_words_and_kanji_are_tagged(b):
    js = """(() => { const V = REG.vocab.filter(v => v.builtin); const pre = V.filter(v => v.lv === 'PRE_N5');
      return JSON.stringify({ n: pre.length, lvs: [...new Set(V.map(v => v.lv))].sort(), pos: [...new Set(pre.map(v => v.p))].sort(),
        kanji: REG.kanji.filter(k => k.lv === 'PRE_N5').map(k => k.k), n5k: REG.kanji.filter(k => k.lv === 'N5').length,
        greet: pre.some(v => v.w === 'おはようございます'),
        n4Gate: typeof n5WordsLeft() === 'number' && n5WordsLeft() >= pre.filter(v => !state.srs[v.key]).length }); })()"""
    r = json.loads(ev(b, js))
    assert 55 <= r['n'] <= 65 and r['lvs'] == ['N4', 'N5', 'PRE_N5'], r   # 1.0.12: kana-only basics (問候、こそあど、疑問詞、ある／いる／する…)
    assert 'conj' not in r['pos'] and r['greet'], r
    assert sorted(r['kanji']) == sorted(PRE_KANJI) and r['n5k'] == 104, r
    assert r['n4Gate'], r

def test_no_level_gate_still_says_n5_literally(b):
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    hits = [l.strip()[:120] for l in src.split('\n') if re.search(r"\.lv === 'N5'", l) and 'level-literal-ok' not in l and not re.search(r"listen|LISTEN|read\b|READ|lPool|rPool", l)]
    assert hits == [], hits[:6]

# ---- fixes from the 1.0.6 whole-branch review ----
def test_pre_stage_keeps_due_reviews_and_extra_practice_has_no_grammar(b):
    js = """(() => { const t = todayStr(); const g = REG.grammar.find(x => x.u === 'm1'); const w = REG.vocab.find(v => v.builtin && v.lv === 'N5');
      const rec = { b: 2, due: t, n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -5) }; state.srs[g.key] = Object.assign({}, rec); state.srs[w.key] = Object.assign({}, rec); DAILY_CACHE = null;
      const p = dailyPlan(); const out = { dueV: p.dueV.some(x => x.key === w.key), dueG: p.dueG.some(x => x.key === g.key), newG: p.newG.length };
      const xq = extraQueue(20); out.extraKinds = [...new Set(xq.items.filter(x => !state.srs[x.key]).map(x => x.kind))];
      location.hash = '#/today'; route(); out.unitBtn = Boolean(document.querySelector('[data-act="start-unit"]')); out.unitTab = Boolean(document.querySelector('.hero-tab[data-tab="unit"]'));
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['dueV'] and r['dueG'] and r['newG'] == 0, r          # due reviews of every kind stay in 入門
    assert set(r['extraKinds']) <= {'a'}, r                        # 加練 before the kana gate: kana only
    assert not r['unitBtn'] and not r['unitTab'], r

def test_kanji_page_has_an_intro_tab_and_still_shows_every_kanji(b):
    js = """(() => { const count = (lv) => { location.hash = '#/vocab/kanji?lv=' + lv; route(); return document.querySelectorAll('.kanji-box .kanji-tile').length; };   // old route → level page (1.0.9)
      const n = { pre: count('PRE_N5'), n5: count('N5'), n4: count('N4') }; n.sum = n.pre + n.n5 + n.n4; n.total = REG.kanji.length;
      n.tab = Boolean(document.querySelector('[data-route="#/vocab/level?lv=PRE_N5"]')); n.text = document.querySelector('.seg.mb-4').textContent; return JSON.stringify(n); })()"""
    r = json.loads(ev(b, js))
    assert r['pre'] == 0 and r['sum'] == r['total'] and r['tab'] and '入門' in r['text'] and 'PRE_N5' not in r['text'], r

def test_vocab_decks_cover_every_level(b):
    js = """(() => { const builtin = REG.vocab.filter(v => v.builtin).length; const vs = vocabStats();
      location.hash = '#/vocab/list?lv=PRE_N5'; route(); const rows = document.querySelectorAll('.table tbody tr').length;
      return JSON.stringify({ decks: DECKS.map(d => d[0]), sum: deckPool('PRE_N5').length + deckPool('N5').length + deckPool('N4').length, builtin, rows,
        pre: vs.PRE_N5 && vs.PRE_N5.total, n5: vs.N5.total, n4: vs.N4.total }); })()"""
    r = json.loads(ev(b, js))
    assert 'PRE_N5' in r['decks'] and r['sum'] == r['builtin'] and r['rows'] >= 50, r   # 1.0.12: 59 入門 words
    assert r['pre'] >= 50 and r['pre'] + r['n5'] + r['n4'] == r['builtin'], r

def test_sound_format_needs_speech(b):
    js = """(() => { const it = REG.byKey.get('a:あ'); state.srs[it.key] = { b: 2, due: todayStr(), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(todayStr(), -3) };
      const orig = speechAvailable; window.speechAvailable = () => false; const seen = {}; for (let i = 0; i < 60; i++) seen[makeQuestion(it, {}).fmt] = 1; window.speechAvailable = orig; delete state.srs[it.key];
      return JSON.stringify(Object.keys(seen).sort()); })()"""
    r = json.loads(ev(b, js))
    assert 'a-sound' not in r and r, r

def test_pre_stage_end_keeps_the_unit_of_a_learner_with_grammar_records(b):
    # an account sent back to 入門 by the old 回到入門 button keeps its week when 入門 ends; a fresh one starts at week 1
    js = """(() => { const t = todayStr(); const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      const finish = () => { REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5').forEach(mark); REG.kana.filter(x => x.seion).forEach(mark); REG.grammar.filter(g => g.u === 'm0').forEach(mark); state.recent = Array(40).fill(1); DAILY_CACHE = null; location.hash = '#/today'; route(); return [state.stage, state.currentUnit]; };
      state.currentUnit = 'm8'; const g = REG.grammar.find(x => x.u === 'm8'); state.srs[g.key] = { b: 2, due: addDays(t, 3), n: 1, ok: 1, ng: 0, s: 3, d: 5, last: t };
      const kept = finish(); state.stage = 'pre'; state.srs = {}; state.currentUnit = 'm8'; const fresh = finish();
      return JSON.stringify({ kept, fresh }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r == {'kept': ['main', 'm8'], 'fresh': ['main', 'm1']}, r

def test_homophone_kana_never_decoy_each_other(b):
    js = """(() => { const bad = []; ['を', 'ヲ', 'じ', 'ず', 'ぢ', 'づ'].forEach(ch => { const it = REG.byKey.get('a:' + ch); for (let i = 0; i < 150; i++) kanaLookalikes(it).forEach(c => { if (KANA_ROMAJI[c] === it.roma || KANA_ROMAJI[Object.keys(KATA).find(h => KATA[h] === c)] === it.roma) bad.push(ch + c); }); });
      return JSON.stringify([...new Set(bad)]); })()"""
    r = json.loads(ev(b, js))
    assert r == [], r

# ---- 1.0.8: three-level theme lists ----
def test_every_builtin_word_has_a_theme_of_its_level(b):
    js = """(() => { const T = DATA.THEMES; const bad = REG.vocab.filter(v => v.builtin && !(T[v.lv] || []).some(t => t.c === vocabTheme(v))).slice(0, 5).map(v => v.id + ':' + v.lv + ':' + vocabTheme(v));
      return JSON.stringify({ n: [T.PRE_N5.length, T.N5.length, T.N4.length], bad, order0: THEME_ORDER[0], other: REG.vocab.filter(v => v.builtin && vocabTheme(v) === '其他').length,
        verbsPre: REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5' && /^(v5|v1|vs|vk|i|na|adv)$/.test(v.p) && vocabTheme(v) !== '基本動作與形容').length }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == [3, 17, 17] and r['bad'] == [] and r['order0'] == '問候' and r['other'] == 0 and r['verbsPre'] == 0, r

def test_theme_lane_migrates_old_names(b):
    js = """(() => { const s = normalizeState(Object.assign(defaultState(), { themeLane: { order: ['休閒', '生活', '飲食', '問候與溝通'], count: { 休閒: 2, 生活: 1 } } }));
      return JSON.stringify({ order: s.themeLane.order.slice(0, 4), count: s.themeLane.count, dup: new Set(s.themeLane.order).size === s.themeLane.order.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['order'] == ['興趣與休閒', '居家生活', '飲食', '問候與溝通'] and r['count'] == {'興趣與休閒': 2, '居家生活': 1} and r['dup'], r

def test_same_theme_name_across_levels(b):
    js = """(() => { state.stage = 'main'; state.srs = {}; state.today.newV = 0; DAILY_CACHE = null; const pool = REG.vocab.filter(v => v.builtin);
      const th = activeThemes(pool, false); const n5Only = newVocabCandidates(pool, false).filter(v => v.lv === 'N5').slice(0, 6).every(v => th.includes(vocabTheme(v)));
      const q = buildVocabQueue('c:飲食', 60); const lvs = [...new Set(q.map(x => x.lv))].sort();
      return JSON.stringify({ n5Only, lvs, th }); })()"""
    r = json.loads(ev(b, js))
    assert r['n5Only'] and r['lvs'] == ['N5'], r   # 1.0.12: 飲食 has no 入門 words any more

def test_check_vocab_script_flags_bad_candidates(b):
    fx = {"words": [
      {"w": "りんご", "r": "りんご", "m": "蘋果", "p": "n", "lv": "PRE_N5", "c": "飲食", "ex": "{りんご}を食べます。", "exZh": "吃蘋果。"},
      {"w": "牛丼", "r": "ぎゅうどん", "m": "牛肉蓋飯", "p": "n", "lv": "PRE_N5", "c": "飲食", "ex": "{牛丼}を食べます。", "exZh": "吃牛肉蓋飯。"},
      {"w": "ラーメン", "r": "らーめん", "m": "拉麵", "p": "n", "lv": "PRE_N5", "c": "不存在", "ex": "{ラーメン}が好きです。", "exZh": "喜歡拉麵。"},
      {"w": "黒板", "r": "こくばん", "m": "黑板", "p": "n", "lv": "PRE_N5", "c": "日常物品", "ex": "大学の{黒板}を見ます。", "exZh": "看大學的黑板。"},
      {"w": "時計", "r": "とけい", "m": "鐘錶", "p": "n", "lv": "N5", "c": "居家生活", "ex": "{時計}を買いました。", "exZh": "買了鐘。", "ex2": "{時計}を買いました。", "exZh2": "買了鐘。"}
    ]}
    path = os.path.join(ROOT, '.superpowers', 'check-vocab-fixture.json'); os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(fx, open(path, 'w'), ensure_ascii=False)
    out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'check-vocab.py'), path, str(free_port())], capture_output=True, text=True)   # its own server on a free port: 8790 belongs to test_stage_tests.py
    assert out.returncode == 1, out.stdout + out.stderr
    for msg in ['already in the bank', 'unknown theme', 'pre-example-vocab', 'same as the first example']:
        assert msg in out.stdout, (msg, out.stdout)

def test_bank_has_the_new_pre_n5_and_n5_words(b):
    js = """(() => { const V = REG.vocab.filter(v => v.builtin); const pre = V.filter(v => v.lv === 'PRE_N5'), n5 = V.filter(v => v.lv === 'N5');
      const preSet = new Set(pre.map(v => jaPlain(v.w)));
      const bad = pre.filter(v => v.id.startsWith('p5a-')).filter(v => { const h = furi(v.ex.replace(/[{}]/g, '')); const re = /<ruby>([^<]+)<rt>/g; let m; while ((m = re.exec(h))) { if (!preSet.has(m[1]) && !pre.some(x => jaPlain(x.w).includes(m[1]))) return true; } return false; }).map(v => v.id);
      return JSON.stringify({ pre: pre.length, n5: n5.length, p5a: pre.filter(v => v.id.startsWith('p5a-')).length, n5f: n5.filter(v => v.id.startsWith('n5f-')).length,
        ex: V.every(v => v.ex && v.exZh), ex2: n5.filter(v => v.id.startsWith('n5f-')).every(v => v.ex2 && v.exZh2), noEx2: pre.filter(v => v.id.startsWith('p5a-')).every(v => !v.ex2), bad: bad.slice(0, 5) }); })()"""
    r = json.loads(ev(b, js))
    assert r['p5a'] == 7 and r['n5f'] == 80 and r['pre'] >= 55 and r['n5'] >= 870, r   # 1.0.12: 113 of the 120 p5a words moved to N5 (with a second example each)
    assert r['ex'] and r['ex2'] and r['noEx2'] and r['bad'] == [], r

def test_every_builtin_kanji_word_renders_furigana_matching_its_reading(b):
    js = """(() => { const hira = (s) => s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)); const bare = [], mismatch = [];
      REG.vocab.filter(v => v.builtin && /[一-鿿]/.test(jaPlain(v.w))).forEach(v => { const plain = jaPlain(v.w); const h = furi(plain);
        const b = h.replace(/<ruby>.*?<\\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g); if (b) { bare.push(v.id + ':' + v.w); return; }
        const read = hira(h.replace(/<ruby>[^<]+<rt>([^<]+)<\\/rt><\\/ruby>/g, '$1').replace(/<[^>]+>/g, ''));
        if (read !== hira(v.r)) mismatch.push(v.id + ':' + v.w + ':' + read + '≠' + v.r); });
      return JSON.stringify({ bare, newMismatch: mismatch.filter(x => /^(p5a|n5f)-/.test(x)), oldMismatch: mismatch.filter(x => !/^(p5a|n5f)-/.test(x)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['bare'] == [] and r['newMismatch'] == [], r
    assert len(r['oldMismatch']) <= 2, r['oldMismatch']   # 汚す (きたなす from 汚い) and この頃 (ころ) predate 1.0.8

# ---- 1.0.9: vocab page by level ----
def test_level_and_theme_stats(b):
    js = """(() => { const L = ['PRE_N5', 'N5', 'N4'].map(levelStats); const T = themeStats('N5');
      return JSON.stringify({ totals: L.map(x => x.total), sum: L.reduce((a, x) => a + x.total, 0), builtin: REG.vocab.filter(v => v.builtin).length,
        kana: L[0].kana && L[0].kana.total, kanji: L.map(x => x.kanji.total), tn: T.length, names: T.map(t => t.c).slice(0, 3), tsum: T.reduce((a, t) => a + t.total, 0) }); })()"""
    r = json.loads(ev(b, js))
    assert r['sum'] == r['builtin'] and r['kana'] == 142 and r['kanji'] == [0, 104, 238], r
    assert r['tn'] == 17 and r['names'] == ['問候與溝通', '疑問與指示', '時間'] and r['tsum'] == r['totals'][1], r

def test_kanji_theme_mapping_is_grounded(b):
    js = """(() => { const bad = []; ['PRE_N5', 'N5', 'N4'].forEach(lv => themeStats(lv).forEach(t => t.kanji.forEach(k => {
        const ok = REG.vocab.some(v => v.builtin && v.lv === lv && vocabTheme(v) === t.c && jaPlain(v.w).includes(k)) && REG.byKey.has('k:' + k); if (!ok) bad.push(lv + ':' + t.c + ':' + k); })));
      const pre = themeStats('PRE_N5');
      return JSON.stringify({ bad: bad.slice(0, 5), preKanji: pre.reduce((a, t) => a + t.kanji.length, 0), of: kanjiThemeOf(REG.byKey.get('k:日'), 'N5') }); })()"""
    r = json.loads(ev(b, js))
    assert r['bad'] == [] and r['preKanji'] == 0 and r['of'] in ('時間', '數量'), r

def test_level_theme_filter_is_level_scoped(b):
    js = """(() => { state.srs = {}; state.today.newV = 0; DAILY_CACHE = null;
      const q = buildVocabQueue('t:N5:飲食', 60); const k = buildKanjiQueue(50, 'N5'); startSession('kana', { row: 1 }); const row = SESSION.entries.map(e => e.item.ch);
      return JSON.stringify({ lvs: [...new Set(q.map(x => x.lv))], themes: [...new Set(q.map(vocabTheme))], n: q.length, kl: [...new Set(k.map(x => x.lv))], row }); })()"""
    r = json.loads(ev(b, js))
    assert r['lvs'] == ['N5'] and r['themes'] == ['飲食'] and r['n'] > 0 and r['kl'] == ['N5'], r
    assert r['row'] == ['か', 'き', 'く', 'け', 'こ', 'カ', 'キ', 'ク', 'ケ', 'コ'], r

def test_vocab_opens_on_the_learners_level(b):
    js = """(() => { const go = () => { location.hash = '#/vocab'; route(); return decodeURIComponent(location.hash); };
      state.stage = 'pre'; const a = go(); state.stage = 'main'; state.srs = {}; state.settings.n4Words = 'auto'; DAILY_CACHE = null; const b2 = go();
      REG.vocab.filter(v => v.builtin && v.lv !== 'N4').forEach(v => { state.srs[v.key] = { b: 2, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5 }; }); DAILY_CACHE = null; const c = go();
      const tabs = [...document.querySelectorAll('.seg.mb-4 button')].map(x => x.textContent.trim()); return JSON.stringify({ a, b: b2, c, tabs }); })()"""
    r = json.loads(ev(b, js))
    assert r['a'] == '#/vocab/level?lv=PRE_N5' and r['b'] == '#/vocab/level?lv=N5' and r['c'] == '#/vocab/level?lv=N4', r
    assert r['tabs'] == ['入門', 'N5', 'N4', '字卡', '單字表', '匯入與新增'], r

def test_level_page_sections(b):
    js = """(() => { location.hash = '#/vocab/level?lv=N5'; route(); const v = document.getElementById('view');
      const cards = [...v.querySelectorAll('.theme-card')]; const sum = cards.reduce((a, c) => a + Number(c.querySelector('.bar.stack').dataset.total || 0), 0);
      return JSON.stringify({ n: cards.length, lvs: [...new Set(cards.map(c => c.dataset.lv))], ring: Boolean(v.querySelector('.ring')), kanjiBox: Boolean(v.querySelector('.kanji-box')), kanaBox: Boolean(v.querySelector('.kana-box')),
        tiles: v.querySelectorAll('.kanji-box .kanji-tile').length, groups: v.querySelectorAll('.kanji-box .kanji-group').length, practice: v.querySelector('[data-act="start-vocab"][data-filter="N5"]') !== null,
        themeBtn: Boolean(v.querySelector('[data-act="start-vocab"][data-filter="t:N5:飲食"]')), total: REG.vocab.filter(x => x.builtin && x.lv === 'N5').length, sum }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 17 and r['lvs'] == ['N5'] and r['ring'] and r['kanjiBox'] and not r['kanaBox'] and r['tiles'] == 104 and r['groups'] >= 5, r
    assert r['practice'] and r['themeBtn'] and r['sum'] == r['total'], r

def test_theme_card_kanji_open_detail(b):
    js = """(() => { location.hash = '#/vocab/level?lv=N5'; route(); const chip = document.querySelector('.theme-card [data-act="kanji-open"]'); const k = chip && chip.dataset.k; chip.click();
      const title = document.querySelector('.modal-title'); const t = title ? title.textContent : ''; closeModal(true);
      return JSON.stringify({ k, opened: t.includes(k) }); })()"""
    r = json.loads(ev(b, js))
    assert r['k'] and r['opened'], r

def test_kana_heat_grid(b):
    # 1.0.15: one table per script, five kana a row with the romaji under each; a tap reads the kana; ▶ practises that row of that script only
    js = """(() => { const t = todayStr(); state.srs = {}; state.srs['a:あ'] = { b: 2, due: t, n: 1, ok: 1, ng: 0, s: 3, d: 5 }; state.srs['a:イ'] = { b: 5, due: t, n: 3, ok: 3, ng: 0, s: 40, d: 5 };
      location.hash = '#/vocab/level?lv=PRE_N5'; route(); const box = document.querySelector('.kana-box');
      const tables = [...box.querySelectorAll('.kana-table')].map(tb => ({ script: tb.dataset.script, rows: [...tb.querySelectorAll('.kana-heat-row')].map(r => r.querySelectorAll('.kana-cell').length), n: tb.querySelectorAll('.kana-cell:not(.empty)').length }));
      const cell = (ch) => box.querySelector(`.kana-cell[data-ch="${ch}"]`);
      const spoken = []; const orig = speak; speak = (x) => { spoken.push(x); return Promise.resolve(); };
      cell('し').click(); cell('ヲ').click(); speak = orig;
      const out = { tables, a: /heat-2/.test(cell('あ').className), i: /heat-4/.test(cell('イ').className), u: /heat-0/.test(cell('う').className), shi: cell('し').textContent.includes('shi'), wo: cell('ヲ').textContent.includes('o'), spoken };
      box.querySelector('.kana-table[data-script="kata"] [data-act="kana-row"][data-row="2"]').click(); out.kataRow = SESSION.entries.map(e => e.item.ch);
      SESSION = null; document.body.classList.remove('practicing');
      location.hash = '#/vocab/level?lv=PRE_N5'; route(); document.querySelector('.kana-table[data-script="hira"] [data-act="kana-row"][data-row="2"]').click(); out.hiraRow = SESSION.entries.map(e => e.item.ch);
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['tables'] == [{'script': 'hira', 'rows': [5] * 16, 'n': 71}, {'script': 'kata', 'rows': [5] * 16, 'n': 71}], r
    assert r['a'] and r['i'] and r['u'] and r['shi'] and r['wo'], r
    assert r['spoken'] == ['し', 'ヲ'], r
    assert r['kataRow'] == ['サ', 'シ', 'ス', 'セ', 'ソ'] and r['hiraRow'] == ['さ', 'し', 'す', 'せ', 'そ'], r

KANA_SHOWN = "[...box.querySelectorAll('.kana-table')].filter(t => t.offsetParent !== null).map(t => t.dataset.script)"

def test_kana_chart_shows_one_script_on_a_phone_and_both_side_by_side_on_a_wide_screen(b):
    js = """(() => { location.hash = '#/vocab/level?lv=PRE_N5'; route(); let box = document.querySelector('.kana-box'); box.open = true;
      const shown = () => SHOWN; const out = { phone: shown(), seg: box.querySelector('[data-act="kana-script"]').offsetParent !== null };
      box.querySelector('[data-act="kana-script"][data-script="kata"]').click(); out.after = shown(); out.same = box.open && document.querySelector('.kana-box') === box;
      location.hash = '#/vocab/level?lv=PRE_N5'; route(); box = document.querySelector('.kana-box'); box.open = true; out.kept = shown();
      return JSON.stringify(out); })()""".replace('SHOWN', KANA_SHOWN)
    r = json.loads(b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", js)])[-1])
    assert r == {'phone': ['hira'], 'seg': True, 'after': ['kata'], 'same': True, 'kept': ['kata']}, r
    wide = """(() => { location.hash = '#/vocab/level?lv=PRE_N5'; route(); const box = document.querySelector('.kana-box'); box.open = true; const t = [...box.querySelectorAll('.kana-table')];
      return JSON.stringify({ shown: SHOWN, seg: box.querySelector('[data-act="kana-script"]').offsetParent !== null, sideBySide: t.length === 2 && Math.abs(t[0].getBoundingClientRect().top - t[1].getBoundingClientRect().top) < 2 }); })()""".replace('SHOWN', KANA_SHOWN)
    r2 = json.loads(b.run([("metrics", (1200, 900, False)), ("nav", URL), ("wait", READY), ("eval", wide)])[-1])
    assert r2 == {'shown': ['hira', 'kata'], 'seg': False, 'sideBySide': True}, r2

def test_cloud_generator_covers_every_kana(b):
    # a tapped kana (五十音表) or a 聽音選字 question plays that one kana's clip, so the generator must make all 142
    js = """(() => { const have = new Set(cloudAudioTexts().filter(x => x.gender === 'f' && !x.reading && !x.lang).map(x => x.text));
      return JSON.stringify({ n: REG.kana.length, miss: REG.kana.filter(x => !have.has(x.ch)).map(x => x.ch) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 142 and r['miss'] == [], r

def test_old_vocab_routes_redirect(b):
    js = """(() => { const go = (h) => { location.hash = h; route(); return [decodeURIComponent(location.hash), document.getElementById('view').textContent.includes('出錯')]; };
      return JSON.stringify({ themes: go('#/vocab/themes'), kanji: go('#/vocab/kanji?lv=N4'), list: go('#/vocab/list?lv=PRE_N5&c=飲食')[0] }); })()"""
    r = json.loads(ev(b, js))
    assert r['themes'][0].startswith('#/vocab/level?lv=') and not r['themes'][1], r
    assert r['kanji'] == ['#/vocab/level?lv=N4', False] and r['list'] == '#/vocab/list?lv=PRE_N5&c=飲食', r

# ---- fixes from the 1.0.8 whole-branch review ----
def test_theme_lane_migration_is_idempotent_and_keeps_pre_n5_greetings(b):
    js = """(() => { state.themeLane = { order: [], count: {} }; const seeded = laneOrder().slice(); state.themeLane.count['問候'] = 3;
      const s = normalizeState(JSON.parse(JSON.stringify(state))); const again = normalizeState(JSON.parse(JSON.stringify(s)));
      return JSON.stringify({ first: seeded[0], after: s.themeLane.order[0], same: JSON.stringify(s.themeLane.order) === JSON.stringify(seeded) && JSON.stringify(again.themeLane.order) === JSON.stringify(seeded), count: s.themeLane.count }); })()"""
    r = json.loads(ev(b, js))
    assert r['first'] == '問候' and r['after'] == '問候' and r['same'] and r['count'] == {'問候': 3}, r

def test_day_one_responses_never_decoy_each_other(b):
    js = """(() => { const groups = [['はい', 'ええ', 'そうです', 'そう', 'そうですか'], ['いいえ', 'ちがいます', '違う']]; const bad = [];
      groups.forEach(g => g.forEach(w => { const v = REG.vocab.find(x => x.builtin && x.w === w); if (!v) return; state.srs[v.key] = { b: 2, due: todayStr(), n: 2, ok: 2, ng: 0, s: 3, d: 5, f: {} };
        for (let i = 0; i < 60; i++) { ['v-meaning', 'v-recall', 'v-cloze'].forEach(f => { const q = makeVocabQuestion(v, { forceFmt: f }); if (!q) return;
          q.options.forEach((o, j) => { if (j === q.answer) return; const other = g.filter(x => x !== w).find(x => { const ov = REG.vocab.find(y => y.builtin && y.w === x); return ov && (o.text === ov.m || o.text === ov.w || o.text === ov.r); }); if (other) bad.push(w + '/' + f + '/' + other); }); }); }
        delete state.srs[v.key]; }));
      return JSON.stringify([...new Set(bad)]); })()"""
    r = json.loads(ev(b, js))
    assert r == [], r

# ---- fixes from the 1.0.9 whole-branch review ----
def test_vocab_redirect_does_not_trap_the_back_button(b):
    js = """new Promise(res => { location.hash = '#/today'; route(); setTimeout(() => { location.hash = '#/vocab'; route();
      setTimeout(() => { const atLevel = location.hash.startsWith('#/vocab/level?lv='); history.back(); setTimeout(() => res(JSON.stringify({ atLevel, after: location.hash })), 400); }, 300); }, 300); })"""
    r = json.loads(ev(b, js))
    assert r['atLevel'] and r['after'] == '#/today', r

def test_flash_deck_switch_stays_on_the_cards_page(b):
    js = """(() => { location.hash = '#/vocab/cards'; route(); document.querySelector('[data-act="flash-deck"][data-deck="N5"]').click(); route();
      return JSON.stringify({ hash: location.hash, deck: FLASH && FLASH.deck, card: Boolean(document.querySelector('.flash')) }); })()"""
    r = json.loads(ev(b, js))
    assert r['hash'] == '#/vocab/cards?deck=N5' and r['deck'] == 'N5' and r['card'], r

def test_n4_kanji_fall_back_to_a_theme_of_another_level(b):
    js = """(() => { location.hash = '#/vocab/level?lv=N4'; route(); const groups = [...document.querySelectorAll('.kanji-box .kanji-group')].map(g => [g.querySelector('.small').textContent, g.querySelectorAll('.kanji-tile').length]);
      const other = groups.find(g => g[0].startsWith('其他')); const t0 = performance.now(); route(); const ms = performance.now() - t0;
      return JSON.stringify({ n: groups.length, other: other ? other[1] : 0, total: groups.reduce((a, g) => a + g[1], 0), ms }); })()"""
    r = json.loads(ev(b, js))
    assert r['total'] == 238 and r['other'] <= 5 and r['ms'] < 120, r

def test_word_table_from_a_level_card_keeps_the_level(b):
    js = """(() => { location.hash = '#/vocab/list?lv=N5&c=飲食'; route(); const head = document.querySelector('.page-head');
      const back = head.querySelector('[data-act="nav"]'); const practice = head.querySelector('[data-act="start-vocab"]');
      return JSON.stringify({ back: back && back.dataset.route, filter: practice && practice.dataset.filter, rows: document.querySelectorAll('.table tbody tr').length, n5: REG.vocab.filter(v => v.builtin && v.lv === 'N5' && vocabTheme(v) === '飲食').length }); })()"""
    r = json.loads(ev(b, js))
    assert r['back'] == '#/vocab/level?lv=N5' and r['filter'] == 't:N5:飲食' and r['rows'] == r['n5'], r

# ---- 1.0.16: 第 0 週 is the pseudo-unit m0 ----
def test_week0_is_a_pseudo_unit_m0(b):
    js = """(() => JSON.stringify({ weeks: unitById('m0').weeks, order: unitOrder('m0'), m1: unitOrder('m1'), units: DATA.UNITS.length, total: courseProgress().total,
      secs: DATA.LESSONS.m0.sections.length, kana: DATA.LESSONS.m0.sections[0].kana === true, unknown: unitById('zz').id }))()"""
    r = json.loads(ev(b, js))
    assert r == {'weeks': '第 0 週', 'order': -1, 'm1': 0, 'units': 18, 'total': 18, 'secs': 13, 'kana': True, 'unknown': 'm1'}, r

def test_week0_page_is_a_unit_page(b):
    js = """(() => { const at = (h) => { location.hash = h; route(); const v = document.getElementById('view'); return { start: Boolean(v.querySelector('[data-act="start-unit"][data-unit="m0"]')), setCur: Boolean(v.querySelector('[data-act="set-current"]')),
        tabs: v.querySelectorAll('.seg [data-route^="#/course/m0"]').length, h3: v.querySelectorAll('.lesson h3').length, done: Boolean(v.querySelector('[data-act="toggle-done"]')) }; };
      state.introSeen = false; const intro = at('#/course/intro'); const seen = state.introSeen; const lesson = at('#/course/m0?tab=lesson');
      location.hash = '#/course'; route(); const row = document.querySelector('.unit-row[data-route="#/course/intro"]');
      return JSON.stringify({ intro, seen, lesson, rowBar: Boolean(row && row.querySelector('.bar.stack')), rowCur: Boolean(row && row.querySelector('.chip-accent')) }); })()"""
    r = json.loads(ev(b, js))
    page = {'start': True, 'setCur': False, 'tabs': 2, 'h3': 13, 'done': False}
    assert r == {'intro': page, 'seen': True, 'lesson': page, 'rowBar': True, 'rowCur': False}, r


def test_main_accounts_never_get_week0_items_unless_pending(b):
    js = """(() => { const t = todayStr(); state.stage = 'main'; state.currentUnit = 'm3'; state.srs = {}; const g3 = REG.grammar.find(x => x.u === 'm3'); state.srs[g3.key] = { b: 2, due: addDays(t, 3), n: 1, ok: 1, ng: 0, s: 3, d: 5, last: t }; DAILY_CACHE = null;
      const out = { cand: newGrammarCandidates().filter(g => g.u === 'm0').length, plan: dailyPlan().newG.filter(g => g.u === 'm0').length, extra: extraQueue(20).items.filter(x => x.u === 'm0').length,
        unit: buildUnitQueue('m0').filter(x => x.u === 'm0').length };
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['cand'] == 0 and r['plan'] == 0 and r['extra'] == 0 and r['unit'] > 0, r

def test_week0_items_follow_lesson_order_with_a_lesson_card_first(b):
    js = """(() => { REG.kana.filter(x => x.seion).forEach(x => { state.srs[x.key] = { b: 1, due: addDays(todayStr(), 5), n: 1, ok: 1, ng: 0, s: 2, d: 5, last: addDays(todayStr(), -1) }; }); DAILY_CACHE = null;
      const first = dailyPlan().newG; startSession('unit', { unit: 'm0' }); const e = SESSION.entries.find(x => x.preview);   // the lesson card comes in daily and unit sessions only
      return JSON.stringify({ secs: first.map(g => g.sec), pts: new Set(first.filter(g => g.sec === 1).map(g => g.pt)).size, card: Boolean(e) && lessonSecKey(e.item) === 'm0:1', link: Boolean(e) && grammarPreviewHtml(e, 0).includes('#/course/m0?tab=lesson') }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['secs'] == sorted(r['secs']) and r['secs'][0] == 1 and r['pts'] == 2 and r['card'] and r['link'], r

def test_pre_account_with_words_done_stays_until_week0_is_seen(b):
    js = """(() => { const t = todayStr(); const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5').forEach(mark); REG.kana.filter(x => x.seion).forEach(mark); state.recent = Array(40).fill(1);
      const today = () => { DAILY_CACHE = null; location.hash = '#/today'; route(); return document.getElementById('view').textContent; };
      const out = { left: introLeft(), done: preDone() }; const txt = today(); out.stage1 = state.stage; const g1 = dailyPlan().newG; out.newG = g1.length > 0 && g1.every(g => g.u === 'm0'); out.line = txt.includes('句型 0／20');
      REG.grammar.filter(g => g.u === 'm0').forEach(mark); today(); out.stage2 = state.stage; out.m0Done = state.completedUnits.includes('m0');
      state.stage = 'pre'; state.srs = {}; REG.kana.filter(x => x.seion).forEach(mark); REG.grammar.filter(g => g.u === 'm0').forEach(mark);
      state.recent = Array(34).fill(1).concat(Array(6).fill(0)); DAILY_CACHE = null;   // 85%: factor 1, so 8 new words at the default load cap
      out.newV = dailyPlan().newV.length;   // week 0 all seen: its unused grammar quota must not become 6 extra words
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r == {'left': 20, 'done': False, 'stage1': 'pre', 'newG': True, 'line': True, 'stage2': 'main', 'm0Done': True, 'newV': 8}, r

def test_week0_pending_puts_its_items_before_the_current_unit(b):
    js = """(() => { state.stage = 'main'; state.currentUnit = 'm1'; state.srs = {}; state.introPending = true; const c = newGrammarCandidates().slice(0, 3).map(g => g.u);
      const norm = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { introPending: 'yes' })).introPending;
      state.introPending = false; return JSON.stringify({ c, after: newGrammarCandidates()[0].u, norm }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'c': ['m0', 'm0', 'm0'], 'after': 'm1', 'norm': True}, r

# ---- 1.0.16: 學習分析 counts the new content (user, 2026-10-29: 「學習分析的資料也要一併統計這些新加入的內容」) ----
def test_week0_items_count_as_n5_grammar_in_the_stats(b):
    js = """(() => { const t = progressTotals('g'); const n5 = REG.grammar.filter(g => g.u === 'm0' || DATA.UNITS.some(u => u.id === g.u && u.lv === 'N5')).length; return JSON.stringify({ n5: t.n5, want: n5, total: t.total === REG.grammar.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['n5'] == r['want'] and r['total'], r

def test_stats_progress_shows_kana_and_counts_it_as_learned(b):
    js = """(() => { const t = todayStr(); state.srs = {}; ['a:あ', 'a:い', 'a:ア'].forEach((k, i) => { state.srs[k] = { b: i < 2 ? SRS_LEARNED : 1, due: addDays(t, 3), n: 2, ok: 2, ng: 0, s: 5, d: 5, last: t }; });
      location.hash = '#/stats'; route(); const v = document.getElementById('view'); const g = v.querySelector('#progressCard .gauge[data-kind="a"]');
      const tile = [...v.querySelectorAll('.stat-l')].find(x => x.textContent.startsWith('已熟悉'));
      return JSON.stringify({ gauges: [...v.querySelectorAll('#progressCard .gauge')].map(x => x.dataset.kind), total: g && Number(g.dataset.total), met: g && Number(g.dataset.seen) + Number(g.dataset.learned) + Number(g.dataset.mastered),
        tick: Boolean(g && g.querySelector('.tick')), tile: tile && tile.textContent.includes('假名 2'), tileN: tile && tile.previousElementSibling.textContent }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'gauges': ['v', 'g', 'a'], 'total': 142, 'met': 3, 'tick': False, 'tile': True, 'tileN': '2'}, r

def test_stats_tables_name_kana_rows_and_formats(b):
    js = """(() => { state.statsFmt = { 'a-read': { ok: 4, ng: 2 }, 'a-sound': { ok: 5, ng: 0 }, 'a-pair': { ok: 3, ng: 3 } }; location.hash = '#/stats'; route(); const v = document.getElementById('view');
      const rows = [...v.querySelectorAll('#planAdvice tbody tr')].map(r => r.cells[0].textContent); const kanaTr = [...v.querySelectorAll('#planAdvice tbody tr')].find(r => r.cells[0].textContent === '假名');
      return JSON.stringify({ kanaRow: rows.includes('假名'), kana: kanaTr ? kanaTr.cells[1].textContent : null, fmts: ['假名・看字選音', '假名・聽音選字', '假名・平片對照'].filter(n => v.textContent.includes(n)).length, raw: /a-(read|sound|pair)/.test(v.textContent) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'kanaRow': True, 'kana': '0 / 142', 'fmts': 3, 'raw': False}, r

def test_finishing_pre_logs_week0_as_a_completed_unit(b):
    js = """(() => { const t = todayStr(); const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5').forEach(mark); REG.kana.filter(x => x.seion).forEach(mark); REG.grammar.filter(g => g.u === 'm0').forEach(mark);
      state.recent = Array(40).fill(1); delete state.dailyLogs[t]; const done = finishPreIfReady();
      return JSON.stringify({ done, units: (state.dailyLogs[t] || {}).units || [] }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r == {'done': True, 'units': ['基本句型']}, r

# ---- 1.0.16 final-review fixes ----
def test_pre_week0_grammar_used_up_gives_its_slots_to_words(b):
    js = """(() => { const t = todayStr(); state.srs = {}; state.settings.loadCap = 100; state.recent = Array(34).fill(1).concat(Array(6).fill(0));   // 85%: factor 1
      REG.kana.forEach((x, i) => { state.srs[x.key] = { b: 2, due: i < 88 ? t : addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -3) }; });
      REG.grammar.filter(g => g.u === 'm0').forEach(g => { state.srs[g.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; });
      DAILY_CACHE = null; delete state.today.plan; const p = dailyPlan(); return JSON.stringify({ dueA: p.dueA.length, newG: p.newG.length, newV: p.newV.length }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r == {'dueA': 50, 'newG': 0, 'newV': 15}, r   # 1.0.20: at most 50 reviews a day; no phantom 第 0 週 grammar — its slots go to the words

def test_week0_completes_itself_when_its_last_item_is_answered(b):
    js = """(() => { const t = todayStr(); state.stage = 'main'; state.currentUnit = 'm2'; state.srs = {}; state.completedUnits = []; state.introPending = true; delete state.dailyLogs[t];
      const G = REG.grammar.filter(g => g.u === 'm0'); G.slice(1).forEach(g => { state.srs[g.key] = { b: 1, due: addDays(t, 2), n: 1, ok: 1, ng: 0, s: 2, d: 5, last: t }; });
      const out = { before: state.completedUnits.includes('m0') }; srsAnswer(G[0].key, true);
      Object.assign(out, { done: state.completedUnits.includes('m0'), pending: state.introPending, units: (state.dailyLogs[t] || {}).units || [] });
      state.srs = {}; state.completedUnits = ['m0']; state.introPending = true; out.respect = newGrammarCandidates()[0].u;   // marked done (e.g. on another device): pending no longer applies
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'before': False, 'done': True, 'pending': False, 'units': ['基本句型'], 'respect': 'm2'}, r

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
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
