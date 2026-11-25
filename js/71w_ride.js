'use strict';
// ---------- 券売機 and the train (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §9) ----------
// The hero's own rides on みなと線: at a station's ticket machine, the fare chart over it (that station 現在地) — find where you are
// going, press its fare (大人), put the money in: a ticket. On みなと's platform a train stopped with its doors open: aboard (no
// ticket: buy one first). Inside the car the world going by in the windows, the straps swaying, the LED over the door and the
// announcements (つぎは 病院前、病院前です), stop by stop to the station the ticket names. The bus stays free; the train costs, as trains do.
// 2026-11-23 (湯の花温泉, docs/superpowers/specs/2026-11-23-onsen-work-design.md §2.2): やまなみ線 on from 白鷺 to 湯の花, a one-car diesel.
// Every chart has it past 白鷺 (のりかえ); a ride from みなと線 to it changes at 白鷺 (its announcement, the hero across the platform to
// the other train). Up the valley: the river, a bridge, two tunnels, cedars, the steam of the town; off at 湯の花駅前 (SCENE). No
// announcement cuts another: each waits for the one before to be said (a clip that never ends: 8 s at most). No free ride home — short
// of money at 湯の花, the card names the app's own way home (書房), and a ticket up there bought with too little left for the way back
// gets a warning (the review, 2026-11-23).
// 2026-11-25 (the user, playing test.1: 「有些地方本來就可以走到，買票感覺沒有意義，浪費使用者的錢」, 「買哪的票就要強迫他上車後是抵達那個對應的
// 站，然後也不能一次買一堆票」): the castle and the harbour are a walk or the free bus away, so the train is only the way up to 湯の花 and back
// down — the town's machines sell the ticket up, 湯の花's the two down (SELLS); a ticket names its station and the ride ends there, paid in
// full at the machine (no 乗り越し精算, no ride on from 白鷺); one ticket at a time (払いもどし pays one back whole: one held where it cannot
// be used — a 湯の花→白鷺 one after going home by 書房 — would else block every machine); at みなと the train is in for a ticket from there
// (PLATFORM.ready); 「跳過 ›」 on every ride, straight to its arrival (the user's pick)
// the season's leaves (the valley in the diesel's windows, 湯の花駅前's slope): [two of the trees, a third], by the month
const seasonLeaves = (m = (typeof sceneDate === 'function' ? sceneDate() : new Date()).getMonth() + 1) => (m >= 3 && m <= 5 ? ['#f2c4d0', '#f8dce4', '#8ab86e'] : m >= 6 && m <= 8 ? ['#6aa860', '#86bc6a', '#5a9a52'] : m >= 9 && m <= 11 ? ['#d8653a', '#e8a23a', '#c8452e'] : ['#9a8a7a', '#b0a294', '#8a7a6a']);
const RIDE = (() => {
  const TK = 'nq_ticket', SCENE = { shirasagi: 'castle', minatoko: 'harbor', minato: 'platform', yunohana: 'onsen' };
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const L = () => TOWN.EKI.ride, api = { speed: 1, trace: null };   // trace: an array to have each phase written into as 'phase@station' (the tests)
  let R = null, runs = 0;   // the ride now (the tests): { from, to, i, phase, at, line, gen }
  const ms = (s) => (s * 1000) / api.speed;
  // what each machine sells: the town's three the way up to 湯の花 only, 湯の花's the two ways down — never 森下, never a station with
  // nowhere to get off; NEAR: what is a walk or the free bus away from each of the town's three (its machine's note)
  const SELLS = { minato: ['yunohana'], minatoko: ['yunohana'], shirasagi: ['yunohana'], yunohana: ['shirasagi', 'minato'] };
  const NEAR = { minato: '白鷺城、港口', minatoko: '白鷺城、車站前', shirasagi: '車站前、港口' };
  // the ticket held: { from, to, fare, day }, kept on this device, one at a time. One bought before tickets named their station (to
  // 2026-11-25) is read as the one its fare buys from there now; none (a 310 to 白鷺 from みなと): to '' — ridden nowhere, paid back at any machine
  const ticket = () => { let t = null; try { t = JSON.parse(localStorage.getItem(TK) || 'null'); } catch (e) { return null; }
    if (!t || typeof t !== 'object' || !t.from) return null;
    const fare = Number(t.fare) || 0; return Object.assign({}, t, { fare, to: t.to || (SELLS[t.from] || []).find((id) => EKI.fare(t.from, id) === fare) || '' }); };
  const keep = (t) => { try { if (t) localStorage.setItem(TK, JSON.stringify(t)); else localStorage.removeItem(TK); } catch (e) { /* none kept */ } };
  // what the ride up to 湯の花 cost (ruling 37: 交通費, paid back by the day's first onsen shift — WORK): its ticket's fare, kept on
  // arriving there with the town's day, on this device (as the ticket is); a later ride up that day replaces it
  const FARE = 'nq_fare';
  const fareKeep = (yen) => { try { localStorage.setItem(FARE, JSON.stringify({ day: dateStr(TOWNEV.today()), yen })); } catch (e) { /* none kept */ } };
  const fare = (day) => { try { const f = JSON.parse(localStorage.getItem(FARE) || 'null'); return f && f.day === day ? Math.max(0, Number(f.yen) || 0) : 0; } catch (e) { return 0; } };
  const st = (id) => ([...TOWN.EKI.LINE, ...((TOWN.EKI.YAMA || {}).LINE || [])].find((x) => x[0] === id) || [, id])[1];
  const fill = (l, o) => [l[0].replace(/\{S\}/g, o.S || '').replace('{P}', o.P || '').replace('{L}', o.L || ''), l[1].replace(/\{s\}/g, o.s || '').replace('{p}', o.p || '').replace('{l}', o.l || '')];
  const lineName = (ln) => L().lines[ln] || ['', ''];
  const night = () => sceneClock(lightHour(sceneHour())).day < 0.5;
  // the way back from 湯の花 at least (to 白鷺: a scene, the castle); a warning when what is left will not buy it
  const backFare = () => EKI.fare('yunohana', 'shirasagi');
  const warnBack = (left) => { if (left >= 0 && left < backFare()) toast(`提醒：從湯の花回來最少要 ${backFare()} 円（到白鷺），付完只剩 ${yenStr(Math.max(0, left))} 円。`, 4600); };
  // a ticket's face (「みなと → 湯の花　420円」; one from before tickets named their station: its fare's 区間), and as a toast names it
  const faceOf = (t) => `<span lang="ja">${ruby(st(t.from))} → ${t.to ? ruby(st(t.to)) : `${t.fare}円区間`}</span><b>${t.fare}円</b><small>${esc(t.day || '')}・大人</small>`;
  const named = (t) => `${EKI.name(t.from)} → ${t.to ? EKI.name(t.to) : `${t.fare} 円`}`;
  // ---- the machine: the chart (fares from here), its screen, a button each ticket it sells, the coin slot, the ticket out ----
  // やまなみ線's part of a chart (2026-11-23): a row under みなと線's, from 白鷺 (のりかえ, under it) to 湯の花, its fares from here
  const yamaRow = (here) => `<div class="os-yama"><i class="os-rail"></i><div class="md-st os-jct"><b class="md-dot">◎</b><span class="os-chg" lang="ja">のりかえ</span></div>
    ${EKI.yama().slice(1).map((x) => (x.id === here ? `<div class="md-st here"><b class="md-dot">●</b>${EKI.label(x.id, true)}<em>現在地</em></div>`
      : `<div class="md-st"><b class="md-dot">●</b>${EKI.label(x.id, true)}<span class="md-f">${EKI.fare(here, x.id)}</span></div>`)).join('')}
    <p class="os-name" lang="ja">${ruby(lineName('yama')[0])}</p></div>`;
  function machine(yard, here) {
    const sells = (SELLS[here] || []).map((to) => ({ to, fare: EKI.fare(here, to) }));
    let pick = null;   // the ticket whose fare button is pressed: { to, fare }
    const chart = `<div class="md-wall kb-wall"><div class="md-chart"><i class="md-rail"></i>${EKI.line().map((x) => x.id === here
      ? `<div class="md-st here"><b class="md-dot">●</b>${EKI.label(x.id, true)}<em>現在地</em></div>`
      : `<div class="md-st"><b class="md-dot${x.rapid ? '' : ' no'}">${x.rapid ? '●' : '○'}</b>${EKI.label(x.id, true)}<span class="md-f">${EKI.fare(here, x.id)}</span></div>`).join('')}</div>
      ${yamaRow(here)}<p class="md-key"><span>大人（円）</span><span lang="ja">${ruby(st(here))}から</span></p></div>`;
    const note = NEAR[here] ? `<p class="kb-note">${NEAR[here]}走路或坐公車就到了（免費），這裡只賣去湯の花的票。</p>` : '';   // the town's three: why only the one
    const q = (s) => document.querySelector('.kb-card ' + s);
    const screen = (l, cls = '') => { const e = q('.kb-screen'); if (e) { e.innerHTML = `<b lang="ja">${ruby(l[0])}</b><span>${esc(l[1])}</span>`; e.className = 'kb-screen' + (cls ? ' ' + cls : ''); } };
    // short of money: refused, the wallet untouched; the app's own way home (書房 — on a phone its button is not on the screen in a
    // place, so the card has it); 円 come from the cruise and the jobs
    const homeHint = () => { const sl = q('.kb-slot'); if (sl && !sl.querySelector('.os-home')) sl.insertAdjacentHTML('beforeend', `<p class="kb-tip">錢不夠搭車：先回書房吧。帶郵輪的客人、打工都能賺円。</p><button type="button" class="btn os-home">‹ 書房</button>`); };
    const refuse = () => { playSfx('bad'); screen(L().short, 'bad'); toast(`錢包只有 ${yenStr(yenBalance())} 円，不夠搭車。可以按「‹ 書房」先回書房。`, 4200); homeHint(); };
    const rideBtn = '<button type="button" class="btn btn-primary kb-ride" lang="ja"><span><ruby>電車<rt>でんしゃ</rt></ruby>に <ruby>乗<rt>の</rt></ruby>る</span></button>';
    const backBtn = () => `<button type="button" class="btn kb-back" lang="ja"><span>${ruby(L().refund[0])}</span><small>${esc(L().refund[1])}</small></button>`;
    // the ticket held, or none: the fare buttons on (none) or off (one at a time), the wallet, the slot — the ticket, what to do with it
    // (here: its train; みなと: up to the platform), 払いもどし
    function draw() {
      const t = ticket(), s = q('.kb-slot'), p = q('.kb-pay'); if (!s || !p) return;
      document.querySelectorAll('.kb-card .kb-fare').forEach((b) => { b.disabled = Boolean(t); b.classList.remove('on'); }); pick = null; p.disabled = true;
      const w = q('.kb-wallet'); if (w) w.innerHTML = `${yenIcon()}${yenStr(yenBalance())} 円`;
      if (!t) { s.innerHTML = ''; return; }
      const mine = t.from === here && t.to;
      const tip = !mine ? `<p class="kb-tip">${t.from === here ? '這張是以前的票，現在已經沒有車可以搭了' : `這張是${esc(EKI.name(t.from))}出發的票，在這裡不能搭`}：按「<span class="kb-nw" lang="ja">払いもどし</span>」退票，錢全部退回錢包，就能再買。</p>`
        : here === 'minato' ? '<p class="kb-tip">從剪票口上月台：1番線（往白鷺）的電車已經停著等你，上車就好，到白鷺換やまなみ線。</p>' : '';
      s.innerHTML = `<div class="kb-ticket" data-from="${t.from}" data-to="${t.to}">${faceOf(t)}</div>${tip}<div class="os-rides">${mine && here !== 'minato' ? rideBtn : ''}${backBtn()}</div>`;
    }
    CLASS.card('kb-card', '券売機', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>券売機<rt>けんばいき</rt></ruby></b><span>${esc(EKI.name(here))}<ruby>駅<rt>えき</rt></ruby></span></div>${chart}${note}
      <div class="kb-machine"><p class="kb-screen"></p><div class="kb-fares${sells.length > 1 ? '' : ' one'}">${sells.map((x) => `<button type="button" class="kb-fare" data-f="${x.fare}" data-to="${x.to}"><small>大人</small>${x.fare}<span class="kb-to" lang="ja">${EKI.ruby(x.to)}</span></button>`).join('')}</div>
        <div class="kb-row"><span class="kb-wallet">${yenIcon()}${yenStr(yenBalance())} 円</span><button type="button" class="btn btn-primary kb-pay" disabled lang="ja"><span>お<ruby>金<rt>かね</rt></ruby>を <ruby>入<rt>い</rt></ruby>れる</span></button></div>
        <div class="kb-slot"></div></div>`, (e) => {
      const f = e.target.closest('.kb-fare');
      if (f && !f.disabled) { pick = { to: f.dataset.to, fare: Number(f.dataset.f) }; document.querySelectorAll('.kb-card .kb-fare').forEach((x) => x.classList.toggle('on', x === f)); q('.kb-pay').disabled = false; SND.play('tick', { vol: 0.5 }); screen(fill(L().put, { P: YEN.priceMark(pick.fare), p: pick.fare })); return; }
      if (e.target.closest('.kb-pay') && pick) {
        if (ticket()) { playSfx('bad'); screen(L().held, 'bad'); draw(); return; }   // one at a time
        if (yenBalance() < pick.fare) { refuse(); return; }   // the wallet untouched
        const t = { from: here, to: pick.to, fare: pick.fare, day: todayStr() };
        yenSpend(t.fare); keep(t); playSfx('coin', 3); SND.play('paper', { vol: 0.6 }); screen(L().take, 'ok');
        if (t.to === 'yunohana') warnBack(yenBalance());   // up there with too little left for the way back
        draw(); return;
      }
      if (e.target.closest('.kb-back')) {   // 払いもどし: the whole fare back in the wallet, the ticket gone, the machine selling again
        const t = ticket(); if (!t) return;
        keep(null); yenRefund(t.fare); playSfx('coin', 5); screen(fill(L().back, { p: yenStr(t.fare) }), 'ok'); draw(); return;
      }
      if (e.target.closest('.kb-ride')) { CLASS.close(); board(document.querySelector('#view .yard') || yard, 0, here); return; }   // the station as drawn now (shutting the card may draw it anew: the final review's I-1)
      if (e.target.closest('.os-home')) { CLASS.close(); window.go('#/today'); }   // (go: the ride's own, below)
    });
    const c = document.querySelector('.cls.kb-card'); if (c) c.dataset.here = here;   // which station's machine (the tests)
    draw(); screen(ticket() ? L().held : L().pick);
  }
  // ---- aboard: the ticket held, from here; the ride to the station it names ----
  function board(yard, track, from = 'minato') {
    const t = ticket();
    if (!t || t.from !== from || !t.to) {
      toast(!t ? (from === 'minato' ? '要先買票：車站門口的紅色券売機。' : '要先在券売機買票。') : t.from !== from ? `手上的票是從${EKI.name(t.from)}出發的（${named(t)}），在這裡不能搭。可以在券売機退票（払いもどし）。` : '這張是以前的票，現在已經沒有車可以搭了：在券売機退票（払いもどし）就能再買。', 4200);
      if (yard) yPop(yard, yh.X + 600, 370 - yh.Y - 200 * yScale(yh.Y), 'きっぷ…'); return false;
    }
    go(from, t.to); if (from === 'minato' && typeof PLATFORM === 'object') PLATFORM.away();   // みなと: his train away with him
    return true;
  }
  // the car inside: three windows (the world going by: sky, hills, the sea or fields, houses, poles), the straps, the long seat, the
  // LED over the door; scenery: the strip slides while the train runs, stands while it is stopped
  const scenery = (to) => { let s = ''; for (let i = 0; i < 12; i++) { const x = i * 90; s += `<path d="M${x} 74 q20 -18 45 -10 q25 -14 45 0 V92 H${x} Z" fill="#a9c2b4"/>${to === 'minatoko' || i % 3 === 0 ? `<rect x="${x}" y="84" width="90" height="10" fill="#8fbcd4"/>` : `<rect x="${x}" y="84" width="90" height="10" fill="#b8c88a"/><path d="M${x + 10} 88 h20 M${x + 50} 90 h24" stroke="#9aaa6a"/>`}${i % 2 ? `<rect x="${x + 30}" y="72" width="14" height="14" fill="#efe4d2"/><path d="M${x + 28} 73 l9 -7 l9 7 Z" fill="${['#a65a44', '#5f6f8a', '#6f5a7a'][i % 3]}"/>` : ''}<path d="M${x + 70} 60 v34" stroke="#6e5240" stroke-width="2"/><path d="M${x + 64} 63 h12" stroke="#6e5240" stroke-width="1.6"/>${to === 'shirasagi' && i === 7 ? `<path d="M${x + 20} 78 v-14 h20 v14 Z M${x + 16} 64 h28 l-6 -6 h-16 Z M${x + 24} 58 v-8 h12 v8" fill="#f4f1ea" stroke="#5f6f8a"/>` : ''}`; } return s; };
  const car = (to) => `<svg class="rd-car" viewBox="0 0 360 210" aria-hidden="true"><defs><clipPath id="rdWin">${[20, 135, 250].map((x) => `<rect x="${x}" y="38" width="90" height="62" rx="5"/>`).join('')}</clipPath><linearGradient id="rdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fc4dc"/><stop offset="1" stop-color="#dbe9f0"/></linearGradient></defs>
    <rect width="360" height="210" fill="#ece6d8"/><rect y="0" width="360" height="12" fill="#c9c3b6"/>
    <g clip-path="url(#rdWin)"><rect x="0" y="30" width="360" height="80" fill="url(#rdSky)"/><g class="rd-strip">${scenery(to)}<g transform="translate(1080 0)">${scenery(to)}</g></g></g>
    ${[20, 135, 250].map((x) => `<rect x="${x}" y="38" width="90" height="62" rx="5" fill="none" stroke="#9aa4ae" stroke-width="4"/><path d="M${x + 45} 38 v62" stroke="#9aa4ae" stroke-width="2"/><path d="M${x + 8} 92 l18 -48" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>`).join('')}
    <path d="M0 22 H360" stroke="#b0aca2" stroke-width="3"/>${[30, 70, 110, 150, 190, 230, 270, 310].map((x, i) => `<g class="rd-strap" style="animation-delay:-${(i * 0.3).toFixed(1)}s"><path d="M${x} 22 v10" stroke="#8a8f99" stroke-width="1.6"/><circle cx="${x}" cy="37" r="4.6" fill="none" stroke="#e8e4da" stroke-width="2.4"/></g>`).join('')}
    <rect x="0" y="112" width="360" height="40" fill="#5a7aa8"/><rect x="0" y="112" width="360" height="5" fill="#6f8fbc"/><rect x="0" y="150" width="360" height="16" fill="#4a6a98"/><path d="M90 112 v54 M180 112 v54 M270 112 v54" stroke="#3f5f8a" stroke-width="2"/>
    <rect x="0" y="166" width="360" height="44" fill="#b8b2a4"/><path d="M0 172 H360" stroke="#a8a296" stroke-width="2"/></svg>`;
  // ---- やまなみ線's car (2026-11-23): one diesel car — box seats in green moquette under each window (two backs facing, a little
  // table under the sill), sash windows, a luggage rack, a fan and two lamps in the ceiling (lit warm in a tunnel, and by night), a
  // wooden floor. In the windows the valley going by (far ridges, cedars, deciduous trees in the season's colours, the river below);
  // by night the dark hills under the stars, a lit window here and there. Over it as the ride goes: the bridge (red trusses racing
  // past, the river far below), a tunnel (dark, its lamps streaking by), the town's roofs and its steam at the end ----
  function valley(n) {
    const [c1, c2] = seasonLeaves(), far = n ? '#232a4e' : '#a9bccb', mid = n ? '#18223c' : '#5f8a6a', cedar = n ? '#101a2c' : '#3f6a4c', cedar2 = n ? '#14203a' : '#4f7a5a', river = n ? '#2a3a6a' : '#8fc4dc';
    let s = '';
    for (let i = 0; i < 12; i++) {
      const x = i * 90, h = [0, 8, 3, 10, 5, 2, 9, 4, 7, 1, 6, 3][i];
      s += `<path d="M${x} ${62 - h * 0.6} q22 -14 45 -6 q24 -12 45 2 V100 H${x} Z" fill="${far}"/>`
        + `<path d="M${x} ${74 - h * 0.5} q30 -12 56 -4 q20 -8 34 0 V100 H${x} Z" fill="${mid}"/>`
        + [8, 26, 47, 66, 82].map((d, k) => { const tx = x + d, ty = 78 + ((i + k) % 3) * 3, th = 14 + ((i * 3 + k) % 4) * 3; return `<path d="M${tx} ${ty - th} l${k % 2 ? 5 : 6} ${th} h${k % 2 ? -10 : -12} Z" fill="${k % 2 ? cedar : cedar2}"/>`; }).join('')
        + (i % 4 === 1 && !n ? `<circle cx="${x + 36}" cy="84" r="5" fill="${c1}"/><circle cx="${x + 42}" cy="86" r="4" fill="${c2}"/>` : '')
        + (i % 3 === 0 ? `<path d="M${x} 94 q22 -3 45 0 t45 0 V100 H${x} Z" fill="${river}"/><path d="M${x + 12} 96 h10 M${x + 52} 97 h12" stroke="${n ? '#4a5a8a' : '#fff'}" stroke-opacity=".6" stroke-width="1"/>` : `<rect x="${x}" y="94" width="90" height="6" fill="${n ? '#141c30' : '#6f9a5a'}"/>`)
        + (n && i % 5 === 2 ? `<rect x="${x + 60}" y="80" width="3" height="2.4" fill="#ffd98a"/>` : '');
    }
    return s;
  }
  const dcar = (n) => `<svg class="rd-car os-dcar${n ? ' os-night' : ''}" viewBox="0 0 360 210" aria-hidden="true"><defs><clipPath id="osWin">${[24, 138, 252].map((x) => `<rect x="${x}" y="36" width="84" height="60" rx="4"/>`).join('')}</clipPath>
      <linearGradient id="osSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n ? '#141a3a' : '#9fc8e0'}"/><stop offset="1" stop-color="${n ? '#2a2f5a' : '#e2eef2'}"/></linearGradient></defs>
    <rect width="360" height="210" fill="#efe6d0"/><rect y="0" width="360" height="14" fill="#d8ccb2"/><path d="M0 14 H360" stroke="#c4b69a" stroke-width="2"/>
    <g class="os-lamp">${[90, 270].map((x) => `<rect x="${x - 26}" y="3" width="52" height="6" rx="3" fill="#fff7dc"/><ellipse cx="${x}" cy="14" rx="70" ry="16" fill="#ffe8a8" opacity=".35"/>`).join('')}</g>
    <g transform="translate(180 7)"><circle r="6" fill="#c9c2b0"/><g class="os-fan">${[0, 120, 240].map((a) => `<ellipse cx="0" cy="-5" rx="2.6" ry="5" fill="#a89e88" transform="rotate(${a})"/>`).join('')}</g><circle r="1.8" fill="#6a6252"/></g>
    <g clip-path="url(#osWin)"><rect x="0" y="30" width="360" height="72" fill="url(#osSky)"/>${n ? [[40, 44], [120, 40], [200, 48], [300, 42], [330, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#fff"/>`).join('') : ''}
      <g class="rd-strip">${valley(n)}<g transform="translate(1080 0)">${valley(n)}</g></g>
      <g class="os-brg"><rect x="0" y="80" width="360" height="22" fill="${n ? '#18223c' : '#7fb0c8'}"/><path d="M0 92 q30 -4 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" fill="none" stroke="${n ? '#3a4a7a' : '#fff'}" stroke-width="1.4" opacity=".7"/>
        <g class="os-truss">${Array.from({ length: 10 }, (_, k) => { const x = k * 72; return `<path d="M${x} 30 v72 M${x} 40 L${x + 72} 98 M${x + 72} 40 L${x} 98" stroke="${n ? '#6a2a30' : '#c8322a'}" stroke-width="4"/>`; }).join('')}<path d="M0 40 H720 M0 98 H720" stroke="${n ? '#6a2a30' : '#a8262e'}" stroke-width="5"/></g></g>
      <g class="os-tun"><rect x="0" y="30" width="360" height="72" fill="#141418"/><g class="os-tlamps">${Array.from({ length: 8 }, (_, k) => `<rect x="${k * 90 + 20}" y="44" width="10" height="3" rx="1.5" fill="#ffb24a"/>`).join('')}</g></g>
      <g class="os-yu">${[[10, 80, 46], [70, 76, 54], [140, 82, 40], [190, 74, 60], [262, 80, 48], [318, 76, 44]].map(([x, y, w], k) => `<path d="M${x} ${y} l${w / 2} -10 l${w / 2} 10 Z" fill="${n ? '#2a2c48' : '#5a6478'}"/><rect x="${x + 4}" y="${y}" width="${w - 8}" height="${102 - y}" fill="${n ? '#3a3050' : '#efe2c8'}"/><rect x="${x + 10}" y="${y + 6}" width="8" height="6" fill="${n ? '#ffd98a' : '#8a6a48'}"/>
        <g class="os-puff" style="animation-delay:-${(k * 0.6).toFixed(1)}s"><circle cx="${x + w / 2}" cy="${y - 14}" r="7" fill="#fff" opacity="${n ? 0.35 : 0.8}"/><circle cx="${x + w / 2 + 6}" cy="${y - 22}" r="9" fill="#fff" opacity="${n ? 0.3 : 0.7}"/></g>`).join('')}</g></g>
    ${[24, 138, 252].map((x) => `<rect x="${x}" y="36" width="84" height="60" rx="4" fill="none" stroke="#b8b0a0" stroke-width="5"/><path d="M${x} 64 h84" stroke="#b8b0a0" stroke-width="3"/><path d="M${x + 8} 90 l16 -48" stroke="#fff" stroke-opacity=".22" stroke-width="3"/><rect x="${x - 2}" y="96" width="88" height="6" rx="2" fill="#8a6a48"/>`).join('')}
    <path d="M0 26 H360" stroke="#a8a294" stroke-width="2"/><path d="M0 30 H360" stroke="#a8a294" stroke-width="1" stroke-dasharray="3 3"/>
    ${[24, 138, 252].map((x) => `<rect x="${x - 14}" y="104" width="20" height="62" rx="6" fill="#3f6a52"/><rect x="${x + 78}" y="104" width="20" height="62" rx="6" fill="#3f6a52"/><path d="M${x - 10} 110 v50 M${x + 94} 110 v50" stroke="#5a8a6a" stroke-width="2" opacity=".6"/>
      <rect x="${x + 6}" y="140" width="72" height="18" rx="4" fill="#4a7a5e"/><path d="M${x + 6} 158 h72" stroke="#2f4f3c" stroke-width="3"/><rect x="${x + 30}" y="102" width="24" height="5" rx="1" fill="#a8845a"/>`).join('')}
    <rect x="0" y="166" width="360" height="44" fill="#8a6a4a"/>${Array.from({ length: 9 }, (_, k) => `<path d="M${k * 40} 166 V210" stroke="#7a5a3c" stroke-width="1.4"/>`).join('')}<path d="M0 170 H360" stroke="#6e5036" stroke-width="2"/>
    <rect class="os-dim" width="360" height="210" fill="#141830" opacity="0"/></svg>`;
  // ---- the change at 白鷺 (2026-11-23): 白鷺's platform under its canopy, the castle far off on its hill; the train come in on the
  // left (its last door open), the one to change to waiting on the right — its cab, its LED (湯の花, or みなと home), its doors open;
  // やまなみ線's one diesel car cream with a dark green band (みなと線's colours, the same company), its exhaust puffing — the sign for
  // its のりば between them, the hero across from the one to the other ----
  function chg(toLine, n) {
    const yama = toLine === 'yama', sky = n ? ['#141a3a', '#2c3260'] : ['#a8cce2', '#e4eff3'], glass = n ? '#ffe2a0' : '#9fc0d0';
    const paint = (kind) => (kind === 'yama' ? { body: n ? '#3a3f66' : '#f3ead2', band: n ? '#163028' : '#2f5a3a' } : { body: n ? '#3a3f66' : '#f1ece0', band: n ? '#24485a' : '#3f9a8c' });
    const puff = (x) => `<rect x="${x - 13}" y="62" width="26" height="8" rx="2" fill="${n ? '#2a2c48' : '#8a8f99'}"/><g class="os-puff"><circle cx="${x}" cy="56" r="6" fill="${n ? '#5a5e80' : '#9a9a9a'}" opacity=".55"/><circle cx="${x + 6}" cy="46" r="8" fill="${n ? '#5a5e80' : '#b0b0b0'}" opacity=".4"/></g>`;
    // the train come in: its body from the left edge to x 110, its last door (open) at its end
    const came = (kind) => { const c = paint(kind); return `<rect x="-40" y="70" width="150" height="78" rx="6" fill="${c.body}"/><rect x="-40" y="116" width="150" height="10" fill="${c.band}"/><rect x="-40" y="128" width="150" height="2.4" fill="#e6a23c"/>
      ${[-26, 14, 54].map((wx) => `<rect x="${wx}" y="82" width="28" height="22" rx="3" fill="${glass}"/>`).join('')}<rect x="88" y="80" width="18" height="66" fill="${n ? '#1c1d3c' : '#5a5e6a'}"/><rect x="104" y="80" width="6" height="66" fill="${c.body}"/>${kind === 'yama' ? puff(30) : ''}`; };
    // the one waiting: from x 228 on, its cab at that end — the front window, a headlight, its LED — a door open midway
    const waits = (kind) => { const c = paint(kind); return `<path d="M228 148 V82 Q228 70 242 70 H400 V148 Z" fill="${c.body}"/><rect x="228" y="116" width="172" height="10" fill="${c.band}"/><rect x="228" y="128" width="172" height="2.4" fill="#e6a23c"/>
      <rect x="234" y="80" width="22" height="26" rx="4" fill="${glass}"/><circle cx="236" cy="138" r="3.4" fill="${n ? '#fff6c8' : '#f4efe4'}"/>${n ? '<circle cx="236" cy="138" r="9" fill="#fff6c8" opacity=".3"/>' : ''}
      <rect x="238" y="72" width="32" height="7" rx="1.5" fill="#141418"/><text x="254" y="77.6" text-anchor="middle" font-size="5.6" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${yama ? '湯の花' : 'みなと'}</text>
      ${[268, 344].map((wx) => `<rect x="${wx}" y="82" width="26" height="22" rx="3" fill="${glass}"/>`).join('')}<rect x="304" y="80" width="26" height="66" fill="${n ? '#1c1d3c' : '#5a5e6a'}"/><rect x="302" y="80" width="3" height="66" fill="${c.body}"/>${kind === 'yama' ? puff(330) : ''}`; };
    const word = yama ? 'やまなみ線' : 'みなと線';
    return `<svg class="rd-car os-chgsvg" viewBox="0 0 360 210" aria-hidden="true"><defs><linearGradient id="osCsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
      <rect width="360" height="210" fill="url(#osCsky)"/>${n ? [[30, 20], [90, 34], [250, 18], [320, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#fff"/>`).join('') : ''}
      <path d="M0 96 q60 -40 120 -22 q50 -30 110 -6 q60 -26 130 8 V150 H0 Z" fill="${n ? '#1e2448' : '#b4c6d2'}"/><path d="M0 112 q80 -26 170 -8 q90 -22 190 4 V150 H0 Z" fill="${n ? '#18203c' : '#8fae9a'}"/>
      <g transform="translate(176 92)"><path d="M-16 20 h32 l-3 -8 h-26 Z" fill="${n ? '#3a3d66' : '#e8e4da'}"/><path d="M-11 12 h22 l-4 -6 h-14 Z" fill="${n ? '#4a4e7a' : '#f4f1ea'}"/><path d="M-9 6 L0 -2 L9 6 Z" fill="${n ? '#2a2c48' : '#5f6f8a'}"/>${n ? '<circle cx="0" cy="12" r="14" fill="#ffe9b0" opacity=".25"/>' : ''}</g>
      <rect x="0" y="22" width="360" height="12" fill="${n ? '#2a2c48' : '#6a7280'}"/><rect x="0" y="34" width="360" height="3" fill="${n ? '#1c1d3c' : '#545b66'}"/>${[60, 180, 300].map((x) => `<rect x="${x - 3}" y="37" width="6" height="113" fill="${n ? '#2a2c48' : '#7a828e'}"/>`).join('')}
      ${n ? [60, 180, 300].map((x) => `<ellipse cx="${x}" cy="40" rx="26" ry="6" fill="#fff3c8" opacity=".5"/>`).join('') : ''}
      ${came(yama ? 'minato' : 'yama')}${waits(toLine)}
      <rect x="0" y="148" width="360" height="30" fill="${n ? '#3a3c5c' : '#cfcac0'}"/><rect x="0" y="148" width="360" height="5" fill="${n ? '#5a5a3a' : '#e6c23a'}"/>${Array.from({ length: 12 }, (_, k) => `<path d="M${k * 32} 156 v22" stroke="${n ? '#2e3050' : '#b8b2a8'}" stroke-width="1"/>`).join('')}
      <rect x="0" y="178" width="360" height="32" fill="${n ? '#24263e' : '#9a958a'}"/>
      <path d="M134 37 v8 M226 37 v8" stroke="${n ? '#5a5e80' : '#4a4e5a'}" stroke-width="1.4"/><rect x="128" y="44" width="104" height="26" rx="3" fill="#fbf8f0"/><rect x="128" y="44" width="104" height="8" rx="2" fill="${yama ? '#2f5a3a' : '#3f9a8c'}"/>
      <text x="180" y="50.6" text-anchor="middle" font-size="6" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${yama ? '3番線' : '1番線'}</text>
      <text x="176" y="64" text-anchor="middle" font-size="10" font-weight="700" fill="#2b2b33" font-family="system-ui, sans-serif">${word} のりば →</text></svg>`;
  }
  // the hero across 白鷺's platform (the change): walking, from the train come in to the one waiting
  const walker = () => `<div class="hero os-walker walk turn" aria-hidden="true">${HERO.svg({ look: state.look, wear: state.wear })}</div>`;
  // the ride, from the station boarded at to the one the ticket names: its legs (from one line to the other the change at 白鷺), stop by
  // stop with the announcements, off at its end — 降りる uses the ticket (up at 湯の花 its fare kept for the 交通費). 跳過 (2026-11-25, the
  // user's pick): the line being said stopped, straight to the arrival, shown and said as a full ride's. Shut mid-ride (✕, a tap outside):
  // the ride let go, the ticket still held — at みなと the train in again for it (PLATFORM.ready)
  const TERM = ['shirasagi', 'minatoko', 'yunohana'];   // 終点 only at the lines' ends: みなと is passed through (2026-11-22, the review: it taught 終点 wrong)
  function go(from, to) {
    const mine = ++runs, legs = EKI.legs(from, to), first = legs[0];
    R = { from, to, i: 0, phase: 'run', at: from, line: first.line, gen: 0 };   // gen: 1 once skipped (what was queued before it never said after)
    const el = (q) => document.querySelector('.rd-card ' + q), live = () => mine === runs && Boolean(el('.rd-box')), going = () => live() && !R.gen;
    const mark = (phase, at) => { R.phase = phase; if (at) R.at = at; if (Array.isArray(api.trace) && mine === runs) api.trace.push(`${phase}@${R.at}`); };   // a phase, the station it is at
    const led = (html) => { const e = el('.rd-led'); if (e) e.innerHTML = html; };
    let talking = Promise.resolve();
    const said = (p) => Promise.race([Promise.resolve(p).catch(() => {}), sleep(8000)]);
    // an announcement: once the one before it is said (2026-11-23: none cuts another — the change's least of all); one queued before 跳過
    // is never said after it
    const say = (l) => { const g = R.gen; talking = said(talking).then(() => { if (!live() || g !== R.gen) return null; const e = el('.rd-ann'); if (e) e.innerHTML = `<b lang="ja">${ruby(l[0])}</b><span>${esc(l[1])}</span>`; return said(speakAs('ann', l[0])); }); return talking; };
    const run = (on) => { const c = el('.rd-car'); if (c) c.classList.toggle('stop', !on); };
    const head = () => `<b lang="ja">${ruby(lineName(R.line)[0])}</b><span lang="ja">${ruby(st(from))} → ${ruby(st(R.to))}</span>`;
    const view = (svg) => { const b = el('.rd-box'); if (!b) return; b.querySelectorAll('.rd-car, .os-walker').forEach((x) => x.remove()); b.insertAdjacentHTML('beforeend', svg); const h = el('.wk-head'); if (h) h.innerHTML = head(); };
    const carFor = (leg) => (leg.line === 'yama' ? dcar(night()) : car(leg.to));
    CLASS.card('rd-card', lineName(first.line)[1], `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head">${head()}</div>
      <div class="rd-box"><p class="rd-led" lang="ja"></p><button type="button" class="rd-skip" aria-label="跳過，直接到站">跳過 ›</button>${carFor(first)}</div><p class="rd-ann"></p><div class="rd-end"></div>`, (e) => {
      if (e.target.closest('.rd-skip')) { skip(); return; }
      if (!e.target.closest('.rd-off') || R.phase !== 'end') return;
      const t = ticket(); if (R.at === 'yunohana') fareKeep(t ? t.fare : 0);   // up at 湯の花: what it cost, for the 交通費
      keep(null); mark('off'); CLASS.close(); SND.play('door-chime', { vol: 0.6 });
      const place = SCENE[R.at]; yh.arrive = { from: 'train', to: place }; window.go(PLACE_ROUTE[place]);
    }, () => { if (mine === runs && R.phase !== 'off' && from === 'minato' && typeof PLATFORM === 'object') PLATFORM.ready(); });
    // the change at 白鷺 to the other line: the platform, the hero across it while it is said
    async function change(toLine) {
      mark('change', 'shirasagi'); run(false); led('');   // off the train: the platform's own sign says where
      const l = say(fill(L().change, { S: st('shirasagi'), s: EKI.name('shirasagi'), L: lineName(toLine)[0], l: lineName(toLine)[1] }));
      SND.play(toLine === 'yama' ? 'train-in' : 'diesel-in', { vol: 0.35 });
      const b = el('.rd-box'); if (b) { b.querySelectorAll('.rd-car').forEach((x) => x.remove()); b.insertAdjacentHTML('beforeend', chg(toLine, night()) + walker()); const w = b.querySelector('.os-walker'); if (w) w.style.setProperty('--os-walk', `${ms(3.6) / 1000}s`); }
      await Promise.all([said(l), sleep(ms(4.2))]);
    }
    // the valley's sights as a やまなみ線 leg runs: [what, from (s), for (s)] by which way and which stretch
    const SIGHTS = { up: [[['brg', 1.2, 2.4]], [['tun', 0.8, 1.6], ['tun', 3.0, 1.3], ['yu', 4.5, 3]]], down: [[['yu', 0, 1.4], ['tun', 1.4, 1.3], ['tun', 3.4, 1.6]], [['brg', 2.2, 2.4]]] };
    const SIGHT_SND = { brg: 'bridge', tun: 'tunnel' };
    function sights(leg, k) {
      const up = leg.to === 'yunohana', list = (SIGHTS[up ? 'up' : 'down'][k] || []);
      list.forEach(([w, at, len]) => setTimeout(() => {
        const c = el('.os-dcar'); if (!going() || !c) return;
        if (w === 'tun') SND.play('diesel-horn', { vol: 0.35 });
        if (SIGHT_SND[w]) SND.play(SIGHT_SND[w], { vol: 0.5 });
        c.classList.add('os-in-' + w); setTimeout(() => { if (w !== 'yu' || !up) c.classList.remove('os-in-' + w); }, ms(len));
      }, ms(at)));
    }
    // the arrival at the ticket's station: the car standing, its LED (終点 at a line's end), 降りる, its line said — skipped to, the last
    // leg's car (up the valley: the town in its windows, as a full ride ends)
    function arrive(leg, jumped) {
      const yl = leg.line === 'yama', term = TERM.includes(leg.to);
      if (jumped) { R.line = leg.line; view(carFor(leg)); if (yl && leg.to === 'yunohana') { const c = el('.os-dcar'); if (c) c.classList.add('os-in-yu'); } }
      run(false); SND.play(yl ? 'diesel-in' : 'train-in', { vol: 0.35 }); led(term ? `${EKI.ruby(leg.to)} <small>終点</small>` : EKI.ruby(leg.to));
      const k = el('.rd-skip'); if (k) k.remove();
      el('.rd-end').innerHTML = '<button type="button" class="btn btn-primary rd-off" lang="ja"><span><ruby>降<rt>お</rt></ruby>りる</span></button>';
      mark('end', leg.to);   // its button first: a tap the moment it is 'end' finds it
      say(fill(term ? L().end : L().at, { S: st(leg.to), s: EKI.name(leg.to) }));
    }
    // 跳過: what is being said stopped, the stops and the change jumped, straight to the arrival
    function skip() {
      if (!live() || R.gen || R.phase === 'end' || R.phase === 'off') return;
      R.gen = 1; stopSpeaking(); talking = Promise.resolve(); mark('skip'); arrive(legs[legs.length - 1], true);
    }
    async function ride() {
      for (let k = 0; k < legs.length; k++) {
        const leg = legs[k], yl = leg.line === 'yama';
        if (k > 0) { await change(leg.line); if (!going()) return; R.line = leg.line; view(carFor(leg)); }
        R.line = leg.line; const stops = EKI.stops('普通', leg.to, leg.from);
        SND.play(yl ? 'diesel-out' : 'train-out', { vol: 0.4 });
        for (let i = 0; i < stops.length; i++) {
          if (!going()) return; R.i = i; mark('run'); run(true); const s = stops[i], o = { S: st(s), s: EKI.name(s) }, endRun = s === leg.to;
          led(`<small>つぎは</small> ${EKI.ruby(s)}`);
          if (yl) sights(leg, i);
          say(fill(L().next, o));
          if (yl && endRun && s === 'yunohana') setTimeout(() => { if (going()) say(fill(L().soon, o)); }, ms(4.5));   // up the valley: まもなく 終点 as the town comes in sight
          await sleep(ms(yl ? 6.2 : 4.5)); if (!going()) return;
          if (endRun) break;
          mark('stop', s); run(false); SND.play('door-chime', { vol: 0.5 }); led(EKI.ruby(s)); await sleep(ms(2.2)); if (!going()) return; SND.play('door-chime', { vol: 0.5 });
        }
        if (k === legs.length - 1 && going()) arrive(leg, false);
      }
    }
    ride();
  }
  // the station's sign out at 白鷺城 and みなと漁港 (way-edge: at the screen's edge when its spot is off it): walked to, its machine
  const SIGN = { shirasagi: ['白鷺駅', -560, 64, [-540, 110]], minatoko: ['みなと港駅', -556, 14, [-530, 30]] };
  const signHtml = (here) => { const [name, x, y] = SIGN[here]; return `<button type="button" class="thing eki-btn way-edge" data-act="eki-sign" data-here="${here}" aria-label="往${name}" style="margin-left:${x}px;bottom:${y}px"><span class="tag">${ySign('bus', '往' + name)}</span></button>`; };
  function fromSign(el) {
    const yard = el.closest('.yard'), here = el.dataset.here; if (!yard || !SIGN[here]) return; yNamed(el);
    yHeroWalk(yard, SIGN[here][3], () => machine(yard, here));
  }
  // the announcements the rides say (their clips): of each ticket a machine sells, every つぎは on its way, the change at 白鷺 between the
  // lines, まもなく 終点 coming up to 湯の花, its arrival (終点 at a line's end) — みなと港's and the stops' own arrivals no ride says now
  const lines = (add) => {
    const seen = new Set(), one = (l) => { if (!seen.has(l)) { seen.add(l); add('ann', l); } };
    Object.entries(SELLS).forEach(([from, tos]) => tos.forEach((to) => EKI.legs(from, to).forEach((leg, k, all) => {
      if (k > 0) one(fill(L().change, { S: st('shirasagi'), L: lineName(leg.line)[0] })[0]);
      EKI.stops('普通', leg.to, leg.from).forEach((s) => one(fill(L().next, { S: st(s) })[0]));
      if (k < all.length - 1) return;
      if (leg.line === 'yama' && leg.to === 'yunohana') one(fill(L().soon, { S: st(leg.to) })[0]);
      one(fill(TERM.includes(leg.to) ? L().end : L().at, { S: st(leg.to) })[0]);
    })));
  };
  return Object.assign(api, { ticket, keep, fare, machine, board, go, signHtml, fromSign, lines, named, now: () => R, SCENE, SELLS });
})();
