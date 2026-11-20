'use strict';
// ---------- 落とし物 (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §7) ----------
// 小林's lost-and-found at the 交番 (m3): ten people, each with one thing left somewhere (〜に 〜を 忘れました). The hero asks what it
// is like (どんな…ですか — the other two replies plainly not that), they tell two of its looks joined with くて／で (黒くて、小さい
// 財布です), and 小林 brings out four of that kind onto the counter, the colour and the other look crossed so that only both together
// find it; a wallet or a bag maybe two that look the same, what is in them telling (中に カードと 写真が あります, from m4 入って
// います); or none of them is it (すみません、ありません). Once a shift maybe 源三, his glasses on his head. Heard first, as everywhere.
// the lost things, each drawn in a 60 × 48 box (x −30…30, y −24…24), its colour, size, length, age or shape its own
const LCOL = { red: ['#d0453c', '#a8322a'], blue: ['#3f6aa8', '#2c4e80'], black: ['#3a3a44', '#22222a'], white: ['#f4f1ea', '#cfc8b8'], yellow: ['#e6c23a', '#b8961e'], brown: ['#9a6a42', '#734c2c'], green: ['#4f8a5a', '#356640'] };
const LART = {
  // a long umbrella lying across (furled, its tip right), or a folding one, short, in its strap
  umbrella: (c, a) => { const [f, d] = LCOL[c]; return a.len === 'long'
    ? `<path d="M-26 -2 Q-30 -10 -24 -12 Q-20 -12 -20 -6 V-3" fill="none" stroke="#6e4f3a" stroke-width="3" stroke-linecap="round"/><path d="M-20 -6 L-14 -9 L22 -2 L28 0 L22 2 L-14 6 Z" fill="${f}"/><path d="M-14 -9 L22 -2 M-14 6 L22 2 M-8 -8 L-4 6 M2 -6 L6 4" stroke="${d}" stroke-width="1"/><path d="M28 0 h4" stroke="#8a8f99" stroke-width="1.6"/>${c === 'white' ? '<circle cx="0" cy="0" r="1.6" fill="#e58fa8"/><circle cx="10" cy="-1" r="1.4" fill="#e58fa8"/>' : ''}`
    : `<rect x="-14" y="-6" width="26" height="12" rx="5" fill="${f}"/><path d="M-10 -6 L-6 6 M-2 -6 L2 6 M6 -6 L9 6" stroke="${d}" stroke-width="1"/><rect x="-4" y="-7" width="5" height="14" rx="1" fill="${d}"/><rect x="-22" y="-3" width="8" height="6" rx="2" fill="#2b2b33"/><path d="M12 -1 h6" stroke="#8a8f99" stroke-width="1.6"/>`; },
  // a bag: big (a tote with two handles) or small (a pouch on a thin strap)
  bag: (c, a) => { const [f, d] = LCOL[c]; return a.size === 'big'
    ? `<path d="M-12 -10 Q-12 -20 -4 -20 Q4 -20 4 -10 M-4 -10 Q-4 -20 4 -20 Q12 -20 12 -10" fill="none" stroke="${d}" stroke-width="2.4"/><path d="M-20 -10 H20 L17 18 H-17 Z" fill="${f}"/><path d="M-20 -10 H20" stroke="${d}" stroke-width="2"/><path d="M-12 -4 V12 M12 -4 V12" stroke="${d}" stroke-width="1" stroke-opacity=".6"/>`
    : `<path d="M-8 -6 Q0 -22 8 -6" fill="none" stroke="${d}" stroke-width="1.4"/><rect x="-11" y="-6" width="22" height="16" rx="5" fill="${f}"/><path d="M-11 0 Q0 4 11 0" fill="none" stroke="${d}" stroke-width="1.2"/><circle cx="0" cy="2" r="1.6" fill="#d9b04a"/>`; },
  // a wallet: big (long, a flap and a clasp) or small (folded)
  wallet: (c, a) => { const [f, d] = LCOL[c]; return a.size === 'big'
    ? `<rect x="-20" y="-9" width="40" height="18" rx="3" fill="${f}"/><path d="M-18 -7 H18" stroke="#d9b04a" stroke-width="1" stroke-dasharray="1 1"/><rect x="16" y="-9" width="4" height="5" rx="1" fill="#d9b04a"/><path d="M-20 -2 H20" stroke="${d}" stroke-width="1.2"/><path d="M10 -9 V-2 Q10 2 14 2 H20" fill="${d}" fill-opacity=".5"/><circle cx="15" cy="-1" r="1.6" fill="#d9b04a"/><path d="M-18 6 h36" stroke="${d}" stroke-width=".8" stroke-dasharray="2 1.6"/>`
    : `<rect x="-8" y="-11" width="9" height="6" rx="1" fill="#e8e4da"/><rect x="-1" y="-10" width="8" height="5" rx="1" fill="#c9dbe4"/><rect x="-12" y="-7" width="24" height="17" rx="3" fill="${f}"/><path d="M0 -7 V10" stroke="${d}" stroke-width="1.4"/><path d="M-10 7 h20 M-10 -5 h20" stroke="${d}" stroke-width=".8" stroke-dasharray="2 1.6"/><path d="M6 -1 h7 v5 h-7 Z" fill="${d}"/><circle cx="9.5" cy="1.5" r="1.5" fill="#d9b04a"/>`; },
  // a cap: new (clean, bright) or old (faded, a patch, its peak bent)
  hat: (c, a) => { const [f, d] = LCOL[c], old = a.age === 'old'; return `<path d="M-16 6 Q-16 -14 0 -14 Q16 -14 16 6 Z" fill="${f}"${old ? ' fill-opacity=".7"' : ''}/><path d="M0 -14 V6 M-9 -11 Q-6 -2 -8 6 M9 -11 Q6 -2 8 6" stroke="${d}" stroke-width=".9"/><circle cx="0" cy="-14" r="1.8" fill="${d}"/>
    <path d="${old ? 'M14 4 Q24 2 28 9 Q20 11 12 8 Z' : 'M14 3 Q26 3 28 8 Q20 9 12 7 Z'}" fill="${d}"/>${old ? `<rect x="-10" y="-6" width="8" height="7" fill="${c === 'black' ? '#8a6a42' : '#3f6aa8'}" transform="rotate(-8 -6 -2)"/><path d="M-10 -6 h8 M-10 1 h8" stroke="#fff" stroke-width=".7" stroke-dasharray="1.2 1.2"/>` : '<path d="M-10 -10 Q-4 -13 2 -12" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none"/>'}`; },
  // glasses: round or square frames
  glasses: (c, a) => { const [f] = LCOL[c], r = a.shape === 'round'; const lens = (x) => (r ? `<circle cx="${x}" cy="0" r="8" fill="#dfeff6" fill-opacity=".6" stroke="${f}" stroke-width="2.4"/>` : `<rect x="${x - 9}" y="-7" width="18" height="14" rx="2" fill="#dfeff6" fill-opacity=".6" stroke="${f}" stroke-width="2.4"/>`);
    return `${lens(-11)}${lens(11)}<path d="M-3 -1 Q0 -4 3 -1" fill="none" stroke="${f}" stroke-width="2"/><path d="M-20 -2 L-27 -6 M20 -2 L27 -6" stroke="${f}" stroke-width="2"/><path d="M-14 -4 l4 4 M8 -4 l4 4" stroke="#fff" stroke-width="1.2"/>`; },
  // a key on a coloured tag: big or small
  key: (c, a) => { const [f, d] = LCOL[c], k = a.size === 'big' ? 1.3 : 0.85; return `<g transform="scale(${k})"><circle cx="-10" cy="0" r="7" fill="#c9b26a"/><circle cx="-10" cy="0" r="2.6" fill="#f6efe0"/><path d="M-3 -2 H16 V2 H12 V6 H9 V2 H6 V5 H3 V2 H-3 Z" fill="#c9b26a"/><path d="M-16 -4 L-24 -12" stroke="#8a8f99" stroke-width="1.2"/><rect x="-30" y="-20" width="10" height="10" rx="2" fill="${f}" transform="rotate(-45 -25 -15)"/></g>`; },
  // a wristwatch: a round or square face, the strap in its colour
  watch: (c, a) => { const [f, d] = LCOL[c], r = a.shape === 'round'; return `<rect x="-24" y="-5" width="48" height="10" rx="4" fill="${f}"/><path d="M-20 0 h6 M14 0 h6" stroke="${d}" stroke-width="1"/>${r ? '<circle r="11" fill="#e8e4da" stroke="#8a8f99" stroke-width="2.4"/>' : '<rect x="-10" y="-11" width="20" height="22" rx="3" fill="#e8e4da" stroke="#8a8f99" stroke-width="2.4"/>'}<path d="M0 0 V-7 M0 0 L5 2" stroke="#2b1c12" stroke-width="1.4" stroke-linecap="round"/>`; },
  // a camera: new (a small sleek one) or old (silver top, leather, a big lens)
  camera: (c, a) => { const [f, d] = LCOL[c]; return a.age === 'old'
    ? `<rect x="-20" y="-10" width="40" height="22" rx="2" fill="${f}"/><rect x="-20" y="-10" width="40" height="7" fill="#c9cdd4"/><rect x="-7" y="-15" width="14" height="6" fill="#c9cdd4"/><circle cx="0" cy="3" r="9" fill="#5a5f6a" stroke="#c9cdd4" stroke-width="2.4"/><circle cx="0" cy="3" r="4" fill="#2b3a4a"/><path d="M-20 -2 h40" stroke="${d}" stroke-width=".8" stroke-dasharray="1.4 1.4"/>`
    : `<rect x="-18" y="-10" width="36" height="21" rx="5" fill="${f}"/><circle cx="4" cy="1" r="7" fill="#2b3a4a" stroke="#8a8f99" stroke-width="1.6"/><circle cx="6" cy="-1" r="1.6" fill="#fff" fill-opacity=".6"/><rect x="-14" y="-7" width="6" height="3" rx="1" fill="#e8e4da"/>`; },
  // a smartphone in a coloured case: new, or old with its screen cracked
  phone: (c, a) => { const [f] = LCOL[c]; return `<rect x="-11" y="-20" width="22" height="40" rx="4" fill="${f}"/><rect x="-9" y="-17" width="18" height="33" rx="2" fill="#2b3a4a"/>${a.age === 'old' ? '<path d="M-6 -12 L1 -2 L-3 4 L4 12 M1 -2 L7 -6" fill="none" stroke="#e8f2f6" stroke-width="1"/>' : '<path d="M-6 -14 L4 -4" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>'}`; },
  // a book: big or small, its cover's colour
  book: (c, a) => { const [f, d] = LCOL[c], w = a.size === 'big' ? 22 : 14, h = a.size === 'big' ? 30 : 20; return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="${f}"/><rect x="${-w / 2}" y="${-h / 2}" width="3.4" height="${h}" fill="${d}"/><rect x="${-w / 2 + 6}" y="${-h / 2 + 5}" width="${w - 10}" height="5" fill="#fff" fill-opacity=".6"/><path d="M${w / 2} ${-h / 2 + 2} V${h / 2 - 1}" stroke="#f4f1ea" stroke-width="2"/>`; }
};
const LOST = (() => {
  const L = () => TOWN.EKI.lost, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const K = (kind) => L().kinds[kind];
  const knew = () => TOWNEV.reachedIdx() >= TOWNEV.unitIdx('m4');   // 入って います from m4
  // how it is said: the colour joined to the other look (or the shape first), then the thing
  const describe = (o) => { const c = L().colors[o.color], d = L().dims[o.dim], k = K(o.kind); return k[5] ? `${d[1]}、${c[0]} ${k[0]}です。` : `${c[1]}、${d[0]} ${k[0]}です。`; };
  const inside = (ids) => `{中|なか}に ${ids.map((i) => L().inside[i][0]).join('と ')}が ${knew() ? '{入|はい}って います' : 'あります'}。`;
  const zhOf = (o) => `${L().colors[o.color][2]}色的、${L().dims[o.dim][2]}的${K(o.kind)[1]}。`;
  const two = (kind, not) => { const h = L().holds[kind]; if (!h) return []; for (let i = 0; i < 9; i++) { const p = shuffle(h.slice()).slice(0, 2); if (!not || p.slice().sort().join() !== not.slice().sort().join()) return p; } return h.slice(0, 2); };
  const fillK = (l, kind, w) => [l[0].replace('{K}', K(kind)[0]).replace('{W}', w ? w[0] + ' ' : ''), l[1].replace('{k}', K(kind)[1]).replace('{w}', w ? w[1] : '')];
  // one person's errand: what they left (its looks), where, the four brought out (type: plain — one is it; twin — two look so, the
  // inside tells; none — none is it; gag — 源三's glasses on his head), the question to ask (qOpts, qRight)
  function task(kind, type = 'plain') {
    const k = K(kind), S = TOWN.WORK.say.lost, cs = shuffle(k[2].slice()), [d1, d2] = shuffle(k[3].slice()), color = type === 'gag' ? 'black' : cs[0], dim = type === 'gag' ? 'round' : d1, other = type === 'gag' ? 'square' : d2;
    const oc = cs.filter((c) => c !== color), mk = (c, d, ins) => ({ kind, color: c, dim: d, inside: ins || two(kind) });
    const t = { kind, type, color, dim, inside: two(kind), who: type === 'gag' ? 'genzo' : k[4], where: pick(L().where) };
    let cands;
    if (type === 'twin') { const other2 = two(kind, t.inside); cands = [mk(color, dim, t.inside), mk(color, dim, other2), mk(color, other), mk(oc[0], dim)]; }
    else if (type === 'none' || type === 'gag') cands = [mk(color, other), mk(oc[0], dim), mk(oc[1 % oc.length], dim), mk(oc[0], dim)].map((c, i) => (i === 3 && oc.length > 1 ? mk(color, other) : c));
    else cands = [mk(color, dim, t.inside), mk(color, other), mk(oc[0], dim), mk(oc[1 % oc.length], dim)];
    t.cands = shuffle(cands);
    t.lost = fillK(S.cust.lost, kind, t.where); t.desc = describe(t); t.descZh = zhOf(t); t.in = type === 'twin' ? inside(t.inside) : '';
    const qs = [S.me.which, S.me.price, S.me.like].map((l) => fillK(l, kind)), order = shuffle([0, 1, 2]);
    t.qOpts = order.map((i) => qs[i]); t.qRight = order.indexOf(0);
    return t;
  }
  // a shift: ten people, each a different thing; a wallet or a bag a twin, one none (not the glasses), the glasses now and then 源三's
  function make() {
    const kinds = shuffle(Object.keys(L().kinds)), twin = pick(['wallet', 'bag']), none = pick(kinds.filter((x) => x !== 'glasses' && x !== twin)), gag = Math.random() < 0.3;
    return kinds.map((kind) => task(kind, kind === twin ? 'twin' : kind === none ? 'none' : kind === 'glasses' && gag ? 'gag' : 'plain'));
  }
  return { make, task, describe, inside, zhOf, LART: typeof LART === 'object' ? LART : null };
})();

// ---- the card: the 交番 (its shelf of lost things behind, the counter), whoever came in with their patience, the three questions,
// then the four on the counter (tap one: up, its inside shown if it has one), これですか／すみません、ありません ----
const LOST_RUN = (() => {
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  let R = null, runs = 0;   // the one at the counter now (the tests): { k, task, phase, sel }
  const S = () => TOWN.WORK.say.lost;
  const art = (c, w = 60, h = 48) => `<svg viewBox="-30 -24 60 48" width="${w}" height="${h}" aria-hidden="true">${LART[c.kind](c.color, { size: c.dim, len: c.dim, age: c.dim, shape: c.dim })}</svg>`;
  const pic = (id) => { const d = typeof PICS === 'object' && PICS[TOWN.EKI.lost.inside[id][1]]; return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : ''; };
  // the shelf behind: grey steel, three boards, lost things on them with their numbered tags (the same each time: a look)
  const SHELF = (() => { const ks = Object.keys(LART), cs = ['black', 'red', 'blue', 'white', 'brown', 'yellow', 'green']; let s = '';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const kind = ks[(r * 6 + i * 7) % ks.length], c = cs[(r * 5 + i * 3) % cs.length], d = ['big', 'long', 'new', 'round', 'small', 'short', 'old', 'square'][(r + i) % 8];
      s += `<g transform="translate(${26 + i * 54} ${30 + r * 44}) scale(.62)">${LART[kind](c, { size: d, len: d, age: d, shape: d })}</g><rect x="${16 + i * 54}" y="${44 + r * 44}" width="18" height="7" rx="1" fill="#fbf7ec"/><text x="${25 + i * 54}" y="${49.6 + r * 44}" text-anchor="middle" font-size="5" fill="#3b2a1c" font-family="system-ui, sans-serif">${100 + r * 6 + i}</text>`; }
    return `<svg class="lf-shelf" viewBox="0 0 330 140" aria-hidden="true"><rect x="0" y="0" width="330" height="140" fill="#e8e4da"/><path d="M0 12 H330 M0 56 H330 M0 100 H330" stroke="#8a8f99" stroke-width="4"/><rect x="2" y="0" width="5" height="140" fill="#9aa4ae"/><rect x="323" y="0" width="5" height="140" fill="#9aa4ae"/>${s.replace(/translate\((\d+) (\d+)\)/g, (m, x, y) => `translate(${x} ${Number(y) - 2})`)}<rect x="0" y="128" width="330" height="12" fill="#c9c3b6"/></svg>`; })();
  const GLASSES = '<svg class="lf-onhead" viewBox="-30 -12 60 24" aria-hidden="true"><circle cx="-11" cy="0" r="8" fill="#dfeff6" fill-opacity=".5" stroke="#2b2b33" stroke-width="2.6"/><circle cx="11" cy="0" r="8" fill="#dfeff6" fill-opacity=".5" stroke="#2b2b33" stroke-width="2.6"/><path d="M-3 -1 Q0 -4 3 -1" fill="none" stroke="#2b2b33" stroke-width="2.2"/></svg>';
  function run(ctx) {
    const mine = ++runs, s = S(), tasks = LOST.make(), first = !Object.values(state.work.res).some((r) => r.place === 'lost' && r.yen !== undefined);
    const el = (q) => document.querySelector('.wk-lost ' + q), live = () => mine === runs && Boolean(el('.lf-room')) && ctx.on();
    let k = ctx.done, miss = 0, P = null, rep = 0, missed = 0, lost = 0;
    const word = ([ja, zh], cls = '') => { const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(s.who, ja); };
    const me = ([ja, zh]) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`; return speakAs('hero', ja); };
    const said = (p, min = 0, max = 5000) => JOBS.said(p, min, max);
    const heard = () => (R.phase === 'ask' ? R.task.lost[0] : `${R.task.desc}${R.task.in ? ' ' + R.task.in : ''}`);
    function bub(open) {
      const t = R.task, b = el('.wk-cust .wk-bub'); if (!b) return;
      const lines = R.phase === 'ask' ? [t.lost] : [t.lost, [t.desc + (t.in ? ' ' + t.in : ''), t.descZh]];
      b.innerHTML = `<button type="button" class="wk-ear lf-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? lines.map(([ja, zh]) => `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`).join('') : '<b class="bt-dots">……</b>'}`;
    }
    const tellAll = () => { const p = R.phase; R.phase = 'find'; bub(true); R.phase = p; };
    function stage() {
      const t = R.task, q = el('.lf-qs'), c = el('.lf-cands'), a = el('.lf-acts'); if (!q) return;
      q.innerHTML = R.phase === 'ask' ? t.qOpts.map(([ja, zh], i) => `<button type="button" class="btn lf-q" data-o="${i}" lang="ja">${ruby(ja)}${first ? `<small>${esc(zh)}</small>` : ''}</button>`).join('') : '';
      c.innerHTML = R.phase === 'find' || R.phase === 'done' ? t.cands.map((x, i) => `<button type="button" class="lf-cand${R.sel === i ? ' sel' : ''}" data-c="${i}" aria-label="候補 ${i + 1}">${art(x, 78, 62)}${R.sel === i && x.inside.length ? `<span class="lf-in">${x.inside.map(pic).join('')}</span>` : ''}</button>`).join('') : '';
      a.innerHTML = R.phase === 'find' ? `<button type="button" class="btn btn-primary lf-give" lang="ja"${R.sel === null ? ' disabled' : ''}>${ruby(s.me.give[0])}</button><button type="button" class="btn lf-none" lang="ja">${ruby(s.me.none[0])}</button>${t.type === 'gag' ? `<button type="button" class="btn lf-gag" lang="ja">${ruby(s.me.gag[0])}</button>` : ''}` : '';
    }
    function show() {
      const t = tasks[k]; R = { k, task: t, phase: 'hi', sel: null }; miss = 0; rep = 0;
      el('.wk-n').textContent = `${k + 1}／10`;
      const c = el('.wk-cust'); c.className = 'wk-cust'; c.removeAttribute('data-mood'); c.innerHTML = JOBS.custHtml(t.who); if (t.type === 'gag') c.querySelector('.kr-face').insertAdjacentHTML('beforeend', GLASSES);
      stage();
      const me0 = R; P = JOBS.patience('lost', t.who, 25, () => Boolean(el('.wk-cust')) && R === me0 && ctx.on(), gone);
      const hat = k === 4 && Math.random() < 0.5;   // now and then 小林's own hat (on his head)
      (async () => {
        if (hat) await said(word(s.hat), 900); if (!live() || R !== me0) return;
        await said(word(s.hi), 500); if (!live() || R !== me0) return;
        el('.wk-cust').classList.add('on'); R.phase = 'ask'; bub(false); stage(); await said(speakAs(t.who, t.lost[0]));
      })();
    }
    // the right question asked: what it is like, then the four brought out (the clock from the end of the telling)
    async function asked() {
      const t = R.task, me0 = R; R.phase = 'tell'; stage(); await said(me(t.qOpts[t.qRight]), 500); if (!live() || R !== me0) return;
      bub(false); await said(speakAs(t.who, t.desc)); if (t.in && live() && R === me0) await said(speakAs(t.who, t.in));
      if (!live() || R !== me0) return; R.phase = 'find'; bub(miss >= 2); SND.play('drawer', { vol: 0.6 }); word(s.bring); stage(); if (!rep) P.go();
    }
    function next(lines) {
      const live2 = () => el('.lf-room') && (ctx.on() || k >= 10); k++;
      const bye = (async () => { await lines(live2); if (!live2()) return; if (k < 10) { show(); return; }
        await said(word(!missed && !lost && ctx.done === 0 ? s.all : s.end, 'ok'), 800); if (el('.lf-room')) CLASS.close(); })();
      if (k >= 10) ctx.finish({}, bye);
    }
    function wrong(b, why) {
      miss++; missed++; playSfx('bad'); if (b) { b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); } if (P) P.hit(0.15);
      if (miss >= 2) tellAll();
      if (why) return why();
      return null;
    }
    function done(lines) { R.phase = 'done'; P.stop(); ctx.right(k, miss); playSfx('good'); tellAll(); stage(); el('.wk-cust').classList.remove('on'); next(lines); }
    function gone(line) {
      R.phase = 'done'; ctx.right(k, 3); lost++; playSfx('bad'); tellAll(); stage(); const t = R.task;
      next(async (live2) => { await said(speakAs(t.who, line[0]), 1200); if (live2()) { el('.wk-cust').classList.add('bye'); await sleep(450); } });
    }
    function give() {
      const t = R.task, c = t.cands[R.sel]; if (!c) return;
      const right = t.type !== 'none' && t.type !== 'gag' && c.color === t.color && c.dim === t.dim && c.inside.join() === t.inside.join();
      if (!right) { const b = el(`.lf-cand[data-c="${R.sel}"]`); wrong(b, () => said(speakAs(t.who, s.cust.no[0]), 400).then(() => { if (live() && R.task === t && R.phase === 'find') speakAs(t.who, heard()); })); return; }
      done(async (live2) => { await said(me(s.me.give), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.yes[0]), 900); if (!live2()) return; el('.wk-cust').classList.add('bye'); if (!miss && Math.random() < 0.3) await said(word(s.ok[Math.floor(Math.random() * s.ok.length)], 'ok')); });
    }
    function none() {
      const t = R.task;
      if (t.type !== 'none') { wrong(el('.lf-none'), () => word(t.type === 'gag' ? s.miss : s.there, 'bad')); return; }
      done(async (live2) => { await said(me(s.me.none), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.sad[0]), 800); if (!live2()) return; await said(word(s.call), 600); if (live2()) el('.wk-cust').classList.add('bye'); });
    }
    function gag() {
      const t = R.task;
      done(async (live2) => { await said(me(s.me.gag), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.gag[0]), 700); voiceFx('laugh'); await sleep(900); if (live2()) el('.wk-cust').classList.add('bye'); });
    }
    CLASS.card('wk-lost', '失物招領', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>落<rt>お</rt></ruby>とし<ruby>物<rt>もの</rt></ruby></b><span class="wk-n"></span></div>
      <div class="wk-who"><span class="kr-face">${TOWNEV.face(s.who)}</span><p class="wk-say"></p></div>
      <div class="lf-room">${SHELF}<div class="lf-counter"><div class="wk-cust"></div></div></div>
      <div class="lf-qs"></div><div class="lf-cands"></div><div class="lf-acts"></div><p class="wk-me"></p>`, (e) => {
      if (!R || !live()) return;
      if (e.target.closest('.lf-ear')) { if (R.phase === 'ask' || R.phase === 'find') { const q = P, r = rep = rep + 1; q.hold(); said(speakAs(R.task.who, heard())).then(() => { if (rep === r) { rep = 0; if (P === q && R.phase === 'find') q.go(); } }); } return; }
      if (R.phase === 'ask') { const q = e.target.closest('.lf-q'); if (!q) return; if (Number(q.dataset.o) === R.task.qRight) asked(); else wrong(q, () => word(s.miss, 'bad')); return; }
      if (R.phase !== 'find') return;
      const c = e.target.closest('.lf-cand'); if (c) { R.sel = Number(c.dataset.c); SND.play('place', { vol: 0.45 }); stage(); return; }
      if (e.target.closest('.lf-give')) give(); else if (e.target.closest('.lf-none')) none(); else if (e.target.closest('.lf-gag')) gag();
    });
    show();
  }
  function lines(add) {
    const L = TOWN.EKI.lost, s = S(), seen = new Set(), say = (who, l) => { if (!seen.has(who + l)) { seen.add(who + l); add(who, l); } };
    Object.entries(L.kinds).forEach(([kind, k]) => {
      const who = k[4];
      L.where.forEach((w) => say(who, s.cust.lost[0].replace('{K}', k[0]).replace('{W}', w[0] + ' ')));
      k[2].forEach((c) => k[3].forEach((d) => say(who, LOST.describe({ kind, color: c, dim: d }))));
      say('hero', s.me.which[0].replace('{K}', k[0]));
      if (L.holds[kind]) { const h = L.holds[kind]; h.forEach((a, i) => h.forEach((b, j) => { if (i === j) return; ['あります', '{入|はい}って います'].forEach((v) => say(who, `{中|なか}に ${L.inside[a][0]}と ${L.inside[b][0]}が ${v}。`)); })); }
      [s.cust.yes, s.cust.no, s.cust.sad].forEach((l) => say(who, l[0])); const X = TOWN.WORK.say.waiter.cust; [X.again, X.hey, X.out, X.out0].forEach((l) => say(who, l[0]));
    });
    ['genzo'].forEach((who) => { L.where.forEach((w) => say(who, s.cust.lost[0].replace('{K}', L.kinds.glasses[0]).replace('{W}', w[0] + ' '))); say(who, LOST.describe({ kind: 'glasses', color: 'black', dim: 'round' })); say(who, s.cust.gag[0]); });
    [s.me.give, s.me.none, s.me.gag].forEach((l) => say('hero', l[0]));
    [s.hi, s.bring, s.miss, s.there, s.call, s.end, s.all, s.hat, ...s.ok].forEach((l) => say(s.who, l[0]));
  }
  return { run, lines, now: () => R };
})();
WORK.register('lost', { run: LOST_RUN.run, lines: LOST_RUN.lines });
