'use strict';
// the course's four stages and their 階段測驗 (out of 71_today.js, 2026-11-11)
// ---- 階段（四個）與階段項目 ----
/* 入門 + DATA.PHASES 的各個階段。文法與變化練習照單元歸屬；單字、漢字、聽力、閱讀照等級歸到該等級的最後一個階段
   (PRE_N5 → 入門, N5 → 第一階段, N4 → 第三階段, N3 → 第五階段)；入門另含全部假名。階段測驗與通過時的標記都以這個劃分為準。 */
const STAGES = [{ id: 'pre', title: '入門', sub: '假名、入門單字和第 0 週的句型', units: ['m0'], lv: 'PRE_N5' }].concat(
  DATA.PHASES.map((ph, i) => ({ id: 'p' + (i + 1), title: ph.title, sub: ph.span, units: DATA.UNITS.filter(u => u.ph === ph.id).map(u => u.id), lv: phaseEndLevel(i) })));
// the level a phase finishes (its units' level when the next phase moves on to another level; a middle phase has none)
function phaseEndLevel(i) { const lvOf = (ph) => { const us = ph ? DATA.UNITS.filter(u => u.ph === ph.id) : []; return us.length ? courseLevel(us[us.length - 1].lv) : null; };
  const L = lvOf(DATA.PHASES[i]); return L && L !== lvOf(DATA.PHASES[i + 1]) ? L : null; }
function stageById(id) { return STAGES.find(s => s.id === id); }
function stageIndex(id) { return Math.max(0, STAGES.findIndex(s => s.id === id)); }
function stagesUpTo(id) { return STAGES.slice(0, stageIndex(id) + 1); }
function stageItems(id) {
  const s = stageById(id); if (!s) return [];
  const inUnits = (x) => s.units.includes(x.u);
  const out = REG.grammar.filter(inUnits).concat(REG.drills.filter(inUnits));
  if (s.lv) {
    REG.vocab.forEach(v => { if (v.lv === s.lv) out.push(v); });
    [REG.kanji, REG.listen, REG.read].forEach(list => list.forEach(x => { if (x.lv === s.lv) out.push(x); }));
  }
  if (id === 'pre') out.push(...REG.kana);
  return out;
}
function stageOfUnit(uid) { const s = STAGES.find(x => x.units.includes(uid)); return s ? s.id : 'p1'; }
function currentStageId() { return inPreStage() ? 'pre' : stageOfUnit(state.currentUnit); }
function nextUnitAfterStage(id) { const n = STAGES[stageIndex(id) + 1]; return n ? n.units[0] : DATA.UNITS[DATA.UNITS.length - 1].id; }   // after the last stage: the last unit

// ---- 階段測驗 ----
/* 40 questions drawn from the stage's own items (unseen ones included — the test asks "do I know this stage"), options only, untimed,
   and answering writes nothing to the schedule. 80% passes; the result goes to state.stageTests. A pass marks the stage and
   those before it (markPassedStage), 入門 as well as every phase. */
