'use strict';
// ---------- 券売機 and the train (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §9) ----------
// The hero's own rides on みなと線: at a station's ticket machine, the fare chart over it (that station 現在地) — find where you are
// going, press its fare (大人), put the money in: a ticket. On みなと's platform a train stopped with its doors open: aboard (no
// ticket: buy one first). Inside the car the world going by in the windows, the straps swaying, the LED over the door and the
// announcements (つぎは 川口、川口です), stop by stop to the end of the line — 白鷺 (the castle) or みなと港 (the harbour); a ticket
// short of it, the rest paid there (乗り越し精算). Home from either by its station's sign: the machine there, the ride back to
// みなと's platform. The bus stays free; the train costs, as trains do. One ticket at a time, kept on this device (a new one
// replaces it; a ride uses it up).
const RIDE = (() => {
  const TK = 'nq_ticket', SCENE = { shirasagi: 'castle', minatoko: 'harbor', minato: 'platform' };
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const L = () => TOWN.EKI.ride, api = { speed: 1 };
  let R = null, runs = 0;   // the ride now (the tests): { from, to, i, phase }
  const ms = (s) => (s * 1000) / api.speed;
  const ticket = () => { try { return JSON.parse(localStorage.getItem(TK) || 'null'); } catch (e) { return null; } };
  const keep = (t) => { try { if (t) localStorage.setItem(TK, JSON.stringify(t)); else localStorage.removeItem(TK); } catch (e) { /* none kept */ } };
  const spend = (n) => { const p = state.purse, dev = kotoDevice(); p.spent = p.spent || {}; p.spent[dev] = (Number(p.spent[dev]) || 0) + n; saveState(); if (typeof kotoButtons === 'function') kotoButtons(document); };
  const st = (id) => TOWN.EKI.LINE.find((x) => x[0] === id)[1];
  const fill = (l, o) => [l[0].replace(/\{S\}/g, o.S || '').replace('{P}', o.P || ''), l[1].replace(/\{s\}/g, o.s || '').replace('{p}', o.p || '')];
  // ---- the machine: the chart (fares from here), its screen, a button a fare, the coin slot, the ticket out ----
  function machine(yard, here) {
    const fares = [...new Set(EKI.line().filter((x) => x.id !== here).map((x) => EKI.fare(here, x.id)))].sort((a, b) => a - b);
    let pick = 0;
    const chart = `<div class="md-wall kb-wall"><div class="md-chart"><i class="md-rail"></i>${EKI.line().map((x) => x.id === here
      ? `<div class="md-st here"><b class="md-dot">●</b><span class="md-nm" lang="ja">${EKI.ruby(x.id)}</span><em>現在地</em></div>`
      : `<div class="md-st"><b class="md-dot${x.rapid ? '' : ' no'}">${x.rapid ? '●' : '○'}</b><span class="md-nm" lang="ja">${EKI.ruby(x.id)}</span><span class="md-f">${EKI.fare(here, x.id)}</span></div>`).join('')}</div>
      <p class="md-key"><span>大人（円）</span><span lang="ja">${ruby(st(here))}から</span></p></div>`;
    const screen = (l, cls = '') => { const e = document.querySelector('.kb-screen'); if (e) { e.innerHTML = `<b lang="ja">${ruby(l[0])}</b><span>${esc(l[1])}</span>`; e.className = 'kb-screen' + (cls ? ' ' + cls : ''); } };
    CLASS.card('kb-card', '券売機', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>券売機<rt>けんばいき</rt></ruby></b><span>${esc(EKI.name(here))}<ruby>駅<rt>えき</rt></ruby></span></div>${chart}
      <div class="kb-machine"><p class="kb-screen"></p><div class="kb-fares">${fares.map((f) => `<button type="button" class="kb-fare" data-f="${f}"><small>大人</small>${f}</button>`).join('')}</div>
        <div class="kb-row"><span class="kb-wallet">${yenIcon()}${yenStr(yenBalance())} 円</span><button type="button" class="btn btn-primary kb-pay" disabled lang="ja">お<ruby>金<rt>かね</rt></ruby>を <ruby>入<rt>い</rt></ruby>れる</button></div>
        <div class="kb-slot"></div></div>`, (e) => {
      const f = e.target.closest('.kb-fare'); if (f) { pick = Number(f.dataset.f); document.querySelectorAll('.kb-fare').forEach((x) => x.classList.toggle('on', x === f)); document.querySelector('.kb-pay').disabled = false; SND.play('tick', { vol: 0.5 }); screen(fill(L().put, { P: YEN.priceMark(pick), p: pick })); return; }
      if (e.target.closest('.kb-pay') && pick) {
        if (yenBalance() < pick) { playSfx('bad'); screen(L().short, 'bad'); toast(`錢包只有 ${yenStr(yenBalance())} 円。`, 2400); return; }
        spend(pick); keep({ from: here, fare: pick, day: todayStr() }); playSfx('coin', 3); SND.play('paper', { vol: 0.6 }); screen(L().take, 'ok');
        const w = document.querySelector('.kb-wallet'); if (w) w.innerHTML = `${yenIcon()}${yenStr(yenBalance())} 円`;
        document.querySelector('.kb-slot').innerHTML = `<div class="kb-ticket"><span lang="ja">${ruby(st(here))} → ${pick}円区間</span><b>${pick}円</b><small>${todayStr()}・大人</small></div>${here === 'minato' ? '<p class="kb-tip">從剪票口上月台，點停著的電車就能上車。</p>' : `<button type="button" class="btn btn-primary kb-ride" lang="ja"><ruby>電車<rt>でんしゃ</rt></ruby>に <ruby>乗<rt>の</rt></ruby>る</button>`}`;
        return;
      }
      if (e.target.closest('.kb-ride')) { CLASS.close(); board(yard, 0, here); }
    });
    const c = document.querySelector('.cls.kb-card'); if (c) c.dataset.here = here;   // which station's machine (the tests)
    screen(L().pick);
  }
  // ---- aboard: a ticket from here, enough with the money there is to reach the end; then the ride ----
  function board(yard, track, from = 'minato') {
    const t = ticket(), to = from !== 'minato' ? 'minato' : track === 1 ? 'shirasagi' : 'minatoko';
    if (!t || t.from !== from) { toast(from === 'minato' ? '要先買票：駅前站房前的紅色券売機。' : '要先在券売機買票。', 3200); if (yard) yPop(yard, yh.X + 600, 370 - yh.Y - 200 * yScale(yh.Y), 'きっぷ…'); return false; }
    const rest = Math.max(0, EKI.fare(from, to) - t.fare);
    if (rest > yenBalance()) { toast(`這張票只到 ${t.fare} 円的站，錢包也不夠補票（還要 ${rest} 円）。`, 3600); return false; }
    go(from, to); return true;
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
  function go(from, to) {
    const mine = ++runs, stops = EKI.stops('普通', to, from), t = ticket(), rest = Math.max(0, EKI.fare(from, to) - (t ? t.fare : 0));
    R = { from, to, i: 0, phase: 'run' };
    const el = (q) => document.querySelector('.rd-card ' + q), live = () => mine === runs && Boolean(el('.rd-car'));
    const led = (html) => { const e = el('.rd-led'); if (e) e.innerHTML = html; };
    const say = (l) => { const e = el('.rd-ann'); if (e) e.innerHTML = `<b lang="ja">${ruby(l[0])}</b><span>${esc(l[1])}</span>`; return speakAs('ann', l[0]); };
    const run = (on) => { const c = el('.rd-car'); if (c) c.classList.toggle('stop', !on); };
    CLASS.card('rd-card', 'みなと線', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja">みなと<ruby>線<rt>せん</rt></ruby></b><span lang="ja">${ruby(st(from))} → ${ruby(st(to))}</span></div>
      <div class="rd-box"><p class="rd-led" lang="ja"></p>${car(to)}</div><p class="rd-ann"></p><div class="rd-end"></div>`, (e) => {
      if (!e.target.closest('.rd-off') || R.phase !== 'end') return;
      if (rest) spend(rest);
      keep(null); R.phase = 'off'; CLASS.close(); SND.play('door-chime', { vol: 0.6 });
      const place = SCENE[to]; yh.arrive = { from: 'train', to: place }; window.go(PLACE_ROUTE[place]);
    });
    (async () => {
      SND.play('train-out', { vol: 0.4 });
      for (let i = 0; i < stops.length; i++) {
        if (!live()) return; R.i = i; R.phase = 'run'; run(true); const s = stops[i], o = { S: st(s), s: EKI.name(s) };
        led(`<small>つぎは</small> ${EKI.ruby(s)}`); say(fill(L().next, o));
        await sleep(ms(4.5)); if (!live()) return;
        if (s === to) break;
        R.phase = 'stop'; run(false); SND.play('door-chime', { vol: 0.5 }); led(EKI.ruby(s)); await sleep(ms(2.2)); SND.play('door-chime', { vol: 0.5 });
      }
      if (!live()) return; R.phase = 'end'; run(false); SND.play('train-in', { vol: 0.35 }); led(`${EKI.ruby(to)} <small>終点</small>`);
      say(fill(L().end, { S: st(to), s: EKI.name(to) }));
      el('.rd-end').innerHTML = `${rest ? `<p class="rd-pay" lang="ja">${ruby(fill(L().pay, { P: YEN.priceMark(rest) })[0])}<small>${esc(fill(L().pay, { p: rest })[1])}</small></p>` : ''}<button type="button" class="btn btn-primary rd-off" lang="ja"><ruby>降<rt>お</rt></ruby>りる</button>`;
    })();
  }
  // the station's sign out at 白鷺城 and みなと漁港 (way-edge: at the screen's edge when its spot is off it): walked to, its machine
  const SIGN = { shirasagi: ['白鷺駅', -560, 64, [-540, 110]], minatoko: ['みなと港駅', -556, 14, [-530, 30]] };
  const signHtml = (here) => { const [name, x, y] = SIGN[here]; return `<button type="button" class="thing eki-btn way-edge" data-act="eki-sign" data-here="${here}" aria-label="往${name}" style="margin-left:${x}px;bottom:${y}px"><span class="tag">${ySign('bus', '往' + name)}</span></button>`; };
  function fromSign(el) {
    const yard = el.closest('.yard'), here = el.dataset.here; if (!yard || !SIGN[here]) return; yNamed(el);
    yHeroWalk(yard, SIGN[here][3], () => machine(yard, here));
  }
  // the announcements for every station (their clips)
  const lines = (add) => EKI.line().forEach((x) => { add('ann', fill(L().next, { S: st(x.id) })[0]); add('ann', fill(L().end, { S: st(x.id) })[0]); });
  return Object.assign(api, { ticket, keep, machine, board, go, signHtml, fromSign, lines, now: () => R, SCENE });
})();
