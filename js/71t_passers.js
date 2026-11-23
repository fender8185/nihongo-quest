'use strict';
// ---------- passers-by (2026-11-14) ----------
// The user: 商店街 (the town) and 中華街 should have people walking about the street now and then — not anyone of the town, their
// looks put together from everything there is (the hero's parts, all the clothes and things to wear, later ones too as they come),
// not the same face each time. Each one is made anew (look): a face, skin, a hair style and colour, eyes, mouth, now and then a
// beard; a top, trousers, shoes of the hero's choices and the shop's clothes; and maybe a thing or two to wear from 古道具屋 (a
// season's — 萬聖節, 聖誕 — only in that season). They walk across the town and 中華街 by the pavement, along 大通り up toward the
// corner and off down the side street, or back from it toward one; a few at a time, a new one every few seconds; nobody to talk
// to (a tap goes through them). e2e (NQ_E2E): none come by themselves; PASSERS.spawn() sends one.
// 2026-11-23 (湯けむり通り, spec §4): the hot-spring town's visitors in yukata and geta, the yukata's colour at random — a couple side
// by side, a family with a child between them, an old couple slower, or one alone — up the street into the 湯畑's steam or out of
// it toward the station; their geta heard now and then (SND NOW_AND_THEN). A street seen down its length gives its own way (DOWN)
const PASSERS = (() => {
  const api = { still: Boolean(window.NQ_E2E) };
  const MAX = { town: 4, chinatown: 3, chinadori: 4, yudori: 7 };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let S = null;   // the scene: { yard, place, t: the next one's timer, raf, w: the walkers }
  // whether a ware of a season may be worn now (古道具屋's own sale days)
  const inSeason = (w) => { if (!w.limited) return true; const d = saleNow(); return Boolean(d && saleOn(w.limited, d)); };
  // a look put together anew: { look, wear }
  function look() {
    const O = HERO.OPTS, one = (k) => pick(O[k])[0], [, fringe, sides, hairBack, hairTop] = pick(HERO.STYLES);
    const sold = (slot) => WARES.filter((w) => w.kind === 'clothes' && w.slot === slot);
    const styles = (k, slot) => O[k].map(([id]) => id).filter((id) => { const w = sold(slot).find((x) => x.id === id); return !w || inSeason(w); });
    const lk = { face: one('face'), skin: one('skin'), cheeks: one('cheeks'), fringe, sides, hairBack, hairTop, hairColor: one('hairColor'), eyes: one('eyes'), eyeColor: one('eyeColor'),
      brows: one('brows'), mouth: one('mouth'), beard: Math.random() < 0.2 ? one('beard') : 'none',
      top: one('top'), topStyle: pick(styles('topStyle', 'top')), bottom: one('bottom'), bottomStyle: pick(styles('bottomStyle', 'bottom')), shoe: one('shoe'), shoeStyle: pick(styles('shoeStyle', 'shoe')) };
    const wear = {}, worn = WARES.filter((w) => w.kind === 'wear' && inSeason(w));
    [...new Set(worn.map((w) => w.slot))].forEach((slot) => { if (Math.random() < (slot === 'head' ? 0.35 : 0.2)) wear[slot] = pick(worn.filter((w) => w.slot === slot)).id; });
    return { look: lk, wear };
  }
  // a visitor of the hot-spring town (湯けむり通り, the 湯畑's benches): a look made anew in a yukata of a colour at random, geta under it,
  // nothing worn on the head; old: grey-haired
  const YUKATA = ['#2f4a7a', '#26407a', '#f2f0ea', '#e58fa8', '#b8a0d8', '#7fb3d8', '#d0574b', '#3f7a6a', '#f4d0a0', '#4a3a6a', '#c8e0f0', '#e8a060', '#5a8ac8'];
  function yukata(old) {
    const x = look(); Object.assign(x.look, { topStyle: 'yukata', top: pick(YUKATA), shoeStyle: 'geta', shoe: pick(['#8a6a48', '#6e4f3a', '#a8743f']) }, old ? { hairColor: '#a3a3a8', beard: x.look.beard === 'none' ? 'none' : 'mustache' } : {});
    x.wear = {}; return x;
  }
  // who walks together up 湯けむり通り: their places beside one another (dx, in the street's front units), how far behind (lag), how
  // big (k: a child), slower (old)
  function party() {
    const r = Math.random();
    if (r < 0.32) return [{ dx: -9 }, { dx: 9 }];   // a couple
    if (r < 0.52) return [{ dx: -13 }, { dx: 0, k: 0.68, lag: -8 }, { dx: 13 }];   // a family, the child a step ahead between them
    if (r < 0.7) return [{ dx: -8, old: 1 }, { dx: 8, old: 1 }];   // an old couple
    return [{ dx: 0 }];
  }
  // the way one walks here: points [X, Y] from where they come into sight to where they go out of it
  function way(place) {
    const edge = ycam.YW / 2 + 70, l2r = Math.random() < 0.5;
    if (DOWN[place] && DOWN[place].passWay) return DOWN[place].passWay(rnd);   // a street seen down its length: its own (大通り: up to the corner and off down the side street; 湯けむり通り: into the 湯畑's steam)
    const Y = place === 'chinatown' ? rnd(56, 118) : rnd(60, 116);
    return l2r ? [[-edge, Y], [edge, Y]] : [[edge, Y], [-edge, Y]];
  }
  function spawn(mid) {
    if (!S || !S.yard.isConnected) return null;
    const box = S.yard.querySelector('.yworld'); if (!box) return null;
    const path = way(S.place), seg = []; let len = 0; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push([path[i - 1], path[i], len, d]); len += d; }
    const hot = S.place === 'yudori', who = hot ? party() : [{ dx: 0 }], d0 = mid ? rnd(0.2, 0.7) * len : 0, v = rnd(34, 52) * (who.some((m) => m.old) ? 0.7 : 1);
    const out = who.map((m) => {
      const { look: lk, wear } = hot ? yukata(m.old) : look(), el = document.createElement('div');
      el.className = 'hero npc passer walk'; el.setAttribute('aria-hidden', 'true'); el.dataset.look = JSON.stringify([lk, wear]);
      el.innerHTML = HERO.svg({ look: lk, wear });
      box.appendChild(el);
      const w = { el, seg, len, d: d0 - (m.lag || 0), v, dx: m.dx || 0, k: m.k || 1 };
      S.w.push(w); step(w, 0);
      return w;
    });
    return out[0];
  }
  // a walker moved on by dt seconds: along their way, turned the way they go, smaller up 大通り, gone at the end
  function step(w, dt) {
    const D = DOWN[S.place], k = D ? Math.max(0.35, yScale(w.pos ? w.pos[1] : 0) / 0.5) : 1;
    w.d += w.v * k * dt;
    if (w.d >= w.len) { w.el.remove(); S.w.splice(S.w.indexOf(w), 1); return; }
    const q = w.seg.find((x) => w.d <= x[2] + x[3]) || w.seg[w.seg.length - 1], t = (w.d - q[2]) / q[3], [a, b2] = q;
    const Y = a[1] + (b2[1] - a[1]) * t, s = yScale(Y), X = a[0] + (b2[0] - a[0]) * t + (w.dx || 0) * (D ? s / 0.5 : 1), dx = b2[0] - a[0], dy = b2[1] - a[1];   // dx: beside the one they walk with
    w.pos = [X, Y];
    w.el.classList.toggle('back', dy > 0 && Math.abs(dy) > Math.abs(dx)); w.el.classList.toggle('turn', Math.abs(dx) >= Math.abs(dy)); w.el.classList.toggle('flip', dx < 0);
    w.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${(s * (w.k || 1)).toFixed(3)})`;
    w.el.style.zIndex = String(300 - Math.round(Y));
    // 大通り: round the corner, out of sight behind the last shop on the right; 湯けむり通り: into the 湯畑's steam (DOWN passFade)
    if (D && D.passFade) w.el.style.opacity = String(D.passFade(X, Y));
  }
  function tick(now) {
    if (!S || !S.yard.isConnected) { stop(); return; }
    const dt = S.at ? Math.min(0.1, (now - S.at) / 1000) : 0; S.at = now;
    if (!document.hidden) S.w.slice().forEach((w) => step(w, dt));
    S.raf = requestAnimationFrame(tick);
  }
  function next() { clearTimeout(S.t); S.t = setTimeout(() => { if (!S || !S.yard.isConnected) { stop(); return; } if (!document.hidden && S.w.length < MAX[S.place]) spawn(); next(); }, rnd(3500, 9000)); }
  function stop() { if (!S) return; clearTimeout(S.t); cancelAnimationFrame(S.raf); S = null; }
  // a place drawn: its passers-by begin (one or two already on their way), or none where there are none
  function start(yard, place) {
    stop(); if (!MAX[place]) return;
    S = { yard, place, w: [], t: 0, raf: 0, at: 0 };
    if (calm()) return;   // nobody walking past for one who'd rather things kept still
    S.raf = requestAnimationFrame(tick);
    if (api.still) return;
    spawn(true); if (Math.random() < 0.6) spawn(true);
    next();
  }
  return Object.assign(api, { start, stop, spawn: () => spawn(false), look, yukata, places: Object.keys(MAX) });
})();
