// The review page for the N3–N1 curriculum outline: one self-contained HTML page (published as an Artifact) with a tab per
// level — units by phase, themes with their words, kanji in teaching order, dropped and added words (plan Task 9).
// usage: node scripts/curriculum/render-review.js <out.html>
const fs = require('fs'); const path = require('path');
const { homographs, preOutline } = require('./build-candidates.js');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en-US');
const SRC = { waller: 'Waller', openjlpt: 'OpenJLPT', added: '補' };
const LEVEL_VIEWS = [['n3', 'N3'], ['n2', 'N2'], ['n1', 'N1']];

const word = (w, r, m) => `<li><span class="w" lang="ja">${esc(w)}</span>${r && r !== w ? `<span class="r" lang="ja">（${esc(r)}）</span>` : ''}${m ? `<span class="m">${esc(m)}</span>` : ''}</li>`;
const table = (head, rows) => rows.length ? `<div class="tablebox"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i < 2 ? ' lang="ja"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="none">沒有。</p>';

// other readings of a spelling are words of their own; the ones the outline has not placed yet (in a theme or dropped) are listed
const homoTable = (list, entries) => { const has = new Set(entries.map(x => `${x.w}|${x.r}`)); const left = list.filter(h => !has.has(`${h.w}|${h.r}`));
  return `<h2>同形異讀（還沒放進大綱）</h2><p class="note">同一個寫法的其他讀音也是要收的字（例如 金 きん）。下面是還沒放進主題、也還沒篩掉的。</p>${table(['字', '這一筆的讀音', '已收的讀音'], left.map(h => [h.w, h.r, `${h.firstL} ${h.firstR}`]))}`; };

function levelView(o, homo = [], kept = []) {
  const words = o.themes.reduce((s, t) => s + t.words.length, 0);
  const points = o.units.reduce((s, u) => s + u.points.length, 0);
  const days = Math.ceil((words + o.kanji.length + points * 6) / 15);
  const unitsById = new Map(o.units.map(u => [u.id, u]));
  const unit = (u) => `<div class="unit"><div class="uhead"><span class="uid">${esc(u.id)}</span><span class="utitle" lang="ja">${esc(u.title)}</span></div>
    <ul class="points">${u.points.map(p => `<li><span class="p" lang="ja">${esc(p.p)}</span><span class="pm">${esc(p.m)}</span><span class="src">${(p.src || []).map(s => SRC[s] || esc(s)).join('・')}</span></li>`).join('')}</ul></div>`;
  return `<p class="stats">主題 <b>${o.themes.length}</b>・字 <b>${fmt(words)}</b>（篩掉 ${(o.dropped || []).length}、補 ${(o.added || []).length}）・漢字 <b>${fmt(o.kanji.length)}</b>・文法點 <b>${points}</b>（${o.units.length} 個單元，app 已教 ${(o.covered || []).length}、換級 ${(o.moved || []).length}）・約 ${fmt(days)} 天（約 ${(days / 30).toFixed(1)} 個月）</p>
  <p class="note">天數是估計：每天 15 個新題，文法點一點算 6 題。</p>
  <h2>單元與文法點</h2>
  ${(o.phases || []).map(ph => `<h3>${esc(ph.title)}</h3><div class="units">${ph.units.map(id => unitsById.get(id)).filter(Boolean).map(unit).join('')}</div>`).join('')}
  <h3>app 已經教過的點</h3>${table(['句型', '教過的單元', '說明'], (o.covered || []).map(x => [x.p, x.by, x.why]))}
  <h3>換到別級的點</h3>${table(['句型', '換到', '原因'], (o.moved || []).map(x => [x.p, x.to, x.why]))}
  <h2>主題與單字</h2>
  <div class="themes">${o.themes.map(t => `<details class="theme"><summary><span class="tname">${esc(t.c)}</span><span class="tdesc">${esc(t.desc)}</span><span class="tcount">${t.words.length} 字</span></summary><ul class="words">${t.words.map(([w, r, m]) => word(w, r, m)).join('')}</ul></details>`).join('')}</div>
  <h2>漢字（教學順序）</h2>
  <ol class="kanji" lang="ja">${o.kanji.map(k => `<li>${esc(k)}</li>`).join('')}</ol>
  <h2>篩掉的字</h2>${table(['字', '讀音', '原因'], (o.dropped || []).map(x => [x.w, x.r, x.why]))}
  <h2>補的字</h2>${table(['字', '讀音', '意思', '主題', '原因'], (o.added || []).map(x => [x.w, x.r, x.m, x.c, x.why]))}
  ${homoTable(homo, kept)}`;
}

function gapsView(gaps, homo = [], kept = []) {
  if (!gaps) return '<p class="none">還沒整理。</p>';
  return ['N5', 'N4'].map(L => {
    const g = gaps[L] || { words: [], dropped: [] };
    const added = g.added || [];
    const byTheme = new Map(); g.words.concat(added).forEach(x => { if (!byTheme.has(x.c)) byTheme.set(x.c, []); byTheme.get(x.c).push(x); });
    return `<h2>${L}（新增 ${g.words.length + added.length}、篩掉 ${g.dropped.length}）</h2>
    <p class="note">分進 app 現有的 ${L} 主題，之後跟 ${L} 的內容一起出。</p>
    <div class="themes">${[...byTheme].map(([c, list]) => `<details class="theme" open><summary><span class="tname">${esc(c)}</span><span class="tcount">${list.length} 字</span></summary><ul class="words">${list.map(x => word(x.w, x.r, x.m)).join('')}</ul></details>`).join('')}</div>
    <h3>篩掉的字</h3>${table(['字', '讀音', '原因'], g.dropped.map(x => [x.w, x.r, x.why]))}
    <h3>補的字</h3>${table(['字', '讀音', '意思', '主題', '原因'], added.map(x => [x.w, x.r, x.m, x.c, x.why]))}`;
  }).join('') + homoTable(homo.filter(h => h.L === 'N5' || h.L === 'N4'), kept);
}

// notes: the open questions for the user, shown above the tabs ([{ q, body }], from curriculum/review-notes.json)
function renderReview({ outlines = {}, gaps = null, cands = {}, notes = [], DATA = null }) {
  if (DATA) DATA = preOutline(DATA);   // the outline's own words in the app are still outline words
  // words kept by the app and up to each level: another reading kept there is not "still to place"
  const order = ['N5', 'N4', 'N3', 'N2', 'N1']; const keptAt = { N5: [], N4: [], N3: [], N2: [], N1: [] };
  if (gaps) ['N5', 'N4'].forEach(L => { const g = gaps[L] || {}; keptAt[L] = (g.words || []).concat(g.added || [], g.dropped || []); });
  LEVEL_VIEWS.forEach(([, L]) => { const o = outlines[L]; if (o) keptAt[L] = o.themes.flatMap(t => t.words.map(([w, r]) => ({ w, r }))).concat(o.added || [], o.dropped || []); });
  const upTo = (L) => ((DATA && DATA.VOCAB) || []).concat(...order.slice(0, order.indexOf(L) + 1).map(x => keptAt[x]));
  const count = (L) => { const o = outlines[L]; return o ? `${fmt(o.themes.reduce((s, t) => s + t.words.length, 0))} 字` : '還沒整理'; };
  const tabs = [['gaps', 'N5／N4 缺口', gaps ? `${(gaps.N5 || { words: [] }).words.length + (gaps.N4 || { words: [] }).words.length} 字` : '還沒整理']]
    .concat(LEVEL_VIEWS.map(([id, L]) => [id, L, count(L)]));
  const homo = homographs(cands);
  const views = [`<section class="view" id="v-gaps" data-view="gaps" aria-label="N5／N4 缺口">${gapsView(gaps, homo, upTo('N4'))}</section>`]
    .concat(LEVEL_VIEWS.map(([id, L]) => `<section class="view" id="v-${id}" data-view="${id}" aria-label="${L}">${outlines[L] ? levelView(outlines[L], homo.filter(h => h.L === L), upTo(L)) : `<p class="none">${L} 還沒整理。</p>`}</section>`));
  const cand = (L) => cands[L] ? cands[L].words.filter(x => x.status === 'new').length : 0;
  return `<title>N3–N1 課程大綱</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&display=swap">
