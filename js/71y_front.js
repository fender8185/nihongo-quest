'use strict';
// ---------- フロント (2026-11-24, 湯の花温泉の打工; docs/superpowers/specs/2026-11-23-onsen-work-design.md §5.4, §3.4) ----------
// 旅館「花月」's front desk with 佐藤 (m15, 260 円), seen from behind the counter: on the left today's 予約台帳 lies open — five parties,
// each its name in kanji with its reading over it, how many, its room, dinner's time, a note (お誕生日, お子さま 二人, えびが だめ); on the
// right the key board, a wooden tag for each room (桜・菊・松・梅・竹), and the bell; across the counter the guest, with their patience.
// Ten guests a shift, each heard first (……, 🔊): checking in (お待ちして おりました, then their key — found by their name in the book),
// their luggage, dinner's time not yet told (the hero asks — なさいますか — and the book takes their answer), something wanted, somewhere
// asked for, a question the book answers (tonight's shrimp, by their note; dinner's time, by their row), and on the morning shift only
// (佐藤 7–11) leaving (お世話に なりました) — check-ins come mostly on the afternoon's (14–22). Three replies, every one keigo; every wrong
// one turns it the wrong way (ruling 15): 尊敬語 on what we do, 謙譲語 on what the guest does, いらっしゃる／おる for a thing — or the book
// misread. 佐藤 beside the hero: 「結構で ございます」, or whose doing it was. The fun ones (one a shift at most): a birthday in the book (a
// fourth reply, the wish: a 心付け), 道山 of the cruise at the wrong inn, a sumo wrestler whose futon is too small. The flow is the desk's
// (JOBS.desk, ruling 28), as the 観光案内所's and 原田's window's; every line through JOBS' lane (ruling 27): none cuts another.
const FRONT = (() => {
  const T = () => TOWN.ONSEN.front;
  const { rng, pickR, shuffleR } = JOBS;   // a shift's own dice: the same seed, the same book and guests
  const timeOf = (h) => T().times.find((x) => x[0] === h);
  // a line as said: its later wording from its unit on ([unit, Japanese, 中文])
  const said = (line, lat, u) => (lat && u >= TOWNEV.unitIdx(lat[0]) ? [lat[1], lat[2]] : [line[0], line[1]]);
  // a set of replies as options: [Japanese, 中文 or why, right, how ('' right; self, guest, thing, fact wrong; bday the wish)]
  const optsOf = (set) => [[set[0][0], set[0][1], true, '']].concat(set[1].map(([ja, why, how]) => [ja, why, false, how]));
  const roomLine = (id) => { const [, k, r, z] = T().rooms.find((x) => x[0] === id), [ja, zh] = T().room; return [ja.replace('{R}', `{${k}の間|${r}のま}`), zh.replace('{r}', z)]; };
  // dinner's time asked of the book: the time on their row; the wrong one another row's (the book always has four times: one a row)
  function whenOpts(p, book, R) {
    const set = T().reply.when, [, mark, zh] = timeOf(p.dinner), others = [...new Set(book.filter((q) => q !== p && q.dinner !== null && q.dinner !== p.dinner).map((q) => q.dinner))];
    const fill = (s, m, z = '') => s.replace('{T}', m).replace('{t}', z), wm = timeOf(pickR(others, R))[1];
    return [[fill(set[0][0], mark), fill(set[0][1], mark, zh), true, ''], [fill(set[1][0][0], wm), set[1][0][1], false, set[1][0][2]], [fill(set[1][1][0], mark), set[1][1][1], false, set[1][1][2]]];
  }
  // a shift: { seed, morning, book: [{ who (a guest's id; null: arriving later), name, kana, n, room, dinner (hour; null: not told), memo
  // ('', bday, kids, ebi), in (staying on: their key out) }], tasks: [{ id, kind, who, q: [ja, 中文], opts, steps?, party? (their row),
  // room?, bday?, ask?, time?, answer?, fun?, after? }] } — the afternoon (14–22): three or four checking in, two of them coming back (the
  // book's question; dinner's time not told), the rest of the book parties arriving later whose names sound like a guest's (read by ear);
  // the morning (7–11): three leaving (only then), one checking in early, two staying on asking of the book. Then luggage, wants and where
  // to make ten; a fun one now and then — the birthday on a check-in's row, 道山 in a where's place, the sumo wrestler in a want's (force:
  // that one, or null for none — the tests')
  function make(u = TOWNEV.reachedIdx(), morning = TOWNEV.now() < 12, seed = 1 + Math.floor(Math.random() * 2147483646), force) {
    const R = rng(seed), F = T(), names = shuffleR(Object.keys(F.named), R);
    const fun = force !== undefined ? force : pickR([null, 'bday', 'michiyama', 'rikishi'], R);
    const nIn = morning ? 1 : R() < 0.5 ? 3 : 4, ins = names.slice(0, nIn), [memoW, dinW] = morning ? names.slice(1, 3) : shuffleR(ins, R).slice(0, 2);
    const party = (who, stays) => ({ who, name: F.named[who].name[0], kana: F.named[who].name[1], in: stays, memo: '' });
    const rows = ins.map((w) => party(w, false)).concat(morning ? [party(memoW, true), party(dinW, true)] : []);
    const like = (ws) => shuffleR(ws.flatMap((w) => F.like[w] || []), R);
    for (const [name, kana] of like(ins).concat(like(Object.keys(F.like).filter((w) => !ins.includes(w))))) { if (rows.length >= 5) break; if (!rows.some((p) => p.name === name)) rows.push({ who: null, name, kana, in: false, memo: '' }); }
    const rooms = shuffleR(F.rooms.map((x) => x[0]), R), times = shuffleR(F.times.map((x) => x[0]), R); let ti = 0;
    rows.forEach((p, i) => { p.room = rooms[i]; p.n = pickR([1, 2, 2, 3], R); p.dinner = p.who === dinW ? null : times[ti++ % times.length]; });
    const book = shuffleR(rows, R), at = (who) => book.findIndex((p) => p.who === who);
    // the notes: tonight's shrimp asked of a party (えびが だめ on their row or not), or on another's; a birthday on a check-in's row; two
    // children with a party arriving later
    const ask = R() < 0.5 ? 'ebi' : 'when';
    if (ask === 'ebi') { if (R() < 0.5) book[at(memoW)].memo = 'ebi'; } else if (R() < 0.5) { const o = book.filter((p) => p.who !== memoW && p.who !== dinW); pickR(o, R).memo = 'ebi'; }
    if (fun === 'bday') { const c = book.filter((p) => ins.includes(p.who) && !p.memo); if (c.length) pickR(c, R).memo = 'bday'; }
    { const c = book.filter((p) => !p.who && !p.memo); if (c.length && R() < 0.6) { const p = pickR(c, R); p.memo = 'kids'; p.n = 4; } }
    const tasks = [];
    ins.forEach((w) => { const i = at(w), p = book[i], opts = optsOf(F.reply.in); if (p.memo === 'bday') opts.push([F.bday[0], F.bday[1], true, 'bday']);
      tasks.push({ id: 'in:' + w, kind: 'checkin', who: w, q: said(F.named[w].in, F.named[w].in[2], u), opts: shuffleR(opts, R), steps: ['say', 'key'], party: i, room: p.room, bday: p.memo === 'bday' }); });
    { const i = at(memoW), p = book[i]; tasks.push({ id: 'memo:' + ask, kind: 'memo', ask, who: memoW, q: F.named[memoW][ask].slice(0, 2), party: i,
      opts: shuffleR(ask === 'ebi' ? optsOf(p.memo === 'ebi' ? F.reply.ebiNo : F.reply.ebiYes) : whenOpts(p, book, R), R) }); }
    { const N0 = F.named[dinW]; tasks.push({ id: 'dinner', kind: 'dinner', who: dinW, q: N0.late.slice(0, 2), opts: shuffleR(optsOf(F.reply.dinner), R), party: at(dinW), time: N0.dinner[0], answer: N0.dinner[1] }); }
    const A = F.ask, of = (kind) => Object.keys(A).filter((id) => A[id].kind === kind && (!A[id].at || A[id].at === (morning ? 'am' : 'pm')));
    const plain = (id) => { const a = A[id]; return { id, kind: a.kind, who: a.who, q: said(a.line, a.later, u), opts: shuffleR(optsOf(F.reply[a.reply]), R) }; };
    if (morning) of('checkout').forEach((id) => tasks.push(plain(id)));
    of('luggage').forEach((id) => tasks.push(plain(id)));
    const rest = 10 - tasks.length, [nReq, nWhere] = rest >= 4 ? [2, rest - 2] : R() < 0.5 ? [2, rest - 2] : [1, rest - 1];
    shuffleR(of('request'), R).slice(0, nReq).forEach((id) => tasks.push(plain(id))); shuffleR(of('where'), R).slice(0, nWhere).forEach((id) => tasks.push(plain(id)));
    if (fun === 'michiyama' || fun === 'rikishi') {   // in a where's place (道山) or a want's (the wrestler), else the other's
      const f = F.fun[fun], want = fun === 'michiyama' ? 'where' : 'request', j = tasks.findIndex((t) => t.kind === want) >= 0 ? tasks.findIndex((t) => t.kind === want) : tasks.findIndex((t) => ['where', 'request'].includes(t.kind));
      tasks[j] = { id: 'fun:' + fun, kind: f.kind, fun, who: f.who, q: f.line.slice(0, 2), opts: shuffleR(optsOf(f.reply), R), after: f.after };
    }
    return { seed, morning, book, tasks: arrange(tasks, morning, R) };
  }
  // the order: a morning's first guest leaving, an afternoon's arriving; a guest coming back to the desk (the afternoon's book question,
  // dinner's time) after their check-in, with someone between; no one twice running — never in practice short of tries (else check-ins
  // first, the book's questions last)
  function arrange(ts, morning, R) {
    const firstKind = morning ? 'checkout' : 'checkin', ok = (all) => all.every((t, i) => (!i || t.who !== all[i - 1].who)
      && (morning || !['memo', 'dinner'].includes(t.kind) || all.findIndex((x) => x.kind === 'checkin' && x.who === t.who) < i - 1));
    for (let n = 0; n < 400; n++) { const first = pickR(ts.filter((t) => t.kind === firstKind), R), all = [first, ...shuffleR(ts.filter((t) => t !== first), R)]; if (ok(all)) return all; }
    const rank = (t) => ['checkout', 'checkin', 'luggage', 'request', 'where', 'memo', 'dinner'].indexOf(t.kind);
    return ts.slice().sort((a, b) => rank(a) - rank(b));
  }
  // every right reply a shift can make (the generator's: each a clip in the hero's voice), and every guest
  function rights() {
    const F = T(), out = new Set(['in', 'bags', 'dinner', 'towel', 'yukata', 'kasa', 'bath', 'toilet', 'okami', 'out', 'ebiNo', 'ebiYes'].map((k) => F.reply[k][0][0]));
    F.times.forEach(([, m]) => out.add(F.reply.when[0][0].replace('{T}', m))); Object.values(F.fun).forEach((f) => out.add(f.reply[0][0]));
    return [...out];
  }
  const guests = () => [...new Set(Object.keys(T().named).concat(Object.values(T().ask).map((a) => a.who), Object.values(T().fun).map((f) => f.who)))];
  return { make, rights, guests, roomLine, timeOf, get ROOMS() { return T().rooms; } };
})();

