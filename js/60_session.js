'use strict';
/* ==========================================================================
   Practice sessions: queue building (daily / unit / vocab / mistakes) and the runner
   ========================================================================== */
let SESSION = null;

function byDue(a, b) {
  const ra = state.srs[a.key]; const rb = state.srs[b.key];
  return (ra.due < rb.due ? -1 : ra.due > rb.due ? 1 : 0) || (ra.b - rb.b);
}
// due today and not yet answered today: an item answered anywhere in the app (any practice mode) is done for the day
// only up to three stars go by due dates (four and five stars come from their queues); listening and reading always do
function isDueToday(x, t = todayStr()) {
  const tier = tierOf(x.key);
  if (tier !== null && tier !== 'srs') return false;
  const r = state.srs[x.key]; return Boolean(r && r.due <= t && r.last !== t);
}
// What the daily mix may contain: new items of the current level only (每一級封死, 1.0.32: curLevel below); reviews of
// everything already learned, whatever its level or unit (computeDailyPlan's scope).
// 等級清單 (1.0.33, spec §4.1): 入門 plus the levels the data has, lowest first. Everything that compares or lists levels reads
// levels() / courseLevels(), so N3 (then N2, N1) data is recognised everywhere; buildRegistry refreshes the cache.
const ALL_LEVELS = ['PRE_N5', 'N5', 'N4', 'N3', 'N2', 'N1'];
const DEFAULT_LEVEL = 'N4';   /* level-literal-ok: the exam target, AI items and unknown data fall back to it */
let LEVELS_NOW = null; let THEME_ORDER_NOW = null;
function levels() { return LEVELS_NOW || (LEVELS_NOW = ALL_LEVELS.filter(L => L === 'PRE_N5' || DATA.VOCAB.some(v => v.lv === L) || DATA.UNITS.some(u => u.lv === L))); }
function courseLevels() { return levels().filter(L => L !== 'PRE_N5'); }
function refreshLevels() { LEVELS_NOW = null; THEME_ORDER_NOW = null; UNIT_LV.clear(); }
function lvRank(x) { const i = ALL_LEVELS.indexOf(x.lv); return i < 0 ? 1 : i; }
function inPreStage() { return state.stage === 'pre'; }
// 入門: PRE_N5 words start once the 92 清音 have all been seen, or when the learner says they already know kana
function kanaGateOpen() { return state.kanaKnown === true || REG.kana.filter(x => x.seion).every(x => state.srs[x.key]); }
function preWordsLeft() { let n = 0; for (const v of REG.vocab) if (v.lv === 'PRE_N5' && !state.srs[v.key]) n++; return n; }
function introLeft() { let n = 0; for (const g of REG.grammar) if (g.u === 'm0' && !state.srs[g.key]) n++; return n; }   // 第 0 週 items not seen yet
// 第 0 週 is done once all its items have been seen (in 入門 or from its page): the course row reads 完成 and the day logs it.
// Its page has no 標記為已完成: completion is automatic or by the 入門 test.
function completeIntro() {
  if (state.completedUnits.includes('m0')) return;
  state.completedUnits.push('m0'); noteUnitDone('m0');
}
// 入門 is done when every PRE_N5 word has been seen (and the kana gate is open); nothing to finish while the level has no words
// 入門 ends by itself, silently (1.0.15; it was a 進入第 1 週 button): kana gate open, every 入門 word and 第 0 週 item seen,
// and the recent answers at least 80% right. An account with course grammar (sent back to 入門 by the old 回到入門 button)
// keeps its week; 第 0 週 records do not count as course grammar.
const PRE_PASS_ACC = 0.8;
function finishPreIfReady() {
  if (!inPreStage() || !preDone()) return false;
  const acc = recentAccuracy(); if (acc !== null && acc < PRE_PASS_ACC) return false;
  state.stage = 'main'; if (!REG.grammar.some(g => g.u !== 'm0' && state.srs[g.key])) state.currentUnit = 'm1';
  completeIntro();   // already done when its last item was answered; bulk marks get here too
  DAILY_CACHE = null; saveState();
  return true;
}
function preDone() { return REG.vocab.some(v => v.lv === 'PRE_N5') && preWordsLeft() === 0 && kanaGateOpen() && introLeft() === 0; }
// 每一級封死 (1.0.32, spec §4.2): new words, kanji and grammar come from one course level at a time, the lowest one with
// something still unseen; reviews follow the record (computeDailyPlan's scope). In the main course 入門 words count as N5.
function courseLevel(lv) { return lv === 'PRE_N5' ? courseLevels()[0] : lv; }
function unitLevel(uid) { return courseLevel(unitById(uid).lv); }
// a unit is done once it is marked complete (從這個單元開始 marks the earlier ones too) or every item in it has been seen
function unitDone(uid) { return state.completedUnits.includes(uid) || !REG.grammar.some(g => g.u === uid && !state.srs[g.key]); }
// what a level still has unseen: built-in words, kanji, and the grammar items of its units that are not done (第 0 週 aside)
function levelLeft(L) {
  const unseen = (x) => !state.srs[x.key];
  const units = DATA.UNITS.filter(u => courseLevel(u.lv) === L && !unitDone(u.id)).map(u => u.id);
  return { v: REG.vocab.filter(v => courseLevel(v.lv) === L && unseen(v)).length, k: REG.kanji.filter(k => courseLevel(k.lv) === L && unseen(k)).length,
    g: REG.grammar.filter(g => units.includes(g.u) && unseen(g)).length, units };
}
function curLevel() { const cl = courseLevels(); return cl.find(L => { const x = levelLeft(L); return x.v || x.k || x.units.length; }) || cl[cl.length - 1]; }
// what sits beside an item (its wrong options, theme playback's kanji cards) comes from levels up to the learner's, or up to the item's
// own when that is higher: an N5 learner meets no N3 kanji there, an N3 word studied ahead keeps N3 options (1.0.34)
function shownTop(lv, cur) { const cl = courseLevels(); return cl[Math.max(cl.indexOf(cur || curLevel()), cl.indexOf(courseLevel(lv)))]; }
function levelUpTo(lv, top) { const cl = courseLevels(); return cl.indexOf(courseLevel(lv)) <= cl.indexOf(top); }
// new grammar waits while the current level's units are all done but its words or kanji are not: what is left, and the
// number of the next level's first unit (the today and course pages say so)
function grammarPause() {
  if (inPreStage()) return null;
  const L = curLevel(); const x = levelLeft(L);
  if (x.units.length || (!x.v && !x.k)) return null;
  const cl = courseLevels(); const above = (u) => cl.indexOf(unitLevel(u.id)) > cl.indexOf(L);
  const own = DATA.UNITS.find(u => u.id === state.currentUnit && above(u));   // already in the next level's units: they resume there
  const next = own || DATA.UNITS.find(above);
  return next ? { L, v: x.v, k: x.k, unit: next.id } : null;
}
function grammarPauseText(gp) {
  const parts = [gp.v ? `單字（還剩 ${gp.v} 個）` : '', gp.k ? `漢字（還剩 ${gp.k} 個）` : ''].filter(Boolean).join('和');
  const u = unitById(gp.unit); return `先把 ${gp.L} 的${parts}學完，再開始${u.weeks}・${u.short}。`;
}
function levelLeftText(L) { const x = levelLeft(L); return [x.v ? `單字 ${x.v}` : '', x.k ? `漢字 ${x.k}` : '', x.g ? `文法 ${x.g} 題` : ''].filter(Boolean).join('、'); }
function pastFirstLevel() { return curLevel() !== courseLevels()[0]; }   // the first course level (入門+N5) is done
function n5WordsLeft() {   // 入門 and N5 (the first course level) words not yet seen
  let n = 0;
  for (const v of REG.vocab) if (courseLevel(v.lv) === courseLevels()[0] && !state.srs[v.key]) n++;
  return n;
}
function grammarInReach(g, curIdx = unitOrder(state.currentUnit)) { return unitOrder(g.u) <= curIdx; }
// new words: 入門 only PRE_N5; main course only the current level
function vocabEligibleForDaily(v, cur) {   // cur: curLevel(), asked once by the caller (it scans every bank)
  return inPreStage() ? v.lv === 'PRE_N5' : courseLevel(v.lv) === cur;
}
// New words are introduced theme by theme, two themes at a time (interleaved, so a day's new words come in two
// related groups rather than one long list of look-alikes). The pair is the first two themes, in themeOrder(),
// that still have unintroduced words of the lowest open level (N5 first; N4 only once allowed).
function themeRank(c) { const i = themeOrder().indexOf(c); return i < 0 ? themeOrder().length : i; }
// The lanes follow state.themeLane.order (themeOrder() to begin with). A theme holds a lane for at most three days'
// worth of new words (THEME_LANE_DAYS × 8); then it moves to the back of the order and the next theme
// with unintroduced words takes the lane, so a big theme (生活 has 148 words) cannot occupy a lane for a month.
const THEME_LANE_DAYS = 3;
function laneOrder() {
  const lane = state.themeLane && Array.isArray(state.themeLane.order) ? state.themeLane : (state.themeLane = { order: [], count: {} });
  if (!lane.count || typeof lane.count !== 'object') lane.count = {};
  themeOrder().forEach(c => { if (!lane.order.includes(c)) lane.order.push(c); });
  return lane.order;
}
function laneCap() { return THEME_LANE_DAYS * 8; }
// the level whose themes hold the lanes: PRE_N5 in 入門; otherwise N5 while it has unseen words, then N4
function laneLevel(fresh) { if (inPreStage()) return 'PRE_N5'; const have = new Set(fresh.map(v => v.lv)); return courseLevels().find(L => have.has(L)) || courseLevels()[0]; }   // PRE_N5 leftovers ride their own lane
// anyLevel: a page the learner chose (a level tab, a theme) offers its own words; otherwise only the current level's
function freshWords(pool, anyLevel) { const cur = anyLevel || inPreStage() ? null : curLevel(); return pool.filter(v => !state.srs[v.key] && (!cur || courseLevel(v.lv) === cur)); }
function activeThemes(pool, anyLevel) {
  const fresh = freshWords(pool, anyLevel);
  const lv = laneLevel(fresh);
  const open = new Set(fresh.filter(v => v.lv === lv).map(vocabTheme));
  return laneOrder().filter(c => open.has(c)).slice(0, 2);
}
// a new built-in word was introduced: count it against its theme's lane and rotate the lane when the cap is reached
function noteThemeIntro(key) {
  const v = REG.byKey && REG.byKey.get(key); if (!v || v.kind !== 'v') return;
  const c = vocabTheme(v); const order = laneOrder(); const lane = state.themeLane;
  lane.count[c] = (lane.count[c] || 0) + 1;
  if (lane.count[c] < laneCap()) return;
  lane.count[c] = 0;
  const i = order.indexOf(c); if (i >= 0) order.splice(i, 1);
  order.push(c);
  DAILY_CACHE = null;
}
function newVocabCandidates(pool, anyLevel) {
  const th = activeThemes(pool, anyLevel);
  const fresh = freshWords(pool, anyLevel);
  const lv = laneLevel(fresh);
  const byId = (a, b) => a.id.localeCompare(b.id);
  const byTheme = (a, b) => themeRank(vocabTheme(a)) - themeRank(vocabTheme(b)) || byId(a, b);
  // in the main course the PRE_N5 words not yet seen form a lane of their own beside the two theme lanes (never a block of easy words first)
  const preLane = lv === 'PRE_N5' ? [] : fresh.filter(v => v.lv === 'PRE_N5').sort(byTheme);
  const inLane = (v) => (v.lv === lv && th.includes(vocabTheme(v))) || preLane.includes(v);
  const lanes = (preLane.length ? [preLane] : []).concat(th.map(c => fresh.filter(v => v.lv === lv && vocabTheme(v) === c).sort(byId)));
  const rest = fresh.filter(v => !inLane(v))
    .sort((a, b) => lvRank(a) - lvRank(b) || byTheme(a, b));
  const built = [];
  for (let i = 0; lanes.some(l => i < l.length); i++) lanes.forEach(l => { if (i < l.length) built.push(l[i]); });
  built.push(...rest);
  return built;
}
// one item from each group in turn, so consecutive items differ in `keyOf` (grammar point, question type …)
function roundRobinBy(items, keyOf) {
  const groups = {};
  items.forEach(it => { const k = keyOf(it); (groups[k] = groups[k] || []).push(it); });
  const keys = Object.keys(groups);
  const out = [];
  let added = true;
  while (added) {
    added = false;
    keys.forEach(k => { if (groups[k].length) { out.push(groups[k].shift()); added = true; } });
  }
  return out;
}
// New grammar of a unit in lesson order: section by section (items with no section last); inside a section the
// points take turns (each point one item before any gets a second), and within a point the easier items come first.
// No randomness, so the day's new items are the same however often the plan is rebuilt.
function unitNewOrder(uid) {
  const inUnit = REG.grammar.filter(g => g.u === uid && !state.srs[g.key]);
  const secOf = (g) => Number.isInteger(g.sec) && g.sec >= 0 ? g.sec : 999;
  const out = [];
  [...new Set(inUnit.map(secOf))].sort((a, b) => a - b).forEach(sec => {
    const items = inUnit.filter(g => secOf(g) === sec).sort((a, b) => (a.d || 2) - (b.d || 2) || a.id.localeCompare(b.id));
    out.push(...roundRobinBy(items, g => g.pt || ''));
  });
  return out;
}
function newGrammarCandidates(unitIdOnly) {
  const cur = unitIdOnly || state.currentUnit;
  const sorted = unitNewOrder(cur);
  if (unitIdOnly) return sorted;
  // fill gaps from earlier, unfinished units
  const curIdx = unitOrder(cur);
  const earlier = REG.grammar.filter(g => g.u !== 'm0' && unitOrder(g.u) < curIdx && !state.completedUnits.includes(g.u) && !state.srs[g.key])   // 第 0 週 only brings new items in 入門 (and from its own page)
    .sort((a, b) => unitOrder(a.u) - unitOrder(b.u) || (a.d || 2) - (b.d || 2));
  // 每一級封死: only units of the current level, so a learner whose unit is already past it gets none until it is done
  const L = curLevel(); const out = sorted.concat(earlier).filter(g => unitLevel(g.u) === L);
  // everything up to here has been introduced: continue into the next unit of the same level that still has new items, past
  // units already finished (the unit moved back, or the next one practised early); the unit itself moves when its first
  // new item is answered, see autoAdvanceUnit
  if (!out.length) {
    const next = DATA.UNITS.find(u => unitOrder(u.id) > curIdx && unitLevel(u.id) === L && REG.grammar.some(g => g.u === u.id && !state.srs[g.key]));
    if (next) return unitNewOrder(next.id);
  }
  return out;
}
// The course moves on by itself: when the current unit's grammar has all been introduced and the learner answers a new
// item of the very next unit, that unit becomes the current one (the old one counts as completed). Reviews of the old
// unit keep coming back on their own schedule. 完成單元 on the course page still works for jumping ahead.
function autoAdvanceUnit(key) {
  const g = REG.byKey && REG.byKey.get(key); if (!g || g.kind !== 'g') return;
  const i = unitOrder(state.currentUnit); const j = unitOrder(g.u);
  if (j <= i) return;
  if (REG.grammar.some(x => x.u === state.currentUnit && !state.srs[x.key])) return;
  const between = DATA.UNITS.slice(i + 1, j).map(u => u.id); if (between.some(u => !unitDone(u))) return;   // only over finished units
  [state.currentUnit].concat(between).forEach(u => { if (!state.completedUnits.includes(u)) { state.completedUnits.push(u); noteUnitDone(u); } });
  state.currentUnit = g.u;
  DAILY_CACHE = null;
}

