'use strict';
// 古道具屋, the shop up the hill (renderShop) (out of 71_today.js, 2026-11-11)
// ---------- 古道具屋 (1.2.0): the old shop up the hill, kept by 福爺 the owl, who takes 言靈 and nothing else ----------
const onTestSite = () => /nihongo-quest-test|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
// 福爺 says a line in Japanese with its meaning: when you come in, after a sale, when 言靈 is short, and whatever when tapped
const FUKU = {
  hello: [['いらっしゃい', '歡迎光臨'], ['ようこそ', '歡迎'], ['ゆっくり見ていってね', '慢慢看喔']],
  night: [['こんばんは', '晚安'], ['夜も勉強、えらいね', '晚上還在讀書，了不起']],
  thanks: [['まいどあり', '謝謝惠顧'], ['大事にしてね', '要好好珍惜喔']],
  short: [['言靈がまだ足りないね', '言靈還不夠喔'], ['もう少しがんばろう', '再加油一點']],
  idle: [['今日も一歩ずつ', '今天也一步一步來'], ['継続は力なり', '持續就是力量'], ['言葉には力があるよ', '話語裡住著力量喔'], ['ホー', '（貓頭鷹的叫聲）']]
};
let fukuTurn = 0;
function fukuLine(kind) { const list = FUKU[kind] || FUKU.idle, l = list[fukuTurn++ % list.length]; return `<b class="jp" lang="ja">${l[0]}</b><small>${l[1]}</small>`; }
function fukuSay(kind) { const b = document.querySelector('#view .fuku-say'); if (!b) return; b.innerHTML = fukuLine(kind); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
function fukuSvg() {
  return `<svg viewBox="0 0 90 96" aria-hidden="true"><path d="M32 27 L27 9 L42 22 Z M58 27 L63 9 L48 22 Z" fill="#7d5536"/>
    <ellipse cx="45" cy="58" rx="31" ry="36" fill="#9a6b45"/><ellipse cx="22" cy="66" rx="9" ry="22" fill="#7d5536" transform="rotate(12 22 66)"/><ellipse cx="68" cy="66" rx="9" ry="22" fill="#7d5536" transform="rotate(-12 68 66)"/>
    <ellipse cx="45" cy="72" rx="19" ry="21" fill="#ecd7b0"/><path d="M37 66 l3 3 l3 -3 M47 66 l3 3 l3 -3 M42 75 l3 3 l3 -3 M36 82 l3 3 l3 -3 M48 82 l3 3 l3 -3" fill="none" stroke="#b98d5c" stroke-width="1.2"/>
    <circle cx="34" cy="44" r="12" fill="#f6ead2"/><circle cx="56" cy="44" r="12" fill="#f6ead2"/>
    <g class="eyes"><circle cx="34" cy="44" r="6" fill="#2a2730"/><circle cx="56" cy="44" r="6" fill="#2a2730"/><circle cx="36" cy="42" r="2" fill="#fff"/><circle cx="58" cy="42" r="2" fill="#fff"/></g>
    <circle cx="34" cy="44" r="12.5" fill="none" stroke="#c9a24c" stroke-width="2"/><circle cx="56" cy="44" r="12.5" fill="none" stroke="#c9a24c" stroke-width="2"/><path d="M42.5 43 Q45 41 47.5 43" fill="none" stroke="#c9a24c" stroke-width="2"/>
    <path d="M41 53 L45 60 L49 53 Z" fill="#e0a23a"/>
    <path d="M30 60 Q45 68 60 60 L56 70 Q45 74 34 70 Z" fill="#3f4479"/><text x="45" y="69" font-size="7" font-weight="700" text-anchor="middle" fill="#fff" font-family="'Hiragino Mincho ProN', serif">古</text></svg>`;
}
// the shop's tabs (1.2.0): for 書房, for the yard, to wear, and what is sold for a while only. The last one used comes back.
// 穿搭's sections are the hero's seven parts, as the wardrobe's tabs (WEAR_SLOTS; 2026-11-12, the user), the others by kind
const SHOP_TABS = [['in', '室內', [['floor', '家具擺飾'], ['rug', '地墊'], ['wall', '牆上'], ['record', '唱片']]], ['out', '戶外', [['yard', '戶外擺設'], ['house', '房子外觀']]], ['wear', '穿搭', WEAR_SLOTS], ['sale', '限時']];
const inSec = (it, k) => (it.kind === 'wear' || it.kind === 'clothes' ? it.slot === k : it.kind === k);   // a ware under a section: by part, or by kind
let shopTab = (() => { try { const t = localStorage.getItem('nq_shop_tab'); return SHOP_TABS.some(([k]) => k === t) ? t : 'in'; } catch (e) { return 'in'; } })();
let shopFocus = '';   // a part's section to open 古道具屋 at (from the wardrobe's 去看看), once
// limited sales (1.2.0): a festival's own, every year. A ware joins one with limited: its key; it is shown under 限時 only, and
// only while the sale is on; once bought it is theirs like any other. 2026-11-14 (the user): every festival runs from 14 days
// before its day to 14 days after, both ends in (Halloween 10/17–11/14, Christmas 12/11–1/8 over the new year), and so will any
// added later; the town keeps it too (the sky's visitor, the snow, what the people wear and say: festOn)
const SALES = { halloween: { name: '萬聖節', day: '10-31' }, christmas: { name: '聖誕節', day: '12-25' } };
const FEST_SPAN = 14;
function saleSpan(key, day) {   // [first, last] day (YYYY-MM-DD) of the sale nearest the day: this year's, last year's or next year's
  const s = SALES[key]; if (!s || !day) return null;
  const y = Number(day.slice(0, 4)), t = Date.parse(day), iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const at = [y - 1, y, y + 1].map((yy) => Date.parse(`${yy}-${s.day}`)).reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
  return [iso(at - FEST_SPAN * 864e5), iso(at + FEST_SPAN * 864e5)];
}
const saleOn = (key, day) => { const sp = saleSpan(key, day); return !!sp && day >= sp[0] && day <= sp[1]; };
const nextSpan = (key, day) => { const sp = saleSpan(key, day); return sp && day > sp[1] ? saleSpan(key, `${Number(day.slice(0, 4)) + 1}-${SALES[key].day}`) : sp; };   // on now or the next
// the test site: a festival as if on whatever the day (nq_sale_preview: its key, or '1' for all of them)
const salePreview = (key) => { try { const p = onTestSite() && localStorage.getItem('nq_sale_preview'); return p === '1' || (!!key && p === key); } catch (e) { return false; } };
const festOn = (key) => salePreview(key) || saleOn(key, saleNow() || todayStr());   // the town's own festival look: by the server's day once known, else the device's
// the day a sale goes by is the server's, never the phone's (its clock and time zone are anyone's to change): the site's own
// answer carries a Date header, and that moment in Taipei (UTC+8, where the learners are) is the day. Kept 10 minutes; failed:
// no answer (offline), asked again when 限時 is opened
let saleDay = { day: null, at: 0, ask: null, failed: false };
function saleClock() {
  if (saleDay.day && Date.now() - saleDay.at < 600000) return Promise.resolve(saleDay.day);
  if (!saleDay.ask) saleDay.ask = fetch(`./?clock=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }).then((r) => {
    const t = Date.parse(r.headers.get('Date')); if (!Number.isFinite(t)) throw new Error('no Date header');
    const d = new Date(t + 8 * 3600000);
    saleDay = { day: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`, at: Date.now(), ask: null, failed: false };
    return saleDay.day;
  }).catch(() => { saleDay = { day: null, at: 0, ask: null, failed: true }; return null; });
  return saleDay.ask;
}
const saleNow = () => (saleDay.day && Date.now() - saleDay.at < 600000 ? saleDay.day : null);
// a ware's picture on its card and when it is got (GOT): clothes in the hero's own colours
const wareArt = (it) => (it.kind === 'wear' ? HERO.thumb(it.id, state.look) : it.kind === 'clothes' ? HERO.clothes(it.id, HERO.norm(state.look)) : it.kind === 'yard' ? YARD.thumb(it.id) : it.kind === 'house' ? `<svg class="house-thumb" viewBox="0 0 140 130" aria-hidden="true">${HOUSE_ART[it.id]}</svg>` : it.kind === 'record' ? MUSIC.sleeve(MUSIC.RECORDS.find((r) => r.id === it.id)) : DECOR.thumb(it.id));
// something new got (test, 2026-11-09: the user wanted a close-up and effects): the screen dims, the thing comes up big in the
// middle on a turning burst of light with sparkles, 「獲得」 and its name and where it went; a tap (or 3.2 s) and it is gone
function gotItem(id, where, then) {
  const it = WARE.get(id); if (!it) { if (then) then(); return; }
  document.querySelectorAll('.got').forEach((g) => g.remove());
  const el = document.createElement('div'); el.className = 'got'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `獲得${it.name}`);
  el.innerHTML = `<div class="got-burst" aria-hidden="true"></div><div class="got-art">${wareArt(it)}</div>
    ${[[-120, -90, 0], [130, -70, 0.3], [-90, 80, 0.6], [110, 100, 0.15], [0, -150, 0.45], [-160, 10, 0.75], [160, 20, 0.9]].map(([x, y, d]) => `<i class="got-spark" style="--x:${x}px;--y:${y}px;--w:${d}s"></i>`).join('')}
    <div class="got-text"><span>獲得</span><b>${esc(it.name)}</b>${where ? `<small>${esc(where)}</small>` : ''}</div>`;
  document.body.appendChild(el); fitThumbs(el);
  playSfx('up');
  let gone = false; const close = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 260); if (then) then(); };
  el.addEventListener('click', close); setTimeout(close, 3200);
}
const forSale = (it) => !it.limited || salePreview(it.limited) || saleOn(it.limited, saleNow());   // in the shop now (a limited one: by the server's day, when known)
// a limited ware is bought only on a day the server says its sale is on (asked again when the answer is old)
function saleCheck(it, go) {
  if (!it.limited || salePreview(it.limited)) { go(); return; }
  saleClock().then((day) => { if (saleOn(it.limited, day)) go(); else { toast(day ? '這個限時商品已經下架了' : '限時商品要連上網路才買得到'); route(); } });
}
const mdText = (md) => md.split('-').map(Number).join('/');
function saleHtml(day, live, grid) {   // 限時: the sales on now with their wares, or when the next one is
  if (!live.length) {
    if (!day) return `<p class="shop-note">${saleDay.failed ? '限時商品要連上網路才看得到。' : '查看中…'}</p>`;
    const next = Object.keys(SALES).map((k) => [k, nextSpan(k, day)]).sort((a, b) => (a[1][0] < b[1][0] ? -1 : 1));   // the soonest first
    return `<p class="shop-note">現在沒有限時商品。下一檔：${next.map(([k, sp]) => `${SALES[k].name} ${mdText(sp[0].slice(5))}–${mdText(sp[1].slice(5))}`).join('、')}</p>`;
  }
  return live.map((k) => {
    const x = SALES[k], sp = saleSpan(k, day || todayStr()), left = day ? Math.round((Date.parse(sp[1]) - Date.parse(day)) / 86400000) : null;
    const when = left === null || !saleOn(k, day) ? '測試預覽' : left > 0 ? `還有 ${left} 天` : '今天最後一天';
    return `<section class="shop-sec"><h2 class="shop-h">${x.name}限定 · 賣到 ${mdText(sp[1].slice(5))}（${when}）</h2>${grid(WARES.filter((it) => it.limited === k))}</section>`;
  }).join('');
}
const styleKey = (it) => STYLE_OF[it.slot], styleOn = (it) => HERO.norm(state.look)[styleKey(it)] === it.id;
const partName = (slot) => (WEAR_SLOTS.find(([s]) => s === slot) || [slot, ''])[1];   // 頭部, 衣服, 鞋子…: the wardrobe's tab for a part
// a hat over what sits on top of their head (呆毛, 丸子, 雙丸子): it is tucked away while the hat is on (1.2.1)
function hatSwapNote(id, look) {
  const t = HERO.tucked(look, id);
  return t ? `戴著時${t}會收進帽子裡。` : '';
}
function shopCardHtml(it, bal) {
  const owned = owns(it.id), short = it.price - bal, swap = it.kind === 'wear' ? hatSwapNote(it.id, state.look) : '';
  let act;
  if (owned && it.kind === 'wear') act = `<button type="button" class="btn btn-sm" data-act="ware-wear" data-id="${it.id}">${state.wear[it.slot] === it.id ? '脫下' : '穿上'}</button>`;
  else if (owned && it.kind === 'clothes') act = `<button type="button" class="btn btn-sm" data-act="clothes-wear" data-id="${it.id}">${styleOn(it) ? '脫下' : '換上'}</button>`;
  else if (owned && it.kind === 'house') act = `<button type="button" class="btn btn-sm" data-act="house-wear" data-id="${it.id}">${state.house === it.id ? '換回小屋' : '換上'}</button>`;
  else if (owned) act = `<span class="chip">${it.kind === 'record' ? '在留聲機' : state.placed[it.id] ? (it.kind === 'yard' ? '在院子' : '在書房') : '在收納箱'}</span>`;
  else if (short > 0) act = `<button type="button" class="btn btn-sm btn-muted" data-act="ware-short" aria-disabled="true">還差 ${short}</button>`;
  else act = `<button type="button" class="btn btn-sm btn-primary" data-act="ware-buy" data-id="${it.id}">買下</button>`;
  const art = wareArt(it);
  // 2026-11-10 (the user: by the pictures, less to scroll): a small tile — the picture (a tap: the ware big, ware-peek), the
  // name, the price and its button; its words show in the big view
  return `<div class="card shop-item${owned ? ' owned' : ''}" data-ware="${it.id}"><button type="button" class="art" data-act="ware-peek" data-id="${it.id}" aria-label="${esc(it.name)}：看看">${art}</button><div class="nm">${esc(it.name)}</div><div class="ds">${esc(it.desc)}</div>${swap ? `<div class="ds swap">${swap}</div>` : ''}
    <div class="buy">${owned ? '<span class="price owned">已擁有</span>' : `<span class="price">${kotoIcon()}${it.price}</span>`}${act}</div></div>`;
}
function warePeek(id) {   // a ware big: its picture, its words, the tile's own buttons
  const it = WARE.get(id); if (!it) return;
  openModal(it.name, `<div class="ware-peek">${shopCardHtml(it, kotoBalance()).replace('class="card shop-item', 'class="shop-item big')}</div>`, { width: 380, noFocus: true });
  fitThumbs(document.getElementById('modalBody'));
}
const SOON = '<div class="card shop-item soon"><div class="art"><svg viewBox="0 0 80 80"><g fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="2" stroke-linejoin="round"><path d="M16 34 L40 24 L64 34 L40 44 Z"/><path d="M16 34 V56 L40 66 V44 M64 34 V56 L40 66"/></g></svg></div><div class="nm">福爺還在找</div><div class="ds">之後會有更多老東西。</div></div>';   // the last card of 穿搭 (under 背部)
function shopScrollTo(view, k) {   // a part's section, just under the tabs held up top
  const s = view.querySelector(`.shop-sec[data-sec="${k}"]`), tabs = view.querySelector('.shop-tabs'); if (!s || !tabs) return;
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(tabs).top) || 0) - tabs.offsetHeight - 6);
}
function renderShop(view) {
  const bal = kotoBalance(), night = sceneClock(lightHour()).day < 0.5;
  const day = saleNow(), live = Object.keys(SALES).filter((k) => salePreview(k) || saleOn(k, day));
  const grid = (list, extra = '') => `<div class="shop-grid">${list.map((it) => shopCardHtml(it, bal)).join('')}${extra}</div>`;
  if (!day && !saleDay.ask && !saleDay.failed) saleClock().then(() => { if (location.hash === '#/shop') route(); });   // the server's day: the 限時 dot, its wares
  document.getElementById('topTitle').textContent = '古道具屋';
  view.innerHTML = `<div class="shop-front"><i class="beam"></i><div class="noren"><i><b>古</b></i><i><b>道</b></i><i><b>具</b></i></div><i class="lantern"><i></i><i></i></i>
      <button type="button" class="fuku" data-act="fuku-talk" aria-label="福爺">${fukuSvg()}</button><div class="fuku-say" aria-live="polite">${fukuLine(night ? 'night' : 'hello')}</div>
      <div class="counter"></div><div class="purse">${kotoIcon()}言靈 <b>${bal}</b></div></div>
    <div class="page-head shop-head"><div><div class="page-title">古道具屋</div><div class="page-sub">山上的老店，老闆福爺不收錢，只收言靈。</div></div></div>
    <div class="shop-tabs" role="tablist">${SHOP_TABS.map(([k, name]) => `<button type="button" role="tab" data-act="shop-tab" data-tab="${k}" aria-selected="${shopTab === k}">${name}${k === 'sale' && live.length ? '<i class="dot" aria-label="特賣中"></i>' : ''}</button>`).join('')}</div>
    ${shopTab === 'sale' ? saleHtml(day, live, grid) : SHOP_TABS.find(([k]) => k === shopTab)[2].map(([k, name], i, all) => `<section class="shop-sec" data-sec="${k}"><h2 class="shop-h">${name}</h2>${grid(WARES.filter((it) => inSec(it, k) && !it.starter && !it.limited && !it.gift), shopTab === 'wear' && i === all.length - 1 ? SOON : '')}</section>`).join('')}
    ${onTestSite() && shopTab === 'sale' ? `<div class="row-wrap mt-4">${Object.keys(SALES).map((k) => `<button type="button" class="btn btn-sm" data-act="sale-preview" data-k="${k}" aria-pressed="${salePreview(k)}">測試用：預覽${SALES[k].name}</button>`).join('')}<button type="button" class="btn btn-sm" data-act="sale-preview" data-k="0">照日期來</button></div>` : ''}
    ${onTestSite() ? '<div class="row-wrap mt-4"><button type="button" class="btn btn-sm" data-act="koto-gift">測試用：+100 言靈</button><button type="button" class="btn btn-sm" data-act="koto-gift" data-n="1000">測試用：+1000 言靈</button><button type="button" class="btn btn-sm" data-act="witch-again">測試用：巫婆／聖誕老公公再飛一次</button></div>' : ''}
    <svg class="defs-only" width="0" height="0" aria-hidden="true">${DECOR.DEFS}</svg>`;
  fitThumbs(view);
  if (shopFocus) { const k = shopFocus; shopFocus = ''; requestAnimationFrame(() => shopScrollTo(view, k)); }
}
// the dressing room (1.2.0): 書房's 衣櫃 button zooms in on the hero to choose how they look (HERO.OPTS) and what they wear.
// A copy of them flies from where they stand to the stage — their head for the face's tabs, all of them for clothes — while the
// room grows round them and dims; a choice is tried on at once. 完成 keeps it all (state.look, state.wear), 取消 or Esc puts it
// back; either way the copy flies back to its place and the room zooms out.
const DRESS = (() => {
  // test (2026-11-09): two of them — the wardrobe (the button up top, the wardrobe in the bedroom) for what is worn, the full-length
  // mirror for the face, the hair and the features (the beard among them). The wardrobe's tabs are the hero's seven parts
  // (2026-11-12, the user: 衣服 and 穿戴 split up; WEAR_SLOTS), all of them in sight
  const MODES = { wear: { title: '衣櫃', tabs: WEAR_SLOTS.map(([slot, name]) => [slot, name, 'body']) }, mirror: { title: '全身鏡', tabs: [['face', '臉型', 'head'], ['hair', '髮型', 'head'], ['features', '五官', 'head']] } };
  let d = null;   // open: { st, mode, look, wear, tab, back, from }
  const TABS_OF = () => MODES[d.mode].tabs;
  const box = () => (d && d.st.isConnected ? d.st.querySelector('.dress') : null);
  const kind = () => TABS_OF().find((t) => t[0] === d.tab)[2];
  const put = (cp, f) => { cp.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) scale(${f.s.toFixed(4)})`; };
  // where the copy's 120 × 210 box goes: the part asked for, framed in the stage (over the panel, or beside it on a wide screen)
  function frame(dr, part) {
    const p = dr.querySelector('.dress-panel'), side = p.offsetLeft > 0, W = dr.clientWidth, H = dr.clientHeight;
    const x0 = 0, y0 = 58, x1 = side ? p.offsetLeft : W, y1 = side ? H - 12 : p.offsetTop - 8;
    const top = HERO.headTop(d && d.wear.head);   // what is on the head can stand above the hair (a hat's top, a pompom, a wizard's tip)
    const [a0, b0, a1, b1] = part === 'head' ? [-54, top, 58, -56] : [-48, top + 2, 52, 8];
    const s = Math.min((x1 - x0) * (part === 'head' ? 0.78 : 0.86) / (a1 - a0), (y1 - y0) * 0.9 / (b1 - b0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    dr.style.setProperty('--spx', `${cx}px`); dr.style.setProperty('--spy', `${cy}px`);
    return { s, x: cx - ((a0 + a1) / 2 + 60) * s, y: cy - ((b0 + b1) / 2 + 200) * s };
  }
  const tabs = () => TABS_OF().map(([id, name]) => `<button type="button" role="tab" data-act="dress-tab" data-tab="${id}" aria-pressed="${d.tab === id}">${name}</button>`).join('');
  // a part's styles, each drawn on the hero as they look now; a part's colours
  const opts = (key, crop) => `<div class="dress-opts">${HERO.OPTS[key].map(([v, name]) => `<button type="button" class="dress-opt" data-act="dress-pick" data-key="${key}" data-val="${v}" aria-pressed="${d.look[key] === v}">${HERO.head(Object.assign({}, d.look, { [key]: v }), crop)}<span>${name}</span></button>`).join('')}</div>`;
  const sws = (key) => `<div class="dress-sws">${HERO.OPTS[key].map(([v, name]) => `<button type="button" class="dress-sw" data-act="dress-pick" data-key="${key}" data-val="${v}" style="--c:${v}" aria-pressed="${d.look[key] === v}" aria-label="${name}" title="${name}"></button>`).join('')}</div>`;
  const sec = (title, inner) => `<section class="dress-sec"><h3>${title}</h3>${inner}</section>`;
  const HAIR4 = ['fringe', 'sides', 'hairBack', 'hairTop'];
  // what the copy does not show because of what is on the head: a whole head hides the face and hair (the face's tabs); a hat that
  // cannot sit on their hairstyle wears its own (髮型, the wardrobe's 頭部)
  function note() {
    const it = d.wear.head && WARE.get(d.wear.head); if (!it) return '';
    const swap = hatSwapNote(it.id, d.look);
    const say = HERO.whole(it.id) ? (kind() === 'head' ? `戴著${it.name}，看不到臉和頭髮。` : '') : swap && (d.tab === 'hair' || (d.mode === 'wear' && d.tab === 'head')) ? it.name + swap : '';
    return say ? `<p class="dress-note">${esc(say)}</p>` : '';
  }
  // the styles of tops, trousers and shoes they have (帽T, 長褲 and every shoe not sold — 球鞋, 短靴, 皮鞋 — and what was bought), each
  // on the hero in their colours
  const have = (key, v) => v === HERO.LOOK0[key] || owns(v) || (key === 'shoeStyle' && !WARE.has(v));
  const styles = (key) => `<div class="dress-opts">${HERO.OPTS[key].filter(([v]) => have(key, v)).map(([v, name]) => `<button type="button" class="dress-opt" data-act="dress-pick" data-key="${key}" data-val="${v}" aria-pressed="${d.look[key] === v}">${HERO.clothes(v, d.look)}<span>${name}</span></button>`).join('')}</div>`;
  function body() { return note() + (d.mode === 'wear' ? part(d.tab) : parts()); }
  function parts() {
    if (d.tab === 'face') return sec('臉型', opts('face', 'head')) + sec('膚色', sws('skin')) + sec('臉頰', opts('cheeks', 'face'));
    if (d.tab === 'hair') return sec('瀏海', opts('fringe', 'head')) + sec('兩側', opts('sides', 'bust')) + sec('後面', opts('hairBack', 'back')) + sec('造型', opts('hairTop', 'back')) + sec('髮色', sws('hairColor'));   // 1.2.1: hair in parts
    return sec('眼睛', opts('eyes', 'face')) + sec('眼睛顏色', sws('eyeColor')) + sec('眉毛', opts('brows', 'face')) + sec('嘴巴', opts('mouth', 'face')) + sec('鬍子', opts('beard', 'face'));
  }
  // one of the wardrobe's parts (2026-11-12, the user): for 衣服, 褲子 and 鞋子 the styles they have and the colours (the part's own
  // palette, its key the part's); for the others what was bought at 古道具屋 for it, a tap putting it on or taking it off. Then
  // 古道具屋's that part, when it has more (a limited one only while its sale is on)
  function part(slot) {
    const name = partName(slot), sold = WARES.filter((it) => (it.kind === 'wear' || it.kind === 'clothes') && it.slot === slot && !it.gift && forSale(it));
    const more = sold.filter((it) => !owns(it.id)).length, nudge = more ? `<p class="dress-more">古道具屋的「${name}」還有 ${more} 樣<button type="button" class="btn btn-sm" data-act="dress-shop">去看看</button></p>` : '';
    if (STYLE_OF[slot]) return sec('款式', styles(STYLE_OF[slot])) + sec('顏色', sws(slot)) + nudge;
    const got = WARES.filter((it) => it.kind === 'wear' && it.slot === slot && owns(it.id));
    if (!got.length) return `<p class="muted mt-3">還沒有${name}的東西。${sold.length ? `古道具屋的「${name}」有${sold.slice(0, 3).map((it) => esc(it.name)).join('、')}……` : ''}</p><div class="row-wrap mt-3"><button type="button" class="btn btn-sm" data-act="dress-shop">去古道具屋</button></div>`;
    return `<div class="dress-wear"><div class="list">${got.map((it) => `<button type="button" class="wr-it${d.wear[slot] === it.id ? ' on' : ''}" data-act="dress-wear" data-id="${it.id}" aria-pressed="${d.wear[slot] === it.id}">${HERO.thumb(it.id, d.look)}<span>${esc(it.name)}</span></button>`).join('')}</div></div>${nudge}`;
  }
  const copy = () => HERO.svg({ look: d.look, wear: d.wear });
  function open(st, mode = 'wear', title = '') {   // title: the thing it opened from (a mirror's own name)
    if (!st || (d && box())) return;
    st.querySelectorAll('.dress').forEach((x) => x.remove()); st.classList.remove('undressing');   // one still flying back
    const yard = st.classList.contains('yard');   // 1.2.0: out in the yard too, the sky and the lawn grow round the hero there
    if (yard) yHeroHold(st); else ROOM.hold();
    const hel = st.querySelector(yard ? '.yhero' : '.room .hero'), sr = st.getBoundingClientRect(), hr = hel && hel.getBoundingClientRect();
    const from = hr && hr.width ? { x: hr.left - sr.left, y: hr.top - sr.top, s: hr.width / 120 } : { x: sr.width / 2 - 30, y: sr.height / 2 - 52, s: 0.5 };
    d = { st, mode: MODES[mode] ? mode : 'wear', look: HERO.norm(state.look), wear: Object.assign({}, state.wear), back: false, from, title: title || MODES[mode in MODES ? mode : 'wear'].title }; d.tab = TABS_OF()[0][0];
    const zr = yard ? st.querySelector('.sky').getBoundingClientRect() : sr;   // what grows: 書房's room, the yard's sky (on the whole screen)
    st.style.setProperty('--zx', `${(from.x + 60 * from.s + sr.left - zr.left).toFixed(1)}px`); st.style.setProperty('--zy', `${(from.y + 150 * from.s + sr.top - zr.top).toFixed(1)}px`);
    st.insertAdjacentHTML('beforeend', `<div class="dress" role="dialog" aria-modal="true" aria-label="打扮">
      <i class="dress-dim"></i>
      <div class="hero dress-hero" data-act="dress-turn" aria-label="主角（點一下轉身）">${copy()}</div>
      <div class="dress-bar"><button type="button" data-act="dress-cancel">取消</button><span class="t">${esc(d.title)}</span><button type="button" class="ok" data-act="dress-done">完成</button></div>
      <div class="dress-tools"><button type="button" data-act="dress-random" aria-label="隨機" title="隨機">${icon('dice')}</button><button type="button" data-act="dress-turn" aria-label="轉身" title="轉身">${icon('turn')}</button></div>
      <div class="dress-panel"><div class="dress-tabs${TABS_OF().length > 4 ? ' many' : ''}" role="tablist">${tabs()}</div><div class="dress-body">${body()}</div></div>
    </div>`);
    const dr = box(), cp = dr.querySelector('.dress-hero');
    put(cp, from); void dr.offsetWidth;   // the copy starts where they stand
    st.classList.add('dressing'); dr.classList.add('on'); cp.classList.add('fly'); put(cp, frame(dr, kind()));
    window.addEventListener('resize', reframe);
  }
  function reframe() { const dr = box(); if (dr) put(dr.querySelector('.dress-hero'), frame(dr, kind())); }
  function redraw(hop) {   // the copy and the panel (the list keeps its place)
    const dr = box(); if (!dr) return;
    const cp = dr.querySelector('.dress-hero'), b = dr.querySelector('.dress-body'), top = b.scrollTop;
    cp.innerHTML = copy(); b.innerHTML = body(); b.scrollTop = top;
    if (hop && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { cp.classList.remove('hop'); void cp.offsetWidth; cp.classList.add('hop'); clearTimeout(cp._hop); cp._hop = setTimeout(() => cp.classList.remove('hop'), 520); }
  }
  function tab(id) {
    if (!box() || !TABS_OF().some((t) => t[0] === id)) return;
    d.tab = id;
    const dr = box(); dr.querySelectorAll('.dress-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === id)));
    const b = dr.querySelector('.dress-body'); b.innerHTML = body(); b.scrollTop = 0;
    reframe();
  }
  function pick(key, val) {
    if (!box() || !HERO.OPTS[key] || !HERO.OPTS[key].some(([v]) => v === val) || (Object.values(STYLE_OF).includes(key) && !have(key, val))) return;
    d.look[key] = val; redraw(true);
  }
  function wear(id) { const it = WARE.get(id); if (!box() || !it || it.kind !== 'wear' || !owns(id)) return; d.wear[it.slot] = d.wear[it.slot] === id ? null : id; redraw(true); reframe(); }
  // the mirror: a whole new face and hair — one of the whole hairstyles, so the parts go together (most rolls without a beard);
  // the wardrobe: clothes they have, in any colours (what they wear on the head and so on stays)
  function random() {
    if (!box()) return;
    const any = (k) => { const o = HERO.OPTS[k]; return o[Math.floor(Math.random() * o.length)][0]; };
    if (d.mode === 'wear') {
      ['topStyle', 'bottomStyle', 'shoeStyle'].forEach((k) => { const o = HERO.OPTS[k].filter(([v]) => have(k, v)); d.look[k] = o[Math.floor(Math.random() * o.length)][0]; });
      ['top', 'bottom', 'shoe'].forEach((k) => { d.look[k] = any(k); });
      redraw(true); return;
    }
    ['face', 'skin', 'cheeks', 'hairColor', 'eyes', 'eyeColor', 'brows', 'mouth'].forEach((k) => { d.look[k] = any(k); });
    const st = HERO.STYLES[Math.floor(Math.random() * HERO.STYLES.length)]; HAIR4.forEach((k, j) => { d.look[k] = st[j + 1]; });
    d.look.beard = Math.random() < 0.65 ? 'none' : any('beard');
    redraw(true);
  }
  function turn() { const dr = box(); if (!dr) return; d.view = ((d.view || 0) + 1) % 4; const h = dr.querySelector('.dress-hero'); h.classList.toggle('turn', d.view % 2 === 1); h.classList.toggle('back', d.view >= 2); }   // facing us, turned, from behind, turned from behind
  function close(save) {
    const dr = box(); if (!d) return;
    const { st, from } = d;
    if (save) { state.look = Object.assign({}, d.look); state.wear = Object.assign({}, d.wear); saveState(); if (st.classList.contains('yard')) yHeroRedraw(st); else ROOM.heroRedraw(st); }
    d = null; window.removeEventListener('resize', reframe);
    if (!dr) return;
    const cp = dr.querySelector('.dress-hero'); cp.classList.remove('back');
    st.classList.add('undressing'); st.classList.remove('dressing'); dr.classList.remove('on'); put(cp, from);   // back to where they stand
    setTimeout(() => { dr.remove(); st.classList.remove('undressing'); }, 520);
  }
  function shop() {   // off to buy something: what was chosen is kept; 古道具屋 opens at 穿搭, at the part they were on
    if (!d) return; if (!shopOpen()) { shopShut(); return; }
    state.look = Object.assign({}, d.look); state.wear = Object.assign({}, d.wear); saveState();
    if (d.mode === 'wear') { shopTab = 'wear'; shopFocus = d.tab; try { localStorage.setItem('nq_shop_tab', shopTab); } catch (e) { /* no storage */ } }
    d = null; window.removeEventListener('resize', reframe); go('#/shop');
  }
  return { open, close, tab, pick, wear, random, turn, shop };
})();
// a purchase: paid once, then put away (1.2.0): a thing into the storage box, to be set out in 擺設; a wear into the wardrobe
function buyWare(it) {
  state.owned[it.id] = { paid: it.price, on: todayStr() }; SND.play('coins');
  if (it.kind === 'house') state.house = it.id;   // the yard's house becomes it at once
  saveState();
  return it.kind === 'house' ? '，院子的房子換好了' : it.kind === 'record' ? '放在留聲機旁了，點書房的留聲機就能換上' : it.kind === 'wear' ? `收進衣櫃了，按書房右上角的衣櫃，在「${partName(it.slot)}」穿上` : it.kind === 'clothes' ? `收進衣櫃了，按書房右上角的衣櫃，在「${partName(it.slot)}」換上` : it.kind === 'yard' ? '收在院子的收納箱，到院子按「擺設」拿出來擺' : '收在收納箱，到書房按「擺設」拿出來擺';
}
Object.assign(ACTIONS, {
  'room-edit': (el) => ROOM.edit(el, 'on'),
  'ware-use': (el) => ROOM.useWare(el),
  'nap-to': (el) => NAP.to(Number(el.dataset.h)),
  'music-rec': (el) => MUSIC.put(el.dataset.id),
  'music-stop': () => MUSIC.pause(),
  'lamp-toggle': (el) => { const id = el.dataset.lamp; if (lampOff(id)) delete state.lampsOff[id]; else state.lampsOff[id] = true; SND.play('switch'); saveState(); route(); },
  'room-edit-done': (el) => ROOM.edit(el, 'done'),
  'room-edit-take': (el) => ROOM.edit(el, 'take', el.dataset.id),
  'room-edit-turn': (el) => ROOM.edit(el, 'turn'),
  'room-edit-put': (el) => ROOM.edit(el, 'put'),
  'fuku-talk': () => fukuSay('idle'),
  'ware-short': () => fukuSay('short'),
  'ware-peek': (el) => { if (!el.closest('.ware-peek')) warePeek(el.dataset.id); },
  'ware-buy': (el) => {
    const it = WARE.get(el.dataset.id);
    if (!it || owns(it.id) || it.gift) return;
    if (kotoBalance() < it.price) { fukuSay('short'); return; }
    saleCheck(it, () => openModal(`買下${it.name}？`, `<p>用 <b>${it.price}</b> 言靈買下「${esc(it.name)}」。${it.kind === 'wear' ? `買了之後按書房右上角的衣櫃，在「${partName(it.slot)}」穿上或脫下。` : it.kind === 'clothes' ? `買了之後按書房右上角的衣櫃，在「${partName(it.slot)}」換上，顏色照你配的。` : it.kind === 'house' ? '買了院子的房子馬上換成它；想換回原本的小屋，在這張卡片上切換。' : it.kind === 'yard' ? '買了會先收在院子的收納箱，到院子按「擺設」拿出來擺。' : it.kind === 'record' ? '買了之後點書房的留聲機就能換上這張唱片。' : '買了會先收在收納箱，到書房按「擺設」拿出來擺。'}</p>
      <div class="row-wrap mt-3"><button type="button" class="btn btn-primary" data-act="ware-buy-ok" data-id="${it.id}">買下</button><button type="button" class="btn" data-act="close-modal">再想想</button></div>`, { width: 380 }));
  },
  'ware-buy-ok': (el) => {
    const it = WARE.get(el.dataset.id);
    closeModal();
    if (!it || owns(it.id) || kotoBalance() < it.price) return;
    saleCheck(it, () => { const where = buyWare(it); route(); fukuSay('thanks'); gotItem(it.id, where.replace(/^，/, '')); });   // a close-up of it (test)
  },
  'ware-wear': (el) => {
    const it = WARE.get(el.dataset.id);
    if (!it || !owns(it.id) || it.kind !== 'wear') return;
    state.wear[it.slot] = state.wear[it.slot] === it.id ? null : it.id;
    saveState(); route();
  },
  'house-wear': (el) => {   // 古道具屋's card: the yard's house in this look, or back to the cottage
    const it = WARE.get(el.dataset.id);
    if (!it || !owns(it.id) || it.kind !== 'house') return;
    state.house = state.house === it.id ? '' : it.id; saveState(); route();
  },
  'clothes-wear': (el) => {   // 古道具屋's card: on, or back to everyone's 帽T／長褲／球鞋
    const it = WARE.get(el.dataset.id);
    if (!it || !owns(it.id) || it.kind !== 'clothes') return;
    state.look = Object.assign({}, state.look, { [styleKey(it)]: styleOn(it) ? HERO.LOOK0[styleKey(it)] : it.id });
    saveState(); route();
  },
  wardrobe: (el) => DRESS.open(el.closest('.study, .yard')),   // the dressing room (1.2.0), in 書房 or out in the yard
  'dress-tab': (el) => DRESS.tab(el.dataset.tab),
  'dress-pick': (el) => DRESS.pick(el.dataset.key, el.dataset.val),
  'dress-wear': (el) => DRESS.wear(el.dataset.id),
  'dress-random': () => DRESS.random(),
  'dress-turn': () => DRESS.turn(),
  'dress-done': () => DRESS.close(true),
  'dress-cancel': () => DRESS.close(false),
  'dress-shop': () => DRESS.shop(),
  'hero-hop': (el) => ROOM.tapHero(el),
  'shop-tab': (el) => {
    shopTab = el.dataset.tab; try { localStorage.setItem('nq_shop_tab', shopTab); } catch (e) { /* no storage */ }
    if (shopTab === 'sale' && saleDay.failed) saleDay.failed = false;   // asked again: perhaps back online
    route();
  },
  'sale-preview': (el) => { try { localStorage.setItem('nq_sale_preview', (el && el.dataset.k) || '0'); } catch (e) { /* no storage */ } route(); },   // test site: one festival as if on (2026-11-14: each its own), or by the day
  'yard-edit': (el) => yardEdit(el.closest('.yard'), 'on'),
  'yard-edit-done': (el) => yardEdit(el.closest('.yard'), 'done'),
  'yard-edit-take': (el) => yardEdit(el.closest('.yard'), 'take', el.dataset.id),
  'yard-house': (el) => yardEdit(el.closest('.yard'), 'house', el.dataset.id),
  'yard-edit-put': (el) => yardEdit(el.closest('.yard'), 'put'),
  'yard-ware': (el) => { const y = el.closest('.yard'); if (y && y._noClick) return; if (yed.on) yardEdit(y, 'pick', el.dataset.ware); else yardUse(y, el.dataset.ware); },
  'koto-gift': (el) => { const n = Number(el && el.dataset.n) || 100; state.koto.gift = (Number(state.koto.gift) || 0) + n; saveState(); route(); toast(`測試用：多了 ${n} 言靈`); },
  'witch-again': () => {   // test site (1.2.2): the Halloween witch (and Santa, 2026-11-14) fly again, their 100 言靈 with them
    Object.keys(state.koto.found).filter((k) => k.startsWith('witch-') || k.startsWith('santa-')).forEach((k) => { delete state.koto.found[k]; });
    saveState(); route(); toast('測試用：巫婆和聖誕老公公會再飛出來（晚上的院子，那個節日預覽或期間內）');
  }
});

// walking in or out of the house: a short zoom, then the other scene (straight there with motion reduced)
function sceneGo(hash, cls) {
  const box = document.querySelector('#view .yard, #view .study');
  if (!box || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { go(hash); return; }
  if (box.classList.contains('yard')) { cancelAnimationFrame(ycoast); box.style.setProperty('--ycx', `${(-ycam.x * ycam.z).toFixed(1)}px`); }   // the door where the camera has it (a glide stopped there)
  box.classList.add(cls); setTimeout(() => go(hash), 380);
}
// the dive: the notebook flares, its light spreads over the screen, and the questions come up as it fades. A brand-new learner
// picks a start first; nothing to do, or motion reduced: straight in.
let diveBusy = false;
function diveInto(el) {
  if (diveBusy) return;
  if (!state.startChosen && Object.keys(state.srs).length === 0) {
    openModal('要從哪裡開始？', `<div class="row-wrap">${startButtonsHtml(false)}</div><p class="small muted mt-2">我是新手：從假名開始。我學過一些：做個小測驗，找到你的起點。</p>`, { width: 420 });
    return;
  }
  const n = (dailyPlan().remaining === 0 ? extraQueue() : dailyQueue()).items.length;
  if (!n || !el || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { startSession('daily'); return; }
  diveBusy = true; ROOM.mark('notebook');
  const st = el.closest('.study'); if (st) st.classList.add('diving');
  const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const d = 2 * Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.62;   // its opaque part reaches the farthest corner
  const veil = document.createElement('div'); veil.className = 'dive-veil';
  veil.style.cssText = `left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px`;
  document.body.appendChild(veil);
  setTimeout(() => veil.classList.add('cover'), 140);
  setTimeout(() => { startSession('daily'); veil.classList.add('out'); }, 520);
  setTimeout(() => { veil.remove(); diveBusy = false; }, 900);
}

// The topics the next daily set touches: vocabulary themes (the active pair when new words are in, otherwise the themes most of
// the review words belong to) and the grammar points of its grammar questions, new ones first.
function sessionTopicsHtml(q) {
  const words = q.items.filter(it => it.kind === 'v');
  const present = new Set(words.map(vocabTheme));
  const all = [...present].sort((a, b) => themeRank(a) - themeRank(b));
  const themes = all.slice(0, 3); if (all.length > 3) themes.push(`等 ${all.length} 個`);
  const vocabText = themes.length ? themes.join('・') : '今天的單字已完成';   // the line is always there: a finished day just says so
  const gItems = q.items.filter(it => it.kind === 'g');
  const pts = [];
  gItems.filter(it => !state.srs[it.key]).concat(gItems.filter(it => state.srs[it.key])).forEach(g => { if (g.pt && !pts.includes(g.pt)) pts.push(g.pt); });
  const shown = pts.slice(0, 5); if (pts.length > 5) shown.push(`等 ${pts.length} 個考點`);
  return `<div class="plan-topics">
      <span><b>單字主題</b>${esc(vocabText)}</span>
      ${shown.length ? `<span><b>文法</b>${esc(shown.join('・'))}</span>` : ''}
    </div>`;
}
function planNoteHtml(plan) { return plan.note ? `<div class="plan-note">${esc(plan.note)}</div>` : ''; }
// 學習分析's head (1.1.0): a strip of 書房's cork board with the papers pinned on it there (a chart, a sticky note, a photo)
function corkStripHtml() {
  return `<div class="cork-strip" aria-hidden="true">
    <span class="pinned chart"><svg viewBox="0 0 54 38"><path d="M6 34V20M17 34V12M28 34V24M39 34V8" stroke="#4a5fcf" stroke-width="6"/><path d="M3 22L17 10L30 18L50 4" stroke="#d9534f" stroke-width="2" fill="none"/></svg></span>
    <span class="pinned sticky"><i></i><i></i><i></i></span>
    <span class="pinned photo"><i></i></span>
  </div>`;
}
// 學習分析's first card (1.1.0; it was the 今日 card's date line and its 說明 and 範圍 folds): the date and the streak, what is
// left of today's list — the next set's themes and grammar points, then the counts — the day's note, and 說明 (folded)
function todayCardHtml() {
  const t = todayStr(), d = parseDate(t), st = streakStats(), plan = dailyPlan();
  let body;
  if (plan.remaining === 0) body = `<p class="small muted">今天的題目做完了${itemsDoneToday() ? `，共 ${itemsDoneToday()} 題` : ''}。${extraQueue().items.length ? '想再練，點書桌上的筆記本「多學」。' : ''}</p>`;
  else {
    const reviewN = plan.dueV.length + plan.dueG.length + (plan.dueC || []).length + plan.q4.length + plan.q5.length;
    const newN = plan.newV.length + plan.newG.length + (plan.newC || []).length;
    const exA = (plan.dueA || []).length + (plan.newA || []).length, exK = plan.dueK.length + plan.newK.length;
    const exL = Math.min(plan.dueL.length + plan.newL.length, LISTEN_PER_DAY), exR = Math.min(1, plan.dueR.length + plan.newR.length);
    const extraN = exA + exK + exL + exR;
    const extraText = [exA && `假名 ${exA}`, exK && `漢字 ${exK}`, exL && `聽力 ${exL}`, exR && `閱讀 ${exR}`].filter(Boolean).join('・');
    body = `${sessionTopicsHtml(dailyQueue(SESSION_SIZE))}
      <div class="plan-line">
        <span>待複習 <b>${reviewN}</b>（單字 ${plan.dueV.length}・文法 ${plan.dueG.length}${plan.dueC && plan.dueC.length ? `・變化 ${plan.dueC.length}` : ''}${[['四顆', plan.q4], ['五顆', plan.q5]].map(([name, l]) => (l.length ? `・${name} ${l.length}` : '')).join('')}${plan.relearnN ? `・其中錯題 ${plan.relearnN}` : ''}）</span>
        <span>新內容 <b>${newN}</b>（單字 ${plan.newV.length}・文法 ${plan.newG.length}${plan.newC && plan.newC.length ? `・變化 ${plan.newC.length}` : ''}）</span>
        ${extraN ? `<span>另有 <b>${extraN}</b>（${extraText}）</span>` : ''}
        <span>共 <b>${plan.remaining}</b> 題</span>
      </div>`;
  }
  return `<div class="card day-card">
    <div class="card-head"><div><div class="card-title">今天</div><div class="card-sub">${d.getMonth() + 1} 月 ${d.getDate()} 日（${weekdayZh(t)}）・連續 ${st.current} 天</div></div></div>
    ${body}
    ${planNoteHtml(plan)}
    <details class="day-help"><summary>說明</summary><p class="small muted">每天練一點就好。這裡用的是 SRS（間隔重複）的改良版：在你快忘記的時候再考一次，記得會更久。答對越多，每天的新題目就會越多；想學快一點，做完後按「多學」就好。</p></details>
  </div>`;
}

// 學習紀錄 (學習分析): the calendar, streak tiles and the recent days
function historyCardHtml() {
  const st = streakStats();
  return `
    <div class="card">
      <div class="card-head">
        <div class="card-title">學習紀錄</div>
        <div class="legend">少 <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> 多</div>
      </div>
      <div class="heat-row">
        <div style="min-width:0;max-width:100%">
          ${heatmapHtml()}
          <div class="small muted mt-2" id="heatInfo">點一下方格可以看那天的數據。</div>
        </div>
        <div class="grid grid-2 heat-stats">
          <div class="stat"><span class="stat-v">${st.current}</span><span class="stat-l">目前連續天數</span></div>
          <div class="stat"><span class="stat-v">${st.best}</span><span class="stat-l">最長連續</span></div>
          <div class="stat"><span class="stat-v">${st.days}</span><span class="stat-l">學習天數</span></div>
          <div class="stat"><span class="stat-v">${st.total}</span><span class="stat-l">累計作答</span></div>
        </div>
      </div>
      <details class="disclose mt-4"><summary>最近的每日紀錄</summary>${recentLogsHtml()}</details>
    </div>`;
}

function heatLevel(n) { return n <= 0 ? 0 : n < 6 ? 1 : n < 15 ? 2 : n < 26 ? 3 : 4; }
// The grid runs from the week the learner started (first day with a record, or the day the profile was created) to
// this week, so a wide screen does not show months of blank cells before the first green one. At least 4 weeks so
// a brand-new profile still reads as a calendar; at most 26, as before.
function heatmapWeeks() {
  const t = todayStr();
  const monday = (ds) => { const d = parseDate(ds); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  let first = state.createdAt && state.createdAt < t ? state.createdAt : t;
  for (const ds of Object.keys(state.dailyLogs)) if (dayActive(state.dailyLogs[ds]) && ds < first) first = ds;
  const span = Math.round((monday(t) - monday(first)) / 864e5 / 7) + 1;
  return clamp(span, 4, 26);
}
function heatmapHtml() {
  const weeks = heatmapWeeks();
  const today = parseDate(todayStr());
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today); start.setDate(start.getDate() - dow - (weeks - 1) * 7);
  const cells = []; const months = [];
  let lastMonth = -1; let lastLabel = -9;
  for (let w = 0; w < weeks; w++) {
    const first = new Date(start); first.setDate(first.getDate() + w * 7);
    // label a column when its month starts, but never two labels closer than three columns
    const isNew = first.getMonth() !== lastMonth;
    const nextMonthSoon = w === 0 && new Date(first.getFullYear(), first.getMonth(), first.getDate() + 14).getMonth() !== first.getMonth();
    months.push(isNew && w - lastLabel >= 3 && !nextMonthSoon ? `${first.getMonth() + 1}月` : '');
    if (months[w]) lastLabel = w;
    lastMonth = first.getMonth();
    for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(day.getDate() + w * 7 + d);
      const ds = dateStr(day);
      if (day > today) { cells.push('<i class="future"></i>'); continue; }
      const e = state.dailyLogs[ds]; const n = dayTotal(e) || (e && (e.items || e.ex)) || 0;   // a test-only day still shows
      cells.push(`<i class="l${heatLevel(n)}${ds === todayStr() ? ' today' : ''}" data-act="heat-day" data-date="${ds}" title="${ds}：${n} 題"></i>`);
    }
  }
  return `<div class="heat-wrap"><div class="heat-months">${months.map(m => `<span>${m}</span>`).join('')}</div><div class="heat">${cells.join('')}</div></div>`;
}
function recentLogsHtml() {
  const days = Object.keys(state.dailyLogs).filter(d => dayActive(state.dailyLogs[d])).sort().reverse().slice(0, 14);
  if (!days.length) return '<div class="empty">還沒有紀錄，完成第一組練習後就會出現。</div>';
  const tally = tallySrsByDay();
  return `<div class="list mt-2">${days.map(d => {
    const e = state.dailyLogs[d];
    return `<div class="list-item"><div class="grow">
      <div class="row-wrap"><b class="num">${d}</b><span class="small muted">${dayStatsText(d, tally)}</span></div>
    </div><span class="chip num">${typeof e.items === 'number' ? `${e.items} 題` : dayTotal(e) ? `作答 ${dayTotal(e)} 次` : `測驗 ${e.ex || 0} 題`}</span>
    <button type="button" class="btn btn-sm btn-ghost" data-act="del-log" data-date="${d}" title="刪除這天的紀錄">刪除</button></div>`;
  }).join('')}</div>`;
}

Object.assign(ACTIONS, {
  'heat-day': (el) => {
    const d = el.dataset.date; const e = state.dailyLogs[d]; const n = dayActive(e);
    const box = document.getElementById('heatInfo');
    if (!box) return;
    box.innerHTML = n ? `<b class="num">${d}</b>：${dayStatsText(d)}` : `<b class="num">${d}</b>：沒有練習。`;
  },
  'del-log': (el) => {
    const d = el.dataset.date;
    if (!confirm(`刪除 ${d} 的學習紀錄？`)) return;
    delete state.dailyLogs[d]; saveState(); route();
  },
  'advance-unit': () => {
    const i = unitOrder(state.currentUnit);
    if (!state.completedUnits.includes(state.currentUnit)) state.completedUnits.push(state.currentUnit);
    noteUnitDone(state.currentUnit);
    if (i < DATA.UNITS.length - 1) state.currentUnit = DATA.UNITS[i + 1].id;
    saveState();
    toast(`目前單元：${unitById(state.currentUnit).weeks}・${unitById(state.currentUnit).short}`);
    route();
  }
});
