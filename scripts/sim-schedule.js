#!/usr/bin/env node
/* Scheduling simulator for the tiers (1.0.20 spec §10; the 1.0.21 rules, rule-cuts spec §11).
   Usage: node scripts/sim-schedule.js [index.html] [--bulk N]
   Three learners (strong, middling, weak) study the whole course for 300 days and do everything each day's list holds:
   three stars and under by FSRS (at most SRS_DAILY_CAP a day) with the missed items on the 1/3/7 ladder on top, four and
   five stars as queues. --bulk N marks N items four stars on day 0 first, as a passed stage test does.
   One line each: new items a day, the day everything had been met, questions a day (overall, and for days 1–30, 31–100,
   101–200, 201–300), the notebook, and how much they would remember on the exam morning. Rerun it, with and without
   --bulk 2000, after changing the 5% / 3% / 50 / new-count numbers. Not part of test.sh.
   The FSRS functions and the constants are lifted out of index.html by name, not copied, so they follow the app. The rest
   mirrors the app by hand: srsAnswer, tierOf, computeDailyPlan, newCountToday and splitNew. Not modelled: listening and
   reading (outside the queues), hand-made notebook entries, the 再練一次 and encore repeats, 入門 (kana, PRE_N5 words and
   week-0 grammar are plain items here, so nothing leaves for good), and the gates that hold N4 words, N4 kanji and later
   grammar units back (they only change the order of items that are all alike). */
'use strict';
const fs = require('fs');
const path = require('path');

const DAYS = 300;            // days of practice; the exam is the morning after the last one
const SEED = 20261030;
// 3550 items: what the app's registry holds in the kinds that take part in the queues (counts of data.js 15 and the kana
// tables; update them when the course grows). The banks share each day's new items by what each has left, like splitNew.
const BANKS = { v: 1661, g: 1397, k: 342, a: 142 };   // 單字, 文法, 漢字, 假名
const DRILLS = 8;                                      // 變化練習: one new family a day, outside the day's new count
// actual recall = R^exp, R being the app's own forecast for the item; first: the chance a first answer is right
const LEARNERS = [
  { name: '強', exp: 0.6, first: 0.90 },
  { name: '中', exp: 1.0, first: 0.80 },
  { name: '弱', exp: 1.8, first: 0.65 }
];

// what is lifted from index.html (clamp and hashStr are fsrsDays' helpers)
const CONSTANTS = ['FSRS_W', 'FSRS_DECAY', 'FSRS_FACTOR', 'RETENTION', 'LEVEL_FROM_S', 'RELEARN_GAPS', 'SRS_DAILY_CAP', 'QUEUE_RATE', 'QUEUE_MIN', 'QUEUE_MAX',
  'NEW_STEPS', 'NEW_DEFAULT', 'NEW_MIN', 'NEW_MAX', 'RECENT_MAX'];
const FUNCTIONS = ['clamp', 'hashStr', 'levelFromS', 'fsrsD0', 'fsrsR', 'fsrsInterval', 'fsrsNext', 'fsrsDays'];

// a top-level declaration of index.html: a const ends at its `;`, a one-line function on its own line, a block function at
// the first bare `}`
function grab(lines, name) {
  const at = lines.findIndex(l => new RegExp('^(?:const|function) ' + name + '\\b').test(l));
  if (at < 0) return null;
  const block = lines[at].startsWith('function') && /\{\s*(\/\/.*)?$/.test(lines[at]);
  const stop = lines[at].startsWith('const') ? /;\s*(\/\/.*)?$/ : block ? /^\}$/ : /\}\s*(\/\/.*)?$/;
  let end = at;
  while (end < lines.length && !stop.test(lines[end])) end++;
  return end < lines.length ? lines.slice(at, end + 1).join('\n') : null;
}
// returns bind(): the lifted code (nothing in it reads the app's state)
function lift(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const names = CONSTANTS.concat(FUNCTIONS);
  const code = names.map(n => grab(lines, n));
  const missing = names.filter((n, i) => code[i] === null);
  if (missing.length) { console.error(`sim-schedule: 在 ${file} 找不到 ${missing.join('、')}`); process.exit(1); }
  const body = code.join('\n') + `\nreturn { ${names.join(', ')} };`;
  try { new Function(body); } catch (e) { console.error(`sim-schedule: 從 ${file} 抓到的程式不能執行：${e.message}`); process.exit(1); }
  return () => new Function(body)();
}

