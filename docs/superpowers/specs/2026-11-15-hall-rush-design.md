# 外場 2.0：耐心、處處日文、畫面 (2026-11-15)

The user, on test.15's 外場: 「整個設計感覺都太粗糙了，應該要讓使用者感覺真的要回應，等太久客人也會有變化；畫風；客人的每個位置都要一直有學習日文以及緊張感。」 Approved in chat (「好你試試直接照你建議的來，做到完成」): patience, Japanese at every spot, a shift of 6 groups, an angry walk-out costing a star, then the look. Three pushes to `test`.

## 1. Patience (test.16)

- Each customer has patience `p` from 1 down to 0. It drains while they wait on the hero: at the door, called, pointing at an order, at the register, with a request or the chopsticks. While the dish is cooking or waiting it drains at half speed. It does not drain while they walk, sit down, or eat.
- Full drain time: 60 s in 入門 and 45 s past it, times `HALL.pat` (the tests' scale). It counts only frames drawn, so a hidden tab pauses it.
- Mood: `ok` at p ≥ 0.6, `meh` at ≥ 0.3, `mad` below 0.3.
  - The face changes. meh: a flat mouth and worried brows. mad: sharp eyes, angry brows, an `o` mouth.
  - An emote shows: 💦 at meh, 💢 at mad.
  - On going to meh or mad, a line is said:
    - when calling, at the door or at the register: 「あの、すみません！」 at meh, 「ちょっと！」 at mad;
    - waiting for the dish: 「まだですか。」, only once まだ is known.
- A ring of the patience left goes round the 「！」. A customer waiting for food shows the ring with a small face in it.
- Answers:
  - wrong: −0.2;
  - right: +0.05;
  - right within 5 s of the question opening: +0.15 and a ♪.
- When the hero reaches a mad customer, the customer first complains: 「おそい！」 once おそい is known, else 「ちょっと！」. The right answer is すみません！, and the question they had comes next. Once per customer; after it, p +0.25.
- At p = 0 the customer storms out:
  - says 「もう いいです！」 (or 「いいです！」 without もう), with the door slamming;
  - any question with them closes, and their dish leaves the pass and the tray;
  - the table frees up, and the shop loses a star.

## 2. A shift is six groups

- `PLACES.waiter.n = 6`. WORK reads each job's own `n` (`WORK.nOf(job)`); the others stay at 10.
- A group is scored once, when it leaves. The score is its mood at the door: ok 0, meh 1, mad 2, stormed out 3.
- Grade credit for the 外場: [1, 0.6, 0.3, 0] by score (`PLACES.waiter.credit`). Every other job keeps all-or-nothing.
- Results:
  - 「滿意的客人 x / 6」 counts the groups that scored 0;
  - 店長紅包 = the stars left × 10 円, paid through `tip` and labelled 店長紅包.
- Stars: 3 at the start. −1 for a storm-out, −1 for a missed phone. Never below 0.
- HUD at the top: 「第 k／6 組」, ★★★, and 「連續滿意 ×N」 once N ≥ 2.
- A group comes in when there is a free table not already promised to someone waiting. No more come than the groups left.

## 3. Japanese at every spot (test.17)

- **Order by name**: the customer says 「〇〇を ください。」. The hero picks one of three cards, each with the dish picture and its name in kana. With これ／それ／あれ known, this or the pointing order, half and half.
- **The pass**: 黄 calls 「〇〇、あがり！」 (one line per dish) with a bell. At the pass the hero picks the plate he called from three pictures, no names. A wrong pick costs the waiting customer patience.
- **Requests**, while waiting for food or while eating, at most two per customer and each kind once a shift. Each comes only once its words are learned.

  | Kind | Needs | Customer says | Right answer |
  |---|---|---|---|
  | water | みず | 「おみず ください。」 | 「はい、どうぞ。」 (pour sound) |
  | have | ある, ちょっと | 「ぎょうざ／ラーメン／チャーハン、ありますか。」 | 「はい、あります。」 |
  | have | ある, ちょっと | 「すし／カレー／ピザ、ありますか。」 | 「すみません、ちょっと…。」 |
  | osusume | どれ, これ | 「おすすめは どれですか。」 | 「これです。」 (the board in the hero's hand) |
  | toilet | あそこ | 「おてあらいは どこですか。」 (far tables only) | 「あそこです。」 |

- **Eating**: 「とても おいしいです！」 → 「ありがとうございます！」 (needs とても, おいしい). Dropped chopsticks stay as they are.
- **Paying**: once いくら, 円, 百 and the price's digits (and 十 and 五 for the 50s) are learned, half the time the customer first asks 「いくらですか。」. The hero picks the price said in kana (「ななひゃくえんです。」) from three menu prices, then ありがとうございました.
- **Regulars**: after paying they say 「さようなら！」 → 「さようなら！」.
- **Phone** (needs もしもし, そうです, ちがいます): at most once a shift, at random.
  - The register rings (a 「！」 and a phone icon) and is missed after 20 s (× pace): a star lost and 黄's 「でんわ！」.
  - At the register: 「もしもし。」, then the caller says either 「らいらいけんですか。」 → 「はい、そうです。」, or 「すしやですか。」 → 「いいえ、ちがいます。」.

## 4. The look (test.18)

- **The reply panel**:
  - looks like the hero's speech bubble: a row of three on wide screens, compact on a phone;
  - a bar along its top shows the customer's patience;
  - while it is up, the room lifts so the hero and the customer stay above it.
- **Heard lines** show as a bubble with moving sound bars over the speaker; the text comes after a right answer.
- **Dishes are drawn** (PICS 餃子/ラーメン, new PICS_TOWN チャーハン/しゅうまい/はるまき/マーボーどうふ):
  - on the order cards, on the pass plates and on the hero's tray;
  - on the table once served, with steam, and an empty plate once eaten;
  - the waiting customer's want shows the picture.
- **Results** list each group's face (😊😐😠💢) and the lines they said, each one tappable to hear again.
- **Sounds**: a bell at the pass, a phone ring (synth), a sigh replaced by the 💦 emote and a tick (no TTS emotion), the door slam on a storm-out.

## Rules kept

- Only learned words are asked. A customer's own word stays hidden until the answer is right.
- No level literals. The voices are the cruise passengers' plus the regulars. Every new line goes into `lines(add)` for 生成.
- Leaving mid-shift and coming back the same day resumes at the groups done. Groups half-way through are not counted and start again.