// Listening, reading and kanji share the session with words and grammar. Listening and reading follow the
// unit; new kanji come from the current level, like the words.
function newKanjiCandidates(anyLevel = false) {   // 入門: PRE_N5 kanji; main course: the current level's (anyLevel: all)
  const cur = anyLevel || inPreStage() ? null : curLevel();
  return REG.kanji.filter(k => !state.srs[k.key] && (inPreStage() ? k.lv === 'PRE_N5' : !cur || courseLevel(k.lv) === cur)).sort((a, b) => lvRank(a) - lvRank(b) || a.order - b.order);
}
// Listening is not tied to a unit's grammar: the pool is the whole level (N5 learners: N5; N4 learners: everything),
// nearest units first (the current one, then earlier ones from the nearest, then later ones). A unit alone has ~12
// items, which came back every few days.
function listenReachable(curIdx = unitOrder(state.currentUnit)) {
  const top = ALL_LEVELS.indexOf(unitLevel(state.currentUnit));
  const key = (x) => { const d = unitOrder(x.u) - curIdx; return (d > 0 ? 1000 + d : -d) * 1000 + (hashStr(x.id) % 997); };
  return REG.listen.filter(x => ALL_LEVELS.indexOf(courseLevel(x.lv)) <= top).sort((a, b) => key(a) - key(b));
}
function extrasPlan(curIdx) {
  const t = todayStr();
  const reach = (x) => unitOrder(x.u) <= curIdx;
  const isDue = (x) => isDueToday(x, t);
  const byUnit = (a, b) => unitOrder(a.u) - unitOrder(b.u) || (hashStr(a.id) % 997) - (hashStr(b.id) % 997);
  const listenOn = speechAvailable();
  const lPool = listenOn ? listenReachable(curIdx) : [];
  // listening: at most LISTEN_PER_DAY a day counting what was already answered today (due first; the rest of the due
  // ones wait until tomorrow); reading: one a day
  const doneToday = (pool) => pool.filter(x => { const r = state.srs[x.key]; return r && r.last === t; }).length;
  const capL = Math.max(0, LISTEN_PER_DAY - doneToday(lPool));
  const dueL = lPool.filter(isDue).sort(byDue).slice(0, capL);
  const newL = inPreStage() ? [] : lPool.filter(x => !state.srs[x.key]).slice(0, Math.max(0, Math.min(LISTEN_PER_DAY - (state.today.newL || 0), capL - dueL.length)));   // 入門: no new listening
  const rPool = REG.read.filter(reach);
  const dueR = doneToday(rPool) ? [] : rPool.filter(isDue).sort(byDue).slice(0, 1);
  const newR = !inPreStage() && !dueR.length && !doneToday(rPool) && (state.today.newR || 0) < 1 ? rPool.filter(x => !state.srs[x.key]).sort(byUnit).slice(0, 1) : [];
  return { dueL, newL, dueR, newR };
}

// How many new items today: by how the last RECENT_MAX answers went (fewer than 30: NEW_DEFAULT), minus one for every ten
// entries still in the notebook — what the learner can digest comes before the exam date.
function newCountToday() {
  const acc = recentAccuracy(RECENT_MAX, 30);
  const base = acc === null ? NEW_DEFAULT : NEW_STEPS.find(([min]) => acc >= min)[1];
  const mistakes = activeMistakes().length;
  return { n: clamp(base - Math.floor(mistakes / 10), NEW_MIN, NEW_MAX), base, acc, mistakes };
}
// Shares n new items between the banks by how much of each is still unseen (largest remainder, so they add up to n),
// taking each bank's own candidates in order and leaving out `skip`. A bank short of candidates (N4 kanji before the N5
// ones are done; words and grammar before the 入門 kana gate opens) passes its slots on, the heaviest bank first.
// Main course: built-in words, course grammar, kanji. 入門: kana, PRE_N5 words, week-0 grammar, PRE_N5 kanji.
function splitNew(n, skip = new Set()) {
  const unseen = (x) => !state.srs[x.key];
  const cur = curLevel(); const words = () => newVocabCandidates(REG.vocab.filter(v => vocabEligibleForDaily(v, cur)), false);
  let banks;
  if (inPreStage()) {
    const gate = kanaGateOpen();
    banks = {
      a: [REG.kana.filter(unseen).length, REG.kana.filter(unseen).sort((x, y) => x.order - y.order)],
      v: [REG.vocab.filter(v => v.lv === 'PRE_N5' && unseen(v)).length, gate ? words() : []],
      g: [introLeft(), gate ? unitNewOrder('m0') : []],
      k: [REG.kanji.filter(k => k.lv === 'PRE_N5' && unseen(k)).length, gate ? newKanjiCandidates(false) : []]
    };
  } else {
    const left = levelLeft(cur);   // 每一級封死: shares follow what the current level has left
    banks = {
      v: [left.v, words()],
      g: [left.g, newGrammarCandidates()],
      k: [left.k, newKanjiCandidates()]
    };
  }
  const out = { a: [], v: [], g: [], k: [] };
  const kinds = Object.keys(banks);
  const total = kinds.reduce((sum, k) => sum + banks[k][0], 0);
  if (n <= 0 || !total) return out;
  const cand = {}; kinds.forEach(k => { cand[k] = banks[k][1].filter(x => !skip.has(x.key)); });
  const raw = {}; const take = {};
  kinds.forEach(k => { raw[k] = n * banks[k][0] / total; take[k] = Math.floor(raw[k]); });
  let left = n - kinds.reduce((sum, k) => sum + take[k], 0);
  [...kinds].sort((x, y) => (raw[y] - take[y]) - (raw[x] - take[x])).forEach(k => { if (left > 0) { take[k]++; left--; } });
  let spare = 0;
  kinds.forEach(k => { const short = Math.max(0, take[k] - cand[k].length); take[k] -= short; spare += short; });
  [...kinds].sort((x, y) => banks[y][0] - banks[x][0]).forEach(k => { const add = Math.min(spare, cand[k].length - take[k]); take[k] += add; spare -= add; });
  kinds.forEach(k => { out[k] = cand[k].slice(0, take[k]); });
  return out;
}
function computeDailyPlan(size = SESSION_SIZE) {
  const t = todayStr();
  const curIdx = unitOrder(state.currentUnit);
  const pre = inPreStage();   // 入門: new items come from splitNew's 入門 banks; no new listening, reading or drills. Reviews of every kind stay.
  // what reviews reach (spec §4.6, 1.0.32: new items follow the level, reviews the record): every built-in word, grammar
  // item, kanji and drill already learned, whatever its level or unit (learned ahead, or the unit moved back); every kana.
  // New drills still come from the reached units only (cPool).
  const cPool = (REG.drills || []).filter(d => unitOrder(d.u) <= curIdx);
  const has = (x) => Boolean(state.srs[x.key]);
  const scope = REG.vocab.filter(has)
    .concat(REG.grammar.filter(has), REG.kanji.filter(has), REG.kana, (REG.drills || []).filter(has));
  // up to three stars: due by FSRS, the most overdue first, at most SRS_DAILY_CAP a day (the rest come the next days); the
  // missed items on the 1/3/7 ladder due today all come on top of the cap (inside it they crowd out the other reviews)
  const dueAll = scope.filter(x => isDueToday(x, t)).sort(byDue);
  const due = dueAll.filter(x => onLadder(x.key)).concat(dueAll.filter(x => !onLadder(x.key)).slice(0, SRS_DAILY_CAP));
  const ofKind = (kind) => due.filter(x => x.kind === kind);
  // four and five stars: queues giving a fixed share a day, the longest-waiting first. Four and five stars touched today (answered, marked by a stage pass or the 入門 questions, 我會了) wait until tomorrow, as isDueToday
  // does for the due ones, so a list made again the same day (a stage switch) does not draw what was just marked
  const share = (len, rate) => (len ? clamp(Math.round(len * rate), QUEUE_MIN, QUEUE_MAX) : 0);
  const byLast = (a, b) => String(state.srs[a.key].last || '').localeCompare(String(state.srs[b.key].last || ''));
  const queue = (tier) => { const q = scope.filter(x => tierOf(x.key) === tier && !answeredToday(x.key) && state.srs[x.key].last !== t).sort(byLast); return q.slice(0, share(q.length, QUEUE_RATE[tier])); };
  const q4 = queue('q4'); const q5 = queue('q5');
  // new items: today's count by how the recent answers went and the notebook, shared by what each bank has left;
  // what was already introduced today (before this list was made) counts against it
  const nc = newCountToday();
  const sofar = (state.today.newV || 0) + (state.today.newG || 0) + (state.today.newK || 0) + (state.today.newA || 0);
  const fresh = splitNew(Math.max(0, nc.n - sofar));
  // 變化練習: one family not started yet a day, from the reached units, outside the new-item count
  const newC = pre || (state.today.newC || 0) >= 1 ? [] : cPool.filter(d => !state.srs[d.key]).sort((a, b) => unitOrder(a.u) - unitOrder(b.u)).slice(0, 1);
  const note = nc.n < nc.base || nc.base < NEW_DEFAULT
    ? `${[nc.base < NEW_DEFAULT && '最近錯得比較多', nc.n < nc.base && '錯題本比較滿'].filter(Boolean).join('、')}，今天新內容少一點（${nc.n} 題）。` : '';
  const plan = Object.assign({ dueV: ofKind('v'), dueG: ofKind('g'), dueK: ofKind('k'), dueA: ofKind('a'), dueC: ofKind('c'), q4, q5,
    newV: fresh.v, newG: fresh.g, newK: fresh.k, newA: fresh.a, newC }, extrasPlan(curIdx));
  plan.remaining = PLAN_LISTS.reduce((sum, n) => sum + plan[n].length, 0);
  plan.relearnN = plan.dueV.concat(plan.dueG).filter(x => onLadder(x.key)).length;   // reviews that are missed items on the ladder (shown as 其中錯題)
  const gp = grammarPause();
  return Object.assign(plan, { note: [note, gp ? grammarPauseText(gp) : ''].filter(Boolean).join(' '), size, n: nc.n, split: { a: fresh.a.length, v: fresh.v.length, g: fresh.g.length, k: fresh.k.length } });
}