<style>
/* layout: one reading column; a tab per level; inside a level the units by phase, then theme cards that open into word lists,
   then the kanji grid and the dropped / added tables. Colors and faces are the app's own (index.html). */
:root {
  --bg: #f5f6f8; --bg-elev: #ffffff; --bg-sunken: #e9ebef; --line: #e1e3e9; --line-2: #cfd2da;
  --fg: #16171c; --fg-2: #474a55; --fg-3: #767986;
  --accent: #4b57d1; --accent-soft: rgba(75,87,209,.09); --accent-line: rgba(75,87,209,.45);
  --font: "Noto Sans TC", system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-ja: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e0f13; --bg-elev: #15161b; --bg-sunken: #0a0b0e; --line: #262830; --line-2: #343743;
  --fg: #ecedf1; --fg-2: #b3b6c3; --fg-3: #80838f;
  --accent: #8b9cff; --accent-soft: rgba(139,156,255,.14); --accent-line: rgba(139,156,255,.45); color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #0e0f13; --bg-elev: #15161b; --bg-sunken: #0a0b0e; --line: #262830; --line-2: #343743;
  --fg: #ecedf1; --fg-2: #b3b6c3; --fg-3: #80838f;
  --accent: #8b9cff; --accent-soft: rgba(139,156,255,.14); --accent-line: rgba(139,156,255,.45); color-scheme: dark; }
body { background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 15px; line-height: 1.65;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 24px 64px; }
[lang="ja"] { font-family: var(--font-ja); }
.wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 20px; }
h1, h2, h3 { margin: 0; line-height: 1.35; text-wrap: balance; }
h1 { font-size: 26px; font-weight: 700; }
h2 { font-size: 19px; font-weight: 700; margin-top: 12px; }
h3 { font-size: 15px; font-weight: 700; color: var(--fg-2); margin-top: 6px; }
p { margin: 0; }
.sub, .note, .none { color: var(--fg-3); font-size: 13px; }
.lead { color: var(--fg-2); max-width: 65ch; }
.bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); display: grid; gap: 10px; padding-block: 8px; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.tabs button { font: inherit; font-size: 14px; padding: 5px 14px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--bg-elev); color: var(--fg-2); cursor: pointer; display: inline-flex; gap: 8px; align-items: baseline; }
.tabs button small { color: var(--fg-3); font-size: 12px; font-variant-numeric: tabular-nums; }
.tabs button[aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: var(--bg-elev); }
.tabs button[aria-selected="true"] small { color: var(--bg-elev); opacity: .85; }
button:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
#q { font: inherit; width: 100%; max-width: 420px; padding: 7px 12px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg-elev); color: var(--fg); }
.hits { color: var(--fg-3); font-size: 13px; font-variant-numeric: tabular-nums; }
.view { display: grid; gap: 12px; min-width: 0; }
.stats { font-variant-numeric: tabular-nums; color: var(--fg-2); }
.stats b { color: var(--fg); font-weight: 700; }
.units { display: grid; gap: 8px; }
.unit { background: var(--bg-elev); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; display: grid; gap: 6px; min-width: 0; }
.uhead { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
.uid { font-family: var(--mono); font-size: 12px; color: var(--accent); }
.utitle { font-weight: 700; }
.points { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.points li { display: grid; grid-template-columns: minmax(8em, 14em) 1fr auto; gap: 2px 12px; align-items: baseline; padding-block: 2px; border-top: 1px solid var(--line); min-width: 0; }
.points li:first-child { border-top: 0; }
.pm { color: var(--fg-2); }
.src { color: var(--fg-3); font-size: 12px; }
.themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; align-items: start; }
.theme { background: var(--bg-elev); border: 1px solid var(--line); border-radius: 10px; min-width: 0; }
.theme summary { cursor: pointer; padding: 10px 14px; display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: baseline; list-style: none; }
.theme summary::-webkit-details-marker { display: none; }
.tname { font-weight: 700; }
.tdesc { color: var(--fg-3); font-size: 13px; flex: 1; min-width: 0; }
.tcount { color: var(--fg-3); font-size: 12px; font-variant-numeric: tabular-nums; }
.words { list-style: none; margin: 0; padding: 0 14px 10px; display: grid; gap: 1px; }
.words li { display: flex; flex-wrap: wrap; gap: 0 8px; align-items: baseline; padding-block: 3px; border-top: 1px solid var(--line); }
.words .w { font-weight: 500; }
.words .r { color: var(--fg-3); font-size: 13px; margin-left: -6px; }
.words .m { color: var(--fg-2); font-size: 14px; }
.kanji { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(2.4em, 1fr)); gap: 4px; }
.kanji li { text-align: center; font-size: 20px; padding-block: 4px; background: var(--bg-elev); border: 1px solid var(--line); border-radius: 6px; }
.tablebox { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--fg-3); font-weight: 500; font-size: 12.5px; }
.notes { background: var(--bg-elev); border: 1px solid var(--accent-line); border-radius: 12px; padding: 14px 18px; display: grid; gap: 8px; }
.notes ol { margin: 0; padding-left: 1.3em; display: grid; gap: 8px; }
.notes .q { font-weight: 700; }
.notes .nb { color: var(--fg-2); font-size: 14px; }
footer { color: var(--fg-3); font-size: 12.5px; border-top: 1px solid var(--line); padding-top: 12px; }
@media (max-width: 520px) { .points li { grid-template-columns: 1fr; } .src { display: none; } }
</style>
<div class="wrap">
  <header style="display:grid;gap:6px">
    <h1>N3–N1 課程大綱</h1>
    <p class="sub">Nihongo Quest・草稿・新的字：N3 ${fmt(cand('N3'))}、N2 ${fmt(cand('N2'))}、N1 ${fmt(cand('N1'))}（扣掉 app 已有和更低一級已有的）</p>
    <p class="lead">每一級的單字（分主題、附中文意思）、漢字（教學順序）、文法點（分單元與階段），還有 N5、N4 還缺的字。看到要改的地方，直接在這一頁留言：寫出是哪一級、哪個主題或單元、要怎麼改。</p>
  </header>
  ${notes.length ? `<section class="notes" aria-label="要你決定的事"><h2>要你決定的事</h2><ol>${notes.map(n => `<li><p class="q">${esc(n.q)}</p><p class="nb">${esc(n.body)}</p></li>`).join('')}</ol></section>` : ''}
  <div class="bar">
    <div class="tabs" role="tablist">${tabs.map(([id, name, n]) => `<button type="button" role="tab" id="t-${id}" aria-controls="v-${id}" aria-selected="false" data-tab="${id}">${esc(name)}<small>${esc(n)}</small></button>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center"><input id="q" type="search" placeholder="在這一頁找字：寫法、讀音或中文" aria-label="在這一頁找字" autocomplete="off"><span class="hits" id="hits"></span></div>
  </div>
  ${views.join('\n  ')}
  <footer>JLPT 單字、漢字、文法點的等級：Jonathan Waller 的 JLPT Resources（tanos.co.uk），CC BY。文法點對照：OpenJLPT（evanclan/OpenJLPT），CC BY-SA 4.0，只取句型名稱與等級。中文意思、主題與單元是 Nihongo Quest 自己整理的。</footer>
</div>
<script>
(() => {
  const tabs = [...document.querySelectorAll('[data-tab]')]; const views = [...document.querySelectorAll('[data-view]')];
  const q = document.getElementById('q'); const hits = document.getElementById('hits');
  const filled = (id) => !document.getElementById('v-' + id).querySelector(':scope > .none');
  const show = (id) => {
    if (!tabs.some(t => t.dataset.tab === id)) id = ['n3', 'gaps'].find(filled) || 'gaps';
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    views.forEach(v => { v.hidden = v.dataset.view !== id; });
    filter();
  };
  // search: keep the words, points and table rows that contain the text, in the open level
  function filter() {
    const view = views.find(v => !v.hidden); const s = q.value.trim().toLowerCase();
    const rows = view ? [...view.querySelectorAll('.words li, .points li, tbody tr')] : [];
    let n = 0;
    rows.forEach(li => { const ok = !s || li.textContent.toLowerCase().includes(s); li.hidden = !ok; if (ok && s) n++; });
    if (view) view.querySelectorAll('details.theme').forEach(d => { if (s) d.open = [...d.querySelectorAll('.words li')].some(li => !li.hidden); });
    hits.textContent = s ? n + ' 筆' : '';
  }
  tabs.forEach(t => t.addEventListener('click', () => { if (location.hash !== '#' + t.dataset.tab) location.hash = t.dataset.tab; else show(t.dataset.tab); }));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  q.addEventListener('input', filter);
  show(location.hash.slice(1));
})();
</script>
`;
}

if (require.main === module) {
  const out = process.argv[2]; if (!out) { console.error('usage: node scripts/curriculum/render-review.js <out.html>'); process.exit(1); }
  const root = path.join(__dirname, '..', '..');
  const read = (rel) => { const p = path.join(root, 'curriculum', rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const { loadSources, loadData, buildCandidates } = require('./build-candidates.js');
  const outlines = {}; LEVEL_VIEWS.forEach(([id, L]) => { const o = read(`${id}.json`); if (o) outlines[L] = o; });
  const cands = buildCandidates(loadSources(path.join(root, 'curriculum', 'sources')), loadData(root));
  fs.writeFileSync(out, renderReview({ outlines, gaps: read('gaps-n5n4.json'), cands, notes: read('review-notes.json') || [], DATA: loadData(root) }));
  console.log(`wrote ${out}`);
}

module.exports = { renderReview };
