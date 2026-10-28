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
