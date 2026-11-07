# 古道具屋分類、院子擺設、限時販售（test build）— design

2026-11-07. The user asked for four things: delete 羽織; put categories at the top of 古道具屋 (室內, 戶外, 穿搭, 限時) because
there are too many kinds of wares; make 望遠鏡 an outdoor ware, add three or four more, and let the yard be arranged; and a
limited sale, for now Halloween: one outfit and one indoor decoration, sold only round Halloween (first a week either side,
then changed to **ten days either side**). The yard is arranged the same way as 書房 (A, over fixed spots). For the rest
they said 「都照你的建議來」.

## 1. 羽織 goes, with its purchase

It is only a test build, so the user asked for the purchase to go too. The ware and its drawing are deleted, and
`normalizeState` deletes `owned.haori` and a worn one on every load: sync merges `owned` as a union, so another device's copy
would bring it back otherwise. The 30 言靈 paid come back, since the balance counts what is owned. (This is the one
exception to keeping ids a build does not know.)

## 2. The shop's tabs

A tab row under the shop front: **室內 · 戶外 · 穿搭 · 限時**.

| tab | sections |
| --- | --- |
| 室內 | 家具擺飾 (floor), 地墊 (rug), 牆上 (wall) |
| 戶外 | 戶外擺設 (yard) |
| 穿搭 | 衣服褲子 (clothes), 主角穿戴 (wear), then the 「福爺還在找」 card |
| 限時 | the sale now on (any kind of ware), or a note when none is |

- A limited ware is shown only under 限時, owned or not. Once bought it is used like any other ware: the wardrobe, the
  storage box, 擺設.
- While a sale is on, the 限時 tab carries a small dot.
- The shop opens on the tab last used on this device (localStorage `nq_shop_tab`), 室內 the first time.
- The test site's 「測試用：+100 言靈」 stays at the bottom of every tab.

## 3. Limited sales

- `SALES = { halloween: { name: '萬聖節', from: '10-21', to: '11-10' } }`: month-day, both ends included, every year.
  `saleOn(key, day)` compares `MM-DD`. A ware joins a sale with `limited: 'halloween'`.
- **The day is the server's, not the phone's.** The user worried that once the app is out, people would change the phone's
  date to buy. `saleClock()` asks the site itself (a `HEAD` for `./`, never cached; the service worker lets anything but GET
  through) and takes its `Date` header's moment in Taipei (UTC+8), so neither the phone's clock nor its time zone moves a
  sale. The answer is kept 10 minutes. Until it comes, 限時 says 「查看中…」; with none (offline) it says
  「限時商品要連上網路才看得到」, and nothing limited can be bought. 買下 checks again before the purchase.
- This stops the easy trick only: 言靈 and purchases are still kept on the device, so someone who edits the save can still
  cheat. Real protection needs the server, when in-app purchases come.
- 限時 during the sale: a header 「萬聖節限定 · 賣到 11/10（還有 N 天）」 (「今天最後一天」 on the last day), then its wares.
  Outside it: 「現在沒有限時商品。下一檔：萬聖節 10/21–11/10」.
- What was bought stays theirs after the sale; it only leaves the shop.
- Test site only: under 限時, 「測試用：不看日期，顯示限時商品」 (localStorage `nq_sale_preview`) shows every sale's wares as
  if it were on.

**The Halloween wares** (cute, for anyone):
- **魔法師帽** (wear, head, 22 言靈): a tall pointed hat bent at the tip, a wide brim, in their top's colour with a gold band, a
  star and a moon. It is a hat under the wear rules (2026-11-07-hero-wear-rules.md): it covers the plain crown, and a tall
  hairstyle wears its own, 及肩髮.
- **魔法師長袍** (clothes, top, 30 言靈): a long robe to the ankles in their top's colour, gold stars, wide sleeves, a belt with
  a small spell book at the hip; from behind, a big star and moon. Their trousers' colour shows only at the hem.
- **南瓜燈** (floor, indoor, 20 言靈): a pumpkin with a carved face that glows at night like 行燈 (`light`).

## 4. Outdoor wares

A new kind, `yard`, drawn facing us in the hero's own units (feet at 0) and scaled with distance like the hero (`yScale`),
darker by night with the hero's filter. Each has `ground: [width, depth]` in those units for where it stands. The shop and the
yard's storage box show the same drawing as a thumbnail.

