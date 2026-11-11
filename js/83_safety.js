'use strict';
/* ==========================================================================
   Data safety: persistent storage
   ========================================================================== */
async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch (e) { /* not available for this page */ }
}

// ---------- moved: the site left GitHub Pages for nihongoquest.app in 1.0.39 ----------
// Each address keeps its own data, so the old one says where to go (a letter in the mailbox); progress follows through the cloud login
const OLD_SITE_HOST = 'fender8185.github.io';
const NEW_SITE_URL = 'https://nihongoquest.app/';
let OLD_SITE_FORCE = null;   // tests: true／false instead of looking at the address
function onOldSite() { return OLD_SITE_FORCE !== null ? OLD_SITE_FORCE : location.host === OLD_SITE_HOST; }

// ---------- install (add to home screen) ----------
// The app is a PWA: on a phone it is far better installed (full screen, one-page home, offline). Nothing in a browser
// tells people how, so the Today page says so once and 設定 › 外觀 keeps the steps.
let INSTALL_FORCE = null;      // tests: { platform, standalone, touch, safari, firefox, canPrompt }
let deferredInstall = null;    // Chrome's beforeinstallprompt, kept so the banner's 安裝 button opens the real prompt
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (currentRoute().name === 'today') route(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; try { localStorage.setItem('nq_install_hint', 'installed'); } catch (e) { /* ignore */ } route(); });
function installInfo() {
  if (INSTALL_FORCE) return Object.assign({ platform: 'android', standalone: false, touch: true, safari: false, firefox: false, canPrompt: false }, INSTALL_FORCE);
  const ua = navigator.userAgent || '';
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS reports itself as a Mac
  const platform = ios ? 'ios' : /Android/.test(ua) ? 'android' : /Macintosh/.test(ua) ? 'mac' : 'desktop';
  const touch = navigator.maxTouchPoints > 0 || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const brave = Boolean(navigator.brave && typeof navigator.brave.isBrave === 'function');   // desktop／Android Brave; the iOS one looks exactly like Safari
  return { platform, standalone, touch, safari: /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Edg\//.test(ua) && !brave, firefox: /Firefox|FxiOS/.test(ua), brave, canPrompt: Boolean(deferredInstall) };
}
// iOS: only Safari (and Chrome／Edge／Firefox since iOS 16.4) can add a web app to the Home Screen; Brave and most other
// browsers cannot, and from a web page nothing can install itself. `x-safari-https://` opens the page in Safari (works on
// iOS 15 and 17+, not 16; undocumented), with the address to copy as the fallback.
function safariUrl() { return `x-safari-${location.protocol.replace(':', '')}://${location.host}${location.pathname}#/today`; }
function appUrl() { return `${location.origin}${location.pathname}`; }
function installSteps(info) {
  if (info.platform === 'ios') return { title: 'iPhone／iPad', steps: ['用 Safari 開這個網址（Brave 和大多數其他瀏覽器沒有「加入主畫面」；Chrome／Edge／Firefox 有）。', '點「分享」按鈕（方框加向上箭頭；iPhone 在下方，iPad 在上方）。', '往下捲，點「加入主畫面」。', '右上角按「新增」。主畫面會多一個「Nihongo」圖示，以後從那裡開。'], note: '', safari: true };
  if (info.platform === 'android') return { title: 'Android', steps: [`在 ${info.brave ? 'Brave' : 'Chrome'} 點右上角的「⋮」。`, info.brave ? '點「加到主畫面」，再選「安裝」（不是「建立捷徑」）。' : '點「安裝應用程式」（舊版叫「加到主畫面」）。', '確認後主畫面會多一個「Nihongo」圖示。'], note: info.firefox ? 'Firefox 的選單叫「安裝」或「加到主畫面」。' : '' };
  if (info.platform === 'mac') return { title: 'Mac', steps: ['Safari：選單列「檔案」→「加入 Dock」。', 'Chrome／Edge：網址列右端的「安裝」圖示，或「⋮」→「儲存並分享」→「安裝 Nihongo Quest」。'], note: '' };
  return { title: '電腦', steps: ['Chrome／Edge：網址列右端的「安裝」圖示，或「⋮」→「儲存並分享」→「安裝 Nihongo Quest」。'], note: info.firefox ? 'Firefox 不支援安裝網頁 app，加書籤直接用就好。' : '' };
}
function installGuideHtml(info = installInfo()) {
  const g = installSteps(info);
  return `<div class="install-guide">
    ${info.standalone ? '<p class="small">你現在就是從安裝好的 app 開的。' : '<p class="small">安裝後就像一般 app：從主畫面打開、全螢幕、離線也能練。'}</p>
    <div class="label mt-2">${g.title}</div>
    <ol class="small mt-1">${g.steps.map(x => `<li>${x}</li>`).join('')}</ol>
    ${g.note ? `<p class="hint">${g.note}</p>` : ''}
    ${g.safari && !info.standalone ? `<div class="row-wrap mt-2"><a class="btn btn-sm btn-primary" href="${esc(safariUrl())}">用 Safari 開啟</a><button type="button" class="btn btn-sm" data-act="copy-url">複製網址</button></div><p class="hint">「用 Safari 開啟」在 iOS 16 沒有作用；那就複製網址，開 Safari 貼上。</p>` : ''}
    <p class="hint">app 和瀏覽器的進度是分開的：先在「設定 › 資料」登入同步，進度就會跟過去。</p>
    ${info.canPrompt ? '<button type="button" class="btn btn-sm btn-primary mt-2" data-act="install-prompt">安裝</button>' : ''}
  </div>`;
}
Object.assign(ACTIONS, {
  'install-how': () => openModal('加到主畫面', installGuideHtml(), { width: 520 }),
  'copy-url': async () => { const url = appUrl(); try { await navigator.clipboard.writeText(url); toast('已複製網址，開 Safari 貼上。'); } catch (e) { prompt('複製這個網址，到 Safari 貼上：', url); } },
  'install-prompt': async () => { const p = deferredInstall; if (!p) return; deferredInstall = null; try { p.prompt(); await p.userChoice; } catch (e) { /* dismissed */ } route(); }
});

// ---------- the mailbox (1.1.0): what the 今日 page said on banners, as letters in the mailbox by the house ----------
// A letter comes when its time does — the site move (on the old address), 渚's welcome to grandmother's house, 第 0 週 for a
// beginner, 加到主畫面 on a phone's browser, 福爺's when 古道具屋 opens, the notices kept in the state — and stays (2026-11-10, the
// user): read or not, in the mailbox for good (state.mail: got, read — with the progress since 2026-11-11, so a progress that starts
// over has an empty mailbox; before, this device's nq_letters). Inside, the door's tag counts the unread and
// its dot glows; a letter this device has not been told about yet brings the 「外面信箱有新信」 hint once. Opened: the list, 新 on
// the unread; a tap reads one (read from then on).
function storedFlag(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
// the day this progress began: its first day of practice or the first item it met ('' none yet)
function progressSince() {
  const days = Object.keys(state.dailyLogs || {}).concat(Object.values(state.srs || {}).map((r) => r && r.intro).filter((d) => typeof d === 'string'));
  return days.length ? days.sort()[0] : '';
}
function letterBox() {
  if (state.mail) return state.mail;
  // set up once: the letters this device kept (nq_letters; before 2026-11-10 a letter put away with 知道了 went: here, read)
  // come along only when this progress was there when they came — never into a progress that started over (2026-11-11, the
  // user: a new progress found its letters already read)
  let d = null; try { d = JSON.parse(localStorage.getItem('nq_letters') || 'null'); } catch (e) { /* none */ }
  if (!d || !d.got) {
    d = { got: {}, read: {} };
    [['room', 'nq_letter_room'], ['opening', 'nq_letter_opening'], ['install', 'nq_install_hint']].forEach(([id, k]) => { const v = storedFlag(k); if (v) { d.got[id] = v; d.read[id] = v; } });
  }
  const since = progressSince(), b = { got: {}, read: {} };
  if (since) Object.keys(d.got).forEach((id) => { if (d.got[id] >= since) { b.got[id] = d.got[id]; if (d.read[id]) b.read[id] = d.read[id]; } });
  state.mail = b;
  return b;
}
function letterBoxSave(b) { state.mail = b; saveState(); }
function letterKinds() {   // every letter there is: when it comes (due), when it is no longer wanted (gone)
  const n = Object.keys(state.srs).length, info = installInfo(), got = Boolean(state.koto.mail.opening);
  return [
    { id: 'moved', due: () => onOldSite(), gone: () => !onOldSite(), title: '網站搬家了', body: '新網址是 nihongoquest.app。在新網址用同一個 Email 登入雲端同步，進度就會接上；還沒登入過的，先在這裡登入一次（設定 › 資料）。加到主畫面的，新網址要重新加一次。',
      acts: `<a class="btn btn-sm btn-primary" href="${NEW_SITE_URL}#/today" target="_blank" rel="noopener">打開新網址</a>` },
    { id: 'room', from: 'nagisa', due: () => true, title: '歡迎回到外婆的家', body: `<p>你好。我是渚，你外婆從小到大的朋友，在鎮上開一間小小的咖啡店「喫茶しずく」。</p>
      <p>聽說你搬進了她的家。這個家裡的東西，都是她留給你的：</p><ul>
      <li>書房的書桌：筆記本是每天的練習；戴上耳機，可以聽一輪。</li>
      <li>書櫃是課程，卡片盒裡是單字；抽屜裡的錯題本、牆上的軟木板和日曆，記著你走過的每一天。</li>
      <li>臥房可以休息，衣櫃和鏡子可以換個樣子。做完當天的練習，還能在床上睡到想去的時間。</li>
      <li>門外有院子和海邊，往右是小鎮，坐公車還能去更遠的地方。鎮上的人會慢慢認識你，用你學到的日文跟你說話。</li></ul>
      <p>不用急，一天一點就好。你外婆總說：話要慢慢說，才會說進心裡。</p><p class="letter-sign">喫茶しずく　渚</p>` },
    { id: 'intro', due: () => (state.startChosen || n) && !state.introSeen && n < 40, title: '先看「第 0 週」', body: '假名和最基本的句型都在「第 0 週」，開始之前看一遍會輕鬆很多。',
      acts: '<button type="button" class="btn btn-sm btn-primary" data-act="nav" data-route="#/course/intro">去看</button>' },
    { id: 'install', due: () => !info.standalone && info.touch, gone: () => info.standalone, title: '加到主畫面', body: '加到主畫面會更好用：全螢幕、打開就是書房、離線也能練。',
      acts: info.canPrompt ? '<button type="button" class="btn btn-sm btn-primary" data-act="install-prompt">安裝</button>' : '<button type="button" class="btn btn-sm btn-primary" data-act="install-how">怎麼做</button>' },
    { id: 'opening', from: 'fuku', due: () => shopOpen(), title: '古道具屋開張了', body: `<p>你好，我是住在門外左邊山上的福爺。山上的古道具屋今天開張了，小店不收錢，只收「言靈」。</p>
      <p>日本人相信，話語裡住著靈魂。你每多吸收一分知識，就可能有言靈悄悄聚到你身邊來。</p>
      <p>信裡附上 ${LETTER_GIFT.opening} 言靈，當作開張的見面禮，有空上山來坐坐。</p>
      <p class="letter-sign">古道具屋　福爺</p>`,
      acts: got ? `<span class="letter-got">${kotoIcon()}已收下 ${LETTER_GIFT.opening} 言靈</span><button type="button" class="btn btn-sm btn-primary" data-act="nav" data-route="#/shop">去古道具屋</button>`
        : `<button type="button" class="btn btn-sm btn-primary" data-act="letter-gift" data-id="opening">${kotoIcon()}收下 ${LETTER_GIFT.opening} 言靈</button>` }
  ].concat((state.notices || []).map((x) => ({ id: 'notice:' + x.id, due: () => true, title: '通知', body: x.lines.map(esc).join('<br>') })));
}
function letters() {   // the letters in the mailbox, each with read (newest first; one that comes now is kept from now on)
  const set = Boolean(state.mail), b = letterBox(); let changed = !set;
  const out = letterKinds().filter((l) => !(l.gone && l.gone()) && (b.got[l.id] || (l.due() && (b.got[l.id] = todayStr(), changed = true))));
  if (changed) letterBoxSave(b);
  return out.map((l) => Object.assign(l, { got: b.got[l.id], read: Boolean(b.read[l.id]) })).sort((x, y) => (y.got || '').localeCompare(x.got || ''));
}
function letterRead(id) { const b = letterBox(); if (!b.read[id]) { b.read[id] = todayStr(); letterBoxSave(b); } }
function mailCount() { return letters().filter((l) => !l.read).length; }   // the unread
function takeLetterGift(id) {
  const n = LETTER_GIFT[id]; if (!n || state.koto.mail[id]) return;
  state.koto.mail[id] = n; saveState(); kotoPop(n);
  kotoButtons(document.getElementById('view'));   // the 言靈 button up top, if it is under the letters
}
function mailSeen() { try { return JSON.parse(localStorage.getItem('nq_mail_seen') || '[]'); } catch (e) { return []; } }
function markMailSeen(ids) { try { localStorage.setItem('nq_mail_seen', JSON.stringify([...new Set(mailSeen().concat(ids))].slice(-40))); } catch (e) { /* ignore */ } }
function newMail() {   // the unread letters this device has not been told about (a brand-new learner picks a start first)
  if (!state.startChosen && !Object.keys(state.srs).length) return [];
  const seen = mailSeen(); return letters().filter((l) => !l.read).map((l) => l.id).filter((id) => !seen.includes(id));
}
// who wrote a letter (1.2.0): their face in its top right corner (福爺; 渚 since 2026-11-10; the app's own letters have none)
const LETTER_FROM = { fuku: ['福爺', () => fukuSvg()], nagisa: ['渚', () => TOWNEV.face('nagisa')] };
const LETTER_GIFT = { opening: 10 };   // 言靈 that come with a letter
let letterOpen = null;   // the letter read in the mailbox now (none: the list)
function lettersHtml() {
  const all = letters(), l = letterOpen && all.find((x) => x.id === letterOpen);
  if (!l) return `<div class="letter-list">${all.map((x) => `<button type="button" class="letter-row ${x.read ? 'read' : 'unread'}" data-act="letter-open" data-id="${esc(x.id)}">
      <span class="lr-face">${x.from && LETTER_FROM[x.from] ? LETTER_FROM[x.from][1]() : icon('mail')}</span><span class="lr-title">${esc(x.title)}<small>${esc(x.from && LETTER_FROM[x.from] ? LETTER_FROM[x.from][0] : 'Nihongo Quest')}${x.got && x.got.length === 10 ? '・' + esc(x.got.slice(5).replace('-', '/')) : ''}</small></span>
      <span class="lr-state">${x.read ? '已讀' : '新'}</span></button>`).join('')}</div>`;
  return `<div class="letters"><div class="letter${l.from ? ' from' : ''}" data-letter="${esc(l.id)}">
      ${l.from && LETTER_FROM[l.from] ? `<div class="letter-from" title="${LETTER_FROM[l.from][0]}" aria-label="寄件者：${LETTER_FROM[l.from][0]}">${LETTER_FROM[l.from][1]()}</div>` : ''}
      <div class="letter-title">${esc(l.title)}</div>
      <div class="letter-body">${l.body}</div>
      <div class="row-wrap mt-3">${l.acts || ''}<button type="button" class="btn btn-sm" data-act="letter-done" data-id="${esc(l.id)}">‹ 回信箱</button></div>
    </div></div>`;
}
function openLetters(id) {   // the mailbox: its list, or (id) that letter (read from now on)
  const all = letters();
  if (!all.length) { toast('信箱是空的'); return; }
  markMailSeen(all.map((l) => l.id));
  letterOpen = id && all.some((l) => l.id === id) ? id : null; if (letterOpen) letterRead(letterOpen);
  openModal('信箱', lettersHtml(), { width: 460, noFocus: true });
  mailboxLevel();
}
// the yard's mailbox follows the letters in place: the flag, the tag
function mailboxLevel() {
  const box = document.querySelector('#view .yard .mailbox'); if (!box) return;
  const n = mailCount(), btn = box.querySelector('.mbox');
  box.classList.toggle('has', n > 0); btn.classList.toggle('mail', n > 0); btn.setAttribute('aria-label', mailWords(n)); btn.querySelector('.tag').innerHTML = ySign('mail', mailWords(n));
}
Object.assign(ACTIONS, {
  mailbox: (el) => yUse(el, [52, 146], () => {   // the hero walks over (1.2.0); its door drops open, then the letters
    const box = el.closest('.mailbox');
    if (!box || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { openLetters(); return; }
    box.classList.add('open'); setTimeout(openLetters, 320); setTimeout(() => box.classList.remove('open'), 900);
  }),
  'letter-gift': (el) => {   // what came with a letter, taken (once for the account)
    takeLetterGift(el.dataset.id);
    if (document.getElementById('modalBody')) document.getElementById('modalBody').innerHTML = lettersHtml();
  },
  'letter-open': (el) => { letterOpen = el.dataset.id; letterRead(letterOpen); document.getElementById('modalBody').innerHTML = lettersHtml(); mailboxLevel(); },
  'letter-done': (el) => {   // ‹ 回信箱: back to the list, the letter kept (read)
    const id = el.dataset.id;
    takeLetterGift(id);   // put away before taking it: it is taken all the same
    letterRead(id); if (id === 'intro') { state.introSeen = true; saveState(); }
    letterOpen = null; document.getElementById('modalBody').innerHTML = lettersHtml();
    mailboxLevel();
  },
  'koto-shop': () => (shopOpen() ? go('#/shop') : shopShut()),
  'mail-hint': (el) => ROOM.out(el.closest('.study'))
});