// 今天的清單: worked out the first time it is needed each day — again only when the start gets chosen or the stage changes
// (入門 ↔ 正課) — and kept as keys in state.today.plan. Every later call rebuilds it from those keys minus what was answered
// today, so the day's total does not move for a stage pass's bulk mark or 前往下一單元: they change tomorrow's list, not today's
// (and do not eat today's listening and reading). Items answered before a rebuild stay in it as `kept`. What is marked 2★ or
// 5★ today (我的標記, 我會了) leaves it (markedToday): the day's total gets smaller, and 0★ brings the item back.
const PLAN_LISTS = ['dueV', 'dueG', 'dueC', 'dueK', 'dueL', 'dueR', 'dueA', 'q4', 'q5', 'newV', 'newG', 'newC', 'newK', 'newL', 'newR', 'newA'];
function planListKeys(plan) { return [...new Set(PLAN_LISTS.concat('kept').flatMap(n => plan.lists[n] || []))]; }
function makeTodayPlan(size) {
  const old = state.today.plan;
  const p = computeDailyPlan(size);
  const lists = {};
  PLAN_LISTS.forEach(n => { lists[n] = (p[n] || []).map(x => x.key); });
  const fresh = new Set(PLAN_LISTS.flatMap(n => lists[n]));
  lists.kept = old && old.lists ? planListKeys(old).filter(k => answeredToday(k) && !fresh.has(k)) : [];
  state.today.plan = { lists, note: p.note || '', n: p.n, split: p.split, stage: state.stage, start: Boolean(state.startChosen), listenOn: speechAvailable() };
}
function storeTodayPlan(size) { makeTodayPlan(size); saveState(); }
// a browser voice lists its voices only after the first render: listening joins a list made before that, the rest stays
function addTodayListening(size) {
  const p = computeDailyPlan(size);
  const pl = state.today.plan;
  pl.lists.dueL = p.dueL.map(x => x.key); pl.lists.newL = p.newL.map(x => x.key); pl.listenOn = true;
  saveState();
}
function dailyPlan(size = SESSION_SIZE) {
  const pl = state.today.plan;   // a list made before the start was chosen is redone once it is (it may have been empty)
  if (!pl || !pl.lists || pl.stage !== state.stage || pl.start !== Boolean(state.startChosen)) storeTodayPlan(size);
  else if (pl.listenOn === false && speechAvailable()) addTodayListening(size);
  const p = state.today.plan;
  const out = { note: p.note, n: p.n, split: p.split, size };
  let remaining = 0;
  PLAN_LISTS.forEach(n => { out[n] = (p.lists[n] || []).map(k => REG.byKey.get(k)).filter(x => x && !answeredToday(x.key) && !markedToday(x.key)); remaining += out[n].length; });
  out.relearnN = out.dueV.concat(out.dueG).filter(x => onLadder(x.key)).length;
  out.remaining = remaining;
  return out;
}
// what is left of today's new items of one kind for the other ways in (字卡, unit and word practice, the kanji page):
// the day's share for that kind less what was introduced today
function todayNewLeft(kind) { return Math.max(0, ((dailyPlan().split || {})[kind] || 0) - (state.today['new' + kind.toUpperCase()] || 0)); }
// every key on today's list, answered or not (an item hidden or deleted since is left out, and so is a notebook card a
// 1.0.20 list held: since 1.0.21 the notebook's own cards are practised on its page; so is one marked today before it was answered)
function todayPlanKeys() {
  dailyPlan();
  return planListKeys(state.today.plan).filter(k => REG.byKey.has(k) && (answeredToday(k) || !markedToday(k)));
}

function interleave(vList, gList) {
  const out = [];
  let i = 0; let j = 0;
  const ratio = vList.length / Math.max(1, vList.length + gList.length);
  while (i < vList.length || j < gList.length) {
    const wantV = j >= gList.length || (i < vList.length && (i / Math.max(1, i + j)) <= ratio);
    out.push(wantV ? vList[i++] : gList[j++]);
  }
  return out;
}

// One session of today's work: the day list is every due review (most overdue first; grammar answered right the fewest
// times first) with the day's new items spread through it; a session takes the first `size`. Nothing else joins —
// an item is here because it is due today or because it is new today.
function buildDailyQueue(size = SESSION_SIZE) {
  const plan = dailyPlan(size);
  const byPractice = (a, b) => ((state.srs[a.key].ok || 0) - (state.srs[b.key].ok || 0)) || byDue(a, b);
  const ladderFirst = (list) => list.filter(x => onLadder(x.key)).concat(list.filter(x => !onLadder(x.key)));   // missed items are the weakest: first
  const isG = (x) => x.kind === 'g' || x.kind === 'c';   // 變化練習 sits on the grammar side
  const queued = plan.q4.concat(plan.q5);   // four and five stars join the reviews
  const reviews = interleave(ladderFirst(plan.dueV.concat(plan.dueK, plan.dueA || []).sort(byDue)).concat(queued.filter(x => !isG(x))), ladderFirst(plan.dueG.slice().sort(byPractice)).concat(plan.dueC || [], queued.filter(isG)));
  const fresh = interleave((plan.newA || []).concat(plan.newV, plan.newK), plan.newG.concat(plan.newC || []));
  const day = interleave(reviews, fresh);   // proportional, so each session of the day gets its share of new items
  const L = plan.dueL.concat(plan.newL); const R = plan.dueR.concat(plan.newR).slice(0, 1);
  const total = day.length + L.length + R.length;
  let Ls = L.slice(0, Math.min(L.length, Math.round(size * 0.2)));
  let take = day.slice(0, Math.max(0, size - Ls.length - R.length));
  const rest = total - take.length - Ls.length - R.length;
  if (rest > 0 && (rest <= 5 || rest < size / 4)) { Ls = L; take = day; }   // a small tail joins this set: no one-question second set
  const isNew = (x) => !state.srs[x.key];
  // within the session: reviews shuffled, new items after them (a new word gets its preview card first)
  const vList = ladderFirst(shuffle(take.filter(x => !isG(x) && !isNew(x)))).concat(take.filter(x => !isG(x) && isNew(x)));
  const gList = ladderFirst(shuffle(take.filter(x => isG(x) && !isNew(x)))).concat(take.filter(x => isG(x) && isNew(x)));
  const items = interleave(vList, gList);
  // listening spread through the session, the reading passage last
  Ls.forEach((x, i) => items.splice(Math.min(items.length, Math.round((i + 1) * items.length / (Ls.length + 1)) + i), 0, x));
  items.push(...R);
  return { items, plan, total, newCount: items.filter(isNew).length, reviewCount: items.filter(x => !isNew(x)).length };
}

// what an extra session holds once the day's plan is done (shown on the Today page and at the start of practice)
// 加練: a round of new items only, as many as the day's new count (plan.n), shared between the banks like the day's own
// (splitNew) but leaving out today's list and what was answered today. No reviews: those come on their own dates. The next
// round is the next batch; the button goes when nothing new is left.
function extraQueue() {
  const p = dailyPlan();
  const s = splitNew(p.n || NEW_DEFAULT, new Set(todayPlanKeys().concat(state.today.ans || [])));
  const items = interleave(s.a.concat(s.v, s.k), s.g);
  return { items, plan: p, aheadN: 0, newN: items.length, newCount: items.length, reviewCount: 0 };
}
// The Today page and 「開始練習」 share one built queue, so the button says exactly how many questions the session
// holds (the plan numbers above it describe the whole day's workload, which can be more than one session).
let DAILY_CACHE = null;
function dailyQueue(size = SESSION_SIZE) {
  const key = `${todayStr()}|${state.updatedAt}|${stateRev}|${size}|${state.currentUnit}|${speechAvailable() ? 1 : 0}`;
  if (DAILY_CACHE && DAILY_CACHE.key === key) return DAILY_CACHE.r;
  const r = buildDailyQueue(size);
  r.items = r.items.filter(it => makeQuestion(it, {}));   // an item that cannot become a question would be dropped silently later
  const isNew = (x) => !state.srs[x.key];
  r.newCount = r.items.filter(isNew).length; r.reviewCount = r.items.length - r.newCount;
  DAILY_CACHE = { key, r };
  return r;
}

// A practice the learner starts on purpose (單元／單字／漢字): what is due today in that scope and the new items still
// within today's quota. When that is under five questions the set becomes a labelled drill (`drill`): items of the scope
// not answered today, the shakiest first (shortest correct streak, lowest level).
function scopeQueue(pool, fresh, size) {
  const t = todayStr();
  const due = pool.filter(x => isDueToday(x, t)).sort(byDue);
  const list = due.slice(0, size);
  list.push(...fresh.slice(0, Math.max(0, size - list.length)));
  const out = shuffle(list.slice(0, due.length)).concat(list.slice(due.length));
  if (out.length < 5) {
    const used = new Set(out.map(x => x.key));
    const rest = pool.filter(x => { const r = state.srs[x.key]; return r && r.last !== t && !used.has(x.key); })
      .sort((a, b) => (state.srs[a.key].st || 0) - (state.srs[b.key].st || 0) || state.srs[a.key].b - state.srs[b.key].b || Math.random() - 0.5);
    const add = rest.slice(0, size - out.length);
    if (add.length) { out.push(...add); out.drill = true; }
  }
  return out;
}
const PAUSED_UNIT_NEW = 5;   // new items a unit's own practice still offers while 每一級封死 holds its grammar back
function buildUnitQueue(unitId, size = 15) {
  const left = todayNewLeft('g') || (grammarPause() || unitLevel(unitId) !== curLevel() ? PAUSED_UNIT_NEW : 0);
  return scopeQueue(unitItems(unitId), newGrammarCandidates(unitId).slice(0, left), size);
}
function buildVocabQueue(filter = 'all', size = 20) {
  // choosing a level list or a theme on purpose opens its words right away; 全部 follows the daily rule (the current level)
  const theme = filter.startsWith('c:') ? filter.slice(2) : null;
  const lt = filter.startsWith('t:') ? filter.slice(2).split(':') : null;   // t:<lv>:<theme> — one level's theme (the level pages)
  const anyLevel = filter !== 'all'; const cur = anyLevel ? null : curLevel();
  const pool = REG.vocab.filter(v => lt ? (v.lv === lt[0] && vocabTheme(v) === lt.slice(1).join(':')) : theme ? vocabTheme(v) === theme : filter === 'all' ? vocabEligibleForDaily(v, cur) : v.lv === filter);
  const left = todayNewLeft('v');
  return scopeQueue(pool, newVocabCandidates(pool, anyLevel).slice(0, left), size);
}
function buildMistakeQueue(size = 20) {
  const list = [];
  activeMistakes().slice(0, size * 2).forEach(m => {
    const it = m.key && REG.byKey.get(m.key);
    if (it) { if (!list.some(x => x.item && x.item.key === it.key)) list.push({ item: it }); }
    else list.push({ mistake: m });
  });
  return shuffle(list).slice(0, size);
}

// ---------- session lifecycle ----------
const DRILL_NOTE = '這個範圍今天沒有幾題要複習，這組先練最不熟的。';
const MODE_TITLE = { daily: '今日練習', unit: '單元練習', vocab: '單字練習', mistakes: '錯題練習', ai: 'AI 題目', kanji: '漢字練習', kana: '假名', items: '練習', stage: '階段測驗' };
function startSession(mode, opt = {}) {
  let entries = [];
  let meta = {};
  if (mode === 'daily') {
    const size = opt.size || SESSION_SIZE;
    if (!opt.extra && dailyPlan(size).remaining === 0) opt = Object.assign({}, opt, { extra: true });   // the day is done (e.g. 再練一組 on the summary): offer the 加練 set
    const r = opt.extra ? extraQueue() : dailyQueue(size);
    entries = r.items.map(item => ({ item }));
    // the day's note (fewer new items today, a level to finish first) over the first question of the day's first set (1.1.0:
    // 書房 has no card for it; 學習分析's 今天 card keeps it all day)
    meta = { newCount: r.newCount, reviewCount: r.reviewCount, note: !opt.extra && itemsDoneToday() === 0 ? dailyPlan(size).note || '' : '' };
  } else if (mode === 'unit') {
    const uq = buildUnitQueue(opt.unit, opt.size || 15);
    entries = uq.map(item => ({ item }));
    meta = { unit: opt.unit, note: uq.drill ? DRILL_NOTE : '' };
  } else if (mode === 'vocab') {
    if ((opt.filter || '').startsWith('c:')) opt.title = opt.title || `主題練習・${opt.filter.slice(2)}`;
    const vq = buildVocabQueue(opt.filter || 'all', opt.size || 20);
    entries = vq.map(item => ({ item }));
    meta = { note: vq.drill ? DRILL_NOTE : '' };
  } else if (mode === 'mistakes') {
    entries = buildMistakeQueue(opt.size || 20);
  } else if (mode === 'kanji') {
    const kq = buildKanjiQueue(opt.size || 15, opt.lv || null);
    entries = kq.map(item => ({ item }));
    meta = { note: kq.drill ? DRILL_NOTE : '' };
  } else if (mode === 'kana') {   // 假名: due ones first, then the next unseen in 五十音 order
    const t = todayStr(); const size = opt.size || SESSION_SIZE;
    const rowOk = (x) => (opt.row === undefined || x.row === opt.row) && (!opt.script || x.script === opt.script);   // one row of one table on purpose
    const due = REG.kana.filter(x => rowOk(x) && isDueToday(x, t)).sort(byDue); const fresh = REG.kana.filter(x => rowOk(x) && !state.srs[x.key]).sort((a, b) => a.order - b.order);
    entries = (opt.row === undefined ? due.concat(fresh) : REG.kana.filter(rowOk).sort((a, b) => a.order - b.order)).slice(0, size).map(item => ({ item }));
  } else if (mode === 'items') {
    entries = (opt.items || []).map(item => ({ item }));
  } else if (mode === 'stage') {   // 階段測驗: a fixed paper from the stage's own items, scored only (see answerCurrent)
    const st = stageById(opt.stage); if (!st) return false;
    entries = buildStageTest(st.id).map(item => ({ item }));
    opt = Object.assign({}, opt, { title: `${st.title}・階段測驗` });
  }
  if (!entries.length) {
    toast(mode === 'mistakes' ? '錯題本目前是空的。' : '現在沒有需要練習的題目，明天再來，或到課程頁預習下一單元。');
    return false;
  }
  // a word seen for the first time is shown on a preview card before its question
  if (mode !== 'mistakes' && mode !== 'stage') entries.forEach(e => { if (e.item && e.item.kind === 'v' && !state.srs[e.item.key]) e.preview = true; });
  // the first new question from a lesson section the learner has not been shown yet gets that section's card first (daily and unit practice); each section once
  if (mode === 'daily' || mode === 'unit') {
    const shown = new Set(state.lessonSeen || []);
    entries.forEach(e => { const g = e.item; if (!g || g.kind !== 'g' || state.srs[g.key]) return; const k = lessonSecKey(g); if (!k || shown.has(k)) return; shown.add(k); e.preview = true; });
  }
  if (mode !== 'stage') entries.forEach(e => { if (relearnCard(e.item)) e.preview = e.relearn = true; });
  SESSION = {
    mode, title: opt.title || MODE_TITLE[mode] || '練習', entries, idx: 0, meta,
    stats: { correct: 0, wrong: 0, newCount: 0 }, results: [], startedAt: Date.now(), lastFmt: '', opt,
    ringFrom: ringPct(dayProgress()),   // today's ring before this set: the summary's ring fills on from here (1.0.41)
    test: mode === 'stage' ? { stage: opt.stage, start: Boolean(opt.start) } : null   // start: taken from 我學過一些
  };
  prepareEntry(0);
  go('#/practice');
  return true;
}
function prepareEntry(i) {
  const e = SESSION.entries[i];
  if (!e || e.q) return;
  if (e.mistake) e.q = makeMistakeCard(e.mistake);
  else if (e.encore) e.q = otherFormatQuestion(e.item) || null;
  else if (e.requeued && e.orig && e.orig.fmt && e.orig.fmt.endsWith('-type')) e.q = makeQuestion(e.item, { forceFmt: e.orig.fmt });   // 再練一次 of a spelled conjugation: spell it again, never back to options
  // 再練一次: another format when the item has one. A tapped question (排序 has no other format) is built again: shuffling its two
  // options would swap right and wrong, since a tapped answer is always option 0 when right
  else if (e.requeued) e.q = otherFormatQuestion(e.item) || (e.orig.custom ? makeQuestion(e.item, { forceFmt: e.orig.fmt }) : requeueQuestion(e.orig, shuffle(e.orig.options)));
  else if (SESSION.test) e.q = makeQuestion(e.item, { choiceOnly: true, avoidFmt: SESSION.lastFmt });
  else e.q = makeQuestion(e.item, { avoidFmt: SESSION.lastFmt });
  if (!e.q) { SESSION.entries.splice(i, 1); if (i < SESSION.entries.length) prepareEntry(i); }
}

