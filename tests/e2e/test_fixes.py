"""2026-10-25 fixes: listening reads every option, requeued listening audio follows the shuffled options,
distractor meanings after answering a vocab question, the 更多 menu icons stay small, 8-digit login code."""
import os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8798
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

# A fake synthesizer: utterances take `dur[text]` ms; `drop` texts are silently swallowed once (no start/end, like
# Chrome and iOS Safari do when speak() lands while the previous utterance is winding down); `noEnd` texts never
# fire onend (garbage-collected utterance). Logs every start, overlap and drop.
FAKE_TTS = """
window.__tts = { log: [], dur: {}, drop: new Set(), noEnd: new Set() };
const fake = {
  speaking: false, pending: false, paused: false,
  getVoices() { return [{ name: 'Kyoko', lang: 'ja-JP', voiceURI: 'kyoko', localService: true, default: true }]; },
  cancel() { this.speaking = false; this.pending = false; __tts.log.push('cancel'); },
  pause() {}, resume() {},
  speak(u) {
    const t = u.text;
    if (__tts.drop.has(t)) { __tts.drop.delete(t); __tts.log.push('drop:' + t); return; }
    if (this.speaking) __tts.log.push('overlap:' + t);
    __tts.log.push('start:' + t); this.speaking = true;
    if (u.onstart) u.onstart({});
    const id = ++__tts.n;
    setTimeout(() => { if (__tts.cancelled >= id) return; this.speaking = false; __tts.log.push('end:' + t); if (!__tts.noEnd.has(t) && u.onend) u.onend({}); }, __tts.dur[t] || 300);
  }
};
__tts.n = 0; __tts.cancelled = 0;
const origCancel = fake.cancel; fake.cancel = function () { __tts.cancelled = __tts.n; origCancel.call(this); };
Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
window.SpeechSynthesisUtterance = function (text) { this.text = text; };
state.settings.speechRate = 1; true"""

SCRIPT = "女：きょうは何曜日ですか。\\n1、げつようびです。\\n2、はい、そうです。\\n3、いいえ、ちがいます。"
LINES = ["きょうは何曜日ですか。", "1、げつようびです。", "2、はい、そうです。", "3、いいえ、ちがいます。"]

def starts(log):
    return [x[6:] for x in log if x.startswith('start:')]

def test_dropped_option_is_spoken_again(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS),
        ("eval", f"__tts.drop.add('{LINES[3]}'); speakScript('{SCRIPT}').then(() => JSON.stringify(__tts.log))")], timeout=30)
    log = __import__('json').loads(out[-1])
    assert starts(log) == LINES, log
    assert not [x for x in log if x.startswith('overlap:')], log

def test_slow_option_does_not_get_the_next_one_queued_on_top(b):
    # option 2 speaks for 7 s and never reports onend, although the length estimate says 6 s; option 3 must still wait for it
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS),
        ("eval", f"__tts.dur['{LINES[2]}'] = 7000; __tts.noEnd.add('{LINES[2]}'); speakScript('{SCRIPT}').then(() => JSON.stringify(__tts.log))")], timeout=40)
    log = __import__('json').loads(out[-1])
    assert starts(log) == LINES, log
    assert not [x for x in log if x.startswith('overlap:')], log

