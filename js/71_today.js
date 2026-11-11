'use strict';
/* ==========================================================================
   Today (dashboard)
   ========================================================================== */
function weekdayZh(d) { return '日一二三四五六'[parseDate(d).getDay()]; }

// iOS ignores user-scalable=no inside Safari; the gesture events still stop a pinch from zooming the page
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));

// 書房 and the yard (1.1.0). The app opens in 書房 (renderToday); its door leads out to the yard (renderOutside), whose house
// leads back in. Both follow the clock (sceneTick) and today's list (dayProgress, the ring they replace).
// what 書房 shows of the wares: a change (bought on another device, a sync) draws the room again
// the storage boxes (test, 2026-11-09): things that look the same (the strings of lights, the wall lamps, the windows, or one
// name) lie in one pile, shown once with how many; a pile gives out its first one
const stackKey = (it) => (it.garland ? '串燈' : it.win ? '窗戶' : it.name);
function stacks(items) {
  const out = new Map();
  items.forEach((it) => { const k = stackKey(it), q = out.get(k); if (q) q.n++; else out.set(k, { it, n: 1, name: k }); });
  return [...out.values()];
}
const lampOff = (id) => Boolean(state.lampsOff && state.lampsOff[id]);
function roomSig() { return Object.keys(state.lampsOff || {}).filter(lampOff).sort().join(',') + '#' + Object.keys(state.placed).sort().map((k) => { const p = state.placed[k]; return `${k}:${p.rm || ''}${p.w}${p.x ?? p.u},${p.y ?? p.v},${p.r || 0}`; }).join('|') + '/' + Object.keys(state.owned).length + '/' + Object.values(state.wear).join(',') + '/' + Object.values(HERO.norm(state.look)).join(','); }
function renderToday(view, rm = 'study') {   // 書房, or the bedroom beyond its door (1.3.0: #/bedroom)
  finishPreIfReady();
  sceneTick();
  const pct = ringPct(dayProgress());
  const st = view.querySelector('.study');
  if (st && st.dataset.room === rm && st.dataset.date === todayStr() && st.dataset.sig === roomSig()) { ROOM.level(st, pct); return; }   // a redraw (a sync, a setting): the tags change, the motion carries on
  view.innerHTML = ROOM.html(pct, rm);
  ROOM.mount(view.querySelector('.study'));
}
