// Checks the town's people, chat and events (events.js) against the course (data.js): every kanji is in a ruby mark, a word above
// the event's level or not in the course carries a Chinese gloss ({漢字|かな|中文}) unless it is a name, a reply choice practises
// grammar from its unit or before and has a right answer and a wrong one with its reason, the people, places and earlier events
// named exist, each event's person is at its place by their hours (on a spot that is drawn), and no unit is skipped up to the last
// one written.
// usage: node scripts/check-events.js   — one line a problem, exit 1 when there is any (scripts/test.sh)
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'events.js');
const LEVELS = ['PRE_N5', 'N5', 'N4', 'N3', 'N2', 'N1'];
const PLACES = ['beach', 'town', 'shokudo', 'izakaya'];   // the places index.html draws people in (events.js TOWN.PLACES)
const KANJI = /[㐀-鿿豈-﫿々〆]/;
const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;

function loadTown(file = FILE) { return new Function(fs.readFileSync(file, 'utf8') + '\n;return TOWN;')(); }

function check(T, D) {
  const out = [], bad = (kind, where, what) => out.push(`${kind}: ${where}: ${what}`);
  const units = ['m0'].concat(D.UNITS.map(u => u.id).filter(id => id !== 'm0'));
  const unitIdx = (u) => units.indexOf(u);
  const unitLv = (u) => (u === 'm0' ? 'PRE_N5' : (D.UNITS.find(x => x.id === u) || {}).lv);
  const gUnit = Object.fromEntries((D.GRAMMAR || []).map(g => [g.id, g.u]));
  const names = new Set(T.NAMES || []), cast = T.CAST || {}, places = T.PLACES || PLACES;
  const lvOf = (w, r) => {   // the lowest level a word in the course has, by its kanji and reading; -1 not in the course
    let best = -1;
    D.VOCAB.forEach(v => { if (v.w === w || (v.w.startsWith(w) && String(v.r).startsWith(r))) { const L = LEVELS.indexOf(v.lv); if (L >= 0 && (best < 0 || L < best)) best = L; } });
    return best;
  };
  function text(ja, u, where) {
    if (KANJI.test(ja.replace(MARK, ''))) bad('bare-kanji', where, ja);
    const cap = LEVELS.indexOf(unitLv(u));
    for (const [, w, r, gloss] of ja.matchAll(MARK)) {
      if (gloss || names.has(w)) continue;
      const L = lvOf(w, r);
      if (L < 0) bad('unknown', where, `${w}（${r}）not in the course: gloss it`);
      else if (L > cap) bad('level', where, `${w}（${r}）is ${LEVELS[L]}: gloss it`);
    }
  }
  const who = (id, where) => { if (id !== 'hero' && !cast[id]) bad('ref', where, `no one called ${id}`); };
  const spots = T.SPOTS || {};
  Object.entries(cast).forEach(([id, c]) => (c.hours || []).forEach(([, , place, spot]) => {   // everyone's hours put them on a spot that is drawn
    if (!places.includes(place)) bad('ref', `cast ${id}`, `no place ${place} drawn yet`);
    else if (!spots[place] || !spots[place][spot]) bad('host', `cast ${id}`, `no spot ${place}.${spot}`);
  }));
  const ids = new Set(), used = new Set();
  (T.EVENTS || []).forEach((e) => {
    const where = e.id;
    if (ids.has(e.id)) bad('ref', where, 'the same id twice'); ids.add(e.id);
    if (unitIdx(e.u) < 0) { bad('ref', where, `no unit ${e.u}`); return; }
    used.add(unitIdx(e.u));
    if (!cast[e.who]) bad('ref', where, `no one called ${e.who} to host it`);
    if (!places.includes(e.at)) bad('ref', where, `no place ${e.at} drawn yet`);
    else if (cast[e.who] && !(cast[e.who].hours || []).some((h) => h[2] === e.at && spots[e.at] && spots[e.at][h[3]])) bad('host', where, `${e.who} is never at ${e.at} by their hours`);
    if (e.after && !(T.EVENTS || []).some(x => x.id === e.after)) bad('ref', where, `no event ${e.after} before it`);
    (e.lines || []).forEach((l, i) => {
      const at = `${where}#${i}`;
      if (Array.isArray(l)) { who(l[0], at); text(l[1], e.u, at); return; }
      const pu = /^m\d+$/.test(l.pt) ? l.pt : gUnit[l.pt];
      if (!pu) bad('ref', at, `no grammar ${l.pt}`);
      else if (unitIdx(pu) > unitIdx(e.u)) bad('grammar', at, `${l.pt} is ${pu}, after ${e.u}`);
      const opts = l.opts || [];
      if (!opts.some(o => o[1]) || !opts.some(o => !o[1])) bad('choice', at, 'needs a right answer and a wrong one');
      opts.forEach((o) => { if (!o[1] && !o[2]) bad('choice', at, `no reason why ${o[0]} is wrong`); text(o[0], e.u, at); });
    });
  });
  if (used.size) { const lo = Math.min(...used), hi = Math.max(...used); for (let i = lo; i <= hi; i++) if (!used.has(i)) bad('gap', units[i], 'no events'); }
  Object.entries(T.CHAT || {}).forEach(([id, ls]) => {
    who(id, `chat ${id}`);
    ls.forEach((l, i) => { if (unitIdx(l[0]) < 0) bad('ref', `chat ${id}#${i}`, `no unit ${l[0]}`); else text(l[1], l[0], `chat ${id}#${i}`); });
  });
  return out;
}

module.exports = { check, loadTown, PLACES };

if (require.main === module) {
  const probs = check(loadTown(), require('./data-file').load());
  probs.forEach(p => console.log(p));
  const T = loadTown();
  console.log(probs.length ? `${probs.length} problems` : `events ok: ${(T.EVENTS || []).length} events, ${Object.keys(T.CAST).length} people`);
  process.exit(probs.length ? 1 : 0);
}
