"""2026-11-05 (1.0.41): 進度動畫只在打開頁面時播一次、答對彈一下／答錯晃一下、練習進度條滑過去、結算圓環從這組開始前轉上去、數字往上跳。
1.0.50: 連對 N、答題音效（發音等音效響完）、答對時新亮的點跳一下和「升到熟悉」。"""
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
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
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
    # 書房 eases in when it opens; a sync or a setting draws it again in place (the same room, nothing replays). 課程's 目前 card
    # (the 今日 card's 目前單元 until the test build) fills its bar when the page opens, not when it is drawn again
    js = "(async () => { " + FRESH + NAMES + """ location.hash = '#/stats'; route(); location.hash = '#/today'; route();
      const st = document.querySelector('#view .study'); const opened = { anim: st.classList.contains('anim'), names: st.querySelector('.room-wrap').getAnimations().map(a => a.animationName) };   // its own way in (the steam, the clouds… keep going)
      route(); const again = { same: document.querySelector('#view .study') === st };   // a sync or a setting draws the same page again
      const bar = () => document.querySelector('.now-card .bar.stack');
      location.hash = '#/course'; route(); const course = { bar: bar().classList.contains('anim'), names: names('.now-card .bar.stack') };
      route(); const courseAgain = { bar: bar().classList.contains('anim'), names: names('.now-card .bar.stack') };
      return JSON.stringify({ opened, again, course, courseAgain }); })()"""
    r = json.loads(ev(b, js))
    assert r['opened'] == {'anim': True, 'names': ['roomIn']} and r['again'] == {'same': True}, r
    assert r['course'] == {'bar': True, 'names': ['uncover']} and r['courseAgain'] == {'bar': False, 'names': []}, r

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
    js = "(async () => { " + FRESH + """ location.hash = '#/stats'; route(); location.hash = '#/today'; route();
      const room = () => document.querySelector('#view .study'); const ring = () => room().classList.contains('anim');   // 書房's way in (test build)
      const flip = (hidden, ms = 0) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
        const now = Date.now; Date.now = () => now() + ms; document.dispatchEvent(new Event('visibilitychange')); Date.now = now; };
      room().classList.remove('anim'); const before = ring();   // played when it opened
      flip(true); flip(false, 10000); const short = ring();
      flip(true); flip(false, 61000); const long = ring();
      delete document.hidden; delete document.visibilityState;
      return JSON.stringify({ before, short, long }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'before': False, 'short': False, 'long': True}, r

# the current card ready to answer: previews passed, its question built
READY_Q = "const ready = () => { while (currentEntry().preview && !currentEntry().previewDone) dismissPreview(); if (!currentEntry().q) prepareEntry(SESSION.idx); return currentEntry(); };"

def test_a_run_shows_from_three_and_a_slip_gives_it_back(b):
    js = "(async () => { " + FRESH + READY_Q + """ startSession('daily', { size: 20 });
      const sounds = []; playSfx = (kind, step) => { sounds.push([kind, step]); return 0; };
      const chip = () => { const c = document.querySelector('.fb-head .combo'); return c ? c.textContent : null; };
      const log = []; let slip = null;
      for (let k = 0; k < 7 && SESSION.idx < SESSION.entries.length; k++) {
        const e = ready(); const wrong = k === 4;
        answerCurrent(wrong ? (e.q.answer + 1) % e.q.options.length : e.q.answer);
        log.push({ ok: !wrong, combo: SESSION.combo, chip: chip() });
        if (wrong && e.undo) { ACTIONS.slip(); slip = { combo: SESSION.combo, chip: chip() }; }
        nextQuestion();
      }
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ log, slip, sounds }); })()"""
    r = json.loads(ev(b, js))
    log = r['log']
    assert [x['combo'] for x in log[:5]] == [1, 2, 3, 4, 0], r
    assert [x['chip'] for x in log[:5]] == [None, None, '連對 3', '連對 4', None], r
    assert r['slip'] == {'combo': 4, 'chip': None}, r   # the miss did not count: the run goes on from 4
    assert log[5]['combo'] == 5 and log[5]['chip'] == '連對 5', r
    assert r['sounds'][:6] == [['ok', 0], ['ok', 1], ['ok', 2], ['ok', 3], ['bad', -1], ['ok', 4]], r

def test_the_reading_waits_for_the_sound_and_the_switch_turns_it_off(b):
    js = "(async () => { " + FRESH + READY_Q + """ startSession('daily', { size: 20 });
      const spoken = []; speak = (text) => { spoken.push(text); };
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
      // a card whose answer is read out (a word or a sentence), answered right
      const next = () => { for (let g = 0; g < 30; g++) { const e = ready(); if (e.q.speakWord && e.q.fullJp && !e.q.audio) return e; answerCurrent(e.q.answer); nextQuestion(); } return null; };
      // what this card reads after the answer; earlier cards' auto-play timers are left to run out first
      const mine = async (e) => { await sleep(300); spoken.length = 0; const want = [e.q.speakWord, e.q.fullJp]; return () => spoken.filter(x => want.includes(x)).length; };
      const defaults = Boolean(sfxReady()); const row = settingsLearn().includes('答題音效');
      let e = next(); let n = await mine(e); answerCurrent(e.q.answer);
      const on = { now: n() }; await sleep(700); on.later = n();
      nextQuestion(); e = next(); n = await mine(e); answerCurrent(e.q.answer); nextQuestion(); await sleep(700);
      const gone = n();   // 下一題 before the sound ended: the old card's reading never comes
      e = next(); SFX.mute = true; n = await mine(e); answerCurrent(e.q.answer);
      const off = { now: n(), ms: playSfx('ok') };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ defaults, row, on, gone, off }); })()"""
    r = json.loads(ev(b, js))
    assert r['defaults'] is True and not r['row'], r   # always on, nowhere in 設定 (2026-11-12)
    assert r['on'] == {'now': 0, 'later': 1}, r
    assert r['gone'] == 0, r
    assert r['off'] == {'now': 1, 'ms': 0}, r

def test_the_dots_an_answer_lit_pop_and_a_new_level_says_so(b):
    js = "(async () => { " + FRESH + NAMES + READY_Q + """ startSession('daily', { size: 12 });
      playSfx = () => 0; const t = todayStr();
      let e = ready(); const key = e.q.key;
      state.srs[key] = { b: 2, due: t, n: 3, ok: 3, ng: 0, st: 3, s: 4.6, d: 5, last: addDays(t, -6), intro: addDays(t, -20) };
      answerCurrent(e.q.answer);
      const meta = document.querySelector('.fb-meta');
      const up = { lv: e.lvUp, label: srsLevelLabel(state.srs[key], key), chip: (meta.querySelector('.lv-up') || {}).textContent || null,
        lit: meta.querySelectorAll('.dots i.on').length, ups: meta.querySelectorAll('.dots i.up').length, dotNames: names('.fb-meta .dots i.up'), chipNames: names('.fb-meta .lv-up') };
      renderPractice(); const redraw = names('.fb-meta');
      nextQuestion(); e = ready(); const k2 = e.q.key;
      state.srs[k2] = { b: 3, due: t, n: 4, ok: 4, ng: 0, st: 4, s: 6, d: 5, last: addDays(t, -6), intro: addDays(t, -20) };
      answerCurrent((e.q.answer + 1) % e.q.options.length);
      const miss = { lv: e.lvUp || null, ups: document.querySelectorAll('.fb-meta .dots i.up').length, chip: Boolean(document.querySelector('.lv-up')) };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ up, redraw, miss }); })()"""
    r = json.loads(ev(b, js))
    u = r['up']
    assert u['lv'] == '熟悉' == u['label'] and u['chip'] == '升到熟悉', r   # stability past 5 days: 熟悉
    assert u['ups'] == u['lit'] - 2 >= 1 and set(u['dotNames']) == {'dotUp'} and u['chipNames'] == ['iconPop'], r
    assert r['redraw'] == [], r   # drawn again (顯示中文, ⋯, a sync): still
    assert r['miss'] == {'lv': None, 'ups': 0, 'chip': False}, r

# 2026-11-10 (the user): the summary shows 這組的收穫 (new and levelled-up items, popping in), 全對 in gold with confetti, and the set's
# 言靈 fly from its +N into the total, which counts up from where it was to the new balance
def test_the_summary_shows_the_harvest_and_the_koto_fly_into_the_total(b):
    js = "(async () => { " + FRESH + """ startSession('daily', {}); route();
      { let guard = 0; while (SESSION && SESSION.idx < SESSION.entries.length && guard++ < 500) { const e = currentEntry();
          if (e.preview && !e.previewDone) { dismissPreview(); continue; } if (!e.q) { prepareEntry(SESSION.idx); continue; }
          if (!e.done) { answerCurrent(e.q.answer); if (!e.done) e.done = true; } nextQuestion(); } }
      const title = document.querySelector('.page-title'), num = document.querySelector('.koto-gain .tot .num'), g = SESSION.koto;
      const out = { title: title.textContent, gold: title.classList.contains('all-right'), rows: [...document.querySelectorAll('.harvest-l')].map(x => x.textContent.trim()),
        chips: document.querySelectorAll('.harvest .chip').length, play: !!document.querySelector('.harvest.play'), start: Number(num.textContent), got: (g.set || 0) + (g.day || 0), bal: kotoBalance() };
      await new Promise(res => setTimeout(res, 800)); out.confetti = document.querySelectorAll('.confetti i').length;
      await new Promise(res => setTimeout(res, 2800)); out.end = Number(document.querySelector('.koto-gain .tot .num').textContent);
      renderPractice(); out.again = { play: !!document.querySelector('.harvest.play'), num: Number(document.querySelector('.koto-gain .tot .num').textContent) };   // a sync draws it again: still
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['title'] == '全對！' and r['gold'], r
    assert any(x.startswith('新學') for x in r['rows']) and r['chips'] > 0 and r['play'], r
    assert r['got'] >= 1 and r['start'] == r['bal'] - r['got'] and r['end'] == r['bal'], r   # counted up from the old balance to the new
    assert r['confetti'] > 0 and r['again'] == {'play': False, 'num': r['bal']}, r

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
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
