'use strict';
// the town: the neighbours, their events (TOWNEV), the beach, the harbour, the bus and the far paths (out of 71_today.js, 2026-11-11)
// ---------- the neighbours (test, 2026-11-09) ----------
// 小春 (a young hairdresser with a salon in town, #/town along the yard to the right) and ムギ (a shiba who collects old records, on the
// beach, #/beach, along the yard to the left; home: where they are to be found). Both knew the grandmother who left the hero
// the house (STORY).
// Each comes knocking at 書房's front door once (one at a time: the next not before NPC.gap later, and 書房 opened again): 小春 a minute after the opening, whatever was done meanwhile (2026-11-11; she came after the first set), ムギ a few minutes after her (the user's calls). The door
// shakes, コンコン; tapped, the hero goes and opens it, they say hello and give a present — 小春 the full-length mirror (the face and
// the hair are changed in front of it), ムギ the gramophone with its two records (one bought before: what was paid comes back).
// state.met: { id: when they came (ms; an older save's day) }. After that they are on the beach, a tap for a word. Lines: [Japanese ({漢字|かな}), 中文]
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
      ['{町|まち}に{来|き}たら、お{店|みせ}に{寄|よ}ってくださいね！', '來鎮上的話，到店裡坐坐喔！']],
    chat: [['{今日|きょう}も{勉強|べんきょう}おつかれさま！', '今天也辛苦了！'], ['{波|なみ}の{音|おと}を{聞|き}くと、{落|お}ち{着|つ}くんだ。', '聽著海浪的聲音，心情就會平靜下來。'],
      ['{鏡|かがみ}、{使|つか}ってる？{新|あたら}しい{髪型|かみがた}も{似合|にあ}うと{思|おも}うよ。', '鏡子有在用嗎？我覺得新髮型也會很適合你。'], ['{今日|きょう}は{風|かぜ}が{気持|きも}ちいいね。', '今天的風好舒服呢。'],
      ['おばあちゃん、いつもお{孫|まご}さんの{話|はなし}ばかりしていましたよ。', '你外婆啊，總是在說孫兒的事呢。'], ['{子|こ}どものころ、おばあちゃんの{髪|かみ}を{切|き}らせてもらったのが、{私|わたし}の{始|はじ}まりなんです。', '小時候外婆讓我幫她剪頭髮，那就是我當美容師的開始。']] },
  mugi: { name: 'ムギ', role: '柴犬', gift: 'gramophone', home: 'beach', at: { X: -170, Y: 58 },
    due: () => met('koharu'),   // after 小春 (and NPC.gap), the user's call
    hello: (paid) => [
      ['わん！はじめまして、ムギだワン。', '汪！初次見面，我是ムギ。'],
      ['おばあちゃんとは、よく{海辺|うみべ}でレコードを{聞|き}いたワン。', '我以前常和你外婆在海邊聽唱片。'],
      ['きみが{耳|みみ}で{日本語|にほんご}を{聞|き}いているって、{風|かぜ}のうわさで{聞|き}いたワン。これ、おばあちゃんの{蓄音機|ちくおんき}だワン！', '聽風說你在用耳朵聽日文。這是你外婆的留聲機！', 'gift'],
      paid ? ['あれ、もう{持|も}ってるワン？じゃあ、お{金|かね}は{返|かえ}すワン。レコードも{二枚|にまい}どうぞ。', `咦，你已經有了？那 ${paid} 言靈還你。兩張唱片也請收下。`]
        : ['{蓄音機|ちくおんき}とレコード{二枚|にまい}だワン。〈{縁側|えんがわ}の{午後|ごご}〉と〈{夜桜|よざくら}〉。', '留聲機和兩張唱片：〈縁側の午後〉和〈夜桜〉。'],
      ['いつも{海辺|うみべ}にいるワン。{新|あたら}しいレコードが{入|はい}ったら{教|おし}えるワン。またね！', '我都在海邊。有新唱片的話告訴你，再見！']],
    chat: [['{今日|きょう}のおすすめは〈{夜桜|よざくら}〉だワン。', '今天推薦〈夜桜〉。'], ['レコードの{音|おと}は、あったかいワン。', '唱片的聲音很溫暖。'],
      ['しっぽが{勝手|かって}に{揺|ゆ}れるワン。', '尾巴自己搖起來了。'], ['{波|なみ}の{音|おと}も、いい{音楽|おんがく}だワン。', '海浪的聲音也是很棒的音樂。'],
      ['おばあちゃんは、{夕方|ゆうがた}になるとここで〈{夜桜|よざくら}〉をかけたワン。', '你外婆每到傍晚，就會在這裡放〈夜桜〉。'], ['おばあちゃん、{手紙|てがみ}を{書|か}く{練習|れんしゅう}をしてたワン。だれに{書|か}いてたのかな。', '你外婆以前在練習寫信喔。不知道是要寫給誰呢。']] }
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
  // the knock (WebAudio, as the answer sounds; off with them): two dull taps on wood
  function knockSound() {
    const c = sfxReady(); if (!c) return;
    try {
      const t0 = c.currentTime + 0.02;
      [0, 0.2].forEach((d) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(190, t0 + d); o.frequency.exponentialRampToValueAtTime(80, t0 + d + 0.1);
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.4, t0 + d + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.14);
        o.connect(g); g.connect(c.destination); o.start(t0 + d); o.stop(t0 + d + 0.16);
      });
    } catch (e) { /* no sound */ }
  }
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
  function stayIn(st) {
    const lines = met('koharu') ? [['あれ？ そとで いぬの こえが する……。', '咦？外面好像有狗叫聲……'], ['', '（好像有誰要來找我。在家裡再練幾題，等一下吧。）']]
      : [['まずは れんしゅう！', '先來練習！'], ['', '（外面的路還不熟。先坐到書桌前，點筆記本做一點今日練習，熟悉一下題目吧。）']];
    TALK.open(st, 'hero', lines);
  }
  return { visitor, check, visit, face, art, gap, after, housebound, stayIn };
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
    if (w && w.place === shop) return 'open';
    return !o || !seen(o) ? 'prep' : isOpen(shop, now()) ? 'open' : 'closed'; };
  // what someone wears where they are: their festival clothes (festa) at the shrine while its 緣日 is on
  const look = (id, place, h = now()) => { const c = T().CAST[id]; return c.festa && place === 'shrine' && isOpen('ennichi', h) ? Object.assign({}, c.look, c.festa) : c.look; };
  const art = (id, place) => { const c = T().CAST[id]; return c.art === 'npc' ? NPC.art(id) : HERO.svg({ look: look(id, place), wear: c.wear || {} }); };
  const face = (id) => { if (id === 'hero') return HERO.head(state.look, 'bust'); const c = T().CAST[id]; return c.art === 'npc' ? NPC.face(id) : HERO.head(c.look, 'bust'); };
  // the people at a place now: those met, where their hours put them, and whoever an event there waits on (marked ！)
  function here(place) {
    const w = waiting(now(), today()), out = [];
    Object.keys(T().CAST).forEach((id) => {
      const host = w && w.ev.who === id && w.place === place, at = host ? { place, spot: w.spot } : whereIs(id, now(), today());
      if (at && at.place === place && (host || seen(id)) && T().SPOTS[place] && T().SPOTS[place][at.spot]) out.push({ id, spot: T().SPOTS[place][at.spot], host });
    });
    return out;
  }
  // what a place shows of the town now (its shops' doors, who stands where, the mark): drawn anew when it changes
  const sig = (place) => (place === 'town' ? TOWN_SHOPS.map((x) => shopState(x[6])).join() : place === 'shrine' ? String(isOpen('ennichi', now())) : '') + '|' + here(place).map((p) => p.id + (p.host ? '!' : '')).join();
  const festival = () => isOpen('ennichi', now());
  function castHtml(place) {
    return here(place).map(({ id, spot, host }) => { const k = yScale(spot.Y) * (T().CAST[id].size || 1);
      return `<button type="button" class="hero npc npc-${id}${host ? ' ev-host' : ''}${spot.sit ? ' bench' : ''}${spot.kneel ? ' kneel' : ''}${spot.pose ? ' ' + spot.pose : ''}" data-act="npc-talk" data-npc="${id}" aria-label="${esc(T().CAST[id].name)}" style="transform:translate(${spot.X.toFixed(1)}px,${(-spot.Y).toFixed(1)}px) scale(${k.toFixed(3)});z-index:${spot.u !== undefined ? isoZ(spot.u, spot.v + (spot.sit || spot.kneel ? 0.45 : 0)) : 300 - spot.Y}">${art(id, place)}${host ? '<i class="ev-mark" aria-hidden="true">！</i>' : ''}</button>`; }).join('');
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
  // nothing on: a word of what they can say by the unit reached (小春, ムギ: their old words too)
  function chatLine(id) {
    const R = reachedIdx(), own = (T().CHAT[id] || []).filter((l) => unitIdx(l[0]) <= R).map((l) => [l[1], l[2]]);
    const lines = own.concat(NPCS[id] ? NPCS[id].chat : []);
    return lines[Math.floor(Math.random() * lines.length)] || ['……', '……'];
  }
  // a tap on someone: the hero walks over, turns to them, and their event if one waits on them here (done: its 言靈, the mark
  // and the dots gone), else a word
  function talk(el) {
    const id = el.dataset.npc, yard = el.closest('.yard'), p = yard && here(yard.dataset.place).find((x) => x.id === id);
    if (!p) { if (yard) { toast(`${T().CAST[id].name}已經離開了。`); route(); } return; }   // gone home since the place was drawn
    const a = p.spot, side = yh.X <= a.X ? -1 : 1, w = p.host && waiting(now(), today()), e = w && w.ev;
    const ended = () => { finish(e.id); toast(`完成「${e.title}」・言靈 +10`, 3200); route(); };   // drawn anew: its shop open, the mark gone
    const f = a.foot || [a.X, a.Y];   // beside their feet (up on a stool: the floor under it)
    yHeroWalk(yard, [f[0] + side * 76 * yScale(f[1]), f[1] + 2], () => {
      yh.flip = side > 0; yh.back = false; yh.turn = true; yHeroPlace(yard);
      if (e) TALK.open(yard, id, e.lines, ended, null, { ev: true }); else TALK.open(yard, id, [chatLine(id)]);
    });
  }
  function shopTap(el) {   // a shop front: its keeper if they are here, else what the door says
    const shop = el.dataset.shop, st = shopState(shop), o = ownerOf(shop), sign = (TOWN_SHOPS.find((x) => x[6] === shop) || [])[5] || '';
    if (st === 'prep') { toast('這家店還在準備中，之後會開張。'); return; }
    if (st === 'closed') { const [f, t] = T().HOURS[shop]; toast(`${sign}：營業時間 ${f}:00–${t}:00，現在打烊了。`); return; }
    if (INDOOR.includes(shop)) { yGo(el, shop); return; }   // まんぷく食堂, 居酒屋とり吉: in through the door
    const p = el.closest('.yard').querySelector(`.npc-${o}`);
    if (p) talk(p); else toast(`${T().CAST[o].name}現在不在店裡。`);
  }
  const api = { unitIdx, reachedIdx, started, studyDaysSince, due, opened, openN, waiting, whereIs, isOpen, finish, clock: null, shopState, castHtml, here, art, face, talk, shopTap, chatLine, hop, PLACE_NAME, sig, seen, look, festival, slots, calls, when, now, today };
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
  const tabs = () => `<div class="diary-tabs"><button type="button" data-diary="tab-g" aria-pressed="${tab === 'g'}">外婆的日記</button><button type="button" data-diary="tab-town" aria-pressed="${tab === 'town'}">町の手帳</button></div>`;
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
    return `<ol class="tb-lines">${(e.lines || []).map((l) => { if (Array.isArray(l)) return row(l[0], l[1], l[2]); const o = (l.opts || []).find((x) => x[1]); return o ? row('hero', o[0], o[2]) : ''; }).join('')}</ol>`;
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
      <div class="row-wrap mt-2">時間（只改小鎮；「現在」也清掉睡覺跳過的時間）：${hrs.map(([h, n]) => `<button type="button" class="btn btn-sm" data-tool="hour" data-h="${h}" aria-pressed="${String(h) === String(cur)}">${n}</button>`).join('')}</div>
      ${Object.entries(byUnit).map(([u, list]) => `<div class="tt-unit"><span>${esc(u)}</span>${list.map((e) => `<button type="button" class="tb-ev" data-try="${esc(e.id)}">${esc(e.title)}<small>${esc((TOWN.CAST[e.who] || {}).name || e.who)}・${esc(TOWNEV.PLACE_NAME[e.at] || e.at)}${e.when === 'night' ? '・晚上' : ''}</small></button>`).join('')}</div>`).join('')}
    </section>`;
  }
  function tool(b) {
    const t = b.dataset.tool;
    if (t === 'meet') { Object.keys(TOWN.CAST).forEach((id) => { if (TOWN.CAST[id].art !== 'npc') state.town.seen[id] = 1; }); BUS_STOPS.forEach(([id]) => { state.town.stops[id] = 1; }); saveState(); toast('認識所有人、開通所有公車站了'); }
    if (t === 'reset') { state.town = { done: {}, seen: {}, stops: {} }; Object.keys(state.koto.found).filter((k) => k.startsWith('ev-')).forEach((k) => delete state.koto.found[k]); saveState(); toast('小鎮事件從頭開始'); }
    if (t === 'hour') { TOWNEV.clock = b.dataset.h === 'now' ? null : { h: Number(b.dataset.h), day: new Date() }; if (b.dataset.h === 'now') { try { localStorage.removeItem('nq_wake'); } catch (e) { /* none kept */ } sceneTick(); } }   // 現在: a sleep's hours gone too
    show();
  }
  function show() {
    if (tab === 'town') { const n = people().length; el.innerHTML = `<div class="diary-book">${tabs()}${townBook()}<div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="-1"${tp ? '' : ' disabled'}>‹ 上一頁</button><button type="button" class="btn btn-sm" data-diary="x">闔上</button><button type="button" class="btn btn-sm" data-diary="1"${tp < n ? '' : ' disabled'}>下一頁 ›</button></div></div>`; return; }
    const p = PAGES[at], ok = open(at);
    el.innerHTML = `<div class="diary-book">${tabs()}<div class="diary-head"><span>おばあちゃんの{日記|にっき}</span><span>${at + 1} / ${PAGES.length}</span></div>
      <div class="diary-page${ok ? '' : ' locked'}" lang="ja">${p.ja.split('\n').map((l) => `<p>${ok ? ruby(l) : esc(plain(l))}</p>`).join('')}</div>
      ${ok ? `<details class="diary-zh"><summary>看中文</summary><p>${esc(p.zh)}</p></details>` : `<p class="diary-lock">還讀不懂。${p.last ? '通過所有階段測驗' : `通過「${esc(STAGES[need(at) - 1].title)}」的階段測驗`}，就讀得懂這一頁。</p>`}
      <div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="-1"${at ? '' : ' disabled'}>‹ 上一頁</button><button type="button" class="btn btn-sm" data-diary="x">闔上</button><button type="button" class="btn btn-sm" data-diary="1"${at < PAGES.length - 1 ? '' : ' disabled'}>下一頁 ›</button></div></div>`
      .replace('おばあちゃんの{日記|にっき}', 'おばあちゃんの<ruby>日記<rt>にっき</rt></ruby>');
  }
  function close() { if (el) { el.remove(); el = null; } }
  function turn(d) { if (tab === 'town') tp = Math.max(0, Math.min(people().length, tp + d)); else at = Math.max(0, Math.min(PAGES.length - 1, at + d)); show(); }
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
      if (r || tr) { const ev = TOWN.EVENTS.find((x) => x.id === (r || tr).dataset[r ? 'replay' : 'try']); close(); if (ev) TALK.open(document.body, ev.who, ev.lines, () => openBook('town'), null, { ev: true }); return; }
      const po = e.target.closest('[data-page-of]'); if (po) { tp = people().indexOf(po.dataset.pageOf) + 1; show(); return; }
      if (b) { const d = b.dataset.diary; if (d === 'x') close(); else if (d.startsWith('tab-')) { tab = d.slice(4); show(); } else turn(Number(d)); }
      else if (e.target === el) close();
    });
    document.body.appendChild(el); show();
  }
  return { PAGES, open: openBook, close, readable: open, passed };
})();
// a few lines with someone (test, 2026-11-09): their face, their name, a line in Japanese (furigana; 🔊 reads it) and in Chinese;
// a tap goes on. A present waits for 收下 (its thumbnail) — take(): it is theirs then — and done() once the last line is read.
// A line with no Japanese is said in Chinese (林, now and then). The town's events (opt.ev, events.js) are several people's lines, the hero's among them ([who, ja, zh]); their Chinese folded
// away under 中文 (open, it stays open for the rest of the talk); a word glossed ({漢字|かな|中文}) has its Chinese under the line;
// at a reply choice ({ ask, opts: [[ja, right, zh | why wrong]] }) the hero picks what to say: a wrong one shakes and says why,
// and can be tried again; the right one is said, and the talk goes on
const TALK = (() => {
  let cur = null;
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>'), plain = (s) => s.replace(MARK, '$1');
  const glosses = (s) => [...s.matchAll(MARK)].filter((m) => m[3]).map((m) => `${m[1]}（${m[2]}）${m[3]}`);
  const who = (id) => (id === 'hero' ? { name: '我', role: '' } : NPCS[id] || TOWN.CAST[id]);
  // a line as shown: { id, ja, zh, kind } or a reply choice { ask, opts }
  const line = (l) => (!cur.ev ? { id: cur.id, ja: l[0], zh: l[1], kind: l[2] } : Array.isArray(l) ? { id: l[0], ja: l[1], zh: l[2] } : l);
  const say = (ja) => `<button type="button" class="talk-say" data-talk="say" data-ja="${esc(plain(ja))}" aria-label="唸出來">${icon('speaker')}</button>`;
  function show() {
    const L = cur.said || line(cur.lines[cur.i]);
    if (L.ask) {
      cur.el.innerHTML = `<div class="talk-card asking"><div class="talk-face">${TOWNEV.face('hero')}</div><div class="talk-body">
        <div class="talk-name">我<span>${esc(L.ask)}</span></div>
        <div class="talk-opts">${L.opts.map((o, k) => `<div class="talk-opt${cur.wrong.includes(k) ? ' wrong' : ''}" data-pick="${k}"><button type="button" class="talk-pick" lang="ja">${ruby(o[0])}</button>${say(o[0])}</div>`).join('')}</div>
        ${cur.why ? `<p class="talk-why">${esc(cur.why)}</p>` : ''}</div></div>`;
      return;
    }
    const n = who(L.id), w = n.gift, gl = cur.ev ? glosses(L.ja) : [];
    cur.el.innerHTML = `<div class="talk-card"><div class="talk-face">${TOWNEV.face(L.id)}</div><div class="talk-body">
      <div class="talk-name">${esc(n.name)}<span>${esc(n.role)}</span></div>
      ${!L.ja ? `<p class="talk-zh">${esc(L.zh)}</p>` : `<p class="talk-ja" lang="ja">${ruby(L.ja)} ${say(L.ja)}</p>${gl.length ? `<p class="talk-gloss">${gl.map(esc).join('　')}</p>` : ''}
      ${cur.ev ? `<p class="talk-zh${cur.zh ? '' : ' hide'}">${esc(L.zh)}</p>${cur.zh ? '' : '<button type="button" class="talk-zh-btn" data-talk="zh">中文</button>'}` : `<p class="talk-zh">${esc(L.zh)}</p>`}`}
      ${L.kind === 'gift' ? `<div class="talk-gift">${DECOR.thumb(w)}<b>${esc(WARE.get(w).name)}</b><button type="button" class="btn btn-primary btn-sm" data-talk="take">收下</button></div>` : '<span class="talk-next" aria-hidden="true">▼</span>'}</div></div>`;
    if (L.kind === 'gift') fitThumbs(cur.el);
  }
  function pick(k) {
    const L = line(cur.lines[cur.i]), o = L.opts[k]; if (!o || cur.wrong.includes(k)) return;
    if (!o[1]) { cur.wrong.push(k); cur.why = o[2] || ''; show(); const el = cur.el.querySelectorAll('.talk-opt')[k]; if (el) el.classList.add('shake'); playSfx('bad'); return; }
    playSfx('good'); cur.said = { id: 'hero', ja: o[0], zh: o[2] || '' }; show();
  }
  function next() {
    if (!cur) return;
    if (!cur.said && line(cur.lines[cur.i]).ask) return;   // the hero has to pick
    if (cur.said) cur.said = null;
    if (!cur.ev && cur.lines[cur.i][2] === 'gift' && cur.take) { cur.take(); cur.take = null; }
    cur.wrong = []; cur.why = '';
    if (++cur.i < cur.lines.length) { show(); return; }
    const d = cur.done; close(); if (d) d();
  }
  function open(root, id, lines, done, take, opt = {}) {
    close();
    const el = document.createElement('div'); el.className = 'talk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', who(id).name);
    cur = { el, id, lines, done, take, i: 0, ev: Boolean(opt.ev), zh: false, wrong: [], why: '', said: null };
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const sayBtn = e.target.closest('[data-talk="say"]'); if (sayBtn) { speak(sayBtn.dataset.ja); return; }
      if (e.target.closest('[data-talk="zh"]')) { cur.zh = true; show(); return; }
      const p = e.target.closest('[data-pick]'); if (p) { pick(Number(p.dataset.pick)); return; }
      if (!cur.ev && cur.lines[cur.i][2] === 'gift' && !e.target.closest('[data-talk="take"]')) return;   // the present waits for 收下
      next();
    });
    root.appendChild(el); show();
  }
  function close() { if (cur) { cur.el.remove(); cur = null; } }
  return { open, close, on: () => Boolean(cur && cur.el.isConnected) };
})();
// the beach (test, 2026-11-09), along the yard to the left: the sea to the horizon, an island, glints, waves washing in on wet
// sand, the beach; ムギ's mat under a parasol with his record player, ムギ on it once he has come by
const BEACH_PROP = [-120, -214, 240, 222];
const BEACH_PROP_ART = () => `<ellipse cx="0" cy="-2" rx="112" ry="8" fill="#2b1c12" fill-opacity=".12"/>
  <path d="M-108 4 L84 4 L108 -16 L-84 -16 Z" ${hc('#f2ece0', '#3a3a58')}/><path d="M-70 4 L-46 -16 M-30 4 L-6 -16 M10 4 L34 -16 M50 4 L74 -16" ${hs('#7fb3d8', '#2c3460')} stroke-width="9"/>
  <path d="M56 -6 L24 -196" ${hs('#efe7d8', '#4a4a6a')} stroke-width="5"/>
  <path d="M-62 -150 Q24 -236 112 -150 Q90 -140 68 -150 Q46 -140 24 -152 Q2 -140 -20 -150 Q-42 -140 -62 -150 Z" ${hc('#e86f5e', '#4a2c48')}/>
  <path d="M-20 -150 Q2 -140 24 -152 Q46 -140 68 -150 Q50 -206 24 -212 Q0 -204 -20 -150 Z" ${hc('#fbf3e6', '#4c4a6a')}/>
  <rect x="22" y="-36" width="44" height="22" rx="3" ${hc('#5a8f7b', '#26304e')}/><ellipse cx="44" cy="-37" rx="17" ry="5" ${hc('#2a2730', '#141428')}/><ellipse cx="44" cy="-37" rx="4" ry="1.4" ${hc('#e3907f', '#5a3a4a')}/>
  <path d="M60 -38 L50 -34" ${hs('#c9c4b8', '#4a4a6a')} stroke-width="2"/>`;
function beachHtml() {
  const k = yScale(64), [x0, y0, w, h] = BEACH_PROP;
  // 2026-11-10: taller, gulls over it, a fishing boat far out, the harbour's breakwater and lighthouse far off on the left (the
  // way down there), a beach hut with its flag, driftwood; on the right a grassy bank and a boardwalk up to the yard
  const gull = (x, y, k2) => `<g transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${k2 * 6}s"><path class="hs fx-wing" d="M-14 0 q7 -9 14 0 q7 -9 14 0" style="--c:#f6f6f2;--n:#9a9ec8;animation-delay:-${k2 * 0.25}s" stroke-width="3"/></g></g>`;
  return `<svg class="land tall beach-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      ${gull(260, -140, 0)}${gull(700, -220, 1)}${gull(980, -90, 2)}
      <path d="M940 148 C990 128 1050 108 1110 100 C1150 96 1190 98 1220 102 V148 Z" ${hc('#a6bd96', '#161c38')}/><path d="M1124 92 l5 -6 l12 -5 l12 5 l5 6 Z" ${hc('#c8553f', '#3a2030')}/><rect x="1130" y="92" width="22" height="9" ${hc('#efe4d2', '#1e2042')}/><path d="M1138 104 L1118 112 L1140 120 L1104 130 L1128 138" fill="none" ${hs('#e3cf9e', '#3a3858')} stroke-width="1.6"/>
      <path class="sea" d="M-20 146 H1220 V242 H-20 Z"/><path class="sea-far" d="M-20 146 H1220 V158 H-20 Z"/>
      <path d="M-20 142 H120 V148 H-20 Z" ${hc('#b4ad9e', '#2a2c48')}/><rect x="116" y="114" width="8" height="30" ${hc('#f4f1ea', '#4a4c72')}/><rect x="116" y="122" width="8" height="5" ${hc('#d0453c', '#5a2030')}/><rect x="116" y="132" width="8" height="5" ${hc('#d0453c', '#5a2030')}/><circle class="fx-blink glow" cx="120" cy="112" r="6" fill="#fff3b0"/>
      <g class="fx-sail"><g class="fx-bob" style="animation-duration:4s"><path d="M120 150 h26 l-4 5 h-18 Z" ${hc('#f4f3ee', '#4a4c72')}/><path d="M133 149 V118 L150 146 Z" ${hc('#fbfaf6', '#6a6c92')}/><path d="M131 146 L120 126 V146 Z" ${hc('#e86f5e', '#4a2c48')}/></g></g>
      <g class="fx-bob" style="animation-duration:3.2s"><path d="M640 152 h40 l-5 6 h-30 Z" ${hc('#d0574b', '#2a2c50')}/><rect x="652" y="144" width="10" height="8" ${hc('#f4f3ee', '#4a4c72')}/></g>
      <path class="isle" d="M850 147 C868 132 892 124 918 132 C934 124 962 128 982 147 Z"/><path class="isle" d="M240 147 C252 140 266 138 278 147 Z"/>
      ${[[300, 172, 40], [520, 192, 60], [760, 178, 30], [640, 214, 70], [420, 226, 50], [960, 204, 44]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
      ${moonGlitter(330, 160, 236)}
      <path class="wet" d="M-20 236 C200 230 400 242 600 238 S1000 230 1220 238 V258 H-20 Z"/>
      <path class="foam" d="M-20 240 C120 234 240 246 380 240 S640 232 780 240 S1060 246 1220 238"/>
      <path class="sand" d="M-20 252 C300 246 700 256 1220 248 V370 H-20 Z"/>
      ${[[180, 300, '#f0c2b0'], [470, 330, '#f6e3c8'], [860, 296, '#f0c2b0'], [1010, 336, '#f6e3c8']].map(([x, y, c]) => `<path class="shell"${x === 470 ? ' data-fx="shell"' : ''} d="M${x - 6} ${y} Q${x} ${y - 9} ${x + 6} ${y} Z" style="--c:${c}"/>`).join('')}
      <path class="star" data-fx="star" d="M700 318 l2.4 5 5.4 .6 -4 3.6 1.2 5.4 -5 -2.8 -5 2.8 1.2 -5.4 -4 -3.6 5.4 -.6 Z"/>
      <g class="fx-crab" data-fx="crab"><g class="fx-legs"><path d="M554 286 l-8 4 M556 289 l-8 6 M574 286 l8 4 M572 289 l8 6" ${hs('#c8453a', '#4a2030')} stroke-width="2"/></g><ellipse cx="564" cy="284" rx="11" ry="7" ${hc('#e0584a', '#5a2a36')}/><g class="claws"><path d="M553 280 q-8 -6 -4 -12 q4 2 6 6 M575 280 q8 -6 4 -12 q-4 2 -6 6" ${hc('#e0584a', '#5a2a36')}/></g><path d="M560 278 v-5 M568 278 v-5" ${hs('#c8453a', '#4a2030')} stroke-width="1.6"/><circle cx="560" cy="272" r="1.8" fill="#2b2b33"/><circle cx="568" cy="272" r="1.8" fill="#2b2b33"/></g>
      <g data-fx="castle"><path d="M352 318 h64 l-4 -12 h-56 Z" ${hc('#dcc48e', '#4a4466')}/><rect x="360" y="290" width="18" height="18" ${hc('#e6d2a0', '#4a4466')}/><rect x="390" y="284" width="20" height="24" ${hc('#e6d2a0', '#4a4466')}/>${[360, 366, 372, 390, 397, 404].map((x) => `<rect x="${x}" y="${x < 380 ? 286 : 280}" width="4" height="5" ${hc('#e6d2a0', '#4a4466')}/>`).join('')}<rect x="397" y="296" width="6" height="12" rx="3" ${hc('#c9b07c', '#3a3858')}/><path d="M400 280 V264" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.4"/><path d="M400 264 l12 4 l-12 4 Z" class="fx-flag" fill="#d0453c"/></g>
      <rect x="760" y="196" width="130" height="62" ${hc('#c9a06a', '#2a2440')}/><path d="M744 200 L825 168 L906 200 Z" ${hc('#b9a070', '#1e1c38')}/>${[770, 790, 810, 830, 850, 870].map((x) => `<path d="M${x} 186 l-6 14" ${hs('#9a8058', '#1a1832')} stroke-width="1.4"/>`).join('')}<rect x="776" y="214" width="98" height="30" ${hc('#efe6d6', '#ffd98a')}/><path d="M748 202 Q786 210 825 202 Q864 210 902 202" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width="1"/>${Array.from({ length: 9 }, (_, k) => { const x = 752 + k * 18.5, yy = 202 + 6 * Math.sin(Math.PI * ((x - 748) % 77) / 77); return `<circle cx="${x}" cy="${yy + 3}" r="2.6" ${hc('#e8e4d8', '#ffe08a')}/><circle class="glow" cx="${x}" cy="${yy + 3}" r="9" fill="url(#glw)"/>`; }).join('')}${lightPool(825, 262, 80)}<text x="825" y="234" text-anchor="middle" font-size="13" font-weight="700" ${hc('#2f5a9a', '#3a3456')} font-family="system-ui, sans-serif">海の家</text>
      <path d="M900 258 V178" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M901 180 h20 v40 h-20 Z" ${hcx('fx-flag', '#fbf7ec', '#4a4c72')}/><text x="911" y="196" text-anchor="middle" font-size="9" font-weight="700" fill="#d0453c" font-family="system-ui, sans-serif">氷</text>
      <path d="M260 340 q30 -8 60 -2 q10 2 18 -4" fill="none" ${hs('#a8875e', '#3a3050')} stroke-width="6"/>
      ${Array.from({ length: 7 }, (_, k) => `<ellipse cx="${740 - k * 26 + (k % 2) * 6}" cy="${300 - k * 7 + (k % 2) * 4}" rx="3.4" ry="2" ${hc('#d8c49a', '#2a2a46')}/>`).join('')}
      <path class="near" d="M1060 370 C1074 320 1094 270 1124 232 C1150 196 1180 168 1220 156 V370 Z"/>${[1100, 1140, 1180].map((x) => `<path d="M${x} ${330 - (x - 1100) * 0.9} q4 -12 8 0 M${x + 6} ${331 - (x - 1100) * 0.9} q5 -10 9 -1" ${hs('#7f9d6c', '#1a2a3a')} stroke-width="2"/>`).join('')}
      <path d="M980 300 L1220 292 V306 L980 314 Z" ${hc('#c9a06a', '#3a2c40')}/>${Array.from({ length: 12 }, (_, k2) => `<path d="M${990 + k2 * 20} ${299.6 - k2 * 0.66} v14" ${hs('#a8804e', '#2a2440')} stroke-width="1.6"/>`).join('')}
      ${[1000, 1060, 1120, 1180].map((x) => `<rect x="${x}" y="276" width="4" height="22" ${hc('#8a6a4a', '#2c2440')}/>`).join('')}<path d="M1000 282 L1184 278" ${hs('#8a6a4a', '#2c2440')} stroke-width="2"/>
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
// what an open shop shows in its window or before it (2026-11-10): x, w its front, t its top, f its foot
const SHOP_SHOW = {
  bakery: (x, w, t, f) => `<path d="M${x + 12} ${f - 28} h${w * 0.42 - 4}" ${hs('#a8743f', '#3a2c40')} stroke-width="2"/>${[0, 1, 2].map((k) => `<ellipse cx="${x + 22 + k * 15}" cy="${f - 33}" rx="7" ry="4.5" ${hc(['#c8823c', '#b8702e', '#d8a050'][k], '#4a3a3a')}/><path d="M${x + 18 + k * 15} ${f - 35} l3 2 M${x + 22 + k * 15} ${f - 35.5} l3 2" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`).join('')}<path d="M${x + 22} ${f - 44} q8 -8 16 0 q-8 -3 -16 0 Z" ${hc('#d8a050', '#4a3a3a')}/>`,
  shokudo: (x, w, t, f) => `<path d="M${x + 12} ${f - 28} h${w * 0.42 - 4}" ${hs('#7a5230', '#3a2c40')} stroke-width="2"/>${[0, 1, 2].map((k) => `<ellipse cx="${x + 22 + k * 17}" cy="${f - 31}" rx="7.5" ry="2.6" ${hc('#fbf8f0', '#5a5a7a')}/><ellipse cx="${x + 22 + k * 17}" cy="${f - 34}" rx="5" ry="3.4" ${hc(['#e6a23c', '#c84a3a', '#d9b04a'][k], '#4a3a3a')}/>`).join('')}`,
  flowers: (x, w, t, f) => [0, 1, 2].map((k) => { const bx = x + 14 + k * 18; return `${[[-4, '#e86f5e'], [0, '#f2c94c'], [4, '#e58fa8'], [-2, '#ffffff'], [3, '#c9a7ff']].map(([d, c], j) => `<path d="M${bx + d} ${f - 12} v${-8 - (j % 3) * 3}" stroke="#4f7a4a" stroke-width="1.2"/><circle cx="${bx + d}" cy="${f - 21 - (j % 3) * 3}" r="2.6" fill="${c}"/>`).join('')}<path d="M${bx - 7} ${f - 12} h14 l-2 12 h-10 Z" ${hc('#9aa4ae', '#2a2c50')}/>`; }).join(''),
  cafe: (x, w, t, f) => `<path d="M${x + 40} ${f} l5 -30 h16 l5 30" fill="none" ${hs('#6e4f3a', '#2c2440')} stroke-width="2"/><rect x="${x + 43}" y="${f - 30}" width="20" height="22" rx="1" ${hc('#2f3b33', '#1c2a24')}/><path d="M${x + 46} ${f - 24} h12 M${x + 46} ${f - 19} h9 M${x + 46} ${f - 14} h13" stroke="#f3e7cc" stroke-width="1.2" stroke-linecap="round"/><circle cx="${x + 59}" cy="${f - 25}" r="1.6" fill="#e86f5e"/>`,
  goods: (x, w, t, f) => '<g data-fx="chimes">' + [0, 1, 2].map((k) => `<g class="fx-sway" style="animation-delay:-${k * 0.6}s;animation-duration:${1.6 + k * 0.3}s"><path d="M${x + 24 + k * 22} ${t + 58} v6" stroke="#6a6a74" stroke-width="1"/><path d="M${x + 19 + k * 22} ${t + 70} q5 -9 10 0 Z" fill="${['#9fd0f0', '#b8e0c8', '#f6c6d6'][k]}" fill-opacity=".9"/><path d="M${x + 24 + k * 22} ${t + 70} v10" stroke="#6a6a74" stroke-width=".8"/><rect x="${x + 21 + k * 22}" y="${t + 80}" width="6" height="10" fill="#fbf7ec"/></g>`).join('') + '</g>',
  salon: (x, w, t, f) => `<path d="M${x + w - 64} ${f - 14} h16 l-2 14 h-12 Z" ${hc('#c58a54', '#3a2c40')}/>${[[-6, -24], [0, -30], [6, -24], [-3, -18], [4, -19]].map(([dx, dy]) => `<ellipse cx="${x + w - 56 + dx}" cy="${f + dy}" rx="5" ry="3.2" transform="rotate(${dx * 6} ${x + w - 56 + dx} ${f + dy})" ${hc('#5f9a4a', '#16243a')}/>`).join('')}`
};
function townHtml() {
  const shop = ([x, w, h, wall, aw, sign, id]) => {
    const t = TOWN_FOOT - h, dx = x + w / 2;
    const st = TOWNEV.shopState(id), shut = st !== 'open', wx = x + 10, ww = w * 0.42, dx0 = x + w - 44;
    const shutter = (sx, sy, sw, sh) => `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="2" ${hc('#b9b6ae', '#2a2b48')}/>${Array.from({ length: Math.floor(sh / 7) }, (_, k) => `<path d="M${sx + 2} ${sy + 5 + k * 7} h${sw - 4}" ${hs('#9a978e', '#1e1f3a')} stroke-width="1.2"/>`).join('')}`;
    const lantern = (lx) => `<path d="M${lx} ${t + 30} v6" ${hs('#2b2b33', '#1c1d3c')} stroke-width="1.5"/><ellipse cx="${lx}" cy="${t + 46}" rx="9" ry="12" ${hc('#d84a3a', '#5a2030')}/><ellipse cx="${lx}" cy="${t + 46}" rx="18" ry="20" fill="#ffb070" style="opacity:calc((1 - var(--day, 1)) * ${st === 'open' ? 0.45 : 0})"/><path d="M${lx - 9} ${t + 46} h18" ${hs('#f6d9a0', '#6a3a40')} stroke-width="1"/>`;
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
      ${id === 'salon' ? `<rect x="${x + w + 6}" y="${t + 60}" width="8" height="40" rx="4" fill="#fff"/><path d="M${x + w + 6} ${t + 66} l8 -4 M${x + w + 6} ${t + 76} l8 -4 M${x + w + 6} ${t + 86} l8 -4 M${x + w + 6} ${t + 96} l8 -4" stroke="#e58fa8" stroke-width="3"/>` : ''}
      ${id === 'shokudo' ? `<path d="M${dx0 - 4} ${t + 70} h40 v22 h-40 Z" ${hc('#2f3a5e', '#1c1f3a')}/><path d="M${dx0 + 9} ${t + 70} v22 M${dx0 + 22} ${t + 70} v22" ${hs('#efe6d6', '#3a3d60')} stroke-width="1.2"/><text x="${dx0 + 16}" y="${t + 86}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity=".9" font-family="serif">めし</text>` : ''}
      ${id === 'izakaya' ? lantern(x + 8) + lantern(x + w - 8) : ''}
      ${shut ? shutter(wx - 2, t + 64, ww + 4, h - 88) + shutter(dx0 - 2, t + 68, 36, h - 68) + `<rect x="${dx0 + 1}" y="${t + 84}" width="30" height="13" rx="2" ${hc('#fbf7ec', '#3a3b62')}/><text x="${dx0 + 16}" y="${t + 94}" text-anchor="middle" font-size="8.5" font-weight="700" ${hc('#8a2f2a', '#c9c4e8')} font-family="system-ui, sans-serif">準備中</text>` : ''}
    </g>`;
  };
  const lamp = (x) => `<rect x="${x - 2}" y="${TOWN_FOOT - 96}" width="4" height="96" ${hc('#4a4a55', '#1c1d3c')}/><circle cx="${x}" cy="${TOWN_FOOT - 100}" r="8" ${hc('#f2efe4', '#ffe2a0')}/><circle cx="${x}" cy="${TOWN_FOOT - 100}" r="16" fill="#ffd98a" style="opacity:calc((1 - var(--day, 1)) * .22)"/>`;
  // 2026-11-10: のぼり by three shops, a cat asleep on the bakery's awning, steam from its chimney; on the left a hedge and the
  // way along from the yard. 2026-11-11 (the user): no poles or wires over the street; the bunting hangs under each shop's eaves
  const nobori = (x, c, words, k) => `<path d="M${x} ${TOWN_FOOT} V${TOWN_FOOT - 120}" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><path d="M${x + 1} ${TOWN_FOOT - 118} h18 v78 h-18 Z" ${hcx('fx-flag', c, '#3a3456', `animation-delay:-${k * 0.5}s`)}/>${vText(x + 10, TOWN_FOOT - 113, words, 10, `font-weight="700" fill="#fff" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}`;
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
      <g class="fx-peck"><ellipse cx="540" cy="8" rx="5" ry="4" ${hc('#7a5a3e', '#1a1b36')}/><circle cx="544" cy="5" r="2.6" ${hc('#7a5a3e', '#1a1b36')}/></g>
      ${nobori(446, '#d0574b', '焼きたて', 0)}${nobori(735, '#6e4f3a', '珈琲', 1)}${nobori(1036, '#8a2f2a', '焼き鳥', 2)}
      <rect x="418" y="${TOWN_FOOT - 112 - 66 - 34}" width="12" height="22" ${hc('#8a6a52', '#1c1d3c')}/>${[0, 1, 2].map((k) => `<g transform="translate(424 ${TOWN_FOOT - 112 - 66 - 40})"><ellipse rx="10" ry="7" ${hcx('fx-steam', '#ffffff', '#9a9ec8', `animation-delay:-${k * 1.5}s`)}/></g>`).join('')}
      ${awnCat}
      ${[0, 34, 68, 102].map((dx) => `<circle cx="${dx}" cy="${TOWN_FOOT - 26}" r="24" ${hc('#5a9e4d', '#0f1a30')}/>`).join('')}<rect x="-20" y="${TOWN_FOOT - 26}" width="150" height="26" ${hc('#4f8a44', '#0c162a')}/>
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
  const boat = (x, y, c, k) => `<g class="fx-bob" style="animation-delay:-${k * 0.8}s;animation-duration:${2.6 + k * 0.4}s"><path d="M${x - 60} ${y} h120 l-14 20 h-92 Z" ${hc(c, '#2a2c50')}/><rect x="${x - 14}" y="${y - 26}" width="34" height="26" rx="2" ${hc('#f4f3ee', '#4a4c72')}/><rect x="${x - 8}" y="${y - 20}" width="10" height="9" ${hc('#9fc6d6', '#ffe2a0')}/><path d="M${x + 30} ${y} V${y - 50}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M${x + 30} ${y - 48} l20 10" ${hs('#d0453c', '#5a2030')} stroke-width="3"/></g>`;
  const crate = (x, y, c) => `<rect x="${x}" y="${y}" width="40" height="22" rx="2" ${hc(c, '#2a2c50')}/><path d="M${x + 4} ${y + 7} h32 M${x + 4} ${y + 14} h32" ${hs('#ffffff', '#5a5e90')} stroke-width="1.4" stroke-opacity=".6"/>`;
  const gull = (x, y, k) => `<g transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${k * 5}s"><path class="hs fx-wing" d="M-14 0 q7 -9 14 0 q7 -9 14 0" style="--c:#f6f6f2;--n:#9a9ec8;animation-delay:-${k * 0.2}s" stroke-width="3"/></g></g>`;
  return `<svg class="land tall harbor-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="sea-far" d="M-20 110 H1220 V124 H-20 Z"/><path class="isle" d="M760 112 C790 96 830 90 870 104 C890 98 920 100 940 112 Z"/>
      <path class="sea" d="M-20 122 H1220 V${F} H-20 Z"/>
      ${[[200, 160, 50], [420, 190, 40], [640, 150, 60], [900, 200, 44], [1060, 170, 50]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
      <path d="M520 150 H1000 V162 H520 Z" ${hc('#b4ad9e', '#2a2c48')}/>${Array.from({ length: 10 }, (_, k) => `<path d="M${590 + k * 38} 150 l12 -12 l12 12 l-6 8 h-12 Z" ${hc(k % 2 ? '#bfb8aa' : '#c9c2b4', '#323456')}/>`).join('')}
      <path d="M534 150 L538 22 H562 L566 150 Z" ${hc('#f4f1ea', '#4a4c72')}/>${[0, 1, 2].map((k) => `<path d="M${535.5 + k * 1.2} ${50 + k * 34} H${564.5 - k * 1.2} V${62 + k * 34} H${535.5 + k * 1.2} Z" ${hc('#d0453c', '#5a2030')}/>`).join('')}<rect x="530" y="16" width="40" height="7" rx="1" ${hc('#3a4254', '#1c2240')}/>
      <rect x="536" y="-4" width="28" height="20" rx="3" ${hc('#3a4254', '#1c2240')}/><rect x="541" y="0" width="18" height="12" rx="2" ${hc('#cfe6ec', '#fff3b0')}/><path d="M532 -4 L550 -20 L568 -4 Z" ${hc('#d0453c', '#5a2030')}/><circle cx="550" cy="-22" r="2.4" ${hc('#3a4254', '#1c2240')}/>
      <defs><linearGradient id="hbBeam"><stop offset="0" stop-color="#fff6cc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></linearGradient></defs>
      <path class="glow fx-sweep" d="M550 6 L820 -50 L820 62 Z" fill="url(#hbBeam)" style="transform-origin:550px 6px;opacity:calc((1 - var(--day)) * .6)"/>
      ${moonGlitter(600, 150, 232)}
      ${boat(180, 196, '#3f7ac8', 0)}${boat(470, 208, '#d0574b', 1)}${boat(760, 192, '#4f7a4a', 2)}
      <path d="M-20 ${F} V128 C80 122 200 126 300 140 C330 170 340 210 360 ${F} Z" ${hc('#ecdcb0', '#2c2b46')}/><path d="M${px - 18} 132 L${px + 18} 132 L${px + 44} ${F} H${px - 16} Z" ${hc('#d9c79a', '#24243e')}/>
      ${[40, 90, 150].map((x) => `<path d="M${x} ${F - 18} q4 -14 8 0 M${x + 6} ${F - 16} q5 -12 9 -2" ${hs('#7f9d6c', '#1a2a3a')} stroke-width="2"/>`).join('')}
      <rect x="860" y="${F - 92}" width="220" height="92" ${hc('#c9a06a', '#2a2440')}/><path d="M846 ${F - 92} L970 ${F - 128} L1094 ${F - 92} Z" ${hc('#5a6470', '#15163a')}/>
      <rect x="900" y="${F - 84}" width="140" height="22" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/><text x="970" y="${F - 68}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">みなと漁協</text>
      <rect x="880" y="${F - 52}" width="54" height="52" ${hc('#5a3b28', '#ffd98a')}/><rect x="960" y="${F - 52}" width="90" height="34" ${hc('#cfe6ec', '#ffd98a')}/>
      <path d="M1074 ${F - 106} V${F - 186}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><g ${hcx('fx-flag', '#f6f3ec', '#4a4c72', 'filter:brightness(calc(.5 + .5 * var(--day)))')}><path d="M1075 ${F - 184} h62 v40 h-62 Z"/><path d="M1075 ${F - 184} h62 v10 h-62 Z" fill="#d0453c"/><path d="M1075 ${F - 154} h62 v10 h-62 Z" fill="#3f7ac8"/><circle cx="1092" cy="${F - 164}" r="7" fill="#e6c23a"/><text x="1120" y="${F - 159}" text-anchor="middle" font-size="12" font-weight="800" fill="#d0453c" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">大漁</text></g>
      <path d="M640 ${F} V${F - 70} M760 ${F} V${F - 70}" ${hs('#6e4f3a', '#2c2440')} stroke-width="4"/><path d="M640 ${F - 66} Q700 ${F - 40} 760 ${F - 66} V${F - 20} Q700 ${F - 2} 640 ${F - 20} Z" fill="none" ${hs('#4f6f6a', '#2a3a4a')} stroke-width="1.4"/>${Array.from({ length: 7 }, (_, k) => `<path d="M${648 + k * 16} ${F - 60 + Math.abs(3 - k) * 3} V${F - 12}" ${hs('#4f6f6a', '#2a3a4a')} stroke-width="1"/>`).join('')}
      ${[380, 520, 700, 860, 1040].map((x, k) => `<g transform="translate(${x} ${F - 3})"><path d="M-12 0 q6 -5 12 0 q6 -5 12 0" fill="none" ${hsx('fx-ripple', '#ffffff', '#5a6aa0', `animation-delay:-${k * 0.8}s`)} stroke-width="1.6"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="134" style="fill:color-mix(in srgb, #cfcac0 calc(var(--day) * 100%), #262848)"/><path d="M-20 ${F + 2} H1220" ${hs('#9a958a', '#1c1d3e')} stroke-width="4"/>
      ${[300, 560, 820].map((x) => `<path d="M${x - 8} ${F + 14} h16 v-10 q-8 -8 -16 0 Z" ${hc('#4a4a55', '#1c1d3c')}/>`).join('')}
      ${streetLamp(150, F + 6, 120)}${streetLamp(1140, F + 6, 120)}
      <path d="M600 ${F + 56} a18 8 0 1 0 1 0 a12 5 0 1 0 1 0" fill="none" ${hs('#c9b48a', '#4a4466')} stroke-width="3"/>
      ${gull(300, -120, 0)}${gull(620, -60, 1)}${gull(860, -180, 2)}
      <g data-fx="gull"><g transform="translate(560 ${F + 4})"><ellipse rx="8" ry="6" ${hc('#f6f6f2', '#7a7ea8')}/><circle cx="7" cy="-6" r="4" ${hc('#f6f6f2', '#7a7ea8')}/><path d="M11 -6 l4 1" ${hs('#e6a23c', '#5a4a3a')} stroke-width="2"/><path d="M-8 -2 l-6 -2" ${hs('#8a8f99', '#4a4c72')} stroke-width="3"/></g></g>
    </svg>
    ${landProp(82, crate(400, F + 10, '#3f7ac8') + '<g data-fx="fish">' + [404, 414, 426].map((fx, k) => `<path d="M${fx} ${F + 10} q6 -6 12 0 q-6 4 -12 0 Z M${fx + 12} ${F + 10} l4 -3 v6 Z" ${hc(['#b9c8d4', '#a8b8c8', '#c8d4dc'][k], '#4a4c72')}/>`).join('') + '</g>' + crate(380, F + 30, '#3f7ac8') + crate(424, F + 30, '#d0574b')
      + `<g data-fx="hcat"><g transform="translate(476 ${F + 52})"><path d="M-10 0 q-2 -18 10 -20 q12 2 10 20 Z" ${hc('#f2ede2', '#5a5a6a')}/><circle cx="0" cy="-24" r="8" ${hc('#f2ede2', '#5a5a6a')}/><path d="M-7 -29 l2 -7 l4 5 M7 -29 l-2 -7 l-4 5" ${hc('#f2ede2', '#5a5a6a')}/><path d="M-8 -26 h-3 M-8 -23 h-3" stroke="#8a8a94" stroke-width=".8"/><circle cx="-3" cy="-25" r="1.2" fill="#2b2b33"/><circle cx="3" cy="-25" r="1.2" fill="#2b2b33"/><path d="M10 -2 q10 0 8 -12" class="fx-sway" fill="none" ${hs('#f2ede2', '#5a5a6a')} stroke-width="3"/><path d="M-6 -16 q6 6 12 0" fill="none" ${hs('#2b2b33', '#5a5a6a')} stroke-width="1"/></g></g>`, null, [372, F + 2, 500, F + 58])}${landProp(78, crate(1090, F + 34, '#e6a23c'), null, [1086, F + 30, 1134, F + 60])}
    ${landProp(76, [[800, F + 40], [822, F + 48], [842, F + 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" ${hc('#f08a3a', '#5a3a2a')}/><path d="M${x - 8} ${y - 2} q8 4 16 0" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>`).join(''), null, [788, F + 26, 854, F + 60])}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('harbor')}
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
  const panda = (x, b) => `<path d="M${x - 2} ${b} l-6 -4 l12 -4 l-12 -4 l12 -4 l-6 -4" fill="none" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><g class="fx-bob" data-fx="panda" style="animation-duration:1.7s"><ellipse cx="${x}" cy="${b - 34}" rx="20" ry="13" ${hc('#f6f3ec', '#4a4c72')}/><ellipse cx="${x - 12}" cy="${b - 26}" rx="5" ry="7" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x + 12}" cy="${b - 26}" rx="5" ry="7" ${hc('#2b2b33', '#141428')}/><circle cx="${x + 18}" cy="${b - 48}" r="12" ${hc('#f6f3ec', '#4a4c72')}/><circle cx="${x + 10}" cy="${b - 58}" r="4.5" ${hc('#2b2b33', '#141428')}/><circle cx="${x + 26}" cy="${b - 58}" r="4.5" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x + 14}" cy="${b - 49}" rx="3" ry="3.6" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x + 23}" cy="${b - 49}" rx="3" ry="3.6" ${hc('#2b2b33', '#141428')}/><path d="M${x - 6} ${b - 50} v-6 M${x - 10} ${b - 56} h8" ${hs('#d0453c', '#5a2030')} stroke-width="2.4"/></g>`;
  const ginkgo = (x, s) => `<rect class="trunk" x="${x - 5 * s}" y="${F - 90 * s}" width="${10 * s}" height="${90 * s}"/><g ${hc('#e6c23a', '#3a3420')}>${[[0, -120, 44], [-30, -96, 32], [30, -98, 34], [0, -150, 30]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g>`;
  const leaf = (x, y, k) => `<g transform="translate(${x} ${y})"><path d="M0 0 l-6 -8 q6 -4 12 0 Z" ${hcx('fx-fall', '#e6c23a', '#6a5a3a', `animation-delay:-${k * 1.7}s;animation-duration:${10 + (k % 3) * 2}s`)}/></g>`;
  const swing = (x, k) => `<g class="fx-sway" data-fx="swing${k}" style="animation-delay:-${k * 0.9}s;animation-duration:1.8s;transform-origin:${x}px ${F - 96}px;transform-box:view-box"><path d="M${x - 10} ${F - 96} V${F - 30} M${x + 10} ${F - 96} V${F - 30}" ${hs('#8a8f99', '#3a3d66')} stroke-width="2"/><rect x="${x - 14}" y="${F - 32}" width="28" height="6" rx="2" ${hc('#d0574b', '#4a2c40')}/></g>`;
  return `<svg class="land tall park-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 40 C200 10 420 0 600 20 S1000 40 1200 0 V370 H0 Z"/>
      ${house(40, 70, 110, '#8a5a44')}${house(190, 50, 96, '#5f6f8a')}${house(330, 80, 120, '#6f5a7a')}${house(520, 60, 100, '#8a5a44')}${house(660, 76, 110, '#5f6f8a')}
      <path class="near" d="M0 150 C300 130 700 140 1200 120 V370 H0 Z"/>
      <path d="M${px - 40} 40 L${px + 40} 40 L${px + 70} ${F} L${px - 10} ${F} Z" ${hc('#c9c4b8', '#2a2c4c')}/>${Array.from({ length: 12 }, (_, k) => { const t = k / 11, y = 40 + (F - 40) * t; return `<path d="M${px - 40 + 30 * t} ${y} H${px + 40 + 30 * t}" ${hs('#a8a49a', '#22244a')} stroke-width="2"/>`; }).join('')}
      <path d="M${px - 46} 40 L${px - 16} ${F} M${px + 46} 40 L${px + 76} ${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="3"/>
      ${ginkgo(900, 1.2)}${ginkgo(1120, 1)}${ginkgo(80, 1.1)}
      <path d="M-20 ${F - 4} H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>${Array.from({ length: 30 }, (_, k) => `<path d="M${k * 42} ${F - 18} V${F}" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>`).join('')}<path d="M-20 ${F - 14} H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="2"/>
      <path d="M327 ${F - 92} C300 ${F - 92} 292 ${F - 62} 274 ${F - 32} C262 ${F - 12} 250 ${F - 6} 228 ${F - 6}" fill="none" ${hs('#3f7ac8', '#2a3460')} stroke-width="13" stroke-linecap="round"/><path d="M327 ${F - 98} C298 ${F - 98} 288 ${F - 68} 270 ${F - 38} C258 ${F - 18} 246 ${F - 12} 226 ${F - 12}" fill="none" ${hs('#7fb0e8', '#3a4a7a')} stroke-width="3" stroke-linecap="round"/><path d="M278 ${F - 30} V${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="4"/><path d="M330 ${F - 90} V${F} M352 ${F - 90} V${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="4"/>${[0, 1, 2, 3, 4].map((k) => `<path d="M330 ${F - 18 - k * 18} H352" ${hs('#8a8f99', '#3a3d66')} stroke-width="3"/>`).join('')}<rect x="326" y="${F - 98}" width="30" height="10" rx="2" ${hc('#e6a23c', '#4a3a2a')}/>
      <path d="M470 ${F} L490 ${F - 100} H610 L630 ${F}" fill="none" ${hs('#d0574b', '#4a2c40')} stroke-width="5"/>${swing(520, 0)}${swing(580, 1)}
      <rect x="660" y="${F + 30}" width="110" height="40" rx="4" ${hc('#e6d3a8', '#3a3456')}/><rect x="660" y="${F + 30}" width="110" height="40" rx="4" fill="none" ${hs('#b9a37a', '#2a2a46')} stroke-width="5"/><path d="M690 ${F + 52} q10 -12 20 0 Z" ${hc('#d9c08a', '#3a3456')}/><path d="M728 ${F + 40} h18 l-3 16 h-12 Z" ${hc('#d0453c', '#5a2030')}/><path d="M729 ${F + 40} q8 -10 16 0" fill="none" ${hs('#8a2f2a', '#3a2030')} stroke-width="1.4"/><path d="M752 ${F + 36} l10 18" ${hs('#e6c23a', '#5a5030')} stroke-width="3" stroke-linecap="round"/><path d="M760 ${F + 52} l6 10 l-8 -2 Z" ${hc('#e6c23a', '#5a5030')}/>
      <rect x="800" y="${F - 120}" width="8" height="120" ${hc('#5a5a64', '#1c1d3c')}/><circle cx="804" cy="${F - 132}" r="18" ${hc('#fbf7ec', '#fff0c0')}/><circle cx="804" cy="${F - 132}" r="18" fill="none" ${hs('#3a3a44', '#3a3a44')} stroke-width="3"/>${clockHands(804, F - 132, 16)}<circle class="glow" cx="804" cy="${F - 132}" r="60" fill="url(#glw)"/>${lightPool(804, F + 8, 90)}${streetLamp(1030, F + 2, 116)}
      <rect x="114" y="${F - 12}" width="40" height="12" ${hc('#a9a497', '#2c2e4c')}/><path d="M120 ${F - 12} Q120 ${F - 52} 134 ${F - 54} Q148 ${F - 52} 148 ${F - 12} Z" ${hc('#b4ad9e', '#3a3c5e')}/><path d="M122 ${F - 32} Q134 ${F - 22} 146 ${F - 32} L144 ${F - 24} Q134 ${F - 16} 124 ${F - 24} Z" ${hc('#d0453c', '#5a2030')}/>
      ${[[880, -60], [1000, -20], [1100, -80], [60, -40], [160, -90], [700, 20]].map(([x, y], k) => leaf(x, y, k)).join('')}
      <rect x="-20" y="${F}" width="1240" height="134" ${hc('#d9c7a2', '#2a2846')}/>${Array.from({ length: 22 }, (_, j) => `<path d="M${j * 56} ${F + 30 + (j % 3) * 28} q6 -6 12 0" ${hs('#c2ad84', '#22203e')} stroke-width="2"/>`).join('')}
      <g data-fx="pigeons">${pigeonArt(560, F + 100, 0)}${pigeonArt(596, F + 106, 1)}</g>
      ${Array.from({ length: 9 }, (_, k) => `<path d="M${646 + k * 16} ${F - 2} v-12" stroke="#4f7a4a" stroke-width="1.6"/><path d="M${642 + k * 16} ${F - 20} q4 -6 8 0 v5 h-8 Z" ${hc(['#e86f5e', '#f2c94c', '#e58fa8'][k % 3], '#3a2c48')}/>`).join('')}
    </svg>
    ${benchProps(200, F + 60, 50)}${benchProps(980, F + 60, 50)}${landProp(74, `<rect x="852" y="${F + 26}" width="18" height="34" rx="2" ${hc('#a9a497', '#2c2e4c')}/><rect x="844" y="${F + 20}" width="34" height="8" rx="3" ${hc('#bdb8aa', '#3a3c5e')}/><path d="M861 ${F + 20} v-6 h6" fill="none" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><path data-fx="fountain" d="M867 ${F + 14} q4 -6 7 2" fill="none" stroke="#9fd0f0" stroke-width="1.6" class="fx-blink"/>`, null, [838, F + 2, 886, F + 62])}${landProp(116, panda(430, F + 18), null, [402, F - 50, 466, F + 22])}
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
  const w = 0.42, back = far ? iBox(iShade(c, 0.12), u - w, v - w, 0.85, u + w, v - w + 0.12, 2.1) : iBox(iShade(c, 0.12), u - w, v + w - 0.12, 0.85, u + w, v + w, 2.1);
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => iBox(iShade(c, 0.3), u + a * 0.34 - 0.05, v + b * 0.34 - 0.05, 0, u + a * 0.34 + 0.05, v + b * 0.34 + 0.05, 0.75)).join('');
  return far ? back + legs + iBox(c, u - w, v - w, 0.75, u + w, v + w, 0.85) : legs + iBox(c, u - w, v - w, 0.75, u + w, v + w, 0.85) + back;
}
// a hanging paper lantern by a wall (at u, v, its top at h), swaying, with its glow; the char on it
const iLantern = (u, v, h, k, ch) => { const [x, y] = isoPt(u, v, h); return `<circle cx="${x.toFixed(1)}" cy="${(y + 24).toFixed(1)}" r="70" fill="url(#glw)" opacity=".55"/><g class="fx-sway" style="animation-delay:-${(k * 0.7).toFixed(1)}s;animation-duration:${(3 + (k % 3) * 0.4).toFixed(1)}s"><path d="M${x.toFixed(1)} ${(y - 12).toFixed(1)} v10" stroke="#2b2b33" stroke-width="1.6"/><rect x="${(x - 9).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="18" height="5" fill="#2b2b33"/><ellipse cx="${x.toFixed(1)}" cy="${(y + 18).toFixed(1)}" rx="15" ry="19" fill="#d84a3a"/><path d="M${(x - 15).toFixed(1)} ${(y + 12).toFixed(1)} h30 M${(x - 15).toFixed(1)} ${(y + 24).toFixed(1)} h30" stroke="#a8302a" stroke-width="1.4"/><ellipse cx="${(x - 5).toFixed(1)}" cy="${(y + 13).toFixed(1)}" rx="4" ry="8" fill="#ffd0a0" opacity=".35"/><text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#2b2b33" ${SERIF}>${ch}</text><rect x="${(x - 9).toFixed(1)}" y="${(y + 35).toFixed(1)}" width="18" height="4" fill="#2b2b33"/></g>`; };
// steam off something at (u, v, h)
const iSteam = (u, v, h, k, r = 6) => { const [x, y] = isoPt(u, v, h); return `<g transform="translate(${x.toFixed(1)} ${(y - 8).toFixed(1)})"><ellipse rx="${r}" ry="${r * 0.75}" class="fx-steam" fill="#fff" style="animation-delay:-${k}s"/></g>`; };
// a bowl on a table or the counter (at its top, h)
const iBowl = (u, v, h, c) => { const [x, y] = isoPt(u, v, h); return `<path d="M${(x - 8).toFixed(1)} ${(y - 4).toFixed(1)} h16 q-1 7 -8 7 q-7 0 -8 -7 Z" fill="#f4efe4"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 4).toFixed(1)}" rx="8" ry="2.8" fill="${c}"/>`; };
// まんぷく食堂 at 45°: the kitchen behind the counter along the right wall (its cook), red stools before it, two tables with their
// chairs on the far side (whoever sits there faces us; 2026-11-10, the user: four chairs a table crowded into each other), the
// menu, the kamidana and the door on the left wall, the kitchen's noren, the TV
function shokudoHtml() {
  isoProps = [];
  const menu = [['カレー', '500円'], ['ラーメン', '600円'], ['うどん', '450円'], ['ぎゅうどん', '550円'], ['さかな定食', '800円'], ['からあげ定食', '750円'], ['おにぎり', '150円'], ['みそしる', '100円']];
  const tanzaku = [['親子丼', '700円'], ['天ぷら', '900円'], ['生姜焼き', '780円'], ['冷やっこ', '250円'], ['お新香', '200円'], ['ビール', '500円']];
  const table = ([u0, u1, v0, v1], k) => { const um = (u0 + u1) / 2, [sx, sy] = isoPt(um, (v0 + v1) / 2, 1.42);
    return [[u0 + 0.2, v0 + 0.2], [u1 - 0.3, v0 + 0.2], [u0 + 0.2, v1 - 0.3], [u1 - 0.3, v1 - 0.3]].map(([a, b]) => iBox('#5e3e24', a, b, 0, a + 0.1, b + 0.1, 1.3)).join('') + iBox('#b07a46', u0, v0, 1.3, u1, v1, 1.42, { top: '#c8925a' })
      + iBowl(u0 + 0.8, v0 + 0.5, 1.42, '#e6a23c') + iBowl(u1 - 0.8, v0 + 0.5, 1.42, '#c84a3a') + iSteam(u0 + 0.8, v0 + 0.5, 1.42, k)
      + `<rect x="${(sx - 3).toFixed(1)}" y="${(sy - 13).toFixed(1)}" width="6" height="11" rx="2" fill="#4a2a1c"/><rect x="${(sx + 5).toFixed(1)}" y="${(sy - 9).toFixed(1)}" width="9" height="7" rx="1" fill="#f3ead6"/>`; };
  const [cx, cy] = isoPt(2.4, 2.0, 1.95);
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#c9a276', seam: '#9a744c', wallL: '#efe2c6', wallR: '#f6ead2', wainL: '#a87a4c', wainR: '#b88a5c', batten: '#946640', trim: '#6e4a30', edgeU: '#8a6440', edgeV: '#a07850', capU: '#d9c9a8', capV: '#e8d8b8', top: '#cdb995' })}
    ${iOnF(0, `<rect x="0" y="0" width="15" height="1.4" fill="#dcd6ca"/><path d="${Array.from({ length: 30 }, (_, i) => `M${(i * 0.5).toFixed(1)} 0 v1.4`).join(' ')} M0 .7 H15" stroke="#c4bdb0" stroke-width=".03"/>`)}
    ${iOnV(0, `<rect x=".3" y="-4.3" width="14.3" height="2.4" fill="#eef0ea"/><path d="${Array.from({ length: 24 }, (_, i) => `M${(0.3 + i * 0.6).toFixed(1)} -4.3 v2.4`).join(' ')} M.3 -3.7 H14.6 M.3 -3.1 H14.6 M.3 -2.5 H14.6" stroke="#d2d6cc" stroke-width=".03"/>
      ${tanzaku.map((_, i) => `<rect x="${(9.17 + i * 0.92).toFixed(2)}" y="-6.6" width=".74" height="2.2" fill="#000" opacity=".13"/>`).join('')}<rect x="16" y="-4.1" width="2.4" height="4.1" fill="#2a1e16"/>
      <circle cx="15.2" cy="-6" r=".52" fill="#000" opacity=".12"/>`)}
    ${wallR('#6e4a30', 1, 8.2, 4.72, 4.86, 0.6, { top: '#8a5e3c' })}${[1.5, 2.9, 4.3, 5.7, 7.1].map((u) => iCyl(u, 0.32, 0.3, 4.86, 5.03, '#efe9dc', '#fbf8f0') + iCyl(u, 0.32, 0.27, 5.03, 5.2, '#f4efe4', '#fbf8f0')).join('')}
    ${wallR('#7a5230', 8.85, 14.75, 6.68, 6.82, 0.16)}${iOnV(0.07, tanzaku.map(([n, pr], i) => `<rect x="${(9.1 + i * 0.92).toFixed(2)}" y="-6.7" width=".74" height="2.2" fill="#fbf6e9" stroke="#d9c79a" stroke-width=".02"/>${vText((9.47 + i * 0.92).toFixed(2), -6.6, n, 0.34, `font-weight="700" fill="#3b2a1c" ${SERIF}`)}<text x="${(9.47 + i * 0.92).toFixed(2)}" y="-4.64" text-anchor="middle" font-size=".22" fill="#a0402c" font-family="system-ui, sans-serif">${pr}</text>`).join(''))}
    ${iOnV(0, '<circle cx="15.2" cy="-6" r=".5" fill="#5e3e24"/>')}${iOnV(0.15, `<circle cx="15.2" cy="-6" r=".46" fill="#fbf7ec" stroke="#6e4a30" stroke-width=".08"/>${[0, 90, 180, 270].map((d) => `<path d="M15.2 -6.38 v.08" stroke="#6e4a30" stroke-width=".04" transform="rotate(${d} 15.2 -6)"/>`).join('')}<path d="M15.2 -6 v-.24" stroke="#3b2a1c" stroke-width=".07" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--hh, 0deg))"/><path d="M15.2 -6 v-.36" stroke="#3b2a1c" stroke-width=".045" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--mm, 0deg))"/>`)}
    ${frameR(16, 18.4, 4.1, '#5e3e24')}${wallR('#3a2a20', 15.9, 18.5, 4.02, 4.1, 0.34)}${iOnV(0.3, `${[0, 1].map((k) => `<path class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s" d="M${16.05 + k * 1.17} -4.0 h1.12 v1.45 h-1.12 Z" fill="#c84a3a"/>`).join('')}<text x="17.2" y="-3.15" text-anchor="middle" font-size=".42" font-weight="700" fill="#fff" ${SERIF}>厨房</text>`)}
    ${wallR('#4a4a55', 20.08, 20.32, 6.3, 6.5, 0.5)}${iBox('#3a3a44', 19, 0.45, 5.08, 21.4, 0.72, 6.62)}${iOnV(0.72, `<rect x="19.12" y="-6.5" width="2.16" height="1.28" fill="#7fb3d8"/><g clip-path="url(#isoTv)"><g class="fx-tvpic"><path d="M19.12 -5.7${Array.from({ length: 8 }, () => ' q.27 -.32 .54 0 t.54 0').join('')}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".08"/></g><circle cx="21" cy="-6.2" r=".14" fill="#f2c94c"/></g><defs><clipPath id="isoTv"><rect x="19.12" y="-6.5" width="2.16" height="1.28"/></clipPath></defs>`)}
    ${[3.4, 7.6].map((u) => wallR('#5e3e24', u - 0.05, u + 0.05, 6.15, 6.25, 0.62) + iCyl(u, 0.62, 0.04, 5.85, 6.2, '#3a2a20', '#3a2a20') + iCyl(u, 0.62, 0.3, 5.55, 5.88, '#e8d4a8', '#f4e3b8') + (() => { const [x, y] = isoPt(u, 0.62, 5.5); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="80" fill="url(#glw)" opacity=".5"/><ellipse cx="${x.toFixed(1)}" cy="${(y + 1).toFixed(1)}" rx="9" ry="3" fill="#fff6d0"/>`; })()).join('')}
    ${wallL('#7a5230', 1.3, 4.2, 6.0, 6.12, 0.9, { top: '#9a6a40' })}${[1.6, 3.9].map((v) => wallL('#6e4a30', v - 0.05, v + 0.05, 5.55, 6.0, 0.72)).join('')}
    ${iBox('#d8b47a', 0.15, 2.3, 6.12, 0.75, 3.2, 6.72)}${iOnL('<rect x="-2.88" y="-6.66" width=".26" height=".5" fill="#8a5a34"/><circle cx="-2.75" cy="-6.42" r=".05" fill="#d9b04a"/>', 0.75)}${iPoly([[0, 3.3, 6.7], [0.9, 3.3, 6.7], [0.45, 3.3, 7.05]], '#6e4a30')}${iPoly([[0.45, 2.2, 7.05], [0.45, 3.3, 7.05], [0.92, 3.3, 6.68], [0.92, 2.2, 6.68]], '#5e3e24')}
    ${[1.75, 3.75].map((v) => iCyl(0.45, v, 0.1, 6.12, 6.36, '#f4efe4', '#e8e2d4') + (() => { const [x, y] = isoPt(0.45, v, 6.36); return [[-5, -8, 5], [4, -10, 5], [0, -15, 4.5]].map(([dx, dy, r]) => `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${r}" fill="#4f7a4a"/>`).join(''); })()).join('')}
    <path d="M${iPt(0.92, 1.35, 6.08)} Q${iPt(0.92, 2.75, 5.85)} ${iPt(0.92, 4.15, 6.08)}" fill="none" stroke="#e8d8a8" stroke-width="3"/>${[2.2, 2.75, 3.3].map((v) => `<path d="M${iPt(0.92, v, 5.98)} l2 4 l-2 4 l2 4" fill="none" stroke="#fff" stroke-width="1.4"/>`).join('')}
    ${wallL('#6e4a30', 4.8, 10.4, 3.4, 6.2, 0.16)}${iOnL(`<rect x="-10.26" y="-6.06" width="5.32" height="2.52" fill="#f6ecd4"/><text x="-7.6" y="-5.6" text-anchor="middle" font-size=".36" font-weight="700" fill="#3b2a1c" ${SERIF}>お品書き</text>
      ${menu.map(([n, pr], i) => { const x = i < 4 ? -10.05 : -7.45, y = -5.15 + (i % 4) * 0.42; return `<text x="${x}" y="${y.toFixed(2)}" font-size=".27" font-weight="700" fill="#3b2a1c" ${SERIF}>${n}</text><text x="${(x + 2.3).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size=".23" fill="#a0402c" font-family="system-ui, sans-serif">${pr}</text>`; }).join('')}`, 0.16)}
    ${wallL('#e8dcc4', 10.95, 11.85, 5.2, 6.3, 0.05)}${iOnL('<rect x="-11.85" y="-6.3" width=".9" height=".26" fill="#d0453c"/><text x="-11.4" y="-5.42" text-anchor="middle" font-size=".5" font-weight="800" fill="#3b2a1c">11</text>', 0.05)}
    ${iOnL(`<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#3a2a20"/>${[0, 1].map((k) => `<rect x="${(-14.7 + k * 1.36).toFixed(2)}" y="-4.55" width="1.32" height="4.55" fill="#d6e8ee" opacity=".92"/><path d="M${(-14.7 + k * 1.36).toFixed(2)} -3 h1.32 M${(-14.7 + k * 1.36).toFixed(2)} -1.6 h1.32 M${(-14.04 + k * 1.36).toFixed(2)} -4.55 v4.55" stroke="#8a6a52" stroke-width=".06"/>`).join('')}`, 0.03)}
    ${frameL(12, 14.8, 4.62, '#6e4a30')}${wallL('#3a2a20', 11.9, 14.9, 4.5, 4.58, 0.36)}${iOnL(`${[0, 1, 2].map((k) => `<path class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.6}s" d="M${(-14.72 + k * 0.9).toFixed(2)} -4.5 h.86 v1.2 h-.86 Z" fill="#2f3a5e"/>`).join('')}<text x="-13.4" y="-3.72" text-anchor="middle" font-size=".44" font-weight="700" fill="#fff" ${SERIF}>めし</text>`, 0.32)}
    ${iBox('#c9cdd2', 0.3, 0.05, 0, 14.6, 0.65, 1.8, { top: '#e2e5e8', fv: '#b8bcc2', fu: '#a4a8ae' })}${iOnF(1.8, `${[2.4, 3.4].map((u) => `<circle cx="${u}" cy=".35" r=".26" fill="none" stroke="#3a3a44" stroke-width=".06"/>`).join('')}<rect x="7.6" y=".12" width="1.6" height=".42" fill="#e8d8b8"/>`)}
    ${iCyl(5.2, 0.35, 0.32, 1.8, 2.35, '#8a8f99', '#a8adb6')}${iSteam(5.2, 0.35, 2.35, 0, 9)}${iCyl(11, 0.35, 0.28, 1.8, 2.3, '#f2efe8', '#e2ddd2')}
    ${iBox('#e6c23a', 0.5, 9.6, 0, 1.9, 11, 0.75)}${iBox('#d9b42e', 0.5, 9.6, 0.75, 1.9, 11, 1.5)}${[[0.85, 9.95], [1.55, 9.95], [0.85, 10.65], [1.55, 10.65]].map(([u, v]) => iCyl(u, v, 0.12, 1.5, 1.85, '#6b3a2a', '#8a5a40')).join('')}
    ${iCyl(21.1, 1.1, 0.36, 0, 0.8, '#a8604a', '#7a4434')}${(() => { const [x, y] = isoPt(21.1, 1.1, 0.8); return [[-10, -18, 12], [8, -22, 13], [0, -34, 12], [-14, -32, 10], [12, -38, 9]].map(([dx, dy, r]) => `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${r}" fill="#5f9a4a"/>`).join(''); })()}
  </svg>`;
  const props = isoProp([1.6, 14.4, 1.4, 2.6], iBox('#9a6538', 1.6, 1.4, 0, 14.4, 2.6, 1.95, { top: '#d8ad7f', fv: '#9a6538', fu: '#7a5030' }) + iOnV(2.6, Array.from({ length: 16 }, (_, i) => `<path d="M${(2.1 + i * 0.8).toFixed(1)} -.05 V-1.85" stroke="#7a5230" stroke-width=".05"/>`).join('') + '<path d="M1.6 -1.86 H14.4" stroke="#c58a54" stroke-width=".1"/>')
      + [4, 6.5, 9, 11.5].map((u, i) => iBowl(u, 2.2, 1.95, ['#e6a23c', '#c84a3a', '#d9b04a', '#7fae5a'][i])).join('') + [5.3, 10.3].map((u) => { const [x, y] = isoPt(u, 2.1, 1.95); return `<rect x="${(x - 3).toFixed(1)}" y="${(y - 12).toFixed(1)}" width="6" height="10" rx="2" fill="#4a2a1c"/><rect x="${(x + 5).toFixed(1)}" y="${(y - 10).toFixed(1)}" width="10" height="8" rx="1" fill="#f3ead6"/>`; }).join('')
      + `<g data-fx="maneki"><g transform="translate(${cx.toFixed(1)} ${(cy - 18).toFixed(1)}) scale(.7)"><ellipse cx="0" cy="26" rx="14" ry="4" fill="#000" opacity=".15"/><path d="M-11 26 Q-13 6 0 4 Q13 6 11 26 Z" fill="#fff"/><circle cy="0" r="10" fill="#fff"/><path d="M-8 -6 L-6 -14 L-2 -8 M8 -6 L6 -14 L2 -8" fill="#fff" stroke="#e58fa8" stroke-width="1"/><path class="paw" d="M11 6 Q20 -6 14 -16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-4" cy="0" r="1.3" fill="#333"/><circle cx="4" cy="0" r="1.3" fill="#333"/><circle cy="14" r="4" fill="#e3c46a"/></g></g>`, 3.2)
    + [4, 6.5, 9, 11.5].map((u) => isoProp([u - 0.42, u + 0.42, 2.93, 3.77], iCyl(u, 3.35, 0.3, 0, 0.05, '#4a4a55', '#5a5a64') + iCyl(u, 3.35, 0.07, 0.05, 0.92, '#5a5a64', '#5a5a64') + iCyl(u, 3.35, 0.42, 0.92, 1.05, '#a8302a', '#d0453c'), 1.05)).join('')
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
  const taru = (u, v, h) => { const [x, y] = isoPt(u + 0.42, v + 0.42, h + 0.62); return iCyl(u, v, 0.6, h, h + 1.2, '#efe6d0', '#e2d6bc') + iOnF(h + 1.2, `<circle cx="${u}" cy="${v}" r=".45" fill="none" stroke="#c9b48a" stroke-width=".05"/>`) + (() => { const [x0, y0] = isoPt(u, v, h + 0.3), [, y1] = isoPt(u, v, h + 0.9), rx = 0.6 * ISO.U * Math.SQRT2; return `<path d="M${(x0 - rx).toFixed(1)} ${y0.toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${y0.toFixed(1)} M${(x0 - rx).toFixed(1)} ${y1.toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#8a6a46" stroke-width="2.4"/>`; })() + `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="800" fill="#c8453a" ${SERIF}>酒</text>`; };
  // the cabinet: its back on the wall, its sides, three shelves of bottles standing on them (each a body, a neck and a label), its top
  const cabinet = (() => {
    const u0 = 1.8, u1 = 14.2, d = 0.55, top = 6.05, cols = ['#2f5a3a', '#6b3a2a', '#e9e2d0', '#3a4a6e', '#8a6a2a'];
    let out = iOnV(0, `<rect x="${u0}" y="${-top}" width="${u1 - u0}" height="${(top - 2.7).toFixed(2)}" fill="#3a2418"/>`) + iBox('#4a2f20', u0 - 0.15, 0, 2.7, u0, d, top);
    [2.8, 3.95, 5.0].forEach((h, li) => {
      out += iBox('#6e4a30', u0, 0, h - 0.1, u1, d, h, { top: '#8a5e3c' });
      for (let i = 0; u0 + 0.45 + i * 0.8 < u1 - 0.25; i++) {
        const u = u0 + 0.45 + i * 0.8, c = cols[(i + li * 2) % 5], hb = [0.7, 0.62, 0.55][li] + (i % 3) * 0.07, [lx, ly] = isoPt(u + 0.08, d / 2 + 0.12, h + hb * 0.45);
        out += iCyl(u, d / 2, 0.15, h, h + hb, c, mixHex(c, '#ffffff', 0.18)) + iCyl(u, d / 2, 0.06, h + hb, h + hb + 0.26, c, mixHex(c, '#ffffff', 0.25)) + `<rect x="${(lx - 3.5).toFixed(1)}" y="${(ly - 4).toFixed(1)}" width="7" height="7" rx="1" fill="#f3e7cc" opacity=".92"/>`;
      }
    });
    return out + iBox('#4a2f20', u1, 0, 2.7, u1 + 0.15, d, top) + iBox('#5e3e24', u0 - 0.15, 0, top, u1 + 0.15, d, top + 0.14, { top: '#6e4a30' });
  })();
  const [gx, gy] = isoPt(7.7, 1.85, 2.25);
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#5c3e2b', seam: '#3a281c', wallL: '#6c4832', wallR: '#78523a', wainL: '#4a2f20', wainR: '#523424', batten: '#3a2418', trim: '#2e1e14', edgeU: '#3a281c', edgeV: '#46301f', capU: '#5a3e2c', capV: '#664632', top: '#4e3424' })}
    ${iOnF(0, '<rect x="0" y="0" width="15.6" height="1.6" fill="#4a3426"/>')}
    ${iOnV(0, '<rect x="16.6" y="-4.1" width="2.4" height="4.1" fill="#21160f"/>')}${frameR(16.6, 19, 4.1, '#3a2418')}${wallR('#2e1e14', 16.5, 19.1, 4.02, 4.1, 0.34)}${iOnV(0.3, [0, 1].map((k) => `<path class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s" d="M${16.65 + k * 1.17} -4.0 h1.12 v1.2 h-1.12 Z" fill="#2f3a5e"/>`).join(''))}
    ${wallR('#c9a06a', 19.85, 21.55, 4.15, 6.45, 0.07)}${iOnV(0.07, `<rect x="19.95" y="-6.35" width="1.5" height="2.1" fill="#f3e7cc"/><circle cx="20.7" cy="-5.6" r=".42" fill="#f0b43c"/><path d="M20.4 -5.9 h.6 v.62 h-.6 Z" fill="#fbf8f0" opacity=".8"/><text x="20.7" y="-4.45" text-anchor="middle" font-size=".34" font-weight="800" fill="#c8453a" font-family="system-ui, sans-serif">ビール</text>`)}
    ${cabinet}
    ${wallL('#7a5230', 2.9, 8.7, 3.5, 6.5, 0.16)}${iOnL(`<rect x="-8.56" y="-6.36" width="5.52" height="2.72" fill="#2f3b33"/><text x="-5.8" y="-5.86" text-anchor="middle" font-size=".38" font-weight="700" fill="#f3e7cc" ${SERIF}>今日のおすすめ</text>
      ${board.map(([n, pr], i) => { const x = i % 2 ? -5.7 : -8.35, y = -5.3 + Math.floor(i / 2) * 0.48; return `<text x="${x}" y="${y.toFixed(2)}" font-size=".3" fill="#f3e7cc" font-family="system-ui, sans-serif">${n}</text><text x="${(x + 2.5).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size=".26" fill="#ffd27a" font-family="system-ui, sans-serif">${pr}</text>`; }).join('')}`, 0.16)}${wallL('#6e4a30', 3.1, 8.5, 3.36, 3.5, 0.3)}${(() => { const [x, y] = isoPt(0.24, 7.6, 3.5); return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="10" height="3" rx="1" fill="#f3e7cc"/>`; })()}
    ${iOnL('<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#1c2340"/><path d="M-13.4 -4.62 V0" stroke="#2e1e14" stroke-width=".08"/>', 0.03)}${frameL(12, 14.8, 4.62, '#2e1e14')}${wallL('#21160f', 11.9, 14.9, 4.5, 4.58, 0.36)}${iOnL(`${[0, 1, 2].map((k) => `<path class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.6}s" d="M${(-14.72 + k * 0.9).toFixed(2)} -4.5 h.86 v1.5 h-.86 Z" fill="#8a2f2a"/>`).join('')}<text x="-13.4" y="-3.55" text-anchor="middle" font-size=".42" font-weight="700" fill="#fff" ${SERIF}>とり吉</text>`, 0.32)}
    ${iBox('#4a2f20', 0.3, 0.05, 0, 15, 0.6, 1.7, { top: '#6e4a30' })}${[2.6, 3.4, 9.6, 10.4, 13.2].map((u, i) => iCyl(u, 0.32, 0.14, 1.7, 2.35 - (i % 2) * 0.15, ['#e9e2d0', '#2f5a3a', '#e9e2d0', '#6b3a2a', '#3a4a6e'][i], '#3a2a20')).join('')}
    ${taru(1.1, 9.4, 0)}${taru(1.1, 10.7, 0)}${taru(1.1, 10.05, 1.2)}
    ${iBox('#6e4a30', 14.6, 7.4, 0, 22, 16, 0.6, { top: '#b9c288', fv: '#5e3e24', fu: '#4e3220' })}${iOnF(0.6, `<path d="M14.6 7.4 H22 V16 H14.6 Z M18.3 7.4 V16 M14.6 11.7 H22" fill="none" stroke="#56603a" stroke-width=".09"/>${[[17.6, 9.3], [19.2, 9.3], [17.6, 13.2], [19.2, 13.2]].map(([u, v]) => `<rect x="${u - 0.45}" y="${v - 0.45}" width=".9" height=".9" rx=".14" fill="#7a4a8a"/>`).join('')}`)}${iBox('#a8a49a', 13.8, 10.9, 0, 14.6, 11.9, 0.3, { top: '#bdb8ac' })}
    <path d="M${iPt(3, 0.55, 7.15)} L${iPt(19.5, 0.55, 7.15)} M${iPt(0.55, 1.5, 7.15)} L${iPt(0.55, 11, 7.15)}" stroke="#2b2b33" stroke-width="1.4" fill="none"/>
    ${[3, 7, 11, 15, 19.5].map((u, k) => iLantern(u, 0.55, 7.15, k, '酒鳥吉酒鳥'[k])).join('')}${[1.6, 10.2].map((v, k) => iLantern(0.55, v, 7.15, k + 5, '吉酒'[k])).join('')}
  </svg>`;
  const props = isoProp([1.8, 15.2, 1.6, 2.8], iBox('#3a2418', 1.8, 1.6, 0, 15.2, 2.8, 1.95, { top: '#c58a54', fv: '#3a2418', fu: '#2e1c12' }) + iOnV(2.8, Array.from({ length: 17 }, (_, i) => `<path d="M${(2.2 + i * 0.8).toFixed(1)} -.05 V-1.85" stroke="#2a1810" stroke-width=".06"/>`).join(''))
      + iBox('#2b2b33', 6, 1.65, 1.95, 9.4, 2.05, 2.15) + iOnF(2.15, '<rect x="6.1" y="1.7" width="3.2" height=".3" fill="#e8592e"/><rect x="6.1" y="1.7" width="3.2" height=".3" fill="#ffb24a" class="fx-blink" style="animation-duration:2.2s;opacity:.6"/>')
      + [6.4, 6.9, 7.4, 7.9, 8.4, 8.9].map((u) => { const [x, y] = isoPt(u, 1.85, 2.15); return `<path d="M${(x - 4).toFixed(1)} ${(y + 1).toFixed(1)} l8 -10" stroke="#c9a06a" stroke-width="2" stroke-linecap="round"/><circle cx="${(x + 1).toFixed(1)}" cy="${(y - 5).toFixed(1)}" r="3" fill="#a0502c"/>`; }).join('')
      + [0, 1].map((k) => `<g transform="translate(${(gx - 12 + k * 22).toFixed(1)} ${(gy - 14).toFixed(1)})"><ellipse rx="11" ry="8" class="fx-steam" fill="#e8e2d4" style="animation-delay:-${k * 1.8}s"/></g>`).join('')
      + [[4.1, 2.4], [6.6, 2.45], [11.6, 2.4]].map(([u, v]) => { const [x, y] = isoPt(u, v, 1.95); return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 15).toFixed(1)}" width="10" height="14" rx="1.5" fill="#f0b43c"/><path d="M${(x + 5).toFixed(1)} ${(y - 12).toFixed(1)} h3 v7 h-3" fill="none" stroke="#e9e2d0" stroke-width="1.6"/><path d="M${(x - 6).toFixed(1)} ${(y - 15).toFixed(1)} q3 -4 6 -1 q3 -3 6 1 Z" fill="#fbf8f0"/>`; }).join('')
      + iBowl(5.3, 2.25, 1.95, '#7fae5a') + (() => { const [x, y] = isoPt(12.8, 2.2, 1.95); return `<path d="M${(x - 4).toFixed(1)} ${(y - 1).toFixed(1)} q-4 -8 1 -16 h6 q5 8 1 16 Z" fill="#f3ead6"/><path d="M${(x - 2).toFixed(1)} ${(y - 15).toFixed(1)} h5" stroke="#2f4a6e" stroke-width="1.6"/>`; })(), 2.4)
    + [4, 6.5, 9, 11.5, 14].map((u) => isoProp([u - 0.42, u + 0.42, 3.18, 4.02], iCyl(u, 3.6, 0.3, 0, 0.05, '#21160f', '#2e1e14') + iCyl(u, 3.6, 0.07, 0.05, 0.92, '#2e1e14', '#2e1e14') + iCyl(u, 3.6, 0.42, 0.92, 1.05, '#a8743f', '#c58a54'), 1.05)).join('')
    + isoProp([17, 19.8, 10.1, 12.4], [[17.2, 10.3], [19.5, 10.3], [17.2, 12.1], [19.5, 12.1]].map(([u, v]) => iBox('#4a2f20', u, v, 0.6, u + 0.12, v + 0.12, 1.05)).join('') + iBox('#7a5232', 17, 10.1, 1.05, 19.8, 12.4, 1.17, { top: '#8f6040' })
      + iBowl(17.9, 10.8, 1.17, '#7fae5a') + iCyl(18.6, 11.3, 0.3, 1.17, 1.5, '#5a5a64', '#3a3a44') + iSteam(18.6, 11.3, 1.5, 0.5, 8) + (() => { const [x, y] = isoPt(19.2, 10.9, 1.17); return `<path d="M${(x - 4).toFixed(1)} ${(y - 1).toFixed(1)} q-4 -8 1 -16 h6 q5 8 1 16 Z" fill="#f3ead6"/><rect x="${(x + 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="6" height="5" fill="#f3ead6"/>`; })(), 1.6);
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
const clockHands = (x, y, r, ink = '#3b2a1c') => `<path d="M${x} ${y} v${-r * 0.55}" stroke="${ink}" stroke-width="${Math.max(2, r * 0.16)}" stroke-linecap="round" style="transform-box:view-box;transform-origin:${x}px ${y}px;transform:rotate(var(--hh, 0deg))"/><path d="M${x} ${y} v${-r * 0.8}" stroke="${ink}" stroke-width="${Math.max(1.4, r * 0.1)}" stroke-linecap="round" style="transform-box:view-box;transform-origin:${x}px ${y}px;transform:rotate(var(--mm, 0deg))"/><circle cx="${x}" cy="${y}" r="${Math.max(1.5, r * 0.1)}" fill="${ink}"/>`;
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
function streetHtml() {
  const y = (Y) => 370 - Y, [w0, w1] = STREET.walk, [r0, r1] = STREET.road, [n0, n1] = STREET.near, ground = 'M0 164 C220 150 420 146 600 148 C800 150 1000 146 1200 158';
  const tree = (x, b, r) => `<rect class="trunk" x="${x - r * 0.18}" y="${b - r * 2.1}" width="${r * 0.36}" height="${r * 2.1}"/><g class="crown"><circle cx="${x}" cy="${b - r * 2.4}" r="${r}"/><circle cx="${x - r * 0.75}" cy="${b - r * 1.75}" r="${r * 0.68}"/><circle cx="${x + r * 0.8}" cy="${b - r * 1.8}" r="${r * 0.72}"/></g>`;
  // 2026-11-10: the village up the hill, the poles and their wires over the road (sparrows on them), a drinks machine lit by
  // night, a red postbox, a crossing, and now and then a little truck along the near lane
  const house = (x, b, w, h, roof, wall) => farHouse(x, b, w, h, roof, wall);
  const cyclist = `<g class="fx-car" style="animation-duration:31s;animation-delay:-12s"><g transform="translate(0 ${y(n0 + 8)})"><g ${hs('#4a4a55', '#3a3d66')} stroke-width="2.2" fill="none"><circle cx="-14" cy="-9" r="9"/><circle cx="14" cy="-9" r="9"/><path d="M-14 -9 L-4 -24 L10 -24 L14 -9 M-4 -24 L0 -9 L10 -24 M10 -24 l-2 -6 h6"/></g><rect x="-10" y="-22" width="12" height="3" rx="1.5" fill="#8a6a52"/><path d="M-4 -40 L-2 -24 M-2 -24 l6 10 M-2 -24 l-4 12" ${hs('#2f4a6e', '#2a2c50')} stroke-width="4" stroke-linecap="round"/><path d="M-6 -50 h10 l2 14 h-14 Z" ${hc('#e86f5e', '#4a2c48')}/><path d="M2 -46 l8 8" ${hs('#f8dcc8', '#6a5a6a')} stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-57" r="7" ${hc('#f8dcc8', '#6a5a6a')}/><path d="M-7 -58 q2 -10 8 -9 q6 1 6 8 q-6 -4 -14 1 Z" ${hc('#3b2f2a', '#1a1828')}/><rect x="8" y="-30" width="10" height="7" rx="1" ${hc('#c58a54', '#3a2c40')}/></g></g>`;
  const POLES = [160, 520, 880], WY = [-82, -66, -50], sag = (t, s) => 2 * t * (1 - t) * s;
  const pole = (x) => `<rect x="${x - 5}" y="-100" width="10" height="${w1 > 0 ? 336 : 0}" ${hc('#8d8a84', '#24254a')}/><rect x="${x - 30}" y="-86" width="60" height="5" rx="1" ${hc('#6f6c66', '#1c1d3e')}/><rect x="${x - 24}" y="-70" width="48" height="4" rx="1" ${hc('#6f6c66', '#1c1d3e')}/>${[-24, -8, 8, 24].map((d) => `<rect x="${x + d - 2}" y="-92" width="4" height="7" rx="1.5" ${hc('#e8e4d8', '#4a4c78')}/>`).join('')}<rect x="${x - 8}" y="-30" width="16" height="22" rx="2" ${hc('#a8a49a', '#2a2c50')}/>`;
  const spans = [-200].concat(POLES, [1240]);
  const wires = WY.map((wy, k) => spans.slice(0, -1).map((x0, i) => { const x1 = spans[i + 1]; return `<path class="wire" d="M${x0} ${wy} Q${(x0 + x1) / 2} ${wy + 2 * (26 + k * 4)} ${x1} ${wy}"/>`; }).join('')).join('');
  const sparrow = (x0, x1, t, wy, s, k) => { const x = x0 + (x1 - x0) * t, yy = wy + sag(t, 2 * s) - 4; return `<g class="fx-peck" style="animation-delay:-${k * 0.7}s"><ellipse cx="${x}" cy="${yy}" rx="5" ry="4" ${hc('#7a5a3e', '#1a1b36')}/><circle cx="${x + 4}" cy="${yy - 3}" r="2.6" ${hc('#7a5a3e', '#1a1b36')}/><path d="M${x - 4} ${yy} l-5 2" ${hs('#5a4030', '#1a1b36')} stroke-width="2"/></g>`; };
  const vend = (x) => `<rect x="${x}" y="160" width="46" height="76" rx="3" ${hc('#e9edf0', '#3a4470')}/><rect x="${x + 4}" y="166" width="38" height="34" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${x + 7 + c * 9}" y="${169 + r * 11}" width="6" height="8" rx="1.5" fill="${['#d0574b', '#3f7ac8', '#e6a23c', '#4f7a4a'][(r + c) % 4]}"/>`).join('')).join('')}<rect x="${x + 6}" y="206" width="34" height="5" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><rect x="${x + 10}" y="218" width="26" height="10" rx="2" ${hc('#2b2b33', '#141530')}/><ellipse class="glow" cx="${x + 23}" cy="196" rx="70" ry="56" fill="url(#glc)"/>`;
  const post = (x) => `<rect x="${x - 3}" y="206" width="6" height="30" ${hc('#5a5a64', '#1c1d3c')}/><rect x="${x - 13}" y="176" width="26" height="34" rx="6" ${hc('#d0453c', '#5a2030')}/><rect x="${x - 8}" y="184" width="16" height="3" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><path d="M${x - 6} 192 h12 M${x - 6} 196 h12 M${x} 196 v8" ${hs('#fff', '#c9c4e8')} stroke-width="1.6"/>`;   // 〒
  const truck = `<g class="fx-car"><g transform="translate(0 ${y((r0 + r1) / 2 - 22)})"><path d="M-56 -4 V-26 H6 V-4 Z" ${hc('#ecebe6', '#4a4c72')}/><path d="M6 -4 V-34 Q6 -40 12 -40 H30 Q38 -40 42 -30 L50 -16 V-4 Z" ${hc('#f4f3ee', '#555880')}/><path d="M14 -36 H28 Q33 -36 36 -30 L40 -22 H14 Z" ${hc('#9fc6d6', '#ffe2a0')}/><circle cx="-36" cy="-4" r="8" fill="#2b2b33"/><circle cx="34" cy="-4" r="8" fill="#2b2b33"/><circle cx="-36" cy="-4" r="3" fill="#9a9ea8"/><circle cx="34" cy="-4" r="3" fill="#9a9ea8"/><path class="glow" d="M50 -14 L200 -40 L200 22 Z" fill="url(#trBeam)"/><circle cx="49" cy="-14" r="3" fill="#ffd98a"/></g></g>`;
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
      <path d="M500 236 V160" ${hs('#e8913a', '#4a3a2a')} stroke-width="4"/><circle cx="500" cy="152" r="14" ${hc('#e8913a', '#4a3a2a')}/><circle cx="500" cy="152" r="10.5" ${hc('#cfe3ea', '#2a3060')}/><path d="M493 148 q7 -6 14 2" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
      ${streetLamp(250, 236, 130)}${streetLamp(1000, 236, 130)}
      <rect class="asphalt" x="-20" y="${y(r1)}" width="1240" height="${r1 - r0}"/>
      <path class="rline" d="M-20 ${y(r1) + 6} H1220 M-20 ${y(r0) - 6} H1220"/><path class="rline dash" d="M-20 ${y((r0 + r1) / 2)} H1220"/>
      <text x="850" y="${y((r0 + r1) / 2) - 8}" text-anchor="middle" font-size="20" font-weight="800" fill="#f4f2ec" fill-opacity=".85" font-family="system-ui, sans-serif" transform="translate(850 ${y((r0 + r1) / 2) - 8}) scale(1 .6) translate(-850 ${-(y((r0 + r1) / 2) - 8)})">止まれ</text>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${930}" y="${y(r1) + 10 + i * 10}" width="90" height="5" ${hc('#f4f2ec', '#3a3d66')}/>`).join('')}
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
  const lantern = (x) => `<rect x="${x - 6}" y="${F - 52}" width="12" height="52" ${hc('#a9a497', '#2c2e4c')}/><rect x="${x - 12}" y="${F - 70}" width="24" height="20" rx="2" ${hc('#c9c4b8', '#3a3c5e')}/><rect x="${x - 7}" y="${F - 66}" width="14" height="12" ${hc('#efe6d6', '#ffd98a')}/><path d="M${x - 16} ${F - 70} L${x} ${F - 84} L${x + 16} ${F - 70} Z" ${hc('#a9a497', '#2c2e4c')}/><circle class="glow" cx="${x}" cy="${F - 60}" r="34" fill="url(#glw)"/>${lightPool(x, F + 4, 50)}`;
  const fox = (x, flip) => `<g transform="translate(${x} ${F - 30}) scale(${flip ? -1 : 1} 1)"><rect x="-14" y="10" width="28" height="20" ${hc('#a9a497', '#2c2e4c')}/><path d="M-8 10 Q-10 -14 0 -22 L4 -34 L7 -20 Q12 -10 8 10 Z" ${hc('#e9e2d0', '#4a4c6e')}/><path d="M-7 -6 Q0 2 8 -6 L6 2 Q0 6 -6 2 Z" ${hc('#d0453c', '#5a2030')}/><circle cx="3" cy="-16" r="1.4" fill="#2b2b33"/></g>`;
  const leaf = (x, y, k, c) => `<g transform="translate(${x} ${y})"><path  d="M0 -6 C5 -6 7 0 0 7 C-7 0 -5 -6 0 -6 Z" ${hcx('fx-fall', c, '#8a5a5a', `animation-delay:-${k * 1.6}s;animation-duration:${10 + (k % 3) * 2}s`)}/></g>`;
  const stall = (x, w, aw, sign) => `<g><rect x="${x}" y="${F - 70}" width="${w}" height="70" ${hc('#c58a54', '#3a2c40')}/><path d="M${x - 6} ${F - 70} h${w + 12} l-8 -22 h${-w + 4} Z" ${hc(aw, '#5a2030')}/>
    ${Array.from({ length: Math.floor(w / 18) }, (_, k) => `<path d="M${x - 4 + k * 18} ${F - 70} q9 8 18 0" ${hc(aw, '#5a2030')}/>`).join('')}<rect x="${x + 10}" y="${F - 64}" width="${w - 20}" height="18" rx="2" ${hc('#fbf7ec', '#e8dcb4')}/>
    <text x="${x + w / 2}" y="${F - 50}" text-anchor="middle" font-size="12" font-weight="700" ${hc('#8a2f2a', '#8a2f2a')} font-family="system-ui, sans-serif">${sign}</text><rect x="${x + 6}" y="${F - 26}" width="${w - 12}" height="10" ${hc('#efe6d6', '#ffe2a0')}/></g>`;
  const chochin = (x0, x1) => `<path d="M${x0} ${F - 120} Q${(x0 + x1) / 2} ${F - 100} ${x1} ${F - 120}" fill="none" ${hs('#2b2b33', '#2b2b33')} stroke-width="1.5"/>${Array.from({ length: Math.floor((x1 - x0) / 36) }, (_, k) => { const x = x0 + 18 + k * 36, y = F - 120 + 20 * (1 - (((x - x0) / (x1 - x0)) * 2 - 1) ** 2);
    return `<g class="fx-sway" style="animation-delay:-${k * 0.4}s"><ellipse cx="${x}" cy="${y + 12}" rx="10" ry="13" ${hc('#e8592e', '#ff8a4a')}/><path d="M${x - 10} ${y + 12} h20" stroke="#a8302a" stroke-width="1"/></g><circle class="glow" cx="${x}" cy="${y + 12}" r="30" fill="url(#glw)"/>`; }).join('')}`;
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
      <g class="fx-sway" data-fx="bell" style="animation-duration:4.2s"><circle cx="910" cy="160" r="9" ${hc('#d9b04a', '#8a7a4a')}/><path d="M907 168 V212 M913 168 V212" stroke="#d0453c" stroke-width="2.4"/><path d="M910 168 V212" stroke="#fff" stroke-width="2"/></g>
      <rect x="880" y="196" width="60" height="26" ${hc('#8a5a30', '#2a2440')}/>${[886, 896, 906, 916, 926].map((x) => `<path d="M${x} 198 v8" ${hs('#5a3b28', '#1c1838')} stroke-width="2"/>`).join('')}<text x="910" y="218" text-anchor="middle" font-size="9" font-weight="700" ${hc('#efe6d6', '#c9c4e8')} font-family="serif">奉納</text>
      <rect x="104" y="${F - 156}" width="14" height="156" ${hc('#d0453c', '#5a2030')}/><rect x="232" y="${F - 156}" width="14" height="156" ${hc('#d0453c', '#5a2030')}/><rect x="100" y="${F - 18}" width="22" height="18" ${hc('#2b2b33', '#141428')}/><rect x="228" y="${F - 18}" width="22" height="18" ${hc('#2b2b33', '#141428')}/>
      <path d="M76 ${F - 166} Q175 ${F - 180} 274 ${F - 166} L270 ${F - 154} Q175 ${F - 166} 80 ${F - 154} Z" ${hc('#2b2b33', '#141428')}/><rect x="90" y="${F - 156}" width="170" height="8" ${hc('#d0453c', '#5a2030')}/><rect x="96" y="${F - 128}" width="158" height="10" ${hc('#d0453c', '#5a2030')}/>
      <rect x="160" y="${F - 156}" width="30" height="30" ${hc('#2b2b33', '#141428')}/>${vText(175, F - 152, '稲荷', 11, 'font-weight="700" fill="#d9b04a" font-family="serif"')}
      ${lantern(320)}${lantern(700)}${fox(360, false)}${fox(560, true)}
      <g data-fx="crow"><g class="fx-peck" style="animation-duration:3.1s"><path d="M226 ${F - 172} q8 -10 20 -6 q8 3 10 0 l-2 6 q-6 6 -20 6 Z" ${hc('#2b2b33', '#0c0c1c')}/><circle cx="252" cy="${F - 180}" r="5" ${hc('#2b2b33', '#0c0c1c')}/><path d="M256 ${F - 181} l6 2 l-6 1" ${hc('#3a3a44', '#1a1a2a')}/><path d="M234 ${F - 166} v6 M240 ${F - 166} v6" ${hs('#3a3a44', '#1a1a2a')} stroke-width="1.4"/></g></g>
      <rect x="1080" y="${F - 70}" width="70" height="40" rx="2" ${hc('#c58a54', '#3a2c40')}/>${[0, 1, 2].map((k) => `<path d="M${1088 + k * 20} ${F - 62} l8 -4 l8 4 v10 h-16 Z" ${hc('#efe6d6', '#e8dcb4')}/>`).join('')}<rect x="1110" y="${F - 30}" width="10" height="30" ${hc('#6e4f3a', '#2c2440')}/>
      <path d="M1160 ${F - 54} h40" ${hs('#6e4f3a', '#2c2440')} stroke-width="2"/>${[1166, 1176, 1186, 1196].map((x, k) => `<path d="M${x} ${F - 54} v7" ${hsx('fx-sway', '#ffffff', '#8a8cae', `animation-delay:-${k * 0.4}s;animation-duration:2.2s`)} stroke-width="3"/>`).join('')}
      <path d="M672 ${F} L700 ${F - 92}" ${hs('#c9a06a', '#3a2c40')} stroke-width="3"/><path d="M664 ${F} q4 -18 10 -26 q4 12 8 26 Z" ${hc('#b9a070', '#2a2440')}/>${[[600, '#d9533a'], [612, '#e8913a'], [624, '#e6c23a'], [606, '#c8453a'], [618, '#d9533a']].map(([x, c], k) => `<ellipse cx="${x}" cy="${F - 3 - (k > 2 ? 5 : 0)}" rx="7" ry="3.4" ${hc(c, '#5a3a3a')}/>`).join('')}
      ${[[180, -120, '#d9533a'], [420, -60, '#e8913a'], [520, -140, '#e6c23a'], [760, -90, '#d9533a'], [880, -150, '#e8913a'], [1040, -60, '#e6c23a'], [300, -20, '#d9533a']].map(([x, y, c], k) => leaf(x, y, k, c)).join('')}
      ${fest ? `<g class="ennichi">${boom(240, -260, 0, '#ff9a5a')}${boom(520, -320, 1.4, '#ffd166')}${boom(860, -280, 2.8, '#7fd1ff')}${chochin(280, 760)}${stall(400, 100, '#3f7ac8', '金魚すくい')}${stall(510, 90, '#d0453c', 'やきそば')}${stall(610, 90, '#e58fa8', 'わたあめ')}</g>` : ''}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90" style="fill:color-mix(in srgb, #d8cfbd calc(var(--day) * 100%), #2a2a48)"/>
      ${Array.from({ length: 24 }, (_, j) => `<rect x="${60 + j * 48}" y="${F + 18 + (j % 2) * 26}" width="34" height="16" rx="3" ${hc('#c9c4b8', '#3a3c5e')}/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('shrine')}
    <div class="ysel"></div>`;
}
// 白鷺城 (test, 2026-11-09), the end of the bus line: the white keep in tiers on its stone walls, the gate, old pines, the
// guides' booth (案内所) and its board of the castle's story
function castleHtml() {
  const F = 236, cx = 880;
  // 2026-11-10: the white keep in five tiers on its curved stone walls, rising high — gables, gold shachihoko, lit up by night —
  // the moat before it with ripples, the gate and its bridge, sakura shedding petals, a banner flapping by the guides' booth
  const roof = (y, half, d) => `<path d="M${cx - half - 30} ${y + d} Q${cx - half - 8} ${y + d - 2} ${cx - half + 6} ${y + d - 10} L${cx - half + 24} ${y} H${cx + half - 24} L${cx + half - 6} ${y + d - 10} Q${cx + half + 8} ${y + d - 2} ${cx + half + 30} ${y + d} Z" ${hc('#4f5a6e', '#2a3150')}/><path d="M${cx - half - 26} ${y + d} H${cx + half + 26}" ${hs('#f6f3ec', '#cfc8b4')} stroke-width="2"/>${[0.35, 0.65].map((f) => `<path d="M${cx - half + 24 - 18 * f} ${y + d * f} H${cx + half - 24 + 18 * f}" ${hs('#66728a', '#3a4262')} stroke-width="1.2"/>`).join('')}`;
  const tier = (y, half, h, rows) => `<rect x="${cx - half}" y="${y}" width="${half * 2}" height="${h}" ${hc('#f6f3ec', '#e2dac6')}/>${Array.from({ length: rows }, (_, r) => Array.from({ length: Math.floor(half * 2 / 30) }, (_, k) => `<rect ${hc('#3b3b44', '#ffd98a')} x="${cx - half + 10 + k * 30}" y="${y + 10 + r * 18}" width="12" height="9"/>`).join('')).join('')}`;
  const gable = (y, w) => `<path d="M${cx - w} ${y} L${cx} ${y - w * 0.62} L${cx + w} ${y} Z" ${hc('#4f5a6e', '#2a3150')}/><path d="M${cx - w + 10} ${y - 2} L${cx} ${y - w * 0.62 + 8} L${cx + w - 10} ${y - 2} Z" ${hc('#f6f3ec', '#e2dac6')}/>`;
  const sakura = (x, s) => `<path d="M${x} ${F} V${F - 60 * s} M${x} ${F - 40 * s} l${-26 * s} ${-30 * s} M${x} ${F - 50 * s} l${24 * s} ${-28 * s}" ${hs('#6b4a2f', '#1c1428')} stroke-width="${7 * s}"/><g ${hc('#f2b8c6', '#5a3a52')}>${[[0, -96, 46], [-36, -78, 34], [36, -80, 34], [-14, -122, 30], [20, -118, 30]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g>`;
  const petal = (x, y, k) => `<g transform="translate(${x} ${y})"><ellipse  rx="4" ry="2.6" ${hcx('fx-fall', '#f7c6d2', '#6a4a62', `animation-delay:-${k * 1.3}s;animation-duration:${9 + (k % 3) * 2}s`)}/></g>`;
  const pine = (x, s) => `<path d="M${x} ${F} V${F - 70 * s}" ${hs('#6b4a2f', '#0b0c22')} stroke-width="${8 * s}"/>${[[0, -78, 44], [-24, -60, 34], [26, -58, 32], [0, -100, 28]].map(([dx, dy, r]) => `<ellipse cx="${x + dx * s}" cy="${F + dy * s}" rx="${r * s}" ry="${r * 0.42 * s}" ${hc('#3f6a48', '#0c1428')}/>`).join('')}`;
  return `<svg class="land tall castle-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <defs><clipPath id="cWall"><path d="M600 198 C650 186 690 140 706 64 H1054 C1070 140 1110 186 1160 198 Z"/></clipPath></defs>
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      <ellipse class="glow" cx="${cx}" cy="-40" rx="320" ry="260" fill="url(#glw)"/>
      <path d="M600 198 C650 186 690 140 706 64 H1054 C1070 140 1110 186 1160 198 Z" ${hc('#b4ab98', '#3a3a58')}/>
      <g clip-path="url(#cWall)">${Array.from({ length: 10 }, (_, r) => Array.from({ length: 18 }, (_, k) => `<rect x="${600 + k * 34 - (r % 2) * 17}" y="${64 + r * 14}" width="34" height="14" fill="none" ${hs('#958c7a', '#2a2a46')} stroke-width="1.2"/>`).join('')).join('')}</g>
      ${tier(0, 156, 64, 3)}${roof(-14, 170, 22)}<path d="M${cx - 44} 8 C${cx - 24} 8 ${cx - 16} -12 ${cx} -14 C${cx + 16} -12 ${cx + 24} 8 ${cx + 44} 8" ${hs('#4f5a6e', '#2a3150')} stroke-width="8"/>
      ${tier(-70, 128, 56, 2)}${gable(-60, 52)}${roof(-86, 140, 20)}
      ${tier(-128, 96, 44, 2)}${gable(-120, 40)}${roof(-142, 108, 18)}
      ${tier(-176, 66, 36, 1)}${roof(-190, 78, 16)}
      ${tier(-218, 44, 30, 1)}${roof(-236, 56, 20)}<rect x="${cx - 48}" y="-242" width="96" height="8" rx="3" ${hc('#3a4254', '#1c2240')}/>
      ${[-46, 46].map((d) => `<path d="M${cx + d - 6} -242 q${d > 0 ? 10 : -10} -14 ${d > 0 ? 2 : -2} -22 q${d > 0 ? 8 : -8} 4 ${d > 0 ? 8 : -8} 14 Z" fill="#e6c25a"/>`).join('')}
      <rect x="-20" y="198" width="1240" height="38" ${hc('#6a9ab8', '#141a3a')}/><path d="M-20 199 H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>
      ${[[120, 214], [420, 222], [700, 212], [980, 224], [1140, 214]].map(([x, y], k) => `<g transform="translate(${x} ${y})"><ellipse  rx="18" ry="4" fill="none" ${hsx('fx-ripple', '#ffffff', '#5a6aa0', `animation-delay:-${k * 0.7}s`)} stroke-width="1.6"/></g>`).join('')}
      ${[[640, 0], [690, 1]].map(([x, k]) => `<g class="fx-swim" style="animation-delay:-${k * 1.2}s"><g transform="translate(${x} 222)"><path d="M-14 0 q0 -10 14 -10 q12 0 16 -6 q-4 10 -2 16 Z" ${hc('#fbfaf6', '#9a9ec8')}/><path d="M10 -6 q-2 -14 4 -20" fill="none" ${hs('#fbfaf6', '#9a9ec8')} stroke-width="3.4" stroke-linecap="round"/><path d="M14 -26 l6 2 l-6 2" ${hc('#e6883a', '#5a4a3a')}/><ellipse cx="2" cy="1" rx="18" ry="2" fill="#fff" fill-opacity=".3"/></g></g>`).join('')}
      <rect x="150" y="70" width="220" height="80" ${hc('#f6f3ec', '#e2dac6')}/><path d="M130 76 Q260 52 390 76 L380 86 Q260 64 140 86 Z" ${hc('#4f5a6e', '#2a3150')}/>${[176, 220, 300, 344].map((x) => `<rect ${hc('#3b3b44', '#ffd98a')} x="${x - 6}" y="96" width="12" height="9"/>`).join('')}
      <rect x="150" y="150" width="50" height="48" ${hc('#b4ab98', '#3a3a58')}/><rect x="320" y="150" width="50" height="48" ${hc('#b4ab98', '#3a3a58')}/><rect x="200" y="140" width="120" height="58" ${hc('#5a3b28', '#2a2440')}/><path d="M260 140 V198" ${hs('#3a2418', '#1c1430')} stroke-width="3"/>${[230, 290].map((x) => `<circle cx="${x}" cy="170" r="3" ${hc('#d9b04a', '#a88a4a')}/>`).join('')}
      <path d="M196 198 H324 L332 ${F} H188 Z" ${hc('#a8743f', '#3a2c40')}/>${[204, 224, 244, 264, 284, 304].map((x) => `<path d="M${x} 200 L${x - 2} ${F}" ${hs('#8a5a30', '#2a2440')} stroke-width="1.6"/>`).join('')}
      <g data-fx="sakuraL">${sakura(60, 1.2)}</g><g data-fx="sakuraR">${sakura(1150, 1.1)}</g>${pine(420, 0.8)}
      ${[176, 344].map((x) => `<path d="M${x - 12} ${F} l3 -8 h18 l3 8 Z" ${hc('#a9a497', '#2c2e4c')}/><rect x="${x - 4}" y="${F - 40}" width="8" height="32" ${hc('#b4ad9e', '#34365a')}/><rect x="${x - 10}" y="${F - 58}" width="20" height="18" rx="1" ${hc('#b4ad9e', '#34365a')}/><rect x="${x - 5}" y="${F - 54}" width="10" height="10" ${hc('#5a5a64', '#ffd27a')}/><path d="M${x - 16} ${F - 58} L${x} ${F - 70} L${x + 16} ${F - 58} Z" ${hc('#9a958a', '#2a2c4c')}/><circle class="glow" cx="${x}" cy="${F - 49}" r="26" fill="url(#glw)"/>`).join('')}
      <rect x="430" y="${F - 70}" width="130" height="70" ${hc('#efe6d6', '#25264a')}/><path d="M420 ${F - 70} h150 l-12 -16 h-126 Z" ${hc('#8a6a52', '#1c1d3c')}/><rect x="450" y="${F - 62}" width="90" height="18" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/>
      <text x="495" y="${F - 49}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">案内所</text><rect x="455" y="${F - 36}" width="80" height="36" ${hc('#cfe6ec', '#ffd98a')}/>
      <rect x="590" y="${F - 64}" width="70" height="46" rx="2" ${hc('#fbf7ec', '#3a3b62')}/><rect x="620" y="${F - 18}" width="8" height="18" ${hc('#6e4f3a', '#2c2440')}/><text x="625" y="${F - 48}" text-anchor="middle" font-size="10" font-weight="700" ${hc('#3b2a1c', '#c9c4e8')} font-family="system-ui, sans-serif">白鷺城</text>
      <path d="M598 ${F - 38} h54 M598 ${F - 30} h44" ${hs('#9a9184', '#4a4e78')} stroke-width="2"/>
      <path d="M576 ${F} V${F - 130}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path  d="M577 ${F - 128} h22 v80 h-22 Z" ${hcx('fx-flag', '#f6f3ec', '#4a4c72')}/>${vText(588, F - 122, '白鷺城', 12, `font-weight="700" fill="#2f4a6e" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
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
  if (bus) bus.classList.add('go');
  setTimeout(() => { yh.arrive = { from: yPlace, to }; go(PLACE_ROUTE[to]); }, 700);
}
// 駅前 (test, 2026-11-09), the bus's first stop: みなと駅 with its clock and ticket machines, the 交番 beside it with its red lamp, a
// square with benches and trees, and the bus stop at the right
function stationHtml() {
  const F = 236;
  // 2026-11-10 (the user: every place looked the same): city-like — buildings behind, a viaduct over the back with a train along it
  // now and then, the station under it with its sign, a clock and a board running the next trains, the taxi stand (鈴木's taxi),
  // bikes, the 交番 with its blinking lamp, pigeons pecking on the square; the road along the front (busRoad)
  const tower = (x, w, h, c) => `<rect x="${x}" y="${F - h}" width="${w}" height="${h}" ${hc(c, '#1a1c3a')}/>${Array.from({ length: Math.floor((h - 20) / 22) }, (_, r) => Array.from({ length: Math.floor((w - 10) / 18) }, (_, k) => `<rect ${((r * 7 + k * 3 + x) % 5) < 2 ? 'class="lit"' : hc('#d9e6ec', '#232548')} x="${x + 8 + k * 18}" y="${F - h + 12 + r * 22}" width="9" height="12"/>`).join('')).join('')}`;
  const car = (x, k) => `<g transform="translate(${x} -2)"><rect x="0" y="0" width="216" height="46" rx="8" ${hc('#e8ebee', '#3a3f66')}/><rect x="0" y="30" width="216" height="6" ${hc('#3f9a8c', '#2a4a5a')}/>${[14, 50, 86, 122, 158].map((wx) => `<rect x="${wx}" y="8" width="26" height="16" rx="3" ${hc('#9fc0d0', '#ffe2a0')}/>`).join('')}<rect x="190" y="6" width="16" height="30" rx="2" ${hc('#c9cdd4', '#2a2c50')}/>${k === 0 ? `<path d="M0 6 Q-16 10 -18 30 V40 H0 Z" ${hc('#e8ebee', '#3a3f66')}/>` : ''}</g>`;
  const bike = (x) => `<g ${hs('#4a4a55', '#3a3d66')} stroke-width="2"><circle cx="${x}" cy="${F + 30}" r="9"/><circle cx="${x + 26}" cy="${F + 30}" r="9"/><path d="M${x} ${F + 30} L${x + 10} ${F + 14} L${x + 22} ${F + 14} L${x + 26} ${F + 30} M${x + 10} ${F + 14} L${x + 14} ${F + 30} L${x + 22} ${F + 14} M${x + 8} ${F + 10} h6 M${x + 22} ${F + 14} l2 -6 h5"/></g>`;
  const pigeon = (x, k) => `<g class="fx-peck" style="animation-delay:-${k * 0.6}s"><ellipse cx="${x}" cy="${F + 70}" rx="9" ry="6" ${hc('#8d93a8', '#2c2f52')}/><circle cx="${x + 8}" cy="${F + 64}" r="4" ${hc('#7a8098', '#2c2f52')}/><path d="M${x + 12} ${F + 64} l3 1" ${hs('#d0904a', '#3a3d66')} stroke-width="1.6"/><path d="M${x - 9} ${F + 68} l-6 -2" ${hs('#6a7088', '#2c2f52')} stroke-width="3"/></g>`;
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
      <circle cx="360" cy="${F - 150}" r="15" ${hc('#fbf7ec', '#e8dcb4')}/>${clockHands(360, F - 150, 13)}
      <rect x="448" y="${F - 128}" width="224" height="28" rx="3" fill="#1c1c22"/>
      <g clip-path="url(#stLed)"><g class="fx-scroll"><text x="456" y="${F - 109}" font-size="13" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${board}${board}</text></g></g>
      <rect x="320" y="${F - 120}" width="110" height="60" ${hc('#cfe6ec', '#ffd98a')}/><rect x="690" y="${F - 120}" width="110" height="60" ${hc('#cfe6ec', '#ffd98a')}/>
      <g style="opacity:calc(.5 + .5 * var(--day))"><rect x="336" y="${F - 114}" width="30" height="42" fill="#7fb3d8"/><path d="M338 ${F - 80} L351 ${F - 100} L364 ${F - 80} Z" fill="#fbfaf6"/><path d="M336 ${F - 78} h30 v6 h-30 Z" fill="#4f8a5a"/><rect x="384" y="${F - 114}" width="30" height="42" fill="#f2b8c6"/><circle cx="399" cy="${F - 98}" r="8" fill="#fbfaf6"/><path d="M386 ${F - 80} q13 -8 26 0" fill="none" stroke="#c84a3a" stroke-width="2"/>
      <rect x="708" y="${F - 114}" width="30" height="42" fill="#3f7ac8"/><path d="M710 ${F - 84} q14 -10 26 0" fill="none" stroke="#fbfaf6" stroke-width="2.4"/><circle cx="728" cy="${F - 102}" r="5" fill="#f2c94c"/></g>
      <rect x="480" y="${F - 96}" width="160" height="96" ${hc('#6b7a8a', '#141632')}/>${[484, 524, 564, 604].map((x) => `<rect x="${x}" y="${F - 90}" width="34" height="90" ${hc('#cfe6ec', '#ffd98a')}/>`).join('')}${[500, 540, 580, 620].map((x) => `<rect x="${x - 3}" y="${F - 40}" width="6" height="30" fill="#8a96a8" fill-opacity=".55"/><rect x="${x - 10}" y="${F - 40}" width="20" height="5" rx="2" fill="#5a6a7a" fill-opacity=".5"/>`).join('')}
      <ellipse class="glow" cx="560" cy="${F - 30}" rx="220" ry="80" fill="url(#glw)"/>
      ${[330, 368, 406].map((x) => `<rect x="${x}" y="${F - 52}" width="30" height="52" rx="3" ${hc('#d9604c', '#4a2c40')}/><rect x="${x + 5}" y="${F - 46}" width="20" height="12" rx="2" ${hc('#cfe6ec', '#5a66a8')}/>`).join('')}
      <rect x="40" y="${F - 120}" width="8" height="120" ${hc('#5a5a64', '#1c1d3c')}/><rect x="10" y="${F - 134}" width="76" height="22" rx="3" ${hc('#2f4a6e', '#1c1d3c')}/><text x="48" y="${F - 119}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">タクシー</text>
      <rect x="880" y="${F - 96}" width="126" height="96" ${hc('#f3efe6', '#25264a')}/><path d="M866 ${F - 96} L943 ${F - 124} L1020 ${F - 96} Z" ${hc('#4a4a55', '#1c1d3c')}/>
      <rect x="906" y="${F - 88}" width="74" height="18" rx="2" ${hc('#2b2b33', '#1c1d3c')}/><text x="943" y="${F - 75}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">交番</text>
      <g class="fx-blink"><circle cx="943" cy="${F - 132}" r="7" fill="#e0524b"/><circle class="glow" cx="943" cy="${F - 132}" r="30" fill="url(#glw)"/></g>
      <rect x="922" y="${F - 62}" width="40" height="62" ${hc('#8a6a52', '#3a2c40')}/><rect x="968" y="${F - 62}" width="28" height="32" ${hc('#cfe6ec', '#ffd98a')}/>
      ${[1090, 1150].map((x) => `<rect x="${x - 24}" y="${F - 14}" width="48" height="14" rx="2" ${hc('#a8a49a', '#2a2c50')}/><rect class="trunk" x="${x - 3}" y="${F - 70}" width="6" height="58"/><g class="crown"><circle cx="${x}" cy="${F - 84}" r="22"/><circle cx="${x - 16}" cy="${F - 68}" r="15"/><circle cx="${x + 16}" cy="${F - 70}" r="16"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      <g data-fx="spigeons">${pigeon(590, 0)}${pigeon(626, 1)}${pigeon(660, 2)}</g>${streetLamp(860, F + 4, 124)}
      <g data-fx="svend">${[242, 274].map((x, i) => `<rect x="${x}" y="${F - 72}" width="30" height="72" rx="3" ${hc(i ? '#d0453c' : '#e9edf0', i ? '#4a2030' : '#3a4470')}/><rect x="${x + 3}" y="${F - 66}" width="24" height="26" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${[0, 1].map((r) => [0, 1, 2].map((c) => `<rect x="${x + 5 + c * 7}" y="${F - 63 + r * 11}" width="5" height="8" rx="1.5" fill="${['#3f7ac8', '#e6a23c', '#4f7a4a', '#d0574b'][(r + c + i) % 4]}"/>`).join('')).join('')}<rect x="${x + 6}" y="${F - 26}" width="18" height="8" rx="2" ${hc('#2b2b33', '#141530')}/>`).join('')}</g><ellipse class="glow" cx="273" cy="${F - 46}" rx="70" ry="56" fill="url(#glc)"/>
      ${[452, 668].map((x) => `<rect x="${x}" y="${F - 18}" width="40" height="18" rx="2" ${hc('#a8a49a', '#2a2c50')}/>${[6, 16, 26, 34].map((d, k) => `<circle cx="${x + d}" cy="${F - 22 - (k % 2) * 4}" r="5" fill="${['#e86f5e', '#f2c94c', '#e58fa8', '#ffffff'][k]}" fill-opacity=".92"/>`).join('')}<path d="M${x + 2} ${F - 18} q18 -10 36 0" fill="none" ${hs('#5f9a4a', '#16243a')} stroke-width="4"/>`).join('')}
      ${busRoad()}
    </svg>
    ${landProp(112, `<g data-fx="taxi"><g transform="translate(110 ${F + 12})"><ellipse cx="60" cy="10" rx="64" ry="5" fill="#000" fill-opacity=".1"/><path d="M0 0 V-22 Q2 -30 14 -32 L34 -46 H82 L104 -32 Q118 -30 120 -22 V0 Z" ${hc('#f3d24a', '#5a5030')}/><path d="M40 -42 H78 L94 -30 H26 Z" ${hc('#9fc0d0', '#ffe2a0')}/><path d="M60 -42 V-30" ${hs('#f3d24a', '#5a5030')} stroke-width="2.4"/><path d="M2 -14 H118" ${hs('#2b2b33', '#2a2a40')} stroke-width="1.4"/><rect x="48" y="-56" width="24" height="10" rx="2" ${hc('#fbf7ec', '#fff0b0')}/><text x="60" y="-48.5" text-anchor="middle" font-size="7" font-weight="700" fill="#2b2b33" font-family="system-ui, sans-serif">TAXI</text><circle cx="26" cy="0" r="10" fill="#2b2b33"/><circle cx="94" cy="0" r="10" fill="#2b2b33"/><circle cx="26" cy="0" r="4" fill="#9a9ea8"/><circle cx="94" cy="0" r="4" fill="#9a9ea8"/><circle cx="118" cy="-16" r="3" fill="#ffd98a"/></g></g>`, null, [102, F - 50, 240, F + 30])}
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
  const noren = (x, c, sign) => `${[0, 1, 2].map((k) => `<path class="fx-sway" style="animation-delay:-${k * 0.5}s" d="M${x + k * 35} 138 h34 v54 h-34 Z" fill="${c}"/>`).join('')}<text x="${x + 52}" y="174" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" font-family="serif">ゆ</text><text x="${x + 52}" y="152" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity=".9" font-family="system-ui, sans-serif">${sign}</text>`;
  const lattice = (x) => `<rect x="${x}" y="140" width="92" height="62" ${hc('#cfe6ec', '#ffd98a')}/>${Array.from({ length: 9 }, (_, k) => `<path d="M${x + 6 + k * 10} 140 v62" ${hs('#6e4a2c', '#3a2c40')} stroke-width="3"/>`).join('')}<rect x="${x - 4}" y="136" width="100" height="6" ${hc('#5a3b28', '#2a2440')}/><rect x="${x - 4}" y="200" width="100" height="6" ${hc('#5a3b28', '#2a2440')}/>`;
  const pot = (x) => `<path d="M${x - 14} ${F - 22} h28 l-4 22 h-20 Z" ${hc('#a8604a', '#3a2c40')}/>${[[-8, -40], [0, -48], [8, -40], [-4, -34], [5, -32]].map(([dx, dy]) => `<ellipse cx="${x + dx}" cy="${F + dy}" rx="8" ry="5" transform="rotate(${dx * 4} ${x + dx} ${F + dy})" ${hc('#5f9a4a', '#16243a')}/>`).join('')}`;
  return `<svg class="land tall sento-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${house(10, 120, 150)}${house(150, 110, 160)}${house(980, 120, 150)}${house(1110, 100, 162)}
      <rect x="992" y="170" width="96" height="16" rx="2" ${hc('#2f7a9a', '#1c2a44')}/><text x="1040" y="182" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">コインランドリー</text>
      <rect x="994" y="190" width="92" height="40" ${hc('#dfe8ec', '#ffe2a0')}/>${[1014, 1040, 1066].map((x, k) => `<rect x="${x - 11}" y="196" width="22" height="30" rx="2" ${hc('#f4f3ee', '#4a4c72')}/><circle cx="${x}" cy="213" r="8" ${hc('#6a8aa8', '#2a3060')}/><g class="fx-spin" style="animation-delay:-${k * 0.4}s;transform-origin:${x}px 213px"><path d="M${x - 5} 213 a5 5 0 0 1 10 0" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><circle cx="${x - 2}" cy="216" r="1.6" fill="#e86f5e"/></g>`).join('')}
      ${[0, 1, 2, 3].map(puff).join('')}
      <path d="M876 ${F} L884 -300 H916 L924 ${F} Z" ${hc('#cfc7b8', '#2a2c4c')}/><rect x="880" y="-306" width="40" height="12" ${hc('#6f6a62', '#1c1d3c')}/><rect x="882" y="-270" width="36" height="8" ${hc('#c8453a', '#4a2030')}/><rect x="882" y="-254" width="36" height="8" ${hc('#c8453a', '#4a2030')}/>
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
      <g class="fx-sway"><path d="M452 130 v8" ${hs('#2b2b33', '#1c1d3c')} stroke-width="1.6"/><ellipse cx="452" cy="152" rx="11" ry="15" ${hc('#d84a3a', '#ff8a5a')}/><text x="452" y="157" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="serif">ゆ</text></g>
      <circle class="glow" cx="452" cy="152" r="40" fill="url(#glw)"/>
      ${pot(456)}${pot(704)}
      <g data-fx="milk"><rect x="160" y="${F - 92}" width="62" height="92" rx="4" ${hc('#3f7ac8', '#22305e')}/><rect x="168" y="${F - 84}" width="46" height="34" rx="2" ${hc('#fbf7ec', '#cfd6ff')}/>
      <text x="191" y="${F - 62}" text-anchor="middle" font-size="10" font-weight="700" ${hc('#3f7ac8', '#22305e')} font-family="system-ui, sans-serif">牛乳</text>${[172, 186, 200].map((x) => `<rect x="${x}" y="${F - 42}" width="10" height="14" rx="2" ${hc('#f6f3ec', '#cfd6ff')}/>`).join('')}</g><ellipse class="glow" cx="191" cy="${F - 50}" rx="70" ry="60" fill="url(#glc)"/>
      ${[972, 1004].map((x) => `<g ${hs('#4a4a55', '#3a3d66')} stroke-width="2"><circle cx="${x}" cy="${F - 10}" r="10"/><circle cx="${x + 28}" cy="${F - 10}" r="10"/><path d="M${x} ${F - 10} L${x + 11} ${F - 28} L${x + 24} ${F - 28} L${x + 28} ${F - 10} M${x + 11} ${F - 28} L${x + 15} ${F - 10} L${x + 24} ${F - 28}"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${[[806, 0], [834, 0], [862, 0], [820, 1], [848, 1], [834, 2]].map(([x, r]) => `<path d="M${x - 12} ${F - 14 - r * 14} h24 l-3 14 h-18 Z" ${hc('#f2c94c', '#5a5030')}/><path d="M${x - 12} ${F - 14 - r * 14} h24" ${hs('#d9a43a', '#3a3420')} stroke-width="2"/><text x="${x}" y="${F - 4 - r * 14}" text-anchor="middle" font-size="5.5" font-weight="700" fill="#d0453c" font-family="system-ui, sans-serif">ケロリン</text>`).join('')}
      <path d="M262 ${F} L272 ${F - 58} H306 L316 ${F}" fill="none" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><rect x="268" y="${F - 56}" width="42" height="40" rx="2" ${hc('#fbf7ec', '#3a3b62')}/>${vText(289, F - 51, '営業中', 10, `font-weight="700" ${hc('#c8453a', '#ff9a7a')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
      ${busRoad()}
    </svg>
    ${benchProps(250, F + 47, 63, 110, `<g class="fx-bob" data-fx="scat" style="animation-duration:3.4s"><path d="M318 ${F + 47} q-2 -16 16 -18 q18 -1 18 14 q0 4 -2 4 Z" ${hc('#e6a65a', '#5a4a3a')}/><path d="M336 ${F + 30} l3 -7 l4 7 Z M344 ${F + 31} l4 -6 l2 8 Z" ${hc('#e6a65a', '#5a4a3a')}/><path d="M318 ${F + 47} q-14 -2 -12 -10" ${hs('#e6a65a', '#5a4a3a')} stroke-width="4"/><path d="M338 ${F + 37} q3 2 6 0" ${hs('#5a3a28', '#2c2440')} stroke-width="1.2"/></g>`)}
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
function yWitch(yard) {   // she joins the sky, or leaves it (caught on another device, Halloween over); the server's day asked if not known
  const put = (day) => {
    if (!yard.isConnected) return;
    const d = day || (salePreview() ? todayStr() : null), had = yard.querySelector('.witch');
    const id = d && (salePreview() || saleOn('halloween', d)) && !state.koto.found[witchId(d)] ? witchId(d) : null;
    if (had && !had.classList.contains('fall') && had.dataset.witch !== id) had.remove();
    if (id && !yard.querySelector('.witch')) yard.querySelector('.sky .night').insertAdjacentHTML('beforeend', witchHtml(id));
  };
  const day = saleNow();
  if (day || salePreview()) put(day); else saleClock().then(put);
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
// her 言靈 seen (1.2.2): while she falls, a ring of light and ten あ burst out where she slipped; once she is behind the
// hills they fly one by one into the 言靈 button up top, which bounces and counts up a tenth each (a rising 叮 with 答題音效 on),
// glows at the last, and +n rises beside it; the buttons are kept up meanwhile. The button put away (擺設, the dressing room):
// the pop up top says it; motion reduced: no flight, the new count at once
function witchCoins(yard, at, n) {
  const kb = yard.querySelector('.yard-tools .study-koto'), num = kb && kb.querySelector('span'), wake = () => { if (yard._wake) yard._wake(); };
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
  return `<div class="yard${street ? ' away ' + place : ''}${INDOOR.includes(place) ? ' indoor' : ''}${pct >= 100 ? ' full' : ''}" data-anim data-place="${place}" style="--f:${f}">
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
          ${[[70, 148], [128, 146]].map(([x, y]) => `<path d="M${x - 5} ${y} l5 -5 l5 5 Z" ${hc('#e86f5e', '#4a2c48')}/>`).join('')}
        </g>
        <path class="far" d="M190 154 C230 144 262 128 300 116 C340 106 390 98 440 106 S540 90 640 104 S860 124 960 108 C1000 100 1040 98 1080 104 V370 H190 Z"/>
        <g class="yard-market">
          <path d="M940 160 C1010 128 1100 102 1220 92 V370 H940 Z" ${hc('#9dbb8e', '#141a36')}/>
          ${[[1004, 146, 14], [1028, 138, 17], [1046, 147, 13], [1062, 128, 15], [1080, 140, 18], [1098, 121, 14], [1104, 134, 16], [1122, 147, 13], [1132, 115, 17], [1146, 128, 14], [1160, 109, 15], [1168, 140, 16], [1182, 120, 14], [1196, 104, 17], [1200, 133, 13], [1150, 152, 15]].sort((p, q) => p[1] - q[1]).map(([x, g, w], k) => { const h = Math.round(w * 0.7); return `<rect x="${x - w / 2}" y="${g - h}" width="${w}" height="${h}" ${hc(k % 3 ? '#efe4d2' : '#e6dccb', '#1e2042')}/><path d="M${x - w / 2 - 2} ${g - h + 1} L${x} ${g - h - w * 0.4} L${x + w / 2 + 2} ${g - h + 1} Z" ${hc(['#8a5a44', '#5f6f8a', '#6f5a7a', '#8a2f2a'][(k * 3) % 4], '#15163a')}/>${k % 4 === 1 ? `<rect class="lit" x="${x - 3}" y="${g - h + 3}" width="5" height="4"/>` : ''}`; }).join('')}
          <path d="M1060 112 Q1110 100 1170 92" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width=".8"/>${[1072, 1094, 1116, 1138, 1160].map((x, k) => `<path d="M${x} ${108 - k * 3} l3 0 l-1.5 3 Z" fill="${['#d0574b', '#e6c23a', '#3f7ac8'][k % 3]}"/>`).join('')}
        </g>
        <path d="M-20 158 C60 156 150 154 230 164 C270 170 300 186 318 214 V370 H-20 Z" ${hc('#a6bd96', '#161c38')}/>
        <path d="M1220 120 C1150 124 1060 140 990 162 C950 176 920 196 900 222 V370 H1220 Z" ${hc('#a6bd96', '#161c38')}/>
        <path d="M74 214 L40 202 L118 190 L64 178 L150 168 L120 158" fill="none" ${hs('#e3cf9e', '#3a3858')} stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M1128 216 L1166 200 L1084 188 L1146 174 L1066 164 L1100 152" fill="none" ${hs('#cfc8b8', '#3a3858')} stroke-width="3.4" stroke-linejoin="round"/>
        <path class="near" d="${ground} V370 H0 Z"/><path class="ridge" d="${ground}"/>
        <path class="lane" d="${stripD(LANE, 24)}"/>${lightPool(600, 156, 70, 14)}
        ${[[240, 250, 1], [330, 300, 1.3], [420, 214, .9], [470, 340, 1.4], [520, 262, 1], [690, 236, 1], [740, 318, 1.3], [800, 200, .8], [880, 280, 1.2], [960, 236, 1], [1020, 330, 1.4], [300, 196, .8], [1080, 268, 1.1], [150, 300, 1.3]].map(([x, y, k], i) => `<path d="M${x - 6 * k} ${y} q${2 * k} ${-8 * k} ${1 * k} ${-14 * k} q${3 * k} ${6 * k} ${4 * k} ${12 * k} q${2 * k} ${-9 * k} ${6 * k} ${-12 * k} q${-1 * k} ${8 * k} ${1 * k} ${14 * k} Z" ${hcx('fx-tuft', '#6e9a5c', '#0e1630', `animation-delay:-${(i * 0.7) % 3}s`)}/>`).join('')}
        <g data-fx="ytree"><rect class="trunk" x="465" y="104" width="8" height="46"/><g class="crown"><circle cx="469" cy="96" r="22"/><circle cx="452" cy="110" r="15"/><circle cx="487" cy="108" r="16"/></g></g>
        ${[700, 722, 744, 766].map(x => `<rect class="post" x="${x}" y="131" width="4" height="19" rx="1"/>`).join('')}<path class="rail" d="M698 138 H772 M698 145 H772"/>
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
          <rect class="mb-post" x="23" y="33" width="6" height="32" rx="1"/>
          <rect class="mb-body" x="6" y="14" width="40" height="20" rx="6"/><path class="mb-rim" d="M12 14.6 H40"/>
          <rect class="mb-env" x="-4" y="18.5" width="12" height="6.5" rx=".8" transform="rotate(-14 2 21.7)"/>
          <rect class="mb-lid" x="3.5" y="13" width="5.5" height="22" rx="2.2"/>
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
  return `<button type="button" class="study-koto" data-act="koto-shop" aria-label="言靈 ${kotoBalance()}，到古道具屋" title="古道具屋">${kotoIcon()}<span>${kotoBalance()}</span></button><button type="button" class="study-wear" data-act="wardrobe" aria-label="衣櫃" title="衣櫃">${icon('hanger')}</button><button type="button" class="study-edit${editAct === 'yard-edit' ? ' yard-edit' : ''}" data-act="${editAct}" aria-label="擺設" title="擺設">${icon('arrange')}</button><button type="button" class="study-gear" data-act="settings" aria-label="設定" title="設定">${icon('settings')}</button>`;
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
