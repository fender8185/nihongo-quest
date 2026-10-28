"""2026-10-29: PRE_N5 入門等級——假名辨識（kind a）、入門階段（state.stage）、起點選擇、PRE_N5 單字與漢字。"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
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
      REG.kana.filter(x => x.seion).forEach(x => { state.srs[x.key] = { b: 1, due: addDays(todayStr(), 5), n: 1, ok: 1, ng: 0, s: 2, d: 5, last: addDays(todayStr(), -1) }; }); DAILY_CACHE = null;
      const p2 = dailyPlan(); out.v2 = p2.newV.map(x => x.lv); out.a2 = p2.newA.map(x => x.ch); out.k2 = [...new Set(p2.newK.map(x => x.lv))];
      const q = dailyQueue(20).items; out.kinds = [...new Set(q.map(x => x.kind))].sort();
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['a'] == ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ', 'か', 'き', 'く', 'け', 'こ'], r
    assert r['g'] == 0 and r['l'] == 0 and r['r'] == 0 and r['c'] == 0 and r['v'] == 0, r
    assert all(l == 'PRE_N5' for l in r['k']), r
    assert r['v2'] and all(l == 'PRE_N5' for l in r['v2']) and r['a2'][:2] == ['が', 'ぎ'] and r['k2'] == ['PRE_N5'], r
    assert set(r['kinds']) <= {'a', 'v', 'k'}, r

def test_main_stage_never_schedules_new_kana_but_reviews_practised_ones(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); state.stage = 'main'; DAILY_CACHE = null;
      const p = dailyPlan(); const out = { newA: p.newA.length };
      state.srs['a:あ'] = { b: 1, due: t, n: 1, ok: 1, ng: 0, s: 2, d: 5, last: addDays(t, -2) }; DAILY_CACHE = null;
      const p2 = dailyPlan(); out.dueA = p2.dueA.map(x => x.ch); out.inQueue = dailyQueue(60).items.some(x => x.key === 'a:あ');
      state.srs = JSON.parse(keep); saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'newA': 0, 'dueA': ['あ'], 'inQueue': True}, r

def test_load_cap_counts_kana(b):
    js = """(() => { state.settings.loadCap = 10; state.settings.newKanaPerDay = 15; DAILY_CACHE = null; const p = dailyPlan();
      return JSON.stringify({ a: p.newA.length, note: String(p.note || '') }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['a'] < 15 and '新假名' in r['note'], r

def test_completion_card_needs_words_and_open_gate(b):
    js = """(() => { const t = todayStr(); const words = REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5');
      const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      words.forEach(mark); DAILY_CACHE = null; const out = { wordsOnly: preDone(), n: words.length };
      REG.kana.filter(x => x.seion).forEach(mark); DAILY_CACHE = null; out.both = preDone();
      location.hash = '#/today'; route(); out.card = Boolean(document.querySelector('[data-act="enter-main"]'));
      document.querySelector('[data-act="enter-main"]').click(); out.stage = state.stage; out.unit = state.currentUnit;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r['n'] > 0 and r['wordsOnly'] is False and r['both'] is True and r['card'] is True, r
    assert r['stage'] == 'main' and r['unit'] == 'm1', r

FRESH = TAG_PRE + "state.srs = {}; state.startChosen = false; state.stage = 'main'; state.kanaKnown = false; DAILY_CACHE = null; location.hash = '#/today'; true"

def test_new_account_banner_sets_the_stage(b):
    js = """(() => { route(); const out = { btns: ['start-zero', 'start-kana', 'start-basics'].map(a => Boolean(document.querySelector(`[data-act="${a}"]`))) };
      document.querySelector('[data-act="start-zero"]').click(); out.stage = state.stage; out.gone = !document.querySelector('[data-act="start-zero"]');
      state.startChosen = false; route(); document.querySelector('[data-act="start-basics"]').click(); out.stage2 = state.stage; out.n4 = state.settings.n4Words; out.known = state.kanaKnown;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", FRESH)]))
    assert r == {'btns': [True, True, True], 'stage': 'pre', 'gone': True, 'stage2': 'main', 'n4': 'open', 'known': True}, r

def test_course_card_and_kana_session(b):
    js = """(() => { state.stage = 'pre'; location.hash = '#/course'; route();
      const card = document.querySelector('.card.pre-card'); const out = { card: Boolean(card), text: card ? card.textContent : '' };
      document.querySelector('[data-act="kana-practice"]').click(); out.kinds = [...new Set(SESSION.entries.map(e => e.item && e.item.kind))];
      out.first = SESSION.entries[0].item.ch; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", FRESH)]))
    assert r['card'] and '142' in r['text'] and '漢字' in r['text'] and '單字' in r['text'], r   # the 27 PRE_N5 kanji are asserted by the data test
    assert r['kinds'] == ['a'] and r['first'] == 'あ', r

def test_i_know_kana_opens_words_without_marking_kana_seen(b):
    js = """(() => { state.stage = 'pre'; location.hash = '#/course'; route(); document.querySelector('[data-act="kana-known"]').click(); DAILY_CACHE = null;
      const p = dailyPlan(); openSettings('learn'); const row = Boolean(document.querySelector('[data-key="newKanaPerDay"]')); closeModal(true);
      return JSON.stringify({ open: kanaGateOpen(), v: p.newV.length, a: p.newA.length, seen: Object.keys(state.srs).filter(k => k.startsWith('a:')).length, row }); })()"""
    r = json.loads(ev(b, js, [("eval", FRESH)]))
    assert r['open'] and r['v'] > 0 and r['a'] > 0 and r['seen'] == 0 and r['row'], r

PRE_KANJI = list('一二三四五六七八九十百千万円日月火水木金土年時分人大小')

def test_pre_n5_words_and_kanji_are_tagged(b):
    js = """(() => { const V = REG.vocab.filter(v => v.builtin); const pre = V.filter(v => v.lv === 'PRE_N5');
      return JSON.stringify({ n: pre.length, lvs: [...new Set(V.map(v => v.lv))].sort(), pos: [...new Set(pre.map(v => v.p))].sort(),
        kanji: REG.kanji.filter(k => k.lv === 'PRE_N5').map(k => k.k), n5k: REG.kanji.filter(k => k.lv === 'N5').length,
        greet: pre.some(v => v.w === 'おはようございます'),
        n4Gate: typeof n5WordsLeft() === 'number' && n5WordsLeft() >= pre.filter(v => !state.srs[v.key]).length }); })()"""
    r = json.loads(ev(b, js))
    assert 400 <= r['n'] <= 450 and r['lvs'] == ['N4', 'N5', 'PRE_N5'], r   # 303 moved + 120 new
    assert 'conj' not in r['pos'] and r['greet'], r
    assert sorted(r['kanji']) == sorted(PRE_KANJI) and r['n5k'] == 104 - 27, r
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
    js = """(() => { const count = (lv) => { location.hash = '#/vocab/kanji?lv=' + lv; route(); return document.querySelectorAll('.kanji-tile').length; };
      const n = { pre: count('PRE_N5'), n5: count('N5'), n4: count('N4') }; n.sum = n.pre + n.n5 + n.n4; n.total = REG.kanji.length;
      n.tab = Boolean(document.querySelector('[data-route="#/vocab/kanji?lv=PRE_N5"]')); n.text = document.querySelector('.kanji-levels').textContent; return JSON.stringify(n); })()"""
    r = json.loads(ev(b, js))
    assert r['pre'] == 27 and r['sum'] == r['total'] and r['tab'] and '入門' in r['text'] and 'PRE_N5' not in r['text'], r

def test_vocab_decks_cover_every_level(b):
    js = """(() => { const builtin = REG.vocab.filter(v => v.builtin).length; const vs = vocabStats();
      location.hash = '#/vocab/list?lv=PRE_N5'; route(); const rows = document.querySelectorAll('.table tbody tr').length;
      return JSON.stringify({ decks: DECKS.map(d => d[0]), sum: deckPool('PRE_N5').length + deckPool('N5').length + deckPool('N4').length, builtin, rows,
        pre: vs.PRE_N5 && vs.PRE_N5.total, n5: vs.N5.total, n4: vs.N4.total }); })()"""
    r = json.loads(ev(b, js))
    assert 'PRE_N5' in r['decks'] and r['sum'] == r['builtin'] and r['rows'] >= 100, r
    assert r['pre'] >= 400 and r['pre'] + r['n5'] + r['n4'] == r['builtin'], r

def test_sound_format_needs_speech(b):
    js = """(() => { const it = REG.byKey.get('a:あ'); state.srs[it.key] = { b: 2, due: todayStr(), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(todayStr(), -3) };
      const orig = speechAvailable; window.speechAvailable = () => false; const seen = {}; for (let i = 0; i < 60; i++) seen[makeQuestion(it, {}).fmt] = 1; window.speechAvailable = orig; delete state.srs[it.key];
      return JSON.stringify(Object.keys(seen).sort()); })()"""
    r = json.loads(ev(b, js))
    assert 'a-sound' not in r and r, r

def test_enter_main_keeps_the_unit_of_a_learner_with_grammar_records(b):
    js = """(() => { const t = todayStr(); state.stage = 'pre'; state.currentUnit = 'm8'; const g = REG.grammar.find(x => x.u === 'm8'); state.srs[g.key] = { b: 2, due: t, n: 1, ok: 1, ng: 0, s: 3, d: 5, last: t };
      ACTIONS['enter-main'](); const kept = state.currentUnit; state.stage = 'pre'; state.srs = {}; ACTIONS['enter-main'](); return JSON.stringify({ kept, fresh: state.currentUnit }); })()"""
    r = json.loads(ev(b, js, [("eval", PRE_STATE)]))
    assert r == {'kept': 'm8', 'fresh': 'm1'}, r

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
    assert r['n'] == [11, 17, 17] and r['bad'] == [] and r['order0'] == '問候' and r['other'] == 0 and r['verbsPre'] == 0, r

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
    assert r['n5Only'] and r['lvs'] == ['N5', 'PRE_N5'], r

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
    out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'check-vocab.py'), path, '8790'], capture_output=True, text=True)
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
    assert r['p5a'] == 120 and r['n5f'] == 80 and r['pre'] >= 420 and r['n5'] >= 510, r
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
    assert r['sum'] == r['builtin'] and r['kana'] == 142 and r['kanji'] == [27, 77, 238], r
    assert r['tn'] == 17 and r['names'] == ['問候與溝通', '疑問與指示', '時間'] and r['tsum'] == r['totals'][1], r

def test_kanji_theme_mapping_is_grounded(b):
    js = """(() => { const bad = []; ['PRE_N5', 'N5', 'N4'].forEach(lv => themeStats(lv).forEach(t => t.kanji.forEach(k => {
        const ok = REG.vocab.some(v => v.builtin && v.lv === lv && vocabTheme(v) === t.c && jaPlain(v.w).includes(k)) && REG.byKey.has('k:' + k); if (!ok) bad.push(lv + ':' + t.c + ':' + k); })));
      const pre = themeStats('PRE_N5'); const food = pre.find(t => t.c === '飲食');
      return JSON.stringify({ bad: bad.slice(0, 5), foodKanji: food.kanji, maxLen: Math.max(...pre.map(t => t.kanji.length)), of: kanjiThemeOf(REG.byKey.get('k:日'), 'PRE_N5') }); })()"""
    r = json.loads(ev(b, js))
    assert r['bad'] == [] and r['maxLen'] <= 8 and r['of'] in ('時間曆日', '數字與量詞'), r

def test_level_theme_filter_is_level_scoped(b):
    js = """(() => { state.srs = {}; state.today.newV = 0; DAILY_CACHE = null;
      const q = buildVocabQueue('t:N5:飲食', 60); const k = buildKanjiQueue(50, 'PRE_N5'); startSession('kana', { row: 1 }); const row = SESSION.entries.map(e => e.item.ch);
      return JSON.stringify({ lvs: [...new Set(q.map(x => x.lv))], themes: [...new Set(q.map(vocabTheme))], n: q.length, kl: [...new Set(k.map(x => x.lv))], row }); })()"""
    r = json.loads(ev(b, js))
    assert r['lvs'] == ['N5'] and r['themes'] == ['飲食'] and r['n'] > 0 and r['kl'] == ['PRE_N5'], r
    assert r['row'] == ['か', 'き', 'く', 'け', 'こ', 'カ', 'キ', 'ク', 'ケ', 'コ'], r

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
