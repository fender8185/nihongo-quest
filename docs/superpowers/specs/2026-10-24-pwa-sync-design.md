# Nihongo Quest N4：PWA 化 + 多裝置同步 設計規格

日期：2026-10-24
狀態：已核准，進入實作計畫

## 1. 目標與範圍

### 目標
- 手機（iPhone）與電腦都能開同一個 app，進度一致。
- 資料本地優先：離線可用、裝置上永遠有一份完整進度、不會因 Safari 清儲存而消失。
- 2～3 位使用者各自登入，彼此看不到對方的資料。
- 現有功能與操作方式不變，單一 HTML 的開發模式盡量維持。

### 不在範圍（YAGNI）
- 欄位級合併（例如兩台同時各做了不同題再合併）。採 last-write-wins。
- Anki 匯入的音檔／圖片（`AnkiMedia` IndexedDB blob）跨裝置同步。只同步卡片文字。
- 原生 iOS 殼（Capacitor / WKWebView）、TestFlight、App Store。本設計不阻礙日後加殼。
- 多人共享牌組或排行榜等社交功能。

### 成功標準
1. Mac 做完一輪題，iPhone 打開 30 秒內看到相同的 SRS 狀態與統計。
2. iPhone 關掉 Wi-Fi 做題，恢復網路後不需任何操作即補推到雲端。
3. 第二個帳號登入後，資料是空白起始狀態，看不到第一個帳號的任何內容。
4. 未登入時 app 行為與現在完全相同（純本地）。
5. iPhone 加到主畫面後，飛航模式下仍可開啟並做題。

## 2. 現況摘要（實作者需知）

- 單一檔案 `nihongo_quest_n4_v3.html`（約 1.6 MB、6187 行）。內部以註解分段（`20_data.js` … `90_init.js`），新程式碼依此慣例新增 `85_sync.js` 段落，放在 `83_safety.js` 與 `90_init.js` 之間。
- 進度存在 `localStorage[STORE_KEY]`，`STORE_KEY = 'nihongo_quest_n4_v3'`（第 707 行附近）。`saveState()` 同步寫入、`loadState()` 同步讀取，`init()`（`90_init.js`）在啟動時呼叫 `loadState()`。
- `state` 的頂層結構見 `defaultState()`（第 770 行附近）。其中 `aiConfig` 與 `ttsConfig` 含第三方 API 金鑰（`geminiKey`、`openaiKey`、`deepgramKey`）。
- 既有可重用邏輯：
  - `normalizeState(s)`：補齊缺欄位、修正型別。所有外來 state 都要經過它。
  - `exportBackup(withKeys)`：`withKeys=false` 時會把金鑰欄位清空。同步上傳要沿用同樣的去金鑰規則。
  - `applyImportedState(next, msg)`：套用外來 state 時會保留本機已輸入的金鑰。同步下拉要沿用同樣的保留規則。
  - `window.addEventListener('storage', …)`：另一分頁存檔時，若本分頁不在 `SESSION`/`EXAM` 中就套用新 state。同步下拉遵守同一個「不打斷進行中的練習」規則。
  - `requestPersistence()`（`83_safety.js`）已呼叫 `navigator.storage.persist()`。
  - `AnkiMedia`（`82_anki.js`）已示範 IndexedDB 的開啟與 put/get 寫法，可照抄風格。

## 3. 架構

```
┌─────────────── 瀏覽器 / 主畫面 PWA ───────────────┐
│  index.html (原 nihongo_quest_n4_v3.html)         │
│   ├─ 既有 app 程式碼（不變）                       │
│   ├─ 85_sync.js  ← 新：登入、推送、下拉、狀態列     │
│   └─ sync-core.js ← 新：純函式（可被 Node 測試）    │
│  sw.js            ← 新：離線快取 app shell          │
│  manifest.webmanifest ← 新                         │
│                                                    │
│  IndexedDB  nihongo_quest_db / kv                  │
│    state   : 完整 state JSON（本地唯一真相）        │
│    meta    : { pendingSync, lastSyncedAt, deviceId }│
└──────────────┬─────────────────────────────────────┘
               │ supabase-js（HTTPS）
┌──────────────▼─────────────────────────────────────┐
│  Supabase（免費方案）                               │
│   Auth: email magic link                           │
│   Table progress (user_id PK, state jsonb,         │
│                   updated_at, device_id)           │
│   RLS: auth.uid() = user_id                        │
└────────────────────────────────────────────────────┘
```

