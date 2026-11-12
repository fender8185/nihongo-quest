'use strict';
/* ==========================================================================
   Speech: browser voices, Deepgram Aura-2, VOICEVOX, OpenAI TTS
   ========================================================================== */
const TTS_SECRET_KEYS = ['deepgramKey', 'openaiKey', 'googleKey'];   // never leave the device: kept when older data is restored
const TTS_DEFAULT = {
  engine: 'cloud', browserVoiceURI: '',
  deepgramKey: '', deepgramVoice: 'aura-2-izanami-ja', deepgramVoiceM: 'aura-2-fujin-ja',
  googleKey: '', googleVoice: 'ja-JP-Neural2-B', googleVoiceM: 'ja-JP-Neural2-C',
  kanaReadings: 'on',   // Deepgram / OpenAI: send known readings as kana so 三本 is さんぼん, not whatever the model guesses
  voicevoxUrl: 'http://localhost:50021', voicevoxSpeaker: '2', voicevoxSpeakerM: '13',
  openaiKey: '', openaiModel: 'tts-1-hd', openaiVoice: 'nova', openaiVoiceM: 'onyx'
};
const TTS_ENGINES = [['cloud', '雲端音檔（免設定，預先生成）'], ['browser_neural', '瀏覽器內建語音（免設定）'], ['google_tts', 'Google Cloud TTS（Neural2）'], ['deepgram', 'Deepgram Aura-2'], ['voicevox', 'VOICEVOX（本機）'], ['openai_tts', 'OpenAI TTS']];
const GOOGLE_VOICES = [['ja-JP-Neural2-B', 'Neural2 B（女聲）'], ['ja-JP-Neural2-C', 'Neural2 C（男聲）'], ['ja-JP-Neural2-D', 'Neural2 D（男聲）'], ['ja-JP-Wavenet-A', 'WaveNet A（女聲）'], ['ja-JP-Wavenet-B', 'WaveNet B（女聲）'], ['ja-JP-Wavenet-C', 'WaveNet C（男聲）'], ['ja-JP-Wavenet-D', 'WaveNet D（男聲）']];
const DEEPGRAM_VOICES = [['aura-2-izanami-ja', 'イザナミ（女聲）'], ['aura-2-uzume-ja', 'ウズメ（女聲）'], ['aura-2-ama-ja', 'アマ（女聲）'], ['aura-2-fujin-ja', 'フウジン（男聲）'], ['aura-2-ebisu-ja', 'エビス（男聲）']];
const VOICEVOX_SPEAKERS = [['2', '四国めたん（女聲）'], ['8', '春日部つむぎ（女聲）'], ['14', '冥鳴ひまり（女聲）'], ['3', 'ずんだもん'], ['13', '青山龍星（男聲）']];
const OPENAI_VOICES = [['nova', 'Nova（女聲）'], ['shimmer', 'Shimmer（女聲）'], ['alloy', 'Alloy（中性）'], ['onyx', 'Onyx（男聲）']];

function ttsConfig() {
  if (!state.ttsConfig || typeof state.ttsConfig !== 'object') state.ttsConfig = {};
  Object.keys(TTS_DEFAULT).forEach(k => { if (state.ttsConfig[k] === undefined) state.ttsConfig[k] = TTS_DEFAULT[k]; });
  return state.ttsConfig;
}

/* ---- 雲端音檔: every built-in sentence synthesized once (Google Neural2) and kept in a public R2 bucket ----
   The file name is a hash of exactly what Google is sent (SSML with the readings pinned, voice gender), so the generator
   (設定 › 資料 › 管理者) and the player agree by construction. A missing file (custom cards, AI items) falls back to the
   browser voice and is noted locally so the next generator run covers it.
   The clips started in Supabase's JPY_audio and were copied to Cloudflare R2 (nihongo-audio, served as
   audio.nihongoquest.app). Since 1.0.29 a clip is fetched from R2 first and from Supabase when R2 fails; since 1.0.30 the
   generator uploads to R2 only, so Supabase keeps just the clips made before 1.0.30, as a fallback and backup. A device
   that cached clips before 1.0.29 holds them under the Supabase address (sw.js looks there too). */
const CLOUD_AUDIO = { bucket: 'JPY_audio', set: 'v1', host: 'https://audio.nihongoquest.app',
  r2: 'https://397ec29bf37f161821985070bb3f5bb5.r2.cloudflarestorage.com/nihongo-audio' };   // r2: the bucket's S3 address, where the generator uploads (1.0.30)
