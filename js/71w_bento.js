'use strict';
// ---------- 駅弁の立ち売り (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §4) ----------
// ハル's job on みなと駅's platform, the first of 駅前's (m1): three trains a shift, ten passengers in all (3, 3, 4). A train in, its
// windows open one after another and each calls すみません！ — the hero picks whom to serve, hears what they want and how many
// (heard, not read: the words shown once handed over, or after two misses), takes it out of the tray round his neck and hands it
// over (どうぞ). Counting is the point: つ for things (ひとつ ふたつ みっつ), 本 for bottles (いっぽん にほん さんぼん), と between
// two; from m2 the tea hot (orange cap) or cold (blue). Some ask whether there is something first (はい、あります／すみません、
// ありません), 中村 says only いつもの (ハル tells what that is the first time), and from m6 a reason comes first (ので). The train
// waits for no one: its bell at ten seconds left, then the doors and away — whoever was not served is lost (3); all served, it goes.
const BENTO = (() => {
  const E = () => TOWN.EKI.bento;
  const TRAINS = [3, 3, 4], SECS = [45, 45, 55], BELL = 10;   // passengers a train; how long it stands (s); its bell before it goes
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const COUNT = { つ: ['{一|ひと}つ', '{二|ふた}つ', '{三|みっ}つ'], 本: ['{一本|いっぽん}', '{二本|にほん}', '{三本|さんぼん}'] };
  const hotCold = () => TOWNEV.reachedIdx() >= TOWNEV.unitIdx('m2');   // あたたかい／つめたい お茶 from m2
  const because = () => TOWNEV.reachedIdx() >= TOWNEV.unitIdx('m6');   // a reason (ので) from m6
  const good = (id) => E().goods.find((g) => g[0] === id);
  // the tray's goods: one お茶 before m2, the hot and the cold one after
  const goodsOf = (hc) => E().goods.filter((g) => (g[4] ? hc : g[0] !== 'tea' || !hc));
  const goods = () => goodsOf(hotCold());
  const count = (id, n) => (good(id)[3] ? COUNT[good(id)[3]][n - 1] : '');
  const said = (id, n) => `${good(id)[1]}を ${count(id, n)}`.replace(/ $/, '');   // お茶を 一本
  const tea = (id, hc, hot = true) => (id === 'tea' && hc ? (hot ? 'tea_hot' : 'tea_cold') : id);
  // what is asked for, as said: one thing, or two (と); a reason before it
  function line(o) {
    if (o.kind === 'usual') return E().usual;
    if (o.kind === 'have') return o.ask[0];
    const parts = o.items.map(([id, n]) => said(o.why && /^tea_/.test(id) ? 'tea' : id, n)), body = parts.length === 1 ? `${parts[0]} ください。` : `${parts[0]}と、${parts[1]} ください。`;
    return o.why ? `${o.why[0]}、${body}` : body;
  }
  // after an ask: there is (じゃあ、ふたつ ください。) or not (じゃあ、お茶を いっぽん ください。)
  const then = (o) => (o.has ? `じゃあ、${count(o.items[0][0], o.items[0][1])} ください。` : `じゃあ、${said(...o.items[0])} ください。`);
  const unitZh = (id) => (good(id)[3] === '本' ? '瓶' : good(id)[3] ? '個' : '份');
  const thenZh = (o) => { const [id, n] = o.items[0]; return o.has ? `那就給我 ${n} ${unitZh(id)}。` : `那就給我${good(id)[5]} ${n} ${unitZh(id)}。`; };
  const zhOf = (o) => (o.kind === 'usual' ? E().usualZh : o.kind === 'have' ? o.ask[1] : (o.why ? o.why[1] : '') + o.items.map(([id, n]) => `${good(id)[5]} ${n} ${unitZh(id)}`).join('、'));
  // who says it: each line by the same one, so the clips stay few (中村: his いつもの)
  const CUST = ['nishimura', 'taro', 'misaki', 'kenta', 'sophia', 'alex', 'kaneda', 'umeko', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const sayer = (text) => { let h = 7; for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0; return CUST[Math.abs(h) % CUST.length]; };
  // every order a shift could ask (hc: the tea hot or cold; why: with a reason): one thing (one to three of it), two from pairs
  function orders(hc = hotCold(), why = because(), hot = () => Math.random() < 0.5) {
    const out = [];
    goodsOf(hc).forEach(([id, , , ctr]) => (ctr ? [1, 2, 3] : [1]).forEach((n) => out.push({ kind: 'order', items: [[id, n]] })));
    E().pairs.forEach(([a, na, b, nb]) => out.push({ kind: 'order', items: [[tea(a, hc, hot()), na], [tea(b, hc, hot()), nb]] }));
    if (why) E().why.forEach(([w, wz, id, n]) => out.push({ kind: 'order', items: [[id, n]], why: [w, wz] }));   // the tea said just お茶: the reason tells which (寒いので → hot)
    return out;
  }
  const haveOf = (h, hc) => ({ kind: 'have', ask: h, has: Boolean(h[2]), items: [[tea(h[2] || h[3], hc), h[4]]] });
  const usualOf = (hc) => ({ kind: 'usual', items: E().usualItems.map(([id, n]) => [tea(id, hc), n]) });
  // a shift: three trains of passengers, never the same one twice on a train; an ask now and then, 中村's いつもの at most once
  function make() {
    const hc = hotCold(), all = orders(hc), ts = []; let usual = false;
    TRAINS.forEach((n) => {
      const t = [], used = new Set();
      for (let tries = 0; t.length < n && tries < 50; tries++) {
        const r = Math.random(), o = !usual && r < 0.15 ? usualOf(hc) : r < 0.32 ? haveOf(pick(E().have), hc) : Object.assign({}, pick(all));
        o.line = line(o); o.who = o.kind === 'usual' ? 'nakamura' : sayer(o.line); if (o.kind === 'have') { o.then = then(o); o.thenZh = thenZh(o); }
        if (used.has(o.who)) continue; used.add(o.who); if (o.kind === 'usual') usual = true; t.push(o);
      }
      ts.push(t);
    });
    return ts;
  }
  // every line a shift could have said (their clips): each order of both tray sets, each tea either way, the asks and what follows
  function allOrders() {
    const out = [];
    [false, true].forEach((hc) => [true, false].forEach((hot) => orders(hc, hc, () => hot).forEach((o) => out.push(o))));
    [false, true].forEach((hc) => { E().have.forEach((h) => out.push(haveOf(h, hc))); out.push(usualOf(hc)); });
    out.forEach((o) => { o.line = line(o); o.who = o.kind === 'usual' ? 'nakamura' : sayer(o.line); if (o.kind === 'have') o.then = then(o); });
    return out;
  }
  return { make, orders, allOrders, line, said, goods, good, sayer, zhOf, TRAINS, SECS, BELL, CUST, hotCold };
})();

// ---- the card: the car's side close up (four windows that open, someone leaning out of each one called), the departure clock,
// the one picked and what they said (heard: 🔊), the replies to an ask, what is in the hero's hands and どうぞ; the tray below ----
const BENTO_RUN = (() => {
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const WINX = [12, 100, 188, 276];   // the windows' left edges on the 360-wide car
  let B = null, runs = 0;   // the train now (the tests): { t, phase, wins: [{ w, k, o, state, miss, heard, asked, shown }], sel, hand }
  const S = () => TOWN.WORK.say.bento;
  // a bottle of tea for the tray (PICS has a teacup): the cap orange (hot), blue (cold) or green
  const bottle = (cap, mark) => `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/><path d="M38 34 q0 -6 6 -8 h12 q6 2 6 8 v46 q0 6 -6 6 h-12 q-6 0 -6 -6 Z" fill="#d6be6a"/><rect x="38" y="48" width="24" height="22" fill="#fbf7ec"/><path d="M43 55 h14 M43 61 h9" stroke="#3f7a52" stroke-width="2.4"/><rect x="42" y="16" width="16" height="12" rx="3" fill="${cap}"/><path d="M42 38 q-2 18 0 40" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none"/>${mark}</svg>`;
  const steam = '<path d="M70 30 q-4 -6 0 -12 q4 -6 0 -12 M78 34 q-4 -6 0 -12 q4 -6 0 -12" fill="none" stroke="#e8742a" stroke-width="2.6" stroke-linecap="round"/>';
  const frost = '<path d="M74 20 v18 M66 29 h16 M68 23 l12 12 M80 23 l-12 12" stroke="#3f7ac8" stroke-width="2.2" stroke-linecap="round"/>';
  function pic(g) {
    if (g[2] === 'bottle-hot') return bottle('#e8742a', steam); if (g[2] === 'bottle-cold') return bottle('#3f7ac8', frost); if (g[2] === 'bottle-tea') return bottle('#4f8a5a', '');
    const d = (typeof PICS === 'object' && PICS[g[2]]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[g[2]]); return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : '';
  }
  // the car side on: cream, the teal band and the orange line, four windows' frames (the glass and whoever leans out are the
  // buttons over them), the destination's LED, the platform's edge and yellow line under it
  const carArt = (dest) => `<svg class="bt-carsvg" viewBox="0 0 360 150" aria-hidden="true"><rect x="0" y="8" width="360" height="124" fill="#f1ece0"/><rect x="0" y="2" width="360" height="9" fill="#c9cdd4"/><rect x="0" y="104" width="360" height="11" fill="#3f9a8c"/><rect x="0" y="117" width="360" height="3" fill="#e6a23c"/><rect x="0" y="124" width="360" height="8" fill="#d9d3c6"/>
    ${WINX.map((x) => `<rect x="${x - 3}" y="23" width="78" height="72" rx="4" fill="#3a3f4a"/>`).join('')}<path d="M88 12 V102 M176 12 V102 M264 12 V102" stroke="#2b1c12" stroke-opacity=".08" stroke-width="2"/>
    <rect x="152" y="9" width="56" height="12" rx="1.5" fill="#1c1c22"/><text x="180" y="18.4" text-anchor="middle" font-size="8.4" font-weight="700" fill="${dest[0] === '快速' ? '#ff7a5a' : '#ffae3a'}" font-family="system-ui, sans-serif">${esc(dest.join(' '))}</text>
    <rect x="0" y="132" width="360" height="18" fill="#d9d3c6"/><rect x="0" y="132" width="360" height="2" fill="#f4f1ea"/><rect x="0" y="136" width="360" height="5" fill="#e8c43a"/></svg>`;
  const winBtn = (w) => `<button type="button" class="bt-win" data-w="${w}" aria-label="車窗 ${w + 1}" style="left:${(WINX[w] / 3.6).toFixed(2)}%"><span class="bt-in"></span><span class="bt-face"></span><span class="bt-glass"></span><i class="bt-call" aria-hidden="true">！</i><i class="bt-tick" aria-hidden="true">✓</i></button>`;

  function run(ctx) {
    const mine = ++runs, s = S(), trains = BENTO.make(), score = Object.assign({}, (WORK.today() || {}).score);
    const T = (sec) => sec * 1000 * JOBS.pat.scale, first = !Object.values(state.work.res).some((r) => r.place === 'bento' && r.yen !== undefined);
    const el = (q) => document.querySelector('.wk-bento ' + q), live = () => mine === runs && Boolean(el('.bt-car')) && ctx.on();
    const base = (t) => BENTO.TRAINS.slice(0, t).reduce((a, n) => a + n, 0);
    let t = trains.findIndex((tr, ti) => tr.some((_, i) => !((base(ti) + i) in score))); if (t < 0) t = trains.length - 1;
    const fresh = ctx.done === 0; let missed = 0, lost = 0, clock = null, belled = false;
    const said = (p, min = 0, max = 5000) => JOBS.said(p, min, max);
    // one voice at a time (2026-11-21, the review: a window's すみません！ cut the order being heard): what is asked for and the hero's
    // own words are said now (now); the calls, ハル's words, the thanks wait their turn after it (turn), dropped once 5 s stale. The
    // shift's last word (last: 2026-11-25, parked from Task 7 — the shift paid, no longer on, it was dropped unsaid): its turn after the
    // train's going while the card is still up (up), never stale, whole (the lane's cap)
    let voice = Promise.resolve(), gen = 0;
    const now = (who, l) => { gen++; voice = said(speakAs(who, l), 0, 6000); return voice; };
    const turn = (who, l, last) => { const g = gen, t0 = Date.now(); voice = voice.then(() => (last ? last.up() : live() && g === gen && Date.now() - t0 < 5000) ? said(speakAs(who, l), 0, last ? JOBS.LINE_CAP : 6000) : null); return voice; };
    // ハル and the hero share the line under the tray (test.5, 2026-11-27, as at the window, the lost and found and the taxi since 2026-11-22 —
    // the card one column on any screen): whoever spoke last; held as tall as the tallest line the shift may bring (holdTalk)
    const talk = (who) => { const t = el('.bt-tk'); if (t) t.dataset.who = who; };
    const sayHtml = ([ja, zh]) => `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`, meHtml = ([ja, zh]) => `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`;
    const word = ([ja, zh], cls = '', last) => { talk('drv'); const p = el('.wk-say'); if (p) { p.innerHTML = sayHtml([ja, zh]); p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return turn(s.who, ja, last); };
    const me = ([ja, zh], wait = false) => { talk('me'); const p = el('.wk-me'); if (p) p.innerHTML = meHtml([ja, zh]); return wait ? turn('hero', ja) : now('hero', ja); };
    function holdTalk() {
      const t = el('.bt-tk'); if (!t) return; const face = t.querySelector('.kr-face').outerHTML, row = (who, html) => [`${face}<p class="wk-say">${who === 'drv' ? html : ''}</p><p class="wk-me">${who === 'me' ? html : ''}</p>`, { 'data-who': who }];
      const usual = trains.flat().some((o) => o.kind === 'usual') && !usualTold();   // what いつもの is: only when 中村 comes this shift and is still to be told
      JOBS.hold(t, () => [s.train, s.bell, s.gone, s.end, s.all, s.yes, s.no, ...(usual ? [BENTO.hotCold() ? s.usual2 : s.usual] : []), ...s.ok].filter(Boolean).map((l) => row('drv', sayHtml(l))).concat(Object.values(s.me).map((l) => row('me', meHtml(l)))));
    }
    // the order now for one at a window: what was asked (an ask put right: what followed)
    const lineOf = (x) => (x.o.kind === 'have' && x.asked ? x.o.then : x.o.line);
    function drawWin(x) {
      const b = el(`.bt-win[data-w="${x.w}"]`); if (!b) return;
      b.className = `bt-win ${x.state}${B && B.sel === x ? ' sel' : ''}`;
      const f = b.querySelector('.bt-face'); if (x.state !== 'shut' && !f.firstChild) f.innerHTML = TOWNEV.face(x.o.who);
      if (x.state === 'shut') f.innerHTML = '';
    }
    const HINT = '<span class="bt-hint">點有「！」的車窗，聽乘客要什麼。</span>';
    const bubHtml = (x, open) => `<span class="kr-face bt-who">${TOWNEV.face(x.o.who)}</span><button type="button" class="wk-ear bt-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(lineOf(x))}</b><small>${esc(x.asked && x.o.kind === 'have' ? x.o.thenZh || '' : BENTO.zhOf(x.o))}</small>` : '<b class="bt-dots">……</b>'}`;
    const repliesHtml = () => [['yes', TOWN.WORK.say.bento.me.yes], ['no', TOWN.WORK.say.bento.me.no]].map(([k, [ja]]) => `<button type="button" class="btn btn-sm bt-reply" data-r="${k}" lang="ja"><span>${ruby(ja)}</span></button>`).join('');
    function bubble() {
      const p = el('.bt-bub'), r = el('.bt-replies'); if (!p || !r) return; const x = B && B.sel;
      if (!x) { p.innerHTML = HINT; r.innerHTML = ''; return; }
      p.innerHTML = bubHtml(x, x.state === 'done' || x.miss >= 2);
      r.innerHTML = x.o.kind === 'have' && !x.asked && x.state !== 'done' ? repliesHtml() : '';
    }
    // the passenger's row held for the whole shift (test.5; the user: 「新的打工回答會跑版」, test.4) as tall as the most it will show — the
    // hint, someone asking (……) with はい／いいえ under it, any order heard out (its 中文), before and after an ask is answered — so neither a
    // window picked nor a reply moves the car, the hands or the tray
    function holdTalkRow() {
      const ts = trains.flat().map((o) => ({ o, asked: false })), row = (b, r) => `<p class="bt-bub">${b}</p><div class="bt-replies">${r}</div>`;
      JOBS.hold(el('.bt-talk'), () => [row(HINT, '')].concat(ts.flatMap((x) => [row(bubHtml(x, false), x.o.kind === 'have' ? repliesHtml() : ''), row(bubHtml(x, true), ''), x.o.kind === 'have' ? row(bubHtml(Object.assign({}, x, { asked: true }), true), '') : null].filter(Boolean))));
    }
    const chipHtml = (id, n) => { const g = BENTO.good(id); return `<button type="button" class="bt-chip" data-drop="${id}" aria-label="放回一個">${pic(g)}<b lang="ja">${ruby(g[1])}</b><i>×${n}</i></button>`; };
    // the hand one row of chips at any size (test.5, fix round 1: the review's Important 3 — a third chip wrapped it a line taller, and the
    // car above shrank, the passenger's words and はい／いいえ rose 20–45 px, the tray and the talk row dropped; held for the wrap instead, a
    // passenger's goods with one more taken by mistake, it ran 138 px tall on every phone, three rows, and on an SE the tray's last row went
    // under the fold): never wrapping, it slides sideways — the good just taken brought into sight, a fade at a side with more past it
    function handEdge() { const h = el('.bt-hand'); if (!h) return; h.classList.toggle('bt-more-l', h.scrollLeft > 2); h.classList.toggle('bt-more-r', h.scrollWidth - h.clientWidth - h.scrollLeft > 2); }
    function hand(took) {
      const h = el('.bt-hand'); if (!h) return; const ids = Object.keys(B ? B.hand : {}).filter((id) => B.hand[id] > 0), x = h.scrollLeft;
      h.innerHTML = ids.length ? ids.map((id) => chipHtml(id, B.hand[id])).join('') : '<span class="bt-empty">手上還沒有東西</span>';
      const ch = took && h.querySelector(`.bt-chip[data-drop="${took}"]`); h.scrollLeft = ch ? Math.min(Math.max(x, ch.offsetLeft + ch.offsetWidth - h.clientWidth), ch.offsetLeft) : Math.min(x, h.scrollWidth - h.clientWidth); handEdge();
      document.querySelectorAll('.wk-bento .bt-good').forEach((b) => { const n = B ? B.hand[b.dataset.g] || 0 : 0; b.querySelector('.bt-n').textContent = n ? `×${n}` : ''; b.classList.toggle('in', n > 0); });
      const give = el('.bt-give'); if (give) give.disabled = !(B && B.sel && B.sel.state === 'calling' && ids.length && !(B.sel.o.kind === 'have' && !B.sel.asked));
    }
    const say = (x, l) => turn(x.o.who, l);
    const hear = (x) => { x.heard = true; return now(x.o.who, lineOf(x)); };   // asked for: heard at once
    // a train in: the car slides in, stops; its windows open one by one, each calling; the clock runs till it goes
    async function arrive() {
      const tr = trains[t], todo = tr.map((o, i) => ({ o, k: base(t) + i })).filter(({ k }) => !(k in score));
      const ws = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, todo.length).sort((a, b) => a - b);
      B = { t, phase: 'in', wins: todo.map(({ o, k }, j) => ({ w: ws[j], k, o, state: 'shut', miss: 0, heard: false, asked: false })), sel: null, hand: {} };
      belled = false; const car = el('.bt-car'); if (!car) return;
      car.querySelector('.bt-carwrap').innerHTML = carArt([t === 1 ? '快速' : '普通', EKI.name('shirasagi')]);   // 1番線: to 白鷺, the second a 快速
      [0, 1, 2, 3].forEach((w) => { const b = el(`.bt-win[data-w="${w}"]`); if (b) { b.className = 'bt-win shut'; b.querySelector('.bt-face').innerHTML = ''; } });
      car.style.transitionDuration = `${T(1.2)}ms`; car.dataset.state = 'away'; void car.offsetWidth; car.dataset.state = 'in';
      SND.play('train-in', { vol: 0.45 }); word(s.train); bubble(); hand(); dep(1);
      const n = el('.wk-n'); if (n) n.textContent = `${t + 1}／${BENTO.TRAINS.length} 班`;
      await sleep(T(1.4)); if (!live()) return;
      B.phase = 'stop'; SND.play('door-chime', { vol: 0.6 });
      clock = JOBS.clock(BENTO.SECS[t], live, (p) => dep(p), () => depart()); clock.go();
      for (const x of B.wins) {
        await sleep(T(x === B.wins[0] ? 0.5 : 2.4 + Math.random() * 1.6)); if (!live() || !B || B.phase !== 'stop') return;
        x.state = 'calling'; drawWin(x); say(x, s.cust.call[0]);
      }
    }
    // the departure clock: the bar wearing down; the bell at BELL seconds left (someone still waiting calls はやく！)
    function dep(p) {
      const bar = el('.bt-dep'); if (bar) { bar.style.setProperty('--p', p.toFixed(3)); bar.classList.toggle('late', p * BENTO.SECS[t] <= BENTO.BELL); }
      if (!belled && B && B.phase === 'stop' && p * BENTO.SECS[t] <= BENTO.BELL) {
        belled = true; SND.play('dep-bell', { vol: 0.7 }); word(s.bell, 'bad');
        const w = B.wins.find((x) => x.state === 'calling' && x !== B.sel); if (w) setTimeout(() => { if (live()) say(w, s.cust.hurry[0]); }, 1400);
      }
    }
    // the train goes (its time up, or everyone served — wait: the thanks heard first): the doors, away; whoever was not served lost.
    // The last train: the shift paid at once, as its last passenger is scored, the train's going and ハル's word before the results
    // (2026-11-22, the review: the card shut before it went left it unpaid — and after 19 時, with ハル gone, for good)
    async function depart(wait = 0) {
      if (!B || B.phase !== 'stop') return; B.phase = 'go'; if (clock) clock.stop();
      const left = B.wins.filter((x) => x.state !== 'done'); left.forEach((x) => { ctx.right(x.k, 3); score[x.k] = 3; x.state = 'lost'; drawWin(x); }); lost += left.length;
      if (left.length) playSfx('bad');
      const last = t === trains.length - 1, on = () => mine === runs && Boolean(el('.bt-car')), go = last ? on : live;   // paid, the shift is no longer on: the card still up is enough
      const away = (async () => {
        if (wait) { await sleep(wait); if (!go()) return false; }
        B.sel = null; B.hand = {}; bubble(); hand();
        SND.play('door-chime', { vol: 0.6 }); await sleep(T(0.6)); if (!go()) return false;
        const car = el('.bt-car'); if (car) car.dataset.state = 'out'; SND.play('train-out', { vol: 0.45 });
        if (left.length) await said(word(s.gone, 'bad', last ? { up: on } : undefined), T(1.2)); else await sleep(T(1.3));   // the last train's: said while the card is up, as her closing word (the final re-review)
        return go();
      })();
      if (!last) { if (await away) { t++; arrive(); } return; }
      B.phase = 'end';
      ctx.finish({}, away.then((ok) => ok && JOBS.whole(word(fresh && !missed && !lost ? s.all : s.end, 'ok', { up: on }), 900)).then(() => { if (on()) CLASS.close(); }));   // ハル's last word said whole, then the card shut and the results
    }
    // a window tapped: its passenger now the one served (what was in the hands goes back), heard at once the first time
    async function pickWin(x) {
      if (B.sel !== x) { B.sel = x; B.hand = {}; }
      B.wins.forEach(drawWin); bubble(); hand();
      if (x.heard) return;
      const p = hear(x);
      if (x.o.kind === 'usual' && !usualTold()) { await said(p, 400); if (!live()) return; told(); word(BENTO.hotCold() ? s.usual2 : s.usual, 'ok'); const z = el('.wk-say span'); if (z) z.style.display = 'block'; }
    }
    // told what いつもの is: once with the one お茶 (m1), once more when it is hot tea (m2 on: the review, 2026-11-21)
    const USUAL = () => (BENTO.hotCold() ? 'nq_bento_usual2' : 'nq_bento_usual'), usualTold = () => { try { return localStorage.getItem(USUAL()) === '1'; } catch (e) { return true; } }, told = () => { try { localStorage.setItem(USUAL(), '1'); } catch (e) { /* told again next time */ } };
    // the reply to an ask: right or not, the right one said (a miss when not: ハル's あるよ！／ないよ！), then what they want
    async function reply(k) {
      const x = B.sel; if (!x || x.o.kind !== 'have' || x.asked || x.replying) return; x.replying = true;   // a double tap: once
      const off = (k === 'yes') !== x.o.has; if (off) { x.miss++; missed++; playSfx('bad'); word(x.o.has ? s.yes : s.no, 'bad'); }
      x.asked = true; bubble(); hand();
      await said(me(x.o.has ? s.me.yes : s.me.no, off), 300); if (!live()) return;
      x.heard = true; turn(x.o.who, lineOf(x));
    }
    // どうぞ: the hands against what they asked for — all of it and no more
    async function give() {
      const x = B.sel; if (!x || x.state !== 'calling') return;
      const want = {}; x.o.items.forEach(([id, n]) => { want[id] = (want[id] || 0) + n; });
      const ids = new Set([...Object.keys(want), ...Object.keys(B.hand).filter((id) => B.hand[id] > 0)]);
      if (![...ids].every((id) => (want[id] || 0) === (B.hand[id] || 0))) {
        x.miss++; missed++; playSfx('bad'); const w = el(`.bt-win[data-w="${x.w}"]`); if (w) { w.classList.remove('wk-bad'); void w.offsetWidth; w.classList.add('wk-bad'); }
        bubble(); now(x.o.who, s.cust.wrong[0]); say(x, lineOf(x));   // ちがいます。 and what they wanted again, after it
        return;
      }
      x.state = 'done'; ctx.right(x.k, x.miss); score[x.k] = x.miss; playSfx('good'); B.hand = {}; drawWin(x); bubble(); hand();
      me(s.me.give); say(x, s.cust.thanks[0]).then(() => { if (live()) playSfx('coin', 2); });
      if (!x.miss && Math.random() < 0.3) word(s.ok[Math.floor(Math.random() * s.ok.length)], 'ok');
      if (B.wins.every((y) => y.state === 'done')) { if (t === trains.length - 1) { depart(T(1.8)); return; } await sleep(T(1.8)); if (live() && B.phase === 'stop') depart(); }
    }
    const goods = BENTO.goods();
    CLASS.card('wk-bento wk-col', '賣便當', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja">みなと<ruby>弁当<rt>べんとう</rt></ruby></b><span class="wk-n"></span></div>
      <div class="bt-stage"><div class="bt-car" data-state="away"><div class="bt-carwrap"></div>${[0, 1, 2, 3].map(winBtn).join('')}</div>
        <div class="bt-dep"><span lang="ja"><ruby>発車<rt>はっしゃ</rt></ruby>まで</span><i><b></b></i></div></div>
      <div class="bt-talk"><p class="bt-bub"></p><div class="bt-replies"></div></div>
      <div class="bt-handrow"><div class="bt-hand"></div><button type="button" class="btn btn-primary bt-give" lang="ja" disabled>どうぞ</button></div>
      <div class="bt-box${goods.length > 8 ? ' nine' : ''}">${goods.map((g) => `<button type="button" class="bt-good" data-g="${g[0]}">${pic(g)}<b lang="ja">${ruby(g[1])}</b><i class="bt-n"></i></button>`).join('')}</div>
      <div class="bt-tk" data-who="drv"><span class="kr-face">${TOWNEV.face(s.who)}</span><p class="wk-say"></p><p class="wk-me"></p></div>`, (e) => {
      if (!B || !live()) return;
      if (e.target.closest('.bt-ear')) { if (B.sel) now(B.sel.o.who, lineOf(B.sel)); return; }
      if (B.phase !== 'stop') return;
      const w = e.target.closest('.bt-win'); if (w) { const x = B.wins.find((y) => y.w === Number(w.dataset.w)); if (x && x.state === 'calling') pickWin(x); return; }
      const r = e.target.closest('.bt-reply'); if (r) { reply(r.dataset.r); return; }
      const d = e.target.closest('[data-drop]'); if (d) { const id = d.dataset.drop; if (B.hand[id]) B.hand[id]--; SND.play('place', { vol: 0.4 }); hand(); return; }
      const g = e.target.closest('.bt-good'); if (g) { if (!B.sel) { toast('先點一扇有「！」的車窗。', 1800); return; } B.hand[g.dataset.g] = (B.hand[g.dataset.g] || 0) + 1; SND.play('place', { vol: 0.5 }); hand(g.dataset.g); return; }
      if (e.target.closest('.bt-give')) give();
    });
    holdTalk(); holdTalkRow();   // the talk row and the passenger's row as tall as the shift will need (test.5)
    { const h = el('.bt-hand'); if (h) h.addEventListener('scroll', handEdge, { passive: true }); }
    arrive();
  }
  function lines(add) {
    const s = S(); BENTO.allOrders().forEach((o) => { add(o.who, o.line); if (o.then) add(o.who, o.then); });
    BENTO.CUST.concat(['nakamura']).forEach((id) => Object.values(s.cust).forEach((l) => add(id, l[0])));
    Object.values(s.me).forEach((l) => add('hero', l[0]));
    [s.train, s.bell, s.gone, s.end, s.all, s.yes, s.no, s.usual, s.usual2, ...s.ok].forEach((l) => add(s.who, l[0]));
  }
  return { run, lines, now: () => B };
})();
WORK.register('bento', { run: BENTO_RUN.run, lines: BENTO_RUN.lines });
