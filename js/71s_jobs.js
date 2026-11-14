'use strict';
// ---------- 中華街の打工's four jobs (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §6) ----------
// Each a runner WORK starts with its ctx (WORK.register): ten tasks from what the learner has seen — 中華街 is the first and lowest
// of the workplaces, so kana, kana-only 入門 words, number words once learned, prices under 1,000 円, no kanji. A task right is
// ctx.right(k, misses) as it is done; the tenth: ctx.finish().
const JOBS = (() => {
  const N = 10, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const say = (job) => TOWN.WORK.say[job];
  const words = () => REG.vocab.filter((v) => v.lv === 'PRE_N5' && v.w === v.r && /^[ぁ-ゖァ-ヺー]+$/.test(v.w) && state.srs[v.key]).map((v) => v.w);
  // the keeper's word at the top of the card, said in their voice
  function word(job, [ja, zh], cls = '') {
    const p = document.querySelector('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); }
    speakAs(say(job).who, ja);
  }
  const head = (job, title, k) => `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
    <div class="wk-head"><b lang="ja">${title}</b><span class="wk-n">${Math.min(k + 1, N)}／${N}</span></div>
    <div class="wk-who"><span class="kr-face">${TOWNEV.face(say(job).who)}</span><p class="wk-say"></p></div>`;

  // ---- 整理貨架 (ふく, 張さん): a box comes in, its things one at a time, each with a label; the shelf's four cells have labels too;
  // tap the cell with the same. Labels: a seen kana each (look-alikes beside it on the shelf when seen); once four kana-only 入門
  // words are learned, three to five of the ten are those words. Wrong: 張's ちがう！ and the thing stays; wrong twice, the right
  // cell lights up ----
  function shelfMake(seen = [...kanaSeenSet()], ws = words()) {
    const nw = ws.length >= 4 ? 3 + Math.floor(Math.random() * 3) : 0;
    return shuffle(Array.from({ length: N }, (_, k) => {
      const pool = k < nw ? ws : seen, label = pick(pool);
      const alike = k < nw ? [] : shuffle(KANA_LOOKALIKE.filter((g) => g.includes(label)).flat().filter((c, i, all) => c !== label && seen.includes(c) && all.indexOf(c) === i));
      const rest = alike.concat(shuffle(pool.filter((c) => c !== label && !alike.includes(c))));
      return { label, bins: shuffle([label, ...rest.slice(0, 3)]) };
    }));
  }
  function shelfRun(ctx) {
    const tasks = shelfMake(); let k = ctx.done, miss = 0, busy = false;
    const draw = () => {
      const t = tasks[k], card = document.querySelector('.wk-shelf .cls-card'); if (!card) return;
      card.querySelector('.wk-n').textContent = `${k + 1}／${N}`;
      card.querySelector('.wk-box').innerHTML = `<span class="wk-item${t.label.length > 1 ? ' wd' : ''}" data-label="${esc(t.label)}" lang="ja">${esc(t.label)}</span>`;
      card.querySelector('.wk-bins').innerHTML = t.bins.map((l) => `<button type="button" class="wk-bin${l.length > 1 ? ' wd' : ''}" data-label="${esc(l)}" lang="ja"><span>${esc(l)}</span></button>`).join('');
      miss = 0; busy = false; speak(t.label);
    };
    CLASS.card('wk-shelf', '整理貨架', `${head('shelf', 'ふくの たな', k)}<div class="wk-box"></div><div class="wk-bins"></div>`, (e) => {
      const b = e.target.closest('.wk-bin'); if (!b || busy || !ctx.on()) return;
      const t = tasks[k];
      if (b.dataset.label !== t.label) {   // the wrong cell: it shakes, 張 says so, the thing stays
        miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('shelf', say('shelf').miss, 'bad');
        if (miss >= 2) document.querySelectorAll('.wk-bin').forEach((x) => x.classList.toggle('wk-hint', x.dataset.label === t.label));
        return;
      }
      busy = true; ctx.right(k, miss); SND.play('place', { vol: 0.6 }); b.classList.add('wk-in');
      const item = document.querySelector('.wk-item'); if (item) item.classList.add('wk-gone');
      if (!miss && Math.random() < 0.3) word('shelf', pick(say('shelf').ok));
      k++;
      setTimeout(() => {
        if (!document.querySelector('.wk-shelf')) return;
        if (k < N) { draw(); return; }
        word('shelf', say('shelf').end, 'ok'); setTimeout(() => { CLASS.close(); ctx.finish(); }, 700);
      }, 380);
    });
    draw();
  }
  const shelfLines = (add) => { const s = say('shelf'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0])); };

  WORK.register('shelf', { run: shelfRun, lines: shelfLines });
  return { shelf: { make: shelfMake, run: shelfRun } };
})();
