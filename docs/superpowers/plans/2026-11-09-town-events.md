# 小鎮事件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第 0 輪：事件引擎、小鎮換店、四個新角色、m0 的事件，上測試站；之後每一輪照「每輪流程」加一個單元的事件（與它需要的新地點）。

**Architecture:** 角色、閒聊、事件都在新的 `events.js`（`const TOWN`，一行一個事件，像 data.js 一樣帶版本號、被 sw.js 預先快取）。index.html 裡一個 `TOWNEV` 模組決定現在哪個事件在等、誰在哪裡、畫「！」與指標小點；`TALK` 擴充成多人說話＋選回答＋生字小註。狀態 `state.town`，同步取聯集。

**Tech Stack:** 單一 index.html（vanilla JS、SVG）、events.js、Node 腳本檢查、headless Chrome e2e（tests/e2e/cdp.py）。

**Spec:** `docs/superpowers/specs/2026-11-09-town-events-design.md`

## Global Constraints

- 只上 `test` 分支與測試站；`sw.js` 的 CACHE 用 `'nq-v1.4.2-test.N'`（1.4.2 熱修之後；下一個 N 從 1 開始）；APP_VERSION 不動（上 main 時才換）。
- 營業時間與作息用 `sceneHour()`（真實時間），不是 `lightHour()`。
- 事件條件：目前單元的事件要隔 ≥2 個學習日（`dayActive(dailyLogs[d])`，完成當天不算），已過的單元 ≥1 個；第一個事件不用等。
- 一次只有一個事件在等，地圖上只有一個「！」。
- 完成獎勵：`state.koto.found['ev-' + id] = 10`（只給一次）。重看不給。
- 對話裡所有漢字都在 `{漢字|かな}` 或 `{漢字|かな|中文}` 裡。
- 註解與文案的風格跟著 index.html（英文註解、繁體中文介面字）。
- e2e 迭代時只跑相關檔；commit 前跑一次整個 `scripts/test.sh`。

## Review Focus

- 舊存檔沒有 `state.town`：載入、同步、畫小鎮都不能壞（缺就當 `{ done: {}, seen: {}, stops: {} }`）。
- 入門階段（`state.stage === 'pre'`，currentUnit 仍是 m1）：只算到 m0。
- 事件進行中換頁或 App 自動更新：TALK 開著時不換版（`TALK.on()` 已經是自動更新的「忙碌」條件之一，新對話要沿用同一個 TALK）。
- 時間跨午夜的營業（居酒屋 18–翌 1）：`open(h)` 要處理 `to < from`。
- 測試者已經在 m5：補進度是一天一個，不能一次跳出很多個，也不能卡在晚上才能做的事件。

---

### Task 1: events.js 與檢查腳本

**Files:**
- Create: `events.js`, `scripts/check-events.js`
- Modify: `index.html`（`<script src="./events.js?v=1">` 放在 data.js 之後）、`sw.js` PRECACHE、`scripts/test.sh`（版本一致檢查＋跑 check-events）

**Interfaces:**
- Produces: 全域 `TOWN = { CAST, CHAT, EVENTS, HOURS, SPOTS }`；`node scripts/check-events.js` exit 0／1，印出每個問題一行。
  - `CAST[id] = { name, kana, role, look | art, bio: [zh], hours: [[from, to, place, spot, days?]] }`（`days`：'wd' 平日、'we' 假日，省略 = 每天）
  - `HOURS[shop] = [from, to]`；`SPOTS[place][spot] = { X, Y }`
  - `CHAT[id] = [[u, ja, zh]]`
  - `EVENTS[i] = { id, u, who, at, title, lines, gift?, opens?, after?, when? }`；line `[who, ja, zh]` 或 `{ ask, opts: [[ja, 1|0, why?]], pt }`

