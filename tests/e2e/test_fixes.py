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
state.settings.speechRate = 1; ttsConfig().engine = 'browser_neural'; true"""

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
    # v64: new grammar follows the lesson sections, so the rotation is across the points of the first section
    js = """(() => { const all = newGrammarCandidates('m1'); const sec0 = all.filter(g => g.sec === all[0].sec); const k = new Set(sec0.map(g => g.pt)).size; const c = all.slice(0, k);
      return JSON.stringify({ n: c.length, k, pts: new Set(c.map(g => g.pt)).size }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = json.loads(out[-1]); assert r['k'] >= 3 and r['n'] == r['k'] and r['pts'] == r['k'], r

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
      const note = (document.querySelector('.hero').textContent.match(/換個方式再考一次（約 (\\d+) 題/) || [])[1];
      startSession('daily'); const enc = encoreEstimate(SESSION.entries.map(e => e.item)); const actual = SESSION.entries.length; SESSION = null; document.body.classList.remove('practicing'); location.hash = '#/today';
      out.push([shown, actual, Number(note), enc]); } return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    rows = __import__('json').loads(out[-1])
    assert all(a == b_ and a > 0 and n == enc for a, b_, n, enc in rows), rows   # the button is the items of this session; encores are a note, not part of the count

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
      // the day's three listening items and the passage answered (a first session): the cap holds for the rest of the day
      p.dueL.forEach(x => srsAnswer(x.key, true)); p.dueR.forEach(x => srsAnswer(x.key, true)); DAILY_CACHE = null; const p2 = dailyPlan();
      out.l2 = p2.dueL.length + p2.newL.length; out.r2 = p2.dueR.length + p2.newR.length;
      state.srs = JSON.parse(keep); state.settings.listenPerDay = s; saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r == {'l': 3, 'r': 1, 'l2': 0, 'r2': 0}, r

def test_new_items_spread_across_sessions(b):
    # 60 due reviews + the default new quotas, sessionSize 20: every session holds new items and the button counts the rest
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const size = state.settings.sessionSize; state.settings.sessionSize = 20;
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 60).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      saveState(); DAILY_CACHE = null; const q = dailyQueue(20);
      const firstNew = q.items.filter(it => !state.srs[it.key]).length;
      location.hash = '#/today'; route(); const btn = document.querySelector('[data-act=start-daily]').textContent; const rest = (document.querySelector('.hero [data-panel=scope]') || {}).textContent || '';   // the rest-of-day line lives in the 今天的範圍 panel
      state.srs = JSON.parse(keep); state.settings.sessionSize = size; saveState(); DAILY_CACHE = null; return JSON.stringify({ n: q.items.length, total: q.total, firstNew, btn, rest }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['n'] == 20 and r['total'] > 60 and 2 <= r['firstNew'] <= 8, r
    assert int(re.search(r'開始練習・(\d+) 題', r['btn']).group(1)) >= 20 and f"做完還有 {r['total'] - 20} 題" in r['rest'], r   # the button adds the new words' encores

def test_done_state_and_extra_session(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify({ srs: state.srs, today: state.today, settings: state.settings });
      Object.assign(state.settings, { newVocabPerDay: 4, newGrammarPerDay: 2, newKanjiPerDay: 0, listenPerDay: 0, sessionSize: 20 }); Object.assign(state.today, { newV: 4, newG: 2, newR: 1 });
      Object.keys(state.srs).forEach(k => { if (state.srs[k].due <= t) state.srs[k].last = t; });   // nothing due left
      const ahead = REG.vocab.filter(v => v.builtin && !state.srs[v.key]).slice(0, 3);
      ahead.forEach(v => { state.srs[v.key] = { b: 3, due: addDays(t, 2), n: 3, ok: 3, ng: 0, s: 6, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      saveState(); DAILY_CACHE = null;
      location.hash = '#/today'; route(); const h2 = document.querySelector('.hero h2').textContent; const btn = document.querySelector('[data-act=start-extra]');
      const q = extraQueue(20); const aheadIn = ahead.filter(v => q.items.some(x => x.key === v.key)).length;
      const bad = q.items.filter(it => { const r = state.srs[it.key]; return r && (r.due <= t || r.last === t || r.due > addDays(t, 2)); }).length;
      startSession('daily', { extra: true }); const note = SESSION.meta.note; SESSION = null; document.body.classList.remove('practicing');
      const againOk = startSession('daily', {}); const againNote = againOk ? SESSION.meta.note : ''; SESSION = null; document.body.classList.remove('practicing');   // the summary's 再練一組 with the day done
      // nothing to pull forward and no new quota: the button goes away
      ahead.forEach(v => { state.srs[v.key].last = t; }); Object.assign(state.settings, { newVocabPerDay: 0, newGrammarPerDay: 0 }); saveState(); DAILY_CACHE = null; location.hash = '#/today'; route();
      const gone = !document.querySelector('[data-act=start-extra]'); const tomorrow = /明天再來/.test(document.querySelector('.hero').textContent);
      const k = JSON.parse(keep); state.srs = k.srs; state.today = k.today; state.settings = k.settings; saveState(); DAILY_CACHE = null;
      return JSON.stringify({ h2, btn: btn ? btn.textContent : null, n: q.items.length, aheadIn, bad, newN: q.newN, aheadN: q.aheadN, note, againOk, againNote, gone, tomorrow }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['h2'] == '今天完成了' and r['btn'] and r['btn'].startswith('加練・') and r['n'] > 0, r
    assert r['aheadIn'] == 3 and r['aheadN'] == 3 and r['bad'] == 0 and 0 < r['newN'] <= 10, r
    assert '3 題提前複習' in r['note'] and '額外的新內容' in r['note'] and r['gone'] and r['tomorrow'], r
    assert r['againOk'] and '提前複習' in r['againNote'], r

def test_theme_lane_rotates_after_three_days_of_words(b):
    js = """(() => { const keep = JSON.stringify({ srs: state.srs, lane: state.themeLane, q: state.settings.newVocabPerDay }); state.settings.newVocabPerDay = 8; state.themeLane = { order: [], count: {} };
      // the first themes of THEME_ORDER are small (問候 23, 指示 12 …): mark them introduced so the first lane holds a theme with more than 24 words left
      REG.vocab.filter(v => v.builtin && ['問候', '指示', '代名詞', '疑問'].includes(vocabTheme(v))).forEach(v => { state.srs[v.key] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, last: '2026-01-01', f: {} }; });
      const pool = REG.vocab.filter(v => v.builtin); const th0 = activeThemes(pool, false);
      const big = th0[0]; const words = newVocabCandidates(pool, false).filter(v => vocabTheme(v) === big);
      words.slice(0, 23).forEach(v => srsAnswer(v.key, true)); const th23 = activeThemes(pool, false); const c23 = state.themeLane.count[big];
      srsAnswer(words[23].key, true); const th24 = activeThemes(pool, false);
      const out = { th0, th23, c23, th24, count: state.themeLane.count[big] || 0, last: state.themeLane.order[state.themeLane.order.length - 1], left: words.length - 24 };
      const k = JSON.parse(keep); state.srs = k.srs; state.themeLane = k.lane; state.settings.newVocabPerDay = k.q; saveState(); DAILY_CACHE = null; return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['left'] > 0 and r['th23'] == r['th0'] and r['c23'] == 23, r
    assert r['th24'][0] != r['th0'][0] and r['count'] == 0 and r['last'] == r['th0'][0], r

def test_unit_and_vocab_practice_do_not_repeat_todays_correct_answers(b):
    js = """(() => { const t = todayStr(); const items = unitItems('m1'); const before = JSON.stringify(Object.fromEntries(items.map(g => [g.key, state.srs[g.key] || null])));
      items.forEach(g => srsAnswer(g.key, true));   // every m1 item answered today
      const u0 = buildUnitQueue('m1', 15); const unit = u0.length; const unitDrill = Boolean(u0.drill);
      items.forEach(g => { state.srs[g.key].last = addDays(t, -1); }); const u1 = buildUnitQueue('m1', 15); const unitY = u1.length >= 5 && u1.drill === true;   // yesterday: nothing due, so a labelled drill of the shakiest
      startSession('unit', { unit: 'm1' }); renderPractice(); const noteShown = /這組是加練/.test(document.getElementById('view').textContent); SESSION = null; document.body.classList.remove('practicing');
      items.slice(0, 2).forEach(g => { state.srs[g.key].due = t; }); startSession('unit', { unit: 'm1' }); renderPractice();   // two due: the note must not say nothing is due
      const noteHonest = /這組是加練/.test(document.getElementById('view').textContent) && !/沒有到期/.test(document.getElementById('view').textContent); SESSION = null; document.body.classList.remove('practicing'); items.slice(0, 2).forEach(g => { state.srs[g.key].due = addDays(t, 5); });
      const theme = vocabTheme(REG.vocab.find(x => x.builtin)); const words = REG.vocab.filter(v => v.builtin && vocabTheme(v) === theme);
      const wBefore = JSON.stringify(words.map(v => state.srs[v.key] || null)); const quota = state.settings.newVocabPerDay; state.settings.newVocabPerDay = 0;
      words.forEach(v => srsAnswer(v.key, true));
      const vq = buildVocabQueue('c:' + theme, 20); const repeats = vq.filter(v => state.srs[v.key] && state.srs[v.key].last === t).length;
      state.settings.newVocabPerDay = 8; state.today.newV = 8; const freshOverQuota = buildVocabQueue('all', 20).filter(v => !state.srs[v.key]).length;   // quota used up: no new words beyond it
      JSON.parse(before) && items.forEach(g => { const r = JSON.parse(before)[g.key]; if (r) state.srs[g.key] = r; else delete state.srs[g.key]; });
      JSON.parse(wBefore).forEach((r, i) => { if (r) state.srs[words[i].key] = r; else delete state.srs[words[i].key]; }); state.settings.newVocabPerDay = quota; state.today.newV = 0; saveState();
      return JSON.stringify({ unit, unitDrill, unitY, noteShown, noteHonest, repeats, vq: vq.length, freshOverQuota }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r == {'unit': 0, 'unitDrill': False, 'unitY': True, 'noteShown': True, 'noteHonest': True, 'repeats': 0, 'vq': 0, 'freshOverQuota': 0}, r

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
      return JSON.stringify({ before, hasDays: /100 天/.test(txt), rows: card.querySelectorAll('tbody tr').length, s: [s.newVocabPerDay, s.newGrammarPerDay, s.newKanjiPerDay, s.listenPerDay], after: after ? after.textContent.trim() + (after.disabled ? '|disabled' : '') : 'gone' }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL + "#/stats"), ("eval", probe)], timeout=45)
    exp = json.loads(out[0]); r = json.loads(out[1])
    assert r['before'] == '使用建議' and r['hasDays'] and r['rows'] >= 4, r
    assert r['s'] == [exp['v'], exp['g'], exp['k'], exp['l']], (r, exp)
    assert r['after'].startswith('已是建議值') and 'disabled' in r['after'], r

# ---- 2026-10-27 (v65): ring = done / today's work; 每日目標 → 每天負荷上限; exam-pace quotas on Today; 再練一次 in another format; grammar encore ----
def test_ring_counts_todays_work_and_fills_when_the_day_is_done(b):
    js = """(() => { const t = todayStr(); const read = () => { location.hash = '#/today'; route(); const m = /(\\d+)\\s*\\/\\s*(\\d+) 題/.exec(document.querySelector('.hero').textContent.replace(/\\s+/g, ' ')); return m ? [Number(m[1]), Number(m[2])] : null; };
      const r0 = read(); const expect0 = dailyPlan().remaining; const hero0 = document.querySelector('.hero').textContent.replace(/\\s+/g, ' ');
      const num = (re) => { const m = re.exec(hero0); return m ? Number(m[1]) : 0; }; const sum = num(/待複習 (\\d+)/) + num(/新內容 (\\d+)/) + num(/另有 (\\d+)/); const shownTotal = num(/共 (\\d+) 題/);
      // five words answered today in some other practice (the schedule records them); encores and requeues write nothing, so they never move the ring
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && !state.srs[v.key]).slice(-5).forEach(v => { state.srs[v.key] = { b: 1, due: addDays(t, 1), n: 1, ok: 1, ng: 0, s: 1, d: 5, last: t, intro: t, f: {} }; });
      logEntry(t).vocabCount = 9; saveState(); DAILY_CACHE = null; const r1 = read();
      Object.assign(state.settings, { newVocabPerDay: 0, newGrammarPerDay: 0, newKanjiPerDay: 0, listenPerDay: 0 }); state.today.newR = 1; saveState(); DAILY_CACHE = null; const r2 = read();
      return JSON.stringify({ r0, expect0, sum, shownTotal, r1, r2, done: /今天完成了/.test(document.querySelector('.hero').textContent) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['r0'] == [0, r['expect0']] and r['expect0'] > 0 and r['sum'] == r['expect0'] == r['shownTotal'], r   # the breakdown, its 共 N 題 and the ring agree
    assert r['r1'] == [5, r['expect0'] + 5], r
    assert r['r2'] == [5, 5] and r['done'], r

def test_load_cap_replaces_the_daily_goal_and_brakes_new_items_in_order(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const s = state.settings;
      const mig = { low: normalizeState({ settings: { dailyGoal: 20 } }).settings, high: normalizeState({ settings: { dailyGoal: 100 } }).settings, fresh: defaultSettings(),
        raised: normalizeState({ settings: { loadCap: 40 } }).settings.loadCap, kept: normalizeState({ settings: { loadCap: 40, capRaised: true } }).settings.loadCap, own: normalizeState({ settings: { loadCap: 60 } }).settings.loadCap };
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 30).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      const plan = (cap) => { s.loadCap = cap; saveState(); DAILY_CACHE = null; const p = dailyPlan(); return [p.newV.length, p.newG.length, p.newK.length, p.newL.length]; };
      const wide = plan(200), tight = plan(10);
      state.srs = JSON.parse(keep); s.loadCap = 40; saveState(); DAILY_CACHE = null;
      const txt = settingsLearn().replace(/<[^>]+>/g, ' '); location.hash = '#/today'; route();
      return JSON.stringify({ mig: { low: [mig.low.loadCap, 'dailyGoal' in mig.low], high: mig.high.loadCap, fresh: [mig.fresh.loadCap, 'dailyGoal' in mig.fresh], raised: mig.raised, kept: mig.kept, own: mig.own }, wide, tight, row: /每天負荷上限/.test(txt), max300: /data-key="loadCap"[^>]*max="300"|max="300"[^>]*data-key="loadCap"/.test(settingsLearn()), oldRow: /每日目標|dailyGoal/.test(txt), setGoal: !!document.querySelector('[data-act=set-goal]') }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['mig'] == {'low': [100, False], 'high': 100, 'fresh': [100, False], 'raised': 100, 'kept': 40, 'own': 60}, r   # v69: the v65 default of 40 is raised to 100 once; a cap someone set stays
    assert r['wide'] == [8, 6, 3, 3] and r['tight'] == [4, 6, 0, 0], r   # reviews never shrink; words to half, then kanji, then listening; grammar untouched
    assert r['row'] and r['max300'] and not r['oldRow'] and not r['setGoal'], r

def test_pressing_see_results_after_the_last_question_shows_the_summary(b):
    # v65 took the daily goal out of the summary but left the ring reading it: the last 看結果 threw and the screen froze
    js = """(() => { startSession('daily', {}); const first = currentEntry();
      if (first.preview) dismissPreview();
      if (first.q && first.q.custom) finishCustom(first, true, ''); else answerCurrent(0);
      SESSION.entries.length = SESSION.idx + 1; renderPractice();   // answering may queue an encore; make this the last question
      let btn = document.getElementById('btnNext'); for (let i = 0; i < 3 && btn && /開始作答/.test(btn.textContent); i++) { ACTIONS['preview-go'](btn); btn = document.getElementById('btnNext'); }   // a lesson-section intro may sit in front
      const label = btn ? btn.textContent.trim() : null;
      let err = null; try { nextQuestion(); } catch (e) { err = String(e); }
      const v = document.querySelector('.view.active') || document.body; const title = v.querySelector('.page-title'); const ring = v.querySelector('.ring-txt');
      const home = itemsDoneToday() + dailyPlan().remaining;
      const m = ring && /(\\d+)\\s*\\/\\s*(\\d+)/.exec(ring.textContent.replace(/\\s+/g, ' '));
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ label, err, title: title ? title.textContent : null, ring: m ? [Number(m[1]), Number(m[2])] : null, home, text: v.textContent.replace(/\\s+/g, ' ').slice(0, 300) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['label'] and r['label'].startswith('看結果'), r
    assert r['err'] is None and r['title'] == '完成了', r
    assert r['ring'] and r['ring'][1] == r['home'] and r['ring'][0] >= 1, r
    assert '目標' not in r['text'], r

def test_practice_counter_counts_the_planned_items_and_shows_extras_apart(b):
    js = """(() => { startSession('daily', {}); route(); const n0 = SESSION.entries.length; const count = () => document.querySelector('.pr-count').textContent.replace(/\\s+/g, ' ').trim();
      const first = count(); const seen = []; let steps = 0, firstExtra = null, wrongDone = false;
      while (SESSION.idx < SESSION.entries.length && steps++ < 200) {
        const e = currentEntry(); if (e.preview && !e.previewDone) { dismissPreview(); continue; }
        if (e.done) { nextQuestion(); continue; }
        if ((e.encore || e.requeued) && firstExtra === null) firstExtra = { label: count(), idx: SESSION.idx, kind: e.encore ? 'encore' : 'requeue' };
        if (e.q && e.q.custom) finishCustom(e, true, ''); else { const miss = !wrongDone && !e.encore && !e.requeued && !!state.srs[e.item.key]; if (miss) wrongDone = true; answerCurrent(miss ? (e.q.answer + 1) % e.q.options.length : e.q.answer); }
        seen.push(count());
      }
      const last = seen[seen.length - 1]; const extras = SESSION.entries.filter(x => x.encore || x.requeued).length; const total = SESSION.entries.length;
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ n0, first, firstExtra, last, extras, total }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=90)
    r = json.loads(out[-1])
    assert r['first'] == f"1 / {r['n0']}", r
    assert r['extras'] > 0 and r['total'] == r['n0'] + r['extras'], r
    assert r['firstExtra'] and re.fullmatch(rf"\d+ / {r['n0']} 加考 1", r['firstExtra']['label']), r   # an extra does not move the planned count, it is counted apart
    assert r['last'] == f"{r['n0']} / {r['n0']} 加考 {r['extras']}", r

FAKE_DAYS = """const RealDate = Date; window.__shift = 0;
window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else { super(); this.setDate(this.getDate() + window.__shift); } } static now() { return RealDate.now() + window.__shift * 86400000; } };
window.__day = (n) => { window.__shift = n; DAILY_CACHE = null; }; true"""

def test_a_miss_walks_the_relearning_ladder_and_then_leaves_the_notebook(b):
    # a missed word, grammar item or kanji comes back on days 1, 3 and 7; three right answers in a row hand it back to FSRS and
    # clear it from the notebook; a miss on the way restarts the ladder. Listening is not on the ladder (a dialogue heard again
    # within days tests memory of the answer).
    js = """(() => { const t0 = todayStr(); const v = REG.vocab.find(x => x.builtin && x.lv === 'N5'); const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.op); const l = REG.listen[0];
      const seed = (it) => { state.srs[it.key] = { b: 2, due: t0, n: 3, ok: 3, ng: 0, s: 4, d: 5, last: addDays(t0, -4), intro: addDays(t0, -10), f: {} }; }; [v, g, l].forEach(seed);
      const play = (it, ok) => { startSession('items', { items: [it] }); if (currentEntry().preview) dismissPreview(); const q = currentEntry().q; answerCurrent(ok ? q.answer : (q.answer + 1) % q.options.length); SESSION = null; document.body.classList.remove('practicing'); };
      const rec = (it) => { const r = state.srs[it.key]; return [daysBetween(t0, r.due), typeof r.rl === 'number' ? r.rl : null]; };
      const inBook = (it) => activeMistakes().some(m => m.key === it.key);
      const out = {};
      __day(0); play(v, false); out.d0 = [rec(v), inBook(v)];
      __day(1); play(v, true); out.d1 = [rec(v), inBook(v)];
      __day(3); play(v, true); out.d3 = [rec(v), inBook(v)];
      __day(7); play(v, true); out.d7 = [rec(v), inBook(v)];
      __day(0); play(g, false); __day(1); play(g, true); __day(3); play(g, false); out.gRestart = [rec(g), inBook(g)];
      __day(0); play(l, false); out.l0 = rec(l); __day(1); play(l, true); out.l1 = rec(l);
      __day(0); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_DAYS), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['d0'] == [[1, 0], True], r
    assert r['d1'] == [[3, 1], True], r
    assert r['d3'] == [[7, 2], True], r
    assert r['d7'][0][1] is None and r['d7'][0][0] > 8 and r['d7'][1] is False, r
    assert r['gRestart'] == [[4, 0], True], r
    assert r['l0'] == [1, None] and r['l1'][1] is None and r['l1'][0] >= 15, r

def test_today_counts_relearning_items_among_reviews_and_puts_them_first(b):
    js = """(() => { const t = todayStr(); const words = REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 12);
      words.forEach((v, i) => { state.srs[v.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: i < 3 ? 1 : 0, s: 3, d: 5, last: addDays(t, -2), intro: addDays(t, -9), f: {} }; if (i < 3) state.srs[v.key].rl = 0; });
      saveState(); DAILY_CACHE = null; location.hash = '#/today'; route(); const hero = document.querySelector('.hero').textContent.replace(/\\s+/g, ' ');
      const dq = dailyQueue(state.settings.sessionSize); const reviews = dq.items.filter(x => x.kind === 'v' && state.srs[x.key]); const onLadder = reviews.map(x => typeof state.srs[x.key].rl === 'number');
      startSession('daily', {}); route(); let chip = null, steps = 0;
      while (steps++ < 40) { const e = currentEntry(); if (e.preview && !e.previewDone) { dismissPreview(); continue; } if (e.item && e.item.kind === 'v' && typeof state.srs[e.item.key].rl === 'number') { chip = /錯題複習/.test(document.querySelector('.q-label').textContent); break; } answerCurrent(e.q.answer); if (currentEntry() && currentEntry().done) nextQuestion(); }
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ line: (hero.match(/待複習 \\d+（[^）]*）/) || [''])[0], onLadder, chip }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert '其中錯題 3' in r['line'], r
    assert r['onLadder'][:3] == [True, True, True] and not any(r['onLadder'][3:]), r
    assert r['chip'] is True, r

def test_cloud_audio_path_is_stable_and_pins_readings(b):
    js = """(async () => { const a = await cloudAudioPath('三本ください', ''); const a2 = await cloudAudioPath('三本ください', 'f'); const m = await cloudAudioPath('三本ください', 'm');
      const r1 = await cloudAudioPath('日本', '', { reading: 'にほん' }); const r2 = await cloudAudioPath('日本', '', { reading: 'にっぽん' }); const plain = await cloudAudioPath('日本', '');
      return JSON.stringify({ a, same: a === a2, m, r1, r2, plain, base: cloudAudioBase() }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=30)
    r = json.loads(out[-1])
    assert re.fullmatch(r"f/[0-9a-f]{32}\.mp3", r['a']) and r['same'] and re.fullmatch(r"m/[0-9a-f]{32}\.mp3", r['m']) and r['m'][2:] != r['a'][2:], r
    assert r['r1'] == r['plain'] and r['r2'] != r['plain'], r   # the dictionary already pins 日本→にほん (same file); another reading is another file
    assert r['base'].endswith('/storage/v1/object/public/JPY_audio/v1'), r

def test_cloud_engine_falls_back_to_the_browser_voice_and_notes_the_miss(b):
    js = """(async () => { ttsConfig().engine = 'cloud'; localStorage.removeItem('nq_audio_miss'); const calls = [];
      const realFetch = window.fetch; window.fetch = (u, o) => { calls.push(String(u)); return Promise.resolve(new Response('', { status: 404 })); };
      await speak('こんにちは'); await speak('こんにちは');   // the second time the miss is remembered: no request
      const log = __tts.log.slice(); const miss = JSON.parse(localStorage.getItem('nq_audio_miss') || '[]');
      window.fetch = (u, o) => Promise.resolve(new Response(new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }), { status: 200 }));
      audioCache.clear(); cloudMisses.clear(); const blob = await engineBlob('さようなら', 'm');
      window.fetch = realFetch; ttsConfig().engine = 'browser_neural';
      return JSON.stringify({ calls, log, miss, blobSize: blob ? blob.size : null }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)], timeout=40)
    r = json.loads(out[-1])
    assert len(r['calls']) == 1 and '/storage/v1/object/public/JPY_audio/v1/f/' in r['calls'][0], r
    assert [x for x in r['log'] if x == 'start:こんにちは'] and r['miss'] == [{'text': 'こんにちは', 'gender': '', 'reading': ''}], r
    assert r['blobSize'] == 3, r

def test_cloud_generator_covers_the_built_in_sentences_and_uploads_only_what_is_missing(b):
    js = """(async () => { const all = cloudAudioTexts(); const w = REG.vocab.find(v => v.builtin); const male = all.find(x => x.gender === 'm');
      const hasWord = all.some(x => x.text === jaPlain(w.w)); const hasEx = all.some(x => x.text === ttsText(exPlain(w.ex))); const pinned = all.filter(x => x.reading).length;
      const zhN = all.filter(x => x.lang === 'zh').length; const zh0 = all.find(x => x.lang === 'zh');
      const sample = all.slice(0, 6).concat([zh0]); cloudAudioTexts = () => sample;
      const paths = await Promise.all(sample.map(x => cloudAudioPath(x.text, x.gender, { reading: x.reading || '', lang: x.lang || '' }))); const uniq = [...new Set(paths)]; const firstTodo = uniq.filter(p => p !== paths[0])[0];
      const calls = []; const realFetch = window.fetch;
      window.fetch = (u, o) => { u = String(u); calls.push({ u, method: (o && o.method) || 'GET', headers: (o && o.headers) || {}, body: o && typeof o.body === 'string' ? o.body : null, blob: o && o.body && o.body.size || 0 });
        if (u.includes('/storage/v1/object/list/')) { const pre = JSON.parse(o.body).prefix; return Promise.resolve(new Response(JSON.stringify(pre.endsWith('/f') ? [{ name: paths[0].slice(2) }] : []), { status: 200 })); }   // the first file already exists
        if (u.includes('texttospeech.googleapis.com')) return Promise.resolve(new Response(JSON.stringify({ audioContent: btoa('abc') }), { status: 200 }));
        if (u.includes('/storage/v1/object/JPY_audio/')) return Promise.resolve(new Response('{}', { status: 200 }));
        return Promise.resolve(new Response('', { status: 404 })); };
      await cloudGenStart('GKEY', 'SKEY'); window.fetch = realFetch;
      const g = Object.assign({}, CLOUD_GEN); const ups = calls.filter(c => c.u.includes('/storage/v1/object/JPY_audio/')); const goog = calls.filter(c => c.u.includes('texttospeech'));
      const leaked = JSON.stringify(state).includes('SKEY') || JSON.stringify(localStorage).includes('SKEY');
      return JSON.stringify({ n: all.length, hasWord, hasEx, male: male ? male.text.slice(0, 8) : null, pinned, g, upN: ups.length, upUrl: ups[0] && ups[0].u, upAuth: ups[0] && ups[0].headers.Authorization, upType: ups[0] && ups[0].headers['Content-Type'], upBlob: ups[0] && ups[0].blob,
        googN: goog.length, googBody: goog[0] && JSON.parse(goog[0].body), zhN, zhPath: paths[paths.length - 1], zhBody: (goog.map(c => JSON.parse(c.body)).find(b2 => b2.input && b2.input.text) || null), expectUrl: ((window.NQ_CONFIG || {}).supabaseUrl) + '/storage/v1/object/JPY_audio/v1/' + firstTodo, uniq: uniq.length, leaked, keyKept: ttsConfig().googleKey }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=120)
    r = json.loads(out[-1])
    assert r['n'] > 8000 and r['hasWord'] and r['hasEx'] and r['male'] and r['pinned'] > 500, r
    assert r['g']['phase'] == '完成' and r['g']['total'] == r['uniq'] and r['g']['skipped'] == 1 and r['g']['done'] == r['uniq'] - 1 and r['g']['failed'] == 0, r
    assert r['upN'] == r['uniq'] - 1 and r['googN'] == r['uniq'] - 1 and r['upUrl'] == r['expectUrl'] and r['upAuth'] == 'Bearer SKEY' and r['upType'] == 'audio/mpeg' and r['upBlob'] == 3, r
    assert r['googBody']['audioConfig']['speakingRate'] == 1 and r['googBody']['input']['ssml'].startswith('<speak>'), r
    assert r['zhN'] > 5000 and r['zhPath'].startswith('zh/') and r['zhBody'] and r['zhBody']['voice']['languageCode'] == 'cmn-TW' and r['zhBody']['input']['text'], r   # Chinese: plain text, Taiwanese Mandarin voice
    assert not r['leaked'] and r['keyKept'] != 'GKEY', r   # the keys live only in the run

def test_cloud_audio_is_the_default_engine_with_an_admin_generator_section(b):
    js = """(async () => { const fresh = (() => { const keep = state.ttsConfig; state.ttsConfig = null; const e = ttsConfig().engine; state.ttsConfig = keep; return e; })();
      const moved = (() => { const keep = state.ttsConfig; state.ttsConfig = { engine: 'browser_neural' }; const e = ttsConfig().engine; state.ttsConfig = keep; return e; })();
      const stays = (() => { const keep = state.ttsConfig; state.ttsConfig = { engine: 'google_tts', googleKey: 'K' }; const e = ttsConfig().engine; state.ttsConfig = keep; return e; })();
      const chosen = (() => { const keep = state.ttsConfig; state.ttsConfig = { engine: 'browser_neural', cloudDefault: true }; const e = ttsConfig().engine; state.ttsConfig = keep; return e; })();
      ttsConfig().engine = 'cloud'; const html = settingsSpeech(); const sw = await (await fetch('./sw.js')).text();
      return JSON.stringify({ fresh, moved, stays, chosen, admin: /管理者：生成雲端音檔/.test(html), inputs: /id="cloudGoogleKey"/.test(html) && /id="cloudSecretKey"/.test(html) && /data-act="cloud-gen-start"/.test(html),
        option: /<option value="cloud"/.test(html), available: speechAvailable(), swAudio: /nq-audio/.test(sw) && /JPY_audio/.test(sw) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=30)
    r = json.loads(out[-1])
    assert r['fresh'] == 'cloud' and r['moved'] == 'cloud' and r['stays'] == 'google_tts' and r['chosen'] == 'browser_neural', r
    assert r['admin'] and r['inputs'] and r['option'] and r['available'] and r['swAudio'], r

def test_download_all_puts_every_clip_in_the_audio_cache_and_skips_what_is_there(b):
    js = """(async () => { const all = cloudAudioTexts(); const sample = all.slice(0, 5); cloudAudioTexts = () => sample;
      const base = cloudAudioBase(); await caches.delete('nq-audio'); const realFetch = window.fetch; let calls = 0;
      window.fetch = (u) => { calls++; return Promise.resolve(new Response(new Blob([new Uint8Array([9, 9])], { type: 'audio/mpeg' }), { status: 200 })); };
      await cloudDownloadAll(); const first = Object.assign({}, CLOUD_DL); const c1 = calls;
      const cache = await caches.open('nq-audio'); const keys = (await cache.keys()).map(r => r.url); const paths = await Promise.all(sample.map(x => cloudAudioPath(x.text, x.gender, x.reading ? { reading: x.reading } : {})));
      await cloudDownloadAll(); const second = Object.assign({}, CLOUD_DL); const c2 = calls - c1;
      const zhSample = all.filter(x => x.lang === 'zh').slice(0, 3); cloudAudioTexts = () => sample.concat(zhSample); calls = 0; await caches.delete('nq-audio');
      await cloudDownloadAll('zh'); const zh = Object.assign({}, CLOUD_DL); const zhCalls = calls;
      window.fetch = realFetch; await caches.delete('nq-audio'); ttsConfig().engine = 'cloud'; const html = settingsSpeech();
      return JSON.stringify({ first, second, c1, c2, keysOk: [...new Set(paths)].every(p => keys.includes(`${base}/${p}`)), nKeys: keys.length, uniq: new Set(paths).size, btn: /data-act="cloud-dl-all" data-kind="ja"/.test(html) && /data-act="cloud-dl-all" data-kind="zh"/.test(html), zh: [zh.kind, zh.total, zh.done, zhCalls] }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=90)
    r = json.loads(out[-1])
    assert r['first']['total'] == r['uniq'] and r['first']['done'] == r['uniq'] and r['first']['have'] == 0 and r['first']['failed'] == 0 and r['c1'] == r['uniq'], r
    assert r['keysOk'] and r['nKeys'] == r['uniq'], r
    assert r['second']['have'] == r['uniq'] and r['second']['done'] == 0 and r['c2'] == 0 and r['btn'], r   # already there: no request
    assert r['zh'] == ['zh', 3, 3, 3], r['zh']   # the Chinese pack fetches only the zh clips

def test_history_card_lives_in_stats_with_day_statistics_and_the_leech_card_is_gone(b):
    seed = """(() => { const t = todayStr(); const y = addDays(t, -1); const old = addDays(t, -3);
      state.dailyLogs[y] = { date: y, vocabCount: 3, grammarCount: 2, quizCount: 1, bonusCount: 0, kV: 3, kG: 2, kL: 1, ok: 5, ng: 1, units: ['格助詞'], topics: ['單字「犬」'], mistakeTopics: ['x'] };
      state.dailyLogs[old] = { date: old, vocabCount: 4, grammarCount: 0, quizCount: 0, bonusCount: 0 };
      const v = REG.vocab.find(x => x.builtin); const g = REG.grammar[0];
      state.srs[v.key] = { b: 1, due: t, n: 1, ok: 1, ng: 0, s: 1, d: 5, last: y, intro: y };
      state.srs[g.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: y, intro: addDays(t, -20), lrn: y };
      saveState(); window.__y = y; window.__old = old; return 'ok'; })()"""
    probe = """(() => { const v = document.getElementById('view'); const txt = v.textContent;
      const cards = [...v.querySelectorAll(':scope > .card, :scope > .grid')]; const hist = cards.find(c => /學習紀錄/.test(c.textContent));
      const idx = cards.indexOf(hist); const tiles = cards.findIndex(c => c.classList.contains('grid-4'));
      const cell = hist && hist.querySelector(`[data-act=heat-day][data-date="${__y}"]`); if (cell) ACTIONS['heat-day'](cell);
      const info = (document.getElementById('heatInfo') || {}).textContent || ''; const recent = hist ? hist.querySelector('details').textContent.replace(/\\s+/g, ' ') : '';
      return JSON.stringify({ hist: !!hist, idx, tiles, info, recent, leech: /常錯的題目/.test(txt), leechBtn: !!v.querySelector('[data-act=stats-leech-practice]') }); })()"""
    today = """(() => { location.hash = '#/today'; route(); const v = document.getElementById('view'); return JSON.stringify({ card: /學習紀錄/.test(v.textContent), heat: !!v.querySelector('.heat') }); })()"""
    record = """(() => { const t = todayStr(); delete state.dailyLogs[t]; recordAction('v', null, 'k'); recordAction('q', null, 'l'); recordAction('q', null, 'm'); recordAccuracy(true); recordAccuracy(false);
      const before = unitById(state.currentUnit).short; ACTIONS['advance-unit'](); const e = state.dailyLogs[t];
      return JSON.stringify({ kK: e.kK, kL: e.kL, kX: e.kX, ok: e.ok, ng: e.ng, units: e.units, before, text: dayStatsText(t) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL + "#/stats"), ("eval", probe), ("eval", today), ("eval", record)], timeout=60)
    r = json.loads(out[-3]); r2 = json.loads(out[-2]); r3 = json.loads(out[-1])
    assert r['hist'] and r['tiles'] >= 0 and r['idx'] == r['tiles'] + 1, r   # right after the number tiles
    assert r['info'].endswith('6 題（單字 3・文法 2・聽力 1）・新學 1・升到熟悉 1・正確率 83%・完成單元：格助詞'), r['info']
    assert '4 題（單字 4）・新學 0・升到熟悉 0' in r['recent'] and '犬' not in r['recent'] and '錯：' not in r['recent'], r['recent']
    assert not r['leech'] and not r['leechBtn'], r
    assert not r2['card'] and not r2['heat'], r2
    assert r3['kK'] == 1 and r3['kL'] == 1 and r3['kX'] == 1 and r3['ok'] == 1 and r3['ng'] == 1 and r3['units'] == [r3['before']], r3
    assert r3['text'].startswith('3 題（漢字 1・聽力 1・模擬考・其他 1）') and '正確率 50%' in r3['text'] and r3['before'] in r3['text'], r3['text']

def test_phone_layout_hooks_next_button_strip_ring_help_and_key_hints(b):
    js = """(() => { location.hash = '#/today'; route(); const hero = document.querySelector('.hero');
      const help = hero.querySelector('.hero-panel[data-panel=help]'); const ring = hero.querySelector('.ring');
      state.lastBackup = null; state.backupSnoozeUntil = null; [1, 2, 3].forEach(i => { state.dailyLogs[addDays(todayStr(), -i)] = { vocabCount: 5 }; }); const banner = backupBannerHtml();   // the reminder waits for three days of use
      startSession('daily', {}); route(); let n = 0; while (n++ < 20) { const e = currentEntry(); if (e.preview && !e.previewDone) { dismissPreview(); continue; } if (e.q && !e.q.custom) break; nextQuestion(); }
      const before = { hint: !!document.querySelector('.pr-actions .kbd-hint'), next: !!document.querySelector('.pr-next') };
      answerCurrent(currentEntry().q.answer);
      const after = { nextInStrip: !!document.querySelector('.pr-next > #btnNext'), stickyClass: !!document.querySelector('.pr-next-sticky'), tools: !!document.querySelector('.pr-actions [data-act=replay]'), enterHint: !!document.querySelector('#btnNext .kbd-hint'), hint: !!document.querySelector('.pr-actions .kbd-hint') };
      SESSION = null; document.body.classList.remove('practicing');
      location.hash = '#/stats'; route(); const th = [...document.querySelectorAll('th.col-left')].length; const td = [...document.querySelectorAll('td.col-left')].length;
      const css = document.querySelector('style').textContent;
      return JSON.stringify({ help: !!help, helpText: help ? help.textContent : '', ring: !!ring, banner, before, after, th, td, hover: /hover: none/.test(css) && /kbd-hint/.test(css), ringCss: /\\.hero-center > \\.ring \\{[^}]*order: -1/.test(css) && !/\\.hero \\.ring \\{[^}]*display: none/.test(css) && hero.classList.contains('hero-center'), safeTop: /body\\.practicing \\.content \\{[^}]*padding-top: calc\\(18px \\+ env\\(safe-area-inset-top/.test(css), noZoom: /maximum-scale=1/.test(document.querySelector('meta[name=viewport]').content) && /user-scalable=no/.test(document.querySelector('meta[name=viewport]').content) && /html \\{ touch-action: manipulation; overscroll-behavior: none/.test(css), noTail: /body\\.practicing \\.content \\{ padding-bottom: calc\\(12px \\+ env\\(safe-area-inset-bottom/.test(css) && /body\\.practicing \\.content:has\\(\\.pr-next\\) \\{ padding-bottom: 0/.test(css) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['help'] and '換個方式再考一次' in r['helpText'] and r['ring'], r
    assert 'compact' in r['banner'] and '稍後' in r['banner'] and 'backup-now' in r['banner'], r['banner']
    assert r['before'] == {'hint': True, 'next': False}, r['before']
    assert r['after'] == {'nextInStrip': True, 'stickyClass': False, 'tools': True, 'enterHint': True, 'hint': False}, r['after']
    assert r['th'] == 1 and r['td'] >= 3 and r['hover'] and r['ringCss'] and r['safeTop'] and r['noZoom'] and r['noTail'], r   # practice hides the topbar, so its content clears the notch itself

def test_unit_legend_chips_exam_subject_rows_and_setting_hints(b):
    js = """(() => { location.hash = '#/today'; route(); const legs = [...document.querySelectorAll('.legs .leg')].map(x => x.textContent.trim());
      location.hash = '#/exam'; route(); const subj = [...document.querySelectorAll('.exSubj')].map(x => x.closest('div').className);
      const css = document.querySelector('style').textContent;
      return JSON.stringify({ legs, subj, nowrap: /\\.leg \\{[^}]*nowrap/.test(css), hint: /\\.setting-row \\.hint \\{[^}]*11\\.5px/.test(css) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=30)
    r = json.loads(out[-1])
    assert len(r['legs']) >= 4 and r['legs'][0].startswith('熟練') and r['legs'][3].startswith('共 ') and r['legs'][3].endswith(' 題'), r['legs']
    assert r['subj'] == ['mt-2', 'mt-2', 'mt-2'] and r['nowrap'] and r['hint'], r

def test_hero_help_and_scope_toggles_open_one_at_a_time(b):
    js = """(() => { heroTab = null; location.hash = '#/today'; route(); const hero = document.querySelector('.hero');
      const st = () => ({ help: !hero.querySelector('[data-panel=help]').hidden, scope: !hero.querySelector('[data-panel=scope]').hidden, open: [...hero.querySelectorAll('.hero-tab.open')].map(b => b.dataset.tab) });
      const tab = (k) => ACTIONS['hero-tab'](hero.querySelector(`.hero-tab[data-tab=${k}]`));
      const s0 = st(); tab('help'); const s1 = st(); tab('scope'); const s2 = st(); tab('scope'); const s3 = st();
      tab('help'); route(); const s4 = (() => { const h = document.querySelector('.hero'); return { help: !h.querySelector('[data-panel=help]').hidden, scope: !h.querySelector('[data-panel=scope]').hidden }; })();
      const scopeText = document.querySelector('[data-panel=scope]').textContent.replace(/\\s+/g, ' '); const noteOutside = !document.querySelector('.hero-panel .plan-note');
      const outside = [...document.querySelector('.hero').children[0].children].filter(x => !x.classList.contains('hero-panel') && !x.classList.contains('hero-tabs')).map(x => x.textContent.replace(/\\s+/g, ' ').trim());
      heroTab = null; return JSON.stringify({ s0, s1, s2, s3, s4, scopeText: /單字主題/.test(scopeText) && /待複習 \\d+/.test(scopeText) && /共 \\d+ 題/.test(scopeText) && /做完還有 \\d+ 題/.test(scopeText), noteOutside, outside }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=30)
    r = json.loads(out[-1])
    assert r['s0'] == {'help': False, 'scope': False, 'open': []}, r['s0']
    assert r['s1'] == {'help': True, 'scope': False, 'open': ['help']} and r['s2'] == {'help': False, 'scope': True, 'open': ['scope']}, r
    assert r['s3'] == {'help': False, 'scope': False, 'open': []} and r['s4'] == {'help': True, 'scope': False}, r   # the choice survives a re-render
    assert r['scopeText'] and r['noteOutside'], r
    assert not any(('待複習' in x or '做完還有' in x) for x in r['outside']) and any(x.startswith('開始練習・') for x in r['outside']), r['outside']   # folded: title, toggles, button

def test_mistake_category_chips_fold_and_the_listen_player_reads_the_notebook_in_a_loop(b):
    seed = """(() => { const t = todayStr(); const vs = REG.vocab.filter(v => v.builtin && v.ex && v.exZh).slice(0, 2); const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.op && x.zh && splitBlank(x.jp));
      state.mistakes = [];
      vs.forEach((v, i) => state.mistakes.push({ id: 'lv' + i, key: v.key, cat: '單字', prompt: '「' + v.m + '」的日文', answer: jaPlain(v.w), wrong: 'x', why: '', count: 3 - i, streak: 0, mastered: false, date: t, last: t }));
      const bg = splitBlank(g.jp); state.mistakes.push({ id: 'lg', key: g.key, cat: g.pt || '文法', prompt: g.jp, answer: parenReadingToBracket(g.a), wrong: 'x', why: '', count: 1, streak: 0, mastered: false, date: t, last: t });
      saveState(); window.__vs = vs.map(v => [ttsText(jaPlain(v.w)), v.m, ttsText(exPlain(v.ex)), v.exZh]); window.__g = { s: ttsText(bg.pre + parenReadingToBracket(g.a) + bg.post), zh: g.zh }; return 'ok'; })()"""
    page = """(() => { location.hash = '#/mistakes'; route(); const v = document.getElementById('view'); const d = v.querySelector('details.cat-filter');
      location.hash = '#/mistakes?c=%E5%96%AE%E5%AD%97'; route(); const d2 = document.querySelector('details.cat-filter');
      return JSON.stringify({ has: !!d, open: d ? d.open : null, sum: d ? d.querySelector('summary').textContent.trim() : '', chips: d ? d.querySelectorAll('.chip').length : 0, sum2: d2 ? d2.querySelector('summary').textContent.trim() : '', clear: !!(d2 && d2.querySelector('summary [data-act=nav]')), btn: !!document.querySelector('[data-act=listen-start]') }); })()"""
    play = """(async () => { speechSynthesis.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP', voiceURI: 'kyoko', localService: true }, { name: 'Meijia', lang: 'zh-TW', voiceURI: 'mj', localService: true }];
      const zhCalls = []; const realFetch = window.fetch; window.fetch = (u, o) => { u = String(u); if (u.includes('/JPY_audio/v1/zh/')) { zhCalls.push(u); return Promise.resolve(new Response(new Blob([new Uint8Array([1])], { type: 'audio/mpeg' }), { status: 200 })); } return Promise.resolve(new Response('', { status: 404 })); };
      ttsConfig().engine = 'cloud'; const zhPath = await cloudAudioPath('今天', '', { lang: 'zh' }); await speakZh('今天'); window.fetch = realFetch; ttsConfig().engine = 'browser_neural';
      const zhCloud = zhCalls.length === 1 && zhCalls[0].endsWith('/' + zhPath) && __tts.log.some(x => x === 'start:今天');
      speechSynthesis.getVoices = () => [{ name: 'Kyoko', lang: 'ja-JP', voiceURI: 'kyoko', localService: true }, { name: 'Meijia', lang: 'zh-TW', voiceURI: 'mj', localService: true }];
      LISTEN_GAP.short = 30; LISTEN_GAP.long = 30; __tts.log.length = 0;
      ACTIONS['listen-start']({ dataset: { cat: '' } }); route();
      const defaults = { scope: LISTEN.scope, order: LISTEN.order, zh: LISTEN.zh, twice: LISTEN.twice, kinds: [...new Set(LISTEN.items.map(e => e.kind))] };
      listenSet('scope', 'all'); listenSet('order', 'count'); __tts.log.length = 0;   // a fixed order for the sequence check below
      const items0 = LISTEN.items.map(e => e.kind); const hash = location.hash; const svgBtns = ['listen-prev', 'listen-toggle', 'listen-next'].every(a => !!document.querySelector(`[data-act=${a}] svg`)) && !/[\\u23EE\\u23ED\\u25B6\\u275A]/.test(document.querySelector('.listen-ctl').textContent);
      const until = (f, ms) => new Promise(res => { const t0 = Date.now(); const tick = () => { if (f() || Date.now() - t0 > ms) res(f()); else setTimeout(tick, 40); }; tick(); });
      const reached = await until(() => __tts.log.filter(x => x.startsWith('start:')).length >= 13, 25000);   // two words (5 each with 兩次: word, meaning, word, example, its Chinese) and the sentence (3)
      const log = __tts.log.filter(x => x.startsWith('start:')).map(x => x.slice(6)).slice(0, 13);
      const card = document.getElementById('listenCard').textContent.replace(/\\s+/g, ' ');
      listenPause(); const paused = !LISTEN.playing; const n1 = __tts.log.length; await sleep(300); const quiet = __tts.log.filter(x => x.startsWith('start:')).length === log.length;
      const opts = () => [...document.querySelectorAll('.listen-opts .lopt')].map(b => b.dataset.key + ':' + b.dataset.value + (b.classList.contains('on') ? '*' : '')); const o0 = opts();
      ACTIONS['listen-cycle']({ dataset: { key: 'scope' } }); const o1 = opts(); const scoped = LISTEN.items.map(e => e.kind); ACTIONS['listen-cycle']({ dataset: { key: 'scope' } }); const o2 = opts();
      const zhOff = LISTEN.zh; const o3 = [...document.querySelectorAll('.listen-opts .lopt')].every(b => b.querySelector('svg') || /^[12]$/.test(b.textContent.trim()) || (b.classList.contains('lopt-scope') && b.textContent.replace(/\\s+/g, '') === '字文' && b.querySelectorAll('span.on').length === 1)); const oneRow = (() => { const r = [...document.querySelectorAll('.listen-opts .lopt')].map(b => b.getBoundingClientRect().top); return Math.max(...r) - Math.min(...r) < 2; })();
      const transport = !!document.querySelector('.listen-ctl .lplay svg') && document.querySelectorAll('.listen-ctl .lbtn svg').length === 2;
      ACTIONS['listen-cycle']({ dataset: { key: 'twice' } }); const once = [LISTEN.twice, opts()[2]];
      const rates = []; for (let i = 0; i < 4; i++) { rates.push([LISTEN.rate, opts()[3], speechRate()]); ACTIONS['listen-cycle']({ dataset: { key: 'rate' } }); } const ratePref = JSON.parse(localStorage.getItem('nq_listen_pref') || '{}').rate; const idleRate = (listenPause(), speechRate()); listenSet('rate', 1);
      const ctlTop = () => document.querySelector('.listen-ctl').getBoundingClientRect().top; const topG = ctlTop(); listenSet('scope', 'v'); const topV = ctlTop(); const steady = Math.abs(topG - topV) < 1;   // a word card and a sentence card: the controls stay put
      location.hash = '#/mistakes'; route(); const gone = LISTEN === null;
      return JSON.stringify({ rates, ratePref, idleRate, steady, defaults, items0, hash, reached, log, card, paused, quiet, scoped, zhOff, gone, svgBtns, zhCloud, o0, o1, o2, o3, once, oneRow, transport, gaps: [LISTEN_GAP.short, LISTEN_GAP.long], vs: __vs, g: __g }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("eval", page), ("eval", FAKE_TTS), ("eval", play)], timeout=90)
    r = json.loads(out[-3]); p = json.loads(out[-1])
    assert r['has'] and r['open'] is False and r['sum'].startswith('分類篩選（') and r['chips'] >= 2 and r['sum2'].startswith('分類：單字') and r['clear'] and r['btn'], r
    assert p['items0'] == ['v', 'v', 'g'] and p['hash'] == '#/mistakes/listen' and p['reached'] and p['svgBtns'], p   # SVG icons, never emoji-prone characters
    (w0, m0, e0, z0), (w1, m1, e1, z1) = p['vs']
    assert p['log'] == [w0, m0, w0, e0, z0, w1, m1, w1, e1, z1, p['g']['s'], p['g']['zh'], p['g']['s']], p['log']   # 兩次: word → meaning → word → example → its Chinese; sentence → translation → sentence
    assert p['defaults'] == {'scope': 'v', 'order': 'random', 'zh': True, 'twice': True, 'kinds': ['v']}, p['defaults']
    assert '文法' in p['card'] and p['paused'] and p['quiet'] and p['scoped'] == ['g'] and p['zhOff'] is True and p['gone'], p
    assert p['zhCloud'], p   # Chinese: the zh/ clip is asked for first; when it cannot play, the device voice reads it
    assert p['o0'] == ['scope:v', 'order:count', 'twice:2*', 'rate:1'] and p['o1'] == ['scope:g', 'order:count', 'twice:2*', 'rate:1'] and p['o2'] == ['scope:v', 'order:count', 'twice:2*', 'rate:1'] and p['o3'], p   # icons only; words or grammar, never both; no Chinese switch
    assert p['rates'] == [[1, 'rate:1', 1], [1.3, 'rate:1.3*', 1], [0.8, 'rate:0.8*', 1], [1, 'rate:1', 1]] and p['ratePref'] == 1.3 and p['idleRate'] == 1, p   # four taps end on 1.3; paused here, so the setting's rate stays in force; the choice is remembered
    assert p['once'] == [False, 'twice:1'] and p['steady'], p
    assert p['oneRow'] and p['transport'], p

def test_listen_reads_order_items_as_whole_sentences_and_skips_listening_and_reading(b):
    js = """(() => { const t = todayStr(); const g = REG.grammar.find(x => Array.isArray(x.parts) && x.parts.length === 4 && x.zh); const l = REG.listen[0]; const r = REG.read[0]; const v = REG.vocab.find(x => x.builtin);
      const parts = g.parts.map(parenReadingToBracket); const star = `${g.pre || ''}${parts.map((p, i) => i === g.star ? '★' : '＿').join(' ')}${g.post || ''}`;
      state.mistakes = [
        { id: 'x1', key: g.key, cat: g.pt || '文法', prompt: star, answer: parts[g.star], count: 1, mastered: false, date: t, last: t },                      // from the mock exam (★ form)
        { id: 'x2', key: g.key, cat: g.pt || '文法', prompt: `排序：${g.pre || ''}＿＿＿＿${g.post || ''}（${parts.join('・')}）`, answer: parts.join(''), count: 1, mastered: false, date: t, last: t },   // from practice
        { id: 'x3', key: l.key, cat: '聽力', prompt: `【聽力】${l.q || l.line || ''}`, answer: jaPlain(l.a), count: 1, mastered: false, date: t, last: t },
        { id: 'x4', key: r.key, cat: '閱讀', prompt: `【閱讀】${r.q}`, answer: jaPlain(r.a), count: 1, mastered: false, date: t, last: t },
        { id: 'x5', key: '', cat: '聽力', prompt: '【情境】駅で', answer: 'x', count: 1, mastered: false, date: t, last: t },
        { id: 'x6', key: v.key, cat: '單字', prompt: '「' + v.m + '」的日文', answer: jaPlain(v.w), count: 1, mastered: false, date: t, last: t }];
      saveState(); startListen(); listenPause(); listenSet('scope', 'all');
      const ids = LISTEN.items.map(e => e.id).sort(); const es = LISTEN.items.filter(e => e.kind === 'g');
      const html = es.map(e => e.html); const want = (g.pre || '') + parts.join('') + (g.post || '');
      const out = { ids, sentences: es.map(e => e.sentence), want, marked: html.every(h => h.includes('fill-ans')), noBlank: html.every(h => !/[＿★]/.test(h)), zh: es.every(e => e.zh === g.zh), starPiece: parts[g.star] };
      listenStop(true); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['ids'] == ['x1', 'x2', 'x6'], r['ids']   # listening and reading (linked or not) stay out
    assert r['sentences'] == [r['want'], r['want']] and r['marked'] and r['noBlank'] and r['zh'], r

def test_today_notebook_card_is_the_listen_player(b):
    js = """(() => { const t = todayStr(); const v = REG.vocab.find(x => x.builtin); state.mistakes = [{ id: 'tp1', key: v.key, cat: '單字', prompt: '「' + v.m + '」的日文', answer: jaPlain(v.w), count: 2, mastered: false, date: t, last: t }]; saveState();
      LISTEN = null; location.hash = '#/today'; route(); const view = document.getElementById('view'); localStorage.removeItem('nq_listen_pref'); const onPractice = !view.querySelector('.card.listen') && !!view.querySelector('.today-seg [data-tab=practice][aria-pressed=true]') && !!view.querySelector('.hero-center');
      ACTIONS['today-tab']({ dataset: { tab: 'mistakes' } }); const card = view.querySelector('.card.listen');
      // the player was first built over an empty notebook (page load), then words arrived: it must open on words, not on the empty-side flip
      const scopeAfterRefill = (() => { LISTEN = null; const keepM = state.mistakes; state.mistakes = []; listenInit(); state.mistakes = keepM; listenInit(); return LISTEN.scope; })(); route();
      const a = { player: !!card.querySelector('.lplay'), pills: card.querySelectorAll('.lopt').length, link: !card.querySelector('.listen-head [data-route="#/mistakes"]') && /錯題本 1/.test(card.querySelector('.seg').textContent), icon: !!card.querySelector('.listen-head .listen-icon svg') && !/聽一輪/.test(card.textContent), oldBtn: !!view.querySelector('[data-act=start-mistakes]'), compact: card.classList.contains('compact'), paused: LISTEN && !LISTEN.playing, count: (card.querySelector('#listenCount') || {}).textContent, word: /\\S/.test((card.querySelector('#listenCard') || {}).textContent || ''), grid3: !!view.querySelector('.grid-3') };
      ACTIONS['listen-cycle']({ dataset: { key: 'twice' } }); const stays = location.hash === '#/today' && !!document.querySelector('.card.listen.compact') && !document.querySelector('[data-act=listen-exit]') && document.querySelector('[data-key=twice]').dataset.value === '1';
      // switch the card to a word theme: every entry is a word of that theme, no scope pill, the theme select shows
      ACTIONS['listen-source']({ dataset: { source: 'theme' } }); const c2 = document.querySelector('.card.listen'); const theme = LISTEN.source.theme; const n = listenThemeWords(theme).length;
      const th = { kind: LISTEN.source.kind, all: LISTEN.all.length === n && n > 0 && LISTEN.all.every(e => e.kind === 'v' && !e.m), select: !!c2.querySelector('.listen-head [data-act=theme-pick] .bar.stack') && c2.querySelector('.listen-head .tp-name').textContent === theme, scopePill: !!c2.querySelector('[data-key=scope]'), link: !c2.querySelector('[data-route="#/vocab/themes"]'), label: !/單字・/.test(c2.querySelector('#listenCard').textContent) };
      ACTIONS['theme-pick'](); const rows = [...document.querySelectorAll('.modal .theme-row')]; const pickerOk = rows.length === listenThemes().length && rows[0].dataset.theme === '初識單詞' && rows.every(r => r.querySelector('.bar.stack')) && document.querySelector('.modal .theme-row.on').dataset.theme === theme;
      const other = vocabThemes().map(g => g.c).find(x => x !== theme); ACTIONS['listen-theme-pick']({ dataset: { theme: other } }); const switched = LISTEN.source.theme === other && JSON.parse(localStorage.getItem('nq_listen_pref')).theme === other && !document.querySelector('.modal') && document.querySelector('.listen-head .tp-name').textContent === other;
      ACTIONS['listen-source']({ dataset: { source: 'mistakes' } }); const backToNotes = LISTEN.source.kind === 'mistakes';
      location.hash = '#/stats'; route(); const stopped = LISTEN === null;
      state.mistakes = []; saveState(); location.hash = '#/today'; route(); const backOnPractice = todayTab === 'practice' && !document.querySelector('.card.listen'); ACTIONS['today-tab']({ dataset: { tab: 'mistakes' } }); const empty = /目前沒有可以聽的錯題/.test(document.getElementById('view').textContent) && !document.querySelector('.lplay');
      localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ a, onPractice, backOnPractice, scopeAfterRefill, stays, th, pickerOk, switched, backToNotes, stopped, empty }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['a'] == {'player': True, 'pills': 4, 'link': True, 'icon': True, 'oldBtn': False, 'compact': True, 'paused': True, 'count': '1 / 1・第 1 輪', 'word': True, 'grid3': False}, r['a']
    assert r['stays'] and r['scopeAfterRefill'] == 'v', r   # a pill on the Today card re-renders the card, never the standalone page
    assert r['th'] == {'kind': 'theme', 'all': True, 'select': True, 'scopePill': False, 'link': True, 'label': True} and r['pickerOk'] and r['switched'] and r['backToNotes'], r
    assert r['stopped'] and r['empty'] and r['onPractice'] and r['backOnPractice'], r

def test_vocab_theme_card_plays_the_theme(b):
    js = """(() => { location.hash = '#/vocab/themes'; route(); const btn = document.querySelector('.theme-card [data-act=listen-theme-start]'); const theme = btn.dataset.theme;
      ACTIONS['listen-theme-start'](btn); route(); listenPause(); const n = REG.vocab.filter(x => x.builtin && vocabTheme(x) === theme).length;
      const r = { hash: location.hash, kind: LISTEN.source.kind, theme: LISTEN.source.theme === theme, n: LISTEN.all.length === n, page: !!document.querySelector('.card.listen .lplay'), noScope: !document.querySelector('[data-key=scope]'), pref: JSON.parse(localStorage.getItem('nq_listen_pref')) };
      listenStop(); r.back = location.hash; localStorage.removeItem('nq_listen_pref'); return JSON.stringify(r); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['hash'] == '#/vocab/listen' and r['kind'] == 'theme' and r['theme'] and r['n'] and r['page'] and r['noScope'], r
    assert r['pref']['source'] == 'theme' and r['back'] == '#/vocab/themes', r

def test_today_offers_the_exam_pace_quotas_when_behind(b):
    js = """(() => { state.settings.examDate = addDays(todayStr(), 121); Object.assign(state.settings, { newVocabPerDay: 1, newGrammarPerDay: 1 }); saveState();
      location.hash = '#/exam'; route(); const el = document.querySelector('.hero-advice, [data-act=apply-advice]'); const btn = document.querySelector('.card [data-act=apply-advice]');
      const text = el ? el.closest('.card').textContent : ''; const a = planAdvice(); const onExam = /考試倒數/.test(document.getElementById('view').textContent);
      ACTIONS['apply-advice'](); location.hash = '#/exam'; route(); const after = !!document.querySelector('[data-act=apply-advice]');
      location.hash = '#/today'; route(); const offToday = !/考試倒數/.test(document.getElementById('view').textContent);
      return JSON.stringify({ shown: !!btn, arrow: /1→\\d+/.test(text), rec: [state.settings.newVocabPerDay, state.settings.newGrammarPerDay], exp: [a.rec.newVocabPerDay, a.rec.newGrammarPerDay], after, onExam, offToday }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['shown'] and r['arrow'] and r['rec'] == r['exp'] and not r['after'] and r['onExam'] and r['offToday'], r   # the countdown lives on 模擬考 now

def test_requeue_uses_another_format_when_the_item_has_one(b):
    js = """(() => { const out = {};
      const v = REG.vocab.find(x => x.builtin && !state.srs[x.key] && x.exZh && /[一-龯]/.test(x.w) && meaningOptions(x) && recallOptions(x));   // formats open up once the word has a record
      const g = REG.grammar.find(x => !state.srs[x.key] && (x.t || 'choice') === 'choice' && x.zh && grammarMeaningDistractors(x));
      for (const [kind, it] of [['v', v], ['g', g]]) {
        const fill = REG.grammar.filter(x => !state.srs[x.key] && x !== it && x !== g).slice(0, 8);
        startSession('items', { items: [it, ...fill] }); let e = currentEntry(); e.previewDone = true; const f0 = e.q.fmt;
        answerCurrent((e.q.answer + 1) % e.q.options.length);
        while (!(currentEntry() || {}).requeued) { nextQuestion(); const c = currentEntry(); if (!c) break; if (!c.requeued) { c.previewDone = true; answerCurrent(c.q.answer); } }
        e = currentEntry(); out[kind] = { f0, f1: e.q.fmt, sameItem: e.q.key === it.key };
        SESSION = null; document.body.classList.remove('practicing');
      }
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    for k in ('v', 'g'):
        assert r[k]['sameItem'] and r[k]['f1'] != r[k]['f0'], r

def test_new_grammar_gets_one_encore_in_another_format_only_when_answered_right(b):
    js = """(() => { const t = todayStr(); const gs = REG.grammar.filter(x => !state.srs[x.key] && (x.t || 'choice') === 'choice' && x.zh && grammarMeaningDistractors(x));
      const run = (ok) => { const g = gs.shift(); const fill = REG.grammar.filter(x => !state.srs[x.key] && !gs.includes(x) && x !== g).slice(0, 14);
        const est = encoreEstimate([g]); startSession('items', { items: [g, ...fill] }); const e = currentEntry(); e.previewDone = true; const f0 = e.q.fmt;
        answerCurrent(ok ? e.q.answer : (e.q.answer + 1) % e.q.options.length);
        const pos = SESSION.entries.map((x, i) => x.encore && x.item.key === g.key ? i : -1).filter(i => i >= 0);
        let f1 = null; if (pos.length) { prepareEntry(pos[0]); f1 = SESSION.entries[pos[0]].q ? SESSION.entries[pos[0]].q.fmt : 'dropped'; }
        const n = state.srs[g.key].n; SESSION = null; document.body.classList.remove('practicing'); return { est, enc: pos.length, pos: pos[0], f0, f1, n }; };
      return JSON.stringify({ ok: run(true), miss: run(false) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['ok']['est'] == 1 and r['ok']['enc'] == 1 and 8 <= r['ok']['pos'] <= 11 and r['ok']['f1'] not in (None, 'dropped', r['ok']['f0']) and r['ok']['n'] == 1, r
    assert r['miss']['enc'] == 0, r

# ---- 2026-10-27 (v64): new grammar follows the lesson sections; the unit advances by itself ----
def test_new_grammar_follows_lesson_sections_with_points_rotating(b):
    js = """(() => { const c = newGrammarCandidates('m1'); const secOf = (g) => Number.isInteger(g.sec) && g.sec >= 0 ? g.sec : 999;
      const secs = c.map(secOf); const ordered = secs.every((x, i) => i === 0 || x >= secs[i - 1]);
      const first = c.filter(g => secOf(g) === secs[0]); const pts = new Set(first.map(g => g.pt)); const head = first.slice(0, pts.size).map(g => g.pt);
      const again = newGrammarCandidates('m1').map(g => g.id);
      const easyFirst = first.filter(g => g.pt === head[0]).map(g => g.d || 2); const sorted = easyFirst.every((x, i) => i === 0 || x >= easyFirst[i - 1]);
      return JSON.stringify({ n: c.length, ordered, rotates: new Set(head).size === pts.size, stable: JSON.stringify(again) === JSON.stringify(c.map(g => g.id)), sorted }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = json.loads(out[-1])
    assert r['n'] > 0 and r['ordered'] and r['rotates'] and r['stable'] and r['sorted'], r

def test_unit_advances_when_its_grammar_is_all_introduced(b):
    js = """(() => { const t = todayStr(); const m1 = unitItems('m1'); const m2 = unitItems('m2');
      m1.slice(0, -1).forEach(g => srsAnswer(g.key, true));            // one m1 item still unseen: stay
      const stillM1 = newGrammarCandidates()[0].u === 'm1' && state.currentUnit === 'm1';
      srsAnswer(m1[m1.length - 1].key, true);                            // m1 fully introduced: candidates continue into m2, unit not yet switched
      const next = newGrammarCandidates(); const intoM2 = next.length > 0 && next.every(g => g.u === 'm2') && state.currentUnit === 'm1';
      const firstSec = Number.isInteger(next[0].sec) ? next[0].sec : -1;
      srsAnswer(next[0].key, true);                                      // the first m2 answer moves the unit
      const moved = state.currentUnit === 'm2' && state.completedUnits.includes('m1');
      const reach = REG.listen.some(x => x.u === 'm2') ? listenReachable().some(x => x.u === 'm2') : true;
      return JSON.stringify({ stillM1, intoM2, firstSec, moved, reach, newG: state.today.newG }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=60)
    r = json.loads(out[-1])
    assert r['stillM1'] and r['intoM2'] and r['firstSec'] == 0 and r['moved'] and r['reach'], r

# ---- 2026-10-27: 錯題本 rework — mistakes join the daily mix, leave when the item reaches 熟悉, compact page with filters/sort/groups ----
MIST_SEED = """(() => { const t = todayStr(); const gs = REG.grammar.filter(g => g.u === 'm1'); const far = (g, b) => { state.srs[g.key] = { b, due: addDays(t, 20), n: 14, ok: 12, ng: 2, s: b >= 3 ? 8 : 2, d: 6, last: addDays(t, -2), intro: addDays(t, -9) }; };
  state.mistakes = []; far(gs[0], 1); far(gs[1], 1); far(gs[2], 1);
  const mk = (g, count, daysAgo, cat) => ({ id: uid('mk'), key: g ? g.key : '', cat: cat || '文法', prompt: g ? g.key : 'オリジナル問題 ' + count, answer: g ? 'に' : 'で', wrong: 'で', why: '', count, streak: 0, mastered: false, note: '', date: addDays(t, -daysAgo), last: addDays(t, -daysAgo) });
  state.mistakes.push(mk(gs[0], 5, 1), mk(gs[1], 1, 6), mk(gs[2], 2, 3), mk(null, 3, 2, '單字'));
  saveState(); window.__g = gs.slice(0, 3).map(g => g.key); return 'seeded'; })()"""

def test_mistake_loop_grades_once_per_day(b):
    js = """(() => { const t = todayStr(); const m0 = state.mistakes[0]; const u = state.mistakes[3];   // MIST_SEED: m0 linked (count 5), u unlinked
      location.hash = '#/mistakes'; route(); const entry = document.querySelector('[data-act=mloop-start]'); const label = entry ? entry.textContent : null;
      state.srs[m0.key].rl = 0;   // on the relearning ladder: one 記得 moves it a step, so it stays in the notebook for the later rounds
      ACTIONS['mloop-start'](); const first = MLOOP.queue[0] === m0.id; const n0 = state.srs[m0.key].n;
      ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'good' } }); const n1 = state.srs[m0.key].n; const last1 = state.srs[m0.key].last;
      // the same card in a later round today: no second SRS write, but the notebook still notes the look
      startMistakeLoop([m0.id]); ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'again' } });
      const n2 = state.srs[m0.key].n; const count = m0.count; const due = daysBetween(t, state.srs[m0.key].due);
      // unlinked: 記得 twice the same day stays active
      startMistakeLoop([u.id]); ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'good' } }); startMistakeLoop([u.id]); ACTIONS['mloop-flip'](); ACTIONS['mloop-rate']({ dataset: { g: 'good' } });
      MLOOP.idx = MLOOP.queue.length; MLOOP.again = []; route();
      const w = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w)); const wm = { id: 'x', key: w.key, cat: '單字', prompt: '「' + w.m + '」的日文', answer: jaPlain(w.w) };
      const spoken = mloopSpeakText(wm); const spokenU = mloopSpeakText(u);
      return JSON.stringify({ label, first, n0, n1, last1: last1 === t, n2, count, due, uActive: !u.mastered, done: /這一輪/.test(document.getElementById('view').textContent), spokenIsWord: spoken === (w.r || jaPlain(w.w)), spokenU: spokenU === jaPlain(u.prompt) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", MIST_SEED), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['label'] and '快速過一輪' in r['label'] and r['first'], r
    assert r['n0'] == 14 and r['n1'] == 15 and r['last1'] and r['n2'] == 15 and r['count'] == 6 and r['due'] >= 1, r
    assert r['uActive'] and r['done'] and r['spokenIsWord'] and r['spokenU'], r

def test_a_linked_mistake_leaves_when_its_ladder_is_walked_and_an_unlinked_one_after_two_days(b):
    js = """(() => { const t = todayStr(); const m0 = state.mistakes[0]; const u = state.mistakes[3]; const out = {};
      state.srs[m0.key].rl = 1; onCorrectForMistake({ key: m0.key }); out.linkedStillActive = !m0.mastered;   // still on the relearning ladder
      delete state.srs[m0.key].rl; onCorrectForMistake({ key: m0.key }); out.linkedMastered = m0.mastered;   // ladder walked (or a legacy entry with none): leaves
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

# ---- 2026-10-28: a pill tap keeps the player's place; the example's Chinese is read ----
def test_listen_pills_keep_the_place_and_the_example_chinese_is_read(b):
    js = """(() => { LISTEN = null; setListenPref({ source: 'theme', theme: vocabThemes()[0].c }); location.hash = '#/today'; route(); ACTIONS['today-tab']({ dataset: { tab: 'theme' } });
      LISTEN.idx = 3; const ids = LISTEN.items.map(e => e.id); const paused = { before: LISTEN.idx };
      ACTIONS['listen-cycle']({ dataset: { key: 'twice' } }); paused.after = LISTEN.idx; paused.same = JSON.stringify(LISTEN.items.map(e => e.id)) === JSON.stringify(ids); paused.twice = LISTEN.twice;
      route(); paused.afterRoute = LISTEN.idx;   // a plain page re-render keeps the place too
      const L = LISTEN; listenPlay(); ACTIONS['listen-cycle']({ dataset: { key: 'rate' } }); const playing = { sameObj: LISTEN === L, idx: LISTEN.idx, playing: LISTEN.playing, same: JSON.stringify(LISTEN.items.map(e => e.id)) === JSON.stringify(ids) }; listenPause();
      const other = vocabThemes().map(g => g.c).find(c => c !== LISTEN.source.theme); ACTIONS['listen-theme-pick']({ dataset: { theme: other } }); const rebuilt = LISTEN.source.theme === other && LISTEN.idx === 0 && LISTEN.items.every(e => !ids.includes(e.id));
      // the spoken sequence of a word with an example: word, meaning, word again, example, example's Chinese
      const calls = []; const s0 = speak, z0 = speakZh; speak = (t) => { calls.push(['ja', String(t)]); return Promise.resolve(); }; speakZh = (t) => { calls.push(['zh', String(t)]); return Promise.resolve(); };
      const v = REG.vocab.find(x => x.builtin && vocabExamples(x)[0] && vocabExamples(x)[0].exZh); const e = listenEntryVocab(v, null); LISTEN.twice = true;
      return listenSpeak(e, () => true).then(ok => { speak = s0; speakZh = z0; LISTEN = null; localStorage.removeItem('nq_listen_pref');
        return JSON.stringify({ paused, playing, rebuilt, ok, seq: calls.map(c => c[0]), exZh: calls[4] && calls[4][1] === e.ex.exZh, ex: calls[3] && calls[3][1] === exPlain(e.ex.ex) }); }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['paused'] == {'before': 3, 'after': 3, 'same': True, 'twice': False, 'afterRoute': 3}, r['paused']
    assert r['playing'] == {'sameObj': True, 'idx': 3, 'playing': True, 'same': True}, r['playing']
    assert r['rebuilt'] and r['ok'], r
    assert r['seq'] == ['ja', 'zh', 'ja', 'ja', 'zh'] and r['exZh'] and r['ex'], r

# ---- 2026-10-28: the today page is one card on one phone screen: 練習／錯題本／單字 switch, practice by default ----
def test_today_page_fits_one_phone_screen_with_the_unit_folded_and_the_player_filling_the_rest(b):
    seed = """(() => { const t = todayStr(); state.introSeen = true; state.mistakes = []; state.lastBackup = t;
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 30).forEach(v => { state.srs[v.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      REG.grammar.slice(0, 6).forEach(g => { state.srs[g.key] = { b: 2, due: addDays(t, -1), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(t, -4), intro: addDays(t, -9), f: {} }; });
      localStorage.removeItem('nq_listen_pref'); saveState(); heroTab = null; LISTEN = null; location.hash = '#/vocab'; route(); location.hash = '#/today'; route(); return true; })()"""
    js = """(() => { const view = document.getElementById('view'); const fitsNow = () => ({ scroll: document.documentElement.scrollHeight, viewScroll: view.scrollHeight, viewH: view.clientHeight, inner: innerHeight });
      const cards = view.querySelectorAll('.card').length; const seg = [...view.querySelectorAll('.today-seg button')].map(b => [b.dataset.tab, b.getAttribute('aria-pressed')]);
      const hero = view.querySelector('.hero.hero-center'); const tabs = [...hero.querySelectorAll('.hero-tab')].map(b => b.dataset.tab); const unitTab = hero.querySelector('.hero-tab[data-tab=unit]').textContent;
      const unitOpen = !hero.querySelector('[data-panel=unit]').hidden && hero.querySelector('.hero-tab[data-tab=unit]').classList.contains('open') && hero.querySelector('[data-panel=help]').hidden;   // 目前單元 is open on arrival
      const unitPanelHas = { bar: !!hero.querySelector('[data-panel=unit] .bar.stack'), legs: [...hero.querySelectorAll('[data-panel=unit] .legs .leg')].map(x => x.textContent.trim()), lecture: !!hero.querySelector('[data-panel=unit] [data-route^="#/course/"]'), drill: !!hero.querySelector('[data-panel=unit] [data-act=start-unit]') };
      const ringFirst = hero.querySelector('.ring').getBoundingClientRect().top < hero.querySelector('[data-act=start-daily]').getBoundingClientRect().top;
      const practice = { fit: view.classList.contains('fit') && document.body.classList.contains('today'), ...fitsNow(), ringFirst, noPlayer: !view.querySelector('.lplay') && !view.querySelector('.card.listen'), text: !/今日練習|聽一輪/.test(view.textContent) && /連續 \\d+ 天/.test(hero.textContent) && !view.querySelector('.page-head') };
      ACTIONS['hero-tab'](hero.querySelector('.hero-tab[data-tab=help]')); const opened = !hero.querySelector('[data-panel=help]').hidden && hero.querySelector('[data-panel=unit]').hidden;   // one at a time
      route(); const kept = heroTab === 'help' && !document.querySelector('[data-panel=help]').hidden;   // a re-render inside the page keeps the choice
      // 單字: the same card becomes the player and takes the rest of the screen; the count sits at the card's bottom right, clear of the pills
      ACTIONS['today-tab']({ dataset: { tab: 'theme' } }); const listen = view.querySelector('.card.today-card.listen.compact'); const cardH = listen.querySelector('#listenCard').getBoundingClientRect().height;
      const opts = listen.querySelector('.listen-opts').getBoundingClientRect(); const nav = document.querySelector('.bottomnav').getBoundingClientRect();
      const countBox = listen.querySelector('.listen-opts #listenCount.listen-count'); const cr = countBox.getBoundingClientRect(); const lr = listen.getBoundingClientRect(); const pills = [...listen.querySelectorAll('.lopt')].map(x => x.getBoundingClientRect());
      const countAtBottomRight = /第 \\d+ 輪/.test(countBox.textContent) && Math.abs(cr.right - (lr.right - 18)) <= 2 && cr.bottom <= lr.bottom - 10 && cr.bottom >= lr.bottom - 60 && pills.every(p => p.right <= cr.left);
      const flush = Math.abs(listen.querySelector('.listen-head .listen-full').getBoundingClientRect().right - listen.querySelector('.today-seg').getBoundingClientRect().right) <= 1 && listen.querySelector('.listen-head .theme-pick').getBoundingClientRect().right < listen.querySelector('.listen-head .listen-full').getBoundingClientRect().left && Math.abs(listen.querySelector('.listen-icon').getBoundingClientRect().left - listen.querySelector('.today-seg').getBoundingClientRect().left) <= 1;
      const player = { ...fitsNow(), flush, cards: view.querySelectorAll('.card').length, one: view.querySelectorAll('.today-seg').length === 1 && !view.querySelector('.hero'), pressed: view.querySelector('.today-seg [aria-pressed=true]').dataset.tab, select: !!listen.querySelector('.listen-head [data-act=theme-pick] .bar.stack'), cardH, optsBottom: Math.round(opts.bottom), navTop: Math.round(nav.top), countAtBottomRight, kind: LISTEN.source.kind };
      // playing on, back to 練習: the player keeps going and the 單字 switch shows a dot; 錯題本 (another source) stops it
      listenPlay(); ACTIONS['today-tab']({ dataset: { tab: 'practice' } }); const keptPlaying = LISTEN && LISTEN.playing && LISTEN.source.kind === 'theme' && !!view.querySelector('.today-seg [data-tab=theme] .seg-live') && !!view.querySelector('.hero-center');
      ACTIONS['today-tab']({ dataset: { tab: 'mistakes' } }); const switched = !LISTEN || LISTEN.source.kind === 'mistakes'; const emptyNote = /目前沒有可以聽的錯題/.test(view.textContent);
      location.hash = '#/stats'; route(); const off = !view.classList.contains('fit') && !document.body.classList.contains('today') && todayTab === 'practice';
      heroTab = null; localStorage.removeItem('nq_listen_pref'); const backToUnit = (() => { location.hash = '#/vocab'; route(); location.hash = '#/today'; route(); return heroTab === 'unit' && !document.querySelector('[data-panel=unit]').hidden; })();
      heroTab = null; localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ cards, seg, tabs, unitTab, unitOpen, unitPanelHas, practice, opened, kept, backToUnit, player, keptPlaying, switched, emptyNote, off }); })()"""
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", seed), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['cards'] == 1 and r['seg'] == [['practice', 'true'], ['mistakes', 'false'], ['theme', 'false']], r
    assert r['tabs'] == ['help', 'scope', 'unit'] and r['unitTab'].strip() == '目前單元' and r['unitOpen'] and r['opened'] and r['kept'] and r['backToUnit'], r
    assert r['unitPanelHas']['bar'] and r['unitPanelHas']['lecture'] and r['unitPanelHas']['drill'] and [l.split(' ')[0] for l in r['unitPanelHas']['legs'][:3]] == ['熟練', '熟悉', '初識'], r['unitPanelHas']
    p = r['practice']; assert p['fit'] and p['scroll'] <= p['inner'] and p['viewScroll'] <= p['viewH'] and p['ringFirst'] and p['noPlayer'] and p['text'], p
    q = r['player']; assert q['cards'] == 1 and q['one'] and q['pressed'] == 'theme' and q['select'] and q['kind'] == 'theme' and q['flush'], q   # the head row is flush with the switch on both sides
    assert q['scroll'] <= q['inner'] and q['viewScroll'] <= q['viewH'] and 150 <= q['cardH'] <= 420 and q['optsBottom'] <= q['navTop'] and q['countAtBottomRight'], q
    assert r['keptPlaying'] and r['switched'] and r['emptyNote'] and r['off'], r

# ---- 2026-10-28: the notebook player skips grammar it cannot read as a marked sentence with Chinese ----
def test_notebook_player_skips_grammar_without_chinese_or_without_a_marked_answer(b):
    js = """(() => { const t = todayStr(); const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.op && x.zh && splitBlank(x.jp)); const gNoZh = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.op && !x.zh && splitBlank(x.jp)); const v = REG.vocab.find(x => x.builtin);
      const bg = splitBlank(g.jp); const blank = bg.pre + '（　）' + bg.post; const row = (id, key, prompt, answer, cat) => ({ id, key, cat, prompt, answer, wrong: 'x', why: '', count: 1, streak: 0, mastered: false, date: t, last: t });
      state.mistakes = [row('ok', g.key, blank, g.a, '文法'), row('meaning', g.key, '「' + bg.pre + g.a + bg.post + '」的意思是？', g.zh, '文法'), row('nokey', '', blank, g.a, '文法'), row('word', v.key, '「' + v.m + '」的日文', jaPlain(v.w), '單字')];
      if (gNoZh) { const b2 = splitBlank(gNoZh.jp); state.mistakes.push(row('nozh', gNoZh.key, b2.pre + '（　）' + b2.post, gNoZh.a, '文法')); }
      saveState(); const ids = listenSourceEntries({ kind: 'mistakes', cat: '' }).map(e => e.id).sort();
      const e = listenEntry(state.mistakes[0]); const meaningE = listenEntry(state.mistakes[1]);
      state.mistakes = []; saveState(); return JSON.stringify({ ids, hasNoZh: !!gNoZh, okMarked: e.marked && /fill-ans/.test(e.html) && !!e.zh, meaningUnmarked: !meaningE.marked && !/fill-ans/.test(meaningE.html) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=30)
    r = json.loads(out[-1])
    assert r['ids'] == ['ok', 'word'] and r['okMarked'] and r['meaningUnmarked'], r   # 'meaning' has no blank, 'nokey' has no Chinese, 'nozh' (if any) has no Chinese

# ---- 2026-10-28: 沉浸播放 — the full-page player from the Today card ----
def test_fullscreen_player_opens_from_the_today_card_and_comes_back_to_the_same_tab(b):
    js = """(() => { localStorage.removeItem('nq_listen_pref'); LISTEN = null; location.hash = '#/vocab'; route(); location.hash = '#/today'; route(); ACTIONS['today-tab']({ dataset: { tab: 'theme' } });
      const view = document.getElementById('view'); const btn = view.querySelector('.listen-head [data-act=listen-full]'); const L = LISTEN; LISTEN.idx = 2; listenPlay();
      ACTIONS['listen-full'](btn); route(); const full = { hash: location.hash, same: LISTEN === L, playing: LISTEN.playing, idx: LISTEN.idx, immersive: document.body.classList.contains('immersive'), card: !!view.querySelector('.card.listen.full .lplay'), close: !!view.querySelector('[data-act=listen-close]'), exitBtn: !!view.querySelector('[data-act=listen-exit]'), head: /單字・/.test(view.querySelector('.card.listen.full').textContent), topbarHidden: getComputedStyle(document.querySelector('.topbar')).display === 'none', navHidden: getComputedStyle(document.querySelector('.bottomnav')).display === 'none', wordPx: parseFloat(getComputedStyle(view.querySelector('.flash .word')).fontSize), wordFills: view.querySelector('.flash .word').scrollWidth <= view.querySelector('.flash .word').clientWidth + 1 };
      const ms = navigator.mediaSession ? { title: navigator.mediaSession.metadata && navigator.mediaSession.metadata.title, state: navigator.mediaSession.playbackState } : null; const cur = listenCurrent();
      ACTIONS['listen-close'](); route(); const back = { hash: location.hash, tab: todayTab, same: LISTEN === L, playing: LISTEN && LISTEN.playing, idx: LISTEN && LISTEN.idx, immersive: document.body.classList.contains('immersive'), compact: !!view.querySelector('.card.today-card.listen.compact .lplay') };
      listenPause();
      // opened from the vocab themes page instead: ✕ ends the player and goes back there
      const tbtn = (location.hash = '#/vocab/themes', route(), document.querySelector('.theme-card [data-act=listen-theme-start]')); ACTIONS['listen-theme-start'](tbtn); route(); const fromThemes = document.body.classList.contains('immersive') && !!document.querySelector('[data-act=listen-close]');
      ACTIONS['listen-close'](); route(); const ended = LISTEN === null && location.hash === '#/vocab/themes' && !document.body.classList.contains('immersive');
      const css = document.querySelector('style').textContent; const landscape = /orientation: portrait\\) \\{\\s*body\\.immersive \\.main \\{ position: fixed/.test(css) && /\\.listen\\.full \\.flash \\{ height: 100%; display: flex; flex-direction: column/.test(css);
      localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ full, ms, curTitle: cur ? cur.word + '　' + cur.meaning : null, back, fromThemes, ended, landscape }); })()"""
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    f = r['full']; assert f['hash'] == '#/vocab/listen' and f['same'] and f['playing'] and f['idx'] == 2 and f['immersive'] and f['card'] and f['close'] and not f['exitBtn'] and f['head'], f
    assert f['topbarHidden'] and f['navHidden'] and f['wordPx'] >= 28 and f['wordFills'], f   # sized to its column, never overflowing it
    if r['ms'] is not None: assert r['ms']['title'] == r['curTitle'] and r['ms']['state'] == 'playing', r
    bk = r['back']; assert bk == {'hash': '#/today', 'tab': 'theme', 'same': True, 'playing': True, 'idx': 2, 'immersive': False, 'compact': True}, bk
    assert r['fromThemes'] and r['ended'] and r['landscape'], r

def test_fullscreen_player_turns_a_portrait_phone_sideways_and_fits_everything_in_the_box(b):
    js = """(() => { localStorage.removeItem('nq_listen_pref'); LISTEN = null; const v = REG.vocab.find(x => x.builtin && vocabExamples(x)[0] && jaPlain(x.w).length <= 4); setListenPref({ source: 'theme', theme: vocabTheme(v) }); location.hash = '#/vocab/listen'; route();
      const card = document.getElementById('listenCard'); const measure = () => { const flash = card.querySelector('.flash'); const word = flash.querySelector('.word, .listen-sentence'); const meaning = flash.querySelector('.meaning'); const ex = flash.querySelector('.listen-ex');
        const box = (el) => ({ top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight, mid: el.offsetLeft + el.offsetWidth / 2 });   // layout coordinates: the page may be turned 90°, so screen rects would lie
        const wr = box(word), mr = meaning ? box(meaning) : null, er = ex ? box(ex) : null;
        return { px: parseFloat(word.style.fontSize), inside: flash.scrollHeight <= card.clientHeight + 1 && flash.scrollWidth <= flash.clientWidth + 1, stacked: (!mr || mr.top >= wr.bottom - 2) && (!er || !mr || er.top >= mr.bottom - 2), centred: Math.abs(wr.mid - box(flash).mid) < 6, noScroll: getComputedStyle(card).overflowY === 'hidden', boxH: card.clientHeight }; };
      const main = document.querySelector('.main'); const mr = main.getBoundingClientRect();
      LISTEN.idx = LISTEN.items.findIndex(e => e.id === v.key); listenRenderNow(); const short = measure();
      const longest = LISTEN.items.reduce((a, e) => (e.word || '').length > (a.word || '').length ? e : a, LISTEN.items[0]); LISTEN.idx = LISTEN.items.indexOf(longest); listenRenderNow(); const long = measure();
      const g = LISTEN.items.find(e => e.kind === 'g'); let sent = null; if (g) { LISTEN.idx = LISTEN.items.indexOf(g); listenRenderNow(); sent = measure(); }
      const r = { rotated: getComputedStyle(main).transform !== 'none', box: [Math.round(mr.left), Math.round(mr.top), Math.round(mr.width), Math.round(mr.height)], short, long, sent, noPageScroll: document.documentElement.scrollHeight <= innerHeight + 1 && document.querySelector('.content').scrollHeight <= document.querySelector('.content').clientHeight + 1, play: !!document.querySelector('.lplay') };
      listenStop(true); localStorage.removeItem('nq_listen_pref'); return JSON.stringify(r); })()"""
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['rotated'] and r['box'] == [0, 0, 390, 844] and r['noPageScroll'] and r['play'], r   # the rotated page still covers exactly the portrait screen
    for k in ('short', 'long'):
        m = r[k]; assert m['inside'] and m['stacked'] and m['centred'] and m['noScroll'] and 24 <= m['px'] <= 120, (k, m)   # Japanese above Chinese above the example, all inside the box
    assert r['short']['px'] >= 60 and r['long']['px'] >= 40 and r['short']['boxH'] >= 230, r   # big type (the exact size depends on the example's height too); the box keeps most of the 390px
    out2 = b.run([("metrics", (844, 390)), ("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r2 = json.loads(out2[-1])
    assert not r2['rotated'] and r2['box'] == [0, 0, 844, 390] and r2['short']['inside'] and r2['long']['inside'] and r2['short']['px'] >= 60 and r2['noPageScroll'], r2   # a phone really held sideways: no CSS turn

# ---- 2026-10-28: 初識單詞 — words met but not yet mastered; default theme, remembered choice ----
def test_review_theme_collects_met_but_unmastered_words_and_is_the_default_until_another_is_picked(b):
    js = """(() => { localStorage.removeItem('nq_listen_pref'); LISTEN = null; const t = todayStr(); const vs = REG.vocab.filter(v => v.builtin).slice(0, 6);
      const rec = (b, extra) => Object.assign({ b, due: addDays(t, 3), n: b + 1, ok: b, ng: 0, s: 5, d: 5, last: addDays(t, -1), intro: addDays(t, -9), f: {} }, extra || {});
      state.srs[vs[0].key] = rec(1); state.srs[vs[1].key] = rec(3); state.srs[vs[2].key] = rec(SRS_MASTERED, { known: true });   // 初識 / 熟悉 / 熟練 (vouched)
      vs.slice(3).forEach(v => { delete state.srs[v.key]; }); saveState();
      const words = listenThemeWords('初識單詞').map(v => v.key); const g = listenThemes()[0];
      const empty0 = (() => { const keep = state.srs; state.srs = {}; const d = listenDefaultTheme(); state.srs = keep; return d; })();
      const def = listenDefaultTheme(); location.hash = '#/today'; route(); ACTIONS['today-tab']({ dataset: { tab: 'theme' } }); const opened = { theme: LISTEN.source.theme, n: LISTEN.all.length, label: document.querySelector('.listen-head .tp-name').textContent };
      ACTIONS['listen-theme-pick']({ dataset: { theme: vocabThemes()[2].c } }); LISTEN = null; location.hash = '#/vocab'; route(); location.hash = '#/today'; route(); ACTIONS['today-tab']({ dataset: { tab: 'theme' } }); const remembered = LISTEN.source.theme;
      localStorage.removeItem('nq_listen_pref'); return JSON.stringify({ has0: words.includes(vs[0].key), has1: words.includes(vs[1].key), has2: words.includes(vs[2].key), hasNew: words.includes(vs[3].key), g: { c: g.c, total: g.total, learned: g.learned, mastered: g.mastered, virtual: !!g.virtual }, empty0, def, opened, remembered, want: vocabThemes()[2].c }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['has0'] and r['has1'] and not r['has2'] and not r['hasNew'], r   # met and not mastered: 初識 and 熟悉 words; not the mastered one, not the unseen ones
    assert r['g']['c'] == '初識單詞' and r['g']['virtual'] and r['g']['total'] == r['g']['learned'] + 1 and r['g']['mastered'] == 0, r['g']   # (other seeded tests may have left more learned words)
    assert r['empty0'] != '初識單詞' and r['def'] == '初識單詞' and r['opened']['theme'] == '初識單詞' and r['opened']['n'] >= 2 and r['opened']['label'] == '初識單詞', r
    assert r['remembered'] == r['want'], r   # a picked theme is kept across pages

# ---- 2026-10-28: the install hint ----
def test_install_hint_shows_in_a_browser_tab_with_steps_per_platform_and_goes_away_once_dismissed(b):
    js = """(() => { localStorage.removeItem('nq_install_hint'); state.introSeen = true; state.lastBackup = todayStr(); saveState(); const view = document.getElementById('view'); const show = () => { location.hash = '#/today'; route(); return view.querySelector('.install-banner'); };
      INSTALL_FORCE = { platform: 'ios', safari: true }; const ios = show(); const iosBtns = ios ? [...ios.querySelectorAll('[data-act]')].map(b => b.dataset.act) : null;
      ACTIONS['install-how'](); const modal = document.querySelector('.modal'); const guide = modal ? modal.textContent : ''; closeModal(true);
      const iosGuide = /加入主畫面/.test(guide) && /分享/.test(guide) && /獨立的儲存空間/.test(guide) && !/⋮/.test(guide) && /Brave/.test(guide);
      const iosHtml = installGuideHtml(); const chromeIos = /href="x-safari-https?:\\/\\/[^"]+#\\/today"/.test(iosHtml) && /data-act="copy-url"/.test(iosHtml) && /用 Safari 開啟/.test(iosHtml);
      INSTALL_FORCE = { platform: 'android', brave: true }; const braveAnd = /Brave 點右上角/.test(installGuideHtml()) && /加到主畫面」，再選「安裝」/.test(installGuideHtml()) && !/x-safari/.test(installGuideHtml());
      INSTALL_FORCE = { platform: 'android', canPrompt: true }; const and = show(); const andBtns = and ? [...and.querySelectorAll('[data-act]')].map(b => b.dataset.act) : null; const andGuide = /安裝應用程式/.test(installGuideHtml()) && /data-act="install-prompt"/.test(installGuideHtml());
      INSTALL_FORCE = { platform: 'desktop', firefox: true, touch: false }; const desk = !show() && /Firefox 不支援/.test(installGuideHtml());
      INSTALL_FORCE = { platform: 'ios', standalone: true }; const standalone = !show() && /安裝好的 app/.test(installGuideHtml());
      INSTALL_FORCE = { platform: 'ios' }; show(); ACTIONS['install-dismiss'](); const dismissed = !view.querySelector('.install-banner') && !!localStorage.getItem('nq_install_hint');
      openSettings('look'); const inSettings = /加到主畫面（安裝成 app）/.test(document.querySelector('.modal').textContent) && /加入主畫面/.test(document.querySelector('.modal').textContent); closeModal(true);
      INSTALL_FORCE = null; localStorage.removeItem('nq_install_hint'); return JSON.stringify({ ios: !!ios, iosBtns, iosGuide, chromeIos, braveAnd, and: !!and, andBtns, andGuide, desk, standalone, dismissed, inSettings }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['ios'] and r['iosBtns'] == ['install-how', 'install-dismiss'] and r['iosGuide'] and r['chromeIos'] and r['braveAnd'], r
    assert r['and'] and r['andBtns'] == ['install-prompt', 'install-dismiss'] and r['andGuide'], r
    assert r['desk'] and r['standalone'] and r['dismissed'] and r['inSettings'], r

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
             test_every_wrong_answer_waits_until_tomorrow, test_miss_then_requeue_does_not_return_today, test_daily_queue_has_only_due_or_new, test_listening_and_reading_are_capped_per_day, test_new_items_spread_across_sessions, test_done_state_and_extra_session, test_theme_lane_rotates_after_three_days_of_words, test_new_grammar_follows_lesson_sections_with_points_rotating, test_unit_advances_when_its_grammar_is_all_introduced, test_ring_counts_todays_work_and_fills_when_the_day_is_done, test_load_cap_replaces_the_daily_goal_and_brakes_new_items_in_order, test_pressing_see_results_after_the_last_question_shows_the_summary, test_practice_counter_counts_the_planned_items_and_shows_extras_apart, test_a_miss_walks_the_relearning_ladder_and_then_leaves_the_notebook, test_today_counts_relearning_items_among_reviews_and_puts_them_first, test_cloud_audio_path_is_stable_and_pins_readings, test_cloud_engine_falls_back_to_the_browser_voice_and_notes_the_miss, test_cloud_generator_covers_the_built_in_sentences_and_uploads_only_what_is_missing, test_cloud_audio_is_the_default_engine_with_an_admin_generator_section, test_download_all_puts_every_clip_in_the_audio_cache_and_skips_what_is_there, test_history_card_lives_in_stats_with_day_statistics_and_the_leech_card_is_gone, test_phone_layout_hooks_next_button_strip_ring_help_and_key_hints, test_unit_legend_chips_exam_subject_rows_and_setting_hints, test_hero_help_and_scope_toggles_open_one_at_a_time, test_mistake_category_chips_fold_and_the_listen_player_reads_the_notebook_in_a_loop, test_listen_reads_order_items_as_whole_sentences_and_skips_listening_and_reading, test_today_notebook_card_is_the_listen_player, test_vocab_theme_card_plays_the_theme, test_today_offers_the_exam_pace_quotas_when_behind, test_requeue_uses_another_format_when_the_item_has_one, test_new_grammar_gets_one_encore_in_another_format_only_when_answered_right, test_unit_and_vocab_practice_do_not_repeat_todays_correct_answers,
             test_heatmap_starts_at_the_week_the_learner_began,
             test_modal_header_stays_put_while_the_body_scrolls_and_has_a_bottom_close,
             test_google_tts_engine_sends_ssml_with_known_readings, test_deepgram_gets_kana_for_known_readings_unless_turned_off,
             test_single_words_are_sent_as_kanji_with_the_reading_pinned, test_spelling_and_matching_offer_a_give_up_button_that_counts_as_wrong, test_tts_connection_check_reports_the_real_error_and_success,
             test_tools_page_has_an_expandable_api_guide_for_every_provider,
             test_stats_shows_the_past_week_of_practice_and_what_was_learned, test_reaching_the_learned_level_records_the_date, test_tapping_a_word_in_the_matching_question_speaks_it_with_its_reading,
             test_stats_recommends_daily_quotas_from_the_remaining_banks_and_applies_them,
             test_mistake_loop_grades_once_per_day, test_a_linked_mistake_leaves_when_its_ladder_is_walked_and_an_unlinked_one_after_two_days, test_mistakes_page_is_a_compact_list_with_sort_filter_and_grammar_point_groups,
             test_dismissing_a_preview_asks_the_question_a_few_items_later, test_new_word_gets_one_spaced_encore_and_comes_back_tomorrow, test_first_new_question_of_a_lesson_section_shows_that_section_once,
             test_listening_pool_is_the_whole_level_ordered_by_closeness_and_repeats_only_after_two_weeks, test_listening_playback_shows_a_progress_bar_with_the_line_count, test_order_items_are_arranged_by_tapping_the_four_parts_in_practice_but_stay_star_choice_in_the_exam, test_a_slip_undoes_the_schedule_the_notebook_and_the_requeue,
             test_gemini_auto_mode_skips_a_rate_limited_model_and_remembers_the_cooldown, test_gemini_manual_model_falls_back_for_one_call_without_changing_the_preference, test_gemini_reports_a_plain_message_when_every_model_is_cooling_down, test_ai_explanations_are_cached_per_question_and_show_the_model, test_today_page_fits_one_phone_screen_with_the_unit_folded_and_the_player_filling_the_rest, test_listen_pills_keep_the_place_and_the_example_chinese_is_read, test_install_hint_shows_in_a_browser_tab_with_steps_per_platform_and_goes_away_once_dismissed, test_notebook_player_skips_grammar_without_chinese_or_without_a_marked_answer, test_review_theme_collects_met_but_unmastered_words_and_is_the_default_until_another_is_picked, test_fullscreen_player_opens_from_the_today_card_and_comes_back_to_the_same_tab, test_fullscreen_player_turns_a_portrait_phone_sideways_and_fits_everything_in_the_box]
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