靜態檔放 GitHub Pages 或 Cloudflare Pages（擇一，實作時由使用者決定帳號）。Supabase 的 `anon key` 直接寫在前端，這是 Supabase 的預設用法，安全性靠 RLS，不靠隱藏 key。

## 4. 元件設計

### 4.1 靜態託管 + PWA
- 檔案佈局（repo 根目錄）：
  - `index.html`：由 `nihongo_quest_n4_v3.html` 改名而來。原檔名不再使用。
  - `sync-core.js`、`sw.js`、`manifest.webmanifest`、`icons/icon-192.png`、`icons/icon-512.png`、`icons/apple-touch-icon.png`。
- `manifest.webmanifest`：`name` "Nihongo Quest N4"、`display: standalone`、`start_url: ./#/today`、`theme_color: #0e0f13`、`background_color: #0e0f13`、`lang: zh-Hant`。
- `index.html` `<head>` 加：`<link rel="manifest">`、`<link rel="apple-touch-icon">`、`<meta name="apple-mobile-web-app-capable" content="yes">`、`<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`。
- `sw.js`：
  - 快取名稱含版本號常數 `CACHE = 'nq-v1'`，每次發佈遞增。
  - `install`：預快取 `index.html`、`sync-core.js`、`manifest.webmanifest`、icons。
  - `fetch`：同源請求採 cache-first；Supabase、Google Fonts、任何第三方 API 一律 network-only（不快取）。
  - `activate`：刪除舊版本快取，`clients.claim()`。
  - 新版 SW 進入 `waiting` 時，頁面顯示 toast「有新版本，點此重新整理」，點了才 `skipWaiting` + reload。避免使用者練習到一半被強制刷新。
- 註冊：`90_init.js` 的 `init()` 末尾 `navigator.serviceWorker.register('./sw.js')`，失敗靜默。

### 4.2 本地儲存：IndexedDB
- DB `nihongo_quest_db`，版本 1，object store `kv`（key 為字串）。
  - `kv['state']`：完整 state 物件（直接存物件，不先 stringify）。
  - `kv['meta']`：`{ deviceId, pendingSync: boolean, lastSyncedAt: ISO|null, lastPulledUpdatedAt: ISO|null }`。
- `saveState()` 維持同步函式簽名（48 個呼叫點不動），內部改為：
  1. `state.updatedAt = new Date().toISOString()`。
  2. 排程一次 IndexedDB put（同一個 tick 內多次呼叫合併成一次寫入）。
  3. 呼叫 `Sync.schedulePush()`（見 4.4）。
  4. 另外 `BroadcastChannel('nq-state')` 發一則 `{type:'saved', updatedAt}`，取代原本依賴 `storage` 事件的跨分頁更新。收到的分頁從 IndexedDB 重讀 state，規則同現有 `storage` handler。
- `loadState()` 改為 `async`，`init()` 跟著改為 `async`。讀取順序：
  1. IndexedDB `kv['state']` 有值 → `normalizeState` → 回傳 `'loaded'`。
  2. 否則 `localStorage[STORE_KEY]` 有值 → `normalizeState` → 寫入 IndexedDB → 回傳 `'migrated'`。**不刪除** `localStorage` 舊值，保留一版作為保險。
  3. 否則走現有 `LEGACY_KEY` 遷移與 `defaultState()` 路徑。
- IndexedDB 不可用（極少數隱私模式）時，退回 `localStorage`，行為同現在。
- `state.updatedAt` 是新欄位，`normalizeState` 補預設值 `null`。