// 常錯 (LEECH_LAPSES misses after it was learned) and missed again: its card comes back before it is asked (2026-11-11, the
// user) — a word's preview card, a grammar item's lesson section — until it is answered right on its day (rl 0 → 1)
function relearnCard(it) {
  const r = it && state.srs[it.key];
  return Boolean(r && r.leech && r.rl === 0 && (it.kind === 'v' || (it.kind === 'g' && lessonSecKey(it))));
}
// formats this item has already been asked in during the session (answered or queued ahead)
function usedFormats(key) {
  return SESSION.entries.filter(x => x.q && x.item && x.item.key === key).map(x => x.q.fmt);
}
// the same item in a format not yet used this session; null when it has no other format
function otherFormatQuestion(item) {
  const used = usedFormats(item.key);
  const q = makeQuestion(item, { encore: true, avoidFmts: used, avoidFmt: used });
  return q && q.fmt && !used.includes(q.fmt) ? q : null;
}
// a grammar fill-in item that can also be asked another way (用法, 句意拼貼)
function grammarHasFormats(g) {
  if (g && g.kind === 'g' && (g.t === 'conj' || g.t === 'adj')) return (state.settings.conjInput || 'auto') !== 'choice';   // four options ↔ spelled
  if (!g || g.kind !== 'g' || (g.t || 'choice') !== 'choice' || !splitBlank(g.jp || '')) return false;
  return grammarFormats(g).length >= 2;
}
// A word met for the first time comes back twice more in this session, each time in another format: once a few
// questions later, once further on. Encores do not touch the SRS schedule; the first answer did that.
// After a miss the 再練一次 copy takes the 3–5 window, so the encores move back to keep the word from appearing twice in a row.
// One encore in another format, 8–11 items later (a few minutes of spacing); the second look is tomorrow's review.
function scheduleEncores(e, ok) {
  const shift = ok ? 0 : 3;
  const at = (lo, hi) => Math.min(SESSION.entries.length, SESSION.idx + lo + Math.floor(Math.random() * (hi - lo + 1)));
  SESSION.entries.splice(at(8 + shift, 11 + shift), 0, { item: e.item, encore: true });
}
// How many encore questions a queue will add once its new items are answered (one per new built-in word or multi-format grammar item).
function encoreEstimate(items) { return items.filter(it => !state.srs[it.key] && (it.kind === 'v' || (it.kind === 'g' && grammarHasFormats(it)))).length; }

// Consistent furigana for options: readings come from the correct answer so that a wrong
// conjugation is not given away by missing furigana.
function readingMapFrom(text) {
  const map = {};
  const html = furi(text);
  const re = /<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g;
  let m;
  while ((m = re.exec(html))) map[m[1]] = m[2];
  return map;
}
function optionHtml(q, o) {
  if (!o.jp) return esc(o.text);
  if (q.kanaOptions && q.optKana && q.optKana[o.text]) return esc(q.optKana[o.text]);
  if (q.noFuriOptions) return esc(jaPlain(o.text));
  if (q.fmt === 'v-recall' || q.fmt === 'v-pic' || q.fmt === 'v-reading') return q.ownRmap && q.item && o.text === jaPlain(q.item.w) ? furi(ownBracket(q.item)) : furi(o.text);   // a homograph card's answer reads its own way
  if (/\[[ぁ-ゖー]+\]/.test(o.text)) return furi(o.text);
  if (!q._rmap) {
    // one reading map for all options, so no option stands out by having (or lacking) furigana;
    // the answer and the full sentence win over readings guessed from the distractors
    const add = (text) => { const m = readingMapFrom(text || ''); Object.keys(m).forEach(k => { if (!(k in q._rmap)) q._rmap[k] = m[k]; }); };
    q._rmap = Object.assign({}, q.ownRmap || {});   // a homograph card's own reading first
    add(q.options[q.answer].text);
    add(q.fullJp);
    if (q.item && q.item.v) add(q.item.v);
    q.options.forEach(o => add(o.text));
  }
  const s = o.text;
  return s.replace(/[一-鿿々〆ヶ]+|[^一-鿿々〆ヶ]+/g, run => {
    if (!KANJI_RE.test(run)) return esc(run);
    if (q._rmap[run]) return `<ruby>${esc(run)}<rt>${esc(q._rmap[run])}</rt></ruby>`;
    // split the run into known single pieces from the map
    let out = ''; let rest = run;
    while (rest) {
      let hit = '';
      Object.keys(q._rmap).forEach(k => { if (rest.startsWith(k) && k.length > hit.length) hit = k; });
      if (!hit) { out += esc(rest); break; }
      out += `<ruby>${esc(hit)}<rt>${esc(q._rmap[hit])}</rt></ruby>`;
      rest = rest.slice(hit.length);
    }
    return out;
  });
}

// options that differ only by reading (来[き]て / 来[こ]て) keep their furigana even when furigana is off
function optClass(o) { return !o.jp ? '' : (/\[[ぁ-ゖー]+\]/.test(o.text) ? 'jp keep-furi' : 'jp'); }

function currentEntry() { return SESSION && SESSION.entries[SESSION.idx]; }

function renderPractice() {
  const view = document.getElementById('view');
  if (!SESSION) { go('#/today'); return; }
  document.body.classList.add('practicing');
  if (SESSION.idx >= SESSION.entries.length) { renderSummary(view); return; }
  const e = currentEntry();
  if (!e.q) prepareEntry(SESSION.idx);
  if (!currentEntry()) { renderSummary(view); return; }
  const q = currentEntry().q;
  const pct = Math.round(sessionCount().before / Math.max(1, sessionCount().total) * 100);
  if (e.preview && !e.previewDone) {
    view.innerHTML = previewHtml(e, pct);
    if (!e.autoPlayedPreview) { e.autoPlayedPreview = true; if (e.item.kind === 'v') setTimeout(() => speak(q.speakWord || jaPlain(e.item.w), speakOpts(q, q.speakWord)), 150); }
    return;
  }
  const showZh = q.zhText && (state.settings.showZh || q.forceZh || e.zhShown);
  const subParts = [];
  if (q.subHtml) subParts.push(q.subHtml);
  if (q.zhText) subParts.push(showZh ? `<span>${esc(q.zhText)}</span>` : '<button type="button" class="toggle-zh" data-act="show-zh">顯示中文（T）</button>');
  const answered = e.done;
  const sheet = answered && phoneLayout();   // 1.0.43: a phone shows the result in a panel from the bottom
  const longOpts = q.options.some(o => jaPlain(o.text).length > 14);   // one long option makes all four smaller, so their sizes match
  // four options of one or two characters (百 目 日 白, ち ら き さ, ga gi gu ge): big, two by two
  const glyph = !q.audioOptions && q.options.length === 4 && (q.kind === 'a' ? q.options.every(o => jaPlain(o.text).length <= 4) : q.options.every(o => o.jp && jaPlain(o.text).length <= 2));
  const opts = q.options.map((o, i) => {
    let cls = 'opt';
    if (!o.jp) cls += ' zh';
    if (longOpts) cls += ' long';
    if (answered) {
      if (i === q.answer) cls += ' correct';
      else if (i === e.chosen) cls += ' wrong';
      else cls += ' faded';
    }
    if (q.audioOptions && !answered) return audioOptionHtml(i, cls, o, 'answer', false);
    const text = optionHtml(q, o);
    // after answering, each wrong word shows what it actually means, and each wrong meaning the word it belongs to (1.0.45);
    // a phone's panel lists them instead, so the options keep their size under it
    const [zh, ja] = answered && !sheet && i !== q.answer ? optAside(q, o) : ['', false];
    return `<button type="button" class="${cls}" data-act="answer" data-i="${i}" ${answered ? 'disabled' : ''}><span class="kbd">${i + 1}</span><span class="${optClass(o)}">${text}</span>${zh ? `<span class="opt-zh${ja ? ' jp' : ''}">${esc(zh)}</span>` : ''}</button>`;
  }).join('');
  const rec = q.key ? srsGet(q.key) : null;
  // a missed item on its 1/3/7 ladder: on (or after) its day this is a step; before it (most notebook-queue draws) extra practice
  const ladder = !rec || typeof rec.rl !== 'number' || e.requeued || e.encore || (e.srs && e.srs.isNew) ? ''
    : (e.srs ? !e.srs.reviewed : rec.due > todayStr()) ? '<span class="chip" title="還沒到這題的複習日：答對不算進第 1、3、7 天，到了那天照常複習">錯題</span>'
    : `<span class="chip" title="答錯過的題：第 1、3、7 天各複習一次，三次都對才離開錯題本">錯題複習 ${rec.rl + 1}/3</span>`;
  let stem = keepTail(q.stemHtml);
  if (answered && q.fillHtml) stem = stem.replace(/<span class="blank" data-blank>[\s\S]*?<!--\/blank-->/, `<span class="blank filled">${q.fillHtml}</span>`);
  let custom = q.custom ? customInteractionHtml(e, answered) : '';
  if (q.custom === 'g-order' && subParts.length) custom = custom.replace('<div class="order">', `<div class="order"><div class="q-sub order-sub">${subParts.join(' ')}</div>`);   // 排序: the meaning right above the sentence it explains
  const just = answered && e.justAnswered ? (e.chosen === q.answer ? ' just-ok' : ' just-bad') : ''; e.justAnswered = false;   // 1.0.41: only the draw right after the answer
  const tools = `
    <div class="pr-actions">
      <div class="left">
        ${q.custom === 'v-match' ? '' : `<button type="button" class="btn btn-sm btn-ghost" data-act="replay" title="播放（R）">${icon('speaker')}<span>發音</span></button>`}
        ${q.kind === 'v' && q.item && q.item.ex && q.fmt !== 'v-match' && (answered || q.fmt !== 'v-cloze') ? '<button type="button" class="btn btn-sm btn-ghost" data-act="speak-example" title="朗讀例句">例句</button>' : ''}
        ${answered ? answeredToolsHtml(e) : ''}
      </div>
      ${answered || q.custom ? '' : '<div class="right"><span class="tiny muted kbd-hint">按 1–4 作答</span></div>'}
    </div>`;
  const next = answered ? `<div class="pr-next"><button type="button" class="btn btn-primary" data-act="next" id="btnNext">${SESSION.idx + 1 < SESSION.entries.length ? '下一題' : '看結果'} <span class="kbd kbd-hint" style="background:transparent;border-color:currentColor;color:inherit">Enter</span></button></div>` : '';
  view.innerHTML = `
    <div class="pr-top">
      <button type="button" class="btn btn-ghost btn-icon" data-act="exit-practice" title="結束練習（Esc）" aria-label="結束練習">${icon('close')}</button>
      ${prBarHtml(pct)}
      ${prCountHtml()}
    </div>
    ${sessionNoteHtml(answered)}
    <div class="q-card${just}">
      <div class="q-label"><span>${esc(q.label || '')}</span>${e.requeued ? '<span class="chip">再練一次</span>' : ''}${e.encore ? '<span class="chip">換個方式再考</span>' : ''}${ladder}${rec && rec.leech ? '<span class="chip chip-bad" title="這題答錯了很多次">常錯</span>' : ''}${q.kind !== 'm' ? srsBadge(q.key) : ''}</div>
      <div class="q-instr">${esc(q.instr || '')}</div>
      ${q.passageHtml ? `<div class="panel jp mb-3 passage">${q.passageHtml}</div>` : ''}
      ${stem ? `<div class="q-stem jp ${q.stemClass || ''}">${stem}</div>` : ''}
      ${answered && q.revealHtml && !sheet ? q.revealHtml : ''}
      ${subParts.length && q.custom !== 'g-order' ? `<div class="q-sub">${subParts.join(' ')}</div>` : ''}
      ${custom || `<div class="opts${q.wide ? ' wide' : ''}${glyph ? ' glyph' : ''}">${opts}</div>`}
      ${answered && !sheet ? feedbackHtml(e) : ''}
    </div>
    ${sheet ? `${tools.replace('<div class="pr-actions">', '<div class="pr-actions pr-ghost" aria-hidden="true" inert>')}
    <div class="fb-sheet ${e.chosen === q.answer ? 'ok' : 'bad'}${just ? ' rise' : ''}" role="region" aria-label="作答結果">
      <div class="fb-sheet-body">${feedbackHtml(e, true)}${tools}</div>
      ${next}
    </div>` : tools + next}`;
  sheetFit(view);
  // a tap-to-answer block (拼字, 排序, 配對) loses its bottom row once answered: on a phone it keeps the height it had, so the tiles stay put under the panel
  const block = view.querySelector('.q-card > :is(.spell, .order, .match)');
  if (block && !answered) e.blockH = block.offsetHeight;
  else if (block && sheet && e.blockH) block.style.minHeight = e.blockH + 'px';
  if (!answered && q.audio && !e.autoPlayed) { e.autoPlayed = true; setTimeout(() => (q.audioScript ? speakScript(q.audio) : speak(q.audio, speakOpts(q, q.audio))), 150); }
  if (!answered && q.audioOptions) prefetchSpeech(q.options.map(o => o.text));   // the same text the play button sends (bracket readings included, ttsText turns them into kana)
  if (answered) { const nb = document.getElementById('btnNext'); if (nb) nb.focus({ preventScroll: true }); }
}

