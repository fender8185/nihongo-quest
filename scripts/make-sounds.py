#!/usr/bin/env python3
"""Rebuild sounds/*.m4a from their CC0 sources.

    python3 -I scripts/make-sounds.py CACHE_DIR [OUT_DIR] [name ...]

CACHE_DIR keeps the downloads (Freesound "hq" preview MP3s and Kenney zips) so a
second run does not fetch them again. OUT_DIR defaults to the repo's sounds/.
Give names (e.g. steps-wood amb-birds can-drop) to rebuild only those files.

Needs numpy and soundfile (whose wheel bundles libsndfile with MP3/OGG):
    python3 -m venv sndvenv && sndvenv/bin/pip install numpy soundfile
    sndvenv/bin/python -I scripts/make-sounds.py ~/sound-cache
and macOS `afconvert` for the final AAC encode (mono, 44.1 kHz, .m4a).

Every source is CC0 / public domain; sounds/SOURCES.md lists them. Downloads are
treated as data only: audio is decoded, never executed.

Processing is deliberately simple and done with numpy FFTs (zero-phase filters,
FFT resampling), so the numbers below are the whole recipe:
  * footstep sprites: four single steps placed at 0.0/0.5/1.0/1.5 s in 2.0 s,
    each cut 3 ms before its onset, 0.40 s long, faded to silence, peak -6 dBFS;
  * one-shots: a time range, optional filters / fades, trimmed so the sound
    starts within 10 ms, faded to true silence, peak -3 dBFS;
  * ambience loops: a time range (or several layered), filtered, made seamless
    with an equal-power crossfade of the tail into the head, RMS -26 dBFS with
    peaks under -6 dBFS (quieter where that would need more than a few dB of
    limiting: the clock, the waves).
Crowd loops layer several takes so single talkers blur into murmur; the voice
band is dipped a little as well.
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

import numpy as np
import soundfile as sf

SR = 44100
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")

# --------------------------------------------------------------------------
# Sources. "fs<ID>" = Freesound sound ID (CC0), fetched as its public hq preview.
# "kenney:<pack>/<file>" = a file inside a Kenney pack zip (CC0).
# --------------------------------------------------------------------------
FREESOUND = {
    # id: (author, preview path under cdn.freesound.org/previews/)  # title
    19829: ('stijn', "19/19829_24837-hq.mp3"),  # BottlesCrate.wav
    32295: ('Heigh-hoo', "32/32295_21830-hq.mp3"),  # bush_warbler.wav
    108475: ('rpew1', "108/108475_956825-hq.mp3"),  # drawer open.WAV
    109319: ('Ryding', "109/109319_981397-hq.mp3"),  # Pedestrian street.wav
    125958: ('Ryding', "125/125958_981397-hq.mp3"),  # Wooden door open-close
    151219: ('OwlStorm', "151/151219_140737-hq.mp3"),  # Solo Clap
    171043: ('ST303', "171/171043_2449563-hq.mp3"),  # Mechanical alarm clock is ticking (SLAVA).wav
    182738: ('thetrain1919', "182/182738_3404983-hq.mp3"),  # Medium Crowd Chatter.mp3
    193060: ('Nomadyag', "193/193060_2470629-hq.mp3"),  # Dishes.wav
    193873: ('Ligidium', "193/193873_3276562-hq.mp3"),  # Door Knock - 42.wav
    198273: ('JackDeB', "198/198273_3690975-hq.mp3"),  # Letterbox clang
    208878: ('Yuval', "208/208878_770707-hq.mp3"),  # footsteps soft slippers
    216879: ('CastIronCarousel', "216/216879_4049088-hq.mp3"),  # squeaky wooden door solid close.wav
    250194: ('Emma7073', "250/250194_4593301-hq.mp3"),  # Vending machine
    256316: ('lostphosphene', "256/256316_4587471-hq.mp3"),  # Splashing bath .aif
    328010: ('Koolwhip', "328/328010_5665770-hq.mp3"),  # Gulping Water.
    332783: ('be_a_hero_not_a_patriot', "332/332783_5804919-hq.mp3"),  # city ambience, pedestrian subway, outside, night, distant tr
    364891: ('RutgerMuller', "364/364891_179538-hq.mp3"),  # Japan_Tokyo_Otemachi_Evening_Street_Walking_Traffic_Footstep
    365133: ('gibarroule', "365/365133_6659813-hq.mp3"),  # Duck Quack
    365257: ('RutgerMuller', "365/365257_179538-hq.mp3"),  # Japan_Kashiwa_Insects_Far_and_Upclose.wav
    368081: ('madwurmz', "368/368081_6767858-hq.mp3"),  # potloden.wav
    378866: ('kijjaz', "378/378866_26950-hq.mp3"),  # 20170101 Slide Glass Door 02
    387896: ('bajko', "387/387896_2341984-hq.mp3"),  # sfx_swing_hojdacka.wav
    389520: ('joe_anderson22', "389/389520_3507073-hq.mp3"),  # Sizzling Sausage.wav
    398403: ('Caitlin_100', "398/398403_5407590-hq.mp3"),  # Letter from a house letterbox
    404829: ('nilbul', "404/404829_262959-hq.mp3"),  # Water splash
    405445: ('Ranne_Madsen', "405/405445_7663312-hq.mp3"),  # Sitting on chair.wav
    445788: ('DDT197', "445/445788_8292592-hq.mp3"),  # Rustling foliage.WAV
    453951: ('kyles', "453/453951_612689-hq.mp3"),  # diner busy mellow quebecois frying, walla, cutlery tinkles M
    454420: ('kyles', "454/454420_612689-hq.mp3"),  # bus coach ext pull up brake air release idle.wav
    455727: ('kyles', "455/455727_612689-hq.mp3"),  # crowd int medium murmur restaurant busy buffet dishes cutler
    459813: ('plantmonkey', "459/459813_182472-hq.mp3"),  # Waves on a sand bar
    476806: ('Sheyvan', "476/476806_3248005-hq.mp3"),  # Glass: Putting down 2
    501168: ('ayustat2001', "501/501168_4648939-hq.mp3"),  # Furin japanese wind chime.wav
    505831: ('jedg', "505/505831_4024739-hq.mp3"),  # Footsteps outdoors gravel.wav
    510917: ('Lydmakeren', "510/510917_11157357-hq.mp3"),  # Seagulls_short.wav
    520146: ('cwmcnutt', "520/520146_6515719-hq.mp3"),  # Wooden-Barrel_One-Hit_5
    520753: ('am7', "520/520753_7919821-hq.mp3"),  # Bus Closing Door
    524526: ('warukunai', "524/524526_4365231-hq.mp3"),  # Japanese bush warbler (uguisu) in a city ambiance
    532180: ('mcmikai', "532/532180_9735871-hq.mp3"),  # Pigeons flying
    532890: ('Bricklover', "532/532890_8919922-hq.mp3"),  # Watering with a Watering Can.mp3
    537854: ('Ambientsoundapp', "537/537854_11926345-hq.mp3"),  # Seagulls distant.wav
    540728: ('Lukeo135', "540/540728_9271584-hq.mp3"),  # Sand Step
    546527: ('SamuelGremaud', "546/546527_8031303-hq.mp3"),  # WIND AND LEAVES - 2
    555134: ('ericnorcross81', "555/555134_6970469-hq.mp3"),  # Two Barges Rubbing Against One-Another In Choppy Waters
    570208: ('RatBird', "570/570208_12508711-hq.mp3"),  # Fish Flopping.wav
    580843: ('Avreliy', "580/580843_1834147-hq.mp3"),  # Hit wooden object
    630648: ('haulaway', "630/630648_7228277-hq.mp3"),  # single bark - small to medium dog
    633701: ('uniuniversal', "633/633701_13601611-hq.mp3"),  # Creak.wav
    637974: ('kyles', "637/637974_612689-hq.mp3"),  # water splashes big hand slaps spray and wave.flac
    656500: ('druulian', "656/656500_6497685-hq.mp3"),  # Cat purr
    668247: ('hmilleo', "668/668247_3482955-hq.mp3"),  # old washing machine 2.wav
    676456: ('NearTheAtmoshphere', "676/676456_2578040-hq.mp3"),  # Flapping 4
    677069: ('xkeril', "677/677069_13504080-hq.mp3"),  # Footsteps stone + sneaker
    679755: ('Froey_', "679/679755_8331855-hq.mp3"),  # Sitting on a sofa
    727609: ('zoozio', "727/727609_6209123-hq.mp3"),  # Outdoor ambience near a forest with birdsong (Midlands, Engl
    728642: ('ondrosik', "728/728642_2140699-hq.mp3"),  # crowd
    732521: ('Lukey1028', "732/732521_13416215-hq.mp3"),  # Begging Meow
    739753: ('Vrymaa', "739/739753_13973196-hq.mp3"),  # Bell - Japanese, small
    741366: ('Mish7913', "741/741366_16104671-hq.mp3"),  # Hooded Crow: Cawing
    754317: ('KenneysGarage', "754/754317_16176309-hq.mp3"),  # glass_cheers
    788643: ('Philip_Berger', "788/788643_11135759-hq.mp3"),  # Light Switch on
    798831: ('rthijs', "798/798831_6803900-hq.mp3"),  # passing train
    813355: ('bulkmoerls', "813/813355_17511816-hq.mp3"),  # 1min Clock Ticking - CC0
    840192: ('pierreluclandry', "840/840192_14540612-hq.mp3"),  # Turning a page in a book
    843246: ('nicotep', "843/843246_7529214-hq.mp3"),  # Venise_small_Boat_Lapping_water
}

def http_get(url, referer=None):
    headers = {"User-Agent": UA}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def fetch_freesound(cache, sid):
    path = os.path.join(cache, f"fs{sid}.mp3")
    if not os.path.exists(path):
        url = "https://cdn.freesound.org/previews/" + FREESOUND[sid][1]
        print(f"  downloading {url}")
        save(path, http_get(url))
    return path


def fetch_kenney(cache, pack):
    """Kenney serves each pack through a short-lived signed link."""
    path = os.path.join(cache, f"kenney-{pack}.zip")
    if not os.path.exists(path):
        page_url = f"https://kenney.nl/assets/{pack}"
        page = http_get(page_url).decode("utf-8", "replace")
        dl_id = re.search(r"data-download-id='([0-9a-f]+)'", page).group(1)
        link = json.loads(http_get(f"https://kenney.nl/download-link/{dl_id}", referer=page_url))["url"]
        print(f"  downloading Kenney {pack}")
        save(path, http_get(link, referer=page_url))
    return path


def save(path, data):
    """Write via a temporary name so an interrupted run never leaves half a file in the cache."""
    with open(path + ".part", "wb") as f:
        f.write(data)
    os.replace(path + ".part", path)


_cache_audio = {}


def load(cache, src):
    """Decode a source to mono float64 at 44.1 kHz."""
    if src in _cache_audio:
        return _cache_audio[src]
    if src.startswith("fs"):
        sid = int(src[2:])
        x, sr = sf.read(fetch_freesound(cache, sid), always_2d=True)
    elif src.startswith("kenney:"):
        pack, name = src[len("kenney:"):].split("/", 1)
        with zipfile.ZipFile(fetch_kenney(cache, pack)) as z:
            member = [n for n in z.namelist() if n.endswith("/" + name) or n == name][0]
            x, sr = sf.read(io.BytesIO(z.read(member)), always_2d=True)
    else:
        raise ValueError(src)
    x = x.mean(axis=1)
    if sr != SR:
        x = resample(x, sr, SR)
    _cache_audio[src] = x
    return x


# --------------------------------------------------------------------------
# DSP helpers (numpy only)
# --------------------------------------------------------------------------
def resample(x, sr_in, sr_out):
    """FFT resampling with reflected padding at both ends."""
    pad = min(len(x) - 1, sr_in // 10)
    xp = np.concatenate([x[pad:0:-1], x, x[-2:-pad - 2:-1]])
    n_out = int(round(len(xp) * sr_out / sr_in))
    X = np.fft.rfft(xp)
    Y = np.zeros(n_out // 2 + 1, dtype=complex)
    k = min(len(X), len(Y))
    Y[:k] = X[:k]
    y = np.fft.irfft(Y, n_out) * (n_out / len(xp))
    p_out = int(round(pad * sr_out / sr_in))
    return y[p_out:p_out + int(round(len(x) * sr_out / sr_in))]


def fft_filter(x, hp=None, lp=None, order=4, gain_at=None):
    """Zero-phase Butterworth-shaped high/low-pass. gain_at: list of (lo, hi, dB):
    a band boost/cut with half-octave smooth edges."""
    if not hp and not lp and not gain_at:
        return x
    n = len(x)
    pad = min(4096, n)
    xp = np.concatenate([np.zeros(pad), x, np.zeros(pad)])
    X = np.fft.rfft(xp)
    f = np.fft.rfftfreq(len(xp), 1 / SR)
    H = np.ones_like(f)
    if hp:
        with np.errstate(divide="ignore"):
            H *= 1 / np.sqrt(1 + (hp / np.maximum(f, 1e-6)) ** (2 * order))
    if lp:
        H *= 1 / np.sqrt(1 + (f / lp) ** (2 * order))
    for lo, hi, g in gain_at or []:
        with np.errstate(divide="ignore"):
            lf = np.log2(np.maximum(f, 1e-6))
        w = np.clip((lf - np.log2(lo)) / 0.5 + 0.5, 0, 1) * np.clip((np.log2(hi) - lf) / 0.5 + 0.5, 0, 1)
        H *= 10 ** (g * w / 20)
    return np.fft.irfft(X * H, len(xp))[pad:pad + n]


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-12))


def peak_norm(x, dbfs):
    return x * (10 ** (dbfs / 20) / max(np.abs(x).max(), 1e-12))


def fade(x, fin=0.0, fout=0.0):
    """Raised-cosine fades (seconds)."""
    x = x.copy()
    a = int(fin * SR)
    b = int(fout * SR)
    if a:
        x[:a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if b:
        x[-b:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
    return x


def cut(x, t0, t1):
    """Samples t0..t1 (s); zero-padded where the range runs past either end."""
    a, b = int(round(t0 * SR)), int(round(t1 * SR))
    y = np.zeros(b - a)
    lo, hi = max(a, 0), min(b, len(x))
    if hi > lo:
        y[lo - a:hi - a] = x[lo:hi]
    return y


def onset(x, around, search=0.08, rel_db=-24):
    """First sample near `around` (s) where a 1 ms envelope reaches rel_db of the local peak."""
    a = max(0, int((around - search) * SR))
    b = int((around + search + 0.25) * SR)
    seg = x[a:b]
    w = int(0.001 * SR)
    env = np.sqrt(np.convolve(seg ** 2, np.ones(w) / w, mode="same"))
    thr = env.max() * 10 ** (rel_db / 20)
    i = int(np.argmax(env > thr))
    return (a + i) / SR


def write_m4a(x, path, bitrate):
    assert np.abs(x).max() <= 1.0
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "x.wav")
        sf.write(wav, x.astype(np.float32), SR, subtype="PCM_24")
        if os.path.exists(path):
            os.remove(path)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", str(bitrate), wav, path], check=True)


# --------------------------------------------------------------------------
# A. Footstep sprites
# --------------------------------------------------------------------------
STEP_LEN = 0.40
STEP_PEAK = -6.0
STEP_LOUD = -26.0   # dBFS RMS of the loudest 120 ms of a step

# Each sprite: high-pass (Hz), fade-out start / end (s into the step), onset threshold
# (dB below the step's peak that counts as "the step starts"), and four (source, approx s).
STEPS = {
    "steps-wood": dict(hp=60, fade=(0.22, 0.40), on_db=-24, picks=[
        ("fs208878", 18.740), ("fs208878", 3.995), ("fs208878", 17.710), ("fs208878", 19.825)]),
    "steps-grass": dict(hp=80, fade=(0.20, 0.40), on_db=-24, picks=[
        ("kenney:impact-sounds/footstep_grass_000.ogg", 0.0), ("kenney:impact-sounds/footstep_grass_001.ogg", 0.0),
        ("kenney:impact-sounds/footstep_grass_002.ogg", 0.0), ("kenney:impact-sounds/footstep_grass_004.ogg", 0.0)]),
    "steps-concrete": dict(hp=60, fade=(0.10, 0.32), on_db=-24, picks=[
        ("fs677069", 5.390), ("fs677069", 10.165), ("fs677069", 13.165), ("fs677069", 8.970)]),
    "steps-gravel": dict(hp=80, fade=(0.22, 0.40), on_db=-24, picks=[
        ("fs505831", 5.330), ("fs505831", 5.775), ("fs505831", 1.780), ("fs505831", 6.230)]),
    "steps-sand": dict(hp=120, fade=(0.24, 0.40), on_db=-12, picks=[
        ("fs540728", 0.850), ("fs540728", 1.510), ("fs540728", 4.930), ("fs540728", 6.980)]),
}


def expand(x, range_db=30, ratio=2.5, win=0.01):
    """Downward expander: quietens whatever sits more than range_db under the loudest
    10 ms of x (room hiss in step tails) without touching the step itself."""
    w = int(win * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, mode="same")) + 1e-12
    thr = env.max() * 10 ** (-range_db / 20)
    gain = np.where(env < thr, (env / thr) ** (ratio - 1), 1.0)
    gain = np.convolve(gain, np.ones(w) / w, mode="same")  # smooth the gain
    return x * gain


def build_steps(cache, name):
    cfg = STEPS[name]
    out = np.zeros(int(2.0 * SR))
    for k, (src, t) in enumerate(cfg["picks"]):
        x = fft_filter(load(cache, src), hp=cfg["hp"])
        t_on = onset(x, t, rel_db=cfg["on_db"])
        s = cut(x, t_on - 0.003, t_on - 0.003 + STEP_LEN)
        s = expand(s)
        f0, f1 = cfg["fade"]
        s[int(f1 * SR):] = 0
        s[:int(f1 * SR)] = fade(s[:int(f1 * SR)], fin=0.003, fout=f1 - f0)
        s = s / loudness(s)  # the four steps equally loud...
        i = int(k * 0.5 * SR)
        out[i:i + len(s)] = s
    # ...then the loudest peak at -6 dBFS, unless that makes the steps louder than
    # STEP_LOUD (soft slipper scuffs have little peak), so the five sprites match.
    loud = max(loudness(out[int(k * 0.5 * SR):int((k * 0.5 + STEP_LEN) * SR)]) for k in range(4))
    gain = min(10 ** (STEP_PEAK / 20) / np.abs(out).max(), 10 ** (STEP_LOUD / 20) / loud)
    return out * gain


def loudness(x, win=0.12):
    """RMS of the loudest 120 ms of x (a rough 'how loud is this step')."""
    w = int(win * SR)
    e = np.convolve(x ** 2, np.ones(w) / w, mode="valid")
    return np.sqrt(e.max())


# --------------------------------------------------------------------------
# B. One-shots
# --------------------------------------------------------------------------
ONE_PEAK = -3.0

# name: dict(
#   parts = [(source, t0, t1, place_at_s, gain_dB, speed), ...]  mixed together
#           (speed < 1 = slower and lower, by resampling; default 1)
#   hp / lp = filter corners in Hz, exp = expander range in dB (quietens the
#   recording's noise floor between and after hits), fout = fade-out seconds,
#   end_db = where the tail is cut (dB under the peak), maxlen = hard length cap)
ONESHOTS = {
    "letter": dict(parts=[("fs398403", 0.20, 0.77)], hp=80),
    "mail": dict(parts=[("fs198273", 0.90, 1.60)], hp=60),
    "suzu": dict(parts=[("fs739753", 20.33, 21.75, 0, 0, 0.75)], hp=80, fout=0.35),
    "clap": dict(parts=[("fs151219", 0.72, 0.915, 0.0), ("fs151219", 2.145, 2.45, 0.36, 2.5)], hp=80),
    "furin": dict(parts=[("fs501168", 0.42, 2.8, 0.0), ("fs501168", 0.42, 2.8, 0.55, -5),
                         ("fs501168", 0.42, 2.8, 1.20, -8)], hp=200, maxlen=2.1, fout=0.6),
    "meow": dict(parts=[("fs732521", 0.08, 0.98)], hp=150, exp=30),
    "purr": dict(parts=[("fs656500", 3.2, 5.4)], hp=40, fin=0.02, fout=0.3),
    "crow": dict(parts=[("fs741366", 0.08, 0.55, 0.0), ("fs741366", 1.12, 1.60, 0.75)], hp=150, exp=35),
    "gull": dict(parts=[("fs510917", 4.6, 6.2)], hp=250, exp=30, fout=0.15),
    "wings": dict(parts=[("fs532180", 1.05, 2.65)], hp=100, fout=0.3),
    "duck": dict(parts=[("fs365133", 0.30, 0.68)], hp=100),
    "bark": dict(parts=[("fs630648", 0.70, 1.05)], hp=100),
    "can-drop": dict(parts=[("fs250194", 4.15, 4.95)], hp=50, fout=0.15),
    "bottle": dict(parts=[("fs476806", 3.0, 3.65)], hp=80, fout=0.15),
    "kuji": dict(parts=[("fs368081", 8.0, 9.25)], hp=150, fout=0.2),
    "gulp": dict(parts=[("fs328010", 7.72, 8.45)], hp=60, exp=30),
    "splash": dict(parts=[("fs637974", 3.62, 4.75)], hp=60, fout=0.25),
    "plop": dict(parts=[("fs404829", 0.0, 0.75)], hp=60, fout=0.2),
    "flop": dict(parts=[("fs570208", 2.50, 3.75)], hp=80, exp=25, fout=0.15),
    "rustle": dict(parts=[("fs445788", 5.75, 7.0)], hp=100, fin=0.04, fout=0.3),
    "tick": dict(parts=[("fs171043", 10.15, 11.65)], hp=150, fout=0.05),
    "bath": dict(parts=[("fs256316", 12.6, 14.2)], hp=60, fin=0.04, fout=0.3),
    "washer": dict(parts=[("fs668247", 2.0, 4.2)], hp=40, fin=0.05, fout=0.3),
    "creak": dict(parts=[("fs387896", 3.62, 4.15, 0.0), ("fs387896", 4.95, 5.50, 0.62)], hp=150, exp=30),
    "spring": dict(parts=[("fs633701", 2.03, 2.75)], hp=100, exp=30),
    "sit": dict(parts=[("fs405445", 0.75, 1.30)], hp=60, fout=0.1),
    "cushion": dict(parts=[("fs679755", 1.0, 1.6)], hp=60, fout=0.15),
    "cloth": dict(parts=[("kenney:rpg-audio/cloth1.ogg", 0.0, 0.66)], hp=80),
    "paper": dict(parts=[("fs676456", 0.0, 0.9)], hp=100, fout=0.2),
    "bottles": dict(parts=[("fs19829", 2.10, 3.15)], hp=100, fout=0.2),
    "sizzle": dict(parts=[("fs389520", 10.85, 12.4)], hp=150, fout=0.4),
    "barrel": dict(parts=[("fs520146", 5.33, 5.92, 0.0), ("fs520146", 6.03, 6.30, 0.34, -2)], hp=50, end_db=-55, fout=0.15),
    "door-open": dict(parts=[("fs125958", 0.36, 0.62, 0.0), ("fs216879", 0.04, 0.78, 0.15)], hp=60, fout=0.2),
    "door-close": dict(parts=[("fs125958", 1.86, 2.80)], hp=50, fout=0.2),
    "slide-door": dict(parts=[("fs378866", 0.65, 2.25)], hp=60, fout=0.2),
    "switch": dict(parts=[("fs788643", 0.09, 0.23)], hp=100, fout=0.03),
    "pour": dict(parts=[("fs532890", 3.0, 4.6)], hp=100, fin=0.04, fout=0.35),
    "page": dict(parts=[("fs840192", 0.25, 0.98)], hp=100, fout=0.15),
    "drawer": dict(parts=[("fs108475", 2.85, 3.90)], hp=60, fout=0.25),
    "coins": dict(parts=[("kenney:rpg-audio/handleCoins.ogg", 0.0, 0.85)], hp=100),
    "place": dict(parts=[("fs580843", 0.45, 0.85)], hp=80, maxlen=0.32, fout=0.12),
    "knock": dict(parts=[("fs193873", 0.0, 0.95)], hp=60, fout=0.35),
    "bus": dict(parts=[("fs454420", 3.7, 6.2, 0.0), ("fs520753", 0.35, 0.95, 1.6, -3)], hp=40, fin=0.06, fout=0.5),
    "dishes": dict(parts=[("fs193060", 1.30, 2.12)], hp=100, fout=0.15),
    "cheers": dict(parts=[("fs754317", 1.06, 1.68)], hp=150, fout=0.15),
}


def speed(x, factor):
    """Play x at `factor` times speed (pitch moves with it)."""
    if factor == 1:
        return x
    return resample(x, int(round(SR * factor)), SR)


def build_oneshot(cache, name):
    cfg = ONESHOTS[name]
    pieces = []
    for p in cfg["parts"]:
        src, t0, t1 = p[:3]
        at = p[3] if len(p) > 3 else 0.0
        g = p[4] if len(p) > 4 else 0.0
        sp = p[5] if len(p) > 5 else 1.0
        x = cut(load(cache, src), t0, t1)
        x = fade(x, fin=0.004, fout=min(0.03, (t1 - t0) / 4))  # no clicks at the cut points
        x = speed(x, sp) * 10 ** (g / 20)
        pieces.append((int(at * SR), x))
    n = max(i + len(x) for i, x in pieces)
    y = np.zeros(n)
    for i, x in pieces:
        y[i:i + len(x)] += x
    y = fft_filter(y, hp=cfg.get("hp"), lp=cfg.get("lp"), gain_at=cfg.get("eq"))
    if cfg.get("exp"):
        y = expand(y, range_db=cfg["exp"])
    y = trim(y, end_db=cfg.get("end_db", -50), fout=cfg.get("fout", 0.08), maxlen=cfg.get("maxlen"))
    if cfg.get("fin"):  # for sounds cut out of a continuous texture (purr, sizzle...)
        y = fade(y, fin=cfg["fin"])
    return peak_norm(y, ONE_PEAK)


def trim(y, end_db=-50, fout=0.08, maxlen=None):
    """Start 4 ms before the sound does (-35 dB under the peak, 1 ms envelope);
    end where the 10 ms envelope last sits above end_db, with a raised-cosine
    fade-out of `fout` s into exact zeros."""
    w1 = int(0.001 * SR)
    e1 = np.sqrt(np.convolve(y ** 2, np.ones(w1) / w1, mode="same"))
    start = max(0, int(np.argmax(e1 > e1.max() * 10 ** (-35 / 20))) - int(0.004 * SR))
    w = int(0.01 * SR)
    e = np.sqrt(np.convolve(y ** 2, np.ones(w) / w, mode="same"))
    above = np.nonzero(e > e.max() * 10 ** (end_db / 20))[0]
    end = min(len(y), above[-1] + w) if len(above) else len(y)
    if maxlen:
        end = min(end, start + int(maxlen * SR))
    y = y[start:end].copy()
    y = fade(y, fin=0.004, fout=min(fout, len(y) / SR / 2))
    return y


# --------------------------------------------------------------------------
# C. Ambience loops
# --------------------------------------------------------------------------
LOOP_RMS = -26.0
LOOP_PEAK = -6.0

# name: dict(
#   len = loop length in s, xf = crossfade in s,
#   layers = [(source, t0, gain_dB), ...]: each layer is len + xf seconds from t0;
#            or ([(source, t0, t1), ...], gain_dB): pieces joined with 1 s crossfades;
#            layering several crowd takes blurs single voices into murmur,
#   hp / lp / eq = filters (eq: [(lo_Hz, hi_Hz, dB), ...] band gains),
#   events = [(source, t0, t1, at_s, dB_against_bed, hp, lp), ...]: single calls
#            laid over the bed, away from the seam)
LOOPS = {
    # birds: a quiet English park/forest dawn chorus as the bed, plus two Japanese bush
    # warbler (uguisu) calls from two Japanese recordings, band-passed to drop their traffic
    "amb-birds": dict(len=38.0, xf=2.5, layers=[("fs727609", 0.5, 0)], hp=150,
                      events=[("fs524526", 11.85, 12.60, 9.0, 2, 1200, 7000),
                              ("fs32295", 35.45, 36.45, 26.0, 2, 1200, 7000)]),
    # autumn night insects in a field in Kashiwa, Chiba (the even, distant part of the take)
    "amb-insects": dict(len=38.0, xf=2.5, layers=[("fs365257", 10.0, 0)], hp=200),
    # wind through dry leaves, slightly softened at the top
    "amb-wind": dict(len=38.0, xf=2.5, layers=[("fs546527", 12.0, 0)], hp=60, lp=9000, order=2),
    # small waves on a sand bar
    "amb-waves": dict(len=38.0, xf=2.5, layers=[("fs459813", 4.0, 0)], hp=40, limit=5),
    # sparse distant gulls over quiet water: Venice canal lapping as the bed, four calls
    # cut from a distant-gull recording, band-passed and laid well apart
    "amb-gulls": dict(len=38.0, xf=2.5, layers=[("fs843246", 100.0, 0)], hp=80, lp=6000,
                      limit=5, events=[("fs537854", 0.35, 1.70, 4.0, 2, 700, 6000),
                              ("fs537854", 6.30, 9.30, 12.0, 2, 700, 6000),
                              ("fs537854", 16.4, 20.4, 21.5, 2, 700, 6000),
                              ("fs537854", 24.3, 27.3, 31.0, 2, 700, 6000)]),
    # water lapping at a small boat (Venice), with two barges creaking against each other under it
    "amb-harbor": dict(len=37.5, xf=2.5, layers=[("fs843246", 30.0, 0), ("fs555134", 0.2, -20.5)], hp=50),
    # distant city rumble at night, plus a Tokyo evening street far under it for passing cars
    "amb-traffic": dict(len=38.0, xf=2.5, layers=[("fs332783", 90.0, 0),
                                                    ([("fs364891", 22.0, 52.0), ("fs364891", 26.0, 40.0)], -27.6)],
                        hp=40, lp=5000, order=2),
    # shopping street: footsteps and passers-by, a few hundred people chatting far off, and a
    # Tokyo street underneath; three takes mixed and the voice band dipped so no words stand out
    "amb-town": dict(len=38.0, xf=2.5, layers=[("fs109319", 8.0, 0), ("fs182738", 20.0, -6.6),
                                                 ([("fs364891", 22.0, 52.0), ("fs364891", 26.0, 40.0)], -18.2)],
                     hp=60, lp=7000, order=2, eq=[(1000, 4000, -3)], limit=6),
    # a station platform with a train passing in the middle, crowd chatter under it
    "amb-station": dict(len=31.4, xf=2.5, layers=[("fs798831", 0.0, 0), ("fs182738", 40.0, -1.8)],
                        hp=40, lp=9000, order=2, eq=[(1000, 4000, -2)]),
    # a busy diner (frying, cutlery, murmur; one loud clatter skipped) with a buffet room under it
    "amb-restaurant": dict(len=38.0, xf=2.5, layers=[([("fs453951", 0.5, 30.2), ("fs453951", 31.0, 60.2)], 0),
                                                       ([("fs453951", 31.0, 60.2), ("fs453951", 0.5, 30.2)], -2),
                                                       ("fs455727", 60.0, -3.3), ("fs455727", 150.0, -4.3),
                                                       ("fs182738", 0.0, -5.0)],
                           hp=60, lp=8000, order=2, eq=[(1000, 4000, -4)]),
    # a lively pub: eight moments of one pub layered (talkers blur into murmur and laughter),
    # a large crowd far under it and a buffet room for clinks of dishes and cutlery
    "amb-izakaya": dict(len=38.0, xf=2.5, layers=[("fs728642", 20.0, 0), ("fs728642", 70.0, -1),
                                                    ("fs728642", 120.0, -1), ("fs728642", 170.0, -1),
                                                    ("fs728642", 220.0, -2), ("fs728642", 45.0, -3),
                                                    ("fs728642", 95.0, -3), ("fs728642", 145.0, -3),
                                                    ("fs182738", 60.0, -5.0), ("fs455727", 100.0, -3.0)],
                        hp=60, lp=8000, order=2, eq=[(1000, 4000, -3)]),
    # clock: 20 ticks of a wall clock ticking every 1.000 s, cut between two ticks so the
    # short crossfade sits in room tone; it loops exactly on the tick period
    "amb-clock": dict(len=20.0, xf=0.15, layers=[("fs813355", 3.30, 0)], hp=60),
}


def build_loop(cache, name):
    cfg = LOOPS[name]
    L, X = cfg["len"], cfg.get("xf", 2.5)
    n, nx = int(round(L * SR)), int(round(X * SR))
    seg = np.zeros(n + nx)
    for layer in cfg["layers"]:
        if isinstance(layer[0], list):  # ([(source, t0, t1), ...], gain): pieces joined end to end
            pieces, g = layer
            x = chain(cache, pieces)
            assert len(x) >= n + nx, f"{name}: chained pieces are too short"
            seg += x[:n + nx] * 10 ** (g / 20)
        else:
            src, t0, g = layer
            seg += cut(load(cache, src), t0, t0 + L + X) * 10 ** (g / 20)
    seg = fft_filter(seg, hp=cfg.get("hp"), lp=cfg.get("lp"), order=cfg.get("order", 4), gain_at=cfg.get("eq"))
    base_rms = np.sqrt(np.mean(seg ** 2))
    for src, t0, t1, at, rel_db, hp, lp in cfg.get("events", []):
        # a short call laid over the bed, band-passed, its RMS rel_db against the bed
        e = fft_filter(cut(load(cache, src), t0, t1), hp=hp, lp=lp)
        e = fade(expand(e, range_db=20), fin=0.08, fout=0.15)
        e *= base_rms * 10 ** (rel_db / 20) / np.sqrt(np.mean(e ** 2))
        i = int(at * SR)
        assert nx < i and i + len(e) < n, "events must stay clear of the seam"
        seg[i:i + len(e)] += e
    return normalize_loop(make_seamless(seg, n, nx), cfg.get("limit", 3.0))


def chain(cache, pieces, xf=1.0):
    """Join pieces of recordings with 1 s equal-power crossfades (to skip a loud
    moment in the middle of a take, or to lengthen a short one)."""
    nx = int(xf * SR)
    th = np.linspace(0, np.pi / 2, nx)
    out = cut(load(cache, pieces[0][0]), pieces[0][1], pieces[0][2])
    for src, t0, t1 in pieces[1:]:
        x = cut(load(cache, src), t0, t1)
        out[-nx:] = out[-nx:] * np.cos(th) + x[:nx] * np.sin(th)
        out = np.concatenate([out, x[nx:]])
    return out


def make_seamless(seg, n, nx):
    """Loop of n samples: the nx samples after the loop end are faded into the
    head with an equal-power (sin/cos) crossfade, so out[n-1] -> out[0] is the
    same as seg[n-1] -> seg[n]: no jump at the seam."""
    out = seg[:n].copy()
    th = np.linspace(0, np.pi / 2, nx)
    out[:nx] = seg[:nx] * np.sin(th) + seg[n:n + nx] * np.cos(th)
    return out


def normalize_loop(x, max_limit_db=3.0):
    """RMS to LOOP_RMS, but never so loud that more than max_limit_db of peak
    limiting would be needed (a ticking clock ends up quieter instead of squashed).
    Peaks still above LOOP_PEAK are pulled under it by a smooth gain dip computed
    around the loop (wrapping), so the seam stays clean."""
    thr = 10 ** ((LOOP_PEAK - 0.8) / 20)  # 0.8 dB headroom for AAC overshoot
    g_rms = 10 ** (LOOP_RMS / 20) / np.sqrt(np.mean(x ** 2))
    g_peak = thr / np.abs(x).max() * 10 ** (max_limit_db / 20)
    x = x * min(g_rms, g_peak)
    if np.abs(x).max() > thr:
        w = int(0.005 * SR)
        P = 4 * w
        g = np.minimum(1.0, thr / np.maximum(np.abs(x), 1e-12))
        gp = np.concatenate([g[-P:], g, g[:P]])  # wrap: the loop's end meets its start
        # hold the lowest gain over +-5 ms, then smooth it over 10 ms
        hold = np.ones_like(gp)
        hold[w:-w] = np.lib.stride_tricks.sliding_window_view(gp, 2 * w + 1).min(axis=1)
        sm = np.convolve(hold, np.ones(2 * w + 1) / (2 * w + 1), mode="same")
        x = x * np.minimum(sm[P:P + len(x)], 1.0)
        x = np.clip(x, -thr, thr)  # safety: nothing left above the ceiling
    return x


# --------------------------------------------------------------------------
TARGETS = {}


def main():
    cache = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sounds")
    only = sys.argv[3:]
    os.makedirs(cache, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)
    for name in list(STEPS):
        TARGETS.setdefault(name, (build_steps, 96000))
    for name in list(ONESHOTS):
        TARGETS.setdefault(name, (build_oneshot, 96000))
    for name in list(LOOPS):
        TARGETS.setdefault(name, (build_loop, 64000))
    for name, (fn, rate) in TARGETS.items():
        if only and name not in only:
            continue
        print(name)
        x = fn(cache, name)
        write_m4a(x, os.path.join(out_dir, f"{name}-1.m4a"), rate)


if __name__ == "__main__":
    main()