| ware | price | notes |
| --- | --- | --- |
| 望遠鏡 | 45 (was a 書房 floor ware) | brass tube on a tripod, pointing up at the sky |
| 石燈籠 | 26 | a stone lantern; its window glows warm by night |
| 緣台 | 20 | a low wooden bench with a red cloth and a cup of tea |
| 狸貓擺飾 | 18 | a 信楽焼 tanuki with a straw hat and a sake flask |
| 小池塘 | 40 | a little pond ringed with stones, two koi swimming slowly |

A tap on an outdoor ware (outside 擺設) sends the hero to stand beside it, facing it. At the telescope by night they look up
(the `look` pose) for a few seconds.

## 5. 擺設 in the yard

- **Where it is kept**: `state.placed[id] = { w: 'Y', x, y }`: x px from the yard's middle, y px up from its bottom (the
  hero's own measure), snapped to 2 px. `forRoom()` stays floor, rug and wall, so 書房 never draws a yard ware.
- **Where a ware may stand**: on the lawn, x within ±178 px (whole on a 390 px phone; a wider screen keeps the yard round the
  middle) and y 14–196 px. Not on the path from the door (its strip runs from x -60…+6 at the bottom to -10…+10 at the
  house), not by the house front (x -95…95 above y 186), not on the mailbox (x 20…92, y 136…230), and not over another ware
  (ground boxes: width × scale across, depth × scale deep).
- **Order**: wares, the mailbox and the hero are drawn by y (further up, further back). The hero's order follows him as he
  walks, so he passes in front of or behind a ware. He walks straight, as now; wares do not block him.
- **The mode**: a 擺設 button at the yard's top right (書房's icon). In it the signs hide; a bar at the top says what to do and
  has 完成; the yard's storage box (owned yard wares not out) runs along the bottom, with 「收納箱是空的。古道具屋的「戶外」有
  望遠鏡、石燈籠……」 when empty. A tap picks a ware (outlined, 收起 over it); a drag moves it (a ghost follows the finger, red
  where it cannot stand); a tap on the lawn moves the picked ware there; a ware taken from the box goes to the free spot
  nearest the lower middle, or 「這附近放不下了」 when there is none. 書房's bar, tray and tool styles are reused.
  With nothing picked, a tap on the lawn does nothing in 擺設 (the hero stays put till 完成).

## 6. Moving saves along

- `roomV` 4 in `normalizeState`: a telescope placed in 書房 (`w: 'F'`) is taken out; it waits in the yard's box.
- `placed` still syncs whole (the copy saved later wins). A `w: 'Y'` entry needs nothing new.

## 7. Tests (test_shop.py)

- 羽織 is gone from the shop and the wardrobe.
- The tabs: four of them, each with its sections; a limited ware only under 限時; the last tab comes back.
- `saleOn`: 10-20 no, 10-21 yes, 11-10 yes, 11-11 no; 限時 during the sale (header, days left, its wares) and outside it (the
  note), and the test-site preview.
- The Halloween wares: the hat is a hat (a tall hairstyle wears 及肩髮), the robe is a top style dyed in their colour, the
  pumpkin lights 書房 by night.
- The telescope is a yard ware, and one placed in 書房 moves to the yard's box.
- 擺設 in the yard: take a ware from the box (placed `w: 'Y'`, inside the lawn, clear of the path, the house front and the
  mailbox), drag it, refuse a spot over another ware, put it away; the draw order by y; a tap outside 擺設 sends the hero over.

## Not now

Sitting on the bench, a view through the telescope, a set bonus for the wizard (as the cat suit has), other sales (the SALES
table takes them when they come).

## Built (same day)

As above, with these details settled while building:
- `forSale(it)` (a limited ware only while its sale is on, by the server's day when known) also counts the dressing room's
  「古道具屋還有 N 件衣服褲子」.
- The yard's 擺設 keeps its storage box at the top of the screen (the sky is empty there; the lawn is at the bottom) and its
  tools in a fixed layer over the sky (`.yedit`); the yard's things, the mailbox (146) and the hero take `z-index` 300 − y.
- Thumbnails fit without a lamp's pool of light by night (`fitThumbs` leaves `.night-only` out), so 南瓜燈 and 行燈 fill
  their cards.
- The telescope's room drawing is gone; the yard draws its own.
