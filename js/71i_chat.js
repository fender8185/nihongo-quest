'use strict';
// what someone says when tapped with nothing on (TOWNEV.chatLine; TOWNLIFE tests the words over their heads by it too) — 2026-11-12,
// the user: the people need 「多一些變數」. A line: [unit, ja, zh, when?] (events.js CHAT). ok(when, ctx): all its conditions hold —
// where they are and when, the story so far, how often the hero has chatted with them, a new look on the hero, a festival, someone
// the hero has met. pick: news first (an event these three days, a new look, a festival: once each), else at random, a line for
// here and now twice as likely, none of the last five said again. Pure (no DOM, no state): tests/chat.test.js
const CHATPICK = (() => {
  const PARTS = { am: [5, 11], noon: [11, 15], pm: [15, 19], night: [19, 5] };   // the time of day by the hour, as the people's hours (to < from runs past midnight)
  const inPart = (h, p) => { const r = PARTS[p]; return Boolean(r) && (r[0] < r[1] ? h >= r[0] && h < r[1] : h >= r[0] || h < r[1]); };
  const list = (v) => (Array.isArray(v) ? v : [v]);
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  function ok(c, x) {
    if (!c) return true;
    if (c.at !== undefined && !list(c.at).includes(x.at)) return false;
    if (c.h !== undefined && !list(c.h).some((p) => inPart(x.h, p))) return false;
    if (c.days && (c.days === 'we') !== x.we) return false;
    if (c.after && !x.done[c.after]) return false;
    if (c.before && x.done[c.before]) return false;
    if (c.fresh) { const d = x.done[c.fresh], n = d ? daysBetween(d, x.day) : -1; if (n < 0 || n > 3) return false; }
    if (c.talks && x.talks < c.talks) return false;
    if (c.look === 'any' ? !x.lookChanged : c.look === 'hair' ? !x.hairChanged : c.look && !x.wear.includes(c.look)) return false;
    if (c.fest && !x.fest.includes(c.fest)) return false;
    if (c.about && !x.seen(c.about)) return false;
    return true;
  }
  const isNews = (c) => Boolean(c && (c.fresh || c.look || c.fest));
  // a line as remembered: by whom and what; a look's for the look it was said to, a festival's for the year
  const key = (id, l, x) => { const c = l[3] || {}; return `${id}|${l[1] || l[2]}${c.look ? '@' + x.lookSig : ''}${c.fest ? '@' + x.day.slice(0, 4) : ''}`; };
  // mem: { said: the last keys said, news: { key: 1 } told } — not changed here (the caller keeps it)
  function pick(id, lines, x, mem, rnd = Math.random) {
    const can = lines.filter((l) => { const u = x.unitIdx(l[0]); return u >= 0 && u <= x.R && ok(l[3], x); });
    const news = can.find((l) => isNews(l[3]) && !mem.news[key(id, l, x)]);
    if (news) return { line: news, key: key(id, news, x), news: true };
    const plain = can.filter((l) => !isNews(l[3])); if (!plain.length) return null;   // news once told is not told again
    const unsaid = plain.filter((l) => !mem.said.includes(key(id, l, x))), pool = unsaid.length ? unsaid : plain;
    const w = pool.map((l) => (l[3] && (l[3].at !== undefined || l[3].h !== undefined) ? 2 : 1));
    let r = rnd() * w.reduce((a, b) => a + b, 0), i = 0;
    while (i < pool.length - 1 && r >= w[i]) { r -= w[i]; i++; }
    return { line: pool[i], key: key(id, pool[i], x), news: false };
  }
  return { ok, key, pick };
})();