function mulberry32(a) {
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function simulate(bind, L, bulk) {
  const { clamp, levelFromS, fsrsR, fsrsNext, fsrsDays, LEVEL_FROM_S, RELEARN_GAPS, SRS_DAILY_CAP, QUEUE_RATE, QUEUE_MIN, QUEUE_MAX,
    NEW_STEPS, NEW_DEFAULT, NEW_MIN, NEW_MAX, RECENT_MAX } = bind();
  const rnd = mulberry32(SEED);
  // the registry's order (words, grammar, kanji, kana, drills): a sort keeps it for ties, as in the app. A bank hands out
  // its items in order; `met` of them have been seen.
  const bank = {};
  for (const kind of Object.keys(BANKS).concat('c')) {
    bank[kind] = { met: 0, list: Array.from({ length: kind === 'c' ? DRILLS : BANKS[kind] }, (_, i) => ({ kind, key: `${kind}:${i}`, r: null })) };
  }
  const items = [].concat(...Object.values(bank).map(b => b.list));
  const left = (kind) => bank[kind].list.length - bank[kind].met;
  // --bulk: day 0's stage pass sets the first items of each bank (shared by bank size) to four stars, as bulkApply writes a
  // new record (difficulty 4); the four-star queue does not read the date
  if (bulk) {
    const total = Object.values(BANKS).reduce((a, b) => a + b, 0);
    for (const kind of Object.keys(BANKS)) {
      const n = Math.min(BANKS[kind], Math.round(bulk * BANKS[kind] / total));
      bank[kind].list.slice(0, n).forEach(it => { it.r = { s: LEVEL_FROM_S[3], d: 4, b: levelFromS(LEVEL_FROM_S[3]), last: 0, due: fsrsDays(LEVEL_FROM_S[3], it.key) }; });
      bank[kind].met = n;
    }
  }
  const recent = [];   // state.recent: the last RECENT_MAX answers, 1 = right

  // tierOf: three stars and under, or on the 1/3/7 ladder, follow FSRS dates; four and five stars are queues
  const tierOf = (r) => (!r ? 'new' : typeof r.rl === 'number' || r.b <= 3 ? 'srs' : r.b === 4 ? 'q4' : 'q5');
  const byDue = (a, b) => (a.r.due - b.r.due) || (a.r.b - b.r.b);
  const byLast = (a, b) => a.r.last - b.r.last;   // the longest-waiting first; a notebook entry's date is its item's last answer
  const share = (len, rate) => (len ? clamp(Math.round(len * rate), QUEUE_MIN, QUEUE_MAX) : 0);

  // splitNew: n new items shared by what each bank has left (largest remainder); a bank short of items passes its slots on
  function splitNew(n) {
    const kinds = Object.keys(BANKS);
    const total = kinds.reduce((s, k) => s + left(k), 0);
    if (n <= 0 || !total) return [];
    const raw = {}; const take = {};
    kinds.forEach(k => { raw[k] = n * left(k) / total; take[k] = Math.floor(raw[k]); });
    let more = n - kinds.reduce((s, k) => s + take[k], 0);
    [...kinds].sort((x, y) => (raw[y] - take[y]) - (raw[x] - take[x])).forEach(k => { if (more > 0) { take[k]++; more--; } });
    let spare = 0;
    kinds.forEach(k => { const short = Math.max(0, take[k] - left(k)); take[k] -= short; spare += short; });
    [...kinds].sort((x, y) => left(y) - left(x)).forEach(k => { const add = Math.min(spare, left(k) - take[k]); take[k] += add; spare -= add; });
    return kinds.flatMap(k => bank[k].list.slice(bank[k].met, bank[k].met + take[k]));
  }
  // newCountToday: by the last RECENT_MAX answers (under 30 of them: NEW_DEFAULT), one less for every ten notebook entries
  function newCountToday(entries) {
    const acc = recent.length < 30 ? null : recent.reduce((a, b) => a + b, 0) / recent.length;
    const base = acc === null ? NEW_DEFAULT : NEW_STEPS.find(([min]) => acc >= min)[1];
    return clamp(base - Math.floor(entries / 10), NEW_MIN, NEW_MAX);
  }

  // srsAnswer on day t, without what the schedule never reads (counters, the date shown, leeches)
  function srsAnswer(it, correct, t) {
    const isNew = !it.r;
    const r = it.r || (it.r = { b: 0, due: t, last: null });
    const dueBefore = r.due;
    const g = correct ? 3 : 1;
    const elapsed = r.last === null ? 0 : t - r.last;
    const reviewed = !isNew && r.due <= t;   // a due review (not a first look, not early practice): only these move the ladder on
    fsrsNext(r, g, elapsed);
    if (isNew && g === 3 && it.kind === 'v') r.s = Math.min(r.s, 1);   // a new word's first check is tomorrow
    r.b = g === 1 ? Math.min(levelFromS(r.s), 1) : levelFromS(r.s);
    r.due = t + (g === 1 ? 1 : fsrsDays(r.s, it.key));
    // the 1/3/7 ladder: a miss starts it over; a right answer on or after its day moves it on, an earlier one is extra practice
    if (g === 1) r.rl = 0;
    else if (typeof r.rl === 'number' && !reviewed) r.due = dueBefore;
    else if (typeof r.rl === 'number') { if (r.rl < RELEARN_GAPS.length) { r.due = t + RELEARN_GAPS[r.rl]; r.rl++; } else delete r.rl; }
    r.last = t;
  }

  const stat = { questions: [], fresh: [], book: [], finished: 0 };
  for (let t = 1; t <= DAYS; t++) {
    // computeDailyPlan: three stars and under that are due — the missed items on the 1/3/7 ladder all, the others at most
    // SRS_DAILY_CAP, the most overdue first; four and five stars give a share each, the longest-waiting first
    const met = items.filter(it => it.r);
    const onLadder = (it) => typeof it.r.rl === 'number';   // the notebook holds exactly the items on the ladder
    const dueAll = met.filter(it => tierOf(it.r) === 'srs' && it.r.due <= t && it.r.last !== t).sort(byDue);
    const due = dueAll.filter(onLadder).concat(dueAll.filter(it => !onLadder(it)).slice(0, SRS_DAILY_CAP));
    const queue = (tier) => { const q = met.filter(it => tierOf(it.r) === tier && it.r.last !== t).sort(byLast); return q.slice(0, share(q.length, QUEUE_RATE[tier])); };
    const q4 = queue('q4'); const q5 = queue('q5');
    const book = met.filter(onLadder);
    const fresh = splitNew(newCountToday(book.length));
    const drill = bank.c.list.slice(bank.c.met, bank.c.met + 1);

    // the day's work: the reviews, then the new items
    const today = due.concat(q4, q5, fresh, drill);
    for (const it of today) {
      const right = rnd() < (it.r ? Math.pow(fsrsR(t - it.r.last, it.r.s), L.exp) : L.first);
      srsAnswer(it, right, t);
      recent.push(right ? 1 : 0); if (recent.length > RECENT_MAX) recent.shift();
    }
    fresh.concat(drill).forEach(it => { bank[it.kind].met++; });
    stat.questions.push(today.length); stat.fresh.push(fresh.length + drill.length); stat.book.push(book.length);
    if (!stat.finished && items.every(it => it.r)) stat.finished = t;
  }
  // the exam morning, before any practice that day
  const known = items.filter(it => it.r);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const recall = mean(known.map(it => Math.pow(fsrsR(DAYS + 1 - it.r.last, it.r.s), L.exp)));
  const windows = [[1, 30], [31, 100], [101, 200], [201, 300]].map(([a, b]) => Math.round(mean(stat.questions.slice(a - 1, b))));
  return { newPerDay: mean(stat.fresh.slice(0, stat.finished || DAYS)), finished: stat.finished, known: known.length,
    questions: mean(stat.questions), mostQuestions: Math.max(...stat.questions), windows, book: mean(stat.book), recall };
}

const args = process.argv.slice(2);
const at = args.indexOf('--bulk');
const bulk = at < 0 ? 0 : Number(args[at + 1]);
if (at >= 0 && !(Number.isInteger(bulk) && bulk > 0)) { console.error('sim-schedule: --bulk 後面要接正整數，例如 --bulk 2000'); process.exit(1); }
const file = path.resolve(args.filter((x, i) => at < 0 || (i !== at && i !== at + 1))[0] || path.join(__dirname, '..', 'index.html'));
if (!fs.existsSync(file)) { console.error(`sim-schedule: 找不到 ${file}`); process.exit(1); }
const bind = lift(file);
if (bulk) console.log(`第 0 天先把 ${bulk} 題標成四顆（像通過階段測驗），之後照常學：`);
for (const L of LEARNERS) {
  const s = simulate(bind, L, bulk);
  const done = s.finished ? `第 ${s.finished} 天學完` : `${DAYS} 天內沒學完（學了 ${s.known} 題）`;
  console.log(`${L.name}（記得 R^${L.exp}・首答 ${Math.round(L.first * 100)}%）：新題每天 ${s.newPerDay.toFixed(1)} 題・${done}・每天平均 ${Math.round(s.questions)} 題（第 1–30／31–100／101–200／201–300 天 ${s.windows.join('／')}）、最多 ${s.mostQuestions} 題・錯題本平均 ${Math.round(s.book)} 條・考試日平均記得 ${(s.recall * 100).toFixed(1)}%`);
}
