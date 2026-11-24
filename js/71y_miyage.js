'use strict';
// ---------- おみやげ屋 (2026-11-24, 湯の花温泉の打工; docs/superpowers/specs/2026-11-23-onsen-work-design.md §5.3) ----------
// 竹内's ゆのはな堂 on 湯けむり通り (m11, 240 円): its counter, two shelves of the eight goods behind it (a picture, the name with its
// reading, the price, the まんじゅう's pieces — the six and the twelve), the tasting plate on the counter. Ten customers a shift, each
// heard first (🔊; their words shown once it is right, after two misses, or as they go): whom it is for and how many (あげる), what they
// were given (くれる・もらう), what the coin in their hand buys — the hero takes it off the shelves onto his tray (one of each) and hands
// it over (どうぞ). Some have a second step, the reply picked, whose giving it is the point: a favour asked (包んで もらえますか →
// 包みますね), their hands full (袋に 入れましょうか, never 入れて もらいましょうか), a gift for a superior (さしあげる — what the superior
// likes names it, ruling 16), one who cannot choose (よかったら、食べて みて ください: a piece off the plate, then their box). Their
// misses add up to one task. 金田 from the cruise now and then: ぜんぶ — each of the eight, either まんじゅう box (ruling 17). 竹内's sales
// talk between. Every line through JOBS' lane (ruling 27): none cuts another, the shift's last ones said before its results.
const MIYAGE = (() => {
  const T = () => TOWN.ONSEN.miyage;
  const KINDS = ['count', 'two', 'got', 'budget', 'reply', 'offer', 'elder', 'taste', 'all'];
  const PLAIN = ['count', 'two', 'got'];   // a pick and no more: the first customer, and the shift's fill
  const ONCE = ['budget', 'reply', 'offer', 'elder', 'taste'];   // one of each a shift
  const EIGHT = [['manju6', 'manju12'], 'senbei', 'jam', 'tenugui', 'kokeshi', 'bath', 'sake', 'keyring'];   // 金田's eight: the まんじゅう either box (ruling 17)
  const { rng, pickR, shuffleR } = JOBS;   // a shift's own dice (JOBS'): the same seed, the same customers
  const goods = () => T().goods, good = (id) => goods().find((g) => g[0] === id);
  const price = (list) => list.reduce((a, id) => a + ((good(id) || [])[2] || 0), 0);
  const ids = () => Object.keys(T().cust);
  const fill = (tpl, o) => tpl.replace(/\{([RrG])\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));
  // a customer as a shift has them: their data; want, the goods that are right (in any order), or a test of the tray (the coin's, 金田's
  // eight); lit, the goods lit after two misses or once they go — a whole right tray: the coin's, one good it buys (fix round 1, M-2: all
  // three together are over), 金田's, the eight; their replies [Japanese, 中文 or why, right, how] (shuffled by R)
  function cust(id, R) {
    const C = T().cust[id], c = Object.assign({ id }, C);
    if (C.kind === 'budget') { c.want = (list) => list.length > 0 && price(list) <= C.budget; c.lit = [goods().filter((g) => g[2] <= C.budget).sort((a, b) => a[2] - b[2])[0][0]]; }
    else if (C.kind === 'all') { c.want = (list) => EIGHT.every((g) => (Array.isArray(g) ? g.some((x) => list.includes(x)) : list.includes(g))); c.lit = EIGHT.map((g) => (Array.isArray(g) ? g[1] : g)); }
    else { c.want = C.want.slice(); c.lit = C.want.slice(); }
    if (C.reply) {
      const [right, wrong] = T().reply[C.reply], g = Array.isArray(c.want) ? good(c.want[0]) : null, o = { R: C.to ? C.to[0] : '', r: C.to ? C.to[1] : '', G: g ? g[1] : '' };
      const opts = [[fill(right[0], o), fill(right[1], o), true, '']].concat(wrong.map(([ja, why]) => [fill(ja, o), fill(why, o), false, 'form']));
      c.opts = R ? shuffleR(opts, R) : opts;
    }
    return c;
  }
  // a tray judged for a customer: { ok: true }, or not and why — few (the six for more people), small (the twelve for the small one),
  // over (dearer than their coin), short (金田: not all eight), more (one of theirs not on it yet), extra (one they did not say), other
  // (not what they said), none (nothing on it)
  function judge(c, list) {
    const t = [...new Set(list)]; if (!t.length) return { ok: false, why: 'none' };
    if (typeof c.want === 'function') return c.want(t) ? { ok: true } : { ok: false, why: c.kind === 'budget' ? 'over' : 'short' };
    const w = c.want; if (t.length === w.length && w.every((g) => t.includes(g))) return { ok: true };
    if (t.length === 1 && c.no && c.no[t[0]]) return { ok: false, why: t[0] === 'manju6' ? 'few' : 'small' };
    if (w.every((g) => t.includes(g))) return { ok: false, why: 'extra' };
    if (t.every((g) => w.includes(g))) return { ok: false, why: 'more' };
    return { ok: false, why: 'other' };
  }
  // a right tray (the tests', the generator's): what they want; for a coin, its cheapest good; for 金田, the eight — what is lit
  const answer = (c) => (Array.isArray(c.want) ? c.want.slice() : c.lit.slice());
  // a customer's steps: a pick (the tray, どうぞ), a reply (the replies), a taste (a piece off the plate) — a taste's reply first
  const steps = (c) => (c.kind === 'taste' ? ['reply', 'eat', 'pick'] : c.opts ? ['pick', 'reply'] : ['pick']);
  // the order: the first stays first; 金田 never first nor second (each customer someone else, so no one comes twice running)
  function spread(list) {
    const out = [list[0]], left = list.slice(1), ok = (id, n) => id !== 'all' || n >= 2;
    while (left.length) { const i = left.findIndex((id) => ok(id, out.length)); out.push(left.splice(i >= 0 ? i : 0, 1)[0]); }
    return out;
  }
  // a shift: ten customers, no person twice (fix round 1, M-3: fourteen people for ten customers) — the first a plain pick (a box for so
  // many, a thing each for two, what they were given); one each with a coin, asking a favour, their hands full, buying for a superior,
  // unable to choose; the rest plain picks, each plain kind once at least and twice at most; 金田 in about half the shifts in the place of a
  // plain pick whose kind comes twice (so every kind stays), never first nor second. The customers found place by place, fewest choices
  // first, going back on a clash (a search: every place always has someone). u: the unit reached (the job's grammar is m11's at any unit)
  function make(u = TOWNEV.reachedIdx(), seed = 1 + Math.floor(Math.random() * 2147483646)) {
    const R = rng(seed), C = T().cust;
    const kinds = shuffleR(PLAIN.concat(PLAIN), R).slice(0, 5);   // the five plain picks: each kind once at least, twice at most; the first is kinds[0]
    if (C.all && R() < 0.45) { const twice = kinds.map((k, i) => i).filter((i) => i > 0 && kinds.filter((x) => x === kinds[i]).length > 1); kinds[pickR(twice, R)] = 'all'; }
    const places = kinds.concat(ONCE), pool = places.map((k) => shuffleR(ids().filter((id) => C[id].kind === k), R));
    const order = places.map((k, i) => i).sort((a, b) => pool[a].length - pool[b].length || a - b), got = [], used = new Set(), people = new Set();
    const fit = (n) => {
      if (n === order.length) return true;
      const i = order[n];
      for (const id of pool[i]) {
        if (used.has(id) || people.has(C[id].who)) continue;
        used.add(id); people.add(C[id].who); got[i] = id;
        if (fit(n + 1)) return true;
        used.delete(id); people.delete(C[id].who);
      }
      return false;
    };
    if (!fit(0)) throw new Error(`おみやげ屋: no ten customers of ten people for seed ${seed}`);   // never: a bug, said so
    return spread([got[0]].concat(shuffleR(got.slice(1), R))).map((id) => cust(id, R));
  }
  return { make, cust, judge, answer, steps, price, good, goods, ids, KINDS, EIGHT };
})();

