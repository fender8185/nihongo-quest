"""2026-10-29 (1.0.11): 四個階段（STAGES）、課程頁單一「目前」、階段測驗、通過時的標記（1.0.20 起通過就設四顆、入門選三到五顆）。"""
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
    assert r['ids'] == ['pre', 'p1', 'p2', 'p3'] and r['units'] == [1, 6, 6, 6], r   # 1.0.16: 入門 holds 第 0 週 (m0)
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

# 1.0.20: a pass marks by itself, so no stage card offers 標記到這裡為止 any more, passed or not
def test_course_shows_last_result_and_no_mark_button(b):
    pre = [("eval", "state.stage = 'main'; state.stageTests = { p1: [{ date: todayStr(), correct: 34, total: 40, passed: true }], p2: [{ date: todayStr(), correct: 10, total: 40, passed: false }] }; saveState(); true")] + COURSE
    js = """(() => { const foot = [...document.querySelectorAll('.stage-foot')]; return JSON.stringify({ txt: foot.map(f => f.textContent.replace(/\\s+/g, ' ').trim()),
      btns: foot.map(f => [...f.querySelectorAll('button')].map(x => x.dataset.act)) }); })()"""
    r = json.loads(ev(b, js, pre))
    assert '上次 34／40・通過' in r['txt'][1] and '上次 10／40・未通過' in r['txt'][2], r
    assert r['btns'] == [['stage-test']] * 4 and not any('標記到這裡為止' in t for t in r['txt']), r

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
    assert r['pre']['kinds'] == {'a': 14, 'v': 18, 'g': 8} and r['p2']['kinds'] == {'g': 40 - r['p2c'], 'c': r['p2c']} and r['p2c'] >= 1, r
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
      const h = state.stageTests.p1[0]; const view = document.getElementById('view').textContent; const e1 = logEntry(); const l0 = JSON.parse(log0);
      const marked = view.includes('設成四顆') && Boolean(document.querySelector('[data-act="bulk-mark-undo"]'));
      bulkUndo(); const same = JSON.stringify([state.srs, state.mistakes, state.statsFmt]) === before;   // the pass's mark was the only change
      return JSON.stringify({ title, previews, same, x: (e1.kX || 0) - (l0.kX || 0), ex: (e1.ex || 0) - (l0.ex || 0), v: (e1.vocabCount || 0) - (l0.vocabCount || 0), g: (e1.grammarCount || 0) - (l0.grammarCount || 0),
        h: { correct: h.correct, total: h.total, passed: h.passed }, len: state.stageTests.p1.length, entries: SESSION.entries.length, slip: Boolean(slip), known: Boolean(known),
        passText: view.includes('33／40・通過'), marked, need: stageTestNeed(40), nb }); })()"""
    r = json.loads(ev(b, js))
    assert r['title'] == '第一階段：N5 文法・階段測驗' and r['previews'] == 0 and r['same'], r
    assert r['x'] == 0 and r['ex'] == 40 and r['v'] == 0 and r['g'] == 0 and r['entries'] == 40, r   # since 1.0.19 a test is logged as its question count (ex), not as a press
    assert r['h'] == {'correct': 33, 'total': 40, 'passed': True} and r['len'] == 1 and r['need'] == 32, r
    assert not r['slip'] and not r['known'] and not r['nb'] and r['passText'] and r['marked'], r

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

# ---- Task 4: 批次標記（1.0.20: a pass of p1–p3 marks by itself, markPassedStage） ----
SNAP = "JSON.stringify([state.srs, state.mistakes, state.completedUnits, state.lessonSeen, state.currentUnit, state.stage, state.introSeen, state.kanaKnown])"
RESET = "state.srs = {}; state.mistakes = []; state.completedUnits = []; state.lessonSeen = []; state.currentUnit = 'm1'; state.stage = 'pre'; state.introSeen = false; state.kanaKnown = false; state.stageTests = { p1: [{ date: todayStr(), correct: 33, total: 40, passed: true }] }; DAILY_CACHE = null; "
# playTest(miss): answers the open stage test to its end, wrong where miss(item) says so
PLAY_TEST = """const playTest = (miss) => { const n = SESSION.entries.length;
    for (let i = 0; i < n; i++) { const e = currentEntry(); answerCurrent(miss(e.item) ? (e.q.answer + 1) % e.q.options.length : e.q.answer); nextQuestion(); } };"""

# items below four stars become four (listening and reading three), only upgrades; the units, lessons, stage and week move on
def test_a_pass_marks_four_stars_with_its_side_effects(b):
    js = "(() => { " + RESET + """const t = todayStr(); const out = {};
      const items = stagesUpTo('p1').flatMap(s => stageItems(s.id)); const v5 = stageItems('p1').find(x => x.kind === 'v'); markKnown(v5.key, false);   // five stars already: left alone
      const n = passMarkTargets('p1', new Set()).filter(x => !isLR(x)).length; const changed = markPassedStage('p1', new Set());
      const core = items.filter(x => !isLR(x) && x.key !== v5.key).map(x => state.srs[x.key]), lr = items.filter(isLR).map(x => state.srs[x.key]); const budget = bulkDailyBudget();
      const days = core.map(r => (r ? daysBetween(t, r.due) : -1));
      Object.assign(out, { n, changed, core: core.length, four: core.every(r => r && r.b === 4), lr3: lr.length > 0 && lr.every(r => r && r.b === 3), known: [state.srs[v5.key].known, state.srs[v5.key].b],
        dueMin: Math.min(...days), dueMax: Math.max(...days), expMax: 5 + Math.max(10, Math.ceil(core.length / budget)) - 1, lastSet: core.concat(lr).every(r => r && r.last === t),
        units: state.completedUnits.slice(), cur: state.currentUnit, stage: state.stage, intro: state.introSeen, kana: state.kanaKnown, lessons: state.lessonSeen.filter(k => k.startsWith('m1:')).length > 0, n4Open: n4WordsOpen() });
      renderCourse(document.getElementById('view')); const banner = document.querySelector('#view .banner');
      out.banner = Boolean(document.querySelector('[data-act="bulk-mark-undo"]')) && banner.textContent.includes(`已把 ${changed} 個項目標成「四顆」`);
      out.again = passMarkTargets('p1', new Set()).length;   // nothing left below the levels
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] > 500 and r['changed'] == r['n'] == r['core'] and r['four'] and r['lr3'] and r['known'] == [1, 6], r
    assert r['dueMin'] == 5 and r['dueMax'] == r['expMax'] and r['lastSet'], r
    assert r['units'] == ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'] and r['cur'] == 'm7' and r['stage'] == 'main' and r['intro'] and r['kana'] and r['lessons'] and r['n4Open'] and r['banner'], r
    assert r['again'] == 0, r