def test_requeued_listening_audio_follows_the_shuffled_options(b):
    js = """(() => {
      state.settings.audioOptions = true; state.settings.listening = true;
      const it = REG.listen.find(x => x.t === 'resp');
      const q = makeListenQuestion(it);
      const opts = q.options.slice().reverse();   // a deterministic 'shuffle'
      const re = requeueQuestion(q, opts);
      const expected = [it.line, ...re.options.map((o, i) => `${spokenNum(i)}、${ttsText(o.text)}`)].join('\\n');
      return JSON.stringify({ ok: re.audio === expected, ans: re.options[re.answer].text === it.a });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", "typeof REG.listen !== 'undefined' && REG.listen.length > 0"), ("eval", js)])
    assert out[-2] is True, "no listening items"
    assert out[-1] == '{"ok":true,"ans":true}', out[-1]

def test_wrong_vocab_options_show_their_chinese_after_answering(b):
    js = """(() => {
      const v = REG.vocab.find(x => x.builtin && recallOptions(x));
      const q = makeVocabQuestion(v, { forceFmt: 'v-recall' });
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].q = q; renderPractice();
      const before = document.querySelectorAll('.opt .opt-zh').length;
      const wrongIdx = q.options.findIndex((o, i) => i !== q.answer);
      answerCurrent(wrongIdx);
      const wrongText = jaPlain(q.options[wrongIdx].text);
      const peer = REG.vocab.find(x => jaPlain(x.w) === wrongText);
      const shown = [...document.querySelectorAll('.opt')].map(el => ({ cls: el.className.replace(/^opt /, ''), zh: (el.querySelector('.opt-zh') || {}).textContent || '' }));
      const wrongEl = shown[wrongIdx];
      return JSON.stringify({ before, wrongZh: wrongEl.zh, peerM: peer ? peer.m : null, allWrongHaveZh: shown.every((s, i) => i === q.answer || s.zh.length > 0) });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['before'] == 0, r
    assert r['peerM'] and r['wrongZh'] == r['peerM'], r
    assert r['allWrongHaveZh'], r

def test_more_menu_icons_are_small(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "ACTIONS['more-menu'](); JSON.stringify([...document.querySelectorAll('.modal .list-item svg')].map(s => getComputedStyle(s).width))")])
    sizes = __import__('json').loads(out[-1])
    assert len(sizes) >= 3 and all(s == '18px' for s in sizes), sizes

def test_login_code_is_eight_digits(b):
    from test_sync import FAKE
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE),
        ("eval", "new Promise(r => setTimeout(r, 50)).then(() => Sync.init({ client: __fake.client })).then(() => Sync.status)"),
        ("eval", "openSettings('data'); document.getElementById('syncEmail').value = 'foo@x.com'; document.querySelector('[data-act=sync-login]').click(); new Promise(r => setTimeout(r, 100)).then(() => document.querySelector('.modal').textContent.includes('8 位數') && !document.querySelector('.modal').textContent.includes('6 位數'))"),
        ("eval", "document.getElementById('syncCode').value = ' 1234 5678 '; document.querySelector('[data-act=sync-verify]').click(); new Promise(r => setTimeout(r, 100)).then(() => JSON.stringify(__fake.calls.filter(c => c[0] === 'verify')))"),
        ("eval", "document.getElementById('toast').textContent.includes('6 位數') ? 'six' : 'ok'"),
    ])
    assert out[-3] is True, "panel should say 8 位數"
    assert out[-2] == '[["verify","foo@x.com","12345678","email"]]', out[-2]
    assert out[-1] == 'ok', out[-1]

# ---- 2026-10-25 (2): start week picker, Deepgram path ----
WAV200 = "UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA"
FAKE_DEEPGRAM = """
window.__dg = { calls: [], played: [] };
const wavBytes = Uint8Array.from(atob('UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA'), c => c.charCodeAt(0));
const origFetch = window.fetch;
window.fetch = (url, opt) => {
  if (String(url).includes('api.deepgram.com')) {
    const text = JSON.parse(opt.body).text; __dg.calls.push({ text, at: performance.now() });
    return new Promise(r => setTimeout(() => r(new Response(new Blob([wavBytes], { type: 'audio/wav' }), { status: 200 })), 150));
  }
  return origFetch(url, opt);
};
state.ttsConfig = Object.assign({}, state.ttsConfig || {}, { engine: 'deepgram', deepgramKey: 'k' });
// headless Chrome has no audio output and blocks autoplay, so playback itself is simulated: 'playing' then 'ended'
HTMLMediaElement.prototype.play = function () { const el = this; __dg.played.push({ el, src: el.src.slice(0, 5), at: performance.now() });
  setTimeout(() => { if (el.onplaying) el.onplaying(); setTimeout(() => { if (el.onended) el.onended(); }, 120); }, 30); return Promise.resolve(); };
true"""

def test_fresh_profile_starts_at_week_one(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "state.currentUnit")])
    assert out[-1] == 'm1', out[-1]

