"""2026-11-05 (1.0.42): 手機作答畫面——選項貼在螢幕下方、上方的 ✕ 和進度條往下滑也固定；電腦版不變。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8805
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run(list(pre) + [("nav", URL), ("wait", READY), ("eval", js)])[-1]

# a main-course account at week 1; the first plain vocabulary question of a daily set on screen (word previews skipped)
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
VOCAB_Q = """startSession('daily', { size: 20 }); route();   /* what the hashchange would do next: today's fit layout off */ const es = SESSION.entries; es.forEach(e => { e.preview = false; });
  for (let i = 0; i < es.length; i++) { SESSION.idx = i; prepareEntry(i); if (es[i].q.kind === 'v' && !es[i].q.custom && es[i].q.fmt !== 'v-cloze') break; }
  renderPractice(); window.scrollTo(0, 0);"""

def test_phone_options_sit_low_and_the_top_strip_stays(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """
      const opts = [...document.querySelectorAll('.q-card .opt')]; const last = opts[opts.length - 1].getBoundingClientRect();
      const tools = document.querySelector('.pr-actions').getBoundingClientRect(); const top = document.querySelector('.pr-top');
      const before = { gap: innerHeight - last.bottom, toolsGap: innerHeight - tools.bottom, pos: getComputedStyle(top).position, top: top.getBoundingClientRect().top };
      answerCurrent((currentEntry().q.answer + 1) % 4); window.scrollTo(0, 99999); await new Promise(r => setTimeout(r, 50));
      const strip = document.querySelector('.pr-top').getBoundingClientRect();
      const after = { scrolled: scrollY, top: strip.top, width: strip.width, vw: innerWidth, under: document.elementFromPoint(innerWidth / 2, strip.top + strip.height / 2).closest('.pr-top') !== null };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ before, after }); })()"""
    r = json.loads(ev(b, js, [("metrics", (375, 667))]))
    o = r['before']
    assert o['pos'] == 'sticky' and o['top'] == 0, r
    assert 0 < o['gap'] < 110 and 0 <= o['toolsGap'] < 40, r   # the last option just above the tool row, the tool row at the foot of the screen
    a = r['after']
    assert a['scrolled'] > 0 and a['top'] == 0 and a['under'], r   # scrolled, and the strip still on top of what scrolls under it
    assert a['width'] == a['vw'], r   # it spans the side gutters

def test_desktop_layout_is_unchanged(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """
      const top = getComputedStyle(document.querySelector('.pr-top')), view = getComputedStyle(document.getElementById('view')), opts = getComputedStyle(document.querySelector('.q-card .opts'));
      const out = { pos: top.position, display: view.display, card: getComputedStyle(document.querySelector('.q-card')).display, mt: opts.marginTop };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (1200, 900, False))]))
    assert r == {'pos': 'static', 'display': 'block', 'card': 'block', 'mt': '18px'}, r

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
