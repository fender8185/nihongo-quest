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

// what a cruise line may sound with (snd: SND's — made in js/82_sound.js, its name quoted when it has a dash: 'door-chime', or a
// file in sounds/) or say instead of being read out (cry: VOICE_FX in js/80_tts.js)
const ROOT = path.join(__dirname, '..');
const SOUNDS = new Set([...fs.readdirSync(path.join(ROOT, 'sounds')).map((f) => (/^(.+)-\d+\.m4a$/.exec(f) || [])[1]).filter(Boolean),
  ...[...fs.readFileSync(path.join(ROOT, 'js', '82_sound.js'), 'utf8').matchAll(/^ {4}'?([\w-]+)'?: \(c, to, v\)/gm)].map((m) => m[1])]);
const CRIES = new Set([...((/const VOICE_FX = \{([^}]*)\}/.exec(fs.readFileSync(path.join(ROOT, 'js', '80_tts.js'), 'utf8')) || ['', ''])[1]).matchAll(/(\w+):/g)].map((m) => m[1]));

// the 仲居's room (js/71y_nakai.js, NAKAI — read from there, never copied): the things in it (washitsuArt's keys), the futons' and the
// cushions' places, what 千代 may find seen to; and the jobs there are (js/71r_work.js, WORK.PLACES): a CAST shift is one of them
const NAKAI_SRC = fs.readFileSync(path.join(ROOT, 'js', '71y_nakai.js'), 'utf8');
const listIn = (src, name) => [...((new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(src) || ['', ''])[1]).matchAll(/'(\w+)'/g)].map((m) => m[1]);
const NAKAI_KEYS = listIn(NAKAI_SRC, 'KEYS'), NAKAI_SELF = listIn(NAKAI_SRC, 'SELF');
const NAKAI_SLOTS = Object.fromEntries([...((/const SLOTS = \{([^}]*)\}/.exec(NAKAI_SRC) || ['', ''])[1]).matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])]));
const JOB_IDS = new Set([...fs.readFileSync(path.join(ROOT, 'js', '71r_work.js'), 'utf8').matchAll(/^ {4}(\w+): \{ area: '/gm)].map((m) => m[1]));

// what the hero can wear (古道具屋's wear and clothes): a chat line may be about one (when.look)
function loadWares(file = path.join(__dirname, '..', 'js', '71d_wares.js')) {
  return new Set([...fs.readFileSync(file, 'utf8').matchAll(/\{ id: '([a-zA-Z0-9]+)', kind: '(?:wear|clothes)'/g)].map((m) => m[1]));
}

// the drawings there are (pics.js: the course's words, the town's own): a menu's thing is drawn
function loadPics(file = path.join(__dirname, '..', 'pics.js')) {
  const o = new Function(fs.readFileSync(file, 'utf8') + '\n;return { PICS, PICS_TOWN: typeof PICS_TOWN === "object" ? PICS_TOWN : {} };')();
  return new Set([...Object.keys(o.PICS), ...Object.keys(o.PICS_TOWN)]);
}

// opts: chatMin — the fewest chat lines each person has (two with no condition by their first event's unit); wares — loadWares();
// pics — loadPics()
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
    if (e.met !== undefined) {   // the opening for one who has done another event first: { if, head, from }
      if (!e.met || !(T.EVENTS || []).some((x) => x.id === e.met.if) || !Array.isArray(e.met.head) || !Number.isInteger(e.met.from) || e.met.from < 0 || e.met.from > e.lines.length) bad('ref', where, 'met is { if: an event, head: lines, from: how many of the lines it replaces }');
      else talkLines(e.met.head, e.u, `${where} met`, who);
    }
  });
  if (used.size) { const lo = Math.min(...used), hi = Math.max(...used); for (let i = lo; i <= hi; i++) if (!used.has(i)) bad('gap', units[i], 'no events'); }
  // what 円 buys (MENU): ids once, a price, the names and lines readable from the first unit, a keeper who is in the town and says it
  Object.entries(T.YATAI || {}).forEach(([id, v]) => {   // the stall keepers: a name, a look, no one of the town's; where their stall stands
    if (cast[id]) bad('ref', `yatai ${id}`, 'a stall keeper with the id of someone in the town');
    if (!v || !v.name || !v.look || typeof v.look !== 'object') bad('menu', `yatai ${id}`, 'a stall keeper has a name and a look');
    if (v && v.at !== undefined && !places.includes(v.at)) bad('ref', `yatai ${id}`, `no place ${v.at} for the stall (at)`);
    if (v && v.market !== undefined && (v.market !== true || v.at !== 'harbor')) bad('menu', `yatai ${id}`, 'market: true is a stall of the 朝市, at the harbour');
  });
  const menuIds = new Set();
  Object.entries(T.MENU || {}).forEach(([m, mu]) => {
    const at = `menu ${m}`;
    text(mu.title, 'm1', `${at} title`); ['have', 'done', 'order', 'shop'].forEach((k) => { if (mu[k] !== undefined) text(mu[k], 'm1', `${at} ${k}`); });
    if (mu.keeper && (!(cast[mu.keeper[0]] || (T.YATAI || {})[mu.keeper[0]]) || !/\{P\}/.test(mu.keeper[1]) || !/\{Z\}/.test(mu.keeper[2] || ''))) bad('menu', at, 'keeper is [someone in the town or a stall keeper (YATAI), a line with {P}, its Chinese with {Z}]');
    if (mu.keeper) text(mu.keeper[1].replace('{P}', ''), 'm1', `${at} keeper`);
    if (mu.hello) { text(mu.hello[0], 'm1', `${at} hello`); if (!mu.keeper || !mu.hello[1]) bad('menu', at, 'hello is the keeper\'s [Japanese, Chinese]'); }
    (mu.items || []).forEach(([id, name, zh, price], i) => {
      if (menuIds.has(id)) bad('menu', `${at}#${i}`, `${id} twice`); menuIds.add(id);
      if (!Number.isInteger(price) || price <= 0 || price > 9999) bad('menu', `${at}.${id}`, 'a price in whole 円, under 10,000');
      if (!zh) bad('menu', `${at}.${id}`, 'no Chinese'); text(name, 'm1', `${at}.${id}`);
      const x = mu.items[i][4] || {};   // its kind, the word that opens it, its drawing
      if (x.k !== undefined && !['f', 'd', 'b', 'o'].includes(x.k)) bad('menu', `${at}.${id}`, 'k is f (a food), d (a drink), b (a bath) or o (おみくじ)');
      if (x.w !== undefined && !D.VOCAB.some((v) => v.w.replace(/\[[^\]]*\]/g, '') === x.w)) bad('menu', `${at}.${id}`, `no course word ${x.w}`);
      if (opts.pics && !opts.pics.has(x.pic || x.w || '')) bad('menu', `${at}.${id}`, `no drawing ${x.pic || x.w}`);
      ['look', 'say'].forEach((w) => (x[w] || []).forEach(([ja, z], k) => { text(ja, 'm2', `${at}.${id} ${w}${k}`); if (!z) bad('menu', `${at}.${id} ${w}${k}`, 'no Chinese'); }));   // said before, once had
    });
  });

  // the cruise ship (CRUISE): its passengers (a group that only grows: each joins on a trip — or one still to be written, named as
  // the trips are, t and its number, after the last: aboard none till then), what they say (by unit), its trips one a unit in
  // order, each with 20 reply choices or more, said only by those aboard by then; from the harbour back to it; a stop gone to by
  // bus, train or on foot (go), a meal at a room's table (seat) or out of doors on the place's benches (eat)
  const cr = T.CRUISE;
  if (cr) {
    const people = cr.PEOPLE || {}, trips = cr.TRIPS || [], tIdx = (id) => trips.findIndex((t) => t.id === id);
    const tNo = (id) => Number((/^t(\d+)$/.exec(id) || [])[1]) || 0, toCome = (id) => tIdx(id) < 0 && tNo(id) > Math.max(0, ...trips.map((t) => tNo(t.id)));
    text(cr.ship || '', 'm1', 'cruise ship');
    Object.entries(people).forEach(([id, p]) => {
      if (cast[id]) bad('cruise', `cruise ${id}`, 'a passenger with a town person\'s id');
      if (tIdx(p.from) < 0 && !toCome(p.from)) bad('cruise', `cruise ${id}`, `joins on no trip ${p.from}`);
      if (!(cr.OFF || {})[id]) bad('cruise', `cruise ${id}`, 'never comes off the ship (OFF)');
    });
    const said = (kind, id, ls) => (ls || []).forEach((l, i) => { const at = `cruise ${kind} ${id}#${i}`; if (unitIdx(l[0]) < 0) bad('ref', at, `no unit ${l[0]}`); else text(l[1], l[0], at); });
    Object.entries(cr.OFF || {}).forEach(([id, ls]) => {
      if (!people[id]) { bad('ref', `cruise off ${id}`, 'not a passenger'); return; }
      said('off', id, ls);
      const t = trips[tIdx(people[id].from)];
      if (t && !ls.some((l) => unitIdx(l[0]) <= unitIdx(t.u))) bad('cruise', `cruise off ${id}`, 'nothing to say coming off on their first trip');
    });
    Object.entries(cr.SAY || {}).forEach(([id, ls]) => { if (id !== 'takahashi' && !people[id]) bad('ref', `cruise say ${id}`, 'not a passenger'); said('say', id, ls); });
    Object.entries(cr.EAT || {}).forEach(([id, ls]) => {   // tapped at the table; one about a dish: where it is eaten ({ at: a place or places })
      if (!people[id]) bad('ref', `cruise eat ${id}`, 'not a passenger'); said('eat', id, ls);
      (ls || []).forEach((l, i) => { const w = l[3]; if (w === undefined) return; const at = w && typeof w === 'object' && !Array.isArray(w) ? [].concat(w.at) : [];
        if (Object.keys(w || {}).some((k) => k !== 'at') || !at.length || !at.every((p) => places.includes(p))) bad('cruise', `cruise eat ${id}#${i}`, 'an EAT line\'s fourth is { at: the place or places it is eaten at }'); });
    });
    let lastU = -1; const tids = new Set();
    trips.forEach((t, k) => {
      const where = `cruise ${t.id}`, u = t.u;
      if (tids.has(t.id)) bad('ref', where, 'the same id twice'); tids.add(t.id);
      if (unitIdx(u) < 0) { bad('ref', where, `no unit ${u}`); return; }
      if (unitIdx(u) <= lastU) bad('cruise', where, 'the trips go on unit by unit'); lastU = unitIdx(u);
      if (t.needs && !ids.has(t.needs)) bad('ref', where, `needs no event ${t.needs}`);
      if (t.join && (!people[t.join] || people[t.join].from !== t.id)) bad('cruise', where, `${t.join} does not join on it`);
      const aboard = (id) => Boolean(people[id]) && tIdx(people[id].from) >= 0 && tIdx(people[id].from) <= k;
      // who may speak at a stop: the hero, all of them, someone of the town (brought out: cast), a stall keeper at their stall — a stop
      // of the place it stands at (YATAI at), the 朝市's a stop it stands for (market) — a passenger already aboard
      const sayer = (s) => (id, at) => {
        if (id === 'hero' || id === 'all' || cast[id]) return;
        const k = (T.YATAI || {})[id];
        if (k) { if (k.at !== s.at) bad('cruise', at, `${id} keeps a stall at ${k.at || 'no place (at)'}, not ${s.at}`); else if (k.market && !s.market) bad('cruise', at, `${id}'s stall is the 朝市's: a stop flagged market`); return; }
        if (!people[id]) bad('ref', at, `no one called ${id}`); else if (!aboard(id)) bad('cruise', at, `${id} joins on a later trip`);
      };
      const stops = t.stops || [], sids = new Set(); let asks = 0;
      stops.forEach((s) => {
        const sw = `${where}.${s.id}`;
        if (sids.has(s.id)) bad('ref', sw, 'the same id twice'); sids.add(s.id);
        if (!places.includes(s.at) && s.at !== 'yard') bad('ref', sw, `no place ${s.at}`);   // the hero's own yard too
        ['hero', 'crowd'].forEach((q) => { if (!Array.isArray(s[q]) || s[q].length !== 2 || !s[q].every(Number.isFinite)) bad('cruise', sw, `${q} is [X, Y] (a room: [u, v])`); });
        if (s.lost && (!aboard(s.lost[0]) || !Array.isArray(s.lost[1]))) bad('cruise', sw, 'lost is [a passenger aboard, [X, Y]]');
        if (s.need !== undefined && !cast[s.need]) bad('ref', sw, `needs no one called ${s.need}`);
        Object.keys(s.cast || {}).forEach((id) => { if (!cast[id]) bad('ref', sw, `no one called ${id} to bring out`); });
        if (s.go !== undefined && !['bus', 'train', 'walk'].includes(s.go)) bad('cruise', sw, `go is bus, train or walk, not ${s.go}`);
        if (s.guide !== undefined && (!Array.isArray(s.guide) || s.guide.length !== 2)) bad('cruise', sw, 'guide is [X, Y] (a room: [u, v])');
        if (s.bus !== undefined && (s.at !== 'street' || !Number.isFinite(s.bus))) bad('cruise', sw, 'a bus pulls in on the street only, at an X');
        if (s.seat && !s.room) bad('cruise', sw, 'they sit down in a room only');
        if (s.eat !== undefined && (s.eat !== true || s.room)) bad('cruise', sw, 'eat: true is a meal out of doors (in a room: seat)');
        talkLines(s.lines, u, sw, sayer(s));
        (s.lines || []).forEach((l, i) => {
          if (!Array.isArray(l) || l[3] === undefined) return;
          const o = l[3], at = `${sw}#${i}`;
          if (!o || typeof o !== 'object' || Object.keys(o).some((x) => !['snd', 'cry', 'move'].includes(x))) { bad('cruise', at, 'a line\'s fourth is { snd, cry, move }'); return; }
          if (o.move !== undefined && (!Array.isArray(o.move) || !aboard(o.move[0]) || !Array.isArray(o.move[1]))) bad('cruise', at, 'move is [a passenger aboard, [X, Y]]');
          if (o.snd !== undefined && !SOUNDS.has(o.snd)) bad('ref', at, `no sound ${o.snd}`);
          if (o.cry !== undefined && !CRIES.has(o.cry)) bad('ref', at, `no cry ${o.cry}`);
        });
        asks += (s.lines || []).filter((l) => !Array.isArray(l)).length;
        (s.after || []).forEach(([id, ja], i) => { sayer(s)(id, `${sw}.after${i}`); text(ja, u, `${sw}.after${i}`); });
      });
      if (asks < 20) bad('cruise', where, `${asks} reply choices: at least 20`);
      if (stops.length && (stops[0].at !== 'harbor' || stops[stops.length - 1].at !== 'harbor' || !stops[stops.length - 1].bye)) bad('cruise', where, 'a trip begins at the harbour and ends there, seeing them off (bye)');
    });
  }
  Object.entries(cast).forEach(([id, c]) => {   // away after an event that exists; helps at a shop someone keeps
    if (c.away !== undefined && !ids.has(c.away)) bad('ref', `cast ${id}`, `away after no event ${c.away}`);
    if (c.helps !== undefined && !Object.values(cast).some((o) => o.shop === c.helps)) bad('ref', `cast ${id}`, `helps at no shop ${c.helps}`);
  });
  // a line's conditions (TOWNEV.chatLine, TOWNLIFE: CHATPICK.ok): each one known, and what it names there
  const PARTS = ['am', 'noon', 'pm', 'night'], FESTS = ['halloween', 'christmas'], WHEN = ['at', 'h', 'days', 'after', 'before', 'fresh', 'talks', 'look', 'fest', 'about'];
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
  // 湯の花温泉's lines (TOWN.ONSEN, 2026-11-24): each [Japanese, 中文] — every kanji marked, a word above the level glossed: あかり's welcome
  // and 佐藤's bell from the first unit (anyone may ride up), the 観光案内所's at its unit (m7; a later wording at its own); who speaks is
  // someone with a voice in the town or on the cruise; a question asks one of the kinds the job practises
  const on = T.ONSEN;
  if (on) {
    const people = (T.CRUISE || {}).PEOPLE || {}, person = (id, at) => { if (!cast[id] && !people[id]) bad('ref', at, `no one called ${id}`); };
    const pair = (l, u, at) => { if (!Array.isArray(l) || typeof l[0] !== 'string') { bad('onsen', at, 'a line is [Japanese, 中文]'); return; } text(l[0], u, at); if (!l[1]) bad('onsen', at, 'no Chinese'); };
    if (on.welcome) pair(on.welcome, 'm1', 'onsen welcome');
    if (on.bell) pair(on.bell, 'm1', 'onsen bell');
    const A = on.annai, U = 'm7', KINDS = ['can', 'time', 'rule', 'dekiru', 'mieru'];
    if (A) {
      Object.entries(A.spots || {}).forEach(([id, s]) => { const at = `annai spot ${id}`; [s[0], s[1], s[3] || ''].forEach((ja) => text(ja, U, at)); if (!s[2]) bad('onsen', at, 'no Chinese'); });
      Object.entries(A.ask || {}).forEach(([id, [who, kind, ja, zh, later]]) => {
        const at = `annai ask ${id}`; person(who, at); if (!KINDS.includes(kind)) bad('onsen', at, `no kind ${kind}`); pair([ja, zh], U, at);
        if (later) { if (unitIdx(later[0]) < 0) bad('ref', at, `no unit ${later[0]}`); else pair(later.slice(1), later[0], `${at} later`); }
      });
      Object.entries(A.reply || {}).forEach(([id, rs]) => rs.forEach((l, i) => pair(l, U, `annai reply ${id}#${i}`)));
      Object.entries(A.fun || {}).forEach(([id, f]) => {
        const at = `annai fun ${id}`; person(f.who, at); ['q', 'right', 'after'].forEach((k) => { if (f[k]) pair(f[k], U, `${at} ${k}`); });
        (f.wrong || []).forEach((l, i) => pair(l, U, `${at} wrong${i}`)); if (f.ask && !(A.ask || {})[f.ask]) bad('ref', at, `no question ${f.ask}`);
      });
      const say = A.say || {}; person(say.who, 'annai say');
      Object.entries(say).filter(([k]) => k !== 'who').forEach(([k, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x, i) => pair(x, U, `annai say ${k}#${i}`)));
      ['hi', 'thanks'].forEach((k) => { if (A[k]) pair(A[k], U, `annai ${k}`); });
    }
    // 仲居 (2026-11-24, spec §5.2): 千代's instructions, checks and words and each guest's at its unit (m8); each thing one the room draws
    // (washitsuArt's keys), a guest someone with a voice, every wrong reply with its reason and how it is wrong
    const K = on.nakai, U8 = 'm8';
    const thing = (key, at) => { if (!NAKAI_KEYS.includes(key)) bad('onsen', at, `no thing ${key} in the room`); };
    if (K && !NAKAI_KEYS.length) bad('onsen', 'nakai', 'NAKAI.KEYS not found in js/71y_nakai.js');
    if (K) {
      Object.entries(K.do || {}).forEach(([id, [key, v, ja, zh]]) => {   // what it is to be: on/off a boolean; a futon 1–3, a cushion 1–4 (its places)
        const at = `nakai do ${id}`; thing(key, at); pair([ja, zh], U8, at);
        if (NAKAI_SLOTS[key] ? !(Number.isInteger(v) && v >= 1 && v <= NAKAI_SLOTS[key]) : typeof v !== 'boolean') bad('onsen', at, `${key} cannot be ${v}`);
      });
      Object.entries(K.check || {}).forEach(([key, c]) => {
        const at = `nakai check ${key}`; thing(key, at); ['q', 'yes', 'no', 'then'].forEach((x) => pair(c[x], U8, `${at} ${x}`));
        if (typeof c.want !== 'boolean') bad('onsen', at, 'want is what she wants it to be: true or false');
        if (!Array.isArray(c.fact) || c.fact.length !== 2 || !c.fact.every(Boolean)) bad('onsen', at, 'fact is [why when it is so, why when not]');
        if (c.form) {
          if (!Array.isArray(c.form[0]) || c.form[0].length !== 2 || !c.form[0].every((ja) => typeof ja === 'string' && ja)) bad('onsen', at, 'form is [[when it is so, when not], why]');
          (c.form[0] || []).forEach((ja) => text(ja, U8, `${at} form`)); if (!c.form[1]) bad('onsen', at, 'a form reply with no why');
        }
      });
      Object.entries(K.guest || {}).forEach(([key, [who, line, right, wrong, after]]) => {
        const at = `nakai guest ${key}`; thing(key, at); person(who, at); [line, right, after].forEach((l, i) => pair(l, U8, `${at}#${i}`));
        (wrong || []).forEach(([ja, why, how], i) => { text(ja, U8, `${at} wrong${i}`); if (!why || !['form', 'fact'].includes(how)) bad('onsen', `${at} wrong${i}`, 'a wrong reply is [Japanese, why, form | fact]'); });
      });
      Object.entries(K.self || {}).forEach(([key, l]) => { if (!NAKAI_SELF.includes(key)) bad('onsen', `nakai self ${key}`, `${key} is not a thing she finds seen to (NAKAI.SELF)`); pair(l, U8, `nakai self ${key}`); });
      const ks = K.say || {}; person(ks.who, 'nakai say');
      Object.entries(ks).filter(([k]) => k !== 'who').forEach(([k, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x, i) => pair(x, U8, `nakai say ${k}#${i}`)));
    }
    // おみやげ屋 (2026-11-24, spec §5.3): ゆのはな堂's shelves and customers at its unit (m11) — each good its tag's name, a price, its pieces
    // and a picture drawn; each customer someone with a voice, of a kind the job practises, wanting goods on the shelves; one who is asked
    // a favour, has their hands full, buys for a superior or tastes first has a set of replies, and every wrong reply its reason; every
    // line its 中文
    const M = on.miyage, U11 = 'm11', MKINDS = ['count', 'two', 'got', 'budget', 'reply', 'offer', 'elder', 'taste', 'all'], TWO_STEP = ['reply', 'offer', 'elder', 'taste'];
    if (M) {
      const ids = (M.goods || []).map((g) => g[0]), sets = M.reply || {};
      (M.goods || []).forEach(([id, name, price, pack, pic, zh], i) => {
        const at = `miyage good ${id || i}`; text(String(name || ''), U11, at);
        if (!id || !name || !zh || !pic) bad('onsen', at, 'a good is [id, its name, price, pieces, its picture, 中文]');
        if (!(Number.isInteger(price) && price > 0)) bad('onsen', at, `a price is a number of 円: ${price}`);
        if (!(Number.isInteger(pack) && pack >= 0)) bad('onsen', at, `pieces are a number: ${pack}`);
        if (opts.pics && pic && !opts.pics.has(pic)) bad('menu', at, `no drawing ${pic}`);
      });
      if (new Set(ids).size !== ids.length) bad('onsen', 'miyage goods', 'a good twice');
      Object.entries(M.cust || {}).forEach(([id, c]) => {
        const at = `miyage cust ${id}`; person(c.who, at); if (!MKINDS.includes(c.kind)) bad('onsen', at, `no kind ${c.kind}`);
        pair(c.line, U11, at); ['then', 'after', 'over', 'short', 'to'].forEach((k) => { if (c[k] !== undefined) pair(c[k], U11, `${at} ${k}`); });
        Object.entries(c.no || {}).forEach(([g, l]) => { if (!ids.includes(g)) bad('onsen', `${at} no`, `no good ${g}`); pair(l, U11, `${at} no ${g}`); });
        if (!['budget', 'all'].includes(c.kind) && !(Array.isArray(c.want) && c.want.length && c.want.every((g) => ids.includes(g)))) bad('onsen', at, `wants goods on the shelves: ${c.want}`);
        if (c.kind === 'budget' && !(Number.isInteger(c.budget) && c.budget > 0)) bad('onsen', at, 'a coin to spend: budget');
        if (TWO_STEP.includes(c.kind) !== Boolean(c.reply)) bad('onsen', at, TWO_STEP.includes(c.kind) ? 'a two-step customer names its replies (reply)' : 'replies for a customer who only picks');
        if (c.reply && !sets[c.reply]) bad('ref', at, `no replies ${c.reply}`);
        if (['reply', 'offer', 'taste'].includes(c.kind) && !c.then) bad('onsen', at, 'what they say for the second step (then)');
        if (c.kind === 'elder' && !c.to) bad('onsen', at, 'the one the gift is for (to)');
      });
      Object.entries(sets).forEach(([k, [right, wrong]]) => {
        const at = `miyage reply ${k}`; pair(right, U11, at);
        if (!Array.isArray(wrong) || !wrong.length) bad('onsen', at, 'no wrong replies');
        (wrong || []).forEach(([ja, why], i) => { text(String(ja || ''), U11, `${at} wrong${i}`); if (!why) bad('onsen', `${at} wrong${i}`, 'a wrong reply with no why'); });
      });
      const ms = M.say || {}; person(ms.who, 'miyage say');
      Object.entries(ms).filter(([k]) => k !== 'who').forEach(([k, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x, i) => pair(x, U11, `miyage say ${k}#${i}`)));
      ['hi', 'give', 'thanks'].forEach((k) => { if (M[k]) pair(M[k], U11, `miyage ${k}`); });
    }
  }
  // where someone stands on a shift of their job (CAST shift: [job, place, spot] — 千代 in 桜の間 while her 仲居 card is up): a spot drawn
  Object.entries(cast).forEach(([id, c]) => { if (c.shift !== undefined && (!Array.isArray(c.shift) || !JOB_IDS.has(c.shift[0]) || !places.includes(c.shift[1]) || !spots[c.shift[1]] || !spots[c.shift[1]][c.shift[2]])) bad('host', `cast ${id}`, 'shift is [a job (WORK.PLACES), a place drawn, a spot there]'); });
  return out;
}

module.exports = { check, loadTown, loadWares, PLACES };

if (require.main === module) {
  const probs = check(loadTown(), require('./data-file').load(), { chatMin: 10, wares: loadWares(), pics: loadPics() });
  probs.forEach(p => console.log(p));
  const T = loadTown();
  console.log(probs.length ? `${probs.length} problems` : `events ok: ${(T.EVENTS || []).length} events, ${Object.keys(T.CAST).length} people`);
  process.exit(probs.length ? 1 : 0);
}