def test_week_picker_sets_the_current_unit(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "ACTIONS['open-level'](); JSON.stringify({ sel: !!document.getElementById('startUnit'), n: document.querySelectorAll('#startUnit option').length, cur: document.getElementById('startUnit').value, duo: !!document.getElementById('duoScore') })"),
        ("eval", "document.getElementById('startUnit').value = 'm5'; document.querySelector('[data-act=start-apply]').click(); JSON.stringify({ cur: state.currentUnit, done: state.completedUnits })"),
        ("eval", "ACTIONS['open-level'](); document.getElementById('startUnit').value = 'm3'; document.getElementById('startMarkPrev').checked = true; document.querySelector('[data-act=start-apply]').click(); JSON.stringify({ cur: state.currentUnit, done: state.completedUnits })"),
    ])
    assert out[-3] == '{"sel":true,"n":18,"cur":"m1","duo":true}', out[-3]
    assert out[-2] == '{"cur":"m5","done":[]}', out[-2]
    assert out[-1] == '{"cur":"m3","done":["m1","m2"]}', out[-1]

def test_deepgram_lines_are_prefetched_and_all_play_through_one_player(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_DEEPGRAM),
        ("eval", f"speakScript('{SCRIPT}').then(() => JSON.stringify({{ calls: __dg.calls.map(c => c.text), spread: Math.max(...__dg.calls.map(c => c.at)) - Math.min(...__dg.calls.map(c => c.at)), played: __dg.played.length, oneEl: __dg.played.every(p => p.el === __dg.played[0].el), blob: __dg.played.every(p => p.src === 'blob:') }}))")], timeout=40)
    r = __import__('json').loads(out[-1])
    assert r['calls'] == LINES, r                     # each line fetched exactly once
    assert r['spread'] < 100, r                        # all fetches start together, not one after the other
    assert r['played'] == 4 and r['oneEl'] and r['blob'], r

# ---- 2026-10-25 (3): kana option numbers, less next-day repetition, new grammar spread across points ----
def test_option_numbers_are_spoken_in_kana(b):
    js = """(() => { state.settings.audioOptions = true; const it = REG.listen.find(x => x.t === 'resp'); const q = makeListenQuestion(it);
      return JSON.stringify(spokenOptions(q).map(l => l.split('、')[0])); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    assert out[-1] in ('["いち","に","さん"]', '["いち","に","さん","よん"]'), out[-1]

def test_first_correct_answer_waits_a_few_days_before_repeating(b):
    js = """(() => { const t = todayStr(); const g = REG.grammar[0]; const g2 = REG.grammar[1];
      const ok = srsAnswer(g.key, true); const ng = srsAnswer(g2.key, false);
      return JSON.stringify({ okDays: daysBetween(t, ok.rec.due), ngDays: daysBetween(t, ng.rec.due) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['okDays'] >= 3, r
    assert r['ngDays'] == 0, r

def test_new_grammar_of_a_unit_rotates_through_its_points(b):
    js = """(() => { const c = newGrammarCandidates('m1').slice(0, 6); return JSON.stringify({ n: c.length, pts: new Set(c.map(g => g.pt)).size }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    assert out[-1] == '{"n":6,"pts":6}', out[-1]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_dropped_option_is_spoken_again, test_slow_option_does_not_get_the_next_one_queued_on_top, test_requeued_listening_audio_follows_the_shuffled_options,
             test_wrong_vocab_options_show_their_chinese_after_answering, test_more_menu_icons_are_small, test_login_code_is_eight_digits,
             test_fresh_profile_starts_at_week_one, test_week_picker_sets_the_current_unit, test_deepgram_lines_are_prefetched_and_all_play_through_one_player,
             test_option_numbers_are_spoken_in_kana, test_first_correct_answer_waits_a_few_days_before_repeating, test_new_grammar_of_a_unit_rotates_through_its_points]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try:
                    t(b); print("ok  ", t.__name__)
                except Exception as e:
                    failed += 1; print("FAIL", t.__name__, "-", str(e)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
