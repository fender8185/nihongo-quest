'use strict';
/* ==========================================================================
   Start-up
   ========================================================================== */
function checkDayRollover() {
  if (state.today.date === todayStr()) return;
  state.today = { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 };
  saveState();
  audioPrefetchSoon();   // a new day, a new plan: its clips while there is a network
  if (!SESSION && !EXAM) route();
}

// the app cannot start safely (1.8.2): it says so and offers a reload; nothing is saved or synced
function stopApp(why) {
  const view = document.getElementById('view') || document.body;
  view.innerHTML = `<div class="card" style="max-width:460px;margin:12vh auto;padding:22px 20px"><h2 style="margin:0 0 8px;font-size:20px">現在沒辦法開始</h2>
    <p style="margin:0 0 6px">${esc(why)}</p><p class="small muted" style="margin:0 0 16px">你的進度沒有被改動，也沒有上傳。請重新整理；一直這樣的話，先不要清除瀏覽資料，截這個畫面告訴我們。</p>
    <button type="button" class="btn btn-primary" onclick="location.reload()">重新整理</button>
    <p class="tiny muted" style="margin:14px 0 0;word-break:break-all">${esc(APP_VERSION)}${STATE_UNREADABLE ? ' · ' + esc(String((STATE_UNREADABLE && STATE_UNREADABLE.message) || STATE_UNREADABLE)) : ''}</p></div>`;
}
async function init() {
  if (typeof DATA !== 'object' || !DATA || !Array.isArray(DATA.UNITS) || !Array.isArray(DATA.VOCAB)) { stopApp('課程資料沒有載到（可能是網路斷了一下）。'); return; }
  // a level's own data file (data-n3.js) missing: every unit has its lesson only when every file came
  if (DATA.UNITS.some(u => !DATA.LESSONS || !DATA.LESSONS[u.id])) { stopApp('課程資料沒有載完整（可能是網路斷了一下）。'); return; }
  if (await loadState() === 'unreadable') { stopApp('讀取這台裝置上的進度時出了問題。'); return; }
  Sync.onChange = renderSyncChip;
  buildRegistry();
  applyTheme();
  applyFurigana();
  document.addEventListener('click', handleClick);
  document.addEventListener('pointerdown', dragDown);
  document.addEventListener('pointermove', dragMove, { passive: false });
  document.addEventListener('pointerup', (ev) => dragUp(ev, false));
  document.addEventListener('pointercancel', (ev) => dragUp(ev, true));
  // first real gesture unlocks the shared audio player (iOS refuses play() on an element that never had one)
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlockTtsPlayer, { capture: true, passive: true }));
  document.addEventListener('change', handleChange);
  document.addEventListener('input', (ev) => { if (!ev.isComposing && ev.target && ev.target.id === 'vocabSearch') applyVocabSearch(ev.target); });
  document.addEventListener('compositionend', (ev) => { if (ev.target && ev.target.id === 'vocabSearch') applyVocabSearch(ev.target); });
  document.addEventListener('keydown', handleKey);
  window.addEventListener('hashchange', route);
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => { if (!modalOpen() && currentRoute().name === 'today' && !SESSION) route(); };
  }
  setInterval(checkDayRollover, 60000);
  // a phone keeps the installed app suspended: back in front after a while, catch up on what an offline run missed
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    checkDayRollover(); if (Date.now() - AUDIO_PREFETCH.at > 30 * 60000) audioPrefetchSoon();
    if (hiddenAt && Date.now() - hiddenAt > 60000) playAnims(document.getElementById('view'));   // back after a minute away counts as opening the page
  });
  // another tab saved newer progress: pick it up unless this tab is in the middle of something
  if (STATE_CHANNEL) STATE_CHANNEL.onmessage = async (e) => {
    if (!e.data || e.data.type !== 'saved' || SESSION || EXAM) return;
    const s = await Store.get('state');
    if (!s || s.updatedAt === state.updatedAt) return;
    try { state = normalizeState(s); LAST_BULK_MARK = null; buildRegistry(); if (!modalOpen()) route(); } catch (err) { /* ignore */ }
  };
  window.addEventListener('beforeunload', (e) => { if (EXAM && !EXAM.finished) { e.preventDefault(); e.returnValue = ''; } });
  if (!location.hash || location.hash === '#') history.replaceState(null, '', '#/today');
  route();
  requestPersistence();
  try { indexedDB.deleteDatabase('nihongo_anki_media_db_v1'); } catch (e) { /* none */ }   // 1.0.34: the sounds and pictures of imported Anki cards, gone with them
  try { indexedDB.deleteDatabase('nihongo_quest_snapshots'); } catch (e) { /* none */ }   // 1.0.47: the snapshots, gone; progress lives in the cloud
  registerServiceWorker();
  audioPrefetchSoon();   // 離線語音: a few seconds after opening, and again whenever the network comes back
  window.addEventListener('online', () => audioPrefetchSoon(1000));
  // cloud sync starts after first paint: restoring an expired session can block on the network for a long time offline
  Sync.init().catch((e) => { console.warn('sync init failed', e); Sync.client = null; Sync.setStatus('off'); });
}

// a new version (1.4.1; the user: 直接換上): its service worker takes over as soon as it is installed (sw.js skipWaiting), and
// the page goes over to it by itself — at once when the app has only just opened and nothing has been touched, else at the
// next calm moment: a page change or the app back from the background, while nothing is under way (a practice set, an exam,
// 聽一輪 playing, the dressing room, 擺設, a dialog, a talk, the opening, the diary). The reloaded page says so once
let swUpdated = false, touchedYet = false, reloadPage = () => location.reload();
function calmForUpdate() {
  const r = currentRoute();
  if (r.name === 'practice' || (r.name === 'exam' && r.parts[1] === 'run') || LISTEN || modalOpen() || (CLOUD_GEN && CLOUD_GEN.running)) return false;   // nor while the generator runs
  return !document.querySelector('.dress.on, .talk, .story, .diary, .scope, .study.edit, .yard.edit');
}
function updateIfCalm(now) {
  if (!swUpdated || !(now || calmForUpdate())) return;
  swUpdated = false;
  try { sessionStorage.setItem('nq_updated', '1'); } catch (e) { /* the note is lost, the update is not */ }
  reloadPage();
}
function registerServiceWorker() {
  try { if (sessionStorage.getItem('nq_updated')) { sessionStorage.removeItem('nq_updated'); setTimeout(() => toast(`已更新到新版本 ${APP_VERSION}`), 600); } } catch (e) { /* none */ }
  if (!('serviceWorker' in navigator)) return;
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { touchedYet = true; }, { capture: true, once: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateIfCalm(); });
  // the first install also changes the controller (clients.claim): only a page that already had one is being updated
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController) return; swUpdated = true; updateIfCalm(!touchedYet); });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage({ type: 'SKIP_WAITING' });   // one an older page left waiting
  }).catch(() => { /* offline or unsupported: app works without it */ });
}
init();
