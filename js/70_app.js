'use strict';
/* ==========================================================================
   App shell: router, navigation, actions, keyboard
   ========================================================================== */
const NAV = [
  { id: 'today', label: '書房', icon: 'today', route: '#/today' },
  { id: 'course', label: '課程', icon: 'course', route: '#/course' },
  { id: 'vocab', label: '單字', icon: 'vocab', route: '#/vocab' },
  { id: 'listen', label: '聽一輪', icon: 'listen', route: '#/listen' },
  { id: 'stats', label: '學習分析', icon: 'chart', route: '#/stats' },
  { id: 'exam', label: '模擬考', icon: 'exam', route: '#/exam' },
  { id: 'mistakes', label: '錯題本', icon: 'mistakes', route: '#/mistakes' }
];
let lastMainRoute = '#/today';

function syncChipLabel() {
  switch (Sync.status) {
    case 'idle': {
      const t = Sync.meta && Sync.meta.lastSyncedAt ? new Date(Sync.meta.lastSyncedAt) : null;
      return t ? `已同步 ${pad2(t.getHours())}:${pad2(t.getMinutes())}` : '已登入';
    }
    case 'pending': case 'syncing': return '同步中';
    case 'error': return '同步失敗';
    default: return '未登入';
  }
}
// the sync state: always in the sidebar (a computer); up in a page's bar only when it failed (1.2.0: the pages' bars lost the
// login chip, 振假名 and 設定 — they are in 設定, the ⋯ under a question and 書房's buttons)
function renderSyncChip() {
  const html = `<span class="sync-chip is-${Sync.status}" data-act="sync-open" title="${Sync.status === 'error' ? esc(Sync.lastError || '') : '雲端同步'}">${syncChipLabel()}</span>`;
  const side = document.getElementById('sideSync'), top = document.getElementById('syncChip');
  if (side) side.innerHTML = html;
  if (top) top.innerHTML = Sync.status === 'error' ? html : '';
}

