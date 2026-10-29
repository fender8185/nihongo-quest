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
    assert r['chips'] == 1 and r['chipIn'] == ['row'], r

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
    assert r['pre']['kinds'] == {'a': 16, 'v': 24} and r['p2']['kinds'] == {'g': 40 - r['p2c'], 'c': r['p2c']} and r['p2c'] >= 1, r
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
      startSession('stage', { stage: 'p1' }); const title = SESSION.title; const previews = SESSION.entries.filter(e => e.preview).length; let wrongAt = -1; var slip, known, nb;
      for (let i = 0; i < 40; i++) { const e = currentEntry(); const right = i < 33; if (!right && wrongAt < 0) wrongAt = i; answerCurrent(right ? e.q.answer : (e.q.answer + 1) % e.q.options.length);
        if (i === wrongAt) { slip = document.querySelector('[data-act="slip"]'); known = document.querySelector('[data-act="vocab-known"]'); nb = document.getElementById('view').textContent.includes('已加入錯題本'); } nextQuestion(); }
      const same = JSON.stringify([state.srs, state.mistakes, state.statsFmt]) === before; const e1 = logEntry(); const l0 = JSON.parse(log0);
      const h = state.stageTests.p1[0]; const view = document.getElementById('view').textContent;
      return JSON.stringify({ title, previews, same, x: (e1.kX || 0) - (l0.kX || 0), v: (e1.vocabCount || 0) - (l0.vocabCount || 0), g: (e1.grammarCount || 0) - (l0.grammarCount || 0),
        h: { correct: h.correct, total: h.total, passed: h.passed }, len: state.stageTests.p1.length, entries: SESSION.entries.length, slip: Boolean(slip), known: Boolean(known),
        passText: view.includes('33／40・通過'), markBtn: Boolean(document.querySelector('[data-act="stage-mark"]')), need: stageTestNeed(40), nb }); })()"""
    r = json.loads(ev(b, js))
    assert r['title'] == '第一階段：N5 文法・階段測驗' and r['previews'] == 0 and r['same'], r
    assert r['x'] == 1 and r['v'] == 0 and r['g'] == 0 and r['entries'] == 40, r
    assert r['h'] == {'correct': 33, 'total': 40, 'passed': True} and r['len'] == 1 and r['need'] == 32, r
    assert not r['slip'] and not r['known'] and not r['nb'] and r['passText'] and r['markBtn'], r

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

# ---- Task 4: 批次標記 ----
SNAP = "JSON.stringify([state.srs, state.mistakes, state.completedUnits, state.lessonSeen, state.currentUnit, state.stage, state.introSeen, state.kanaKnown])"
RESET = "state.srs = {}; state.mistakes = []; state.completedUnits = []; state.lessonSeen = []; state.currentUnit = 'm1'; state.stage = 'pre'; state.introSeen = false; state.kanaKnown = false; state.stageTests = { p1: [{ date: todayStr(), correct: 33, total: 40, passed: true }] }; DAILY_CACHE = null; "

def test_bulk_mark_levels_and_side_effects(b):
    js = "(() => { " + RESET + """const t = todayStr(); const out = {};
      const n = bulkMarkTargets('p1', 'learned').length; const r1 = bulkMark('p1', 'learned');
      const items = stagesUpTo('p1').flatMap(s => stageItems(s.id)); const recs = items.map(x => state.srs[x.key]);
      const core = items.filter(x => x.kind !== 'l' && x.kind !== 'r').map(x => state.srs[x.key]); const budget = bulkDailyBudget();
      out.learned = { n, changed: r1.changed, allB3: recs.every(r => r && r.b === 3), dueMin: Math.min(...core.map(r => daysBetween(t, r.due))), dueMax: Math.max(...core.map(r => daysBetween(t, r.due))), expMax: 5 + Math.max(10, Math.ceil(core.length / budget)) - 1, lastSet: recs.every(r => r.last === t),
        units: state.completedUnits.slice(), cur: state.currentUnit, stage: state.stage, intro: state.introSeen, kana: state.kanaKnown, lessons: state.lessonSeen.filter(k => k.startsWith('m1:')).length > 0,
        n4Open: n4WordsOpen(), banner: (renderCourse(document.getElementById('view')), Boolean(document.querySelector('[data-act="bulk-mark-undo"]'))) };
      const r2 = bulkMark('p1', 'known'); out.known = { changed: r2.changed, allKnown: items.every(x => state.srs[x.key].known === 1 && srsLevelLabel(state.srs[x.key], x.key) === '已熟練'), dueMin: Math.min(...items.filter(x => x.kind !== 'l' && x.kind !== 'r').map(x => daysBetween(t, state.srs[x.key].due))) };
      const r3 = bulkMark('p1', 'seen'); out.seenAfterKnown = { changed: r3.changed, stillKnown: items.every(x => state.srs[x.key].known === 1) };
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    L = r['learned']
    assert L['n'] > 500 and L['changed'] == L['n'] and L['allB3'] and L['dueMin'] == 5 and L['dueMax'] == L['expMax'] and L['lastSet'], L
    assert L['units'] == ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] and L['cur'] == 'm7' and L['stage'] == 'main' and L['intro'] and L['kana'] and L['lessons'] and L['n4Open'] and L['banner'], L
    assert r['known']['changed'] > 0 and r['known']['allKnown'] and r['known']['dueMin'] == 35, r['known']
    assert r['seenAfterKnown'] == {'changed': 0, 'stillKnown': True}, r