- [ ] **Step 1:** `scripts/check-events.js` 先寫，對一個故意錯的小 fixture（`node scripts/check-events.js --self-test`）要抓到：標記外的漢字、等級太高又沒小註的字、`pt` 在事件單元之後、選項沒有對或沒有錯、不存在的角色／前置事件。用 `scripts/data-file.js` 的 `load()` 讀 DATA。
- [ ] **Step 2:** `node scripts/check-events.js --self-test` → 印出 5 類錯誤各一行、exit 0（自我測試通過）。
- [ ] **Step 3:** `events.js` 放進四個新角色（美玖、健太、陽菜、林）、`HOURS`、`SPOTS.town`、空的 EVENTS；接上 index.html／sw.js／test.sh。
- [ ] **Step 4:** `node scripts/check-events.js` exit 0；`bash scripts/test.sh` 的前段（到 e2e 之前）通過。
- [ ] **Step 5:** commit。

### Task 2: TOWNEV 條件與作息

**Files:**
- Modify: `index.html`（NPC 模組之後新增 `TOWNEV`；`defaultState()` 加 `town`）、`sync-core.js`（`town` 聯集）
- Test: `tests/e2e/test_town_events.py`（新）、`tests/sync-core.test.js`

**Interfaces:**
- Produces（`TOWNEV`）：
  - `unitIdx(u) -> number`（m0 → 0、mN → N）；`reachedIdx() -> number`（入門 → 0）
  - `started(u) -> bool`；`studyDaysSince(date) -> number`
  - `due() -> ev[]`（符合條件 1–4，照順序）；`waiting(h = sceneHour()) -> { ev, place, spot } | null`
  - `whereIs(id, h = sceneHour(), day = new Date()) -> { place, spot } | null`；`isOpen(shop, h) -> bool`
  - `finish(id)`：記 `state.town.done[id] = todayStr()`、`koto.found['ev-'+id] = 10`、`seen`、`opens`
- sync-core：`out.town = { done, seen, stops }` 各自 `Object.assign(older, newer)`。

- [ ] **Step 1:** e2e：`test_first_event_needs_the_unit_started`、`test_two_study_days_between_events_of_the_current_unit`、`test_catching_up_takes_one_study_day`、`test_pre_stage_only_reaches_m0`、`test_one_waiting_and_a_closed_place_lets_the_next_through`（假事件寫進 `TOWN.EVENTS`，假時間傳 `h`）、`test_open_hours_wrap_past_midnight`（`isOpen('izakaya', 0.5) === true`, `isOpen('izakaya', 12) === false`）、`test_old_save_without_town`。sync-core 單元測試：`done` 兩邊各有的都留下。
- [ ] **Step 2:** 跑 → 失敗（`TOWNEV is not defined`）。
- [ ] **Step 3:** 實作。
- [ ] **Step 4:** `.venv/bin/python3 -I tests/e2e/test_town_events.py` 全過；`node --test tests/sync-core.test.js` 全過。
- [ ] **Step 5:** commit。

### Task 3: 小鎮換店、打烊、角色站在地圖上

**Files:**
- Modify: `index.html`（`TOWN_SHOPS`、`townHtml`、`beachHtml`、`streetHtml` 呼叫 `TOWNEV.castHtml(place)`；`'town-shop'` 動作；CSS 打烊樣子）
- Test: `tests/e2e/test_town_events.py`、`tests/e2e/test_shop.py:1225` 的店名清單改新的

**Interfaces:**
- Consumes: `TOWNEV.whereIs`、`TOWNEV.isOpen`
- Produces: `TOWN_SHOPS` ids `salon, bakery, shokudo, cafe, flowers, izakaya, goods`；`TOWNEV.castHtml(place) -> html`（按鈕 `.npc.npc-<id>` `data-act="npc-talk"` `data-npc`）；打烊的店 `.shop-front.closed`。

- [ ] **Step 1:** e2e：`test_town_has_the_new_shops`（7 個 id 照順序）、`test_closed_shop_says_its_hours`（假時間 3 點點 bakery → toast 含「6」與「14」）、`test_people_stand_where_their_hours_say`（陽菜平日 17 點在 town、10 點不在）、`test_izakaya_closed_by_day`（`.shop-front[data-shop=izakaya].closed`）。
- [ ] **Step 2:** 跑 → 失敗。
- [ ] **Step 3:** 實作：食堂、居酒屋的外觀（暖簾、紅燈籠；居酒屋白天竹簾放下）；小春也照 `CAST` 方式站（保留她的 `NPCS` 來訪）。點新角色：沒有事件時 `CHAT` 裡 `u ≤ reachedIdx` 的一句。
- [ ] **Step 4:** 相關 e2e 全過，`test_shop.py` 全過。
- [ ] **Step 5:** commit。