def test_a_pass_never_downgrades_and_spreads_due(b):
    js = "(() => { " + RESET + """const t = todayStr(); const v = stageItems('pre').find(x => x.kind === 'v'); markKnown(v.key, false); state.currentUnit = 'm9';
      const custom = { id: 'u_test', w: 'テスト', r: 'てすと', m: '測試' }; state.vocab.push(custom); buildRegistry();
      const changed = markPassedStage('p1', new Set()); const byDay = {}; const fresh = Object.entries(state.srs).filter(([k, x]) => !x.known && !/^[lr]:/.test(k)).map(([, x]) => x); fresh.forEach(x => { const d = daysBetween(t, x.due); byDay[d] = (byDay[d] || 0) + 1; });
      const n = fresh.length; const maxDay = Math.max(...Object.values(byDay)); const days = Math.max(10, Math.ceil(n / bulkDailyBudget()));
      const out = { changed, n, known: state.srs[v.key].known, b: state.srs[v.key].b, cur: state.currentUnit, custom: Boolean(state.srs['v:u_test']), maxDay, cap: bulkDailyBudget(), days: Object.keys(byDay).map(Number).sort((a, b) => a - b), expLast: 5 + days - 1 };
      state.vocab = state.vocab.filter(x => x.id !== 'u_test'); buildRegistry(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['known'] == 1 and r['b'] == 6 and r['cur'] == 'm9' and not r['custom'] and r['changed'] == r['n'], r
    assert r['maxDay'] <= r['cap'] and r['days'][0] == 5 and r['days'][-1] == r['expLast'], r

def test_a_p3_pass_finishes_the_course_and_undo_restores(b):
    js = "(() => { " + RESET + "state.stageTests = { p3: [{ date: todayStr(), correct: 40, total: 40, passed: true }] }; const before = " + SNAP + """;
      markPassedStage('p3', new Set()); const after = { cur: state.currentUnit, pct: courseProgress().pct, units: state.completedUnits.length, items: Object.keys(state.srs).length };
      bulkUndo(); const restored = """ + SNAP + """ === before && LAST_BULK_MARK === null;
      return JSON.stringify({ after, restored }); })()"""
    r = json.loads(ev(b, js))
    assert r['after']['cur'] == 'm18' and r['after']['pct'] == 100 and r['after']['units'] == 19 and r['after']['items'] > 1500, r
    assert r['restored'], r

# a failed test marks nothing; a pass marks, and its count leaves out what is already at four stars (here 入門, marked first)
def test_only_a_pass_marks_and_it_counts_what_is_left(b):
    js = "(() => { " + RESET + PLAY_TEST + """ state.stageTests = {}; LAST_BULK_MARK = null; const before = """ + SNAP + """;
      startSession('stage', { stage: 'p1' }); let k = 0; playTest(() => k++ >= 20);   // 20 right: not passed
      const v1 = document.getElementById('view');
      const fail = { passed: state.stageTests.p1[0].passed, same: """ + SNAP + """ === before, undo: LAST_BULK_MARK !== null, says: v1.textContent.includes('設成四顆'), again: Boolean(v1.querySelector('[data-act="stage-again"]')) };
      SESSION = null; markPassedStage('pre', new Set()); LAST_BULK_MARK = null;   // 入門 at four stars already
      const left = stageItems('p1').filter(x => !isLR(x)).length;
      startSession('stage', { stage: 'p1' }); playTest(() => false); const v2 = document.getElementById('view');
      const pass = { passed: state.stageTests.p1[0].passed, marked: SESSION.test.marked, left, says: v2.textContent.includes(`已把第一階段以前、還不到四顆的 ${left} 題設成四顆。`) };
      return JSON.stringify({ fail, pass }); })()"""
    r = json.loads(ev(b, js))
    assert r['fail'] == {'passed': False, 'same': True, 'undo': False, 'says': False, 'again': True}, r
    assert r['pass']['passed'] and r['pass']['marked'] == r['pass']['left'] and r['pass']['says'], r

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

def test_a_pass_bounds_daily_due_and_spaces_listening_reading(b):
    js = "(() => { " + RESET + """const t = todayStr(); state.stageTests = { p3: [{ date: t, correct: 40, total: 40, passed: true }] };
      markPassedStage('p3', new Set()); const byDay = {}; const lr = []; const lrB = new Set();
      Object.entries(state.srs).forEach(([k, r]) => { const d = daysBetween(t, r.due); if (/^[lr]:/.test(k)) { lr.push(d); lrB.add(r.b); } else byDay[d] = (byDay[d] || 0) + 1; });
      return JSON.stringify({ maxDay: Math.max(...Object.values(byDay)), budget: bulkDailyBudget(), lrMin: Math.min(...lr), lrMax: Math.max(...lr), lrN: lr.length, lrB: [...lrB], firstDay: Math.min(...Object.keys(byDay).map(Number)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['budget'] == 50 and r['maxDay'] <= r['budget'] and r['firstDay'] == 5, r
    assert r['lrN'] > 300 and r['lrMin'] >= 90 and r['lrMax'] <= 270 and r['lrB'] == [3], r   # listening and reading: three stars, their own rule

# a marked word's first real review grows its stability and, at four stars, lifts it to five; practice drops the undo
def test_first_review_after_a_pass_grows_stability_and_clears_undo(b):
    js = "(() => { " + RESET + """const t = todayStr(); markPassedStage('p1', new Set());
      const v = stageItems('p1').find(x => x.kind === 'v'); const r0 = JSON.parse(JSON.stringify(state.srs[v.key])); state.srs[v.key].due = t; state.srs[v.key].last = addDays(t, -6);   // six days pass before the review
      const hadUndo = Boolean(LAST_BULK_MARK); srsAnswer(v.key, true); const r1 = state.srs[v.key];
      return JSON.stringify({ last0: r0.last, b0: r0.b, b1: r1.b, s0: r0.s, s1: r1.s, grew: r1.s > r0.s, dueAfter: daysBetween(t, r1.due), hadUndo, undoLeft: Boolean(LAST_BULK_MARK), undoRet: bulkUndo() }); })()"""
    r = json.loads(ev(b, js))
    assert r['last0'] is not None and r['b0'] == 4 and r['b1'] >= 5 and r['hadUndo'] and r['grew'] and r['dueAfter'] > 5, r
    assert not r['undoLeft'] and r['undoRet'] is False, r

# ---- 1.0.12: 入門 pass → four questions (1.0.20: 三顆／四顆／五顆, the suggestion pre-selected by the group's score) ----
PRE_PASS = RESET + """state.stageTests = {}; LAST_BULK_MARK = null; startSession('stage', { stage: 'pre' });
      for (let i = 0; i < 40; i++) { const e = currentEntry(); answerCurrent(e.q.answer); nextQuestion(); }"""

def test_pre_pass_asks_four_questions_then_enters_week_1(b):
    js = "(() => { " + PRE_PASS + """ const view = document.getElementById('view'); const out = { passed: state.stageTests.pre[0].passed, mark: Boolean(view.querySelector('[data-act="stage-mark"]')) || view.textContent.includes('設成四顆') };
      const step = () => { const t = view.textContent; const os = [...view.querySelectorAll('[data-act="pre-mark-pick"]')];
        return { q: (t.match(/第 (\\d)／4 題/) || [])[1], opts: os.map(o => o.dataset.level), tip: os.filter(o => o.textContent.includes('建議')).map(o => o.dataset.level) }; };
      out.head = view.textContent.includes('接著 4 題：平假名、片假名、入門單字、第 0 週句型');
      out.s1 = step(); view.querySelector('[data-act="pre-mark-pick"][data-level="5"]').click();
      out.s2 = step(); out.hiraTxt = view.textContent.includes('平假名：五顆'); view.querySelector('[data-act="pre-mark-pick"][data-level="3"]').click();
      out.s3 = step(); view.querySelector('[data-act="pre-mark-pick"][data-level="4"]').click();
      out.s4 = step(); out.stageBefore = state.stage; view.querySelector('[data-act="pre-mark-pick"][data-level="3"]').click(); out.pending = state.introPending === true;
      const G = { hira: REG.kana.filter(k => k.script === 'hira'), kata: REG.kana.filter(k => k.script === 'kata'), words: REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5'), m0: unitItems('m0') };
      out.session = SESSION === null; out.stage = state.stage; out.unit = state.currentUnit; out.kanaKnown = state.kanaKnown; out.hash = location.hash;
      out.b = Object.fromEntries(Object.entries(G).map(([g, l]) => [g, [...new Set(l.map(x => (state.srs[x.key] ? state.srs[x.key].b : 0)))]]));
      out.hiraKnown = G.hira.every(k => srsLevelLabel(state.srs[k.key], k.key) === '已熟練'); out.expect = Object.values(G).reduce((n, l) => n + l.length, 0);
      out.changed = LAST_BULK_MARK && LAST_BULK_MARK.changed; out.label = LAST_BULK_MARK && LAST_BULK_MARK.label;
      renderCourse(view); out.undoBtn = Boolean(view.querySelector('[data-act="bulk-mark-undo"]')); out.banner = view.textContent.includes('片假名：三顆');
      out.undone = bulkUndo(); out.stageAfterUndo = state.stage; out.srsAfterUndo = Object.keys(state.srs).length; out.pendingAfterUndo = state.introPending;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['head'], r   # the banner names all four groups
    assert r['passed'] and not r['mark'] and r['s1'] == {'q': '1', 'opts': ['3', '4', '5'], 'tip': ['5']} and r['s2']['q'] == '2' and r['hiraTxt'] and r['s3']['q'] == '3' and r['s4']['q'] == '4', r
    assert r['pending'] is False, r   # no 不記得 any more: the four questions never set introPending
    assert r['stageBefore'] == 'pre' and r['session'] and r['stage'] == 'main' and r['unit'] == 'm1' and r['kanaKnown'] and r['hash'] == '#/course', r
    assert r['b'] == {'hira': [6], 'kata': [3], 'words': [4], 'm0': [3]} and r['hiraKnown'], r   # 五顆 = 我會了, 三顆, 四顆
    assert r['changed'] == r['expect'] and r['label'] == '平假名：五顆、片假名：三顆、入門單字：四顆、第 0 週句型：三顆', r
    assert r['undoBtn'] and r['banner'] and r['undone'] and r['stageAfterUndo'] == 'pre' and r['srsAfterUndo'] == 0 and r['pendingAfterUndo'] is False, r

def test_pre_card_has_one_button(b):
    js = """(() => { location.hash = '#/course'; route(); const card = document.querySelector('.card.pre-card');
      return JSON.stringify({ btns: [...card.querySelectorAll('button')].map(b => b.dataset.act), foot: card.querySelector('.stage-foot').textContent.replace(/\\s+/g, ' ').trim() }); })()"""
    r = json.loads(ev(b, js, [("eval", "state.stage = 'pre'; state.stageTests = { pre: [{ date: todayStr(), correct: 36, total: 40, passed: true }] }; saveState(); true")]))
    assert r['btns'] == ['stage-test'] and '上次 36／40・通過' in r['foot'], r   # one button even after a pass: the test itself asks the four questions

def test_exam_page_lists_stage_test_records_and_starts_a_stage_test(b):
    js = """(() => { state.stageTests = { pre: [{ date: '2026-10-28', correct: 30, total: 40, passed: false }], p1: [{ date: '2026-10-29', correct: 36, total: 40, passed: true }] }; saveState();
      location.hash = '#/exam'; route(); const c = document.getElementById('stageTests');
      const out = { btns: c.querySelectorAll('[data-act=stage-test]').length, rows: c.querySelectorAll('.list-item').length, first: c.querySelector('.list-item').textContent.replace(/\\s+/g, ' '), passed: c.querySelectorAll('.chip-ok').length };
      c.querySelector('[data-act=stage-test][data-stage=pre]').click(); out.mode = SESSION && SESSION.mode; SESSION = null; document.body.classList.remove('practicing'); state.stageTests = {}; saveState();
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['btns'] == 4 and r['rows'] == 2 and '36 / 40' in r['first'] and r['passed'] == 1 and r['mode'] == 'stage', r

def test_pre_pass_marking_week0_three_stars_completes_it(b):
    js = "(() => { " + PRE_PASS + """ state.introPending = true; preMarkApply({ g: '3' }); const G = REG.grammar.filter(g => g.u === 'm0');
      return JSON.stringify({ all: G.every(g => state.srs[g.key] && state.srs[g.key].b === 3), done: state.completedUnits.includes('m0'), pending: state.introPending,
        lessons: (state.lessonSeen || []).filter(k => k.startsWith('m0:')).length, kana: REG.kana.filter(k => state.srs[k.key]).length }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'all': True, 'done': True, 'pending': True, 'lessons': 3, 'kana': 0}, r   # introPending (set only by 1.0.17) stays as it was; groups left out are not marked

# ---- 1.0.17: accounts past 入門 that never took the 入門 test take it once; since 1.0.20 the four questions follow, pass or fail ----
OLD = """state.stage = 'main'; state.currentUnit = 'm3'; state.srs = {}; state.stageTests = {}; state.startChosen = true; state.completedUnits = []; state.introPending = false; LAST_BULK_MARK = null;
  const g3 = REG.grammar.find(x => x.u === 'm3'); state.srs[g3.key] = { b: 2, due: addDays(todayStr(), 3), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: todayStr() }; DAILY_CACHE = null; saveState(); true"""

def test_old_accounts_get_a_must_do_pre_test_line_until_they_take_it(b):
    js = """(() => { const t = todayStr(); const look = () => { DAILY_CACHE = null; location.hash = '#/today'; route(); const v = document.getElementById('view'); const btn = v.querySelector('.banner [data-act="stage-test"][data-stage="pre"]');
        return { line: Boolean(btn), others: btn ? [...btn.closest('.banner').querySelectorAll('[data-act]')].map(x => x.dataset.act).filter(a => a !== 'stage-test') : [], practice: Boolean(v.querySelector('[data-act="start-daily"]')) }; };
      const out = { old: look() };
      state.stageTests = { pre: [{ date: t, correct: 20, total: 40, passed: false }] }; out.taken = look().line; state.stageTests = {};
      const mark = (it) => { state.srs[it.key] = { b: 2, due: addDays(t, 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(t, -1) }; };
      REG.kana.forEach(mark); REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5').forEach(mark); REG.grammar.filter(g => g.u === 'm0').forEach(mark); out.finished = look().line;
      state.srs = {}; state.stage = 'pre'; out.pre = look().line;
      state.stage = 'main'; state.startChosen = false; out.fresh = look().line;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", OLD)]))
    assert r == {'old': {'line': True, 'others': [], 'practice': True}, 'taken': False, 'finished': False, 'pre': False, 'fresh': False}, r

# a failing old account is not sent back to 入門 and nothing is marked by itself: it answers the four questions, each
# pre-selected by its group's score (≥ 90% 五顆, ≥ 80% 四顆, otherwise 三顆); Enter takes the suggestion
def test_old_account_pre_test_asks_the_four_questions_by_its_score(b):
    js = """(() => { const n0 = Object.keys(state.srs).length; startSession('stage', { stage: 'pre' }); const n = SESSION.entries.length; let vi = 0;
      for (let i = 0; i < n; i++) { const q = currentEntry().q; const ok = q.kind === 'a' ? q.item.script === 'hira' : q.kind === 'v' ? (vi++ % 6) !== 5 : false;   // 平假名 all, 片假名 none, words 5 of 6, 句型 none
        answerCurrent(ok ? q.answer : (q.answer + 1) % q.options.length); nextQuestion(); }
      const view = document.getElementById('view'); const txt = view.textContent;
      const lab = (it) => state.srs[it.key] ? srsLevelLabel(state.srs[it.key], it.key) : '新內容'; const bs = (l) => [...new Set(l.map(x => (state.srs[x.key] ? state.srs[x.key].b : 0)))];
      const hira = REG.kana.filter(k => k.script === 'hira'), kata = REG.kana.filter(k => k.script === 'kata'), words = REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5'), m0 = REG.grammar.filter(g => g.u === 'm0');
      const out = { passed: state.stageTests.pre[0].passed, marked: Object.keys(state.srs).length - n0, picker: Boolean(view.querySelector('[data-act="pre-mark-pick"]')),
        says: ['平假名', '片假名', '入門單字', '第 0 週句型'].every(w => txt.includes(w)) && txt.includes('週次不變'), tips: [] };
      for (let i = 0; i < 4; i++) { const tip = [...document.querySelectorAll('[data-act="pre-mark-pick"]')].find(o => o.textContent.includes('建議')); out.tips.push(tip ? tip.dataset.level : null);
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
      Object.assign(out, { stage: state.stage, unit: state.currentUnit, session: SESSION === null, hira: [...new Set(hira.map(lab))], kata: bs(kata), words: bs(words), m0: bs(m0), pending: state.introPending });
      document.body.classList.remove('practicing'); DAILY_CACHE = null; location.hash = '#/today'; route(); out.lineAfter = Boolean(document.querySelector('.banner [data-act="stage-test"][data-stage="pre"]'));
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", OLD)]))
    assert r['passed'] is False and r['marked'] == 0 and r['picker'] and r['says'], r   # failed, nothing marked by itself: the four questions all the same
    assert r['tips'] == ['5', '3', '4', '3'], r
    assert r['session'] and r['stage'] == 'main' and r['unit'] == 'm3', r   # a low score never sends an account back to 入門
    assert r['hira'] == ['已熟練'] and r['kata'] == [3] and r['words'] == [4] and r['m0'] == [3] and r['pending'] is False and not r['lineAfter'], r

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
