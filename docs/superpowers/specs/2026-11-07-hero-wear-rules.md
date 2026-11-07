# 主角穿戴規範（test build）— rules

2026-11-07. The user found that hats broke the hair: a hat cut away all hair above its band, which left flat-topped stubs beside
毛帽, a notch beside 貝雷帽 and bald patches beside 學士帽. They asked for proper rules: what fits goes on top, what does not
comes with a whole hairstyle of its own, and the wares change to match. These are the rules every hairstyle and every ware
follows from now on.

## The figure

- Facing us it is symmetric round x = 2 (a left half is mirrored with `matrix(-1 0 0 1 4 0)`); the feet are at y 0, the head's
  middle at (2, -128).
- The head (skin) is one dome for every face shape: top at y -160, x -32 to 36, the jaw at -90 to -95. Eyes at y -117 (x -10.5
  and 14.5), brows about -129, mouth -104.
- The plain crown of hair (`crown()`) tops out at y -172 and reaches x -42.4 / 46.4 at y -138; the darker hair behind reaches
  x -45 / 49. Fringe clumps hang from -158 to tips at -122 to -137, side locks from -142 down to -84 to -112, the nape at -100.
- Layers facing us, back to front: hair behind, tail, back ware, legs (a skirt over them), top, body ware, neck ware, arms, then
  the head: collar, face, beard, the fringe's shadow, hair, strands, face ware, head ware. From behind: legs, arms, top, body
  ware, hood, tail, neck ware, back ware, then the head: skin, hair, face ware, head ware.

## On the head: three kinds, and none of them cuts the hair

| kind | wares | rule |
| --- | --- | --- |
| on top | 貓耳髮箍, 必勝頭巾 (and 圓框眼鏡 on the face) | drawn over every hairstyle as it is, facing us and from behind; it hides no hair |
| hat with its own hairstyle (`HAT_HAIR`) | 毛帽 → 短碎髮, 草帽 → 清爽短髮, 貝雷帽 → 鮑伯頭, 學士帽 → 中分 | drawn big enough to cover the plain crown, so a hairstyle with a plain crown keeps its own hair under it; a tall hairstyle is drawn as the hat's own while the hat is on |
| whole head (`FULL`) | 貓咪頭套 | takes the place of the head, hair and face; nothing is worn on the face |

- **Tall hairstyles** (`tall: true` in `HAIR`): 呆毛短髮, 刺蝟頭, 自然捲, 爆炸頭, 高馬尾, 丸子頭. Their hair rises out of the plain
  crown or bulges beyond it (a tuft, spikes, curls, a high tail, a bun), so no hat can sit on them.
- The other ten (短碎髮, 清爽短髮, 中分, 油頭, 鮑伯頭, 狼尾, 及肩髮, 長直髮, 長捲髮, 雙馬尾) keep their own hair under every hat.
- A hat's own hairstyle is a plain one, drawn in their own hair colour. Their look keeps the hairstyle they chose, so taking
  the hat off brings it back.
- What they are told: a hat's 古道具屋 card says 「蓋不住丸子頭，戴著時換成短碎髮。」 when it would swap their hairstyle. The
  dressing room says the same (with the hat's name) on 髮型 and 穿戴, and 「戴著貓咪頭套，看不到臉和頭髮。」 on the face's tabs.
  Nothing is said when nothing is swapped.
- The dressing room frames the hero 12 units higher while something is on the head, so a hat never runs under the top bar.

## Adding a ware or a hairstyle

- **A new head ware**: if it sits on all 16 hairstyles, facing us and from behind, without needing to hide any hair, it goes
  on top. Otherwise it is a hat: draw it to cover the plain crown and give it a plain hairstyle in `HAT_HAIR`. Never clip hair.
- **A new hairstyle**: built on `crown()` with nothing rising above or bulging beside it, it is plain. Anything that rises out
  of it (a tuft, a bun, spikes, a high tail, big curls) makes it `tall`.
- **Neck, back and body wares** are checked over all six tops, facing us and from behind.
- **The check**: `scripts/hero-sheet.py out.png` draws every hairstyle under every head ware (`--rows topStyle` for the tops
  under the other wares) to out.png and out-back.png. Look through both before shipping.
- **The tests** (tests/e2e/test_shop.py): no hair is ever clipped, a tall hairstyle under a hat is drawn exactly as the hat's
  own, a plain one keeps its hair, things on top keep a bun, and the notes show only when hair is swapped.