### 4.3 Supabase 後端
- 專案設定（由使用者在 Supabase 後台操作，spec 附 SQL）：
  ```sql
  create table public.progress (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    state      jsonb not null,
    updated_at timestamptz not null,
    device_id  text,
    saved_at   timestamptz not null default now()
  );
  alter table public.progress enable row level security;
  create policy "own row" on public.progress
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
- `updated_at` 來自客戶端的 `state.updatedAt`（用來比較新舊）；`saved_at` 是伺服器時間（只做除錯用）。
- Auth：Email provider 開啟、**Magic Link** 開啟、密碼登入關閉。Site URL 與 Redirect URL 設成託管網址。
- 新帳號註冊維持開放（Supabase 預設）。因為資料逐人隔離，陌生人即使註冊也只會拿到空白帳號；若日後想鎖，再在 Supabase 後台關閉 "Allow new users to sign up"，現有帳號不受影響。
- 免費方案在 7 天無活動後會暫停專案。2～3 人每天使用不會觸發；spec 記錄此風險，不另做 keep-alive。

### 4.4 同步模組（`85_sync.js` + `sync-core.js`）

**`sync-core.js`（純函式，無 DOM、無網路，供測試）**
- `stripSecrets(state) → state`：深拷貝後清空 `aiConfig.{geminiKey,openaiKey}` 與 `ttsConfig.{deepgramKey,openaiKey}`。規則與 `exportBackup(false)` 相同。
- `keepLocalSecrets(incoming, local) → state`：`incoming` 缺金鑰時沿用 `local` 的金鑰。規則與 `applyImportedState` 相同。
- `pickNewer(local, cloud) → 'local' | 'cloud' | 'same'`：比較 `updatedAt`。任一方為 `null` 視為最舊；相等回 `'same'`。
- `buildPushPayload(state, deviceId) → { state, updated_at, device_id }`。

**`85_sync.js`（瀏覽器端，物件 `Sync`）**
- 狀態機欄位：`session`（Supabase session 或 null）、`status ∈ {'off','idle','pending','syncing','error'}`、`lastError`。
- `init()`：建立 supabase client、讀取 `kv['meta']`（沒有就產生 `deviceId`）、`onAuthStateChange` 綁定、若已登入則 `pull()`。
- `signIn(email)`：`supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin + location.pathname } })`，成功後 toast「已寄出登入連結，請到信箱點開」。
- `signOut()`：登出，`status='off'`。本地資料**不**清除。
- `schedulePush()`：未登入直接 return。設 `meta.pendingSync=true` 並寫入 IndexedDB，然後 debounce 2000 ms 呼叫 `push()`。
- `push()`：`upsert(buildPushPayload(stripSecrets(state), deviceId))`。成功 → `pendingSync=false`、`lastSyncedAt=now`、`status='idle'`；失敗 → `status='error'`，保留 `pendingSync`，等下一次觸發重試（不做指數退避，觸發點已經夠稀疏）。
- `pull()`：
  1. 若 `SESSION` 或 `EXAM` 進行中 → 記 `pullDeferred=true`，return。`SESSION`/`EXAM` 結束時（既有的收尾函式）呼叫 `Sync.flushDeferred()`。
  2. `select state, updated_at` 自己那列。無資料 → 若本地有進度且已登入，直接 `push()`（第一次上雲）。
  3. `pickNewer(state, cloud.state)`：
     - `'cloud'` → `state = normalizeState(keepLocalSecrets(cloud.state, state))`，寫 IndexedDB，`buildRegistry(); applyTheme(); applyFurigana();` 若無 modal 則 `route()`。toast「已從雲端更新進度」。
     - `'local'` → `push()`。
     - `'same'` → 無事。
  4. 任何 JSON 解析或 `normalizeState` 例外 → 不動本地，`status='error'`，toast「雲端資料無法讀取，已保留本機進度」。
- 觸發 `pull()` 的時機：`init` 登入後、`visibilitychange` 轉為可見、`window.online` 事件、使用者按「立即同步」。
- 觸發 `push()` 的時機：`schedulePush` 的 debounce 到期、`pull` 判定本地較新、`window.online`（若 `pendingSync`）、`visibilitychange` 轉為隱藏且 `pendingSync`（立即 push，不等 debounce；若此時 fetch 被中斷，下次開啟時 `pendingSync` 仍為 true 會補推）。

### 4.5 UI
- 側欄底部（桌面）／頂欄右側（手機）加一個同步狀態小圖示 + 文字：
  - `off`：灰色「未登入」；點了開啟設定 → 資料。
  - `idle`：綠點「已同步 HH:MM」。
  - `pending` / `syncing`：黃點「同步中」。
  - `error`：紅點「同步失敗」，點了顯示 `lastError` 並提供「重試」。
- 設定 → 資料分頁（`77_settings.js`）新增「雲端同步」區塊，放在既有「下載備份／從備份還原」之上：
  - 未登入：email 輸入框 + 「寄送登入連結」按鈕 + 一行說明（資料逐人隔離、API 金鑰不會上傳）。
  - 已登入：顯示 email、「立即同步」、「登出」、「刪除雲端資料」（二次確認；刪除後本機資料仍在）。
- 既有「備份提醒」橫幅（`backupDue()`）：已登入且 `lastSyncedAt` 在 7 天內時不顯示。

## 5. 資料流摘要

```
使用者操作 → saveState()
   ├─ state.updatedAt = now
   ├─ IndexedDB put（合併同 tick）
   ├─ BroadcastChannel 通知其他分頁
   └─ Sync.schedulePush() ──2s──▶ push() ──▶ Supabase upsert