// 1.0.43: a phone (the CSS breakpoint) shows an answer's result in a panel from the bottom; crossing the line draws the card again
const PHONE_MQ = window.matchMedia ? window.matchMedia('(max-width: 600px)') : null;
function phoneLayout() { return Boolean(PHONE_MQ && PHONE_MQ.matches); }
if (PHONE_MQ && PHONE_MQ.addEventListener) PHONE_MQ.addEventListener('change', () => { if (SESSION && currentRoute().name === 'practice') renderPractice(); });
// room under the page as tall as the panel, so what it covers can still be scrolled up above it (it grows with ⋯ or AI 解析)
const SHEET_RO = window.ResizeObserver ? new ResizeObserver(([en]) => { if (en) document.getElementById('view').style.setProperty('--sheet-h', en.target.offsetHeight + 'px'); }) : null;
function sheetFit(view) {
  const sh = view.querySelector('.fb-sheet');
  if (SHEET_RO) SHEET_RO.disconnect();
  if (!sh) { view.style.removeProperty('--sheet-h'); return; }
  view.style.setProperty('--sheet-h', sh.offsetHeight + 'px');
  if (SHEET_RO) SHEET_RO.observe(sh);
}

// New word: show it before asking. Enter/Space (or the button) goes on to the question.
// After a preview the question is asked 4–6 items later, so it is a recall and not a copy of what was just shown.
function dismissPreview() {
  const e = currentEntry(); if (!e || !e.preview || e.previewDone) return;
  e.previewDone = true;
  if (e.item.kind === 'g') { const k = lessonSecKey(e.item); if (k && !(state.lessonSeen || []).includes(k)) { (state.lessonSeen = state.lessonSeen || []).push(k); saveState(); } }
  if (SESSION.entries.length - SESSION.idx > 1) {
    SESSION.entries.splice(SESSION.idx, 1);
    const at = Math.min(SESSION.entries.length, SESSION.idx + 4 + Math.floor(Math.random() * 3));
    SESSION.entries.splice(at, 0, e);
  }
  renderPractice(); window.scrollTo({ top: 0 });
}
// The counter and the bar count every question the set asks (2026-11-10, the user: the encores stay, but the bar must not fill
// before they come): what is queued — planned items, encores, 再練一次 copies — and the one more each new item not answered yet
// will bring (its encore, or its 再練一次 when missed; encoreEstimate's rule). Only a miss makes the total grow (a 階段測驗 has neither).
function sessionCount() {
  const es = SESSION.entries; const at = Math.min(SESSION.idx, es.length);
  const owed = SESSION.test ? 0 : encoreEstimate(es.slice(at).filter(x => x.item && !x.encore && !x.requeued).map(x => x.item));
  return { before: at, n: Math.min(at + 1, es.length), total: es.length + owed };
}
// the bar on top of a practice card slides from where the last card left it (1.0.41); the same card drawn again keeps still
function prBarHtml(pct) {
  const from = SESSION.barPct; SESSION.barPct = pct;
  const slide = from != null && from !== pct;
  return `<div class="bar"><span${slide ? ' class="slide"' : ''} style="${slide ? `--from:${from}%;` : ''}width:${pct}%"></span></div>`;
}
function prCountHtml() {
  const c = sessionCount();
  return `<div class="pr-count">${c.n} / ${c.total}</div>`;
}
// the session's note (the day's, or a drill's) over its first screen, a question or a new item's preview
function sessionNoteHtml(answered = false) { return SESSION.idx === 0 && !answered && SESSION.meta && SESSION.meta.note ? `<div class="plan-note">${esc(SESSION.meta.note)}</div>` : ''; }
function previewHtml(e, pct) {
  if (e.item.kind === 'g') return grammarPreviewHtml(e, pct);
  const v = e.item;
  const reading = v.r && v.r !== jaPlain(v.w) ? v.r : '';
  return `
    <div class="pr-top">
      <button type="button" class="btn btn-ghost btn-icon" data-act="exit-practice" title="結束練習（Esc）" aria-label="結束練習">${icon('close')}</button>
      ${prBarHtml(pct)}
      ${prCountHtml()}
    </div>
    ${sessionNoteHtml()}
    <div class="q-card">
      <div class="q-label"><span>${e.relearn ? '常錯的字' : '新單字'} · ${esc(lvLabel(v.lv))} · ${esc(vocabTheme(v))}</span>${e.relearn ? '<span class="chip chip-bad">再看一次</span>' : '<span class="chip chip-accent">新</span>'}</div>
      <div class="q-instr">${e.relearn ? '這個字錯過好幾次，先再看一遍，等一下再考。' : '先看一遍，接著會用幾種方式考這個字。'}</div>
      <div class="preview">
        ${picSvg(picKey(v))}
        <div class="word jp">${esc(jaPlain(v.w))}</div>
        ${reading ? `<div class="reading jp">${esc(reading)}</div>` : ''}
        <div class="meaning">${esc(v.m)}</div>
        ${v.p ? `<div class="mt-1">${posChip(v.p)}</div>` : ''}
        ${vocabExamples(v).map(e => exampleHtml(e.ex, e.exZh, '', v)).join('')}
      </div>
    </div>
    <div class="pr-actions pr-next-sticky">
      <div class="left">
        <button type="button" class="btn btn-sm btn-ghost" data-act="replay" title="播放（R）">${icon('speaker')}<span>發音</span></button>
        ${e.relearn ? '' : '<button type="button" class="btn btn-sm btn-ghost" data-act="preview-known" title="這個字我已經會了：標成五顆、跳過它的題目，之後排進五顆的複習">我會了</button>'}
      </div>
      <div class="right">${previewGoBtn()}</div>
    </div>`;
}

// 假名拼字 / 配對 are answered by tapping, not by picking one of four options. They still end in answerCurrent():
// option 0 is the correct text, option 1 receives what the learner produced when it was wrong.
// A piece already placed (假名拼字, 活用拼寫, 排序) is tapped on the line above to send it back to the tiles.
function placedPiece(act, k, html, cls = 'spell-piece', ti = '') { return `<button type="button" class="${cls}" data-act="${act}" data-k="${k}" data-ti="${ti}" title="點一下拿掉，或拖到別的位置">${html}</button>`; }
// 1.0.44: the tile questions (假名拼字, 活用 by tiles, 排序) share one model: a line of tile indices (e.spell / e.conj / e.order),
// filled by tapping or dragging, at most `need` long (kana spelling counts characters), sent with 確定
function tileModel(e) {
  const q = e && e.q; if (!q || e.done) return null;
  const tiles = (line) => line.length;
  if (q.custom === 'v-spell') return { key: 'spell', need: [...q.options[0].text].length, count: (line) => [...line.map(i => q.tiles[i]).join('')].length };
  if ((q.custom === 'g-conj-type' || q.custom === 'g-adj-type') && q.inputMode !== 'type') return { key: 'conj', need: conjTokens(q.options[0].text).length, count: tiles };
  if (q.custom === 'g-order') return { key: 'order', need: q.orderParts.length, count: tiles };
  if (q.custom === 'g-zh') return { key: 'zh', need: q.zhParts.length, count: tiles };
  return null;
}
// tile i onto the line at `at` (the end when left out), or moved there when it is on the line already; a full line takes no new one
function tilePut(i, at) {
  const e = currentEntry(); const m = tileModel(e); if (!m || !(i >= 0 && i < e.q.tiles.length)) return false;
  const line = e[m.key] = e[m.key] || [];
  const was = line.indexOf(i);
  if (was >= 0) line.splice(was, 1); else if (m.count(line.concat(i)) > m.need) return false;
  line.splice(at == null ? line.length : Math.max(0, Math.min(at, line.length)), 0, i);
  return was < 0 || was !== at;
}
// the k-th piece on the line back to the tiles; the ones after it move up
function tileTake(k) {
  const e = currentEntry(); const m = tileModel(e); const line = m && e[m.key];
  if (!line || !(k >= 0 && k < line.length)) return false;
  line.splice(k, 1); return true;
}
function tileSubmit() {
  const e = currentEntry(); const m = tileModel(e); if (!m) return;
  const line = e[m.key] || []; if (m.count(line) !== m.need) return;
  const q = e.q; const built = line.map(k => q.tiles[k]).join(''); const ans = q.options[0].text;
  if (m.key === 'spell') finishCustom(e, built === ans, built);
  else if (m.key === 'conj') finishCustom(e, conjMatch(built, ans), jaPlain(built));
  else if (m.key === 'zh') finishCustom(e, line.every(k => q.zhParts.includes(q.tiles[k])), built);   // the right pieces, in any order
  else finishCustom(e, built === q.orderParts.join(''), q.pre + built + q.post);
}
// draw the card again after a tile moved, every tile gliding from where it was to where it is now (a dropped one from where it
// was let go: `from` = { ti, rect }); a tap that changes nothing draws nothing
function tileMove(change, from) {
  const before = new Map([...document.querySelectorAll('.q-card [data-ti]')].map(el => [el.dataset.ti, el.getBoundingClientRect()]));
  if (from) before.set(from.ti, from.rect);
  if (!change() && !from) return;
  renderPractice();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.q-card [data-ti]').forEach(el => {
    const a = before.get(el.dataset.ti); if (!a) return;
    const b = el.getBoundingClientRect();
    const dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = (a.top + a.height / 2) - (b.top + b.height / 2);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.style.position = 'relative'; el.style.zIndex = '3';   // over the other tiles on its way
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2, .8, .3, 1)' })
      .finished.then(() => { el.style.position = ''; el.style.zIndex = ''; }, () => {});
  });
}
// dragging: a press on a free tile or a placed piece that moves 6px lifts a copy that follows the finger. Over the line a gap opens
// where it would go (worked out from where the pieces stood when it was lifted, so the gap does not chase the finger); let go there
// and it goes in, anywhere else and it goes back to the tiles. A press that hardly moves stays a tap, done by the click.
let DRAG = null;
function dragDown(ev) {
  if (DRAG || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  const el = ev.target.closest && ev.target.closest('.q-card [data-ti]'); if (!el || el.disabled || !tileModel(currentEntry())) return;
  DRAG = { el, ti: el.dataset.ti, fromLine: Boolean(el.closest('.spell-out, .order-out')), x: ev.clientX, y: ev.clientY, id: ev.pointerId, live: false, at: null };
}
function dragMove(ev) {
  const d = DRAG; if (!d || ev.pointerId !== d.id) return;
  if (!d.live) {
    if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 6) return;
    document.querySelectorAll('.q-card [data-ti]').forEach(p => p.getAnimations().forEach(a => a.finish()));   // a tile still gliding from a tap: measured where it lands
    const r = d.el.getBoundingClientRect();
    const ghost = d.el.cloneNode(true); ghost.removeAttribute('data-ti'); ghost.removeAttribute('data-act'); ghost.classList.add('tile-drag');
    const cs = getComputedStyle(d.el);   // a piece on the line takes its type from the line, which the copy leaves behind
    Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, color: cs.color });
    document.body.appendChild(ghost);
    Object.assign(d, { ghost, live: true, dx: d.x - r.left, dy: d.y - r.top });
    try { d.el.setPointerCapture(ev.pointerId); } catch (err) { /* the press may be gone */ }
    d.el.classList.add(d.fromLine ? 'tile-away' : 'tile-lifted');   // a piece off the line leaves no hole (kept in the page: a touch stays with its element)
    d.line = document.querySelector('.q-card .spell-out, .q-card .order-out');
    d.snap = d.line ? [...d.line.querySelectorAll('[data-ti]')].filter(p => p !== d.el).map(p => ({ el: p, r: p.getBoundingClientRect() })) : [];
  }
  ev.preventDefault();
  d.ghost.style.left = `${ev.clientX - d.dx}px`; d.ghost.style.top = `${ev.clientY - d.dy}px`;
  dragMark(ev.clientX, ev.clientY);
}
function dragMark(x, y) {
  const d = DRAG; const e = currentEntry(); const m = tileModel(e); let at = null;
  const r = d.line && d.line.getBoundingClientRect();
  const over = r && x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 40 && y <= r.bottom + 10;   // below, it stops short of the tiles (14px down)
  if (over && m && (d.fromLine || m.count((e[m.key] || []).concat(Number(d.ti))) <= m.need)) {
    at = d.snap.length;
    for (let k = 0; k < d.snap.length; k++) { const s = d.snap[k].r; if (y < s.top || (y <= s.bottom && x < s.left + s.width / 2)) { at = k; break; } }
  }
  if (at === d.at) return;
  d.at = at;
  if (d.gap) d.gap.remove(); d.gap = null;
  if (at === null) return;
  const gap = document.createElement('span'); gap.className = 'tile-gap';
  if (at < d.snap.length) d.snap[at].el.before(gap);
  else { const free = d.line.querySelector('.caret, .order-slot:not(.filled)'); if (free) free.before(gap); else if (d.snap.length) d.snap[d.snap.length - 1].el.after(gap); else d.line.prepend(gap); }
  d.gap = gap;
}
function dragUp(ev, cancelled) {
  const d = DRAG; if (!d || ev.pointerId !== d.id) return;
  DRAG = null;
  if (!d.live) return;   // a tap: the click does it
  // the click a mouse drag may leave behind lands on the tile drawn over below, gone from the page, so it does nothing
  const rect = d.ghost.getBoundingClientRect(); d.ghost.remove();
  const i = Number(d.ti); const e = currentEntry(); const m = tileModel(e);
  tileMove(() => {
    if (cancelled || !m) return false;
    if (d.at !== null) return tilePut(i, d.at);
    const k = (e[m.key] || []).indexOf(i); return k >= 0 && tileTake(k);   // let go off the line: back to the tiles
  }, { ti: d.ti, rect });
}

