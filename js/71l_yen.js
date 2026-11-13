'use strict';
// ---------- 円 spent (test, 2026-11-13: the second round of the guide's pay; docs/superpowers/specs/2026-11-12-cruise-tour-design.md §3.6) ----------
// What the wallet buys in town. A thing of a place with a menu (PLACE_USE buy → TOWN.MENU) opens it: the names in Japanese, each
// price read out above it, the Chinese on a tap. One bought, the 円 go (state.purse.spent: this device's own sum), the hero orders
// it in Japanese and the keeper says the price (a machine just takes the coins), then he has it where it is had — sat down to it
// in the 食堂 and the 居酒屋, into the bath, a fortune drawn, a can down the chute. The first of each is stamped into 美食手帳
// (state.purse.book), a page of 町の手帳. Before any 円 at all the menu says how to come by some; going about never costs anything.
// 2026-11-13 (the user): a thing is on the menu once its word is learned (or the course past that word's level); two foods and a
// drink a day — past that 「まだ おなかが いっぱいです」; each had on a screen of its own, its picture bitten into (もぐもぐ) or
// drunk (ごくごく).
const YEN = (() => {
  const M = () => (typeof TOWN !== 'undefined' && TOWN.MENU) || {};
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>'), plain = (s) => String(s).replace(MARK, '$1');
  const DIG = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  // a price read out, up to 9,999: 180 → ひゃくはちじゅうえん, with the sound changes of 300, 600, 800, 3,000 and 8,000
  function reading(n) {
    const th = Math.floor(n / 1000) % 10, h = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10;
    return (th ? { 1: 'せん', 3: 'さんぜん', 8: 'はっせん' }[th] || DIG[th] + 'せん' : '') + (h ? { 1: 'ひゃく', 3: 'さんびゃく', 6: 'ろっぴゃく', 8: 'はっぴゃく' }[h] || DIG[h] + 'ひゃく' : '')
      + (t ? (t === 1 ? '' : DIG[t]) + 'じゅう' : '') + (o ? (o === 4 ? 'よ' : DIG[o]) : '') + 'えん';
  }
  const priceMark = (n) => `{${yenStr(n)}円|${reading(n)}}`;   // as a line has it: shown with its reading, read out so
  const priceTag = (n) => `<span class="mc-price"><small>${reading(n)}</small><b>${yenStr(n)}円</b></span>`;   // on a menu: the reading on a line of its own, both to the right (2026-11-13, the user: a ruby centred the number under it, askew)
  const item = (m, id) => ((M()[m] || {}).items || []).find((x) => x[0] === id) || null;
  const day = () => dateStr(TOWNEV.today());
  // the order as said: the hero's (the menu's own, else 「…を ください。」), then the keeper's with the price in it
  const order = (mu, it) => [mu.order || `${it[1]}を ください。`, mu.orderZh || `請給我${it[2]}。`];
  const price = (mu, it) => [mu.keeper[1].replace('{P}', priceMark(it[3])), mu.keeper[2].replace('{Z}', `${yenStr(it[3])} 日圓`)];
  // full for the day: what the hero says, what the keeper says back
  const FULL = { f: ['まだ おなかが いっぱいです。', '肚子還好飽。'], d: ['もう のめません。', '已經喝不下了。'] }, AGAIN = ['また あした どうぞ！', '明天再來吧！'];
  const EAT = { start: ['いただきます！', '我開動了！'], end: ['ごちそうさまでした！', '我吃飽了，謝謝招待！'] };
  // every line said aloud buying something (the generator makes each a clip in the voice of who says it)
  function lines(add) {
    Object.values(M()).forEach((mu) => { if (mu.keeper) { mu.items.forEach((it) => { add('hero', order(mu, it)[0]); add(mu.keeper[0], price(mu, it)[0]); }); add(mu.keeper[0], AGAIN[0]); if (mu.hello) add(mu.keeper[0], mu.hello[0]); } });
    [FULL.f, FULL.d, EAT.start, EAT.end].forEach((l) => add('hero', l[0]));
    Object.values(M()).forEach((mu) => mu.items.forEach((it) => [...((it[4] || {}).look || []), ...((it[4] || {}).say || [])].forEach((l) => add('hero', l[0]))));   // what he says about each before and once had
  }
  // ---- what may be had: its word learned (or the course past its level), two foods and a drink a day ----
  const opt = (it) => it[4] || {};
  const word = (it) => { const w = opt(it).w; return w ? REG.vocab.find((v) => jaPlain(v.w) === w) || null : null; };
  const ALL = 'nq_menu_all';   // the test site (町の手帳): every menu open on this device, words learned or not
  const allOpen = () => { try { return onTestSite() && localStorage.getItem(ALL) === '1'; } catch (e) { return false; } };
  function known(it) {
    const v = word(it); if (!v || allOpen()) return true;
    const L = courseLevels(), at = L.indexOf(curLevel());
    return Boolean(state.srs[v.key]) || (at >= 0 && L.indexOf(courseLevel(v.lv)) >= 0 && L.indexOf(courseLevel(v.lv)) < at);
  }
  const LIMIT = { f: 2, d: 1 };
  const today = () => { const t = state.purse.today; return t && t.day === day() ? t : { day: day(), f: 0, d: 0 }; };
  const left = (k) => (LIMIT[k] ? LIMIT[k] - (today()[k] || 0) : Infinity);
  // its drawing: the course's (PICS) or the town's own (PICS_TOWN), by its pic, else by its word
  function pic(it, cls = '') {
    const k = opt(it).pic || opt(it).w || plain(it[1]), d = (typeof PICS === 'object' && PICS[k]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[k]);
    return d ? `<svg class="pic ${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : '';
  }

  // ---- the menu ----
  let at = null, zh = false;   // the menu open: { yard, t: the thing tapped, m: its menu }; its Chinese shown
  function open(yard, t) { if (!M()[t.buy]) return; at = { yard, t, m: t.buy }; zh = false; show(); }
  function show() {
    const mu = M()[at.m], bal = yenBalance(), none = yenEarned() <= 0, book = state.purse.book;   // how many more today not shown (the user: found out by having them)
    const row = (it) => {
      if (!known(it)) { const v = word(it); return `<div class="mc-item locked"><span class="mc-pic">${pic(it)}</span><span class="mc-name">？？？</span>${priceTag(it[3])}<span class="mc-lock" lang="zh-Hant">學會「${esc(v ? v.r || jaPlain(v.w) : '')}」這個字，就能點</span></div>`; }
      const full = left(opt(it).k) <= 0;
      return `<button type="button" class="mc-item${full ? ' full' : ''}" data-act="yen-buy" data-item="${it[0]}"${!none && bal >= it[3] ? '' : ' disabled'}><span class="mc-pic">${pic(it)}</span>
        <span class="mc-name">${ruby(it[1])}${book[it[0]] ? '<i class="mc-had" title="美食手帳裡有了">済</i>' : ''}</span>${priceTag(it[3])}<span class="mc-zh" lang="zh-Hant">${esc(it[2])}</span></button>`;
    };
    openModal(plain(mu.title), `<div class="menu-card${zh ? ' zh' : ''}" lang="ja">
      <div class="mc-list">${mu.items.map(row).join('')}</div>
      <div class="mc-foot"><span class="mc-purse">${yenIcon()}錢包 ${yenStr(Math.max(0, bal))} 円</span><button type="button" class="btn btn-sm" data-act="yen-zh">${zh ? '收起中文' : '中文'}</button></div>
      ${none ? '<p class="mc-none">錢包裡還沒有円。帶一趟郵輪導覽，就能拿到導遊費。</p>' : ''}</div>`, { width: 380, noFocus: true });
  }
  function toggleZh() { if (!at) return; zh = !zh; show(); }

  // ---- bought: paid, ordered, had ----
  function buy(id) {
    if (!at) return;
    const { yard, t, m } = at, mu = M()[m], it = item(m, id), k = opt(it || []).k; if (!it || !known(it) || yenEarned() <= 0 || yenBalance() < it[3]) return;
    closeModal(); at = null;
    if (left(k) <= 0) {   // had enough today: he says so, the keeper says come again tomorrow
      const ls = [['hero', ...FULL[k]]]; if (mu.keeper) ls.push([mu.keeper[0], ...AGAIN]);
      TALK.open(yard, mu.keeper ? mu.keeper[0] : 'hero', ls, null, null, { ev: true }); return;
    }
    const p = state.purse, dev = kotoDevice(), first = !p.book[id], td = today();
    p.spent[dev] = (Number(p.spent[dev]) || 0) + it[3]; if (first) p.book[id] = day();
    if (LIMIT[k]) p.today = Object.assign({}, td, { [k]: (td[k] || 0) + 1 });
    saveState(); kotoButtons(document);
    const then = () => { have(yard, t, mu); if (LIMIT[k]) setTimeout(() => eat(it, first), mu.sit ? 1500 : 1300); else if (first) setTimeout(() => stamp(it), 1000); };
    if (!mu.keeper) { SND.play('coins'); then(); return; }   // a machine, the おみくじ box
    const [o, oz] = order(mu, it), [pr, pz] = price(mu, it);
    TALK.open(yard, mu.keeper[0], [['hero', o, oz], [mu.keeper[0], pr, pz, { snd: 'coins' }]], then, null, { ev: true });
  }
  // had where it is had: the thing's own doing (a can down the chute, the bath, a fortune) with what is said as it is had after;
  // else what is said as it is had; the 食堂 and the 居酒屋: sat down to it at a table or the counter, and 「ごちそうさまでした」 a while on
  function have(yard, t, mu) {
    if (!yard.isConnected) return;
    if (mu.sit) {
      const seat = (PLACE_USE[yard.dataset.place] || []).find((q) => q.kind === 'seat'); if (!seat) return;
      useThing(yard, Object.assign({}, seat, { say: mu.have }));
      return;
    }
    const own = t.fx || t.out || t.fortune;
    useThing(yard, Object.assign({}, t, own ? { then: t.then || (mu.have !== t.say ? mu.have : undefined) } : { say: mu.have, toast: null }));
  }
  // ---- had: a screen of its own (2026-11-13, the user) — the hero's face close up, stars in the eyes and hearts rising; beside it
  // its picture, bitten into (もぐもぐ: bites with teeth marks; a dish stays, pale, under what is eaten) or tipped up and drunk
  // (ごくごく); then the hero goes on about it (its say, a line a tap, read out, the Chinese on a tap) and 「ごちそうさまでした！」;
  // the first time, its stamp ----
  let eats = 0;
  // the face as it is had (2026-11-13, the user): its own eyes and mouth swapped for these, drawn over the face close-up (its box
  // 111.5 × 100; the eyes' middles at 31.8 / 79.2, 40 down; the mouth's at 55.75, 65) — drool: star eyes, the mouth open and a
  // drop running; chew: happy ^ ^ eyes, the mouth working (ω); bliss: heart eyes and a big smile — rosy cheeks all along
  const EYE = { star: (x) => `<g transform="translate(${x} 40)"><g class="es-twinkle"><path d="M0 -12 L3.2 -3.2 L12 0 L3.2 3.2 L0 12 L-3.2 3.2 L-12 0 L-3.2 -3.2 Z" fill="#ffd34a" stroke="#f0a020" stroke-width="1.4" stroke-linejoin="round"/><circle cx="-2.6" cy="-2.6" r="1.8" fill="#fff"/></g></g>`,
    happy: (x) => `<path d="M${x - 8} 43 Q${x} 33 ${x + 8} 43" fill="none" stroke="#2a2730" stroke-width="3.2" stroke-linecap="round"/>`,
    heart: (x) => `<g transform="translate(${x} 41) scale(.62)"><path d="M0 14 C-9 7 -16 2 -16 -5 C-16 -10 -12 -13 -8 -13 C-4.6 -13 -2 -11 0 -8 C2 -11 4.6 -13 8 -13 C12 -13 16 -10 16 -5 C16 2 9 7 0 14 Z" fill="#f2557a"/><ellipse cx="-7" cy="-6" rx="3" ry="2" fill="#fff" fill-opacity=".7"/></g>` };
  const MOOD = {
    drool: EYE.star(31.8) + EYE.star(79.2) + '<path d="M48 62 Q55.75 73 63.5 62 Z" fill="#7a2e22"/><path d="M51 67 Q55.75 72 60.5 67 Q55.75 64.5 51 67 Z" fill="#f08a96"/><path class="es-drip" d="M62.5 65 q2.6 6.4 0 9.6 q-2.6 -3.2 0 -9.6 Z" fill="#a9dcf2"/>',
    chew: EYE.happy(31.8) + EYE.happy(79.2) + '<g class="es-jaw"><path d="M48 65 q3.9 4.2 7.75 0 q3.9 4.2 7.75 0" fill="none" stroke="#7a2e22" stroke-width="2.4" stroke-linecap="round"/></g>',
    bliss: EYE.heart(31.8) + EYE.heart(79.2) + '<path d="M45 61 Q55.75 77 66.5 61 Z" fill="#7a2e22"/><path d="M49.5 67.5 Q55.75 73.5 62 67.5 Q55.75 64.5 49.5 67.5 Z" fill="#f08a96"/>' };
  const BLUSH = '<ellipse cx="20" cy="70" rx="10" ry="5" fill="#f58aa0" fill-opacity=".45"/><ellipse cx="91.5" cy="70" rx="10" ry="5" fill="#f58aa0" fill-opacity=".45"/>';
  const HEART = '<svg viewBox="0 0 20 18"><path d="M10 17 C4 12 0 9 0 5 C0 2 2.4 0 5 0 C7 0 8.6 1.2 10 3 C11.4 1.2 13 0 15 0 C17.6 0 20 2 20 5 C20 9 16 12 10 17 Z" fill="#f2708a"/></svg>';
  function eat(it, first) {
    const o = opt(it), drink = o.k === 'd', id = `esm${++eats}`, d = /<svg[^>]*><circle class="pd"[^>]*\/>(.*)<\/svg>$/s.exec(pic(it)), draw = d ? d[1] : '', el = document.createElement('div');
    const bites = [[74, 48, 9], [61, 40, 10], [47, 43, 10], [33, 50, 9], [57, 58, 11], [41, 61, 11]];   // round the food's top, then its middle: a round bite with teeth marks along its edge
    const looks = o.look || [], said = (o.say && o.say.length ? o.say : [['おいしかった！', '好好吃！']]);   // before having it (star-eyed), once had
    el.className = `eat-scene${drink ? ' drink' : ''}${o.dish ? ' dish' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', drink ? '喝東西' : '吃東西');
    el.innerHTML = `<div class="es-card"><p class="es-name" lang="ja">${ruby(it[1])}</p>
      <div class="es-row"><div class="es-face" data-mood="drool">${HERO.head(state.look, 'face')}<svg class="es-mood" viewBox="0 0 111.5 100" aria-hidden="true">${BLUSH}${Object.entries(MOOD).map(([k, m]) => `<g class="m-${k}">${m}</g>`).join('')}</svg><span class="es-hearts" aria-hidden="true"></span></div>
        <div class="es-food"><svg class="pic es-pic" viewBox="0 0 100 100" aria-hidden="true"><defs><mask id="${id}"><rect width="100" height="100" fill="#fff"/>${drink ? '' : bites.map(([x, y, r], k) => `<g class="es-bite" data-k="${k}" fill="#000"><circle cx="${x}" cy="${y}" r="${r}"/>${[-1, 0, 1].map((j) => `<circle cx="${(x + j * r * 0.62).toFixed(1)}" cy="${(y + r * (j ? 0.78 : 0.95)).toFixed(1)}" r="${(r * 0.42).toFixed(1)}"/>`).join('')}</g>`).join('')}</mask></defs><circle class="pd" cx="50" cy="50" r="47"/>${o.dish ? `<g class="es-dish">${draw}</g>` : ''}<g class="es-g" mask="url(#${id})">${draw}</g></svg><i class="es-word" aria-hidden="true"></i><span class="es-crumbs" aria-hidden="true"></span></div></div>
      <div class="es-bubble"><p class="es-say" lang="ja"></p><p class="es-zh" hidden></p></div>
      <div class="es-foot"><button type="button" class="btn btn-sm es-zh-btn" hidden>中文</button></div>
      <button type="button" class="btn btn-primary es-ok" lang="ja" hidden>▶</button></div>`;
    document.body.appendChild(el);
    const mood = (m) => { el.querySelector('.es-face').dataset.mood = m; };
    SND.play('sparkle'); setTimeout(() => { if (el.isConnected) SND.play('slurp'); }, 450);   // the stars come up, じゅるり
    const face = el.querySelector('.es-face'), word = el.querySelector('.es-word'), g = el.querySelector('.es-g'), ok = el.querySelector('.es-ok'), zhB = el.querySelector('.es-zh-btn'), zhP = el.querySelector('.es-zh');
    // the hero's words: how good it looks (looks, star-eyed, a line a tap), いただきます and it is had, how good it was (said, a line a
    // tap), ごちそうさまでした. phase: 'look' | 'eat' | 'said'; k: the line of it shown
    let phase = looks.length ? 'look' : 'eat', k = 0, zh = false;
    const show = (ja, z) => { el.querySelector('.es-say').innerHTML = ruby(ja); zhP.textContent = z || ''; zhP.hidden = !zh || !z; speakAs('hero', ja); el.querySelector('.es-bubble').classList.remove('pop'); void el.offsetWidth; el.querySelector('.es-bubble').classList.add('pop'); };
    const line = () => show(...(phase === 'look' ? looks : said)[k]);
    const button = (last, end) => { ok.hidden = false; zhB.hidden = false; ok.innerHTML = last ? ruby(end) : '▶'; };
    const pop = (w) => { word.textContent = w; word.classList.remove('on'); void word.offsetWidth; word.classList.add('on'); };
    const hearts = () => { const box = el.querySelector('.es-hearts'); for (let i = 0; i < 3; i++) setTimeout(() => { if (!el.isConnected) return; const h = document.createElement('i'); h.innerHTML = HEART; h.style.left = `${10 + Math.random() * 80}%`; h.style.setProperty('--dx', `${(Math.random() * 30 - 15).toFixed(0)}px`); box.appendChild(h); setTimeout(() => h.remove(), 1600); }, i * 220); };
    const done = () => { el.classList.add('done'); mood('bliss'); hearts(); playSfx('yum'); phase = 'said'; k = 0; line(); button(said.length === 1, EAT.end[0]); };
    const have = () => {   // いただきます！ and it is had
      phase = 'eat'; ok.hidden = true; show(...EAT.start);
      if (calm()) { el.querySelectorAll('.es-bite').forEach((b) => b.classList.add('on')); g.classList.add('gone'); done(); return; }
      const steps = drink ? 3 : bites.length;
      for (let n = 0; n < steps; n++) setTimeout(() => {
        if (!el.isConnected) return;
        face.classList.remove('chew'); void face.offsetWidth; face.classList.add('chew'); mood('chew');
        if (drink) { g.classList.remove('sip'); void g.getBoundingClientRect(); g.classList.add('sip'); pop('ごくごく'); SND.play('gulp', { vol: 0.8 }); }
        else { el.querySelector(`.es-bite[data-k="${n}"]`).classList.add('on'); pop('もぐもぐ'); SND.play('chomp'); crumbs(el, bites[n]); }
        if (n === 1 || n === steps - 1) hearts();
        if (n === steps - 1) setTimeout(() => { if (!el.isConnected) return; g.classList.add('gone'); done(); }, 700);
      }, 1100 + n * (drink ? 900 : 650));
    };
    if (phase === 'look') { line(); button(looks.length === 1, EAT.start[0]); } else have();
    zhB.addEventListener('click', () => { zh = !zh; zhP.hidden = !zh || !zhP.textContent; });
    ok.addEventListener('click', () => {
      if (phase === 'look') { if (k < looks.length - 1) { k += 1; line(); button(k === looks.length - 1, EAT.start[0]); } else have(); return; }   // how good it looks, then いただきます
      if (phase === 'said' && k < said.length - 1) { k += 1; line(); hearts(); button(k === said.length - 1, EAT.end[0]); return; }   // on through how good it was
      if (phase !== 'said') return;
      speakAs('hero', EAT.end[0]); el.remove(); if (first) setTimeout(() => stamp(it), 300);
    });
  }
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function crumbs(el, [x, y]) {   // a few crumbs off where it was bitten
    const box = el.querySelector('.es-crumbs');
    for (let i = 0; i < 5; i++) {
      const c = document.createElement('i'), a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 22;
      c.style.cssText = `left:${x}%;top:${y}%;--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r + 14).toFixed(1)}px`;
      box.appendChild(c); setTimeout(() => c.remove(), 700);
    }
  }
  // the first of it: stamped into 美食手帳 up top, with a thump
  function stamp(it) {
    const el = document.createElement('div'); el.className = 'yen-stamp'; el.setAttribute('role', 'status');
    el.innerHTML = `<b>美食手帳</b><span lang="ja">${ruby(it[1])}</span><i aria-hidden="true">済</i>`;
    document.body.appendChild(el); playSfx('stamp'); setTimeout(() => SND.play('sparkle'), 180); setTimeout(() => el.classList.add('off'), 2600); setTimeout(() => el.remove(), 3100);
  }

  // ---- 美食手帳 (a page of 町の手帳): each menu, what has been had (the day first had) and what not yet ----
  function book() {
    const b = state.purse.book, all = Object.values(M()).flatMap((mu) => mu.items), had = all.filter((it) => b[it[0]]).length;
    return `<div class="food-book"><p class="fb-count">吃過、用過 ${had} / ${all.length} 樣・一共花了 ${yenStr(yenSpent())} 円</p>
      ${Object.values(M()).map((mu) => `<section class="fb-menu"><h4 lang="ja">${ruby(mu.shop || mu.title)}</h4><div class="fb-items">${mu.items.map((it) => `<div class="fb-item${b[it[0]] ? ' had' : ''}">
        <span class="fb-pic">${b[it[0]] ? pic(it) : ''}</span><span class="fb-name" lang="ja">${ruby(it[1])}</span><small>${esc(it[2])}・${yenStr(it[3])} 円</small>${b[it[0]] ? `<i class="fb-stamp" aria-label="${esc(b[it[0]])}">済</i><small class="fb-day">${esc(b[it[0]])}</small>` : ''}</div>`).join('')}</div></section>`).join('')}
      <p class="muted small">在鎮上點販賣機、麵包、菜單、黑板、牛奶機、澡堂、籤筒就能買。第一次買的會蓋上章。</p></div>`;
  }
  const shown = () => yenEarned() > 0 || Object.keys(state.purse.book).length > 0;   // its tab: once there has been 円
  // the test site's tools (町の手帳): 円 given, every menu open (or not), the day's foods and drinks back to none
  function tool(t) {
    if (t === 'gift') { state.purse.gift = (Number(state.purse.gift) || 0) + 10000; saveState(); kotoButtons(document); return `錢包 +10,000 円（現在 ${yenStr(yenBalance())} 円）`; }
    if (t === 'all') { const on = !allOpen(); try { localStorage.setItem(ALL, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '菜單全部開放了（這台裝置，不用先學單字）' : '菜單恢復成要先學單字'; }
    if (t === 'full') { delete state.purse.today; saveState(); return '今天吃喝的次數歸零了'; }
    return '';
  }
  // one who sells something where they are (2026-11-13, the user: bought from them, by a tap on them): their menu here — a thing
  // of the place with it (its doing as had) — their greeting, what to pick for it, and the menu opened
  function sells(yard, id) {
    const place = yard.dataset.place, m = Object.keys(M()).find((k) => M()[k].keeper && M()[k].keeper[0] === id), t = m && (PLACE_USE[place] || []).find((q) => q.buy === m && (!q.when || q.when()));
    if (!t) return null;
    const mu = M()[m];
    return { hello: mu.hello || ['いらっしゃい！', '歡迎光臨！'], label: m === 'bath' ? 'おふろに はいる' : 'ちゅうもんする', go: () => open(yard, t) };   // in Japanese (the user), in kana: furigana in a button set it askew beside the other
  }
  return { open, buy, toggleZh, lines, book, shown, reading, priceMark, known, left, tool, allOpen, sells };
})();