const STAGE_TEST_SIZE = 40;
// 入門 has its own mix; a stage that ends a level tests its words, kanji, listening and reading with the grammar, one in the middle
// of a level its grammar and the conjugation drills (1.0.33: N3's p4 and p5 follow p2 and p3; a thin bank is topped up from the others)
const STAGE_TEST_QUOTA = { pre: [['a', 14], ['v', 18], ['g', 8]] };
const STAGE_QUOTA_END = [['g', 20], ['v', 10], ['k', 4], ['l', 3], ['r', 3]], STAGE_QUOTA_MID = [['g', 32], ['c', 8]];
function stageTestQuota(id) { const st = stageById(id); return STAGE_TEST_QUOTA[id] || (st && st.lv ? STAGE_QUOTA_END : STAGE_QUOTA_MID); }
function stageTestNeed(total) { return Math.ceil(total * 0.8); }
function buildStageTest(id) {
  const st = stageById(id); if (!st) return [];
  const items = stageItems(id);
  const pools = {};
  items.forEach(x => { if (x.kind === 'g' && x.t === 'order') return; (pools[x.kind] = pools[x.kind] || []).push(x); });   // 排序題 has no options
  const picked = []; const used = new Set();
  const take = (list, n) => { let k = 0; for (const x of shuffle(list.slice())) { if (k >= n) break; if (used.has(x.key)) continue; used.add(x.key); picked.push(x); k++; } return k; };
  // grammar spread evenly over the stage's units, the remainder to random units
  const takeGrammar = (n) => {
    const byUnit = st.units.map(u => (pools.g || []).filter(g => g.u === u)).filter(l => l.length);
    if (!byUnit.length) return 0;
    const each = Math.floor(n / byUnit.length); let got = 0;
    byUnit.forEach(l => { got += take(l, each); });
    shuffle(byUnit.slice()).forEach(l => { if (got < n) got += take(l, 1); });
    if (got < n) got += take(pools.g || [], n - got);
    return got;
  };
  const quota = stageTestQuota(id);
  let short = 0;
  quota.forEach(([kind, n]) => { const got = kind === 'g' ? takeGrammar(n) : take(pools[kind] || [], n); short += n - got; });
  if (short) quota.forEach(([kind]) => { if (short > 0) short -= kind === 'g' ? takeGrammar(short) : take(pools[kind] || [], short); });   // a thin bank is topped up from the others
  return shuffle(picked).slice(0, STAGE_TEST_SIZE);
}
function finishStageTest() {
  const T = SESSION && SESSION.test; if (!T || T.result) return;
  const total = SESSION.entries.length; const correct = SESSION.stats.correct;
  const passed = correct >= stageTestNeed(total);
  T.result = { date: todayStr(), correct, total, passed };
  recordStageTest(T);
  { const e = logEntry(); e.ex = (e.ex || 0) + SESSION.results.length; }   // a test day keeps the streak; tests are not questions done
  if (passed) T.marked = markPassedStage(T.stage, passSkipKeys(SESSION.results));   // marked at once
  saveState();
}
// the test's line in state.stageTests (T.result), newest first, ten kept
function recordStageTest(T) {
  if (!state.stageTests || typeof state.stageTests !== 'object') state.stageTests = {};
  state.stageTests[T.stage] = [Object.assign({}, T.result)].concat(state.stageTests[T.stage] || []).slice(0, 10);
}
// what four stars from a test leave alone: the items it missed and the ones in the notebook, so their relearning goes on;
// grammar or kana missed and never met is recorded as met once and missed (bulkMeetMissed)
function passSkipKeys(results) { return new Set(results.filter(x => !x.ok).map(x => x.key).concat(notebookKeys())); }
function renderStageSummary(view) {
  const s = SESSION; const T = s.test; const st = stageById(T.stage);
  const total = s.entries.length; const need = stageTestNeed(total); const r = T.result;
  const byKind = {}; s.results.forEach(x => { const k = x.q.kind === 'c' ? 'g' : x.q.kind; const b = byKind[k] || (byKind[k] = { ok: 0, n: 0 }); b.n++; if (x.ok) b.ok++; });
  const kinds = LOG_KINDS.filter(([k]) => byKind[k]).map(([k, name]) => `<span class="chip num">${name} ${byKind[k].ok}／${byKind[k].n}</span>`).join('');
  const wrong = s.results.filter(x => !x.ok);
  const wrongList = wrong.map(x => `<div class="list-item"><div class="grow"><div class="jp">${furi(tidyPrompt(x.q.mistakePrompt || ''))}</div><div class="small muted">正確：<span class="jp">${esc(jaPlain(x.q.options[x.q.answer].text))}</span>・你選：<span class="jp">${esc(jaPlain(x.q.options[x.chosen].text))}</span></div></div></div>`).join('');
  const title = !r ? '未完成，不計紀錄' : r.passed ? `${r.correct}／${r.total}・通過` : `${r.correct}／${r.total}・未通過（需 ${need} 題）`;
  const below = T.start && r && !r.passed && startTestBelow(T.stage);   // a start test failed: one level down
  const buttons = r && r.passed ? '<button type="button" class="btn btn-primary" data-act="close-summary">完成</button>'
    : `${below ? `<button type="button" class="btn btn-primary" data-act="start-test-at" data-stage="${below.id}">改考${below.id === 'pre' ? '入門' : esc(below.lv)}</button>` : ''}<button type="button" class="btn ${below ? '' : 'btn-primary'}" data-act="stage-again">再考一次</button><button type="button" class="btn" data-act="stage-practice">去練這個階段</button><button type="button" class="btn btn-ghost" data-act="close-summary">回課程頁</button>`;
  // passed: what was marked and where the course is now (the pass moved it on), with 復原 while the mark can still be undone
  const cu = unitById(state.currentUnit);
  const range = T.stage === 'pre' ? '入門' : `${esc(st ? st.title.split('：')[0] : '')}以前、`;   // 入門 has no stage before it
  const marked = !r || !r.passed ? ''
    : T.undone ? '<div class="banner mt-4">通過了。已復原，題目的星星照舊。</div>'
    : `<div class="banner mt-4"><div class="grow">通過了。已把${range}還不到四顆的 ${T.marked} 題設成四顆。目前單元：${esc(cu.weeks)}・${esc(cu.short)}</div>${LAST_BULK_MARK ? '<button type="button" class="btn btn-sm" data-act="bulk-mark-undo">復原</button>' : ''}</div>`;
  view.innerHTML = `
    <div class="pr-top"><button type="button" class="btn btn-ghost btn-icon" data-act="close-summary" aria-label="關閉">${icon('close')}</button><div class="grow"></div></div>
    <div class="card">
      <div class="small muted">${total} 題、不計時、作答不影響排程；答對 ${need} 題算通過。</div>
      <div class="page-title mt-2">${title}</div>
      <div class="page-sub">${esc(st ? st.title : '')}・階段測驗・作答 ${s.results.length} 題</div>
      <div class="row-wrap mt-3">${kinds}</div>
      ${marked}
      <div class="row-wrap mt-4">${buttons}</div>
    </div>
    ${wrong.length ? `<div class="card"><div class="card-head"><div class="card-title">這次答錯的題目</div><span class="chip">${wrong.length}</span></div><div class="list">${wrongList}</div></div>` : ''}`;
}
// 我學過一些 (2026-11-11, the user: each picks the level to be tested on): 入門, N5, N4 or N3 — the stage test that ends it
const START_TESTS = () => STAGES.filter(s => s.id === 'pre' || s.lv);
function startTestPickerHtml() {
  return `<p class="small muted">選你覺得自己有的程度，做那一級的測驗：${STAGE_TEST_SIZE} 題、不計時、答對八成通過。通過就把那一級和之前的內容設成四顆，從下一階段開始；沒通過可以改考低一級。</p>
    <div class="list mt-3">${START_TESTS().map(s => `<button type="button" class="btn start-lv" data-act="start-test-at" data-stage="${s.id}"><b>${s.id === 'pre' ? '入門' : esc(s.lv)}</b><span class="small muted">${esc(s.id === 'pre' ? s.sub : s.title)}</span></button>`).join('')}</div>`;
}
// the level below a start test's, for 改考低一級 (none below 入門)
function startTestBelow(id) { const l = START_TESTS(), i = l.findIndex(s => s.id === id); return i > 0 ? l[i - 1] : null; }
Object.assign(ACTIONS, {
  'stage-test': (el) => startSession('stage', { stage: el.dataset.stage }),
  'start-test-at': (el) => {
    if (!state.startChosen) chooseStart('zero', true); else closeModal(true);
    SESSION = null; startSession('stage', { stage: el.dataset.stage, start: true });
  },
  'stage-again': () => { const T = SESSION && SESSION.test; if (!T) return; SESSION = null; startSession('stage', { stage: T.stage, start: T.start }); },
  'stage-practice': () => {
    const id = SESSION && SESSION.test ? SESSION.test.stage : null; if (!id) return;
    SESSION = null; document.body.classList.remove('practicing');
    if (id === 'pre') { startSession('kana'); return; }
    const st = stageById(id); const u = st.units.find(x => !state.completedUnits.includes(x)) || st.units[0];
    startSession('unit', { unit: u, title: `${unitById(u).short}・單元練習` });
  }
});

