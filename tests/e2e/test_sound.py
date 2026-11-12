"""2026-11-12: the world's sounds (SND, js/82_sound.js) — the three switches, each place's background by day and by night, the
room's window only while the gramophone is quiet, a place's own record, every thing used having a sound to be had, the
townsfolk each in their own voice (CAST_VOICE), and the world going quiet while Japanese is read aloud."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8813
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof SND === 'object'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# out of doors already (ムギ met), the gramophone set out
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.met = { koharu: 1, mugi: 1 };
  state.owned.gramophone = { paid: 0, on: '2026-11-01' }; state.settings.ambient = true; state.settings.music = true; state.musicOff = false; saveState();
  const wait = (ms) => new Promise((q) => setTimeout(q, ms)), at = async (h) => { location.hash = h; route(); await wait(250); };"""

def test_settings_have_three_sound_switches_all_on_at_first(b):
    r = json.loads(ev(b, """(async () => { openSettings('learn'); await new Promise((q) => setTimeout(q, 200));
      const labels = [...document.querySelectorAll('#modalBody .setting-row .label')].map((l) => l.textContent);
      return JSON.stringify({ labels: labels.filter((l) => ['答題音效', '環境音', '音樂'].includes(l)), d: [defaultSettings().ambient, defaultSettings().music] }); })()"""))
    assert r == {'labels': ['答題音效', '環境音', '音樂'], 'd': [True, True]}, r

def test_each_place_has_its_background_by_day_and_by_night(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const out = {};
      for (const [k, theme, h] of [['beachDay', 'day', '#/beach'], ['beachNight', 'night', '#/beach'], ['yardNight', 'night', '#/outside'], ['izakaya', 'day', '#/izakaya'], ['shop', 'day', '#/shop'], ['practice', 'day', '#/stats']]) {
        state.settings.theme = theme; await at(h); out[k] = [SND.scene(), SND.layers()];
      }
      state.settings.ambient = false; saveState(); await at('#/beach'); out.off = [SND.scene(), SND.layers()];
      return JSON.stringify(out); })()"""))
    assert r['beachDay'] == ['beach', ['gulls', 'waves']] and r['beachNight'] == ['beach', ['waves']], r
    assert r['yardNight'] == ['yard', ['insects', 'wind']] and r['izakaya'] == ['izakaya', ['izakaya']] and r['shop'] == ['shop', ['clock']], r
    assert r['practice'] == ['', []] and r['off'] == ['', []], r   # nothing behind the pages of learning; 環境音 off: nothing at all

def test_the_room_hears_the_window_only_while_the_gramophone_is_quiet(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.settings.theme = 'day'; state.placed.gramophone = state.placed.gramophone || { w: 'F', x: 19.6, y: 0.6, r: 0 }; saveState();
      await at('#/today'); const playing = [MUSIC.wants(), SND.scene(), SND.layers()];
      state.musicOff = true; saveState(); await wait(100); const stopped = [MUSIC.wants(), SND.scene(), SND.layers()];
      state.musicOff = false; state.settings.music = false; saveState(); await wait(100); const off = [MUSIC.wants(), SND.scene()];
      return JSON.stringify({ playing, stopped, off }); })()"""))
    assert r['playing'] == ['engawa', '', []] and r['stopped'] == ['', 'room', ['birds']] and r['off'] == ['', 'room'], r