def test_bulk_mark_never_downgrades_and_spreads_due(b):
    js = "(() => { " + RESET + """const t = todayStr(); const v = stageItems('pre').find(x => x.kind === 'v'); markKnown(v.key, false); state.currentUnit = 'm9';
      const custom = { id: 'u_test', w: 'テスト', r: 'てすと', m: '測試' }; state.vocab.push(custom); buildRegistry();
      const r = bulkMark('p1', 'seen'); const byDay = {}; const fresh = Object.entries(state.srs).filter(([k, x]) => !x.known && !/^[lr]:/.test(k)).map(([, x]) => x); fresh.forEach(x => { const d = daysBetween(t, x.due); byDay[d] = (byDay[d] || 0) + 1; });
      const n = fresh.length; const maxDay = Math.max(...Object.values(byDay)); const days = Math.max(14, Math.ceil(n / bulkDailyBudget()));
      const out = { changed: r.changed, known: state.srs[v.key].known, cur: state.currentUnit, custom: Boolean(state.srs['v:u_test']), maxDay, cap: bulkDailyBudget(), days: Object.keys(byDay).map(Number).sort((a, b) => a - b), expLast: days };
      state.vocab = state.vocab.filter(x => x.id !== 'u_test'); buildRegistry(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['known'] == 1 and r['cur'] == 'm9' and not r['custom'], r
    assert r['maxDay'] <= r['cap'] and r['days'][0] == 1 and r['days'][-1] == r['expLast'], r

def test_bulk_mark_to_p3_finishes_the_course_and_undo_restores(b):
    js = "(() => { " + RESET + "state.stageTests = { p3: [{ date: todayStr(), correct: 40, total: 40, passed: true }] }; const before = " + SNAP + """;
      bulkMark('p3', 'learned'); const after = { cur: state.currentUnit, pct: courseProgress().pct, units: state.completedUnits.length, items: Object.keys(state.srs).length };
      bulkUndo(); const restored = """ + SNAP + """ === before && LAST_BULK_MARK === null;
      return JSON.stringify({ after, restored }); })()"""
    r = json.loads(ev(b, js))
    assert r['after']['cur'] == 'm18' and r['after']['pct'] == 100 and r['after']['units'] == 18 and r['after']['items'] > 1500, r
    assert r['restored'], r

def test_bulk_mark_dialog_requires_a_pass_and_counts_live(b):
    js = "(() => { " + RESET + """bulkMarkDialog('p2'); const noModal = !document.querySelector('#modalBody');
      bulkMark('pre', 'learned'); LAST_BULK_MARK = null;   // 入門 already 熟悉, so 熟悉 and 熟練 count differently
      bulkMarkDialog('p1'); const body = document.getElementById('modalBody'); const radios = [...body.querySelectorAll('input[name="bulkLevel"]')];
      const checked = radios.find(x => x.checked).value; const c1 = body.querySelector('#bulkCount').textContent;
      radios.find(x => x.value === 'known').checked = true; CHANGE_ACTIONS['bulk-level'](radios.find(x => x.value === 'known'));
      const c2 = body.querySelector('#bulkCount').textContent; const txt = body.textContent; closeModal();
      return JSON.stringify({ noModal, n: radios.length, checked, c1, c2, title: txt.includes('入門、第一階段'), go: Boolean(body.querySelector('[data-act="bulk-mark-go"]')) }); })()"""
    r = json.loads(ev(b, js))
    assert r['noModal'] and r['n'] == 3 and r['checked'] == 'learned' and r['title'] and r['go'], r
    assert r['c1'] != r['c2'] and '個項目' in r['c1'], r

def test_vocab_known_all_spreads_due(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); state.srs = {}; location.hash = '#/vocab/list?lv=PRE_N5'; route();
      ACTIONS['vocab-known-all'](); const days = new Set(Object.values(state.srs).map(r => daysBetween(t, r.due))); const n = Object.keys(state.srs).length;
      state.srs = JSON.parse(keep); LAST_BULK_KNOWN = null; saveState(); return JSON.stringify({ n, min: Math.min(...days), max: Math.max(...days), spread: days.size }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] > 0 and r['min'] >= 35 and r['max'] <= 56 and r['spread'] >= 10, r

# ---- review fixes ----
def test_stage_test_kana_read_question_does_not_speak_the_answer(b):
    js = """(() => { const it = REG.byKey.get('a:あ'); const keep = state.srs[it.key]; delete state.srs[it.key];
      const q = makeQuestion(it, { choiceOnly: true }); const plain = makeQuestion(it, {});
      if (keep) state.srs[it.key] = keep; return JSON.stringify({ fmt: q.fmt, audio: q.audio || '', plainAudio: plain.audio || '' }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'fmt': 'a-read', 'audio': '', 'plainAudio': 'あ'}, r

def test_bulk_mark_bounds_daily_due_and_spaces_listening_reading(b):
    js = "(() => { " + RESET + """const t = todayStr(); state.stageTests = { p3: [{ date: t, correct: 40, total: 40, passed: true }] };
      bulkMark('p3', 'learned'); const byDay = {}; const lr = [];
      Object.entries(state.srs).forEach(([k, r]) => { const d = daysBetween(t, r.due); if (/^[lr]:/.test(k)) lr.push(d); else byDay[d] = (byDay[d] || 0) + 1; });
      return JSON.stringify({ maxDay: Math.max(...Object.values(byDay)), budget: bulkDailyBudget(), lrMin: Math.min(...lr), lrMax: Math.max(...lr), lrN: lr.length, firstDay: Math.min(...Object.keys(byDay).map(Number)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['budget'] == 50 and r['maxDay'] <= r['budget'] and r['firstDay'] == 5, r
    assert r['lrN'] > 300 and r['lrMin'] >= 90 and r['lrMax'] <= 270, r

def test_first_review_after_bulk_mark_grows_stability_and_clears_undo(b):
    js = "(() => { " + RESET + """const t = todayStr(); bulkMark('p1', 'learned');
      const v = stageItems('p1').find(x => x.kind === 'v'); const r0 = JSON.parse(JSON.stringify(state.srs[v.key])); state.srs[v.key].due = t; state.srs[v.key].last = addDays(t, -6);   // six days pass before the review
      const hadUndo = Boolean(LAST_BULK_MARK); srsAnswer(v.key, true); const r1 = state.srs[v.key];
      return JSON.stringify({ last0: r0.last, s0: r0.s, s1: r1.s, grew: r1.s > r0.s, dueAfter: daysBetween(t, r1.due), hadUndo, undoLeft: Boolean(LAST_BULK_MARK), undoRet: bulkUndo() }); })()"""
    r = json.loads(ev(b, js))
    assert r['last0'] is not None and r['hadUndo'] and r['grew'] and r['dueAfter'] > 5, r
    assert not r['undoLeft'] and r['undoRet'] is False, r

# ---- 1.0.12: 入門 pass → three choices ----
PRE_PASS = RESET + """state.stageTests = {}; LAST_BULK_MARK = null; startSession('stage', { stage: 'pre' });
      for (let i = 0; i < 40; i++) { const e = currentEntry(); answerCurrent(e.q.answer); nextQuestion(); }"""

def test_pre_pass_asks_three_choices_then_enters_week_1(b):
    js = "(() => { " + PRE_PASS + """ const view = document.getElementById('view'); const out = { passed: state.stageTests.pre[0].passed, mark: Boolean(view.querySelector('[data-act="stage-mark"]')) };
      const step = () => { const t = view.textContent; return { q: (t.match(/第 (\d)／3 題/) || [])[1], opts: [...view.querySelectorAll('[data-act="pre-mark-pick"]')].map(o => o.dataset.level) }; };
      out.s1 = step(); view.querySelector('[data-act="pre-mark-pick"][data-level="known"]').click();
      out.s2 = step(); out.hiraTxt = view.textContent.includes('平假名：掌握'); view.querySelector('[data-act="pre-mark-pick"][data-level="none"]').click();
      out.s3 = step(); out.stageBefore = state.stage; view.querySelector('[data-act="pre-mark-pick"][data-level="seen"]').click();
      const hira = REG.kana.filter(k => k.script === 'hira'), kata = REG.kana.filter(k => k.script === 'kata'), words = REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5');
      out.session = SESSION === null; out.stage = state.stage; out.unit = state.currentUnit; out.kanaKnown = state.kanaKnown; out.hash = location.hash;
      out.hiraKnown = hira.every(k => state.srs[k.key] && srsLevelLabel(state.srs[k.key], k.key) === '已熟練'); out.kataNone = kata.every(k => !state.srs[k.key]);
      out.wordsSeen = words.every(v => state.srs[v.key] && state.srs[v.key].b >= 1); out.changed = LAST_BULK_MARK && LAST_BULK_MARK.changed; out.label = LAST_BULK_MARK && LAST_BULK_MARK.label;
      renderCourse(view); out.undoBtn = Boolean(view.querySelector('[data-act="bulk-mark-undo"]')); out.banner = view.textContent.includes('片假名：不記得');
      out.undone = bulkUndo(); out.stageAfterUndo = state.stage; out.srsAfterUndo = Object.keys(state.srs).length;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['passed'] and not r['mark'] and r['s1'] == {'q': '1', 'opts': ['none', 'seen', 'learned', 'known']} and r['s2']['q'] == '2' and r['hiraTxt'] and r['s3']['q'] == '3', r
    assert r['stageBefore'] == 'pre' and r['session'] and r['stage'] == 'main' and r['unit'] == 'm1' and r['kanaKnown'] and r['hash'] == '#/course', r
    assert r['hiraKnown'] and r['kataNone'] and r['wordsSeen'] and r['changed'] == 71 + 59 and r['label'] == '平假名：掌握、片假名：不記得、入門單字：記得', r
    assert r['undoBtn'] and r['banner'] and r['undone'] and r['stageAfterUndo'] == 'pre' and r['srsAfterUndo'] == 0, r

