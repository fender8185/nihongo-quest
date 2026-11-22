'use strict';
// ---------- みなと線 (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §6) ----------
// The line's stations, its fares and its timetable from みなと (events.js TOWN.EKI): what 駅前's board runs, what the ホーム's
// departure board shows, what 原田's window answers from, and what the ticket machine sells.
const EKI = (() => {
  const E = () => TOWN.EKI;
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g;
  const row = (id) => E().LINE.find((s) => s[0] === id);
  const name = (id) => { const s = row(id); return s ? s[1].replace(MARK, '$1') : id; };   // as written: 公園前
  const kana = (id) => { const s = row(id); return s ? s[1].replace(MARK, '$2') : id; };   // as said: こうえんまえ
  const ruby = (id) => { const s = row(id); return s ? esc(s[1]).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>') : esc(id); };
  // a station on a chart: its name, its reading over it as a station's sign has it (the whole word, not kanji by kanji: three
  // 〜前 in a row in a sixth of a phone each — 2026-11-22), free to break between its words (だいがく／まえ: two, two lines kept
  // for every reading on the chart); no reading (read: false, or a name in kana) an empty line, the names level
  const label = (id, read) => { const s = row(id), parts = s ? s[1].match(/\{[^}]*\}|[^{]+/g).map((x) => x.replace(MARK, '$2')) : [id], rd = read && kana(id) !== name(id);
    return `<span class="md-rd${rd && parts.length > 1 ? ' two' : ''}">${rd ? parts.map(esc).join('\u200b') : ''}</span><span class="md-nm" lang="ja">${esc(name(id))}</span>`; };
  const line = () => E().LINE.map(([id, , km, rapid, read], i) => ({ id, name: name(id), kana: kana(id), km, rapid: Boolean(rapid), read: Boolean(read), i }));
  const km = (id) => (row(id) || [, , 0])[2];
  // the fare between two stations: by the distance (FARES' bands); a child's half, under 10 円 dropped
  function fare(from, to, child = false) {
    const d = Math.abs(km(from) - km(to)), band = E().FARES.find(([up]) => d <= up) || E().FARES[E().FARES.length - 1];
    return child ? Math.floor(band[1] / 20) * 10 : band[1];
  }
  // the stations a train from みなと stops at on its way to its end (快速: those marked), in order
  function stops(kind, to, from = 'minato') {
    const L = line(), a = L.findIndex((s) => s.id === from), b = L.findIndex((s) => s.id === to), step = b > a ? 1 : -1, out = [];
    for (let i = a + step; i !== b + step; i += step) if (kind !== '快速' || L[i].rapid || i === b) out.push(L[i].id);
    return out;
  }
  const hm = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  // the next n trains out of みなと at or after h:m (past the last of the day, END past LAST: the next morning's) — { t, h, m, kind, to, track }
  function next(h, m, n = 4) {
    const out = [], { FIRST, LAST, END, TIMES, TRACK } = E(); let t = Math.floor(h) * 60 + Math.floor(m);
    for (let k = 0; k < 2 * 24 * 60 && out.length < n; k++, t++) {
      const day = t % (24 * 60), H = Math.floor(day / 60), M = day % 60;
      if (H < FIRST || H > LAST || (H === LAST && M > END)) continue;
      TIMES.filter(([mm]) => mm === M).forEach(([, kind, to]) => { if (out.length < n) out.push({ t: hm(day), h: H, m: M, kind, to, track: TRACK[to] }); });
    }
    return out;
  }
  return { line, name, kana, ruby, label, fare, stops, next };
})();