// 1.0.44: the row under a tile question: how far it is, 我不會 and 確定 (lit once the line is full; nothing is sent by itself any more)
function tileRowHtml(e, giveUp = '我不會，看答案') {
  const m = tileModel(e); const n = m ? m.count(e[m.key] || []) : 0;
  return `<div class="row-wrap mt-2 tile-row"><span class="small muted">${n} / ${m ? m.need : 0}</span><button type="button" class="btn btn-sm btn-ghost" data-act="custom-giveup">${giveUp}</button><button type="button" class="btn btn-sm btn-primary tile-ok" data-act="tiles-submit" ${m && n === m.need ? '' : 'disabled'}>確定</button></div>`;
}
function customInteractionHtml(e, answered) {
  const q = e.q;
  if (q.custom === 'g-conj-type' || q.custom === 'g-adj-type') {
    const ans = q.options[0].text;
    const cls = answered ? (e.chosen === q.answer ? 'ok' : 'bad') : '';
    if (q.inputMode === 'type') {
      return `<div class="spell">
        ${answered ? `<div class="spell-out jp ${cls}">${furi(e.chosen === q.answer ? ans : (e.typed || ''))}</div>` : `<input class="input jp conj-in" lang="ja" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="在這裡輸入" value="${esc(e.typed || '')}" />`}
        ${answered ? '' : `<div class="row-wrap mt-2" style="justify-content:center"><button type="button" class="btn btn-primary" data-act="conj-submit">確定</button><button type="button" class="btn btn-sm btn-ghost" data-act="custom-giveup">我不會，看答案</button></div>`}
      </div>`;
    }
    const used = e.conj || [];
    const built = used.map(i => q.tiles[i]).join('');
    return `<div class="spell">
      <div class="spell-out jp ${cls}">${answered ? furi(built) : used.map((i, k) => placedPiece('conj-untap', k, furi(q.tiles[i]), 'spell-piece', i)).join('')}<span class="caret"></span></div>
      <div class="spell-tiles">${q.tiles.map((tok, i) => `<button type="button" class="spell-tile conj-tile jp" data-act="conj-tap" data-i="${i}" data-tok="${esc(tok)}" ${used.includes(i) || answered ? 'disabled' : `data-ti="${i}"`}>${furi(tok)}</button>`).join('')}</div>
      ${answered ? '' : tileRowHtml(e)}
    </div>`;
  }
  if (q.custom === 'v-spell') {
    const used = e.spell || [];
    const typed = used.map(i => q.tiles[i]).join('');
    return `<div class="spell">
      <div class="spell-out jp ${answered ? (e.chosen === q.answer ? 'ok' : 'bad') : ''}">${answered ? esc(typed) : used.map((i, k) => placedPiece('spell-untap', k, esc(q.tiles[i]), 'spell-piece', i)).join('')}<span class="caret"></span></div>
      <div class="spell-tiles">${q.tiles.map((ch, i) => `<button type="button" class="spell-tile jp" data-act="spell-tap" data-i="${i}" data-ch="${esc(ch)}" ${used.includes(i) || answered ? 'disabled' : `data-ti="${i}"`}>${esc(ch)}</button>`).join('')}</div>
      ${answered ? '' : tileRowHtml(e)}
    </div>`;
  }
  if (q.custom === 'g-order') {
    const used = e.order || [];
    // answered wrong: a piece standing where another one belongs is red
    const slot = (i) => used[i] === undefined ? '<span class="order-slot">＿</span>'
      : !answered ? placedPiece('order-untap', i, furi(q.tiles[used[i]]), 'order-slot filled', used[i])
      : `<span class="order-slot filled${e.chosen !== q.answer && q.tiles[used[i]] !== q.orderParts[i] ? ' wrong' : ''}">${furi(q.tiles[used[i]])}</span>`;
    const built = `${furi(q.pre)}${q.orderParts.map((_, i) => slot(i)).join('')}${furi(q.post)}`;
    return `<div class="order">
      <div class="order-out jp ${answered ? (e.chosen === q.answer ? 'ok' : 'bad') : ''}">${built}</div>
      <div class="order-tiles">${q.tiles.map((p, i) => `<button type="button" class="order-tile jp" data-act="order-tap" data-i="${i}" ${used.includes(i) || answered ? 'disabled' : `data-ti="${i}"`}>${furi(p)}</button>`).join('')}</div>
      ${answered ? '' : tileRowHtml(e, '看答案')}
    </div>`;
  }
  if (q.custom === 'g-zh') {   // 句意拼貼: a slot for each piece; answered wrong, a decoy on the line is red; the grammar's piece is marked
    const used = e.zh || [];
    const slot = (i) => {
      if (used[i] === undefined) return '<span class="order-slot">＿</span>';
      const p = q.tiles[used[i]];
      if (!answered) return placedPiece('zh-untap', i, esc(p), 'order-slot filled', used[i]);
      return `<span class="order-slot filled${!q.zhParts.includes(p) ? ' wrong' : p === q.zhParts[q.zhKey] ? ' key' : ''}">${esc(p)}</span>`;
    };
    return `<div class="order zh-build">
      <div class="order-out ${answered ? (e.chosen === q.answer ? 'ok' : 'bad') : ''}">${q.zhParts.map((_, i) => slot(i)).join('')}</div>
      <div class="order-tiles">${q.tiles.map((p, i) => `<button type="button" class="order-tile" data-act="zh-tap" data-i="${i}" ${used.includes(i) || answered ? 'disabled' : `data-ti="${i}"`}>${esc(p)}</button>`).join('')}</div>
      ${answered ? '' : tileRowHtml(e)}
    </div>`;
  }
  if (q.custom === 'v-match') {
    const m = e.match || { sel: null, matched: [], wrong: 0 };
    const pairOf = (w) => q.pairs.find(p => p[0] === w);
    const kana = (w) => (pairOf(w) || [])[2] || w;   // the left column shows the reading only
    return `<div class="match">
      <div class="match-col">${q.words.map(w => `<button type="button" class="match-word jp ${m.matched.includes(w) ? 'matched' : ''} ${m.sel === w ? 'selected' : ''} ${m.flash && m.flash.w === w ? 'wrong-flash' : ''}" data-act="match-word" data-w="${esc(w)}" ${m.matched.includes(w) || answered ? 'disabled' : ''}>${esc(kana(w))}</button>`).join('')}</div>
      <div class="match-col">${q.meanings.map(mm => { const done = q.pairs.some(p => p[1] === mm && m.matched.includes(p[0])); return `<button type="button" class="match-meaning ${done ? 'matched' : ''} ${m.flash && m.flash.m === mm ? 'wrong-flash' : ''}" data-act="match-meaning" data-m="${esc(mm)}" ${done || answered ? 'disabled' : ''}>${esc(mm)}</button>`; }).join('')}</div>
      ${answered ? '' : `<div class="row between small muted" style="grid-column:1/-1"><span>${m.wrong ? `錯了 ${m.wrong} 次` : m.sel ? `已選「${esc(kana(m.sel))}」，點它的意思` : '點一個單字'}</span><button type="button" class="btn btn-sm btn-ghost" data-act="custom-giveup">我不會，看答案</button></div>`}
    </div>`;
  }
  return '';
}
function finishCustom(e, ok, produced) {
  const q = e.q;
  if (!ok) q.options[1].text = produced;
  answerCurrent(ok ? 0 : 1);
}
// 配對: the words paired wrong (or left unpaired by 看答案), each written up as a question of its own: its notebook entry,
// its line in the session list and its 再練一次
function matchMisses(e) {
  return ((e.match && e.match.missed) || []).map(([w, chose]) => {
    const [, m, r, key] = e.q.pairs.find(p => p[0] === w) || []; const item = REG.byKey.get(key);
    return item && { key, item, kind: 'v', cat: '單字', label: r && r !== w ? `${r}（${w}）` : w, mistakePrompt: `配對：${w}`, answerText: m, why: vocabWhy(item), options: [{ text: m }, { text: chose }], answer: 0 };
  }).filter(Boolean);
}

function srsBadge(key) {
  const r = srsGet(key);
  if (!r) return '<span class="chip chip-accent">新</span>';
  return `<span class="row" style="gap:6px">${srsDots(r.b)}</span>`;
}

// once answered, beside 發音 and 例句: 手滑，不算 (a miss) and AI 解析. 2026-11-10 (the user): no ⋯ any more, and nothing to set
// right after an answer — 振假名 (設定, the F key), 這個字我已經會了 (the word list) and 這題有問題 (it only hid the item) went
function answeredToolsHtml(e) {
  const ok = e.chosen === e.q.answer;
  return `${!ok && !e.slip && e.undo && !SESSION.test ? '<button type="button" class="btn btn-sm btn-ghost" data-act="slip" title="選錯鍵、看錯行：不進錯題本，排程維持原狀">手滑，不算</button>' : ''}
    ${aiReady() ? '<button type="button" class="btn btn-sm btn-ghost" data-act="ai-explain">AI 解析</button>' : ''}`;
}
// what a wrong option is, shown beside it after answering: a word's Chinese meaning, or the word a Chinese meaning belongs to
// ([text, true] for the latter, set in Japanese type)
function optAside(q, o) {
  const zh = q.optZh && q.optZh[o.text]; if (zh) return [zh, false];
  const ja = q.optJa && q.optJa[o.text]; return ja ? [ja, true] : ['', false];
}
// the last two kana of a sentence and its closing marks stay on one line, so it never ends on a line of just 「い。」
// (not text-wrap: pretty: on iPhone Safari it broke an example that fitted into three lines, and Chrome skips a blank with furigana)
function keepTail(html) { return String(html || '').replace(/([ぁ-ゖァ-ヺー]{2}[。、？！」）]+)$/, '<span class="nowrap">$1</span>'); }

