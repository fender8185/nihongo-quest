#!/usr/bin/env node
/* The answer's length among its options (2026-11-22): a learner who always picks the longest option should do no better than chance.
   For every set of hand-written options — listening by level and kind (dialog 4 options, 即時應答 and 情境表達 3), reading by level,
   換句話說 (a word's `ip`) by level — the share of items whose answer is the uniquely longest option (counted without [readings]) must
   stay within five points of one in the number of options. Sets under 20 items are only reported.
   Usage: node scripts/check-option-lengths.js   (scripts/test.sh); exit 1 when a set is over. */
'use strict';
const D = require('./data-file').load();
const len = (s) => String(s).replace(/\[[^\]]*\]/g, '').length;
const sets = new Map();
const add = (key, a, op) => { if (!Array.isArray(op) || !op.includes(a)) return; const s = sets.get(key) || sets.set(key, { n: 0, long: 0, short: 0, opts: op.length }).get(key);
  const mx = Math.max(...op.map(len)), mn = Math.min(...op.map(len)); s.n++;
  if (len(a) === mx && op.filter(o => len(o) === mx).length === 1) s.long++;
  if (len(a) === mn && op.filter(o => len(o) === mn).length === 1) s.short++; };
(D.LISTEN || []).forEach(x => add(`聽力 ${x.lv} ${x.t}`, x.a, x.op));
(D.READ || []).forEach(x => add(`閱讀 ${x.lv}`, x.a, x.op));
(D.VOCAB || []).forEach(v => { if (v.ip) add(`換句話說 ${v.lv === 'PRE_N5' ? 'N5' : v.lv}`, v.ip.a, [v.ip.a].concat(v.ip.d || [])); });
const over = [];
for (const [key, s] of sets) {
  const limit = 1 / s.opts + 0.05;
  if (s.n >= 20 && s.long / s.n > limit) over.push(`${key}: the answer is the longest option in ${s.long} of ${s.n} (limit ${Math.floor(limit * s.n)})`);
}
over.forEach(x => console.log(x));
console.log(`${sets.size} option sets checked; ${over.length ? `over the limit: ${over.map(x => x.split(':')[0]).join(', ')}` : 'no set lets the longest option beat chance'}`);   // test.sh shows this line only
process.exit(over.length ? 1 : 0);
