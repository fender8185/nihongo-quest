"""2026-10-29: 聽力、閱讀答對後久久才再出；N5 聽力／閱讀題庫擴充。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8793
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_listening_and_reading_wait_a_month_then_a_season_then_half_a_year(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const out = {};
      ['l', 'r'].forEach(k => { const it = (k === 'l' ? REG.listen : REG.read)[0]; delete state.srs[it.key];
        const days = []; for (let i = 0; i < 4; i++) { const r = srsAnswer(it.key, true).rec; days.push(daysBetween(t, r.due)); r.last = addDays(t, -1); }
        const miss = srsAnswer(it.key, false).rec; days.push(daysBetween(t, miss.due));
        out[k] = days; });
      state.srs = JSON.parse(keep); saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'l': [30, 90, 180, 180, 7], 'r': [30, 90, 180, 180, 7]}, r   # 1.0.15: a miss waits a week, not a day

def test_every_n5_listening_and_reading_item_has_furigana_on_every_kanji(b):
    js = """(() => { const bad = []; const bare = (t) => furi(String(t || '')).replace(/<ruby>.*?<\\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g) || [];
      REG.listen.filter(x => x.lv === 'N5').forEach(x => { const b = bare([x.script, x.q, x.line].concat(x.op).filter(Boolean).join('\\n')); if (b.length) bad.push(x.id + ':' + b.join(' ')); });
      REG.read.filter(x => x.lv === 'N5').forEach(x => { const b = bare([x.passage, x.q].concat(x.op).join('\\n')); if (b.length) bad.push(x.id + ':' + b.join(' ')); });
      return JSON.stringify(bad); })()"""
    r = json.loads(ev(b, js))
    assert r == [], r

def test_the_n5_bank_has_the_added_listening_and_reading_items(b):
    js = """JSON.stringify({ l: REG.listen.filter(x => x.lv === 'N5').length, r: REG.read.filter(x => x.lv === 'N5').length,
      lt: ['dialog', 'resp', 'scene'].map(t => REG.listen.filter(x => x.lv === 'N5' && x.t === t).length),
      units: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(u => [REG.listen.filter(x => x.u === u).length, REG.read.filter(x => x.u === u).length]),
      ok: REG.listen.concat(REG.read).every(x => x.op.includes(x.a) && new Set(x.op).size === x.op.length && x.why),
      ids: new Set(REG.listen.concat(REG.read).map(x => x.id)).size === REG.listen.length + REG.read.length })"""
    r = json.loads(ev(b, js))
    assert r['l'] >= 270 and r['r'] >= 125, r          # 70 + ~200 listening, 25 + ~100 reading at N5
    assert all(l >= 40 and rd >= 18 for l, rd in r['units']), r   # spread over 第 1–12 週
    assert r['ok'] and r['ids'], r

# ---- 1.0.16: 第 0 週 (m0) — 20 kana-only items on five points ----
WEEK0_PTS = {'AはBです・ではありません': 1, '〜ですか・はい／いいえ': 1, 'こそあど': 2, 'も（也）': 2, 'は・へ・を 的唸法': 3}

def test_week0_items_are_kana_only_and_cover_five_points(b):
    js = """(() => { const G = REG.grammar.filter(g => g.u === 'm0'); const ja = (g) => (g.t === 'meaning' ? [g.jp] : [g.jp, g.a].concat(g.op)).filter(Boolean).join(' ');   // a meaning item's answer and options are Chinese
      const words = new Set(REG.vocab.map(v => v.w)); const gen = new Set(cloudAudioTexts().map(x => x.text)); const full = (g) => g.t === 'choice' ? g.jp.replace(/（[^）]*）/, g.a) : g.jp;
      return JSON.stringify({ n: G.length, pts: G.reduce((m, g) => (m[g.pt] = (m[g.pt] || 0) + 1, m), {}), secs: G.map(g => [g.pt, g.sec]),
        kanji: G.filter(g => /[一-龯々]/.test(ja(g))).map(g => g.id), kata: [...new Set(G.flatMap(g => ja(g).match(/[ァ-ヶー]{2,}/g) || []))].filter(w => !words.has(w)),
        dupFull: G.length - new Set(G.map(full)).size, built: G.filter(g => { const q = makeQuestion(g, {}); return q && q.options.length === 4; }).length,
        fmts: G.filter(g => g.t === 'choice').every(g => ['g-choice', 'g-meaning'].every(f => makeGrammarQuestion(g, { forceFmt: f }))),
        inGen: G.filter(g => !gen.has(ttsText(full(g)))).map(g => g.id) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 20 and r['pts'] == {k: 4 for k in WEEK0_PTS}, r
    assert all(sec == WEEK0_PTS[pt] for pt, sec in r['secs']), r
    assert r['kanji'] == [] and r['kata'] == [] and r['dupFull'] == 0, r
    assert r['built'] == 20 and r['fmts'] and r['inGen'] == [], r

# ---- 1.0.23: 選正確句 is gone. The written items left the bank; week 0's five, whose options differed in one slot, became
# fill-ins with the same full sentence; a fill-in item is asked as 填空 or 句意 only; an AI item of that type is not taken ----
WEEK0_FILLS = {'m0-4': ['それは ノート（　）。', 'ではありません', ['ではありません', 'ではです', 'ありません', 'でわありません'], 'それは ノートではありません。'],
               'm0-16': ['これ（　） テレビです。', 'も', ['も', 'もは', 'はも', 'を'], 'これも テレビです。'],
               'm0-17': ['こちら（　） どうぞ。', 'へ', ['へ', 'え', 'わ', 'お'], 'こちらへ どうぞ。'],
               'm0-18': ['これ（　） ください。', 'を', ['を', 'お', 'わ', 'え'], 'これを ください。'],
               'm0-19': ['ここ（　） ホテルです。', 'は', ['は', 'わ', 'を', 'お'], 'ここは ホテルです。']}

def test_sentence_choice_is_gone_and_week0_keeps_its_five_as_fill_ins(b):
    js = """(() => { const G = REG.grammar; const t = todayStr(); const seen = new Set();
      G.filter(g => (g.t || 'choice') === 'choice').slice(0, 300).forEach(g => { state.srs[g.key] = { b: 3, due: t, n: 3, ok: 3, ng: 0, s: 6, d: 5, last: addDays(t, -6), gf: { 'g-choice': [3, 0] } };
        for (let i = 0; i < 4; i++) { const q = makeQuestion(g, {}); if (q) seen.add(q.fmt); } delete state.srs[g.key]; });
      const w0 = Object.fromEntries(Object.keys(__W0__).map(id => { const g = G.find(x => x.id === id); return [id, { t: g.t, rest: [g.jp, g.a, g.op, makeGrammarQuestion(g, { forceFmt: 'g-choice' }).fullJp] }]; }));
      const ai = validAiGrammar({ t: 'correct', op: ['これは ペンです。', 'これを ペンです。', 'これに ペンです。', 'これで ペンです。'], a: 'これは ペンです。', zh: '這是筆。', why: '主題用「は」。', pt: '主題' }, unitById('m1'));
      return JSON.stringify({ types: [...new Set(G.map(g => g.t || 'choice'))], data: DATA.GRAMMAR.filter(g => g.t === 'correct').length, seen: [...seen].sort(), w0, ai }); })()""".replace('__W0__', json.dumps(WEEK0_FILLS, ensure_ascii=False))
    r = json.loads(ev(b, js))
    assert 'correct' not in r['types'] and r['data'] == 0, r
    assert r['seen'] == ['g-choice', 'g-meaning'], r
    assert r['w0'] == {k: {'t': 'choice', 'rest': v} for k, v in WEEK0_FILLS.items()}, r['w0']
    assert r['ai'] is None, r

# 1.0.23: the records of the removed items go (schedule and notebook), and so do AI items of that type with theirs;
# week 0's five, now fill-ins, keep theirs, as does everything else
def test_records_of_removed_sentence_choice_items_are_dropped(b):
    js = """(() => { const rec = () => ({ b: 2, due: todayStr(), n: 3, ok: 3, ng: 0, s: 3, d: 5, last: todayStr() });
      const mk = (id, key) => ({ id, key, cat: '文法', prompt: id, answer: 'x', why: '', count: 1 });
      const s = normalizeState({ srs: { 'g:m1-18': rec(), 'g:m0-17': rec(), 'g:gd1': rec(), 'g:ai_c': rec(), 'g:ai_k': rec() },
        mistakes: [mk('a', 'g:m1-18'), mk('b', 'g:m0-17'), mk('c', 'g:gd1'), mk('d', 'g:ai_c'), mk('e', 'g:ai_k')],
        customGrammar: [{ id: 'ai_c', u: 'm1', t: 'correct', lv: 'N5', d: 2, pt: 'x', op: ['あ', 'い', 'う', 'え'], a: 'あ', zh: '', why: '', src: 'ai' },
          { id: 'ai_k', u: 'm1', t: 'choice', lv: 'N5', d: 2, pt: 'x', jp: 'これ（　）ペンです。', op: ['は', 'を', 'に', 'で'], a: 'は', zh: '', why: '', src: 'ai' }] });
      return JSON.stringify({ srs: Object.keys(s.srs).sort(), mistakes: s.mistakes.map(m => m.id), custom: s.customGrammar.map(g => g.id) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'srs': ['g:ai_k', 'g:gd1', 'g:m0-17'], 'mistakes': ['b', 'c', 'e'], 'custom': ['ai_k']}, r


# ---- 1.0.31: the N5／N4 gap words of the curriculum outline (curriculum/gaps-n5n4.json, less the 16 sharing a spelling) ----
def test_bank_has_the_gap_words_from_the_curriculum_outline(b):
    js = """(() => { const G = DATA.VOCAB.filter(v => /^n[54]g-\\d{3}$/.test(v.id)); const T = (lv) => (DATA.THEMES[lv] || []).map(t => t.c);
      const count = new Map(); DATA.VOCAB.forEach(v => count.set(jaPlain(v.w), (count.get(jaPlain(v.w)) || 0) + 1));
      const reg = (v) => REG.byKey.get('v:' + v.id);
      const badMeaning = G.filter(v => (meaningOptions(reg(v)) || []).some(m => m !== v.m && zhOverlap(m, v.m))).map(v => v.w);
      const badRecall = G.filter(v => (recallOptions(reg(v)) || []).some(w => { const x = REG.vocab.find(y => y.builtin && y.w === w); return x && x.r === v.r; })).map(v => v.w);
      return JSON.stringify({ n5: G.filter(v => v.lv === 'N5').length, n4: G.filter(v => v.lv === 'N4').length,
        fields: G.filter(v => !(v.w && v.r && v.m && v.p && v.ex && v.exZh && v.ex2 && v.exZh2)).map(v => v.id),
        themes: G.filter(v => !T(v.lv).includes(v.c)).map(v => v.id), sameSpelling: G.filter(v => count.get(jaPlain(v.w)) > 1).map(v => v.w),
        badMeaning, badRecall }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n5': 38, 'n4': 60, 'fields': [], 'themes': [], 'sameSpelling': [], 'badMeaning': [], 'badRecall': []}, r

def test_settings_credit_the_jlpt_level_lists(b):
    js = "JSON.stringify({ html: settingsLook().includes('單字、漢字、文法點的 JLPT 等級參考 Jonathan Waller 的 JLPT Resources（tanos.co.uk，CC BY）。') })"
    r = json.loads(ev(b, js)); assert r['html'], r

# ---- 1.0.31 review: near-synonyms share a character, so neither is offered as the other's wrong answer ----
def test_near_synonym_greetings_never_offer_each_other(b):
    js = """(() => { const m = (w) => DATA.VOCAB.find(v => v.w === w).m;
      return JSON.stringify([zhOverlap(m('ええと'), m('さあ')), zhOverlap(m('ごめんください'), m('失礼します'))]); })()"""
    r = json.loads(ev(b, js)); assert r == [True, True], r

# ---- 1.0.31 review: the reading keys of DATA.FURI belong to no word, so mastering a word hides only its own readings ----
def test_mastering_a_word_hides_only_its_own_readings(b):
    js = """(() => { const t = todayStr(); const v = REG.vocab.find(x => x.id === 'n5g-038');   // 縦, the last N5 word added to the index
      state.srs[v.key] = { b: SRS_MASTERED, known: true, due: addDays(t, 60), n: 9, ok: 9, ng: 0, s: 60, d: 3, last: addDays(t, -1), intro: addDays(t, -90), f: { 'v-spell': [1, 0] } };
      const own = [...FURI_SRC].filter(([k, s]) => s === v.key).map(([k]) => k);
      const out = { own: knownCls('縦'), japan: knownCls('日本'), keys: own.length, hasJapan: own.includes('日本') };
      delete state.srs[v.key]; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js)); assert r['own'] == 'known' and r['japan'] == '' and not r['hasJapan'] and r['keys'] <= 2, r

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
