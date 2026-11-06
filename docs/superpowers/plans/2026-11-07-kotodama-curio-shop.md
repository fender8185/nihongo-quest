# 言靈、古道具屋、擺設、主角 — 實作計畫

設計：`docs/superpowers/specs/2026-11-07-kotodama-curio-shop-design.md`。分支 `test`。執行方式：我自己依序做（index.html 是單一檔案，平行改會衝突），每段跑相關測試，最後全部 e2e 一次再推 test。

工具：本機 `./.venv/bin/python -I -m http.server 8765 --directory .`；截圖腳本在 scratchpad `mock/shoot.py`（plan JSON：hash、theme、js、out）。e2e：`./.venv/bin/python -I tests/e2e/<file>.py`（單檔），全部 `scripts/test.sh`（test 分支會停在版本檢查，直接跑 e2e 迴圈）。

## 第一段：言靈核心

- [ ] `defaultState` 加 `koto: { sets: {}, days: [], gift: 0 }`、`owned: {}`、`placed: {}`、`wear: {}`；`normalizeState` 補形狀（物件、陣列、數字），保留不認得的 id。
- [ ] `sync-core.js` `mergeStates`：koto（sets 取大、days 聯集、gift 取大）、owned 依 key 聯集；`tests/sync-core.test.js` 加案例；`node tests/sync-core.test.js`。
- [ ] `kotoBalance()`、`kotoDevice()`、`kotoIcon()`（發光的あ，共用一個 gradient id 的 `<symbol>` 或每次不同 id）。
- [ ] `exitPractice` 設 `SESSION.quit`；`renderSummary` 呼叫 `earnKoto(s)`（一次），畫「言靈」那一列，count-up。
- [ ] 信箱 `letters()` 加 `shop` 信。

## 第二段：古道具屋頁與商品目錄

- [ ] `ITEMS` 目錄（40 件：id、名、類別 kind F/rug/L/R/wear、slot、價錢、說明、佔地或尺寸、預設位置）。
- [ ] `#/shop` route、`renderShop`、店門口、分區、卡片狀態、確認視窗、買下（扣、放預設位置或收納箱、穿上）、測試站 +100。
- [ ] 縮圖：`DECOR.thumb(id)` 產生小 SVG，掛上頁面後用 getBBox 調 viewBox（`fitThumbs(root)`）。

## 第三段：房間改成可排序的物件

- [ ] ROOM 把家具拆成物件清單 `FIXED`（id、佔地、畫法），`studyArt` 改成：牆層（含牆上擺設）→ 地板層（含地墊）→ 排序後的站立物件（含地上擺設）。
- [ ] 掛鐘變商品：沒買時畫釘子；買了依 `placed.clock` 畫在那面牆，`.clock-hands` 用該牆的斜切矩陣。
- [ ] 截圖比對：沒有擺設時，房間看起來和改之前一樣（除了掛鐘→釘子）。

## 第四段：40 件的畫法

- [ ] `DECOR`（在 ROOM 之後，用 ROOM 匯出的畫圖工具）：每件一個畫法函式（地上、地墊、牆上）；穿戴品的畫法放在主角那段。
- [ ] 每 10 件左右截圖檢查一次（白天、晚上）。

## 第五段：擺設模式

- [ ] 右上角按鈕、`.study.edit` 介面、收納箱列、選取框、轉向／收起工具列、拖曳（單獨一層 ghost SVG）、點空地移過去、合法性檢查（家具、保留區、互相）、存 `state.placed`。
- [ ] 指標 → 房間座標：地板、左牆、右牆的反投影。
- [ ] 截圖與手動流程（headless 觸控）。

## 第六段：主角

- [ ] 畫法：正面／背面、站／走／坐／伸手，五個部位的穿戴品圖層。
- [ ] `.hero` 覆蓋層、位置換算、依位置打光、前景 SVG（遮擋）。
- [ ] 格子地圖、A*、走路動畫、點地板移動、點物件走過去做動作再轉場、再點一次跳過、動作減少直接到。
- [ ] 回到書房時的位置、localStorage `nq_hero`。
- [ ] 點主角開衣櫃視窗。

## 第七段：院子

- [ ] `.mtn` 左邊矮山、古道具屋（門口一隻小福爺）、山路、小燈、`.shop-btn`。
- [ ] 院子裡的主角：出門／進屋接力、點地面走、點信箱／房子／古道具屋先走過去、依遠近縮放、信箱遮擋、夜裡變暗。
- [ ] 古道具屋頁的福爺與對話泡泡（進門、買下、不夠、晚上，點了換句）。

## 第八段：測試與上 test

- [ ] `tests/e2e/test_shop.py`（設計 §8 的案例）。
- [ ] 全部 e2e 跑一次；修因這次改動壞掉的測試。
- [ ] sw.js `nq-v1.1.0-test.1`，commit，push `test`，確認測試站拿到新的 sw.js、正式站沒變。