### Task 4: 「！」、指標小點、進書房的提示

**Files:**
- Modify: `index.html`（`castHtml` 加 `.ev-mark`；`yardHtml` 的 way 按鈕加 `.ev-dot`；`NPC.check` 之後 `TOWNEV.hint()`）
- Test: `tests/e2e/test_town_events.py`

**Interfaces:**
- Produces: `TOWNEV.hint()`（一天一次的 toast，`state.town.hinted = todayStr()`，不同步也無妨）；`TOWNEV.routeTo(place) -> 'town'|'beach'|'street'|null`（從院子往哪走）。

- [ ] **Step 1:** e2e：`test_one_mark_on_the_waiting_person`（`.ev-mark` 恰好一個，在 `npc-<who>` 上）、`test_yard_sign_has_a_dot_toward_the_event`、`test_study_hint_once_a_day`。
- [ ] **Step 2–4:** 失敗 → 實作 → 通過。
- [ ] **Step 5:** commit。

### Task 5: 對話：多人、選回答、生字小註、完成

**Files:**
- Modify: `index.html`（`TALK.open` 接受新格式；CSS `.talk-opts`, `.talk-gloss`, `.talk-zh.hide`；`NPC.talk` 有事件時走事件）
- Test: `tests/e2e/test_town_events.py`

**Interfaces:**
- Consumes: `TOWNEV.waiting`、`TOWNEV.finish`
- Produces: `TALK.open(root, who, lines, done, take, opt)`：`opt = { ev: true }` 時中文預設收起、`lines` 可以是 `{ ask, opts, pt }`；`TALK.face(who)`（`hero` 用 `state.look`）。舊呼叫（小春、ムギ來訪與閒聊）不受影響。

- [ ] **Step 1:** e2e：`test_wrong_reply_shakes_and_stays`（點錯的 → `.talk-opt.wrong`、`.talk-why` 有字、i 不變）、`test_right_reply_goes_on_as_the_hero`（下一張卡的名字是主角）、`test_finish_gives_10_koto_once`（完成 → 餘額 +10；再呼叫 `finish` 不變）、`test_gloss_shows_under_the_line`、`test_old_visits_still_work`（跑 test_shop 的小春來訪）。
- [ ] **Step 2–4:** 失敗 → 實作 → 通過。
- [ ] **Step 5:** commit。

### Task 6: m0 事件與閒聊

**Files:**
- Modify: `events.js`

- [ ] **Step 1:** 寫 m0 的 5 個事件（美玖「これ、なに？」、健太「パンをください」、陽菜「はな」、林「台湾の人？」、ムギ「ありがとう」——こそあど、招呼、はい／いいえ、～です）＋四個新角色各 6 句以上 m0–m2 的閒聊。
- [ ] **Step 2:** `node scripts/check-events.js` exit 0。
- [ ] **Step 3:** 在本機瀏覽器（headless 截圖）走一次：設 `state.currentUnit`、塞一筆 m0 紀錄 → 小鎮出「！」→ 對話 → 選回答 → +10。
- [ ] **Step 4:** `sw.js` → `'nq-v1.4.1-test.1'`；整個 `bash scripts/test.sh` 通過；commit；`git push origin test`。

---

## 每輪流程（第 1 輪起，loop 用）