開啟 / 回前景 / 上線 / 手動 → Sync.pull()
   ├─ 練習中？→ 延後
   ├─ 雲端較新 → 套用（保留本機金鑰）→ 重繪
   ├─ 本地較新 → push()
   └─ 相同 → 無事
```

## 6. 錯誤處理與邊界

| 情境 | 行為 |
|---|---|
| 離線 | 照常使用；`pendingSync=true`；`online` 事件補推 |
| 雲端 JSON 壞／schema 不合 | 不覆蓋本機，`status='error'`，toast |
| 兩台裝置時鐘差很多 | 接受 last-write-wins 可能選錯；UI 顯示「已從雲端更新進度」讓使用者察覺；備份功能仍在 |
| 同一帳號兩台同時練習 | 後存的覆蓋先存的；屬已知限制，spec 不處理 |
| state 很大（匯入大量 Anki 卡） | jsonb 無實際上限；每 2 秒一次上傳可能數 MB。先不壓縮，若實測過慢再列為後續項目 |
| Anki 媒體在另一台沒有 | `AnkiMedia.url()` 回 null，沿用既有 fallback（實作時需確認卡片顯示與發音在無媒體時不報錯，若有缺口一併修） |
| Magic link 在手機信箱點開 | Supabase 以 PKCE 流程回到 `emailRedirectTo`；主畫面 PWA 與 Safari 是不同的 storage context，使用者可能需要在 Safari 登入後再從主畫面開啟一次。UI 說明文字要提醒「請用你要使用的那個 app／瀏覽器點開連結」 |
| IndexedDB 不可用 | 退回 localStorage，同步功能照常（只是容量較小） |
| Supabase 專案被暫停 | `status='error'`，本地照常；使用者到後台 resume |

## 7. 測試

### 自動化（`tests/sync-core.test.mjs`，`node --test`）
- `stripSecrets`：四個金鑰欄位被清空；其他欄位不變；輸入未被就地修改。
- `keepLocalSecrets`：incoming 無金鑰時沿用 local；incoming 有金鑰時以 incoming 為準；local 為 null 不報錯。
- `pickNewer`：local 新、cloud 新、相等、一方 null、雙方 null。
- `buildPushPayload`：欄位名稱與 `updated_at` 來源正確。

### 手動驗收（對應成功標準）
1. Mac 登入 → 做 5 題 → iPhone 同帳號登入 → 統計與 SRS 到期數一致。
2. iPhone 飛航模式做 3 題 → 關飛航 → 不操作 → Mac 回前景後看到新進度。
3. 第二個 email 登入 → 空白起始；Supabase 後台確認 `progress` 有兩列。
4. 登出後繼續做題 → 進度仍存在本機 → 重新登入 → `pull` 判定本地較新 → 推上去。
5. iPhone 加入主畫面 → 飛航模式開啟 → 可做題。
6. 既有 localStorage 使用者首次開新版本 → 進度完整帶入（`'migrated'` 路徑）。
7. 發佈新版本（改 `CACHE` 版本號）→ 已開啟的頁面出現更新 toast → 點了才刷新。

## 8. 實作分期（每期可獨立上線）

1. **託管 + PWA**：改名 `index.html`、manifest、SW、icons、部署。行為零改變，只是手機能開、能離線。
2. **IndexedDB 遷移**：`saveState`/`loadState` 改寫、BroadcastChannel、`updatedAt` 欄位。仍無雲端。
3. **Supabase 登入 + 同步**：`sync-core.js`、`85_sync.js`、設定頁 UI、狀態圖示、測試。
4. **收尾**：備份橫幅與同步狀態整合、說明文字、邊界案例驗證。

## 9. 已確定的決策（2026-10-24）
- 託管：**GitHub Pages**，repo 根目錄直接發佈（不另設 `docs/` 子目錄）。
- Supabase 區域：**東京 `ap-northeast-1`**，免費方案。
- App icon：純色底（`#0e0f13`）加白色「日」字的 SVG，用腳本產生 192 / 512 / apple-touch-icon 180 三個 PNG。
- 託管網址：https://fender8185.github.io/nihongo-quest/ （repo: github.com/fender8185/nihongo-quest，Pages 從 main 根目錄發佈）