// ---- 通過階段測驗的標記（批次標記） ----
/* Passing a stage test marks that stage and every stage before it in one go (markPassedStage): items below four
   stars become four stars, so they wait in the four-star queue instead of filling the 50 daily reviews for weeks;
   listening and reading keep their own rule (3 a day, 30／90／180 days) and are not marked. The test's misses and the
   items in the notebook are left to their relearning; grammar or kana missed and never met before is met once and
   missed, so the reviews teach it from the next day (bulkMeetMissed). Only upgrades: an item already at four stars or
   more is left alone. A marked item is due where FSRS puts four stars (about ten days); the four-star queue does not
   read that date, so it is not spread. One undo is kept in memory (LAST_BULK_MARK) until the page reloads. */
let LAST_BULK_MARK = null;
function isLR(x) { return x.kind === 'l' || x.kind === 'r'; }   // listening and reading: outside the tiers, not marked
// what a pass marks: the items of the stage and every stage before it that are below four stars (no record, or b < 4),
// not listening or reading, none in `skip`
function passMarkTargets(stageId, skip) {
  const out = []; const seen = new Set();
  stagesUpTo(stageId).forEach(s => stageItems(s.id).forEach(x => {
    if (seen.has(x.key)) return; seen.add(x.key);
    const r = state.srs[x.key];
    if (!isLR(x) && (!r || r.b < 4) && !skip.has(x.key)) out.push(x);
  }));
  return out;
}
// what a bulk mark (a stage pass) must remember to undo itself
function bulkSnapshot(extra) {
  return Object.assign({ srs: {}, mistakes: JSON.parse(JSON.stringify(state.mistakes)), completedUnits: state.completedUnits.slice(), lessonSeen: (state.lessonSeen || []).slice(),
    currentUnit: state.currentUnit, stage: state.stage, introSeen: state.introSeen, kanaKnown: state.kanaKnown }, extra);
}
// set the targets to four stars; the previous records go into snap.srs
function bulkApply(targets, snap) {
  const t = todayStr();
  targets.forEach(x => {
    const key = x.key;
    snap.srs[key] = state.srs[key] ? JSON.parse(JSON.stringify(state.srs[key])) : null;
    let r = state.srs[key];
    if (!r) {   // a word's record starts its format history (only a word's formats count toward 已熟練, see recordFormat)
      r = state.srs[key] = { b: 0, due: t, n: 0, ok: 0, ng: 0, st: 0, last: null, lapse: 0, intro: t };
      if (key.startsWith('v:')) r.f = {};
    }
    ensureFsrs(r);
    delete r.mark; delete r.pre; delete r.markDay;   // the pass is newer than a 我的標記 below four stars: 0★ no longer takes it back
    r.s = Math.max(r.s || 0, LEVEL_FROM_S[3]);
    r.b = levelFromS(r.s);
    if (!r.lrn) r.lrn = t;
    r.last = t;   // so the first real review measures elapsed time from today (null would freeze FSRS growth)
    r.due = addDays(t, fsrsDays(r.s, key));
  });
}
// keys a four-star mark left alone (passSkipKeys): one with no record that is not in the notebook was missed in the test
// and never met. Grammar and kana of that kind are met once and missed: the record srsAnswer writes for a first wrong
// answer (back tomorrow), without the relearning ladder, the notebook or an answer's counts. snap.srs keeps null for it,
// so 復原 takes it away.
function bulkMeetMissed(keys, snap) {
  const t = todayStr(); const noted = new Set(notebookKeys());
  keys.forEach(key => {
    // grammar and kana only: no new-item list offers them again (units done, no kana in the main course); other kinds stay new
    if (!/^[ga]:/.test(key) || state.srs[key] || noted.has(key)) return;
    snap.srs[key] = null;
    state.srs[key] = { b: 0, due: addDays(t, 1), n: 1, ok: 0, ng: 1, st: 0, last: t, lapse: 0, intro: t, s: FSRS_W[0], d: fsrsD0(1) };
  });
}
// a passed stage test: the stage and every one before it go to four stars, none in `skip` (grammar missed and never met
// is met once and missed); their units count as done with their lesson cards seen, and the course moves past the stage.
// Returns how many items were set to four stars.
function markPassedStage(stageId, skip) {
  const targets = passMarkTargets(stageId, skip);
  const snap = bulkSnapshot({ stageId, changed: targets.length });
  bulkApply(targets, snap);
  bulkMeetMissed(skip, snap);
  const units = stagesUpTo(stageId).flatMap(s => s.units);
  units.forEach(u => { if (!state.completedUnits.includes(u)) state.completedUnits.push(u); });
  const lessons = new Set(state.lessonSeen || []);
  REG.grammar.forEach(g => { if (units.includes(g.u)) { const k = lessonSecKey(g); if (k) lessons.add(k); } });
  state.lessonSeen = [...lessons];
  state.introSeen = true; state.kanaKnown = true; state.stage = 'main';
  const nu = nextUnitAfterStage(stageId);
  if (unitOrder(nu) > unitOrder(state.currentUnit)) state.currentUnit = nu;
  LAST_BULK_MARK = snap;
  DAILY_CACHE = null; saveState();
  return targets.length;
}
function bulkUndo() {
  const S = LAST_BULK_MARK; if (!S) return false;
  Object.entries(S.srs).forEach(([k, r]) => { if (r) state.srs[k] = r; else delete state.srs[k]; });
  state.mistakes = S.mistakes; state.completedUnits = S.completedUnits; state.lessonSeen = S.lessonSeen;
  state.currentUnit = S.currentUnit; state.stage = S.stage; state.introSeen = S.introSeen; state.kanaKnown = S.kanaKnown;
  LAST_BULK_MARK = null; DAILY_CACHE = null; saveState();
  return true;
}
Object.assign(ACTIONS, {
  // 復原 on the course page, or on the result page of the test that marked (which then says so)
  'bulk-mark-undo': () => { if (bulkUndo()) { toast('已復原'); if (SESSION && SESSION.test) SESSION.test.undone = true; } route(); }
});
