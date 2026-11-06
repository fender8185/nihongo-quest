# neon_cat：霓虹貓共用工具

Cat_01、Cat_02（以及之後的貓）共用的描線、繪圖、播放和動作寫法。每隻貓的資料夾只放自己的描線、姿勢和動作。

| 檔案 | 用途 |
|---|---|
| `trace.py` | 把白線黑底的 PNG 描成一段段中心線，並輸出一張標了編號的檢查圖（`.html`） |
| `neon.py` | 幾何工具（`limb` 手腳、`beans` 肉球、`fluffy` 尾巴）、光暈（`TONES`）、表情庫（`FACE`）、特效庫（`FX`）、`Kit`（一隻貓的頭、尾巴、耳根、脖子、地板）、共用姿勢（趴、翻肚、球），以及輸出資料檔的 `data()` |
| `player.js` | 播放器 `NeonCat`：把資料畫進 `<svg>`，播放動作 |
| `builder.js` | 動作的時間軸寫法 `NeonCatActions`：`blink`、`wag`、`hop`、`swap`、`turnTo`、`tuck`/`untuck`、`roll`、`walk`、`twitch`、`earsTo` 等 |
| `gallery.js` | 展示頁的按鈕、無聊輪播、依序播放、速度 |
| `record.py` | 把展示頁逐格錄成截圖或 WebP 動圖（要用測試的 `.venv`） |

## 共同的規則

- **同一個頭部座標**：每隻貓都對齊到 Cat_01 的頭（頭寬 208–742，眼睛在 y 421），所以表情、耳朵抖動、飛機耳都能共用。各自的脖子位置、對稱軸和地板寫在 `Kit` 裡。
- **光暈**：每條線由 8 層暗到亮的筆畫加一條亮芯疊成，亮度照 Cat_01 原圖量的。不用 SVG filter。
- **圖層**：-1 在身體後面（遠側的腳，較暗）、0 身體、1 在前面（會用暗色光暈蓋住後面的線）、2 肉球。
- **換姿勢**：一律在動作最快的那一格換（壓扁、轉身、縮成球的瞬間），不用淡入淡出，否則會出現兩隻貓重疊的鬼影。
- **每組動作都從休息狀態開始、回到休息狀態結束**，任兩組可以接著播。

## 加一隻新的貓

1. 準備白線黑底的圖（JPEG 先轉：`sips -s format png -Z 1024 in.jpg --out a.png`）。
2. `python3 -I design/neon_cat/trace.py a.png a.json`，打開 `a.html` 看每段線的編號。
3. 把線分給頭、身體、手、腳、尾巴，縮放到頭跟 Cat_01 一樣寬，寫成 `cat_0N/geometry.json`（參考 Cat_02 的做法）。
4. 照 `cat_02/draw.py`、`build.py`、`actions.js`、`gallery.html` 的樣子寫，跑 `python3 -I design/cat_0N/build.py`。
