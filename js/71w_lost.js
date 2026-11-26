'use strict';
// ---------- 落とし物 (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §7) ----------
// 小林's lost-and-found at the 交番 (m3): ten people, each with one thing left somewhere (〜に 〜を 忘れました). What they say first
// varies — what and where, only what (財布を 忘れました), only where (電車に 忘れ物を しました) — and the hero asks what was not said
// (何を／どこに 忘れましたか, どんな…ですか; 2026-11-22, the user: always どんな first, the other two plainly not it, taught nothing),
// one already told a miss; the looks are two joined with くて／で (黒くて、小さい 財布です), and 小林 brings out four of that kind onto the
// counter, the colour and the other look crossed so that only both together find it; a wallet or a bag maybe two that look the same,
// what is in them telling (中に カードと 写真が あります, from m4 入って います); or none of them is it (すみません、ありません).
// Once a shift maybe 源三, his glasses on his head. Heard first, as everywhere.
// the lost things, each drawn in a 60 × 48 box (x −30…30, y −24…24), its colour, size, length, age or shape its own
const LCOL = { red: ['#d0453c', '#a8322a'], blue: ['#3f6aa8', '#2c4e80'], black: ['#3a3a44', '#22222a'], white: ['#f4f1ea', '#cfc8b8'], yellow: ['#e6c23a', '#b8961e'], brown: ['#9a6a42', '#734c2c'], green: ['#4f8a5a', '#356640'] };
const LART = {
  // a long umbrella lying across (furled, its tip right), or a folding one, short, in its strap
  umbrella: (c, a) => { const [f, d] = LCOL[c]; return a.size === 'big' || a.len === 'long'   // big: a long one; small: a folding one
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
  const zhOf = (o) => `${L().colors[o.color][2]}色的${L().dims[o.dim][2]}${K(o.kind)[1]}`;   // 黑色的小錢包, 黑色的圓形眼鏡
  const two = (kind, not) => { const h = L().holds[kind]; if (!h) return []; for (let i = 0; i < 9; i++) { const p = shuffle(h.slice()).slice(0, 2); if (!not || p.slice().sort().join() !== not.slice().sort().join()) return p; } return h.slice(0, 2); };
  const fillK = (l, kind, w) => [l[0].replace('{K}', K(kind)[0]).replace('{W}', w ? w[0] + ' ' : ''), l[1].replace('{k}', K(kind)[1]).replace('{w}', w ? w[1] : '')];
  // one person's errand: what they left (its looks), where, the four brought out (type: plain — one is it; twin — two look so, the
  // inside tells; none — none is it; gag — 源三's glasses on his head); what they say first (open: both, what or where) and their
  // answers (it, at: what it is, where it was); the three questions in their places on the card (qs), a twin's (q2: what is in it
  // beside two already told)
  function task(kind, type = 'plain', open = pick(['both', 'what', 'where'])) {
    const k = K(kind), S = TOWN.WORK.say.lost, cs = shuffle(k[2].slice()), [d1, d2] = shuffle(k[3].slice()), color = type === 'gag' ? 'black' : cs[0], dim = type === 'gag' ? 'round' : d1, other = type === 'gag' ? 'square' : d2;
    const oc = cs.filter((c) => c !== color), mk = (c, d, ins) => ({ kind, color: c, dim: d, inside: ins || two(kind) });
    const t = { kind, type, open, color, dim, inside: two(kind), who: type === 'gag' ? 'genzo' : k[4], where: pick(L().where) };
    let cands;
    if (type === 'twin') { const other2 = two(kind, t.inside); cands = [mk(color, dim, t.inside), mk(color, dim, other2), mk(color, other), mk(oc[0], dim)]; }
    else if (type === 'none' || type === 'gag') cands = [mk(color, other), mk(oc[0], dim), mk(oc[1], dim), mk(oc[2], dim)];   // four colours a kind at least: no two alike (2026-11-22, the review)
    else cands = [mk(color, dim, t.inside), mk(color, other), mk(oc[0], dim), mk(oc[1], dim)];
    t.cands = shuffle(cands);
    t.lost = fillK(open === 'both' ? S.cust.lost : S.cust[open], kind, t.where); t.it = fillK(S.cust.it, kind); t.at = fillK(S.cust.at, kind, t.where);
    t.desc = describe(t); t.descZh = zhOf(t); t.in = type === 'twin' ? inside(t.inside) : '';
    t.qs = shuffle(['what', 'where', 'look']); if (type === 'twin') t.q2 = shuffle(['inside', ...shuffle(t.qs.slice()).slice(0, 2)]);
    return t;
  }
  // what is known at first (what they said), a question as the hero says it (どんな もの while the thing is not yet said), its answer
  const known = (t) => ({ what: t.open !== 'where', where: t.open !== 'what', look: false, inside: false });
  const question = (t, q, know) => fillK(TOWN.WORK.say.lost.me[q === 'look' ? (know.what ? 'which' : 'thing') : q], t.kind);
  const answer = (t, q) => (q === 'what' ? t.it : q === 'where' ? t.at : q === 'look' ? [t.desc, t.descZh] : [t.in, '']);
  // a shift: ten people, each a different thing; a wallet or a bag a twin, one none (not the glasses), the glasses now and then 源三's;
  // three or four say both what and where first, three only what, three only where
  function make() {
    const kinds = shuffle(Object.keys(L().kinds)), twin = pick(['wallet', 'bag']), none = pick(kinds.filter((x) => x !== 'glasses' && x !== twin)), gag = Math.random() < 0.3;
    const opens = shuffle(['both', 'both', 'both', 'what', 'what', 'what', 'where', 'where', 'where', pick(['both', 'what', 'where'])]);
    return kinds.map((kind, i) => task(kind, kind === twin ? 'twin' : kind === none ? 'none' : kind === 'glasses' && gag ? 'gag' : 'plain', opens[i]));
  }
  return { make, task, known, question, answer, describe, inside, zhOf, LART: typeof LART === 'object' ? LART : null };
})();

