// Checks the town's people, chat and events (events.js) against the course (data.js): every kanji is in a ruby mark, a word above
// the event's level or not in the course carries a Chinese gloss ({漢字|かな|中文}) unless it is a name, a reply choice practises
// grammar from its unit or before and has a right answer and a wrong one with its reason, the people, places and earlier events
// named exist, each event's person is at its place by their hours (on a spot that is drawn) — and at one of the hours a sleep wakes
// to (TOWN.WAKE), on weekdays and at the weekend — and no unit is skipped up to the last one written.
// usage: node scripts/check-events.js   — one line a problem, exit 1 when there is any (scripts/test.sh)
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'events.js');
const LEVELS = ['PRE_N5', 'N5', 'N4', 'N3', 'N2', 'N1'];
const PLACES = ['beach', 'town', 'shokudo', 'izakaya'];   // the places index.html draws people in (events.js TOWN.PLACES)
const KANJI = /[㐀-鿿豈-﫿々〆]/;
const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;

function loadTown(file = FILE) { return new Function(fs.readFileSync(file, 'utf8') + '\n;return TOWN;')(); }

// what the hero can wear (古道具屋's wear and clothes): a chat line may be about one (when.look)
function loadWares(file = path.join(__dirname, '..', 'js', '71d_wares.js')) {
  return new Set([...fs.readFileSync(file, 'utf8').matchAll(/\{ id: '([a-zA-Z0-9]+)', kind: '(?:wear|clothes)'/g)].map((m) => m[1]));
}

// opts: chatMin — the fewest chat lines each person has (two with no condition by their first event's unit); wares — loadWares()
function check(T, D, opts = {}) {
  const out = [], bad = (kind, where, what) => out.push(`${kind}: ${where}: ${what}`);
  const units = ['m0'].concat(D.UNITS.map(u => u.id).filter(id => id !== 'm0'));
  const unitIdx = (u) => units.indexOf(u);
  const unitLv = (u) => (u === 'm0' ? 'PRE_N5' : (D.UNITS.find(x => x.id === u) || {}).lv);
  const gUnit = Object.fromEntries((D.GRAMMAR || []).map(g => [g.id, g.u]));
  const names = new Set(T.NAMES || []), cast = T.CAST || {}, places = T.PLACES || PLACES;
  const lvOf = (w, r) => {   // the lowest level a word in the course has, by its kanji and reading; -1 not in the course
    let best = -1;
    const hit = (v) => v.w === w || (v.w.startsWith(w) && String(v.r).startsWith(r)) || ['お', 'ご'].some((p) => v.w === p + w || (v.w.startsWith(p + w) && String(v.r).startsWith(p + r)));   // お風呂 written お{風呂|ふろ}
    D.VOCAB.forEach(v => { if (hit(v)) { const L = LEVELS.indexOf(v.lv); if (L >= 0 && (best < 0 || L < best)) best = L; } });
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
  // a talk's lines ([who, Japanese, Chinese]) and reply choices ({ ask, opts, pt }), written for unit u
  function talkLines(ls, u, where, sayer) {
    (ls || []).forEach((l, i) => {
      const at = `${where}#${i}`;
      if (Array.isArray(l)) { sayer(l[0], at); text(l[1], u, at); return; }
      const pu = /^m\d+$/.test(l.pt) ? l.pt : gUnit[l.pt];
      if (!pu) bad('ref', at, `no grammar ${l.pt}`);
      else if (unitIdx(pu) > unitIdx(u)) bad('grammar', at, `${l.pt} is ${pu}, after ${u}`);
      const opts = l.opts || [];
      if (!opts.some(o => o[1]) || !opts.some(o => !o[1])) bad('choice', at, 'needs a right answer and a wrong one');
      opts.forEach((o) => { if (!o[1] && !o[2]) bad('choice', at, `no reason why ${o[0]} is wrong`); text(o[0], u, at); });
    });
  }
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
    if (T.WAKE && cast[e.who]) {   // a sleep can take one there: at one of the hours woken to, on a weekday and at the weekend
      const at = (we) => T.WAKE.some((h) => (cast[e.who].hours || []).some(([a, b, p, , d]) => p === e.at && (!d || (d === 'we') === we) && (a <= b ? h >= a && h < b : h >= a || h < b)));
      if (!at(false) || !at(true)) bad('wake', where, `${e.who} is not at ${e.at} at any of the hours woken to (${T.WAKE.join(', ')})`);
    }
    const before = e.after && (T.EVENTS || []).find(x => x.id === e.after);
    if (e.after && !before) bad('ref', where, `no event ${e.after} before it`);
    else if (before && before.when === 'night') bad('night-chain', where, `follows ${e.after}, which only happens at night`);
    talkLines(e.lines, e.u, where, who);
  });
  if (used.size) { const lo = Math.min(...used), hi = Math.max(...used); for (let i = lo; i <= hi; i++) if (!used.has(i)) bad('gap', units[i], 'no events'); }
  // the cruise ship (CRUISE): its passengers, what they say (all at its unit), its stops one after another
  const cr = T.CRUISE;
  if (cr && unitIdx(cr.u) < 0) bad('ref', 'cruise', `no unit ${cr.u}`);
  else if (cr) {
    const people = cr.PEOPLE || {}, u = cr.u;
    const sayer = (id, where) => { if (id !== 'hero' && id !== 'all' && !cast[id] && !people[id]) bad('ref', where, `no one called ${id}`); };
    text(cr.ship || '', u, 'cruise ship');
    Object.keys(people).forEach((id) => {
      if (cast[id]) bad('cruise', `cruise ${id}`, 'a passenger with a town person\'s id');
      if (!(cr.OFF || {})[id]) bad('cruise', `cruise ${id}`, 'never comes off the ship (OFF)');
    });
    Object.entries(cr.OFF || {}).forEach(([id, l]) => { if (!people[id]) bad('ref', `cruise off ${id}`, 'not a passenger'); text(l[0], u, `cruise off ${id}`); });
    Object.entries(cr.SAY || {}).forEach(([id, ls]) => ls.forEach((l, i) => { sayer(id, `cruise say ${id}#${i}`); text(l[0], u, `cruise say ${id}#${i}`); }));
    const stops = new Set();
    (cr.TOUR || []).forEach((t) => {
      const where = `cruise ${t.id}`;
      if (stops.has(t.id)) bad('ref', where, 'the same id twice'); stops.add(t.id);
      if (!places.includes(t.at)) bad('ref', where, `no place ${t.at}`);
      ['hero', 'crowd'].forEach((k) => { if (!Array.isArray(t[k]) || t[k].length !== 2 || !t[k].every(Number.isFinite)) bad('cruise', where, `${k} is [X, Y]`); });
      if (t.lost && (!people[t.lost[0]] || !Array.isArray(t.lost[1]))) bad('cruise', where, 'lost is [a passenger, [X, Y]]');
      if (t.need !== undefined && !cast[t.need]) bad('ref', where, `needs no one called ${t.need}`);
      talkLines(t.lines, u, where, sayer);
      (t.after || []).forEach(([id, ja], i) => { sayer(id, `${where}.after${i}`); text(ja, u, `${where}.after${i}`); });
    });
    const tour = cr.TOUR || [];
    if (tour.length && (tour[0].at !== 'harbor' || tour[tour.length - 1].at !== 'harbor' || !tour[tour.length - 1].bye)) bad('cruise', 'cruise', 'the tour begins at the harbour and ends there, seeing them off (bye)');
  }
  Object.entries(cast).forEach(([id, c]) => {   // away after an event that exists; helps at a shop someone keeps
    if (c.away !== undefined && !ids.has(c.away)) bad('ref', `cast ${id}`, `away after no event ${c.away}`);
    if (c.helps !== undefined && !Object.values(cast).some((o) => o.shop === c.helps)) bad('ref', `cast ${id}`, `helps at no shop ${c.helps}`);
  });
  // a line's conditions (TOWNEV.chatLine, TOWNLIFE: CHATPICK.ok): each one known, and what it names there
  const PARTS = ['am', 'noon', 'pm', 'night'], FESTS = ['halloween'], WHEN = ['at', 'h', 'days', 'after', 'before', 'fresh', 'talks', 'look', 'fest', 'about'];
  const list = (v) => (Array.isArray(v) ? v : [v]);
  function when(c, where) {
    if (c === undefined) return;
    if (!c || typeof c !== 'object' || Array.isArray(c)) { bad('when', where, 'not an object'); return; }
    Object.keys(c).forEach((k) => { if (!WHEN.includes(k)) bad('when', where, `no condition ${k}`); });
    if (c.at !== undefined) list(c.at).forEach((p) => { if (!places.includes(p)) bad('when', where, `no place ${p}`); });
    if (c.h !== undefined) list(c.h).forEach((h) => { if (!PARTS.includes(h)) bad('when', where, `no time of day ${h} (${PARTS.join(', ')})`); });
    if (c.days !== undefined && !['wd', 'we'].includes(c.days)) bad('when', where, `days is wd or we, not ${c.days}`);
    ['after', 'before', 'fresh'].forEach((k) => { if (c[k] !== undefined && !ids.has(c[k])) bad('when', where, `no event ${c[k]}`); });
    if (c.talks !== undefined && !(Number.isInteger(c.talks) && c.talks > 0)) bad('when', where, `talks is a count, not ${c.talks}`);
    if (c.look !== undefined && !['any', 'hair'].includes(c.look) && !(opts.wares && opts.wares.has(c.look))) bad('when', where, `look is any, hair or a thing to wear, not ${c.look}`);
    if (c.fest !== undefined && !FESTS.includes(c.fest)) bad('when', where, `no festival ${c.fest}`);
    if (c.about !== undefined && !cast[c.about]) bad('when', where, `no one called ${c.about}`);
  }
  // a line said when nothing is on (CHAT), muttered (MUTTER): [unit, Japanese, Chinese, when?]
  const said = (kind, id, l, i) => { const at = `${kind} ${id}#${i}`; if (unitIdx(l[0]) < 0) bad('ref', at, `no unit ${l[0]}`); else text(l[1], l[0], at); when(l[3], at); };
  Object.entries(T.CHAT || {}).forEach(([id, ls]) => { who(id, `chat ${id}`); ls.forEach((l, i) => said('chat', id, l, i)); });
  Object.entries(T.MUTTER || {}).forEach(([id, ls]) => { who(id, `mutter ${id}`); ls.forEach((l, i) => said('mutter', id, l, i)); });
  // two who talk to each other (TOWN.PAIRS: [[a, b], unit, [[who, Japanese], …], when?]) are somewhere at the same hour
  const whereAt = (id, h, we) => { const r = ((cast[id] || {}).hours || []).find(([a, b, , , d]) => (!d || (d === 'we') === we) && (a <= b ? h >= a && h < b : h >= a || h < b)); return r ? r[2] : null; };
  (T.PAIRS || []).forEach(([two, u, ls, c], i) => {
    const at = `pair ${(two || []).join('/')}#${i}`;
    if (!Array.isArray(two) || two.length !== 2 || !two.every((id) => cast[id])) { bad('pair', at, 'needs two people of the town'); return; }
    if (unitIdx(u) < 0) { bad('ref', at, `no unit ${u}`); return; }
    if (![false, true].some((we) => Array.from({ length: 24 }, (_, h) => h).some((h) => { const p = whereAt(two[0], h, we); return p && p === whereAt(two[1], h, we); }))) bad('pair', at, 'never at the same place at the same hour');
    (ls || []).forEach((l, k) => { if (!two.includes(l[0])) bad('pair', `${at}.${k}`, `${l[0]} is not one of the two`); text(l[1], u, `${at}.${k}`); });
    when(c, at);
  });
  // 「……」 now and then, not in every other line (2026-11-12, the user: 大部分的居民好像很愛說…)
  const dots = (ls, cap, where) => { const n = ls.filter((j) => j).length, k = ls.filter((j) => j && j.includes('……')).length; if (n && k / n > cap) bad('ellipsis', where, `${k} of ${n} lines (${Math.round(k / n * 100)}%) say ……, at most ${Math.round(cap * 100)}%`); };
  dots((T.EVENTS || []).flatMap((e) => (e.lines || []).filter((l) => Array.isArray(l) && l[0] !== 'hero').map((l) => l[1])), 0.12, 'events');
  dots(Object.values(T.CHAT || {}).flatMap((ls) => ls.map((l) => l[1])), 0.10, 'chat');
  // how far people stroll about a spot (TOWNLIFE): 0, or [X, Y]
  Object.entries(spots).forEach(([p, ss]) => Object.entries(ss).forEach(([k, sp]) => {
    if (sp.roam !== undefined && sp.roam !== 0 && !(Array.isArray(sp.roam) && sp.roam.length === 2 && sp.roam.every((v) => Number.isFinite(v) && v >= 0))) bad('roam', `${p}.${k}`, 'roam is 0 or [X, Y]');
  }));
  // everyone has things to say, two of them as soon as they are met (by their first event's unit; 小春, ムギ come to the door first)
  if (opts.chatMin) Object.entries(cast).forEach(([id, c]) => {
    if (!(c.hours || []).length) return;   // the grandmother: in her letters only
    const ls = (T.CHAT || {})[id] || [], ev = (T.EVENTS || []).find((e) => e.who === id || (e.lines || []).some((l) => Array.isArray(l) && l[0] === id));
    const first = c.art === 'npc' ? 0 : ev ? unitIdx(ev.u) : Infinity, plain = ls.filter((l) => !l[3] && unitIdx(l[0]) <= first).length;
    if (ls.length < opts.chatMin || plain < 2) bad('chat-min', `chat ${id}`, `${ls.length} lines, ${plain} with no condition by their first unit: at least ${opts.chatMin} and 2`);
  });
  return out;
}

module.exports = { check, loadTown, loadWares, PLACES };

if (require.main === module) {
  const probs = check(loadTown(), require('./data-file').load(), { chatMin: 10, wares: loadWares() });
  probs.forEach(p => console.log(p));
  const T = loadTown();
  console.log(probs.length ? `${probs.length} problems` : `events ok: ${(T.EVENTS || []).length} events, ${Object.keys(T.CAST).length} people`);
  process.exit(probs.length ? 1 : 0);
}