const cloudMisses = new Set();   // paths that were on neither server this session: straight to the browser voice next time
// the addresses a clip is fetched from, in order: R2, then Supabase
function cloudAudioBases() { return [`${CLOUD_AUDIO.host}/${CLOUD_AUDIO.set}`, `${((window.NQ_CONFIG || {}).supabaseUrl || '').replace(/\/$/, '')}/storage/v1/object/public/${CLOUD_AUDIO.bucket}/${CLOUD_AUDIO.set}`]; }
// A clip from the first address that has it: a failed request or a missing file moves on to the next. Resolves with the
// response and its URL (the last answer when neither has the clip); rejects when the last address could not be reached.
async function fetchCloudClip(path) {
  let last = null;
  for (const base of cloudAudioBases()) {
    const url = `${base}/${path}`;
    try { last = { resp: await fetch(url), url }; if (last.resp.ok) return last; } catch (e) { last = { error: e }; }
  }
  if (last.error) throw last.error;
  return last;
}
// a value in a signed S3 URL: RFC 3986, so ! ' ( ) * are escaped too
function rfc3986(s) { return encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
// AWS Signature Version 4 for one request to R2's S3 API (the generator signs in the browser, with WebCrypto). Returns
// `headers` plus x-amz-date and Authorization; it signs host, every header given and x-amz-date. The payload hash is the
// x-amz-content-sha256 header when given (R2: UNSIGNED-PAYLOAD), else the hash of an empty body. Region, service and time
// are parameters so AWS's test suite can check it.
async function sigV4(method, url, headers, creds, opt = {}) {
  const { region = 'auto', service = 's3', now = new Date() } = opt;
  const u = new URL(url); const enc = new TextEncoder();
  const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  const hmac = async (key, s) => crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(s));
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, ''); const day = amzDate.slice(0, 8);
  const out = Object.assign({}, headers, { 'x-amz-date': amzDate });
  const signed = { host: u.host }; Object.keys(out).forEach(k => { signed[k.toLowerCase()] = String(out[k]).trim(); });
  const names = Object.keys(signed).sort();
  // the query as sent, decoded and sorted (not URLSearchParams: it reads a literal + as a space)
  const query = u.search.slice(1).split('&').filter(Boolean).map(p => { const i = p.indexOf('='); return i < 0 ? [decodeURIComponent(p), ''] : [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))]; })
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`).join('&');
  const canonical = [method, u.pathname, query, names.map(n => `${n}:${signed[n]}\n`).join(''), names.join(';'), signed['x-amz-content-sha256'] || await sha('')].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  let key = `AWS4${creds.secret}`;
  for (const part of [day, region, service, 'aws4_request']) key = await hmac(key, part);
  const signature = hex(await hmac(key, ['AWS4-HMAC-SHA256', amzDate, scope, await sha(canonical)].join('\n')));
  return Object.assign(out, { Authorization: `AWS4-HMAC-SHA256 Credential=${creds.keyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` });
}
// R2's S3 address sends its errors without CORS headers, so in a browser a refused request (wrong key, missing
// permission, clock off) is a rejected fetch just like a lost network or a bucket without the CORS rule
const R2_DOWN = '連不到 R2：檢查網路、R2 金鑰（要 Object Read & Write）和 bucket 的 CORS 設定';
// R2's error code from an error it let us read (SignatureDoesNotMatch, AccessDenied, RequestTimeTooSkewed …)
async function r2ErrorDetail(resp) {
  try { const code = new DOMParser().parseFromString(await resp.text(), 'application/xml').getElementsByTagName('Code')[0]; return code && code.textContent ? `：${code.textContent}` : ''; } catch (e) { return ''; }
}
// one signed request to the bucket
async function r2Fetch(method, url, creds, init = {}) {
  const headers = Object.assign(await sigV4(method, url, { 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD' }, creds), init.headers);
  try { return await fetch(url, Object.assign({}, init, { method, headers })); } catch (e) { throw new Error(R2_DOWN); }
}
// the clip paths (f|m|zh/<hash>.mp3) already in the R2 bucket: ListObjectsV2, 1000 keys a page
async function r2ListExisting(creds) {
  const have = new Set();
  for (const g of ['f', 'm', 'zh']) {
    let token = '';
    do {
      const r = await r2Fetch('GET', `${CLOUD_AUDIO.r2}?list-type=2&max-keys=1000&prefix=${rfc3986(`${CLOUD_AUDIO.set}/${g}/`)}${token ? `&continuation-token=${rfc3986(token)}` : ''}`, creds);
      if (!r.ok) throw new Error(`列出 R2 的檔案失敗 HTTP ${r.status}${await r2ErrorDetail(r)}`);
      const doc = new DOMParser().parseFromString(await r.text(), 'application/xml'); const tag = (n) => (doc.getElementsByTagName(n)[0] || {}).textContent || '';
      [...doc.getElementsByTagName('Key')].forEach(k => have.add(k.textContent.slice(CLOUD_AUDIO.set.length + 1)));
      token = tag('IsTruncated') === 'true' ? tag('NextContinuationToken') : '';
    } while (token);
  }
  return have;
}
// one clip into the R2 bucket, stored like the copied ones (audio/mpeg, cached a year)
async function r2Put(path, blob, creds) {
  const r = await r2Fetch('PUT', `${CLOUD_AUDIO.r2}/${CLOUD_AUDIO.set}/${path}`, creds, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }, body: blob });
  if (!r.ok) throw new Error(`上傳 HTTP ${r.status}${await r2ErrorDetail(r)}`);
}
function cloudAudioSsml(text, opt = {}) { return opt.reading ? `<speak><sub alias="${esc(opt.reading)}">${esc(text)}</sub></speak>` : ssmlReadings(text); }
const CLOUD_ZH_VOICE = { languageCode: 'cmn-TW', name: 'cmn-TW-Wavenet-A' };   // meanings and translations (opt.lang === 'zh'): one Taiwanese Mandarin voice
// ---- the townsfolk's own voices (2026-11-12): [voice, speaking rate, pitch in semitones] each — one of Google's Chirp 3 HD
// voices (its name alone; a pitch goes into the SSML) or an older one (Neural2-B …; a pitch Google sets itself). A line they
// say (opt.cast: who, opt.line: as written in events.js, its {漢字|かな} pinning the readings) is a clip under c/, named by the
// voice, the rate, the pitch and the SSML; the generator makes one for every line the talks can read (talkLines). Not made
// yet: the device's voice reads it, a man's or a woman's as theirs ----
const CAST_VOICE = {
  hero: ['Aoede', 1], koharu: ['Leda', 1.04], mugi: ['Neural2-D', 1.1, 6], granny: ['Sulafat', 0.9],
  kenta: ['Achird', 1], miku: ['Leda', 1.08], hina: ['Laomedeia', 1.02], kazuko: ['Gacrux', 0.95], lin: ['Despina', 1],
  tome: ['Pulcherrima', 1.04], go: ['Alnilam', 0.97], teppei: ['Algenib', 1], nagisa: ['Algieba', 0.94], taro: ['Puck', 1.06],
  harada: ['Iapetus', 1], kobayashi: ['Orus', 1], matsu: ['Callirrhoe', 0.92], genzo: ['Enceladus', 0.9], misaki: ['Vindemiatrix', 1],
  nakamura: ['Schedar', 1], kenji: ['Zubenelgenubi', 1], suzuki: ['Rasalgethi', 1.02], alex: ['Umbriel', 1], chihaya: ['Achernar', 0.96],
  tatsu: ['Sadachbia', 1.06], takahashi: ['Sadaltager', 0.95], sophia: ['Zephyr', 1], nishimura: ['Kore', 1.04], sano: ['Charon', 1]
};
// ムギ (2026-11-12, the user, by ear): a boy's voice pitched up, a mascot's — a grown man saying ワン, or a real bark beside a
// plain voice, broke the spell; her lines open with ワン！ and no longer end in it (events.js 42)
// voices to try for someone before theirs changes (試聽角色聲音 lists them under their row): { who: [[voice, rate, pitch, what
// it is]] }. None now: 小春 (2026-11-12, the user: she sounded a little old) took Leda, with 美玖 — two sharing a voice is fine
const CAST_TRY = {};
const OLD_VOICE = /^(Neural2|Wavenet|Standard)-/;
const CAST_WOMEN = new Set(['Achernar', 'Aoede', 'Autonoe', 'Callirrhoe', 'Despina', 'Erinome', 'Gacrux', 'Kore', 'Laomedeia', 'Leda', 'Pulcherrima', 'Sulafat', 'Vindemiatrix', 'Zephyr', 'Neural2-B', 'Wavenet-A', 'Wavenet-B', 'Standard-A', 'Standard-B']);
const castOf = (opt) => opt.voice || CAST_VOICE[opt.cast];   // a voice being tried, else theirs
const voiceGender = (v) => (CAST_WOMEN.has(v[0]) ? 'f' : 'm');
const castGender = (who) => (CAST_VOICE[who] ? voiceGender(CAST_VOICE[who]) : '');
const castVoiceName = (v) => (OLD_VOICE.test(v[0]) ? `ja-JP-${v[0]}` : `ja-JP-Chirp3-HD-${v[0]}`);
const CAST_MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g;
// a line to read: stage directions （…） out, the beginners' spaces between words closed up, its marks kept
const castLine = (line) => ttsText(line).replace(/([^\x00-\x7f]|\}) (?=[^\x00-\x7f]|\{)/g, '$1');
function castSsml(line, v) {
  const body = castLine(line).split(/(\{[^}]+\})/).map((p) => { const m = /^\{([^|}]+)\|([^|}]+)/.exec(p); return m ? `<sub alias="${esc(m[2])}">${esc(m[1])}</sub>` : esc(p); }).join('');
  return '<speak>' + (v && v[2] && !OLD_VOICE.test(v[0]) ? `<prosody pitch="+${v[2]}st">${body}</prosody>` : body) + '</speak>';
}
const castSays = (line) => /[\p{L}\p{N}]/u.test(castLine(line).replace(CAST_MARK, '$1'));   // anything to read: 佐野's 「…………。」 is a silence
function speakAs(who, line) {   // someone's line in their own voice (anyone else's: as any line)
  const text = castLine(line).replace(CAST_MARK, '$1');
  if (!castSays(line)) return Promise.resolve();
  if (!CAST_VOICE[who]) return speak(text);
  stopSpeaking();
  return speakLine(text, castGender(who), speechToken, { cast: who, line });
}
async function cloudAudioPath(text, gender, opt = {}) {
  if (opt.cast) {
    const v = castOf(opt), buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${CLOUD_AUDIO.set}|c|${v[0]}|${v[1]}${v[2] ? '|' + v[2] : ''}|${castSsml(opt.line, v)}`));
    return `c/${[...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')}.mp3`;
  }
  const g = opt.lang === 'zh' ? 'zh' : gender === 'm' ? 'm' : 'f';
  const input = g === 'zh' ? String(text) : cloudAudioSsml(text, opt);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${CLOUD_AUDIO.set}|${g}|${input}`));
  return `${g}/${[...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')}.mp3`;
}
function cloudMissList() { try { return JSON.parse(localStorage.getItem('nq_audio_miss') || '[]'); } catch (e) { return []; } }
function noteCloudMiss(text, gender, opt = {}) {
  try {
    const list = cloudMissList(); const reading = opt.reading || '';
    if (list.some(m => m.text === text && m.gender === (gender || '') && (m.reading || '') === reading)) return;
    list.push({ text, gender: gender || '', reading }); localStorage.setItem('nq_audio_miss', JSON.stringify(list.slice(-2000)));
  } catch (e) { /* ignore */ }
}
// a listening script: one line per speaker, 「男：」 lines in the male voice (shared by the player and the generator)
function scriptParts(script) {
  return String(script || '').split(/\n+/).map(l => l.trim()).filter(Boolean).map(line => {
    const m = /^([^：:]{1,6})[：:]\s*(.+)$/.exec(line);
    const who = m ? m[1] : '';
    return { gender: /男/.test(who) ? 'm' : (/女/.test(who) ? 'f' : ''), text: ttsText(m ? m[2] : line) };
  }).filter(p => p.text);
}

// Text that should be read aloud: readings resolved (来[こ]ない → こない), markup and blanks removed
// Readings we are sure of (the furigana dictionary, bracket readings, counters) applied to a sentence for speech.
// readingSegments → ['机' → つくえ, 'の', '上' → うえ …]; kanaReadings swaps them for kana (engines without SSML);
// ssmlReadings keeps the kanji for the model's prosody and pins the pronunciation with <sub alias>.
const UNESC = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
function unesc(s) { return String(s || '').replace(/&(amp|lt|gt|quot|#39);/g, (m) => UNESC[m]); }
function readingSegments(text) {
  const html = furi(text);
  const raw = []; const re = /<ruby[^>]*>([^<]+)<rt>([^<]+)<\/rt><\/ruby>|<[^>]+>|([^<]+)/g; let m;
  while ((m = re.exec(html))) { if (m[1] !== undefined) raw.push({ k: unesc(m[1]), r: unesc(m[2]) }); else if (m[3]) raw.push(unesc(m[3])); }
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    if (typeof cur === 'object') {
      if (i + 2 < raw.length && typeof raw[i + 1] === 'string' && typeof raw[i + 2] === 'object') {
        const combined = cur.k + raw[i + 1] + raw[i + 2].k;
        const dictR = FURI.get(combined);
        if (dictR) { out.push({ k: combined, r: dictR }); i += 2; continue; }
      }
      const prev = out[out.length - 1];
      if (typeof prev === 'string' && /[0-9]$/.test(prev) && (cur.k === '万円' || cur.k === '万')) {
        out[out.length - 1] = prev + cur.k;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}
function kanaReadings(text) { return readingSegments(text).map(x => typeof x === 'string' ? x : x.r).join(''); }
function ssmlReadings(text) { return '<speak>' + readingSegments(text).map(x => typeof x === 'string' ? esc(x) : `<sub alias="${esc(x.r)}">${esc(x.k)}</sub>`).join('') + '</speak>'; }
function ttsText(s) {
  return jaKana(String(s || ''))
    .replace(/<[^>]+>/g, '')
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .replace(/[＿★]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MALE_VOICE = /keita|ichiro|otoya|hattori|takumi|daichi|naoki|shota|male|男/i;
function jaVoices() {
  if (!('speechSynthesis' in window)) return [];
  const score = (v) => {
    const n = (v.name || '').toLowerCase();
    let s = 0;
    if (n.includes('natural') || n.includes('online')) s += 100;
    if (n.includes('nanami') || n.includes('keita')) s += 80;
    if (n.includes('google')) s += 70;
    if (n.includes('premium') || n.includes('enhanced') || n.includes('siri')) s += 60;
    if (n.includes('kyoko') || n.includes('otoya') || n.includes('o-ren') || n.includes('hattori')) s += 40;
    if (!v.localService) s += 20;
    return s;
  };
  return (window.speechSynthesis.getVoices() || []).filter(v => /^ja/i.test(v.lang || '')).sort((a, b) => score(b) - score(a));
}
function pickVoice(gender) {
  const all = jaVoices();
  if (!all.length) return null;
  const cfg = ttsConfig();
  const chosen = cfg.browserVoiceURI ? all.find(v => v.voiceURI === cfg.browserVoiceURI) : null;
  if (gender === 'm') return all.find(v => MALE_VOICE.test(v.name)) || chosen || all[0];
  if (gender === 'f') return (chosen && !MALE_VOICE.test(chosen.name) ? chosen : all.find(v => !MALE_VOICE.test(v.name))) || all[0];
  return chosen || all[0];
}

let speechToken = 0;
let currentAudio = null;
let lastCancelAt = 0;
let ttsWarned = false;
const audioCache = new Map();
const audioPending = new Map();   // cache key -> in-flight fetch, so a prefetch and the playback never fetch the same line twice
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let speechRateOverride = 0;   // 聽一輪 sets its own speed while it runs; 0 = the setting
function speechRate() { return speechRateOverride || state.settings.speechRate || 1; }
// Chinese (meanings, translations) through the device's own zh voice; without one the caller just gets a pause
function zhVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = window.speechSynthesis.getVoices().filter(v => /^zh|^cmn/i.test(v.lang || ''));
  const rank = (v) => (/TW|Hant|HK/i.test(v.lang) ? 0 : 1) + (v.localService ? 0 : 0.5);
  return vs.sort((a, b) => rank(a) - rank(b))[0] || null;
}
async function speakZh(text) {
  if (!text) return;
  if (ttsConfig().engine === 'cloud') {
    try {
      stopSpeaking(); const token = speechToken;
      const blob = await engineBlob(String(text), '', { lang: 'zh' });
      if (blob && token === speechToken) {
        const url = URL.createObjectURL(blob);
        const ok = await playUrl(url, token, speechRate());
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (ok) return true;
        if (playRefused && document.hidden) return false;
      }
    } catch (e) { /* the device voice reads it */ }
  }
  await speakZhBrowser(text);
}
function speakZhBrowser(text) {
  return new Promise(resolve => {
    const voice = zhVoice();
    if (!voice || !text) { setTimeout(resolve, 1200); return; }
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = voice.lang; u.voice = voice; u.rate = speechRate();
    let done = false; const fin = () => { if (done) return; done = true; liveUtterances.delete(u); resolve(); };
    u.onend = fin; u.onerror = fin; setTimeout(fin, 2500 + String(text).length * 300);
    liveUtterances.add(u);
    try { window.speechSynthesis.speak(u); } catch (e) { fin(); }
  });
}

// One <audio> element for every synthesized clip. iOS Safari only lets an element play without a user gesture
// once that same element was started by one, so a fresh `new Audio()` after a network fetch is refused and the
// line falls silent. The shared player is unlocked by the first tap/click with a 10 ms silent clip.
const SILENT_WAV = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
let ttsPlayer = null;
let ttsPlayerUnlocked = false;
function getTtsPlayer() {
  if (!ttsPlayer) {
    ttsPlayer = document.createElement('audio');
    ttsPlayer.setAttribute('playsinline', '');
    ttsPlayer.preload = 'auto';
    ttsPlayer.style.display = 'none';
    document.body.appendChild(ttsPlayer);
  }
  return ttsPlayer;
}
function unlockTtsPlayer() {
  if (ttsPlayerUnlocked) return;
  const a = getTtsPlayer();
  if (a.src && !a.paused) return;   // a real clip is already playing from this gesture
  ttsPlayerUnlocked = true;
  try {
    a.src = SILENT_WAV;
    const p = a.play();
    if (p && p.catch) p.catch(() => { ttsPlayerUnlocked = false; });
  } catch (e) { ttsPlayerUnlocked = false; }
}

// 1.0.50: the answer's sound, synthesized (no clip to fetch, so it plays offline too). Right: two notes up, a semitone higher
// for each answer of a run (up to five); three when the item reaches 熟悉 or 已熟練. Wrong: one quieter note sliding down.
// Triangle waves: a phone speaker drops most of a pure low tone. Returns its length in ms, 0 when nothing played.
let sfxCtx = null;
function audioCtx() {   // the one Web Audio context (answer sounds and 環境音), made and woken (inside a tap, a sound played later is let through on iOS)
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    if (!sfxCtx) sfxCtx = new AC();
    if (sfxCtx.state !== 'running') sfxCtx.resume().catch(() => {});   // iOS also leaves it 'interrupted' after a call
    return sfxCtx;
  } catch (e) { return null; }
}
function sfxReady() { return state.settings.sfx ? audioCtx() : null; }   // the answer sounds' context; null: off
function playSfx(kind, step = 0) {
  if (!sfxReady()) return 0;
  try {
    const t0 = sfxCtx.currentTime + 0.02, k = Math.pow(2, clamp(step, 0, 5) / 12);
    const notes = kind === 'bad' ? [[311, 0, 0.22, 0.09, 233]]   // [Hz, start s, length s, volume, slide to Hz]
      : kind === 'coin' ? [[1319 * Math.pow(2, clamp(step, 0, 12) / 12), 0, 0.1, 0.06]]   // a 言靈 into its button (1.2.2): a short 叮, a semitone up each
      : kind === 'fanfare' ? [[523, 0, 0.12, 0.09], [659, 0.1, 0.12, 0.09], [784, 0.2, 0.12, 0.09], [1047, 0.3, 0.45, 0.1]]   // 全對 or the day's list done (2026-11-10): do-mi-sol-do
      : (kind === 'up' ? [659, 831, 988] : [659, 988]).map((f, i, all) => [f * k, i * 0.075, i === all.length - 1 ? 0.28 : 0.12, 0.12]);
    notes.forEach(([f, at, len, vol, to]) => {
      const o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t0 + at);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + at + len);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      o.connect(g); g.connect(sfxCtx.destination);
      o.start(t0 + at); o.stop(t0 + at + len + 0.02);
    });
    const [, at, len] = notes[notes.length - 1];
    return Math.round((at + len) * 1000) + 40;
  } catch (e) { return 0; }
}

function stopSpeaking() {
  speechToken++;
  try {
    if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      window.speechSynthesis.cancel();
      lastCancelAt = Date.now();
    }
  } catch (e) { /* ignore */ }
  if (currentAudio) { try { if (!currentAudio.dataset.silent) currentAudio.pause(); } catch (e) { /* ignore */ } currentAudio = null; }   // silence stays: the next clip replaces it, a pause cuts it with stopSilence()
}
function stopSilence() { const a = ttsPlayer; if (a && a.dataset.silent) { try { a.pause(); } catch (e) { /* ignore */ } } }

async function speakBrowser(text, gender, token) {
  if (!('speechSynthesis' in window)) {
    if (!ttsWarned) { toast('這個瀏覽器不支援語音朗讀。'); ttsWarned = true; }
    return;
  }
  // Chrome sometimes drops an utterance queued right after cancel()
  const wait = 60 - (Date.now() - lastCancelAt);
  if (wait > 0) await sleep(wait);
  if (token !== speechToken) return;
  // Browsers (Chrome, iOS Safari) sometimes swallow an utterance without any event when speak() lands while the
  // previous one is winding down, and sometimes never fire onend. Each line is therefore watched: a line that never
  // starts is spoken again once, and a line only counts as finished when the synthesizer is really idle, so the next
  // line is never queued on top of it (the usual way the last option of a listening question got lost).
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = await speakUtterance(text, gender, token);
    if (started || token !== speechToken) return;
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    lastCancelAt = Date.now();
    await sleep(120);
    if (token !== speechToken) return;
  }
}
const liveUtterances = new Set(); // keeps utterances reachable: a garbage-collected one never fires onend
function speakUtterance(text, gender, token) {
  const synth = window.speechSynthesis;
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = speechRate();
    const voice = pickVoice(gender);
    if (voice) u.voice = voice;
    // when only one voice exists, a pitch change keeps the two speakers apart
    u.pitch = gender === 'm' && !(voice && MALE_VOICE.test(voice.name)) ? 0.8 : (gender === 'f' ? 1.08 : 1);
    let began = false, finished = false, timer = null;
    const finish = (ok) => { if (finished) return; finished = true; clearTimeout(timer); liveUtterances.delete(u); resolve(ok); };
    u.onstart = () => { began = true; };
    u.onend = () => finish(true);
    u.onerror = () => finish(true);
    const busy = () => { try { return Boolean(synth.speaking || synth.pending); } catch (e) { return false; } };
    const estimate = 2500 + text.length * 350 / (u.rate || 1);
    const deadline = Date.now() + estimate;
    const hardStop = deadline + 20000;
    const watch = () => {
      if (finished) return;
      if (token !== speechToken) { finish(true); return; }
      if (!began && !busy()) { finish(false); return; }                        // swallowed: nothing is playing and it never started
      if (Date.now() >= deadline && (!busy() || Date.now() >= hardStop)) { finish(true); return; }   // onend was lost; wait until idle
      timer = setTimeout(watch, 250);
    };
    liveUtterances.add(u);
    synth.speak(u);
    timer = setTimeout(watch, 1200);
  });
}

