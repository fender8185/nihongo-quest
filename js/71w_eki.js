'use strict';
// ---------- みなと線 (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §6) ----------
// The line's stations, its fares and its timetable from みなと (events.js TOWN.EKI): what 駅前's board runs, what the ホーム's
// departure board shows, what 原田's window answers from, and what the ticket machine sells.
// 2026-11-23 (湯の花温泉, docs/superpowers/specs/2026-11-23-onsen-work-design.md §2.1): やまなみ線 (TOWN.EKI.YAMA) on from 白鷺, its
// stations' km counted from みなと港 as みなと線's are, so a fare across the two is the same reckoning; line() stays みなと線's own
const EKI = (() => {
  const E = () => TOWN.EKI;
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g;
  const Y = () => E().YAMA || { LINE: [], TIMES: {}, TRACK: {} };
  const row = (id) => E().LINE.find((s) => s[0] === id) || Y().LINE.find((s) => s[0] === id);
  const name = (id) => { const s = row(id); return s ? s[1].replace(MARK, '$1') : id; };   // as written: 公園前
  const kana = (id) => { const s = row(id); return s ? s[1].replace(MARK, '$2') : id; };   // as said: こうえんまえ
  const ruby = (id) => { const s = row(id); return s ? esc(s[1]).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>') : esc(id); };
  // a station on a chart: its name, its reading over it as a station's sign has it (the whole word, not kanji by kanji: three
  // 〜前 in a row in a sixth of a phone each — 2026-11-22), its words on lines of their own (だいがく／まえ: two lines kept for
  // every reading on the chart; run on, three 〜前 read as one word); no reading (read: false, or a name in kana) an empty line, the names level
  const label = (id, read) => { const s = row(id), parts = s ? s[1].match(/\{[^}]*\}|[^{]+/g).map((x) => x.replace(MARK, '$2')) : [id], rd = read && kana(id) !== name(id);
    return `<span class="md-rd${rd && parts.length > 1 ? ' two' : ''}"><span>${rd ? parts.map(esc).join('<br>') : ''}</span></span><span class="md-nm" lang="ja">${esc(name(id))}</span>`; };
  const line = () => E().LINE.map(([id, , km, rapid, read], i) => ({ id, name: name(id), kana: kana(id), km, rapid: Boolean(rapid), read: Boolean(read), i }));
  const yama = () => Y().LINE.map(([id, , km], i) => ({ id, name: name(id), kana: kana(id), km, i }));   // 白鷺, 森下, 湯の花
  const km = (id) => (row(id) || [, , 0])[2];
  // which line a station is on: みなと線 or やまなみ線 (白鷺, on both: みなと線's end)
  const lineOf = (id) => (E().LINE.some((s) => s[0] === id) ? 'minato' : Y().LINE.some((s) => s[0] === id) ? 'yama' : '');
  // the fare between two stations: by the distance (FARES' bands); a child's half, under 10 円 dropped
  function fare(from, to, child = false) {
    const d = Math.abs(km(from) - km(to)), band = E().FARES.find(([up]) => d <= up) || E().FARES[E().FARES.length - 1];
    return child ? Math.floor(band[1] / 20) * 10 : band[1];
  }
  // the stations a train stops at on its way from `from` to `to`, in order — on one line (快速: those marked, on みなと線)
  function stops(kind, to, from = 'minato') {
    const yl = lineOf(from) === 'yama' || lineOf(to) === 'yama', L = yl ? yama() : line();
    const a = L.findIndex((s) => s.id === from), b = L.findIndex((s) => s.id === to), step = b > a ? 1 : -1, out = [];
    for (let i = a + step; i !== b + step; i += step) if (kind !== '快速' || yl || L[i].rapid || i === b) out.push(L[i].id);
    return out;
  }
  // a ride's legs, a line each: from one line to the other the change is at 白鷺 (2026-11-23)
  function legs(from, to) {
    const a = lineOf(from), b = lineOf(to);
    if (from === 'shirasagi' || to === 'shirasagi' || a === b) return [{ line: from === 'shirasagi' ? b : a, from, to }];
    return [{ line: a, from, to: 'shirasagi' }, { line: b, from: 'shirasagi', to }];
  }
  const hm = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  // the next n trains out of a station at or after h:m (past the last of the day: the next morning's) — { t, h, m, kind, to, track }:
  // みなと's on みなと線, both ways (END past LAST: its last); 白鷺's and 湯の花's on やまなみ線 (one way: the other end)
  function next(h, m, n = 4, from = 'minato') {
    const out = [], yl = from !== 'minato', { FIRST, LAST } = yl ? Y() : E(), END = yl ? 59 : E().END;
    const times = yl ? (Y().TIMES[from] || []).map((mm) => [mm, '普通', from === 'yunohana' ? 'shirasagi' : 'yunohana']) : E().TIMES, track = (to) => (yl ? Y().TRACK[from] : E().TRACK[to]);
    let t = Math.floor(h) * 60 + Math.floor(m);
    for (let k = 0; k < 2 * 24 * 60 && out.length < n; k++, t++) {
      const day = t % (24 * 60), H = Math.floor(day / 60), M = day % 60;
      if (H < FIRST || H > LAST || (H === LAST && M > END)) continue;
      times.filter(([mm]) => mm === M).forEach(([, kind, to]) => { if (out.length < n) out.push({ t: hm(day), h: H, m: M, kind, to, track: track(to) }); });
    }
    return out;
  }
  return { line, yama, lineOf, name, kana, ruby, label, fare, stops, legs, next };
})();
