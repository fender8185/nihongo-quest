"""test.5 (2026-11-27; the user: 「SE 上有 3 張打工說明卡要捲一下才看得到はい／いいえ。這種還是要讓使用者一開始就能看得到選項」, the pick
「說明卡＋打工中的回答（建議）」 and 「但感覺還是必須全面適配各種size，畢竟之後還是要上架到app store 和 googlestore」): at every size of the
matrix — five phones in Safari (360×640, 375×553, 390×664, 412×780, 430×740: mobile, device scale 2), an iPad either way (768×1024,
1024×768) and a laptop (1280×800) — the 打工 rules card's はい／いいえ are in view the moment it opens, its 詳細規則 shut or open; and in each of
the twelve jobs, from each customer's ask (each question, each ride, each kana), the controls the player answers with and the customer's
words are whole in view and take a tap (document.elementFromPoint at the middle, the top and the foot of each lands on it); and in the 外場,
when a customer orders by あれ, the poster it points at is in view (on the wall or held up as its card)."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8837
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"
SIZES = [(360, 640, True), (375, 553, True), (390, 664, True), (412, 780, True), (430, 740, True), (768, 1024, False), (1024, 768, False), (1280, 800, False)]
OUT = {}   # what each test saw, by test and size (NQ_SIZES_OUT: written out as JSON lines, for the report)

def keep(name, data):
    OUT[name] = data
    if os.environ.get('NQ_SIZES_OUT'):
        with open(os.environ['NQ_SIZES_OUT'], 'a', encoding='utf-8') as f: f.write(json.dumps({'test': name, 'data': data}, ensure_ascii=False) + '\n')

# a learner past 入門, every job open (the test site's switches: any place again, 駅前 and 湯の花 without their step and units, 收銀 without
# its numbers), 15:00 on a weekday (every keeper at their place), ふたつ learned; each job been at once before, never paid (no keeper's first
# word; the hero's 中文 under his lines, the first shift's: the tallest rows)
BEGIN = """const rec = () => ({ b: 2, due: addDays(todayStr(), 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(todayStr(), -1) });
  state.storyV = 99; state.startChosen = true; state.introSeen = true; state.stage = 'main'; state.kanaKnown = true; state.currentUnit = 'm1'; state.completedUnits = [];
  state.town = { done: {}, seen: {}, stops: { station: '2026-11-01', castle: '2026-11-01' }, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {}, gift: 1000 }; state.cruise = { done: {}, on: null, res: {} }; state.work = { res: {} };
  ['nq_work_free', 'nq_work_eki', 'nq_work_onsen', 'nq_work_nums'].forEach((k) => localStorage.setItem(k, '1'));
  ['ふたつ'].forEach((r) => { const v = REG.vocab.find((x) => x.r === r); if (v) state.srs[v.key] = rec(); });
  TOWNEV.clock = { h: 15, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)), yard = () => document.querySelector('.yard');
  const RR = (e) => e.getBoundingClientRect(), shown = (e) => Boolean(e) && e.isConnected && e.getClientRects().length > 0;
  const name = (e) => { if (!e) return 'nothing'; const c = e.getAttribute && e.getAttribute('class'); return (c ? c.split(' ')[0] : e.tagName.toLowerCase()) + (e.dataset && (e.dataset.o || e.dataset.k || e.dataset.good || e.dataset.g || e.dataset.p || e.dataset.ch || e.dataset.st || e.dataset.q || e.dataset.c || e.dataset.room || e.dataset.rules) ? '[' + (e.dataset.o || e.dataset.k || e.dataset.good || e.dataset.g || e.dataset.p || e.dataset.ch || e.dataset.st || e.dataset.q || e.dataset.c || e.dataset.room || e.dataset.rules) + ']' : ''); };
  // whole in the screen and in every box round it that clips, and a tap at its middle, its top and its foot (4 px in) lands on it: what is
  // wrong, else '' (over: what may lie over it and take the tap for it, the 仲居's cat on a futon's place). A thing drawn in a picture (the
  // 仲居's room: its window's drawing runs past the room's sides) by the part of it the picture shows: 24 px each way at least, or all of it
  function look(e, over) {
    if (!shown(e)) return 'not shown'; let r = RR(e); const W = innerWidth, H = innerHeight, drawn = Boolean(e.ownerSVGElement);
    if (r.width < 1 || r.height < 1) return 'no size';
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p); if (cs.display === 'contents' || !/(auto|scroll|hidden|clip)/.test(cs.overflowX + ' ' + cs.overflowY)) continue;
      const b = RR(p), t = b.top + p.clientTop, l = b.left + p.clientLeft, bot = t + p.clientHeight, rt = l + p.clientWidth;
      if (drawn) { const v = { top: Math.max(r.top, t), bottom: Math.min(r.bottom, bot), left: Math.max(r.left, l), right: Math.min(r.right, rt) };
        if (v.bottom - v.top < Math.min(24, r.height) - 0.5 || v.right - v.left < Math.min(24, r.width) - 0.5) return `cut by ${name(p)} to ${Math.round(v.right - v.left)}x${Math.round(v.bottom - v.top)}`;
        r = Object.assign({}, v, { width: v.right - v.left, height: v.bottom - v.top }); continue; }
      if (r.top < t - 0.5 || r.bottom > bot + 0.5 || r.left < l - 0.5 || r.right > rt + 0.5) return `cut by ${name(p)} ${Math.round(r.top - t)}/${Math.round(bot - r.bottom)}${r.left < l - 0.5 || r.right > rt + 0.5 ? ` ↔${Math.round(r.left - l)}/${Math.round(rt - r.right)}` : ''}`;
    }
    if (r.top < -0.5 || r.bottom > H + 0.5 || r.left < -0.5 || r.right > W + 0.5) return `off screen ${Math.round(r.top)}..${Math.round(r.bottom)} / ${H}`;
    const x = r.left + r.width / 2, d = Math.min(4, r.height / 4);
    for (const y of [r.top + r.height / 2, r.top + d, r.bottom - d]) { const h = document.elementFromPoint(x, y); if (!h || !(h === e || e.contains(h) || (over && h.closest(over)))) return `under ${name(h)} at ${Math.round(y)}`; }
    return '';
  }"""
# the jobs' own dice from the start of a shift (the moves tests' MOVES_SEED, test_ekimae; the 外場's too): the same customers at every size
SEED = """ { const orig = Math.random.bind(Math); let sd = 424242; const seeded = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    Math.random = function () { return /71w_|71s_jobs|71u_hall/.test((new Error()).stack || '') ? seeded() : orig(); }; }"""

# ---- the rules card (WORK.intro): はたらきますか？ with はい／いいえ at its foot, in view as it opens, 詳細規則 shut and open ----
RULES = """ const JOBS12 = Object.keys(WORK.PLACES), out = {}; location.hash = '#/chinadori'; route(); await wait(300);
  for (const job of JOBS12) for (const open of [false, true]) {
    WORK.intro(yard(), job); await wait(60); const card = document.querySelector('.wk-rules .cls-card'); if (!card) { out[job + (open ? '+' : '')] = ['no card']; continue; }
    if (open) { card.querySelector('details.wk-fold summary').click(); await wait(60); }
    const bad = ['yes', 'no'].map((k) => [k, look(card.querySelector(`[data-rules="${k}"]`))]).filter(([, w]) => w);
    const ask = look(card.querySelector('.wk-ask b'));
    out[job + (open ? '+' : '')] = bad.map(([k, w]) => k + ': ' + w).concat(ask ? ['ask: ' + ask] : [], card.querySelector('details.wk-fold').open === open ? [] : ['fold']);
    CLASS.close(); await wait(30); }
  return JSON.stringify(out);"""

def test_the_rules_cards_ask_in_view_at_every_size(b):
    seen, bad = {}, []
    for w, h, mobile in SIZES:
        r = json.loads(b.run([("metrics", (w, h, mobile)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + RULES + " })()")], timeout=120)[-1])
        seen[f'{w}x{h}'] = {k: v for k, v in r.items() if v}
        bad += [(f'{w}x{h}', k, v) for k, v in r.items() if v]
        if len(r) != 24: bad.append((f'{w}x{h}', 'cards', len(r)))
    keep('rules', seen)
    assert bad == [], bad[:20]

# ---- the twelve jobs: each a kit — CARD (its card; none: the 外場's floor), UNIT, PLACE, START (its shift begun, seeded), ASK() (a
# customer asks now: their question up, its controls on), KEY() (which ask: a customer, a step, a crossing), WORDS() (their words),
# CONTROLS() (what the player answers with now), PLAY() (the right answer), STEP() (what moves a shift on between asks), OVER (what may
# lie over a control and take its tap) ----
KITS = {
  'counter': ('.wk-counter', 'm1', 'chinadori', '', """
    const ASK = () => Boolean(JOBS.counter.now()) && Boolean(q('.wk-cust.on .wk-bub .wk-ear')), KEY = () => 'c' + idOf(JOBS.counter.now());
    const WORDS = () => q('.wk-cust .wk-bub'), CONTROLS = () => qa('.wk-good');
    const PLAY = async () => { const C = JOBS.counter.now(), g = qa('.wk-good').find((x) => x.dataset.good === C.good[0]); if (!g) return; g.click(); if (C.kind === 'two') g.click(); };"""),
  'till': ('.wk-till', 'm1', 'chinadori', '', """
    const ASK = () => Boolean(JOBS.till.now()) && Boolean(q('.wk-cust.on')) && Boolean(q('.wk-tile:not(:disabled)')), KEY = () => 't' + idOf(JOBS.till.now());
    const WORDS = () => q('.wk-cust .wk-bub'), CONTROLS = () => qa('.wk-tile');
    const PLAY = async () => { for (const p of JOBS.till.now().parts) { const x = qa('.wk-tile').find((y) => y.dataset.p === p && !y.disabled); if (x) x.click(); } };"""),
  'buns': ('.wk-buns', 'm1', 'chinatown', '', """
    const ASK = () => { const n = JOBS.buns.now(); return Boolean(n && n.target) && !n.wait && Boolean(q('.wk-key')); }, KEY = () => 'b' + JOBS.buns.now().tap;
    const WORDS = () => q('.wk-krow .wk-ear'), CONTROLS = () => qa('.wk-key');
    const PLAY = async () => { const x = q(`.wk-key[data-k="${JOBS.buns.now().target}"]`); if (x) x.click(); };"""),
  'waiter': (None, 'm1', 'rairai', 'HALL.pace = 0.02; HALL.pat = 1000;', """
    const ASK = () => { const n = HALL.now(); return Boolean(n && n.ask) && Boolean(document.querySelector('.hl-pick .hl-opt')); }, KEY = () => 'h' + idOf(document.querySelector('.hl-pick'));
    const WORDS = () => document.querySelector('.hl-pick .hl-q'), CONTROLS = () => [...document.querySelectorAll('.hl-pick .hl-opt')];
    const PLAY = async () => { const a = HALL.now().ask, x = CONTROLS().find((y) => y.dataset.o === a.right); if (x) x.click(); };
    const goTo = async (k) => { const u = k.startsWith('table') ? RAIRAI.at.table(Number(k.slice(5))) : RAIRAI.at[k], g = isoClamp(isoXY(...u)); yh.X = g[0]; yh.Y = g[1]; yHeroPlace(yard()); yCamTo(yard(), yh.X); HALL.at(yard(), k); await wait(80); };   // walked there: the camera settled on him
    const STEP = async () => { const n = HALL.now(); if (!n || n.over) return; const c = n.cust;
      if (n.phone) return goTo('register'); if (c.some((x) => x.state === 'in')) return goTo('entry');
      if (c.some((x) => x.state === 'wait')) { const free = [0, 1, 2].find((t) => !c.some((x) => x.table === t)); if (free !== undefined) return goTo('table' + free); }
      const w = c.find((x) => x.spot && x.spot.startsWith('table') && (x.q || x.state === 'call' || x.state === 'drop')); if (w) return goTo(w.spot);
      if (n.tray) { const t = c.find((x) => x.id === n.tray.for); if (t) return goTo('table' + t.table); }
      if (n.ready.length) return goTo('pass'); if (c.some((x) => x.state === 'pay')) return goTo('register'); };
    const DONE = () => { const n = HALL.now(); return !n || n.over; };"""),
  'bento': ('.wk-bento', 'm6', 'platform', 'JOBS.pat.scale = 0.2;', """
    const B = () => BENTO_RUN.now(), still = () => !q('.bt-car').getAnimations().some((a) => a.playState === 'running');   // the car stood still (this test's sleeps are a tenth; its slide in is not)
    const ASK = () => { const b = B(); return Boolean(b && b.phase === 'stop' && b.sel && b.sel.heard && b.sel.state === 'calling') && still(); };
    const KEY = () => { const x = B().sel; return 'w' + x.k + (x.o.kind === 'have' ? (x.asked ? '+' : '?') : ''); };
    const WORDS = () => q('.bt-bub'), CONTROLS = () => qa('.bt-good, .bt-give, .bt-reply, .bt-win');   // the windows too (fix round 1)
    const SIZE = () => qa('.bt-win').map((e) => e.getBoundingClientRect()).filter((r) => r.width < 39.5 || r.height < 39.5).map((r) => `a window ${Math.round(r.width)}×${Math.round(r.height)}`);   // 40 × 40 to tap at the least (fix round 1, the review's Minor 9)
    // the goods they want and one more taken (fix round 1: the hand one row that slides — the chip just taken whole in sight, a tap on it
    // landing; the hand's height as it was), that one put back, どうぞ
    const PLAY = async () => { const x = B().sel; if (x.o.kind === 'have' && !x.asked) { const r = q(`.bt-reply[data-r="${x.o.has ? 'yes' : 'no'}"]`); if (r) r.click(); return; }
      const want = x.o.items.map(([id]) => id), extra = qa('.bt-good').map((g) => g.dataset.g).find((g) => !want.includes(g)), h0 = q('.bt-hand').getBoundingClientRect().height;
      for (const [id, n] of x.o.items) for (let i = 0; i < n; i++) { const g = q(`.bt-good[data-g="${id}"]`); if (g) g.click(); }
      const e = q(`.bt-good[data-g="${extra}"]`); if (e) { e.click(); await frames(); const k = KEY(), ch = q(`.bt-chip[data-drop="${extra}"]`), w = look(ch); if (w) out.bad.push([k, 'chip[' + extra + ']', w]);
        const h1 = q('.bt-hand').getBoundingClientRect().height; if (Math.abs(h1 - h0) > 0.5) out.bad.push([k, 'hand', `${Math.round(h0)} → ${Math.round(h1)} px`]); if (ch) ch.click(); }
      const gv = q('.bt-give'); if (gv) gv.click(); };
    const STEP = async () => { const b = B(); if (b && b.phase === 'stop' && (!b.sel || b.sel.state !== 'calling')) { const w = q('.bt-win.calling'); if (w) w.click(); } };"""),
  'window': ('.wk-window', 'm2', 'station', '', """
    const M = () => MADO_RUN.now(), buying = (n) => n.task.kind === 'buy' && !n.printed;
    const ASK = () => { const n = M(); return Boolean(n) && n.phase === 'ask' && (buying(n) ? Boolean(q('.md-chart.pick')) : Boolean(q('.md-opt'))); };
    const KEY = () => { const n = M(); return 'm' + n.k + (n.task.kind === 'buy' ? (n.printed ? '+' : '?') : ''); };
    const WORDS = () => q('.wk-cust .wk-bub'), CONTROLS = () => (buying(M()) ? qa('.md-st[data-st]') : qa('.md-opt'));
    const PLAY = async () => { const n = M(); if (buying(n)) { const s = q(`.md-st[data-st="${n.task.to}"]`); if (s) s.click(); return; } const o = q(`.md-opt[data-o="${n.task.right}"]`); if (o) o.click(); };"""),
  'lost': ('.wk-lost', 'm4', 'station', 'window.voiceFx = () => Promise.resolve();', """
    const L = () => LOST_RUN.now(), asking = (n) => n.phase === 'ask' || n.phase === 'ask2';
    const ASK = () => { const n = L(); return Boolean(n) && (asking(n) ? Boolean(q('.lf-q:not(:disabled)')) : n.phase === 'find' && Boolean(q('.lf-cand'))); };
    const KEY = () => { const n = L(); return 'l' + n.k + n.phase + Object.keys(n.know).filter((x) => n.know[x]).sort().join(''); };
    const WORDS = () => q('.lf-counter .wk-cust .wk-bub'), CONTROLS = () => (L().phase === 'find' ? qa('.lf-cand, .lf-acts .btn') : qa('.lf-q'));
    const PLAY = async () => { const n = L(), t = n.task;
      if (asking(n)) { const k = qa('.lf-q').map((x) => x.dataset.q).find((x) => !n.know[x]), b = k && q(`.lf-q[data-q="${k}"]`); if (b && !b.disabled) b.click(); return; }
      if (t.type === 'none' || t.type === 'gag') { const b = q(t.type === 'none' ? '.lf-none' : '.lf-gag'); if (b) b.click(); return; }
      const c = t.cands.findIndex((x) => x.color === t.color && x.dim === t.dim && x.inside.join() === t.inside.join()), cb = q(`.lf-cand[data-c="${c}"]`); if (cb) cb.click(); await wait(30); const g = q('.lf-give'); if (g) g.click(); };"""),
  # (the taxi's pace 0.5: a crossing waits 0.3 s here — at 0.05, 30 ms, a ride's first went straight on by itself before it was looked at: fix round 1)
  'taxi': ('.wk-taxi', 'm4', 'station', 'JOBS.pat.scale = 0.5; TAXI.tips = false;', """
    const X = () => TAXI_RUN.now(), ASK = () => { const n = X(); if (!n) return false; if (n.phase === 'pay') return Boolean(q('.tx-pay')); return n.phase === 'drive' && n.choosing && Boolean(q('.tx-go:not(:disabled)')); };
    const KEY = () => { const n = X(); return 'x' + n.k + '/' + n.phase + '/' + n.i + '/' + n.steps; };
    const WORDS = () => q('.tx-bub'), CONTROLS = () => (X().phase === 'pay' ? qa('.tx-pay') : qa('.tx-go'));
    const PLAY = async () => { const n = X(); if (n.phase === 'pay') { const b = q(`.tx-pay[data-o="${n.payRight}"]`); if (b) b.click(); return; }
      const right = n.ride.guided ? n.want : TAXI.route(n.at, n.h, TAXI.where(n.ride.to))[0], b = q(`.tx-go[data-ch="${right}"]`); if (b && !b.disabled) b.click(); };"""),
  'annai': ('.wk-annai', 'm7', 'onsen', "state.work.res[dateStr(TOWNEV.today())] = { place: 'annai', done: 0, score: {}, keep: { seed: SEEDV } };", """
    const A = () => ANNAI_RUN.now(), ASK = () => { const n = A(); return Boolean(n) && n.phase === 'ask' && Boolean(q('.an-opt:not(:disabled)')); };
    const KEY = () => { const n = A(); return 'a' + n.k + '/' + n.step; };
    const WORDS = () => q('.wk-cust .wk-bub'), CONTROLS = () => qa('.an-opt');
    const PLAY = async () => { const n = A(), b = q(`.an-opt[data-o="${n.task.opts.findIndex((o) => o[2])}"]`); if (b && !b.disabled) b.click(); };"""),
  'nakai': ('.wk-nakai', 'm8', 'ryokan', "state.work.res[dateStr(TOWNEV.today())] = { place: 'nakai', done: 0, score: {}, keep: { seed: SEEDV } };", """
    const N = () => NAKAI_RUN.now(), ASK = () => { const n = N(); if (!n || n.busy) return false; return n.phase === 'ask' ? Boolean(q('.nk-opt:not(:disabled)')) : n.phase === 'do'; };
    const KEY = () => { const n = N(); return 'n' + n.k + n.phase + (n.phase === 'do' ? JSON.stringify(n.st[n.task.target[0]]) : ''); };
    const WORDS = () => q('.nk-bub'), CONTROLS = () => { const n = N(); return n.phase === 'ask' ? qa('.nk-opt') : qa(`.nk-art [data-k="${n.task.target[0]}"]`); }, OVER = '.nk-art [data-k]';
    const PLAY = async () => { const n = N(); if (n.phase === 'ask') { const b = q(`.nk-opt[data-o="${n.task.opts.findIndex((o) => o[2])}"]`); if (b && !b.disabled) b.click(); return; }
      const [key] = n.task.target; if (Array.isArray(n.st[key])) { const i = n.st[key].findIndex((x, j) => !x && !(key === 'futon' && j === 0 && n.st.cat)); NAKAI.tap(key, i >= 0 ? i : 0); } else NAKAI.tap(key); };"""),
  'miyage': ('.wk-miyage', 'm11', 'yudori', "state.work.res[dateStr(TOWNEV.today())] = { place: 'miyage', done: 0, score: {}, keep: { seed: SEEDV } };", """
    const Y = () => MIYAGE_RUN.now(), ASK = () => { const n = Y(); return Boolean(n) && !n.busy && (n.phase === 'pick' || (n.phase === 'reply' && Boolean(q('.om-opt:not(:disabled)')))); };
    const KEY = () => { const n = Y(); return 'y' + n.k + n.phase + ':' + n.c.kind; };
    const WORDS = () => q('.wk-cust .wk-bub'), CONTROLS = () => (Y().phase === 'pick' ? qa('.om-good, .om-give') : qa('.om-opt')), TALK = () => q('.om-talk');   // the talk row whole too (fix round 1: the replies a sheet over the shelves)
    const PLAY = async () => { const n = Y(); if (n.phase === 'pick') { MIYAGE.answer(n.c).forEach((g) => { const b = q(`.om-good[data-g="${g}"]`); if (b && !Y().tray.includes(g)) b.click(); }); await wait(30); const gv = q('.om-give'); if (gv) gv.click(); return; }
      const b = q(`.om-opt[data-o="${n.c.opts.findIndex((o) => o[2])}"]`); if (b && !b.disabled) b.click(); };"""),
  'front': ('.wk-front', 'm15', 'ryokan', "TOWNEV.clock = { h: MORNING ? 9 : 15, day: new Date(2026, 10, 10) }; state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done: 0, score: {}, keep: { seed: SEEDV, morning: MORNING } };", """
    const F = () => FRONT_RUN.now(), ASK = () => { const n = F(); if (!n || n.phase !== 'ask') return false; return n.step === 1 ? Boolean(q('.fr-key')) : Boolean(q('.fr-opt:not(:disabled)')); };
    const KEY = () => { const n = F(); return 'f' + n.k + '/' + n.step; };
    const WORDS = () => q('.wk-cust .wk-bub'), CONTROLS = () => (F().step === 1 ? qa('.fr-key:not(.fr-out)') : qa('.fr-opt'));
    const PLAY = async () => { const n = F(); if (n.step === 1) { const k = q(`.fr-key[data-room="${n.task.room}"]`); if (k) k.click(); return; }
      const b = q(`.fr-opt[data-o="${n.task.opts.findIndex((o) => o[2] && o[3] !== 'bday')}"]`); if (b && !b.disabled) b.click(); };"""),
}
# each ask looked at two frames in (the ask's own frame drawn); answered right at once; the shift to its end (or LIMIT). Every ask on
# show in any painted frame (a watcher each frame) must have been looked at — none skipped (fix round 1, the review's Important 6) — and
# the shift must have come to its end
PROBE = """ const ids = new Map(), idOf = (o) => { if (o == null) return null; if (!ids.has(o)) ids.set(o, ids.size); return ids.get(o); };
  const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  const out = { asks: 0, keys: [], bad: [], tops: [], ended: false }, seen = new Set(), onShow = new Set(), T0 = Date.now(); let opened = false, last = '', since = 0, watching = true;
  const watch = () => { if (!watching) return; try { if (ASK()) onShow.add(KEY()); } catch (e) { /* between customers */ } requestAnimationFrame(watch); }; requestAnimationFrame(watch);
  const done = typeof DONE === 'function' ? DONE : () => (opened && !document.querySelector(CARD)) || Boolean(document.querySelector('.wk-result'));
  while (Date.now() - T0 < LIMIT) {
    if (CARD && document.querySelector(CARD)) opened = true; if (CARD ? done() : opened && done()) { out.ended = true; break; } if (!CARD && HALL.now()) opened = true;
    if (ASK()) { const k = KEY();
      if (!seen.has(k)) { seen.add(k); await frames(); if (ASK() && KEY() === k) { out.asks++; out.keys.push(k);
          [['words', WORDS()], ...(typeof TALK === 'function' ? [['talk', TALK()]] : []), ...CONTROLS().map((e) => [name(e), e])].forEach(([n, e]) => { const w = look(e, typeof OVER === 'string' ? OVER : null); if (w) out.bad.push([k, n, w]); });
          if (typeof SIZE === 'function') SIZE().forEach((w) => out.bad.push([k, 'size', w]));
          const cd = CARD && document.querySelector(CARD + ' .cls-card'); if (cd && !cd.closest('.cls').getAnimations({ subtree: true }).some((x) => x.playState === 'running' && x.effect && x.effect.target && x.effect.target.contains(cd))) out.tops.push(Math.round(cd.getBoundingClientRect().top * 2) / 2); } }   // (the card's own opening, rising into place, waited out)
      if (k !== last || Date.now() - since > 1500) { last = k; since = Date.now(); await PLAY(); } }
    else if (typeof STEP === 'function') await STEP();
    await wait(25); }
  watching = false; out.missed = [...onShow].filter((k) => !out.keys.includes(k)).map(String);   // on show in a frame, never looked at
  out.secs = Math.round((Date.now() - T0) / 1000); document.querySelectorAll('.wk-result').forEach((x) => x.remove()); CLASS.close(); if (typeof HALL === 'object') HALL.stop();
  return JSON.stringify(out);"""

# the onsen's shifts by their seeds — those the iPhone tests bring every kind of customer with (test_onsen's IP_JOBS): (seed, morning)
# (fix round 1: test_onsen's IP_JOBS at 390×664 and seed 5 at its other sizes, every kind of customer of each job; the おみやげ屋's three 目上 —
# 部長, ゼミの先生, 先生 — seeds 13, 1 and 2)
SEEDS = {'annai': [(5, False), (6, False), (14, False)], 'nakai': [(3, False), (5, False)], 'miyage': [(13, False), (1, False), (2, False), (5, False)], 'front': [(5, False), (14, False), (1, True)]}

def run_job(b, job, w, h, mobile, limit=150000, seed=None, pre=''):
    card, unit, place, setup, kit = KITS[job]
    sd, morning = seed or (SEEDS.get(job) or [(1, False)])[0]
    setup = setup.replace('SEEDV', str(sd)).replace('MORNING', 'true' if morning else 'false')
    js = ("(async () => { " + BEGIN + f" state.currentUnit = '{unit}'; window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();"
          + " const s0 = window.sleep; window.sleep = (ms) => s0(ms / 10);"   # the lines' fixed waits ten times shorter: the layout is the same
          + f" state.work.res['2026-01-01'] = {{ place: '{job}', done: 1, score: {{ 0: 0 }} }}; JOBS.pat.scale = 1000; {setup} saveState();"
          + f" location.hash = '#/{place}'; route(); await wait(500);" + pre + SEED + f" WORK.start(yard(), '{job}');"
          + f" const CARD = {json.dumps(card)}, LIMIT = {limit}, q = (s) => document.querySelector((CARD ? CARD + ' ' : '') + s), qa = (s) => [...document.querySelectorAll((CARD ? CARD + ' ' : '') + s)];"
          + kit + PROBE + " })()")
    return json.loads(b.run([("metrics", (w, h, mobile)), ("nav", URL), ("wait", READY), ("eval", js)], timeout=limit / 1000 + 60)[-1])

# every ask of the shift looked at, the same count at every size: a skipped one fails (fix round 1: the review's Important 6 — a floor under
# the counts seen let one pass); by job, or by job and seed. The 外場's floor runs by the clock (the hero walking, customers coming in), its
# asks 43–45 by size: none (every ask on show looked at, and the shift to its end, as for every job)
ASKS = {'counter': 10, 'till': 10, 'buns': 30, 'waiter': None, 'bento': 12, 'window': 12, 'lost': 28, 'taxi': 23, 'annai': {5: 10, 6: 10, 14: 10}, 'nakai': {3: 20, 5: 20}, 'miyage': {13: 14, 1: 14, 2: 14, 5: 14}, 'front': {5: 13, 14: 13, 1: 11}}

def check_job(b, job):
    seen, bad = {}, []
    for w, h, mobile in SIZES:
        for seed in SEEDS.get(job, [None]):
            r, at = run_job(b, job, w, h, mobile, seed=seed), f'{w}x{h}' + (f' seed {seed[0]}' + (' am' if seed[1] else '') if seed and len(SEEDS[job]) > 1 else '')
            seen[at] = {'asks': r['asks'], 'secs': r['secs'], 'bad': r['bad'][:40], 'nbad': len(r['bad']), 'out': len({x[0] for x in r['bad']}), 'tops': sorted(set(r['tops'])), 'missed': r['missed'], 'ended': r['ended']}
            if h < 700 and r['tops'] and max(r['tops']) - min(r['tops']) > 0.5: bad.append((job, at, 'the card re-centred between asks', sorted(set(r['tops']))))   # on a phone its top anchored (fix round 1, the review's Minor 8)
            want = ASKS[job][seed[0]] if isinstance(ASKS[job], dict) else ASKS[job]
            if want is not None and r['asks'] != want: bad.append((job, at, 'asks', r['asks'], 'not', want))
            if r['missed'] or not r['ended']: bad.append((job, at, 'asks on show not looked at', r['missed'][:6], 'the shift ended' if r['ended'] else 'the shift never ended'))
            bad += [(job, at) + tuple(x) for x in r['bad'][:6]]
    keep(job, seen)
    assert bad == [], bad[:24]

def test_the_answers_are_in_view_at_every_size_counter(b): check_job(b, 'counter')
def test_the_answers_are_in_view_at_every_size_till(b): check_job(b, 'till')
def test_the_answers_are_in_view_at_every_size_buns(b): check_job(b, 'buns')
def test_the_answers_are_in_view_at_every_size_waiter(b): check_job(b, 'waiter')
def test_the_answers_are_in_view_at_every_size_bento(b): check_job(b, 'bento')
def test_the_answers_are_in_view_at_every_size_window(b): check_job(b, 'window')
def test_the_answers_are_in_view_at_every_size_lost(b): check_job(b, 'lost')
def test_the_answers_are_in_view_at_every_size_taxi(b): check_job(b, 'taxi')
def test_the_answers_are_in_view_at_every_size_annai(b): check_job(b, 'annai')
def test_the_answers_are_in_view_at_every_size_nakai(b): check_job(b, 'nakai')
def test_the_answers_are_in_view_at_every_size_miyage(b): check_job(b, 'miyage')
def test_the_answers_are_in_view_at_every_size_front(b): check_job(b, 'front')

# ---- no container units (Safari before 16: the iPhone 6s/7 stay on iOS 15) — the rules using them dropped, whole shorthands with them, as
# an old parser drops them, and the `@supports not (height: 1cqh)` blocks' rules in force: the 賣便當 on an SE and a 360×640 phone, its
# goods, どうぞ, はい／いいえ, windows and the passenger's words in view and taking taps at every ask (fix round 1, the review's Minor 10: the
# tray's last row 22 px under the fold on an SE) ----
NOCQ = r""" { const CQ = /cq[whib]|cqmin|cqmax/, NOT = /not \(height: 1cqh\)/, lift = [];
    const kill = (list) => { for (let i = list.length - 1; i >= 0; i--) { const r = list[i]; if (r.cssRules && !(r instanceof CSSSupportsRule && NOT.test(r.conditionText))) kill(r.cssRules);
      if (r instanceof CSSStyleRule) { const st = r.style; ['flex', 'inset', 'margin', 'padding', 'font', 'gap', 'grid-template'].forEach((x) => { if (CQ.test(st.getPropertyValue(x))) st.removeProperty(x); });
        for (let j = st.length - 1; j >= 0; j--) { const p = st[j]; if (CQ.test(st.getPropertyValue(p)) || p === 'container-type') st.removeProperty(p); } } } };
    const walk = (list) => { for (const r of list) { if (r instanceof CSSSupportsRule && NOT.test(r.conditionText)) for (const x of r.cssRules) lift.push(x.cssText); else if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } kill(rs); walk(rs); }
    const st = document.createElement('style'); st.textContent = lift.join('\n'); document.head.appendChild(st); }"""

def test_the_bento_fits_without_container_units(b):
    seen, bad = {}, []
    for w, h in ((375, 553), (360, 640)):
        r = run_job(b, 'bento', w, h, True, pre=NOCQ)
        seen[f'{w}x{h}'] = {'asks': r['asks'], 'bad': r['bad'][:20]}
        want = ASKS['bento']
        if r['asks'] != want: bad.append((f'{w}x{h}', 'asks', r['asks'], 'not', want))
        if r['missed'] or not r['ended']: bad.append((f'{w}x{h}', 'asks on show not looked at', r['missed'][:6], 'the shift ended' if r['ended'] else 'the shift never ended'))
        bad += [(f'{w}x{h}',) + tuple(x) for x in r['bad'][:8]]
    keep('bento-nocq', seen)
    assert bad == [], bad

# ---- 外場's あれ (js/71u_hall.js:322–330, test.5): an order by これ／それ／あれ — これ the menu in the customer's hands, それ the board in the
# hero's, あれ the にんき poster on the far wall — at every size: once the room has lifted over the panel, the wall's poster whole over the
# panel and clear of the HUD, or its card held up there (the screen's left, under the HUD). Every group orders by pointing, by あれ
# (HALL.force.order, .word); the first two looked at ----
POSTER = r""" HALL.pace = 0.02; HALL.pat = 1000; HALL.force = { order: 'order', word: 'あれ' }; state.work.res['2026-01-01'] = { place: 'waiter', done: 1, score: { 0: 0 } }; saveState();
  location.hash = '#/rairai'; route(); await wait(500);""" + SEED + r""" WORK.start(yard(), 'waiter');""" + KITS['waiter'][4] + r"""
  const out = { orders: [], are: [] }, T0 = Date.now(), seen = new Set(), ids = new Map(), idOf = (o) => { if (!ids.has(o)) ids.set(o, ids.size); return ids.get(o); };
  const box = (e) => { if (!shown(e)) return null; const r = RR(e); return [r.left, r.top, r.right, r.bottom]; };
  while (Date.now() - T0 < 60000 && !DONE() && out.are.length < 2) {
    if (ASK()) { const a = HALL.now().ask, k = KEY();
      if (a.kind === 'order' && !seen.has(k)) { seen.add(k); out.orders.push(a.word);
        if (a.word === 'あれ') { await wait(700);   // the room lifted (its .35 s glide) and the card, if any, up
          const pk = RR(document.querySelector('.hl-pick')), hud = document.querySelector('.hl-hud'), hb = hud ? RR(hud) : null, top = hb ? hb.bottom : 0, card = document.querySelector('.hl-poster'), wall = document.querySelector('.use-btn[data-use="poster"]');
          const clear = (q) => !hb || q[0] >= hb.right || q[2] <= hb.left || q[1] >= hb.bottom || q[3] <= hb.top;   // not under the HUD
          const inside = (q) => Boolean(q) && q[0] >= -0.5 && q[2] <= innerWidth + 0.5 && q[1] >= -0.5 && q[3] <= pk.top + 0.5 && clear(q);
          out.are.push({ card: box(card), wall: box(wall), top: Math.round(top), pick: Math.round(pk.top), ok: inside(box(card)) || (!card && inside(box(wall))) }); } }
      await PLAY(); }
    else await STEP();
    await wait(25); }
  HALL.stop(); return JSON.stringify(out);"""

def test_the_hall_shows_the_poster_when_are_is_asked(b):
    seen, bad = {}, []
    for w, h, mobile in SIZES:
        r = json.loads(b.run([("metrics", (w, h, mobile)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + " window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); const s0 = window.sleep; window.sleep = (ms) => s0(ms / 10); const CARD = null, q = (x) => document.querySelector(x), qa = (x) => [...document.querySelectorAll(x)];" + POSTER + " })()")], timeout=120)[-1])
        seen[f'{w}x{h}'] = r
        if not r['are']: bad.append((f'{w}x{h}', 'no あれ asked', r['orders']))
        bad += [(f'{w}x{h}', x) for x in r['are'] if not x['ok']]
    keep('poster', seen)
    assert bad == [], bad

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    only = sys.argv[1:]
    failed = 0
    try:
        for t in TESTS:
            if only and t.__name__ not in only: continue
            err = None
            for attempt in (1, 2):   # a second try with a fresh browser absorbs load-related flakiness
                with Browser() as b:
                    try:
                        t(b); print("ok  ", t.__name__ + (" (retry)" if attempt == 2 else "")); err = None; break
                    except Exception as e:
                        err = e
            if err is not None:
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:900])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