function engineBlob(text, gender, opt = {}) {
  const cfg = ttsConfig();
  const rate = speechRate();
  const pin = (opt.reading ? `|r:${opt.reading}` : '') + (opt.cast ? `|c:${opt.cast}` : '');   // a townsperson's line: theirs
  const ck = cfg.engine === 'cloud' ? `cl|${opt.lang === 'zh' ? 'zh' : gender === 'm' ? 'm' : 'f'}|${text}`
    : cfg.engine === 'deepgram' ? `dg|${gender === 'm' ? cfg.deepgramVoiceM : cfg.deepgramVoice}|${cfg.kanaReadings}|${text}`
    : cfg.engine === 'google_tts' ? `gg|${gender === 'm' ? cfg.googleVoiceM : cfg.googleVoice}|${rate}|${text}`
    : cfg.engine === 'voicevox' ? `vv|${gender === 'm' ? cfg.voicevoxSpeakerM : cfg.voicevoxSpeaker}|${rate}|${text}`
    : cfg.engine === 'openai_tts' ? `oa|${cfg.openaiModel}|${gender === 'm' ? cfg.openaiVoiceM : cfg.openaiVoice}|${rate}|${text}` : '';
  if (!ck) return Promise.resolve(null);
  const key = ck + pin;
  if (audioCache.has(key)) return Promise.resolve(audioCache.get(key));
  if (audioPending.has(key)) return audioPending.get(key);
  const p = fetchEngineBlob(cfg, text, gender, opt).then(blob => {
    if (audioCache.has(key)) audioCache.delete(key);
    else if (audioCache.size >= 60) audioCache.delete(audioCache.keys().next().value);
    audioCache.set(key, blob);
    return blob;
  }).finally(() => audioPending.delete(key));
  audioPending.set(key, p);
  return p;
}
// the provider's own message (Google: error.message; Deepgram: err_msg; OpenAI: error.message), for 測試連線
async function errorDetail(resp) {
  try { const j = await resp.json(); const m = (j && j.error && (j.error.message || j.error)) || (j && (j.err_msg || j.message)); return m ? `：${typeof m === 'string' ? m : JSON.stringify(m)}` : ''; } catch (e) { return ''; }
}
// Turn a provider error into advice the learner can act on
function ttsErrorHint(msg) {
  const m = String(msg || '');
  if (/not been used|is disabled|SERVICE_DISABLED/i.test(m)) return '這個專案尚未啟用 Cloud Text-to-Speech API：到 Google Cloud 的「API 和服務 › 程式庫」搜尋並啟用，再等一兩分鐘。';
  if (/API keys are not supported/i.test(m)) return '這把金鑰不能用在 Google 的語音服務：AI Studio（Gemini）給的金鑰不行，請改用 Google Cloud Console › API 和服務 › 憑證 裡、生成音檔一直在用的那把。';
  if (/API key not valid|API_KEY_INVALID|invalid api key|Unauthorized|401/i.test(m)) return '金鑰無效：確認貼上的是完整的金鑰、前後沒有空白，而且是同一個專案建立的。';
  if (/referer|referrer|HTTP referrers/i.test(m)) return `金鑰的「網站」限制不符：限制要寫成 ${location.origin}/*，改完要等幾分鐘生效。`;
  if (/billing|BILLING/i.test(m)) return '專案還沒連結帳單帳戶：到 Google Cloud 的「帳單」把這個專案連結上去（免費額度內不會扣款）。';
  if (/PERMISSION_DENIED|403/i.test(m)) return '被拒絕：通常是 API 未啟用、金鑰的 API 限制沒勾 Text-to-Speech、或帳單未連結。';
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(m)) return '超過配額或請求太頻繁，稍後再試。';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return '連不到服務：檢查網路，或瀏覽器的內容阻擋（Brave Shields）是否擋了這個網址。';
  return '';
}
async function fetchEngineBlob(cfg, text, gender, opt = {}) {
  const rate = opt.rate || speechRate();
  // sentences: engines without SSML get known readings as kana; a single word keeps its written form (see speak)
  const spoken = opt.reading || cfg.kanaReadings === 'off' ? text : kanaReadings(text);
  const ssml = cloudAudioSsml(text, opt);
  if (cfg.engine === 'cloud') {
    let path = await cloudAudioPath(text, gender, opt);
    if (cloudMisses.has(path)) return null;
    let { resp } = await fetchCloudClip(path);
    if (!resp.ok && opt.reading && opt.reading !== text) {
      const fallbackPath = await cloudAudioPath(opt.reading, gender);
      if (!cloudMisses.has(fallbackPath)) {
        try {
          const fb = await fetchCloudClip(fallbackPath);
          if (fb && fb.resp && fb.resp.ok) { resp = fb.resp; path = fallbackPath; }
        } catch (e) { /* ignore */ }
      }
    }
    const miss = () => { cloudMisses.add(path); if (!opt.cast) noteCloudMiss(text, gender, opt); return null; };   // a townsperson's line: the generator makes them all anyway
    if (!resp.ok) return miss();   // not generated: the browser voice reads it
    const blob = await resp.blob();
    if (blob.size <= 2500) return miss();
    return blob;
  }
  if (cfg.engine === 'google_tts') {
    const key = (cfg.googleKey || '').trim();
    if (!key) throw new Error('沒有 Google Cloud API Key');
    const cv = opt.cast && castOf(opt), name = cv ? castVoiceName(cv) : gender === 'm' ? cfg.googleVoiceM : cfg.googleVoice;
    const req = opt.lang === 'zh' ? { input: { text: String(text) }, voice: CLOUD_ZH_VOICE } : { input: opt.plain ? { text: opt.plain } : { ssml: cv ? castSsml(opt.line, cv) : ssml }, voice: { languageCode: 'ja-JP', name } };   // plain: the generator's retry of a silent clip
    const resp = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(req, { audioConfig: Object.assign({ audioEncoding: 'MP3', speakingRate: cv ? cv[1] : rate }, cv && cv[2] && OLD_VOICE.test(cv[0]) ? { pitch: cv[2] } : {}) }))
    });
    if (!resp.ok) throw new Error(`Google TTS HTTP ${resp.status}${await errorDetail(resp)}`);
    const j = await resp.json();
    const bin = atob(j.audioContent || ''); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: 'audio/mpeg' });
  }
  if (cfg.engine === 'deepgram') {
    if (!cfg.deepgramKey) throw new Error('沒有 Deepgram API Key');
    const model = gender === 'm' ? cfg.deepgramVoiceM : cfg.deepgramVoice;
    const resp = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Token ${cfg.deepgramKey.trim()}` }, body: JSON.stringify({ text: spoken })
    });
    if (!resp.ok) throw new Error(`Deepgram HTTP ${resp.status}${await errorDetail(resp)}`);
    return resp.blob();
  }
  if (cfg.engine === 'voicevox') {
    const base = String(cfg.voicevoxUrl || TTS_DEFAULT.voicevoxUrl).replace(/\/+$/, '');
    const host = /^https?:/.test(base) ? base : `http://${base}`;
    const speaker = gender === 'm' ? cfg.voicevoxSpeakerM : cfg.voicevoxSpeaker;
    const q = await fetch(`${host}/audio_query?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(speaker)}`, { method: 'POST' });
    if (!q.ok) throw new Error(`VOICEVOX HTTP ${q.status}`);
    const query = await q.json();
    query.speedScale = rate;
    const s = await fetch(`${host}/synthesis?speaker=${encodeURIComponent(speaker)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) });
    if (!s.ok) throw new Error(`VOICEVOX HTTP ${s.status}`);
    return s.blob();
  }
  if (cfg.engine === 'openai_tts') {
    const key = (cfg.openaiKey || '').trim();
    if (!key) throw new Error('沒有 OpenAI API Key');
    const voice = gender === 'm' ? cfg.openaiVoiceM : cfg.openaiVoice;
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: cfg.openaiModel || 'tts-1-hd', voice, input: spoken, speed: rate })
    });
    if (!resp.ok) throw new Error(`OpenAI TTS HTTP ${resp.status}${await errorDetail(resp)}`);
    return resp.blob();
  }
  return null;
}

function playUrl(url, token, rate = 1) {
  return new Promise(resolve => {
    if (token !== speechToken) { resolve(true); return; }
    const a = getTtsPlayer();
    let finished = false, started = false, timer = null;
    const onTime = () => { if (token === SPEECH_PROG.token && isFinite(a.duration) && a.duration > 0) SPEECH_PROG.real = Math.min(1, a.currentTime / a.duration); };   // real progress for the bar
    const onEnded = () => done(true), onError = () => done(false, 'error'), onPlaying = () => { started = true; };
    // a clip that never starts (refused play, stalled decode) or never reports `ended` must not stall the whole script
    const onMeta = () => {
      if (finished || !isFinite(a.duration)) return;
      clearTimeout(timer);
      timer = setTimeout(() => done(started, started ? '' : 'never started'), a.duration / (rate || 1) * 1000 + 4000);
    };
    // only its own handlers come off: a late timer must not strip those of the clip or silence that followed
    const cleanup = () => { clearTimeout(timer); [['onended', onEnded], ['onerror', onError], ['onplaying', onPlaying], ['onloadedmetadata', onMeta], ['ontimeupdate', onTime]].forEach(([k, f]) => { if (a[k] === f) a[k] = null; }); };
    const done = (ok, why) => { if (finished) return; finished = true; cleanup(); if (!ok && why) console.warn('audio playback failed:', why); resolve(ok); };
    a.ontimeupdate = onTime; a.onended = onEnded; a.onerror = onError; a.onplaying = onPlaying; a.onloadedmetadata = onMeta;
    timer = setTimeout(() => { if (!started) done(false, 'never started'); }, 6000);
    playRefused = false;
    try { a.pause(); } catch (e) { /* ignore */ }
    a.src = url; a.loop = false; delete a.dataset.silent;
    a.playbackRate = rate;
    currentAudio = a;
    const p = a.play();
    if (p && p.catch) p.catch(e => { playRefused = !!e && e.name === 'NotAllowedError'; done(false, e && e.name); });
  });
}

// ---- Silence on the shared player. iOS keeps a hidden page's audio going only while the element is playing: once
// it goes idle (the screen was locked by hand), the next play() is refused and so is the browser voice. So the pauses
// between the lines of 聽一輪 are silent WAVs on the same element, and ▶ starts a looping second of silence inside the
// tap, so the line that follows (after its fetch) only swaps the source of a playing element.
const silenceUrls = new Map();
function silenceUrl(ms) {   // an 8 kHz 8-bit mono WAV of `ms` silence (8 bytes per ms)
  if (silenceUrls.has(ms)) return silenceUrls.get(ms);
  const n = Math.max(8, Math.round(ms * 8));
  const b = new Uint8Array(44 + n); const dv = new DataView(b.buffer);
  const tag = (o, t) => { for (let i = 0; i < 4; i++) b[o + i] = t.charCodeAt(i); };
  tag(0, 'RIFF'); dv.setUint32(4, 36 + n, true); tag(8, 'WAVE'); tag(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); tag(36, 'data'); dv.setUint32(40, n, true);
  b.fill(128, 44);
  const url = URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  silenceUrls.set(ms, url);
  return url;
}
let playRefused = false;   // the last clip's play() was refused (NotAllowedError): no gesture, or a page in the background
function playSilence(ms) {   // resolves when the silence ends or is cut; when it cannot play, after a plain wait instead
  if (!ttsPlayerUnlocked || ttsConfig().engine === 'browser_neural') return sleep(ms);
  return new Promise(resolve => {
    const a = getTtsPlayer();
    let finished = false, started = false, timer = null;
    const onEnded = () => done(), onPlaying = () => { started = true; }, onPause = () => { if (started) done(); };   // the pause the source swap itself queues comes before `playing`
    const cleanup = () => { clearTimeout(timer); if (a.onended === onEnded) a.onended = a.onerror = null; if (a.onpause === onPause) a.onpause = null; if (a.onplaying === onPlaying) a.onplaying = null; };   // only its own handlers: the clip that followed keeps its
    const done = () => { if (finished) return; finished = true; cleanup(); resolve(); };
    try { a.pause(); } catch (e) { /* ignore */ }
    a.src = silenceUrl(ms); a.loop = false; a.playbackRate = 1; a.dataset.silent = '1';
    a.onplaying = onPlaying; a.onended = a.onerror = onEnded; a.onpause = onPause;
    timer = setTimeout(done, ms + 1500);   // a lost `ended` must not stall the player
    currentAudio = a;
    const p = a.play();
    if (p && p.catch) p.catch(() => { if (finished) return; finished = true; cleanup(); delete a.dataset.silent; sleep(ms).then(resolve); });
  });
}
function primeTtsPlayer() {   // inside a tap: a looping second of silence keeps the element playing while the first line is fetched
  if (ttsConfig().engine === 'browser_neural') return;
  const a = getTtsPlayer();
  if (a.src && !a.paused && !a.ended && !a.dataset.silent) return;   // a real clip is already playing from this gesture
  ttsPlayerUnlocked = true;
  try {
    a.src = silenceUrl(1000); a.loop = true; a.playbackRate = 1; a.dataset.silent = '1';
    currentAudio = a;
    const p = a.play();
    if (p && p.catch) p.catch(() => { delete a.dataset.silent; });
  } catch (e) { /* ignore */ }
}

// a line read aloud: 環境音 and the gramophone down meanwhile (SND.duck)
async function speakLine(text, gender, token, opt) {
  SND.duck(true);
  try { return await speakLineNow(text, gender, token, opt); } finally { SND.duck(false); }
}
async function speakLineNow(text, gender, token, opt) {
  const cfg = ttsConfig();
  if (cfg.engine && cfg.engine !== 'browser_neural') {
    try {
      const blob = await engineBlob(text, gender, opt);
      if (token !== speechToken) return;
      if (blob) {
        const url = URL.createObjectURL(blob);
        const ok = await playUrl(url, token, cfg.engine === 'deepgram' || cfg.engine === 'cloud' ? (speechRate()) : 1);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (ok) return true;
        if (playRefused && document.hidden) return false;   // refused in the background (screen locked): the browser voice would be refused too, so the caller stops instead of skipping
      }
    } catch (e) {
      console.warn('TTS engine failed, using browser voice', e);
      if (!ttsWarned) { toast(cfg.engine === 'cloud' && navigator.onLine === false ? '離線中：這句的語音還沒存到這台裝置，先用內建語音。' : `${(TTS_ENGINES.find(x => x[0] === cfg.engine) || [, '語音服務'])[1]} 無法使用，暫時改用瀏覽器語音。`, 3600); ttsWarned = true; }
    }
  }
  if (token !== speechToken) return;
  await speakBrowser(text, gender, token);
}

// opt.reading: the exact reading of a single word. The word is sent in its written form (a lone kana string is
// read with odd pitch and segmentation) and the reading is pinned: SSML alias on Google, otherwise trusted to the model.
function speak(text, opt) {
  const t = ttsText(text);
  if (!t) return Promise.resolve();
  stopSpeaking();
  return speakLine(t, '', speechToken, opt);
}
function speakOpts(q, text) { return q && text && text === q.speakWord && q.speakReading ? { reading: q.speakReading } : undefined; }

// Listening scripts: one line per speaker, 「男：」 lines in a male voice when one is available
async function speakScript(script) {
  stopSpeaking();
  const token = speechToken;
  const parts = scriptParts(script);
  // external engines: fetch every line up front (Deepgram allows 15 in flight) so the options follow without
  // network gaps and the first clip starts as soon as possible after the tap that triggered it
  const cfg = ttsConfig();
  if (cfg.engine && cfg.engine !== 'browser_neural') parts.forEach(p => { engineBlob(p.text, p.gender).catch(() => {}); });
  speechProgStart(token, parts.length);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (token !== speechToken) return;
    speechProgLine(i, p.text, speechRate());
    await speakLine(p.text, p.gender, token);
    if (parts.length > 1) await sleep(280);
  }
  if (token === speechToken) speechProgEnd();
}

// ---- The clips an item can play, named the way the player names them: the generator (設定 › 資料 › 管理者) makes them
// all, 下載全部 fetches them all and 離線語音 fetches those of the items coming up ----
function audioCollector() {
  const seen = new Map();
  const add = (raw, gender = '', reading = '') => { const text = ttsText(raw); if (!text) return; const g = gender === 'm' ? 'm' : 'f'; const k = `${g}|${reading}|${text}`; if (!seen.has(k)) seen.set(k, { text, gender: g, reading }); };
  const addZh = (raw) => { const text = String(raw || '').replace(/\s+/g, ' ').trim(); if (!text) return; const k = `zh||${text}`; if (!seen.has(k)) seen.set(k, { text, gender: '', reading: '', lang: 'zh' }); };
  const addScript = (sc) => scriptParts(sc).forEach(p => add(p.text, p.gender));
  const addCast = (who, line) => { const text = castLine(line).replace(CAST_MARK, '$1'); if (!castSays(line) || !CAST_VOICE[who]) return; const k = `c|${who}|${line}`; if (!seen.has(k)) seen.set(k, { text, gender: castGender(who), reading: '', cast: who, line }); };
  const addQ = (q) => {
    if (!q) return;
    if (q.speakWord) add(q.speakWord, '', q.speakReading || '');
    if (q.fullJp) add(q.fullJp);
    if (q.audio) addScript(q.audio);
    if (q.kind === 'l' || q.audioOptions) (q.options || []).forEach(o => add(jaPlain(o.text)));   // listening replies are played per option
  };
  // one item: its Japanese clips and the Chinese ones 聽一輪 reads (meanings, translations, kanji glosses)
  const item = (x) => {
    if (x.kind === 'v') {
      const w = jaPlain(x.w); const pin = x.r && !HAS_KANJI.test(x.r) && x.r !== w ? x.r : '';
      add(w, '', pin); add(w); if (x.r) add(x.r);   // the question (reading pinned), the list button, the flashcard reading
      if (x.ex) add(exampleSpeech(x.ex, x)); if (x.ex2) add(exampleSpeech(x.ex2, x));   // as the example buttons speak them
      addZh(x.m); addZh(x.exZh); addZh(x.exZh2);
    } else if (x.kind === 'a') add(x.ch);   // a tapped kana in the 五十音表 and 聽音選字 play one kana
    else if (x.kind === 'g') {
      const fmts = (x.t || 'choice') === 'choice' && x.op ? grammarFormats(x) : [];
      (fmts.length ? fmts.map(f => makeGrammarQuestion(x, { forceFmt: f })) : [makeQuestion(x, {})]).forEach(addQ);
      addZh(x.zh);
    } else if (x.kind === 'k') {
      addQ(makeQuestion(x, {}));
      (x.ex || []).forEach(e => {
        const w = jaPlain(e[0]); const rd = e[1];
        const pin = rd && !HAS_KANJI.test(rd) && rd !== w ? rd : '';
        add(w, '', pin); add(w); if (rd) add(rd);
      });
      addZh(x.m);
      (x.ex || []).forEach(e => addZh(e[2]));
    }   // a reading question reads any of the example words
    else if (x.kind === 'l' || x.kind === 'r') addQ(makeQuestion(x, {}));
  };
  const lesson = (uid) => { const L = (DATA.LESSONS || {})[uid]; ((L && L.sections) || []).forEach(sec => (sec.ex || []).forEach(x => { if (x && x.jp) add(x.jp); })); };
  return { add, addScript, addCast, item, lesson, list: () => [...seen.values()] };
}
// every sentence the app can read aloud from built-in data
function cloudAudioTexts() {
  const c = audioCollector();
  [REG.vocab, REG.kana, REG.grammar, REG.kanji, REG.listen, REG.read].forEach(list => list.forEach(c.item));
  (DATA.EXAM || []).forEach(x => { if (x.speak) c.add(x.speak); if (x.script) c.addScript(x.script); if (x.line) c.addScript(x.line); if (/^S3/.test(String(x.m))) { if (x.q) c.add(x.q); (x.op || []).forEach(o => c.add(o)); } });
  Object.keys(DATA.LESSONS || {}).forEach(c.lesson);
  talkLines().forEach(([who, line]) => c.addCast(who, line));   // the townsfolk, each in their own voice
  cloudMissList().forEach(m => c.add(m.text, m.gender, m.reading || ''));
  return c.list();
}
const clipOpt = (x) => ({ reading: x.reading || '', lang: x.lang || '', cast: x.cast, line: x.line, voice: x.voice });   // a listed clip as the player asks for it
// the distinct file paths of a clip list, hashed a slice at a time so the page stays responsive
async function clipPaths(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 200) out.push(...await Promise.all(list.slice(i, i + 200).map(x => cloudAudioPath(x.text, x.gender, clipOpt(x)))));
  return [...new Set(out)];
}
// Fetch into the service worker's clip cache (sw.js AUDIO_CACHE) the clips of `paths` it lacks, `workers` at a time. `run`
// counts have/done/missing/failed; `run.stop` ends it early, and a lost network (or a full disk) sets it.
async function fillAudioCache(paths, run, workers) {
  const cache = await caches.open('nq-audio');
  const bases = cloudAudioBases();
  // one lookup per clip and address: Chrome refuses cache.keys() once the cache holds about 17,500 clips (both 下載全部
  // buttons); a clip is filed under the address it came from, the Supabase one for every clip cached before 1.0.29, and
  // found by the address alone (R2 answers "Vary: Origin")
  const stored = async (p) => { for (const base of bases) if (await cache.match(`${base}/${p}`, { ignoreVary: true })) return true; return false; };
  const todo = []; let have = 0;
  for (let j = 0; j < paths.length && !run.stop; j += 50) {
    const chunk = paths.slice(j, j + 50);
    (await Promise.all(chunk.map(stored))).forEach((hit, k) => { if (hit) have++; else todo.push(chunk[k]); });
  }
  run.total = paths.length; run.have = have;
  if (run.onProgress) run.onProgress();
  let i = 0;
  const worker = async () => {
    while (i < todo.length && !run.stop) {
      const p = todo[i++];
      try {
        const { resp: r, url } = await fetchCloudClip(p);
        const cl = parseInt((r.headers && r.headers.get('content-length')) || '0', 10);
        if (r.ok && cl > 2500) { await cache.put(url, r); run.done++; }
        else if (r.status === 400 || r.status === 404 || (r.ok && cl <= 2500)) { run.missing++; cloudMisses.add(p); }   // not generated yet: the player goes straight to the device voice
        else run.failed++;
      } catch (e) { run.failed++; if (e && (e.name === 'TypeError' || e.name === 'QuotaExceededError')) run.stop = true; }   // a rejected fetch is a TypeError in every browser
      if (run.onProgress && (run.done + run.missing + run.failed) % 20 === 0) run.onProgress();
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
}
// ---- 下載全部音檔: every clip into the service worker's audio cache, for learners who want the whole course offline ----
let CLOUD_DL = null;
function cloudDlHtml() {
  const d = CLOUD_DL; if (!d) return '';
  const bad = d.failed + d.missing; const left = Math.max(0, d.total - d.have - d.done - bad);
  return `<div><b>${d.kind === 'zh' ? '中文' : '日文'}：${esc(d.phase)}</b>${d.total ? `・共 ${d.total} 段，已在裝置上 ${d.have}，這次下載 ${d.done}${bad ? `，失敗 ${bad}` : ''}，剩 ${left}` : ''}</div>`;
}
function cloudDlRender() { const box = document.getElementById('cloudDlBox'); if (box) box.innerHTML = cloudDlHtml(); }
async function cloudDownloadAll(kind = 'ja') {   // 'ja': the Japanese clips (~220 MB); 'zh': the Chinese meanings and translations (~120 MB)
  if (CLOUD_DL && CLOUD_DL.running) return;
  if (!window.caches) { toast('這個瀏覽器不支援離線快取。'); return; }
  CLOUD_DL = { running: true, stop: false, kind, phase: '整理清單', total: 0, have: 0, done: 0, failed: 0, missing: 0, onProgress: cloudDlRender };
  cloudDlRender();
  try {
    const paths = await clipPaths(cloudAudioTexts().filter(x => (x.lang === 'zh') === (kind === 'zh')));
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* ignore */ }
    CLOUD_DL.phase = '下載中';
    await fillAudioCache(paths, CLOUD_DL, 6);
    CLOUD_DL.phase = CLOUD_DL.stop ? '已停止（再按會接著下載）' : (CLOUD_DL.failed || CLOUD_DL.missing ? '完成（有些句子雲端還沒有）' : '完成，全部音檔都在裝置上了');
  } catch (e) { CLOUD_DL.phase = `失敗：${(e && e.message) || e}`; }
  CLOUD_DL.running = false;
  cloudDlRender();
}
// ---- 離線語音: the installed app keeps on this device the Japanese clips of today's practice (the reviews due today and
// today's new items), so it works offline; whatever was played stays anyway. Only what is missing is fetched, six at a
// time (a clip the CDN has not cached yet takes about half a second), so it is done within a minute or so and nobody
// waits for it. A page in a browser tab does not do this: there clips are fetched as they are played. ----
const AUDIO_PREFETCH = { running: false, again: false, timer: null, at: 0, stop: false, broken: false, total: 0, have: 0, done: 0, missing: 0, failed: 0, onProgress: () => audioPrefetchRender() };
function audioPrefetchItems() {
  const p = dailyPlan();
  const today = PLAN_LISTS.filter(n => !/^(due|new)[CR]$/.test(n)).flatMap(n => p[n] || []);   // drills and reading passages have no clips
  return [...new Map(today.filter(x => x.builtin).map(x => [x.key, x])).values()];   // AI questions have no clips on the server
}
async function audioPrefetchTexts() {
  const c = audioCollector(); let t0 = performance.now();
  for (const x of audioPrefetchItems()) { c.item(x); if (performance.now() - t0 > 20) { await sleep(0); t0 = performance.now(); } }   // in short slices: a grammar item's questions take a few ms to build
  return c.list().filter(x => x.lang !== 'zh');   // practice speaks Japanese; 聽一輪's Chinese stays once played
}
async function audioPrefetch() {
  const run = AUDIO_PREFETCH;
  if (run.running) { run.again = true; return; }
  if (ttsConfig().engine !== 'cloud' || !window.caches || navigator.onLine === false) return;   // offline: the `online` event brings it back
  Object.assign(run, { running: true, again: false, stop: false, broken: false, total: 0, have: 0, done: 0, missing: 0, failed: 0 });
  audioPrefetchRender();
  try {
    const paths = (await clipPaths(await audioPrefetchTexts())).filter(p => !cloudMisses.has(p));   // a clip found missing this session is not asked for again
    await fillAudioCache(paths, run, 6);
  } catch (e) { run.broken = true; console.warn('offline audio prefetch failed', e); }
  run.running = false; run.at = Date.now();
  audioPrefetchRender();
  if (run.again) { run.again = false; audioPrefetchSoon(); }
}
function audioPrefetchSoon(ms = 4000) {
  if (AUDIO_PREFETCH.timer || !installInfo().standalone) return;
  AUDIO_PREFETCH.timer = setTimeout(() => { AUDIO_PREFETCH.timer = null; audioPrefetch(); }, ms);
}
function audioPrefetchHtml() {
  const r = AUDIO_PREFETCH;
  if (!r.running && !r.at) return installInfo().standalone ? '' : '加到主畫面當 app 用，才會自動先存今天要練的語音。';
  const stored = r.have + r.done; const want = r.total - r.missing;
  if (r.running) return r.total ? `離線語音：正在存今天要練的 ${stored}／${want} 段` : '離線語音：整理中…';
  if (r.broken) return '離線語音：這次沒存成，有網路時會再試';
  if (stored < want) return `離線語音：今天要練的已存 ${stored}／${want} 段，有網路時會接著存`;
  return want ? `離線語音：今天要練的 ${stored} 段都存好了` : '離線語音：今天要練的都存好了';
}
function audioPrefetchRender() { const box = document.getElementById('audioPrefetchBox'); if (box) box.innerHTML = audioPrefetchHtml(); }
let CLOUD_GEN = null;
function cloudGenHtml() {
  const g = CLOUD_GEN; if (!g) return '';
  const n = g.done + g.failed; const left = Math.max(0, g.total - g.skipped - n);
  return `<div><b>${esc(g.phase)}</b>${g.total ? `・共 ${g.total} 段，已有 ${g.skipped}，這次上傳 ${g.done}，失敗 ${g.failed}，剩 ${left}` : ''}</div>
    ${g.notes.length ? `<div class="hint mt-1">${g.notes.map(esc).join('<br>')}</div>` : ''}
    ${g.errors.length ? `<div class="bad mt-1">${g.errors.map(esc).join('<br>')}</div>` : ''}`;
}
// Google's voice now and then gives a near-silent clip for one exact SSML (m31-44 「…思いきり遊んだ。」, every run since 1.0.33),
// while the other sentences with the same pieces speak. Before giving up the sentence goes once as plain text (Google's own
// readings) and once as kana; a pinned word goes as its reading only, since its kanji could be read another way. The clip keeps
// the SSML's file name, so players find it.
async function cloudGenBlob(cfg, x) {
  const opt = Object.assign({ rate: 1 }, clipOpt(x));
  const silent = (blob) => !blob || blob.size <= 2500;
  let blob;
  try { blob = await fetchEngineBlob(cfg, x.text, x.gender, opt); }
  catch (e) {   // a townsperson's voice refusing the SSML (Chirp 3 HD's is a preview): their line as plain text, Google's own readings
    if (!x.cast || !/HTTP 400/.test(e.message) || /voice|API key/i.test(e.message)) throw e;
    blob = await fetchEngineBlob(cfg, x.text, x.gender, Object.assign({}, opt, { plain: x.text }));
    if (!silent(blob)) return { blob, note: `${x.text.slice(0, 24)}：${x.cast} 的聲音不收 SSML，改用沒指定讀音的版本` };
  }
  if (!silent(blob) || opt.lang === 'zh') return { blob };
  const kana = kanaReadings(x.text);
  const tries = x.reading ? [[x.reading, '全假名']] : [[x.text, '沒指定讀音']].concat(kana !== x.text ? [[kana, '全假名']] : []);
  for (const [plain, label] of tries) {
    blob = await fetchEngineBlob(cfg, x.text, x.gender, Object.assign({}, opt, { plain }));
    if (!silent(blob)) return { blob, note: `${x.text.slice(0, 24)}：Google 指定讀音時沒有聲音，改用${label}的版本` };
  }
  return { blob: null };
}
function cloudGenRender() { const box = document.getElementById('cloudGenBox'); if (box) box.innerHTML = cloudGenHtml(); }
// 試聽角色聲音 (2026-11-12): each townsperson's first line in their voice, made on a tap with the Google key pasted above (as the
// generator would make it) and kept for this page only — nothing uploaded — so a voice can be changed (CAST_VOICE) before the
// generator makes them all
const CAST_PREVIEW = { blobs: {}, said: {}, busy: '' };
const castSample = (who) => (talkLines().find((l) => l[0] === who) || [])[1] || '';
function castPreviewHtml() {
  const row = (id, k, name, sub, line) => { const key = `${id}|${k}`, said = CAST_PREVIEW.said[key];
    return `<div class="list-item cast-row${k === '' ? '' : ' cast-try'}"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="cast-preview" data-who="${id}" data-try="${k}" aria-label="試聽${esc(name)}"${CAST_PREVIEW.busy === key ? ' disabled' : ''}>${CAST_PREVIEW.busy === key ? '…' : icon('speaker')}</button>
      <div class="grow"><div><b>${esc(name)}</b> <span class="muted small">${esc(sub)}</span></div>${line ? `<div class="small muted jp">${esc(line)}</div>` : ''}${said ? `<div class="small ${said.bad ? 'bad' : 'muted'}">${esc(said.text)}</div>` : ''}</div></div>`; };
  return Object.keys(CAST_VOICE).map((id) => {
    const p = id === 'hero' ? { name: '主角', role: '' } : NPCS[id] || TOWN.CAST[id] || { name: id, role: '' }, v = CAST_VOICE[id];
    return row(id, '', p.name, `${p.role || ''}${p.role ? '・' : ''}${v[0]}${v[2] ? `（音調 +${v[2]}）` : ''}（${voiceGender(v) === 'f' ? '女聲' : '男聲'}）`, castLine(castSample(id)).replace(CAST_MARK, '$1'))
      + (CAST_TRY[id] || []).map((t, k) => row(id, String(k), `${p.name}候選 ${k + 1}`, t[3], '')).join('');
  }).join('');
}
function castPreviewRender() { const box = document.getElementById('castPreviewBox'); if (box) box.innerHTML = castPreviewHtml(); }
async function castPreview(who, key, k = '') {   // k: one of the voices to try for them (CAST_TRY), '' their own
  stopSpeaking(); primeTtsPlayer(); const token = speechToken;   // inside the tap: the player kept awake while the line is made (iOS)
  const id = `${who}|${k}`, v = k === '' ? undefined : CAST_TRY[who][Number(k)].slice(0, 3);
  let blob = CAST_PREVIEW.blobs[id];
  if (!blob) {
    const line = castSample(who), x = { text: castLine(line).replace(CAST_MARK, '$1'), gender: v ? voiceGender(v) : castGender(who), reading: '', cast: who, line, voice: v };
    CAST_PREVIEW.busy = id; delete CAST_PREVIEW.said[id]; castPreviewRender();
    try {
      const got = await cloudGenBlob(Object.assign({}, ttsConfig(), { engine: 'google_tts', googleKey: key }), x);
      blob = got.blob; if (got.note) CAST_PREVIEW.said[id] = { text: got.note };
      if (!blob) CAST_PREVIEW.said[id] = { text: '生成的聲音是空的或靜音', bad: true };
    } catch (e) { const msg = (e && e.message) || String(e); CAST_PREVIEW.said[id] = { text: msg + (ttsErrorHint(msg) ? `（${ttsErrorHint(msg)}）` : ''), bad: true }; }
    CAST_PREVIEW.busy = ''; if (blob) CAST_PREVIEW.blobs[id] = blob; castPreviewRender();
    if (!blob) { stopSilence(); return; }
  }
  if (token !== speechToken) return;
  const url = URL.createObjectURL(blob); await playUrl(url, token, 1); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Runs in the browser: the Google key (site-restricted, as set up) and the R2 key pair (this bucket only, r2 = { keyId,
// secret }) are used for this run only — never stored, never synced, gone when the page closes. Clips go to R2 only
// (1.0.30); Supabase keeps the older ones as a backup. Existing files are skipped, so a stopped run can continue.
async function cloudGenStart(googleKey, r2) {
  if (CLOUD_GEN && CLOUD_GEN.running) return;
  CLOUD_GEN = { running: true, stop: false, phase: '整理句子', total: 0, done: 0, skipped: 0, failed: 0, errors: [], notes: [] };
  cloudGenRender();
  try {
    const list = cloudAudioTexts();
    const paths = await Promise.all(list.map(x => cloudAudioPath(x.text, x.gender, clipOpt(x))));
    const files = new Map(); list.forEach((x, i) => { if (!files.has(paths[i])) files.set(paths[i], x); });   // a pinned reading the dictionary already knows is the same file
    CLOUD_GEN.phase = '查 R2 已有的檔案'; cloudGenRender();
    const have = await r2ListExisting(r2);
    const todo = [...files].filter(([path]) => !have.has(path)).map(([path, x]) => ({ x, path }));
    CLOUD_GEN.total = files.size; CLOUD_GEN.skipped = files.size - todo.length; CLOUD_GEN.phase = '生成並上傳'; cloudGenRender();
    const cfg = Object.assign({}, ttsConfig(), { engine: 'google_tts', googleKey });
    let i = 0;
    const worker = async () => {
      while (i < todo.length && !CLOUD_GEN.stop) {
        const t = todo[i++];
        try {
          let got, wait = 0;
          for (;;) {   // too many at once (HTTP 429: the townsfolk's voices have a lower rate a minute) or a hiccup at Google: a breath, then again
            try { got = await cloudGenBlob(cfg, t.x); break; } catch (e) { if (!/HTTP (429|50[0-4])/.test(e.message) || wait >= 4) throw e; await sleep(++wait * 5000); }
          }
          const { blob, note } = got;
          if (!blob) throw new Error('語音生成內容為空或靜音');
          await r2Put(t.path, blob, r2);
          CLOUD_GEN.done++; if (note && CLOUD_GEN.notes.length < 20) CLOUD_GEN.notes.push(note);
        } catch (e) {
          CLOUD_GEN.failed++; const msg = (e && e.message) || String(e);
          if (CLOUD_GEN.errors.length < 12) CLOUD_GEN.errors.push(`${t.x.text.slice(0, 24)}：${msg}${ttsErrorHint(msg) ? `（${ttsErrorHint(msg)}）` : ''}`);
          if (/HTTP 40[13]|連不到 R2|API key not valid|Unauthorized/i.test(msg)) CLOUD_GEN.stop = true;   // a bad key (or R2 out of reach) fails every file: stop instead of looping
        }
        if ((CLOUD_GEN.done + CLOUD_GEN.failed) % 5 === 0) cloudGenRender();
      }
    };
    await Promise.all([0, 1, 2, 3].map(worker));
    CLOUD_GEN.phase = CLOUD_GEN.stop ? '已停止（再按開始會接著跑）' : '完成';
    if (!CLOUD_GEN.stop) { cloudMisses.clear(); try { localStorage.removeItem('nq_audio_miss'); } catch (e) { /* ignore */ } }
  } catch (e) { CLOUD_GEN.phase = `失敗：${(e && e.message) || e}`; }
  CLOUD_GEN.running = false;
  cloudGenRender();
}

// a flashcard's word (its reading pinned) or its first example
function playVocabAudio(v, mode = 'word') {
  if (!v || (mode === 'ex' && !v.ex)) return;
  const reading = mode === 'word' && v.r && !HAS_KANJI.test(v.r) && v.r !== jaPlain(v.w) ? v.r : '';
  speak(mode === 'ex' ? exampleSpeech(v.ex, v) : jaPlain(v.w), reading ? { reading } : undefined);
}

function testVoice() {
  ttsWarned = false;
  speakScript('女：すみません、駅はどこですか。\n男：この道をまっすぐ行ってください。');
}
