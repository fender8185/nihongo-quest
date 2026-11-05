"""2026-11-05 (1.0.41): 進度動畫只在打開頁面時播一次、答對彈一下／答錯晃一下、練習進度條滑過去、結算圓環從這組開始前轉上去、數字往上跳。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8804
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
# the CSS animations running on what a selector finds (pseudo-elements included)
NAMES = "const names = (sel) => [...document.querySelectorAll(sel)].flatMap(x => x.getAnimations({ subtree: true }).map(a => a.animationName)).sort();"
# answers the current session to its last card, one in three wrong, and leaves the summary on screen
FINISH = """{ let guard = 0, k = 0;
  while (SESSION && SESSION.idx < SESSION.entries.length && guard++ < 500) {
    const e = currentEntry();
    if (e.preview && !e.previewDone) { dismissPreview(); continue; }
    if (!e.q) { prepareEntry(SESSION.idx); continue; }
    if (!e.done) { const q = e.q; answerCurrent((!e.requeued && !e.encore && k % 3 === 1) ? (q.answer + 1) % q.options.length : q.answer); k++; if (!e.done) e.done = true; }
    nextQuestion();
  } }"""

def test_today_plays_when_opened_not_when_drawn_again(b):
    js = "(async () => { " + FRESH + NAMES + """ location.hash = '#/stats'; route(); location.hash = '#/today'; route();
      const look = () => { const ring = document.querySelector('.today-card .ring');
        return { ring: ring.classList.contains('anim'), ringNames: names('.today-card .ring .arc'), from: +ring.style.getPropertyValue('--from'),
          bar: document.querySelector('[data-panel="unit"] .bar.stack').classList.contains('anim'), barNames: names('[data-panel="unit"] .bar.stack') }; };
      const opened = look();
      route(); const again = look();   // a sync or a setting draws the same page again
      const tab = document.querySelector('.hero-tab[data-tab="unit"]'); ACTIONS['hero-tab'](tab); ACTIONS['hero-tab'](tab); const unitTab = look();
      return JSON.stringify({ opened, again, unitTab, c: 2 * Math.PI * 42 }); })()"""
    r = json.loads(ev(b, js))
    o = r['opened']
    assert o['ring'] and o['ringNames'] == ['ringIn'] and abs(o['from'] - r['c']) < 0.01, r   # from 0%
    assert o['bar'] and o['barNames'] == ['uncover'], r
    assert r['again'] == {'ring': False, 'ringNames': [], 'from': o['from'], 'bar': False, 'barNames': []}, r
    assert not r['unitTab']['ring'] and r['unitTab']['bar'] and r['unitTab']['barNames'] == ['uncover'], r   # opening 目前單元 fills its bar again, the ring keeps still

def test_stats_gauges_play_when_opened_and_on_a_new_scope(b):
    js = "(async () => { " + FRESH + NAMES + """ const v = REG.vocab.find(x => x.builtin && x.lv === 'N5'); const t = todayStr();
      state.srs[v.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) }; saveState();
      location.hash = '#/today'; route(); location.hash = '#/stats'; route();
      const look = () => { const g = document.querySelector('#progressCard .gauge[data-kind="v"]');
        return { anim: g.classList.contains('anim'), names: names('#progressCard .gauge[data-kind="v"]'), masked: g.querySelectorAll('g[mask] path.arc').length, arcs: g.querySelectorAll('path.arc').length,
          a: g.style.getPropertyValue('--a').trim(), want: (-1.8 * +g.dataset.pct).toFixed(1) + 'deg' }; };
      const opened = look(); route(); const again = look();
      ACTIONS['stats-scope']({ dataset: { scope: statsScopes()[1][0] } }); const scoped = look();
      statsScope = 'all'; return JSON.stringify({ opened, again, scoped }); })()"""
    r = json.loads(ev(b, js))
    o = r['opened']
    assert o['anim'] and o['names'] == ['needleIn', 'sweepIn'] and o['masked'] == o['arcs'] == 1 and o['a'] == o['want'], r
    assert not r['again']['anim'] and r['again']['names'] == [], r
    assert r['scoped']['anim'] and 'needleIn' in r['scoped']['names'], r   # picking another scope plays them again (入門 has no learned word: no arc to sweep)

def test_an_answer_pops_or_shakes_once_and_the_bar_slides(b):
    js = "(async () => { " + FRESH + NAMES + """ startSession('daily', { size: 12 });
      const ready = () => { while (currentEntry().preview && !currentEntry().previewDone) dismissPreview(); if (!currentEntry().q) prepareEntry(SESSION.idx); return currentEntry(); };
      const card = () => document.querySelector('.q-card').className;
      let e = ready(); answerCurrent(e.q.answer);
      const ok = { cls: card(), fmt: e.q.fmt, names: names('.q-card :is(.opt.correct, .spell-out.ok, .order-out.ok)'), icon: names('.fb-head svg') };
      renderPractice(); const redraw = { cls: card(), names: names('.q-card') };   // 顯示中文, ⋯ or a sync draws the card again
      nextQuestion(); const span = document.querySelector('.pr-top .bar span');
      const slide = { cls: span.className, from: span.style.getPropertyValue('--from').trim(), width: span.style.width, names: span.getAnimations().map(a => a.animationName) };
      renderPractice(); const still = document.querySelector('.pr-top .bar span').className;
      e = ready(); answerCurrent((e.q.answer + 1) % e.q.options.length);
      const bad = { cls: card(), fmt: e.q.fmt, names: names('.q-card :is(.opt.wrong, .spell-out.bad, .order-out.bad)'), icon: names('.fb-head svg') };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ ok, redraw, slide, still, bad }); })()"""
    r = json.loads(ev(b, js))
    assert 'just-ok' in r['ok']['cls'] and r['ok']['icon'] == ['iconPop'], r
    assert r['ok']['names'] == ['pop'] or r['ok']['fmt'] == 'v-match', r   # 配對 has no single answer to pop
    assert 'just' not in r['redraw']['cls'] and r['redraw']['names'] == [], r
    assert r['slide']['cls'] == 'slide' and r['slide']['from'] == '0%' and r['slide']['width'] not in ('0%', '') and r['slide']['names'] == ['barSlide'], r
    assert r['still'] == '', r
    assert 'just-bad' in r['bad']['cls'] and r['bad']['icon'] == [], r
    assert r['bad']['names'] == ['shake'] or r['bad']['fmt'] == 'v-match', r

def test_the_summary_ring_fills_from_where_the_set_began(b):
    js = "(async () => { " + FRESH + NAMES + """ startSession('daily', { size: 6 }); """ + FINISH + """ SESSION = null; DAILY_CACHE = null;
      const before = ringPct(dayProgress());
      if (!startSession('daily', { size: 5 })) return JSON.stringify({ started: false }); """ + FINISH + """
      const ring = document.querySelector('.ring'); const stats = () => [...document.querySelectorAll('.stat-v')].map(x => x.textContent);
      const shown = { title: document.querySelector('.page-title').textContent, anim: ring.classList.contains('anim'), names: names('.ring .arc'), from: +ring.style.getPropertyValue('--from'), stats: stats() };
      await new Promise(res => setTimeout(res, 800));
      const counted = stats(); const want = [SESSION.stats.correct, SESSION.stats.wrong, SESSION.stats.newCount].map(String);
      renderPractice(); const again = { anim: document.querySelector('.ring').classList.contains('anim'), stats: stats() };
      const after = ringPct(dayProgress()); SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ started: true, before, after, c: 2 * Math.PI * 42, shown, counted, want, again }); })()"""
    r = json.loads(ev(b, js))
    assert r['started'] and r['shown']['title'] == '完成了', r
    assert 0 < r['before'] < r['after'], r
    s = r['shown']
    assert s['anim'] and s['names'] == ['ringIn'] and abs(s['from'] - r['c'] * (1 - r['before'] / 100)) < 0.01, r
    assert s['stats'] == ['0', '0', '0', '0'], r   # the numbers start from 0
    assert r['counted'][:3] == r['want'] and int(r['counted'][3]) >= 1, r
    assert not r['again']['anim'] and r['again']['stats'] == r['counted'], r   # drawn again: still, the real numbers at once

def test_back_after_a_minute_plays_the_page_again(b):
    js = "(async () => { " + FRESH + """ location.hash = '#/stats'; route(); location.hash = '#/today'; route(); route();
      const ring = () => document.querySelector('.today-card .ring').classList.contains('anim');
      const flip = (hidden, ms = 0) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
        const now = Date.now; Date.now = () => now() + ms; document.dispatchEvent(new Event('visibilitychange')); Date.now = now; };
      const before = ring();
      flip(true); flip(false, 10000); const short = ring();
      flip(true); flip(false, 61000); const long = ring();
      delete document.hidden; delete document.visibilityState;
      return JSON.stringify({ before, short, long }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'before': False, 'short': False, 'long': True}, r

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
