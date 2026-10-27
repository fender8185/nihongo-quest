"""2026-10-25 fixes: listening reads every option, requeued listening audio follows the shuffled options,
distractor meanings after answering a vocab question, the 更多 menu icons stay small, 8-digit login code."""
import json, os, re, subprocess, sys, time
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

def test_wrong_vocab_options_show_their_chinese_after_answering(b):
    js = """(() => {
      const v = REG.vocab.find(x => x.builtin && recallOptions(x));
      const q = makeVocabQuestion(v, { forceFmt: 'v-recall' });
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].previewDone = true;   // these tests borrow a session for a custom question; skip the new-word preview card
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
        ("eval", f"speakScript('{SCRIPT}').then(() => JSON.stringify({{ calls: __dg.calls.map(c => c.text), want: {__import__('json').dumps(LINES, ensure_ascii=False)}.map(kanaReadings), spread: Math.max(...__dg.calls.map(c => c.at)) - Math.min(...__dg.calls.map(c => c.at)), played: __dg.played.length, oneEl: __dg.played.every(p => p.el === __dg.played[0].el), blob: __dg.played.every(p => p.src === 'blob:') }}))")], timeout=40)
    r = __import__('json').loads(out[-1])
    assert r['calls'] == r['want'] and len(r['calls']) == len(LINES), r   # each line fetched exactly once, with known readings as kana
    assert r['spread'] < 100, r                        # all fetches start together, not one after the other
    assert r['played'] == 4 and r['oneEl'] and r['blob'], r

# ---- 2026-10-25 (3): kana option numbers, less next-day repetition, new grammar spread across points ----
def test_first_correct_answer_waits_a_few_days_before_repeating(b):
    js = """(() => { const t = todayStr(); const g = REG.grammar[0]; const v = REG.vocab.find(x => x.builtin);
      const ok = srsAnswer(g.key, true); const ng = srsAnswer(v.key, false);
      return JSON.stringify({ okDays: daysBetween(t, ok.rec.due), ngDays: daysBetween(t, ng.rec.due) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['okDays'] >= 3, r
    assert r['ngDays'] == 1, r   # a miss waits until tomorrow (v63); the same-day look is the session's 再練一次

def test_new_grammar_of_a_unit_rotates_through_its_points(b):
    js = """(() => { const c = newGrammarCandidates('m1').slice(0, 6); return JSON.stringify({ n: c.length, pts: new Set(c.map(g => g.pt)).size }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    assert out[-1] == '{"n":6,"pts":6}', out[-1]

# ---- 2026-10-25 (4): audio-only options are played on demand, one button per option ----
def test_audio_options_play_on_click_instead_of_being_read_in_sequence(b):
    js = """(() => {
      state.settings.audioOptions = true; state.settings.listening = true;
      const it = REG.listen.find(x => x.t === 'resp');
      const q = makeListenQuestion(it);
      const again = requeueQuestion(q, q.options.slice().reverse());
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].previewDone = true;   // these tests borrow a session for a custom question; skip the new-word preview card
      SESSION.entries[SESSION.idx].q = q; SESSION.entries[SESSION.idx].autoPlayed = true; renderPractice();
      const rows = [...document.querySelectorAll('.opt-audio')];
      const plays = [...document.querySelectorAll('.opt-audio [data-act=speak]')];
      const picks = [...document.querySelectorAll('.opt-audio [data-act=answer]')];
      // the hashchange from startSession re-renders shortly after; wait for it before clicking live buttons
      return new Promise(r => setTimeout(r, 300)).then(() => {
        __tts.log.length = 0;
        document.querySelectorAll('.opt-audio [data-act=speak]')[1].click();
        return new Promise(r => setTimeout(r, 400));
      }).then(() => {
        const spoken = __tts.log.filter(x => x.startsWith('start:')).map(x => x.slice(6));
        document.querySelectorAll('.opt-audio [data-act=answer]')[2].click();
        const after = [...document.querySelectorAll('.opt')].map(el => el.textContent.trim());
        return JSON.stringify({ audio: q.audio === it.line, againAudio: again.audio === it.line, rows: rows.length, plays: plays.length, picks: picks.length,
          spoken, want: ttsText(q.options[1].text), answered: currentEntry().done, chosen: currentEntry().chosen, textShown: after.every(t => !t.includes('選項')) });
      });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['audio'] and r['againAudio'], r              # the prompt line is the only auto-played audio
    assert r['rows'] == 3 and r['plays'] == 3 and r['picks'] == 3, r
    assert r['spoken'] == [r['want']], r                   # clicking option 2 speaks option 2 only
    assert r['answered'] and r['chosen'] == 2 and r['textShown'], r

def test_scene_audio_options_have_no_autoplay_and_play_on_click(b):
    js = """(() => {
      state.settings.audioOptions = true;
      const it = REG.listen.find(x => x.t === 'scene');
      const q = makeListenQuestion(it);
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].previewDone = true;   // these tests borrow a session for a custom question; skip the new-word preview card
      SESSION.entries[SESSION.idx].q = q; renderPractice();
      return JSON.stringify({ audio: q.audio || '', rows: document.querySelectorAll('.opt-audio').length, plays: document.querySelectorAll('.opt-audio [data-act=speak]').length });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['audio'] == '' and r['rows'] == 3 and r['plays'] == 3, r

def test_formal_exam_listening_options_play_on_click(b):
    js = """(() => {
      startExam({ level: 'N5', size: 'mini', subjects: ['S3'], formal: true });
      const i = EXAM.paper.findIndex(q => q.m === 'S3-M4');
      if (i < 0) return 'no S3-M4';
      EXAM.idx = i; renderExamRunner();
      const q = EXAM.paper[i];
      return JSON.stringify({ audioHasOptions: q.audio.includes(ttsText(q.options[0].text)), rows: document.querySelectorAll('.opt-audio').length, plays: document.querySelectorAll('.opt-audio [data-act=speak]').length, picks: document.querySelectorAll('.opt-audio [data-act=exam-answer]').length });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['audioHasOptions'] is False, r
    assert r['rows'] >= 3 and r['plays'] == r['rows'] and r['picks'] == r['rows'], r

# ---- 2026-10-25 (5): the 今日練習 button count is the real session size; version history in settings ----
def test_today_button_count_matches_the_session(b):
    js = """(() => { const out = []; for (const size of [20, 15, 25, 30]) { state.settings.sessionSize = size; saveState(); route();
      const btn = document.querySelector('[data-act=start-daily]'); const shown = Number((btn.textContent.match(/(\\d+) 題/) || [])[1]);
      startSession('daily'); const enc = encoreEstimate(SESSION.entries.map(e => e.item)); const actual = SESSION.entries.length + enc; SESSION = null; document.body.classList.remove('practicing'); location.hash = '#/today';
      out.push([shown, actual]); } return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    pairs = __import__('json').loads(out[-1])
    assert all(a == b_ and a > 0 for a, b_ in pairs), pairs

def test_settings_show_the_version_and_its_history(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "openSettings('look'); const t = document.querySelector('.modal').textContent; JSON.stringify({ ver: t.includes('版本 ' + APP_VERSION), hist: t.includes('版本紀錄'), n: document.querySelectorAll('.changelog li').length, first: (document.querySelector('.changelog li') || {}).textContent || '' })")])
    r = __import__('json').loads(out[-1])
    assert r['ver'] and r['hist'] and r['n'] >= 5, r
    assert APP_VERSION_IN_SW(r), r

def APP_VERSION_IN_SW(r):
    import re
    sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    cache = re.search(r"CACHE = 'nq-v(\d+)'", sw).group(1)
    ver = re.search(r"const APP_VERSION = '(\d+)'", html).group(1)
    return cache == ver and r['first'].startswith('v' + ver)

# ---- 2026-10-26: grammar, listening, reading and kanji do not come back the same day ----
def test_every_wrong_answer_waits_until_tomorrow(b):
    js = """(() => { const t = todayStr(); const out = {};
      const pick = { g: REG.grammar[0], l: REG.listen[0], r: REG.read[0], k: REG.kanji[0], v: REG.vocab.find(x => x.builtin) };
      for (const [kind, it] of Object.entries(pick)) out[kind] = daysBetween(t, srsAnswer(it.key, false).rec.due);
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r == {'g': 1, 'l': 1, 'r': 1, 'k': 1, 'v': 1}, r

def test_miss_then_requeue_does_not_return_today(b):
    js = """(() => { const t = todayStr(); const out = {};
      for (const kind of ['g', 'v']) {
        const it = kind === 'g' ? REG.grammar.find(x => !state.srs[x.key]) : REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x));
        const fill = REG.grammar.filter(x => !state.srs[x.key] && x !== it).slice(0, 10);
        const mist = state.mistakes.length; startSession('items', { items: [it, ...fill] }); let e = currentEntry(); e.previewDone = true;
        answerCurrent((e.q.answer + 1) % e.q.options.length);                       // miss
        const n1 = state.srs[it.key].n;
        while (!(currentEntry() || {}).requeued) { nextQuestion(); const c = currentEntry(); if (!c) break; if (!c.requeued) { c.previewDone = true; answerCurrent(c.q.answer); } }
        e = currentEntry(); answerCurrent(e.q.answer);                                 // the 再練一次 copy, right
        out[kind] = { n: state.srs[it.key].n, due: daysBetween(t, state.srs[it.key].due), n1, mistakes: state.mistakes.length - mist,
          inDaily: dailyQueue(20).items.some(x => x.key === it.key), encores: SESSION.entries.filter(x => x.encore && x.item.key === it.key).length };
        SESSION = null; document.body.classList.remove('practicing');
      }
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    for kind in ('g', 'v'):
        assert r[kind]['n'] == 1 and r[kind]['n1'] == 1 and r[kind]['due'] == 1 and r[kind]['mistakes'] == 1 and not r[kind]['inDaily'], r
    assert r['v']['encores'] == 1, r

def test_daily_queue_has_only_due_or_new(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs);
      const rec = (it, o) => { state.srs[it.key] = Object.assign({ b: 1, n: 3, ok: 2, ng: 1, s: 2, d: 6, intro: addDays(t, -9), f: {} }, o); };
      const gs = REG.grammar.filter(g => g.u === 'm1'); const vs = REG.vocab.filter(v => v.builtin && v.lv === 'N5');
      rec(gs[0], { due: t, last: addDays(t, -3) });                 // due → in
      rec(gs[1], { due: addDays(t, -5), last: addDays(t, -9) });    // overdue → in, first
      rec(gs[2], { due: addDays(t, 1), last: addDays(t, -3) });     // tomorrow → out
      rec(gs[3], { due: t, last: t });                              // answered today (e.g. in 單元練習) → out
      rec(vs[0], { due: t, last: addDays(t, -2) });
      rec(vs[1], { due: addDays(t, 2), last: addDays(t, -3), b: 0, st: 0 });   // weak but not due → out
      rec(vs[2], { due: t, last: t });                              // answered today in 單字練習 → out
      saveState(); DAILY_CACHE = null; const q = dailyQueue(20); const keys = q.items.map(x => x.key);
      const bad = q.items.filter(it => { const r = state.srs[it.key]; return r && (r.due > t || r.last === t); }).map(x => x.key);
      const out = { bad, has: [gs[0], gs[1], vs[0]].map(g => keys.includes(g.key)), extra: 'extra' in q, mist: 'mistakeKeys' in q };
      state.srs = JSON.parse(keep); saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['bad'] == [] and r['has'] == [True, True, True], r
    assert not r['extra'] and not r['mist'], r

def test_listening_and_reading_are_capped_per_day(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const s = state.settings.listenPerDay; state.settings.listenPerDay = 3;
      listenReachable().slice(0, 10).forEach(x => { state.srs[x.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -15), intro: addDays(t, -20) }; });
      REG.read.filter(x => unitOrder(x.u) <= unitOrder(state.currentUnit)).slice(0, 3).forEach(x => { state.srs[x.key] = { b: 2, due: t, n: 1, ok: 1, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -4) }; });
      saveState(); DAILY_CACHE = null; const p = dailyPlan(); const out = { l: p.dueL.length + p.newL.length, r: p.dueR.length + p.newR.length };
      state.srs = JSON.parse(keep); state.settings.listenPerDay = s; saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r == {'l': 3, 'r': 1}, r

def test_new_items_spread_across_sessions(b):
    # 60 due reviews + the default new quotas, sessionSize 20: every session holds new items and the button counts the rest
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const size = state.settings.sessionSize; state.settings.sessionSize = 20;
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 60).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      saveState(); DAILY_CACHE = null; const q = dailyQueue(20);
      const firstNew = q.items.filter(it => !state.srs[it.key]).length;
      location.hash = '#/today'; route(); const btn = document.querySelector('[data-act=start-daily]').textContent; const rest = (document.querySelector('.hero .row-wrap .small') || {}).textContent || '';
      state.srs = JSON.parse(keep); state.settings.sessionSize = size; saveState(); DAILY_CACHE = null; return JSON.stringify({ n: q.items.length, total: q.total, firstNew, btn, rest }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['n'] == 20 and r['total'] > 60 and 2 <= r['firstNew'] <= 8, r
    assert int(re.search(r'開始練習・(\d+) 題', r['btn']).group(1)) >= 20 and f"做完還有 {r['total'] - 20} 題" in r['rest'], r   # the button adds the new words' encores

def test_unit_and_vocab_practice_do_not_repeat_todays_correct_answers(b):
    js = """(() => { const t = todayStr(); const items = unitItems('m1'); const before = JSON.stringify(Object.fromEntries(items.map(g => [g.key, state.srs[g.key] || null])));
      items.forEach(g => srsAnswer(g.key, true));   // every m1 item answered today
      const unit = buildUnitQueue('m1', 15).length;
      items.forEach(g => { state.srs[g.key].last = addDays(t, -1); }); const unitY = buildUnitQueue('m1', 15).length;   // …or yesterday
      items.forEach(g => { state.srs[g.key].last = addDays(t, -2); }); const unitQuiet = buildUnitQueue('m1', 15).length;   // two quiet days: usable again
      const theme = vocabTheme(REG.vocab.find(x => x.builtin)); const words = REG.vocab.filter(v => v.builtin && vocabTheme(v) === theme);
      const wBefore = JSON.stringify(words.map(v => state.srs[v.key] || null)); const quota = state.settings.newVocabPerDay; state.settings.newVocabPerDay = 0;
      words.forEach(v => srsAnswer(v.key, true));
      const vq = buildVocabQueue('c:' + theme, 20); const repeats = vq.filter(v => state.srs[v.key] && state.srs[v.key].last === t).length;
      JSON.parse(before) && items.forEach(g => { const r = JSON.parse(before)[g.key]; if (r) state.srs[g.key] = r; else delete state.srs[g.key]; });
      JSON.parse(wBefore).forEach((r, i) => { if (r) state.srs[words[i].key] = r; else delete state.srs[words[i].key]; }); state.settings.newVocabPerDay = quota; saveState();
      return JSON.stringify({ unit, unitY, unitQuiet, repeats, vq: vq.length }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['unit'] == 0 and r['unitY'] == 0 and r['unitQuiet'] > 0 and r['repeats'] == 0, r

def test_heatmap_starts_at_the_week_the_learner_began(b):
    # columns = weeks from the Monday of the first-use week to this week; at least 4, at most 26
    js = """(() => {
      const cols = () => heatmapHtml().match(/<i /g).length / 7;
      const monday = (d) => { const x = parseDate(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
      const expect = (d) => Math.round((monday(todayStr()) - monday(d)) / 864e5 / 7) + 1;
      const out = {};
      state.dailyLogs = {};
      state.createdAt = addDays(todayStr(), -10); out.young = cols();
      state.createdAt = addDays(todayStr(), -70); out.tenWeeks = [cols(), expect(state.createdAt)];
      state.createdAt = todayStr(); state.dailyLogs[addDays(todayStr(), -84)] = { vocabCount: 3 }; out.fromLogs = [cols(), expect(addDays(todayStr(), -84))];
      state.dailyLogs = {}; state.createdAt = addDays(todayStr(), -800); out.old = cols();
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['young'] == 4, r
    assert r['tenWeeks'][0] == r['tenWeeks'][1] and 10 <= r['tenWeeks'][0] <= 11, r
    assert r['fromLogs'][0] == r['fromLogs'][1] and 12 <= r['fromLogs'][0] <= 13, r
    assert r['old'] == 26, r

# ---- 2026-10-26: settings modal usable on mobile browsers whose toolbar eats the top of the viewport ----
def test_modal_header_stays_put_while_the_body_scrolls_and_has_a_bottom_close(b):
    js = """(() => { openSettings('learn');
      const modal = document.querySelector('.modal'), head = document.querySelector('.modal-head'), body = document.getElementById('modalBody'), back = document.querySelector('.modal-back');
      const cs = (el) => getComputedStyle(el);
      const before = head.getBoundingClientRect().top;
      body.scrollTop = 99999; const after = head.getBoundingClientRect().top;
      const rules = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } }).flatMap(r => r.cssRules ? [...r.cssRules] : [r]).filter(r => r.selectorText && /\\.modal(\\s|$|,)/.test(r.selectorText)).map(r => r.cssText).join(' ');
      const foot = document.querySelector('.modal-foot [data-act=close-modal]');
      const out = { display: cs(modal).display, bodyOverflow: cs(body).overflowY, headStatic: cs(head).position !== 'sticky', before, after, scrolled: body.scrollTop > 0,
        svh: /svh|dvh/.test(rules), noBlur: cs(back).backdropFilter === 'none' || !cs(back).backdropFilter, foot: !!foot };
      if (foot) foot.click(); out.closedByFoot = !modalOpen(); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['display'] == 'flex' and r['bodyOverflow'] == 'auto' and r['headStatic'], r
    assert r['scrolled'] and r['before'] == r['after'], r
    assert r['svh'] and r['noBlur'] and r['foot'] and r['closedByFoot'], r

# ---- 2026-10-26: Google Cloud TTS engine; known readings sent as SSML aliases / kana ----
FAKE_FETCH = """window.__calls = []; window.fetch = async (url, opt) => { __calls.push({ url: String(url), body: opt && opt.body ? JSON.parse(opt.body) : null }); return { ok: true, status: 200, json: async () => ({ audioContent: btoa('abc') }), blob: async () => new Blob(['abc']) }; }; true"""

def test_google_tts_engine_sends_ssml_with_known_readings(b):
    js = """(() => { const c = ttsConfig(); c.engine = 'google_tts'; c.googleKey = 'K'; saveState();
      return engineBlob('机の上に本があります。', '').then(blob => engineBlob('はい。', 'm').then(() => {
        openSettings('speech'); const ui = { key: !!document.querySelector('[data-key=googleKey]'), voice: !!document.querySelector('[data-key=googleVoice]') }; closeModal();
        return JSON.stringify({ blob: blob instanceof Blob && blob.size > 0, url: __calls[0].url, body: __calls[0].body, male: __calls[1].body.voice.name, ui, avail: speechAvailable() }); })); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_FETCH), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['blob'] and r['url'].startswith('https://texttospeech.googleapis.com/v1/text:synthesize?key=K'), r
    body = r['body']
    assert body['voice'] == {'languageCode': 'ja-JP', 'name': 'ja-JP-Neural2-B'} and body['audioConfig']['audioEncoding'] == 'MP3', r
    assert body['input']['ssml'].startswith('<speak>') and '<sub alias="つくえ">机</sub>' in body['input']['ssml'] and '<sub alias="ほん">本</sub>' in body['input']['ssml'], r
    assert r['male'] == 'ja-JP-Neural2-C' and r['ui'] == {'key': True, 'voice': True} and r['avail'], r

def test_deepgram_gets_kana_for_known_readings_unless_turned_off(b):
    js = """(() => { const c = ttsConfig(); c.engine = 'deepgram'; c.deepgramKey = 'D'; saveState();
      return engineBlob('三本の鉛筆があります。', '').then(() => { c.kanaReadings = 'off'; return engineBlob('三本の鉛筆があります。', ''); }).then(() =>
        JSON.stringify({ on: __calls[0].body.text, off: __calls[1].body.text, fn: kanaReadings('今日は何曜日ですか。') })); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_FETCH), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert 'さんぼん' in r['on'] and 'えんぴつ' in r['on'] and not __import__('re').search('[一-龯]', r['on']), r
    assert r['off'] == '三本の鉛筆があります。', r
    assert r['fn'] == 'きょうはなんようびですか。', r

# ---- 2026-10-26: single words are spoken from their written form with the reading pinned; spelling/matching can give up ----
def test_single_words_are_sent_as_kanji_with_the_reading_pinned(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && x.r && meaningOptions(x)); const w = jaPlain(v.w);
      const c = ttsConfig(); c.engine = 'google_tts'; c.googleKey = 'K'; saveState();
      return speak(w, { reading: v.r }).then(() => { c.engine = 'deepgram'; c.deepgramKey = 'D'; return speak(w, { reading: v.r }); }).then(() => {
        const q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); const calls = []; const orig = speak; speak = (t, o) => { calls.push([t, o && o.reading]); return Promise.resolve(); };
        startSession('items', { items: [v] }); const e = currentEntry(); e.previewDone = true; e.q = q; renderPractice(); ACTIONS.replay(); SESSION = null; document.body.classList.remove('practicing'); speak = orig;
        return JSON.stringify({ google: __calls[0].body.input.ssml, deepgram: __calls[1].body.text, w, r: v.r, speakWord: q.speakWord, speakReading: q.speakReading, replay: calls[calls.length - 1] }); }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_FETCH), ("eval", "location.hash = '#/today'; true"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['google'] == f"<speak><sub alias=\"{r['r']}\">{r['w']}</sub></speak>", r
    assert r['deepgram'] == r['w'], r
    assert r['speakWord'] == r['w'] and r['speakReading'] == r['r'] and r['replay'] == [r['w'], r['r']], r

def test_spelling_and_matching_offer_a_give_up_button_that_counts_as_wrong(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 3 && x.r.length <= 6 && meaningOptions(x) && recallOptions(x)); srsAnswer(v.key, true);
      startSession('items', { items: [v, v] }); let e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
      document.querySelector('[data-act=custom-giveup]').click();
      const out = { spellDone: e.done, spellWrong: e.chosen !== e.q.answer, spellShows: document.querySelector('.fb-head').textContent.includes(v.r), f: state.srs[v.key].f['v-spell'] };
      nextQuestion(); e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      document.querySelector('[data-act=custom-giveup]').click();
      out.matchDone = e.done; out.matchWrong = e.chosen !== e.q.answer; out.revealed = document.querySelectorAll('.match-word.matched').length;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; true"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['spellDone'] and r['spellWrong'] and r['spellShows'] and r['f'] == [0, 1], r
    assert r['matchDone'] and r['matchWrong'] and r['revealed'] == 4, r

# ---- 2026-10-26: 語音 › 測試連線 shows the provider's real error and a hint ----
def test_tts_connection_check_reports_the_real_error_and_success(b):
    fail = """window.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Cloud Text-to-Speech API has not been used in project 123 before or it is disabled.' } }), text: async () => '' }); true"""
    okf = """window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ audioContent: btoa('abc') }), blob: async () => new Blob(['abc']) }); true"""
    # click 測試連線 and poll the result box ourselves (independent of the harness's wait timing under parallel load)
    run = """(() => { const c = ttsConfig(); c.engine = 'google_tts'; c.googleKey = 'K'; saveState(); openSettings('speech');
      const btn = document.querySelector('[data-act=tts-check]'); if (!btn) return 'NO BUTTON'; btn.click();
      return new Promise(res => { const t0 = Date.now(); (function poll() { const box = document.getElementById('ttsCheckBox'); const t = box ? box.textContent : '';
        if (t.length > 0 || Date.now() - t0 > 15000) { closeModal(); res(t); } else setTimeout(poll, 50); })(); }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", fail), ("eval", run), ("eval", okf), ("eval", run)], timeout=45)
    assert 'has not been used' in out[-3] and '尚未啟用' in out[-3], out[-3]
    assert '連線成功' in out[-1], out[-1]

def test_tools_page_has_an_expandable_api_guide_for_every_provider(b):
    # the 工具與 AI page ends with a collapsed guide per service; ?guide=<id> opens that one; settings link to it
    probe = """(() => { const card = document.getElementById('apiGuides'); if (!card) return 'NO CARD';
      const ids = [...card.querySelectorAll('details[data-guide]')].map(d => d.dataset.guide + (d.open ? '*' : ''));
      const links = card.querySelectorAll('a[target=_blank]').length;
      const noopener = [...card.querySelectorAll('a[target=_blank]')].every(a => /noopener/.test(a.rel));
      return JSON.stringify({ ids, links, noopener, title: card.querySelector('.card-title').textContent }); })()"""
    link = """(() => { const c = ttsConfig(); c.engine = 'google_tts'; saveState(); openSettings('speech');
      const a = document.querySelector('#modalBody [data-act=nav][data-route="#/tools?guide=google_tts"]'); closeModal(); return a ? a.textContent : 'NO LINK'; })()"""
    out = b.run([("nav", URL + "#/tools"), ("wait", READY), ("eval", probe), ("nav", URL + "#/tools?guide=deepgram"), ("eval", probe), ("eval", link)], timeout=45)
    first = json.loads(out[0]); opened = json.loads(out[1])
    assert first['title'] == 'API 申請說明', first
    assert first['ids'] == ['google_tts', 'gemini', 'openai', 'deepgram', 'voicevox', 'ollama'], first['ids']
    assert first['links'] >= 8 and first['noopener'], first
    assert 'deepgram*' in opened['ids'] and 'google_tts*' not in opened['ids'], opened['ids']
    assert '申請' in out[2], out[2]

def test_stats_shows_the_past_week_of_practice_and_what_was_learned(b):
    seed = """(() => { const t = todayStr(); const y = addDays(t, -1);
      state.dailyLogs[y] = { date: y, vocabCount: 4, grammarCount: 2, quizCount: 1, bonusCount: 0, minutes: 5, topics: [] };
      const v = REG.vocab.find(x => x.builtin); const g = REG.grammar[0];
      state.srs[v.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) };
      state.srs[g.key] = { b: 1, due: t, n: 1, ok: 1, ng: 0, s: 1, d: 5, last: y, intro: y };
      saveState(); window.__lab = [itemLabel(v), itemLabel(g)]; return 'seeded'; })()"""
    probe = """(() => { const v = document.getElementById('view'); const card = [...v.querySelectorAll('.card')].find(c => /過去 7 天/.test(c.textContent)); if (!card) return JSON.stringify({ card: false, future: /未來 7 天/.test(v.textContent) });
      const cols = [...card.querySelectorAll('.cols .col')]; const y = cols[5]; const segs = [...y.querySelectorAll('.cseg')].map(x => x.className.replace('cseg ', '') + ':' + x.style.flexGrow);
      const d = card.querySelector('details'); const txt = d ? d.textContent : '';
      const cards = [...v.querySelectorAll(':scope > .card, :scope > .grid')]; const order = [cards.indexOf(document.getElementById('progressCard')), cards.indexOf(card), cards.findIndex(c => c.classList.contains('grid-4'))];
      const g = [...document.querySelectorAll('#progressCard .gauge')].map(x => ({ k: x.dataset.kind, total: +x.dataset.total, seen: +x.dataset.seen, learned: +x.dataset.learned, mastered: +x.dataset.mastered, pct: +x.dataset.pct, needle: !!x.querySelector('.needle'), arcs: x.querySelectorAll('path.arc').length, tick: x.querySelector('.tick') ? +x.querySelector('.tick').dataset.f : null, tickLabels: [...x.querySelectorAll('.tick-l')].map(t => t.textContent).join('/') }));
      return JSON.stringify({ card: true, future: /未來 7 天/.test(v.textContent), n: cols.length, segs, label: y.textContent.trim(), summary: d && d.querySelector('summary').textContent,
        learned: txt.includes(__lab[0]), fresh: txt.includes(__lab[1]), legend: /單字.*文法/.test(card.textContent), g, order, hasLegend: /已熟練|熟練/.test(document.getElementById('progressCard').textContent) && /熟悉/.test(document.getElementById('progressCard').textContent) && /已學/.test(document.getElementById('progressCard').textContent) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL + "#/stats"), ("eval", probe)], timeout=45)
    r = json.loads(out[-1])
    assert r['card'] and not r['future'], r
    assert r['n'] == 7 and r['segs'] == ['q:1', 'g:2', 'v:4'] and r['label'] == '7', r
    assert r['summary'] == '明細' and not r['learned'] and not r['fresh'] and r['legend'] and r['hasLegend'], r
    assert r['order'] == [0, 1, 2], r['order']   # gauges first, then the week chart, then the number tiles
    g = {x['k']: x for x in r['g']}; assert set(g) == {'v', 'g'}, r['g']
    assert g['v']['learned'] == 1 and g['v']['mastered'] == 0 and g['v']['total'] >= 1400 and g['v']['needle'] and g['v']['arcs'] == 1 and 0 <= g['v']['pct'] < 100, g['v']
    assert g['g']['seen'] + g['g']['learned'] + g['g']['mastered'] == 1 and g['g']['total'] >= 1000, g['g']
    assert abs(g['v']['tick'] - 735 / g['v']['total']) < 0.002 and g['v']['tickLabels'] == 'N5/N4', g['v']   # a faint mark where N5 ends
    assert 0.2 < g['g']['tick'] < 0.6 and g['g']['tickLabels'] == 'N5/N4', g['g']

def test_reaching_the_learned_level_records_the_date(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin); const k = v.key; delete state.srs[k]; const out = [];
      for (let i = 0; i < 6; i++) { if (state.srs[k]) state.srs[k].last = addDays(todayStr(), -10); const r = srsAnswer(k, true, { grade: 'easy' }); out.push([r.after, state.srs[k].lrn || null]); if (state.srs[k].lrn) break; }
      const crossed = out.findIndex(x => x[0] >= SRS_LEARNED);
      return JSON.stringify({ out, crossed, today: todayStr() }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['crossed'] >= 0, r
    assert all(x[1] is None for x in r['out'][:r['crossed']]) and r['out'][r['crossed']][1] == r['today'], r

def test_tapping_a_word_in_the_matching_question_speaks_it_with_its_reading(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && x.r && matchPairs(x)); srsAnswer(v.key, true);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      window.__spoken = []; window.speak = (t, o) => { __spoken.push([t, o && o.reading]); return Promise.resolve(); };
      const w = document.querySelector(`.match-word[data-w="${jaPlain(v.w)}"]`); w.click();
      const again = document.querySelector(`.match-word[data-w="${jaPlain(v.w)}"]`); again.click();   // deselect: no second utterance
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify({ spoken: __spoken, w: jaPlain(v.w), r: v.r }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['spoken'] == [[r['w'], r['r']]], r

def test_stats_recommends_daily_quotas_from_the_remaining_banks_and_applies_them(b):
    seed = """(() => { state.settings.examDate = addDays(todayStr(), 121); state.settings.newVocabPerDay = 8; state.settings.newGrammarPerDay = 6; state.settings.newKanjiPerDay = 3; state.settings.listenPerDay = 3; saveState();
      const unseen = (arr) => arr.filter(x => !state.srs[x.key]).length;
      window.__exp = { v: Math.ceil(unseen(REG.vocab.filter(x => x.builtin)) / 100), g: Math.ceil(unseen(REG.grammar) / 100), k: Math.min(15, Math.ceil(unseen(REG.kanji) / 100)), l: Math.min(10, Math.ceil(unseen(REG.listen) / 100)) };
      return JSON.stringify(__exp); })()"""
    probe = """(() => { const card = document.getElementById('planAdvice'); if (!card) return 'NO CARD';
      const btn = card.querySelector('[data-act=apply-advice]'); const before = btn ? btn.textContent.trim() : 'NO BUTTON';
      const txt = card.textContent; if (btn) btn.click();
      const s = state.settings; const after = document.querySelector('#planAdvice [data-act=apply-advice]');
      return JSON.stringify({ before, hasDays: /100 天/.test(txt), rows: card.querySelectorAll('tbody tr').length, s: [s.newVocabPerDay, s.newGrammarPerDay, s.newKanjiPerDay, s.listenPerDay], goal: s.dailyGoal, after: after ? after.textContent.trim() + (after.disabled ? '|disabled' : '') : 'gone' }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL + "#/stats"), ("eval", probe)], timeout=45)
    exp = json.loads(out[0]); r = json.loads(out[1])
    assert r['before'] == '使用建議' and r['hasDays'] and r['rows'] >= 4, r
    assert r['s'] == [exp['v'], exp['g'], exp['k'], exp['l']], (r, exp)
    assert r['goal'] >= exp['v'] + exp['g'] + exp['k'] + exp['l'] and r['goal'] % 5 == 0, r
    assert r['after'].startswith('已是建議值') and 'disabled' in r['after'], r

# ---- 2026-10-27: 錯題本 rework — mistakes join the daily mix, leave when the item reaches 熟悉, compact page with filters/sort/groups ----
MIST_SEED = """(() => { const t = todayStr(); const gs = REG.grammar.filter(g => g.u === 'm1'); const far = (g, b) => { state.srs[g.key] = { b, due: addDays(t, 20), n: 14, ok: 12, ng: 2, s: b >= 3 ? 8 : 2, d: 6, last: addDays(t, -2), intro: addDays(t, -9) }; };
  state.mistakes = []; far(gs[0], 1); far(gs[1], 1); far(gs[2], 1);
  const mk = (g, count, daysAgo, cat) => ({ id: uid('mk'), key: g ? g.key : '', cat: cat || '文法', prompt: g ? g.key : 'オリジナル問題 ' + count, answer: g ? 'に' : 'で', wrong: 'で', why: '', count, streak: 0, mastered: false, note: '', date: addDays(t, -daysAgo), last: addDays(t, -daysAgo) });
  state.mistakes.push(mk(gs[0], 5, 1), mk(gs[1], 1, 6), mk(gs[2], 2, 3), mk(null, 3, 2, '單字'));
  saveState(); window.__g = gs.slice(0, 3).map(g => g.key); return 'seeded'; })()"""

def test_a_linked_mistake_leaves_when_its_item_reaches_熟悉_and_an_unlinked_one_after_two_days(b):
    js = """(() => { const t = todayStr(); const m0 = state.mistakes[0]; const u = state.mistakes[3]; const out = {};
      onCorrectForMistake({ key: m0.key }); out.linkedStillActive = !m0.mastered;
      state.srs[m0.key].b = 3; onCorrectForMistake({ key: m0.key }); out.linkedMastered = m0.mastered;
      onCorrectForMistake({ mistakeId: u.id }); onCorrectForMistake({ mistakeId: u.id }); out.unlinkedSameDay = !u.mastered;
      u.okDays = [addDays(t, -1)]; onCorrectForMistake({ mistakeId: u.id }); out.unlinkedTwoDays = u.mastered;
      const m1 = state.mistakes[1]; state.srs[m1.key].b = 1; markKnown(m1.key); out.knownMasters = m1.mastered;
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", MIST_SEED), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r == {'linkedStillActive': True, 'linkedMastered': True, 'unlinkedSameDay': True, 'unlinkedTwoDays': True, 'knownMasters': True}, r

def test_mistakes_page_is_a_compact_list_with_sort_filter_and_grammar_point_groups(b):
    probe = """(() => { const v = document.getElementById('view'); const rows = () => [...v.querySelectorAll('details.mrow')]; const go = (h) => { location.hash = h; route(); };
      const firstCount = () => +rows()[0].dataset.count;
      const out = { rows: rows().length, open: rows().filter(r => r.open).length, firstByCount: firstCount(), sort: !!v.querySelector('[data-change=mistake-sort]') };
      go('#/mistakes?f=active&s=stale'); out.firstStale = firstCount();
      go('#/mistakes?f=active&c=單字'); out.catRows = rows().length;
      go('#/mistakes?f=active&g=pt'); out.groups = v.querySelectorAll('.mgroup').length; out.drill = v.querySelectorAll('.mgroup [data-act=stats-drill]').length;
      state.mistakes[1].mastered = true; saveState(); go('#/mistakes?f=mastered'); out.mastered = rows().length; const clr = v.querySelector('[data-act=mistake-clear-mastered]'); out.clearBtn = !!clr;
      window.confirm = () => true; if (clr) clr.click(); out.afterClear = state.mistakes.filter(m => m.mastered).length;
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", MIST_SEED), ("nav", URL + "#/mistakes?f=active&s=count"), ("eval", probe)], timeout=45)
    r = json.loads(out[-1])
    assert r['rows'] == 4 and r['open'] == 0 and r['firstByCount'] == 5 and r['sort'], r
    assert r['firstStale'] == 1 and r['catRows'] == 1, r               # the count-1 one is 6 days stale; one 單字 mistake
    assert r['groups'] >= 2 and r['drill'] >= 1, r
    assert r['mastered'] == 1 and r['clearBtn'] and r['afterClear'] == 0, r

# ---- 2026-10-27: learning-science pass — delayed first test after a preview, one spaced encore + 1-day first interval,
#      grammar mini-lesson on first sighting, spacing for carried mistakes, 「手滑」 undo ----
def test_dismissing_a_preview_asks_the_question_a_few_items_later(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && meaningOptions(x)); const fill = REG.grammar.filter(g => state.srs[g.key]).concat(REG.grammar).slice(0, 9).map(g => { srsAnswer(g.key, true); return g; });
      startSession('items', { items: [v, ...fill] }); renderPractice(); const wasPreview = !!document.querySelector('.preview');
      ACTIONS['preview-go'](); const cur = currentEntry(); const pos = SESSION.entries.findIndex(x => x.item && x.item.key === v.key);
      const out = { wasPreview, movedAway: cur.item.key !== v.key, idx: SESSION.idx, pos, stillPreviewDone: SESSION.entries[pos].previewDone === true, len: SESSION.entries.length };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['wasPreview'] and r['movedAway'] and r['stillPreviewDone'] and r['len'] == 10, r
    assert r['idx'] + 4 <= r['pos'] <= r['idx'] + 6, r

def test_new_word_gets_one_spaced_encore_and_comes_back_tomorrow(b):
    js = """(() => { const t = todayStr(); const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));
      const fill = REG.grammar.filter(g => !state.srs[g.key]).slice(0, 14);
      const est = encoreEstimate([v]); startSession('items', { items: [v, ...fill] }); const e = currentEntry(); e.previewDone = true; answerCurrent(e.q.answer);
      const positions = SESSION.entries.map((x, i) => x.encore && x.item.key === v.key ? i : -1).filter(i => i >= 0);
      const g = REG.grammar.find(x => !state.srs[x.key]); const gr = srsAnswer(g.key, true);
      const out = { enc: positions.length, pos: positions[0], due: daysBetween(t, state.srs[v.key].due), gDue: daysBetween(t, gr.rec.due), est };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['enc'] == 1 and 8 <= r['pos'] <= 11 and r['est'] == 1, r
    assert r['due'] == 1 and r['gDue'] >= 3, r

def test_first_new_question_of_a_lesson_section_shows_that_section_once(b):
    js = """(() => { state.lessonSeen = []; saveState(); startSession('unit', { unit: 'm1' });
      const previews = SESSION.entries.filter(x => x.preview && x.item && x.item.kind === 'g'); const secs = previews.map(x => x.item.sec);
      const out = { previews: previews.length, onePerSection: new Set(secs).size === secs.length && secs.every(s => Number.isInteger(s) && s >= 0) };
      const i = SESSION.entries.findIndex(x => x.preview && x.item && x.item.kind === 'g'); SESSION.idx = i; const e = currentEntry(); const g = e.item; const sec = DATA.LESSONS.m1.sections[g.sec]; renderPractice();
      const txt = document.getElementById('view').textContent; const spoken = [...document.querySelectorAll('.preview.grammar .example [data-act=speak]')].map(x => x.dataset.text);
      Object.assign(out, { card: !!document.querySelector('.preview.grammar'), heading: txt.includes(sec.h.replace(/\\[[^\\]]*\\]/g, '')), rule: txt.includes(sec.rule.slice(0, 8)), point: txt.includes(sec.points[0].replace(/\\[[^\\]]*\\]/g, '').slice(0, 8)), examples: sec.ex.length > 1 && sec.ex.every(x => spoken.includes(x.jp)), lesson: !!document.querySelector('[data-route="#/course/m1?tab=lesson"]') });
      ACTIONS['preview-go'](); out.movedAway = currentEntry().item.key !== g.key; out.seen = state.lessonSeen.includes('m1:' + g.sec);
      SESSION = null; document.body.classList.remove('practicing');
      startSession('unit', { unit: 'm1' }); out.noSecondCard = !SESSION.entries.some(x => x.preview && x.item && x.item.kind === 'g' && x.item.sec === g.sec);
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['previews'] >= 1 and r['onePerSection'] and r['card'] and r['heading'] and r['rule'] and r['point'] and r['examples'] and r['lesson'], r
    assert r['movedAway'] and r['seen'] and r['noSecondCard'], r

def test_listening_pool_is_the_whole_level_ordered_by_closeness_and_repeats_only_after_two_weeks(b):
    js = """(() => { const unit = state.currentUnit; const t = todayStr();
      state.currentUnit = 'm1'; const n5 = listenReachable().length; const first = extrasPlan(unitOrder('m1')).newL.map(x => x.u);
      state.currentUnit = 'm3'; const near = listenReachable().slice(0, 30).map(x => x.u); const c3 = REG.listen.filter(x => x.u === 'm3').length, c2 = REG.listen.filter(x => x.u === 'm2').length;
      state.currentUnit = 'm7'; const all = listenReachable().length;
      const l = REG.listen[0]; const prev = state.srs[l.key] ? JSON.parse(JSON.stringify(state.srs[l.key])) : null;
      delete state.srs[l.key]; srsAnswer(l.key, true); const d1 = daysBetween(t, state.srs[l.key].due);
      Object.assign(state.srs[l.key], { last: addDays(t, -20), due: t }); srsAnswer(l.key, true); const d2 = daysBetween(t, state.srs[l.key].due);
      srsAnswer(l.key, false); const d3 = daysBetween(t, state.srs[l.key].due);
      if (prev) state.srs[l.key] = prev; else delete state.srs[l.key]; state.currentUnit = unit; saveState();
      return JSON.stringify({ n5, total: REG.listen.length, n5Items: REG.listen.filter(x => x.lv === 'N5').length, first, near, c3, c2, all, d1, d2, d3 }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['n5'] == r['n5Items'] and r['n5'] > 60 and r['all'] == r['total'], r
    assert r['first'] and all(u == 'm1' for u in r['first']), r
    assert set(r['near'][:r['c3']]) == {'m3'} and set(r['near'][r['c3']:r['c3'] + r['c2']]) == {'m2'}, r
    assert r['d1'] >= 14 and r['d2'] >= 45 and r['d3'] == 1, r

def test_listening_playback_shows_a_progress_bar_with_the_line_count(b):
    js = """(() => { const it = REG.listen.find(x => x.t === 'dialog'); startSession('items', { items: [it] }); const e = currentEntry(); e.autoPlayed = true; renderPractice();
      const prog = document.getElementById('speechProg'); const out = { has: !!prog, hiddenAtFirst: !!(prog && prog.hidden) };
      const lines = String(currentEntry().q.audio).split(/\\n+/).filter(Boolean).length;
      const p = speakScript(currentEntry().q.audio);
      return new Promise(res => setTimeout(() => { const el = document.getElementById('speechProg'); out.midLabel = el.querySelector('.lab').textContent; out.midHidden = el.hidden; out.midWidth = el.querySelector('.bar span').style.width;
        p.then(() => setTimeout(() => { const el2 = document.getElementById('speechProg'); out.endLabel = el2.querySelector('.lab').textContent; out.endWidth = el2.querySelector('.bar span').style.width; out.lines = lines;
          SESSION = null; document.body.classList.remove('practicing'); res(JSON.stringify(out)); }, 250)); }, 150)); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['has'] and r['hiddenAtFirst'] and not r['midHidden'] and r['midLabel'] == f"第 1 / {r['lines']} 句", r
    assert r['endLabel'] == '播放完畢' and r['endWidth'] == '100%', r

def test_order_items_are_arranged_by_tapping_the_four_parts_in_practice_but_stay_star_choice_in_the_exam(b):
    js = """(() => { const items = REG.grammar.filter(g => g.t === 'order').slice(0, 3); const [a, bItem, c] = items;
      const tap = (e, text) => ACTIONS['order-tap']({ dataset: { i: String(e.q.tiles.indexOf(text)) } });
      startSession('items', { items: [a, bItem, c] }); let e = currentEntry(); renderPractice();
      const out = { custom: e.q.custom, tiles: document.querySelectorAll('.order-tiles .order-tile').length, noOpts: document.querySelectorAll('button.opt').length === 0, shuffled: e.q.tiles.join('') !== a.parts.join('') };
      a.parts.forEach(p => tap(e, p)); out.okDone = e.done === true && e.chosen === 0; out.fullShown = !!document.querySelector('.order-out.ok') && !!document.querySelector('.fb-full');
      nextQuestion(); e = currentEntry(); renderPractice(); const wrong = bItem.parts.slice().reverse(); wrong.forEach(p => tap(e, p));
      out.wrongDone = e.done === true && e.chosen === 1; out.produced = e.q.options[1].text; out.wrongText = (bItem.pre || '') + wrong.join('') + (bItem.post || '');
      nextQuestion(); e = currentEntry(); renderPractice(); tap(e, c.parts[2]); ACTIONS['order-back'](); out.backEmpty = !(e.order || []).length; ACTIONS['custom-giveup'](); out.gaveUp = e.done === true && e.chosen === 1 && e.order.map(i => e.q.tiles[i]).join('') === c.parts.join('');
      const exam = makeGrammarQuestion(a, { forceFmt: 'g-choice' }); out.exam = { fmt: exam.fmt, custom: exam.custom || null, opts: exam.options.length, star: exam.options[exam.answer].text === a.parts[a.star] };
      SESSION = null; document.body.classList.remove('practicing'); [a, bItem, c].forEach(g => delete state.srs[g.key]); saveState(); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['custom'] == 'g-order' and r['tiles'] == 4 and r['noOpts'] and r['shuffled'], r
    assert r['okDone'] and r['fullShown'] and r['wrongDone'] and r['produced'] == r['wrongText'], r
    assert r['backEmpty'] and r['gaveUp'], r
    assert r['exam'] == {'fmt': 'g-order', 'custom': None, 'opts': 4, 'star': True}, r

def test_a_slip_undoes_the_schedule_the_notebook_and_the_requeue(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && meaningOptions(x)); srsAnswer(v.key, true); state.srs[v.key].last = addDays(todayStr(), -3); state.srs[v.key].due = todayStr();
      const before = JSON.stringify(state.srs[v.key]); const mist = state.mistakes.length; const rec0 = state.recent.length; const ng0 = (state.statsFmt['v-meaning'] || { ng: 0 }).ng;
      const fill = REG.grammar.filter(g => state.srs[g.key]).concat(REG.grammar).slice(0, 6).map(g => { srsAnswer(g.key, true); return g; });
      startSession('items', { items: [v, ...fill] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice();
      answerCurrent((e.q.answer + 1) % e.q.options.length);
      const out = { btn: !!document.querySelector('.feedback [data-act=slip]'), added: state.mistakes.length - mist, requeued: SESSION.entries.filter(x => x.requeued).length };
      ACTIONS.slip(); out.restored = JSON.stringify(state.srs[v.key]) === before; out.mistBack = state.mistakes.length === mist; out.requeueGone = SESSION.entries.filter(x => x.requeued).length === 0;
      out.recent = state.recent.length === rec0; out.ng = (state.statsFmt['v-meaning'] || { ng: 0 }).ng === ng0; out.chip = /手滑/.test((document.querySelector('.fb-meta') || {}).textContent || ''); out.btnGone = !document.querySelector('.feedback [data-act=slip]');
      out.wrongStat = SESSION.stats.wrong; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['btn'] and r['added'] == 1 and r['requeued'] == 1, r
    assert r['restored'] and r['mistBack'] and r['requeueGone'] and r['recent'] and r['ng'] and r['chip'] and r['btnGone'] and r['wrongStat'] == 0, r

# ---- 2026-10-27: Gemini — transient errors rotate models without changing the preference, cooldowns, auto mode, caching ----
GEMINI_MOCK = """(() => { window.__calls = []; window.__fail = { 'gemini-z-flash': 429 }; window.__retryMsg = 'Quota exceeded for quota metric ... Please retry in 12.5s.';
  window.fetch = async (url, init) => { url = String(url); __calls.push(url.replace(/[?].*$/, ''));
    if (/[/]models[?]/.test(url)) return { ok: true, status: 200, json: async () => ({ models: ['gemini-z-flash', 'gemini-b-flash', 'gemini-c-pro'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) }) };
    const m = (url.match(/models[/]([^:]+):generateContent/) || [])[1]; const st = __fail[m] || (['gemini-z-flash', 'gemini-b-flash', 'gemini-c-pro'].includes(m) ? 0 : 404);
    if (st) return { ok: false, status: st, text: async () => JSON.stringify({ error: { code: st, message: st === 429 ? __retryMsg : 'The model is overloaded.' } }) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'answer from ' + m }] } }] }) }; };
  aiConfig().provider = 'gemini'; aiConfig().geminiKey = 'K'; aiConfig().geminiModel = 'auto'; saveState(); GEMINI_COOL.clear(); try { localStorage.removeItem('nq_gemini_models'); localStorage.removeItem('nq_ai_cache'); } catch (e) {} return 'mocked'; })()"""

def test_gemini_auto_mode_skips_a_rate_limited_model_and_remembers_the_cooldown(b):
    js = """callAi('hi').then(out1 => { const callsA = __calls.filter(u => /gemini-z-flash/.test(u)).length; return callAi('hi again').then(out2 => JSON.stringify({ out1, out2, callsA, callsA2: __calls.filter(u => /gemini-z-flash/.test(u)).length, cool: GEMINI_COOL.has('gemini-z-flash'), secs: Math.round((GEMINI_COOL.get('gemini-z-flash') - Date.now()) / 1000), last: AI_LAST.model, pref: aiConfig().geminiModel })); })"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", GEMINI_MOCK), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['out1'] == 'answer from gemini-b-flash' and r['out2'] == 'answer from gemini-b-flash' and r['last'] == 'gemini-b-flash', r
    assert r['callsA'] == 1 and r['callsA2'] == 1 and r['cool'] and 10 <= r['secs'] <= 13 and r['pref'] == 'auto', r

def test_gemini_manual_model_falls_back_for_one_call_without_changing_the_preference(b):
    js = """(() => { aiConfig().geminiModel = 'gemini-z-flash'; saveState(); return callAi('hi').then(out => JSON.stringify({ out, pref: aiConfig().geminiModel, last: AI_LAST.model })); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", GEMINI_MOCK), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['out'] == 'answer from gemini-b-flash' and r['pref'] == 'gemini-z-flash' and r['last'] == 'gemini-b-flash', r

def test_gemini_reports_a_plain_message_when_every_model_is_cooling_down(b):
    js = """(() => { __fail['gemini-b-flash'] = 429; __fail['gemini-c-pro'] = 429; return callAi('hi').then(() => 'no error', e => e.message); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", GEMINI_MOCK), ("eval", js)], timeout=45)
    assert '額度' in out[-1] and '秒' in out[-1], out[-1]

def test_ai_explanations_are_cached_per_question_and_show_the_model(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && meaningOptions(x)); srsAnswer(v.key, true); startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice(); answerCurrent(e.q.answer);
      const n0 = __calls.filter(u => /generateContent/.test(u)).length;
      return aiExplainCurrent().then(() => { const n1 = __calls.filter(u => /generateContent/.test(u)).length; const html1 = document.getElementById('aiExplainBox').innerHTML; renderPractice();
        return aiExplainCurrent().then(() => { const n2 = __calls.filter(u => /generateContent/.test(u)).length; const txt = document.getElementById('aiExplainBox').textContent; SESSION = null; document.body.classList.remove('practicing');
          return JSON.stringify({ first: n1 - n0, second: n2 - n1, hasModel: /gemini-b-flash/.test(txt), hasAnswer: /answer from/.test(txt), html1: html1.length > 0 }); }); }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", GEMINI_MOCK), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['first'] >= 1 and r['second'] == 0 and r['hasModel'] and r['hasAnswer'] and r['html1'], r

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_dropped_option_is_spoken_again, test_slow_option_does_not_get_the_next_one_queued_on_top, test_wrong_vocab_options_show_their_chinese_after_answering, test_more_menu_icons_are_small, test_login_code_is_eight_digits,
             test_fresh_profile_starts_at_week_one, test_week_picker_sets_the_current_unit, test_deepgram_lines_are_prefetched_and_all_play_through_one_player,
             test_first_correct_answer_waits_a_few_days_before_repeating, test_new_grammar_of_a_unit_rotates_through_its_points,
             test_audio_options_play_on_click_instead_of_being_read_in_sequence, test_scene_audio_options_have_no_autoplay_and_play_on_click, test_formal_exam_listening_options_play_on_click,
             test_today_button_count_matches_the_session, test_settings_show_the_version_and_its_history,
             test_every_wrong_answer_waits_until_tomorrow, test_miss_then_requeue_does_not_return_today, test_daily_queue_has_only_due_or_new, test_listening_and_reading_are_capped_per_day, test_new_items_spread_across_sessions, test_unit_and_vocab_practice_do_not_repeat_todays_correct_answers,
             test_heatmap_starts_at_the_week_the_learner_began,
             test_modal_header_stays_put_while_the_body_scrolls_and_has_a_bottom_close,
             test_google_tts_engine_sends_ssml_with_known_readings, test_deepgram_gets_kana_for_known_readings_unless_turned_off,
             test_single_words_are_sent_as_kanji_with_the_reading_pinned, test_spelling_and_matching_offer_a_give_up_button_that_counts_as_wrong, test_tts_connection_check_reports_the_real_error_and_success,
             test_tools_page_has_an_expandable_api_guide_for_every_provider,
             test_stats_shows_the_past_week_of_practice_and_what_was_learned, test_reaching_the_learned_level_records_the_date, test_tapping_a_word_in_the_matching_question_speaks_it_with_its_reading,
             test_stats_recommends_daily_quotas_from_the_remaining_banks_and_applies_them,
             test_a_linked_mistake_leaves_when_its_item_reaches_熟悉_and_an_unlinked_one_after_two_days, test_mistakes_page_is_a_compact_list_with_sort_filter_and_grammar_point_groups,
             test_dismissing_a_preview_asks_the_question_a_few_items_later, test_new_word_gets_one_spaced_encore_and_comes_back_tomorrow, test_first_new_question_of_a_lesson_section_shows_that_section_once,
             test_listening_pool_is_the_whole_level_ordered_by_closeness_and_repeats_only_after_two_weeks, test_listening_playback_shows_a_progress_bar_with_the_line_count, test_order_items_are_arranged_by_tapping_the_four_parts_in_practice_but_stay_star_choice_in_the_exam, test_a_slip_undoes_the_schedule_the_notebook_and_the_requeue,
             test_gemini_auto_mode_skips_a_rate_limited_model_and_remembers_the_cooldown, test_gemini_manual_model_falls_back_for_one_call_without_changing_the_preference, test_gemini_reports_a_plain_message_when_every_model_is_cooling_down, test_ai_explanations_are_cached_per_question_and_show_the_model]
    failed = 0
    try:
        for t in tests:
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