function feedbackHtml(e, sheet = false) {
  const q = e.q;
  const ok = e.chosen === q.answer;
  const right = q.options[q.answer];
  // in a phone's result panel the options are under it, so it lists them: the right one, the one picked, then the rest, each
  // wrong word with what it means where that is known (1.0.45). A right answer lists them only where the other options have
  // something to show (word questions, 1.0.46). What a listening item reveals (the transcript, the word heard) comes under
  // the verdict there, not inside the card (1.0.43)
  const order = q.options.map((o, i) => i).sort((a, b) => (b === q.answer) - (a === q.answer) || (b === e.chosen) - (a === e.chosen));
  const list = sheet && !q.custom && (!ok || q.options.some((o, i) => i !== q.answer && optAside(q, o)[0]));
  const chosen = list ? `<div class="fb-opts">${order.map(i => { const o = q.options[i]; const [zh, ja] = i !== q.answer ? optAside(q, o) : ['', false];
    return `<div class="fb-opt${i === q.answer ? ' ok' : i === e.chosen ? ' bad' : ''}"><span class="fb-mark">${i === q.answer ? '✓' : i === e.chosen ? '✗' : '・'}</span><span class="${optClass(o)}">${optionHtml(q, o)}</span>${zh ? `<span class="fb-opt-zh${ja ? ' jp' : ''}">（${esc(zh)}）</span>` : ''}${i === e.chosen && !ok ? '<span class="fb-you">你選的</span>' : ''}</div>`; }).join('')}</div>` : '';
  const full = q.fullJp && (q.fmt.startsWith('g-') || q.fmt === 'v-cloze' || q.fmt === 'm-card') ? `<div class="fb-full jp">${q.kind === 'v' && q.exMarked && q.item && homographReadings(q.item).length ? exampleJpHtml(q.exMarked, q.item) : keepTail(furi(q.fullJp))} <button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak-full" title="朗讀">${icon('speaker')}</button></div>${q.zhText ? `<div class="small muted">${esc(q.zhText)}</div>` : ''}` : '';
  // other vocabulary formats: the word's example sentence, with its own play button (so it is not buried in the note text);
  // 配對 has none: the sentence would be one word's of six
  const example = q.kind === 'v' && q.item && q.item.ex && q.fmt !== 'v-cloze' && q.fmt !== 'v-match' ? exampleHtml(q.item.ex, q.item.exZh, 'mt-2', q.item) : '';
  const why = example ? String(q.why || '').replace(/\n- 例：[^\n]*/g, '') : q.why;
  const cur = q.key ? state.srs[q.key] : null;
  const srsInfo = e.srs ? `<span title="${esc(srsLevelLabel(e.srs.rec, q.key) + '・' + dueLabel(e.srs.rec, q.key))}">${srsDots(e.srs.rec.b, e.srs.before)}</span>${e.lvUp ? `<span class="chip chip-accent lv-up">升到${e.lvUp}</span>` : ''}`
    : e.encore && cur ? `<span title="${esc(srsLevelLabel(cur, q.key) + '・這次不影響排程')}">${srsDots(cur.b)}</span>` : '';   // the level and next date as a tooltip (1.0.35)
  const mistake = !ok && q.kind !== 'x' && !e.slip && !SESSION.test && !(e.requeued && q.custom === 'v-match') ? '<span>已加入錯題本</span>' : '';   // a 再練一次 配對 writes nothing
  const slip = e.slip ? '<span class="chip">手滑，不算</span>' : '';   // the button itself is in the tool row (answeredToolsHtml)
  const mNote = e.mistakeDone ? '<span class="chip chip-ok">已移出錯題本</span>' : '';
  // a spelled or typed conjugation: show what was produced, the first wrong character marked
  let diff = '';
  if (!ok && q.custom && q.custom.endsWith('-type') && q.options[1].text && q.options[1].text !== '（看了答案）') {
    const typed = [...jaPlain(q.options[1].text)];
    const target = HAS_KANJI.test(typed.join('')) ? jaPlain(right.text) : kanaKey(answerKana(right.text));   // kana typed → compare with the kana form, else the first char is always "wrong"
    const i = firstDiff(typed.join(''), target);
    const marked = i < 0 ? esc(typed.join('')) : `${esc(typed.slice(0, i).join(''))}<mark>${esc(typed[i] || '＿')}</mark>${esc(typed.slice(i + 1).join(''))}`;
    diff = `<div class="fb-diff jp">你的答案：${marked}</div>`;
  }
  return `
    <div class="feedback ${ok ? 'ok' : 'bad'}">
      <div class="fb-head ${ok ? 'ok' : 'bad'}">${ok ? icon('check') + '<span>答對了</span>' + (e.combo >= 3 ? `<span class="chip chip-accent combo">連對 ${e.combo}</span>` : '')
        : e.missed && e.missed.length ? icon('cross') + `<span>配錯了：<span class="jp">${esc(e.missed.map(x => x.label).join('、'))}</span></span>`   // 配對: the words paired wrong
        : icon('cross') + `<span>答錯了，正確答案是「<span class="jp">${q.kanaOptions ? `${esc(jaPlain(right.text))}（${esc(q.optKana[right.text])}）` : right.jp ? optionHtml(q, right) : esc(right.text)}</span>」</span>`}</div>
      ${chosen}${sheet && q.revealHtml ? q.revealHtml : ''}${diff}${full}${example}
      ${why ? `<div class="fb-why mt-2">${md(why)}</div>` : ''}
      <div class="fb-meta">${q.point && q.kind === 'g' ? `<span class="chip">考點：${esc(q.point)}</span>` : ''}${srsInfo}${mistake}${slip}${mNote}</div>
      <div id="aiExplainBox"></div>
    </div>`;
}

function answerCurrent(i) {
  const e = currentEntry();
  if (!e || e.done) return;
  const q = e.q;
  if (i < 0 || i >= q.options.length) return;
  e.done = true; e.chosen = i; e.justAnswered = true;
  const ok = i === q.answer;
  // 配對: every word paired wrong is answered wrong on its own; the word asked counts as right unless it is one of them
  if (q.custom === 'v-match') e.missed = matchMisses(e);
  const perWord = Boolean(e.missed && e.missed.length);   // a wrong answer with no pair recorded (no taps) stays on the word asked
  const self = perWord ? e.missed.find(x => x.key === q.key) : null;
  const itemOk = perWord ? !self : ok;
  const others = perWord ? e.missed.filter(x => x.key !== q.key) : [];
  SESSION.lastFmt = q.fmt;
  if (SESSION.test) {   // 階段測驗: score only — no SRS, notebook, logs, encores or 再練一次
    SESSION.stats[ok ? 'correct' : 'wrong']++;
    SESSION.results.push({ key: q.key, ok, q, chosen: i });
    if (SESSION.results.length === SESSION.entries.length) finishStageTest();
    renderPractice(); speakAnswered(q);
    return;
  }
  if (!ok && !e.encore && !e.requeued) {   // kept so 「手滑，不算」 can put everything back
    const copy = (o) => o ? JSON.parse(JSON.stringify(o)) : null;
    const m0 = state.mistakes.find(x => (q.key && x.key === q.key) || x.prompt === (q.mistakePrompt || q.plainStem || ''));
    const t = todayStr();
    e.undo = {
      srs: q.key && state.srs[q.key] ? JSON.parse(JSON.stringify(state.srs[q.key])) : null,
      mistake: m0 ? JSON.parse(JSON.stringify(m0)) : null,
      others: others.map(x => ({ key: x.key, item: x.item, srs: copy(state.srs[x.key]), mistake: copy(state.mistakes.find(m => m.key === x.key || m.prompt === x.mistakePrompt)) })),
      mistakesLen: state.mistakes.length,
      today: Object.assign({}, state.today),
      ans: (state.today.ans || []).slice(),
      logDate: t,
      dailyLog: state.dailyLogs[t] ? JSON.parse(JSON.stringify(state.dailyLogs[t])) : null,
      themeLane: state.themeLane ? JSON.parse(JSON.stringify(state.themeLane)) : null,
      currentUnit: state.currentUnit,
      completedUnits: (state.completedUnits || []).slice(),
    };
  }
  // the 再練一次 copy is a learning step: it counts as a question done today, nothing else (the first answer set the schedule)
  if (e.requeued) {
    recordAction(q.kind === 'v' || q.kind === 'k' || q.kind === 'a' ? 'v' : q.kind === 'g' || q.kind === 'c' ? 'g' : 'q', null, q.kind === 'c' ? 'g' : q.kind);
    SESSION.stats[ok ? 'correct' : 'wrong']++;
    SESSION.results.push({ key: q.key, ok, q, chosen: i, requeued: true, missed: e.missed, at: Date.now() });
    const wait = cheer(e, ok);
    saveState(); renderPractice(); speakAnswered(q, wait);
    return;
  }
  const lvBefore = q.key && state.srs[q.key] ? srsLevelLabel(state.srs[q.key], q.key) : null;
  if (['v', 'g', 'l', 'r', 'k', 'c', 'a'].includes(q.kind) && !e.encore) {
    e.srs = srsAnswer(q.key, itemOk);
    if (e.srs.isNew) SESSION.stats.newCount++;
  }
  if (q.kind === 'm' && q.mistakeId) noteAnswered('m:' + q.mistakeId);   // a notebook card is answered as its notebook entry (srsAnswer never sees it)
  if (q.kind === 'v' && q.fmt && q.fmt.startsWith('v-')) recordFormat(state.srs[q.key], q.fmt, itemOk);
  if (q.kind === 'g' && q.item && ((q.item.t || 'choice') === 'choice' || (q.fmt && q.fmt.endsWith('-type'))) && q.fmt) recordFormat(state.srs[q.key], q.fmt, ok, 'gf');
  // just became 熟悉 or 已熟練 (a word's spelling, recorded above, can be the step to 已熟練): a chip by the dots (1.0.50)
  const lvAfter = e.srs && itemOk ? srsLevelLabel(e.srs.rec, q.key) : null;
  if ((lvAfter === '熟悉' || lvAfter === '已熟練') && lvAfter !== lvBefore && lvBefore !== '已熟練') e.lvUp = lvAfter;
  // a new word comes back once more in another format; so does a new grammar item answered right (a miss gets the 再練一次 copy instead)
  if (e.srs && e.srs.isNew && (q.kind === 'v' || (q.kind === 'g' && ok && grammarHasFormats(q.item)))) scheduleEncores(e, itemOk);
  if (q.fmt) {
    const f = state.statsFmt[q.fmt] || (state.statsFmt[q.fmt] = { ok: 0, ng: 0 });
    if (ok) f.ok++; else f.ng++;
  }
  const topic = q.kind === 'g' ? unitById(q.unit).short : q.kind === 'c' ? '變化練習' : q.kind === 'v' ? `單字「${jaPlain(q.item.w)}」` : q.kind === 'k' ? `漢字「${q.item.k}」` : q.kind === 'a' ? `假名「${q.item.ch}」` : q.kind === 'l' ? '聽力' : q.kind === 'r' ? '閱讀' : null;
  recordAction(q.kind === 'v' || q.kind === 'k' || q.kind === 'a' ? 'v' : q.kind === 'g' || q.kind === 'c' ? 'g' : 'q', topic, q.kind === 'c' ? 'g' : q.kind);
  recordAccuracy(ok);
  SESSION.stats[ok ? 'correct' : 'wrong']++;
  const retries = [];   // the 再練一次 copies this answer queues: 手滑 takes back exactly these
  if (itemOk) {
    const m = onCorrectForMistake(q);
    if (m && m.mastered) e.mistakeDone = true;
  } else {
    if (self) addMistake(self, self.options[1].text); else addMistake(q, jaPlain(q.options[i].text));
    if (!e.encore && q.kind !== 'l' && q.kind !== 'r') retries.push(queueRetry(e.item, e.mistake, q));   // no 再練一次 for listening and reading (see srsAnswer)
  }
  others.forEach(x => {   // 配對: another word paired wrong, answered wrong as if it had been asked (an encore leaves schedules alone)
    if (!e.encore) srsAnswer(x.key, false);
    recordFormat(state.srs[x.key], q.fmt, false);
    addMistake(x, x.options[1].text);
    if (!e.encore) retries.push(queueRetry(x.item, null, q));
  });
  if (e.undo) e.undo.retries = retries;
  SESSION.results.push({ key: q.key, ok, q, chosen: i, missed: e.missed, at: Date.now() });   // at: setPace
  const wait = cheer(e, ok);
  saveState();
  renderPractice();
  speakAnswered(q, wait);
}
// 1.0.50: the run of right answers (shown from three on, a miss ends it quietly) and the answer's sound; returns how long the
// sound lasts, so the word or sentence read after it does not play over it. Not in a 階段測驗.
function cheer(e, ok) {
  e.comboBefore = SESSION.combo || 0;   // 「手滑，不算」 gives it back
  SESSION.combo = e.combo = ok ? e.comboBefore + 1 : 0;
  return playSfx(!ok ? 'bad' : e.lvUp ? 'up' : 'ok', e.combo - 1);
}
// 再練一次: the item comes back 3–5 questions later, in another format when it has one (see prepareEntry)
function queueRetry(item, mistake, orig) {
  const at = Math.min(SESSION.entries.length, SESSION.idx + 3 + Math.floor(Math.random() * 3));
  const again = { item, mistake, requeued: true, orig };
  if (!item && orig) again.q = requeueQuestion(orig, shuffle(orig.options));   // a notebook card has no other format
  SESSION.entries.splice(at, 0, again);
  return again;
}
function speakAnswered(q, wait = 0) {
  // a kanji question has no sentence: it reads its example word (the reading asked, or the first example's), as 發音 does
  const text = q.fmt === 'v-meaning' || q.fmt === 'v-recall' || q.fmt === 'v-pic' || q.fmt === 'v-listen' || q.fmt === 'v-reading' || q.fmt === 'v-kanji' || (q.fmt && (q.fmt.startsWith('a-') || q.fmt.startsWith('k-'))) ? q.speakWord : q.fullJp;
  if (!text) return;
  if (!wait) { speak(text, speakOpts(q, text)); return; }
  const e = currentEntry();
  setTimeout(() => { if (SESSION && currentEntry() === e) speak(text, speakOpts(q, text)); }, wait);   // not once 下一題 or 結束 was pressed
}
function nextQuestion() {
  const e = currentEntry();
  if (!e || !e.done) return;
  SESSION.idx++;
  if (SESSION.idx < SESSION.entries.length) prepareEntry(SESSION.idx);
  renderPractice();
  window.scrollTo({ top: 0 });
}
function exitPractice() {
  stopSpeaking();
  const answered = SESSION ? SESSION.results.length : 0;
  if (SESSION && answered > 0 && SESSION.idx < SESSION.entries.length) {   // 結束 early: no 言靈 for the set
    // asked first (2026-11-11, the user): the answers so far are kept either way
    const left = SESSION.entries.length - SESSION.idx;
    if (!confirm(SESSION.test ? `階段測驗還有 ${left} 題。現在離開，這次測驗不會留下紀錄。確定要離開嗎？`
      : `這組還有 ${left} 題沒做。現在結束的話，已經答的 ${answered} 題會照樣記錄，但這組不會得到言靈。確定要結束嗎？`)) return;
    SESSION.quit = true; SESSION.idx = SESSION.entries.length; renderPractice(); return;
  }
  SESSION = null;
  document.body.classList.remove('practicing');
  go(lastMainRoute || '#/today');
  Sync.flushDeferred();
}