// ---- the card: ゆのはな堂's two shelves (each good a button: its picture standing on the shelf, its price tag under it), the shop's
// front — its noren, the customer against the street by day or night with their patience, the counter with the tasting plate, the tray
// and どうぞ — the replies when a step wants one, and 竹内's word, a customer's, or the hero's under them ----
const MIYAGE_RUN = (() => {
  const N = 10, SECS = { pick: 30, all: 45, reply: 20 }, MISS = 0.15, BITS = 6;   // a customer's patience (s) from the end of their words; a miss costs some; the plate's pieces
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const S = () => TOWN.ONSEN.miyage;
  let R = null, runs = 0;   // the customer at the counter now (the tests): { k, c, step, phase, tray, seed, miss, busy }
  const pic = (g) => JOBS.goodPic(g[4]);   // a good's picture by its key (PICS, then PICS_TOWN), as 站櫃's and 收銀's
  // the tasting plate on the counter: まんじゅう cut in quarters (each a piece: .om-bit), toothpicks in them, a tent card 「試食」
  const BIT_AT = [[22, 21], [34, 17], [46, 21], [28, 28], [40, 28], [52, 25]];
  const plateSvg = (n) => `<svg viewBox="0 0 74 44" aria-hidden="true"><ellipse cx="37" cy="33" rx="31" ry="8.6" fill="#2b1c12" fill-opacity=".18"/><ellipse cx="37" cy="30" rx="31" ry="9" fill="#e9eef2"/><ellipse cx="37" cy="29" rx="26" ry="6.8" fill="#fbfdff"/><ellipse cx="37" cy="29" rx="26" ry="6.8" fill="none" stroke="#3f62a8" stroke-width="1.2" stroke-dasharray="3 2.4"/>
    ${BIT_AT.slice(0, n).map(([x, y], i) => `<g class="om-bit" data-i="${i}"><path d="M${x - 5} ${y + 4} L${x - 5} ${y - 1} Q${x - 5} ${y - 5} ${x} ${y - 5} L${x} ${y + 4} Z" fill="#b8723a"/><path d="M${x} ${y - 5} L${x} ${y + 4} L${x - 5} ${y + 4}" fill="#e8d2b0"/><path d="M${x - 3.6} ${y + 2.6} L${x - 1.2} ${y - 1}" stroke="#5e3a1c" stroke-width="1.6" stroke-linecap="round"/><path d="M${x - 2} ${y + 1} L${x + 3} ${y - 9}" stroke="#d9b87a" stroke-width="1.1" stroke-linecap="round"/></g>`).join('')}
    <g transform="translate(58 8)"><path d="M0 16 L5 0 L10 16 Z" fill="#fffaf0" stroke="#c8b48a" stroke-width=".6"/><text x="5" y="11.6" text-anchor="middle" font-size="4.6" font-weight="700" fill="#b8322a" font-family="system-ui, sans-serif">試食</text></g></svg>`;
  // the shop's noren over its front: indigo panels on their pole, ♨ on the middle two
  const ONSEN_MARK = '<svg viewBox="0 0 17 14" aria-hidden="true"><g fill="none" stroke="#f4efe4" stroke-linecap="round"><path d="M2.6 9.4 a5.9 3.2 0 0 0 11.8 0" stroke-width="1.5"/><path d="M5.6 7.6 q-1.4 -1.5 0 -3 q1.4 -1.5 0 -3 M8.5 7.4 q-1.4 -1.5 0 -3 q1.4 -1.5 0 -3 M11.4 7.6 q-1.4 -1.5 0 -3 q1.4 -1.5 0 -3" stroke-width="1.3"/></g></svg>';
  const NOREN = `<b></b><b>${ONSEN_MARK}</b><b>${ONSEN_MARK}</b><b></b>`;
  // what a customer has in hand: their hands full of bags (offer); the coin they will spend (budget: its 円 on it, to be read)
  const BAGS = '<svg viewBox="0 0 34 26" aria-hidden="true"><path d="M4 9 h13 l1.4 16 h-15.8 Z" fill="#e6c48a"/><path d="M7 9 q0 -6 3.5 -6 q3.5 0 3.5 6" fill="none" stroke="#8a5a34" stroke-width="1.4"/><path d="M15 11 h14 l1.6 14.6 h-17 Z" fill="#c8506a"/><path d="M18.4 11 q0 -6 3.6 -6 q3.6 0 3.6 6" fill="none" stroke="#7a2a3a" stroke-width="1.4"/><path d="M17 14 h11" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/></svg>';
  const coin = (n) => `<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15.6" r="13.4" fill="#9a7a2e"/><circle cx="15" cy="14.6" r="13.4" fill="#e0c060"/><circle cx="15" cy="14.6" r="10.6" fill="none" stroke="#b8963c" stroke-width="1"/><text x="15" y="18.4" text-anchor="middle" font-size="10.4" font-weight="800" fill="#5a4214" font-family="system-ui, sans-serif">${n}</text><path d="M7 8 q3 -3.4 7 -4" fill="none" stroke="#fff6c8" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const hold = (c) => (c.kind === 'offer' ? `<i class="om-hold om-bags" aria-label="兩手拿滿了東西">${BAGS}</i>` : c.kind === 'budget' ? `<i class="om-hold om-coin" aria-label="手上有 ${c.budget} 日圓">${coin(c.budget)}</i>` : '');
  function run(ctx) {
    const mine = ++runs, s = S(), A = s.say, seed = Number(ctx.kept && ctx.kept.seed) || 1 + Math.floor(Math.random() * 2147483646);
    if (!(ctx.kept && ctx.kept.seed)) ctx.keep({ seed });   // the customers kept with the day's record: the same after a break
    R = null;   // no customer till this shift's first (a card shut and opened again: never the last one's)
    const tasks = MIYAGE.make(TOWNEV.reachedIdx(), seed), first = !Object.values(state.work.res).some((r) => r.place === 'miyage' && r.yen !== undefined);
    // this run's own card (box, once drawn): a shift's goodbye still being said when the next one's card opens never touches that one
    let box = null; const el = (q) => (box && box.isConnected ? box.querySelector(q) : null), all = (q) => (box && box.isConnected ? [...box.querySelectorAll(q)] : []);
    const live = () => mine === runs && Boolean(el('.om-shop')) && ctx.on(), mineNow = (me0) => live() && R === me0;
    let k = ctx.done, P = null, rep = 0, missed = 0, lost = 0, bits = BITS;
    // a short phone (360×640): the card holds the shelves, the shop's front and the talk row; with the replies too it cannot, so when a
    // line lands below its fold the card scrolls itself just far enough to show it — never past the shop's front (the customer and
    // their words stay in sight) — and is back at its top for each customer (the shelves first), as the 案内所's: JOBS.talkLine's (Task 7's
    // fix round, M-10; its talk row stays its own, below); each line awaited to its end within the lane's cap (said: I-1)
    const TL = JOBS.talkLine({ box: () => box, sel: '.om-talk', keep: () => el('.om-front') }), { said, seeTalk } = TL;
    // the talk row under the replies: whoever spoke last — 竹内's word (its 中文, or a miss's reason), a customer's to a tray that is not
    // it (with the reason), the hero's (its 中文 on the job's first shift only, ruling 23: under the reply once said, never under the buttons)
    function talk(id, html, cls = '') {
      const t = el('.om-talk'); if (!t) return; t.dataset.who = id; const m = t.querySelector('.om-mini'); if (m.dataset.who !== id) { m.dataset.who = id; m.innerHTML = TOWNEV.face(id); }
      const p = t.querySelector('.wk-say'); p.innerHTML = html; p.className = 'wk-say' + (cls ? ' ' + cls : ''); seeTalk();
    }
    const word = ([ja, zh], cls = '') => { if (!el('.om-talk')) return Promise.resolve(); talk(A.who, `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`, cls); return speakAs(A.who, ja); };
    const theirs = (who, [ja], why) => { if (!el('.om-talk')) return Promise.resolve(); talk(who, `<b lang="ja">${ruby(ja)}</b><span>${esc(why)}</span>`, 'bad'); return speakAs(who, ja); };
    const me = ([ja, zh]) => { if (!el('.om-talk')) return Promise.resolve(); talk('hero', `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`, 'om-me'); return speakAs('hero', ja); };
    const keeper = (l, cls) => JOBS.queue(() => word(l, cls), box);   // after any line being said (ruling 27)
    // the bubble: their words heard first (……, 🔊), shown once right, after two misses, or as they go
    function bub(open, line) {
      const b = el('.wk-cust .wk-bub'); if (!b || !R) return; const [ja, zh] = line || R.line || R.c.line;
      b.innerHTML = `<button type="button" class="wk-ear om-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>` : '<b class="om-dots">……</b>'}`;
      b.classList.toggle('wk-open', Boolean(open));   // open: a pop-up goes under it, never over the words (Task 4's N-4)
      if (open) seeTalk();
    }
    // the shelves: a good on the tray shows its place empty (its picture faint, ✓), tapped again to put it back; the tray: what is on it; どうぞ
    // once there is something to hand over while a pick is under way
    function shelves() { all('.om-good').forEach((b) => b.classList.toggle('om-on', Boolean(R) && R.tray.includes(b.dataset.g))); }
    function tray(added) {
      const t = el('.om-tray'); if (!t || !R) return;
      const picking = MIYAGE.steps(R.c)[R.step] === 'pick' && (R.phase === 'hi' || R.phase === 'pick');   // the hint only while a pick is to come (a taste's replies: none; fix round 1)
      t.innerHTML = R.tray.length ? R.tray.map((id) => { const g = MIYAGE.good(id); return `<span class="om-chip${id === added ? ' om-in' : ''}" data-t="${id}" role="img" aria-label="${esc(g[5])}">${pic(g)}</span>`; }).join('')
        : picking ? '<span class="om-empty">點架上的東西放上托盤<br>點托盤上的就放回去</span>' : '';   // a good taken back by a tap on the tray (I-2) or on the shelf
      t.classList.toggle('om-full', R.tray.length > 5);
      const d = el('.om-give'); if (d) d.disabled = !(R.phase === 'pick' && !R.busy && R.tray.length);
    }
    const hint = () => all('.om-good').forEach((b) => b.classList.toggle('wk-hint', R.c.lit.includes(b.dataset.g)));
    const unhint = () => all('.om-good.wk-hint').forEach((b) => b.classList.remove('wk-hint'));
    function opts(on) {
      const o = el('.om-opts'); if (!o) return;
      o.innerHTML = on ? R.c.opts.map(([ja], i) => `<button type="button" class="btn om-opt" data-o="${i}" lang="ja"><span>${ruby(ja)}</span></button>`).join('') : '';
      if (on) seeTalk();
    }
    function plate() { const p = el('.om-plate'); if (p) p.innerHTML = plateSvg(bits); }
    function show() {
      const c = tasks[k]; R = { k, c, step: 0, phase: 'hi', tray: [], seed, miss: 0, miss2: 0, busy: false, line: c.line }; rep = 0; TL.toTop();   // the card from its top: the shelves first
      el('.wk-n').textContent = `${k + 1}／${N}`;
      const cu = el('.wk-cust'); cu.className = 'wk-cust'; cu.removeAttribute('data-mood'); cu.dataset.kind = c.kind; cu.innerHTML = JOBS.custHtml(c.who) + hold(c);
      unhint(); shelves(); tray(); opts(false); bub(false);
      const me0 = R;
      said(JOBS.queue(() => me(s.hi), box), 700).then(() => { if (mineNow(me0)) begin(0); });
    }
    // a step begun — a pick, a reply or a taste: its words heard first (none for a superior's gift: their words stay shown), their
    // patience from the end of them (a fresh clock each step: the step before pleased them)
    function begin(i) {
      const c = R.c, st = MIYAGE.steps(c)[i], me0 = R; R.step = i; R.miss2 = 0;
      if (st === 'eat') { eat(me0); return; }
      const line = i === 0 ? c.line : c.kind === 'elder' ? null : c.then;
      R.line = line || c.line; R.phase = st; R.busy = false;
      if (line) bub(false); else bub(true);
      opts(st === 'reply'); shelves(); tray();
      const cu = el('.wk-cust'); cu.classList.add('on'); cu.removeAttribute('data-mood'); const emo = cu.querySelector('.wk-emo'); if (emo) emo.textContent = '';   // calm again: the step before pleased them (fix round 1, M-1)
      P = JOBS.patience('miyage', c.who, st === 'reply' ? SECS.reply : c.kind === 'all' ? SECS.all : SECS.pick, () => mineNow(me0) && R.step === i, gone, box);
      if (!line) { P.go(); return; }
      const q = P; JOBS.line(c.who, line[0], box).then(() => { if (!rep && mineNow(me0) && R.step === i && P === q) q.go(); });
    }
    function tap(id) {
      if (!R || R.phase !== 'pick' || R.busy) return;
      const i = R.tray.indexOf(id); if (i >= 0) R.tray.splice(i, 1); else R.tray.push(id);
      SND.play('place', { vol: i >= 0 ? 0.32 : 0.5 }); shelves(); tray(i < 0 ? id : null);
    }
    // どうぞ: the tray against what they said — not it: their own word to it where they have one (a box too few, the big one for the
    // small, dearer than the coin, short of the eight), else 竹内's, the reason under it; said to its end, the clock held meanwhile and the
    // miss's cost after it (ruling 27); two and their words are shown, the right goods lit. One どうぞ, one miss (fix round 1, I-1): busy
    // while the word is to be said (a second tap, a tap on the tray: nothing), どうぞ off till the tray has changed (tray() turns it on)
    function give() {
      if (!R || R.phase !== 'pick' || R.busy || !R.tray.length) return;
      const c = R.c, j = MIYAGE.judge(c, R.tray);
      if (j.ok) { rightPick(); return; }
      const me0 = R; R.miss++; R.miss2++; missed++; R.busy = true; playSfx('bad');
      const d = el('.om-give'); if (d) { d.classList.remove('wk-bad'); void d.offsetWidth; d.classList.add('wk-bad'); d.disabled = true; }
      const own = j.why === 'few' || j.why === 'small' ? c.no[R.tray[0]] : j.why === 'over' ? c.over : j.why === 'short' ? c.short : null, why = s.why[j.why] || s.why.other;
      JOBS.missWord(P, () => (own ? theirs(c.who, own, why) : word([A.pick[0], why], 'bad')), MISS, box).then(() => { if (mineNow(me0) && R.phase === 'pick') R.busy = false; });
      if (R.miss2 >= 2) { bub(true); hint(); }
    }
    // a tap on the tray (fix round 1, I-2 — as 駅弁 taught: what is in hand is tapped to put it back): the good the tap is on goes back to
    // the shelf (the last drawn, on top), else the nearest; the tray is the target (46 px tall), its goods none of their own
    function offTray(x, y) {
      if (!R || R.phase !== 'pick' || R.busy) return;
      const chips = all('.om-tray .om-chip'); if (!chips.length) return;
      const box2 = (e) => e.getBoundingClientRect(), on = chips.slice().reverse().find((e) => { const r = box2(e); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
      const near = on || chips.map((e) => { const r = box2(e); return [e, Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2)]; }).sort((a, b) => a[1] - b[1])[0][0];
      tap(near.dataset.t);
    }
    // the tray right: their words shown; a last step — handed over; else the next: the hero's どうぞ and their favour (a superior's gift:
    // the replies at once, the good still on the tray)
    function rightPick() {
      const c = R.c, me0 = R, st = MIYAGE.steps(c);
      R.busy = true; P.stop(); playSfx('good'); bub(true); unhint(); R.phase = 'wait'; tray();
      if (R.step === st.length - 1) { served(); return; }
      (async () => {
        if (c.kind !== 'elder') { await JOBS.quiet(box); if (!mineNow(me0)) return; await said(JOBS.queue(() => me(s.give), box), 400); if (!mineNow(me0)) return; }
        begin(R.step + 1);
      })();
    }
    // a reply picked: not it — 竹内's word (whose doing it is) with its reason under it, it cannot be picked again; two and their words are
    // shown with the right one lit; it — the hero says it after any line being said, then the goods go (a taste: a piece off the plate)
    function reply(b) {
      if (!R || R.phase !== 'reply' || R.busy || b.disabled) return;
      const c = R.c, o = c.opts[Number(b.dataset.o)];
      if (!o[2]) {
        R.miss++; R.miss2++; missed++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); b.disabled = true;
        JOBS.missWord(P, () => word([A.form[0], o[1]], 'bad'), MISS, box);
        const left = all('.om-opt:not(:disabled)'); if (R.miss2 >= 2 || left.length === 1) { bub(true); left.forEach((x) => x.classList.toggle('wk-hint', Boolean(c.opts[Number(x.dataset.o)][2]))); }
        return;
      }
      const me0 = R; R.busy = true; P.stop(); playSfx('good'); bub(true); R.phase = 'wait';
      all('.om-opt').forEach((x) => { x.disabled = true; x.classList.toggle('om-right', Boolean(c.opts[Number(x.dataset.o)][2])); });
      (async () => {
        await JOBS.quiet(box); if (!mineNow(me0)) return;   // the reply after any line still being said: 竹内's word, theirs (ruling 27)
        await said(JOBS.queue(() => me(o), box), 500); if (!mineNow(me0)) return;
        if (R.step < MIYAGE.steps(c).length - 1) { begin(R.step + 1); return; }   // the taste: a piece off the plate next
        served();
      })();
    }
    // a taste: 竹内's どうぞ、どうぞ！, a piece off the plate to them, then what they will have (heard first): the box
    async function eat(me0) {
      R.phase = 'wait'; R.busy = true; opts(false);
      await keeper(A.taste); if (!mineNow(me0)) return;
      const p = el(`.om-plate .om-bit[data-i="${bits - 1}"]`); if (p) p.classList.add('om-eat');
      SND.play('chomp', { vol: 0.5 }); await sleep(650); if (!mineNow(me0)) return;
      bits = bits > 1 ? bits - 1 : BITS; plate();   // the last piece: 竹内 cuts another まんじゅう
      begin(R.step + 1);
    }
    // served: the goods off the tray to them (wrapped, in a bag, or as they are — the hero's どうぞ when the last step was the pick), their
    // word (their own, shown in the bubble; else their thanks), off they go; now and then 竹内's word after a customer right at once
    function served() {
      const c = R.c, last = MIYAGE.steps(c).slice(-1)[0]; R.phase = 'done'; R.busy = true; ctx.right(k, Math.min(R.miss, 2));
      const clean = !R.miss;
      next(async (live2) => {
        await JOBS.quiet(box); if (!live2()) return;
        SND.play(c.kind === 'reply' ? 'paper' : c.kind === 'offer' ? 'rustle' : 'place', { vol: 0.55 });
        const t = el('.om-tray'); if (t) t.classList.add('om-off');
        if (last === 'pick') { await said(JOBS.queue(() => me(s.give), box), 600); if (!live2()) return; }
        if (c.after) bub(true, c.after);
        await Promise.all([JOBS.line(c.who, (c.after || s.thanks)[0], box), sleep(500)]); if (!live2()) return;
        if (c.kind === 'all') SND.play('coins', { vol: 0.5 });
        el('.wk-cust').classList.add('bye'); if (t) { t.classList.remove('om-off'); R.tray = []; tray(); shelves(); }
        await sleep(450); if (!live2()) return;
        if (clean && Math.random() < 0.3) { const pool = Math.random() < 0.5 ? A.ok : A.sell; await keeper(pool[Math.floor(Math.random() * pool.length)], 'ok'); }
      });
    }
    // patience out: off they go — their words shown whole, the right goods (or reply) lit, their leaving word popping up beside it (Task 4's
    // M-2), said in full from its own start (N-2); the task lost
    function gone(leave) {
      const c = R.c, st = MIYAGE.steps(c)[R.step]; R.phase = 'done'; R.busy = true; ctx.right(k, 3); lost++; playSfx('bad'); bub(true); tray();
      JOBS.grr(el('.wk-cust'), leave[0]);
      if (st === 'reply') all('.om-opt').forEach((x) => { x.disabled = true; x.classList.toggle('wk-hint', Boolean(c.opts[Number(x.dataset.o)][2])); }); else hint();
      next(async (live2) => { await Promise.all([JOBS.line(c.who, leave[0], box), sleep(1200)]); if (live2()) { el('.wk-cust').classList.add('bye'); R.tray = []; tray(); shelves(); await sleep(450); } });
    }
    // the customer gone (to the next one, or 竹内's word and the card shut once every line is said); the shift's last: paid at once, its
    // results once its last lines are said (finish's promise)
    function next(lines) {
      const live2 = () => Boolean(el('.om-shop')) && (ctx.on() || k >= N); k++;
      const bye = (async () => { await lines(live2); if (!live2()) return; if (k < N) { show(); return; }
        await said(keeper(!missed && !lost && ctx.done === 0 ? A.all : A.end, 'ok'), 800); if (el('.om-shop')) CLASS.close(); })();
      if (k >= N) ctx.finish({}, bye);
    }
    // a shelf: each good standing on it, its tag under it — its name with its reading and its price; a box of まんじゅう its pieces and
    // its price, a sign over the two boxes with their name
    const shelf = (list, top) => `<div class="om-shelf${top ? ' om-top' : ''}">${top ? `<span class="om-sign" lang="ja" aria-hidden="true"><span>${ruby(list[0][1])}</span></span>` : ''}${list.map((g) => `<button type="button" class="om-good" data-g="${g[0]}" aria-label="${esc(g[5])}・${g[2]} 日圓"><span class="om-pic">${pic(g)}<i class="om-tick" aria-hidden="true">✓</i></span>
      <span class="om-tag"><b lang="ja">${ruby(g[3] ? g[6] : g[1])}</b><i>${yenStr(g[2])}円</i></span></button>`).join('')}</div>`;   // a box's pieces read whole: ろっこいり (fix round 1, M-4)
    const G = MIYAGE.goods();
    CLASS.card('wk-miyage', '伴手禮店', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja">ゆのはな<ruby>堂<rt>どう</rt></ruby></b><span class="wk-n">${Math.min(k + 1, N)}／${N}</span></div>
      <div class="om-shop"><div class="om-shelves">${shelf(G.slice(0, 5), true)}${shelf(G.slice(5))}</div>
        <div class="om-front"><i class="om-noren" aria-hidden="true">${NOREN}</i><div class="om-door"><div class="wk-cust"></div></div>
          <div class="om-counter"><span class="om-plate" aria-hidden="true"></span><div class="om-tray"></div><button type="button" class="btn btn-primary om-give" lang="ja" disabled>どうぞ</button></div></div></div>
      <div class="om-opts"></div><div class="om-talk" data-who="makoto"><span class="kr-face om-mini"></span><p class="wk-say"></p></div>`, (e) => {
      if (!R || !live()) return;
      if (e.target.closest('.om-ear')) { if (R.phase !== 'pick' && R.phase !== 'reply') return; const q = P, r = rep = rep + 1; q.hold(); JOBS.line(R.c.who, R.line[0], box).then(() => { if (rep === r) { rep = 0; if (P === q) q.go(); } }); return; }   // heard again (after any line being said): the clock waits till it is said in full (Task 4's N-2)
      const o = e.target.closest('.om-opt'); if (o) { reply(o); return; }
      if (e.target.closest('.om-tray')) { offTray(e.clientX, e.clientY); return; }
      const g = e.target.closest('.om-good'); if (g) { tap(g.dataset.g); return; }
      if (e.target.closest('.om-give')) give();
    });
    box = document.querySelector('.cls.wk-miyage');
    plate();
    // a shift begun: 竹内's word and one of his sales lines (the seed's); picked up again: on
    if (ctx.done) { show(); return; }
    (async () => { await keeper(A.start); if (!live()) return; await keeper(A.sell[seed % A.sell.length]); if (!live()) return; show(); })();
  }
  function lines(add) {
    const s = S(), A = s.say, seen = new Set(), say = (who, l) => { if (l && !seen.has(who + '|' + l)) { seen.add(who + '|' + l); add(who, l); } };
    const X = TOWN.WORK.say.waiter.cust;
    MIYAGE.ids().map((id) => MIYAGE.cust(id)).forEach((c) => {
      say(c.who, c.line[0]); if (c.then) say(c.who, c.then[0]); say(c.who, (c.after || s.thanks)[0]);
      Object.values(c.no || {}).forEach((l) => say(c.who, l[0])); if (c.over) say(c.who, c.over[0]); if (c.short) say(c.who, c.short[0]);
      if (c.opts) say('hero', c.opts.find((o) => o[2])[0]);
      [X.again, X.hey, X.out, X.out0].forEach((l) => say(c.who, l[0]));   // kept waiting (JOBS.patience)
    });
    [s.hi, s.give].forEach((l) => say('hero', l[0]));
    Object.entries(A).filter(([key]) => key !== 'who').forEach(([, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x) => say(A.who, x[0])));
  }
  return { run, lines, now: () => (R ? Object.assign({}, R, { tray: R.tray.slice() }) : null), N };
})();
WORK.register('miyage', { run: MIYAGE_RUN.run, lines: MIYAGE_RUN.lines });
