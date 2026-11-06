"""test build (2026-11-07): 言靈, 古道具屋 up the hill, things placed in 書房, the hero."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8811
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
# plays the current session to its end (preview cards dismissed), the summary drawn as the app does
PLAY = """(() => { let guard = 0;
  while (SESSION && SESSION.idx < SESSION.entries.length && guard++ < 600) {
    const e = currentEntry();
    if (e.preview && !e.previewDone) { dismissPreview(); continue; }
    if (!e.q) { prepareEntry(SESSION.idx); continue; }
    if (!e.done) { answerCurrent(e.q.answer); if (!e.done) e.done = true; }
    nextQuestion();
  }
  const gain = SESSION && SESSION.koto; SESSION = null; document.body.classList.remove('practicing'); DAILY_CACHE = null; return gain; })()"""

# ---- 言靈 ----
def test_a_finished_daily_set_gives_one_koto(b):
    js = "(() => { " + FRESH + " startSession('daily', { size: 5 }); const gain = " + PLAY + """;
      const line = document.querySelector('#view .koto-gain');
      return JSON.stringify({ gain, bal: kotoBalance(), line: line ? line.textContent.replace(/\\s+/g, '') : null, left: dayProgress().left > 0 }); })()"""
    r = json.loads(ev(b, js))
    assert r['left'], r   # five items do not finish the day
    assert r['gain'] == {'set': 1, 'day': 0}, r
    assert r['bal'] == 1, r
    assert r['line'] == 'あ言靈+1做完一組共1', r   # the あ is the icon's

def test_quitting_a_set_early_gives_nothing(b):
    js = "(() => { " + FRESH + """ startSession('daily', { size: 8 }); let n = 0;
      while (n < 3) { const e = currentEntry(); if (e.preview && !e.previewDone) { dismissPreview(); continue; } answerCurrent(e.q.answer); nextQuestion(); n++; }
      exitPractice(); const gain = SESSION.koto;
      return JSON.stringify({ gain, bal: kotoBalance(), line: !!document.querySelector('#view .koto-gain') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'gain': {'set': 0, 'day': 0}, 'bal': 0, 'line': False}, r

def test_other_practice_gives_no_set_koto(b):
    js = "(() => { " + FRESH + " startSession('unit', { unit: 'm1', size: 6 }); const gain = " + PLAY + """;
      return JSON.stringify({ gain, bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['gain']['set'] == 0 and r['bal'] == r['gain']['day'], r

def test_the_day_bonus_comes_once(b):
    js = "(() => { " + FRESH + """ const gains = []; let guard = 0;
      while (dailyPlan().remaining > 0 && guard++ < 20) { startSession('daily'); gains.push(""" + PLAY + """); }
      const sets = gains.length, bal1 = kotoBalance(), days = state.koto.days.slice();
      startSession('daily'); const more = """ + PLAY + """;   // a 多學 set once the day is done
      return JSON.stringify({ sets, bal1, days, last: gains[gains.length - 1], more, bal2: kotoBalance(), today: todayStr() }); })()"""
    r = json.loads(ev(b, js))
    assert r['days'] == [r['today']], r
    assert r['last'] == {'set': 1, 'day': 10}, r
    assert r['bal1'] == r['sets'] + 10, r
    assert r['more'] == {'set': 1, 'day': 0}, r
    assert r['bal2'] == r['bal1'] + 1, r

def test_each_device_counts_its_own_sets(b):
    js = """(() => { state.koto = { sets: { 'dev-other': 4 }, days: ['2026-01-01'], gift: 0 }; state.owned = { clock: { paid: 1, on: '2026-01-02' } }; saveState();
      """ + FRESH + " startSession('daily', { size: 4 }); " + PLAY + """;
      return JSON.stringify({ sets: state.koto.sets, dev: kotoDevice(), bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['sets']['dev-other'] == 4 and r['sets'][r['dev']] == 1, r
    assert r['bal'] == 4 + 1 + 10 - 1, r

def test_the_shop_letter_is_in_the_mailbox(b):
    js = """(() => { const l = letters().find(x => x.id === 'shop'); if (!l) return 'none';
      openLetters(); const btn = document.querySelector('#modalBody [data-letter="shop"] [data-act="letter-done"]'); btn.click();
      return JSON.stringify({ title: l.title, gone: !letters().some(x => x.id === 'shop') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'title': '山上的古道具屋開張了', 'gone': True}, r

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