1. 讀這份計畫和 spec 的 §9.1，看這一輪的單元與要的新地點。讀那個單元的 `DATA.LESSONS[u]`（公式與例句）和文法題的 `pt`，挑 4–7 個點寫事件。
2. 新地點（如果這輪有）：照 Task 3 的做法加場景、`SPOTS`、`HOURS`、`WAYS`／公車路線，加 e2e（畫得出來、進得去、回得來、打烊只提示）。
3. 寫事件與新閒聊：角色語氣照 spec §3；`after` 串起故事線；每個事件 1–2 個選回答，錯的選項附中文提示。
4. `node scripts/check-events.js` 通過；跑 `tests/e2e/test_town_events.py`。
5. `sw.js` 的 -test.N 加一，`events.js?v=` 加一（index.html、sw.js、events.js 標頭三處）；整個 `scripts/test.sh` 一次；commit `test: 小鎮事件 mN …`；`git push origin test`。
6. 在這份計畫最下面「進度」加一行（輪、單元、事件數、commit）。

## 進度

| 輪 | 單元 | 事件 | commit |
|---|---|---|---|
| 0 | m0 | 5 | b8bb37e 引擎、小鎮換店、美玖／健太／陽菜／林；審查修正 32783a1 |
| 1 | m1 | 5 | 95665ef 食堂、居酒屋室內，トメ／剛／鉄平（-test.2） |
| 2 | m2 | 5 | b019a56 公車與路線牌、駅前、町の手帳，渚／タロウ／原田／小林（-test.3，events.js v2） |
| 3 | m3 | 5 | 2969764 て形；公車站的事件要等站開通（-test.4，events.js v3） |
| 4 | m4 | 5 | 923b2ac 月の湯，松／源三；檢查腳本認得「お／ご＋字」（-test.5，events.js v4） |
| 5 | m5 | 5 | 7648ef1 美咲／中村／健二；小春改用常體（-test.6，events.js v5） |
| 6 | m6 | 5 | 6ef3790 鈴木（計程車）；第一階段（N5 文法）完（-test.7，events.js v6） |
| 7 | m7 | 5 | 7bacc8e アレックス；進入 N4（-test.8，events.js v7） |
| 8 | m8 | 5 | 524638a 稲荷神社與晚上的緣日，千早／タツ，浴衣（-test.9，events.js v8） |
| 9 | m9 | 5 | bf94886 小春決定去東京、緣日之夜（-test.10，events.js v9） |
| 10 | m10 | 5 | c487575 白鷺城，高橋／ソフィア；町の手帳的測試站工具（-test.11，events.js v10） |
| 11 | m11 | 5 | 1e8c9bb 授受；外婆的果醬食譜、林媽媽來訪（-test.12，events.js v11） |
| 12 | m12 | 5 | cf2e112 西村；海邊度假飯店傳聞（N3 開發案伏筆）（-test.13，events.js v12） |
| 13 | m13 | 5 | 5005fa0 受身（-test.14，events.js v13） |
| 14 | m14 | 5 | b9471bc 使役；陽菜的媽媽和子（-test.15，events.js v14） |
| 15 | m15 | 5 | 22d316c 敬語；渚保管外婆的東西（信的伏筆）（-test.16，events.js v15） |
| 16 | m16 | 5 | a8afbac 副詞與接續詞；小春第三名留在鎮上、海龜蛋、土地被賣（-test.17，events.js v16） |
| 17 | m17 | 5 | 6467c91 ために／ように／すぎる／やすい（-test.18，events.js v17） |
| 18 | m18 | 5 | 4daad51 N4 完；秋祭り、陽菜考上東京、「浜を守る会」成立（-test.19，events.js v18） |
| 19 | m19 | 5 | c471e3f N3 開始；古地圖「神の浜」（-test.20，events.js v19） |
| 20 | m20 | 5 | 41dc899 時間表現；小海龜孵化、記者被施壓（-test.21，events.js v20） |

## 寫作規則（審查後加的）

- 不要把 `after:` 接在 `when: 'night'` 的事件後面（只在白天玩的人會一直卡住）。
- 新地點要畫得出人時，才把它加進 `events.js` 的 `PLACES`；角色的作息地點和位置要在 `SPOTS` 裡（檢查腳本會擋）。
- 每次推 test 都要把 events.js 的版本（EVENTS_VERSION 與兩處 ?v=）加一（test.sh 會檢查）。
