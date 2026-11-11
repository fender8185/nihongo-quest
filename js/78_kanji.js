'use strict';
/* ==========================================================================
   Kanji: overview grid, detail card, practice queue
   ========================================================================== */
function kanjiLevelClass(k) {
  const r = state.srs[k.key];
  if (!r) return '';
  return r.b >= SRS_MASTERED ? 'lv4' : r.b >= SRS_LEARNED ? 'lv3' : r.b >= 1 ? 'lv2' : 'lv1';
}
function kanjiCounts(lv) {
  const list = REG.kanji.filter(k => k.lv === lv);
  return { total: list.length, seen: list.filter(k => state.srs[k.key]).length, learned: list.filter(k => (state.srs[k.key] || {}).b >= SRS_LEARNED).length };
}

function kanjiDetailHtml(k) {
  const r = state.srs[k.key];
  const looks = (k.look || []).map(c => REG.byKey.get('k:' + c)).filter(Boolean);
  return `<div class="row" style="gap:18px;align-items:flex-start">
      <div class="kanji-tile big jp">${esc(k.k)}</div>
      <div class="grow">
        <div style="font-size:18px"><b>${esc(k.m)}</b></div>
        <div class="row-wrap mt-2">${kanjiReadingsHtml(k)}</div>
        <div class="small muted mt-2">${k.lv}・${r ? `${srsLevelLabel(r)}・${dueLabel(r, k.key)}` : '還沒學'}</div>
      </div>
    </div>
    <div class="list mt-3">${(k.ex || []).map(([w, rd, m]) => `<div class="list-item"><span class="jp" style="font-size:18px">${rubyHtml(w, rd)}</span><span class="small muted grow">${esc(m)}</span><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(jaPlain(w))}" data-reading="${esc(rd && !HAS_KANJI.test(rd) && rd !== jaPlain(w) ? rd : '')}" aria-label="發音">${icon('speaker')}</button></div>`).join('')}</div>
    ${looks.length ? `<div class="small muted mt-3">容易混淆的字</div><div class="row-wrap mt-1">${looks.map(x => `<button type="button" class="btn btn-sm" data-act="kanji-open" data-k="${esc(x.k)}"><span class="jp" style="font-size:18px">${esc(x.k)}</span><span class="small muted">${esc(x.m)}</span></button>`).join('')}</div>` : ''}`;
}

function buildKanjiQueue(size = 15, lv = null) {
  if (lv) {   // one level on purpose (the level page): due first, then unseen in table order
    const pool = REG.kanji.filter(k => k.lv === lv);
    return scopeQueue(pool, pool.filter(k => !state.srs[k.key]).sort((a, b) => a.order - b.order), size);
  }
  const left = todayNewLeft('k');
  return scopeQueue(REG.kanji, newKanjiCandidates().slice(0, left), size);   // reviews of every learned kanji, new ones of the current level
}

Object.assign(ACTIONS, {
  'kanji-open': (el) => {
    const k = REG.byKey.get('k:' + el.dataset.k);
    if (k) openModal(`漢字「${k.k}」`, kanjiDetailHtml(k), { width: 520, noFocus: true });
  },
  'start-kanji': () => startSession('kanji'),
  'start-kanji-level': (el) => startSession('kanji', { lv: el.dataset.lv }),
  'kana-row': (el) => startSession('kana', { row: Number(el.dataset.row), script: el.dataset.script }),
  'kana-script': (el) => {   // switched in place: re-rendering would fold the 五十音 box again on a phone
    kanaScript = el.dataset.script === 'kata' ? 'kata' : 'hira';
    const pair = el.closest('.kana-pair'); if (!pair) return;
    pair.dataset.show = kanaScript;
    pair.querySelectorAll('[data-act="kana-script"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.script === kanaScript)));
  }
});