// 1.0.41: a page's progress (rings, bars and gauges marked data-anim) plays when the page is opened: the app started, another page
// left for it, back in front after a minute away, a stats scope picked. Drawing the same page again (a sync, a setting) keeps it still.
let animRoute = '', animForce = false;
function playAnims(root) {
  const els = [...root.querySelectorAll('[data-anim]')];
  els.forEach(el => el.classList.remove('anim'));
  if (els.length) void root.offsetWidth;   // replaying one that already played needs a style flush in between
  els.forEach(el => el.classList.add('anim'));
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
function currentRoute() {
  const h = (location.hash || '#/today').replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = {};
  (query || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
  return { name: parts[0] || 'today', parts, params };
}

function renderNav(active) {
  const mistakeCount = activeMistakes().length;
  document.getElementById('sideNav').innerHTML = NAV.map(n => `
    <button type="button" class="nav-item" data-act="nav" data-route="${n.route}" ${n.id === active ? 'aria-current="page"' : ''}>
      ${icon(n.icon)}<span>${n.label}</span>${n.id === 'mistakes' && mistakeCount ? `<span class="count">${mistakeCount}</span>` : ''}
    </button>`).join('');
  const st = streakStats();
  document.getElementById('sideFoot').innerHTML = `
    <div class="panel small">
      <div class="row between"><span class="muted">連續天數</span><b class="num">${st.current} 天</b></div>
      <div class="row between"><span class="muted">今日</span><b class="num">${itemsDoneToday()} 題</b></div>
      <div class="row between"><span class="muted">雲端</span><span id="sideSync"></span></div>
    </div>
    <button type="button" class="nav-item" data-act="toggle-furi" title="快速鍵 F">${icon('furi')}<span>振假名：${FURI_LABEL[furiState()]}</span></button>
    <button type="button" class="nav-item" data-act="settings">${icon('settings')}<span>設定</span></button>`;
  const navItem = NAV.find(n => n.id === active);
  document.getElementById('topTitle').textContent = navItem ? navItem.label : 'Nihongo Quest';
  renderSyncChip();
}

function route() {
  // something had (YEN) or a trip's results (CRUISE) is watched to the end (2026-11-13, the user): the back button keeps the page
  const held = document.querySelector('.eat-scene[data-at], .cr-result[data-at]');
  if (held && location.hash !== held.dataset.at) { history.replaceState(null, '', location.pathname + location.search + held.dataset.at); return; }
  const r = currentRoute();
  const view = document.getElementById('view');
  if (r.name !== animRoute && typeof TALK !== 'undefined') TALK.close();   // another page: a talk left open there ends (and the sounds it kept down come back)
  const opened = r.name !== animRoute || animForce; animRoute = r.name; animForce = false;
  const scene = ['today', 'bedroom', 'outside'].includes(r.name) || OUT_PLACES.includes(r.name);   // 書房, the bedroom and the yard: whole screens, the clock's colours
  const fit = scene || r.name === 'listen';   // one screen each on a phone
  view.classList.toggle('fit', fit); document.body.classList.toggle('fit', fit); document.body.classList.toggle('scene', scene);
  document.body.classList.toggle('today', r.name === 'today' || r.name === 'bedroom'); document.body.classList.toggle('outside', r.name === 'outside' || OUT_PLACES.includes(r.name)); themeColor();
  document.body.classList.toggle('immersive', (r.name === 'mistakes' || r.name === 'vocab') && r.parts[1] === 'listen');
  document.body.classList.toggle('reading', r.name === 'course' && r.parts[2] === 'read');   // 講義's own screen: the page under it stays put
  const tip = document.getElementById('chartTip');
  if (tip) tip.classList.remove('show');
  if (r.name !== 'practice') { document.body.classList.remove('practicing'); }
  if (LISTEN && !(r.name === 'listen' || ((r.name === 'mistakes' || r.name === 'vocab') && r.parts[1] === 'listen'))) listenStop(true);   // leaving the pages that host the player ends it
  MUSIC.sync(); SND.sync();   // the gramophone plays in 書房 and the bedroom only; each place its own background (環境音)
  STORY.drop();
  if (r.name === 'practice') { renderPractice(); return; }
  if (r.name === 'exam' && r.parts[1] === 'run') { renderExamRunner(); return; }
  applyTheme();   // 跟著時間: the colours change between pages, never in the middle of questions
  lastMainRoute = location.hash || '#/today';
  settingsDirty = false;
  closeModal(true);
  renderNav(r.name === 'course' ? 'course' : r.name === 'bedroom' ? 'today' : OUT_PLACES.includes(r.name) ? 'outside' : r.name);
  try {
    if (r.name === 'today') renderToday(view);
    else if (r.name === 'bedroom') renderToday(view, 'bed');
    else if (r.name === 'outside') renderOutside(view);
    else if (OUT_PLACES.includes(r.name)) renderOutside(view, r.name);   // test: the main road with the bus stop, the beach
    else if (r.name === 'course') {
      const uid = r.parts[1] === 'intro' ? 'm0' : r.parts[1];
      if (uid && r.parts[2] === 'read') renderLessonReader(view, uid, r.params.s); else if (uid) renderUnit(view, uid, r.params.tab || 'lesson'); else renderCourse(view);
    }
    else if (r.name === 'vocab') {
      if (!r.parts[1] || r.parts[1] === 'themes') { location.replace('#/vocab/level?lv=' + defaultVocabLevel()); return route(); }   // replace, so Back leaves the vocab page   // the vocab page opens on the learner's level; the old 主題 tab lives there too
      if (r.parts[1] === 'kanji') { location.replace('#/vocab/level?lv=' + (levels().includes(r.params.lv) ? r.params.lv : defaultVocabLevel())); return route(); }   // the old 漢字 tab: kanji sit on the level pages
      if (r.parts[1] === 'listen') renderListen(view); else renderVocab(view, r.parts[1], r.params);
    }
    else if (r.name === 'mistakes') { if (r.parts[1] === 'loop') renderMistakeLoop(view); else if (r.parts[1] === 'listen') renderListen(view); else renderMistakes(view, r.params); }
    else if (r.name === 'exam') renderExam(view, r.parts[1] || '', r.params);
    else if (r.name === 'tools') { location.replace('#/stats?at=tools'); return route(); }   // 1.1.0: 工具與 AI lives at the bottom of 學習分析
    else if (r.name === 'listen') renderListenTab(view);
    else if (r.name === 'shop') renderShop(view);
    else if (r.name === 'stats') { renderStats(view); if (r.params.at === 'tools') requestAnimationFrame(() => scrollBelowTopbar(document.getElementById('toolsPart'))); }   // after route() hides the repeated page title
    else renderToday(view);
    if (opened) playAnims(view);
    // the phone topbar already names the page: a page title that repeats it is hidden there (unit names, scores etc. stay)
    const top = document.getElementById('topTitle').textContent.trim();
    view.querySelectorAll('.page-head .page-title').forEach(el => el.classList.toggle('dup-title', el.textContent.trim() === top));
    MUSIC.sync();   // the notes over the gramophone in a room drawn anew
    if (r.name === 'today') { if (STORY.due()) STORY.open(); else NPC.check(); }
    if (swUpdated) setTimeout(() => updateIfCalm(), 0);   // a new version waiting for a calm moment   // the opening the first time; someone at the front door
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><div class="card-title">這個頁面出錯了</div><p class="muted small">${esc(e.message)}</p><button class="btn" data-act="nav" data-route="#/today">回到書房</button></div>`;
  }
  view.focus({ preventScroll: true });
}

// ---------- modal ----------
function openModal(title, bodyHtml, opt = {}) {   // opt.head: more in the title's row, kept in sight while the body scrolls
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-back" data-act="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${opt.width ? `width:min(${opt.width}px,100%)` : ''}">
    <div class="modal-head"><div class="modal-title">${esc(title)}</div>${opt.head || ''}<button type="button" class="btn btn-ghost btn-icon" data-act="close-modal" aria-label="關閉">${icon('close')}</button></div>
    <div class="modal-body" id="modalBody">${bodyHtml}</div>
    <div class="modal-foot"><button type="button" class="btn" data-act="close-modal">關閉</button></div></div></div>`;
  document.body.style.overflow = 'hidden';
  const first = root.querySelector('.modal-body input, .modal-body select, .modal-body button');
  if (first && !opt.noFocus) first.focus({ preventScroll: true });
}
function closeModal(fromRoute) {
  const root = document.getElementById('modalRoot');
  if (root && root.innerHTML) {
    root.innerHTML = ''; document.body.style.overflow = '';
    // settings changed while the modal was open: redraw the page underneath
    if (!fromRoute && settingsDirty) { settingsDirty = false; if (!['practice'].includes(currentRoute().name) && !(currentRoute().name === 'exam' && currentRoute().parts[1] === 'run')) route(); }
  }
}
function modalOpen() { return Boolean(document.getElementById('modalRoot').innerHTML); }

// ---------- theme & furigana ----------
// The theme (1.1.0): 跟著時間 lights the pages as 書房 and the yard are lit, light from half daylight (about 6:00 to 18:00)
// and dark before and after; 永晝／永夜 hold all of it at noon／midnight. Older saves hold dark or auto (→ 跟著時間) and light (→ 永晝).
function themeMode() { const t = state.settings.theme; return t === 'day' || t === 'light' ? 'day' : t === 'night' ? 'night' : 'clock'; }
function lightHour(h = sceneHour()) { const m = themeMode(); return m === 'day' ? 12 : m === 'night' ? 0 : h; }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', sceneClock(lightHour()).day >= 0.5 ? 'light' : 'dark');
  themeColor();
}
function midQuestions() { const r = currentRoute(); return r.name === 'practice' || (r.name === 'exam' && r.parts[1] === 'run'); }
// the browser bar's colour: the page background, or (1.1.0) the yard's sky／書房's wall at this hour
function themeColor() {
  const meta = document.querySelector('meta[name="theme-color"]'); if (!meta) return;
  const b = document.body.classList;
  if (!b.contains('scene')) { meta.setAttribute('content', document.documentElement.getAttribute('data-theme') === 'light' ? '#f3ebde' : '#23253f'); return; }
  const c = sceneClock(lightHour());
  meta.setAttribute('content', b.contains('outside') ? mixHex(mixHex('#0c1233', '#3d8cdb', c.day), '#e8875f', c.warm * 0.5) : mixHex('#3a3c63', '#f2e8d8', c.day));
}
function mixHex(a, b, t) { const ch = (h, i) => parseInt(h.slice(i, i + 2), 16); return '#' + [1, 3, 5].map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join(''); }
// The scenes' clock (1.1.0): the phone's own time and time zone, UTC+8 only when no zone can be read — moved on by a sleep in bed
// (test, 2026-11-10: NAP), which holds for the rest of the phone's day. --day is the daylight (0 by night, 1 by day; dawn 5–7 and
// dusk 17–19 ease between), --warm the sunrise／sunset glow (strongest at 6 and 18), --sx/--sy the sun on its arc (up at 5:12,
// down at 18:48, behind the hills at either end), --hh／--mm the hands of 書房's clock. Set on body.
function sceneHour() {
  const d = new Date();
  let zone = ''; try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no zone */ }
  return ((zone ? d.getHours() + d.getMinutes() / 60 : (d.getUTCHours() + 8) % 24 + d.getUTCMinutes() / 60) + wakeOff()) % 24;
}
// the hours slept on today (NAP; this device's): none on another day — the next day wakes to the phone's own time
function wakeOff() { try { const w = JSON.parse(localStorage.getItem('nq_wake') || 'null'); return w && w.day === todayStr() ? Number(w.off) || 0 : 0; } catch (e) { return 0; } }
function sceneDate() { return new Date(Date.now() + wakeOff() * 3600000); }   // the world's day: a weekday or the weekend, as slept on to
function sceneClock(h = sceneHour()) {
  const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  const day = h < 5 || h >= 19 ? 0 : h < 7 ? ease((h - 5) / 2) : h < 17 ? 1 : ease((19 - h) / 2);
  const warm = ease(1 - Math.min(Math.abs(h - 6), Math.abs(h - 18)));
  const p = Math.min(1, Math.max(0, (h - 5.2) / 13.6));
  return { day, warm, sx: 8 + 84 * p, sy: 72 - 60 * Math.sin(Math.PI * p) };
}
function sceneTick() {
  const h = sceneHour(), c = sceneClock(lightHour(h)), b = document.body;   // 書房's clock keeps the real time under 永夜／永晝
  b.style.setProperty('--hh', `${((h % 12) * 30).toFixed(1)}deg`); b.style.setProperty('--mm', `${((h % 1) * 360).toFixed(1)}deg`);
  b.style.setProperty('--lit', c.day >= 0.5 ? '1' : '0');   // the name tags: dark on light from half daylight, light on dark before
  b.style.setProperty('--day', c.day.toFixed(3)); b.style.setProperty('--warm', c.warm.toFixed(3));
  b.style.setProperty('--sx', `${c.sx.toFixed(1)}%`); b.style.setProperty('--sy', `${c.sy.toFixed(1)}%`);
  b.classList.toggle('scene-day', c.day > 0.999); b.classList.toggle('scene-night', c.day < 0.001);
  applyTheme();   // a dialog opened over a scene is lit as the scene
}
// a minute on (or back in the app): the clock, and out and about the town as the hour has it — people gone home, shops shut (TOWNEV)
function sceneMinute() {
  sceneTick();
  const yd = document.querySelector('#view .yard');
  if (yd && !TALK.on() && yd.dataset.sig !== TOWNEV.sig(yd.dataset.place)) TOWNLIFE.change(yd, route);   // those leaving walk off first (TOWNLIFE)
}
setInterval(() => { if (document.body.classList.contains('scene')) sceneMinute(); }, 60000);   // the scenes move with the clock while one is open
// back in the app after a while: the scenes catch up with the clock, and so do the pages' colours, except in the middle of questions
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (document.body.classList.contains('scene')) sceneMinute(); else if (!midQuestions()) applyTheme();
});
// furigana: all → smart (no readings on mastered words) → off
const FURI_LABEL = { all: '顯示', smart: '熟練的字不標', off: '隱藏' };
function furiState() { return !state.settings.furigana ? 'off' : (state.settings.furiMode === 'smart' ? 'smart' : 'all'); }
function applyFurigana() {
  const st = furiState();
  document.body.classList.toggle('no-furi', st === 'off');
  document.body.classList.toggle('furi-smart', st === 'smart');
}
function toggleFurigana() {
  const next = { all: 'smart', smart: 'off', off: 'all' }[furiState()];
  state.settings.furigana = next !== 'off';
  if (next !== 'off') state.settings.furiMode = next;
  saveState(); applyFurigana();
  toast(`振假名：${FURI_LABEL[next]}`);
  if (SESSION && currentRoute().name === 'practice') renderPractice();
  else if (!modalOpen() && !(currentRoute().name === 'exam' && currentRoute().parts[1] === 'run')) renderNav(currentRoute().name);
}