def test_pre_card_has_one_button(b):
    js = """(() => { location.hash = '#/course'; route(); const card = document.querySelector('.card.pre-card');
      return JSON.stringify({ btns: [...card.querySelectorAll('button')].map(b => b.dataset.act), foot: card.querySelector('.stage-foot').textContent.replace(/\\s+/g, ' ').trim() }); })()"""
    r = json.loads(ev(b, js, [("eval", "state.stage = 'pre'; state.stageTests = { pre: [{ date: todayStr(), correct: 36, total: 40, passed: true }] }; saveState(); true")]))
    assert r['btns'] == ['stage-test'] and '上次 36／40・通過' in r['foot'], r   # no 標記到這裡為止 even after a pass: the test itself asks the three choices

def test_exam_page_lists_stage_test_records_and_starts_a_stage_test(b):
    js = """(() => { state.stageTests = { pre: [{ date: '2026-10-28', correct: 30, total: 40, passed: false }], p1: [{ date: '2026-10-29', correct: 36, total: 40, passed: true }] }; saveState();
      location.hash = '#/exam'; route(); const c = document.getElementById('stageTests');
      const out = { btns: c.querySelectorAll('[data-act=stage-test]').length, rows: c.querySelectorAll('.list-item').length, first: c.querySelector('.list-item').textContent.replace(/\\s+/g, ' '), passed: c.querySelectorAll('.chip-ok').length };
      c.querySelector('[data-act=stage-test][data-stage=pre]').click(); out.mode = SESSION && SESSION.mode; SESSION = null; document.body.classList.remove('practicing'); state.stageTests = {}; saveState();
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['btns'] == 4 and r['rows'] == 2 and '36 / 40' in r['first'] and r['passed'] == 1 and r['mode'] == 'stage', r

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
