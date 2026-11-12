'use strict';
/* ==========================================================================
   Settings (modal): learning (with speech rate and offline audio), data, appearance
   ========================================================================== */
const SETTINGS_TABS = [['learn', '學習'], ['data', '資料'], ['look', '外觀']];
let settingsTab = 'learn';
let settingsDirty = false;

function openSettings(tab) {
  settingsTab = SETTINGS_TABS.some(t => t[0] === tab) ? tab : (settingsTab || 'learn');
  openModal('設定', settingsHtml(), { width: 680, noFocus: true });
}
function refreshSettings() {
  const b = document.getElementById('modalBody');
  if (b) b.innerHTML = settingsHtml();
}
function settingsHtml() {
  const tabs = `<div class="seg mb-4" role="tablist">${SETTINGS_TABS.map(([k, l]) => `<button type="button" aria-pressed="${settingsTab === k}" data-act="settings-tab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  const body = { learn: settingsLearn, data: settingsData, look: settingsLook }[settingsTab]();
  return tabs + body;
}

function boolRow(key, label, hint) {
  return `<div class="setting-row"><div><div class="label">${label}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>
    <label class="switch"><input type="checkbox" ${state.settings[key] ? 'checked' : ''} data-change="setting" data-key="${key}" data-type="bool" /><span class="track"></span></label></div>`;
}
// a volume, 0–100 % (0: off), heard as it is dragged (setVol) and kept when let go (CHANGE_ACTIONS.setting)
const volText = (v) => (v > 0 ? `${Math.round(v * 100)}%` : '關');
function volRow(key, label, hint) {
  const v = state.settings[key];
  return `<div class="setting-row"><div><div class="label">${label}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>
    <div class="row"><input type="range" min="0" max="1" step="0.05" value="${esc(v)}" data-change="setting" data-key="${key}" data-type="num" data-min="0" data-max="1" data-vol aria-label="${label}音量" style="width:160px" /><span class="vol-val small muted">${volText(v)}</span></div></div>`;
}
function setVol(el) {
  const v = clamp(Number(el.value), 0, 1); if (!Number.isFinite(v)) return;
  state.settings[el.dataset.key] = v;
  const t = el.parentNode.querySelector('.vol-val'); if (t) t.textContent = volText(v);
  if (el.dataset.key === 'ambientVol') SND.volume(); else MUSIC.volume();
}
document.addEventListener('input', (e) => { const el = e.target.closest && e.target.closest('input[data-vol]'); if (el) setVol(el); });
function selRow(key, label, hint, options) {
  const cur = key === 'furiState' ? furiState() : key === 'theme' ? themeMode() : state.settings[key];
  return `<div class="setting-row"><div><div class="label">${label}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>
    <select class="select" style="width:auto;max-width:260px" data-change="setting" data-key="${key}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
}
function settingsLearn() {
  const s = state.settings;
  return `
    ${boolRow('showZh', '題目下方直接顯示中文', '關閉時可按 T 或點「顯示中文」再看。需要中文才能判斷的題目仍會顯示。')}
    <div class="setting-row"><div><div class="label">考試</div><div class="hint">學習分析和模擬考頁會照這個級別和日期推估進度。</div></div>
      <div class="row"><select class="select" style="width:auto" data-change="setting" data-key="examLevel">${courseLevels().map(v => `<option value="${v}" ${s.examLevel === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <input class="input" type="date" style="width:auto" value="${esc(s.examDate)}" data-change="setting" data-key="examDate" data-type="date" /></div></div>
    ${volRow('ambientVol', '環境音', '點東西的聲音、腳步聲、每個地方的背景聲（海浪、蟲鳴…）。唸日文時會自動變小聲。')}
    ${volRow('musicVol', '音樂', '留聲機和店裡放的唱片。唸日文時會變小聲。')}
    <div class="setting-row"><div><div class="label">語速</div><div class="hint">目前 ${Number(s.speechRate).toFixed(2)} 倍</div></div>
      <div class="row"><input type="range" min="0.6" max="1.2" step="0.05" value="${esc(s.speechRate)}" data-change="setting" data-key="speechRate" data-type="num" data-min="0.6" data-max="1.2" style="width:160px" /><button type="button" class="btn btn-sm" data-act="tts-test">${icon('speaker')}試聽</button></div></div>
    <div id="audioPrefetchBox" class="small mt-2">${audioPrefetchHtml()}</div>
    <details class="mt-3"><summary class="small muted" style="cursor:pointer">完全離線使用（進階，通常不需要）</summary>
      <div class="hint mt-2"><b>平常不用按：</b>今天要練的語音會自動先存好，播過的句子也會留著。這兩個按鈕是把整套課程一次抓完，日文約 220 MB、中文約 120 MB，只適合長時間沒有網路的情況。可以中斷，再按會接著下載，已下載的會略過。</div>
      <div class="row-wrap mt-2"><button type="button" class="btn btn-sm btn-ghost" data-act="cloud-dl-all" data-kind="ja">下載日文音檔（約 220 MB）</button><button type="button" class="btn btn-sm btn-ghost" data-act="cloud-dl-all" data-kind="zh">下載中文音檔（約 120 MB）</button><button type="button" class="btn btn-sm btn-ghost" data-act="cloud-dl-stop">停止</button></div>
      <div id="cloudDlBox" class="small mt-2">${cloudDlHtml()}</div>
    </details>`;
}

function settingsData() {
  let legacyExists = false;
  try { legacyExists = Boolean(localStorage.getItem(LEGACY_KEY)); } catch (e) { /* ignore */ }
  const hiddenN = state.hidden.length;
  const syncBlock = !Sync.client
    ? `<div class="setting-row"><div><div class="label">雲端同步</div><div class="hint">這個版本尚未設定雲端同步。</div></div></div>`
    : Sync.session
      ? `<div class="setting-row"><div><div class="label">雲端同步</div><div class="hint">已登入 <b>${esc(Sync.email || '')}</b>。${Sync.meta && Sync.meta.lastSyncedAt ? `最後同步 ${esc(new Date(Sync.meta.lastSyncedAt).toLocaleString('zh-TW', { hour12: false }))}。` : '尚未同步。'}${Sync.status === 'error' ? `<br><span class="bad">同步失敗：${esc(Sync.lastError || '')}</span>` : ''}</div></div>
          <div class="row-wrap">${Sync.status === 'error' ? '<button type="button" class="btn btn-sm btn-primary" data-act="sync-retry">重試</button>' : '<button type="button" class="btn btn-sm btn-primary" data-act="sync-now">立即同步</button>'}<button type="button" class="btn btn-sm" data-act="sync-logout">登出</button><button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="sync-delete-cloud">刪除雲端資料</button></div></div>`
      : Sync.pendingEmail
        ? `<div class="setting-row"><div><div class="label">輸入驗證碼</div><div class="hint">登入信已寄到 <b>${esc(Sync.pendingEmail)}</b>。把信裡的 8 位數驗證碼輸入這裡（在 iPhone 主畫面 app 裡請用這個方式）；用電腦瀏覽器的話也可以直接點信裡的連結。</div></div>
          <div class="row-wrap"><input type="text" id="syncCode" placeholder="12345678" inputmode="numeric" autocomplete="one-time-code" maxlength="8" /><button type="button" class="btn btn-sm btn-primary" data-act="sync-verify">登入</button><button type="button" class="btn btn-sm btn-ghost" data-act="sync-cancel-code">換一個 email</button></div></div>`
        : `<div class="setting-row"><div><div class="label">雲端同步</div><div class="hint">每個人的資料各自獨立。AI 設定（含 API 金鑰與位址）只留在這台裝置，不會上傳。第一次在新裝置登入時，若雲端已有進度，會以雲端為準，這台原本的進度不會保留。</div></div>
          <div class="row-wrap"><input type="email" id="syncEmail" placeholder="you@example.com" autocomplete="email" inputmode="email" /><button type="button" class="btn btn-sm btn-primary" data-act="sync-login">寄送登入信</button></div></div>`;
  // 重設所有進度 folds away, grey like the admin block under it, so it is hard to hit by accident (1.0.48)
  return `
    ${syncBlock}
    ${legacyExists ? `<div class="setting-row"><div><div class="label">重新匯入舊版進度</div><div class="hint">這個瀏覽器裡還有舊版的資料（舊版本身不受影響）。重新匯入會取代目前的進度。</div></div>
      <button type="button" class="btn btn-sm" data-act="legacy-reimport">重新匯入</button></div>` : ''}
    ${hiddenN ? `<div class="setting-row"><div><div class="label">已隱藏 ${hiddenN} 個題目或單字</div><div class="hint">在單字表按「隱藏」的單字，和以前練習時移出題庫的題目。</div></div>
      <button type="button" class="btn btn-sm" data-act="restore-hidden">全部還原</button></div>` : ''}
    ${state.customGrammar.length || state.customExam.length ? `<div class="setting-row"><div><div class="label">AI／自訂題目</div><div class="hint">文法題 ${state.customGrammar.length} 道、模擬考題 ${state.customExam.length} 道。</div></div>
      <button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="clear-custom-items">清除</button></div>` : ''}
    <p class="hint mt-3">資料存在這個瀏覽器的本機儲存空間（IndexedDB）。登入雲端同步後會自動在裝置間同步。</p>
    <details class="mt-4"><summary class="small muted" style="cursor:pointer">重設所有進度</summary>
      <div class="hint mt-2">清除熟練度、錯題本與紀錄；有登入的話，雲端上的進度也會一起清掉，無法復原。AI 設定會保留。</div>
      <div class="row-wrap mt-3"><button type="button" class="btn btn-sm btn-danger" data-act="reset-all">重設所有進度</button></div>
    </details>
    <details class="mt-2"><summary class="small muted" style="cursor:pointer">管理者：生成雲端音檔</summary>
      <div class="hint mt-2">把全部教材句子生成一次並上傳到 Cloudflare R2 的 nihongo-audio；日文用 Google 的 Neural2 聲音，中文（單字意思、例句與文法的翻譯、漢字字義）用 Google 的台灣華語聲音，給「聽一輪」用；小鎮上的人（對話、外婆的日記）每人一個 Google Chirp 3 HD 聲音。三把金鑰只在這一次執行中使用：不儲存、不同步、關掉頁面就消失；R2 金鑰只能讀寫這一個 bucket。已存在的檔案會略過，可以中斷再續跑。</div>
      <div class="field mt-3"><label>Google Cloud API Key</label><input class="input" type="password" autocomplete="off" id="cloudGoogleKey" value="${esc(ttsConfig().googleKey || '')}" /></div>
      <div class="field mt-3"><label>R2 Access Key ID</label><input class="input" type="text" autocomplete="off" id="cloudR2KeyId" /></div>
      <div class="field mt-3"><label>R2 Secret Access Key</label><input class="input" type="password" autocomplete="off" id="cloudR2Secret" /></div>
      <details class="mt-3"><summary class="small" style="cursor:pointer">試聽角色聲音（只用上面的 Google 金鑰，不上傳）</summary>
        <div class="hint mt-2">每個角色唸他說的第一句。點了才生成那一句，聽過的這次開著頁面再點不用重新生成。覺得哪個人的聲音不對，先換掉再整批生成。</div>
        <div id="castPreviewBox" class="mt-2">${castPreviewHtml()}</div></details>
      <div class="row-wrap mt-3"><button type="button" class="btn btn-primary" data-act="cloud-gen-start">開始生成</button><button type="button" class="btn" data-act="cloud-gen-stop">停止</button></div>
      <div id="cloudGenBox" class="small mt-2">${cloudGenHtml()}</div>
    </details>`;
}

function changelogItems(list) {
  return list.map(c => `<li><b>${c.label ? esc(c.label) : `v${c.v}`}</b><span class="muted">${c.from && c.from !== c.v ? `（v${c.from} 起）` : ''}${c.label ? '' : `・${c.date}`}</span><ul>${c.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('');
}
function settingsLook() {
  return `
    ${selRow('theme', '主題', '跟著時間：白天淺色、晚上深色，和書房一起。永夜、永晝：一直是晚上／白天，書房和院子也一樣。', [['clock', '跟著時間'], ['night', '永夜'], ['day', '永晝']])}
    ${selRow('furiState', '振假名', '「熟練的字不標」：已經記熟的字不標讀音。', [['all', '全部顯示'], ['smart', '熟練的字不標'], ['off', '全部隱藏']])}
    <div class="setting-row kbd-hint"><div><div class="label">鍵盤快速鍵</div><div class="hint">練習：1–4 作答、Enter 下一題、R 發音、T 顯示中文、F 振假名、Esc 結束。字卡：Space 翻面、1–4 評分。</div></div></div>
    <details class="disclose mt-3">
      <summary>怎麼安裝成 app？</summary>
      ${installGuideHtml()}
    </details>
    <p class="hint mt-3">版本 ${APP_VERSION}</p>
    <p class="hint mt-2">單字、漢字、文法點的 JLPT 等級參考 Jonathan Waller 的 JLPT Resources（tanos.co.uk，CC BY）。</p>
    <details class="disclose mt-2">
      <summary>版本紀錄</summary>
      <ul class="changelog small dim mt-2">${changelogItems(CHANGELOG.filter(c => !c.label))}</ul>
      ${CHANGELOG.some(c => c.label) ? `<details class="disclose mt-2"><summary>更早的版本</summary><ul class="changelog small dim mt-2">${changelogItems(CHANGELOG.filter(c => c.label))}</ul></details>` : ''}
    </details>`;
}

// ---------- restore (the old version's data) ----------
function applyImportedState(next, msg) {
  const keepTts = state.ttsConfig;
  state = normalizeState(next);
  LAST_BULK_MARK = null;   // the snapshot belongs to the state that was replaced
  // restored data without keys (the old version's) should not wipe the keys already entered here
  if (keepTts && !(state.ttsConfig && TTS_SECRET_KEYS.some(k => state.ttsConfig[k]))) state.ttsConfig = Object.assign({}, state.ttsConfig || {}, Object.fromEntries(TTS_SECRET_KEYS.map(k => [k, keepTts[k] || ''])));
  saveState(); buildRegistry(); applyTheme(); applyFurigana();
  SESSION = null; FLASH = null; EXAM = null;
  closeModal(); toast(msg, 4000); go('#/today');
}
// ---------- change handlers ----------
Object.assign(CHANGE_ACTIONS, {
  setting: (el) => {
    const k = el.dataset.key;
    let v;
    if (el.dataset.type === 'bool') v = el.checked;
    else if (el.dataset.type === 'num') {
      v = Number(el.value);
      if (!Number.isFinite(v)) return;
      v = clamp(v, Number(el.dataset.min ?? -Infinity), Number(el.dataset.max ?? Infinity));
      el.value = v;
    } else if (el.dataset.type === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return; v = el.value; }
    else v = el.value;
    if (k === 'furiState') {
      state.settings.furigana = v !== 'off';
      if (v !== 'off') state.settings.furiMode = v;
      saveState(); applyFurigana();
      if (modalOpen()) settingsDirty = true; else route();
      return;
    }
    if (k === 'retention') v = Number(v) || 0.9;
    state.settings[k] = v;
    saveState();
    if (k === 'theme') { if (document.body.classList.contains('scene')) sceneTick(); else applyTheme(); }   // a scene behind the dialog changes too
    if (k === 'furigana') applyFurigana();
    if (k === 'speechRate') { const hint = el.closest('.setting-row').querySelector('.hint'); if (hint) hint.textContent = `目前 ${Number(v).toFixed(2)} 倍`; }
    if (el.dataset.vol !== undefined) setVol(el);   // let go: the sound as set
    if (modalOpen()) settingsDirty = true; else route();
  },
});

Object.assign(ACTIONS, {
  'settings-tab': (el) => { settingsTab = el.dataset.tab; refreshSettings(); },
  'tts-test': () => testVoice(),
  'cloud-gen-start': () => {
    const val = (id) => ((document.getElementById(id) || {}).value || '').trim();   // pasted keys often carry spaces or a line break
    const gk = val('cloudGoogleKey'); const r2 = { keyId: val('cloudR2KeyId'), secret: val('cloudR2Secret') };
    if (!gk || !r2.keyId || !r2.secret) { toast('三個欄位都要填。'); return; }
    cloudGenStart(gk, r2);
  },
  'cloud-gen-stop': () => { if (CLOUD_GEN) CLOUD_GEN.stop = true; },
  'cast-preview': (el) => {
    const gk = ((document.getElementById('cloudGoogleKey') || {}).value || '').trim();
    if (!gk) { toast('先在上面貼上 Google Cloud API Key。'); return; }
    castPreview(el.dataset.who, gk, el.dataset.try || '');
  },
  'cloud-dl-all': (el) => cloudDownloadAll(el.dataset.kind || 'ja'),
  'cloud-dl-stop': () => { if (CLOUD_DL) CLOUD_DL.stop = true; },
  'legacy-reimport': () => {
    let raw = null;
    try { raw = localStorage.getItem(LEGACY_KEY); } catch (e) { /* ignore */ }
    if (!raw) { toast('找不到舊版資料'); return; }
    if (!confirm('從舊版重新匯入？目前這個版本的進度會被取代。')) return;
    try { applyImportedState(migrateLegacy(JSON.parse(raw)), '已重新匯入舊版進度'); } catch (e) { console.error(e); toast('舊版資料無法讀取'); }
  },
  'restore-hidden': () => { const n = state.hidden.length; state.hidden = []; saveState(); buildRegistry(); refreshSettings(); settingsDirty = true; toast(`已還原 ${n} 個項目`); },
  'clear-custom-items': () => {
    if (!confirm('清除所有 AI／自訂的文法題與模擬考題？')) return;
    state.customGrammar.forEach(g => { delete state.srs['g:' + g.id]; });
    state.customGrammar = []; state.customExam = [];
    saveState(); buildRegistry(); refreshSettings(); settingsDirty = true; toast('已清除');
  },
  'reset-all': () => {
    if (!confirm('確定要重設所有進度？這個動作無法復原。')) return;
    if (!confirm('再確認一次：熟練度、錯題本、學習紀錄都會被清除。')) return;
    const keep = { ttsConfig: state.ttsConfig, theme: state.settings.theme };
    state = normalizeState(defaultState());   // 書房's own things laid out again (1.2.0)
    state.ttsConfig = keep.ttsConfig; state.settings.theme = keep.theme;
    Sync.allowEmpty = true;   // the one empty progress the cloud takes (1.8.2)
    state.resetAt = new Date().toISOString();   // and the mark the cloud's guard lets through (1.9.1, supabase/progress-guard.sql)
    saveState(); buildRegistry();
    SESSION = null; FLASH = null; EXAM = null;
    closeModal(); toast('已重設'); go('#/today');
  }
});