// ---------- actions (event delegation) ----------
const ACTIONS = {
  'sync-open': () => openSettings('data'),
  'sync-google': () => Sync.signInGoogle(),
  'sync-login': async () => { const inp = document.getElementById('syncEmail'); await Sync.signIn(inp ? inp.value : ''); },
  'sync-verify': async () => { const inp = document.getElementById('syncCode'); await Sync.verifyCode(inp ? inp.value : ''); },
  'sync-cancel-code': () => { Sync.pendingEmail = null; if (modalOpen()) refreshSettings(); },
  'sync-now': async () => { await Sync.push(); await Sync.pull(); if (modalOpen()) refreshSettings(); },
  'sync-retry': async () => { await Sync.push(); await Sync.pull(); if (modalOpen()) refreshSettings(); },
  'sync-logout': async () => { await Sync.signOut(); if (modalOpen()) refreshSettings(); route(); },
  'sync-delete-cloud': async () => { if (!confirm('確定刪除雲端上的進度？本機進度不受影響。')) return; await Sync.deleteCloud(); if (modalOpen()) refreshSettings(); },
  nav: (el) => go(el.dataset.route),
  settings: () => openSettings(),
  'study-practice': (el) => (!state.startChosen && !Object.keys(state.srs).length ? diveInto(el) : ROOM.use(el, () => diveInto(el))),   // the hero walks over first (1.2.0); a brand-new learner picks a start straight away
  'study-go': (el) => ROOM.use(el, () => ROOM.enter(el)),
  'study-drawer': (el) => ROOM.use(el, () => ROOM.pull(el)),
  'study-door': (el) => (el.dataset.thing === 'door' && NPC.visitor() ? ROOM.use(el, () => NPC.visit(el.closest('.study')), { x: 1.65, y: 5.95, look: 'L', act: 'look' }) : ROOM.use(el, () => ROOM.door(el))),   // out to the yard, or to the other room (1.3.0); someone knocking: open to them (test)
  'enter-house': (el) => yUse(el, [0, 214], () => { ROOM.heroIn(); SND.play('door-close', { delay: 0.3 }); sceneGo('#/today', 'entering'); }),   // the hero walks to the door first (1.2.0)
  'yard-shop': (el) => yClimb(el),
  'bus-stop': (el) => busSit(el),   // test: the hero sits on the bench
  'scene-use': (el) => sceneUse(el),   // a thing in a place: the hero walks over and uses it (PLACE_USE)
  'go-place': (el) => yGo(el, el.dataset.to),   // test: to the main road, the beach, home to the yard
  'npc-talk': (el) => TOWNEV.talk(el),
  'purse': () => purseToggle(),   // the button up top: 言靈 ↔ 円
  'yen-buy': (el) => YEN.buy(el.dataset.item), 'yen-zh': () => YEN.toggleZh(),   // a menu (YEN): bought, its Chinese
  'cruise-call': () => CRUISE.call(),   // test: the cruise ship far out, tapped: asked first (a long one)
  'cruise-start': () => CRUISE.start(),   // …and in it comes
  'cruise-next': () => CRUISE.next(),   // the tour's next stop
  'cruise-who': (el) => CRUISE.who(el),   // a passenger (or 高橋) tapped   // test: a word with a neighbour (the beach, the town)
  'town-shop': (el) => TOWNEV.shopTap(el),   // up the hill path to 古道具屋
  witch: (el) => witchCatch(el),   // the Halloween witch caught (1.2.2)
  santa: (el) => santaCatch(el),   // Santa's presents (2026-11-14)
  'close-modal': () => closeModal(),
  'modal-back': (el, ev) => { if (ev.target === el) closeModal(); },
  'toggle-furi': () => toggleFurigana(),
  'start-unit': (el) => startSession('unit', { unit: el.dataset.unit, title: `${unitById(el.dataset.unit).short}・單元練習` }),
  'start-vocab': (el) => startSession('vocab', { filter: el.dataset.filter || 'all' }),
  'start-mistakes': () => startSession('mistakes'),
  answer: (el) => answerCurrent(Number(el.dataset.i)),
  next: () => nextQuestion(),
  'preview-go': () => dismissPreview(),
  slip: () => {   // 「手滑，不算」: the answer was a mis-tap, not a gap — schedule, notebook and stats go back to before it
    const e = currentEntry(); if (!e || !e.done || e.slip || !e.undo) return;
    const q = e.q, u = e.undo;
    const wasNew = Boolean(e.srs && e.srs.isNew);
    if (q.key) { if (u.srs) state.srs[q.key] = u.srs; else delete state.srs[q.key]; }
    state.today = u.today;
    if (u.ans) state.today.ans = u.ans;
    if (u.logDate) {
      if (u.dailyLog) state.dailyLogs[u.logDate] = u.dailyLog;
      else delete state.dailyLogs[u.logDate];
    }
    if ('themeLane' in u) state.themeLane = u.themeLane;
    if ('currentUnit' in u) state.currentUnit = u.currentUnit;
    if ('completedUnits' in u) state.completedUnits = u.completedUnits;
    const others = u.others || [];   // 配對: the other words paired wrong
    others.forEach(o => { if (o.srs) state.srs[o.key] = o.srs; else delete state.srs[o.key]; });
    state.mistakes.splice(0, Math.max(0, state.mistakes.length - u.mistakesLen));   // the entries this answer added (addMistake puts them first)
    [u.mistake].concat(others.map(o => o.mistake)).forEach(m => { const i = m ? state.mistakes.findIndex(x => x.id === m.id) : -1; if (i >= 0) state.mistakes[i] = m; });
    const f = state.statsFmt[q.fmt]; if (f && f.ng > 0) f.ng--;
    if (state.recent.length) state.recent.pop();
    if (wasNew) SESSION.stats.newCount = Math.max(0, SESSION.stats.newCount - 1);
    SESSION.stats.wrong = Math.max(0, SESSION.stats.wrong - 1);
    const retries = u.retries || [];   // only this answer's copies: a word paired wrong may still have one from its own earlier miss
    SESSION.entries = SESSION.entries.filter((x, i) => i <= SESSION.idx || !(retries.includes(x) || (wasNew && x.encore && x.item === e.item)));
    const last = SESSION.results[SESSION.results.length - 1]; if (last && last.q === q) SESSION.results.pop();
    SESSION.combo = e.combo = e.comboBefore || 0;
    e.slip = true; e.srs = null; e.mistakeDone = false; delete e.undo;
    saveState(); renderPractice(); toast('這題不算，排程維持原狀');
  },
  'exit-practice': () => exitPractice(),
  'close-summary': () => { SESSION = null; document.body.classList.remove('practicing'); go(lastMainRoute || '#/today'); Sync.flushDeferred(); },
  again: () => { const s = SESSION; SESSION = null; startSession(s.mode, s.opt || {}); },
  'retry-wrong': () => {
    const items = [];
    // 配對: the words paired wrong; one entry per word (a question's item is a copy carrying the example it used)
    SESSION.results.filter(r => !r.ok).flatMap(r => r.missed && r.missed.length ? r.missed.map(x => x.item) : [r.q.item]).forEach(it => { if (it && !items.some(x => x.key === it.key)) items.push(it); });
    SESSION = null;
    if (!items.length) { go(lastMainRoute); return; }
    startSession('items', { items: shuffle(items), title: '重練答錯的題目' });
  },
  'show-zh': () => { const e = currentEntry(); if (e) { e.zhShown = true; renderPractice(); } },
  replay: () => {
    const e = currentEntry();
    if (!e || !e.q) return;
    const q = e.q;
    if (q.custom === 'v-match') return;   // 配對 has no 發音: each word is read as it is tapped
    // before answering a grammar question the full sentence would give the answer away (句意拼貼 shows it: it can be heard)
    const text = q.audio || (e.done || q.fmt === 'g-zh' ? (q.fullJp || q.speakWord) : (q.fmt && q.fmt.startsWith('g-') ? '' : q.speakWord)) || '';
    if (!text) { toast('作答後可以聽整句。'); return; }
    if (text === q.speakWord && q.speakReading) { speak(text, { reading: q.speakReading }); return; }
    if (q.audioScript && text === q.audio) speakScript(text); else speak(text);
  },
  'speak-full': () => { const e = currentEntry(); if (e && e.q) speak(e.q.fullJp); },
  'speak-example': () => { const e = currentEntry(); const it = e && ((e.q && e.q.item) || e.item); if (it && it.ex) speak(exampleSpeech(it.ex, it)); },   // the example the question used
  'spell-tap': (el) => tileMove(() => tilePut(Number(el.dataset.i))),
  'conj-tap': (el) => tileMove(() => tilePut(Number(el.dataset.i))),
  'conj-untap': (el) => tileMove(() => tileTake(Number(el.dataset.k))),
  'tiles-submit': () => tileSubmit(),
  'conj-submit': () => {
    const e = currentEntry(); if (!e || e.done || !e.q || !(e.q.custom === 'g-conj-type' || e.q.custom === 'g-adj-type')) return;
    const inp = document.querySelector('input.conj-in'); e.typed = inp ? inp.value : (e.typed || '');
    if (!kanaKey(e.typed)) { toast('先輸入答案'); return; }
    finishCustom(e, conjMatch(e.typed, e.q.options[0].text), e.typed.trim());
  },
  'custom-giveup': () => {
    const e = currentEntry(); if (!e || e.done || !e.q || !e.q.custom) return;
    if (e.q.custom === 'g-conj-type' || e.q.custom === 'g-adj-type') { e.conj = conjTokens(e.q.options[0].text).map(t => e.q.tiles.indexOf(t)); }   // show the right form
    if (e.q.custom === 'v-spell') { e.spell = [...e.q.options[0].text].map(ch => e.q.tiles.indexOf(ch)); }   // show the right spelling
    if (e.q.custom === 'v-match') {   // reveal every pair; the words not paired yet count as paired wrong
      const m = e.match || { matched: [], wrong: 0, missed: [] }; const missed = (m.missed || []).slice();
      e.q.pairs.forEach(([w]) => { if (!m.matched.includes(w) && !missed.some(x => x[0] === w)) missed.push([w, '（看了答案）']); });
      e.match = { sel: null, matched: e.q.pairs.map(p => p[0]), wrong: m.wrong || 0, missed };
    }
    if (e.q.custom === 'g-order') { e.order = e.q.orderParts.map(p => e.q.tiles.indexOf(p)); }   // show the right order
    if (e.q.custom === 'g-zh') { e.zh = e.q.zhParts.map(p => e.q.tiles.indexOf(p)); }   // show the right pieces
    finishCustom(e, false, '（看了答案）');
  },
  'order-tap': (el) => tileMove(() => tilePut(Number(el.dataset.i))),
  'zh-tap': (el) => tileMove(() => tilePut(Number(el.dataset.i))),
  'zh-untap': (el) => tileMove(() => tileTake(Number(el.dataset.k))),
  // a placed piece tapped on the line goes back to the tiles; the ones after it move up
  'order-untap': (el) => tileMove(() => tileTake(Number(el.dataset.k))),
  'spell-untap': (el) => tileMove(() => tileTake(Number(el.dataset.k))),
  'match-word': (el) => {
    const e = currentEntry(); if (!e || e.done || !e.q || e.q.custom !== 'v-match') return;
    e.match = e.match || { sel: null, matched: [], wrong: 0, missed: [] };
    e.match.sel = e.match.sel === el.dataset.w ? null : el.dataset.w;
    if (e.match.sel) { const p = e.q.pairs.find(x => x[0] === e.match.sel); speak(e.match.sel, p && p[2] && p[2] !== e.match.sel ? { reading: p[2] } : undefined); }   // hear the word as you pick it
    renderPractice();
  },
  'match-meaning': (el) => {
    const e = currentEntry(); if (!e || e.done || !e.q || e.q.custom !== 'v-match') return;
    const m = e.match = e.match || { sel: null, matched: [], wrong: 0, missed: [] };
    if (!m.sel) return;
    const pair = e.q.pairs.find(p => p[0] === m.sel);
    if (pair && pair[1] === el.dataset.m) { m.matched.push(m.sel); delete m.flash; }
    else {   // flash the wrong pair red; the word picked (not the one whose meaning was tapped) is the one paired wrong
      m.wrong++; m.flash = { w: m.sel, m: el.dataset.m, at: Date.now() }; setTimeout(() => { if (m.flash && Date.now() - m.flash.at >= 550) delete m.flash; }, 600);
      if (!m.missed.some(x => x[0] === m.sel)) m.missed.push([m.sel, el.dataset.m]);
    }
    m.sel = null;
    if (m.matched.length === e.q.pairs.length) finishCustom(e, m.wrong === 0, `配對時錯了 ${m.wrong} 次`); else renderPractice();
  },
  speak: (el) => speak(el.dataset.text, el.dataset.reading ? { reading: el.dataset.reading } : undefined),
  'ai-explain': (el) => aiExplainCurrent(el),
  'start-zero': () => chooseStart('zero'),
  'start-kana': () => chooseStart('kana'),
  'start-basics': () => chooseStart('basics'),
  'start-test': () => openModal('考哪一級？', startTestPickerHtml(), { width: 440 }),   // 2026-11-11: it was 入門's only
  'kana-known': () => { state.kanaKnown = true; saveState(); DAILY_CACHE = null; toast('入門單字從今天開始'); route(); },
  'kana-practice': () => startSession('kana'),
  glossary: (el) => { const h = glossaryHtml(el.dataset.term); if (h) openModal('這是什麼？', h, { width: 480, noFocus: true }); }
};
function handleClick(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const yd = el.closest('.yworld') && el.closest('.yard'); if (yd && yd._noClick) return;   // the end of a swipe that began on it
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A') ev.preventDefault();
  fn(el, ev);
}
const CHANGE_ACTIONS = {
  'listen-theme': (el) => ACTIONS['listen-theme-pick']({ dataset: { theme: el.value } })
};
function handleChange(ev) {
  const el = ev.target.closest('[data-change]');
  if (!el) return;
  const fn = CHANGE_ACTIONS[el.dataset.change];
  if (fn) fn(el, ev);
}