const FRONT_RUN = (() => {
  const N = 10, SECS = { say: 25, key: 25 }, MISS = 0.15;   // a guest's patience: 25 s from the end of their words (the book takes reading), and again for their key; a miss costs some
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const S = () => TOWN.ONSEN.front;
  let D = null, runs = 0;   // the desk under way (JOBS.desk): its now() the guest at the desk (the tests: { k, task, phase, step, miss, seed, morning })
  const hm = (h) => `${Math.floor(h)}:${h % 1 ? '30' : '00'}`;
  // the call bell on the counter (rung as a guest comes up), a guest's luggage in hand
  const BELL = '<svg viewBox="0 0 44 34" aria-hidden="true"><ellipse cx="22" cy="29" rx="17" ry="4.4" fill="#2b2b33"/><rect x="6" y="25" width="32" height="4" rx="2" fill="#3a3a44"/><g class="fr-cap"><path d="M8.6 25 Q8.6 9.4 22 9.4 Q35.4 9.4 35.4 25 Z" fill="#c9ccd2"/><path d="M12.6 20 q1.6 -6.6 7.2 -8.2" stroke="#fff" stroke-opacity=".85" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="20.4" y="4.4" width="3.2" height="5.4" fill="#8a8e96"/><ellipse cx="22" cy="4.4" rx="4" ry="1.7" fill="#b8bcc2"/></g></svg>';
  const BAGS = '<svg viewBox="0 0 34 26" aria-hidden="true"><path d="M4 9 h13 l1.4 16 h-15.8 Z" fill="#e6c48a"/><path d="M7 9 q0 -6 3.5 -6 q3.5 0 3.5 6" fill="none" stroke="#8a5a34" stroke-width="1.4"/><path d="M15 11 h14 l1.6 14.6 h-17 Z" fill="#5a78c8"/><path d="M18.4 11 q0 -6 3.6 -6 q3.6 0 3.6 6" fill="none" stroke="#3f4660" stroke-width="1.4"/><path d="M17 14 h11" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/></svg>';
  // the open 予約台帳: its title and the day; a row a party — the name (its reading over it) 様, how many, the room, dinner (― not told),
  // the note under it; a party in (checked in, or staying on) marked so
  function bookHtml(book) {
    const F = S(), d = TOWNEV.today(), room = (id) => F.rooms.find((x) => x[0] === id);
    const rows = book.map((p) => { const [, k, r] = room(p.room);
      return `<div class="fr-row${p.in ? ' fr-in' : ''}" data-room="${p.room}"><b class="fr-nm"><ruby>${esc(p.name)}<rt>${esc(p.kana)}</rt></ruby><small><ruby>様<rt>さま</rt></ruby></small></b><span class="fr-n">${p.n}名</span>
        <span class="fr-rm"><ruby>${k}<rt>${r}</rt></ruby></span><span class="fr-dn">${p.dinner === null ? '―' : hm(p.dinner)}</span>${p.memo ? `<span class="fr-memo">${ruby(F.memo[p.memo][0])}</span>` : ''}</div>`; }).join('');
    return `<p class="fr-btitle"><b><ruby>予約<rt>よやく</rt></ruby><ruby>台帳<rt>だいちょう</rt></ruby></b><small>${d.getMonth() + 1}月${d.getDate()}日</small></p>
      <div class="fr-hd"><span>お<ruby>名前<rt>なまえ</rt></ruby></span><span><ruby>人数<rt>にんずう</rt></ruby></span><span><ruby>部屋<rt>へや</rt></ruby></span><span><ruby>夕食<rt>ゆうしょく</rt></ruby></span></div>${rows}`;
  }
  // the key board behind the desk: a wooden tag on its hook for each room (a room taken: its hook bare); the bell beside it
  const boardHtml = (book) => S().rooms.map(([id, k, r]) => { const out = book.some((p) => p.room === id && p.in);
    return `<button type="button" class="fr-key${out ? ' fr-out' : ''}" data-room="${id}" aria-label="${k}の間の鍵"${out ? ' disabled' : ''}><i class="fr-hook" aria-hidden="true"></i><b><ruby>${k}<rt>${r}</rt></ruby></b></button>`; }).join('') + `<i class="fr-bell">${BELL}</i>`;
  function run(ctx) {
    const mine = ++runs, F = S(), A = F.say, kept = ctx.kept || {}, seed = Number(kept.seed) || 1 + Math.floor(Math.random() * 2147483646);
    const morning = kept.seed ? Boolean(kept.morning) : TOWNEV.now() < 12;   // the shift's half of the day, kept with it: taken up later, the same shift
    let tip = Number(kept.tip) || 0, praised = false;
    const keep = () => ctx.keep(Object.assign({ seed, morning }, tip ? { tip } : {}));   // the book and the 心付け kept with the day's record: the same after a break
    if (!kept.seed) keep();
    const shift = FRONT.make(TOWNEV.reachedIdx(), morning, seed), book = shift.book.map((p) => Object.assign({}, p)), first = !Object.values(state.work.res).some((r) => r.place === 'front' && r.yen !== undefined);
    // a shift taken up again: the book and the board as the guests before left them — each checked in, their key out; each dinner told
    const done = (WORK.today() || {}).score || {};
    shift.tasks.slice(0, ctx.done).forEach((t, k) => { if (done[k] >= 3) return; if (t.kind === 'checkin') book[t.party].in = true; if (t.kind === 'dinner') book[t.party].dinner = t.time; });
    // this run's own card (box, once drawn): a shift's goodbye still being said when the next one's card opens never touches that one
    let box = null; const el = (q) => (box && box.isConnected ? box.querySelector(q) : null), all = (q) => (box && box.isConnected ? [...box.querySelectorAll(q)] : []);
    const live = () => mine === runs && Boolean(el('.fr-desk')) && ctx.on();
    // a short phone: the card holds the book, the board, the guest, the replies and the talk line; when a line lands below its fold the
    // card scrolls itself just far enough to show it, and is back at its top for each guest (the 案内所's way)
    const card = () => (box && box.isConnected ? box.querySelector('.cls-card') : null);
    const glide = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
    const seeTalk = () => requestAnimationFrame(() => { const c = card(), t = el('.fr-talk'); if (!c || !t) return;
      const d = t.getBoundingClientRect().bottom - (c.getBoundingClientRect().top + c.clientTop + c.clientHeight) + 6; if (d > 0) c.scrollBy({ top: d, behavior: glide() }); });
    // 佐藤 and the hero share the line under the replies (whoever spoke last); the hero's 中文 on the job's first shift only, under the
    // reply once said — never under the buttons (ruling 23)
    const talk = (who) => { const t = el('.fr-talk'); if (t) t.dataset.who = who; seeTalk(); };
    const word = ([ja, zh], cls = '') => { talk('drv'); const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(A.who, ja); };
    const me = ([ja, zh]) => { talk('me'); const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`; return speakAs('hero', ja); };
    const said = (p, min = 0, max = 5000) => JOBS.said(p, min, max);
    // the guest's bubble: their words heard first (……, 🔊), shown once right, after two misses, or as they go (line: their word after)
    function bub(open, line) {
      const R = D.now(), b = el('.wk-cust .wk-bub'); if (!b || !R) return; const [ja, zh] = line || R.task.q;
      b.innerHTML = `<button type="button" class="wk-ear fr-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>` : '<b class="fr-dots">……</b>'}`;
      b.classList.toggle('wk-open', Boolean(open));   // open: a pop-up goes under it, never over the words (Task 4's N-4)
      if (open) seeTalk();
    }
    // the replies — or, a check-in's second step, the board's keys to tap (the replies' place says so)
    function opts(on) {
      const o = el('.fr-opts'), R = D.now(); if (!o || !R) return; const keyStep = on && Boolean(R.task.steps) && R.step === 1;
      const b = el('.fr-board'); if (b) b.classList.toggle('fr-pick', keyStep);
      o.innerHTML = !on ? '' : keyStep ? '<p class="fr-tip">在左邊的台帳找到這位客人的名字（看名字上的念法），點他房間的鑰匙。</p>'
        : R.task.opts.map(([ja], i) => `<button type="button" class="btn fr-opt" data-o="${i}" lang="ja"><span>${ruby(ja)}</span></button>`).join('');
      if (on) seeTalk();
    }
    // a guest comes up: the bell rung, the book and the board unlit, the card from its top (the book first); their luggage in hand
    function draw(t) {
      const cc = card(); if (cc) cc.scrollTop = 0;
      all('.fr-row.fr-lit').forEach((x) => x.classList.remove('fr-lit')); all('.fr-key.wk-hint').forEach((x) => x.classList.remove('wk-hint')); all('.fr-dn.fr-new').forEach((x) => x.classList.remove('fr-new'));
      const c = el('.wk-cust'); c.dataset.kind = t.kind; c.dataset.fun = t.fun || ''; if (t.kind === 'luggage') c.insertAdjacentHTML('beforeend', `<i class="fr-hold" aria-label="提著很多行李">${BAGS}</i>`);
      const bell = el('.fr-bell'); if (bell) { bell.classList.remove('fr-ding'); void bell.getBoundingClientRect(); bell.classList.add('fr-ding'); } SND.play('desk-bell', { vol: 0.45 });
    }
    // lit with the right reply (two misses, or as they go): the party's row in the book — and at a check-in's key (or as they go then) their key
    function hint(t, R, out) {
      if (t.party === undefined || (t.kind === 'checkin' && R.step === 0 && !out)) return;
      const p = book[t.party], row = el(`.fr-row[data-room="${p.room}"]`); if (row) row.classList.add('fr-lit');
      if (t.kind === 'checkin' && !p.in) { const k = el(`.fr-key[data-room="${p.room}"]`); if (k) k.classList.add('wk-hint'); }
    }
    // after a step right, as each asks: the key handed over (off the board, their row marked in, the room said); the hero's reply — the
    // birthday wish (their gladness, a 心付け, kept), dinner's time asked (their answer, the book takes it: かしこまりました)
    async function then(t, R, i, lv) {
      if (i === undefined) {
        const p = book[t.party]; p.in = true; SND.play('kuji', { vol: 0.5 });
        const k = el(`.fr-key[data-room="${p.room}"]`); if (k) { k.classList.remove('wk-hint'); k.classList.add('fr-out'); k.disabled = true; }   // a bare hook: nothing to tap
        const row = el(`.fr-row[data-room="${p.room}"]`); if (row) row.classList.add('fr-in');
        await said(me(FRONT.roomLine(p.room)), 700); return;
      }
      const o = t.opts[i]; await said(me(o), 900); if (!lv()) return;
      if (o[3] === 'bday') { const glad = F.named[t.who].bday, got = !tip; if (got) { tip = F.tip; keep(); } bub(true, glad); await said(speakAs(t.who, glad[0]), 600); if (lv() && got) SND.play('coins', { vol: 0.5 }); return; }   // one birthday a shift: a 心付け kept from before a break is never given twice
      if (t.kind === 'dinner') {
        bub(true, t.answer); await said(speakAs(t.who, t.answer[0]), 600); if (!lv()) return;
        const p = book[t.party]; p.dinner = t.time; const c = el(`.fr-row[data-room="${p.room}"] .fr-dn`); if (c) { c.textContent = hm(t.time); c.classList.add('fr-new'); }
        SND.play('page', { vol: 0.4 }); await said(me(F.ok), 600);
      }
    }
    // served: their word (a fun one's own, in the bubble; dinner's or a leaving guest's: none more), 佐藤's offer to 道山, off they go;
    // right at once — 佐藤's 「結構で ございます」 (the run's first such always, then about one in two, as the seed says)
    async function served(t, R, lv) {
      const after = t.after || (['dinner', 'checkout'].includes(t.kind) ? null : F.thanks);
      if (after) { if (t.after) bub(true, after); await said(speakAs(t.who, after[0]), 600); if (!lv()) return; }
      if (t.fun === 'michiyama') { await said(word(A.lost), 600); if (!lv()) return; }
      el('.wk-cust').classList.add('bye');
      if (!R.miss && (!praised || JOBS.rng((seed ^ Math.imul(R.k + 1, 0x9e3779b1)) >>> 0)() < 0.5)) { const l = praised ? A.ok[(R.k + seed) % A.ok.length] : A.ok[0]; praised = true; await said(word(l, 'ok')); }
    }
    D = JOBS.desk({ job: 'front', ctx, N, box: () => box, alive: '.fr-desk', mine: () => mine === runs, tasks: shift.tasks,
      isRight: (t, i) => Boolean(t.opts[i] && t.opts[i][2]), secs: (t, step) => (step ? SECS.key : SECS.say), cost: MISS, fresh: () => ({ seed, morning }),
      hi: (t) => (t.kind === 'checkin' || t.fun === 'michiyama' ? F.hi.in : morning ? F.hi.am : F.hi.pm),   // arriving: いらっしゃいませ; else the time of day's
      me, word, bub, opts, draw, hint, then, served, optSel: '.fr-opt', earSel: '.fr-ear', rightCls: 'fr-right', once: true,
      miss: (t, i) => { const o = t.opts[i]; return [A[o[3]][0], o[1]]; },   // 佐藤: whose doing it is (or the book misread), the reply's why under it
      tap: (e, R) => { const k = e.target.closest('.fr-key'); if (!k) return false;   // a key: theirs at a check-in's second step, another a miss
        if (!R.task.steps || R.step !== 1 || k.classList.contains('fr-out')) return true;
        if (k.dataset.room === R.task.room) D.right(); else D.miss(k, [A.key[0], F.keyWhy]); return true; },
      end: A.end, all: A.all, extra: () => (tip ? { tip, tipName: F.tipName } : {}) });
    CLASS.card('wk-front', '旅館櫃台', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja">フロント</b><span class="wk-n">${Math.min(ctx.done + 1, N)}／${N}</span></div>
      <div class="fr-desk"><div class="fr-book" lang="ja">${bookHtml(book)}</div><div class="fr-board" lang="ja">${boardHtml(book)}</div></div>
      <div class="fr-lobby"><div class="wk-cust"></div></div>
      <div class="fr-opts"></div><div class="fr-talk" data-who="drv"><span class="kr-face">${TOWNEV.face(A.who)}</span><p class="wk-say"></p><p class="wk-me"></p></div>`, (e) => D.click(e));
    box = document.querySelector('.cls.wk-front');
    // a shift begun: 佐藤's word (お客さまには、敬語で ございます); picked up again: on
    if (ctx.done) { D.start(); return; }
    (async () => { await said(word(A.start), 600); if (!live()) return; D.start(); })();
  }
  function lines(add) {
    const F = S(), A = F.say, seen = new Set(), say = (who, l) => { if (l && !seen.has(who + '|' + l)) { seen.add(who + '|' + l); add(who, l); } };
    const X = TOWN.WORK.say.waiter.cust, fun = Object.values(F.fun).map((f) => f.who);
    Object.entries(F.named).forEach(([w, p]) => { [p.in, p.ebi, p.when, p.late, p.dinner[1], p.bday].forEach((l) => say(w, l[0])); if (p.in[2]) say(w, p.in[2][1]); });
    Object.values(F.ask).forEach((a) => { say(a.who, a.line[0]); if (a.later) say(a.who, a.later[1]); });
    Object.values(F.fun).forEach((f) => { say(f.who, f.line[0]); say(f.who, f.after[0]); });
    FRONT.guests().forEach((w) => (fun.includes(w) ? [] : [F.thanks]).concat([X.again, X.hey, X.out, X.out0]).forEach((l) => say(w, l[0])));   // their thanks; kept waiting (JOBS.patience)
    Object.values(F.hi).forEach((l) => say('hero', l[0])); [F.ok, F.bday].forEach((l) => say('hero', l[0]));
    FRONT.rights().forEach((l) => say('hero', l)); F.rooms.forEach(([id]) => say('hero', FRONT.roomLine(id)[0]));
    Object.entries(A).filter(([k]) => k !== 'who').forEach(([, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x) => say(A.who, x[0])));
  }
  return { run, lines, now: () => (D ? D.now() : null), N, SECS };
})();
WORK.register('front', { run: FRONT_RUN.run, lines: FRONT_RUN.lines });
