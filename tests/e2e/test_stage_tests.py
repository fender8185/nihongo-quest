"""2026-10-29 (1.0.11): 四個階段（STAGES）、課程頁單一「目前」、階段測驗、標記到這裡為止。"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8790
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# ---- Task 1: 階段模型 ----
def test_stages_partition_every_item(b):
    js = """(() => { const S = STAGES.map(s => stageItems(s.id)); const keys = S.map(l => l.map(x => x.key));
      const all = new Set(keys.flat()); const dup = keys.flat().length - all.size;
      const expect = REG.kana.length + REG.vocab.filter(v => v.builtin).length + REG.grammar.length + REG.kanji.length + REG.listen.length + REG.read.length + REG.drills.length;
      return JSON.stringify({ ids: STAGES.map(s => s.id), units: STAGES.map(s => s.units.length), dup, total: all.size, expect,
        p2v: S[2].filter(x => x.kind === 'v').length, n4In: S.map(l => l.filter(x => x.kind === 'v' && x.lv === 'N4').length),
        kana: S[0].filter(x => x.kind === 'a').length, next: STAGES.map(s => nextUnitAfterStage(s.id)), of: [stageOfUnit('m7'), stageOfUnit('m18')] }); })()"""
    r = json.loads(ev(b, js))
    assert r['ids'] == ['pre', 'p1', 'p2', 'p3'] and r['units'] == [0, 6, 6, 6], r
    assert r['dup'] == 0 and r['total'] == r['expect'], r
    assert r['p2v'] == 0 and r['n4In'][:3] == [0, 0, 0] and r['n4In'][3] > 0 and r['kana'] == 142, r
    assert r['next'] == ['m1', 'm7', 'm13', 'm18'] and r['of'] == ['p2', 'p3'], r

def test_current_stage_follows_stage_and_unit(b):
    js = """(() => { const keep = [state.stage, state.currentUnit]; const out = [];
      state.stage = 'pre'; out.push(currentStageId()); state.stage = 'main'; state.currentUnit = 'm1'; out.push(currentStageId()); state.currentUnit = 'm13'; out.push(currentStageId());
      [state.stage, state.currentUnit] = keep; return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == ['pre', 'p1', 'p3']

# ---- Task 2: 課程頁四張卡、單一「目前」、stageTests ----
COURSE = [("nav", URL + "#/course"), ("wait", "document.querySelectorAll('#view .card').length >= 4")]

def test_course_has_one_current_chip_and_week0_in_pre_card(b):
    js = """(() => { const cards = [...document.querySelectorAll('#view .card')].slice(0, 4);
      const chips = [...document.querySelectorAll('#view .chip-accent')].filter(c => c.textContent.trim() === '目前');
      return JSON.stringify({ n: cards.length, titles: cards.map(c => c.querySelector('.card-title').textContent.trim().slice(0, 2)),
        week0In: cards.map(c => c.textContent.includes('第 0 週')), chips: chips.length, chipIn: chips.map(c => Boolean(c.closest('.unit-row')) ? 'row' : 'head'),
        tests: document.querySelectorAll('[data-act="stage-test"]').length, marks: document.querySelectorAll('[data-act="stage-mark"]').length }); })()"""
    r = json.loads(ev(b, js, [("eval", "state.stage = 'main'; state.currentUnit = 'm2'; state.stageTests = {}; saveState(); true")] + COURSE))
    assert r['n'] == 4 and r['titles'] == ['入門', '第一', '第二', '第三'], r
    assert r['week0In'] == [True, False, False, False] and r['chips'] == 1 and r['chipIn'] == ['row'], r
    assert r['tests'] == 4 and r['marks'] == 0, r
    r = json.loads(ev(b, js, [("eval", "state.stage = 'pre'; saveState(); true")] + COURSE))
    assert r['chips'] == 1 and r['chipIn'] == ['head'], r

def test_course_shows_last_result_and_mark_button_after_a_pass(b):
    pre = [("eval", "state.stage = 'main'; state.stageTests = { p1: [{ date: todayStr(), correct: 34, total: 40, passed: true }], p2: [{ date: todayStr(), correct: 10, total: 40, passed: false }] }; saveState(); true")] + COURSE
    js = """(() => { const foot = [...document.querySelectorAll('.stage-foot')]; return JSON.stringify({ txt: foot.map(f => f.textContent.replace(/\\s+/g, ' ').trim()),
      marks: foot.map(f => f.querySelectorAll('[data-act="stage-mark"]').length), passed: [stagePassed('p1'), stagePassed('p2'), stagePassed('p3')] }); })()"""
    r = json.loads(ev(b, js, pre))
    assert '上次 34／40・通過' in r['txt'][1] and '上次 10／40・未通過' in r['txt'][2], r
    assert r['marks'] == [0, 1, 0, 0] and r['passed'] == [True, False, False], r

def test_course_page_survives_missing_stage_tests(b):
    js = "(() => { delete state.stageTests; renderCourse(document.getElementById('view')); return document.querySelectorAll('[data-act=\"stage-test\"]').length; })()"
    assert ev(b, js) == 4

# ---- Task 3: 階段測驗 ----
def test_stage_test_builds_on_an_empty_account(b):
    js = """(() => { const keep = JSON.stringify(state.srs); state.srs = {}; const out = {};
      out.p2c = Math.min(8, stageItems('p2').filter(x => x.kind === 'c').length);   // m7–m12 teach only a few conjugation families; the rest of the quota is grammar
      STAGES.forEach(s => { const items = buildStageTest(s.id); const qs = items.map(it => makeQuestion(it, { choiceOnly: true }));
        out[s.id] = { n: items.length, uniq: new Set(items.map(x => x.key)).size, kinds: items.reduce((m, x) => (m[x.kind] = (m[x.kind] || 0) + 1, m), {}), nullQ: qs.filter(q => !q).length }; });
      state.srs = JSON.parse(keep); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    for sid in ['pre', 'p1', 'p2', 'p3']:
        assert r[sid]['n'] == 40 and r[sid]['uniq'] == 40 and r[sid]['nullQ'] == 0, (sid, r[sid])
    assert r['pre']['kinds'] == {'a': 12, 'v': 24, 'k': 4} and r['p2']['kinds'] == {'g': 40 - r['p2c'], 'c': r['p2c']} and r['p2c'] >= 1, r
    assert r['p1']['kinds'] == {'g': 20, 'v': 10, 'k': 4, 'l': 3, 'r': 3}, r

def test_stage_test_questions_are_all_choice(b):
    js = """(() => { const keep = state.settings.conjInput; state.settings.conjInput = 'type'; const bad = []; let order = 0;
      for (let round = 0; round < 3; round++) STAGES.forEach(s => buildStageTest(s.id).forEach(it => { if (it.kind === 'g' && it.t === 'order') order++;
        const q = makeQuestion(it, { choiceOnly: true }); if (!q || q.custom) bad.push(it.key + ':' + (q ? q.custom : 'null')); }));
      const g = REG.grammar.filter(x => x.t === 'conj')[0]; state.srs[g.key] = { b: 3, due: todayStr(), s: 5, d: 5, n: 3, ok: 3, ng: 0, last: addDays(todayStr(), -1) };
      const qc = makeQuestion(g, { choiceOnly: true }); delete state.srs[g.key];
      const v = REG.vocab.find(x => x.builtin && x.r && x.r.length >= 3 && !/[一-龯]/.test(x.r) && x.exZh); const kv = state.srs[v.key]; state.srs[v.key] = { b: 3, due: todayStr(), s: 5, d: 5, n: 3, ok: 3, ng: 0, last: addDays(todayStr(), -1), f: {} }; const fm = {}; for (let i = 0; i < 60; i++) { const q = makeQuestion(v, { choiceOnly: true }); fm[q.fmt] = 1; }
      if (kv) state.srs[v.key] = kv; else delete state.srs[v.key]; state.settings.conjInput = keep; return JSON.stringify({ bad: bad.slice(0, 5), order, conj: qc && (qc.custom || 'choice'), fmts: Object.keys(fm) }); })()"""
    r = json.loads(ev(b, js))
    assert r['bad'] == [] and r['order'] == 0 and r['conj'] == 'choice', r
    assert 'v-spell' not in r['fmts'] and 'v-match' not in r['fmts'] and len(r['fmts']) >= 2, r

def test_stage_test_scores_without_touching_srs(b):
    js = """(() => { const before = JSON.stringify([state.srs, state.mistakes, state.statsFmt]); const log0 = JSON.stringify(logEntry()); state.stageTests = {};
      startSession('stage', { stage: 'p1' }); const title = SESSION.title; const previews = SESSION.entries.filter(e => e.preview).length; let wrongAt = -1; var slip, known;
      for (let i = 0; i < 40; i++) { const e = currentEntry(); const right = i < 33; if (!right && wrongAt < 0) wrongAt = i; answerCurrent(right ? e.q.answer : (e.q.answer + 1) % e.q.options.length);
        if (i === wrongAt) { slip = document.querySelector('[data-act="slip"]'); known = document.querySelector('[data-act="vocab-known"]'); } nextQuestion(); }
      const same = JSON.stringify([state.srs, state.mistakes, state.statsFmt]) === before; const e1 = logEntry(); const l0 = JSON.parse(log0);
      const h = state.stageTests.p1[0]; const view = document.getElementById('view').textContent;
      return JSON.stringify({ title, previews, same, x: (e1.kX || 0) - (l0.kX || 0), v: (e1.vocabCount || 0) - (l0.vocabCount || 0), g: (e1.grammarCount || 0) - (l0.grammarCount || 0),
        h: { correct: h.correct, total: h.total, passed: h.passed }, len: state.stageTests.p1.length, entries: SESSION.entries.length, slip: Boolean(slip), known: Boolean(known),
        passText: view.includes('33／40・通過'), markBtn: Boolean(document.querySelector('[data-act="stage-mark"]')), need: stageTestNeed(40) }); })()"""
    r = json.loads(ev(b, js))
    assert r['title'] == '第一階段：N5 文法・階段測驗' and r['previews'] == 0 and r['same'], r
    assert r['x'] == 1 and r['v'] == 0 and r['g'] == 0 and r['entries'] == 40, r
    assert r['h'] == {'correct': 33, 'total': 40, 'passed': True} and r['len'] == 1 and r['need'] == 32, r
    assert not r['slip'] and not r['known'] and r['passText'] and r['markBtn'], r

def test_stage_test_fail_offers_retry_and_practice(b):
    js = """(() => { state.stageTests = {}; startSession('stage', { stage: 'pre' });
      for (let i = 0; i < 40; i++) { const e = currentEntry(); answerCurrent(i < 10 ? e.q.answer : (e.q.answer + 1) % e.q.options.length); nextQuestion(); }
      const view = document.getElementById('view'); const txt = view.textContent;
      return JSON.stringify({ passed: state.stageTests.pre[0].passed, fail: txt.includes('10／40・未通過（需 32 題）'), again: Boolean(view.querySelector('[data-act="stage-again"]')), prac: Boolean(view.querySelector('[data-act="stage-practice"]')), mark: Boolean(view.querySelector('[data-act="stage-mark"]')) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'passed': False, 'fail': True, 'again': True, 'prac': True, 'mark': False}, r

def test_leaving_a_stage_test_leaves_no_trace(b):
    js = """(() => { state.stageTests = {}; const log0 = JSON.parse(JSON.stringify(logEntry())); startSession('stage', { stage: 'p3' });
      for (let i = 0; i < 5; i++) { const e = currentEntry(); answerCurrent(e.q.answer); nextQuestion(); }
      exitPractice(); const unfinished = document.getElementById('view').textContent.includes('未完成，不計紀錄'); exitPractice();
      return JSON.stringify({ tests: Object.keys(state.stageTests).length, x: (logEntry().kX || 0) - (log0.kX || 0), unfinished, session: SESSION === null }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tests': 0, 'x': 0, 'unfinished': True, 'session': True}, r

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