// ---------- keyboard ----------
function handleKey(ev) {
  if (ev.key === 'Enter' && ev.target && ev.target.classList && ev.target.classList.contains('conj-in')) {
    if (ev.isComposing || ev.keyCode === 229) return;   // the Enter that commits an IME conversion (Japanese keyboard) is not a submit
    ev.preventDefault(); ACTIONS['conj-submit'](); return;
  }
  const tag = (ev.target && ev.target.tagName || '').toUpperCase();
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (ev.target && ev.target.isContentEditable)) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (modalOpen()) { if (ev.key === 'Escape') closeModal(); return; }
  const r = currentRoute();
  const k = ev.key;
  if (r.name === 'practice' && SESSION) {
    const e = currentEntry();
    if (e && e.preview && !e.previewDone) {
      if (k === 'Enter' || k === ' ') { ev.preventDefault(); dismissPreview(); }
      else if (k === 'r' || k === 'R') { ev.preventDefault(); ACTIONS.replay(); }
      else if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFurigana(); }
      else if (k === 'Escape') { ev.preventDefault(); exitPractice(); }
      return;
    }
    if (['1', '2', '3', '4'].includes(k)) { ev.preventDefault(); if (e && !e.done && !(e.q && e.q.custom)) answerCurrent(Number(k) - 1); return; }
    if (k === 'Enter' || k === ' ') { if (e && e.done) { ev.preventDefault(); nextQuestion(); } else if (!e) { ev.preventDefault(); } else if (k === 'Enter' && tileModel(e)) { ev.preventDefault(); tileSubmit(); } return; }
    if (k === 'Backspace' && tileModel(e)) { ev.preventDefault(); const line = e[tileModel(e).key] || []; if (line.length) tileMove(() => tileTake(line.length - 1)); return; }   // a tile question: the last piece back
    if (k === 'r' || k === 'R') { ev.preventDefault(); ACTIONS.replay(); return; }
    if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFurigana(); return; }
    if (k === 't' || k === 'T') { ev.preventDefault(); ACTIONS['show-zh'](); return; }
    if (k === 'Escape') { ev.preventDefault(); exitPractice(); return; }
    return;
  }
  if (r.name === 'exam' && r.parts[1] === 'run') { examKey(ev); return; }
  if (r.name === 'vocab' && (r.parts[1] || 'cards') === 'cards') { flashKey(ev); return; }
  if (r.name === 'mistakes' && r.parts[1] === 'loop') { mloopKey(ev); return; }
  if ((r.name === 'mistakes' || r.name === 'vocab') && r.parts[1] === 'listen') { listenKey(ev); return; }
  if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFurigana(); }
}
