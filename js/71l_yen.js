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
  // full for the day: what the hero says, what the keeper says back (the bath and おみくじ: once a day, 2026-11-13 the user)
  const FULL = { f: ['まだ おなかが いっぱいです。', '肚子還好飽。'], d: ['もう のめません。', '已經喝不下了。'],
    b: ['{今日|きょう}は もう おふろに {入|はい}りました。', '今天已經泡過澡了。'], o: ['{今日|きょう}は もう ひきました。', '今天已經抽過了。'] }, AGAIN = ['また あした どうぞ！', '明天再來吧！'];
  const EAT = { start: ['いただきます！', '我開動了！'], end: ['ごちそうさまでした！', '我吃飽了，謝謝招待！'] };
  // every line said aloud buying something (the generator makes each a clip in the voice of who says it)
  function lines(add) {
    Object.values(M()).forEach((mu) => { if (mu.keeper) { mu.items.forEach((it) => { add('hero', order(mu, it)[0]); add(mu.keeper[0], price(mu, it)[0]); }); add(mu.keeper[0], AGAIN[0]); if (mu.hello) add(mu.keeper[0], mu.hello[0]); } });
    [FULL.f, FULL.d, FULL.b, FULL.o, EAT.start, EAT.end].forEach((l) => add('hero', l[0]));
    Object.values(M()).forEach((mu) => mu.items.forEach((it) => [...((it[4] || {}).look || []), ...((it[4] || {}).say || [])].forEach((l) => add('hero', l[0]))));   // what he says about each before and once had
  }
  // ---- what may be had: its word learned (or the course past its level), two foods and a drink a day, the bath and おみくじ once
  // (k: f, d, b, o); a bath makes him hungry again — the day's foods and drinks begin anew ----
  const opt = (it) => it[4] || {};
  const word = (it) => { const w = opt(it).w; return w ? REG.vocab.find((v) => jaPlain(v.w) === w) || null : null; };
  const ALL = 'nq_menu_all';   // the test site (町の手帳): every menu open on this device, words learned or not
  const allOpen = () => { try { return onTestSite() && localStorage.getItem(ALL) === '1'; } catch (e) { return false; } };
  function known(it) {
    const v = word(it); if (!v || allOpen()) return true;
    const L = courseLevels(), at = L.indexOf(curLevel());
    return Boolean(state.srs[v.key]) || (at >= 0 && L.indexOf(courseLevel(v.lv)) >= 0 && L.indexOf(courseLevel(v.lv)) < at);
  }
  const LIMIT = { f: 2, d: 1, b: 1, o: 1 }, HAD = { f: 1, d: 1 };   // HAD: had on a screen of its own (eat)
  const today = () => { const t = state.purse.today; return t && t.day === day() ? t : { day: day(), f: 0, d: 0, b: 0, o: 0 }; };
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
      return `<button type="button" class="mc-item${full ? ' full' : ''}" data-act="yen-buy" data-item="${it[0]}" data-k="${opt(it).k || ''}"${!none && bal >= it[3] ? '' : ' disabled'}><span class="mc-pic">${pic(it)}</span>
        <span class="mc-name">${ruby(it[1])}${book[it[0]] ? '<i class="mc-had" title="美食手帳裡有了">済</i>' : ''}</span>${priceTag(it[3])}<span class="mc-zh" lang="zh-Hant">${esc(it[2])}</span></button>`;
    };
    // the wallet and 中文 up in the title's row, in sight while choosing (2026-11-13, the user: cut in half at the foot on a phone);
    // 中文 faint and small — the menu is the learner's level, read in Japanese
    openModal(plain(mu.title), `<div class="menu-card${zh ? ' zh' : ''}" lang="ja">
      ${none ? '<p class="mc-none">錢包裡還沒有円。帶一趟郵輪導覽，就能拿到導遊費。</p>' : ''}
      <div class="mc-list">${mu.items.map(row).join('')}</div></div>`, { width: 380, noFocus: true,
      head: `<div class="mc-top"><span class="mc-purse">${yenIcon()}${yenStr(Math.max(0, bal))} 円</span><button type="button" class="zh-btn" data-act="yen-zh" aria-pressed="${zh}">${zh ? '收起中文' : '中文'}</button></div>` });
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
    if (LIMIT[k]) p.today = Object.assign({}, td, { [k]: (td[k] || 0) + 1 }, k === 'b' ? { f: 0, d: 0 } : {});   // out of the bath hungry
    saveState(); kotoButtons(document);
    const then = () => {
      have(yard, t, mu);
      if (HAD[k]) setTimeout(() => eat(it, first, m), mu.sit ? 1500 : 1300); else if (first) setTimeout(() => stamp(it), 1000);
      if (k === 'b') setTimeout(() => { if (!yard.isConnected) return; yPop(yard, yh.X + 600, 370 - yh.Y - 200 * yScale(yh.Y), 'おなか すいた〜！'); toast('泡完澡，肚子又餓了。', 2600); }, (t.out || 0) + 1800);
    };
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
  // ---- had: a screen of its own (2026-11-13, the user) — since 2026-11-14 a close-up across the table (EATSCENE, the user's pick of
  // the 「七種吃法」 preview): the hero's head and shoulders, the thing before him, only the spoon, chopsticks, fork, pick — or the
  // thing itself, or the drink — coming up to the mouth, three mouthfuls with the dish going down. Star-eyed first (how good it
  // looks, a line a tap), いただきます and it is had, then he goes on about it (its say, a line a tap, read out, the Chinese on a
  // tap) and 「ごちそうさまでした！」; the first time, its stamp ----
  // where it is had, for the scene's backdrop (EATSCENE BG): the menu's own place; a machine in the street or the station; the stalls
  const WHERE = { shokudo: 'shokudo', izakaya: 'izakaya', cafe: 'cafe', milk: 'sento', vend: 'street', bakery: 'bakery' };
  const where = (m) => WHERE[m] || (typeof SHRINE_STALLS !== 'undefined' && SHRINE_STALLS.some(([id]) => id === m) ? 'fair' : 'shokudo');
  function eat(it, first, m) {
    const o = opt(it), drink = o.k === 'd', el = document.createElement('div');
    const looks = o.look || [], said = (o.say && o.say.length ? o.say : [['おいしかった！', '好好吃！']]);   // before having it (star-eyed), once had
    el.className = `eat-scene${drink ? ' drink' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', drink ? '喝東西' : '吃東西'); el.dataset.at = location.hash;   // watched to the end: no going elsewhere meanwhile (route)
    el.innerHTML = `<div class="es-card"><p class="es-name" lang="ja">${ruby(it[1])}</p>
      <div class="es-face" data-mood="drool"><svg class="es-stage" viewBox="0 0 360 420" role="img" aria-label="${esc(plain(it[1]))}"></svg></div>
      <div class="es-bubble"><p class="es-say" lang="ja"></p><p class="es-zh" hidden></p></div>
      <div class="es-foot"><button type="button" class="zh-btn es-zh-btn" hidden>中文</button></div>
      <button type="button" class="btn btn-primary es-ok" lang="ja" hidden>▶</button></div>`;
    document.body.appendChild(el);
    const scene = EATSCENE.mount(el.querySelector('.es-stage'), it, pic(it), calm(), where(m));
    SND.play('sparkle'); setTimeout(() => { if (el.isConnected) SND.play('slurp'); }, 450);   // the stars come up, じゅるり
    const ok = el.querySelector('.es-ok'), zhB = el.querySelector('.es-zh-btn'), zhP = el.querySelector('.es-zh');
    // the hero's words: how good it looks (looks, star-eyed, a line a tap), いただきます and it is had, how good it was (said, a line a
    // tap), ごちそうさまでした. phase: 'look' | 'eat' | 'said'; k: the line of it shown
    let phase = looks.length ? 'look' : 'eat', k = 0, zh = false;
    const show = (ja, z) => { el.querySelector('.es-say').innerHTML = ruby(ja); zhP.textContent = z || ''; zhP.hidden = !zh || !z; speakAs('hero', ja); el.querySelector('.es-bubble').classList.remove('pop'); void el.offsetWidth; el.querySelector('.es-bubble').classList.add('pop'); };
    const line = () => show(...(phase === 'look' ? looks : said)[k]);
    const button = (last, end) => { ok.hidden = false; zhB.hidden = false; ok.innerHTML = last ? ruby(end) : '▶'; };
    const done = () => { if (!el.isConnected) return; el.classList.add('done'); playSfx('yum'); phase = 'said'; k = 0; line(); button(said.length === 1, EAT.end[0]); };
    const have = () => {   // いただきます！ and it is had
      phase = 'eat'; ok.hidden = true; show(...EAT.start);
      if (calm()) { scene.finish(); done(); return; }
      scene.eat(done);
    };
    if (phase === 'look') { line(); button(looks.length === 1, EAT.start[0]); } else have();
    zhB.addEventListener('click', () => { zh = !zh; zhP.hidden = !zh || !zhP.textContent; });
    ok.addEventListener('click', () => {
      if (phase === 'look') { if (k < looks.length - 1) { k += 1; line(); button(k === looks.length - 1, EAT.start[0]); } else have(); return; }   // how good it looks, then いただきます
      if (phase === 'said' && k < said.length - 1) { k += 1; line(); scene.hearts(); button(k === said.length - 1, EAT.end[0]); return; }   // on through how good it was
      if (phase !== 'said') return;
      speakAs('hero', EAT.end[0]); scene.stop(); el.remove(); if (first) setTimeout(() => stamp(it), 300);
    });
  }
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the first of it: stamped into 美食手帳 up top, with a thump
  function stamp(it) {
    const el = document.createElement('div'); el.className = 'yen-stamp'; el.setAttribute('role', 'status');
    el.innerHTML = `<b>美食手帳</b><span lang="ja">${ruby(it[1])}</span><i aria-hidden="true">済</i>`;
    document.body.appendChild(el); playSfx('stamp'); setTimeout(() => SND.play('sparkle'), 180); setTimeout(() => el.classList.add('off'), 2600); setTimeout(() => el.remove(), 3100);
  }

  // ---- 美食手帳 (a page of 町の手帳): each menu, what has been had (the day first had) and what not yet ----
  // its pages: a menu each, those of the same name (shop: the 緣日's stalls, 2026-11-13, the user) together on one
  const pages = () => { const by = new Map(); Object.values(M()).forEach((mu) => { const n = mu.shop || mu.title; by.set(n, (by.get(n) || []).concat(mu.items)); }); return [...by]; };
  function book() {
    const b = state.purse.book, all = Object.values(M()).flatMap((mu) => mu.items), had = all.filter((it) => b[it[0]]).length;
    return `<div class="food-book"><p class="fb-count">吃過、用過 ${had} / ${all.length} 樣・一共花了 ${yenStr(yenSpent())} 円</p>
      ${pages().map(([name, items]) => `<section class="fb-menu"><h4 lang="ja">${ruby(name)}</h4><div class="fb-items">${items.map((it) => `<div class="fb-item${b[it[0]] ? ' had' : ''}">
        <span class="fb-pic">${b[it[0]] ? pic(it) : ''}</span><span class="fb-name" lang="ja">${ruby(it[1])}</span><small>${esc(it[2])}</small><small>${yenStr(it[3])} 円</small>${b[it[0]] ? `<i class="fb-stamp" aria-label="${esc(b[it[0]])}">済</i><small class="fb-day">${esc(String(b[it[0]]).slice(5).replace('-', '/'))}</small>` : ''}</div>`).join('')}</div></section>`).join('')}
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
  return { open, buy, toggleZh, lines, book, shown, reading, priceMark, known, left, tool, allOpen, sells, pic, where };
})();
