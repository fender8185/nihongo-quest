'use strict';
// the town: the neighbours, their events (TOWNEV), the beach, the harbour, the bus and the far paths (out of 71_today.js, 2026-11-11)
// ---------- the neighbours (test, 2026-11-09) ----------
// 小春 (a young hairdresser with a salon in town, #/town along the yard to the right) and ムギ (a shiba who collects old records, on the
// beach, #/beach, along the yard to the left; home: where they are to be found). Both knew the grandmother who left the hero
// the house (STORY).
// Each comes knocking at 書房's front door once (one at a time: the next not before NPC.gap later, and 書房 opened again): 小春 a minute after the opening, whatever was done meanwhile (2026-11-11; she came after the first set), ムギ a few minutes after her (the user's calls). The door
// shakes, コンコン; tapped, the hero goes and opens it, they say hello and give a present — 小春 the full-length mirror (the face and
// the hair are changed in front of it), ムギ the gramophone with its two records (one bought before: what was paid comes back).
// state.met: { id: when they came (ms; an older save's day) }. After that they are about the town, a tap for a word (TOWN.CHAT, as
// everyone's since 2026-11-12). Lines: [Japanese ({漢字|かな}), 中文]
const KOHARU_LOOK = { face: 'oval', skin: '#f8dcc8', cheeks: 'blush', fringe: 'sidepart', sides: 'wave', hairBack: 'wavy', hairTop: 'none', hairColor: '#8a4a2e', eyes: 'chibi', eyeColor: '#5a3a28', brows: 'soft', mouth: 'grin', beard: 'none', topStyle: 'shirt', top: '#e9e2d0', bottomStyle: 'skirt', bottom: '#e58fa8', shoeStyle: 'loafer', shoe: '#6e4f3a' };
const MUGI_ART = `<ellipse cy="-2" rx="36" ry="6" fill="#2b1c12" fill-opacity=".16"/>
  <g class="mugi-tail"><path d="M24 -30 C44 -34 48 -58 34 -64 C24 -68 18 -58 26 -54 C34 -50 30 -40 20 -40 Z" fill="#d9894a"/><path d="M30 -58 C36 -54 34 -46 28 -44" fill="none" stroke="#fbf1e2" stroke-width="5" stroke-linecap="round"/></g>
  <ellipse cy="-34" rx="29" ry="31" fill="#d9894a"/><ellipse cy="-30" rx="16" ry="23" fill="#fbf1e2"/>
  <rect x="-17" y="-24" width="12" height="24" rx="6" fill="#d9894a"/><rect x="5" y="-24" width="12" height="24" rx="6" fill="#d9894a"/><ellipse cx="-11" cy="-3" rx="7" ry="4.6" fill="#fbf1e2"/><ellipse cx="11" cy="-3" rx="7" ry="4.6" fill="#fbf1e2"/>
  <path d="M-20 -60 Q0 -48 20 -60 L10 -46 Q0 -42 -10 -46 Z" fill="#d0574b"/><circle cy="-50" r="3" fill="#f2c94c"/>
  <path d="M-26 -94 L-30 -126 L-6 -104 Z" fill="#d9894a"/><path d="M-24 -98 L-26 -118 L-11 -104 Z" fill="#f2b38a"/><path d="M26 -94 L30 -126 L6 -104 Z" fill="#d9894a"/><path d="M24 -98 L26 -118 L11 -104 Z" fill="#f2b38a"/>
  <ellipse cy="-84" rx="31" ry="27" fill="#d9894a"/><path d="M-24 -78 C-22 -64 -10 -58 0 -58 C10 -58 22 -64 24 -78 C16 -72 8 -76 0 -76 C-8 -76 -16 -72 -24 -78 Z" fill="#fbf1e2"/>
  <ellipse cx="-11" cy="-97" rx="4" ry="2.6" fill="#fbf1e2"/><ellipse cx="11" cy="-97" rx="4" ry="2.6" fill="#fbf1e2"/>
  <ellipse cx="-11" cy="-86" rx="3.8" ry="4.4" fill="#2a2730"/><ellipse cx="11" cy="-86" rx="3.8" ry="4.4" fill="#2a2730"/><circle cx="-9.8" cy="-87.6" r="1.4" fill="#fff"/><circle cx="12.2" cy="-87.6" r="1.4" fill="#fff"/>
  <ellipse cy="-75" rx="5" ry="3.4" fill="#2a2730"/><path d="M-6 -69 Q-3 -66 0 -69 Q3 -66 6 -69" fill="none" stroke="#5a3a28" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="-20" cy="-74" rx="5" ry="2.8" fill="#f2a3a0" fill-opacity=".55"/><ellipse cx="20" cy="-74" rx="5" ry="2.8" fill="#f2a3a0" fill-opacity=".55"/>`;
const NPCS = {
  koharu: { name: '小春', role: '美容師', gift: 'fullMirror', home: 'town', at: { X: -328, Y: 130 },   // in her salon's doorway
    due: () => Date.now() - state.storyAt >= NPC.after.ms,   // storyAt 0 (seen before it was kept): at once
    hello: () => [
      ['こんにちは！{町|まち}で{美容室|びようしつ}をやっている、{小春|こはる}です。', '你好！我是在鎮上開美容院的小春。'],
      ['おばあちゃんの{髪|かみ}は、いつも{私|わたし}が{切|き}っていたんですよ。', '你外婆的頭髮，一直都是我幫她剪的喔。'],
      ['お{孫|まご}さんが{来|き}たって{聞|き}いて……これ、おばあちゃんから{預|あず}かっていたものです。', '聽說她的孫兒搬來了……這是外婆寄放在我這裡的東西。', 'gift'],
      ['{全身鏡|ぜんしんきょう}です。{髪型|かみがた}も{顔|かお}の{雰囲気|ふんいき}も、いつでも{変|か}えられますよ。', '是全身鏡喔。髮型和臉的感覺，隨時都能換。'],
      ['{町|まち}に{来|き}たら、お{店|みせ}に{寄|よ}ってくださいね！', '來鎮上的話，到店裡坐坐喔！']] },
  mugi: { name: 'ムギ', role: '柴犬', gift: 'gramophone', home: 'beach', at: { X: -170, Y: 58 },
    due: () => met('koharu'),   // after 小春 (and NPC.gap), the user's call
    hello: (paid) => [
      ['ワン！はじめまして、ムギだ。', '汪！初次見面，我是ムギ。'],
      ['ワン！おばあちゃんとは、よく{海辺|うみべ}でレコードを{聞|き}いた。', '汪！我以前常和你外婆在海邊聽唱片。'],
      ['ワン！きみが{耳|みみ}で{日本語|にほんご}を{聞|き}いているって、{風|かぜ}のうわさで{聞|き}いた。これ、おばあちゃんの{蓄音機|ちくおんき}だ！', '汪！聽風說你在用耳朵聽日文。這是你外婆的留聲機！', 'gift'],
      paid ? ['ワン！あれ、もう{持|も}ってる？じゃあ、お{金|かね}は{返|かえ}す。レコードも{二枚|にまい}どうぞ。', `汪！咦，你已經有了？那 ${paid} 言靈還你。兩張唱片也請收下。`]
        : ['ワン！{蓄音機|ちくおんき}とレコード{二枚|にまい}だ。〈{縁側|えんがわ}の{午後|ごご}〉と〈{夜桜|よざくら}〉。', '汪！留聲機和兩張唱片：〈縁側の午後〉和〈夜桜〉。'],
      ['ワン！いつも{海辺|うみべ}にいる。{新|あたら}しいレコードが{入|はい}ったら{教|おし}える。またね！', '汪！我都在海邊。有新唱片的話告訴你，再見！']] }
};
const met = (id) => Boolean(state.met && state.met[id]);   // a neighbour has come by
const NPC = (() => {
  // who is at the door now: the first not met whose time has come, none for a while after someone came (the user: one a day
  // was too slow — ムギ never came the day 小春 did)
  const gap = { ms: 3 * 60 * 1000 }, after = { ms: 60 * 1000 };   // after: 小春, from the opening's end
  const lastCame = () => Math.max(0, ...Object.values(state.met || {}).map((v) => (typeof v === 'number' ? v : Date.parse(v) || 0)));
  function visitor() {
    if (Date.now() - lastCame() < gap.ms) return null;
    return Object.keys(NPCS).find((id) => !met(id) && NPCS[id].due()) || null;
  }
  const art = (id) => (id === 'mugi' ? `<svg viewBox="-60 -200 120 210" aria-hidden="true">${MUGI_ART}</svg>` : HERO.svg({ look: KOHARU_LOOK }));
  const face = (id) => (id === 'mugi' ? `<svg viewBox="-44 -132 88 88" aria-hidden="true">${MUGI_ART}</svg>` : HERO.head(KOHARU_LOOK, 'bust'));
  const knockSound = () => SND.play('knock');   // コンコン (環境音: its file, made in SND should it be missing)
  // 書房 open with someone at the door: コンコン by it (three times, a few seconds apart), its sign kept in sight, a word the first
  // time. 小春's minute not up yet: looked at again when it is, so she knocks while the hero just sits in 書房
  let soon = 0;
  function check() {
    const st = document.querySelector('#view .study[data-room="study"]'), id = st && !STORY.due() && visitor();   // the opening first (STORY)
    if (!st) return;
    ROOM.knock(st, Boolean(id));
    clearTimeout(soon);
    if (!id && !met('koharu') && !STORY.due()) soon = setTimeout(check, Math.max(0, state.storyAt + after.ms - Date.now()) + 50);
    if (!id || st._knock) return;
    st._knock = true; let n = 0;
    const tap = () => {
      if (!st.isConnected || !visitor() || TALK.on()) return;
      if (modalOpen()) { setTimeout(tap, 2000); return; }   // a dialog open (picking a start): once it is closed
      knockSound(); const k = st.querySelector('.knock'); if (k) { k.classList.remove('on'); void k.offsetWidth; k.classList.add('on'); }
      if (!n) toast('コンコン……有人在敲門。點大門去開門看看。', 3600);
      if (++n < 3) setTimeout(tap, 7000);
    };
    setTimeout(tap, 900);
  }
  // the door opened: hello, the present, goodbye; then the room again with the present in it
  function visit(st) {
    const id = visitor(); if (!id || !st) return;
    const n = NPCS[id], w = n.gift, paid = (state.owned[w] && Number(state.owned[w].paid)) || 0;
    ROOM.knock(st, false); ROOM.guest(st, art(id));
    TALK.open(st, id, n.hello(paid), () => {
      const p = state.placed[w];
      route(); gotItem(w, p ? (p.rm === 'bed' ? '放在臥房了' : '放在書房了') : '收在收納箱了，到「擺設」拿出來擺');
    }, () => give(id, paid));
  }
  function give(id, paid) {   // the present: theirs at once (what was paid comes back), set out where it belongs if there is room
    const w = NPCS[id].gift;
    state.met = Object.assign({}, state.met, { [id]: Date.now() });
    if (paid) state.owned[w].paid = 0; else if (!state.owned[w]) state.owned[w] = { paid: 0, on: todayStr() };
    if (!state.placed[w]) ROOM.give(w);
    if (w === 'gramophone') state.musicOff = false;
    saveState();
  }
  // a new player stays in (2026-11-10, the user) until ムギ has come by with the gramophone: at the front door the hero says why —
  // first a little practice (小春 comes a minute after the opening), then, 小春 met, a dog heard outside (ムギ, NPC.gap later)
  const housebound = () => !met('mugi');
  const DOOR = { dog: [['あれ？ そとで いぬの こえが する……。', '咦？外面好像有狗叫聲……'], ['', '（好像有誰要來找我。在家裡再練幾題，等一下吧。）']],
    first: [['まずは れんしゅう！', '先來練習！'], ['', '（外面的路還不熟。先坐到書桌前，點筆記本做一點今日練習，熟悉一下題目吧。）']] };
  function stayIn(st) { TALK.open(st, 'hero', met('koharu') ? DOOR.dog : DOOR.first); }
  return { visitor, check, visit, face, art, gap, after, housebound, stayIn, DOOR };
})();
// the town's events (test, 2026-11-09; docs/superpowers/specs/2026-11-09-town-events-design.md): the people of events.js (TOWN)
// where their hours put them, and the next event of the course. An event opens with the course (2026-11-10: no days between
// them, so a week's learning can be met at the weekend): all of a unit passed, and of the unit being studied (入門: m0 only) the
// first once it is begun (a grammar item of it learned; m0: anything), then one more for each fifth of its grammar learned —
// once the one it follows is done. Only one waits at a time: the first whose person is now where it happens — so one that wants
// the evening lets a daytime one through — or, two study days on from the last one done, the first whatever the hour (one who
// cannot sleep to it, NAP, is not stuck on a daytime event), unless it is meant for the night
const TOWNEV = (() => {
  const T = () => TOWN;
  const units = () => ['m0'].concat(DATA.UNITS.map((u) => u.id));
  const unitIdx = (u) => units().indexOf(u);
  const reachedIdx = () => (inPreStage() ? 0 : Math.max(unitIdx(state.currentUnit), ...(state.completedUnits || []).map(unitIdx)));
  const started = (u) => (u === 'm0' ? Object.keys(state.srs || {}).length > 0 : REG.grammar.some((g) => g.u === u && state.srs['g:' + g.id]));
  const studyDaysSince = (date) => Object.keys(state.dailyLogs || {}).filter((d) => d > (date || '') && d <= todayStr() && dayActive(state.dailyLogs[d])).length;
  const lastDone = () => Object.values(state.town.done).sort().pop() || '';
  const share = (u) => { const gs = REG.grammar.filter((g) => g.u === u); return gs.length ? gs.filter((g) => state.srs['g:' + g.id]).length / gs.length : 0; };
  function opened(e) {   // by the course: its unit passed, or the one studied learned as far as the event's place among its events
    const i = unitIdx(e.u), R = reachedIdx(); if (i < 0 || i > R) return false; if (i < R) return true;
    const list = T().EVENTS.filter((x) => x.u === e.u), k = list.indexOf(e);
    return started(e.u) && (k <= 0 || share(e.u) >= k / list.length);
  }
  const openN = () => T().EVENTS.filter((e) => !state.town.done[e.id] && opened(e)).length;   // open and not done (the front door's count)
  function due() {
    const done = state.town.done;
    const can = (id) => { const c = T().CAST[id]; return Boolean(c) && (c.art !== 'npc' || met(id)); };   // 小春, ムギ: once they have knocked
    const reach = (place) => !BUS_STOPS.some((x) => x[0] === place) || Boolean(state.town.stops[place]);   // out by bus: once its stop is open
    return T().EVENTS.filter((e) => !done[e.id] && (!e.after || done[e.after]) && opened(e) && can(e.who) && reach(e.at));
  }
  const inside = (h, [from, to]) => (from <= to ? h >= from && h < to : h >= from || h < to);
  const isOpen = (shop, h = sceneHour()) => !T().HOURS[shop] || inside(h, T().HOURS[shop]);
  function whereIs(id, h = sceneHour(), day = sceneDate()) {
    const c = T().CAST[id]; if (!c || (c.art === 'npc' && !met(id))) return null;   // 小春, ムギ: once they have come by
    const we = day.getDay() === 0 || day.getDay() === 6;
    const at = c.hours.find(([from, to, , , days]) => (!days || (days === 'we') === we) && inside(h, [from, to]));
    return at ? { place: at[2], spot: at[3] } : null;
  }
  function waiting(h = sceneHour(), day = sceneDate()) {
    const list = due(); if (!list.length) return null;
    for (const e of list) { const w = whereIs(e.who, h, day); if (w && w.place === e.at) return { ev: e, place: w.place, spot: w.spot }; }
    const home = (e) => (T().CAST[e.who].hours.find((x) => x[2] === e.at) || [])[3];
    const e = list.find((x) => x.when !== 'night' && home(x));
    return e && studyDaysSince(lastDone()) >= 2 ? { ev: e, place: e.at, spot: home(e) } : null;
  }
  // the hours a sleep wakes to (TOWN.WAKE) at which an event's person is at its place, on the day one would wake
  const wakeDay = (h) => new Date(today().getTime() + (((h - now()) % 24 + 24) % 24 || 24) * 3600000);
  const slots = (e) => (T().WAKE || []).filter((h) => { const w = whereIs(e.who, h, wakeDay(h)); return Boolean(w) && w.place === e.at; });
  const calls = () => { const list = due(); return (T().WAKE || []).filter((h) => list.some((e) => slots(e).includes(h))); };   // the sleep menu's dots
  const WAKE_WORD = { 8: '早上', 12: '中午', 17: '傍晚', 20: '晚上' };
  const when = (e) => slots(e).map((h) => WAKE_WORD[h]).join('、');
  function finish(id) {   // done: the day, the people in it met, a bus stop it opens, its 10 言靈 (once: koto.found)
    const e = T().EVENTS.find((x) => x.id === id); if (!e) return;
    const t = state.town;
    if (!t.done[id]) t.done[id] = todayStr();
    [e.who].concat((e.lines || []).filter(Array.isArray).map((l) => l[0])).forEach((w) => { if (w !== 'hero') t.seen[w] = 1; });
    if (e.opens) t.stops[e.opens] = 1;
    if (!state.koto.found['ev-' + id]) state.koto.found['ev-' + id] = 10;
    saveState();
  }
  // the hour the town is drawn at: the phone's (TOWNEV.clock holds a fixed one for tests)
  const now = () => (api.clock ? api.clock.h : sceneHour()), today = () => (api.clock ? api.clock.day : sceneDate());
  const seen = (id) => (T().CAST[id].art === 'npc' ? met(id) : Boolean(state.town.seen[id]));
  const ownerOf = (shop) => Object.keys(T().CAST).find((id) => T().CAST[id].shop === shop);
  // a shop: 'prep' until its keeper is met (準備中), then 'open' or 'closed' by its hours
  // (a shop one walks into opens its door the first time an event waits inside)
  const shopState = (shop) => { const o = ownerOf(shop), w = waiting(now(), today());
    if ((w && w.place === shop) || CRUISE.opens(shop)) return 'open';   // the cruise's passengers go round: its shops open for them
    return !o || !seen(o) ? 'prep' : isOpen(shop, now()) ? 'open' : 'closed'; };
  // what someone wears where they are: their festival clothes (festa) at the shrine while its 緣日 is on
  const look = (id, place, h = now()) => { const c = T().CAST[id]; return c.festa && place === 'shrine' && isOpen('ennichi', h) ? Object.assign({}, c.look, c.festa) : c.look; };
  // Christmas (2026-11-14, the user: the people of the shops in Santa hats): a Santa hat over whatever is on their head while it is on
  const wearOf = (w) => (festOn('christmas') && !HERO.whole(w && w.head) ? Object.assign({}, w, { head: 'santahat' }) : w || {});
  const art = (id, place) => { const c = T().CAST[id]; return c.art === 'npc' ? NPC.art(id) : HERO.svg({ look: look(id, place), wear: wearOf(c.wear) }); };
  const face = (id) => { if (id === 'hero') return HERO.head(state.look, 'bust'); const c = T().CAST[id], v = (T().YATAI || {})[id]; if (v) return HERO.head(v.look, 'bust'); if (!c) return CRUISE.face(id); return c.art === 'npc' ? NPC.face(id) : HERO.head(c.look, 'bust'); };   // not of the town: a stall keeper (YATAI), the cruise's
  // an event's lines as said to this learner: met — { if: an event, head: lines, from: k } — the opening for one who has done that
  // event already, said in place of the first k lines (2026-11-13: m1-7 meets 高橋 for those who came to know him in m10-2 first)
  const linesOf = (e) => (e.met && state.town.done[e.met.if] ? e.met.head.concat(e.lines.slice(e.met.from)) : e.lines);
  // the people at a place now: those met, where their hours put them, and whoever an event there waits on (marked ！)
  function here(place) {
    const w = waiting(now(), today()), out = [];
    Object.keys(T().CAST).forEach((id) => {
      const host = w && w.ev.who === id && w.place === place, at = host ? { place, spot: w.spot } : whereIs(id, now(), today());
      const gone = (!host && T().CAST[id].away && state.town.done[T().CAST[id].away]) || CRUISE.away(id, place, host);   // away from the town now (陽菜 in Tokyo): only back for an event of theirs; 高橋 out with the cruise's passengers (an event of his waits for him)
      if (at && at.place === place && !gone && (host || seen(id)) && T().SPOTS[place] && T().SPOTS[place][at.spot]) out.push({ id, spot: T().SPOTS[place][at.spot], host });
    });
    return out;
  }
  // what a place shows of the town now (its shops' doors, who stands where, the mark): drawn anew when it changes
  const sig = (place) => (place === 'town' ? TOWN_SHOPS.map((x) => shopState(x[6])).join() : place === 'shrine' ? String(isOpen('ennichi', now())) : '') + '|' + here(place).map((p) => p.id + (p.host ? '!' : '')).join();
  const festival = () => isOpen('ennichi', now());
  function castHtml(place) {
    return here(place).map(({ id, spot, host }) => { const size = T().CAST[id].size || 1, k = yScale(spot.Y) * size;
      const roam = host || spot.sit || spot.kneel || INDOOR.includes(place) || spot.roam === 0 ? '0' : (spot.roam || [70, 18]).join(',');   // how far they stroll (TOWNLIFE): the one waiting, the seated, those in a room stay
      return `<button type="button" class="hero npc npc-${id}${host ? ' ev-host' : ''}${spot.sit ? ' bench' : ''}${spot.kneel ? ' kneel' : ''}${spot.pose ? ' ' + spot.pose : ''}" data-act="npc-talk" data-npc="${id}" data-x="${spot.X}" data-y="${spot.Y}" data-k="${size}" data-roam="${roam}"${spot.run ? ' data-run="1"' : ''} aria-label="${esc(T().CAST[id].name)}" style="transform:translate(${spot.X.toFixed(1)}px,${(-spot.Y).toFixed(1)}px) scale(${k.toFixed(3)});z-index:${spot.u !== undefined ? isoZ(spot.u, spot.v + (spot.sit || spot.kneel ? 0.45 : 0)) : 300 - spot.Y}">${art(id, place)}${host ? '<i class="ev-mark" aria-hidden="true">！</i>' : ''}</button>`; }).join('');
  }
  // the way to the one waiting (2026-11-10: the map joined up all round — beach | yard | town over harbor | street | park, the two
  // shops off the town, the bus's stops off the street and one another): the next step on a shortest way there, a dot on its sign
  const STOPS = ['station', 'sento', 'shrine', 'castle'];
  const ADJ = { yard: ['beach', 'town', 'street'], beach: ['yard', 'harbor'], town: ['yard', 'park', 'shokudo', 'izakaya'], street: ['yard', 'harbor', 'park'].concat(STOPS),
    harbor: ['beach', 'street'], park: ['town', 'street'], shokudo: ['town'], izakaya: ['town'] };
  STOPS.forEach((p) => { ADJ[p] = ['street'].concat(STOPS.filter((q) => q !== p)); });
  const PLACE_NAME = { yard: '院子', town: '小鎮', beach: '海邊', street: '公車站', harbor: 'みなと漁港', park: 'ひだまり公園', shokudo: 'まんぷく食堂', izakaya: '居酒屋とり吉', station: '駅前', sento: '月の湯', shrine: '稲荷神社', castle: '白鷺城' };
  function hop(from, to) {
    if (from === to || !ADJ[from]) return null;
    const first = { [from]: null }, q = [from];   // breadth first: the first step of the way each place was reached by
    while (q.length) { const at = q.shift(); for (const n of ADJ[at] || []) { if (n in first) continue; first[n] = first[at] || n; if (n === to) return first[n]; q.push(n); } }
    return null;
  }
  // nothing on: a word by the unit reached, where they are and when, the story so far, how the hero looks, how often they have
  // talked (CHATPICK, 2026-11-12). nq_chat (this device only): the last few each said, the news told, the look each last saw;
  // state.town.talks (synced, the larger count): the chats with each
  const HAIR = ['fringe', 'sides', 'hairBack', 'hairTop', 'hairColor'];
  const chatMem = () => { try { const m = JSON.parse(localStorage.getItem('nq_chat') || 'null'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; } };
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };   // a look in a few letters
  function chatCtx(id, m = chatMem()) {
    const at = whereIs(id, now(), today()), d = today(), lk = state.look || {}, sig = 'L' + hash(JSON.stringify([lk, state.wear])), hair = 'L' + hash(JSON.stringify(HAIR.map((k) => lk[k])));
    const saw = Array.isArray((m.saw || {})[id]) ? m.saw[id] : [];   // [the look, the hair] they last saw (an older form: as if never seen)
    return { R: reachedIdx(), unitIdx, at: at ? at.place : '', h: now(), we: d.getDay() === 0 || d.getDay() === 6, done: state.town.done, day: dateStr(d), seen,
      talks: Number((state.town.talks || {})[id]) || 0, lookSig: sig, hairSig: hair, lookChanged: Boolean(saw[0]) && saw[0] !== sig, hairChanged: Boolean(saw[1]) && saw[1] !== hair,
      wear: Object.values(state.wear || {}).concat(['topStyle', 'bottomStyle', 'shoeStyle'].map((k) => (state.look || {})[k])).filter((v) => typeof v === 'string'),
      fest: typeof saleOn === 'function' ? Object.keys(SALES).filter((k) => salePreview(k) || festTalk(k, saleNow() || dateStr(d))) : [] };   // the festivals talked of (their run-up and the day), by the server's day when known
  }
  function chatLine(id) {
    const m = chatMem(), x = chatCtx(id, m), said = (m.said || {})[id] || [];
    const p = CHATPICK.pick(id, T().CHAT[id] || [], x, { said, news: m.news || {} });
    if (p && p.news) m.news = Object.assign({}, m.news, { [p.key]: 1 }); else if (p) m.said = Object.assign({}, m.said, { [id]: said.concat(p.key).slice(-5) });
    Object.keys(m.news || {}).forEach((k) => { const l = k.match(/@(L[0-9a-z]+)$/); if (l && l[1] !== x.lookSig) delete m.news[k]; });   // a look's news told for a look no longer worn: let go
    m.saw = Object.assign({}, m.saw, { [id]: [x.lookSig, x.hairSig] });
    try { localStorage.setItem('nq_chat', JSON.stringify(m)); } catch (e) { /* no storage: they may say it again */ }
    state.town.talks = Object.assign({}, state.town.talks, { [id]: x.talks + 1 }); saveLocal();   // kept here; the next save takes it to the cloud (no upload a chat)
    return p ? [p.line[1], p.line[2]] : ['……', '……'];
  }
  // a tap on someone: the hero walks over, turns to them, and their event if one waits on them here (done: its 言靈, the mark
  // and the dots gone), else a word
  function talk(el) {
    const id = el.dataset.npc, yard = el.closest('.yard'), p = yard && here(yard.dataset.place).find((x) => x.id === id);
    if (!p) { if (yard) { toast(`${T().CAST[id].name}已經離開了。`); route(); } return; }   // gone home since the place was drawn
    primeTtsPlayer(); setTimeout(() => { if (!TALK.on()) stopSilence(); }, 6000);   // still inside the tap: the voice player kept awake through the walk over, or an iPhone refuses their first line (2026-11-12, the user: 小春 said nothing) — no talk after all: let go
    const a = p.spot, w = p.host && waiting(now(), today()), e = w && w.ev;
    const ended = () => { finish(e.id); toast(`完成「${e.title}」・言靈 +10`, 3200); route(); };   // drawn anew: its shop open, the mark gone
    const at = TOWNLIFE.hold(id), moved = at && Math.hypot(at[0] - a.X, at[1] - a.Y) > 0.5;   // they stop where they are (strolling: not on their spot)
    const f = moved ? at : a.foot || [a.X, a.Y], side = yh.X <= f[0] ? -1 : 1;   // beside their feet (up on a stool: the floor under it)
    yHeroWalk(yard, [f[0] + side * 76 * yScale(f[1]), f[1] + 2], () => {
      yh.flip = side > 0; yh.back = false; yh.turn = true; yHeroPlace(yard);
      const sells = !e && YEN.sells(yard, id), chat = () => TALK.open(yard, id, [chatLine(id)]);   // one who sells something here (2026-11-13, the user): 點餐 or 閒聊
      if (e) TALK.open(yard, id, linesOf(e), ended, null, { ev: true });
      else if (sells) TALK.open(yard, id, [[id, sells.hello[0], sells.hello[1], { pick: [[sells.label, sells.go], ['おしゃべりする', chat]] }]], null, null, { ev: true });
      else chat();
    });
  }
  function shopTap(el) {   // a shop front: its keeper if they are here, else what the door says
    const shop = el.dataset.shop, st = shopState(shop), o = ownerOf(shop), sign = (TOWN_SHOPS.find((x) => x[6] === shop) || [])[5] || '';
    if (st === 'prep') { toast('這家店還在準備中，之後會開張。'); return; }
    if (st === 'closed') { const [f, t] = T().HOURS[shop]; toast(`${sign}：營業時間 ${f}:00–${t}:00，現在打烊了。`); return; }
    if (INDOOR.includes(shop)) { yGo(el, shop); return; }   // まんぷく食堂, 居酒屋とり吉: in through the door
    const y = el.closest('.yard'), helper = Object.keys(T().CAST).find((id) => T().CAST[id].helps === shop && y.querySelector(`.npc-${id}`));
    const p = y.querySelector(`.npc-${o}`) || (helper && y.querySelector(`.npc-${helper}`));   // its keeper, else who helps there (和子 at the flowers)
    if (p) talk(p); else toast(T().CAST[o].away && state.town.done[T().CAST[o].away] ? `${sign}現在沒有人在顧店。` : `${T().CAST[o].name}現在不在店裡。`);
  }
  const api = { unitIdx, reachedIdx, started, share, linesOf, studyDaysSince, due, opened, openN, waiting, whereIs, isOpen, finish, clock: null, shopState, castHtml, here, art, wearOf, face, talk, shopTap, chatLine, chatCtx, chatMem, hop, PLACE_NAME, sig, seen, look, festival, slots, calls, when, now, today };
  return api;
})();
// the bed (test, 2026-11-10; the user's call): once the day's practice is done (書桌上的筆記本「今日完成」), a sleep there moves the
// world on — 書房, the yard, the town and its people — to 早上 8 點, 中午 12 點, 傍晚 5 點 or 晚上 8 點 (TOWN.WAKE; a dot where someone
// waits), as often as wanted and always on (晚上 → 早上 is the next morning); the time goes on from there for the rest of the day
// (wakeOff), and the next day is the phone's own again
const NAP = (() => {
  const NAME = { 8: '早上 8 點', 12: '中午 12 點', 17: '傍晚 5 點', 20: '晚上 8 點' };
  const done = () => ringPct(dayProgress()) >= 100;
  function body() {
    return `<p class="muted small">睡醒後，今天都照那個時間走下去；明天回到真實的時間。</p>
      <div class="nap-list">${TOWN.WAKE.map((h) => `<button type="button" class="btn nap-to" data-act="nap-to" data-h="${h}">${NAME[h]}</button>`).join('')}</div>`;
  }
  function offer() {   // lain down: the times to sleep to, or what it takes
    if (!done()) { toast('做完今日練習，就能在床上睡到想要的時間：早上、中午、傍晚或晚上。', 3600); return; }
    openModal('睡到幾點？', body(), { width: 380, noFocus: true });
  }
  function to(h) {
    let d = ((h - sceneHour()) % 24 + 24) % 24; if (d < 1 / 60) d = 24;   // always on: the hour it is now is tomorrow's
    try { localStorage.setItem('nq_wake', JSON.stringify({ day: todayStr(), off: wakeOff() + d })); } catch (e) { toast('這台裝置沒辦法記下時間。'); return; }
    TOWNEV.clock = null; closeModal();   // the test site's hour (町の手帳) gives way to the world's
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = document.createElement('div'); fade.className = 'nap-fade'; if (!still) document.body.appendChild(fade);
    setTimeout(() => { sceneTick(); route(); toast(`睡到${NAME[h]}了。`, 2600); }, still ? 0 : 700);
    setTimeout(() => fade.remove(), still ? 0 : 1500);
  }
  return { NAME, done, offer, to };
})();
// the opening (test, 2026-11-09; the user's picks): as a child the hero never understood what their Japanese grandmother said
// ("I'll learn it later"); grown up and busy in the city they never did; then a letter from Japan — she has gone, and left them
// her little house by the sea, in a town of kind people, and a diary all in Japanese they cannot read. To read it, and to
// understand the people who knew her, they move in and learn (DIARY: a page more for each stage passed). Six pictures with a
// line each, the first time 書房 opens (state.storyV: the version seen — V 2 is this one); a tap goes on, 略過 skips. The
// neighbours knock after it (NPC.check)
const GRANNY_LOOK = { face: 'round', skin: '#f3d1b5', cheeks: 'soft', fringe: 'sidepart', sides: 'short', hairBack: 'short', hairTop: 'bun', hairColor: '#a3a3a8', eyes: 'happy', eyeColor: '#5a3a28', brows: 'soft', mouth: 'smile', beard: 'none', topStyle: 'sweater', top: '#b8a27a', bottomStyle: 'skirt', bottom: '#6e4f3a', shoeStyle: 'loafer', shoe: '#6e4f3a' };
const STORY = (() => {
  const V = 2;
  const ruby = (s) => esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const memory = () => `<div class="story-mem"><div class="sm-fig granny">${HERO.svg({ look: GRANNY_LOOK, wear: { face: 'glasses' }, front: true })}<span class="sm-say" lang="ja">{大|おお}きくなったね。</span></div>
    <div class="sm-fig kid">${HERO.svg({ look: state.look, wear: {}, front: true })}<span class="sm-say q">？</span></div></div>`.replace(/\{([^|}]+)\|([^}]+)\}/g, '$1');
  const city = `<svg viewBox="0 0 300 200" aria-hidden="true"><rect width="300" height="200" fill="#1d2142"/>${[[10, 70, 40], [54, 40, 34], [92, 90, 46], [142, 30, 38], [184, 64, 44], [232, 46, 30], [266, 84, 40]].map(([x, t, w]) => `<rect x="${x}" y="${t}" width="${w}" height="${200 - t}" fill="#2c3160"/>${Array.from({ length: Math.floor((200 - t - 14) / 16) * 2 }, (_, k) => `<rect x="${x + 7 + (k % 2) * (w / 2 - 4)}" y="${t + 10 + Math.floor(k / 2) * 16}" width="${w / 2 - 12}" height="7" fill="${(x + k * 7) % 5 ? '#3a3f72' : '#f2d27a'}"/>`).join('')}`).join('')}
    <circle cx="250" cy="24" r="9" fill="#f4ecdc"/><text x="150" y="120" text-anchor="middle" font-size="40" fill="#f4ecdc" fill-opacity=".1" font-family="serif">忙</text></svg>`;
  const envelope = `<svg viewBox="0 0 220 160" aria-hidden="true"><rect x="16" y="26" width="188" height="118" rx="6" fill="#f6efe0" stroke="#d8ccb4" stroke-width="2"/><path d="M16 32 L110 98 L204 32" fill="none" stroke="#d8ccb4" stroke-width="2"/>
    <rect x="150" y="38" width="40" height="46" rx="2" fill="#fff" stroke="#e3907f" stroke-width="2" stroke-dasharray="4 3"/><rect x="155" y="43" width="30" height="36" fill="#bfe0f4"/><path d="M155 79 L170 54 L185 79 Z" fill="#5f88b2"/><path d="M165 62 L170 54 L175 62 L172 60 L170 63 L168 60 Z" fill="#fff"/><circle cx="178" cy="49" r="4" fill="#d0574b"/>
    <circle cx="140" cy="70" r="17" fill="none" stroke="#c8553f" stroke-width="2" stroke-opacity=".7"/><path d="M126 64 H154 M126 76 H154" stroke="#c8553f" stroke-width="1.6" stroke-opacity=".7"/>
    <path d="M40 112 H120 M40 124 H104" stroke="#9a9184" stroke-width="3" stroke-linecap="round"/><text x="40" y="100" font-size="13" fill="#6b5a48" font-family="serif">日本より</text></svg>`;
  const house = () => `<svg viewBox="0 0 300 200" aria-hidden="true"><defs><linearGradient id="stSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fcdea"/><stop offset="1" stop-color="#f6e7cf"/></linearGradient></defs>
    <rect width="300" height="200" fill="url(#stSky)"/><circle cx="244" cy="44" r="16" fill="#fff6d8"/><rect y="118" width="300" height="34" fill="#5fa6d0"/><path d="M0 120 H300" stroke="#9acbe3" stroke-width="3"/>
    <path d="M0 200 V150 C60 134 120 128 170 134 C220 140 260 150 300 146 V200 Z" fill="#7fb26e"/><path d="M150 200 C152 180 158 166 166 156 H176 C172 168 170 184 172 200 Z" fill="#e8d6a8"/>
    <svg class="house-thumb" x="108" y="62" width="120" height="112" viewBox="0 0 140 130" style="--day:1">${HOUSE_ART.cottage}</svg></svg>`;
  const diary = () => `<div class="story-diary" lang="ja"><div class="sd-page">${DIARY.PAGES[0].ja.split('\n').map((l) => `<p>${esc(l.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'))}</p>`).join('')}</div><div class="sd-page">${DIARY.PAGES[3].ja.split('\n').map((l) => `<p>${esc(l.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'))}</p>`).join('')}</div><span class="sd-q">？？？</span></div>`;
  const PAGES = [
    { art: memory, zh: '小時候，外婆總是笑著跟你說話。可是她說的日文，你一句也聽不懂。' },
    { art: () => city, zh: '「以後再學就好。」長大後，你在城市裡忙得喘不過氣，日文一直沒有學。' },
    { art: () => envelope, zh: '直到某天，一封從日本寄來的信送到了你手上。外婆走了。' },
    { letter: '{大切|たいせつ}な{孫|まご}へ\n{海|うみ}の{見|み}える{小|ちい}さな{家|いえ}を、あなたに{残|のこ}します。\nこの{町|まち}の{人|ひと}たちは、みんなやさしいよ。\n{言葉|ことば}がわかれば、きっと{全部|ぜんぶ}わかるから。\nおばあちゃんより',
      zh: '給親愛的孫兒：我把看得見海的小房子留給你。這個小鎮的人都很溫柔。只要聽得懂他們說的話，你一定就會明白一切。——外婆' },
    { art: house, zh: '你來到海邊的小鎮，住進外婆的小屋。書架上，有一本寫滿日文的日記。' },
    { art: diary, zh: '你一個字也讀不懂。總有一天，要讀懂外婆寫下的每一頁，也要聽懂這個小鎮的人說的話。' }
  ];
  let el = null, i = 0;
  function show() {
    const p = PAGES[i], last = i === PAGES.length - 1;
    el.innerHTML = `<button type="button" class="story-skip" data-story="skip">略過</button>
      <div class="story-page" data-page="${i}">${p.letter ? `<div class="story-letter" lang="ja">${p.letter.split('\n').map((l) => `<p>${ruby(l)}</p>`).join('')}</div>` : `<div class="story-art">${p.art()}</div>`}
        <p class="story-zh">${esc(p.zh)}</p></div>
      <div class="story-foot"><span class="story-dots">${PAGES.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</span>${last ? '<button type="button" class="btn btn-primary" data-story="end">開始</button>' : '<span class="story-tap">點一下繼續 ▸</span>'}</div>`;
  }
  function close() {
    if (!el) return;
    el.classList.add('out'); const e = el; el = null; setTimeout(() => e.remove(), 400);
    state.storyV = V; state.storyAt = Date.now(); saveState(); NPC.check();
  }
  const due = () => (state.storyV || 0) < V;
  function open() {
    if (el || !due()) return;
    i = 0; el = document.createElement('div'); el.className = 'story'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '開場');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-story="skip"], [data-story="end"]')) { close(); return; }
      if (i < PAGES.length - 1) { i++; show(); }
    });
    document.body.appendChild(el); show();
  }
  const drop = () => { if (el && !due()) { el.remove(); el = null; } };   // seen on another device meanwhile (sync)
  return { open, close, drop, due, V, PAGES };
})();
// the grandmother's diary (test, 2026-11-09), on the low bookshelf: a page more can be read for each stage test passed — the
// first from the start, the last when every stage is passed (what she never got to say). A page not yet read is blurred, with
// what it takes; a read one is in Japanese with furigana, its Chinese under 看中文
const DIARY = (() => {
  const PAGES = [
    { ja: '{今日|きょう}は いい {天気|てんき}です。\n{海|うみ}が とても きれいです。\n{孫|まご}に {会|あ}いたいです。', zh: '今天天氣很好。海非常漂亮。好想見孫兒。' },
    { ja: '{近所|きんじょ}の {小春|こはる}ちゃんが、{私|わたし}の {髪|かみ}を {切|き}ってくれました。\n{小|ちい}さいのに、とても {上手|じょうず}です。\n{将来|しょうらい}は {美容師|びようし}になりたいそうです。', zh: '鄰居的小春幫我剪了頭髮。年紀小小的，剪得卻很好。她說將來想當美容師。' },
    { ja: '{夕方|ゆうがた}、{海辺|うみべ}で ムギと レコードを {聞|き}きました。\nムギは〈{夜桜|よざくら}〉が {好|す}きみたい。しっぽを {振|ふ}っていました。', zh: '傍晚和ムギ在海邊聽唱片。ムギ好像喜歡〈夜桜〉，一直搖著尾巴。' },
    { ja: '{孫|まご}から {電話|でんわ}がありました。\nでも、{私|わたし}の {日本語|にほんご}は {通|つう}じません。\n{笑|わら}って「ハロー」と {言|い}うだけでした。', zh: '孫兒打電話來了。可是我說的日語，孩子聽不懂。我們只能笑著說「哈囉」。' },
    { ja: '{最近|さいきん}、{手紙|てがみ}を {書|か}く {練習|れんしゅう}をしています。\nいつか {孫|まご}が {読|よ}んでくれるかもしれないから。\n{難|むずか}しい {言葉|ことば}は {使|つか}わないようにしよう。', zh: '最近在練習寫信。說不定有一天，孫兒會讀到。不要用太難的字吧。' },
    { last: true, ja: '{言葉|ことば}が わからなくても、あなたの {笑顔|えがお}を {見|み}れば {全部|ぜんぶ} わかっていたよ。\nでも {本当|ほんとう}は、いつか あなたと {日本語|にほんご}で お{話|はなし}が したかった。\nこのページが {読|よ}めたなら、その {夢|ゆめ}は もう {叶|かな}ったね。\nありがとう。{大好|だいす}きよ。',
      zh: '就算語言不通，看到你的笑容，我就什麼都懂了。可是其實，我好想有一天能和你用日語聊天。如果你讀得懂這一頁，這個夢想就已經實現了。謝謝你。最喜歡你了。' }
  ];
  const ruby = (s) => esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>'), plain = (s) => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
  const passed = () => STAGES.filter((g) => ((state.stageTests || {})[g.id] || []).some((r) => r.passed)).length;
  const need = (k) => (PAGES[k].last ? STAGES.length : k);   // stages passed to read page k
  const open = (k) => k === 0 || passed() >= need(k);
  let el = null, at = 0, tab = 'g';
  // the books' index stickers down the right edge (2026-11-13, the user's picks: her diary washi with a stab binding, 町の手帳 a kraft
  // grid notebook with an elastic band; both lit as under a desk lamp by night)
  const tabs = () => `<div class="diary-tabs"><button type="button" data-diary="tab-g" aria-pressed="${tab === 'g'}" aria-label="外婆的日記">日記</button><button type="button" data-diary="tab-town" aria-pressed="${tab === 'town'}">町の手帳</button>${YEN.shown() ? `<button type="button" data-diary="tab-food" aria-pressed="${tab === 'food'}">美食手帳</button>` : ''}</div>`;   // 美食手帳 (YEN): once there has been 円
  const book = (body) => `<div class="diary-book ${tab === 'g' ? 'bk-g' : 'bk-note'}">${tabs()}<div class="bk-page">${body}</div></div>`;
  // 町の手帳 (test, 2026-11-09; a page each since 2026-11-10, the user): a cover — who waits, everyone at a glance (a tap: their
  // page), the test site's tools — then a page a person, turned over (‹ ›, or a swipe): their face, name, who they are (a line more
  // for each event of theirs), and the talks had with them, each to be read through there or played again (no 言靈 the second
  // time). One not met yet has a page too, all of it blurred.
  let tp = 0;   // the page open in 町の手帳: 0 the cover, k the k-th person
  const people = () => Object.keys(TOWN.CAST);
  const rubyEv = (s) => esc(s).replace(/\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const talksOf = (id) => TOWN.EVENTS.filter((e) => state.town.done[e.id] && (e.who === id || (e.lines || []).some((l) => Array.isArray(l) && l[0] === id)));
  function logOf(e) {   // a talk as it went: each line by who said it, the hero's answers as picked
    const name = (w) => (w === 'hero' ? '我' : (TOWN.CAST[w] || {}).name || w);
    const row = (w, ja, zh) => `<li><b>${esc(name(w))}</b>${ja ? `<span lang="ja">${rubyEv(ja)}</span>` : ''}<small>${esc(zh || '')}</small></li>`;
    return `<ol class="tb-lines">${TOWNEV.linesOf(e).map((l) => { if (Array.isArray(l)) return row(l[0], l[1], l[2]); const o = (l.opts || []).find((x) => x[1]); return o ? row('hero', o[0], o[2]) : ''; }).join('')}</ol>`;
  }
  function townCover() {
    const n = TOWNEV.openN();
    const wait = n ? `<section class="tb-wait"><b>還沒遇到的事件：${n} 件</b><p class="muted small">在鎮上走走，頭上有「！」的人就是在等你的人。做完今日練習，也可以到臥房的床上睡到早上、中午、傍晚或晚上，遇見不同時間出門的人。</p></section>` : '';   // how many, not who, where or when (2026-11-10, the user: let people find them, less pressure)
    const met = people().filter((id) => TOWNEV.seen(id)).length;
    return `${wait}<p class="tb-intro">鎮上的人：認識了 ${met} / ${people().length} 位。點一個人，翻到他的那一頁。</p>
      <div class="tb-index">${people().map((id) => { const k = TOWNEV.seen(id); return `<button type="button" class="tb-who${k ? '' : ' blur'}" data-page-of="${id}"><span class="tb-face">${TOWNEV.face(id)}</span><span>${k ? esc(TOWN.CAST[id].name) : '？？？'}</span></button>`; }).join('')}</div>
      ${onTestSite() ? townTools() : ''}`;
  }
  function townPage(id) {
    const c = TOWN.CAST[id], known = TOWNEV.seen(id), mine = TOWN.EVENTS.filter((e) => e.who === id && state.town.done[e.id]), talks = talksOf(id);
    if (!known) return `<section class="tb-page blur" data-id="${id}"><div class="tb-top"><div class="tb-face big">${TOWNEV.face(id)}</div><div class="tb-name"><b>？？？</b><span>？？？</span></div></div>
      <div class="tb-fog" aria-hidden="true"><p>這個人好像住在這附近，每天都在某個地方忙著。</p><p>聽說他和外婆以前也認識。</p><p>總有一天會在鎮上遇到吧。</p></div>
      <p class="tb-yet">還沒遇到這個人。</p></section>`;
    return `<section class="tb-page" data-id="${id}"><div class="tb-top"><div class="tb-face big">${TOWNEV.face(id)}</div><div class="tb-name"><b>${esc(c.name)}</b><ruby>${esc(c.kana || '')}</ruby><span>${esc(c.role)}</span></div></div>
      ${c.bio.slice(0, 1 + mine.length).map((b) => `<p class="tb-bio">${esc(b)}</p>`).join('')}
      <h4 class="tb-h">對話紀錄</h4>
      ${talks.length ? talks.map((e) => `<details class="tb-talk"><summary>${esc(e.title)}<small>${esc(TOWNEV.PLACE_NAME[e.at] || e.at)}・${esc(state.town.done[e.id])}</small></summary>${logOf(e)}<button type="button" class="tb-ev" data-replay="${esc(e.id)}">再讀一次<small>不再給言靈</small></button></details>`).join('')
        : '<p class="tb-yet">還沒和他好好聊過。</p>'}</section>`;
  }
  function townBook() {
    const all = people(); tp = Math.max(0, Math.min(all.length, tp));
    return `<div class="town-book"><p class="tb-count">${tp + 1} / ${all.length + 1}</p>${tp ? townPage(all[tp - 1]) : townCover()}</div>`;
  }
  // the test site only (the user, 2026-11-10: try every stage's people there): meet everyone and open every stop, see the town at
  // an hour of the day, start over, and play any event (no 言靈, nothing marked done)
  function townTools() {
    const hrs = [['now', '現在'], [7, '7 點'], [12, '12 點'], [17, '17 點'], [20, '20 點'], [23, '23 點']], cur = TOWNEV.clock ? TOWNEV.clock.h : 'now';
    const byUnit = {}; TOWN.EVENTS.forEach((e) => { (byUnit[e.u] = byUnit[e.u] || []).push(e); });
    return `<section class="town-tools"><b>測試用（只在測試站）</b>
      <div class="row-wrap mt-2"><button type="button" class="btn btn-sm" data-tool="meet">認識所有人、開通所有公車站</button><button type="button" class="btn btn-sm" data-tool="reset">小鎮事件從頭開始</button></div>
      <div class="row-wrap mt-2"><button type="button" class="btn btn-sm" data-tool="ship">郵輪：現在叫來（下一趟，不看日子、進度）</button><button type="button" class="btn btn-sm" data-tool="shipreset">郵輪：從第 1 趟重來</button><button type="button" class="btn btn-sm" data-tool="shipresult">郵輪：看結算畫面（不存）</button>${CRUISE.trips().slice(1).map((t, k) => `<button type="button" class="btn btn-sm" data-tool="shipto" data-trip="${t.id}">郵輪：跳到第 ${k + 2} 趟</button>`).join('')}</div>
      <div class="row-wrap mt-2"><button type="button" class="btn btn-sm" data-tool="yen-gift">円：+10,000</button><button type="button" class="btn btn-sm" data-tool="yen-all">${YEN.allOpen() ? '菜單：恢復要先學單字' : '菜單：全部開放'}</button><button type="button" class="btn btn-sm" data-tool="yen-full">今天吃喝次數歸零</button></div>
      <div class="row-wrap mt-2">時間（只改小鎮；「現在」也清掉睡覺跳過的時間）：${hrs.map(([h, n]) => `<button type="button" class="btn btn-sm" data-tool="hour" data-h="${h}" aria-pressed="${String(h) === String(cur)}">${n}</button>`).join('')}</div>
      ${Object.entries(byUnit).map(([u, list]) => `<div class="tt-unit"><span>${esc(u)}</span>${list.map((e) => `<button type="button" class="tb-ev" data-try="${esc(e.id)}">${esc(e.title)}<small>${esc((TOWN.CAST[e.who] || {}).name || e.who)}・${esc(TOWNEV.PLACE_NAME[e.at] || e.at)}${e.when === 'night' ? '・晚上' : ''}</small></button>`).join('')}</div>`).join('')}
    </section>`;
  }
  function tool(b) {
    const t = b.dataset.tool;
    if (t === 'meet') { Object.keys(TOWN.CAST).forEach((id) => { if (TOWN.CAST[id].art !== 'npc') state.town.seen[id] = 1; }); BUS_STOPS.forEach(([id]) => { state.town.stops[id] = 1; }); saveState(); toast('認識所有人、開通所有公車站了'); }
    if (t === 'reset') { state.town = { done: {}, seen: {}, stops: {}, talks: {} }; try { localStorage.removeItem('nq_chat'); } catch (e) { /* none kept */ } Object.keys(state.koto.found).filter((k) => k.startsWith('ev-')).forEach((k) => delete state.koto.found[k]); saveState(); toast('小鎮事件從頭開始'); }
    if (t === 'ship') { const x = CRUISE.force(); toast(x ? `第 ${CRUISE.trips().indexOf(x) + 1} 趟的郵輪在みなと漁港外的海上等你了（院子 → 海邊 → 往漁港）` : '郵輪的導覽都走完了', 3600); }
    if (t === 'shipreset') { CRUISE.reset(); toast('郵輪從第 1 趟重來'); }
    if (t === 'shipresult') CRUISE.preview();
    if (t.startsWith('yen-')) toast(YEN.tool(t.slice(4)));
    if (t === 'shipto') { CRUISE.skipTo(b.dataset.trip); toast('前面幾趟算走完了，郵輪在みなと漁港外的海上等你'); }
    if (t === 'hour') { TOWNEV.clock = b.dataset.h === 'now' ? null : { h: Number(b.dataset.h), day: new Date() }; if (b.dataset.h === 'now') { try { localStorage.removeItem('nq_wake'); } catch (e) { /* none kept */ } sceneTick(); } }   // 現在: a sleep's hours gone too
    show();
  }
  function show() {
    if (tab === 'food') { el.innerHTML = book(`${YEN.book()}<div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="x">闔上</button></div>`); return; }
    if (tab === 'town') { const n = people().length; el.innerHTML = book(`${townBook()}<div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="-1"${tp ? '' : ' disabled'}>‹ 上一頁</button><button type="button" class="btn btn-sm" data-diary="x">闔上</button><button type="button" class="btn btn-sm" data-diary="1"${tp < n ? '' : ' disabled'}>下一頁 ›</button></div>`); return; }
    const p = PAGES[at], ok = open(at);
    el.innerHTML = book(`<div class="diary-head"><span>おばあちゃんの{日記|にっき}${ok ? `<button type="button" class="talk-say" data-diary-say aria-label="唸出來">${icon('speaker')}</button>` : ''}</span><span>${at + 1} / ${PAGES.length}</span></div>
      <div class="diary-page${ok ? '' : ' locked'}" lang="ja">${p.ja.split('\n').map((l) => `<p>${ok ? ruby(l) : esc(plain(l))}</p>`).join('')}</div>
      ${ok ? `<details class="diary-zh"><summary>看中文</summary><p>${esc(p.zh)}</p></details>` : `<p class="diary-lock">還讀不懂。${p.last ? '通過所有階段測驗' : `通過「${esc(STAGES[need(at) - 1].title)}」的階段測驗`}，就讀得懂這一頁。</p>`}
      <div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="-1"${at ? '' : ' disabled'}>‹ 上一頁</button><button type="button" class="btn btn-sm" data-diary="x">闔上</button><button type="button" class="btn btn-sm" data-diary="1"${at < PAGES.length - 1 ? '' : ' disabled'}>下一頁 ›</button></div>`)
      .replace('おばあちゃんの{日記|にっき}', 'おばあちゃんの<ruby>日記<rt>にっき</rt></ruby>');
  }
  function close() { if (el) { el.remove(); el = null; } }
  function turn(d) { if (tab === 'town') tp = Math.max(0, Math.min(people().length, tp + d)); else at = Math.max(0, Math.min(PAGES.length - 1, at + d)); SND.play('page', { vol: 0.7 }); show(); }
  const said = (p) => p.ja.replace(/\n/g, '');   // a page read aloud, in her voice (2026-11-12)
  function openBook(which = 'g', who) {
    close(); tab = which; if (who) tp = people().indexOf(who) + 1; at = Math.max(0, PAGES.findIndex((_, k) => !open(k)) - 1); if (at < 0 || PAGES.every((_, k) => open(k))) at = PAGES.length - 1;   // at the last page read
    el = document.createElement('div'); el.className = 'diary'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '外婆的日記');
    let sx = null;   // a swipe turns the page
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); sx = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => { if (!sx) return; const dx = e.clientX - sx[0], dy = e.clientY - sx[1]; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy) && e.target.closest('.diary-book')) { el._swiped = true; turn(dx < 0 ? 1 : -1); } });
    el.addEventListener('click', (e) => {
      if (el._swiped) { el._swiped = false; return; }   // the click after a swipe
      e.stopPropagation(); const b = e.target.closest('[data-diary]'), r = e.target.closest('[data-replay]');
      const tr = e.target.closest('[data-try]'), tl = e.target.closest('[data-tool]');
      if (tl) { tool(tl); return; }
      if (e.target.closest('[data-diary-say]')) { speakAs('granny', said(PAGES[at])); return; }
      if (r || tr) { const ev = TOWN.EVENTS.find((x) => x.id === (r || tr).dataset[r ? 'replay' : 'try']); close(); if (ev) TALK.open(document.body, ev.who, TOWNEV.linesOf(ev), () => openBook('town'), null, { ev: true }); return; }
      const po = e.target.closest('[data-page-of]'); if (po) { tp = people().indexOf(po.dataset.pageOf) + 1; show(); return; }
      if (b) { const d = b.dataset.diary; if (d === 'x') close(); else if (d.startsWith('tab-')) { tab = d.slice(4); show(); } else turn(Number(d)); }
      else if (e.target === el) close();
    });
    document.body.appendChild(el); show();
  }
  return { PAGES, open: openBook, close, readable: open, passed, said };
})();
// a few lines with someone (test, 2026-11-09): their face, their name, a line in Japanese (furigana; said aloud as it comes, 🔊 again) and in Chinese;
// a tap goes on. A present waits for 收下 (its thumbnail) — take(): it is theirs then — and done() once the last line is read.
// A line with no Japanese is said in Chinese (林, now and then). Every line's Chinese is folded away under 中文 (open, it stays
// open for the rest of the talk; 2026-11-12, the user: a word with anyone too, not only in the events). The town's events (opt.ev,
// events.js) are several people's lines, the hero's among them ([who, ja, zh]); a word glossed ({漢字|かな|中文}) has its Chinese under the line;
// at a reply choice ({ ask, opts: [[ja, right, zh | why wrong]] }) the hero picks what to say: a wrong one shakes and says why,
// and can be tried again; the right one is said, and the talk goes on
const TALK = (() => {
  let cur = null;
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>'), plain = (s) => s.replace(MARK, '$1');
  const glosses = (s) => [...new Set([...s.matchAll(MARK)].filter((m) => m[3]).map((m) => `${m[1]}（${m[2]}）${m[3]}`))];   // a word twice in a line: noted once
  const who = (id) => (id === 'hero' ? { name: '我', role: '' } : NPCS[id] || TOWN.CAST[id] || CRUISE.tag(id) || (TOWN.YATAI || {})[id]);   // the cruise's passengers too (CRUISE), the 緣日's stall keepers
  // a line as shown: { id, ja, zh, kind } or a reply choice { ask, opts }; an event's line may have a sound as it shows (snd: SND's),
  // a cry said instead of reading it out (cry: VOICE_FX's) and someone moving as it is said (move, for onLine; 2026-11-13, the cruise)
  const line = (l) => (!cur.ev ? { id: cur.id, ja: l[0], zh: l[1], kind: l[2] } : Array.isArray(l) ? Object.assign({}, l[3], { id: l[0], ja: l[1], zh: l[2] }) : l);
  const say = (ja, id, cry) => (castSays(ja) ? `<button type="button" class="talk-say" data-talk="say" data-ja="${esc(ja)}" data-who="${esc(id)}"${cry ? ` data-cry="${esc(cry)}"` : ''} aria-label="唸出來">${icon('speaker')}</button>` : '');   // in their own voice (speakAs); a silence 「…………。」: none
  // a reply choice's options in an order of their own (2026-11-13: events.js lists the right one first, all 385 of them), the
  // same each time it is drawn again (a wrong one tried)
  const order = (L) => cur.order[cur.i] || (cur.order[cur.i] = L.opts.map((o, k) => [k, Math.random()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]));
  function show() {
    const L = cur.said || line(cur.lines[cur.i]);
    if (L.ask) {
      cur.el.innerHTML = `<div class="talk-card asking"><div class="talk-face">${TOWNEV.face('hero')}</div><div class="talk-body">
        <div class="talk-name">我<span>${esc(L.ask)}</span></div>
        <div class="talk-opts">${order(L).map((k) => { const o = L.opts[k]; return `<div class="talk-opt${cur.wrong.includes(k) ? ' wrong' : ''}" data-pick="${k}"><button type="button" class="talk-pick" lang="ja">${ruby(o[0])}</button>${say(o[0], 'hero')}</div>`; }).join('')}</div>
        ${cur.why ? `<p class="talk-why">${esc(cur.why)}</p>` : ''}</div></div>`;
      stopSilence(); return;   // the hero picks: nothing read meanwhile
    }
    const n = who(L.id), w = n.gift, gl = cur.ev ? glosses(L.ja) : [];
    cur.el.innerHTML = `<div class="talk-card"><div class="talk-face">${TOWNEV.face(L.id)}</div><div class="talk-body">
      <div class="talk-name">${esc(n.name)}<span>${esc(n.role)}</span></div>
      ${!L.ja ? `<p class="talk-zh">${esc(L.zh)}</p>` : `<p class="talk-ja" lang="ja">${ruby(L.ja)} ${say(L.ja, L.id, L.cry)}</p>${gl.length ? `<p class="talk-gloss">${gl.map(esc).join('　')}</p>` : ''}
      <p class="talk-zh${cur.zh ? '' : ' hide'}">${esc(L.zh)}</p>${cur.zh ? '' : '<button type="button" class="zh-btn" data-talk="zh">中文</button>'}`}
      ${L.pick ? `<div class="talk-picks">${L.pick.map(([t], k) => `<button type="button" class="btn btn-sm${k ? '' : ' btn-primary'}" data-choose="${k}" lang="ja"><span>${ruby(t)}</span></button>`).join('')}</div>` : L.kind === 'gift' ? `<div class="talk-gift">${DECOR.thumb(w)}<b>${esc(WARE.get(w).name)}</b><button type="button" class="btn btn-primary btn-sm" data-talk="take">收下</button></div>` : '<span class="talk-next" aria-hidden="true">▼</span>'}</div></div>`;
    if (L.kind === 'gift') fitThumbs(cur.el);
    const at = (cur.said ? 's' : '') + cur.i;   // a line new on the screen is said at once, in its speaker's voice (2026-11-12, the user); drawn again (中文): not again
    if (L.ja && cur.spoke !== at) { cur.spoke = at; speakAs(L.id, L.ja, L.cry); if (L.snd) SND.play(L.snd); if (cur.onLine) cur.onLine(L); }   // onLine: whoever says it moves (CRUISE)
    if (!L.ja || !castSays(L.ja)) stopSilence();   // nothing to read here: the player kept awake for it rests
  }
  function pick(k) {
    const L = line(cur.lines[cur.i]), o = L.opts[k]; if (!o || cur.wrong.includes(k)) return;
    if (!o[1]) { cur.wrong.push(k); cur.why = o[2] || ''; show(); const el = cur.el.querySelector(`.talk-opt[data-pick="${k}"]`); if (el) el.classList.add('shake'); playSfx('bad'); return; }
    playSfx('good'); if (cur.onAnswer) cur.onAnswer(cur.i, cur.wrong.length); cur.said = { id: 'hero', ja: o[0], zh: o[2] || '' }; show();   // onAnswer: right after so many wrong ones (CRUISE's pay)
  }
  function next() {
    if (!cur) return;
    if (!cur.said && (line(cur.lines[cur.i]).ask || line(cur.lines[cur.i]).pick)) return;   // the hero has to pick
    if (cur.said) cur.said = null;
    if (!cur.ev && cur.lines[cur.i][2] === 'gift' && cur.take) { cur.take(); cur.take = null; }
    cur.wrong = []; cur.why = '';
    if (++cur.i < cur.lines.length) { show(); return; }
    const d = cur.done; close(); if (d) d();
  }
  function open(root, id, lines, done, take, opt = {}) {
    close();
    const el = document.createElement('div'); el.className = 'talk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', who(id).name);
    cur = { el, id, lines, done, take, i: 0, ev: Boolean(opt.ev), zh: false, wrong: [], why: '', said: null, onLine: opt.onLine, onAnswer: opt.onAnswer, order: {} };
    SND.duck(true);   // the music and the world's sounds down for the whole talk, not only while a line is read (2026-11-12, the user)
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation(); primeTtsPlayer();   // inside the tap: the next line (or 🔊) is let play while its clip is fetched (iOS)
      const sayBtn = e.target.closest('[data-talk="say"]'); if (sayBtn) { speakAs(sayBtn.dataset.who, sayBtn.dataset.ja, sayBtn.dataset.cry); return; }
      const ch = e.target.closest('[data-choose]'); if (ch) { const then = line(cur.lines[cur.i]).pick[Number(ch.dataset.choose)][1]; close(); then(); return; }   // a choice (pick): on from there
      if (e.target.closest('[data-talk="zh"]')) { cur.zh = true; show(); return; }
      const p = e.target.closest('[data-pick]'); if (p) { pick(Number(p.dataset.pick)); return; }
      if (!cur.ev && cur.lines[cur.i][2] === 'gift' && !e.target.closest('[data-talk="take"]')) return;   // the present waits for 收下
      next();
    });
    root.appendChild(el); show();
  }
  function close() { const was = Boolean(cur); if (cur) { if (cur.spoke !== undefined) stopSpeaking(); stopSilence(); cur.el.remove(); cur = null; SND.duck(false); } TOWNLIFE.release(); if (was) setTimeout(() => { if (document.body.classList.contains('scene')) sceneMinute(); }, 0); }   // what was being said stops with it; whoever was held strolls on; the hour's changes kept back meanwhile, now
  return { open, close, on: () => Boolean(cur && cur.el.isConnected) };
})();
// every line the talks can read aloud, and whose it is: the generator makes each a clip in its speaker's voice (CAST_VOICE)
function talkLines() {
  const out = [], add = (who, ja) => { if (ja) out.push([who, ja]); };
  Object.keys(NPCS).forEach((id) => [...NPCS[id].hello(0), ...NPCS[id].hello(1)].forEach((l) => add(id, l[0])));   // their chat is in TOWN.CHAT
  Object.keys(TOWN.CHAT).forEach((id) => TOWN.CHAT[id].forEach((l) => add(id, l[1])));
  TOWN.EVENTS.forEach((e) => e.lines.concat(e.met ? e.met.head : []).forEach((l) => (Array.isArray(l) ? add(l[0], l[1]) : (l.opts || []).forEach((o) => add('hero', o[0])))));   // met: the opening for one who knew them already
  Object.values(NPC.DOOR).forEach((ls) => ls.forEach((l) => add('hero', l[0])));
  DIARY.PAGES.forEach((p) => add('granny', DIARY.said(p)));
  CRUISE.lines(add); YEN.lines(add);   // the cruise's, buying with 円
  Object.keys(TOWN.YATAI || {}).forEach((id) => { if (TOWN.YATAI[id].scoop) add(id, TOWN.YATAI[id].scoop[0]); });   // the goldfish's old man
  return out;
}
// the beach (test, 2026-11-09), along the yard to the left: the sea to the horizon, an island, glints, waves washing in on wet
// sand, the beach; ムギ's mat under a parasol with his record player, ムギ on it once he has come by
const BEACH_PROP = [-120, -214, 240, 222];
// 2026-11-11 (the user: finer): the mat's stripes kept inside it, a fringe at its ends, its front edge in shade; the pole lit on
// one side with a joint, stuck in a little heap of sand; the parasol lit on its left, shaded on its right, a hem along its
// scallops and a knob on top; ムギ's record player with a speaker grille, two knobs, grooves and a sheen on the record, a tone arm
const BEACH_PROP_ART = () => `<ellipse cx="0" cy="-2" rx="112" ry="8" fill="#2b1c12" fill-opacity=".12"/>
  <path d="M-108 4 L84 4 L108 -16 L-84 -16 Z" ${hc('#f2ece0', '#3a3a58')}/><path d="${[-70, -30, 10, 50].map((x) => `M${x - 5} 4 H${x + 5} L${x + 29} -16 H${x + 19} Z`).join(' ')}" ${hc('#7fb3d8', '#2c3460')}/>
  <path d="M-106 2.4 H85.6" stroke="#2b1c12" stroke-opacity=".1" stroke-width="2"/><path d="M-84 -15 H107" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>
  <path d="${[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => `M${-108 + 24 * t} ${4 - 20 * t} h-4 M${84 + 24 * t} ${4 - 20 * t} h4`).join(' ')}" ${hs('#e2d8c4', '#34345a')} stroke-width="1.2"/>
  <ellipse cx="56.4" cy="-5.4" rx="5.4" ry="1.7" ${hc('#e6d6ac', '#3a3858')}/>
  <path d="M56 -6 L24 -196" ${hs('#efe7d8', '#4a4a6a')} stroke-width="5"/><path d="M57.6 -8 L25.8 -192" stroke="#2b1c12" stroke-opacity=".14" stroke-width="1.4"/><path d="M38.3 -90.9 L45 -92.1" ${hs('#c9c0ae', '#3a3a5a')} stroke-width="3"/>
  <path d="M-62 -150 Q24 -236 112 -150 Q90 -140 68 -150 Q46 -140 24 -152 Q2 -140 -20 -150 Q-42 -140 -62 -150 Z" ${hc('#e86f5e', '#4a2c48')}/>
  <path d="M-20 -150 Q2 -140 24 -152 Q46 -140 68 -150 Q50 -206 24 -212 Q0 -204 -20 -150 Z" ${hc('#fbf3e6', '#4c4a6a')}/>
  <path d="M68 -150 Q59.9 -175.2 50.4 -189.4 Q80.8 -180.5 112 -150 Q90 -140 68 -150 Z" fill="#2b1c12" fill-opacity=".1"/>
  <path d="M-50 -158 Q-32 -178 -12 -183" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>
  <path d="M-62 -150 Q-42 -140 -20 -150 Q2 -140 24 -152 Q46 -140 68 -150 Q90 -140 112 -150" fill="none" stroke="#2b1c12" stroke-opacity=".16" stroke-width="1.4"/>
  <circle cx="24" cy="-211.6" r="2" ${hc('#c9a06a', '#4a3a50')}/>
  <rect x="22" y="-36" width="44" height="22" rx="3" ${hc('#5a8f7b', '#26304e')}/><rect x="22" y="-19" width="44" height="5" rx="2" fill="#2b1c12" fill-opacity=".12"/><path d="M24 -34.6 H64" stroke="#fff" stroke-opacity=".25" stroke-width=".8"/>
  <rect x="26" y="-31" width="15" height="11.4" rx="2" ${hc('#4a7a68', '#1e2642')}/><path d="M28 -28.4 h11 M28 -25.6 h11 M28 -22.8 h11" stroke="#2b1c12" stroke-opacity=".25" stroke-width=".8"/>
  <circle cx="52" cy="-25" r="2.2" ${hc('#efe6d6', '#4a4a6a')}/><circle cx="59" cy="-25" r="2.2" ${hc('#efe6d6', '#4a4a6a')}/><path d="M52 -25 v-1.6 M59 -25 l1.1 -1.1" stroke="#2b1c12" stroke-opacity=".4" stroke-width=".6"/>
  <ellipse cx="44" cy="-37" rx="17" ry="5" ${hc('#2a2730', '#141428')}/><ellipse cx="44" cy="-37" rx="12.6" ry="3.7" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width=".5"/><ellipse cx="44" cy="-37" rx="8.6" ry="2.5" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width=".5"/>
  <path d="M30.6 -38.6 Q36 -41.2 42 -41.6" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".9" stroke-linecap="round"/>
  <ellipse cx="44" cy="-37" rx="4" ry="1.4" ${hc('#e3907f', '#5a3a4a')}/><circle cx="44" cy="-37" r=".5" fill="#fbf7ec"/>
  <circle cx="61.2" cy="-38.4" r="2" ${hc('#c9c4b8', '#4a4a6a')}/><path d="M61 -38.2 L50.8 -34.6" ${hs('#c9c4b8', '#4a4a6a')} stroke-width="1.6"/><path d="M51.8 -35 l-2.4 .9" ${hs('#6a6a74', '#2a2c50')} stroke-width="2.2"/>`;
function beachHtml() {
  const k = yScale(64), [x0, y0, w, h] = BEACH_PROP;
  // 2026-11-10: taller, gulls over it, a fishing boat far out, the harbour's breakwater and lighthouse far off on the left (the
  // way down there), a beach hut with its flag, driftwood; on the right a grassy bank and a boardwalk up to the yard
  const gull = (x, y, k2) => `<g transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${k2 * 6}s"><path class="hs fx-wing" d="M-14 0 q7 -9 14 0 q7 -9 14 0" style="--c:#f6f6f2;--n:#9a9ec8;animation-delay:-${k2 * 0.25}s" stroke-width="3"/></g></g>`;
  // 2026-11-11 (the user: finer): every small thing drawn again in its own spot and size — shade, light and small parts inside
  const dk = (o) => `fill="#2b1c12" fill-opacity="${o}"`, f1 = (n) => n.toFixed(1);
  // the boats far out: the sailboat's hull with a stripe and its shaded keel, a mast, a full sail with a seam, the jib; the
  // fishing boat's hull with a white line and a shaded keel, its cabin with a roof and two windows (lit by night), foam at its bow
  const boats = `<g class="fx-sail"><g class="fx-bob" style="animation-duration:4s"><path d="M120 150 h26 l-4 5 h-18 Z" ${hc('#f4f3ee', '#4a4c72')}/><path d="M121 151.2 h24.2" ${hs('#3f7ac8', '#2a3460')} stroke-width="1"/><path d="M122.4 153.6 h20.8 l-1.2 1.4 h-18 Z" ${dk('.16')}/>
        <path d="M133 149.6 V116.6" ${hs('#8a8f99', '#4a4c72')} stroke-width=".8"/><path d="M133.6 148.6 V118 Q147 130 150 146 Z" ${hc('#fbfaf6', '#6a6c92')}/><path d="M134 129 Q141 134 146.4 141" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".6"/>
        <path d="M131 146 Q124.6 137 120.4 126.4 V146 Z" ${hc('#e86f5e', '#4a2c48')}/></g></g>
      <g class="fx-bob" style="animation-duration:3.2s"><path d="M640 152 h40 l-5 6 h-30 Z" ${hc('#d0574b', '#2a2c50')}/><path d="M641 153.4 h38" stroke="#fff" stroke-opacity=".5" stroke-width=".9"/><path d="M644.6 156.6 h31.2 l-.8 1.4 h-29.6 Z" ${dk('.16')}/>
        <rect x="652" y="144" width="10" height="8" ${hc('#f4f3ee', '#4a4c72')}/><rect x="651.2" y="143" width="11.6" height="1.8" rx=".6" ${hc('#5a7a9a', '#3a3c5e')}/><rect x="653.8" y="146.4" width="2.6" height="2.4" ${hc('#7a9ab8', '#ffd98a')}/><rect x="657.8" y="146.4" width="2.6" height="2.4" ${hc('#7a9ab8', '#ffd98a')}/></g>`;
  // shells: a scallop each, a little turned — a fan with ribs, its hinge, a gleam
  const shells = [[180, 300, '#f0c2b0', -14], [470, 330, '#f6e3c8', 10], [860, 296, '#f0c2b0', 20], [1010, 336, '#f6e3c8', -8]].map(([x, y, c, r]) => `<g transform="rotate(${r} ${x} ${y})"><g${x === 470 ? ' data-fx="shell"' : ''} style="--c:${c}"><path class="shell" d="M${x - 1.6} ${y + 0.4} L${x - 6} ${y - 2.6} Q${x} ${y - 9.6} ${x + 6} ${y - 2.6} L${x + 1.6} ${y + 0.4} Z M${x - 2.6} ${y} H${x + 2.6} L${x + 1.8} ${y + 1.6} H${x - 1.8} Z"/><path d="M${x} ${y - 0.4} l-4.2 -3.4 M${x} ${y - 0.4} l-2.1 -5 M${x} ${y - 0.4} v-5.6 M${x} ${y - 0.4} l2.1 -5 M${x} ${y - 0.4} l4.2 -3.4" stroke="#2b1c12" stroke-opacity=".13" stroke-width=".5"/><path d="M${x - 3.6} ${y - 4.4} q1.6 -1.6 3.4 -2" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".7" stroke-linecap="round"/></g></g>`).join('');
  // the starfish: plump arms (its outline stroked round in its own colour), a groove down each arm, rows of little bumps, its middle
  const sp = (r, i) => { const a = -Math.PI / 2 + i * Math.PI / 5; return `${f1(700 + r * Math.cos(a))} ${f1(326 + r * Math.sin(a))}`; };
  const starD = `M${Array.from({ length: 10 }, (_, i) => sp(i % 2 ? 3.4 : 7, i)).join(' L')} Z`;
  const star = `<g data-fx="star"><path class="star" d="${starD}"/><path d="${starD}" ${hs('#e8875f', '#3a3050')} stroke-width="2.4"/><path d="${[0, 2, 4, 6, 8].map((i) => `M${sp(2.8, i)} h.01 M${sp(4.4, i)} h.01 M${sp(5.9, i)} h.01`).join(' ')}" ${hs('#f8b994', '#4c4264')} stroke-width="1.2"/><path d="${[1, 3, 5, 7, 9].map((i) => `M${sp(2.6, i)} L${sp(3.4, i)}`).join(' ')}" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".7" stroke-linecap="round"/><circle cx="700" cy="326" r="1.4" ${hc('#d0704a', '#2e2640')}/></g>`;
  // the crab: jointed legs that step in turn, a rounded shell lit on top with spots and shade under, a smile and blush; eyes on
  // stalks with a shine (eyes: up on a pinch); each claw an arm, a palm and a finger (nip) that snips when he pinches
  const cr = (s) => (dx, y) => `${f1(564 + s * dx)} ${y}`;
  const crabLegs = (s) => { const p = cr(s); return `M${p(9, 284)} L${p(16, 282.6)} L${p(19.4, 288.6)} M${p(9.4, 286.8)} L${p(17, 286.6)} L${p(19.6, 292.4)} M${p(8, 289.2)} L${p(14.4, 290.4)} L${p(16, 295.4)}`; };
  const claw = (s) => { const p = cr(s); return `<path d="M${p(8.6, 281)} Q${p(12.6, 279.6)} ${p(14, 275)}" ${hs('#e0584a', '#5a2a36')} stroke-width="2.4"/>
      <path d="M${p(16.6, 276.6)} Q${p(19.8, 272)} ${p(18, 266.6)} Q${p(16.4, 268.8)} ${p(14.6, 270.2)} Q${p(11.4, 271.6)} ${p(11.8, 274.6)} Q${p(12.6, 277.6)} ${p(16.6, 276.6)} Z" ${hc('#e0584a', '#5a2a36')}/><path d="M${p(17.4, 274.4)} Q${p(18.4, 271)} ${p(17.6, 268.6)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".7" stroke-linecap="round"/>
      <path d="M${p(14.6, 270.6)} Q${p(13.4, 267)} ${p(10.6, 266.2)} Q${p(11.2, 269.4)} ${p(12.6, 271.6)} Z" ${hcx(`nip ${s < 0 ? 'l' : 'r'}`, '#e0584a', '#5a2a36')}/>`; };
  const crab = `<g class="fx-crab" data-fx="crab"><g class="fx-legs"><path d="${crabLegs(-1)}" fill="none" ${hs('#c8453a', '#4a2030')} stroke-width="1.8"/></g><g class="fx-legs" style="animation-delay:-.09s"><path d="${crabLegs(1)}" fill="none" ${hs('#c8453a', '#4a2030')} stroke-width="1.8"/></g>
      <ellipse cx="564" cy="292.4" rx="10" ry="1.6" ${dk('.12')}/><path d="M553 284 Q553 276.6 564 276.6 Q575 276.6 575 284 Q575 290.8 564 291 Q553 290.8 553 284 Z" ${hc('#e0584a', '#5a2a36')}/>
      <path d="M556.2 281 Q557.4 277.8 564 277.6 Q570.6 277.8 571.8 281 Q564 279.4 556.2 281 Z" ${hc('#ec7868', '#6a3442')}/><path d="M554.6 287 Q564 293.6 573.4 287 Q564 290.2 554.6 287 Z" ${dk('.14')}/>
      <path d="M559.6 280.6 h.01 M568.4 280.6 h.01 M564 279.2 h.01" ${hs('#f6a090', '#7a4452')} stroke-width="1.2"/><path d="M561.8 285.6 q2.2 1.6 4.4 0" ${hs('#8a2a24', '#2a1420')} stroke-width=".8"/>
      <ellipse cx="557.6" cy="285" rx="1.6" ry=".9" fill="#f6b0a0" fill-opacity=".45"/><ellipse cx="570.4" cy="285" rx="1.6" ry=".9" fill="#f6b0a0" fill-opacity=".45"/>
      <g class="eyes"><path d="M561 281 V273.4 M567 281 V273.4" ${hs('#c8453a', '#4a2030')} stroke-width="1.4"/><circle cx="561" cy="272.4" r="2" fill="#2b2b33"/><circle cx="567" cy="272.4" r="2" fill="#2b2b33"/><circle cx="560.4" cy="271.7" r=".65" fill="#fff"/><circle cx="566.4" cy="271.7" r=".65" fill="#fff"/></g>
      <g class="claws">${claw(-1)}${claw(1)}</g></g>`;
  // the sandcastle: towers turned out of a bucket (tapered, ringed, shaded on the right, lit along the top), crenels, a window, the
  // door, a shell and a pebble pressed in; its mound wet and darker at the foot; the flag on a stick. Cheering: the flag flutters
  // and sand trickles down the towers (grain)
  const sandC = ['#e6d2a0', '#4a4466'], wetC = ['#c9b07c', '#3a3858'];
  const castle = `<g data-fx="castle"><ellipse cx="384" cy="318.6" rx="34" ry="2" ${dk('.1')}/><path d="M352 318 Q354.6 308.6 358 306 H410 Q413.4 308.6 416 318 Z" ${hc('#dcc48e', '#4a4466')}/><path d="M353.2 314.8 H414.8 L416 318 H352 Z" ${dk('.1')}/>
      <path d="M360 308 L361.2 290 H376.8 L378 308 Z M390 308 L391.2 284 H408.8 L410 308 Z" ${hc(...sandC)}/>
      <path d="M361.2 290.6 V286.8 Q361.2 286 362 286 H364.4 Q365.2 286 365.2 286.8 V290.6 Z M367 290.6 V286.8 Q367 286 367.8 286 H370.2 Q371 286 371 286.8 V290.6 Z M372.8 290.6 V286.8 Q372.8 286 373.6 286 H376 Q376.8 286 376.8 286.8 V290.6 Z M391.2 284.6 V280.8 Q391.2 280 392 280 H394.4 Q395.2 280 395.2 280.8 V284.6 Z M398 284.6 V280.8 Q398 280 398.8 280 H401.2 Q402 280 402 280.8 V284.6 Z M404.8 284.6 V280.8 Q404.8 280 405.6 280 H408 Q408.8 280 408.8 280.8 V284.6 Z" ${hc(...sandC)}/>
      <path d="M373.4 290 H376.8 L378 308 H374.2 Z M405.4 284 H408.8 L410 308 H406.2 Z M374 286 h2.8 v4 h-2.8 Z M405.6 280 h3.2 v4 h-3.2 Z" ${dk('.1')}/>
      <path d="M361.8 296 H376.6 M361.4 302 H377.2 M391.8 291 H408.6 M391.6 297.4 H408.8 M391.4 303 H409" stroke="#2b1c12" stroke-opacity=".08" stroke-width=".8"/><path d="M361.6 290.8 H373 M391.6 284.8 H405 M361.8 286.6 h3 M367.6 286.6 h3 M391.8 280.6 h3 M398.6 280.6 h3" stroke="#fff" stroke-opacity=".3" stroke-width=".8"/>
      <path d="M366.8 298 v-2.6 a2.2 2.2 0 0 1 4.4 0 v2.6 Z" ${hc(...wetC)}/><rect x="397" y="296" width="6" height="12" rx="3" ${hc(...wetC)}/><rect x="398.2" y="297.6" width="3.6" height="10.4" rx="1.8" ${dk('.14')}/>
      <path d="M405 301.6 l-2 -2.2 q2 -2.4 4 0 Z" ${hc('#f0c2b0', '#5a4a6a')}/><ellipse cx="364.6" cy="304" rx="1.3" ry=".9" ${hc('#9a96a0', '#2a2a46')}/>
      ${[[363.2, 286, 0], [374.8, 287, 0.25], [400, 281, 0.5], [393.2, 281, 0.12]].map(([x, y, d]) => `<circle cx="${x}" cy="${y}" r=".9" ${hcx('grain', ...wetC, `animation-delay:${d}s`)}/>`).join('')}
      <path d="M400 281 V264.6" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.4"/><circle cx="400" cy="264" r="1" ${hc('#8a6a4a', '#3a2c48')}/>
      <path d="M400.6 264.6 Q406.4 265.8 412.4 268.2 Q406.4 270.6 400.6 272 Z" ${hcx('fx-flag', '#d0453c', '#6a3048')}/></g>`;
  // the beach hut: plank walls with corner posts, shade under the eaves and at its foot; a straw roof in two tones of straw with a
  // darker eave and a lit left slope; the opening framed, a rolled blind over it, a ledge under it; the 氷 flag a proper kakigori
  // flag (white, a red 氷, blue waves along its foot) hung from a bar on a pole with a knob
  const straw = (dx, op, col) => `<path d="${Array.from({ length: 12 }, (_, k) => { const x = 758 + dx + k * 12, y0 = Math.max(176, 168 + Math.abs(x - 825) * 0.4 + 4); return `M${f1(x)} ${f1(y0)} L${f1(x - 4)} 196.4`; }).join(' ')}" stroke="${col}" stroke-opacity="${op}" stroke-width="1.2" stroke-linecap="round"/>`;
  const hut = `<rect x="760" y="196" width="130" height="62" ${hc('#c9a06a', '#2a2440')}/><path d="${Array.from({ length: 12 }, (_, k) => `M${770 + k * 10} 200 V258`).join(' ')}" stroke="#2b1c12" stroke-opacity=".1" stroke-width=".8"/>
      <rect x="760" y="196" width="4" height="62" ${hc('#a8804e', '#221c36')}/><rect x="886" y="196" width="4" height="62" ${hc('#a8804e', '#221c36')}/><rect x="760" y="198" width="130" height="7" ${dk('.14')}/><rect x="760" y="252" width="130" height="6" ${dk('.08')}/>
      <path d="M744 200 L825 168 L906 200 Z" ${hc('#b9a070', '#1e1c38')}/>${straw(0, '.22', '#2b1c12')}${straw(6, '.22', '#fff')}<path d="M749 198.8 L825 169.4" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>
      <path d="M744 200 H906 L897.4 196.6 H752.6 Z" ${hc('#a48a5c', '#18162e')}/><path d="M819 170.4 L825 168 L831 170.4" fill="none" ${hs('#9a8058', '#1a1832')} stroke-width="2"/>
      <rect x="776" y="214" width="98" height="30" ${hc('#efe6d6', '#ffd98a')}/><rect x="776.6" y="214.6" width="96.8" height="28.8" fill="none" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1.2"/>
      <rect x="776" y="214" width="98" height="4.4" ${hc('#c9a86a', '#6a5a40')}/><path d="M776 216.2 H874" stroke="#2b1c12" stroke-opacity=".15" stroke-width=".6"/><path d="M790 214 v5.4 M860 214 v5.4" ${hs('#b0453c', '#5a2a3a')} stroke-width=".8"/>
      <rect x="772" y="243" width="106" height="3.6" rx="1" ${hc('#a8804e', '#2c2440')}/><path d="M772.8 243.5 H877.2" stroke="#fff" stroke-opacity=".25" stroke-width=".7"/>`;
  const kakigori = `<path d="M900 258 V178" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><circle cx="900" cy="177" r="2" ${hc('#8a6a4a', '#3a2c48')}/>
      <g class="fx-flag"><path d="M900 180.4 H922" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.4"/><path d="M901 181 h20 v39 h-20 Z" ${hc('#fbf7ec', '#4a4c72')}/><path d="M901 213 q2.5 -2.6 5 0 t5 0 t5 0 t5 0 V220 H901 Z" ${hc('#3f7ac8', '#2a3460')}/>
        <path d="M901 215.8 q2.5 -2.2 5 0 t5 0 t5 0 t5 0" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".7"/><path d="M917.8 182 V212" stroke="#2b1c12" stroke-opacity=".06" stroke-width="3"/>
        <text x="911" y="196" text-anchor="middle" font-size="9" font-weight="700" ${hc('#d0453c', '#8a4050')} font-family="system-ui, sans-serif">氷</text></g>`;
  // driftwood: a bleached branch with a lit top, grain, a knot, its cut end, a shadow on the sand
  const drift = `<ellipse cx="300" cy="343" rx="38" ry="2.4" ${dk('.1')}/><path d="M260.4 337.6 Q290 329.4 320 335 Q329 336.8 336.6 331.4 Q340.6 332.4 339.6 335.6 Q331 342.6 320 341 Q290 335.4 261.2 343 Q257.2 341.4 260.4 337.6 Z" ${hc('#a8875e', '#3a3050')}/>
      <path d="M262.6 337.8 Q290 330.8 319.6 336.2 Q328.6 337.8 336.4 332.6" fill="none" ${hs('#cdb48c', '#4a4266')} stroke-width="1.2"/><path d="M272 339.4 Q284 335.8 298 336.4 M304 337.6 Q312 337.4 318 339" fill="none" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".6"/>
      <ellipse cx="308.6" cy="337.6" rx="2" ry="1.2" ${hc('#8a6c48', '#2c2440')}/><ellipse cx="260.2" cy="340.2" rx="1.6" ry="2.8" ${hc('#c9ad84', '#4a4266')}/>`;
  // the boardwalk: its shadow on the ground, the boards lit along the back with seams and nails, its front edge; posts with lit caps
  // and a shaded side; the rail lit along its top
  const boards = `<path d="M980 314 L1220 306 V311 L983 318 Z" ${dk('.1')}/><path d="M980 300 L1220 292 V306 L980 314 Z" ${hc('#c9a06a', '#3a2c40')}/><path d="M980 310.6 L1220 302.6 V306 L980 314 Z" ${hc('#a8804e', '#2a2440')}/><path d="M980 300.8 L1220 292.8" stroke="#fff" stroke-opacity=".25" stroke-width=".8"/>
      <path d="${Array.from({ length: 12 }, (_, k2) => `M${990 + k2 * 20} ${f1(299.6 - k2 * 0.66)} v10.8`).join(' ')}" ${hs('#a8804e', '#2a2440')} stroke-width="1.2"/><path d="${Array.from({ length: 12 }, (_, k2) => `M${987.6 + k2 * 20} ${f1(302 - k2 * 0.66)} h.01 M${987.6 + k2 * 20} ${f1(308 - k2 * 0.66)} h.01`).join(' ')}" stroke="#2b1c12" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>
      ${[1000, 1060, 1120, 1180].map((x) => `<rect x="${x}" y="276" width="4" height="22" ${hc('#8a6a4a', '#2c2440')}/>`).join('')}<path d="${[1000, 1060, 1120, 1180].map((x) => `M${x + 3.2} 277.6 V297.4`).join(' ')}" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1.6"/><path d="${[1000, 1060, 1120, 1180].map((x) => `M${x + 0.6} 276.8 h2.8`).join(' ')}" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>
      <path d="M1000 282 L1184 278" ${hs('#8a6a4a', '#2c2440')} stroke-width="2"/><path d="M1000 281.2 L1184 277.2" stroke="#fff" stroke-opacity=".22" stroke-width=".7"/>`;
  return `<svg class="land tall beach-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      ${gull(260, -140, 0)}${gull(700, -220, 1)}${gull(980, -90, 2)}
      <path d="M940 148 C990 128 1050 108 1110 100 C1150 96 1190 98 1220 102 V148 Z" ${hc('#a6bd96', '#161c38')}/><path d="M1124 92 l5 -6 l12 -5 l12 5 l5 6 Z" ${hc('#c8553f', '#3a2030')}/><rect x="1130" y="92" width="22" height="9" ${hc('#efe4d2', '#1e2042')}/><path d="M1138 104 L1118 112 L1140 120 L1104 130 L1128 138" fill="none" ${hs('#e3cf9e', '#3a3858')} stroke-width="1.6"/>
      <path class="sea" d="M-20 146 H1220 V242 H-20 Z"/><path class="sea-far" d="M-20 146 H1220 V158 H-20 Z"/>
      <path d="M-20 142 H120 V148 H-20 Z" ${hc('#b4ad9e', '#2a2c48')}/><rect x="116" y="114" width="8" height="30" ${hc('#f4f1ea', '#4a4c72')}/><rect x="116" y="122" width="8" height="5" ${hc('#d0453c', '#5a2030')}/><rect x="116" y="132" width="8" height="5" ${hc('#d0453c', '#5a2030')}/><circle class="fx-blink glow" cx="120" cy="112" r="6" fill="#fff3b0"/>
      ${boats}
      <path class="isle" d="M850 147 C868 132 892 124 918 132 C934 124 962 128 982 147 Z"/><path class="isle" d="M240 147 C252 140 266 138 278 147 Z"/>
      ${[[300, 172, 40], [520, 192, 60], [760, 178, 30], [640, 214, 70], [420, 226, 50], [960, 204, 44]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
      ${moonGlitter(330, 160, 236)}
      <path class="wet" d="M-20 236 C200 230 400 242 600 238 S1000 230 1220 238 V258 H-20 Z"/>
      <path class="foam" d="M-20 240 C120 234 240 246 380 240 S640 232 780 240 S1060 246 1220 238"/>
      <path class="sand" d="M-20 252 C300 246 700 256 1220 248 V370 H-20 Z"/>
      ${Array.from({ length: 7 }, (_, k) => `<ellipse cx="${740 - k * 26 + (k % 2) * 6}" cy="${300 - k * 7 + (k % 2) * 4}" rx="3.4" ry="2" ${hc('#d8c49a', '#2a2a46')}/>`).join('')}
      ${shells}
      ${star}
      ${crab}
      ${castle}
      ${hut}<path d="M748 202 Q786 210 825 202 Q864 210 902 202" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width="1"/>${Array.from({ length: 9 }, (_, k) => { const x = 752 + k * 18.5, yy = 202 + 6 * Math.sin(Math.PI * ((x - 748) % 77) / 77); return `<circle cx="${x}" cy="${yy + 3}" r="2.6" ${hc('#e8e4d8', '#ffe08a')}/><circle class="glow" cx="${x}" cy="${yy + 3}" r="9" fill="url(#glw)"/>`; }).join('')}${lightPool(825, 262, 80)}<text x="825" y="234" text-anchor="middle" font-size="13" font-weight="700" ${hc('#2f5a9a', '#3a3456')} font-family="system-ui, sans-serif">海の家</text>
      ${kakigori}
      ${drift}
      <path class="near" d="M1060 370 C1074 320 1094 270 1124 232 C1150 196 1180 168 1220 156 V370 Z"/>${[1100, 1140, 1180].map((x) => `<path d="M${x} ${330 - (x - 1100) * 0.9} q4 -12 8 0 M${x + 6} ${331 - (x - 1100) * 0.9} q5 -10 9 -1" ${hs('#7f9d6c', '#1a2a3a')} stroke-width="2"/>`).join('')}
      ${boards}
    </svg>
    ${yHeroHtml()}
    <div class="busstop beach-prop" aria-hidden="true" style="width:${w}px;height:${h}px;margin-left:${x0}px;bottom:${-(y0 + h)}px;transform-origin:${-x0}px ${-y0}px;transform:translate(-120px,-64px) scale(${k.toFixed(3)});z-index:${300 - 64}"><svg viewBox="${BEACH_PROP.join(' ')}">${BEACH_PROP_ART()}</svg></div>
    ${TOWNEV.castHtml('beach')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="yard" aria-label="回院子" style="margin-left:${YARD_HALF - 72}px;bottom:70px"><span class="tag">${ySign('today', '回院子')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="harbor" aria-label="往漁港" style="margin-left:-452px;bottom:14px"><span class="tag">${ySign('wave', '往漁港')}</span></button>
    <div class="ysel"></div>`;
}
// the town (test, 2026-11-09), along the yard to the right: a row of little shops on a paved street — 小春's salon first, the
// rest not open yet (a tap: 準備中). 小春 stands in her doorway once she has come by; a tap on her or the salon for a word
const TOWN_SHOPS = [   // [x in the land's 1200, width, height, wall, awning, sign, id] — 2026-11-09: 八百屋 and 本屋 gave way to まんぷく食堂 and 居酒屋とり吉
  [150, 150, 128, '#f6e9e4', '#e58fa8', '美容室 こはる', 'salon'], [320, 120, 112, '#f3e3c4', '#d9a43a', '森のパン', 'bakery'], [460, 132, 140, '#efe6d6', '#3f4a6e', 'まんぷく食堂', 'shokudo'],
  [612, 118, 118, '#efe1d2', '#6e4f3a', '喫茶しずく', 'cafe'], [748, 124, 104, '#e6efe2', '#4f7a4a', 'ひなた花店', 'flowers'], [890, 140, 132, '#e8dccb', '#8a2f2a', '居酒屋とり吉', 'izakaya'], [1050, 120, 116, '#e9e4f1', '#6b4d8a', '雑貨りんりん', 'goods']];
const TOWN_FOOT = 236;   // the shops' fronts stand on this line of the land (y), 134 px up
// what an open shop shows in its window or before it (2026-11-10): x, w its front, t its top, f its foot. 2026-11-11 (the user:
// finer): a wooden shelf with a lit edge; the bakery's round loaf scored, a melon pan with its grid, a slashed roll and a
// croissant in its folds; the 食堂's food samples (omurice with ketchup, ramen with naruto and chopsticks, karaage with lemon)
// with price cards; the flower shop's pails with a rim and bands, tulips, sunflowers, little pinks with baby's breath; the
// café's board in a frame with a cup, a cake and the day's lines in chalk; the wind chimes' glass with a goldfish, a
// morning glory, cherry petals, a clapper and a strip that flutter when rung; the salon's pot with a rim, veined leaves
const shopShelf = (x, w, f, c) => `<rect x="${x + 11}" y="${f - 29}" width="${rd1(w * 0.42 - 2)}" height="2.8" rx=".8" ${hc(c, '#3a2c40')}/><path d="M${x + 12} ${f - 28.6} h${rd1(w * 0.42 - 4)}" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>`;
const SHOP_SHOW = {
  bakery: (x, w, t, f) => { const [b0, b1, b2] = [0, 1, 2].map((k) => x + 22 + k * 15), y = f - 33;
    return `${shopShelf(x, w, f, '#a8743f')}
      <ellipse cx="${b0}" cy="${y}" rx="7" ry="4.6" ${hc('#c8823c', '#4a3a3a')}/><path d="M${b0 - 6.6} ${y + 1.4} Q${b0} ${y + 5.6} ${b0 + 6.6} ${y + 1.4} Q${b0} ${y + 3.4} ${b0 - 6.6} ${y + 1.4} Z" fill="#2b1c12" fill-opacity=".15"/><path d="M${b0 - 3.6} ${y - 1.2} q3.6 -2 7.2 0 M${b0 - 2.4} ${y + 1} q2.4 -1.4 4.8 0" fill="none" stroke="#f6dcaa" stroke-opacity=".85" stroke-width=".9"/>
      <path d="M${b1 - 6.6} ${y + 4} Q${b1 - 6.6} ${y - 4.6} ${b1} ${y - 4.6} Q${b1 + 6.6} ${y - 4.6} ${b1 + 6.6} ${y + 4} Z" ${hc('#e0b060', '#4a3a3a')}/><path d="M${b1 - 4} ${y - 2.6} l6 6 M${b1 - 1} ${y - 4} l7 7 M${b1 - 5.4} ${y + 0.4} l3.6 3.6 M${b1 + 4} ${y - 2.6} l-6 6 M${b1 + 1} ${y - 4} l-7 7 M${b1 + 5.4} ${y + 0.4} l-3.6 3.6" stroke="#b07a30" stroke-opacity=".55" stroke-width=".7"/><path d="M${b1 - 4.4} ${y - 2.4} q2 -1.6 4.4 -1.8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx="${b2}" cy="${y + 0.6}" rx="7.4" ry="3.2" transform="rotate(-8 ${b2} ${y + 0.6})" ${hc('#b8702e', '#4a3a3a')}/><path d="M${b2 - 4} ${y + 1.4} l2 -2.4 M${b2 - 0.6} ${y + 1} l2 -2.4 M${b2 + 2.8} ${y + 0.4} l2 -2.4" stroke="#f0cc8a" stroke-opacity=".85" stroke-width="1" stroke-linecap="round"/>
      <path d="M${x + 21} ${f - 41} Q${x + 23} ${f - 47.6} ${x + 30} ${f - 48} Q${x + 37} ${f - 47.6} ${x + 39} ${f - 41} Q${x + 36} ${f - 43.2} ${x + 34} ${f - 42} Q${x + 30} ${f - 44.4} ${x + 26} ${f - 42} Q${x + 24} ${f - 43.2} ${x + 21} ${f - 41} Z" ${hc('#d8a050', '#4a3a3a')}/><path d="M${x + 26} ${f - 47} q1 2.4 0 4.6 M${x + 30} ${f - 47.8} v5 M${x + 34} ${f - 47} q-1 2.4 0 4.6" fill="none" stroke="#a8702e" stroke-opacity=".6" stroke-width=".8"/><path d="M${x + 24} ${f - 45.6} q4 -2 9 -1.6" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".9" stroke-linecap="round"/>`; },
  shokudo: (x, w, t, f) => { const [c0, c1, c2] = [0, 1, 2].map((k) => x + 22 + k * 17), plate = (cx) => `<ellipse cx="${cx}" cy="${f - 30.6}" rx="7.5" ry="2.4" ${hc('#fbf8f0', '#5a5a7a')}/><path d="M${cx - 6} ${f - 29.6} q6 1.6 12 0" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".8"/>`;
    return `${shopShelf(x, w, f, '#7a5230')}
      ${plate(c0)}<path d="M${c0 - 5.4} ${f - 31} Q${c0 - 5.4} ${f - 37.4} ${c0} ${f - 37.4} Q${c0 + 5.4} ${f - 37.4} ${c0 + 5.4} ${f - 31} Z" ${hc('#f2c94c', '#4a4030')}/><path d="M${c0 - 3.2} ${f - 34.6} l1.6 -1 l1.6 1 l1.6 -1 l1.6 1" fill="none" ${hs('#d0453c', '#4a2030')} stroke-width="1"/><path d="M${c0 - 3.6} ${f - 33} q1.6 -3 4 -3.4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/><circle cx="${c0 + 3.6}" cy="${f - 32}" r=".9" ${hc('#5f9a4a', '#1c2a30')}/>
      ${plate(c1)}<path d="M${c1 - 6} ${f - 35} H${c1 + 6} Q${c1 + 5.6} ${f - 29.6} ${c1} ${f - 29.6} Q${c1 - 5.6} ${f - 29.6} ${c1 - 6} ${f - 35} Z" ${hc('#c84a3a', '#4a3a3a')}/><ellipse cx="${c1}" cy="${f - 35.2}" rx="5.8" ry="1.3" ${hc('#e8b060', '#4a4030')}/><path d="M${c1 - 4} ${f - 35.4} q1 -.8 2 0 t2 0 t2 0" fill="none" stroke="#f6e3a8" stroke-width=".8"/><circle cx="${c1 + 2.8}" cy="${f - 35.4}" r="1.1" fill="#fbf8f0"/><circle cx="${c1 + 2.8}" cy="${f - 35.4}" r=".45" fill="#e58fa8"/><path d="M${c1 - 6} ${f - 35} h12" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/><path d="M${c1 - 5} ${f - 38.6} L${c1 + 6.6} ${f - 36.4} M${c1 - 4.6} ${f - 39.8} L${c1 + 6.8} ${f - 37.4}" ${hs('#c58a54', '#3a2c40')} stroke-width=".8"/>
      ${plate(c2)}<ellipse cx="${c2 - 3.6}" cy="${f - 32.6}" rx="2.6" ry="1.6" ${hc('#b8d890', '#2a3a3a')}/>${[[-1.8, -33.4], [1.4, -34.6], [0.4, -32.4], [-3.4, -34.2]].map(([dx, dy]) => `<circle cx="${c2 + dx}" cy="${f + dy}" r="2" ${hc('#b8702e', '#4a3a3a')}/>`).join('')}<path d="M${c2 + 2.8} ${f - 32} a2.4 2.4 0 0 1 4.4 -1.4 Z" ${hc('#f2d84c', '#4a4030')}/><path d="M${c2 - 2.4} ${f - 34.8} l1 -.4 M${c2 + 0.6} ${f - 36} l1 -.4" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>
      ${[c0, c1, c2].map((cx) => `<rect x="${cx - 2.4}" y="${f - 28.4}" width="4.8" height="2.2" rx=".4" ${hc('#fbf7ec', '#3a3b62')}/>`).join('')}`; },
  flowers: (x, w, t, f) => [0, 1, 2].map((k) => { const bx = x + 14 + k * 18, S = [[-4, 0], [0, 1], [4, 2], [-2, 1], [3, 0]].map(([d, j]) => [bx + d, f - 21 - j * 3]);
    const head = k === 0 ? ([fx, fy], j) => `<path d="M${fx - 2.2} ${fy + 1} Q${fx - 2.6} ${fy - 2.6} ${fx - 1.1} ${fy - 2.4} L${fx} ${fy - 1.2} L${fx + 1.1} ${fy - 2.4} Q${fx + 2.6} ${fy - 2.6} ${fx + 2.2} ${fy + 1} Q${fx} ${fy + 2.2} ${fx - 2.2} ${fy + 1} Z" ${hc(['#e86f5e', '#f2c94c', '#e58fa8'][j % 3], ['#5a3a4a', '#5a5040', '#5a3a50'][j % 3])}/>`
      : k === 1 ? ([fx, fy]) => `<circle cx="${fx}" cy="${fy}" r="2.5" ${hs('#f2c94c', '#5a5040')} stroke-width="1.6" stroke-dasharray="1.1 .85"/><circle cx="${fx}" cy="${fy}" r="1.9" ${hc('#f2c94c', '#5a5040')}/><circle cx="${fx}" cy="${fy}" r="1.1" ${hc('#8a5a2a', '#2c2430')}/>`
      : ([fx, fy], j) => `<circle cx="${fx}" cy="${fy}" r="2.3" ${hc(['#e58fa8', '#c9a7ff', '#ffffff', '#e58fa8', '#c9a7ff'][j], ['#5a3a50', '#4a3a6a', '#5a5a7a', '#5a3a50', '#4a3a6a'][j])}/><circle cx="${fx}" cy="${fy}" r=".8" fill="#fff" fill-opacity=".7"/>`;
    return `<path d="${S.map(([fx, fy]) => `M${fx} ${f - 12} V${fy + 1}`).join(' ')}" ${hs('#4f7a4a', '#1c2a30')} stroke-width="1.2"/><ellipse cx="${bx - 3}" cy="${f - 15}" rx="1.4" ry="3.4" transform="rotate(-24 ${bx - 3} ${f - 15})" ${hc('#5f9a4a', '#1c2a30')}/><ellipse cx="${bx + 3}" cy="${f - 15.6}" rx="1.4" ry="3.4" transform="rotate(24 ${bx + 3} ${f - 15.6})" ${hc('#6fae58', '#1c2a30')}/>
      ${S.map(head).join('')}${k === 2 ? `<path d="M${bx - 6} ${f - 18} h.1 M${bx - 5} ${f - 22} h.1 M${bx + 6} ${f - 19} h.1 M${bx + 5.4} ${f - 25} h.1 M${bx} ${f - 17} h.1" ${hs('#ffffff', '#6a6a8a')} stroke-width="1.4"/>` : ''}
      <path d="M${bx - 7} ${f - 12} h14 l-2 12 h-10 Z" ${hc('#9aa4ae', '#2a2c50')}/><rect x="${bx - 7.6}" y="${f - 13}" width="15.2" height="2.2" rx="1" ${hc('#b4bcc4', '#363a60')}/><path d="M${bx - 6.4} ${f - 7} h12.8 M${bx - 5.8} ${f - 3} h11.6" stroke="#2b1c12" stroke-opacity=".18" stroke-width=".8"/><path d="M${bx - 4.4} ${f - 10} v8" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-linecap="round"/>`; }).join(''),
  cafe: (x, w, t, f) => { const ch = 'stroke="#f3e7cc" fill="none" stroke-linecap="round"';
    return `<path d="M${x + 40} ${f} l5 -30 h16 l5 30" fill="none" ${hs('#6e4f3a', '#2c2440')} stroke-width="2"/><path d="M${x + 41.4} ${f - 7} H${x + 64.6}" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.4"/>
      <rect x="${x + 43}" y="${f - 30}" width="20" height="22" rx="1" ${hc('#2f3b33', '#1c2a24')}/><rect x="${x + 43.6}" y="${f - 29.4}" width="18.8" height="20.8" rx=".8" fill="none" ${hs('#8a6a4a', '#3a2c40')} stroke-width="1.2"/>
      <path d="M${x + 45.6} ${f - 26.6} q1.2 -1 2.4 0 t2.4 0 t2.4 0" stroke="#f2d88a" fill="none" stroke-width=".9" stroke-linecap="round"/><path d="M${x + 46} ${f - 21.4} h5.6 v2.4 q0 2.6 -2.8 2.6 q-2.8 0 -2.8 -2.6 Z M${x + 51.6} ${f - 20.6} q1.8 0 1.8 1.2 q0 1.2 -1.8 1.2" ${ch} stroke-width=".8"/><path d="M${x + 47.6} ${f - 22.6} q-.8 -1 0 -2 M${x + 50} ${f - 22.6} q-.8 -1 0 -2" ${ch} stroke-width=".6" stroke-opacity=".8"/>
      <path d="M${x + 55} ${f - 26.6} h5.4 M${x + 55} ${f - 22.6} h4 M${x + 55} ${f - 19.4} h5" ${ch} stroke-width=".9"/><path d="M${x + 46} ${f - 11} h6 l-6 -3.4 Z" fill="#f6c6d6" fill-opacity=".9"/><circle cx="${x + 51}" cy="${f - 14}" r="1" fill="#e86f5e"/><path d="M${x + 55} ${f - 14} h5 M${x + 55} ${f - 11.4} h3.4" ${ch} stroke-width=".9"/>
      <rect x="${x + 43}" y="${f - 8.6}" width="20" height="1.8" rx=".6" ${hc('#8a6a4a', '#3a2c40')}/><rect x="${x + 56}" y="${f - 9.8}" width="3" height="1.2" rx=".5" fill="#fbf8f0"/>`; },
  goods: (x, w, t, f) => '<g data-fx="chimes">' + [0, 1, 2].map((k) => { const bx = x + 24 + k * 22, c = ['#9fd0f0', '#b8e0c8', '#f6c6d6'][k], rim = ['#6aa8d0', '#7ab896', '#e090aa'][k];
    const motif = [`<path d="M${bx - 2} ${t + 66.6} q1.6 -1.4 3.2 0 q-1.6 1.4 -3.2 0 Z M${bx + 1.1} ${t + 66.6} l1.4 -1 v2 Z" ${hc('#e8603c', '#6a3a40')}/>`, `<circle cx="${bx}" cy="${t + 66.4}" r="1.6" ${hc('#6a7ad8', '#3a4a8a')}/><circle cx="${bx}" cy="${t + 66.4}" r=".5" fill="#fff"/>`, `<path d="M${bx - 2} ${t + 67} h.1 M${bx + 0.4} ${t + 65.4} h.1 M${bx + 2} ${t + 67.4} h.1" ${hs('#e0607e', '#6a3a5a')} stroke-width="1.4"/>`][k];
    return `<g class="fx-sway" style="animation-delay:-${k * 0.6}s;animation-duration:${1.6 + k * 0.3}s"><path d="M${bx} ${t + 58} v6" ${hs('#6a6a74', '#2a2c50')} stroke-width="1"/>
      <g class="zz"><path d="M${bx} ${t + 64} v5" ${hs('#6a6a74', '#2a2c50')} stroke-width=".6"/><circle cx="${bx}" cy="${t + 69.8}" r="1.1" ${hc('#6a6a74', '#2a2c50')}/></g>
      <path d="M${bx - 5} ${t + 70} Q${bx - 5} ${t + 61.4} ${bx} ${t + 61.4} Q${bx + 5} ${t + 61.4} ${bx + 5} ${t + 70} Z" ${hc(c, '#3a4a6a')} fill-opacity=".85"/>${motif}<path d="M${bx - 5} ${t + 70} h10" ${hs(rim, '#2a3a5a')} stroke-width=".9"/><path d="M${bx - 3} ${t + 68.4} q0 -4 2.2 -5.2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".9" stroke-linecap="round"/>
      <path d="M${bx} ${t + 70.6} v9.4" ${hs('#6a6a74', '#2a2c50')} stroke-width=".7"/><g class="tz"><rect x="${bx - 3}" y="${t + 80}" width="6" height="10" ${hc('#fbf7ec', '#3a3b62')}/><rect x="${bx - 3}" y="${t + 80}" width="6" height="1.8" ${hc(rim, '#2a3a5a')}/><path d="M${bx - 1.6} ${t + 85} q.8 -.9 1.6 0 t1.6 0" fill="none" ${hs(rim, '#2a3a5a')} stroke-width=".7"/></g></g>`; }).join('') + '</g>',
  salon: (x, w, t, f) => { const px = x + w - 56;
    return `${[[-6, -24], [0, -30], [6, -24], [-3, -18], [4, -19]].map(([dx, dy]) => `<path d="M${px} ${f - 13} L${px + dx * 0.6} ${f + dy + 2}" ${hs('#4f7a4a', '#16243a')} stroke-width=".9"/>`).join('')}${[[-6, -24], [0, -30], [6, -24], [-3, -18], [4, -19]].map(([dx, dy], i) => { const cx = px + dx, cy = f + dy, a = dx * 6 * Math.PI / 180;
      return `<ellipse cx="${cx}" cy="${cy}" rx="5" ry="3.2" transform="rotate(${dx * 6} ${cx} ${cy})" ${hc(i % 2 ? '#6fae58' : '#5f9a4a', '#16243a')}/><path d="M${rd1(cx - 3.8 * Math.cos(a))} ${rd1(cy - 3.8 * Math.sin(a))} L${rd1(cx + 3.8 * Math.cos(a))} ${rd1(cy + 3.8 * Math.sin(a))}" stroke="#a8d890" stroke-opacity=".6" stroke-width=".6"/>`; }).join('')}
      <path d="M${x + w - 64} ${f - 14} h16 l-2 14 h-12 Z" ${hc('#c58a54', '#3a2c40')}/><path d="M${x + w - 53} ${f - 12.4} h3.6 l-1.8 12.4 h-2.6 Z" fill="#2b1c12" fill-opacity=".12"/><path d="M${x + w - 60.4} ${f - 11} v8" stroke="#fff" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/><rect x="${x + w - 65}" y="${f - 15.4}" width="18" height="3" rx="1" ${hc('#b07040', '#33283c')}/>`; }
};
function townHtml() {
  // the salon's barber pole (2026-11-11, the user: finer): domed caps, two brackets to the wall, pink and blue stripes turning
  // up its glass (inside a little svg of its own, which keeps them in), lit by night; bx, by: its top left (8 × 40)
  const barber = (bx, by) => `<path d="M${bx - 6} ${by + 10} h6 M${bx - 6} ${by + 35} h6" ${hs('#8a8f99', '#2a2c50')} stroke-width="1.8"/>
      <svg x="${bx}" y="${by + 5}" width="8" height="30" viewBox="0 0 8 30" aria-hidden="true"><rect width="8" height="30" ${hc('#ffffff', '#efe6ff')}/><g class="fx-barberpole">${Array.from({ length: 11 }, (_, i) => `<path d="M-1 ${-8 + i * 6} L9 ${-16 + i * 6}" ${hs(i % 2 ? '#6a9ad8' : '#e58fa8', i % 2 ? '#5a7ac0' : '#c06a8a')} stroke-width="2.4" stroke-linecap="butt"/>`).join('')}</g></svg>
      <path d="M${bx + 2} ${by + 6} v28" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/><rect x="${bx + 5.8}" y="${by + 5}" width="2.2" height="30" fill="#2b1c12" fill-opacity=".1"/>
      <path d="M${bx - 1} ${by + 5.4} Q${bx - 1} ${by} ${bx + 4} ${by} Q${bx + 9} ${by} ${bx + 9} ${by + 5.4} Z" ${hc('#c9ccd2', '#4a4c72')}/><circle cx="${bx + 4}" cy="${by - 0.6}" r="1.2" ${hc('#c9ccd2', '#4a4c72')}/><path d="M${bx + 1} ${by + 3.4} q1.4 -1.8 3.4 -2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8" stroke-linecap="round"/><rect x="${bx - 1}" y="${by + 35}" width="10" height="5" rx="1.6" ${hc('#c9ccd2', '#4a4c72')}/>`;
  const shop = ([x, w, h, wall, aw, sign, id]) => {
    const t = TOWN_FOOT - h, dx = x + w / 2;
    const st = TOWNEV.shopState(id), shut = st !== 'open', wx = x + 10, ww = w * 0.42, dx0 = x + w - 44;
    const shutter = (sx, sy, sw, sh) => `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="2" ${hc('#b9b6ae', '#2a2b48')}/>${Array.from({ length: Math.floor(sh / 7) }, (_, k) => `<path d="M${sx + 2} ${sy + 5 + k * 7} h${sw - 4}" ${hs('#9a978e', '#1e1f3a')} stroke-width="1.2"/>`).join('')}`;
    // 赤提灯 (2026-11-11, the user: finer): black rims top and bottom, its ribs, a sheen, a tassel; lit from inside by night when
    // open; each sways a little on its hook
    const lantern = (lx, k) => `<ellipse cx="${lx}" cy="${t + 46}" rx="18" ry="20" fill="#ffb070" style="opacity:calc((1 - var(--day, 1)) * ${st === 'open' ? 0.45 : 0})"/>
      <g class="fx-sway" style="animation-duration:${3.4 + k * 0.6}s;animation-delay:-${k * 1.3}s"><path d="M${lx} ${t + 30} v4" ${hs('#2b2b33', '#1c1d3c')} stroke-width="1.5"/><ellipse cx="${lx}" cy="${t + 46}" rx="9" ry="12" ${hc('#d84a3a', '#5a2030')}/><ellipse cx="${lx}" cy="${t + 46}" rx="6.4" ry="9.4" fill="#ffd27a" style="opacity:calc((1 - var(--day, 1)) * ${st === 'open' ? 0.7 : 0})"/>
        <path d="M${lx - 7.6} ${t + 39.4} q7.6 1.8 15.2 0 M${lx - 9} ${t + 46} q9 2 18 0 M${lx - 7.6} ${t + 52.6} q7.6 1.8 15.2 0" fill="none" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"/><path d="M${lx - 5.4} ${t + 39.6} q-1.8 6.4 0 12.6" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="1.6" stroke-linecap="round"/>
        <rect x="${lx - 5.6}" y="${t + 33.4}" width="11.2" height="3.2" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><rect x="${lx - 5}" y="${t + 56}" width="10" height="3" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><path d="M${lx} ${t + 59} v3.4" ${hs('#d84a3a', '#5a2030')} stroke-width="1.4"/></g>`;
    const up = t - 66;   // the floor they live on above the shop (2026-11-10), its tiled roof
    return `<g class="shop-front${shut ? ' closed' : ''}" data-shop="${id}">
      <rect x="${x + 4}" y="${up}" width="${w - 8}" height="66" ${hc('#efe6d6', '#1e2042')}/><rect class="lit" x="${x + 16}" y="${up + 18}" width="${w * 0.22}" height="22"/><rect class="lit" x="${x + w - 16 - w * 0.22}" y="${up + 18}" width="${w * 0.22}" height="22" style="opacity:calc(.08 + .55 * (1 - var(--day)))"/>
      <path d="M${x - 6} ${up + 4} L${x + 10} ${up - 18} H${x + w - 10} L${x + w + 6} ${up + 4} Z" ${hc(id === 'izakaya' ? '#4a3a3a' : '#5a6470', '#15163a')}/><path d="M${x + 2} ${up - 6} H${x + w - 2}" ${hs('#6f7a88', '#1e2042')} stroke-width="1.4"/>
      <rect x="${x}" y="${t}" width="${w}" height="${h}" ${hc(wall, '#25264a')}/><rect x="${x - 4}" y="${t - 8}" width="${w + 8}" height="10" rx="2" ${hc('#8a6a52', '#1c1d3c')}/>
      <rect x="${dx - w * 0.36}" y="${t + 10}" width="${w * 0.72}" height="20" rx="3" ${hc('#fbf7ec', '#3a3b62')}/><text x="${dx}" y="${t + 25}" text-anchor="middle" font-size="13" font-weight="700" ${hc('#4a3a2c', '#c9c4e8')} font-family="system-ui, sans-serif">${sign}</text>
      <path d="M${x - 2} ${t + 38} H${x + w + 2} L${x + w - 6} ${t + 56} H${x + 6} Z" ${hc(aw, '#3a2c4a')}/>${Array.from({ length: Math.floor(w / 16) }, (_, k) => `<path d="M${x + 6 + k * 16} ${t + 56} q8 8 16 0" ${hc(aw, '#3a2c4a')}/>`).join('')}
      <rect x="${x + 10}" y="${t + 66}" width="${w * 0.42}" height="${h - 92}" rx="3" ${hc('#cfe6ec', '#ffd98a')}/><path d="M${x + 14} ${t + 72} l14 22" ${hs('#ffffff', '#fff3c8')} stroke-width="3" stroke-opacity=".6"/>
      <rect x="${x + w - 44}" y="${t + 70}" width="32" height="${h - 70}" rx="2" ${hc('#8a6a52', '#3a2c40')}/><circle cx="${x + w - 18}" cy="${t + 70 + (h - 70) / 2}" r="2" ${hc('#e3c46a', '#a88a4a')}/>
      ${shut ? '' : SHOP_SHOW[id] ? SHOP_SHOW[id](x, w, t, TOWN_FOOT) : ''}
      ${id === 'salon' ? barber(x + w + 6, t + 60) : ''}
      ${id === 'shokudo' ? `<path d="M${dx0 - 4} ${t + 70} h40 v22 h-40 Z" ${hc('#2f3a5e', '#1c1f3a')}/><path d="M${dx0 + 9} ${t + 70} v22 M${dx0 + 22} ${t + 70} v22" ${hs('#efe6d6', '#3a3d60')} stroke-width="1.2"/><text x="${dx0 + 16}" y="${t + 86}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity=".9" font-family="serif">めし</text>` : ''}
      ${id === 'izakaya' ? lantern(x + 8, 0) + lantern(x + w - 8, 1) : ''}
      ${shut ? shutter(wx - 2, t + 64, ww + 4, h - 88) + shutter(dx0 - 2, t + 68, 36, h - 68) + `<rect x="${dx0 + 1}" y="${t + 84}" width="30" height="13" rx="2" ${hc('#fbf7ec', '#3a3b62')}/><text x="${dx0 + 16}" y="${t + 94}" text-anchor="middle" font-size="8.5" font-weight="700" ${hc('#8a2f2a', '#c9c4e8')} font-family="system-ui, sans-serif">準備中</text>` : ''}
    </g>`;
  };
  // 2026-11-11 (the user: finer): a lamp's foot, a ring on its post and a collar under the globe; the globe with a cap and a
  // finial, a sheen, its bulb glowing through by night
  const lamp = (x) => { const L = TOWN_FOOT - 100;
    return `<path d="M${x - 5} ${TOWN_FOOT} L${x - 3.6} ${TOWN_FOOT - 9} H${x + 3.6} L${x + 5} ${TOWN_FOOT} Z" ${hc('#3e3e48', '#16172e')}/><rect x="${x - 2}" y="${TOWN_FOOT - 96}" width="4" height="96" ${hc('#4a4a55', '#1c1d3c')}/><rect x="${x - 0.8}" y="${TOWN_FOOT - 90}" width="1" height="80" fill="#fff" fill-opacity=".18"/><rect x="${x - 3}" y="${TOWN_FOOT - 62}" width="6" height="2.4" rx="1" ${hc('#3e3e48', '#16172e')}/><rect x="${x - 3.4}" y="${L + 6.6}" width="6.8" height="3.4" rx="1" ${hc('#3e3e48', '#16172e')}/>
      <circle cx="${x}" cy="${L}" r="8" ${hc('#f2efe4', '#ffe2a0')}/><path d="${crescentD(x, L, 8, -20, 160)}" fill="#2b1c12" style="opacity:calc(.1 * var(--day, 1))"/><circle cx="${x}" cy="${L + 1}" r="3" fill="#fff" style="opacity:calc(.12 + .55 * (1 - var(--day, 1)))"/><path d="M${x - 4.8} ${L - 2.6} q1 -3.6 4.4 -4.6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M${x - 4.6} ${L - 6.4} Q${x} ${L - 10.4} ${x + 4.6} ${L - 6.4} Z" ${hc('#3e3e48', '#16172e')}/><circle cx="${x}" cy="${L - 9.4}" r="1.1" ${hc('#3e3e48', '#16172e')}/><circle cx="${x}" cy="${L}" r="16" fill="#ffd98a" style="opacity:calc((1 - var(--day, 1)) * .22)"/>`; };
  // 2026-11-10: のぼり by three shops, a cat asleep on the bakery's awning, steam from its chimney; on the left a hedge and the
  // way along from the yard. 2026-11-11 (the user): no poles or wires over the street; the bunting hangs under each shop's eaves
  // のぼり (2026-11-11, the user: finer): a weighted foot, a finial and the arm it hangs from, white loops round the pole, a
  // white band down its pole side and along its hem, a fold
  const nobori = (x, c, words, k) => `<rect x="${x - 4}" y="${TOWN_FOOT - 3}" width="8" height="3" rx="1" ${hc('#5a5e68', '#22244a')}/><path d="M${x} ${TOWN_FOOT} V${TOWN_FOOT - 120}" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><path d="M${x} ${TOWN_FOOT - 118.4} h19.4" ${hs('#8a8f99', '#3a3d66')} stroke-width="1.4"/><circle cx="${x}" cy="${TOWN_FOOT - 121}" r="1.8" ${hc('#c9ccd2', '#4a4c72')}/>
      <g class="fx-flag" style="animation-delay:-${k * 0.5}s"><path d="M${x + 1} ${TOWN_FOOT - 118} h18 v78 h-18 Z" ${hc(c, '#3a3456')}/><path d="M${x + 1} ${TOWN_FOOT - 118} h2.6 v78 h-2.6 Z M${x + 3.6} ${TOWN_FOOT - 45} h15.4 v5 h-15.4 Z" ${hc('#fbf8f0', '#5a5a7a')} fill-opacity=".9"/><path d="M${x + 14} ${TOWN_FOOT - 117} v71" stroke="#2b1c12" stroke-opacity=".08" stroke-width="3"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x - 1.4}" y="${TOWN_FOOT - 115 + i * 13}" width="3.4" height="2.6" rx="1" ${hc('#fbf8f0', '#5a5a7a')}/>`).join('')}</g>${vText(x + 10, TOWN_FOOT - 113, words, 10, `font-weight="700" fill="#fff" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}`;
  const bunting = ([x, w, h], j) => {
    const y = TOWN_FOOT - h - 61, x0 = x + 2, x1 = x + w - 2, n = Math.floor((x1 - x0) / 20), sag = 7;
    return `<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y + 2 * sag} ${x1} ${y}" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width="1"/>${Array.from({ length: n }, (_, k) => { const t = (k + 0.5) / n, fx = x0 + (x1 - x0) * t, fy = y + 4 * sag * t * (1 - t), m = j * 3 + k; return `<path class="fx-sway" style="animation-delay:-${(m * 0.37) % 3}s;animation-duration:${2.4 + (m % 3) * 0.5}s" d="M${(fx - 4.5).toFixed(1)} ${fy.toFixed(1)} h9 l-4.5 9 Z" fill="${['#d0574b', '#e6c23a', '#3f7ac8', '#4f7a4a'][m % 4]}" fill-opacity=".9"/>`; }).join('')}`;
  };
  // the cat (2026-11-11, the user: finer): a cream-and-ginger tabby curled up asleep on the awning's right end, eyes shut, its
  // tail hanging over the front and swaying; its sides rise and fall. Drawn about (0, 0) at its middle on the awning's top
  const catC = ['#f2ebdc', '#5a5a6a'], catG = ['#e0a462', '#4e4a5e'], catS = ['#b9773e', '#3e3a4e'], catIn = ['#ecaaa4', '#6a5a70'], catInk = ['#4a3a2c', '#24243a'];
  const awnCat = `<g transform="translate(426 ${TOWN_FOOT - 74})"><ellipse cx="2" cy=".6" rx="17" ry="1.6" fill="#2b1c12" fill-opacity=".14"/>
    <g data-fx="awncat"><g class="fx-sway" style="animation-duration:2.6s"><path d="M13 -3 C19 -2 20.5 5 18 10.5 C16.6 14 17 17.5 19.6 19" fill="none" ${hs(...catC)} stroke-width="3.2" stroke-linecap="round"/><path d="M17.3 13.5 C16.8 15.8 17.4 17.8 19.6 19" fill="none" ${hs(...catG)} stroke-width="3.2" stroke-linecap="round"/></g>
    <g class="fx-breathe">
      <path d="M-8 0 C-10 -7 -5 -14 3 -14.5 C11 -15 16.5 -10 16.5 -3 Q16.5 0 14 0 Z" ${hc(...catC)}/>
      <path d="M3 -14.5 C11 -15 16.5 -10 16.5 -3 C13 -5 10 -8 7 -9 C5 -10 3.5 -12 3 -14.5 Z" ${hc(...catG)}/>
      <path d="M8 -13.8 q1.5 2.5 .5 4.5 M11.6 -12.6 q1.2 2.2 0 4 M14.4 -10.2 q.8 2 -.4 3.4" fill="none" ${hs(...catS)} stroke-width="1.1" stroke-linecap="round"/>
      <path d="M-6 0 C-2 -3.5 9 -3.5 14 0 Z" fill="#2b1c12" fill-opacity=".08"/><path d="M-8 0 C-10 -7 -5 -14 3 -14.5 C11 -15 16.5 -10 16.5 -3 Q16.5 0 14 0" fill="none" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"/>
      <ellipse cx="-5.4" cy="-1" rx="3.2" ry="1.8" ${hc('#fbf7ee', '#64647a')}/><ellipse cx="-.6" cy="-.9" rx="3" ry="1.7" ${hc('#fbf7ee', '#64647a')}/>
      <path d="M-18.6 -10.5 L-17.8 -19.5 Q-17.5 -20.5 -16.6 -19.8 L-12.4 -15.1 Z M-9.6 -15.1 L-5.4 -19.8 Q-4.5 -20.5 -4.2 -19.5 L-3.4 -10.5 Z" ${hc(...catC)} stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"/>
      <path d="M-17.4 -12.6 L-16.9 -17.6 L-14 -14.6 Z M-8 -14.6 L-5.1 -17.6 L-4.6 -12.6 Z" ${hc(...catIn)}/>
      <path d="M-19 -7 C-19 -12.5 -15.5 -15.5 -11 -15.5 C-6.5 -15.5 -3 -12.5 -3 -7.5 C-3 -3.5 -6.5 -1.6 -11 -1.6 C-15.5 -1.6 -19 -3.5 -19 -7 Z" ${hc(...catC)} stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"/>
      <path d="M-15.6 -14.6 C-13 -15.7 -9 -15.7 -6.4 -14.6 C-8 -12.6 -10 -11.9 -11 -11.9 C-12 -11.9 -14 -12.6 -15.6 -14.6 Z" ${hc(...catG)}/><path d="M-11 -15.4 v2.4" ${hs(...catS)} stroke-width=".9" stroke-linecap="round"/>
      <ellipse cx="-16" cy="-5" rx="1.7" ry="1" fill="#f0a0a0" fill-opacity=".45"/><ellipse cx="-6" cy="-5" rx="1.7" ry="1" fill="#f0a0a0" fill-opacity=".45"/>
      <path d="M-15.2 -8.4 q1.5 1.5 3 0 M-9.8 -8.4 q1.5 1.5 3 0 M-12.6 -3.9 q.8 .8 1.6 0 q.8 .8 1.6 0" fill="none" ${hs(...catInk)} stroke-width=".9" stroke-linecap="round"/>
      <path d="M-11.9 -5.5 h1.8 l-.9 1 Z" ${hc('#d98080', '#5a4a60')}/>
      <path d="M-17.4 -5.4 l-5 -1 M-17.4 -4.4 l-5 .8 M-4.6 -5.4 l5 -1 M-4.6 -4.4 l5 .8" ${hs('#8a7a66', '#4a4a62')} stroke-width=".45"/>
    </g></g></g>`;
  // the bakery's chimney (2026-11-11, the user: finer): bricks, a shaded side, a cap; its steam in little cloud puffs. The hedge:
  // light along the top of each clump, leaves glinting there, a shade along its foot
  const cy0 = TOWN_FOOT - 212, HY = TOWN_FOOT - 26;
  const chimney = `<rect x="418" y="${cy0}" width="12" height="22" ${hc('#8a6a52', '#1c1d3c')}/><path d="M418 ${cy0 + 6} h12 M418 ${cy0 + 10.5} h12 M418 ${cy0 + 15} h12 M418 ${cy0 + 19.5} h12 M424 ${cy0 + 3.6} v2.4 M421 ${cy0 + 6} v4.5 M427 ${cy0 + 6} v4.5 M424 ${cy0 + 10.5} v4.5 M421 ${cy0 + 15} v4.5 M427 ${cy0 + 15} v4.5 M424 ${cy0 + 19.5} v2.5" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".6"/><rect x="424.6" y="${cy0}" width="5.4" height="22" fill="#2b1c12" fill-opacity=".1"/><rect x="416.4" y="${cy0 - 2}" width="15.2" height="3.6" rx=".8" ${hc('#6e5240', '#16172e')}/>`;
  const hedge = `<g fill="#e8f8d8" style="opacity:calc(.05 + .2 * var(--day, 1))"><path d="${[0, 34, 68, 102].map((cx) => crescentD(cx, HY, 22.5, 195, 300, 1.12)).join(' ')}"/><path d="${[0, 34, 68, 102].flatMap((cx) => [[-9, -15, 30], [3, -19, -20], [-15, -5, -40]].map(([dx, dy, a]) => leafD(cx + dx + (cx % 3), HY + dy, 1.9, 0.9, a))).join(' ')}"/></g>
      <rect x="-20" y="${TOWN_FOOT - 10}" width="150" height="10" fill="#1a2a12" fill-opacity=".16"/><path d="M-20 ${TOWN_FOOT - 0.8} H130" stroke="#1a2a12" stroke-opacity=".25" stroke-width="1.6"/>`;
  // 2026-11-10 (the user: a hillside shopping street, like the hill outside our house): behind the row the hill climbs to the
  // left, our house small on its top far up on the left. A village up it (the two straight slanting rows looked off): houses of
  // different sizes stepped along the slope at uneven spots, a low stone wall under some, trees between ([x, ground, w, h])
  const village = [[176, -136, 34, 26], [226, -108, 42, 30], [286, -86, 32, 24], [344, -64, 38, 28], [404, -40, 34, 26], [462, -22, 40, 30], [530, 2, 36, 26],
    [198, -84, 40, 28], [258, -60, 34, 26], [318, -32, 44, 32], [386, -8, 32, 24], [446, 18, 40, 28], [172, -30, 38, 28], [238, -6, 32, 24], [300, 12, 40, 30], [364, 30, 34, 26]]
    .sort((p, q) => p[1] - q[1]);
  const roofs = village.map(([x, g, w, h], k) => `${k % 2 ? '' : `<path d="M${x - w / 2 - 5} ${g} H${x + w / 2 + 9} V${g + 8} H${x - w / 2 - 5} Z" ${hc('#b4ad9e', '#262846')}/><path d="M${x - w / 2 - 5} ${g + 4} H${x + w / 2 + 9} M${x - 4} ${g} v4 M${x + 9} ${g + 4} v4" ${hs('#9a9384', '#1c1e3c')} stroke-width="1"/>`}${farHouse(x - w / 2, g, w, h, ['#8a5a44', '#5f6f8a', '#6f5a7a', '#4a5468', '#7a6a50'][(k * 3) % 5], k % 3 ? '#ece2d0' : '#e2d6c2')}`).join('');
  const trees = [[262, -102], [150, -64], [356, -30], [424, -94], [210, -32], [496, -58], [128, -12], [560, -30]].map(([x, y]) => `<rect class="trunk" x="${x - 3}" y="${y - 20}" width="6" height="20"/><g class="crown"><circle cx="${x}" cy="${y - 28}" r="14"/><circle cx="${x - 11}" cy="${y - 19}" r="10"/><circle cx="${x + 11}" cy="${y - 20}" r="11"/></g>`).join('');
  return `<svg class="land tall town-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      <path d="M-20 -190 C60 -200 140 -186 220 -150 C400 -70 640 20 900 70 C1020 92 1120 104 1220 108 V370 H-20 Z" ${hc('#a6bd96', '#161c38')}/>
      <path d="M40 -196 L48 -214 L84 -228 L120 -214 L128 -196 Z" ${hc('#c8553f', '#3a2030')}/><rect x="54" y="-198" width="68" height="34" ${hc('#efe4d2', '#1e2042')}/><rect class="lit" x="64" y="-188" width="10" height="9"/><rect class="lit" x="100" y="-188" width="10" height="9"/>
      <path d="M96 -164 L136 -146 L92 -126 L142 -102 L96 -78 L146 -52 L100 -26 L144 2 L104 30 L140 60 L108 92 L128 120 L112 150" fill="none" ${hs('#cfc8b8', '#2a2c50')} stroke-width="5" stroke-linejoin="round"/>
      ${roofs}
      ${trees}
      <rect class="near" x="-20" y="150" width="1240" height="220"/>
      ${TOWN_SHOPS.map(shop).join('')}${[300, 600, 878, 1180].map(lamp).join('')}${[300, 600, 878, 1180].map((x) => lightPool(x, TOWN_FOOT + 6, 70)).join('')}
      ${TOWN_SHOPS.map(bunting).join('')}
      ${sparrowArt(540, 8, 0)}
      ${nobori(446, '#d0574b', '焼きたて', 0)}${nobori(735, '#6e4f3a', '珈琲', 1)}${nobori(1036, '#8a2f2a', '焼き鳥', 2)}
      ${chimney}${[0, 1, 2].map((k) => `<g transform="translate(424 ${TOWN_FOOT - 112 - 66 - 40})"><path d="M-8.4 3.6 a4.2 4.2 0 0 1 1.4 -7.8 a5.6 5.6 0 0 1 10.4 -.4 a4.4 4.4 0 0 1 4.6 7.4 Q0 5.6 -8.4 3.6 Z" ${hcx('fx-steam', '#ffffff', '#9a9ec8', `animation-delay:-${k * 1.5}s`)}/></g>`).join('')}
      ${awnCat}
      ${[0, 34, 68, 102].map((dx) => `<circle cx="${dx}" cy="${TOWN_FOOT - 26}" r="24" ${hc('#5a9e4d', '#0f1a30')}/>`).join('')}<rect x="-20" y="${TOWN_FOOT - 26}" width="150" height="26" ${hc('#4f8a44', '#0c162a')}/>${hedge}
      <rect class="pave" x="-20" y="${TOWN_FOOT}" width="1240" height="${370 - TOWN_FOOT}"/><path class="rline" d="M-20 ${TOWN_FOOT + 1} H1220" style="stroke-dasharray:none;opacity:.5"/>
      ${Array.from({ length: 30 }, (_, j) => `<path class="seam" d="M${j * 44 - 20} ${TOWN_FOOT + 40 + (j % 3) * 30} h26"/>`).join('')}
      <path d="M-20 296 C30 294 70 296 110 302 C118 306 118 312 110 316 C70 314 30 312 -20 316 Z" ${hc('#cfc8b8', '#2a2a48')}/>
      <path d="M86 ${TOWN_FOOT} L130 ${TOWN_FOOT} L112 150 L92 150 Z" ${hc('#cfc8b8', '#2a2a48')}/>${Array.from({ length: 7 }, (_, k) => { const t = k / 6, y = TOWN_FOOT - (TOWN_FOOT - 150) * t; return `<path d="M${86 + 6 * t} ${y} H${130 - 18 * t}" ${hs('#a8a49a', '#22244a')} stroke-width="2"/>`; }).join('')}
    </svg>
    ${yHeroHtml()}
    ${TOWNEV.castHtml('town')}
    ${TOWN_SHOPS.map(([x, w, h, , , sign, id]) => `<button type="button" class="town-shop" data-act="town-shop" data-shop="${id}" aria-label="${sign}" style="margin-left:${x - 600}px;width:${w}px;bottom:${370 - TOWN_FOOT}px;height:${h}px"></button>`).join('')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="yard" aria-label="回院子" style="margin-left:${-YARD_HALF + 40}px;bottom:70px"><span class="tag">${ySign('today', '回院子')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="park" aria-label="往公園" style="margin-left:148px;bottom:14px"><span class="tag">${ySign('spark', '往公園')}</span></button>
    <div class="ysel"></div>`;
}
// みなと漁港 (test, 2026-11-10; the map joined up): below the beach, along the street's left — the harbour's quay, boats bobbing at
// their moorings, a breakwater out to a red lighthouse (its light swinging round by night), the fishermen's hut, crates, floats
// and a net drying, gulls; a sandy path comes down from the beach at the back on the left
// 古道具屋 before it opens (2026-11-11, the user): a thick fog lies over the top of the hill and hides it, and nothing there can be
// tapped; at 20 言靈 福爺's letter comes and the fog lifts, slowly, the first time the yard is seen after (nq_fog_lifted)
function shopFog() {
  const open = shopOpen();
  let lift = false;
  try { if (!open) localStorage.removeItem('nq_fog_lifted'); else if (!localStorage.getItem('nq_fog_lifted')) { lift = true; localStorage.setItem('nq_fog_lifted', todayStr()); } } catch (e) { /* no lift then */ }
  if (open && !lift) return '';
  const puffs = [[476, 250, 74, 36], [506, 262, 82, 30], [450, 270, 62, 26], [524, 238, 58, 28], [488, 226, 66, 28], [546, 276, 62, 22], [428, 248, 50, 24], [508, 292, 74, 22], [470, 300, 60, 18]];
  return `<defs><radialGradient id="fogPuff"><stop class="fg0" offset="0"/><stop class="fg1" offset=".55"/><stop class="fg2" offset="1"/></radialGradient></defs>
    <g class="shop-fog${lift ? ' lift' : ''}" aria-hidden="true">${puffs.map(([cx, cy, rx, ry], i) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#fogPuff)" style="--i:${i}"/>`).join('')}</g>`;
}
function harborHtml() {
  const F = 236, px = 600 + HARBOR_PATH;
  // 2026-11-11 (the user: finer): a boat's hull with its bow up, a white rail, a painted line, a dark waterline and two tyre
  // fenders, its reflection on the water; the cabin roofed in the hull's colour with two windows and an aerial; a light at the
  // mast top, a crossbar, a stay down to the bow, the little derrick with its hook
  const boat = (x, y, c, k) => `<path d="M${x - 44} ${y + 23} h28 M${x - 8} ${y + 25.4} h22 M${x + 22} ${y + 22.6} h16" fill="none" ${hs(c, '#2a2c50')} stroke-width="1.6" stroke-opacity=".22"/>
      <g class="fx-bob" style="animation-delay:-${k * 0.8}s;animation-duration:${2.6 + k * 0.4}s"><path d="M${x + 30} ${y - 50} L${x + 57} ${y - 5}" ${hs('#6e4f3a', '#2c2440')} stroke-width=".8"/>
      <path d="M${x + 30} ${y} V${y - 50}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M${x + 25} ${y - 41} h10" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.6"/><circle cx="${x + 30}" cy="${y - 51.6}" r="1.9" ${hc('#f6f3ec', '#fff0b0')}/>
      <path d="M${x + 30} ${y - 46} l17 8.5" ${hs('#d0453c', '#5a2030')} stroke-width="2.6"/><path d="M${x + 47} ${y - 37.5} l3 1.5" ${hs('#f6f3ec', '#8a8cb0')} stroke-width="2.6"/><path d="M${x + 50} ${y - 36} v9 q0 2 -2 2" fill="none" ${hs('#4a4a55', '#2a2c50')} stroke-width=".8"/>
      <rect x="${x - 14}" y="${y - 26}" width="34" height="27" rx="2" ${hc('#f4f3ee', '#4a4c72')}/><rect x="${x + 14.6}" y="${y - 24}" width="5.4" height="25" fill="#2b1c12" fill-opacity=".08"/><rect x="${x - 16}" y="${y - 28.4}" width="38" height="4" rx="1.6" ${hc(c, '#2a2c50')}/><path d="M${x - 9} ${y - 28.4} v-7.4 M${x - 5} ${y - 28.4} l2.4 -5" ${hs('#4a4a55', '#2a2c50')} stroke-width="1"/><circle cx="${x - 9}" cy="${y - 36.2}" r="1.1" ${hc('#d0453c', '#5a2030')}/>
      <rect x="${x - 9}" y="${y - 20}" width="10" height="8.6" rx="1" ${hc('#9fc6d6', '#ffe2a0')}/><rect x="${x + 4.6}" y="${y - 20}" width="9" height="8.6" rx="1" ${hc('#9fc6d6', '#ffe2a0')}/><path d="M${x - 7.6} ${y - 18.2} l3 -1 M${x + 6} ${y - 18.2} l3 -1" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/>
      <path d="M${x - 60} ${y - 1} Q${x + 10} ${y + 2} ${x + 60} ${y - 6} L${x + 46} ${y + 20} H${x - 46} Z" ${hc(c, '#2a2c50')}/><path d="M${x - 50} ${y + 13} H${x + 50} L${x + 46} ${y + 20} H${x - 46} Z" fill="#2b1c12" fill-opacity=".22"/>
      <path d="M${x - 56} ${y + 4} Q${x + 10} ${y + 7} ${x + 55} ${y}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4"/><path d="M${x - 59.4} ${y - 1} Q${x + 10} ${y + 2} ${x + 59.4} ${y - 6}" fill="none" ${hs('#f4f3ee', '#4a4c72')} stroke-width="2.2"/>
      ${[-30, 0].map((d) => `<circle cx="${x + d}" cy="${y + 6.4}" r="2.8" fill="none" ${hs('#2b2b33', '#16172e')} stroke-width="1.8"/>`).join('')}</g>`;
  // a fish box (2026-11-11, the user: finer): its rim lit along the top, hand holes at its ends, ribs down its side
  const crate = (x, y, c) => `<rect x="${x}" y="${y}" width="40" height="22" rx="2" ${hc(c, '#2a2c50')}/><rect x="${x}" y="${y}" width="40" height="4.4" rx="2" fill="#2b1c12" fill-opacity=".16"/><path d="M${x + 2.4} ${y + 4.9} h35.2" stroke="#fff" stroke-opacity=".4" stroke-width="1"/>
      <path d="M${x + 10} ${y + 9} V${y + 19} M${x + 20} ${y + 9} V${y + 19} M${x + 30} ${y + 9} V${y + 19}" stroke="#2b1c12" stroke-opacity=".12" stroke-width="1.4"/><rect x="${x + 3}" y="${y + 7}" width="5" height="2.6" rx="1.3" fill="#2b1c12" fill-opacity=".38"/><rect x="${x + 32}" y="${y + 7}" width="5" height="2.6" rx="1.3" fill="#2b1c12" fill-opacity=".38"/><rect x="${x}" y="${y + 18.6}" width="40" height="3.4" rx="1.6" fill="#2b1c12" fill-opacity=".1"/>`;
  // below (2026-11-11, the user: finer): the lighthouse's shaded side, slit windows, a door, a lamp behind its glass panes, a
  // railing round its gallery, a domed cap; the sandy path's trodden edges, footprints down it, pebbles, wind ripples beside it;
  // the hut's boarded walls, tin roof, sliding door and window panes, the sign's frame, the flag's sun, waves and folds; the
  // net's mesh with corks on its rope, stirring in the wind; bollards with a waist and a cap; the rope's coils; the gull on
  // its bollard with a folded grey wing that opens when it flies off
  // a gull in flight (2026-11-11): a body, a yellow bill, dark wing tips that beat with the wings
  const gull = (x, y, k) => `<g transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${k * 5}s"><g class="fx-wing gullwing" style="animation-delay:-${k * 0.2}s"><path d="M-14 0 q7 -9 14 0 q7 -9 14 0" ${hs('#f6f6f2', '#9a9ec8')} stroke-width="3"/><path d="M-14 0 Q-12.25 -2.25 -10.5 -3.4 M14 0 Q12.25 -2.25 10.5 -3.4" ${hs('#4a4a55', '#4a4c78')} stroke-width="3"/></g>
      <path d="M-6 .8 Q0 -1.6 6 .4 Q0 3 -6 .8 Z M-6 .8 l-2.6 -1 l.4 2 Z" ${hc('#f6f6f2', '#9a9ec8')}/><path d="M6 .2 l2.4 .6 l-2.4 .7 Z" ${hc('#e6a23c', '#5a4a3a')}/></g></g>`;
  // the net's diamond mesh: two sets of slanting cords from its top rope to its foot, cut where they meet the posts
  const netMesh = (() => { const T = (t) => [640 + 120 * t, F - 66 + 52 * t * (1 - t)], B = (t) => [640 + 120 * t, F - 20 + 36 * t * (1 - t)], d = [];
    const cut = ([x0, y0], [x1, y1]) => { const at = (x) => [x, y0 + (y1 - y0) * (x - x0) / (x1 - x0)], p = x0 < 640 ? at(640) : x0 > 760 ? at(760) : [x0, y0], q = x1 < 640 ? at(640) : x1 > 760 ? at(760) : [x1, y1];
      if (Math.abs(p[0] - q[0]) > 0.5) d.push(`M${rd1(p[0])} ${rd1(p[1])} L${rd1(q[0])} ${rd1(q[1])}`); };
    for (let i = -2; i <= 18; i++) { const t = i / 16; cut(T(t), B(t + 0.125)); cut(T(t), B(t - 0.125)); }
    return `<path d="${d.join(' ')}" fill="none" ${hs('#4f6f6a', '#2a3a4a')} stroke-width=".7"/>`; })();
  // the harbour's cat (2026-11-11, the user: finer, as the bakery's): white with grey tabby patches, sitting by the fish boxes —
  // ears with pink inside, round eyes with a glint, a nose, a ω mouth, blush, whiskers, a white bib and paws, a tail curled up
  // at the side and swaying; it breathes. Stroked: its eyes shut happily, its head tilts and its tail swishes
  const cW = ['#f6f2ea', '#5a5a6a'], cP = ['#a0a6b0', '#46465a'], cS = ['#6f7580', '#36364a'], cInk = ['#4a3a2c', '#24243a'], cOut = 'stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"';
  const harborCat = `<ellipse cx="1" cy=".6" rx="13" ry="1.8" fill="#2b1c12" fill-opacity=".14"/>
      <g class="fx-sway hctail" style="animation-duration:2.8s"><path d="M8 -2.4 C15.6 -2.4 18.6 -8.6 15.4 -15" fill="none" ${hs(...cW)} stroke-width="3.2" stroke-linecap="round"/><path d="M17.6 -9.4 C17.9 -11.6 17 -13.6 15.4 -15" fill="none" ${hs(...cP)} stroke-width="3.2" stroke-linecap="round"/></g>
      <g class="fx-breathe" style="animation-duration:3.8s"><path d="M-9 0 C-11 -8 -8.4 -16.4 0 -17 C8.4 -16.4 11 -8 9 0 Z" ${hc(...cW)} ${cOut}/><path d="M2.6 -16.8 C7.6 -15.6 10.6 -9 9.8 -3.6 C7.4 -6.6 5.2 -10.6 2.6 -12.4 Z" ${hc(...cP)}/><path d="M6.4 -14.2 q1.4 1.4 1 3.2 M8.6 -10.8 q1 1.4 .4 3" fill="none" ${hs(...cS)} stroke-width="1"/>
        <path d="M-4.4 -15 Q0 -9.6 4.4 -15 Q3.4 -6 0 -4 Q-3.4 -6 -4.4 -15 Z" ${hc('#fdfbf6', '#66667a')}/><path d="M-3.4 -9 V-2 M3.4 -9 V-2" stroke="#2b1c12" stroke-opacity=".12" stroke-width="1"/><ellipse cx="-3.7" cy="-1.3" rx="2.8" ry="1.6" ${hc('#fdfbf6', '#66667a')} ${cOut}/><ellipse cx="3.7" cy="-1.3" rx="2.8" ry="1.6" ${hc('#fdfbf6', '#66667a')} ${cOut}/></g>
      <g class="hchead"><path d="M-8.8 -24 L-8.2 -33 Q-7.8 -34 -7 -33.4 L-2.8 -29.6 Z" ${hc(...cW)} ${cOut}/><path d="M8.8 -24 L8.2 -33 Q7.8 -34 7 -33.4 L2.8 -29.6 Z" ${hc(...cP)} ${cOut}/><path d="M-7.6 -26.6 L-7.4 -31.2 L-4.6 -29 Z M7.6 -26.6 L7.4 -31.2 L4.6 -29 Z" ${hc('#ecaaa4', '#6a5a70')}/>
        <ellipse cx="0" cy="-23" rx="8.8" ry="7.6" ${hc(...cW)} ${cOut}/><path d="M-5.2 -29.8 C-2 -30.7 2 -30.7 5.2 -29.8 C3.4 -27.4 1 -26.6 0 -26.6 C-1 -26.6 -3.4 -27.4 -5.2 -29.8 Z" ${hc(...cP)}/><path d="M0 -30.2 v2.2 M-2.4 -30 l.6 1.8 M2.4 -30 l-.6 1.8" fill="none" ${hs(...cS)} stroke-width=".8"/>
        <g class="hceo"><ellipse cx="-3.3" cy="-23.4" rx="1.3" ry="1.7" ${hc('#3a3428', '#1c1c2c')}/><ellipse cx="3.3" cy="-23.4" rx="1.3" ry="1.7" ${hc('#3a3428', '#1c1c2c')}/><circle cx="-2.9" cy="-24.1" r=".5" fill="#fff"/><circle cx="3.7" cy="-24.1" r=".5" fill="#fff"/></g>
        <path d="M-4.8 -23 q1.5 -1.6 3 0 M1.8 -23 q1.5 -1.6 3 0" fill="none" ${hsx('hcec', ...cInk)} stroke-width=".9" opacity="0"/>
        <ellipse cx="-5.6" cy="-20.4" rx="1.7" ry="1" fill="#f0a0a0" fill-opacity=".45"/><ellipse cx="5.6" cy="-20.4" rx="1.7" ry="1" fill="#f0a0a0" fill-opacity=".45"/><path d="M-.9 -20.8 h1.8 l-.9 1 Z" ${hc('#d98080', '#5a4a60')}/>
        <path d="M-1.6 -19.4 q.8 .8 1.6 0 q.8 .8 1.6 0" fill="none" ${hs(...cInk)} stroke-width=".8"/><path d="M-6.4 -21 l-5 -1 M-6.4 -20 l-5 .8 M6.4 -21 l5 -1 M6.4 -20 l5 .8" ${hs('#8a7a66', '#4a4a62')} stroke-width=".45"/></g>`;
  return `<svg class="land tall harbor-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="sea-far" d="M-20 110 H1220 V124 H-20 Z"/><path class="isle" d="M760 112 C790 96 830 90 870 104 C890 98 920 100 940 112 Z"/>
      <path class="sea" d="M-20 122 H1220 V${F} H-20 Z"/>
      ${[[200, 160, 50], [420, 190, 40], [640, 150, 60], [900, 200, 44], [1060, 170, 50]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
      <path d="M520 150 H1000 V162 H520 Z" ${hc('#b4ad9e', '#2a2c48')}/>${Array.from({ length: 10 }, (_, k) => `<path d="M${590 + k * 38} 150 l12 -12 l12 12 l-6 8 h-12 Z" ${hc(k % 2 ? '#bfb8aa' : '#c9c2b4', '#323456')}/>`).join('')}
      <path d="M534 150 L538 22 H562 L566 150 Z" ${hc('#f4f1ea', '#4a4c72')}/>${[0, 1, 2].map((k) => `<path d="M${535.5 + k * 1.2} ${50 + k * 34} H${564.5 - k * 1.2} V${62 + k * 34} H${535.5 + k * 1.2} Z" ${hc('#d0453c', '#5a2030')}/>`).join('')}
      <path d="M555.6 22 H562 L566 150 H557.6 Z" fill="#2b1c12" fill-opacity=".09"/><path d="M540.4 26 L537.4 146" stroke="#fff" stroke-opacity=".4" stroke-width="1.4" stroke-linecap="round"/>
      ${[32, 70, 104].map((wy) => `<rect x="548.4" y="${wy}" width="3.2" height="6" rx="1.4" ${hc('#3a4254', '#ffe2a0')}/>`).join('')}<path d="M545.4 150 V141.6 q4.6 -5.6 9.2 0 V150 Z" ${hc('#3a4254', '#1c2240')}/><rect x="531" y="146" width="38" height="4.6" rx="1" ${hc('#c9c2b4', '#323456')}/>
      <rect x="536" y="-4" width="28" height="20" rx="3" ${hc('#3a4254', '#1c2240')}/><rect x="541" y="0" width="18" height="12" rx="2" ${hc('#cfe6ec', '#fff3b0')}/><circle cx="550" cy="6.4" r="3.6" ${hc('#f2dc9a', '#fff6cc')}/><path d="M546.4 0 V12 M553.6 0 V12" ${hs('#3a4254', '#1c2240')} stroke-width="1.2"/><path d="M542.6 2 l2.6 0 M542.6 4 l1.6 0" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/>
      <rect x="530" y="16" width="40" height="7" rx="1" ${hc('#3a4254', '#1c2240')}/><path d="M530.6 16.6 h38.8" stroke="#fff" stroke-opacity=".2" stroke-width="1"/><path d="M530.6 9.6 H569.4 M531.2 9.6 V16 M535.8 9.6 V16 M540.4 9.6 V16 M545 9.6 V16 M550 9.6 V16 M555 9.6 V16 M559.6 9.6 V16 M564.2 9.6 V16 M568.8 9.6 V16" ${hs('#3a4254', '#1c2240')} stroke-width="1"/>
      <path d="M532 -4 Q533.6 -13.6 550 -20 Q566.4 -13.6 568 -4 Z" ${hc('#d0453c', '#5a2030')}/><path d="M538 -7 Q541 -13 549 -16.6" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.4" stroke-linecap="round"/><path d="M532 -4 H568" ${hs('#a8352e', '#3a1828')} stroke-width="1.4"/><circle cx="550" cy="-22" r="2.4" ${hc('#3a4254', '#1c2240')}/><path d="M550 -24.4 V-27" ${hs('#3a4254', '#1c2240')} stroke-width="1"/>
      <defs><linearGradient id="hbBeam"><stop offset="0" stop-color="#fff6cc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></linearGradient></defs>
      <path class="glow fx-sweep" d="M550 6 L820 -50 L820 62 Z" fill="url(#hbBeam)" style="transform-origin:550px 6px;opacity:calc((1 - var(--day)) * .6)"/>
      ${CRUISE.shipSvg()}
      ${moonGlitter(600, 150, 232)}
      ${boat(180, 196, '#3f7ac8', 0)}${boat(470, 208, '#d0574b', 1)}${boat(760, 192, '#4f7a4a', 2)}
      <path d="M-20 ${F} V128 C80 122 200 126 300 140 C330 170 340 210 360 ${F} Z" ${hc('#ecdcb0', '#2c2b46')}/><path d="M${px - 18} 132 L${px + 18} 132 L${px + 44} ${F} H${px - 16} Z" ${hc('#d9c79a', '#24243e')}/>
      <path d="M${px - 18} 133 L${px - 16} ${F - 1} M${px + 18} 133 L${px + 43.4} ${F - 1}" fill="none" ${hs('#c4ae7e', '#1c1c34')} stroke-width="1" stroke-opacity=".7" stroke-dasharray="11 4 3 7"/>
      ${Array.from({ length: 8 }, (_, k) => { const t = (k + 0.6) / 8.4, fx = px + 2 + 28 * t + (k % 2 ? 4 : -4), fy = 132 + (F - 132) * t; return `<ellipse cx="${rd1(fx)}" cy="${rd1(fy)}" rx="${rd1(1.4 + t * 1.2)}" ry="${rd1(0.6 + t * 0.5)}" fill="#2b1c12" fill-opacity=".08"/>`; }).join('')}
      ${[[px - 8, 150, 1.6], [px + 30, 214, 2], [px + 4, 226, 1.4], [px + 24, 168, 1.2]].map(([sx, sy, r]) => `<ellipse cx="${sx}" cy="${sy}" rx="${r * 1.3}" ry="${r}" ${hc('#c4b28a', '#2e2c48')}/>`).join('')}<path d="M40 164 q10 -3 20 0 M70 180 q12 -3 24 0 M150 160 q9 -2.6 18 0 M120 200 q12 -3 24 0 M290 170 q9 -2.4 18 0" fill="none" ${hs('#d8c690', '#24243e')} stroke-width="1.2"/>
      ${[40, 90, 150].map((x) => `<path d="M${x} ${F - 18} q4 -14 8 0 M${x + 6} ${F - 16} q5 -12 9 -2" ${hs('#7f9d6c', '#1a2a3a')} stroke-width="2"/>`).join('')}
      <rect x="860" y="${F - 92}" width="220" height="92" ${hc('#c9a06a', '#2a2440')}/><path d="${Array.from({ length: 10 }, (_, i) => `M860 ${F - 83 + i * 8} H1080`).join(' ')}" stroke="#2b1c12" stroke-opacity=".1" stroke-width="1"/><rect x="860" y="${F - 92}" width="220" height="6" fill="#2b1c12" fill-opacity=".16"/>
      <rect x="860" y="${F - 7}" width="220" height="7" ${hc('#a8a49a', '#1c1d3e')}/><path d="M862.5 ${F - 92} V${F - 7} M1077.5 ${F - 92} V${F - 7}" ${hs('#a8804e', '#221c36')} stroke-width="3"/>
      <path d="M846 ${F - 92} L970 ${F - 128} L1094 ${F - 92} Z" ${hc('#5a6470', '#15163a')}/><path d="${Array.from({ length: 19 }, (_, i) => { const rx = 862 + i * 12; return `M${rx} ${F - 92} V${rd1(F - 92 - 36 * (1 - Math.abs(rx - 970) / 124))}`; }).join(' ')}" stroke="#000" stroke-opacity=".12" stroke-width="1"/>
      <path d="M846 ${F - 92} L970 ${F - 128} L1094 ${F - 92}" fill="none" ${hs('#7a8494', '#22244a')} stroke-width="1.6"/><path d="M846 ${F - 91} H1094" ${hs('#454e5a', '#101130')} stroke-width="2.4"/>
      <rect x="900" y="${F - 84}" width="140" height="22" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/><rect x="903" y="${F - 81}" width="134" height="16" rx="1.4" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".8"/>${[[904.6, F - 79.6], [1035.4, F - 79.6], [904.6, F - 66.4], [1035.4, F - 66.4]].map(([sx, sy]) => `<circle cx="${sx}" cy="${sy}" r=".9" fill="#cfd6e0"/>`).join('')}<text x="970" y="${F - 68}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">みなと漁協</text>
      <rect x="880" y="${F - 52}" width="54" height="52" ${hc('#5a3b28', '#ffd98a')}/><rect x="884" y="${F - 48}" width="20" height="22" rx="1" ${hc('#9fb8c0', '#fff0c0')}/><rect x="910" y="${F - 48}" width="20" height="22" rx="1" ${hc('#9fb8c0', '#fff0c0')}/><path d="M907 ${F - 52} V${F} M894 ${F - 48} v22 M920 ${F - 48} v22 M884 ${F - 37} h20 M910 ${F - 37} h20" ${hs('#3a2618', '#c9a050')} stroke-width="1.2"/><path d="M887 ${F - 46} l5 7 M913 ${F - 46} l5 7" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/><path d="M903 ${F - 16} v4 M911 ${F - 16} v4" ${hs('#c9a050', '#8a6a3a')} stroke-width="1.4"/>
      <rect x="960" y="${F - 52}" width="90" height="34" ${hc('#cfe6ec', '#ffd98a')}/><path d="M1005 ${F - 52} V${F - 18} M960 ${F - 35} H1050" ${hs('#8a6a4a', '#c9a050')} stroke-width="2"/><rect x="961" y="${F - 51}" width="88" height="32" fill="none" ${hs('#8a6a4a', '#5a4a3a')} stroke-width="2"/><path d="M966 ${F - 48} l8 10 M1011 ${F - 48} l5 6" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><rect x="956" y="${F - 18.6}" width="98" height="3.4" rx="1" ${hc('#8a6a4a', '#2c2440')}/>
      <rect x="1071" y="${F - 108}" width="6" height="11" rx="1" ${hc('#5a5a64', '#1c1d3c')}/><path d="M1074 ${F - 106} V${F - 186}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M1076.2 ${F - 184} V${F - 108}" stroke="#f6f3ec" stroke-opacity=".5" stroke-width=".6"/><circle cx="1074" cy="${F - 188.4}" r="2.6" ${hc('#e6c23a', '#5a4a3a')}/>
      <g ${hcx('fx-flag', '#f6f3ec', '#4a4c72', 'filter:brightness(calc(.5 + .5 * var(--day)))')}><path d="M1075 ${F - 184} h62 v40 h-62 Z"/><path d="M1075 ${F - 184} h62 v10 h-62 Z" fill="#d0453c"/><path d="M1075 ${F - 154} h62 v10 h-62 Z" fill="#3f7ac8"/>
        <path d="${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `M${rd1(1092 + 8.4 * Math.cos(a))} ${rd1(F - 164 + 8.4 * Math.sin(a))} L${rd1(1092 + 10.4 * Math.cos(a))} ${rd1(F - 164 + 10.4 * Math.sin(a))}`; }).join(' ')}" stroke="#e6c23a" stroke-width="1.6" stroke-linecap="round"/><circle cx="1092" cy="${F - 164}" r="7" fill="#e6c23a"/><circle cx="1092" cy="${F - 164}" r="4.4" fill="none" stroke="#d0453c" stroke-width="1.2"/>
        <path d="M1076 ${F - 151} ${Array.from({ length: 10 }, () => 'q3 -2.6 6 0').join(' ')}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.1"/><text x="1120" y="${F - 159}" text-anchor="middle" font-size="12" font-weight="800" fill="#d0453c" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">大漁</text><path d="M1097 ${F - 184} h5 v40 h-5 Z M1122 ${F - 184} h5 v40 h-5 Z" fill="#2b1c12" fill-opacity=".07"/></g>
      <path d="M640 ${F} V${F - 70} M760 ${F} V${F - 70}" ${hs('#6e4f3a', '#2c2440')} stroke-width="4"/><path d="M641 ${F - 66} V${F - 4} M761 ${F - 66} V${F - 4}" stroke="#fff" stroke-opacity=".2" stroke-width="1"/><rect x="637" y="${F - 73}" width="6" height="3.4" rx="1" ${hc('#4a3a2c', '#1c1830')}/><rect x="757" y="${F - 73}" width="6" height="3.4" rx="1" ${hc('#4a3a2c', '#1c1830')}/>
      <g class="fx-netwave">${netMesh}<path d="M640 ${F - 20} Q700 ${F - 2} 760 ${F - 20}" fill="none" ${hs('#4f6f6a', '#2a3a4a')} stroke-width="1.4"/></g><path d="M640 ${F - 66} Q700 ${F - 40} 760 ${F - 66}" fill="none" ${hs('#c9b48a', '#4a4466')} stroke-width="1.6"/>${[0.2, 0.4, 0.6, 0.8].map((t) => `<ellipse cx="${rd1(640 + 120 * t)}" cy="${rd1(F - 66 + 52 * t * (1 - t))}" rx="2.6" ry="1.7" ${hc('#f0a050', '#5a3a2a')}/>`).join('')}
      ${[380, 520, 700, 860, 1040].map((x, k) => `<g transform="translate(${x} ${F - 3})"><path d="M-12 0 q6 -5 12 0 q6 -5 12 0" fill="none" ${hsx('fx-ripple', '#ffffff', '#5a6aa0', `animation-delay:-${k * 0.8}s`)} stroke-width="1.6"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="134" style="fill:color-mix(in srgb, #cfcac0 calc(var(--day) * 100%), #262848)"/><path d="M-20 ${F + 2} H1220" ${hs('#9a958a', '#1c1d3e')} stroke-width="4"/>
      ${[300, 560, 820].map((x) => `<rect x="${x - 9}" y="${F + 11}" width="18" height="3" rx="1" ${hc('#3a3a44', '#16172e')}/><path d="M${x - 6} ${F + 11.4} Q${x - 4.6} ${F + 7} ${x - 5.6} ${F + 3.4} H${x + 5.6} Q${x + 4.6} ${F + 7} ${x + 6} ${F + 11.4} Z" ${hc('#4a4a55', '#1c1d3c')}/><path d="M${x - 8.6} ${F + 4} Q${x - 8.6} ${F - 0.2} ${x} ${F - 0.2} Q${x + 8.6} ${F - 0.2} ${x + 8.6} ${F + 4} Z" ${hc('#4a4a55', '#1c1d3c')}/><path d="M${x - 8.4} ${F + 4} H${x + 8.4}" stroke="#000" stroke-opacity=".25" stroke-width="1"/><path d="M${x - 3.4} ${F + 10.4} Q${x - 2.8} ${F + 7.4} ${x - 3.6} ${F + 5} M${x - 5.6} ${F + 2} q2.6 -1.4 5.2 -1.4" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.1" stroke-linecap="round"/>`).join('')}
      ${CRUISE.rampSvg()}
      ${streetLamp(150, F + 6, 120)}${streetLamp(1140, F + 6, 120)}
      <path d="M600 ${F + 56} a18 8 0 1 0 1 0 a12 5 0 1 0 1 0 a6.5 2.8 0 1 0 1 0 M604 ${F + 71.8} q10 1.6 18 -1.4 q4 -1.6 6.4 -.2" fill="none" ${hs('#c9b48a', '#4a4466')} stroke-width="3"/><path d="M600 ${F + 56} a18 8 0 1 0 1 0 a12 5 0 1 0 1 0 a6.5 2.8 0 1 0 1 0 M604 ${F + 71.8} q10 1.6 18 -1.4" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.3" stroke-dasharray="1.6 2.4"/><path d="M584 ${F + 66} q16 9 34 0" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width="1.4"/>
      ${gull(300, -120, 0)}${gull(620, -60, 1)}${gull(860, -180, 2)}
      <g data-fx="gull"><g transform="translate(560 ${F + 4})"><path d="M-9 -1 l-6.4 -3 l2 4.4 Z" ${hc('#3a3a44', '#2a2c50')}/><path d="M-11 -1 Q-6 -8 3 -6.4 Q9.6 -4.6 8.6 1.6 Q6.6 6 -1 6 Q-8 5.6 -11 -1 Z" ${hc('#f6f6f2', '#7a7ea8')}/><path d="M-4 4.4 Q2 6.4 7.2 2.4" fill="none" stroke="#2b1c12" stroke-opacity=".1" stroke-width="1.4"/>
        <g class="gwing"><path d="M-13 -2.6 Q-5 -7.4 4.6 -3.6 Q2.4 1.6 -5 2.4 Q-10 2 -13 -2.6 Z" ${hc('#b4bac4', '#5a5e88')}/><path d="M-13 -2.6 L-17.4 -4.4 L-14.6 -.6 Q-12 1 -9.6 1.2 Z" ${hc('#3a3a44', '#2a2c50')}/><circle cx="-14.6" cy="-2.6" r=".7" fill="#fff"/><path d="M-6 -2.8 q4 -1.6 8 -.8" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".8"/></g>
        <circle cx="7" cy="-6.6" r="4.2" ${hc('#f6f6f2', '#7a7ea8')}/><circle cx="8.4" cy="-7.6" r=".95" fill="#2b2420"/><circle cx="8.7" cy="-7.9" r=".35" fill="#fff"/><path d="M10.6 -6.8 l5 .9 l-5 1.4 Z" ${hc('#e6c23a', '#5a4a3a')}/><circle cx="14" cy="-5.8" r=".6" fill="#d0453c"/></g></g>
    </svg>
    ${landProp(82, crate(400, F + 10, '#3f7ac8') + '<g data-fx="fish">' + [404, 414, 426].map((fx, k) => `<g class="hfish" style="animation-delay:-${k * 0.09}s"><path d="M${fx + 11.4} ${F + 9} l4.6 -3.4 l-1 3.4 l1 3.4 Z" ${hc('#8a9cae', '#3a3c62')}/><path d="M${fx} ${F + 9.4} Q${fx + 5} ${F + 4.2} ${fx + 12} ${F + 9} Q${fx + 5} ${F + 13.2} ${fx} ${F + 9.4} Z" ${hc(['#b9c8d4', '#a8b8c8', '#c8d4dc'][k], '#4a4c72')}/><path d="M${fx + 1.4} ${F + 8.2} Q${fx + 5.4} ${F + 5.2} ${fx + 11.4} ${F + 8.6} Q${fx + 5.4} ${F + 7.2} ${fx + 1.4} ${F + 8.2} Z" ${hc('#6a7e92', '#3a3c62')}/><path d="M${fx + 2.6} ${F + 10.8} q4 1.4 8 -.6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/><path d="M${fx + 4.2} ${F + 7.2} q1 1.8 0 3.6" fill="none" stroke="#4a5a6a" stroke-opacity=".5" stroke-width=".6"/><circle cx="${fx + 2.4}" cy="${F + 8.8}" r="1" ${hc('#ffffff', '#8a8eb8')}/><circle cx="${fx + 2.3}" cy="${F + 8.8}" r=".5" fill="#2b2b33"/></g>`).join('') + '</g>' + crate(380, F + 30, '#3f7ac8') + crate(424, F + 30, '#d0574b')
      + `<g data-fx="hcat"><g transform="translate(476 ${F + 52})">${harborCat}</g></g>`, null, [372, F + 2, 500, F + 58])}${landProp(78, crate(1090, F + 34, '#e6a23c'), null, [1086, F + 30, 1134, F + 60])}
    ${landProp(76, `<path d="M790 ${F + 50} q10 6 22 2.6 q12 -3.6 26 3.4 q6 2.6 12 0" fill="none" ${hs('#c9b48a', '#4a4466')} stroke-width="1.4"/>` + [[800, F + 40], [822, F + 48], [842, F + 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" ${hc('#f08a3a', '#5a3a2a')}/><path d="${crescentD(x, y, 9, -20, 160)}" fill="#2b1c12" fill-opacity=".14"/><path d="M${x - 9} ${y + 0.6} Q${x} ${y + 3.6} ${x + 9} ${y + 0.6}" fill="none" ${hs('#c86a24', '#3a2a20')} stroke-width="1.4"/><ellipse cx="${x - 3.4}" cy="${y - 4}" rx="2.8" ry="1.7" transform="rotate(-30 ${x - 3.4} ${y - 4})" fill="#fff" fill-opacity=".5"/><circle cx="${x}" cy="${y - 10}" r="1.6" fill="none" ${hs('#8a6a4a', '#3a2c40')} stroke-width="1"/>`).join(''), null, [788, F + 26, 854, F + 60])}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('harbor')}${CRUISE.callHtml()}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="beach" aria-label="往海邊" style="margin-left:${HARBOR_PATH - 32}px;bottom:186px"><span class="tag">${ySign('wave', '往海邊')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="street" aria-label="往大馬路" style="margin-left:${YARD_HALF - 72}px;bottom:70px"><span class="tag">${ySign('bus', '往大馬路')}</span></button>
    <div class="ysel"></div>`;
}
// ひだまり公園 (test, 2026-11-10; the map joined up): below the town, along the street's right — a park on the hillside: houses up
// the slope behind, stone steps down from the town at the back on the right, a slide, swings that swing, a sandbox, the park's
// clock, a jizo in a red bib, ginkgo leaves drifting down, lamps lit by night
function parkHtml() {
  const F = 236, px = 600 + PARK_PATH;
  const house = (x, top, w, roof) => farHouse(x, 134, w, 134 - top, roof, '#efe6d6', 56);
  // round 1 (2026-11-10): a panda on a spring rocking to and fro, a bucket and spade left in the sandbox, pigeons by the benches
  // 2026-11-11 (the user: finer): every small thing drawn again in its own spot and size — shade, light and small parts inside
  const dk = (o) => `fill="#2b1c12" fill-opacity="${o}"`, lt = (o) => `fill="#fff" fill-opacity="${o}"`, ink = 'stroke="#2b1c12" stroke-opacity=".2" stroke-width=".7"';
  const f1 = (n) => n.toFixed(1);
  // the panda: a coiled spring on a foot plate (pspring: it bends as he rocks), a handlebar with black grips, a white tail, the
  // black band over the shoulders, black legs with pads, a sheen on the back; the head (phead: it nods on a ride) with ears,
  // slanted eye patches with shining eyes, a nose, an ω mouth and blush
  const panda = (x, b) => {
    const W = ['#f6f3ec', '#4a4c72'], K = ['#2b2b33', '#141428'], P = ['#55555f', '#2a2a46'];
    const coil = (front) => [0, 1, 2, 3, 4].map((i) => { const y = b - 2 - 4 * i; return front ? `M${x - 8} ${y} Q${x - 2} ${y + 3} ${x + 4} ${y - 2}` : `M${x + 4} ${y - 2} Q${x - 2} ${y - 6} ${x - 8} ${y - 4}`; }).join(' ');
    const patch = (cx, a) => `<ellipse cx="${cx}" cy="${b - 48.6}" rx="3.1" ry="3.9" transform="rotate(${a} ${cx} ${b - 48.6})" ${hc(...K)}/>`;
    return `<ellipse cx="${x - 2}" cy="${b + 1}" rx="10.5" ry="2.6" ${dk('.14')}/><ellipse cx="${x - 2}" cy="${b}" rx="8.4" ry="2.2" ${hc('#6a6e78', '#26284e')}/>
      <g class="pspring"><path d="${coil(0)}" fill="none" ${hs('#6c717b', '#2a2c56')} stroke-width="2.2"/><path d="${coil(1)}" fill="none" ${hs('#a0a6b0', '#4a4d78')} stroke-width="2.4"/><path d="${coil(1)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".7" transform="translate(0 -.6)"/></g>
      <g class="fx-bob" data-fx="panda" style="animation-duration:1.7s">
        <path d="M${x - 6} ${b - 44} V${b - 55}" ${hs('#b0453c', '#4a2030')} stroke-width="2"/><path d="M${x - 10.4} ${b - 56} h8.8" ${hs('#d0453c', '#5a2030')} stroke-width="2.6"/><path d="M${x - 11} ${b - 56} h.4 M${x - 1.4} ${b - 56} h.4" ${hs(...K)} stroke-width="3.2"/>
        <circle cx="${x - 19.4}" cy="${b - 37.4}" r="3.2" ${hc(...W)} ${ink}/>
        <ellipse cx="${x - 12}" cy="${b - 26}" rx="5" ry="7" ${hc(...K)}/>
        <ellipse cx="${x}" cy="${b - 34}" rx="20" ry="13" ${hc(...W)} ${ink}/><path d="M${x - 18} ${b - 29} Q${x} ${b - 15} ${x + 18} ${b - 29} Q${x} ${b - 22} ${x - 18} ${b - 29} Z" ${dk('.08')}/>
        <path d="M${x + 1} ${b - 46} Q${x + 6} ${b - 47.8} ${x + 10} ${b - 46.2} L${x + 16} ${b - 30} Q${x + 11} ${b - 27} ${x + 6} ${b - 30} Z" ${hc(...K)}/>
        <ellipse cx="${x + 12}" cy="${b - 26}" rx="5" ry="7" ${hc(...K)}/>
        <ellipse cx="${x - 12}" cy="${b - 20.8}" rx="3" ry="1.4" ${hc(...P)}/><ellipse cx="${x + 12}" cy="${b - 20.8}" rx="3" ry="1.4" ${hc(...P)}/>
        <ellipse cx="${x - 7}" cy="${b - 42}" rx="6.4" ry="2.1" transform="rotate(-8 ${x - 7} ${b - 42})" ${hc('#fdfcf8', '#55578a')}/>
        <g class="phead"><circle cx="${x + 10}" cy="${b - 58}" r="4.5" ${hc(...K)}/><circle cx="${x + 26}" cy="${b - 58}" r="4.5" ${hc(...K)}/><circle cx="${x + 9.4}" cy="${b - 58.8}" r="2" ${hc(...P)}/><circle cx="${x + 26.6}" cy="${b - 58.8}" r="2" ${hc(...P)}/>
          <circle cx="${x + 18}" cy="${b - 48}" r="12" ${hc(...W)} ${ink}/><path d="M${x + 24} ${b - 37.6} Q${x + 30} ${b - 41} ${x + 30} ${b - 48} Q${x + 28} ${b - 41} ${x + 24} ${b - 37.6} Z" ${dk('.07')}/>
          ${patch(x + 13.8, 24)}${patch(x + 23.2, -24)}<circle cx="${x + 14.4}" cy="${b - 49.6}" r="1.3" fill="#fff" fill-opacity=".92"/><circle cx="${x + 22.6}" cy="${b - 49.6}" r="1.3" fill="#fff" fill-opacity=".92"/>
          <path d="M${x + 16.8} ${b - 44.6} h3.4 q-.3 1.5 -1.7 1.9 q-1.4 -.4 -1.7 -1.9 Z" ${hc(...K)}/><path d="M${x + 16.7} ${b - 41.8} q.9 .9 1.8 0 q.9 .9 1.8 0" ${hs(...K)} stroke-width=".8"/>
          <ellipse cx="${x + 10.8}" cy="${b - 44}" rx="1.9" ry="1.1" fill="#f0a0a0" fill-opacity=".55"/><ellipse cx="${x + 25.2}" cy="${b - 44}" rx="1.9" ry="1.1" fill="#f0a0a0" fill-opacity=".55"/></g>
      </g>`;
  };
  // a ginkgo: a trunk on a flared foot, bark, its shaded side; the crown in four clumps, each with shade on its lower right (the
  // front two drawn again over the back ones' shade), light on its upper left and little fan leaves (lit ones above, dark below)
  const ginkgo = (x, s) => {
    const cl = [[0, -150, 30], [0, -120, 44], [-30, -96, 32], [30, -98, 34]].map(([dx, dy, r]) => [x + dx * s, F + dy * s, r * s]);
    const disc = ([cx, cy, r]) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/>`;
    const shade = ([cx, cy, r]) => `M${f1(cx - 0.87 * r)} ${f1(cy + 0.5 * r)} A${f1(r)} ${f1(r)} 0 0 0 ${f1(cx + 0.94 * r)} ${f1(cy - 0.34 * r)} Q${f1(cx + 0.15 * r)} ${f1(cy + 1.25 * r)} ${f1(cx - 0.87 * r)} ${f1(cy + 0.5 * r)} Z`;
    const glow = ([cx, cy, r], i) => { const a = -0.49, ex = cx - (i === 1 ? 0.6 : 0.3) * r, ey = cy - (i === 1 ? 0.08 : 0.42) * r, rx = 0.3 * r, ry = 0.16 * r, c = Math.cos(a) * rx, d = Math.sin(a) * rx;
      return `M${f1(ex - c)} ${f1(ey - d)} a${f1(rx)} ${f1(ry)} -28 1 0 ${f1(2 * c)} ${f1(2 * d)} a${f1(rx)} ${f1(ry)} -28 1 0 ${f1(-2 * c)} ${f1(-2 * d)} Z`; };
    const fans = (angs, k) => cl.map(([cx, cy, r]) => angs.map((g) => { const a = g * Math.PI / 180, z = 2.4 * s, o = [Math.cos(a), Math.sin(a)], fx = cx + k * r * o[0], fy = cy + k * r * o[1];
      const at = (u, h) => `${f1(fx + z * (-u * o[1] + h * o[0]))} ${f1(fy + z * (u * o[0] + h * o[1]))}`;   // u across the leaf, h out along it
      return `M${at(0, 0)} L${at(-1, 1)} Q${at(-0.5, 1.5)} ${at(0, 1.36)} Q${at(0.5, 1.5)} ${at(1, 1)} Z`; }).join(' ')).join(' ');
    return `<path class="trunk" d="M${f1(x - 9 * s)} ${F} Q${f1(x - 5 * s)} ${f1(F - 3 * s)} ${f1(x - 5 * s)} ${f1(F - 14 * s)} H${f1(x + 5 * s)} Q${f1(x + 5 * s)} ${f1(F - 3 * s)} ${f1(x + 9 * s)} ${F} Z"/><rect class="trunk" x="${f1(x - 5 * s)}" y="${f1(F - 90 * s)}" width="${f1(10 * s)}" height="${f1(90 * s)}"/>
      <rect x="${f1(x + 1.6 * s)}" y="${f1(F - 90 * s)}" width="${f1(3.4 * s)}" height="${f1(88 * s)}" ${dk('.16')}/><path d="M${f1(x - 2 * s)} ${f1(F - 18 * s)} v${f1(-20 * s)} M${f1(x + 0.6 * s)} ${f1(F - 44 * s)} v${f1(-16 * s)} M${f1(x - 2.6 * s)} ${f1(F - 58 * s)} v${f1(-10 * s)}" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1" stroke-linecap="round"/>
      <g ${hc('#e6c23a', '#3a3420')}>${cl.map(disc).join('')}</g><path d="${shade(cl[0])} ${shade(cl[1])}" ${hc('#d4a62c', '#2c2818')}/>
      <g ${hc('#e6c23a', '#3a3420')}>${disc(cl[2])}${disc(cl[3])}</g><path d="${shade(cl[2])} ${shade(cl[3])}" ${hc('#d4a62c', '#2c2818')}/>
      <path d="${cl.map(glow).join(' ')}" ${hc('#efd256', '#423c26')}/><path d="${fans([205, 240, 275, 310], 0.74)}" ${hc('#f8e486', '#524a32')}/><path d="${fans([30, 70, 115, 150], 0.8)}" ${hc('#c8981f', '#262216')}/>`;
  };
  const leaf = (x, y, k) => `<g transform="translate(${x} ${y})"><path d="M0 0 L-6 -6 Q-3 -9.2 0 -8 Q3 -9.2 6 -6 Z M-.35 0 h.7 l-.1 2.6 h-.5 Z" ${hcx('fx-fall', '#e6c23a', '#6a5a3a', `animation-delay:-${k * 1.7}s;animation-duration:${10 + (k % 3) * 2}s`)}/></g>`;
  // a swing: chains of links (on a thin core) from clips under the bar, the rubber seat lit along its top and shaded under, its
  // clips; its shadow on the ground (sw-shade, drawn after the ground) follows the seat on a ride
  const swing = (x, k) => `<g class="fx-sway" data-fx="swing${k}" style="animation-delay:-${k * 0.9}s;animation-duration:1.8s;transform-origin:${x}px ${F - 96}px;transform-box:view-box"><path d="M${x - 10} ${F - 95} V${F - 31} M${x + 10} ${F - 95} V${F - 31}" ${hs('#6c717b', '#2a2c56')} stroke-width=".8"/><path d="M${x - 10} ${F - 94} V${F - 33} M${x + 10} ${F - 94} V${F - 33}" ${hs('#8a8f99', '#3a3d66')} stroke-width="1.9" stroke-dasharray="1.6 2.7"/><rect x="${x - 14}" y="${F - 32}" width="28" height="6" rx="2" ${hc('#d0574b', '#4a2c40')}/><path d="M${x - 12.4} ${F - 31.2} h24.8" stroke="#fff" stroke-opacity=".35" stroke-width=".9"/><path d="M${x - 13} ${F - 27.4} h26" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1.6"/><circle cx="${x - 10}" cy="${F - 32}" r="1.5" ${hc('#5a5e68', '#22244a')}/><circle cx="${x + 10}" cy="${F - 32}" r="1.5" ${hc('#5a5e68', '#22244a')}/></g>`;
  // the slide: the chute with its lit rim, its side in shade, a gloss (slide-shine runs down it as he slides); the ladder's rails
  // lit on one side, with feet, the rungs shaded under; the deck lit on top, two bolts
  const chute = `M327 ${F - 92} C300 ${F - 92} 292 ${F - 62} 274 ${F - 32} C262 ${F - 12} 250 ${F - 6} 228 ${F - 6}`;
  const rungs = (dy) => [0, 1, 2, 3, 4].map((k) => `M330 ${F - 18 - k * 18 + dy} H352`).join(' ');
  const slide = `<path d="${chute}" fill="none" ${hs('#3f7ac8', '#2a3460')} stroke-width="13"/><path d="M330 ${F - 88} C303 ${F - 88} 295 ${F - 58} 277 ${F - 28} C265 ${F - 8} 253 ${F - 2} 231 ${F - 2}" fill="none" ${hs('#2f62a8', '#1e2850')} stroke-width="3"/>
      <path d="M327 ${F - 98} C298 ${F - 98} 288 ${F - 68} 270 ${F - 38} C258 ${F - 18} 246 ${F - 12} 226 ${F - 12}" fill="none" ${hs('#7fb0e8', '#3a4a7a')} stroke-width="3"/>
      <path d="M318 ${F - 94} C305 ${F - 93} 297 ${F - 78} 289 ${F - 62} M263 ${F - 21} C256 ${F - 13} 249 ${F - 10} 239 ${F - 10}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/>
      <path class="slide-shine" d="${chute}" pathLength="100" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 120"/>
      <path d="M278 ${F - 30} V${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="4"/><path d="M330 ${F - 90} V${F} M352 ${F - 90} V${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="4"/><path d="${rungs(0)}" ${hs('#8a8f99', '#3a3d66')} stroke-width="3"/>
      <path d="${rungs(1.8)}" stroke="#2b1c12" stroke-opacity=".18" stroke-width="1"/><path d="M329 ${F - 88} V${F - 2} M351 ${F - 88} V${F - 2} M277 ${F - 26} V${F - 2}" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>
      <path d="M326.5 ${F - 1} h7 M348.5 ${F - 1} h7 M274.5 ${F - 1} h7" ${hs('#5a5e68', '#22244a')} stroke-width="2.4"/>
      <rect x="326" y="${F - 98}" width="30" height="10" rx="2" ${hc('#e6a23c', '#4a3a2a')}/><path d="M328 ${F - 96.4} h26" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-linecap="round"/><rect x="326" y="${F - 91}" width="30" height="3" rx="1.5" ${dk('.15')}/><path d="M331 ${F - 93} h.01 M351 ${F - 93} h.01" ${hs('#b87a26', '#2e2418')} stroke-width="1.8"/>`;
  // the swings' frame: lit along the bar, shaded down its legs, the clips holding the chains, feet
  const swingFrame = `<path d="M470 ${F} L490 ${F - 100} H610 L630 ${F}" fill="none" ${hs('#d0574b', '#4a2c40')} stroke-width="5"/><path d="M491 ${F - 101.2} H609" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/><path d="M471.8 ${F - 1} L491.4 ${F - 98} M631.6 ${F - 1} L611.6 ${F - 98}" stroke="#2b1c12" stroke-opacity=".18" stroke-width="1.2"/>
      <path d="M510 ${F - 101} v5 M530 ${F - 101} v5 M570 ${F - 101} v5 M590 ${F - 101} v5" ${hs('#5a5e68', '#22244a')} stroke-width="2.6"/><path d="M465.5 ${F - 1} h9 M625.5 ${F - 1} h9" ${hs('#8a3a34', '#2c1a2c')} stroke-width="2.4"/>`;
  // the fence: its posts in one path, shaded on one side with a lit cap; the rails lit along their tops, shade under the upper one
  const posts = (dx, y0, y1) => Array.from({ length: 30 }, (_, k) => `M${k * 42 + dx} ${F - y0} V${F - y1}`).join(' ');
  const fence = `<path d="M-20 ${F - 4} H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/><path d="${posts(0, 18, 0)}" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/><path d="${posts(0.9, 17, 1)}" stroke="#2b1c12" stroke-opacity=".16" stroke-width="1.2"/>
      <path d="M-20 ${F - 14} H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="2"/><path d="M-20 ${F - 12.4} H1220" stroke="#2b1c12" stroke-opacity=".12" stroke-width="1"/><path d="M-20 ${F - 14.6} H1220 M-20 ${F - 5} H1220" stroke="#fff" stroke-opacity=".2" stroke-width=".7"/><path d="${posts(-0.5, 18.2, 18.19)}" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>`;
  // the park clock: a flared foot, the post lit and shaded, a collar under the head; the face's rim lit on its upper left, an inner
  // ring, twelve marks, a little shade in it, a red second hand ticking (psec); a gleam that runs round the rim when he looks (glint)
  const clock = (cx, cy) => {
    const mark = (i, r0) => { const a = i * Math.PI / 6, s = Math.sin(a), c = Math.cos(a); return `M${f1(cx + r0 * s)} ${f1(cy - r0 * c)} L${f1(cx + 15 * s)} ${f1(cy - 15 * c)}`; };
    const arc = (r, a0, a1) => { const p = (a) => `${f1(cx + r * Math.sin(a * Math.PI / 180))} ${f1(cy - r * Math.cos(a * Math.PI / 180))}`; return `M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`; };
    return `<path d="M${cx - 6.5} ${F} L${cx - 4} ${F - 5} H${cx + 4} L${cx + 6.5} ${F} Z" ${hc('#4a4a54', '#16173a')}/><rect x="${cx - 4}" y="${F - 120}" width="8" height="120" ${hc('#5a5a64', '#1c1d3c')}/><rect x="${cx - 3}" y="${F - 112}" width="1.4" height="106" ${lt('.18')}/><rect x="${cx + 1.6}" y="${F - 112}" width="2.4" height="107" ${dk('.16')}/><rect x="${cx - 5.5}" y="${F - 117}" width="11" height="4" rx="1.5" ${hc('#4a4a54', '#16173a')}/>
      <g data-fx="clock"><circle cx="${cx}" cy="${cy}" r="18" ${hc('#fbf7ec', '#fff0c0')}/><path d="${arc(14.4, 30, 150)}" fill="none" stroke="#2b1c12" stroke-opacity=".07" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="15.8" fill="none" stroke="#2b1c12" stroke-opacity=".16" stroke-width=".6"/>
        <path d="${[0, 3, 6, 9].map((i) => mark(i, 12)).join(' ')}" stroke="#3b2a1c" stroke-width="1.6" stroke-linecap="round"/><path d="${[1, 2, 4, 5, 7, 8, 10, 11].map((i) => mark(i, 13.4)).join(' ')}" stroke="#3b2a1c" stroke-width=".9" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${cy}" r="18" fill="none" ${hs('#3a3a44', '#3a3a44')} stroke-width="3"/><path d="${arc(18, 228, 300)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>
        <path class="pshine" d="${arc(18, 300, 345)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" style="transform-origin:${cx}px ${cy}px"/>
        ${clockHands(cx, cy, 16)}<path class="psec" d="M${cx} ${cy + 3.4} V${cy - 14}" stroke="#d0453c" stroke-width=".8" stroke-linecap="round" style="transform-origin:${cx}px ${cy}px;animation-delay:-${new Date().getSeconds()}s"/><circle cx="${cx}" cy="${cy}" r="1.1" fill="#d0453c"/></g>`;
  };
  // the jizo: a stone on a plinth with a lit top and moss, a faint outline and shade down its right, a sheen on the head; long
  // ears and a peaceful face (shut eyes, a smile); the red bib with a darker band at the neck and a hem, its right side in shade
  const jizo = `<rect x="114" y="${F - 12}" width="40" height="12" ${hc('#a9a497', '#2c2e4c')}/><rect x="114" y="${F - 12}" width="40" height="2.6" ${hc('#bdb8aa', '#36385a')}/><rect x="146" y="${F - 9.4}" width="8" height="9.4" ${dk('.1')}/><path d="M114 ${F - 5.4} H154" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".8"/>
      <ellipse cx="119.4" cy="${F - 1.8}" rx="3.8" ry="1.5" ${hc('#8f9d6a', '#2a3a42')}/><ellipse cx="150.4" cy="${F - 8.8}" rx="2.2" ry=".9" ${hc('#8f9d6a', '#2a3a42')}/>
      <path d="M120 ${F - 12} Q120 ${F - 52} 134 ${F - 54} Q148 ${F - 52} 148 ${F - 12} Z" ${hc('#b4ad9e', '#3a3c5e')} ${ink}/><path d="M141 ${F - 52.6} Q148 ${F - 50} 148 ${F - 12} H141 Q144 ${F - 34} 141 ${F - 52.6} Z" ${dk('.1')}/>
      <ellipse cx="129.6" cy="${F - 48.4}" rx="4" ry="2.2" transform="rotate(-30 129.6 ${F - 48.4})" ${lt('.28')}/>
      <path d="M125.2 ${F - 46.4} q-1.4 3.2 .4 6.6 M142.8 ${F - 46.4} q1.4 3.2 -.4 6.6" ${hs('#958e80', '#2c2e50')} stroke-width=".8"/><path d="M128.4 ${F - 42.6} q1.5 1.3 3 0 M136.6 ${F - 42.6} q1.5 1.3 3 0 M132.4 ${F - 37.8} q1.6 1.1 3.2 0" ${hs('#6e685c', '#22244a')} stroke-width=".9"/>
      <path d="M121.6 ${F - 34} Q134 ${F - 29.6} 146.4 ${F - 34} L146 ${F - 30.4} Q143 ${F - 20} 134 ${F - 16.4} Q125 ${F - 20} 122 ${F - 30.4} Z" ${hc('#d0453c', '#5a2030')}/><path d="M139.4 ${F - 32.2} Q141 ${F - 24} 134 ${F - 16.4} Q143 ${F - 20} 146 ${F - 30.4} L146.4 ${F - 34} Q143 ${F - 32.7} 139.4 ${F - 32.2} Z" ${dk('.14')}/>
      <path d="M123 ${F - 29.6} Q125.6 ${F - 21.2} 134 ${F - 17.9} Q142.4 ${F - 21.2} 145 ${F - 29.6}" ${hs('#a8322c', '#3e1626')} stroke-width=".9"/><path d="M121.8 ${F - 33.4} Q134 ${F - 29} 146.2 ${F - 33.4}" ${hs('#a8322c', '#3e1626')} stroke-width="1.8"/><path d="M126 ${F - 28} Q127.4 ${F - 23} 131 ${F - 20.6}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1" stroke-linecap="round"/>`;
  // the tulip bed: each with two leaves, a stem, a cup of side petals and a front petal, shade on its right, a gleam (the row in a
  // few paths)
  const tx = Array.from({ length: 9 }, (_, k) => 646 + k * 16);
  const TUL = [['#e86f5e', '#f28a7a', '#47283c', '#553248'], ['#f2c94c', '#f7da74', '#4a4232', '#585040'], ['#e58fa8', '#efa9be', '#4a2e4a', '#583a58']];
  const tulips = `<path d="${tx.map((t, k) => { const s = k % 2 ? 1 : -1; return `M${t} ${F - 2} Q${t + 5 * s} ${F - 7} ${t + 5 * s} ${F - 12} Q${t + 1.6 * s} ${F - 7} ${t} ${F - 2} Z M${t} ${F - 2} Q${t - 4.4 * s} ${F - 6} ${t - 4.4 * s} ${F - 9.6} Q${t - 1.4 * s} ${F - 5.6} ${t} ${F - 2} Z`; }).join(' ')}" ${hc('#5f8f52', '#1e3832')}/>
      <path d="${tx.map((t) => `M${t} ${F - 2} Q${t + 0.8} ${F - 9} ${t} ${F - 15.4}`).join(' ')}" ${hs('#4f7a4a', '#1c3430')} stroke-width="1.4"/>
      ${TUL.map(([c, l, n, nl], j) => { const xs = tx.filter((_, k) => k % 3 === j); return `<path d="${xs.map((t) => `M${t - 4} ${F - 21.5} Q${t - 4.4} ${F - 15.6} ${t} ${F - 15} Q${t + 4.4} ${F - 15.6} ${t + 4} ${F - 21.5} Q${t + 2.6} ${F - 19.2} ${t} ${F - 20} Q${t - 2.6} ${F - 19.2} ${t - 4} ${F - 21.5} Z`).join(' ')}" ${hc(c, n)}/><path d="${xs.map((t) => `M${t - 2.5} ${F - 15.4} Q${t - 3.2} ${F - 20} ${t} ${F - 23} Q${t + 3.2} ${F - 20} ${t + 2.5} ${F - 15.4} Q${t} ${F - 14.6} ${t - 2.5} ${F - 15.4} Z`).join(' ')}" ${hc(l, nl)} stroke="#2b1c12" stroke-opacity=".14" stroke-width=".5"/>`; }).join('')}
      <path d="${tx.map((t) => `M${t + 1.2} ${F - 15.1} Q${t + 4.3} ${F - 15.8} ${t + 4} ${F - 21.5} Q${t + 3.6} ${F - 17.4} ${t + 1.2} ${F - 15.1} Z`).join(' ')}" ${dk('.14')}/><path d="${tx.map((t) => `M${t - 1.3} ${F - 16.6} Q${t - 1.6} ${F - 19.4} ${t - 0.3} ${F - 21.2}`).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".7" stroke-linecap="round"/>`;
  // the sandbox (it lay under the ground till now): a frame of planks with seams, corner posts and a lit top; the sand shaded under
  // the frame, raked, a little heap; the bucket with a rim, sand in it, a gleam and its handle; the spade with a grip and a scoop
  const corner = (x, y) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1.6" ${hc('#a8916a', '#24243e')}/><path d="M${x - 2.6} ${y - 2.6} h5.2" stroke="#fff" stroke-opacity=".22" stroke-width=".8"/>`;
  const sandbox = `<rect x="662" y="${F + 33}" width="110" height="40" rx="4" ${dk('.1')}/><rect x="660" y="${F + 30}" width="110" height="40" rx="4" ${hc('#e6d3a8', '#3a3456')}/>
      <path d="M663 ${F + 34} H767 M663.6 ${F + 34} V${F + 66}" stroke="#2b1c12" stroke-opacity=".1" stroke-width="3"/><path d="M670 ${F + 46} q8 -3 16 0 M716 ${F + 61} q9 -3 18 0 M676 ${F + 62} q6 -2 12 0 M722 ${F + 50} q4 -1.6 8 0" fill="none" stroke="#2b1c12" stroke-opacity=".1" stroke-width="1" stroke-linecap="round"/>
      <rect x="660" y="${F + 30}" width="110" height="40" rx="4" fill="none" ${hs('#b9a37a', '#2a2a46')} stroke-width="5"/><path d="M663 ${F + 28.4} H767 M663 ${F + 68.4} H767" stroke="#fff" stroke-opacity=".22" stroke-width=".8"/>
      <path d="M700 ${F + 27.6} v4.8 M735 ${F + 27.6} v4.8 M690 ${F + 67.6} v4.8 M745 ${F + 67.6} v4.8 M657.6 ${F + 50} h4.8 M767.6 ${F + 50} h4.8" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".8"/>
      ${corner(660, F + 30)}${corner(770, F + 30)}${corner(660, F + 70)}${corner(770, F + 70)}
      <path d="M690 ${F + 52} q10 -12 20 0 Z" ${hc('#d9c08a', '#3a3456')}/><path d="M701 ${F + 46.2} Q707 ${F + 47} 710 ${F + 52} H703 Z" ${dk('.1')}/><path d="M694 ${F + 49} q3 -3.6 6 -3.6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-linecap="round"/>
      <ellipse cx="737" cy="${F + 56.6}" rx="8" ry="1.6" ${dk('.12')}/><path d="M728 ${F + 40} h18 l-3 16 h-12 Z" ${hc('#d0453c', '#5a2030')}/><path d="M741 ${F + 41} h5 l-3 15 h-3.4 Z" ${dk('.14')}/><path d="M731.4 ${F + 43.6} l1.4 10" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M727.4 ${F + 38.8} h19.2 v2.8 h-19.2 Z" ${hc('#e8675a', '#6a2a3a')}/><ellipse cx="737" cy="${F + 38.9}" rx="9.6" ry="1.6" ${hc('#8a2f2a', '#3a2030')}/><ellipse cx="737" cy="${F + 39.1}" rx="7" ry=".9" ${hc('#e0c995', '#3a3456')}/>
      <path d="M728.6 ${F + 39.4} q8.4 -10.4 16.8 0" fill="none" ${hs('#8a2f2a', '#3a2030')} stroke-width="1.4"/>
      <path d="M752 ${F + 36} l8.6 15.6" ${hs('#e6c23a', '#5a5030')} stroke-width="3"/><path d="M749.6 ${F + 36.8} l4.8 -2.4" ${hs('#c9a42a', '#4a4228')} stroke-width="2.4"/>
      <path d="M759.4 ${F + 51} Q765.6 ${F + 51.6} 767 ${F + 61.6} Q762.4 ${F + 63.6} 757.8 ${F + 60.4} Q757.6 ${F + 55} 759.4 ${F + 51} Z" ${hc('#e6c23a', '#5a5030')}/><path d="M760.6 ${F + 53} Q763.2 ${F + 56.4} 762.6 ${F + 61}" fill="none" stroke="#2b1c12" stroke-opacity=".18" stroke-width=".8"/><path d="M759.6 ${F + 53.4} q-.6 2.6 0 4.6" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8" stroke-linecap="round"/>`;
  // the drinking fountain: a terrazzo post on a slab, shaded down one side; the basin's dish with a little water, its rim lit; the
  // gooseneck tap and its knob; the trickle (fx-blink) leaps up when he drinks (spout: a taller jet, drops, rings on the water)
  const fountain = `<ellipse cx="861" cy="${F + 60}" rx="13" ry="2.2" ${dk('.12')}/><rect x="849" y="${F + 56.6}" width="24" height="3.6" rx="1" ${hc('#9a958a', '#26284a')}/>
      <path d="M852.6 ${F + 27} H869.4 L870.4 ${F + 57} H851.6 Z" ${hc('#a9a497', '#2c2e4c')}/><path d="M865.4 ${F + 27} H869.4 L870.4 ${F + 57} H866 Z" ${dk('.1')}/><path d="M853.8 ${F + 28} V${F + 56}" stroke="#fff" stroke-opacity=".14" stroke-width="1"/>
      <path d="M855.6 ${F + 33} h.01 M861.4 ${F + 38} h.01 M857 ${F + 45} h.01 M863.6 ${F + 49} h.01 M859 ${F + 52.6} h.01 M866.4 ${F + 41} h.01 M855 ${F + 50} h.01" stroke="#2b1c12" stroke-opacity=".12" stroke-width="1" stroke-linecap="round"/>
      <rect x="844" y="${F + 20}" width="34" height="8" rx="3" ${hc('#bdb8aa', '#3a3c5e')}/><path d="M846 ${F + 26.6} H876" stroke="#2b1c12" stroke-opacity=".14" stroke-width="2"/>
      <ellipse cx="861" cy="${F + 21.6}" rx="13.4" ry="1.9" ${hc('#8f8a7e', '#26284c')}/><ellipse cx="865.4" cy="${F + 21.9}" rx="9.4" ry="1.1" ${hc('#bfe0ee', '#3a4a7a')}/><path d="M846 ${F + 20.4} H876" stroke="#fff" stroke-opacity=".3" stroke-width=".8"/>
      <path d="M861 ${F + 21} V${F + 16} Q861 ${F + 14} 863 ${F + 14} H866.4" fill="none" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><path d="M860.4 ${F + 19} V${F + 16} Q860.4 ${F + 13.5} 862.8 ${F + 13.3} H865.4" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".7"/><ellipse cx="857.6" cy="${F + 19.6}" rx="1.5" ry=".8" ${hc('#9aa0aa', '#3a3d66')}/><path d="M856.8 ${F + 19.3} h1" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>
      <g data-fx="fountain"><path d="M867 ${F + 14} q4 -6 7 2" ${hsx('fx-blink jet', '#9fd0f0', '#7a9ad0')} stroke-width="1.6"/>${[0, 1, 2].map((i) => `<circle class="drop" cx="${874.2 + i * 0.4}" cy="${F + 16}" r=".8" fill="#9fd0f0" style="animation-delay:${(0.25 + i * 0.14).toFixed(2)}s"/>`).join('')}<ellipse class="rip" cx="873.4" cy="${F + 21.8}" rx="2.6" ry=".7" fill="none" stroke="#e8f6ff" stroke-width=".6"/></g>`;
  return `<svg class="land tall park-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 40 C200 10 420 0 600 20 S1000 40 1200 0 V370 H0 Z"/>
      ${house(40, 70, 110, '#8a5a44')}${house(190, 50, 96, '#5f6f8a')}${house(330, 80, 120, '#6f5a7a')}${house(520, 60, 100, '#8a5a44')}${house(660, 76, 110, '#5f6f8a')}
      <path class="near" d="M0 150 C300 130 700 140 1200 120 V370 H0 Z"/>
      <path d="M${px - 40} 40 L${px + 40} 40 L${px + 70} ${F} L${px - 10} ${F} Z" ${hc('#c9c4b8', '#2a2c4c')}/>${Array.from({ length: 12 }, (_, k) => { const t = k / 11, y = 40 + (F - 40) * t; return `<path d="M${px - 40 + 30 * t} ${y} H${px + 40 + 30 * t}" ${hs('#a8a49a', '#22244a')} stroke-width="2"/>`; }).join('')}
      <path d="M${px - 46} 40 L${px - 16} ${F} M${px + 46} 40 L${px + 76} ${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="3"/>
      ${ginkgo(900, 1.2)}${ginkgo(1120, 1)}${ginkgo(80, 1.1)}
      ${fence}
      ${slide}
      ${swingFrame}${swing(520, 0)}${swing(580, 1)}
      ${clock(804, F - 132)}<circle class="glow" cx="804" cy="${F - 132}" r="60" fill="url(#glw)"/>${lightPool(804, F + 8, 90)}${streetLamp(1030, F + 2, 116)}
      ${jizo}
      ${[[880, -60], [1000, -20], [1100, -80], [60, -40], [160, -90], [700, 20]].map(([x, y], k) => leaf(x, y, k)).join('')}
      <rect x="-20" y="${F}" width="1240" height="134" ${hc('#d9c7a2', '#2a2846')}/>${Array.from({ length: 22 }, (_, j) => (j === 12 || j === 13 ? '' : `<path d="M${j * 56} ${F + 30 + (j % 3) * 28} q6 -6 12 0" ${hs('#c2ad84', '#22203e')} stroke-width="2"/>`)).join('')}
      <ellipse cx="134" cy="${F + 1.2}" rx="23" ry="2.2" ${dk('.1')}/><ellipse cx="236" cy="${F + 1}" rx="12" ry="2" ${dk('.12')}/><ellipse cx="804" cy="${F + 1}" rx="9" ry="1.8" ${dk('.12')}/><ellipse class="sw-shade s0" cx="520" cy="${F + 3}" rx="12" ry="2.2" ${dk('.12')}/><ellipse class="sw-shade s1" cx="580" cy="${F + 3}" rx="12" ry="2.2" ${dk('.12')}/>
      ${sandbox}
      <g data-fx="pigeons">${pigeonArt(560, F + 100, 0)}${pigeonArt(596, F + 106, 1)}</g>
      ${tulips}
    </svg>
    ${benchProps(200, F + 60, 50)}${benchProps(980, F + 60, 50)}${landProp(74, fountain, null, [838, F + 2, 886, F + 62])}${landProp(116, panda(430, F + 18), null, [402, F - 50, 466, F + 22])}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('park')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="town" aria-label="往小鎮" style="margin-left:${PARK_PATH - 32}px;bottom:186px"><span class="tag">${ySign('shop', '往小鎮')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="street" aria-label="往大馬路" style="margin-left:${-YARD_HALF + 40}px;bottom:70px"><span class="tag">${ySign('bus', '往大馬路')}</span></button>
    <div class="ysel"></div>`;
}
// the two shops one can walk into (2026-11-10: seen at 45° like 書房, ISO): drawn in the 1200 × 900 frame of a room's land.
// In a room: the hero, the people there now, the way out by its door (on the left wall)
const indoorRest = (place) => { const [dx, dy] = isoXY(0, ISO.door[1], 4.9); return `${yHeroHtml()}${TOWNEV.castHtml(place)}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="town" aria-label="出去" style="margin-left:${Math.round(dx) - 32}px;bottom:${Math.round(dy)}px"><span class="tag">${ySign('today', '出去')}</span></button>
    <div class="ysel"></div>`; };
// drawing in the room: a point, a face, a box (its two faces toward us and its top, shaded as 書房's light falls), flat things on
// the left wall (p = −v, q = −h), on a wall or face across at v (p = u, q = −h), on a level at height h (p = u, q = v); a round
// thing standing up (a stool, a barrel)
const iPt = (u, v, h = 0) => isoPt(u, v, h).map((n) => n.toFixed(1)).join(' ');
const iPoly = (pts, fill, more = '') => `<path d="M${pts.map((q) => iPt(...q)).join(' L')} Z" fill="${fill}"${more}/>`;
const iShade = (c, k) => mixHex(c, '#1c120a', k);
const iBox = (c, u0, v0, h0, u1, v1, h1, o = {}) => iPoly([[u0, v1, h0], [u1, v1, h0], [u1, v1, h1], [u0, v1, h1]], o.fv || iShade(c, 0.1))
  + iPoly([[u1, v0, h0], [u1, v1, h0], [u1, v1, h1], [u1, v0, h1]], o.fu || iShade(c, 0.24)) + iPoly([[u0, v0, h1], [u1, v0, h1], [u1, v1, h1], [u0, v1, h1]], o.top || c);
const iOnL = (inner, u0 = 0) => `<g transform="matrix(${ISO.U} ${-ISO.U / 2} 0 ${ISO.U} ${ISO.ox + u0 * ISO.U} ${ISO.oy + u0 * ISO.U / 2})">${inner}</g>`;
const iOnV = (v0, inner) => `<g transform="matrix(${ISO.U} ${ISO.U / 2} 0 ${ISO.U} ${ISO.ox - v0 * ISO.U} ${ISO.oy + v0 * ISO.U / 2})">${inner}</g>`;
const iOnF = (h, inner) => `<g transform="matrix(${ISO.U} ${ISO.U / 2} ${-ISO.U} ${ISO.U / 2} ${ISO.ox} ${ISO.oy - h * ISO.U})">${inner}</g>`;
function iCyl(u, v, r, h0, h1, side, top) {
  const [x, y0] = isoPt(u, v, h0), y1 = isoPt(u, v, h1)[1], rx = r * ISO.U * Math.SQRT2, ry = rx / 2;
  return `<path d="M${(x - rx).toFixed(1)} ${y1.toFixed(1)} V${y0.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(x + rx).toFixed(1)} ${y0.toFixed(1)} V${y1.toFixed(1)} Z" fill="${side}"/><ellipse cx="${x.toFixed(1)}" cy="${y1.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${top}"/>`;
}
// things standing off a wall (2026-11-10, the user: the walls' things looked like paper): a board or a post on the left wall (u = 0)
// d deep, from v0 to v1 and h0 to h1 — draw on its face with iOnL(…, d); the same on the right wall (v = 0), its face iOnV(d, …)
const wallL = (c, v0, v1, h0, h1, d, o) => iBox(c, 0, v0, h0, d, v1, h1, o);
const wallR = (c, u0, u1, h0, h1, d, o) => iBox(c, u0, 0, h0, u1, d, h1, o);
// a doorway's frame standing out of a wall (its far post, its near post, the lintel over them), the noren on a rod before it
const frameL = (v0, v1, h, c) => wallL(c, v0 - 0.16, v0, 0, h, 0.2) + wallL(c, v1, v1 + 0.16, 0, h, 0.2) + wallL(c, v0 - 0.16, v1 + 0.16, h, h + 0.24, 0.22);
const frameR = (u0, u1, h, c) => wallR(c, u0 - 0.16, u0, 0, h, 0.2) + wallR(c, u1, u1 + 0.16, 0, h, 0.2) + wallR(c, u0 - 0.16, u1 + 0.16, h, h + 0.24, 0.22);
const ISO_DEFS = `<defs><linearGradient id="isoAoV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="isoAoU" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`;
const SERIF = `font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`;
// the room's shell: the floor in planks, the two walls with their wainscot, the shade where they meet the floor, the block's cut
// edges (the floor's front edges, the walls' ends and tops) as 書房's
function isoShell(c) {
  const { RW, RD, RH } = ISO, T = 0.5, W = 2.4;
  let seams = ''; for (let i = 0, q = 0.7; q < RD; q += 0.7, i++) { seams += `M0 ${q.toFixed(2)} H${RW} `; for (let p = (i * 1.9) % 3.4 + 0.6; p < RW; p += 3.4) seams += `M${p.toFixed(2)} ${(q - 0.7).toFixed(2)} v.7 `; }
  const battens = (n) => Array.from({ length: Math.floor(n / 0.8) }, (_, i) => `M${(0.4 + i * 0.8).toFixed(2)} ${-W} V0`).join(' ');
  return iPoly([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]], c.floor) + iOnF(0, `<path d="${seams}" fill="none" stroke="${c.seam}" stroke-width=".035"/>`)
    + iPoly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]], c.wallL) + iPoly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]], c.wallR)
    + iOnL(`<rect x="${-RD}" y="${-W}" width="${RD}" height="${W}" fill="${c.wainL}"/><path d="${battens(RD).replace(/M(\d)/g, 'M-$1')}" stroke="${c.batten}" stroke-width=".07"/><rect x="${-RD}" y="${-W - 0.14}" width="${RD}" height=".16" fill="${c.trim}"/><rect x="${-RD}" y="${-RH}" width="${RD}" height=".22" fill="${c.trim}"/>`)
    + iOnV(0, `<rect x="0" y="${-W}" width="${RW}" height="${W}" fill="${c.wainR}"/><path d="${battens(RW)}" stroke="${c.batten}" stroke-width=".07"/><rect x="0" y="${-W - 0.14}" width="${RW}" height=".16" fill="${c.trim}"/><rect x="0" y="${-RH}" width="${RW}" height=".22" fill="${c.trim}"/>`)
    + iOnF(0, `<rect x="0" y="0" width="${RW}" height=".9" fill="url(#isoAoV)"/><rect x="0" y="0" width=".9" height="${RD}" fill="url(#isoAoU)"/>`)
    + iPoly([[RW, -T, 0], [RW, RD, 0], [RW, RD, -T], [RW, -T, -T]], c.edgeU) + iPoly([[-T, RD, 0], [RW, RD, 0], [RW, RD, -T], [-T, RD, -T]], c.edgeV)
    + iPoly([[0, RD, 0], [-T, RD, 0], [-T, RD, RH], [0, RD, RH]], c.capV) + iPoly([[RW, 0, 0], [RW, -T, 0], [RW, -T, RH], [RW, 0, RH]], c.capU)
    + iPoly([[-T, -T, RH], [RW, -T, RH], [RW, 0, RH], [0, 0, RH], [0, RD, RH], [-T, RD, RH]], c.top);
}
// a chair at a table, its seat at (u, v): its back on the far side (far: whoever sits there faces us) or on the near side
function iChair(u, v, far, c = '#9a6a40') {
  const w = 0.42, bv = far ? v - w + 0.12 : v + w;   // the back's face toward us
  // 2026-11-11 (the user: finer): the back's face framed as a panel with a hand slot and its grain, the seat's front edge caught by the light
  const face = iOnV(bv, `<rect x="${(u - 0.3).toFixed(2)}" y="-1.98" width=".6" height=".98" fill="none" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".04"/><rect x="${(u - 0.16).toFixed(2)}" y="-1.88" width=".32" height=".1" rx=".05" fill="#2b1c12" fill-opacity=".45"/><path d="M${(u - 0.12).toFixed(2)} -1.66 V-1.08 M${(u + 0.1).toFixed(2)} -1.7 V-1.2" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".03"/><path d="M${(u - w).toFixed(2)} -2.08 H${(u + w).toFixed(2)}" stroke="#fff" stroke-opacity=".2" stroke-width=".04"/>`);
  const back = (far ? iBox(iShade(c, 0.12), u - w, v - w, 0.85, u + w, v - w + 0.12, 2.1) : iBox(iShade(c, 0.12), u - w, v + w - 0.12, 0.85, u + w, v + w, 2.1)) + face;
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => iBox(iShade(c, 0.3), u + a * 0.34 - 0.05, v + b * 0.34 - 0.05, 0, u + a * 0.34 + 0.05, v + b * 0.34 + 0.05, 0.75)).join('');
  const seat = iBox(c, u - w, v - w, 0.75, u + w, v + w, 0.85) + iOnV(v + w, `<path d="M${(u - w).toFixed(2)} -.835 H${(u + w).toFixed(2)}" stroke="#fff" stroke-opacity=".22" stroke-width=".03"/>`) + iOnF(0.85, `<path d="M${(u - w + 0.08).toFixed(2)} ${(v - 0.1).toFixed(2)} h.6 M${(u - w + 0.2).toFixed(2)} ${(v + 0.16).toFixed(2)} h.5" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".03"/>`);
  return far ? back + legs + seat : legs + seat + back;
}
// a cylinder's shade on its right (2026-11-11): its side from a little right of the middle round to its right edge, under its top
const iCylSh = (u, v, r, h0, h1, k = 0.14, a = 0.35) => { const [x, y0] = isoPt(u, v, h0), y1 = isoPt(u, v, h1)[1], rx = r * ISO.U * Math.SQRT2, ry = rx / 2, sx = x + rx * a, dy = ry * Math.sqrt(1 - a * a);
  return `<path d="M${sx.toFixed(1)} ${(y1 + dy).toFixed(1)} V${(y0 + dy).toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(x + rx).toFixed(1)} ${y0.toFixed(1)} V${y1.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${sx.toFixed(1)} ${(y1 + dy).toFixed(1)} Z" fill="#2b1c12" fill-opacity="${k}"/>`; };
// a bar stool (2026-11-11, the user: finer): its foot, its post, its seat with a piped edge and a sheen (wood: its grain in rings)
function iStool(u, v, c) {
  const [x, y] = isoPt(u, v, 1.05), rx = 0.42 * ISO.U * Math.SQRT2, ry = rx / 2, [bx, by] = isoPt(u, v, 0.05);
  return iCyl(u, v, 0.3, 0, 0.05, c.foot, c.footTop) + `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="6" ry="3" fill="#fff" fill-opacity=".12"/>` + iCyl(u, v, 0.07, 0.05, 0.92, c.post, c.post)
    + `<path d="M${(bx - 0.8).toFixed(1)} ${(by - 2).toFixed(1)} V${(y + 12).toFixed(1)}" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>`
    + iCyl(u, v, 0.42, 0.92, 1.05, c.side, c.top) + iCylSh(u, v, 0.42, 0.92, 1.05, 0.16)
    + (c.wood ? `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rx * 0.68).toFixed(1)}" ry="${(ry * 0.68).toFixed(1)}" fill="none" stroke="#2b1c12" stroke-opacity=".14" stroke-width=".7"/><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rx * 0.36).toFixed(1)}" ry="${(ry * 0.36).toFixed(1)}" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".6"/>`
      : `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rx - 2).toFixed(1)}" ry="${(ry - 1).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1" fill="#2b1c12" fill-opacity=".25"/>`)
    + `<ellipse cx="${(x - 5).toFixed(1)}" cy="${(y - 2.4).toFixed(1)}" rx="6" ry="2.2" fill="#fff" fill-opacity=".18"/>`;
}
// a hanging paper lantern by a wall (at u, v, its top at h), swaying, with its glow; the char on it
// 2026-11-11 (the user: finer): its paper's bamboo ribs curved round it, its far side in shade, its caps' rims catching the light
const iLantern = (u, v, h, k, ch) => { const [x, y] = isoPt(u, v, h), f = (n) => n.toFixed(1), ribs = [-0.8, -0.52, 0.52, 0.8].map((t) => { const w = 15 * Math.sqrt(1 - t * t); return `M${f(x - w)} ${f(y + 18 + t * 19)} q${f(w)} ${f(2.6 * (1 - Math.abs(t)) + 0.8)} ${f(2 * w)} 0`; }).join(' ');
  return `<circle cx="${f(x)}" cy="${f(y + 24)}" r="70" fill="url(#glw)" opacity=".55"/><g class="fx-sway" style="animation-delay:-${(k * 0.7).toFixed(1)}s;animation-duration:${(3 + (k % 3) * 0.4).toFixed(1)}s"><path d="M${f(x)} ${f(y - 12)} v10" stroke="#2b2b33" stroke-width="1.6"/><rect x="${f(x - 9)}" y="${f(y - 3)}" width="18" height="5" fill="#2b2b33"/><ellipse cx="${f(x)}" cy="${f(y + 18)}" rx="15" ry="19" fill="#d84a3a"/>`
    + `<path d="M${f(x + 2)} ${f(y - 0.6)} A15 19 0 0 1 ${f(x + 2)} ${f(y + 36.6)} A9 18 0 0 0 ${f(x + 2)} ${f(y - 0.6)} Z" fill="#7a1a1a" fill-opacity=".22"/><path d="${ribs}" fill="none" stroke="#a8302a" stroke-width="1.1" stroke-opacity=".85"/><path d="M${f(x)} ${f(y - 0.8)} V${f(y + 4)} M${f(x)} ${f(y + 32)} V${f(y + 36.8)}" stroke="#a8302a" stroke-width=".8" stroke-opacity=".6"/>`
    + `<ellipse cx="${f(x - 5)}" cy="${f(y + 13)}" rx="4" ry="8" fill="#ffd0a0" opacity=".35"/><text x="${f(x)}" y="${f(y + 22)}" text-anchor="middle" font-size="10" font-weight="700" fill="#2b2b33" ${SERIF}>${ch}</text><rect x="${f(x - 9)}" y="${f(y + 35)}" width="18" height="4" fill="#2b2b33"/><path d="M${f(x - 8)} ${f(y - 2.4)} h16 M${f(x - 8)} ${f(y + 35.6)} h16" stroke="#fff" stroke-opacity=".2" stroke-width=".8"/></g>`; };
// steam off something at (u, v, h): 2026-11-11 a second, smaller wisp after the first
const iSteam = (u, v, h, k, r = 6) => { const [x, y] = isoPt(u, v, h); return `<g transform="translate(${x.toFixed(1)} ${(y - 8).toFixed(1)})"><ellipse rx="${r}" ry="${r * 0.75}" class="fx-steam" fill="#fff" style="animation-delay:-${k}s"/><ellipse cx="-3" rx="${(r * 0.6).toFixed(1)}" ry="${(r * 0.45).toFixed(1)}" class="fx-steam" fill="#fff" style="animation-delay:-${(k + 2.2).toFixed(1)}s"/></g>`; };
// a bowl on a table or the counter (at its top, h): 2026-11-11 (the user: finer) on its foot ring, its glaze in shade on the right with
// a sheen on the left, a thin rim round the food, the food's sheen and a few bits on it
const iBowl = (u, v, h, c) => { const [x, y] = isoPt(u, v, h), f = (n) => n.toFixed(1), bit = mixHex(c, '#ffffff', 0.45);
  return `<path d="M${f(x - 3.4)} ${f(y + 2.2)} h6.8 l-.5 1.4 h-5.8 Z" fill="#d9d0bf"/><path d="M${f(x - 8)} ${f(y - 4)} h16 q-1 7 -8 7 q-7 0 -8 -7 Z" fill="#f4efe4"/><path d="M${f(x + 8)} ${f(y - 4)} q-1 7 -8 7 q5.4 -1.6 6.4 -7 Z" fill="#2b1c12" fill-opacity=".12"/><path d="M${f(x - 6.2)} ${f(y - 2)} q1 3 3.4 4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>`
    + `<ellipse cx="${f(x)}" cy="${f(y - 4)}" rx="8" ry="2.8" fill="#fbf8f0"/><ellipse cx="${f(x)}" cy="${f(y - 3.8)}" rx="6.8" ry="2.2" fill="${c}"/><path d="M${f(x - 2.8)} ${f(y - 4.4)} h.1 M${f(x + 1.4)} ${f(y - 4.9)} h.1 M${f(x + 3.4)} ${f(y - 3.5)} h.1 M${f(x - 0.6)} ${f(y - 3)} h.1" stroke="${bit}" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="${f(x - 2.6)}" cy="${f(y - 4.6)}" rx="2.2" ry=".6" fill="#fff" fill-opacity=".35"/>`; };
// まんぷく食堂 at 45°: the kitchen behind the counter along the right wall (its cook), red stools before it, two tables with their
// chairs on the far side (whoever sits there faces us; 2026-11-10, the user: four chairs a table crowded into each other), the
// menu, the kamidana and the door on the left wall, the kitchen's noren, the TV
function shokudoHtml() {
  isoProps = [];
  const menu = [['カレー', '500円'], ['ラーメン', '600円'], ['うどん', '450円'], ['ぎゅうどん', '550円'], ['さかな定食', '800円'], ['からあげ定食', '750円'], ['おにぎり', '150円'], ['みそしる', '100円']];
  const tanzaku = [['親子丼', '700円'], ['天ぷら', '900円'], ['生姜焼き', '780円'], ['冷やっこ', '250円'], ['お新香', '200円'], ['ビール', '500円']];
  // 2026-11-11 (the user: finer): the soy sauce with its red cap, label and sheen; the napkins standing in their steel holder
  const cruet = (x, y) => { const f = (n) => n.toFixed(1); return `<rect x="${f(x - 3)}" y="${f(y - 13)}" width="6" height="11" rx="2" fill="#4a2a1c"/><rect x="${f(x - 2.2)}" y="${f(y - 14.4)}" width="4.4" height="3" rx="1" fill="#c84a3a"/><rect x="${f(x - 3)}" y="${f(y - 8.4)}" width="6" height="2.6" fill="#f3ead6" opacity=".85"/><path d="M${f(x - 1.5)} ${f(y - 11)} v2 M${f(x - 1.5)} ${f(y - 5)} v1.6" stroke="#fff" stroke-opacity=".35" stroke-width=".9" stroke-linecap="round"/>`
    + `<path d="M${f(x + 6)} ${f(y - 5.6)} l.7 -3.6 h6.6 l.7 3.6 Z" fill="#fbf8f0"/><path d="M${f(x + 7.4)} ${f(y - 7.6)} h5.8" stroke="#d9d0bf" stroke-width=".5"/><rect x="${f(x + 5)}" y="${f(y - 6)}" width="10" height="4" rx=".8" fill="#b8bcc2"/><path d="M${f(x + 5.6)} ${f(y - 5.4)} h8.8" stroke="#fff" stroke-opacity=".45" stroke-width=".7"/>`; };
  // a plant's leaves (2026-11-11, the user: finer): each lobe on its own shade, lit from the upper left, a few leaf tips standing out
  const bush = (x, y, lobes, c) => { const f = (n) => n.toFixed(1), dk = mixHex(c, '#1c120a', 0.32), lt = mixHex(c, '#ffffff', 0.22);
    return lobes.map(([dx, dy, r]) => `<circle cx="${f(x + dx + r * 0.1)}" cy="${f(y + dy + r * 0.14)}" r="${r}" fill="${dk}"/>`).join('') + lobes.map(([dx, dy, r]) => `<circle cx="${f(x + dx - r * 0.06)}" cy="${f(y + dy - r * 0.1)}" r="${f(r * 0.9)}" fill="${c}"/>`).join('')
      + lobes.map(([dx, dy, r]) => { const X = x + dx - r * 0.06, Y = y + dy - r * 0.1, R = r * 0.9;
        return `<path d="M${f(X - 0.8 * R)} ${f(Y - 0.05 * R)} A${f(0.7 * R)} ${f(0.7 * R)} 0 0 1 ${f(X + 0.1 * R)} ${f(Y - 0.84 * R)} A${f(1.3 * R)} ${f(1.3 * R)} 0 0 0 ${f(X - 0.8 * R)} ${f(Y - 0.05 * R)} Z" fill="${lt}"/><path d="M${f(X - 0.3 * R)} ${f(Y - 0.3 * R)} q${f(0.16 * R)} ${f(-0.22 * R)} ${f(0.4 * R)} ${f(-0.1 * R)} q${f(-0.16 * R)} ${f(0.2 * R)} ${f(-0.4 * R)} ${f(0.1 * R)} Z" fill="${lt}"/><path d="M${f(X + 0.2 * R)} ${f(Y + 0.22 * R)} l${f(0.28 * R)} ${f(-0.2 * R)} M${f(X - 0.5 * R)} ${f(Y + 0.34 * R)} l${f(-0.16 * R)} ${f(-0.28 * R)}" stroke="${dk}" stroke-opacity=".6" stroke-width="${f(Math.max(0.6, r * 0.08))}" stroke-linecap="round"/>`; }).join(''); };
  const table = ([u0, u1, v0, v1], k) => { const um = (u0 + u1) / 2, [sx, sy] = isoPt(um, (v0 + v1) / 2, 1.42);
    return [[u0 + 0.2, v0 + 0.2], [u1 - 0.3, v0 + 0.2], [u0 + 0.2, v1 - 0.3], [u1 - 0.3, v1 - 0.3]].map(([a, b]) => iBox('#5e3e24', a, b, 0, a + 0.1, b + 0.1, 1.3)).join('') + iBox('#b07a46', u0, v0, 1.3, u1, v1, 1.42, { top: '#c8925a' })
      + iOnF(1.42, `<path d="M${u0} ${v1 - 0.03} H${u1 - 0.03} V${v0}" fill="none" stroke="#e0aa70" stroke-width=".05"/><path d="M${u0 + 0.3} ${v0 + 0.45} h1.1 M${u0 + 1.7} ${v0 + 1.05} h1 M${u0 + 0.5} ${v1 - 0.35} h.9 M${u1 - 0.9} ${v0 + 0.3} h.6" stroke="#a8743f" stroke-opacity=".45" stroke-width=".035"/>`)
      + iBowl(u0 + 0.8, v0 + 0.5, 1.42, '#e6a23c') + iBowl(u1 - 0.8, v0 + 0.5, 1.42, '#c84a3a') + iSteam(u0 + 0.8, v0 + 0.5, 1.42, k) + cruet(sx, sy); };
  const [cx, cy] = isoPt(2.4, 2.0, 1.95);
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#c9a276', seam: '#9a744c', wallL: '#efe2c6', wallR: '#f6ead2', wainL: '#a87a4c', wainR: '#b88a5c', batten: '#946640', trim: '#6e4a30', edgeU: '#8a6440', edgeV: '#a07850', capU: '#d9c9a8', capV: '#e8d8b8', top: '#cdb995' })}
    ${iOnF(0, `<rect x="0" y="0" width="15" height="1.4" fill="#dcd6ca"/><path d="${Array.from({ length: 30 }, (_, i) => `M${(i * 0.5).toFixed(1)} 0 v1.4`).join(' ')} M0 .7 H15" stroke="#c4bdb0" stroke-width=".03"/>`)}
    ${iOnV(0, `<rect x=".3" y="-4.3" width="14.3" height="2.4" fill="#eef0ea"/><path d="${Array.from({ length: 24 }, (_, i) => `M${(0.3 + i * 0.6).toFixed(1)} -4.3 v2.4`).join(' ')} M.3 -3.7 H14.6 M.3 -3.1 H14.6 M.3 -2.5 H14.6" stroke="#d2d6cc" stroke-width=".03"/>
      ${tanzaku.map((_, i) => `<rect x="${(9.17 + i * 0.92).toFixed(2)}" y="-6.6" width=".74" height="2.2" fill="#000" opacity=".13"/>`).join('')}<rect x="16" y="-4.1" width="2.4" height="4.1" fill="#2a1e16"/>
      <circle cx="15.2" cy="-6" r=".52" fill="#000" opacity=".12"/>`)}
    ${wallR('#6e4a30', 1, 8.2, 4.72, 4.86, 0.6, { top: '#8a5e3c' })}${[1.5, 2.9, 4.3, 5.7, 7.1].map((u) => iCyl(u, 0.32, 0.3, 4.86, 5.03, '#efe9dc', '#fbf8f0') + iCyl(u, 0.32, 0.27, 5.03, 5.2, '#f4efe4', '#fbf8f0') + (() => {   // 2026-11-11: a stack of plates, each one's edge, the top one's indigo rim and its foot ring
      const [x, y] = isoPt(u, 0.32, 5.2), y1 = isoPt(u, 0.32, 4.945)[1], y2 = isoPt(u, 0.32, 5.115)[1], r1 = 0.3 * ISO.U * Math.SQRT2, r2 = 0.27 * ISO.U * Math.SQRT2;
      return `<path d="M${(x - r1).toFixed(1)} ${y1.toFixed(1)} A${r1.toFixed(1)} ${(r1 / 2).toFixed(1)} 0 0 0 ${(x + r1).toFixed(1)} ${y1.toFixed(1)} M${(x - r2).toFixed(1)} ${y2.toFixed(1)} A${r2.toFixed(1)} ${(r2 / 2).toFixed(1)} 0 0 0 ${(x + r2).toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#d9d0bf" stroke-width=".8"/><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r2 - 1.4).toFixed(1)}" ry="${(r2 / 2 - 0.7).toFixed(1)}" fill="none" stroke="#7f9fc8" stroke-opacity=".5" stroke-width=".7"/><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r2 * 0.45).toFixed(1)}" ry="${(r2 * 0.22).toFixed(1)}" fill="none" stroke="#e2dccf" stroke-width=".7"/>`; })()).join('')}
    ${wallR('#7a5230', 8.85, 14.75, 6.68, 6.82, 0.16)}${iOnV(0.07, tanzaku.map(([n, pr], i) => `<rect x="${(9.1 + i * 0.92).toFixed(2)}" y="-6.7" width=".74" height="2.2" fill="#fbf6e9" stroke="#d9c79a" stroke-width=".02"/>${vText((9.47 + i * 0.92).toFixed(2), -6.6, n, 0.34, `font-weight="700" fill="#3b2a1c" ${SERIF}`)}<text x="${(9.47 + i * 0.92).toFixed(2)}" y="-4.64" text-anchor="middle" font-size=".22" fill="#a0402c" font-family="system-ui, sans-serif">${pr}</text>`).join(''))}
    ${iOnV(0, '<circle cx="15.2" cy="-6" r=".5" fill="#5e3e24"/>')}${iOnV(0.15, `<circle cx="15.2" cy="-6" r=".46" fill="#fbf7ec" stroke="#6e4a30" stroke-width=".08"/>${[0, 90, 180, 270].map((d) => `<path d="M15.2 -6.38 v.08" stroke="#6e4a30" stroke-width=".04" transform="rotate(${d} 15.2 -6)"/>`).join('')}<path d="M15.2 -6 v-.24" stroke="#3b2a1c" stroke-width=".07" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--hh, 0deg))"/><path d="M15.2 -6 v-.36" stroke="#3b2a1c" stroke-width=".045" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--mm, 0deg))"/>`)}
    ${frameR(16, 18.4, 4.1, '#5e3e24')}${wallR('#3a2a20', 15.9, 18.5, 4.02, 4.1, 0.34)}${iOnV(0.3, `<g data-fx="noren">${[0, 1].map((k) => `<g class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s"><path d="M${16.05 + k * 1.17} -4.0 h1.12 v1.45 h-1.12 Z" fill="#c84a3a"/><path d="M${16.05 + k * 1.17} -3.86 h1.12" stroke="#2b1c12" stroke-opacity=".18" stroke-width=".05"/><path d="M${16.05 + k * 1.17} -2.62 h1.12" stroke="#fff" stroke-opacity=".3" stroke-width=".04"/><path d="M${16.05 + k * 1.17 + (k ? 0.02 : 1.08)} -3.9 v1.3" stroke="#2b1c12" stroke-opacity=".14" stroke-width=".05"/></g>`).join('')}</g><text x="17.2" y="-3.15" text-anchor="middle" font-size=".42" font-weight="700" fill="#fff" ${SERIF}>厨房</text>`)}
    ${wallR('#4a4a55', 20.08, 20.32, 6.3, 6.5, 0.5)}${iBox('#3a3a44', 19, 0.45, 5.08, 21.4, 0.72, 6.62)}${iOnV(0.72, `<rect x="19.12" y="-6.5" width="2.16" height="1.28" fill="#7fb3d8"/><g clip-path="url(#isoTv)"><g class="fx-tvpic"><path d="M19.12 -5.7${Array.from({ length: 8 }, () => ' q.27 -.32 .54 0 t.54 0').join('')}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".08"/></g><circle cx="21" cy="-6.2" r=".14" fill="#f2c94c"/><path d="M19.55 -6.5 h.38 l-.62 1.28 h-.38 Z M20.05 -6.5 h.12 l-.62 1.28 h-.12 Z" fill="#fff" fill-opacity=".16"/></g><circle cx="21.22" cy="-5.15" r=".035" fill="#8fe08a"/><defs><clipPath id="isoTv"><rect x="19.12" y="-6.5" width="2.16" height="1.28"/></clipPath></defs>`)}
    ${[3.4, 7.6].map((u) => wallR('#5e3e24', u - 0.05, u + 0.05, 6.15, 6.25, 0.62) + iCyl(u, 0.62, 0.04, 5.85, 6.2, '#3a2a20', '#3a2a20') + iCyl(u, 0.62, 0.3, 5.55, 5.88, '#e8d4a8', '#f4e3b8') + (() => { const [x, y] = isoPt(u, 0.62, 5.5); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="80" fill="url(#glw)" opacity=".5"/><ellipse cx="${x.toFixed(1)}" cy="${(y + 1).toFixed(1)}" rx="9" ry="3" fill="#fff6d0"/>`; })()).join('')}
    ${wallL('#7a5230', 1.3, 4.2, 6.0, 6.12, 0.9, { top: '#9a6a40' })}${[1.6, 3.9].map((v) => wallL('#6e4a30', v - 0.05, v + 0.05, 5.55, 6.0, 0.72)).join('')}
    ${iBox('#d8b47a', 0.15, 2.3, 6.12, 0.75, 3.2, 6.72)}${iOnL('<rect x="-2.88" y="-6.66" width=".26" height=".5" fill="#8a5a34"/><circle cx="-2.75" cy="-6.42" r=".05" fill="#d9b04a"/>', 0.75)}${iPoly([[0, 3.3, 6.7], [0.9, 3.3, 6.7], [0.45, 3.3, 7.05]], '#6e4a30')}${iPoly([[0.45, 2.2, 7.05], [0.45, 3.3, 7.05], [0.92, 3.3, 6.68], [0.92, 2.2, 6.68]], '#5e3e24')}
    <path d="M${iPt(0.6, 2.2, 6.93)} L${iPt(0.6, 3.3, 6.93)} M${iPt(0.76, 2.2, 6.8)} L${iPt(0.76, 3.3, 6.8)}" stroke="#4a2f20" stroke-opacity=".6" stroke-width=".7"/><path d="M${iPt(0.45, 2.2, 7.05)} L${iPt(0.45, 3.3, 7.05)}" stroke="#9a6a40" stroke-width="1.6" stroke-linecap="round"/><path d="M${iPt(0.92, 2.2, 6.68)} L${iPt(0.92, 3.3, 6.68)}" stroke="#3a2418" stroke-opacity=".5" stroke-width=".8"/>
    ${[1.75, 3.75].map((v) => iCyl(0.45, v, 0.1, 6.12, 6.36, '#f4efe4', '#e8e2d4') + iCylSh(0.45, v, 0.1, 6.12, 6.36, 0.12) + (() => { const [x, y] = isoPt(0.45, v, 6.36); return `<path d="M${x.toFixed(1)} ${(y + 1).toFixed(1)} l-2 -6 M${x.toFixed(1)} ${(y + 1).toFixed(1)} l2.4 -7" stroke="#3f6a3a" stroke-width=".9"/>` + bush(x, y, [[-5, -8, 5], [4, -10, 5], [0, -15, 4.5]], '#4f7a4a'); })()).join('')}
    <path d="M${iPt(0.92, 1.35, 6.08)} Q${iPt(0.92, 2.75, 5.85)} ${iPt(0.92, 4.15, 6.08)}" fill="none" stroke="#e8d8a8" stroke-width="3"/>${(() => { const p0 = isoPt(0.92, 1.35, 6.08), p1 = isoPt(0.92, 2.75, 5.85), p2 = isoPt(0.92, 4.15, 6.08), at = (t, i) => (1 - t) * (1 - t) * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i];   // 2026-11-11: the rope's twist
      return `<path d="${[0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88].map((t) => `M${(at(t, 0) - 1.2).toFixed(1)} ${(at(t, 1) - 1.3).toFixed(1)} l2 2.4`).join(' ')}" stroke="#b89a5a" stroke-width=".8" stroke-linecap="round"/>`; })()}
    <g data-fx="kamidana">${[2.2, 2.75, 3.3].map((v) => `<g class="shide"><path d="M${iPt(0.92, v, 5.98)} l2 4 l-2 4 l2 4" fill="none" stroke="#2b1c12" stroke-opacity=".18" stroke-width="2.4" stroke-linejoin="round"/><path d="M${iPt(0.92, v, 5.98)} l2 4 l-2 4 l2 4" fill="none" stroke="#fff" stroke-width="1.4"/></g>`).join('')}</g>
    ${wallL('#6e4a30', 4.8, 10.4, 3.4, 6.2, 0.16)}${iOnL(`<rect x="-10.26" y="-6.06" width="5.32" height="2.52" fill="#f6ecd4"/><text x="-7.6" y="-5.6" text-anchor="middle" font-size=".36" font-weight="700" fill="#3b2a1c" ${SERIF}>お品書き</text>
      ${menu.map(([n, pr], i) => { const x = i < 4 ? -10.05 : -7.45, y = -5.15 + (i % 4) * 0.42; return `<text x="${x}" y="${y.toFixed(2)}" font-size=".27" font-weight="700" fill="#3b2a1c" ${SERIF}>${n}</text><text x="${(x + 2.3).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size=".23" fill="#a0402c" font-family="system-ui, sans-serif">${pr}</text>`; }).join('')}`, 0.16)}
    ${wallL('#e8dcc4', 10.95, 11.85, 5.2, 6.3, 0.05)}${iOnL('<rect x="-11.82" y="-6.06" width=".84" height=".84" fill="#fbf8f0"/><path d="M-11.82 -5.24 h.84" stroke="#2b1c12" stroke-opacity=".16" stroke-width=".05"/><path d="M-11.68 -5.33 h.56" stroke="#c4bdb0" stroke-width=".035" stroke-dasharray=".05 .04"/><rect x="-11.85" y="-6.3" width=".9" height=".26" fill="#d0453c"/><path d="M-11.85 -6.07 h.9" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".03"/><circle cx="-11.62" cy="-6.2" r=".04" fill="#fbf8f0"/><circle cx="-11.18" cy="-6.2" r=".04" fill="#fbf8f0"/><text x="-11.4" y="-5.42" text-anchor="middle" font-size=".5" font-weight="800" fill="#3b2a1c">11</text>', 0.05)}
    ${iOnL(`<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#3a2a20"/>${[0, 1].map((k) => `<rect x="${(-14.7 + k * 1.36).toFixed(2)}" y="-4.55" width="1.32" height="4.55" fill="#d6e8ee" opacity=".92"/><path d="M${(-14.7 + k * 1.36).toFixed(2)} -3 h1.32 M${(-14.7 + k * 1.36).toFixed(2)} -1.6 h1.32 M${(-14.04 + k * 1.36).toFixed(2)} -4.55 v4.55" stroke="#8a6a52" stroke-width=".06"/>`).join('')}`, 0.03)}
    ${frameL(12, 14.8, 4.62, '#6e4a30')}${wallL('#3a2a20', 11.9, 14.9, 4.5, 4.58, 0.36)}${iOnL(`${[0, 1, 2].map((k) => `<g class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.6}s"><path d="M${(-14.72 + k * 0.9).toFixed(2)} -4.5 h.86 v1.2 h-.86 Z" fill="#2f3a5e"/><path d="M${(-14.72 + k * 0.9).toFixed(2)} -4.38 h.86" stroke="#000" stroke-opacity=".18" stroke-width=".05"/><path d="M${(-14.72 + k * 0.9).toFixed(2)} -3.36 h.86" stroke="#fff" stroke-opacity=".22" stroke-width=".04"/></g>`).join('')}<text x="-13.4" y="-3.72" text-anchor="middle" font-size=".44" font-weight="700" fill="#fff" ${SERIF}>めし</text>`, 0.32)}
    ${iBox('#c9cdd2', 0.3, 0.05, 0, 14.6, 0.65, 1.8, { top: '#e2e5e8', fv: '#b8bcc2', fu: '#a4a8ae' })}${iOnV(0.65, '<path d="M.3 -1.77 H14.6" stroke="#fff" stroke-opacity=".55" stroke-width=".035"/>')}
    ${iOnF(1.8, `${[2.4, 3.4].map((u) => `<circle cx="${u}" cy=".35" r=".26" fill="#3a3a44" fill-opacity=".14"/><circle cx="${u}" cy=".35" r=".26" fill="none" stroke="#3a3a44" stroke-width=".06"/><circle cx="${u}" cy=".35" r=".11" fill="none" stroke="#3a3a44" stroke-width=".04"/><path d="M${(u - 0.3).toFixed(2)} .35 h.6 M${u} .05 v.6" stroke="#3a3a44" stroke-width=".045"/>`).join('')}<rect x="7.6" y=".12" width="1.6" height=".42" fill="#e8d8b8"/><path d="M7.6 .53 H9.19 V.12" fill="none" stroke="#c9b48a" stroke-width=".035"/><path d="M7.75 .24 h.9 M7.95 .35 h1.05 M7.7 .45 h.6" stroke="#d4bf94" stroke-width=".02"/>`)}
    ${iCyl(5.2, 0.35, 0.32, 1.8, 2.35, '#8a8f99', '#a8adb6')}${iCylSh(5.2, 0.35, 0.32, 1.8, 2.35, 0.16)}${(() => {   // 2026-11-11 (the user: finer): the pot's rim, its handles, a sheen down its side and the knob on its lid; the rice cooker's lid, handle, panel and lamp
      const f = (n) => n.toFixed(1), [x, y] = isoPt(5.2, 0.35, 2.35), rx = 0.32 * ISO.U * Math.SQRT2, [rcx, rcy] = isoPt(11, 0.35, 2.3), rr = 0.28 * ISO.U * Math.SQRT2;
      return `<path d="M${f(x - rx)} ${f(y + 2.4)} A${f(rx)} ${f(rx / 2)} 0 0 0 ${f(x + rx)} ${f(y + 2.4)}" fill="none" stroke="#6e737c" stroke-width="1"/><rect x="${f(x - rx - 3.4)}" y="${f(y + 3)}" width="4.4" height="2.4" rx="1.1" fill="#3a3a44"/><rect x="${f(x + rx - 1)}" y="${f(y + 3)}" width="4.4" height="2.4" rx="1.1" fill="#3a3a44"/><path d="M${f(x - rx * 0.6)} ${f(y + 6)} v8" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx * 0.62)}" ry="${f(rx * 0.31)}" fill="none" stroke="#8a8f99" stroke-width=".8"/><rect x="${f(x - 1)}" y="${f(y - 2)}" width="2" height="2" fill="#3a3a44"/><ellipse cx="${f(x)}" cy="${f(y - 2)}" rx="2.8" ry="1.3" fill="#3a3a44"/>`
        + iCyl(11, 0.35, 0.28, 1.8, 2.3, '#f2efe8', '#e2ddd2') + iCylSh(11, 0.35, 0.28, 1.8, 2.3, 0.1)
        + `<path d="M${f(rcx - rr)} ${f(rcy + 3.2)} A${f(rr)} ${f(rr / 2)} 0 0 0 ${f(rcx + rr)} ${f(rcy + 3.2)}" fill="none" stroke="#c9c2b4" stroke-width=".8"/><rect x="${f(rcx - 3.6)}" y="${f(rcy + 8.4)}" width="7.2" height="4" rx="1" fill="#9aa0a8"/><rect x="${f(rcx - 2.8)}" y="${f(rcy + 9.2)}" width="3.6" height="1.6" rx=".4" fill="#c8e0d0"/><circle cx="${f(rcx + 2)}" cy="${f(rcy + 10.4)}" r=".9" fill="#e8592e"/><path d="M${f(rcx - 4.6)} ${f(rcy + 0.4)} q${f(4.6)} -4.4 9.2 0" fill="none" stroke="#bdb8ac" stroke-width="1.6" stroke-linecap="round"/><circle cx="${f(rcx + 3.4)}" cy="${f(rcy - 1.4)}" r=".8" fill="#bdb8ac"/>`; })()}${iSteam(5.2, 0.35, 2.35, 0, 9)}
    ${iBox('#e6c23a', 0.5, 9.6, 0, 1.9, 11, 0.75)}${iBox('#d9b42e', 0.5, 9.6, 0.75, 1.9, 11, 1.5)}${[0, 0.75].map((h) => iOnV(11, `<rect x=".95" y="${(-h - 0.6).toFixed(2)}" width=".5" height=".14" rx=".07" fill="#2b1c12" fill-opacity=".35"/><path d="M.5 ${(-h - 0.71).toFixed(2)} H1.9" stroke="#fff" stroke-opacity=".32" stroke-width=".035"/><path d="M.5 ${(-h - 0.04).toFixed(2)} H1.9" stroke="#2b1c12" stroke-opacity=".16" stroke-width=".05"/><path d="M.7 ${(-h - 0.1).toFixed(2)} v-.36 M1.7 ${(-h - 0.1).toFixed(2)} v-.36" stroke="#2b1c12" stroke-opacity=".1" stroke-width=".05"/>`) + iOnL(`<rect x="-10.55" y="${(-h - 0.6).toFixed(2)}" width=".5" height=".14" rx=".07" fill="#2b1c12" fill-opacity=".35"/><path d="M-11 ${(-h - 0.71).toFixed(2)} H-9.6" stroke="#fff" stroke-opacity=".22" stroke-width=".035"/>`, 1.9)).join('')}${iOnF(1.5, '<path d="M.56 9.66 H1.84 V10.94 H.56 Z M.5 10.3 H1.9 M1.2 9.6 V11" fill="none" stroke="#a8862a" stroke-width=".06"/>')}
    <g data-fx="crates">${[[0.85, 9.95], [1.55, 9.95], [0.85, 10.65], [1.55, 10.65]].map(([u, v], i) => `<g class="clink" style="animation-delay:-${(i * 0.07).toFixed(2)}s">${iCyl(u, v, 0.12, 1.5, 1.72, '#6b3a2a', '#7a4632')}${iCyl(u, v, 0.075, 1.72, 1.85, '#6b3a2a', '#8a5a40')}${iCyl(u, v, 0.085, 1.85, 1.9, '#c9a03a', '#e3c46a')}${(() => { const [x, y] = isoPt(u, v, 1.72); return `<path d="M${(x - 2.6).toFixed(1)} ${(y + 1.4).toFixed(1)} v4" stroke="#fff" stroke-opacity=".3" stroke-width="1.1" stroke-linecap="round"/>`; })()}</g>`).join('')}</g>
    ${iCyl(21.1, 1.1, 0.36, 0, 0.8, '#a8604a', '#7a4434')}${iCylSh(21.1, 1.1, 0.36, 0, 0.8, 0.14)}${iCyl(21.1, 1.1, 0.385, 0.64, 0.8, '#b86e56', '#5e3a2a')}${iCylSh(21.1, 1.1, 0.385, 0.64, 0.8, 0.12)}${(() => { const [x, y] = isoPt(21.1, 1.1, 0.8);   // 2026-11-11 (the user: finer): its pot's lip and the soil, stems up into the leaves
      return `<path d="M${x.toFixed(1)} ${(y + 1).toFixed(1)} l-8 -16 M${x.toFixed(1)} ${(y + 1).toFixed(1)} l7 -20 M${x.toFixed(1)} ${(y + 1).toFixed(1)} l1 -30" stroke="#3f6a3a" stroke-width="1.6" stroke-linecap="round"/>` + bush(x, y, [[-10, -18, 12], [8, -22, 13], [0, -34, 12], [-14, -32, 10], [12, -38, 9]], '#5f9a4a'); })()}
  </svg>`;
  const props = isoProp([1.6, 14.4, 1.4, 2.6], iBox('#9a6538', 1.6, 1.4, 0, 14.4, 2.6, 1.95, { top: '#d8ad7f', fv: '#9a6538', fu: '#7a5030' }) + iOnV(2.6, Array.from({ length: 16 }, (_, i) => `<path d="M${(2.1 + i * 0.8).toFixed(1)} -.05 V-1.85" stroke="#7a5230" stroke-width=".05"/>`).join('') + '<path d="M1.6 -1.86 H14.4" stroke="#c58a54" stroke-width=".1"/>')
      + [4, 6.5, 9, 11.5].map((u, i) => iBowl(u, 2.2, 1.95, ['#e6a23c', '#c84a3a', '#d9b04a', '#7fae5a'][i])).join('') + [5.3, 10.3].map((u) => cruet(...isoPt(u, 2.1, 1.95))).join('')
      // 2026-11-11 (the user: finer): 招き猫 — calico patches, pink inner ears, shut smiling eyes, a ω mouth, whiskers and blush, a red collar with
      // its bell, the koban held in its left paw, the raised paw's pink pad, a faint outline against the counter (beckon: the paw, the bell, the head)
      + `<g data-fx="maneki"><g transform="translate(${cx.toFixed(1)} ${(cy - 18).toFixed(1)}) scale(.7)"><ellipse cx="0" cy="26" rx="14" ry="4" fill="#000" opacity=".15"/><path d="M-11 26 Q-13 6 0 4 Q13 6 11 26 Z" fill="#fff" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"/><path d="M11 26 Q13 6 0 4 Q9 9 7.4 26 Z" fill="#2b1c12" fill-opacity=".07"/><path d="M5.4 13 Q10.6 14 11.2 21 Q7 19.6 5.4 13 Z" fill="#e6a23c"/><path d="M-8.4 26 q2.2 -2.6 4.4 0 M4 26 q2.2 -2.6 4.4 0" fill="none" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".6"/>`
      + `<g class="mhead"><path d="M-8.4 -5 L-6.6 -13.8 L-1.8 -8.4 Z M8.4 -5 L6.6 -13.8 L1.8 -8.4 Z" fill="#fff" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7" stroke-linejoin="round"/><path d="M-6.9 -7.4 L-6.3 -11.6 L-3.8 -8.8 Z M6.9 -7.4 L6.3 -11.6 L3.8 -8.8 Z" fill="#f2a8b8"/><circle cy="0" r="10" fill="#fff" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"/><path d="M-9.7 -2.4 Q-9.2 -8.6 -3.2 -9.4 Q-4.4 -4.4 -9.7 -2.4 Z" fill="#e6a23c"/><path d="M3.2 -9.4 Q7.6 -8.8 8.9 -4.4 Q5 -5.8 3.2 -9.4 Z" fill="#3a2a20"/>`
      + `<path d="M-5.8 -.4 q1.6 -1.8 3.2 0 M2.6 -.4 q1.6 -1.8 3.2 0" fill="none" stroke="#333" stroke-width="1" stroke-linecap="round"/><ellipse cx="-6" cy="3" rx="1.7" ry="1" fill="#f2a8b8" opacity=".75"/><ellipse cx="6" cy="3" rx="1.7" ry="1" fill="#f2a8b8" opacity=".75"/><path d="M-.9 2 h1.8 l-.9 1 Z" fill="#e58fa8"/><path d="M-1.8 3.6 q.9 1 1.8 0 q.9 1 1.8 0" fill="none" stroke="#333" stroke-width=".55" stroke-linecap="round"/><path d="M-6.6 1.4 l-4.6 -.8 M-6.6 3 l-4.4 .8 M6.6 1.4 l4.6 -.8 M6.6 3 l4.4 .8" stroke="#2b1c12" stroke-opacity=".3" stroke-width=".4"/></g>`
      + `<g class="paw"><path d="M10.6 6 Q19.6 -6 14 -16" stroke="#2b1c12" stroke-opacity=".2" stroke-width="6.4" fill="none" stroke-linecap="round"/><path d="M10.6 6 Q19.6 -6 14 -16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="14.3" cy="-16.2" rx="1.5" ry="1.2" fill="#f2a8b8"/></g>`
      + `<path d="M-7.2 8.2 Q0 12.6 7.2 8.2" fill="none" stroke="#d0453c" stroke-width="2.2" stroke-linecap="round"/><g class="bell"><circle cy="12.2" r="2.3" fill="#e3c46a"/><path d="M-1.3 12.6 h2.6" stroke="#a8802a" stroke-width=".5"/><circle cy="13.4" r=".5" fill="#a8802a"/></g>`
      + `<ellipse cx="0" cy="19" rx="3.8" ry="4.6" fill="#e3c46a" stroke="#c49a3a" stroke-width=".5"/><path d="M-2.2 17.2 h4.4 M-2.6 19 h5.2 M-2.2 20.8 h4.4" stroke="#c49a3a" stroke-width=".45"/><ellipse cx="-4.4" cy="17.6" rx="2.8" ry="2.4" fill="#fff" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".5"/></g></g>`, 3.2)
    + [4, 6.5, 9, 11.5].map((u) => isoProp([u - 0.42, u + 0.42, 2.93, 3.77], iStool(u, 3.35, { foot: '#4a4a55', footTop: '#5a5a64', post: '#5a5a64', side: '#a8302a', top: '#d0453c' }), 1.05)).join('')
    + SHOKUDO_TABLES.flatMap(([u0, u1, v0]) => [u0 + 0.8, u1 - 0.8].map((u) => isoProp([u - 0.42, u + 0.42, v0 - 1.17, v0 - 0.33], iChair(u, v0 - 0.75, true), 2.1))).join('')
    + SHOKUDO_TABLES.map((t, k) => isoProp([t[0], t[1], t[2], t[3]], table(t, k * 1.3), 1.42)).join('');
  return `${land}${isoLay(props)}${indoorRest('shokudo')}`;
}
// 居酒屋とり吉 at 45°: the counter along the right wall with its grill (the master behind it), a cabinet of bottles on the wall
// behind him (2026-11-10, the user: the bottles and their shelves flat on the wall), stools before the counter, red lanterns,
// the chalkboard and the door on the left wall, sake barrels, a tatami 小上がり with its low table where people kneel
function izakayaHtml() {
  isoProps = [];
  const board = [['焼き鳥', '1本 120円'], ['えだまめ', '300円'], ['からあげ', '480円'], ['おにぎり', '200円'], ['ウーロン茶', '250円'], ['ビール', '500円']];
  // a sake barrel (2026-11-11, the user: finer): its staves, its far side in shade, its lid's boards inside the ring, its hoops of rope
  // each with a lighter strand, the 酒 on its front
  const taru = (u, v, h) => { const [x, y] = isoPt(u + 0.42, v + 0.42, h + 0.62), f = (n) => n.toFixed(1), [cx, yb] = isoPt(u, v, h), yt = isoPt(u, v, h + 1.2)[1], rx = 0.6 * ISO.U * Math.SQRT2, ry = rx / 2;
    const staves = [-0.78, -0.5, -0.2, 0.12, 0.42, 0.7].map((k) => { const d = ry * Math.sqrt(1 - k * k); return `M${f(cx + k * rx)} ${f(yt + d)} V${f(yb + d)}`; }).join(' ');
    return iCyl(u, v, 0.6, h, h + 1.2, '#efe6d0', '#e2d6bc') + `<path d="${staves}" stroke="#d9c9a4" stroke-width=".9"/>` + iCylSh(u, v, 0.6, h, h + 1.2, 0.12, 0.3) + `<path d="M${f(cx - rx * 0.66)} ${f(yt + ry * 0.9)} V${f(yb + ry * 0.5)}" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>`
      + iOnF(h + 1.2, `<circle cx="${u}" cy="${v}" r=".45" fill="none" stroke="#c9b48a" stroke-width=".05"/><path d="M${(u - 0.43).toFixed(2)} ${(v - 0.15).toFixed(2)} h.86 M${(u - 0.43).toFixed(2)} ${(v + 0.15).toFixed(2)} h.86" stroke="#cdbb92" stroke-width=".03"/>`)
      + (() => { const [x0, y0] = isoPt(u, v, h + 0.3), [, y1] = isoPt(u, v, h + 0.9); return `<path d="M${(x0 - rx).toFixed(1)} ${y0.toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${y0.toFixed(1)} M${(x0 - rx).toFixed(1)} ${y1.toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#8a6a46" stroke-width="2.4"/><path d="M${(x0 - rx).toFixed(1)} ${(y0 - 0.7).toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${(y0 - 0.7).toFixed(1)} M${(x0 - rx).toFixed(1)} ${(y1 - 0.7).toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${(y1 - 0.7).toFixed(1)}" fill="none" stroke="#b8946a" stroke-width=".7" stroke-dasharray="2.2 1.2"/>`; })() + `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="800" fill="#c8453a" ${SERIF}>酒</text>`; };
  // a sake flask (2026-11-11): its lip, a painted indigo band, a sheen down its left and its right in shade
  const tokkuri = (x, y) => { const f = (n) => n.toFixed(1); return `<path d="M${f(x - 4)} ${f(y - 1)} q-4 -8 1 -16 h6 q5 8 1 16 Z" fill="#f3ead6"/><path d="M${f(x + 3)} ${f(y - 17)} q5 8 1 16 h-2.6 q3.6 -8 -.2 -16 Z" fill="#2b1c12" fill-opacity=".1"/><path d="M${f(x - 5.4)} ${f(y - 7.4)} q5.4 2 10.8 0" fill="none" stroke="#2f4a6e" stroke-width="1" stroke-opacity=".75"/><path d="M${f(x - 3.4)} ${f(y - 11)} q-.8 3.4 .4 7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1" stroke-linecap="round"/><path d="M${f(x - 2.5)} ${f(y - 15)} h5" stroke="#2f4a6e" stroke-width="1.6"/><ellipse cx="${f(x)}" cy="${f(y - 17)}" rx="3" ry=".9" fill="#e2d6bc"/>`; };
  // the cabinet: its back on the wall, its sides, three shelves of bottles standing on them (each a body, a neck and a label), its top
  const cabinet = (() => {
    const u0 = 1.8, u1 = 14.2, d = 0.55, top = 6.05, cols = ['#2f5a3a', '#6b3a2a', '#e9e2d0', '#3a4a6e', '#8a6a2a'];
    let out = iOnV(0, `<rect x="${u0}" y="${-top}" width="${u1 - u0}" height="${(top - 2.7).toFixed(2)}" fill="#3a2418"/>`) + iBox('#4a2f20', u0 - 0.15, 0, 2.7, u0, d, top);
    [2.8, 3.95, 5.0].forEach((h, li) => {
      out += iBox('#6e4a30', u0, 0, h - 0.1, u1, d, h, { top: '#8a5e3c' });
      let hl = '', mk = '', sl = '';   // 2026-11-11: each bottle's sheen, the brush stroke and the red seal on its label, one path each for the shelf
      for (let i = 0; u0 + 0.45 + i * 0.8 < u1 - 0.25; i++) {
        const u = u0 + 0.45 + i * 0.8, c = cols[(i + li * 2) % 5], hb = [0.7, 0.62, 0.55][li] + (i % 3) * 0.07, [lx, ly] = isoPt(u + 0.08, d / 2 + 0.12, h + hb * 0.45), [bx, by] = isoPt(u, d / 2, h), bt = isoPt(u, d / 2, h + hb)[1];
        out += iCyl(u, d / 2, 0.15, h, h + hb, c, mixHex(c, '#ffffff', 0.18)) + iCyl(u, d / 2, 0.06, h + hb, h + hb + 0.26, c, mixHex(c, '#ffffff', 0.25)) + `<rect x="${(lx - 3.5).toFixed(1)}" y="${(ly - 4).toFixed(1)}" width="7" height="7" rx="1" fill="#f3e7cc" opacity=".92"/>`;
        hl += `M${(bx - 3.8).toFixed(1)} ${(bt + 4.4).toFixed(1)} V${(by + 1.6).toFixed(1)} `; mk += `M${(lx - 0.4).toFixed(1)} ${(ly - 2.8).toFixed(1)} v4.4 `; sl += `M${(lx + 1.8).toFixed(1)} ${(ly + 1.6).toFixed(1)} h.1 `;
      }
      out += `<path d="${hl}" stroke="#fff" stroke-opacity=".22" stroke-width="1.3" stroke-linecap="round"/><path d="${mk}" stroke="#3b2a1c" stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round"/><path d="${sl}" stroke="#c8453a" stroke-width="1.5" stroke-linecap="round"/>`;
    });
    return out + iBox('#4a2f20', u1, 0, 2.7, u1 + 0.15, d, top) + iBox('#5e3e24', u0 - 0.15, 0, top, u1 + 0.15, d, top + 0.14, { top: '#6e4a30' });
  })();
  const [gx, gy] = isoPt(7.7, 1.85, 2.25);
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#5c3e2b', seam: '#3a281c', wallL: '#6c4832', wallR: '#78523a', wainL: '#4a2f20', wainR: '#523424', batten: '#3a2418', trim: '#2e1e14', edgeU: '#3a281c', edgeV: '#46301f', capU: '#5a3e2c', capV: '#664632', top: '#4e3424' })}
    ${iOnF(0, '<rect x="0" y="0" width="15.6" height="1.6" fill="#4a3426"/>')}
    ${iOnV(0, '<rect x="16.6" y="-4.1" width="2.4" height="4.1" fill="#21160f"/>')}${frameR(16.6, 19, 4.1, '#3a2418')}${wallR('#2e1e14', 16.5, 19.1, 4.02, 4.1, 0.34)}${iOnV(0.3, `${[0, 1].map((k) => `<g class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s"><path d="M${16.65 + k * 1.17} -4.0 h1.12 v1.2 h-1.12 Z" fill="#2f3a5e"/><path d="M${16.65 + k * 1.17} -3.88 h1.12" stroke="#000" stroke-opacity=".2" stroke-width=".05"/><path d="M${16.65 + k * 1.17} -2.86 h1.12" stroke="#fff" stroke-opacity=".22" stroke-width=".04"/><circle cx="${16.65 + k * 1.17 + 0.56}" cy="-3.4" r=".2" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".05"/></g>`).join('')}`)}
    ${wallR('#c9a06a', 19.85, 21.55, 4.15, 6.45, 0.07)}${iOnV(0.07, `<rect x="19.95" y="-6.35" width="1.5" height="2.1" fill="#f3e7cc"/><circle cx="20.7" cy="-5.6" r=".46" fill="#f7d48a"/><path d="${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${(20.7 + 0.5 * Math.cos(a)).toFixed(2)} ${(-5.6 + 0.5 * Math.sin(a)).toFixed(2)} L${(20.7 + 0.64 * Math.cos(a)).toFixed(2)} ${(-5.6 + 0.64 * Math.sin(a)).toFixed(2)}`; }).join(' ')}" stroke="#f0b43c" stroke-width=".05" stroke-linecap="round"/><path d="M20.86 -5.64 h.1 q.07 0 .07 .07 v.2 q0 .07 -.07 .07 h-.1" fill="none" stroke="#e8d8b0" stroke-width=".06"/><rect x="20.46" y="-5.76" width=".42" height=".52" rx=".04" fill="#f0a830"/><path d="M20.53 -5.66 v.34" stroke="#fff" stroke-opacity=".5" stroke-width=".035" stroke-linecap="round"/><circle cx="20.72" cy="-5.42" r=".025" fill="#fff"/><circle cx="20.78" cy="-5.56" r=".02" fill="#fff"/><circle cx="20.66" cy="-5.32" r=".018" fill="#fff"/><path d="M20.43 -5.74 q.04 -.15 .15 -.09 q.07 -.13 .18 -.04 q.11 -.08 .14 .07 v.06 h-.47 Z" fill="#fff" stroke="#d9b880" stroke-width=".015"/><text x="20.7" y="-4.45" text-anchor="middle" font-size=".34" font-weight="800" fill="#c8453a" font-family="system-ui, sans-serif">ビール</text>`)}
    ${cabinet}
    ${wallL('#7a5230', 2.9, 8.7, 3.5, 6.5, 0.16)}${iOnL(`<rect x="-8.56" y="-6.36" width="5.52" height="2.72" fill="#2f3b33"/><text x="-5.8" y="-5.86" text-anchor="middle" font-size=".38" font-weight="700" fill="#f3e7cc" ${SERIF}>今日のおすすめ</text>
      ${board.map(([n, pr], i) => { const x = i % 2 ? -5.7 : -8.35, y = -5.3 + Math.floor(i / 2) * 0.48; return `<text x="${x}" y="${y.toFixed(2)}" font-size=".3" fill="#f3e7cc" font-family="system-ui, sans-serif">${n}</text><text x="${(x + 2.5).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size=".26" fill="#ffd27a" font-family="system-ui, sans-serif">${pr}</text>`; }).join('')}`, 0.16)}${wallL('#6e4a30', 3.1, 8.5, 3.36, 3.5, 0.3)}${(() => { const [x, y] = isoPt(0.24, 7.6, 3.5); return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="10" height="3" rx="1" fill="#f3e7cc"/>`; })()}
    ${iOnL('<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#1c2340"/><path d="M-13.4 -4.62 V0" stroke="#2e1e14" stroke-width=".08"/>', 0.03)}${frameL(12, 14.8, 4.62, '#2e1e14')}${wallL('#21160f', 11.9, 14.9, 4.5, 4.58, 0.36)}${iOnL(`${[0, 1, 2].map((k) => `<g class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.6}s"><path d="M${(-14.72 + k * 0.9).toFixed(2)} -4.5 h.86 v1.5 h-.86 Z" fill="#8a2f2a"/><path d="M${(-14.72 + k * 0.9).toFixed(2)} -4.38 h.86" stroke="#000" stroke-opacity=".2" stroke-width=".05"/><path d="M${(-14.72 + k * 0.9).toFixed(2)} -3.06 h.86" stroke="#fff" stroke-opacity=".2" stroke-width=".04"/></g>`).join('')}<text x="-13.4" y="-3.55" text-anchor="middle" font-size=".42" font-weight="700" fill="#fff" ${SERIF}>とり吉</text>`, 0.32)}
    ${iBox('#4a2f20', 0.3, 0.05, 0, 15, 0.6, 1.7, { top: '#6e4a30' })}${[2.6, 3.4, 9.6, 10.4, 13.2].map((u, i) => iCyl(u, 0.32, 0.14, 1.7, 2.35 - (i % 2) * 0.15, ['#e9e2d0', '#2f5a3a', '#e9e2d0', '#6b3a2a', '#3a4a6e'][i], '#3a2a20') + (() => { const [x, y] = isoPt(u, 0.32, 1.7), t = isoPt(u, 0.32, 2.35 - (i % 2) * 0.15)[1]; return `<rect x="${(x - 2.4).toFixed(1)}" y="${((y + t) / 2 - 1).toFixed(1)}" width="5" height="5" rx=".8" fill="${i % 2 ? '#f3e7cc' : '#c8453a'}" opacity=".85"/><path d="M${(x - 3.6).toFixed(1)} ${(t + 4).toFixed(1)} V${(y + 1.4).toFixed(1)}" stroke="#fff" stroke-opacity=".25" stroke-width="1.2" stroke-linecap="round"/>`; })()).join('')}
    ${taru(1.1, 9.4, 0)}${taru(1.1, 10.7, 0)}<g data-fx="taru">${taru(1.1, 10.05, 1.2)}</g>
    ${iBox('#6e4a30', 14.6, 7.4, 0, 22, 16, 0.6, { top: '#b9c288', fv: '#5e3e24', fu: '#4e3220' })}${iOnF(0.6, `<path d="${[[14.6, 18.3], [18.3, 22]].map(([a, b]) => Array.from({ length: 16 }, (_, i) => `M${(a + 0.16 + i * 0.22).toFixed(2)} 7.4 V16`).filter((p, i) => a + 0.16 + i * 0.22 < b - 0.1).join(' ')).join(' ')}" stroke="#a3ac74" stroke-width=".025" stroke-opacity=".75"/><path d="M14.66 7.4 V16 M18.22 7.4 V16 M18.38 7.4 V16 M21.94 7.4 V16" stroke="#3e4a2c" stroke-width=".07"/>
      <path d="M14.6 7.4 H22 V16 H14.6 Z M18.3 7.4 V16 M14.6 11.7 H22" fill="none" stroke="#56603a" stroke-width=".09"/><path d="M14.6 15.96 H21.96 V7.4" fill="none" stroke="#d4dca0" stroke-width=".04"/>${[[17.6, 9.3], [19.2, 9.3], [17.6, 13.2], [19.2, 13.2]].map(([u, v]) => `<rect x="${u - 0.45}" y="${v - 0.45}" width=".9" height=".9" rx=".14" fill="#5e3470"/>`).join('')}`)}${iOnF(0.66, [[17.6, 9.3], [19.2, 9.3], [17.6, 13.2], [19.2, 13.2]].map(([u, v]) => `<rect x="${(u - 0.45).toFixed(2)}" y="${(v - 0.45).toFixed(2)}" width=".9" height=".9" rx=".14" fill="#7a4a8a" stroke="#6a3a7a" stroke-width=".02"/><rect x="${(u - 0.35).toFixed(2)}" y="${(v - 0.35).toFixed(2)}" width=".7" height=".7" rx=".12" fill="#8a5a9a"/><path d="M${(u - 0.08).toFixed(2)} ${v} h.16 M${u} ${(v - 0.08).toFixed(2)} v.16" stroke="#e9d6a8" stroke-width=".05" stroke-linecap="round"/>`).join(''))}${iBox('#a8a49a', 13.8, 10.9, 0, 14.6, 11.9, 0.3, { top: '#bdb8ac' })}${iOnF(0.3, '<path d="M13.95 11.05 h.4 M14 11.45 h.25 M14.32 11.66 h.16 M14.4 11.15 h.1" stroke="#8e8a80" stroke-width=".04" stroke-linecap="round"/><path d="M13.8 11.88 H14.58 V10.9" fill="none" stroke="#d6d2c6" stroke-width=".04"/>')}
    <path d="M${iPt(3, 0.55, 7.15)} L${iPt(19.5, 0.55, 7.15)} M${iPt(0.55, 1.5, 7.15)} L${iPt(0.55, 11, 7.15)}" stroke="#2b2b33" stroke-width="1.4" fill="none"/>
    ${[3, 7, 11, 15, 19.5].map((u, k) => iLantern(u, 0.55, 7.15, k, '酒鳥吉酒鳥'[k])).join('')}${[1.6, 10.2].map((v, k) => iLantern(0.55, v, 7.15, k + 5, '吉酒'[k])).join('')}
  </svg>`;
  const props = isoProp([1.8, 15.2, 1.6, 2.8], iBox('#3a2418', 1.8, 1.6, 0, 15.2, 2.8, 1.95, { top: '#c58a54', fv: '#3a2418', fu: '#2e1c12' }) + iOnV(2.8, Array.from({ length: 17 }, (_, i) => `<path d="M${(2.2 + i * 0.8).toFixed(1)} -.05 V-1.85" stroke="#2a1810" stroke-width=".06"/>`).join(''))
      // 2026-11-11 (the user: finer): the grill's vents, its coals under the bars, each skewer two pieces of chicken with a piece of leek
      // between, glazed; looked at, it flares and the skewers sizzle (grill.flare)
      + '<g data-fx="grill">' + iBox('#2b2b33', 6, 1.65, 1.95, 9.4, 2.05, 2.15) + iOnV(2.05, [6.4, 7.2, 8.0, 8.8].map((u) => `<rect x="${u}" y="-2.09" width=".36" height=".07" rx=".035" fill="#000" fill-opacity=".4"/>`).join('') + '<path d="M6 -2.14 H9.4" stroke="#fff" stroke-opacity=".18" stroke-width=".03"/>')
      + iOnF(2.15, '<rect x="6.1" y="1.7" width="3.2" height=".3" fill="#e8592e"/><path d="M6.25 1.79 h.16 M6.6 1.91 h.2 M7.02 1.77 h.14 M7.4 1.89 h.22 M7.86 1.78 h.16 M8.22 1.92 h.18 M8.62 1.8 h.2 M9.02 1.9 h.14" stroke="#3a2418" stroke-width=".08" stroke-linecap="round" stroke-opacity=".5"/><rect x="6.1" y="1.7" width="3.2" height=".3" fill="#ffb24a" class="fx-blink" style="animation-duration:2.2s;opacity:.6"/><path d="M6.1 1.76 H9.3 M6.1 1.85 H9.3 M6.1 1.94 H9.3" stroke="#5a5a64" stroke-width=".022"/>')
      + [6.4, 6.9, 7.4, 7.9, 8.4, 8.9].map((u, i) => { const [x, y] = isoPt(u, 1.85, 2.15), at = (t) => [x - 4 + 8 * t, y + 1 - 10 * t];
        return `<g class="kushi" style="animation-delay:-${(i * 0.05).toFixed(2)}s"><path d="M${(x - 4).toFixed(1)} ${(y + 1).toFixed(1)} l8 -10" stroke="#c9a06a" stroke-width="2" stroke-linecap="round"/>${[[0.4, 2.5, '#a0502c'], [0.6, 2, '#e4e6c4'], [0.8, 2.5, '#a0502c']].map(([t, r, c]) => { const [px, py] = at(t); return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}" fill="${c}"/>`; }).join('')}${[0.4, 0.8].map((t) => { const [px, py] = at(t); return `<circle cx="${(px - 0.8).toFixed(1)}" cy="${(py - 0.9).toFixed(1)}" r=".8" fill="#fff" fill-opacity=".35"/><path d="M${(px - 0.6).toFixed(1)} ${(py + 1).toFixed(1)} l1.4 -.8" stroke="#5a2414" stroke-width=".6" stroke-opacity=".6"/>`; }).join('')}${(() => { const [px, py] = at(0.6); return `<path d="M${(px - 1.4).toFixed(1)} ${(py - 0.6).toFixed(1)} a2 2 0 0 1 2.4 -1.2" fill="none" stroke="#8fae5a" stroke-width=".8"/>`; })()}</g>`; }).join('') + '</g>'
      + [0, 1].map((k) => `<g transform="translate(${(gx - 12 + k * 22).toFixed(1)} ${(gy - 14).toFixed(1)})"><ellipse rx="11" ry="8" class="fx-steam" fill="#e8e2d4" style="animation-delay:-${k * 1.8}s"/></g>`).join('')
      + [[4.1, 2.4], [6.6, 2.45], [11.6, 2.4]].map(([u, v]) => { const [x, y] = isoPt(u, v, 1.95), f = (n) => n.toFixed(1);   // 2026-11-11: the glass's thick foot, its sheen, bubbles rising, a drip of foam
        return `<rect x="${f(x - 5)}" y="${f(y - 15)}" width="10" height="14" rx="1.5" fill="#f0b43c"/><path d="M${f(x + 3.2)} ${f(y - 14)} v11" stroke="#c87a1c" stroke-opacity=".35" stroke-width="2.2"/><rect x="${f(x - 5)}" y="${f(y - 3.4)}" width="10" height="2.4" rx="1" fill="#fff" fill-opacity=".35"/><path d="M${f(x - 3)} ${f(y - 12.6)} v8" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/><circle cx="${f(x + 0.6)}" cy="${f(y - 6)}" r=".6" fill="#fff" fill-opacity=".7"/><circle cx="${f(x + 1.8)}" cy="${f(y - 9)}" r=".45" fill="#fff" fill-opacity=".7"/><circle cx="${f(x - 0.4)}" cy="${f(y - 10.6)}" r=".4" fill="#fff" fill-opacity=".7"/>`
          + `<path d="M${f(x + 5)} ${f(y - 12)} h3 v7 h-3" fill="none" stroke="#e9e2d0" stroke-width="1.6"/><path d="M${f(x - 6)} ${f(y - 15)} q3 -4 6 -1 q3 -3 6 1 Z" fill="#fbf8f0"/><path d="M${f(x + 2.2)} ${f(y - 15.2)} q1 0 1 1.8 q0 1 -1 1 q-.9 0 -.9 -1 Z" fill="#fbf8f0"/><path d="M${f(x - 4.6)} ${f(y - 14.6)} h9.2" stroke="#e8d8b0" stroke-width=".7"/>`; }).join('')
      + iBowl(5.3, 2.25, 1.95, '#7fae5a') + tokkuri(...isoPt(12.8, 2.2, 1.95)), 2.4)
    + [4, 6.5, 9, 11.5, 14].map((u) => isoProp([u - 0.42, u + 0.42, 3.18, 4.02], iStool(u, 3.6, { foot: '#21160f', footTop: '#2e1e14', post: '#2e1e14', side: '#a8743f', top: '#c58a54', wood: true }), 1.05)).join('')
    + isoProp([17, 19.8, 10.1, 12.4], [[17.2, 10.3], [19.5, 10.3], [17.2, 12.1], [19.5, 12.1]].map(([u, v]) => iBox('#4a2f20', u, v, 0.6, u + 0.12, v + 0.12, 1.05)).join('') + iBox('#7a5232', 17, 10.1, 1.05, 19.8, 12.4, 1.17, { top: '#8f6040' }) + iOnF(1.17, '<path d="M17 12.37 H19.77 V10.1" fill="none" stroke="#b07a4c" stroke-width=".05"/><path d="M17.3 10.5 h.9 M18.5 10.8 h1 M17.4 11.9 h.7 M18.9 12 h.6" stroke="#6e4a2c" stroke-opacity=".5" stroke-width=".035"/>')
      + iBowl(17.9, 10.8, 1.17, '#7fae5a') + iCyl(18.6, 11.3, 0.3, 1.17, 1.5, '#5a5a64', '#3a3a44') + iCylSh(18.6, 11.3, 0.3, 1.17, 1.5, 0.16) + (() => { const f = (n) => n.toFixed(1), [x, y] = isoPt(18.6, 11.3, 1.5), rx = 0.3 * ISO.U * Math.SQRT2;
        return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx * 0.7)}" ry="${f(rx * 0.35)}" fill="#4a4a55"/><ellipse cx="${f(x - 2.4)}" cy="${f(y - 1)}" rx="3" ry="1" fill="#fff" fill-opacity=".18"/><path d="M${f(x - rx)} ${f(y + 2.2)} A${f(rx)} ${f(rx / 2)} 0 0 0 ${f(x + rx)} ${f(y + 2.2)}" fill="none" stroke="#2b2b33" stroke-width=".8"/><rect x="${f(x - rx - 2.6)}" y="${f(y + 3)}" width="3.4" height="2.2" rx="1" fill="#2b2b33"/><rect x="${f(x + rx - 0.8)}" y="${f(y + 3)}" width="3.4" height="2.2" rx="1" fill="#2b2b33"/><rect x="${f(x - 0.8)}" y="${f(y - 2.2)}" width="1.6" height="2.2" fill="#2b2b33"/><ellipse cx="${f(x)}" cy="${f(y - 2.2)}" rx="2.4" ry="1.1" fill="#2b2b33"/><path d="M${f(x - rx * 0.62)} ${f(y + 4.6)} v4" stroke="#fff" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/>`; })()
      + iSteam(18.6, 11.3, 1.5, 0.5, 8) + (() => { const [x, y] = isoPt(19.2, 10.9, 1.17), f = (n) => n.toFixed(1); return tokkuri(x, y) + `<path d="M${f(x + 6)} ${f(y - 5.6)} h6 l-.9 4.4 h-4.2 Z" fill="#f3ead6"/><path d="M${f(x + 10.4)} ${f(y - 5.4)} l-.7 3.8 h-1 l.8 -3.8 Z" fill="#2b1c12" fill-opacity=".1"/><ellipse cx="${f(x + 9)}" cy="${f(y - 5.6)}" rx="3" ry="1.1" fill="#e2d6bc"/><ellipse cx="${f(x + 9)}" cy="${f(y - 5.5)}" rx="1.4" ry=".5" fill="none" stroke="#2f4a6e" stroke-width=".5"/>`; })(), 1.6);
  return `${land}${isoLay(props)}${indoorRest('izakaya')}`;
}
// the bus stop (test, 2026-11-09) on the main road's far pavement (#/street) — a shelter with a bench, a timetable and the stop's
// round sign on a pole. Tapped: the hero walks over and sits on the bench, legs swinging (later the bus takes him to other
// places). Drawn like a yard ware (in the hero's units, its feet at BUS, smaller further up); its sign is apart, unscaled
const BUS = { X: 56, Y: 126, seat: 40 };   // seat: the bench's height
// the main road (#/street): the path from the yard comes down from the far fields to its far pavement, the bus stop beside it;
// the road across, a pavement this side, grass below. The same sky as the yard's
// a soft light that fades out (warm: lamps and doors; cool: a drinks machine), shown by night (.glow): one set for whichever
// place is drawn — a flat disc at low opacity read as a grey blot on the dark (2026-11-10)
// words down a sign, a character at a time (2026-11-10: writing-mode set them out of place on an iPhone): the first one's top
// centre at (x, y), fs apart; ー stood upright
const vText = (x, y, words, fs, more = '') => [...words].map((ch, i) => `<text x="${x}" y="${(y + fs * (i + 0.86)).toFixed(2)}" text-anchor="middle" font-size="${fs}" ${more}>${ch === 'ー' ? '｜' : ch}</text>`).join('');
// a house far off (2026-11-10): its wall, the roof with shade under the eaves, two windows in white frames with a cross bar
// (glass by day, lit by night, one later than the other), a door; ext: the wall on down behind what stands in front
const farHouse = (x, b, w, h, roof, wall = '#efe6d6', ext = 0) => {
  const ww = Math.max(7, w * 0.2), wh = Math.max(6, h * 0.3), wy = b - h * 0.72, dw = Math.max(6, w * 0.16), dh = Math.max(9, h * 0.44);
  const win = (wx, late) => `<rect x="${wx - 1.6}" y="${wy - 1.6}" width="${ww + 3.2}" height="${wh + 3.2}" ${hc('#fbf8f0', '#2a2c50')}/><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" ${hc('#b9d0da', '#1a1c3c')}/><rect class="lit" x="${wx}" y="${wy}" width="${ww}" height="${wh}"${late ? ' style="opacity:calc(.08 + .6 * (1 - var(--day)))"' : ''}/><path d="M${wx + ww / 2} ${wy} v${wh} M${wx} ${wy + wh / 2} h${ww}" ${hs('#fbf8f0', '#2a2c50')} stroke-width="1.2"/>`;
  return `<rect x="${x}" y="${b - h}" width="${w}" height="${h + ext}" ${hc(wall, '#1e2042')}/><rect x="${x}" y="${b - h}" width="${w}" height="4" fill="#000" fill-opacity=".08"/>
    <path d="M${x - 6} ${b - h + 2} L${x + w / 2} ${b - h - w * 0.32} L${x + w + 6} ${b - h + 2} Z" ${hc(roof, '#15163a')}/><path d="M${x - 6} ${b - h + 2} H${x + w + 6}" stroke="#000" stroke-opacity=".14" stroke-width="2"/>
    ${win(x + w * 0.1, false)}${win(x + w * 0.9 - ww, true)}<rect x="${x + w / 2 - dw / 2}" y="${b - dh}" width="${dw}" height="${dh}" ${hc('#8a6a52', '#2a2440')}/>`;
};
// a thing on a place's ground the hero can walk behind (2026-11-10): a layer of its own over the land, in front of whoever stands
// further back than its foot (Y px up), as the yard's wares are; room: drawn in a room's frame (shokudo, izakaya)
const landProp = (Y, art, room, box) => (box ? `${propSvg(box.map(Math.round), 300 - Math.round(Y))}${art}</svg>` : `<svg class="land prop ${room ? 'indoor-land' : 'tall'}" viewBox="${room ? '0 -530 1200 900' : '0 -400 1200 770'}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style="z-index:${300 - Math.round(Y)}${room ? ';height:900px' : ''}">${art}</svg>`);   // box: its size (propSvg)
// a park bench with a back: its seat from x, w long, at y; legs down to y + 24 (foot: Y px up there). Two layers: its back further
// back than its seat, so someone sitting on it (a spot's sit) shows between them and the hero behind it goes behind both
// a park bench (2026-11-11, the user: finer): iron ends, wooden slats lit along the top and shaded below, a grain line or two,
// the bolts where they meet the iron
const benchSlat = (x, y, w, h, c, n) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.6" ${hc(c, n)}/><path d="M${x + 2} ${y + 0.8} H${x + w - 2}" stroke="#fff" stroke-width=".9" style="stroke-opacity:calc(.04 + .24 * var(--day, 1))"/><path d="M${x + 1.5} ${y + h - 0.6} H${x + w - 1.5}" stroke="#2b1c12" stroke-opacity=".16" stroke-width="1"/><path d="M${x + w * 0.18} ${y + h * 0.5} h${w * 0.16} M${x + w * 0.55} ${y + h * 0.45} h${w * 0.22}" ${hs('#9a6436', '#2c2236')} stroke-width=".7" stroke-opacity=".7"/>`;
const benchBack = (x, y, w = 90) => `<path d="M${x + 6} ${y} V${y - 23} M${x + w - 6} ${y} V${y - 23}" ${hs('#4c4f56', '#1e1f3c')} stroke-width="3.6"/><circle cx="${x + 6}" cy="${y - 24}" r="2.2" ${hc('#4c4f56', '#1e1f3c')}/><circle cx="${x + w - 6}" cy="${y - 24}" r="2.2" ${hc('#4c4f56', '#1e1f3c')}/>${benchSlat(x + 2, y - 22, w - 4, 6, '#c58a54', '#3a2c40')}${benchSlat(x + 2, y - 13, w - 4, 6, '#b67c48', '#33283c')}${[y - 19, y - 10].map((by) => `<circle cx="${x + 6}" cy="${by}" r=".9" ${hc('#2e3036', '#14152c')}/><circle cx="${x + w - 6}" cy="${by}" r=".9" ${hc('#2e3036', '#14152c')}/>`).join('')}`;
const benchSeat = (x, y, w = 90) => `${groundShade(x + w / 2, y + 24, w * 0.55)}${[x + 11, x + w - 11].map((lx) => `<path d="M${lx} ${y + 4} V${y + 23}" ${hs('#4c4f56', '#1e1f3c')} stroke-width="4"/><rect x="${lx - 5}" y="${y + 22}" width="10" height="2.6" rx="1.2" ${hc('#3c3f46', '#18192e')}/>`).join('')}${benchSlat(x, y, w, 4.4, '#cf9660', '#3e3044')}${benchSlat(x + 1, y + 4.4, w - 2, 4, '#b67c48', '#33283c')}<circle cx="${x + 11}" cy="${y + 6.4}" r=".9" ${hc('#2e3036', '#14152c')}/><circle cx="${x + w - 11}" cy="${y + 6.4}" r=".9" ${hc('#2e3036', '#14152c')}/>`;
const benchProps = (x, y, foot, w = 90, more = '') => { const box = [x - w * 0.1 - 2, y - 30, x + w * 1.1 + 2, y + 30]; return landProp(foot + 11, benchBack(x, y, w), null, box) + landProp(foot, benchSeat(x, y, w) + more, null, box); };
// a clock's hands at the scenes' hour (body's --hh, --mm, as 書房's clock): round (x, y), r long
const clockHands = (x, y, r, ink = '#3b2a1c') => `<path d="M${x} ${y} v${-r * 0.55}" stroke="${ink}" stroke-width="${Math.max(2, r * 0.16)}" stroke-linecap="round" style="transform-box:view-box;transform-origin:${x}px ${y}px;transform:rotate(var(--hh, 0deg))"/><path d="M${x} ${y + r * 0.18} v${-r * 0.98}" stroke="${ink}" stroke-width="${Math.max(1.4, r * 0.1)}" stroke-linecap="round" style="transform-box:view-box;transform-origin:${x}px ${y}px;transform:rotate(var(--mm, 0deg))"/><circle cx="${x}" cy="${y}" r="${Math.max(1.5, r * 0.1)}" fill="${ink}"/>`;
// by night (round 3, 2026-11-10): lamplight on the ground under a lamp, a street lamp on its post (its head at y − h), the moon's
// glitter on the sea in a column of shimmering strokes (from y0 down to y1), a soft shadow under a thing by day
const lightPool = (x, y, rx, ry = rx * 0.28) => `<ellipse class="glow" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#glw)"/>`;
const streetLamp = (x, y, h = 120) => `${lightPool(x, y + 4, 90)}<rect x="${x - 2.5}" y="${y - h}" width="5" height="${h}" ${hc('#5a5a64', '#1c1d3c')}/><rect x="${x - 2.5}" y="${y - h}" width="1.4" height="${h}" fill="#fff" fill-opacity=".14"/><path d="M${x - 6} ${y} L${x - 4.5} ${y - 14} H${x + 4.5} L${x + 6} ${y} Z" ${hc('#4a4a55', '#1c1d3c')}/><rect x="${x - 4}" y="${y - h * 0.55}" width="8" height="3" rx="1" ${hc('#4a4a55', '#1c1d3c')}/><path d="M${x} ${y - h} q0 -10 12 -10 h8" fill="none" ${hs('#5a5a64', '#1c1d3c')} stroke-width="4"/><path d="M${x + 12} ${y - h - 12} h18 l-3 7 h-12 Z" ${hc('#4a4a55', '#1c1d3c')}/><path d="M${x + 13} ${y - h - 11.4} h16" stroke="#fff" stroke-opacity=".18" stroke-width="1"/><path d="M${x + 14.6} ${y - h - 5} h12.8" ${hs('#3a3a44', '#14152c')} stroke-width="1.2"/><ellipse cx="${x + 21}" cy="${y - h - 4}" rx="6" ry="2.6" ${hc('#e8e4d8', '#fff0b8')}/><path class="glow" d="M${x + 15} ${y - h - 4} L${x - 30} ${y} H${x + 72} L${x + 27} ${y - h - 4} Z" fill="url(#glw)" style="opacity:calc((1 - var(--day)) * .35)"/>`;
const moonGlitter = (x, y0, y1) => `<g class="glow">${Array.from({ length: 9 }, (_, k) => { const t = k / 8, y = y0 + (y1 - y0) * t, w = 8 + 34 * t; return `<path class="fx-blink" style="animation-delay:-${(k * 0.37).toFixed(2)}s;animation-duration:${(1.6 + (k % 3) * 0.5).toFixed(1)}s" d="M${x - w / 2 + (k % 2) * 6} ${y.toFixed(1)} h${w}" stroke="#fff6d8" stroke-width="${1.6 + t}" stroke-linecap="round"/>`; }).join('')}</g>`;
const groundShade = (x, y, rx, ry = 4) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#2b1c12" style="opacity:calc(.12 * var(--day))"/>`;
// a pigeon (2026-11-11, the user: finer): grey with two dark bars on the wing, the green-and-purple sheen of its neck, an orange
// eye, the white over its beak, pink feet, the dark band across its tail
const pigeonArt = (x, y, k) => `<g class="fx-peck" style="animation-delay:-${k * 0.6}s"><g transform="translate(${x} ${y})"><ellipse cy="7.4" rx="9" ry="1.4" fill="#2b1c12" fill-opacity=".12"/><path d="M-1 4.6 V7.2 M2.4 4.6 V7.2" ${hs('#d98a8a', '#4a3a50')} stroke-width="1.1"/>
  <path d="M-7.5 -1 L-16 -4.4 L-15.4 .4 L-7.5 3 Z" ${hc('#6f7590', '#262946')}/><path d="M-13.6 -3.4 L-15.9 -4.3 L-15.5 .3 L-13.3 .9 Z" ${hc('#464b62', '#1c1e38')}/>
  <path d="M-9 1 C-9 -5 -3 -8 3 -7 C8 -6 11 -2 9 3 C7 6 -5 7 -9 1 Z" ${hc('#9097ad', '#2c2f52')}/><path d="M-8 -.6 C-5 -5.4 2.6 -5.8 6 -2 C2.6 .4 -3.4 1.2 -8 -.6 Z" ${hc('#a8aec2', '#34375c')}/><path d="M-3.6 -2.8 l3 -.5 M-1.2 -1.5 l3 -.5" ${hs('#454a60', '#1c1e38')} stroke-width="1"/>
  <path d="M4.6 -5.6 C6.4 -8.6 8.6 -10 10.4 -9 L11.2 -4.4 C9.2 -3.2 6.8 -3.2 4.6 -4.4 Z" ${hc('#7fa89a', '#2c3a52')}/><path d="M6.6 -4 C8 -4.6 9.6 -4.8 11 -4.6 L10.8 -5.8 C9.4 -6 7.8 -5.4 6.6 -4 Z" ${hc('#a07ab0', '#3a3456')} fill-opacity=".8"/>
  <circle cx="9.4" cy="-9" r="3.6" ${hc('#7d839b', '#2c2f52')}/><circle cx="10.5" cy="-9.6" r="1" ${hc('#e89a4a', '#5a4a3a')}/><circle cx="10.6" cy="-9.6" r=".45" fill="#1e1e28"/>
  <path d="M12.4 -9.4 l3.3 1.1 l-3.3 .8 Z" ${hc('#56586a', '#24243e')}/><ellipse cx="12.9" cy="-9.5" rx=".9" ry=".6" ${hc('#f2efe6', '#5a5e80')}/></g></g>`;
const GLOW_DEFS = `<defs><radialGradient id="glw"><stop offset="0" stop-color="#ffd98a" stop-opacity=".7"/><stop offset=".55" stop-color="#ffc870" stop-opacity=".22"/><stop offset="1" stop-color="#ffc870" stop-opacity="0"/></radialGradient>
  <radialGradient id="glc"><stop offset="0" stop-color="#e6f2ff" stop-opacity=".7"/><stop offset=".55" stop-color="#cfe2ff" stop-opacity=".2"/><stop offset="1" stop-color="#cfe2ff" stop-opacity="0"/></radialGradient></defs>`;
// for the street, harbour and town's finer things (2026-11-11): a number to one place, and a crescent along a round thing's
// edge (a shade or a light on it) from angle a0 to a1 (degrees, y down), k: how thin (the inner edge's radius × r)
const rd1 = (v) => +v.toFixed(1);
const leafD = (cx, cy, rx, ry, deg) => { const c = rx * Math.cos(deg * Math.PI / 180), s = rx * Math.sin(deg * Math.PI / 180); return `M${rd1(cx - c)} ${rd1(cy - s)} a${rd1(rx)} ${rd1(ry)} ${deg} 1 0 ${rd1(2 * c)} ${rd1(2 * s)} a${rd1(rx)} ${rd1(ry)} ${deg} 1 0 ${rd1(-2 * c)} ${rd1(-2 * s)}`; };   // a little leaf (an ellipse turned deg) as a path
const crescentD = (cx, cy, r, a0, a1, k = 1.3) => { const a = (d) => `${rd1(cx + r * Math.cos(d * Math.PI / 180))} ${rd1(cy + r * Math.sin(d * Math.PI / 180))}`; return `M${a(a0)} A${rd1(r)} ${rd1(r)} 0 0 1 ${a(a1)} A${rd1(r * k)} ${rd1(r * k)} 0 0 0 ${a(a0)} Z`; };
// a sparrow perched, facing right, body at (x, y), pecking now and then (the main road's wires, the town's roof; 2026-11-11, the
// user: finer): a brown cap, a white cheek, a streaked wing, a pale belly, an eye and a beak
const sparrowArt = (x, y, k) => `<g class="fx-peck" style="animation-delay:-${k * 0.7}s"><path d="M${x - 4} ${y - 0.4} l-5.6 2.2 l1.4 -2.8 Z" ${hc('#5a4030', '#14152e')}/><ellipse cx="${x}" cy="${y}" rx="5" ry="4" ${hc('#8a6a4a', '#1a1b36')}/>
  <path d="M${x - 3.4} ${y + 1.6} Q${x} ${y + 4.4} ${x + 3.6} ${y + 1.4} Q${x} ${y + 2.6} ${x - 3.4} ${y + 1.6} Z" ${hc('#e2d4bc', '#24254a')}/><path d="M${x - 4.4} ${y - 1} Q${x - 1} ${y - 4.2} ${x + 2.6} ${y - 1.4} Q${x - 1} ${y + 1.8} ${x - 4.4} ${y - 1} Z" ${hc('#5a3e28', '#14152e')}/><path d="M${x - 2.8} ${y - 0.8} l2.4 -0.9 M${x - 1.6} ${y + 0.2} l2.4 -0.9" fill="none" stroke="#f4ead8" stroke-opacity=".6" stroke-width=".6"/>
  <circle cx="${x + 4}" cy="${y - 3}" r="2.6" ${hc('#7a5236', '#1a1b36')}/><ellipse cx="${x + 4.3}" cy="${y - 2.1}" rx="1.6" ry="1.1" ${hc('#f4ece0', '#2a2c50')}/><circle cx="${x + 4.9}" cy="${y - 3.7}" r=".55" fill="#1a1410"/><path d="M${x + 6.4} ${y - 3.3} l1.8 .5 l-1.8 .6 Z" ${hc('#3a2c24', '#14152e')}/></g>`;
function streetHtml() {
  const y = (Y) => 370 - Y, [w0, w1] = STREET.walk, [r0, r1] = STREET.road, [n0, n1] = STREET.near, ground = 'M0 164 C220 150 420 146 600 148 C800 150 1000 146 1200 158';
  // 2026-11-11 (the user: finer): each of the crown's three clumps shaded on its lower right and caught by the light on its
  // upper left, a few leaves glinting there, two branches up into it, the trunk's shaded side, a soft shadow at its foot
  const tree = (x, b, r) => { const C = [[x, b - r * 2.4, r], [x - r * 0.75, b - r * 1.75, r * 0.68], [x + r * 0.8, b - r * 1.8, r * 0.72]];
    return `${groundShade(x, b, r * 0.9, r * 0.18)}<path d="M${x} ${rd1(b - r * 1.2)} l${rd1(-r * 0.42)} ${rd1(-r * 0.55)} M${x} ${rd1(b - r * 1.45)} l${rd1(r * 0.4)} ${rd1(-r * 0.5)}" ${hs('#6b4a2f', '#0b0c22')} stroke-width="${rd1(r * 0.13)}"/>
      <rect class="trunk" x="${x - r * 0.18}" y="${b - r * 2.1}" width="${r * 0.36}" height="${r * 2.1}"/><rect x="${x}" y="${b - r * 2.1}" width="${rd1(r * 0.18)}" height="${r * 2.1}" fill="#2b1c12" fill-opacity=".2"/>
      <g class="crown">${C.map(([cx, cy, cr]) => `<circle cx="${cx}" cy="${cy}" r="${cr}"/>`).join('')}</g><path d="${C.map(([cx, cy, cr]) => crescentD(cx, cy, cr, -25, 150)).join(' ')}" fill="#1e3214" fill-opacity=".17"/>
      <g fill="#fff" style="opacity:calc(.04 + .12 * var(--day, 1))"><path d="${C.map(([cx, cy, cr]) => crescentD(cx, cy, cr * 0.92, 165, 285, 1.12)).join(' ')}"/><path d="${C.flatMap(([cx, cy, cr]) => [[-0.3, -0.5, 30], [-0.55, -0.15, -20], [0.05, -0.62, 60]].map(([dx, dy, a]) => leafD(cx + dx * cr, cy + dy * cr, cr * 0.11, cr * 0.06, a))).join(' ')}"/></g>`; };
  // 2026-11-10: the village up the hill, the poles and their wires over the road (sparrows on them), a drinks machine lit by
  // night, a red postbox, a crossing, and now and then a little truck along the near lane
  const house = (x, b, w, h, roof, wall) => farHouse(x, b, w, h, roof, wall);
  // the cyclist (2026-11-11, the user: finer): a town bike — step-through frame, mudguards, a chain guard, a wicker basket, spokes
  // that turn — and its rider sitting on the saddle, knees bent down to the pedals, a hand on the bar, an ear, an eye, a blush
  const spokes = (cx) => `<circle cx="${cx}" cy="-9" r="8.6" fill="none" ${hs('#3a3a44', '#2a2c50')} stroke-width="2.2"/><g class="fx-hubspin"><circle cx="${cx}" cy="-9" r="6.6" fill="none" ${hs('#b4b8c0', '#4a4c78')} stroke-width=".8"/><path d="M${cx} -15.4 v12.8 M${cx - 6.4} -9 h12.8 M${cx - 4.5} -13.5 l9 9 M${cx - 4.5} -4.5 l9 -9" ${hs('#b4b8c0', '#4a4c78')} stroke-width=".5"/></g><circle cx="${cx}" cy="-9" r="1.3" ${hc('#6a6e78', '#2a2c50')}/>`;
  const cyclist = `<g class="fx-car" style="animation-duration:31s;animation-delay:-12s"><g transform="translate(0 ${y(n0 + 8)})">
      <path d="M-6.4 -25 L-1.6 -17.2 L-4.6 -6" fill="none" ${hs('#26405e', '#202246')} stroke-width="3.4"/><path d="M-6.8 -5.8 h4.6" ${hs('#2b2b33', '#16172e')} stroke-width="2.4"/>
      ${spokes(-14)}${spokes(14)}<path d="M-24.4 -10.8 A10.6 10.6 0 0 1 -8.7 -18.2 M7.2 -17.1 A10.6 10.6 0 0 1 24.4 -10.8" fill="none" ${hs('#c9ccd2', '#4a4c78')} stroke-width="1.6"/>
      <path d="M-1 -8 L-6 -23.4 M10 -21 Q2 -10 -1 -8 L-14 -9 L-5.4 -20 M9.4 -24.4 L10.6 -19 L14 -9" fill="none" ${hs('#6f9fb0', '#3a3d66')} stroke-width="2"/>
      <path d="M-15 -10.8 H-2.4 Q1.6 -10.8 1.6 -8 Q1.6 -5.2 -2.4 -5.2 H-15 Z" ${hc('#c9ccd2', '#4a4c78')}/><path d="M-1 -8 L2.4 -10.6 M-1 -8 L-4.6 -5.4" ${hs('#6a6e78', '#2a2c50')} stroke-width="1.2"/>
      <path d="M-11 -24.2 q4.4 -2 8.8 0 l-1.2 1.8 h-6.4 Z" ${hc('#6e4f3a', '#2c2440')}/>
      <path d="M-10.6 -25 Q-11.6 -36.4 -7 -44.4 Q-1.6 -47.6 2.8 -44.4 Q4 -36 .8 -25 Z" ${hc('#e86f5e', '#4a2c48')}/><path d="M-10.4 -26.4 Q-4.8 -24.4 .8 -26.4 M-7.4 -43.6 Q-9.4 -36 -8.6 -27.6" fill="none" stroke="#2b1c12" stroke-opacity=".14" stroke-width="1.2"/>
      <path d="M-6 -24.6 L3.6 -21.6 L2.4 -10.8" fill="none" ${hs('#2f4a6e', '#2a2c50')} stroke-width="3.6"/><path d="M.4 -10.2 h4.8" ${hs('#2b2b33', '#16172e')} stroke-width="2.4"/>
      <path d="M9.4 -24.4 L8.8 -30 Q7.4 -32 4 -31.4" fill="none" ${hs('#4a4a55', '#2a2c50')} stroke-width="1.6"/>
      <rect x="9.6" y="-31.2" width="9.6" height="7.4" rx="1.4" ${hc('#c58a54', '#3a2c40')}/><path d="M10.6 -28.6 h7.6 M10.6 -26.2 h7.6 M12.8 -30.8 v6.6 M16 -30.8 v6.6" stroke="#7a4a24" stroke-opacity=".45" stroke-width=".6"/><path d="M9.4 -31.2 h10" ${hs('#a8743f', '#2c2440')} stroke-width="1.4"/>
      <path d="M.4 -42.6 L4.6 -37.2" ${hs('#e86f5e', '#4a2c48')} stroke-width="3.4"/><path d="M4.6 -37.2 L5.6 -31.2" ${hs('#f8dcc8', '#6a5a6a')} stroke-width="2.6"/><circle cx="5.6" cy="-30.8" r="1.6" ${hc('#f8dcc8', '#6a5a6a')}/>
      <rect x="-1.2" y="-48.6" width="3.2" height="4.4" ${hc('#efcdb6', '#5e4e60')}/><circle cx=".8" cy="-53.6" r="7" ${hc('#f8dcc8', '#6a5a6a')}/>
      <path d="M-6.2 -52 Q-7 -61.4 .8 -61.6 Q7.4 -61.6 8 -55.4 Q4.8 -58.2 1.2 -57.2 Q-.6 -54 -2.4 -50.6 Q-5.2 -49.6 -6.2 -52 Z" ${hc('#3b2f2a', '#1a1828')}/><path d="M-3.4 -59 q2.6 -1.4 5.4 -1" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1" stroke-linecap="round"/>
      <ellipse cx=".2" cy="-52.6" rx="1.3" ry="1.7" ${hc('#efc4aa', '#5e4e60')}/><ellipse cx="4.6" cy="-54.4" rx=".8" ry="1.1" ${hc('#2b2420', '#14121e')}/><ellipse cx="4.8" cy="-51.2" rx="1.5" ry=".8" fill="#f0a0a0" style="opacity:calc(.15 + .35 * var(--day, 1))"/><path d="M4.2 -49.8 q.7 .5 1.4 0" fill="none" ${hs('#8a5a4a', '#3a2c40')} stroke-width=".7"/>
    </g></g>`;
  const POLES = [160, 520, 880], WY = [-82, -66, -50], sag = (t, s) => 2 * t * (1 - t) * s;
  const pole = (x) => `<rect x="${x - 5}" y="-100" width="10" height="${w1 > 0 ? 336 : 0}" ${hc('#8d8a84', '#24254a')}/><rect x="${x - 30}" y="-86" width="60" height="5" rx="1" ${hc('#6f6c66', '#1c1d3e')}/><rect x="${x - 24}" y="-70" width="48" height="4" rx="1" ${hc('#6f6c66', '#1c1d3e')}/>${[-24, -8, 8, 24].map((d) => `<rect x="${x + d - 2}" y="-92" width="4" height="7" rx="1.5" ${hc('#e8e4d8', '#4a4c78')}/>`).join('')}<rect x="${x - 8}" y="-30" width="16" height="22" rx="2" ${hc('#a8a49a', '#2a2c50')}/>`;
  const spans = [-200].concat(POLES, [1240]);
  const wires = WY.map((wy, k) => spans.slice(0, -1).map((x0, i) => { const x1 = spans[i + 1]; return `<path class="wire" d="M${x0} ${wy} Q${(x0 + x1) / 2} ${wy + 2 * (26 + k * 4)} ${x1} ${wy}"/>`; }).join('')).join('');
  const sparrow = (x0, x1, t, wy, s, k) => sparrowArt(x0 + (x1 - x0) * t, wy + sag(t, 2 * s) - 4, k);
  // the drinks machine (2026-11-11, the user: finer): a brand band, cans and bottles on three lit shelves with a button under
  // each, a price window, a coin plate, a take-out tray behind a smoked flap. Bought from: a button blinks, a can drops into
  // the tray and the flap swings (no more squashing the whole machine)
  const vend = (x) => { const cans = [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => [x + 7 + c * 9, 169 + r * 11, ['#d0574b', '#3f7ac8', '#e6a23c', '#4f7a4a'][(r + c) % 4], (r + c * 2) % 3 === 1]));
    return `<rect x="${x}" y="160" width="46" height="76" rx="3" ${hc('#e9edf0', '#3a4470')}/><path d="M${x} 166 V163 Q${x} 160 ${x + 3} 160 H${x + 43} Q${x + 46} 160 ${x + 46} 163 V166 Z" ${hc('#d0574b', '#5a2c48')}/><path d="M${x + 15} 163.2 q2.5 -1.6 5 0 t5 0 t5 0" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1" stroke-linecap="round"/>
      <rect x="${x + 41.6}" y="166" width="3.4" height="66" rx="1" fill="#2b1c12" fill-opacity=".08"/><rect x="${x + 1.2}" y="167" width="1.4" height="64" rx=".7" fill="#fff" fill-opacity=".4"/><path d="M${x} 231 H${x + 46} V233 Q${x + 46} 236 ${x + 43} 236 H${x + 3} Q${x} 236 ${x} 233 Z" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="${x + 4}" y="166" width="38" height="34" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${cans.map(([cx, cy, c, pet]) => pet ? `<path d="M${cx + 1} ${cy + 8} v-4.6 l1.2 -1.8 v-1.6 h1.6 v1.6 l1.2 1.8 v4.6 Z" fill="${c}"/><rect x="${cx + 2.2}" y="${cy - 0.6}" width="1.6" height="1.4" rx=".4" fill="#f4f3ee"/>` : `<rect x="${cx}" y="${cy + 1.4}" width="6" height="6.6" rx="1.3" fill="${c}"/><path d="M${cx + 0.8} ${cy + 1.6} h4.4" stroke="#d8dde2" stroke-width="1"/>`).join('')}
      <path d="${cans.map(([cx, cy, , pet]) => `M${cx + (pet ? 1.9 : 1.4)} ${cy + 4} v3`).join(' ')}" stroke="#fff" stroke-opacity=".5" stroke-width=".9" stroke-linecap="round"/>
      <path d="M${x + 5} 177.7 h36 M${x + 5} 188.7 h36" ${hs('#9fb4bc', '#b8c8e8')} stroke-width=".8"/><path d="${cans.map(([cx, cy]) => `M${cx + 1.8} ${cy + 9.6} h2.4`).join(' ')}" ${hs('#8a98a0', '#c9d8f0')} stroke-width="1.1"/><path class="vpick" d="M${x + 17.8} 189.6 h2.4" stroke="#f2c94c" stroke-width="1.6" stroke-linecap="round" opacity="0"/>
      <rect x="${x + 6}" y="204" width="20" height="6" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><path d="M${x + 9} 207 h7 M${x + 18} 207 h4" stroke="#7ad07a" stroke-opacity=".9" stroke-width="1.2"/>
      <rect x="${x + 30}" y="203" width="10" height="13" rx="1.2" ${hc('#c9ced3', '#4a5276')}/><path d="M${x + 35} 205.4 v4.2" ${hs('#2b2b33', '#141530')} stroke-width="1.2"/><circle cx="${x + 35}" cy="212.6" r="1.3" ${hc('#8a8f99', '#2a2c50')}/>
      <rect x="${x + 8}" y="216" width="30" height="14" rx="3" ${hc('#d5dadf', '#2e3660')}/><rect x="${x + 10}" y="218" width="26" height="10" rx="2" ${hc('#2b2b33', '#141530')}/>
      <g class="vcan" opacity="0"><rect x="${x + 16}" y="221.6" width="10" height="5.6" rx="1.6" fill="#d0574b"/><path d="M${x + 17.6} 222.8 h6.8" stroke="#fff" stroke-opacity=".5" stroke-width=".9" stroke-linecap="round"/></g>
      <rect x="${x + 10}" y="218" width="26" height="6.4" rx="1.6" ${hcx('vflap', '#6a707c', '#2a2c50')} fill-opacity=".72"/><path d="M${x + 12} 219.4 h22" stroke="#fff" stroke-opacity=".22" stroke-width=".9"/>
      <ellipse class="glow" cx="${x + 23}" cy="196" rx="70" ry="56" fill="url(#glc)"/>`; };
  // the postbox (2026-11-11, the user: finer): a domed cap, the slot under its lip, 〒 and the collection plate, light down its
  // left side, a collar and a foot on its post. Posted into: a letter slides in under the lifting lip
  const post = (x) => `<rect x="${x - 3}" y="206" width="6" height="30" ${hc('#5a5a64', '#1c1d3c')}/><rect x="${x}" y="208" width="3" height="28" fill="#2b1c12" fill-opacity=".2"/><rect x="${x - 4.5}" y="207" width="9" height="3" rx="1" ${hc('#4a4a55', '#16172e')}/><rect x="${x - 6}" y="233.6" width="12" height="2.4" rx="1" ${hc('#4a4a55', '#16172e')}/>
      <rect x="${x - 13}" y="176" width="26" height="34" rx="6" ${hc('#d0453c', '#5a2030')}/><path d="M${x - 13} 183 V182 Q${x - 13} 176 ${x - 7} 176 H${x + 7} Q${x + 13} 176 ${x + 13} 182 V183 Z" ${hc('#b8372f', '#4a1a28')}/><path d="M${x - 8} 179 q8 -2.4 16 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M${x + 8.5} 184 H${x + 13} V204 Q${x + 13} 210 ${x + 7} 210 H${x + 8.5} Z" fill="#2b1c12" fill-opacity=".12"/><rect x="${x - 11.2}" y="186" width="1.8" height="20" rx=".9" fill="#fff" fill-opacity=".24"/>
      <rect x="${x - 8}" y="185.8" width="16" height="3.2" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><path d="M${x - 5} 192.4 h10 M${x - 5} 195.6 h10 M${x} 195.6 v5.4" ${hs('#fff', '#c9c4e8')} stroke-width="1.5"/>
      <rect x="${x - 6.5}" y="203" width="13" height="4.6" rx=".8" ${hc('#fbf7ec', '#3a3b62')}/><path d="M${x - 4.5} 204.6 h9 M${x - 4.5} 206.1 h6" stroke="#9a978e" stroke-opacity=".8" stroke-width=".6"/>
      <g class="pletter" opacity="0"><rect x="${x - 5}" y="178" width="10" height="6.6" rx=".6" fill="#fbf8f0"/><path d="M${x - 5} 178.4 l5 3.4 l5 -3.4" fill="none" stroke="#c9b48a" stroke-width=".7"/></g>
      <rect x="${x - 9}" y="184.2" width="18" height="2.2" rx="1" ${hcx('plip', '#e0675a', '#6a2838')}/>`;
  // the little truck (2026-11-11, the user: finer): its bed's gate in panels under a rail, a tail lamp, wheel arches and hubs
  // that turn, the cab's door, handle and mirror, a pillar in its window, a bumper and a rimmed headlamp, a shadow under it
  const hub = (cx) => `<circle cx="${cx}" cy="-4" r="8" fill="#2b2b33"/><g class="fx-hubspin"><circle cx="${cx}" cy="-4" r="4.2" ${hc('#c9ccd2', '#5a5e80')}/><path d="M${cx} -6.8 v1.2 M${cx} -2.4 v1.2 M${cx - 2.8} -4 h1.2 M${cx + 1.6} -4 h1.2" stroke="#6a6e78" stroke-width="1" stroke-linecap="round"/></g><circle cx="${cx}" cy="-4" r="1.3" fill="#4a4e58"/>`;
  const truck = `<g class="fx-car"><g transform="translate(0 ${y((r0 + r1) / 2 - 22)})"><ellipse cx="-3" cy="3.4" rx="56" ry="2.6" fill="#000" fill-opacity=".16"/>
      <path d="M-56 -4 V-26 H6 V-4 Z" ${hc('#ecebe6', '#4a4c72')}/><path d="M-56 -25.6 H6" ${hs('#c9c8c0', '#3a3c62')} stroke-width="1.8"/><path d="M-36 -24 V-6 M-16 -24 V-6 M-55 -13 H5" stroke="#2b1c12" stroke-opacity=".1" stroke-width="1"/><rect x="-57.6" y="-17" width="2.8" height="6" rx="1" fill="#d0453c"/>
      <path d="M6 -4 V-34 Q6 -40 12 -40 H30 Q38 -40 42 -30 L50 -16 V-4 Z" ${hc('#f4f3ee', '#555880')}/><path d="M14 -36 H28 Q33 -36 36 -30 L40 -22 H14 Z" ${hc('#9fc6d6', '#ffe2a0')}/><path d="M25 -36 V-22" ${hs('#f4f3ee', '#555880')} stroke-width="1.6"/><path d="M16.4 -33 l5 -1.4" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M10 -21 V-5 M41.4 -21 V-15" stroke="#2b1c12" stroke-opacity=".16" stroke-width="1"/><path d="M14 -18 h5" ${hs('#8a8f99', '#2a2c50')} stroke-width="1.4"/><path d="M41 -28.4 l4.4 -1.4 v4.6 l-4.4 -.8 Z" ${hc('#4a4a55', '#1c1d3c')}/>
      <rect x="44" y="-9.4" width="7.4" height="4.4" rx="1.4" ${hc('#9a9ea8', '#3a3d66')}/><path d="M-54 -4 H48 V-1.4 H-54 Z" ${hc('#4a4a55', '#1c1d3c')}/><path d="M-47 -4 a11 11 0 0 1 22 0 Z M23 -4 a11 11 0 0 1 22 0 Z" fill="#2b2b33" fill-opacity=".85"/>
      ${hub(-36)}${hub(34)}<path class="glow" d="M50 -14 L200 -40 L200 22 Z" fill="url(#trBeam)"/><circle cx="49" cy="-14" r="3.8" ${hc('#9a9ea8', '#3a3d66')}/><circle cx="49" cy="-14" r="3" fill="#ffd98a"/></g></g>`;
  return `<svg class="land tall street-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <defs><linearGradient id="trBeam"><stop offset="0" stop-color="#fff2c0" stop-opacity=".55"/><stop offset="1" stop-color="#fff2c0" stop-opacity="0"/></linearGradient></defs>
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${house(110, 126, 54, 34, '#8a5a44', '#efe4d2')}${house(300, 118, 46, 30, '#5f6f8a', '#ece6da')}${house(660, 116, 60, 36, '#8a5a44', '#f1e8d8')}${house(840, 124, 44, 28, '#6f5a7a', '#ede4d6')}${house(1040, 112, 58, 34, '#5f6f8a', '#efe6d4')}
      <path class="near" d="${ground} V370 H0 Z"/><path class="ridge" d="${ground}"/>
      ${tree(250, 214, 15)}${tree(430, 206, 12)}${tree(500, 216, 9)}${tree(760, 196, 13)}${tree(980, 218, 16)}${tree(1110, 196, 10)}
      <path class="lane" d="${stripD(STREET_LANE, 18)}"/>
      ${wires}${POLES.map(pole).join('')}
      ${sparrow(160, 520, 0.32, WY[0], 26, 0)}${sparrow(160, 520, 0.4, WY[0], 26, 1)}${sparrow(520, 880, 0.62, WY[1], 30, 2)}${sparrow(880, 1240, 0.3, WY[2], 34, 3)}
      <g class="fx-fly"><g transform="translate(0 -250)"><path  d="M0 0 q8 -8 16 0 q8 -8 16 0" ${hsx('fx-wing', '#4a4a55', '#5a5e90')} stroke-width="2.4"/></g><g transform="translate(40 -230) scale(.8)"><path  d="M0 0 q8 -8 16 0 q8 -8 16 0" ${hsx('fx-wing', '#4a4a55', '#5a5e90', `animation-delay:-.2s`)} stroke-width="2.4"/></g></g>
      <rect class="pave" x="-20" y="${y(w1)}" width="1240" height="${w1 - w0}"/><rect class="kerb" x="-20" y="${y(w0) - 3}" width="1240" height="4"/>
      <g data-fx="vend">${vend(390)}</g><g data-fx="post">${post(760)}</g>
      <path d="M500 236 V160" ${hs('#e8913a', '#4a3a2a')} stroke-width="4"/><path d="M499.2 168 V233" stroke="#fff" stroke-opacity=".3" stroke-width="1"/><rect x="495" y="233.4" width="10" height="2.6" rx="1" ${hc('#5a5a64', '#1c1d3c')}/><rect x="496.6" y="165.6" width="6.8" height="4.2" rx="1" ${hc('#5a5a64', '#1c1d3c')}/>
      <g data-fx="cmirror"><circle cx="500" cy="152" r="14" ${hc('#e8913a', '#4a3a2a')}/><path d="M487.2 147 A13.6 13.6 0 0 1 512.8 147" fill="none" ${hs('#c46f22', '#3a2a20')} stroke-width="2.6"/><circle cx="500" cy="152" r="11.2" ${hc('#c46f22', '#3a2a20')}/><circle cx="500" cy="152" r="10.5" ${hc('#cfe3ea', '#2a3060')}/>
        <path d="M489.55 153 A10.5 10.5 0 0 0 510.45 153 Z" ${hc('#86a07a', '#1c2a34')}/><path d="M490.1 155.5 A10.5 10.5 0 0 0 509.9 155.5 Z" ${hc('#8d8f94', '#22244a')}/><path d="M492.4 158.4 q7.6 1.6 15.2 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8" stroke-dasharray="3 2.4"/>
        <path d="M493 148 q7 -6 14 2" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/><circle cx="505.6" cy="146.4" r="1" fill="#fff" fill-opacity=".8"/><path class="mshine" d="M498 154 l4 -4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0"/></g>
      ${streetLamp(250, 236, 130)}${streetLamp(1000, 236, 130)}
      <rect class="asphalt" x="-20" y="${y(r1)}" width="1240" height="${r1 - r0}"/>
      <path class="rline" d="M-20 ${y(r1) + 6} H1220 M-20 ${y(r0) - 6} H1220"/><path class="rline dash" d="M-20 ${y((r0 + r1) / 2)} H1220"/>
      <text x="850" y="${y((r0 + r1) / 2) - 8}" text-anchor="middle" font-size="20" font-weight="800" fill="#f4f2ec" fill-opacity=".85" font-family="system-ui, sans-serif" transform="translate(850 ${y((r0 + r1) / 2) - 8}) scale(1 .6) translate(-850 ${-(y((r0 + r1) / 2) - 8)})">止まれ</text>
      ${[[830, 276.6], [846.6, 273], [859, 278.4], [872.4, 275.2]].map(([sx, sy]) => `<ellipse class="asphalt" cx="${sx}" cy="${sy}" rx="1.6" ry=".7" opacity=".7"/>`).join('')}
      ${Array.from({ length: 6 }, (_, i) => { const w = 84 + i * 1.2, h = 4 + i * 0.3, bx = 975 - w / 2, by = y(r1) + 10 + i * 10; return `<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx=".6" ${hc('#f4f2ec', '#3a3d66')}/><path d="M${bx + 2} ${by + h - 0.5} h${w - 4}" stroke="#2b1c12" stroke-opacity=".08" stroke-width="1"/>${[[18, 2.4], [52, 1.6], [70, 2], [33, 1.4]].slice(i % 3, i % 3 + 1 + (i % 2)).map(([d, r]) => `<ellipse class="asphalt" cx="${bx + d + i * 3}" cy="${rd1(by + h * 0.6)}" rx="${r}" ry="${rd1(h * 0.22)}" opacity=".32"/>`).join('')}`; }).join('')}
      ${truck}${cyclist}
      <rect class="kerb" x="-20" y="${y(n1)}" width="1240" height="4"/><rect class="pave" x="-20" y="${y(n1) + 4}" width="1240" height="${n1 - n0 - 4}"/>
    </svg>
    ${yHeroHtml()}
    ${busStopHtml()}
    ${TOWNEV.castHtml('street')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="yard" aria-label="回家" style="margin-left:${Math.round(STREET_LANE.at(0)[0]) - 32}px;bottom:${STREET_LANE.Y0 - 30}px"><span class="tag">${ySign('today', '回家')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="harbor" aria-label="往漁港" style="margin-left:${-YARD_HALF + 40}px;bottom:58px"><span class="tag">${ySign('wave', '往漁港')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="park" aria-label="往公園" style="margin-left:${YARD_HALF - 72}px;bottom:58px"><span class="tag">${ySign('spark', '往公園')}</span></button>
    <div class="ysel"></div>`;
}
// between the places out of doors (test, 2026-11-09): the yard's path down to the main road, the yard's left edge along to the
// beach. The hero walks to the way out (out), fades, and the other place opens with him coming in (in: where he appears, where
// he walks to; yh.arrive)
const PLACE_ROUTE = { yard: '#/outside', street: '#/street', beach: '#/beach', town: '#/town', harbor: '#/harbor', park: '#/park', shokudo: '#/shokudo', izakaya: '#/izakaya', station: '#/station', sento: '#/sento', shrine: '#/shrine', castle: '#/castle' };
// where a place's sight stands, for the camera to look at on the way in (2026-11-10: 白鷺城 was off the screen of a phone)
const PLACE_LOOK = { castle: 280, shokudo: 130 };
// a sight too big for a phone's screen, seen whole (yWide): [x0, x1, top] in the land's units — 白鷺城's keeps, their walls to the shachihoko
const PLACE_WIDE = { castle: [470, 1180, -274] };
const OUT_PLACES = Object.keys(PLACE_ROUTE).filter((p) => p !== 'yard');   // the places out and about besides the yard, each its own route
const WAYS = {
  'yard>street': { out: () => [LANE.at(1)[0], 4], in: () => [[STREET_LANE.at(0)[0], 214], [STREET_LANE.at(1)[0] + 8, 126]] },
  'street>yard': { out: () => [STREET_LANE.at(0)[0], 222], in: () => [[LANE.at(1)[0], 12], [-11, 56]] },
  // the yard's to the beach and the town go off towards where they are seen far below (YARD_GATE; 2026-11-10, the user)
  'yard>beach': { out: () => YARD_GATE.beach, in: () => [[YARD_HALF, 62], [YARD_HALF - 90, 62]] },
  'beach>yard': { out: () => [YARD_HALF, 62], in: () => [YARD_GATE.beach, [-360, 120]] },
  'yard>town': { out: () => YARD_GATE.town, in: () => [[-YARD_HALF, 64], [-YARD_HALF + 90, 64]] },
  'town>yard': { out: () => [-YARD_HALF, 64], in: () => [YARD_GATE.town, [360, 120]] },
  // through a shop's door in town (its door: TOWN_SHOPS, x + w − 28 − 600) into the room, in by its door on the left
  'town>shokudo': { out: () => [-36, 130], in: () => [isoXY(...ISO.door), isoXY(...ISO.in)] },   // in by the room's door, on its left wall
  'shokudo>town': { out: () => isoXY(...ISO.door), in: () => [[-36, 130], [-36, 98]] },
  'town>izakaya': { out: () => [402, 130], in: () => [isoXY(...ISO.door), isoXY(...ISO.in)] },
  'izakaya>town': { out: () => isoXY(...ISO.door), in: () => [[402, 130], [402, 98]] },
  // 2026-11-10, the map joined up: along the edges in a row (the near pavement or the shore), down to the viewer and in by a path
  // from the back between the rows (the beach down to the harbor, the town down to the park)
  'street>harbor': { out: () => [-YARD_HALF, 40], in: () => [[YARD_HALF, 40], [YARD_HALF - 90, 40]] },
  'harbor>street': { out: () => [YARD_HALF, 40], in: () => [[-YARD_HALF, 40], [-YARD_HALF + 90, 40]] },
  'street>park': { out: () => [YARD_HALF, 40], in: () => [[-YARD_HALF, 40], [-YARD_HALF + 90, 40]] },
  'park>street': { out: () => [-YARD_HALF, 40], in: () => [[YARD_HALF, 40], [YARD_HALF - 90, 40]] },
  'beach>harbor': { out: () => [-420, 4], in: () => [[HARBOR_PATH, 214], [HARBOR_PATH + 20, 104]] },
  'harbor>beach': { out: () => [HARBOR_PATH, 222], in: () => [[-420, 6], [-400, 50]] },
  'town>park': { out: () => [180, 4], in: () => [[PARK_PATH, 214], [PARK_PATH - 20, 104]] },
  'park>town': { out: () => [PARK_PATH, 222], in: () => [[180, 6], [180, 50]] }
};
const HARBOR_PATH = -380, PARK_PATH = 360;
const YARD_GATE = { beach: [-470, 204], town: [480, 214] };   // the yard's edge towards the beach and the town seen far below (X, Y): their signs stand there
function yGo(el, to) {
  yNamed(el);
  const yard = el.closest('.yard'), h = yard && yard.querySelector('.yhero'), way = WAYS[`${yPlace}>${to}`]; if (!way) return;
  const leave = () => { yh.arrive = { from: yPlace, to }; go(PLACE_ROUTE[to]); };
  if (!h || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { leave(); return; }
  if (yPlace === 'yard' && YARD_FAR[to]) { h.classList.add('fading'); yHeroWalk(yard, yToward([yh.X, yh.Y], way.out(), 110), () => yFar(yard, to, false, leave), true); return; }   // a few steps toward the edge, fading, then the long way down
  yHeroWalk(yard, way.out(), () => { h.classList.add('out'); setTimeout(leave, 260); }, true);
}
// the yard's ways down to the beach and the town (2026-11-10, the user: as far as they are, on the road, like the climb to
// 古道具屋): over the lawn to its edge, out of sight down the hill, then small on the zigzag path seen far below and all the way
// along it (outlined, behind the yard's things); home the other way, then in over the lawn. YARD_FAR: those paths in the yard's
// land, from the hill's foot to their far end. A tap on the way: there at once (yh.far)
// a point at most `most` px from `from` on the way to `to` (2026-11-10, the user: he crossed the whole lawn to its edge first and
// looked to go twice — now a few steps that way, fading out, before the far path; home the same the other way)
const yToward = (from, to, most) => { const dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy), k = d > most ? most / d : 1; return [from[0] + dx * k, from[1] + dy * k]; };
const YARD_FAR = { beach: [[74, 214], [40, 202], [118, 190], [64, 178], [150, 168], [120, 158]], town: [[1128, 216], [1166, 200], [1084, 188], [1146, 174], [1066, 164], [1100, 152]] };
function yFar(yard, side, home, done) {
  const h = yard.querySelector('.yhero'); if (!h) { done(); return; }
  const pts = (home ? YARD_FAR[side].slice().reverse() : YARD_FAR[side]).map(([x, y]) => [x - 600, 370 - y]), s = 0.1, seg = []; let len = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([pts[i - 1], pts[i], len, d]); len += d; }
  const v = len / 2;   // the whole way in two seconds (2026-11-10, the user: it was nearly four)
  let fin = false;
  const end = () => { if (fin) return; fin = true; cancelAnimationFrame(yh.raf); yh.far = null; h.classList.add('out'); setTimeout(() => { yh.climb = null; yh.s = 0; yClimbLook(h, 0); h.classList.remove('climb', 'run'); done(); }, 220); };
  yh.far = end; h.classList.add('out'); h.classList.remove('run');   // out of sight over the edge
  setTimeout(() => {
    if (!yard.isConnected || fin) return;
    yh.climb = 'hill'; yh.s = s; [yh.X, yh.Y] = pts[0]; yClimbLook(h, s); h.classList.add('climb', 'run'); yHeroPlace(yard); h.classList.remove('out', 'fading');
    const t0 = performance.now();
    const step = (now) => {
      if (!yard.isConnected || fin) return;
      const d = Math.min(len, (now - t0) / 1000 * v), q = seg.find((x) => d <= x[2] + x[3]) || seg[seg.length - 1], f = (d - q[2]) / q[3], dx = q[1][0] - q[0][0], dy = q[1][1] - q[0][1];
      yh.X = q[0][0] + dx * f; yh.Y = q[0][1] + dy * f; yh.back = dy > 0; if (Math.abs(dx) > 0.5) yh.flip = dx < 0; yh.turn = Math.abs(dx) > 0.5 * Math.abs(dy); yHeroPlace(yard);
      if (d < len) { yh.raf = requestAnimationFrame(step); return; }
      end();
    };
    yh.raf = requestAnimationFrame(step);
  }, 220);
}
const BUS_BOX = [-170, -268, 340, 278];
const SHELTER_ART = () => `<ellipse cy="2" rx="150" ry="9" fill="#2b1c12" fill-opacity=".14"/>
  <path d="M-160 8 L156 8 L146 -10 L-150 -10 Z" ${hc('#c9c4b8', '#3a3c5e')}/><path d="M-160 8 H156 V14 H-160 Z" ${hc('#a9a497', '#2c2e4c')}/>
  <rect x="-118" y="-196" width="8" height="190" rx="2" ${hc('#5f7f6a', '#272c4a')}/><rect x="110" y="-196" width="8" height="190" rx="2" ${hc('#5f7f6a', '#272c4a')}/>
  <rect x="-108" y="-178" width="216" height="128" rx="4" ${hc('#cfe6ec', '#2c3560')} fill-opacity=".72"/><path d="M-96 -166 L-60 -70 M-70 -170 L-40 -96" ${hs('#ffffff', '#5a66a8')} stroke-width="5" stroke-opacity=".5"/>
  <rect x="-108" y="-56" width="216" height="6" ${hc('#5f7f6a', '#272c4a')}/>
  <path d="M-136 -192 Q0 -226 136 -192 L136 -184 Q0 -214 -136 -184 Z" ${hc('#d9604c', '#5a2c40')}/><path d="M-136 -186 Q0 -216 136 -186 L134 -176 Q0 -204 -134 -176 Z" ${hc('#b8483a', '#45223a')}/>
  <defs><radialGradient id="bsg"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs><ellipse cy="-90" rx="150" ry="120" fill="url(#bsg)" style="opacity:calc(1 - var(--day, 1))"/><rect x="-56" y="-184" width="112" height="5" rx="2.5" ${hc('#e8e4d8', '#ffe2a0')}/>
  ${[-70, 70].map((lx) => `<path d="M${lx} -38 V-2" ${hs('#4c4f56', '#1e1f3c')} stroke-width="6"/><rect x="${lx - 8}" y="-3" width="16" height="3.4" rx="1.5" ${hc('#3c3f46', '#18192e')}/>`).join('')}
  ${benchSlat(-84, -45, 168, 5.4, '#cf9660', '#4a3a4c')}${benchSlat(-83, -39.6, 166, 4.6, '#a8703e', '#3a2c40')}
  <rect x="-102" y="-150" width="42" height="56" rx="3" ${hc('#fbf7ec', '#e8dcb4')}/><path d="M-96 -140 H-66 M-96 -130 H-72 M-96 -121 H-68 M-96 -112 H-74 M-96 -103 H-70" ${hs('#9a9184', '#4a4e78')} stroke-width="2.4"/>
  <rect x="146" y="-232" width="6" height="232" rx="2" ${hc('#8d9097', '#3a3c58')}/>
  <circle cx="149" cy="-236" r="26" ${hc('#ffffff', '#9da2c8')}/><circle cx="149" cy="-236" r="26" fill="none" ${hs('#2f7a5a', '#2a4a5a')} stroke-width="5"/>
  <rect x="136" y="-250" width="26" height="20" rx="5" ${hc('#2f7a5a', '#2a4a5a')}/><rect x="140" y="-246" width="18" height="7" rx="1.5" ${hc('#ffffff', '#9da2c8')}/><circle cx="142" cy="-229" r="3" ${hc('#2f7a5a', '#2a4a5a')}/><circle cx="156" cy="-229" r="3" ${hc('#2f7a5a', '#2a4a5a')}/>
  <rect x="128" y="-204" width="42" height="18" rx="3" ${hc('#2f7a5a', '#2a4a5a')}/><text x="149" y="-190.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" fill-opacity=".92" font-family="system-ui, sans-serif">バス停</text>`;
function busStopHtml() {
  const [x0, y0, w, h] = BUS_BOX, k = yScale(BUS.Y);
  return `<div class="busstop" aria-hidden="true" style="width:${w}px;height:${h}px;margin-left:${x0}px;bottom:${-(y0 + h)}px;transform-origin:${-x0}px ${-y0}px;transform:translate(${BUS.X}px,${-BUS.Y}px) scale(${k.toFixed(3)});z-index:${300 - BUS.Y}"><svg viewBox="${BUS_BOX.join(' ')}">${SHELTER_ART()}</svg></div>
    <button type="button" class="thing bus-btn" data-act="bus-stop" aria-label="公車站" style="margin-left:${Math.round(BUS.X - 130 * k)}px;bottom:${BUS.Y}px;width:${Math.round(290 * k)}px;height:${Math.round(240 * k)}px"><span class="tag">${ySign('bus', '公車站')}</span></button>`;
}
// 稲荷神社 (test, 2026-11-09), up the bus line on the hill: a red torii, a stone path with lanterns, two stone foxes, the hall
// with its rope and bell, the ema board and the omikuji box. From 18 to 22 its 緣日: a row of stalls under paper lanterns — 金魚すくい,
// やきそば, わたあめ — and the people in yukata (TOWNEV.look)
function shrineHtml() {
  const F = 236, fest = TOWNEV.festival();
  // 2026-11-10: a grove of tall cedars, a tunnel of red torii up the hill, the great torii in front, the sacred tree with its rope,
  // the hall's sweeping copper roof, its bell and rope, foxes in red bibs, leaves drifting down; by night at the 緣日 the lanterns
  // sway over the stalls and fireworks open over the trees
  const cedar = (x, base, h, w, near) => `<g ${hc(near ? '#3f6a48' : '#6f8f6a', near ? '#0c1428' : '#141c34')}>${[0, 1, 2, 3].map((k) => `<path d="M${x} ${base - h + k * h * 0.18} L${x - w * (0.45 + k * 0.18)} ${base - h * 0.42 + k * h * 0.12} H${x + w * (0.45 + k * 0.18)} Z"/>`).join('')}</g><rect class="trunk" x="${x - w * 0.08}" y="${base - h * 0.2}" width="${w * 0.16}" height="${h * 0.2}"/>`;
  const smallTorii = (t) => { const x = 330 + 130 * t, b = F - 6 - 112 * t, k = 1 - 0.68 * t, w = 56 * k, h = 66 * k;
    return `<path d="M${x - w / 2} ${b} V${b - h} M${x + w / 2} ${b} V${b - h}" ${hs('#d0453c', '#5a2030')} stroke-width="${Math.max(2, 6 * k)}"/><path d="M${x - w / 2 - 8 * k} ${b - h - 2 * k} Q${x} ${b - h - 8 * k} ${x + w / 2 + 8 * k} ${b - h - 2 * k}" ${hs('#2b2b33', '#141428')} stroke-width="${Math.max(2, 6 * k)}"/><path d="M${x - w / 2} ${b - h + 10 * k} H${x + w / 2}" ${hs('#d0453c', '#5a2030')} stroke-width="${Math.max(1.5, 4 * k)}"/>`; };
  // 2026-11-11 (the user: finer): the stone lantern on a stepped base, its post tapering up to a ring, the platform, the fire box
  // with its lit window and bars, the roof's eaves curling up at the corners and the jewel on top; shaded on the right
  const stone = ['#a9a497', '#2c2e4c'], stoneL = ['#b4ad9e', '#34365a'], stoneH = ['#c9c4b8', '#3a3c5e'], shade = 'fill="#2b1c12" fill-opacity=".1"';
  const lantern = (x) => `${lightPool(x, F + 4, 50)}<path d="M${x - 13} ${F} v-5 h26 v5 Z M${x - 9} ${F - 5} v-4 h18 v4 Z" ${hc(...stone)}/>
    <path d="M${x - 5} ${F - 9} L${x - 4} ${F - 50} H${x + 4} L${x + 5} ${F - 9} Z" ${hc(...stoneL)}/><rect x="${x - 6.5}" y="${F - 33}" width="13" height="3" rx="1" ${hc(...stone)}/><path d="M${x - 9} ${F - 50} h18 l3 -4 h-24 Z" ${hc(...stone)}/>
    <rect x="${x - 11}" y="${F - 68}" width="22" height="14" rx="1" ${hc(...stoneH)}/><path d="M${x} ${F - 9} V${F - 50} H${x + 4} L${x + 5} ${F - 9} Z M${x} ${F - 54} V${F - 68} H${x + 11} V${F - 54} Z M${x + 9} ${F - 5} h4 v5 h-4 Z" ${shade}/>
    <rect x="${x - 7}" y="${F - 66}" width="14" height="10" ${hc('#efe6d6', '#ffd98a')}/><path d="M${x} ${F - 66} v10 M${x - 7} ${F - 61} h14" ${hs('#a9a497', '#b08a4a')} stroke-width="1.1"/><path d="M${x - 7} ${F - 66} h14 v2 h-14 Z" ${shade}/>
    <path d="M${x - 17} ${F - 68} Q${x - 12} ${F - 69} ${x - 10} ${F - 73} L${x} ${F - 81} L${x + 10} ${F - 73} Q${x + 12} ${F - 69} ${x + 17} ${F - 68} Z" ${hc(...stone)}/><path d="M${x} ${F - 81} L${x + 10} ${F - 73} Q${x + 12} ${F - 69} ${x + 17} ${F - 68} H${x} Z" ${shade}/>
    <path d="M${x - 15} ${F - 68.6} Q${x - 11} ${F - 69.6} ${x - 9.4} ${F - 72.6}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/><path d="M${x - 2} ${F - 81} h4 v-1.6 h-4 Z" ${hc(...stone)}/><circle cx="${x}" cy="${F - 84.6}" r="2.6" ${hc(...stoneL)}/>
    <circle class="glow" cx="${x}" cy="${F - 60}" r="34" fill="url(#glw)"/>`;
  // the stone foxes (2026-11-11, finer): on a stone plinth, sat up with the bushy tail raised behind, ears pricked (red inside),
  // a narrow eye, a red bib tied round the neck; one holds the key in its mouth, the other the jewel. The left one bowed to: a
  // breeze stirs its bib and the key glints (bless)
  const foxC = ['#e9e2d0', '#4a4c6e'], foxR = ['#d0453c', '#5a2030'], gold = ['#d9b04a', '#a88a4a'], fine = 'stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"';
  const fox = (x, flip, key, fx = '') => `<g transform="translate(${x} ${F - 30}) scale(${flip ? -1 : 1} 1)"${fx}><rect x="-14" y="18" width="28" height="12" ${hc(...stone)}/><rect x="-12" y="10" width="24" height="8" ${hc(...stoneL)}/>
    <path d="M-12 10.6 h24" ${hs(...stoneH)} stroke-width="1.2"/><path d="M4 10 h8 v8 h-8 Z M5 18 h9 v12 h-9 Z" ${shade}/><path d="M-10 24 h20" ${hs('#958f82', '#24264a')} stroke-width=".8"/>
    <path d="M-6 9 C-14.5 5 -16 -7 -11.6 -15.4 C-10 -18.6 -6.6 -19.2 -7.2 -15.6 C-8.4 -9.4 -6.6 -2.4 -1.6 3 Z" ${hc(...foxC)} ${fine}/><path d="M-11.6 -15.4 C-10 -18.6 -6.6 -19.2 -7.2 -15.6 C-7.6 -13.6 -7.8 -11.6 -7.7 -9.6 C-9.6 -10.6 -11.2 -12.6 -11.6 -15.4 Z" fill="#fff" fill-opacity=".35"/>
    <path d="M-8 10 C-10 -2 -7 -11 -2 -15 L4 -15 C7 -10 9 -2 9 10 Z" ${hc(...foxC)} ${fine}/><path d="M-8 10 C-10 -2 -7 -11 -2 -15 L-.6 -14 C-4.6 -9 -5.4 0 -3.4 10 Z" ${shade}/><path d="M2.4 10 L3.4 -2 M6.6 10 L6.8 -2" ${hs('#cfc6b0', '#3a3c5e')} stroke-width="1"/>
    <path d="M-1.4 -24 L-1 -33 L3 -25.6 Z" ${hc(...foxC)} ${fine}/><path d="M-3 -15 C-4 -21 -1 -25 2.5 -25.5 C5 -25.6 7 -24 8.6 -22 L14.6 -19.6 Q15.6 -18 14 -17.2 L7 -16 C5 -14 1 -13 -3 -15 Z" ${hc(...foxC)} ${fine}/>
    <path d="M2 -25.4 L4.6 -35 L7.6 -23.6 Z" ${hc(...foxC)} ${fine}/><path d="M3.4 -25.8 L4.6 -32 L6.2 -24.4 Z" ${hc(...foxR)}/><path d="M4.6 -21.4 l3.4 -1.2" stroke="#2b2b33" stroke-width="1.3" stroke-linecap="round"/><path d="M4.2 -23.6 l3 -1" ${hs(...foxR)} stroke-width=".8"/><circle cx="14.6" cy="-18.4" r="1" fill="#2b2b33"/>
    ${key ? `<path d="M8.6 -16.6 H16" ${hs(...gold)} stroke-width="1.4"/><circle cx="17.4" cy="-16.6" r="1.6" fill="none" ${hs(...gold)} stroke-width="1.1"/><path d="M10 -16.6 v2 M12 -16.6 v1.5" ${hs(...gold)} stroke-width="1"/>` : `<circle cx="12.6" cy="-15.6" r="2.4" ${hc(...gold)}/><path d="M12.6 -18 q1.4 -1.4 .6 -2.6" fill="none" ${hs(...gold)} stroke-width="1"/><circle cx="11.9" cy="-16.3" r=".7" fill="#fff" fill-opacity=".7"/>`}
    <g class="bib"><path d="M-4.6 -14.6 Q2 -10.6 8.6 -15 L6.6 -5 Q2 -2 -2.6 -5.6 Z" ${hc(...foxR)}/><path d="M6.6 -5 Q2 -2 -2.6 -5.6" fill="none" ${hs('#e8796c', '#7a3040')} stroke-width="1"/><path d="M-4.6 -14.6 Q2 -10.6 8.6 -15" fill="none" stroke="#2b1c12" stroke-opacity=".18" stroke-width="1.2"/></g>
    ${key ? '<path class="glint" d="M17.4 -22 l.8 2.6 l2.6 .8 l-2.6 .8 l-.8 2.6 l-.8 -2.6 l-2.6 -.8 l2.6 -.8 Z" fill="#fff6d0"/>' : ''}</g>`;
  const leaf = (x, y, k, c) => `<g transform="translate(${x} ${y})"><path  d="M0 -6 C5 -6 7 0 0 7 C-7 0 -5 -6 0 -6 Z" ${hcx('fx-fall', c, '#8a5a5a', `animation-delay:-${k * 1.6}s;animation-duration:${10 + (k % 3) * 2}s`)}/></g>`;
  const STALLS = SHRINE_STALLS;
  // the 緣日 stalls (2026-11-11, finer): striped awnings, corner posts, a shade under the awning, the counter's top and its seams,
  // and what each sells laid out under its sign — goldfish in a blue tub, noodles on the griddle, cotton candy in bright bags.
  // 2026-11-13 (the user: seven or eight stalls, more to eat): narrower, seven of them along the approach — four before the sacred
  // tree, two before the hall's left wing, one before its right (the bell between kept clear); a long name in smaller letters
  // Later the same day (the user: someone at every stall): its keeper (TOWN.YATAI) behind the counter, head and shoulders over
  // the things laid out, under the awning — the sign moved up onto the awning to make room, lit as the stall is
  const keeper = (id, cx, k) => { const v = (TOWN.YATAI || {})[id], z = 0.3, feet = F - 21; if (!v) return '';
    const lit = (h) => `style="fill:color-mix(in srgb, ${h} calc(70% + 30% * var(--day, 1)), #3a2c40)"`;
    return `<g class="stall-keeper" data-keeper="${id}" style="--k:${k}">${HERO.svg({ look: v.look, wear: TOWNEV.wearOf(v.wear), front: true, box: '-60 -205 120 180', L: lit })
      .replace('<svg ', `<svg x="${(cx - 60 * z).toFixed(1)}" y="${(feet - 205 * z).toFixed(1)}" width="${(120 * z).toFixed(1)}" height="${(180 * z).toFixed(1)}" `)}</g>`; };
  const stall = (x, w, aw, sign, goods, who, k) => `<g><rect x="${x}" y="${F - 70}" width="${w}" height="70" ${hc('#c58a54', '#3a2c40')}/><path d="M${x} ${F - 70} h${w} v6 h${-w} Z" fill="#2b1c12" fill-opacity=".16"/>
    ${keeper(who, x + w / 2, k)}<path d="M${x + 1} ${F - 70} h4 v70 h-4 Z M${x + w - 5} ${F - 70} h4 v70 h-4 Z" ${hc('#8a5a30', '#2a2440')}/><path d="M${x - 6} ${F - 70} h${w + 12} l-8 -22 h${-w + 4} Z" ${hc(aw, '#5a2030')}/>
    <path d="${Array.from({ length: Math.ceil(w / 24) }, (_, k) => { const a = k / (w / 12) * 2, b = Math.min(1, a + 12 / w); return `M${(x + 2 + (w - 4) * a).toFixed(1)} ${F - 92} H${(x + 2 + (w - 4) * b).toFixed(1)} L${(x - 6 + (w + 12) * b).toFixed(1)} ${F - 70} H${(x - 6 + (w + 12) * a).toFixed(1)} Z`; }).join(' ')}" fill="#fff" fill-opacity=".3" style="opacity:calc(.45 + .55 * var(--day))"/>
    ${Array.from({ length: Math.floor(w / 18) }, (_, k) => `<path d="M${x - 4 + k * 18} ${F - 70} q9 8 18 0" ${hc(aw, '#5a2030')}/>`).join('')}<path d="M${x - 6} ${F - 70.6} h${w + 12}" stroke="#2b1c12" stroke-opacity=".18" stroke-width="1.2"/><rect x="${x + 6}" y="${F - 89}" width="${w - 12}" height="15" rx="2" ${hc('#fbf7ec', '#e8dcb4')}/>
    <text x="${x + w / 2}" y="${F - 77.6}" text-anchor="middle" font-size="${Math.min(11, (w - 16) / [...sign].length).toFixed(1)}" font-weight="700" ${hc('#8a2f2a', '#8a2f2a')} font-family="system-ui, sans-serif">${sign}</text>${goods}<rect x="${x + 4}" y="${F - 28.5}" width="${w - 8}" height="3" rx="1" ${hc('#a8743f', '#4a3a40')}/><rect x="${x + 6}" y="${F - 26}" width="${w - 12}" height="10" ${hc('#efe6d6', '#ffe2a0')}/>
    <path d="M${x + w / 3} ${F - 14} V${F} M${x + w * 2 / 3} ${F - 14} V${F}" ${hs('#a8743f', '#2a2440')} stroke-width="1.2"/><path d="M${x + 6} ${F - 16} h${w - 12} v2 h${-w + 12} Z" fill="#2b1c12" fill-opacity=".12"/></g>`;
  const fish = (x, y, k) => `<path d="M${x} ${y} q3 -2.2 6 0 q-3 2.2 -6 0 Z M${x} ${y} l-2.6 -1.8 v3.6 Z" ${hc(k ? '#e8592e' : '#f2f0ea', '#ff8a4a')} transform="rotate(${(k * 37) % 40 - 20} ${x + 3} ${y})"/>`;
  const goods = {
    kingyo: (x, w) => `<path d="M${x + 16} ${F - 36} h${w - 32} l-3 7.5 h${-w + 38} Z" ${hc('#5f9ad0', '#2a4a7a')}/><ellipse cx="${x + w / 2}" cy="${F - 36}" rx="${w / 2 - 16}" ry="2" ${hc('#9cc6ea', '#4a6aa0')}/>${[[0.28, 0], [0.42, 1], [0.58, 2], [0.7, 3]].map(([f, k]) => fish(x + w * f, F - 32.5 + (k % 2) * 1.6, k)).join('')}<path d="M${x + 16} ${F - 36} h${w - 32}" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`,
    yakisoba: (x, w) => `<rect x="${x + 12}" y="${F - 32}" width="${w - 24}" height="4" rx="1" ${hc('#3a3a44', '#1c1d3c')}/><path d="M${x + 18} ${F - 32} ${Array.from({ length: Math.floor((w - 36) / 6) }, () => 'q3 -6.5 6 0').join(' ')} Z" ${hc('#c8904a', '#6a4a3a')}/><path d="M${x + 21} ${F - 34} ${Array.from({ length: Math.floor((w - 42) / 6) }, () => 'q3 -4 6 0').join(' ')}" fill="none" ${hs('#a8703a', '#4a3a3a')} stroke-width="1"/>${[[0.32, '#5f9a4a'], [0.5, '#d0453c'], [0.64, '#5f9a4a'], [0.42, '#d0453c']].map(([f, c]) => `<circle cx="${(x + w * f).toFixed(1)}" cy="${F - 35}" r="1.2" ${hc(c, '#5a4a4a')}/>`).join('')}`,
    wataame: (x, w) => [['#f2b8c6', '#6a4a62'], ['#a8d8f0', '#3a5a7a'], ['#f6e08a', '#6a6040']].map(([c, n], k) => { const bx = x + 18 + k * (w - 36) / 3 + 2; return `<path d="M${bx + 5} ${F - 46} v2" ${hs('#2b2b33', '#141428')} stroke-width="1"/><path d="M${bx} ${F - 44} h10 q1 0 1 1.4 l-.6 13 q0 1.6 -1.6 1.6 h-8.2 q-1.6 0 -1.6 -1.6 l-.6 -13 q0 -1.4 1.6 -1.4 Z" ${hc(c, n)}/><circle cx="${bx + 3.6}" cy="${F - 37}" r=".8" fill="#2b2b33"/><circle cx="${bx + 7.4}" cy="${F - 37}" r=".8" fill="#2b2b33"/><path d="M${bx + 4.4} ${F - 35} q1.1 1 2.2 0" fill="none" stroke="#2b2b33" stroke-width=".7"/><path d="M${bx + 1.6} ${F - 42} v9" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/>`; }).join(''),
    // 2026-11-13: octopus balls in the griddle's rows, candy apples and chocolate bananas stood in a block, syrups and cups of shaved
    // ice with ラムネ cooling in a tub
    takoyaki: (x, w) => `<rect x="${x + 11}" y="${F - 33}" width="${w - 22}" height="5" rx="1.4" ${hc('#3a3a44', '#1c1d3c')}/>${Array.from({ length: 12 }, (_, k) => { const cx = x + 16 + (k % 6) * ((w - 32) / 5) + (k < 6 ? 0 : 2), cy = F - (k < 6 ? 36.4 : 33.6);
      return `<circle cx="${cx.toFixed(1)}" cy="${cy}" r="2.9" ${hc('#c98a48', '#6a4a3a')}/><path d="M${(cx - 2.6).toFixed(1)} ${cy - 0.4} q2.6 -3 5.2 0" ${hc('#5e2f1a', '#3a2a2a')}/>`; }).join('')}<path d="M${x + 14} ${F - 37} ${Array.from({ length: 8 }, () => 'l2.6 2 l2.6 -2').join(' ')}" fill="none" ${hs('#fff3d2', '#8a8a7a')} stroke-width=".8"/>`,
    // 2026-11-13 (more sold there): a stick of strawberries and one of grapes between the candy apples
    ringoame: (x, w) => `<rect x="${x + 14}" y="${F - 33}" width="${w - 28}" height="5" rx="1" ${hc('#efe9de', '#8a8aa8')}/>${Array.from({ length: 4 }, (_, k) => { const cx = x + 20 + k * (w - 40) / 3;
      if (k === 1 || k === 2) return `<path d="M${cx.toFixed(1)} ${F - 34} v-15" ${hs('#d9b98a', '#5a4a4a')} stroke-width="1.1"/>${[0, 1, 2].map((j) => (k === 1
        ? `<path d="M${(cx - 2.6).toFixed(1)} ${F - 46.6 + j * 4.4} q2.6 -1.4 5.2 0 q-.4 3 -2.6 4.4 q-2.2 -1.4 -2.6 -4.4 Z" ${hc('#e0453f', '#7a2a3a')}/>`
        : `<circle cx="${cx.toFixed(1)}" cy="${F - 45 + j * 4.2}" r="2.2" ${hc('#7d4ea9', '#4a3060')}/>`)).join('')}<circle cx="${(cx - 0.8).toFixed(1)}" cy="${F - 46}" r=".7" fill="#fff" fill-opacity=".7"/>`;
      return `<path d="M${cx.toFixed(1)} ${F - 37} v5" ${hs('#d9b98a', '#5a4a4a')} stroke-width="1.2"/><circle cx="${cx.toFixed(1)}" cy="${F - 40.6}" r="4.6" ${hc('#d8283a', '#7a2a3a')}/><path d="M${(cx + 1.4).toFixed(1)} ${F - 44.6} q1.4 -2 3 -2.2" fill="none" ${hs('#6e4a33', '#3a2a2a')} stroke-width=".9"/><circle cx="${(cx - 1.6).toFixed(1)}" cy="${F - 42}" r="1.1" fill="#fff" fill-opacity=".7"/>`; }).join('')}`,
    kakigori: (x, w) => `${['#e8455a', '#f2cf3c', '#3fa0d8'].map((c, k) => `<rect x="${x + 12 + k * 6}" y="${F - 39}" width="4.4" height="10" rx="1" ${hc(c, '#4a4a6a')}/><rect x="${x + 12.8 + k * 6}" y="${F - 41.6}" width="2.8" height="2.8" ${hc('#f2f0ea', '#8a8aa8')}/>`).join('')}
      ${[0, 1].map((k) => { const cx = x + 38 + k * 12; return `<path d="M${cx - 4} ${F - 35} h8 l-1.4 6 h-5.2 Z" ${hc('#fbf7ef', '#a8a8c0')}/><path d="M${cx - 5} ${F - 35} q5 -9 10 0 Z" ${hc('#f4f8fc', '#c0c8e0')}/><path d="M${cx - 4} ${F - 37.6} q4 -6.4 8 0 q-2 1.6 -4 .4 q-2 1.2 -4 -.4 Z" ${hc(k ? '#3fa0d8' : '#e8455a', '#5a4a6a')}/>`; }).join('')}
      <path d="M${x + w - 19} ${F - 34} h11 l-1 6 h-9 Z" ${hc('#5f9ad0', '#2a4a7a')}/>${[0, 1, 2].map((k) => `<path d="M${x + w - 17 + k * 3.4} ${F - 34} v-5 h1.8 v5" ${hc('#9fd6dc', '#4a6a8a')}/><rect x="${x + w - 17 + k * 3.4}" y="${F - 40.4}" width="1.8" height="1.6" ${hc('#3f7ac8', '#2a3a6a')}/>`).join('')}`,
    chocobanana: (x, w) => `<rect x="${x + 14}" y="${F - 33}" width="${w - 28}" height="5" rx="1" ${hc('#efe9de', '#8a8aa8')}/>${Array.from({ length: 5 }, (_, k) => { const cx = x + 19 + k * (w - 38) / 4;
      return `<path d="M${cx.toFixed(1)} ${F - 34} v3" ${hs('#d9b98a', '#5a4a4a')} stroke-width="1.2"/><path d="M${(cx - 2.2).toFixed(1)} ${F - 34} v-9 q2.2 -4 4.4 0 v9 Z" ${hc('#5a3220', '#2a1c1c')}/><path d="M${(cx - 2.2).toFixed(1)} ${F - 34.4} h4.4 v-1.6 h-4.4 Z" ${hc('#f2d25a', '#6a6040')}/>${[['#f2708a', -1, 8], ['#e6c23a', 1, 6], ['#5fb0d8', -0.4, 4]].map(([c, dx, dy]) => `<path d="M${(cx + dx - 0.6).toFixed(1)} ${F - 34 - dy} h1.4" ${hs(c, '#5a5a6a')} stroke-width="1"/>`).join('')}`; }).join('')}`
  };
  // the festival's paper lanterns (2026-11-11, finer): black caps top and bottom, the ribs round them, a soft shine on the left
  const chochin = (x0, x1) => `<path d="M${x0} ${F - 120} Q${(x0 + x1) / 2} ${F - 100} ${x1} ${F - 120}" fill="none" ${hs('#2b2b33', '#2b2b33')} stroke-width="1.5"/>${Array.from({ length: Math.floor((x1 - x0) / 36) }, (_, k) => { const x = x0 + 18 + k * 36, y = F - 120 + 20 * (1 - (((x - x0) / (x1 - x0)) * 2 - 1) ** 2);
    return `<g class="fx-sway" style="animation-delay:-${k * 0.4}s"><path d="M${x} ${y - 3} v3" stroke="#2b2b33" stroke-width="1"/><ellipse cx="${x}" cy="${y + 12}" rx="10" ry="13" ${hc('#e8592e', '#ff8a4a')}/><path d="M${x - 9.2} ${y + 6} q9.2 2.4 18.4 0 M${x - 9.2} ${y + 18} q9.2 2.4 18.4 0 M${x - 6.6} ${y + 1.6} q6.6 1.6 13.2 0 M${x - 6.6} ${y + 22.4} q6.6 1.6 13.2 0" fill="none" stroke="#a8302a" stroke-opacity=".45" stroke-width=".8"/><path d="M${x - 10} ${y + 12} q10 2.6 20 0" fill="none" stroke="#a8302a" stroke-width="1"/><ellipse cx="${x - 4.4}" cy="${y + 9}" rx="2.4" ry="6.4" fill="#fff" fill-opacity=".22"/><rect x="${x - 5}" y="${y - 1}" width="10" height="2.6" rx="1" fill="#2b2b33"/><rect x="${x - 5}" y="${y + 23.6}" width="10" height="2.6" rx="1" fill="#2b2b33"/></g><circle class="glow" cx="${x}" cy="${y + 12}" r="30" fill="url(#glw)"/>`; }).join('')}`;
  const boom = (x, y, k, c) => `<g transform="translate(${x} ${y})"><g class="fx-boom" style="animation-delay:-${k}s">${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<path d="M${(Math.cos(a) * 12).toFixed(1)} ${(Math.sin(a) * 12).toFixed(1)} L${(Math.cos(a) * 52).toFixed(1)} ${(Math.sin(a) * 52).toFixed(1)}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${(Math.cos(a) * 58).toFixed(1)}" cy="${(Math.sin(a) * 58).toFixed(1)}" r="2.6" fill="${c}"/>`; }).join('')}</g></g>`;
  return `<svg class="land tall shrine-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${[[40, 236, 380, 90], [150, 230, 330, 80], [280, 120, 300, 80], [420, 110, 260, 70], [700, 150, 300, 80], [1000, 236, 400, 96], [1130, 236, 360, 90]].map(([x, b, h, w]) => cedar(x, b, h, w, false)).join('')}
      <path d="M240 ${F} C300 200 380 150 470 116 L520 116 C470 150 420 200 400 ${F} Z" ${hc('#b9b0a0', '#24264a')}/>${Array.from({ length: 9 }, (_, t) => smallTorii((8 - t) / 8)).join('')}
      ${cedar(-10, 236, 460, 110, true)}${cedar(1210, 236, 480, 120, true)}
      <rect class="trunk" x="618" y="40" width="44" height="${F - 40}" rx="10"/><g class="crown">${[[640, -40, 120], [560, 10, 80], [720, 10, 86], [600, -110, 80], [690, -100, 76]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
      <path d="M612 150 Q640 162 668 150" ${hs('#e8d8a8', '#6a6450')} stroke-width="6"/>${[624, 640, 656].map((x) => `<path d="M${x} 156 l3 6 l-3 6 l3 6" ${hs('#ffffff', '#8a8cae')} stroke-width="2"/>`).join('')}
      <rect x="722" y="222" width="376" height="14" ${hc('#b4ad9e', '#2a2c48')}/>
      ${[772, 850, 970, 1048].map((x) => `<rect x="${x - 7}" y="128" width="14" height="94" ${hc('#d0453c', '#4a2030')}/>`).join('')}
      <rect x="779" y="146" width="64" height="76" ${hc('#efe6d6', '#ffd98a')}/><rect x="977" y="146" width="64" height="76" ${hc('#efe6d6', '#ffd98a')}/><rect x="857" y="138" width="106" height="84" ${hc('#5a3b28', '#2a2440')}/>
      <path d="M700 136 C740 134 770 112 800 86 L840 58 H980 L1020 86 C1050 112 1080 134 1120 136 L1110 144 C1064 142 1034 124 1006 100 H814 C786 124 756 142 710 144 Z" ${hc('#5f8a7a', '#1a2a3a')}/>
      ${[72, 86, 100].map((yy) => `<path d="M${840 - (yy - 58) * 1.2} ${yy} H${980 + (yy - 58) * 1.2}" ${hs('#4f7a6a', '#14223a')} stroke-width="1.4"/>`).join('')}
      <path d="M876 58 L910 30 L944 58 Z" ${hc('#efe6d6', '#3a3c5e')}/><path d="M896 34 l-12 -18 M924 34 l12 -18" ${hs('#3a4254', '#10122a')} stroke-width="4"/><path d="M904 52 l6 6 l6 -6" ${hs('#d9b04a', '#a88a4a')} stroke-width="2.6"/>
      <path d="M776 136 Q910 156 1044 136" ${hs('#e8d8a8', '#6a6450')} stroke-width="9"/>${[800, 840, 880, 940, 980, 1020].map((x, k) => `<path d="M${x} ${144 + (x === 880 || x === 940 ? 6 : 2)} l4 7 l-4 7 l4 7" ${hsx('fx-sway', '#ffffff', '#8a8cae', `animation-delay:-${k * 0.5}s;animation-duration:2.6s`)} stroke-width="2.2"/>`).join('')}
      <g class="fx-sway" data-fx="bell" style="animation-duration:4.2s"><path d="M910 147 v5" ${hs('#6a5a3a', '#3a3450')} stroke-width="1.4"/>
        <g class="suzu"><path d="M907 152.6 q3 -3.6 6 0" fill="none" ${hs('#b08a30', '#6a5e3a')} stroke-width="1.6"/><circle cx="910" cy="160" r="9" ${hc('#d9b04a', '#8a7a4a')}/><path d="M901 160 a9 9 0 0 0 18 0 Z" fill="#2b1c12" fill-opacity=".14"/>
        <path d="M901.4 157.6 Q910 160.2 918.6 157.6" fill="none" ${hs('#b08a30', '#6a5e3a')} stroke-width="1.4"/><path d="M905 164.6 h10" stroke="#3b2a1c" stroke-width="1.5" stroke-linecap="round"/><circle cx="904.6" cy="164.6" r="1.3" fill="#3b2a1c"/><circle cx="915.4" cy="164.6" r="1.3" fill="#3b2a1c"/><ellipse cx="906" cy="155.4" rx="2.6" ry="1.7" fill="#fff" fill-opacity=".55"/></g>
        <path d="M910 169 V187" ${hs('#d0453c', '#5a2030')} stroke-width="6" stroke-linecap="butt"/><path d="${[170, 175, 180].map((y) => `M907.4 ${y} l5.2 4`).join(' ')}" ${hs('#ffffff', '#8a8cae')} stroke-width="2"/><path d="M909 169 V187" stroke="#fff" stroke-opacity=".2" stroke-width="1"/>
        <g class="tassel"><rect x="906" y="185.6" width="8" height="2.6" rx="1" ${hc('#d9b04a', '#8a7a4a')}/><path d="M906.4 188 h7.2 l1.6 8 h-10.4 Z" ${hc('#d0453c', '#5a2030')}/><path d="M908 189 l-.8 6.6 M910 189 v6.8 M912 189 l.8 6.6" ${hs('#a8302a', '#3a1828')} stroke-width=".8"/></g></g>
      <rect x="880" y="196" width="60" height="26" ${hc('#8a5a30', '#2a2440')}/><path d="M884 198 h52 v7 h-52 Z" ${hc('#5a3b28', '#1c1838')}/><path d="M884 205 ${Array.from({ length: 8 }, () => 'l3.25 -6 l3.25 6').join(' ')} Z" ${hc('#a8743f', '#3a2c44')}/>
      <rect x="878" y="194" width="64" height="4" rx="1" ${hc('#6e4628', '#221c38')}/><path d="M880 209.5 H940" stroke="#2b1c12" stroke-opacity=".16" stroke-width="1"/><path d="M880 216 h60 v6 h-60 Z M930 198 h10 v24 h-10 Z" fill="#2b1c12" fill-opacity=".1"/>
      <path d="M881.4 214.6 v6 h6 M938.6 214.6 v6 h-6 M881.4 205 v-5.6 h6 M938.6 205 v-5.6 h-6" fill="none" ${hs('#d9b04a', '#a88a4a')} stroke-width="1.5"/><path d="M882 222 h8 v2 h-8 Z M930 222 h8 v2 h-8 Z" ${hc('#5a3b28', '#1c1838')}/><text x="910" y="218" text-anchor="middle" font-size="9" font-weight="700" ${hc('#efe6d6', '#c9c4e8')} font-family="serif">奉納</text>
      <rect x="104" y="${F - 156}" width="14" height="156" ${hc('#d0453c', '#5a2030')}/><rect x="232" y="${F - 156}" width="14" height="156" ${hc('#d0453c', '#5a2030')}/><rect x="100" y="${F - 18}" width="22" height="18" ${hc('#2b2b33', '#141428')}/><rect x="228" y="${F - 18}" width="22" height="18" ${hc('#2b2b33', '#141428')}/>
      <path d="M76 ${F - 166} Q175 ${F - 180} 274 ${F - 166} L270 ${F - 154} Q175 ${F - 166} 80 ${F - 154} Z" ${hc('#2b2b33', '#141428')}/><rect x="90" y="${F - 156}" width="170" height="8" ${hc('#d0453c', '#5a2030')}/><rect x="96" y="${F - 128}" width="158" height="10" ${hc('#d0453c', '#5a2030')}/>
      <rect x="160" y="${F - 156}" width="30" height="30" ${hc('#2b2b33', '#141428')}/>${vText(175, F - 152, '稲荷', 11, 'font-weight="700" fill="#d9b04a" font-family="serif"')}
      ${lantern(320)}${lantern(700)}${fox(360, false, true, ' data-fx="fox"')}${fox(560, true, false)}
      <g data-fx="crow"><g class="fx-peck" style="animation-duration:3.1s"><path d="M229 66 L217 71.6 L219.2 67 L215.6 64.4 L229 61.4 Z" ${hc('#24242c', '#0a0a18')}/>
        <path d="M226 64 C227 57.6 235 53.6 245 54 C251 54.3 255 57 254.5 62 C253.5 67.5 245 70.5 235 70 C230 69.7 226.8 67.2 226 64 Z" ${hc('#2b2b33', '#0c0c1c')}/><path d="M229.6 62.6 C233 57.6 241 56 248.6 58.6 C247 63.6 240.6 67 232.6 67 C230.6 66.3 229.6 64.8 229.6 62.6 Z" ${hc('#3a3e52', '#16182e')}/>
        <path d="M233 66.4 l-5 2.4 M237.4 66.4 l-5 2.8 M241.6 65.4 l-4.6 3" ${hs('#24242c', '#0a0a18')} stroke-width="1.1"/><path d="M234 57 C239 55.2 245 55.2 249.4 57" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="252" cy="56" r="5.4" ${hc('#2b2b33', '#0c0c1c')}/><path d="M256 54.2 Q262.6 54.8 264.6 57.6 Q260.6 59 256 59.2 Z" ${hc('#3a3a44', '#1a1a2a')}/><path d="M256.6 57.2 L263 57.6" stroke="#0c0c14" stroke-opacity=".5" stroke-width=".6"/>
        <circle cx="253.6" cy="55" r="1.2" fill="#0c0c14"/><circle cx="254" cy="54.6" r=".45" fill="#fff" fill-opacity=".85"/><path d="M236 69.6 v5 l-2 1 M236 74.6 l2 .8 M242 69.6 v5 l-2 1 M242 74.6 l2 .8" fill="none" ${hs('#3a3a44', '#1a1a2a')} stroke-width="1.3"/></g></g>
      <g data-fx="kuji"><path d="M1076 166 L1083 160 H1147 L1154 166 Z" ${hc('#5a3b28', '#221c38')}/><path d="M1083 160 H1147 L1148.4 161.4 H1081.6 Z" fill="#fff" fill-opacity=".14"/><rect x="1080" y="${F - 70}" width="70" height="40" rx="2" ${hc('#c58a54', '#3a2c40')}/><rect x="1084" y="170" width="62" height="32" ${hc('#a8743f', '#2e2438')}/>
        <path d="M1082 172 h66 M1082 196 h66" ${hs('#8a5a30', '#2a2440')} stroke-width="2.2"/><path d="M1084 170 h62 v3 h-62 Z" fill="#2b1c12" fill-opacity=".14"/>
        ${[0, 1, 2].map((k) => { const cx = 1096 + k * 20; return `<g class="ema" style="animation-delay:-${k * 0.07}s"><path d="M${cx - 3} 173.4 l3 -1.6 l3 1.6" fill="none" ${hs('#d0453c', '#6a3040')} stroke-width=".9"/><path d="M${cx - 8} 177 L${cx} 173 L${cx + 8} 177 V191 H${cx - 8} Z" ${hc('#efe6d6', '#e8dcb4')}/><path d="M${cx - 8} 177 L${cx} 173 L${cx + 8} 177 v2 L${cx} 175 L${cx - 8} 179 Z" ${hc('#c8a070', '#a08a6a')}/>
          <path d="M${cx - 3} 181.6 l1 -2.6 l1.5 1.5 h1 l1.5 -1.5 l1 2.6 l-3 3.4 Z" ${hc(['#d0453c', '#3b2a1c', '#d0453c'][k], '#6a3a40')}/><path d="M${cx - 5} 187 h${7 - k} M${cx - 5} 189 h${5 + k}" stroke="#3b2a1c" stroke-opacity=".55" stroke-width=".8"/><path d="M${cx + 5} 177.4 V191 H${cx + 8} V177 Z" fill="#2b1c12" fill-opacity=".08"/></g>`; }).join('')}
        <rect x="1110" y="${F - 30}" width="10" height="30" ${hc('#6e4f3a', '#2c2440')}/><path d="M1116 206 h4 v30 h-4 Z" fill="#2b1c12" fill-opacity=".14"/>
        <path d="M1160 ${F - 54} h40" ${hs('#6e4f3a', '#2c2440')} stroke-width="2"/><path d="M1160 ${F - 54} h40" ${hs('#9a7a5a', '#4a3c5a')} stroke-width="1" stroke-dasharray="2 2"/>${[1166, 1176, 1186, 1196].map((x, k) => `<g ${hcx('fx-sway', '#ffffff', '#8a8cae', `animation-delay:-${k * 0.4}s;animation-duration:2.2s`)}><circle cx="${x}" cy="${F - 53.4}" r="1.8"/><path d="M${x - 1.6} ${F - 52} h3.2 v8 h-3.2 Z"/><path d="M${x - 1.6} ${F - 48} h3.2 M${x - 1.6} ${F - 52} h3.2" stroke="#2b1c12" stroke-opacity=".16" stroke-width=".7"/></g>`).join('')}</g>
      <path d="M672 ${F} L700 ${F - 92}" ${hs('#c9a06a', '#3a2c40')} stroke-width="3"/><path d="M664 ${F} q4 -18 10 -26 q4 12 8 26 Z" ${hc('#b9a070', '#2a2440')}/><path d="M667.6 ${F - 1} q2.4 -12 6 -22 M672 ${F - 1} q1 -12 2.4 -21 M676.4 ${F - 1} q-.6 -10 -1.6 -18" fill="none" ${hs('#d8c08a', '#3a3450')} stroke-width=".9"/><path d="M670.6 ${F - 21} l7.4 2.4" ${hs('#8a5a30', '#1c1838')} stroke-width="2"/><path d="M675 ${F} q-1 -12 -1 -24 q4 12 7 24 Z" fill="#2b1c12" fill-opacity=".1"/>${[[600, '#d9533a'], [612, '#e8913a'], [624, '#e6c23a'], [606, '#c8453a'], [618, '#d9533a']].map(([x, c], k) => `<ellipse cx="${x}" cy="${F - 3 - (k > 2 ? 5 : 0)}" rx="7" ry="3.4" ${hc(c, '#5a3a3a')}/>`).join('')}
      ${[[180, -120, '#d9533a'], [420, -60, '#e8913a'], [520, -140, '#e6c23a'], [760, -90, '#d9533a'], [880, -150, '#e8913a'], [1040, -60, '#e6c23a'], [300, -20, '#d9533a']].map(([x, y, c], k) => leaf(x, y, k, c)).join('')}
      ${fest ? `<g class="ennichi">${boom(240, -260, 0, '#ff9a5a')}${boom(520, -320, 1.4, '#ffd166')}${boom(860, -280, 2.8, '#7fd1ff')}${chochin(280, 700)}${chochin(704, 856)}${STALLS.map(([id, x, aw, sign, , who], k) => stall(x, 72, aw, sign, goods[id](x, 72), who, k)).join('')}</g>` : ''}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90" style="fill:color-mix(in srgb, #d8cfbd calc(var(--day) * 100%), #2a2a48)"/>
      ${Array.from({ length: 24 }, (_, j) => `<rect x="${60 + j * 48}" y="${F + 18 + (j % 2) * 26}" width="34" height="16" rx="3" ${hc('#c9c4b8', '#3a3c5e')}/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('shrine')}
    <div class="ysel"></div>`;
}
// ---- the keep, after 姫路城 (2026-11-14, the user: 「白鷺城太醜了」, the stacked boxes with rows of windows looked like an office
// block): white plaster with few windows (black lattices, bell-topped 華頭窓 at the top, 狭間 loopholes along the bottom), dark roofs
// with white-mortared tiles and upturned eaves, gables alternating up the tiers (a pair of 千鳥破風, a 唐破風, a pair, a 唐破風,
// the 入母屋破風 on top), grey shachihoko, on curved stone walls (扇の勾配) of uneven stones; a small keep in three tiers before it
// on the left. Lit up by night: the plaster pale, the windows dark ----
const CASTLE_ROOF = (() => {
  const TILE = ['#56606f', '#262c48'], EDGE = ['#3e4758', '#1c2040'], WALL = ['#f7f5ef', '#e4ddca'], SHADE = ['#e6e1d6', '#cfc7b2'];
  const f = (v) => +v.toFixed(1);
  // a hipped roof (front on): its eave from x−e to x+e at y, turned up at the tips, its top (t wide each side) at yt; white mortar
  // lines down the tiles; id: its own clip
  function hip(x, y, e, yt, t, id, o = {}) {
    const L = x - e, R = x + e, tip = 7, d = `M${L - 9} ${y - tip} Q${L + 6} ${y + 1} ${L + 34} ${y + 1} H${R - 34} Q${R - 6} ${y + 1} ${R + 9} ${y - tip} C${R - 16} ${y - tip - 4} ${x + t + 16} ${yt + 8} ${x + t} ${yt} H${x - t} C${x - t - 16} ${yt + 8} ${L + 16} ${y - tip - 4} ${L - 9} ${y - tip} Z`;
    let s = `<path d="M${x - e + 24} ${y + 1} H${x + e - 24} V${y + 6} H${x - e + 24} Z" fill="#2b1c12" fill-opacity=".14"/>`;   // its shadow on the wall under it (the wall: 24 in from the eave)
    s += `<defs><clipPath id="kr-${id}"><path d="${d}"/></clipPath></defs><path d="${d}" ${hc(...TILE)}/>`;
    s += `<g clip-path="url(#kr-${id})"><path d="${Array.from({ length: Math.ceil((2 * e + 20) / 6) }, (_, k) => { const xx = L - 10 + k * 6, lean = (xx - x) * 0.08; return `M${f(xx - lean)} ${yt} L${f(xx)} ${y + 2}`; }).join(' ')}" ${hs('#dfe3ea', '#4a5274')} stroke-width=".9" stroke-opacity=".55"/>
      <path d="M${L - 12} ${y - 2} H${R + 12} V${y + 2} H${L - 12} Z" ${hc(...EDGE)}/></g>`;
    s += `<path d="M${L - 9} ${y - tip} Q${L + 6} ${y + 1} ${L + 34} ${y + 1} H${R - 34} Q${R - 6} ${y + 1} ${R + 9} ${y - tip}" fill="none" ${hs('#f6f3ec', '#8a8eaa')} stroke-width="1.2" stroke-opacity=".8"/>`;   // the eave's white edge
    if (o.ridge) s += ridge(x, yt, t, o.ridge, o.shachi);
    return s;
  }
  // the top: the roof's ridge across, a shachihoko at each end (tail up, grey tile as on 姫路城, not gold)
  function ridge(x, yt, t, w, shachi) {
    const h = w > 60 ? 6 : 5;
    let s = `<path d="M${x - t + 4} ${yt + 1} L${x - w} ${yt - h} H${x + w} L${x + t - 4} ${yt + 1} Z" ${hc(...TILE)}/><rect x="${x - w - 2}" y="${yt - h - 4}" width="${2 * w + 4}" height="5" rx="1.5" ${hc(...EDGE)}/><path d="M${x - w} ${yt - h - 4} H${x + w}" ${hs('#9aa2b4', '#3a4262')} stroke-width="1"/>`;
    if (shachi) s += [-1, 1].map((k) => { const sx = x + k * (w + 1);
      return `<g transform="translate(${sx} ${yt - h - 4}) scale(${k * 1.15} 1.15)"><path d="M0 0 C-1 -6 3 -9 6 -10 C3 -12 2 -16 5 -19 C6 -15 9 -13 11 -14 C9 -11 7 -9 7 -6 C7 -3 5 0 3 0 Z" ${hc('#4a5468', '#22284a')}/><circle cx="2.4" cy="-5" r=".9" fill="#f6f3ec"/></g>`; }).join('');
    return s;
  }
  // 千鳥破風: a little triangular gable on a roof's slope (its foot at y), white within dark bargeboards, a 懸魚 under the apex
  const chidori = (x, y, w) => { const h = w * 0.82;
    return `<path d="M${x - w - 6} ${y + 2} L${x} ${y - h - 6} L${x + w + 6} ${y + 2} Z" ${hc(...TILE)}/><path d="M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} Z" ${hc(...WALL)}/><path d="M${x + w * 0.12} ${y - h * 0.88} L${x + w} ${y} H${x + w * 0.4} Z" ${hc(...SHADE)} opacity=".5"/>
      <path d="M${x - w - 6} ${y + 2} L${x} ${y - h - 6} L${x + w + 6} ${y + 2}" fill="none" ${hs('#f6f3ec', '#8a8eaa')} stroke-width="1"/><path d="M${x - 2.4} ${y - h + 2} h4.8 l-2.4 6 Z" ${hc('#c9c4b4', '#6a6e8e')}/>`; };
  // 唐破風: the curved, bell-hipped gable (its foot at y), white within a dark band
  const kara = (x, y, w, h) => { const c = (k) => `M${x - w - k} ${y} C${x - w * 0.55} ${y} ${x - w * 0.5} ${y - h - k} ${x} ${y - h - k} C${x + w * 0.5} ${y - h - k} ${x + w * 0.55} ${y} ${x + w + k} ${y}`;
    return `<path d="${c(6)} Z" ${hc(...TILE)}/><path d="${c(0)} Z" ${hc(...WALL)}/><path d="${c(6)}" fill="none" ${hs('#f6f3ec', '#8a8eaa')} stroke-width="1"/><path d="M${x - 2.4} ${y - h + 2} h4.8 l-2.4 5 Z" ${hc('#c9c4b4', '#6a6e8e')}/>`; };
  // 入母屋破風: the top roof's big gable facing out, its face plastered and lined
  const irimoya = (x, y, w) => { const h = w * 0.78;
    return `<path d="M${x - w - 7} ${y + 2} L${x} ${y - h - 6} L${x + w + 7} ${y + 2} Z" ${hc(...TILE)}/><path d="M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} Z" ${hc(...WALL)}/><path d="M${x - w * 0.62} ${y - h * 0.38} H${x + w * 0.62}" ${hs('#c9c4b4', '#8a8eaa')} stroke-width="1"/>
      <path d="M${x - w - 7} ${y + 2} L${x} ${y - h - 6} L${x + w + 7} ${y + 2}" fill="none" ${hs('#f6f3ec', '#8a8eaa')} stroke-width="1"/><path d="M${x - 3} ${y - h + 2} h6 l-3 7 Z" ${hc('#c9c4b4', '#6a6e8e')}/>`; };
  return { hip, ridge, chidori, kara, irimoya, WALL, SHADE };
})();
function himeji() {
  const { hip, chidori, kara, irimoya, WALL, SHADE } = CASTLE_ROOF;
  let seed = 11;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // the stone walls: uneven stones in rows, lighter on the left, a darker run down the right
  function stones(id, d, x0, x1, y0, y1) {
    let s = `<defs><clipPath id="ks-${id}"><path d="${d}"/></clipPath></defs><path d="${d}" ${hc('#bdb4a2', '#3a3a58')}/><g clip-path="url(#ks-${id})">`;
    for (let y = y0, r = 0; y < y1; r++) { const h = 9 + Math.round(rnd() * 5); let x = x0 - rnd() * 20;
      while (x < x1) { const w = 16 + Math.round(rnd() * 18), tone = rnd(); s += `<rect x="${x.toFixed(1)}" y="${y}" width="${w}" height="${h}" rx="2.4" ${tone < 0.3 ? hc('#c6bdab', '#40405e') : tone < 0.6 ? hc('#b3aa97', '#36365a') : hc('#bdb4a2', '#3a3a58')} ${hs('#968d7b', '#2a2a46')} stroke-width="1.1"/>`; x += w; }
      y += h; }
    return s + `<rect x="${(x0 + x1) / 2}" y="${y0}" width="${(x1 - x0) / 2}" height="${y1 - y0}" fill="#2b1c12" fill-opacity=".08"/></g><path d="${d.split(' Z')[0]}" fill="none" ${hs('#d8d0be', '#4a4a6a')} stroke-width="1.4" stroke-opacity=".7"/>`;
  }
  // a tier's plastered wall, shaded down its right; its windows: lattices (black, white bars), 華頭窓, 狭間 (triangles and squares)
  const wall = (x, half, y0, y1) => `<rect x="${x - half}" y="${y0}" width="${half * 2}" height="${y1 - y0}" ${hc(...WALL)}/><rect x="${x + half * 0.72}" y="${y0}" width="${half * 0.28}" height="${y1 - y0}" ${hc(...SHADE)}/>`;
  const lattice = (x, y, w, h) => `<rect x="${x - w / 2 - 1.5}" y="${y - 1.5}" width="${w + 3}" height="${h + 3}" ${hc('#c9c4b4', '#a8a090')}/><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" ${hc('#2f3038', '#22243a')}/><path d="${Array.from({ length: Math.max(2, Math.round(w / 4) - 1) }, (_, k) => `M${(x - w / 2 + (k + 1) * w / Math.max(3, Math.round(w / 4))).toFixed(1)} ${y} v${h}`).join(' ')}" ${hs('#dcd7ca', '#6a6e8e')} stroke-width="1"/>`;
  const katou = (x, y, w, h) => { const d = `M${x - w / 2} ${y + h} V${y + h * 0.42} C${x - w / 2} ${y + h * 0.1} ${x - w * 0.16} ${y + h * 0.16} ${x} ${y} C${x + w * 0.16} ${y + h * 0.16} ${x + w / 2} ${y + h * 0.1} ${x + w / 2} ${y + h * 0.42} V${y + h} Z`;
    return `<path d="${d}" ${hc('#2f3038', '#22243a')} ${hs('#4a5468', '#2a3150')} stroke-width="2.4"/><path d="M${x - w / 6} ${y + h * 0.25} V${y + h} M${x + w / 6} ${y + h * 0.25} V${y + h}" ${hs('#dcd7ca', '#6a6e8e')} stroke-width="1"/>`; };
  const sama = (x0, x1, y) => { let s = ''; for (let x = x0, k = 0; x <= x1; x += 21, k++) s += k % 2 ? `<rect x="${x - 2.6}" y="${y - 2.6}" width="5.2" height="5.2" ${hc('#3a3a44', '#26283e')}/>` : `<path d="M${x - 3.2} ${y + 2.6} L${x} ${y - 3} L${x + 3.2} ${y + 2.6} Z" ${hc('#3a3a44', '#26283e')}/>`; return s; };
  const row = (x, half, y, w, h, n) => Array.from({ length: n }, (_, k) => lattice(x - half + (k + 0.5) * (2 * half / n), y, w, h)).join('');
  // ---- the main keep (大天守): five tiers on the high wall; walls first, then the roofs from the top down (each before the tier under it)
  const X = 880;
  let main = stones('m', 'M640 198 C690 188 724 140 732 70 H1028 C1036 140 1070 188 1120 198 Z', 630, 1130, 68, 200);
  main += wall(X, 50, -156, -118) + [-28, 0, 28].map((dx) => katou(X + dx, -146, 13, 18)).join('');
  main += wall(X, 68, -112, -84) + row(X, 68, -104, 14, 10, 2);
  main += wall(X, 90, -76, -46) + row(X, 90, -66, 15, 11, 3);
  main += wall(X, 114, -34, 2) + row(X, 114, -22, 16, 11, 4);
  main += wall(X, 140, 16, 70) + row(X, 140, 34, 18, 13, 5) + sama(X - 126, X + 126, 60);
  main += hip(X, -150, 68, -170, 40, 'm5', { ridge: 46, shachi: true }) + irimoya(X, -156, 28);
  main += hip(X, -108, 86, -124, 54, 'm4') + kara(X, -112, 26, 15);
  main += hip(X, -70, 110, -88, 74, 'm3') + chidori(X - 46, -74, 22) + chidori(X + 46, -74, 22);
  main += hip(X, -28, 136, -48, 96, 'm2') + kara(X, -32, 38, 21);
  main += hip(X, 22, 164, 0, 120, 'm1') + chidori(X - 78, 18, 32) + chidori(X + 78, 18, 32);
  // ---- the small keep (小天守) before it on the left, on a lower wall of its own
  const x = 697;
  let small = stones('s', 'M548 198 C592 190 616 152 622 116 H772 C778 152 792 188 816 198 Z', 540, 820, 114, 200);
  small += wall(x, 34, 4, 32) + [-12, 12].map((dx) => katou(x + dx, 10, 10, 14)).join('');
  small += wall(x, 46, 40, 68) + row(x, 46, 50, 13, 10, 2);
  small += wall(x, 60, 76, 116) + row(x, 60, 86, 14, 11, 3) + sama(x - 50, x + 50, 108);
  small += hip(x, 8, 50, -10, 26, 's3', { ridge: 30, shachi: true }) + irimoya(x, 4, 16);
  small += hip(x, 44, 64, 28, 38, 's2') + kara(x, 40, 22, 12);
  small += hip(x, 80, 82, 62, 50, 's1') + chidori(x, 76, 22);
  return `<g transform="translate(880 198) scale(1.2) translate(-880 -198)"><g class="keep">${main}</g><g class="keep-s">${small}</g></g>`;   // 1.2: as high as the keep it replaced
}
// 白鷺城 (test, 2026-11-09), the end of the bus line: the white keep in tiers on its stone walls, the gate, old pines, the
// guides' booth (案内所) and its board of the castle's story
function castleHtml() {
  const F = 236, cx = 880;
  // 2026-11-10: the moat before the keep with ripples, the gate and its bridge, sakura shedding petals, a banner flapping by the
  // guides' booth; the keep itself: himeji()
  // 2026-11-11 (the user: finer): the cherries' crowns in deeper pink where they overlap and below, a few pale clusters on top
  const sakura = (x, s) => `<path d="M${x} ${F} V${F - 60 * s} M${x} ${F - 40 * s} l${-26 * s} ${-30 * s} M${x} ${F - 50 * s} l${24 * s} ${-28 * s}" ${hs('#6b4a2f', '#1c1428')} stroke-width="${7 * s}"/><path d="M${x - 2 * s} ${F - 4} V${F - 58 * s}" stroke="#fff" stroke-opacity=".12" stroke-width="${2 * s}"/><g ${hc('#f2b8c6', '#5a3a52')}>${[[0, -96, 46], [-36, -78, 34], [36, -80, 34], [-14, -122, 30], [20, -118, 30]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g>
    <g fill="#b04a6a" fill-opacity=".1">${[[-32, -66, 24], [34, -68, 24], [0, -76, 30], [-10, -108, 16], [18, -106, 16]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g><g fill="#fff" fill-opacity=".3">${[[-20, -128, 6], [12, -132, 5], [-44, -90, 5], [40, -96, 6], [-4, -110, 4], [24, -92, 4]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g>`;
  const petal = (x, y, k) => `<g transform="translate(${x} ${y})"><ellipse  rx="4" ry="2.6" ${hcx('fx-fall', '#f7c6d2', '#6a4a62', `animation-delay:-${k * 1.3}s;animation-duration:${9 + (k % 3) * 2}s`)}/></g>`;
  // the old pine (finer): its trunk leaning and bending, a branch out to each pad, the pads flat underneath with a darker
  // underside, a lighter rim of needles on top
  const pine = (x, s) => `<path d="M${x - 2 * s} ${F} C${x - 4 * s} ${F - 26 * s} ${x + 8 * s} ${F - 44 * s} ${x + 1 * s} ${F - 72 * s} M${x + 2 * s} ${F - 38 * s} C${x - 8 * s} ${F - 44 * s} ${x - 16 * s} ${F - 50 * s} ${x - 22 * s} ${F - 58 * s} M${x + 5 * s} ${F - 46 * s} C${x + 14 * s} ${F - 50 * s} ${x + 20 * s} ${F - 54 * s} ${x + 24 * s} ${F - 56 * s}" fill="none" ${hs('#6b4a2f', '#0b0c22')} stroke-width="${8 * s}"/>
    <path d="M${x - 1 * s} ${F - 6} C${x - 2 * s} ${F - 20 * s} ${x + 4 * s} ${F - 30 * s} ${x + 2 * s} ${F - 40 * s} M${x + 2.6 * s} ${F - 14 * s} l${1.6 * s} ${-6 * s}" fill="none" stroke="#2b1c12" stroke-opacity=".2" stroke-width="${1.6 * s}"/>
    ${[[0, -78, 44], [-24, -60, 34], [26, -58, 32], [0, -100, 28]].map(([dx, dy, r]) => { const cx = x + dx * s, cy = F + dy * s, rx = r * s, ry = r * 0.42 * s; return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${hc('#3f6a48', '#0c1428')}/><path d="M${cx - rx} ${cy} Q${cx} ${cy + ry * 1.4} ${cx + rx} ${cy} Q${cx} ${cy + ry * 0.4} ${cx - rx} ${cy} Z" fill="#14261a" fill-opacity=".22"/><path d="M${(cx - rx * 0.72).toFixed(1)} ${(cy - ry * 0.3).toFixed(1)} Q${cx} ${(cy - ry * 1.12).toFixed(1)} ${(cx + rx * 0.72).toFixed(1)} ${(cy - ry * 0.3).toFixed(1)}" fill="none" ${hs('#5f8a5a', '#1a2a40')} stroke-width="${2.4 * s}"/><path d="${[-0.45, -0.1, 0.25, 0.55].map((f) => `M${(cx + rx * f).toFixed(1)} ${(cy - ry * 0.55).toFixed(1)} l${(1.6 * s).toFixed(1)} ${(-2.4 * s).toFixed(1)}`).join(' ')}" ${hs('#7aa070', '#22324a')} stroke-width="${1.1 * s}"/>`; }).join('')}`;
  return `<svg class="land tall castle-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      <ellipse class="glow" cx="${cx}" cy="-40" rx="320" ry="260" fill="url(#glw)"/>
      ${himeji()}
      <rect x="-20" y="198" width="1240" height="38" ${hc('#6a9ab8', '#141a3a')}/><path d="M-20 199 H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>
      ${[[120, 214], [420, 222], [700, 212], [980, 224], [1140, 214]].map(([x, y], k) => `<g transform="translate(${x} ${y})"><ellipse  rx="18" ry="4" fill="none" ${hsx('fx-ripple', '#ffffff', '#5a6aa0', `animation-delay:-${k * 0.7}s`)} stroke-width="1.6"/></g>`).join('')}
      ${[[640, 0], [690, 1]].map(([x, k]) => `<g class="fx-swim" style="animation-delay:-${k * 1.2}s"><g transform="translate(${x} 222)"><path d="M-14 0 q0 -10 14 -10 q12 0 16 -6 q-4 10 -2 16 Z" ${hc('#fbfaf6', '#9a9ec8')}/><path d="M10 -6 q-2 -14 4 -20" fill="none" ${hs('#fbfaf6', '#9a9ec8')} stroke-width="3.4" stroke-linecap="round"/><path d="M14 -26 l6 2 l-6 2" ${hc('#e6883a', '#5a4a3a')}/><ellipse cx="2" cy="1" rx="18" ry="2" fill="#fff" fill-opacity=".3"/></g></g>`).join('')}
      <rect x="150" y="70" width="220" height="80" ${hc('#f6f3ec', '#e2dac6')}/><path d="M150 84.4 Q260 62.4 370 84.4 V90 Q260 68 150 90 Z" fill="#2b1c12" fill-opacity=".08"/>${CASTLE_ROOF.hip(260, 86, 132, 64, 92, 'gr', { ridge: 72, shachi: true })}
      ${[176, 220, 300, 344].map((x) => `<rect x="${x - 8}" y="94" width="16" height="13" ${hc('#dcd5c6', '#cfc8b4')}/><rect ${hc('#3b3b44', '#ffd98a')} x="${x - 6}" y="96" width="12" height="9"/><path d="M${x - 2} 96 v9 M${x + 2} 96 v9" ${hs('#e8e2d4', '#3a3a58')} stroke-width="1.2"/>`).join('')}
      <rect x="150" y="150" width="50" height="48" ${hc('#b4ab98', '#3a3a58')}/><rect x="320" y="150" width="50" height="48" ${hc('#b4ab98', '#3a3a58')}/>${[150, 320].map((b) => `<path d="M${b} 162 h50 M${b} 174 h50 M${b} 186 h50 M${b + 18} 150 v12 M${b + 34} 162 v12 M${b + 14} 174 v12 M${b + 30} 186 v12" ${hs('#958c7a', '#2a2a46')} stroke-width="1.2"/><path d="M${b} 150 h50 v3 h-50 Z" fill="#2b1c12" fill-opacity=".12"/>`).join('')}
      <rect x="200" y="140" width="120" height="58" ${hc('#5a3b28', '#2a2440')}/><path d="${[215, 230, 245, 275, 290, 305].map((x) => `M${x} 140 V198`).join(' ')}" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1"/><path d="M200 140 h120 v4 h-120 Z" fill="#2b1c12" fill-opacity=".2"/>
      <path d="M200 148 h120 v4 h-120 Z M200 184 h120 v4 h-120 Z" ${hc('#2b2b33', '#141428')}/>${[150, 186].map((y) => [208, 222, 236, 250, 270, 284, 298, 312].map((x) => `<circle cx="${x}" cy="${y}" r="1.3" ${hc('#d9b04a', '#a88a4a')}/>`).join('')).join('')}
      <path d="M292 198 V176 h20 V198" fill="none" stroke="#2b1c12" stroke-opacity=".35" stroke-width="1.2"/><path d="M260 140 V198" ${hs('#3a2418', '#1c1430')} stroke-width="3"/>${[230, 290].map((x) => `<circle cx="${x}" cy="170" r="3" ${hc('#d9b04a', '#a88a4a')}/><circle cx="${x}" cy="174.6" r="3.2" fill="none" ${hs('#b08a30', '#8a7a4a')} stroke-width="1.1"/>`).join('')}
      <path d="M196 198 H324 L332 ${F} H188 Z" ${hc('#a8743f', '#3a2c40')}/><path d="M196 198 H324 L325 202 H195 Z" fill="#2b1c12" fill-opacity=".16"/>${[201, 205, 210, 216, 223, 231].map((y) => { const d = (8 * (y - 198) / 38).toFixed(1); return `<path d="M${196 - d} ${y} H${324 + Number(d)}" ${hs('#8a5a30', '#2a2440')} stroke-width="1.1"/>`; }).join('')}
      ${[[195, 192.5, 189.5, -1], [325, 327.5, 330.5, 1]].map(([a, b, c, k]) => `<path d="M${a} 198 v-7 M${b} 211 v-9 M${c} 230 v-11 M${a} 191 L${c} 219" ${hs('#8a5a30', '#2a2440')} stroke-width="2.2"/><path d="M${c - 2} 219.4 q2 -4.4 4 0 Z M${a - 1.4} 191.2 q1.4 -3 2.8 0 Z" ${hc('#c9a050', '#6a5a3a')}/>`).join('')}
      <g data-fx="sakuraL">${sakura(60, 1.2)}</g><g data-fx="sakuraR">${sakura(1150, 1.1)}</g>${pine(420, 0.8)}
      ${[176, 344].map((x) => `<path d="M${x - 12} ${F} l3 -8 h18 l3 8 Z" ${hc('#a9a497', '#2c2e4c')}/><rect x="${x - 4}" y="${F - 40}" width="8" height="32" ${hc('#b4ad9e', '#34365a')}/><rect x="${x - 5.5}" y="${F - 27}" width="11" height="2.6" rx="1" ${hc('#a9a497', '#2c2e4c')}/>
        <rect x="${x - 10}" y="${F - 58}" width="20" height="15" rx="1" ${hc('#b4ad9e', '#34365a')}/><path d="M${x - 8} ${F - 40} h16 l2 -3 h-20 Z" ${hc('#a9a497', '#2c2e4c')}/><path d="M${x} ${F - 8} V${F - 40} h4 V${F - 8} Z M${x} ${F - 43} V${F - 58} h10 V${F - 43} Z M${x} ${F - 8} h9 l3 8 h-12 Z" fill="#2b1c12" fill-opacity=".1"/>
        <rect x="${x - 5}" y="${F - 55}" width="10" height="9" ${hc('#5a5a64', '#ffd27a')}/><path d="M${x} ${F - 55} v9" ${hs('#9a958a', '#b08a4a')} stroke-width="1"/>
        <path d="M${x - 16} ${F - 58} Q${x - 11} ${F - 59} ${x - 9} ${F - 62} L${x} ${F - 68.4} L${x + 9} ${F - 62} Q${x + 11} ${F - 59} ${x + 16} ${F - 58} Z" ${hc('#9a958a', '#2a2c4c')}/><path d="M${x} ${F - 68.4} L${x + 9} ${F - 62} Q${x + 11} ${F - 59} ${x + 16} ${F - 58} H${x} Z" fill="#2b1c12" fill-opacity=".1"/><circle cx="${x}" cy="${F - 70}" r="2" ${hc('#b4ad9e', '#34365a')}/><circle class="glow" cx="${x}" cy="${F - 49}" r="26" fill="url(#glw)"/>`).join('')}
      <rect x="430" y="${F - 70}" width="130" height="70" ${hc('#efe6d6', '#25264a')}/><path d="M430 ${F - 70} h4 v70 h-4 Z M556 ${F - 70} h4 v70 h-4 Z" ${hc('#d8ccb4', '#1e1f40')}/><rect x="430" y="${F - 6}" width="130" height="6" ${hc('#b9ad98', '#1c1d3c')}/><path d="M430 ${F - 70} h130 v4 h-130 Z" fill="#2b1c12" fill-opacity=".12"/>
      <path d="M420 ${F - 70} h150 l-12 -16 h-126 Z" ${hc('#8a6a52', '#1c1d3c')}/><path d="M424.5 ${F - 75} H565.5 M428.5 ${F - 80.5} H561.5" ${hs('#7a5a44', '#16173a')} stroke-width="1.2"/><path d="M420 ${F - 70} h150 v-2 h-150 Z" fill="#2b1c12" fill-opacity=".18"/><rect x="430" y="${F - 88}" width="130" height="3" rx="1.5" ${hc('#6e5242', '#16173a')}/>
      <rect x="450" y="${F - 62}" width="90" height="18" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/><text x="495" y="${F - 49}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">案内所</text>
      <rect x="452" y="${F - 38}" width="86" height="38" ${hc('#8a6a52', '#1c1d3c')}/><rect x="455" y="${F - 36}" width="80" height="36" ${hc('#cfe6ec', '#ffd98a')}/><path d="M495 ${F - 36} V${F}" ${hs('#8a6a52', '#1c1d3c')} stroke-width="2"/>
      <g class="day-only"><path d="M462 ${F - 20} l12 -12 M468 ${F - 20} l6 -6 M504 ${F - 20} l12 -12" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/></g><rect x="450" y="${F - 14}" width="90" height="3" rx="1" ${hc('#a8743f', '#2e2438')}/>
      <path d="M587 ${F - 63} L625 ${F - 70} L663 ${F - 63} Z" ${hc('#6e4f3a', '#2c2440')}/><rect x="590" y="${F - 64}" width="70" height="46" rx="2" ${hc('#fbf7ec', '#3a3b62')}/><rect x="593" y="${F - 61}" width="64" height="40" rx="1" fill="none" ${hs('#d8c8a8', '#4a4e78')} stroke-width="1"/><rect x="620" y="${F - 18}" width="8" height="18" ${hc('#6e4f3a', '#2c2440')}/><path d="M625 ${F - 18} h3 v18 h-3 Z" fill="#2b1c12" fill-opacity=".16"/>
      <text x="625" y="${F - 48}" text-anchor="middle" font-size="10" font-weight="700" ${hc('#3b2a1c', '#c9c4e8')} font-family="system-ui, sans-serif">白鷺城</text>
      <path d="M598 ${F - 38} h54 M598 ${F - 30} h44" ${hs('#9a9184', '#4a4e78')} stroke-width="2"/>
      <path d="M576 ${F} V${F - 130}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><circle cx="576" cy="${F - 132}" r="2.4" ${hc('#d9b04a', '#a88a4a')}/>
      <g class="fx-flag"><path d="M577 ${F - 128} h22 v80 h-22 Z" ${hc('#f6f3ec', '#4a4c72')}/><path d="M577 ${F - 128} h22 v5 h-22 Z M577 ${F - 53} h22 v5 h-22 Z" ${hc('#2f4a6e', '#2a2e5a')}/><path d="M594 ${F - 123} h5 v70 h-5 Z" fill="#2b1c12" fill-opacity=".06"/>${vText(588, F - 122, '白鷺城', 12, `font-weight="700" fill="#2f4a6e" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}</g>
      <path d="M576 ${F - 128} h24" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.8"/><path d="${[F - 112, F - 94, F - 76, F - 58].map((y) => `M575 ${y} h4`).join(' ')}" ${hs('#2f4a6e', '#2a2e5a')} stroke-width="1.6"/>
      ${[[40, -120], [200, -60], [320, -160], [960, -100], [1080, -40], [1180, -150], [700, -200], [520, -80]].map(([x, y], k) => petal(x, y, k)).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90" style="fill:color-mix(in srgb, #ddd3bd calc(var(--day) * 100%), #2a2a48)"/>
      ${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('castle')}
    <div class="ysel"></div>`;
}
// the bus (test, 2026-11-09): sat on the bench, the bus comes in and its board shows the stops — 駅前, 月の湯, 稲荷神社, 白鷺城,
// each opened by the event that first takes the hero there (TOWN events' opens); from a stop out there, home to the main road too.
// Picked: the hero gets on, the bus pulls away, and the place opens with him getting off at its stop
const BUS_STOPS = [['station', '駅前'], ['sento', '月の湯'], ['shrine', '稲荷神社'], ['castle', '白鷺城']];
const BUS_AT = { street: BUS, station: { X: 470, Y: 56, seat: 0 }, sento: { X: 470, Y: 56, seat: 0 }, shrine: { X: 470, Y: 56, seat: 0 }, castle: { X: 470, Y: 56, seat: 0 } };   // where each place's stop stands (out there: by the kerb)
const BUS_LANE = { street: 92, station: 16, sento: 16, shrine: 16, castle: 16 };   // where the bus runs (Y): on the road in front of the stop (2026-11-10, the user)
const BUS_PLACES = ['street'].concat(BUS_STOPS.map((x) => x[0]));
const BUS_IN = { street: () => [[BUS.X + 40, 122], [BUS.X - 60, 108]], station: () => [[440, 50], [360, 72]], sento: () => [[440, 50], [360, 72]], shrine: () => [[440, 50], [360, 72]], castle: () => [[440, 50], [360, 72]] };   // getting off: where he steps down, where he walks to
const BUS_ART = `<rect x="-130" y="-104" width="260" height="96" rx="16" fill="#3f9a8c"/><rect x="-130" y="-56" width="260" height="10" fill="#f6f1e4"/>
  ${[-104, -60, -16, 28].map((x) => `<rect x="${x}" y="-94" width="38" height="30" rx="4" fill="#cfe6ec"/>`).join('')}<rect x="72" y="-94" width="34" height="80" rx="4" fill="#2f6f64"/><rect x="76" y="-90" width="26" height="40" rx="3" fill="#cfe6ec"/>
  <rect x="-122" y="-120" width="90" height="18" rx="4" fill="#2b2b33"/><text x="-77" y="-106" text-anchor="middle" font-size="12" font-weight="700" fill="#ffd27a" font-family="system-ui, sans-serif">みなと市バス</text>
  <circle cx="-80" cy="-6" r="16" fill="#2b2b33"/><circle cx="-80" cy="-6" r="6" fill="#8a8f99"/><circle cx="84" cy="-6" r="16" fill="#2b2b33"/><circle cx="84" cy="-6" r="6" fill="#8a8f99"/><circle cx="122" cy="-30" r="5" fill="#ffd98a"/>`;
function busSit(el) {
  yNamed(el);
  const yard = el.closest('.yard'), at = BUS_AT[yPlace] || BUS, k = yScale(at.Y), h = yard && yard.querySelector('.yhero'); if (!h) return;
  if (h.classList.contains('bench')) { busCome(yard); return; }
  yHeroWalk(yard, [at.X + 20 * k, at.Y - 2], () => {
    yh.back = false; yh.turn = false; yh.flip = false; if (yPlace === 'street') h.classList.add('bench'); yHeroPlace(yard);
    busCome(yard);
  });
}
function busCome(yard) {   // the bus in along the road, in front of the stop, its board up
  const at = BUS_AT[yPlace] || BUS, lane = BUS_LANE[yPlace] ?? at.Y, k = yScale(lane) * 2.1;   // a bus: a good deal bigger than the people
  let bus = yard.querySelector('.bus');
  if (!bus) {
    bus = document.createElement('div'); bus.className = 'bus'; bus.setAttribute('aria-hidden', 'true');
    bus.style.cssText = `margin-left:${Math.round(at.X - 40)}px;bottom:${lane}px;z-index:${300 - lane};--k:${k.toFixed(3)}`;
    bus.innerHTML = `<svg viewBox="-140 -126 280 140">${BUS_ART}</svg>`;
    yard.querySelector('.yworld').appendChild(bus); requestAnimationFrame(() => bus.classList.add('in'));
  }
  setTimeout(() => busBoard(yard), 650);
}
function busBoard(yard) {
  yard.querySelectorAll('.bus-board').forEach((b) => b.remove());
  const here = yPlace, list = (here === 'street' ? [] : [['street', '大馬路（回家）']]).concat(BUS_STOPS.filter((x) => x[0] !== here));
  const opened = (id) => id === 'street' || Boolean(state.town.stops[id]), any = list.some((x) => opened(x[0]));
  const el = document.createElement('div'); el.className = 'bus-board'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '公車路線');
  el.innerHTML = `<div class="bus-card"><b>みなと市バス・路線</b>
    ${list.map(([id, name]) => `<button type="button" class="bus-stop-btn" data-bus="${id}"${opened(id) ? '' : ' disabled'}>${esc(name)}${opened(id) ? '' : '<small>還沒開通</small>'}</button>`).join('')}
    ${any ? '' : '<p class="bus-note">現在還沒有開通的路線。多認識鎮上的人，之後就能搭公車去別的地方。</p>'}
    <button type="button" class="btn btn-sm" data-bus-x>不搭了</button></div>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    e.stopPropagation(); const b = e.target.closest('[data-bus]');
    if (b && !b.disabled) { el.remove(); busRide(yard, b.dataset.bus); return; }
    if (e.target.closest('[data-bus-x]') || e.target === el) { el.remove(); const bus = yard.querySelector('.bus'); if (bus) { bus.classList.add('go'); setTimeout(() => bus.remove(), 900); } }
  });
  yard.appendChild(el);
}
function busRide(yard, to) {   // on, away, and off at the other stop
  const h = yard.querySelector('.yhero'), bus = yard.querySelector('.bus');
  if (h) { h.classList.remove('bench'); h.classList.add('out'); }
  if (bus) bus.classList.add('go'); SND.play('bus');
  setTimeout(() => { yh.arrive = { from: yPlace, to }; go(PLACE_ROUTE[to]); }, 700);
}
// 駅前 (test, 2026-11-09), the bus's first stop: みなと駅 with its clock and ticket machines, the 交番 beside it with its red lamp, a
// square with benches and trees, and the bus stop at the right
// a town bike (2026-11-11, the user: finer; the station's and the bath's): tyres and spokes, a coloured frame with mudguards, a
// saddle, the bars and a basket on the front. x: the back wheel's middle, y: the wheels' middles, r: their size, c: [day, night]
const cityBike = (x, y, r, c) => { const s = r / 9, n = (v) => (v * s).toFixed(1), P = (dx, dy) => `${(x + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  return `<g><g fill="none" ${hs('#2b2b33', '#1c1d3c')} stroke-width="${n(2.6)}"><circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${(x + 26 * s).toFixed(1)}" cy="${y}" r="${r}"/></g>
    <path d="M${P(-6.4, 0)} L${P(6.4, 0)} M${P(0, -6.4)} L${P(0, 6.4)} M${P(19.6, 0)} L${P(32.4, 0)} M${P(26, -6.4)} L${P(26, 6.4)}" ${hs('#b0b0b8', '#3a3d66')} stroke-width=".7"/>
    <path d="M${P(-9.6, -3)} A${r + 1} ${r + 1} 0 0 1 ${P(4, -9.4)} M${P(22, -9.2)} A${r + 1} ${r + 1} 0 0 1 ${P(35.4, -3.6)}" fill="none" ${hs(...c)} stroke-width="${n(1.4)}"/>
    <path d="M${P(0, 0)} L${P(10, -16)} L${P(22, -16)} L${P(26, 0)} M${P(10, -16)} L${P(14, 0)} L${P(22, -16)}" fill="none" ${hs(...c)} stroke-width="${n(2.2)}"/><circle cx="${(x + 14 * s).toFixed(1)}" cy="${y}" r="${n(2)}" ${hc('#4a4a55', '#2a2c50')}/>
    <path d="M${P(10, -16)} L${P(9.4, -19.6)}" ${hs('#4a4a55', '#2a2c50')} stroke-width="${n(1.6)}"/><path d="M${P(5.6, -21)} h${n(8.6)} q0 ${n(2.4)} ${n(-3.6)} ${n(2.4)} h${n(-3)} Z" ${hc('#3a3a44', '#16172e')}/>
    <path d="M${P(22, -16)} l${n(2)} ${n(-6)} h${n(5)}" fill="none" ${hs('#4a4a55', '#2a2c50')} stroke-width="${n(1.8)}"/><path d="M${P(27.6, -22)} h${n(2)}" ${hs('#2b2b33', '#141428')} stroke-width="${n(2.6)}"/>
    <path d="M${P(27, -20)} h${n(8)} l${n(-1)} ${n(7)} h${n(-6)} Z M${P(27.6, -16.6)} h${n(7)} M${P(31, -20)} v${n(7)}" fill="none" ${hs('#9a968e', '#3a3d66')} stroke-width="${n(0.9)}"/></g>`; };
function stationHtml() {
  const F = 236;
  // 2026-11-10 (the user: every place looked the same): city-like — buildings behind, a viaduct over the back with a train along it
  // now and then, the station under it with its sign, a clock and a board running the next trains, the taxi stand (鈴木's taxi),
  // bikes, the 交番 with its blinking lamp, pigeons pecking on the square; the road along the front (busRoad)
  const tower = (x, w, h, c) => `<rect x="${x}" y="${F - h}" width="${w}" height="${h}" ${hc(c, '#1a1c3a')}/>${Array.from({ length: Math.floor((h - 20) / 22) }, (_, r) => Array.from({ length: Math.floor((w - 10) / 18) }, (_, k) => `<rect ${((r * 7 + k * 3 + x) % 5) < 2 ? 'class="lit"' : hc('#d9e6ec', '#232548')} x="${x + 8 + k * 18}" y="${F - h + 12 + r * 22}" width="9" height="12"/>`).join('')).join('')}`;
  const car = (x, k) => `<g transform="translate(${x} -2)"><rect x="0" y="0" width="216" height="46" rx="8" ${hc('#e8ebee', '#3a3f66')}/><rect x="0" y="30" width="216" height="6" ${hc('#3f9a8c', '#2a4a5a')}/>${[14, 50, 86, 122, 158].map((wx) => `<rect x="${wx}" y="8" width="26" height="16" rx="3" ${hc('#9fc0d0', '#ffe2a0')}/>`).join('')}<rect x="190" y="6" width="16" height="30" rx="2" ${hc('#c9cdd4', '#2a2c50')}/>${k === 0 ? `<path d="M0 6 Q-16 10 -18 30 V40 H0 Z" ${hc('#e8ebee', '#3a3f66')}/>` : ''}</g>`;
  // 2026-11-11 (the user: finer): the bikes in colours, tyres and spokes, mudguards, a saddle, the bars and a basket on the front
  const bike = (x, i) => cityBike(x, F + 30, 9, [['#3f7ac8', '#2a3a6a'], ['#d0574b', '#4a2a40'], ['#7aa86a', '#2a4040']][i % 3]);
  // the pigeons (finer): a tail, a paler wing with its two dark bars, the green sheen on the neck, an orange eye, pink feet
  const pigeon = (x, k) => `<g class="fx-peck" style="animation-delay:-${k * 0.6}s"><path d="M${x - 8} ${F + 68} l-8 -1.6 l1.2 4.2 Z" ${hc('#5a6078', '#22264a')}/><ellipse cx="${x}" cy="${F + 70}" rx="9" ry="6" ${hc('#8d93a8', '#2c2f52')}/>
    <path d="M${x - 7.6} ${F + 67.4} q6 -4.4 13.6 -1 q-3 6 -11.4 6.2 Z" ${hc('#a3a9bc', '#363a60')}/><path d="M${x - 3.4} ${F + 68.4} l4.4 .4 M${x - 1.6} ${F + 70.4} l4.2 .4" ${hs('#4a4e60', '#1c1e3a')} stroke-width="1.1"/><path d="M${x - 6} ${F + 74} q6 2 12 -1" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width="2"/>
    <circle cx="${x + 8}" cy="${F + 64}" r="4" ${hc('#7a8098', '#2c2f52')}/><path d="M${x + 5} ${F + 66.6} q2.6 2 5.2 .4" fill="none" ${hs('#6aa890', '#34506a')} stroke-width="1.8"/><path d="M${x + 5.6} ${F + 68} q2.4 1 4.6 -.2" fill="none" ${hs('#9a7ab0', '#3a3a6a')} stroke-width="1.2"/>
    <circle cx="${x + 9.3}" cy="${F + 63}" r=".95" fill="#d0682a"/><circle cx="${x + 9.4}" cy="${F + 63}" r=".4" fill="#1c1c22"/><path d="M${x + 12} ${F + 64} l3 1" ${hs('#d0904a', '#3a3d66')} stroke-width="1.6"/><circle cx="${x + 11.8}" cy="${F + 63.5}" r=".7" fill="#fff" fill-opacity=".7"/>
    <path d="M${x - 1} ${F + 75.6} v2.2 M${x + 3} ${F + 75.6} v2.2" ${hs('#d06a5a', '#4a3a50')} stroke-width="1.2"/></g>`;
  const hr = Math.floor(sceneHour()), board = `次の電車　${hr}:30 快速 みなと港　・　${hr}:45 普通 白鷺　・　`;   // the scene's hour (2026-11-10)
  return `<svg class="land tall station-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <defs><clipPath id="stLed"><rect x="452" y="${F - 124}" width="216" height="20" rx="2"/></clipPath></defs>
      ${tower(20, 120, 320, '#b9c3cc')}${tower(150, 90, 250, '#c9ccd2')}${tower(760, 130, 360, '#b4bec8')}${tower(900, 100, 280, '#c4c8ce')}${tower(1020, 150, 330, '#b9c3cc')}
      <path class="far" d="M0 160 C200 150 400 156 600 152 S1000 150 1200 158 V370 H0 Z"/>
      ${[80, 280, 480, 680, 880, 1080].map((x) => `<rect x="${x - 12}" y="40" width="24" height="${F - 40}" ${hc('#c9c6be', '#26284c')}/>`).join('')}
      <rect x="-20" y="36" width="1240" height="26" ${hc('#d6d3cb', '#2c2e54')}/><rect x="-20" y="58" width="1240" height="6" ${hc('#b0ada6', '#1e2042')}/>
      ${[60, 340, 620, 900, 1180].map((x) => `<path d="M${x} 36 V-40 M${x - 14} -30 H${x + 14}" ${hs('#8d8a84', '#3a3d66')} stroke-width="3"/>`).join('')}<path class="wire" d="M-20 -28 H1220"/>
      <g class="fx-train">${[0, 1, 2, 3].map((k) => car(k * 224, k)).join('')}</g>
      <rect x="290" y="${F - 182}" width="540" height="12" ${hc('#8a8f99', '#1c1d3c')}/>
      <rect x="300" y="${F - 170}" width="520" height="170" ${hc('#efe9dd', '#25264a')}/><rect x="300" y="${F - 170}" width="520" height="40" ${hc('#5f7f9a', '#1c2240')}/>
      <rect x="440" y="${F - 166}" width="240" height="30" rx="3" ${hc('#2f4a6e', '#1c1d3c')}/><text x="560" y="${F - 145}" text-anchor="middle" font-size="20" font-weight="700" ${hc('#ffffff', '#ffe9b0')} font-family="system-ui, sans-serif">みなと駅</text>
      <rect x="357.5" y="${F - 168.6}" width="5" height="4" ${hc('#5a5f6a', '#1c1d3c')}/><circle cx="360" cy="${F - 150}" r="15" ${hc('#fbf7ec', '#e8dcb4')}/><circle cx="360" cy="${F - 150}" r="14.2" fill="none" ${hs('#3b3b44', '#1c1d3c')} stroke-width="1.8"/>
      <path d="${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, r0 = i % 3 ? 10.6 : 9.4; return `M${(360 + r0 * Math.sin(a)).toFixed(1)} ${(F - 150 - r0 * Math.cos(a)).toFixed(1)} L${(360 + 12.2 * Math.sin(a)).toFixed(1)} ${(F - 150 - 12.2 * Math.cos(a)).toFixed(1)}`; }).join(' ')}" stroke="#3b2a1c" stroke-opacity=".7" stroke-width="1.1"/><path d="M350 ${F - 158} a13 13 0 0 1 8 -5.4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>${clockHands(360, F - 150, 13)}
      <path d="M470 ${F - 136} v6 M650 ${F - 136} v6" ${hs('#5a5f6a', '#2a2c4a')} stroke-width="2"/><rect x="446" y="${F - 130}" width="228" height="32" rx="4" ${hc('#5a5f6a', '#2a2c4a')}/><rect x="448" y="${F - 128}" width="224" height="28" rx="3" fill="#1c1c22"/>
      <g clip-path="url(#stLed)"><g class="fx-scroll"><text x="456" y="${F - 109}" font-size="13" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${board}${board}</text></g></g><path d="M452 ${F - 120.5} h216 M452 ${F - 116.5} h216 M452 ${F - 112.5} h216" stroke="#1c1c22" stroke-opacity=".45" stroke-width=".9"/><circle cx="664" cy="${F - 124}" r="1.4" fill="#5fd07a"/>
      <rect x="320" y="${F - 120}" width="110" height="60" ${hc('#cfe6ec', '#ffd98a')}/><rect x="690" y="${F - 120}" width="110" height="60" ${hc('#cfe6ec', '#ffd98a')}/>
      <g style="opacity:calc(.5 + .5 * var(--day))"><rect x="336" y="${F - 114}" width="30" height="42" fill="#7fb3d8"/><path d="M338 ${F - 80} L351 ${F - 100} L364 ${F - 80} Z" fill="#fbfaf6"/><path d="M336 ${F - 78} h30 v6 h-30 Z" fill="#4f8a5a"/><rect x="384" y="${F - 114}" width="30" height="42" fill="#f2b8c6"/><circle cx="399" cy="${F - 98}" r="8" fill="#fbfaf6"/><path d="M386 ${F - 80} q13 -8 26 0" fill="none" stroke="#c84a3a" stroke-width="2"/>
      <rect x="708" y="${F - 114}" width="30" height="42" fill="#3f7ac8"/><path d="M710 ${F - 84} q14 -10 26 0" fill="none" stroke="#fbfaf6" stroke-width="2.4"/><circle cx="728" cy="${F - 102}" r="5" fill="#f2c94c"/></g>
      <rect x="480" y="${F - 96}" width="160" height="96" ${hc('#6b7a8a', '#141632')}/>${[484, 524, 564, 604].map((x) => `<rect x="${x}" y="${F - 90}" width="34" height="90" ${hc('#cfe6ec', '#ffd98a')}/>`).join('')}${[500, 540, 580, 620].map((x) => `<rect x="${x - 3}" y="${F - 40}" width="6" height="30" fill="#8a96a8" fill-opacity=".55"/><rect x="${x - 10}" y="${F - 40}" width="20" height="5" rx="2" fill="#5a6a7a" fill-opacity=".5"/>`).join('')}
      <ellipse class="glow" cx="560" cy="${F - 30}" rx="220" ry="80" fill="url(#glw)"/>
      ${[330, 368, 406].map((x) => `<rect x="${x}" y="${F - 52}" width="30" height="52" rx="3" ${hc('#d9604c', '#4a2c40')}/><path d="M${x + 22} ${F - 52} h5 q3 0 3 3 v49 h-8 Z" fill="#2b1c12" fill-opacity=".1"/><rect x="${x + 5}" y="${F - 46}" width="20" height="12" rx="2" ${hc('#cfe6ec', '#5a66a8')}/><path d="M${x + 7} ${F - 44} h5 M${x + 7} ${F - 41} h8" stroke="#3f7ac8" stroke-opacity=".5" stroke-width="1"/>
        <path d="M${x + 6} ${F - 29} h7 M${x + 17} ${F - 29} h3 M${x + 8} ${F - 14} h14" stroke="#2b1c12" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>${[0, 1, 2].map((k) => `<circle cx="${x + 9 + k * 6}" cy="${F - 23}" r="1.5" ${hc('#f6f3ec', '#cfd6ff')}/>`).join('')}`).join('')}
      <rect x="40" y="${F - 120}" width="8" height="120" ${hc('#5a5a64', '#1c1d3c')}/><rect x="10" y="${F - 134}" width="76" height="22" rx="3" ${hc('#2f4a6e', '#1c1d3c')}/><text x="48" y="${F - 119}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">タクシー</text>
      <rect x="880" y="${F - 96}" width="126" height="96" ${hc('#f3efe6', '#25264a')}/><rect x="880" y="${F - 7}" width="126" height="7" ${hc('#cfc8b8', '#1c1d3c')}/><path d="M880 ${F - 96} h126 v5 h-126 Z" fill="#2b1c12" fill-opacity=".1"/>
      <path d="M866 ${F - 96} L943 ${F - 124} L1020 ${F - 96} Z" ${hc('#4a4a55', '#1c1d3c')}/><path d="M866 ${F - 96} H1020" ${hs('#3a3a44', '#141530')} stroke-width="2.4"/><path d="M943 ${F - 124} L1020 ${F - 96} H943 Z" fill="#2b1c12" fill-opacity=".1"/>
      <path d="M${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.9 : 4.8; return `${(943 + r * Math.cos(a)).toFixed(1)} ${(F - 107 + r * Math.sin(a)).toFixed(1)}`; }).join(' L')} Z" ${hc('#d9b04a', '#a88a4a')}/>
      <rect x="906" y="${F - 88}" width="74" height="18" rx="2" ${hc('#2b2b33', '#1c1d3c')}/><text x="943" y="${F - 75}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">交番</text>
      <path d="M940.5 ${F - 124} v-3 h5 v3 Z" ${hc('#3a3a44', '#141530')}/><circle cx="943" cy="${F - 132}" r="7" ${hc('#8a3a36', '#4a2030')}/><path d="M936.6 ${F - 135.6} q6.4 -5.4 12.8 0 Z" ${hc('#3a3a44', '#141530')}/>
      <g class="fx-blink"><circle cx="943" cy="${F - 132}" r="6.4" fill="#e0524b"/><ellipse cx="940.6" cy="${F - 133.6}" rx="2" ry="1.4" fill="#fff" fill-opacity=".6"/><circle class="glow" cx="943" cy="${F - 132}" r="30" fill="url(#glw)"/></g>
      <rect x="922" y="${F - 62}" width="40" height="62" ${hc('#8a6a52', '#3a2c40')}/><rect x="926" y="${F - 56}" width="14" height="20" rx="1" ${hc('#cfe6ec', '#ffd98a')}/><rect x="944" y="${F - 56}" width="14" height="20" rx="1" ${hc('#cfe6ec', '#ffd98a')}/>
      <path d="M942 ${F - 62} V${F} M926 ${F - 26} h14 M944 ${F - 26} h14" ${hs('#6e5240', '#2a2038')} stroke-width="1.2"/><path d="M937.6 ${F - 32} v8 M946.4 ${F - 32} v8" ${hs('#d9d4c8', '#8a8cae')} stroke-width="1.6"/><path d="M922 ${F - 62} h40 v3 h-40 Z" fill="#2b1c12" fill-opacity=".16"/>
      <rect x="966" y="${F - 64}" width="32" height="36" rx="1" ${hc('#8a8a90', '#1c1d3c')}/><rect x="968" y="${F - 62}" width="28" height="32" ${hc('#cfe6ec', '#ffd98a')}/><path d="M968 ${F - 56} h28 M968 ${F - 50} h28 M968 ${F - 44} h28 M968 ${F - 38} h28" stroke="#2b1c12" stroke-opacity=".14" stroke-width="1.6"/><rect x="964" y="${F - 30}" width="36" height="3" rx="1" ${hc('#a8a49a', '#2a2c50')}/>
      ${[1090, 1150].map((x) => `<rect x="${x - 24}" y="${F - 14}" width="48" height="14" rx="2" ${hc('#a8a49a', '#2a2c50')}/><rect class="trunk" x="${x - 3}" y="${F - 70}" width="6" height="58"/><g class="crown"><circle cx="${x}" cy="${F - 84}" r="22"/><circle cx="${x - 16}" cy="${F - 68}" r="15"/><circle cx="${x + 16}" cy="${F - 70}" r="16"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      <g data-fx="spigeons">${pigeon(590, 0)}${pigeon(626, 1)}${pigeon(660, 2)}</g>${streetLamp(860, F + 4, 124)}
      <g data-fx="svend">${[242, 274].map((x, i) => `<rect x="${x}" y="${F - 72}" width="30" height="72" rx="3" ${hc(i ? '#d0453c' : '#e9edf0', i ? '#4a2030' : '#3a4470')}/><rect x="${x + 3}" y="${F - 66}" width="24" height="26" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${[0, 1].map((r) => [0, 1, 2].map((c) => `<rect x="${x + 5 + c * 7}" y="${F - 63 + r * 11}" width="5" height="8" rx="1.5" fill="${['#3f7ac8', '#e6a23c', '#4f7a4a', '#d0574b'][(r + c + i) % 4]}"/>`).join('')).join('')}<rect x="${x + 6}" y="${F - 26}" width="18" height="8" rx="2" ${hc('#2b2b33', '#141530')}/>`).join('')}</g><ellipse class="glow" cx="273" cy="${F - 46}" rx="70" ry="56" fill="url(#glc)"/>
      ${[452, 668].map((x) => `<rect x="${x}" y="${F - 18}" width="40" height="18" rx="2" ${hc('#a8a49a', '#2a2c50')}/>${[6, 16, 26, 34].map((d, k) => `<circle cx="${x + d}" cy="${F - 22 - (k % 2) * 4}" r="5" fill="${['#e86f5e', '#f2c94c', '#e58fa8', '#ffffff'][k]}" fill-opacity=".92"/>`).join('')}<path d="M${x + 2} ${F - 18} q18 -10 36 0" fill="none" ${hs('#5f9a4a', '#16243a')} stroke-width="4"/>`).join('')}
      ${busRoad()}
    </svg>
    ${landProp(112, `<g data-fx="taxi"><g transform="translate(110 ${F + 12})"><ellipse cx="60" cy="10" rx="64" ry="5" fill="#000" fill-opacity=".1"/>
      <g class="tbody"><path d="M0 0 V-22 Q2 -30 14 -32 L34 -46 H82 L104 -32 Q118 -30 120 -22 V0 Z" ${hc('#f3d24a', '#5a5030')}/><path d="M1 -8 H119 V0 H1 Z" fill="#2b1c12" fill-opacity=".1"/><path d="M14 0 a12 12 0 0 1 24 0 Z M82 0 a12 12 0 0 1 24 0 Z" fill="#2b1c12" fill-opacity=".3"/>
        <path d="M40 -42 H78 L94 -30 H26 Z" ${hc('#9fc0d0', '#ffe2a0')}/><g class="day-only"><path d="M46 -40 l-6 8 M51 -40 l-3 4 M72 -40 l-6 8" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/></g><path d="M60 -42 V-30" ${hs('#f3d24a', '#5a5030')} stroke-width="2.4"/>
        <path d="M2 -14 H118" ${hs('#2b2b33', '#2a2a40')} stroke-width="1.4"/><path d="M38 -30 V-4 M80 -30 V-4" stroke="#2b1c12" stroke-opacity=".3" stroke-width="1"/><path d="M45 -24 h5 M87 -24 h5" stroke="#2b1c12" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/><path d="M94 -31 l4 -3.6 h3 v3.6 Z" ${hc('#4a4a55', '#2a2a40')}/>
        <path d="M48 -46 v-7 q0 -3 3 -3 h18 q3 0 3 3 v7 Z" ${hc('#fbf7ec', '#fff0b0')}/><text x="60" y="-48.5" text-anchor="middle" font-size="7" font-weight="700" fill="#2b2b33" font-family="system-ui, sans-serif">TAXI</text>
        <rect x="111" y="-7" width="11" height="4.4" rx="2" ${hc('#c9cdd4', '#3a3d5a')}/><rect x="-2" y="-7" width="11" height="4.4" rx="2" ${hc('#c9cdd4', '#3a3d5a')}/><ellipse cx="117.4" cy="-17" rx="2.6" ry="3.2" ${hc('#fff6d8', '#ffd98a')}/><rect x="0" y="-21" width="3" height="6" rx="1" ${hc('#d0453c', '#c8453a')}/></g>
      ${[26, 94].map((x) => `<circle cx="${x}" cy="0" r="10" fill="#2b2b33"/><circle cx="${x}" cy="0" r="5" ${hc('#c9cdd4', '#5a5e78')}/><circle cx="${x}" cy="0" r="1.6" fill="#2b2b33"/><path d="M${x - 6} -6 a8.5 8.5 0 0 1 6 -2.4" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.4"/>`).join('')}
      <g class="tlamp"><ellipse cx="124" cy="-16" rx="6" ry="4.6" fill="#fff3c0" fill-opacity=".75"/><ellipse cx="119" cy="-17" rx="3.6" ry="4.2" fill="#fffbe8"/></g></g></g>`, null, [102, F - 50, 240, F + 30])}
    ${benchProps(220, F + 44, 66)}${benchProps(760, F + 44, 66)}${landProp(95, [628, 660, 692].map(bike).join(''), null, [614, F, 732, F + 42])}
    ${yHeroHtml()}
    ${busPoleHtml('station')}
    <div class="ysel"></div>`;
}
// the road along the front of a place out by bus (2026-11-10): the bus runs on it (BUS_LANE), the stop by its kerb
const busRoad = () => `<rect class="asphalt" x="-20" y="326" width="1240" height="44"/><path class="rline dash" d="M-20 350 H1220"/><rect class="kerb" x="-20" y="322" width="1240" height="5"/>`;
// out where the bus goes: the hero, the people there, the stop's pole and its button (the bus home and on)
function busPoleHtml(place) {
  const at = BUS_AT[place], k = yScale(at.Y);
  return `<div class="busstop" aria-hidden="true" style="width:30px;height:120px;margin-left:${at.X + 40}px;bottom:${at.Y}px;transform-origin:0 100%;transform:scale(${(k * 1.6).toFixed(3)});z-index:${300 - at.Y}"><svg viewBox="0 0 30 120"><rect x="13" y="20" width="4" height="94" ${hc('#8d9097', '#3a3c58')}/><rect x="13" y="20" width="1.4" height="94" fill="#fff" fill-opacity=".25"/><path d="M6 120 Q6 112 15 112 Q24 112 24 120 Z" ${hc('#a9a497', '#2c2e4c')}/><path d="M8 116 H22" stroke="#2b1c12" stroke-opacity=".12" stroke-width="1"/><circle cx="15" cy="16" r="13" ${hc('#ffffff', '#9da2c8')}/><circle cx="15" cy="16" r="13" fill="none" ${hs('#2f7a5a', '#2a4a5a')} stroke-width="3"/><path d="M6.5 11 A10 10 0 0 1 15 5.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><text x="15" y="20" text-anchor="middle" font-size="9" font-weight="700" ${hc('#2f7a5a', '#2a4a5a')} font-family="system-ui, sans-serif">バス</text></svg></div>
    ${TOWNEV.castHtml(place)}
    <button type="button" class="thing bus-btn" data-act="bus-stop" aria-label="公車站" style="margin-left:${at.X - 20}px;bottom:${at.Y}px;width:90px;height:110px"><span class="tag">${ySign('bus', '搭公車')}</span></button>`;
}
// 月の湯 (test, 2026-11-09), an old public bath up the bus line: a wooden front under a tiled roof, its noren split 男 (blue) and
// 女 (red) with ゆ on them, the chimney with its name, a bench outside and the milk machine; lit warm by night
function sentoHtml() {
  const F = 236;
  // 2026-11-10: the bath's tall chimney over the roofs with smoke drifting off it, a tiled roof with a 唐破風 over the door, the
  // noren swaying, steam off the roof, lattice windows, a red lantern, warm light from the door by night, a cat asleep on the bench
  const house = (x, w, top) => `<rect x="${x}" y="${top}" width="${w}" height="${F - top}" ${hc('#e6dccb', '#1e2042')}/><path d="M${x - 8} ${top + 4} L${x + w / 2} ${top - 26} L${x + w + 8} ${top + 4} Z" ${hc('#5a6470', '#15163a')}/><rect class="lit" x="${x + 14}" y="${top + 18}" width="18" height="16"/>`;
  const puff = (k) => `<g transform="translate(900 -306)"><circle  r="16" ${hcx('fx-smoke', '#e8e6e2', '#8a8cae', `animation-delay:-${k * 1.75}s`)}/></g>`;
  const steam = (x, k) => `<g transform="translate(${x} 70)"><ellipse  rx="14" ry="10" ${hcx('fx-steam', '#ffffff', '#9a9ec8', `animation-delay:-${k * 1.5}s`)}/></g>`;
  // 2026-11-11 (the user: finer): the noren hung on a wooden rod with capped ends, each panel darker where it loops over the rod,
  // a turned-up hem and a soft fold; ゆ and 男／女 on the middle panel now sway with it
  const noren = (x, c, sign) => `${[0, 1, 2].map((k) => `<g class="fx-sway" style="animation-delay:-${k * 0.5}s"><path d="M${x + k * 35} 138 h34 v54 h-34 Z" fill="${c}"/><path d="M${x + k * 35} 138 h34 v6 h-34 Z" fill="#1c1210" fill-opacity=".22"/><path d="M${x + k * 35} 188.6 h34 v3.4 h-34 Z" fill="#fff" fill-opacity=".14"/><path d="M${x + k * 35 + 26} 145 v43" stroke="#1c1210" stroke-opacity=".1" stroke-width="3"/>
    ${k === 1 ? `<text x="${x + 52}" y="174" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" font-family="serif">ゆ</text><text x="${x + 52}" y="155" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity=".9" font-family="system-ui, sans-serif">${sign}</text>` : ''}</g>`).join('')}<path d="M${x - 2} 137.6 H${x + 107}" ${hs('#8a5a30', '#3a2c40')} stroke-width="3"/><path d="M${x - 3} 135.6 v4 M${x + 108} 135.6 v4" ${hs('#3b2a1c', '#1c1830')} stroke-width="2.4"/>`;
  // the lattice windows (finer): two thin cross rails through the bars, a shade under the top rail and a sill below, the bars caught
  // by the light on one side
  const lattice = (x) => `<rect x="${x}" y="140" width="92" height="62" ${hc('#cfe6ec', '#ffd98a')}/><path d="M${x} 140 h92 v7 h-92 Z" fill="#2b1c12" fill-opacity=".1"/><path d="M${x} 161 h92 M${x} 181 h92" ${hs('#6e4a2c', '#3a2c40')} stroke-width="1.4"/>${Array.from({ length: 9 }, (_, k) => `<path d="M${x + 6 + k * 10} 140 v62" ${hs('#6e4a2c', '#3a2c40')} stroke-width="3"/>`).join('')}
    <path d="${Array.from({ length: 9 }, (_, k) => `M${x + 4.9 + k * 10} 142 v58`).join(' ')}" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/><rect x="${x - 4}" y="136" width="100" height="6" ${hc('#5a3b28', '#2a2440')}/><rect x="${x - 4}" y="200" width="100" height="6" ${hc('#5a3b28', '#2a2440')}/><path d="M${x - 4} 206 h100 v3 h-100 Z" fill="#2b1c12" fill-opacity=".14"/><path d="M${x - 4} 136 h100 v1.4 h-100 Z" fill="#fff" fill-opacity=".14"/>`;
  // the cat on the bench (2026-11-11, the user: finer, like the bakery's): a ginger tabby asleep, curled up with its head on its
  // paws, eyes shut, a cream muzzle and paws, stripes over its back and brow, pink in its ears; its sides rise and fall and its
  // tail's tip twitches now and then. Stroked (purr): it nuzzles up, an ear flicks, the tail curls, it blushes
  const catG = ['#e6a65a', '#5a4a3a'], catS = ['#c27c3a', '#4a3a2e'], catW = ['#f6e6cc', '#6a5e54'], catIn = ['#ecaaa4', '#6a5a70'], catInk = ['#4a3a2c', '#24243a'], fine = 'stroke="#2b1c12" stroke-opacity=".22" stroke-width=".7"';
  const cat = `<g data-fx="scat"><g transform="translate(334 ${F + 47})"><ellipse cx="0" cy=".6" rx="19" ry="1.8" fill="#2b1c12" fill-opacity=".16"/>
    <g class="ctail fx-flick"><path d="M-13 -2.4 C-19 -.4 -25 -1.6 -27.6 -6.6 C-28.6 -8.6 -28 -10.4 -26.4 -10.6" fill="none" ${hs(...catG)} stroke-width="3.6"/><path d="M-27.6 -6.6 C-28.6 -8.6 -28 -10.4 -26.4 -10.6" fill="none" ${hs(...catS)} stroke-width="3.6"/></g>
    <g class="fx-breathe"><path d="M-16 0 C-18.4 -9 -12 -17.6 -1 -18 C9 -18.4 17.4 -13 18 -5 C18.2 -2 17 0 15 0 Z" ${hc(...catG)} ${fine}/><path d="M-10 -15.4 q1.6 3 .6 5.6 M-5.4 -17.2 q1.6 3 .8 6 M-.6 -17.8 q1.4 3 .6 5.6" fill="none" ${hs(...catS)} stroke-width="1.3"/>
      <path d="M-14 -3 C-12 -9 -6 -11.4 -1.6 -8.6" fill="none" ${hs(...catS)} stroke-width="1"/><path d="M-14 0 C-8 -3.6 6 -3.6 14 0 Z" fill="#2b1c12" fill-opacity=".1"/><ellipse cx="4.4" cy="-1.2" rx="3.4" ry="1.9" ${hc(...catW)} ${fine}/><ellipse cx="10.6" cy="-1.1" rx="3.2" ry="1.8" ${hc(...catW)} ${fine}/>
      <g class="chead"><path d="M11.2 -15.6 L15.4 -21.6 Q16.3 -22.3 16.6 -21.3 L17.4 -12.4 Z" ${hcx('ear', ...catG)} ${fine}/><path d="M2.2 -12.4 L2.9 -21.4 Q3.2 -22.4 4.1 -21.7 L8.2 -15.8 Z" ${hc(...catG)} ${fine}/><path d="M3.4 -14.4 L3.9 -19.4 L6.8 -16.4 Z" ${hc(...catIn)}/>
        <path d="M1.6 -9.4 C1.6 -14.6 5.2 -17.4 9.8 -17.4 C14.4 -17.4 18 -14.6 18 -9.6 C18 -5.4 14.4 -3.2 9.8 -3.2 C5.2 -3.2 1.6 -5.4 1.6 -9.4 Z" ${hc(...catG)} ${fine}/><path d="M12.4 -16.4 L15.3 -19.4 L15.9 -14.4 Z" ${hc(...catIn)}/>
        <path d="M9.8 -17 v2.4 M7.6 -16.6 l.6 2 M12 -16.6 l-.6 2" fill="none" ${hs(...catS)} stroke-width="1"/><ellipse cx="9.8" cy="-6.6" rx="3.6" ry="2.5" ${hc(...catW)}/>
        <g class="blush"><ellipse cx="4.6" cy="-7.2" rx="1.8" ry="1" fill="#f0a0a0" fill-opacity=".45"/><ellipse cx="15" cy="-7.2" rx="1.8" ry="1" fill="#f0a0a0" fill-opacity=".45"/></g>
        <path d="M5.4 -10.2 q1.5 1.4 3 0 M11.2 -10.2 q1.5 1.4 3 0 M8.3 -6.2 q.75 .8 1.5 0 q.75 .8 1.5 0" fill="none" ${hs(...catInk)} stroke-width=".9"/><path d="M9 -7.8 h1.6 l-.8 .9 Z" fill="#d07a7a"/>
        <path d="M5.8 -6.8 l-4.4 -.6 M5.8 -5.8 l-4.2 .6 M13.8 -6.8 l4.4 -.6 M13.8 -5.8 l4.2 .6" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/></g></g></g></g>`;
  // the milk machine (finer): a sheen along its top, the sign framed, its three bottles (milk, coffee milk, fruit milk) with their
  // caps in a lit case, a button under each, the coin slot and the drop below; the bikes by the laundromat as the station's
  const pot = (x) => `<path d="M${x - 14} ${F - 22} h28 l-4 22 h-20 Z" ${hc('#a8604a', '#3a2c40')}/>${[[-8, -40], [0, -48], [8, -40], [-4, -34], [5, -32]].map(([dx, dy]) => `<ellipse cx="${x + dx}" cy="${F + dy}" rx="8" ry="5" transform="rotate(${dx * 4} ${x + dx} ${F + dy})" ${hc('#5f9a4a', '#16243a')}/>`).join('')}`;
  return `<svg class="land tall sento-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${house(10, 120, 150)}${house(150, 110, 160)}${house(980, 120, 150)}${house(1110, 100, 162)}
      <rect x="992" y="170" width="96" height="16" rx="2" ${hc('#2f7a9a', '#1c2a44')}/><text x="1040" y="182" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">コインランドリー</text>
      <rect x="994" y="190" width="92" height="40" ${hc('#dfe8ec', '#ffe2a0')}/>${[1014, 1040, 1066].map((x, k) => `<rect x="${x - 11}" y="196" width="22" height="30" rx="2" ${hc('#f4f3ee', '#4a4c72')}/><circle cx="${x}" cy="213" r="8" ${hc('#6a8aa8', '#2a3060')}/><g class="fx-spin" style="animation-delay:-${k * 0.4}s;transform-origin:${x}px 213px"><path d="M${x - 5} 213 a5 5 0 0 1 10 0" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><circle cx="${x - 2}" cy="216" r="1.6" fill="#e86f5e"/></g>`).join('')}
      ${[0, 1, 2, 3].map(puff).join('')}
      <path d="M876 ${F} L884 -300 H916 L924 ${F} Z" ${hc('#cfc7b8', '#2a2c4c')}/><path d="M906 -300 H916 L924 ${F} H910 Z" fill="#2b1c12" fill-opacity=".08"/><path d="M886 -294 L879 ${F}" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
      <rect x="878" y="-308" width="44" height="5" rx="1" ${hc('#5f5a52', '#16172e')}/><rect x="880" y="-303" width="40" height="9" ${hc('#6f6a62', '#1c1d3c')}/><path d="M879 -308 h42 v2 h-42 Z" fill="#1c1210" fill-opacity=".35"/><path d="M880 -294 h40 v3 h-40 Z" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="882" y="-270" width="36" height="8" ${hc('#c8453a', '#4a2030')}/><rect x="882" y="-254" width="36" height="8" ${hc('#c8453a', '#4a2030')}/><path d="M908 -270 h10 v8 h-10 Z M908 -254 h10 v8 h-10 Z" fill="#2b1c12" fill-opacity=".12"/>
      ${vText(900, -236, '月の湯', 20, `font-weight="700" ${hc('#3b2a1c', '#c9c4e8')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => `<path d="M${878 + k * 0.6} ${-120 + k * 30} h${44 - k * 1.2}" ${hs('#a8a090', '#1c1d3c')} stroke-width="1.4"/>`).join('')}
      <rect x="330" y="116" width="500" height="${F - 116}" ${hc('#a8743f', '#2a2440')}/>${Array.from({ length: 24 }, (_, k) => `<path d="M${340 + k * 20} 120 V${F}" ${hs('#8a5a30', '#221c38')} stroke-width="1.4"/>`).join('')}
      <path d="M292 126 Q306 120 334 116 L382 70 H778 L826 116 Q854 120 868 126 Z" ${hc('#4a5468', '#141632')}/>${[80, 90, 100, 110].map((yy) => `<path d="M${382 - (yy - 70) * 1.1} ${yy} H${778 + (yy - 70) * 1.1}" ${hs('#5f6a80', '#1e2242')} stroke-width="1.6"/>`).join('')}
      <rect x="372" y="62" width="416" height="10" rx="3" ${hc('#3a4254', '#10122a')}/><path d="M364 72 q-4 -16 10 -18 l4 18 Z M796 72 q4 -16 -10 -18 l-4 18 Z" ${hc('#3a4254', '#10122a')}/>
      ${steam(420, 0)}${steam(740, 1)}${steam(600, 2)}
      ${lattice(350)}${lattice(718)}
      <rect x="470" y="128" width="220" height="${F - 128}" ${hc('#3a2a20', '#ffd98a')}/>
      <ellipse class="glow" cx="580" cy="${F + 10}" rx="260" ry="90" fill="url(#glw)"/>
      ${noren(472, '#2f5a9a', '男')}${noren(582, '#c8453a', '女')}
      <path d="M446 132 C474 130 488 86 580 80 C672 86 686 130 714 132 L714 122 C690 120 674 68 580 62 C486 68 470 120 446 122 Z" ${hc('#4a5468', '#141632')}/>
      <path d="M446 132 C474 130 488 86 580 80 C672 86 686 130 714 132" ${hs('#efe6d6', '#5a5c82')} stroke-width="6"/><path d="M572 80 l8 10 l8 -10" ${hs('#d9b04a', '#a88a4a')} stroke-width="3"/>
      <rect x="532" y="94" width="96" height="28" rx="3" ${hc('#f3e7cc', '#e8dcb4')}/><text x="580" y="114" text-anchor="middle" font-size="18" font-weight="700" fill="#3b2a1c" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">月の湯</text>
      <g class="fx-sway"><path d="M452 130 v6" ${hs('#2b2b33', '#1c1d3c')} stroke-width="1.6"/><ellipse cx="452" cy="152" rx="11" ry="15" ${hc('#d84a3a', '#ff8a5a')}/><path d="M442.4 144.6 q9.6 2.4 19.2 0 M442.4 159.4 q9.6 2.4 19.2 0 M444.6 140 q7.4 1.6 14.8 0 M444.6 164 q7.4 1.6 14.8 0" fill="none" stroke="#8a2a22" stroke-opacity=".4" stroke-width=".8"/>
        <ellipse cx="447" cy="148" rx="2.6" ry="6.6" fill="#fff" fill-opacity=".22"/><text x="452" y="157" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="serif">ゆ</text><rect x="447" y="135.4" width="10" height="3" rx="1" fill="#2b2b33"/><rect x="447" y="165.6" width="10" height="3" rx="1" fill="#2b2b33"/><path d="M450 168.6 v4 M452 168.6 v5 M454 168.6 v4" stroke="#d84a3a" stroke-width=".9"/></g>
      <circle class="glow" cx="452" cy="152" r="40" fill="url(#glw)"/>
      ${pot(456)}${pot(704)}
      <g data-fx="milk"><rect x="160" y="${F - 92}" width="62" height="92" rx="4" ${hc('#3f7ac8', '#22305e')}/><path d="M164 ${F - 92} h54 q4 0 4 4 v1 h-62 v-1 q0 -4 4 -4 Z" fill="#fff" fill-opacity=".2"/><path d="M212 ${F - 88} h6 q4 0 4 4 v80 q0 4 -4 4 h-6 Z" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="168" y="${F - 84}" width="46" height="34" rx="2" ${hc('#fbf7ec', '#cfd6ff')}/><rect x="170.5" y="${F - 81.5}" width="41" height="29" rx="1" fill="none" ${hs('#9cc0e8', '#5a66a8')} stroke-width="1"/>
      <text x="191" y="${F - 62}" text-anchor="middle" font-size="10" font-weight="700" ${hc('#3f7ac8', '#22305e')} font-family="system-ui, sans-serif">牛乳</text><rect x="168" y="${F - 45}" width="46" height="19" rx="2" ${hc('#dfe8f0', '#3a4a80')}/>
      ${[[172, '#f6f3ec', '#cfd6ff', '#3f7ac8'], [186, '#c8a27a', '#8a7a8a', '#6e4f3a'], [200, '#f2d27a', '#a89a6a', '#e8913a']].map(([x, c, n, cap]) => `<path d="M${x + 1} ${F - 28} V${F - 36} Q${x + 1} ${F - 38} ${x + 2.6} ${F - 39.4} V${F - 41} H${x + 7.4} V${F - 39.4} Q${x + 9} ${F - 38} ${x + 9} ${F - 36} V${F - 28} Z" ${hc(c, n)}/><rect x="${x + 2.2}" y="${F - 42.6}" width="5.6" height="2.4" rx=".8" fill="${cap}"/><path d="M${x + 2.6} ${F - 35} v5" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/><circle cx="${x + 5}" cy="${F - 21}" r="1.8" ${hc('#e86f5e', '#ff9a7a')}/>`).join('')}
      <rect x="214.6" y="${F - 25}" width="2.4" height="7" rx="1" fill="#1c2040"/><rect x="172" y="${F - 13}" width="38" height="7" rx="2" fill="#1c2040" fill-opacity=".55"/></g><ellipse class="glow" cx="191" cy="${F - 50}" rx="70" ry="60" fill="url(#glc)"/>
      ${[972, 1004].map((x, i) => cityBike(x, F - 10, 10, [['#e6a23c', '#4a3a30'], ['#5f88b2', '#2a3a6a']][i])).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${[[806, 0], [834, 0], [862, 0], [820, 1], [848, 1], [834, 2]].map(([x, r]) => `<path d="M${x - 12} ${F - 14 - r * 14} h24 l-3 14 h-18 Z" ${hc('#f2c94c', '#5a5030')}/><path d="M${x - 12} ${F - 14 - r * 14} h24" ${hs('#d9a43a', '#3a3420')} stroke-width="2"/><text x="${x}" y="${F - 4 - r * 14}" text-anchor="middle" font-size="5.5" font-weight="700" fill="#d0453c" font-family="system-ui, sans-serif">ケロリン</text>`).join('')}
      <path d="M262 ${F} L272 ${F - 58} H306 L316 ${F}" fill="none" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><rect x="268" y="${F - 56}" width="42" height="40" rx="2" ${hc('#fbf7ec', '#3a3b62')}/>${vText(289, F - 51, '営業中', 10, `font-weight="700" ${hc('#c8453a', '#ff9a7a')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
      ${busRoad()}
    </svg>
    ${benchProps(250, F + 47, 63, 110, cat)}
    ${yHeroHtml()}
    ${busPoleHtml('sento')}
    <div class="ysel"></div>`;
}
// the yard's signs (1.2.0), like 書房's: a round sign each, its words in it for a moment when tapped; they rest out of sight 4 s
// after the last touch (renderOutside), the mailbox's not while letters wait
const ySign = (name, words) => `${icon(name)}<span class="tag-name">${words}</span>`;
const mailWords = (n) => (n ? `信箱・${n} 封信` : '信箱');
let yNamedT = 0;
function yNamed(el) {
  const yard = el.closest('.yard'); if (!yard) return;
  yard.querySelectorAll('.thing.named').forEach((t) => t.classList.remove('named'));
  el.classList.add('named'); clearTimeout(yNamedT); yNamedT = setTimeout(() => el.classList.remove('named'), 1800);
}
// a thing in the yard tapped: the hero walks over, turns to it, then the thing does its bit
function yUse(el, to, fn) {
  yNamed(el);
  const yard = el.closest('.yard');
  if (!yard || !yard.querySelector('.yhero')) { fn(); return; }
  yHeroWalk(yard, to, () => { yh.back = true; yh.turn = false; yHeroPlace(yard); setTimeout(fn, 120); });
}
// the Halloween witch (1.2.2): far off in the yard's night sky, about 20 px across, over and back while Halloween is on by
// the server's day (SALES.halloween, as the limited sale; the test site's 限時預覽 too) until she is caught — by night only (the
// CSS: 永夜 always, 永晝 never). A tap drops her off her broom for 100 言靈, once a Halloween (koto.found, by the year)
const WITCH_GIFT = 100;
const witchId = (day) => `witch-${day.slice(0, 4)}`;
const WITCH_ART = {   // facing right in a 28 × 20 box: the broom, the witch, her hat (each falls its own way)
  broom: '<path d="M7.5 16.2 L27.2 12.6" fill="none" stroke-width="1.25"/><path d="M9 15.2 C6 14.6 3 13.4 .6 12.8 C1.4 14.6 1.2 16.8 .4 18.8 C3.4 18.4 6.4 17.6 9.2 17.2 Z"/>',
  rider: '<path d="M13.4 8.4 C10.8 8.6 8 8.2 5.6 7 C6.8 9 8.6 10.8 11.6 11.6 Z"/><path d="M12.4 9.6 C11.2 11.6 10.2 13.6 9.4 15.4 C11.8 15.6 14.6 15.4 17.2 14.6 C16.4 12.8 15.8 11 15.4 9.4 Z"/>'
    + '<path d="M12.8 10.4 C12.6 8.8 13.2 7.8 14.4 7.6 C15.6 7.8 16 9 15.6 10.6 Z"/><circle cx="15.3" cy="6.5" r="1.7"/>'
    + '<path d="M14.6 5.3 C12.8 5.3 11 5.9 9.6 6.8 C10.6 6.9 11.2 7.2 11.6 7.6 C10.8 8 10.2 8.6 9.8 9.2 C11.6 9 13.4 8.4 14.8 7.4 Z"/>'
    + '<path d="M15.6 9 L19.6 13.4" fill="none" stroke-width="1"/><path d="M16.4 14.6 L18.4 17.2 L20.7 16.7" fill="none" stroke-width="1.05" stroke-linejoin="round"/>',
  hat: '<path d="M11.8 5.3 Q15 4.1 18.8 4.9 Q15.2 6.1 11.8 5.3 Z"/><path d="M13.4 5 L16.9 4.8 L14.9 1.8 Q14.3 .9 12.4 .8 Q13.6 1.6 13.4 5 Z"/>'
};
function witchHtml(id) {   // somewhere along her minute when the yard opens
  return `<div class="witch" data-witch="${id}" style="animation-delay:-${(Math.random() * 60).toFixed(1)}s"><div class="w-bob"><i class="w-spark"></i><i class="w-spark"></i><i class="w-spark"></i>
    <div class="w-fig">${['broom', 'rider', 'hat'].map((p) => `<svg class="w-${p}" viewBox="0 0 28 20">${WITCH_ART[p]}</svg>`).join('')}</div>
    <button type="button" class="w-hit" data-act="witch" aria-label="巫婆"></button></div></div>`;
}
// 2026-11-14 (the user): at Christmas Santa takes her place — his sleigh behind two reindeer, the lead one's red nose aglow, over the
// yard's night sky the same way; a tap and three presents tumble out of it for 100 言靈 and off he flies, once a Christmas
const SANTA_GIFT = 100;
const festId = (key, who, day) => `${who}-${(saleSpan(key, day) || [day])[0].slice(0, 4)}`;   // by the year the festival began (Christmas runs into January)
const santaId = (day) => festId('christmas', 'santa', day);
const SANTA_ART = (() => {   // facing right in a 56 × 20 box: the two reindeer and their reins, the sleigh with Santa and his sack
  const deer = (x) => `<ellipse cx="${x}" cy="9" rx="4.4" ry="2.2"/><path d="M${x + 2.6} 8.2 L${x + 4.8} 4.8 L${x + 6} 5.6 L${x + 4.2} 9.4 Z"/><ellipse cx="${x + 6.2}" cy="4.6" rx="1.7" ry="1.15"/>`
    + `<path d="M${x + 5.4} 3.8 L${x + 4.4} 1 M${x + 4.8} 2.2 L${x + 3.4} 1.4 M${x + 6} 3.6 L${x + 6.4} .8" fill="none" stroke-width=".7"/>`
    + `<path d="M${x + 3} 10 L${x + 6.4} 12.6 M${x + 2.2} 10.6 L${x + 5} 13.6 M${x - 3} 10 L${x - 6.6} 11.4 M${x - 3.6} 9.4 L${x - 7.2} 9.8" fill="none" stroke-width=".9"/><path d="M${x - 4.2} 8.2 l-1.4 -1" fill="none" stroke-width=".8"/>`;
  return {
    deer: deer(36) + deer(48) + '<path d="M24.6 10.4 Q30 9 32.4 9.6 M40 9.6 Q42 9 44 9.4" fill="none" stroke-width=".5"/>',
    sleigh: '<circle cx="9.6" cy="6.4" r="3.2"/><path d="M9.2 3.4 l.8 -1.2 l.8 1.2 Z"/><circle cx="14.6" cy="6.8" r="3.2"/><circle cx="16.6" cy="3.6" r="1.6"/><path d="M15.4 2.6 L18.2 2.4 L13.6 .4 Z"/><circle cx="13.2" cy=".6" r=".8"/>'
      + '<path d="M7.6 8.4 H23.4 Q26.2 8.4 25.4 11.6 L24.4 14.6 H10.4 Q7.4 14.6 6.8 11.6 Z"/><path d="M4.4 17.2 H23.6 Q27 17.2 27.6 14.2 M11 14.6 V17.2 M21 14.6 V17.2" fill="none" stroke-width=".9"/>'
  };
})();
function santaHtml(id) {
  return `<div class="santa" data-witch="${id}" style="animation-delay:-${(Math.random() * 60).toFixed(1)}s"><div class="w-bob">
    <div class="w-fig">${['sleigh', 'deer'].map((p) => `<svg class="s-${p}" viewBox="0 0 56 20">${SANTA_ART[p]}</svg>`).join('')}<i class="s-nose"></i></div>
    ${[0, 1, 2].map((i) => `<i class="s-gift g${i}"></i>`).join('')}<button type="button" class="w-hit" data-act="santa" aria-label="聖誕老公公"></button></div></div>`;
}
function yWitch(yard) {   // the festival's visitor joins the sky, or leaves it (found on another device, the festival over); the server's day asked if not known
  const put = (day) => {
    if (!yard.isConnected) return;
    const sky = yard.querySelector('.sky .night');
    [['halloween', witchId, witchHtml, '.witch'], ['christmas', santaId, santaHtml, '.santa']].forEach(([key, idOf, html, sel]) => {
      const d = day || (salePreview(key) ? todayStr() : null), had = yard.querySelector(sel);
      const id = d && (salePreview(key) || saleOn(key, d)) && !state.koto.found[idOf(d)] ? idOf(d) : null;
      if (had && !had.classList.contains('fall') && !had.classList.contains('gave') && had.dataset.witch !== id) had.remove();
      if (id && sky && !yard.querySelector(sel)) sky.insertAdjacentHTML('beforeend', html(id));
    });
  };
  const day = saleNow();
  if (day || salePreview('halloween') || salePreview('christmas')) put(day); else saleClock().then(put);
}
function witchCatch(el) {
  const w = el.closest('.witch'), yard = el.closest('.yard'), id = w && w.dataset.witch;
  if (!w || !id || w.classList.contains('fall')) return;
  [w, w.querySelector('.w-bob')].forEach((x) => { const t = getComputedStyle(x).transform; x.style.animation = 'none'; x.style.transform = t === 'none' ? '' : t; });   // held where the tap found her
  w.classList.add('fall');
  setTimeout(() => w.remove(), 2900);
  if (state.koto.found[id] || !yard) return;   // already caught on another device: she only falls
  state.koto.found[id] = WITCH_GIFT; saveState(); sfxReady();   // the sound woken inside the tap, so the coins' 叮 can play later (iOS)
  const r = w.querySelector('.w-fig').getBoundingClientRect();
  witchCoins(yard, [r.left + r.width / 2, r.top + r.height / 2], WITCH_GIFT);
}
function santaCatch(el) {   // Santa tapped: held where he was, three presents tumble out, the bells ring, and he climbs away out of sight
  const w = el.closest('.santa'), yard = el.closest('.yard'), id = w && w.dataset.witch;
  if (!w || !id || w.classList.contains('gave')) return;
  [w, w.querySelector('.w-bob')].forEach((x) => { const t = getComputedStyle(x).transform; x.style.animation = 'none'; x.style.transform = t === 'none' ? '' : t; });
  w.classList.add('gave');
  setTimeout(() => w.remove(), 3200);
  if (state.koto.found[id] || !yard) return;
  state.koto.found[id] = SANTA_GIFT; saveState(); sfxReady(); playSfx('up');
  const r = w.querySelector('.w-fig').getBoundingClientRect();
  witchCoins(yard, [r.left + r.width * 0.3, r.top + r.height / 2 + 10], SANTA_GIFT);
}
// her 言靈 seen (1.2.2): while she falls, a ring of light and ten あ burst out where she slipped; once she is behind the
// hills they fly one by one into the 言靈 button up top, which bounces and counts up a tenth each (a rising 叮 with 答題音效 on),
// glows at the last, and +n rises beside it; the buttons are kept up meanwhile. The button put away (擺設, the dressing room):
// the pop up top says it; motion reduced: no flight, the new count at once
function witchCoins(yard, at, n) {
  const kb = yard.querySelector('.yard-tools .study-koto'), wake = () => { if (yard._wake) yard._wake(); };
  if (kb && kb.classList.contains('yen')) purseFill(kb, false);   // showing 円: 言靈 for the coins flying in
  const num = kb && kb.querySelector('span');
  if (!num || !kb.getBoundingClientRect().width || getComputedStyle(kb).visibility !== 'visible') { setTimeout(() => kotoPop(n), 450); return; }
  const from = kotoBalance() - n;
  const end = () => {
    if (!kb.isConnected) return;
    kotoButtons(yard); kb.classList.add('glow'); setTimeout(() => kb.classList.remove('glow'), 900);
    const r = kb.getBoundingClientRect(), p = document.createElement('div');
    p.className = 'koto-plus'; p.textContent = `+${n}`; p.style.left = `${r.left - 8}px`; p.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 1700); wake();
  };
  num.textContent = from; wake();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { end(); return; }
  const go = ([x, y], s) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(2)})`;
  setTimeout(() => {   // the ring stands where she was (its own animation scales it)
    const b = document.createElement('i'); b.className = 'koto-burst'; b.style.left = `${at[0]}px`; b.style.top = `${at[1]}px`;
    document.body.appendChild(b); setTimeout(() => b.remove(), 600);
  }, 350);
  let got = 0;
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * 2 * Math.PI + (i % 3) * 0.25, d = 20 + (i * 7) % 22, spot = [at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d * 0.8];
    const c = document.createElement('i'); c.className = 'koto-coin'; c.innerHTML = kotoIcon(); c.style.opacity = '0'; c.style.transform = go(at, 0.3); document.body.appendChild(c);
    c.animate([{ transform: go(at, 0.3), opacity: 0 }, { transform: go(spot, 1), opacity: 1 }], { duration: 450, delay: 350 + i * 12, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'forwards' });
    setTimeout(() => {   // up and over into the button, along a curve (its points sampled), faster as it goes
      if (!kb.isConnected) { c.remove(); return; }   // the yard was left meanwhile
      const t = kb.querySelector('.koto-i').getBoundingClientRect(), to = [t.left + t.width / 2, t.top + t.height / 2], via = [spot[0] + (i - 4.5) * 5, Math.min(spot[1], to[1]) - 36];
      const path = Array.from({ length: 13 }, (_, j) => { const s = j / 12, u = 1 - s;
        return { transform: go([u * u * spot[0] + 2 * u * s * via[0] + s * s * to[0], u * u * spot[1] + 2 * u * s * via[1] + s * s * to[1]], 1 - 0.35 * s), opacity: 1 }; });
      c.getAnimations().forEach((x) => x.cancel());
      c.animate(path, { duration: 650, easing: 'cubic-bezier(.45, 0, .8, .6)', fill: 'forwards' }).onfinish = () => {
        c.remove(); if (!kb.isConnected) return;
        got++; num.textContent = from + Math.round(n * got / 10);
        kb.classList.remove('bump'); void kb.offsetWidth; kb.classList.add('bump');
        playSfx('coin', got - 1); wake();
        if (got === 10) end();
      };
    }, 1500 + i * 80);
  }
}
// a place's own sky by day (2026-11-10, the user: every place had the same sky): its clouds (heights, sizes, pace), where the
// plane is, and birds of its own — gulls over the sea, crows by the shrine and the castle — worked out from its name
const SKY_LOCAL = { beach: 'gull', harbor: 'gull', shrine: 'crow', castle: 'crow' };
function placeSky(place) {
  if (place === 'yard') return { clouds: [[10, 1, 110, 20], [24, 0.7, 140, 80], [5, 0.85, 125, 55], [34, 0.6, 160, 120]], plane: [7, 20], fliers: [] };
  let a = [...place].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
  const n = (lo, hi) => Math.round(lo + rnd() * (hi - lo));
  return {
    clouds: Array.from({ length: n(3, 5) }, () => [n(3, 36), n(50, 110) / 100, n(100, 180), n(0, 170)]),
    plane: [n(4, 16), n(0, 75)],
    fliers: [[n(12, 20), n(26, 34), n(0, 30)], [n(20, 28), n(36, 46), n(0, 40)], [n(14, 24), n(30, 40), n(10, 40)]]
  };
}
function yardHtml(pct, place = 'yard') {
  const f = pct / 100, mail = mailCount(), yw = yardWorldW(), street = place !== 'yard', balloon = Math.random() < 0.16;   // the hot-air balloon now and then (the user): about one place drawn in six
  const star = (s) => `<i class="st${s.dip ? ' dip' : ''}${s.t <= f ? ' on' : ''}" data-t="${s.t}" style="left:${s.x}%;top:${s.y}%;--s:${s.s}px;--d:${s.d}s;--w:-${s.w}s;--in:${f ? Math.round(s.t / f * 120) / 100 : 0}s"></i>`;
  const dip = SKY.stars.filter(s => s.dip).map(s => `${s.x} ${s.y}`);
  const sky = placeSky(place);
  const ground = 'M0 222 C60 204 120 180 210 164 C300 150 380 144 450 147 C520 149 560 150 600 150 C640 150 690 149 760 146 C840 143 920 150 1000 166 C1080 182 1150 204 1200 222';   // a hilltop: it falls away at both sides (2026-11-10)
  // a round clump of leaves (2026-11-11, the user: finer): the shade along its underside, the light on its upper left (crescents inside it)
  const under = ([x, y, r]) => `M${x - 0.97 * r} ${y + 0.25 * r} A${r} ${r} 0 0 0 ${x + 0.97 * r} ${y + 0.25 * r} A${0.97 * r} ${0.5 * r} 0 0 1 ${x - 0.97 * r} ${y + 0.25 * r} Z`;
  const lit = ([x, y, r]) => { const R = r * 0.92; return `M${(x - 0.8 * R).toFixed(1)} ${(y - 0.05 * R).toFixed(1)} A${(0.7 * R).toFixed(1)} ${(0.7 * R).toFixed(1)} 0 0 1 ${(x + 0.1 * R).toFixed(1)} ${(y - 0.84 * R).toFixed(1)} A${(1.3 * R).toFixed(1)} ${(1.3 * R).toFixed(1)} 0 0 0 ${(x - 0.8 * R).toFixed(1)} ${(y - 0.05 * R).toFixed(1)} Z`; };
  return `<div class="yard${street ? ' away ' + place : ''}${INDOOR.includes(place) ? ' indoor' : ''}${pct >= 100 ? ' full' : ''}${street ? '' : ' ground-' + yardGround()}" data-anim data-place="${place}" style="--f:${f}">
    <div class="sky" aria-hidden="true">
      <i class="tint t-grey"></i><i class="tint t-blue"></i><i class="tint t-warm"></i>
      <i class="sun"></i>
      <div class="night">
        <i class="moon"></i>
        <i class="nebula n1"></i><i class="nebula n2"></i>
        <div class="aurora"><i></i><i></i></div>
        <svg class="dipper" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M${dip.join(' L')} L${dip[3]}"/></svg>
        ${SKY.faint}${SKY.stars.map(star).join('')}
        <i class="nplane" aria-hidden="true"></i>
        <div class="meteors"><i class="meteor" style="left:6%;top:10%;--d:9s;--w:-3s"></i><i class="meteor" style="left:36%;top:3%;--d:13s;--w:-9s"></i></div>
      </div>
      <div class="dayset">
        <i class="rainbow"></i>
        <div class="clouds">${sky.clouds.map(([y, k, d, w]) => `<i class="cloud" style="top:${y}%;--k:${k};--d:${d}s;--w:-${w}s"></i>`).join('')}</div>
        ${SKY_LOCAL[place] ? `<div class="fliers ${SKY_LOCAL[place]}">${sky.fliers.map(([y, d, w], i) => `<div class="flier${i === 1 ? ' back' : ''}" style="top:${y}%;--d:${d}s;--w:-${w}s"><i></i></div>`).join('')}</div>` : ''}
        <div class="plane" aria-hidden="true" style="top:${sky.plane[0]}%;animation-delay:-${sky.plane[1]}s"><i class="trail"></i><svg viewBox="0 0 40 14"><path d="M2 7 Q6 4 30 5 Q38 5.4 39 7 Q38 8.6 30 9 Q6 10 2 7 Z" fill="#f4f6f8"/><path d="M16 6 L24 0 H27 L22 6.4 Z M16 8 L24 14 H27 L22 7.6 Z M3 7 L1 2 H4 L8 6.4 Z" fill="#dfe4ea"/><path d="M30 6 h5" stroke="#9fb0c8" stroke-width="1.2"/></svg></div>
        ${balloon ? '' : '<!--'}<div class="balloon" aria-hidden="true"><svg viewBox="0 0 40 60"><path d="M20 2 C8 2 2 11 2 20 C2 31 12 38 16 44 H24 C28 38 38 31 38 20 C38 11 32 2 20 2 Z" fill="#e8913a"/><path d="M20 2 C14 6 12 14 12 22 C12 32 15 39 16 44 H24 C25 39 28 32 28 22 C28 14 26 6 20 2 Z" fill="#f2c94c"/><path d="M20 2 C18 10 17 20 17.5 30 C18 37 18.6 41 19 44 H21 C21.4 41 22 37 22.5 30 C23 20 22 10 20 2 Z" fill="#d0574b"/><path d="M16 44 L17 50 M24 44 L23 50" stroke="#8a6a46" stroke-width=".8"/><rect x="16.5" y="50" width="7" height="6" rx="1" fill="#a8743f"/></svg></div>${balloon ? '' : '-->'}
        <div class="birds"><div class="flock">${[[52, 14], [38, 6], [38, 22], [24, 0], [24, 28]].map(([x, y]) => `<i style="left:${x}px;top:${y}px"></i>`).join('')}</div></div>
      </div>
      <div class="yworld" style="width:${yw}px;margin-left:${-yw / 2}px">
      ${place === 'beach' ? beachHtml() : place === 'town' ? townHtml() : place === 'harbor' ? harborHtml() : place === 'park' ? parkHtml() : place === 'shokudo' ? shokudoHtml() : place === 'izakaya' ? izakayaHtml() : place === 'station' ? stationHtml() : place === 'sento' ? sentoHtml() : place === 'shrine' ? shrineHtml() : place === 'castle' ? castleHtml() : street ? streetHtml() : `<svg class="mtn" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice">
        <defs><radialGradient id="shopGlow"><stop offset="0" stop-color="rgba(255,196,110,.55)"/><stop offset=".5" stop-color="rgba(255,196,110,.16)"/><stop offset="1" stop-color="rgba(255,196,110,0)"/></radialGradient></defs>
        <path class="m-far" d="M520 600 V340 C560 330 600 314 640 304 C670 296 700 294 730 298 C770 306 810 328 860 342 V600 Z"/>
        <path class="m-main" d="${HILL} V600 Z"/><path class="m-shade" d="M482 250 C494 248 506 256 520 268 C552 296 594 326 646 350 V372 C590 340 548 306 516 280 C502 268 492 258 482 250 Z"/><path class="m-rim" d="${HILL}"/>
        <path class="m-path" d="M540 342 L514 326 L546 306 L506 290 L526 272 L490 260"/>
        ${shopOpen() ? `${[[514, 326], [546, 306], [506, 290], [526, 272]].map(([x, y]) => `<circle class="p-lamp" cx="${x}" cy="${y}" r="1.4"/>`).join('')}
        <g transform="translate(482 254) scale(.8)">${SHOP_ART}</g>` : ''}${shopFog()}
      </svg>
      <svg class="land yard-land" viewBox="0 0 1200 370" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
        <g class="yard-shore">
          <path class="sea-far" d="M-20 110 H320 V118 H-20 Z"/><path class="sea" d="M-20 117 H310 V152 H-20 Z"/>
          ${[[20, 126, 26], [90, 132, 34], [170, 124, 22], [240, 136, 28]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
          <path class="foam" d="M-20 150 C70 147 170 145 300 149"/><path class="sand" d="M-20 150 C70 147 170 145 300 149 L300 160 C170 156 70 158 -20 160 Z"/>
          ${[[70, 148], [128, 146]].map(([x, y]) => `${groundShade(x + 1.6, y + 1, 4.4, 0.9)}<path d="M${x} ${y - 4} V${y + 1}" ${hs('#8a8476', '#2a2a46')} stroke-width=".8"/><path d="M${x - 5.4} ${y - 1.6} Q${x} ${y - 8} ${x + 5.4} ${y - 1.6} Z" ${hc('#e86f5e', '#4a2c48')}/><path d="M${x} ${y - 6.4} L${x - 1.8} ${y - 1.6} H${x + 1.8} Z" ${hc('#fbf7ec', '#5a4058')}/><path d="M${x - 5.4} ${y - 1.6} H${x + 5.4}" stroke="#2b1c12" stroke-opacity=".18" stroke-width=".6"/>`).join('')}
        </g>
        <path class="far" d="M190 154 C230 144 262 128 300 116 C340 106 390 98 440 106 S540 90 640 104 S860 124 960 108 C1000 100 1040 98 1080 104 V370 H190 Z"/>
        <g class="yard-market">
          <path d="M940 160 C1010 128 1100 102 1220 92 V370 H940 Z" ${hcx('lawn', '#9dbb8e', '#141a36')}/>
          ${[[1004, 146, 14], [1028, 138, 17], [1046, 147, 13], [1062, 128, 15], [1080, 140, 18], [1098, 121, 14], [1104, 134, 16], [1122, 147, 13], [1132, 115, 17], [1146, 128, 14], [1160, 109, 15], [1168, 140, 16], [1182, 120, 14], [1196, 104, 17], [1200, 133, 13], [1150, 152, 15]].sort((p, q) => p[1] - q[1]).map(([x, g, w], k) => { const h = Math.round(w * 0.7); return `<rect x="${x - w / 2}" y="${g - h}" width="${w}" height="${h}" ${hc(k % 3 ? '#efe4d2' : '#e6dccb', '#1e2042')}/><rect x="${x - w / 2}" y="${g - h}" width="${w}" height="1.8" fill="#2b1c12" fill-opacity=".16"/><rect x="${x + w / 2 - 5.2}" y="${g - h * 0.55}" width="3" height="${(h * 0.55).toFixed(1)}" ${hc('#8a6a52', '#15163a')}/>${k % 4 === 1 ? '' : `<rect x="${x - w / 2 + 2.4}" y="${g - h + 3.4}" width="3.4" height="2.8" ${hc('#c9dbe4', '#262a52')}/>`}<path d="M${x - w / 2 - 2} ${g - h + 1} L${x} ${g - h - w * 0.4} L${x + w / 2 + 2} ${g - h + 1} Z" ${hc(['#8a5a44', '#5f6f8a', '#6f5a7a', '#8a2f2a'][(k * 3) % 4], '#15163a')}/><path d="M${x} ${g - h - w * 0.4} L${x + w / 2 + 2} ${g - h + 1} H${x} Z" fill="#2b1c12" fill-opacity=".15"/>${k % 4 === 1 ? `<rect class="lit" x="${x - 3}" y="${g - h + 3}" width="5" height="4"/>` : ''}`; }).join('')}
          <path d="M1060 112 Q1110 100 1170 92" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width=".8"/>${[1072, 1094, 1116, 1138, 1160].map((x, k) => `<path d="M${x} ${108 - k * 3} l3 0 l-1.5 3 Z" fill="${['#d0574b', '#e6c23a', '#3f7ac8'][k % 3]}"/>`).join('')}
        </g>
        <path d="M-20 158 C60 156 150 154 230 164 C270 170 300 186 318 214 V370 H-20 Z" ${hcx('lawn', '#a6bd96', '#161c38')}/>
        <path d="M1220 120 C1150 124 1060 140 990 162 C950 176 920 196 900 222 V370 H1220 Z" ${hcx('lawn', '#a6bd96', '#161c38')}/>
        <path d="M74 214 L40 202 L118 190 L64 178 L150 168 L120 158" fill="none" ${hsx('trail', '#e3cf9e', '#3a3858')} stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M1128 216 L1166 200 L1084 188 L1146 174 L1066 164 L1100 152" fill="none" ${hsx('trail', '#cfc8b8', '#3a3858')} stroke-width="3.4" stroke-linejoin="round"/>
        <path class="near" d="${ground} V370 H0 Z"/><path class="ridge" d="${ground}"/>
        <path class="lane" d="${stripD(LANE, 24)}"/>${lightPool(600, 156, 70, 14)}
        ${[[240, 250, 1], [330, 300, 1.3], [420, 214, .9], [470, 340, 1.4], [520, 262, 1], [690, 236, 1], [740, 318, 1.3], [800, 200, .8], [880, 280, 1.2], [960, 236, 1], [1020, 330, 1.4], [300, 196, .8], [1080, 268, 1.1], [150, 300, 1.3]].map(([x, y, k], i) => `<path d="M${x - 6 * k} ${y} q${2 * k} ${-8 * k} ${1 * k} ${-14 * k} q${3 * k} ${6 * k} ${4 * k} ${12 * k} q${2 * k} ${-9 * k} ${6 * k} ${-12 * k} q${-1 * k} ${8 * k} ${1 * k} ${14 * k} Z" ${hcx('fx-tuft', '#6e9a5c', '#0e1630', `animation-delay:-${(i * 0.7) % 3}s`)}/>`).join('')}
        <!-- 2026-11-11 (the user: finer): the tree's trunk flaring at its roots, in shade on its right, its bark, two boughs up into a crown of six
          clumps, each in shade underneath and lit on its upper left, leaves catching the light. Shaken: the crown sways on the trunk and its
          clumps rustle, the lit leaves flicker (the trunk stays) -->
        <g data-fx="ytree">${groundShade(470, 150.5, 22, 2.4)}<path class="trunk" d="M463.8 150.6 Q466.4 148.4 466 141 L465.6 104 H472.4 L472 141 Q471.6 148.4 474.2 150.6 Z"/><path d="M470.2 106 L470.4 141 Q470.4 148 472.6 150.6 H474.2 Q471.6 148.4 472 141 L472.4 104 Z" fill="#2b1c12" fill-opacity=".2"/><path d="M467.8 117 q-.6 3.6 0 6.6 M469.4 128 q.5 3 0 6 M467.6 137 q-.4 2 0 4" fill="none" stroke="#2b1c12" stroke-opacity=".22" stroke-width=".8" stroke-linecap="round"/><path class="twig" d="M468 116 Q463 111 457 105 M470.4 114 Q476 109 482 103"/>
          <g class="crown-g"><g class="crown">${[[469, 96, 22], [452, 110, 15], [487, 108, 16], [449, 96, 10], [490, 92, 11], [469, 112, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
          <path d="${[[452, 110, 15], [487, 108, 16], [469, 112, 9]].map(under).join(' ')}" fill="#2b1c12" fill-opacity=".14"/><path class="crown-lit" d="${[[469, 96, 22], [449, 96, 10], [490, 92, 11], [452, 110, 15]].map(lit).join(' ')}"/>
          <path class="leaf-lit" d="${[[458, 84], [474, 80], [484, 98], [456, 104], [471, 103], [445, 111], [492, 112], [462, 94]].map(([x, y]) => `M${x} ${y} q2 -2.4 4.6 -1 q-2 2.4 -4.6 1 Z`).join(' ')}"/><path d="M476 92 l3 -2 M459 100 l-2 -3 M488 104 l3 -1.6 M448 104 l2 -2.6 M466 108 l2.6 -1.4 M480 114 l2 -2.4 M454 116 l3 -1" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".9" stroke-linecap="round"/></g></g>
        ${groundShade(736, 150.6, 40, 1.6)}${[700, 722, 744, 766].map(x => `<rect class="post" x="${x}" y="131" width="4" height="19" rx="1"/><rect x="${x + 2.6}" y="131.6" width="1.4" height="18" fill="#2b1c12" fill-opacity=".16"/><path d="M${x + 0.9} 131.7 h2" stroke="#fff" stroke-opacity=".3" stroke-width=".7" stroke-linecap="round"/><path d="M${x + 1.4} 140.4 v2.2 M${x + 1.6} 147 v2" stroke="#2b1c12" stroke-opacity=".14" stroke-width=".5"/>`).join('')}<path class="rail" d="M698 138 H772 M698 145 H772"/><path d="M698 139.4 H772 M698 146.4 H772" stroke="#2b1c12" stroke-opacity=".16" stroke-width=".9"/><path d="M698 137.2 H772 M698 144.2 H772" stroke="#fff" stroke-opacity=".22" stroke-width=".6"/><path d="${[700, 722, 744, 766].map((x) => `M${x + 2} 138 h.01 M${x + 2} 145 h.01`).join(' ')}" stroke="#2b1c12" stroke-opacity=".4" stroke-width="1.1" stroke-linecap="round"/>
      </svg>
      <div class="flowers">${SKY.flowers.map(q => `<i class="fl" style="left:${q.x}%;bottom:${q.y}px;--c:${q.c};--d:${q.d}s;--w:-${q.w}s"></i>`).join('')}</div>
      <div class="house">
        <i class="spill"></i>
        <svg viewBox="0 0 140 130">${houseArt()}</svg>
        <i class="win w1"></i><i class="win w2"></i><i class="win w3"></i>
        <i class="smoke"></i><i class="smoke"></i><i class="smoke"></i>
        <button type="button" class="thing enter" data-act="enter-house" aria-label="進屋"><span class="tag">${ySign('door', '進屋')}</span></button>
      </div>
      ${yHeroHtml()}
      <div class="ywares" data-sig="${yardSig()}">${yardWaresHtml()}</div>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="beach" aria-label="海邊" style="margin-left:${YARD_GATE.beach[0] - 22}px;bottom:${YARD_GATE.beach[1] - 8}px"><span class="tag">${ySign('wave', '海邊')}</span></button>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="town" aria-label="商店街" style="margin-left:${YARD_GATE.town[0] - 22}px;bottom:${YARD_GATE.town[1] - 8}px"><span class="tag">${ySign('shop', '商店街')}</span></button>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="street" aria-label="公車站" style="margin-left:${Math.round(LANE.at(1)[0]) - 32}px;bottom:4px"><span class="tag">${ySign('bus', '公車站')}</span></button>
      <div class="mailbox${mail ? ' has' : ''}">
        <svg viewBox="0 0 52 66" aria-hidden="true">
          <ellipse class="mb-shadow" cx="26" cy="64.5" rx="15" ry="2.4"/>
          <rect class="mb-post" x="23" y="33" width="6" height="32" rx="1"/><path class="mb-tone" d="M26.8 35 V64.6 H29 V35 Z"/><path class="mb-grain" d="M25 41 v6 M25.4 52 v5 M24.8 59 v3"/>
          <rect class="mb-post" x="19" y="32.2" width="14" height="3.2" rx="1"/><rect class="mb-tone" x="19" y="34.2" width="14" height="1.2"/>
          <rect class="mb-body" x="6" y="14" width="40" height="20" rx="6"/><path class="mb-tone" d="M6 27 H46 V28 A6 6 0 0 1 40 34 H12 A6 6 0 0 1 6 28 Z"/><rect class="mb-sheen" x="13" y="16.6" width="24" height="2.4" rx="1.2"/><path class="mb-rim" d="M12 14.6 H40"/><path class="mb-grain" d="M42.4 17 V31"/>
          <rect class="mb-env" x="-4" y="18.5" width="12" height="6.5" rx=".8" transform="rotate(-14 2 21.7)"/>
          <rect class="mb-lid" x="3.5" y="13" width="5.5" height="22" rx="2.2"/><path class="mb-lid mb-lidhl" d="M5 15.6 V32.4"/><rect class="mb-lid mb-knob" x="4.4" y="22.4" width="3.6" height="3" rx="1.2"/>
          <g class="mb-flag"><rect x="16" y="26.6" width="23" height="2.6" rx="1.3"/><rect x="16" y="20" width="8" height="7.5" rx="1"/></g>
          <circle class="mb-pin" cx="38" cy="27.9" r="1.6"/>
        </svg>
        <button type="button" class="thing mbox${mail ? ' mail' : ''}" data-act="mailbox" aria-label="${mailWords(mail)}"><span class="tag">${ySign('mail', mailWords(mail))}</span></button>
      </div>
      ${shopOpen() ? `<button type="button" class="thing shop-btn" data-act="yard-shop" aria-label="古道具屋" style="left:calc(50% - 118px);bottom:340px"><span class="tag">${ySign('shop', '古道具屋')}</span></button>` : ''}`}
      ${useBtnsHtml(place)}
      <i class="cloudshade" aria-hidden="true"></i><i class="cloudshade c2" aria-hidden="true"></i>
      <div class="flies">${SKY.flies.map(q => `<i style="left:${q.x}%;top:${q.y}px;--dx:${q.dx}px;--dy:${q.dy}px;--d:${q.d}s;--w:-${q.w}s"></i>`).join('')}</div>
      <div class="butterflies">${[[18, 52, 34, 16, 7.5, 1, '#c9a7ff'], [41, 40, 40, 18, 7, 2, '#ffb3d1'], [55, 66, -36, 14, 8.5, 5, '#ffe08a'], [70, 48, -30, 16, 7.8, 3, '#ffffff'], [86, 60, 32, 12, 8.2, 4, '#ffb3d1']].map(([x, t, dx, dy, d, w, c]) => `<i class="bf" style="left:${x}%;top:${t}px;--dx:${dx}px;--dy:${dy}px;--d:${d}s;--w:-${w}s;--c:${c}"></i>`).join('')}</div>
      <div class="ysel"></div>
      </div>
    </div>
    <div class="yard-tools">${sceneTools('yard-edit')}</div>
    <div class="yedit"></div>
  </div>`;
}
// the buttons up top in 書房 and the yard (1.2.0): 言靈 (to 古道具屋), 衣櫃, 擺設 (each place its own), 設定
function sceneTools(editAct) {
  const pu = purseParts();
  return `<button type="button" class="study-koto${pu.cls}" data-act="purse" aria-label="${pu.label}">${pu.html}</button><button type="button" class="study-wear" data-act="wardrobe" aria-label="衣櫃" title="衣櫃">${icon('hanger')}</button><button type="button" class="study-edit${editAct === 'yard-edit' ? ' yard-edit' : ''}" data-act="${editAct}" aria-label="擺設" title="擺設">${icon('arrange')}</button><button type="button" class="study-gear" data-act="settings" aria-label="設定" title="設定">${icon('settings')}</button>`;
}
// 書房 (1.1.0): an isometric room drawn much bigger than the screen, with the things you tap; on a phone the camera shows a part
// of it round the hero and goes along with him as he walks (1.2.0: a drag on him leads him, a swipe looks round freely, two
// fingers or the wheel zoom). ROOM.html draws it, ROOM.mount sets the camera and the gestures once it is on the page, ROOM.level
// follows today's progress in place, and ROOM.enter／pull／door play a thing's way into its page.
// The course books, one per stage (入門, 第一…第五階段; N2/N1 will add stages): their colours and spine labels, on 書房's shelf
// and on 課程 (its shelf, the stage cards as their covers)
const BOOK_COLORS = ['#e3907f', '#c8553f', '#79a46c', '#4f805c', '#5f88b2', '#3e5f8e', '#8b6aa8', '#6b4d8a', '#c79a3a', '#9b7424'];
const BOOK_LABELS = ['入門', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const bookColor = (i) => BOOK_COLORS[i % BOOK_COLORS.length];
const jMonth = (m) => (m < 10 ? '一二三四五六七八九十'[m] : m === 10 ? '十一' : '十二') + '月';   // 日めくり's month (m: 0 for January), in 書房 and on 模擬考
// the books on the shelf: one for every stage begun or passed (n), and the stage being studied (cur)
function shelfBooks() {
  const cur = stageIndex(currentStageId());
  return { n: STAGES.reduce((m, g, i) => (((state.stageTests || {})[g.id] || []).some((r) => r.passed) ? Math.max(m, i + 1) : m), cur + 1), cur, skip: -1 };   // an old save may have no stageTests
}