// ---- the card: the 交番 (its shelf of lost things behind, the counter), whoever came in with their patience, the three questions
// (asked till what, where and the looks are told), then the four on the counter (tap one: up, its inside shown if it has one),
// これですか／すみません、ありません; 小林's word or the hero's under them ----
const LOST_RUN = (() => {
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  let R = null, runs = 0;   // the one at the counter now (the tests): { k, task, phase, sel, know: what is told, heard: what they said }
  const S = () => TOWN.WORK.say.lost;
  const art = (c, w = 60, h = 48) => `<svg viewBox="-30 -24 60 48" width="${w}" height="${h}" aria-hidden="true">${LART[c.kind](c.color, { size: c.dim, len: c.dim, age: c.dim, shape: c.dim })}</svg>`;
  const pic = (id) => { const d = typeof PICS === 'object' && PICS[TOWN.EKI.lost.inside[id][1]]; return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : ''; };
  // the shelf behind: grey steel, three boards, lost things on them with their numbered tags (the same each time: a look)
  const SHELF = (() => { const ks = Object.keys(LART), cs = ['black', 'red', 'blue', 'white', 'brown', 'yellow', 'green']; let s = '';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const kind = ks[(r * 6 + i * 7) % ks.length], c = cs[(r * 5 + i * 3) % cs.length], d = ['big', 'long', 'new', 'round', 'small', 'short', 'old', 'square'][(r + i) % 8];
      s += `<g transform="translate(${26 + i * 54} ${30 + r * 44}) scale(.62)">${LART[kind](c, { size: d, len: d, age: d, shape: d })}</g><rect x="${16 + i * 54}" y="${44 + r * 44}" width="18" height="7" rx="1" fill="#fbf7ec"/><text x="${25 + i * 54}" y="${49.6 + r * 44}" text-anchor="middle" font-size="5" fill="#3b2a1c" font-family="system-ui, sans-serif">${100 + r * 6 + i}</text>`; }
    return `<svg class="lf-shelf" viewBox="0 0 330 140" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><rect x="0" y="0" width="330" height="140" fill="#e8e4da"/><path d="M0 12 H330 M0 56 H330 M0 100 H330" stroke="#8a8f99" stroke-width="4"/><rect x="2" y="0" width="5" height="140" fill="#9aa4ae"/><rect x="323" y="0" width="5" height="140" fill="#9aa4ae"/>${s.replace(/translate\((\d+) (\d+)\)/g, (m, x, y) => `translate(${x} ${Number(y) - 2})`)}<rect x="0" y="128" width="330" height="12" fill="#c9c3b6"/></svg>`; })();
  const GLASSES = '<svg class="lf-onhead" viewBox="-30 -12 60 24" aria-hidden="true"><circle cx="-11" cy="0" r="8" fill="#dfeff6" fill-opacity=".5" stroke="#2b2b33" stroke-width="2.6"/><circle cx="11" cy="0" r="8" fill="#dfeff6" fill-opacity=".5" stroke="#2b2b33" stroke-width="2.6"/><path d="M-3 -1 Q0 -4 3 -1" fill="none" stroke="#2b2b33" stroke-width="2.2"/></svg>';
  function run(ctx) {
    const mine = ++runs, s = S(), tasks = LOST.make(), first = !Object.values(state.work.res).some((r) => r.place === 'lost' && r.yen !== undefined);
    // this run's own card (box, once drawn; 2026-11-24, ruling 22): an ended shift's goodbye still being said never touches the next card
    let box = null; const el = (q) => (box && box.isConnected ? box.querySelector(q) : null), live = () => mine === runs && Boolean(el('.lf-room')) && ctx.on();
    let k = ctx.done, miss = 0, P = null, rep = 0, missed = 0, lost = 0;
    const talk = (who) => { const t = el('.lf-talk'); if (t) t.dataset.who = who; };
    const word = ([ja, zh], cls = '') => { talk('drv'); const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(s.who, ja); };
    const me = ([ja, zh]) => { talk('me'); const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`; return speakAs('hero', ja); };
    const said = (p, min = 0, max = 5000) => JOBS.said(p, min, max);
    // what they have said that counts now: while asking, all of it so far; then what it looks like (and, once asked, what is in it)
    const view = () => { const t = R.task; if (R.phase === 'ask') return R.heard; return t.in && R.phase !== 'ask2' ? [[t.desc, ''], [t.in, t.descZh]] : [[t.desc, t.descZh]]; };
    let ear = 0; const hear = () => { const n = ++ear, me0 = R; return JOBS.queue(() => view().reduce((p, [ja]) => p.then(() => (n === ear && R === me0 && live() ? speakAs(R.task.who, ja) : null)), Promise.resolve()), box, 20000); };   // after any line being said (ruling 27)
    const bubHtml = (said) => `<button type="button" class="wk-ear lf-ear" aria-label="再聽一次">${icon('speaker')}</button>${said ? said.map(([ja, zh]) => `<b lang="ja">${ruby(ja)}</b>${zh ? `<span>${esc(zh)}</span>` : ''}`).join('') : '<b class="bt-dots">……</b>'}`;
    function bub(open) {
      const b = el('.wk-cust .wk-bub'); if (!b) return;
      b.innerHTML = bubHtml(open ? view() : null);
    }
    const tellAll = () => { const p = R.phase; R.phase = 'find'; bub(true); R.phase = p; };
    // the questions (kept, shut, while one asked is answered: 2026-11-26, the final fix of test.4 — 「…版面會因為回覆導致版面向上擠壓」), the
    // four on the counter (the one picked up, its inside), これですか／ありません
    const qInner = (t, k, know) => { const [ja, zh] = LOST.question(t, k, know); return `<span>${ruby(ja)}</span>${first ? `<small>${esc(zh)}</small>` : ''}`; };
    const qsHtml = (t, qs, know, shut) => qs.map((k) => `<button type="button" class="btn lf-q" data-q="${k}" lang="ja"${shut ? ' disabled' : ''}>${qInner(t, k, know)}</button>`).join('');
    const candsHtml = (t, sel) => t.cands.map((x, i) => `<button type="button" class="lf-cand${sel === i ? ' sel' : ''}" data-c="${i}" aria-label="候補 ${i + 1}">${art(x, 78, 62)}${sel === i && x.inside.length ? `<span class="lf-in">${x.inside.map(pic).join('')}</span>` : ''}</button>`).join('');
    const actsHtml = (t, sel) => `<button type="button" class="btn btn-primary lf-give" lang="ja"${sel === null ? ' disabled' : ''}><span>${ruby(s.me.give[0])}</span></button><button type="button" class="btn lf-none" lang="ja"><span>${ruby(s.me.none[0])}</span></button>${t.type === 'gag' ? `<button type="button" class="btn lf-gag" lang="ja"><span>${ruby(s.me.gag[0])}</span></button>` : ''}`;
    // the question buttons made once a customer and then their words changed in place, each held at the most it will say (a furigana
    // line once 何を is told: 「どんな {本|ほん}ですか。」; the twin's second three): no question moves the ones under it (final fix, round 2)
    function stage() {
      const t = R.task, q = el('.lf-qs'), c = el('.lf-cands'), a = el('.lf-acts'); if (!q) return;
      const from = R.phase === 'tell' ? R.from : R.phase, qs = from === 'ask' ? t.qs : from === 'ask2' ? t.q2 : null;
      if (!qs) q.innerHTML = '';
      else if (R.qsHeld === R && q.children.length === qs.length) [...q.children].forEach((b, i) => { b.dataset.q = qs[i]; b.disabled = R.phase === 'tell'; b.classList.remove('wk-bad'); b.innerHTML = qInner(t, qs[i], R.know); });
      else { q.innerHTML = qsHtml(t, qs, R.know, R.phase === 'tell'); holdQs(t); }
      c.innerHTML = R.phase === 'find' || R.phase === 'done' ? candsHtml(t, R.sel) : '';
      if (c.innerHTML && R.candsHeld !== R) { R.candsHeld = R; JOBS.hold(c, [null, 0, 1, 2, 3].map((sel) => candsHtml(t, sel))); }   // the four as tall as with a wallet's or a bag's inside shown under the one picked up
      a.innerHTML = R.phase === 'find' ? actsHtml(t, R.sel) : '';
    }
    // held for each customer (2026-11-26, the final fix of test.4 — the user: 「新的打工回答會跑版，版面會因為回覆導致版面向上擠壓」 — as the
    // onsen's: JOBS.hold, TL.keep): their bubble's row as tall as the most it will show, up to the room over the counter (round 2, below:
    // what they said, with the one answer that can come while asking — after two misses it opens: where it is, for one who said what; what
    // it is or its looks, for one who said where; the looks, and what is in it, once found), the questions and then the four with the two
    // answers (lf-play: as tall as the taller, whichever is picked up), the talk row as its tallest line — so a question, its answer, a
    // miss or the four coming out move nothing under them
    const TL = JOBS.talkLine({ box: () => box, sel: '.lf-talk', who: s.who, first });
    const playList = (t) => { const know = [false, true].map((w) => Object.assign(LOST.known(t), { what: w })), play = (q, c, a) => `<div class="lf-qs">${q}</div><div class="lf-cands">${c}</div><div class="lf-acts">${a}</div>`;
      return know.map((kn) => play(qsHtml(t, t.qs, kn), '', '')).concat(t.q2 ? [play(qsHtml(t, t.q2, know[1]), '', '')] : [], [null, 0, 1, 2, 3].map((sel) => play('', candsHtml(t, sel), actsHtml(t, sel)))); };
    function holdQs(t) {
      R.qsHeld = R; const know = [false, true].map((w) => Object.assign(LOST.known(t), { what: w }));
      [...el('.lf-qs').children].forEach((b, i) => JOBS.hold(b, know.map((kn) => qInner(t, t.qs[i], kn)).concat(t.q2 ? [qInner(t, t.q2[i], know[1])] : [])));
      JOBS.hold(el('.lf-play'), playList(t));   // measured again with the questions as held now
    }
    // the customer's row (the face and the bubble over the counter) held as tall as their bubble is every time — closed, or opened as
    // they go — at the least; taller (what they said, after two misses), it grows up over the shelf, never under it: the counter, the
    // questions and the talk row stay where they are, and the card is no taller than its rows (final fix, round 2: 「…擠壓」, the 中文 in view)
    const rowHtml = (t, said) => JOBS.custHtml(t.who).replace('<p class="wk-bub"></p>', `<p class="wk-bub">${bubHtml(said)}</p>`);
    const roomAbove = () => { const r = el('.lf-counter .wk-cust'), m = el('.lf-room'); return r && m ? r.getBoundingClientRect().top - m.getBoundingClientRect().top - 6 : 0; };
    function holdAll(t) {
      const asking = t.open === 'what' ? ['where', 'look'] : t.open === 'where' ? ['what'] : [], know = [false, true].map((w) => Object.assign(LOST.known(t), { what: w }));
      JOBS.hold(el('.lf-counter .wk-cust'), [null, [t.lost], ...asking.map((q) => [t.lost, LOST.answer(t, q)]), [[t.desc, t.descZh]]].concat(t.in ? [[[t.desc, ''], [t.in, t.descZh]]] : []).map((said) => rowHtml(t, said)), (h) => h - roomAbove());
      JOBS.hold(el('.lf-play'), playList(t));
      TL.keep(() => ({ drv: [s.hi, s.hat, s.asked, s.twin, s.bring, s.there, s.head, s.call, ...s.ok].concat(k >= 9 ? [s.end, s.all] : []),
        me: [...new Set([...t.qs, ...(t.q2 || [])])].flatMap((q) => know.map((kn) => LOST.question(t, q, kn))).concat([s.me.give, s.me.none, s.me.gag]) }));
    }
    function show() {
      const t = tasks[k]; R = { k, task: t, phase: 'hi', sel: null, know: LOST.known(t), heard: [t.lost] }; miss = 0; rep = 0;
      el('.wk-n').textContent = `${k + 1}／10`;
      const c = el('.wk-cust'); c.className = 'wk-cust'; c.removeAttribute('data-mood'); c.innerHTML = JOBS.custHtml(t.who); if (t.type === 'gag') c.querySelector('.kr-face').insertAdjacentHTML('beforeend', GLASSES);
      stage(); holdAll(t);
      const me0 = R; P = JOBS.patience('lost', t.who, 25, () => Boolean(el('.wk-cust')) && R === me0 && ctx.on(), gone, box);
      const hat = k === 4 && Math.random() < 0.5;   // now and then 小林's own hat (on his head)
      (async () => {
        if (hat) await said(word(s.hat), 900); if (!live() || R !== me0) return;
        await said(word(s.hi), 500); if (!live() || R !== me0) return;
        el('.wk-cust').classList.add('on'); R.phase = 'ask'; bub(false); stage(); await said(JOBS.voice(speakAs(t.who, t.lost[0]), box));
      })();
    }
    // a question asked that was not yet told: its answer heard (the looks tell what it is too); all told, the four out (two alike on
    // the counter: what is in it asked, then)
    async function ask(q) {
      const t = R.task, me0 = R, a = LOST.answer(t, q); R.from = R.phase; R.phase = 'tell'; stage(); await JOBS.quiet(box); if (!live() || R !== me0) return;   // asked after any line still being said (ruling 27)
      await said(me(LOST.question(t, q, R.know)), 500); if (!live() || R !== me0) return;
      R.know[q] = true; if (q === 'look') R.know.what = true; if (q !== 'inside') R.heard.push(a);
      bub(false); await said(JOBS.voice(speakAs(t.who, a[0]), box)); if (!live() || R !== me0) return;
      if (!R.know.what || !R.know.where || !R.know.look) { R.phase = 'ask'; bub(miss >= 2); stage(); return; }
      if (t.type === 'twin' && !R.know.inside) { R.phase = 'ask2'; bub(miss >= 2); SND.play('drawer', { vol: 0.6 }); word(s.twin); stage(); return; }
      found();
    }
    function found() {
      const t = R.task; R.phase = 'find'; bub(miss >= 2); if (t.type !== 'twin') { SND.play('drawer', { vol: 0.6 }); word(s.bring); } stage(); if (!rep) P.go();
    }
    function next(lines) {
      const live2 = () => el('.lf-room') && (ctx.on() || k >= 10); k++;
      const bye = (async () => { await lines(live2); if (!live2()) return; if (k < 10) { show(); return; }
        await JOBS.whole(word(!missed && !lost && ctx.done === 0 ? s.all : s.end, 'ok'), 800); if (el('.lf-room')) CLASS.close(); })();   // said whole before the card shuts (the lane's cap, as the onsen's: a later long one never cut — 2026-11-25, parked from Task 7)
      if (k >= 10) ctx.finish({}, bye);
    }
    // a miss: the word that says why (小林's, or the customer's いいえ) said to its end with the clock held, its cost after it, so the
    // customer's 「あの、すみません！」 never cuts it (ruling 27)
    function wrong(b, why) {
      miss++; missed++; playSfx('bad'); if (b) { b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); }
      if (miss >= 2) bub(true);   // what they have said so far shown (asking: never the looks before they are asked)
      return JOBS.missWord(P, why || (() => null), 0.15, box);
    }
    function done(lines) { R.phase = 'done'; P.stop(); ctx.right(k, miss); playSfx('good'); tellAll(); stage(); el('.wk-cust').classList.remove('on'); next(lines); }
    function gone(line) {
      R.phase = 'done'; ctx.right(k, 3); lost++; playSfx('bad'); tellAll(); stage(); const t = R.task;
      next(async (live2) => { await Promise.all([JOBS.line(t.who, line[0], box), sleep(1200)]); if (live2()) { el('.wk-cust').classList.add('bye'); await sleep(450); } });   // said in full, from its own start (N-2)
    }
    function give() {
      const t = R.task, c = t.cands[R.sel]; if (!c) return;
      const right = t.type !== 'none' && t.type !== 'gag' && c.color === t.color && c.dim === t.dim && c.inside.join() === t.inside.join();
      if (!right) { const b = el(`.lf-cand[data-c="${R.sel}"]`); wrong(b, () => said(speakAs(t.who, s.cust.no[0]), 400).then(() => { if (live() && R.task === t && R.phase === 'find') hear(); })); return; }
      done(async (live2) => { await JOBS.quiet(box); if (!live2()) return; await said(me(s.me.give), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.yes[0]), 900); if (!live2()) return; el('.wk-cust').classList.add('bye'); if (!miss && Math.random() < 0.3) await said(word(s.ok[Math.floor(Math.random() * s.ok.length)], 'ok')); });
    }
    function none() {
      const t = R.task;
      if (t.type === 'gag') {   // true enough: none of the four is his (2026-11-21, the review) — then 小林 sees them
        done(async (live2) => { await JOBS.quiet(box); if (!live2()) return; await said(me(s.me.none), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.sad[0]), 600); if (!live2()) return; await said(word(s.head, 'ok'), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.gag[0]), 600); voiceFx('laugh'); await sleep(900); if (live2()) el('.wk-cust').classList.add('bye'); }); return;
      }
      if (t.type !== 'none') { wrong(el('.lf-none'), () => word(s.there, 'bad')); return; }
      done(async (live2) => { await JOBS.quiet(box); if (!live2()) return; await said(me(s.me.none), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.sad[0]), 800); if (!live2()) return; await said(word(s.call), 600); if (live2()) el('.wk-cust').classList.add('bye'); });
    }
    function gag() {
      const t = R.task;
      done(async (live2) => { await JOBS.quiet(box); if (!live2()) return; await said(me(s.me.gag), 600); if (!live2()) return; await said(speakAs(t.who, s.cust.gag[0]), 700); voiceFx('laugh'); await sleep(900); if (live2()) el('.wk-cust').classList.add('bye'); });
    }
    CLASS.card('wk-lost', '失物招領', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>落<rt>お</rt></ruby>とし<ruby>物<rt>もの</rt></ruby></b><span class="wk-n"></span></div>
      <div class="lf-room">${SHELF}<div class="lf-counter"><div class="wk-cust"></div></div></div>
      <div class="lf-play"><div class="lf-qs"></div><div class="lf-cands"></div><div class="lf-acts"></div></div>
      <div class="lf-talk" data-who="drv"><span class="kr-face">${TOWNEV.face(s.who)}</span><p class="wk-say"></p><p class="wk-me"></p></div>`, (e) => {
      if (!R || !live()) return;
      if (e.target.closest('.lf-ear')) { if (R.phase === 'ask' || R.phase === 'ask2' || R.phase === 'find') { const q = P, r = rep = rep + 1; q.hold(); hear().then(() => { if (rep === r) { rep = 0; if (P === q && R.phase === 'find') q.go(); } }); } return; }
      if (R.phase === 'ask' || R.phase === 'ask2') { const q = e.target.closest('.lf-q'); if (!q) return; if (R.know[q.dataset.q]) wrong(q, () => word(s.asked, 'bad')); else ask(q.dataset.q); return; }
      if (R.phase !== 'find') return;
      const c = e.target.closest('.lf-cand'); if (c) { R.sel = Number(c.dataset.c); SND.play('place', { vol: 0.45 }); stage(); return; }
      if (e.target.closest('.lf-give')) give(); else if (e.target.closest('.lf-none')) none(); else if (e.target.closest('.lf-gag')) gag();
    });
    box = document.querySelector('.cls.wk-lost');
    show();
  }
  function lines(add) {
    const L = TOWN.EKI.lost, s = S(), seen = new Set(), say = (who, l) => { if (!seen.has(who + l)) { seen.add(who + l); add(who, l); } };
    Object.entries(L.kinds).forEach(([kind, k]) => {
      const who = k[4];
      L.where.forEach((w) => [s.cust.lost, s.cust.where, s.cust.at].forEach((l) => say(who, l[0].replace('{K}', k[0]).replace('{W}', w[0] + ' '))));
      [s.cust.what, s.cust.it].forEach((l) => say(who, l[0].replace('{K}', k[0])));
      k[2].forEach((c) => k[3].forEach((d) => say(who, LOST.describe({ kind, color: c, dim: d }))));
      say('hero', s.me.which[0].replace('{K}', k[0]));
      if (L.holds[kind]) { const h = L.holds[kind]; h.forEach((a, i) => h.forEach((b, j) => { if (i === j) return; ['あります', '{入|はい}って います'].forEach((v) => say(who, `{中|なか}に ${L.inside[a][0]}と ${L.inside[b][0]}が ${v}。`)); })); }
      [s.cust.yes, s.cust.no, s.cust.sad].forEach((l) => say(who, l[0])); const X = TOWN.WORK.say.waiter.cust; [X.again, X.hey, X.out, X.out0].forEach((l) => say(who, l[0]));
    });
    ['genzo'].forEach((who) => { L.where.forEach((w) => say(who, s.cust.lost[0].replace('{K}', L.kinds.glasses[0]).replace('{W}', w[0] + ' '))); say(who, LOST.describe({ kind: 'glasses', color: 'black', dim: 'round' })); say(who, s.cust.gag[0]); });
    [s.me.what, s.me.where, s.me.thing, s.me.give, s.me.none, s.me.gag, s.me.inside].forEach((l) => say('hero', l[0]));
    [s.hi, s.bring, s.twin, s.asked, s.there, s.call, s.end, s.all, s.hat, s.head, ...s.ok].forEach((l) => say(s.who, l[0]));
  }
  return { run, lines, now: () => R };
})();
WORK.register('lost', { run: LOST_RUN.run, lines: LOST_RUN.lines });