function renderSummary(view) {
  audioPrefetchSoon();   // the plan may have moved on (the next theme or unit, 入門 → 第 1 週): the next session's clips
  if (SESSION.test) { renderStageSummary(view); return; }
  const s = SESSION;
  const n = s.results.length;
  const acc = n ? Math.round(s.stats.correct / n * 100) : 0;
  const wrongKeys = new Map();
  s.results.filter(r => !r.ok).flatMap(r => r.missed && r.missed.length ? r.missed.map(x => ({ q: x, chosen: 1 })) : [r])   // 配對: one line per word paired wrong
    .forEach(r => { if (!wrongKeys.has(r.q.mistakePrompt)) wrongKeys.set(r.q.mistakePrompt, r); });
  const prog = dayProgress();   // same ring as 今日: items answered today / today's items
  const dayDone = prog.left === 0;
  const first = !s.summaryShown; s.summaryShown = true;   // 1.0.41: the ring and the numbers play once, not when a sync draws it again
  const gain = s.koto || (s.koto = earnKoto(s));   // 1.2.0: 言靈 for this set, worked out once
  const allRight = n >= 5 && !s.stats.wrong && !s.quit;   // 全對: a set of five or more without a miss
  const wrongList = [...wrongKeys.values()].map(r => `<div class="list-item"><div class="grow"><div class="jp">${furi(tidyPrompt(r.q.mistakePrompt || ''))}</div><div class="small muted">正確：<span class="jp">${esc(jaPlain(r.q.options[r.q.answer].text))}</span>・你選：<span class="jp">${esc(jaPlain(r.q.options[r.chosen].text))}</span></div></div></div>`).join('');
  view.innerHTML = `
    <div class="pr-top"><button type="button" class="btn btn-ghost btn-icon" data-act="close-summary" aria-label="關閉">${icon('close')}</button><div class="grow"></div></div>
    <div class="card">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="page-title${allRight ? ' all-right' : ''}">${allRight ? '全對！' : n ? '完成了' : '已結束'}</div>
          <div class="page-sub">${esc(s.title)}・作答 ${n} 題・正確率 ${acc}%</div>
        </div>
        ${ringHtml(ringPct(prog) / 100, `<b>${ringPct(prog)}%</b>`, 96, s.ringFrom == null ? null : s.ringFrom / 100)}
      </div>
      <div class="grid grid-4 mt-4">
        <div class="stat"><span class="stat-v">${s.stats.correct}</span><span class="stat-l">答對</span></div>
        <div class="stat"><span class="stat-v">${s.stats.wrong}</span><span class="stat-l">答錯</span></div>
        <div class="stat"><span class="stat-v">${s.stats.newCount}</span><span class="stat-l">新學</span></div>
        <div class="stat"><span class="stat-v">${Math.max(1, Math.round((Date.now() - s.startedAt) / 60000))}</span><span class="stat-l">分鐘</span></div>
      </div>
      ${harvestHtml(s, first)}
      ${gain.set || gain.day || gain.full ? `<div class="koto-gain${first ? ' pop' : ''}">${kotoIcon()}<span>言靈</span>${gain.set ? '<b>+1</b><span>做完一組</span>' : ''}${gain.set && gain.day ? '<i class="sep"></i>' : ''}${gain.day ? `<b>+${gain.day}</b><span>今日完成</span>` : ''}${gain.full ? '<span class="cap">今天作答的言靈拿滿了</span>' : ''}<span class="tot">共 <span class="num">${kotoBalance()}</span></span></div>` : ''}
      ${dayDone ? '<div class="banner mt-4">今天的進度完成了。答對的題目會在幾天後再出現，答錯的明天再複習。</div>' : `<div class="hint mt-4">${leftText(prog.left, s)}</div>`}
      <div class="row-wrap mt-4">
        <button type="button" class="btn btn-primary" data-act="again">再練一組</button>
        ${wrongKeys.size ? '<button type="button" class="btn" data-act="retry-wrong">重練答錯的題目</button>' : ''}
        <button type="button" class="btn btn-ghost" data-act="close-summary">回到首頁</button>
      </div>
    </div>
    ${wrongKeys.size ? `<div class="card"><div class="card-head"><div class="card-title">這次答錯的題目</div><span class="chip">${wrongKeys.size}</span></div><div class="list">${wrongList}</div></div>` : ''}`;
  if (first) { playAnims(view); countUp(view); summaryReward(view, gain, allRight); }
}
// what is left of today's list in sets and minutes (2026-11-11, the user): sets cut as buildDailyQueue cuts them (a small tail
// joins the set before it); minutes at this set's own pace — its time per item, encores, 再練一次 and cards included, each
// answer's wait capped at PACE_GAP_MAX so a pause does not count — left out when the set answered fewer than five items
const PACE_GAP_MAX = 90000;
function setsLeft(n, size = SESSION_SIZE) { let sets = 0; while (n > 0) { n -= size; sets++; if (n > 0 && (n <= 5 || n < size / 4)) n = 0; } return sets; }
function setPace(s) {
  const items = new Set(s.results.filter(r => !r.requeued).map(r => r.key || r.q.mistakePrompt)).size; if (items < 5) return 0;
  let ms = 0; let at = s.startedAt;
  s.results.forEach(r => { if (r.at) { ms += Math.min(r.at - at, PACE_GAP_MAX); at = r.at; } });
  return ms / items;
}
function minutesText(min) { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} 小時${m ? ` ${m} 分鐘` : ''}` : `${m} 分鐘`; }
function leftText(left, s) {
  const pace = setPace(s); const min = pace ? Math.max(1, Math.round(left * pace / 60000)) : 0;
  return `今天還有 ${left} 題，大約 ${setsLeft(left)} 組${min ? `、${minutesText(min)}` : ''}。`;
}
// 這組的收穫 (2026-11-10, the user: the summary should show what was won, and move): what rose to 熟悉 or 已熟練 in this set (the
// chip a right answer showed, 1.0.50) and what was met for the first time — words, grammar points, kanji, kana; the chips pop in
// one after another the first time it is drawn
const HARVEST_MAX = 12;
function harvestHtml(s, play) {
  const name = (it) => it.kind === 'v' ? jaPlain(it.w) : it.kind === 'g' ? String(it.pt || jaPlain(itemPreview(it))).split('（')[0] : it.kind === 'k' ? it.k : it.ch;
  const tip = (it) => it.kind === 'v' || it.kind === 'k' ? it.m || '' : '';
  const rows = [['熟悉', []], ['已熟練', []], ['新學', []]];
  const seen = new Set();
  s.entries.forEach(e => {
    if (!e.done || !e.item || !/^[vgka]$/.test(e.item.kind)) return;
    const row = e.lvUp ? rows.find(r => r[0] === e.lvUp) : e.srs && e.srs.isNew ? rows[2] : null;
    if (row && !seen.has(row[0] + e.item.key)) { seen.add(row[0] + e.item.key); row[1].push(e.item); }
  });
  let k = 0;
  const chip = (it, cls) => `<span class="chip${cls}" style="--i:${k++}" title="${esc(tip(it))}"><span class="jp">${esc(name(it))}</span></span>`;
  const html = rows.filter(([, list]) => list.length).map(([label, list]) => `<div class="harvest-row"><span class="harvest-l">${label === '新學' ? `新學 ${list.length}` : `升到${label}`}</span>
    ${list.slice(0, HARVEST_MAX).map(it => chip(it, label === '新學' ? '' : ' chip-accent')).join('')}${list.length > HARVEST_MAX ? `<span class="small muted">等 ${list.length} 個</span>` : ''}</div>`).join('');
  return html ? `<div class="harvest${play ? ' play' : ''}"><div class="harvest-h">這組的收穫</div>${html}</div>` : '';
}
// the summary's reward, played once: the 言靈 of the set fly from its +N into the total, which counts up as they land (as the witch's
// do into the 言靈 button); a set with no miss, or the day's list just done, gets confetti and a short fanfare. Motion reduced: none
function summaryReward(view, gain, allRight) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = view.querySelector('.koto-gain'), num = box && box.querySelector('.tot .num'), got = (gain.set || 0) + (gain.day || 0);
  if (num && got > 0) {
    const end = Number(num.textContent), from = end - got, n = Math.min(got, 10); let landed = 0;
    num.textContent = from;
    const go = ([x, y], sc) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(2)})`;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (!box.isConnected) return;
        const a = box.querySelector('b').getBoundingClientRect(), b = num.getBoundingClientRect();
        const p0 = [a.left + a.width / 2 + (i % 3 - 1) * 6, a.top + a.height / 2], p2 = [b.left + b.width / 2, b.top + b.height / 2], p1 = [(p0[0] + p2[0]) / 2, Math.min(p0[1], p2[1]) - 40 - (i % 4) * 6];
        const c = document.createElement('i'); c.className = 'koto-coin'; c.innerHTML = kotoIcon(); document.body.appendChild(c);
        const path = Array.from({ length: 13 }, (_, j) => { const t = j / 12, u = 1 - t;
          return { transform: go([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]], 0.6 + 0.4 * Math.sin(Math.PI * t)), opacity: 1 }; });
        c.animate(path, { duration: 600, easing: 'cubic-bezier(.45, 0, .8, .6)', fill: 'forwards' }).onfinish = () => {
          c.remove(); if (!num.isConnected) return;
          landed++; num.textContent = from + Math.round(got * landed / n);
          num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump');
          playSfx('coin', landed - 1);
        };
      }, 950 + i * 110);
    }
  }
  if (allRight || gain.dayNow) setTimeout(() => { if (!view.isConnected) return; confetti(view.querySelector('.page-title'), gain.dayNow ? 80 : 44); playSfx('fanfare'); }, 450);
}
// paper bits thrown up from an element and falling across the screen
function confetti(el, n) {
  if (!el) return;
  const r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const layer = document.createElement('div'); layer.className = 'confetti'; document.body.appendChild(layer);
  const colors = ['#f6c45a', '#5b8def', '#3fb68b', '#ef6f8e', '#a97ff0', '#ff9f43'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.style.background = colors[i % colors.length]; p.style.left = `${x0}px`; p.style.top = `${y0}px`;
    if (i % 3 === 0) p.style.borderRadius = '50%';
    layer.appendChild(p);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 140 + Math.random() * 220, dx = Math.cos(a) * v, up = Math.sin(a) * v, spin = (Math.random() - 0.5) * 900;
    p.animate([{ transform: 'translate(0, 0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx * 0.7}px, ${up}px) rotate(${spin / 3}deg)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${dx}px, ${innerHeight - y0 + 40}px) rotate(${spin}deg)`, opacity: 0.9 }], { duration: 1500 + Math.random() * 1000, easing: 'cubic-bezier(.25, .7, .45, 1)', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 2700);
}
// the summary's numbers count up from 0 (1.0.41); not with motion reduced, which the CSS rule at the top cannot reach for text
function countUp(root) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = [...root.querySelectorAll('.stat-v')].map(el => [el, Number(el.textContent)]);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 500), ease = 1 - (1 - k) ** 3;
    els.forEach(([el, n]) => { el.textContent = Math.round(n * ease); });
    if (k < 1) requestAnimationFrame(step);
  };
  step(t0);
}

// the 開始作答 button under a word preview or a lesson-section card (Enter also dismisses it)
function previewGoBtn() { return '<button type="button" class="btn btn-primary" data-act="preview-go" id="btnNext">開始作答 <span class="kbd kbd-hint" style="background:transparent;border-color:currentColor;color:inherit">Enter</span></button>'; }

// today's ring shows a percentage, never question counts (the button and 今天做了 carry those)
function ringPct(prog) { return prog.total ? Math.round(prog.done / prog.total * 100) : 100; }
// from: the ratio it fills from when played (playAnims); none, it never moves
function ringHtml(ratio, inner, size = 96, from = null) {
  const r = 42; const c = 2 * Math.PI * r;
  const anim = from === null ? '' : ` data-anim`, fromVar = from === null ? '' : `--from:${c * (1 - clamp(from, 0, 1))};`;
  return `<div class="ring"${anim} style="${fromVar}width:${size}px;height:${size}px"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--bg-sunken)" stroke-width="9"/><circle class="arc" cx="50" cy="50" r="${r}" fill="none" stroke="${ratio >= 1 ? 'var(--ok)' : 'var(--accent)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(ratio, 0, 1))}"/></svg><div class="ring-txt"><div>${inner}</div></div></div>`;
}