def test_a_place_plays_its_own_record_and_the_shop_sells_the_others(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await at('#/izakaya'); const izakaya = MUSIC.wants();
      await at('#/beach'); const beach = MUSIC.wants(); state.settings.music = false; saveState(); await at('#/izakaya'); const off = MUSIC.wants();
      const sold = WARES.filter((w) => w.kind === 'record').map((w) => w.id), recs = MUSIC.RECORDS.map((x) => x.id);
      return JSON.stringify({ izakaya, beach, off, sold, every: sold.every((id) => recs.includes(id)), files: MUSIC.RECORDS.every((x) => x.file === 'music/' + x.id + '-1.m4a') }); })()"""))
    assert r['izakaya'] == 'chochin' and r['beach'] == '' and r['off'] == '', r
    assert r['sold'] == ['harukaze', 'matsuri', 'tsukimi', 'yukiasa', 'kissa', 'obake'] and r['every'] and r['files'], r

def test_every_thing_used_and_every_footstep_has_a_sound_to_be_had(b):
    r = json.loads(ev(b, """(async () => { const names = new Set();
      Object.keys(PLACE_USE).forEach((p) => PLACE_USE[p].forEach((t) => useSound(p, t).forEach((n) => n && names.add(n))));
      ['wood', 'grass', 'concrete', 'gravel', 'sand'].forEach((g) => names.add('steps-' + g));
      ['coins', 'place', 'switch', 'drawer', 'door-open', 'door-close', 'slide-door', 'pour', 'page', 'cloth', 'cushion', 'sit', 'mail', 'bus', 'knock', 'splash', 'plop', 'crow', 'gull'].forEach((n) => names.add(n));
      ['birds', 'insects', 'wind', 'waves', 'gulls', 'harbor', 'traffic', 'town', 'station', 'restaurant', 'izakaya', 'clock'].forEach((n) => names.add('amb-' + n));
      const missing = [];
      for (const n of [...names].sort()) { if (SND.SYNTH[n] && !['knock', 'spring'].includes(n)) continue; const r = await fetch('sounds/' + n + '-1.m4a', { method: 'HEAD' }); if (!r.ok) missing.push(n); }
      return JSON.stringify({ missing, n: names.size }); })()"""))
    assert r['missing'] == [], r

def test_townsfolk_speak_in_their_own_voices(b):
    r = json.loads(ev(b, """(async () => { const lines = talkLines(), who = [...new Set(lines.map((l) => l[0]))];
      const voices = Object.values(CAST_VOICE).map((v) => v[0]), heard = [];
      const real = speakLine; speakLine = async (text, g, t, opt) => { heard.push([text, g, opt && opt.cast]); };
      speakAs('kenta', '{森|もり}です！ パン{屋|や|店}です。'); speakAs('granny', DIARY.said(DIARY.PAGES[0])); speakAs('nobody', 'はい。'); speakLine = real;
      const p = await cloudAudioPath('森です！パン屋です。', 'm', { cast: 'kenta', line: '{森|もり}です！ パン{屋|や|店}です。' });
      return JSON.stringify({ unvoiced: who.filter((w) => !CAST_VOICE[w]), shared: voices.length - new Set(voices).size, heard: heard.map((h) => h.slice(1)), said: heard[0][0],
        path: p.slice(0, 2), ssml: castSsml('{森|もり}です！ パン{屋|や|店}です。'), clips: cloudAudioTexts().filter((x) => x.cast).length >= lines.length * 0.9 }); })()"""))
    assert r['unvoiced'] == [] and r['shared'] == 0, r   # everyone who speaks has a voice, no two the same
    assert r['heard'] == [['m', 'kenta'], ['f', 'granny'], ['', None]] and r['said'] == '森です！パン屋です。', r   # anyone else's line: as any line (speak)
    assert r['path'] == 'c/' and r['ssml'] == '<speak><sub alias="もり">森</sub>です！パン<sub alias="や">屋</sub>です。</speak>' and r['clips'], r

def test_each_voice_can_be_heard_before_the_generator_makes_them_all(b):
    r = json.loads(ev(b, """(async () => { openSettings('data'); await new Promise((q) => setTimeout(q, 200));
      const rows = document.querySelectorAll('#castPreviewBox .cast-row:not(.cast-try)').length, asked = [], played = [];
      const realF = fetchEngineBlob, realP = playUrl;
      fetchEngineBlob = async (cfg, text, g, opt) => { asked.push([cfg.engine, cfg.googleKey, text, g, opt.cast, opt.line]); return new Blob([new Uint8Array(4000)], { type: 'audio/mpeg' }); };
      playUrl = async (url) => { played.push(url.slice(0, 5)); return true; };
      document.querySelector('[data-act="cast-preview"][data-who="kenta"]').click();   // no key yet: nothing asked
      document.getElementById('cloudGoogleKey').value = ' k123 ';
      document.querySelector('[data-act="cast-preview"][data-who="kenta"]').click(); await new Promise((q) => setTimeout(q, 150));
      document.querySelector('[data-act="cast-preview"][data-who="kenta"]').click(); await new Promise((q) => setTimeout(q, 150));   // heard again: not made again
      fetchEngineBlob = realF; playUrl = realP;
      return JSON.stringify({ rows, voices: Object.keys(CAST_VOICE).length, asked, played }); })()"""))
    assert r['rows'] == r['voices'] == 29, r
    assert len(r['asked']) == 1 and r['asked'][0][:5] == ['google_tts', 'k123', 'いらっしゃいませ！', 'm', 'kenta'] and r['played'] == ['blob:', 'blob:'], r

def test_mugi_speaks_in_a_pitched_up_boys_voice_opening_with_wan(b):
    r = json.loads(ev(b, """(async () => { const sent = [], realF = window.fetch;
      window.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ audioContent: btoa('x'.repeat(4000)) }), { status: 200 }); };
      const cfg = Object.assign({}, ttsConfig(), { engine: 'google_tts', googleKey: 'k' });
      await fetchEngineBlob(cfg, 'x', 'm', { cast: 'mugi', line: 'ワン！{今日|きょう}は あたたかい。' }); await fetchEngineBlob(cfg, 'x', 'f', { cast: 'koharu', line: 'こんにちは！' });
      window.fetch = realF;
      const mugi = talkLines().filter((l) => l[0] === 'mugi').map((l) => l[1]);
      return JSON.stringify({ sent: sent.map((q) => [q.voice.name, q.audioConfig.pitch || 0, q.audioConfig.speakingRate]), opens: mugi.every((l) => /^ワン！|^……ワン。$/.test(l)),
        ends: mugi.filter((l) => /(ワン|わん)(?=[。！？!?…」]|\\s|$)/.test(l.replace(/^ワン！/, ''))) }); })()"""))
    assert r['sent'] == [['ja-JP-Neural2-D', 6, 1.1], ['ja-JP-Chirp3-HD-Autonoe', 0, 1.02]], r   # her pitch set by Google; anyone on Chirp none
    assert r['opens'] and r['ends'] == ['……ワン。'], r   # every line of hers opens with ワン！ and none ends in it (but the one that is only a bark)

def test_voices_to_try_are_listed_under_theirs_and_made_with_that_voice(b):
    r = json.loads(ev(b, """(async () => { openSettings('data'); await new Promise((q) => setTimeout(q, 200));
      const tries = [...document.querySelectorAll('#castPreviewBox .cast-try [data-act="cast-preview"]')].map((x) => [x.dataset.who, x.dataset.try]), asked = [];
      const realF = fetchEngineBlob, realP = playUrl; playUrl = async () => true;
      fetchEngineBlob = async (cfg, text, g, opt) => { asked.push([g, opt.cast, opt.voice || null]); return new Blob([new Uint8Array(4000)], { type: 'audio/mpeg' }); };
      document.getElementById('cloudGoogleKey').value = 'k';
      for (const k of ['', '0']) { document.querySelector(`[data-act="cast-preview"][data-who="koharu"][data-try="${k}"]`).click(); await new Promise((q) => setTimeout(q, 150)); }
      fetchEngineBlob = realF; playUrl = realP;
      const p1 = await cloudAudioPath('x', 'f', { cast: 'koharu', line: 'はい。', voice: ['Achernar', 1, 0] }), p2 = await cloudAudioPath('x', 'f', { cast: 'koharu', line: 'はい。' });
      return JSON.stringify({ tries, asked, differ: p1 !== p2 }); })()"""))
    assert r['tries'] == [['koharu', '0'], ['koharu', '1'], ['koharu', '2']], r
    assert r['asked'] == [['f', 'koharu', None], ['f', 'koharu', ['Achernar', 1, 0]]] and r['differ'], r

def test_the_world_goes_quiet_while_japanese_is_read(b):
    r = json.loads(ev(b, """(async () => { const seen = [];
      const real = speakLineNow; speakLineNow = async () => { seen.push(SND.ducked()); await new Promise((q) => setTimeout(q, 50)); };
      await speakLine('はい', '', speechToken); seen.push(SND.ducked()); speakLineNow = real;
      return JSON.stringify(seen); })()"""))
    assert r == [1, 0], r

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
