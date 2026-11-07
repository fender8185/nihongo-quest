# 主角造型（test build）— design

2026-11-07. The user asked for a richer hero: more hair, face shapes, beards and so on for a basic setup (not split by gender),
more varied motions, and a tap on the wardrobe button that zooms in on the hero, as most games do, to adjust each part. The old
default look may go. They said to follow my recommendations on anything open and push a test build.

## Look

`state.look` (synced like `wear`: the copy saved later wins; unknown values fall back to the default when drawn):

| key | options |
| --- | --- |
| face | 圓臉 round · 鵝蛋臉 oval · 方臉 square · 尖下巴 pointed |
| skin | six tones |
| cheeks | 腮紅 blush · 雀斑 freckles · 無 none |
| hair | 微亂短髮 tousle · 旁分 side part · 平頭 buzz · 捲髮 curly · 鮑伯頭 bob · 長直髮 long · 馬尾 ponytail · 丸子頭 bun · 刺蝟頭 spiky · 光頭 bald |
| hairColor | eight (black … pink) |
| eyes | 圓眼 round · 笑眼 happy · 杏眼 almond · 大眼 big · 睏眼 sleepy |
| eyeColor | five |
| brows | 自然 soft · 平眉 straight · 粗眉 thick · 細挑 raised (hair colour) |
| mouth | 微笑 smile · 開心 grin · 一字 flat · 圓嘴 o · 貓嘴 ω |
| beard | 無 · 鬍渣 stubble · 八字鬍 mustache · 山羊鬍 goatee · 落腮鬍 full (hair colour) |
| top, bottom | eight colours each (the hoodie, the trousers) |

No option is labelled by gender. The new default: round face, light skin, tousled dark-brown hair, round eyes, smile, blush,
indigo hoodie, navy trousers.

The figure becomes symmetric round x = 2 (the old one looked a little to the right); the glasses move with the eyes. A hat that
covers the crown (毛帽, 草帽, 貝雷帽, 學士帽) clips the hair above its band, so a bun or spikes never poke through it.

## The dressing room

The 衣櫃 button no longer opens a dialog. It zooms in on the hero: the room scales up round him and dims, a big copy of him flies
from where he stands to the top of the screen, and a panel slides up from the bottom (a side panel on a wide screen).

- Tabs: 臉型 (shape, skin, cheeks), 髮型 (style, colour), 五官 (eyes, eye colour, brows, mouth), 鬍子, 衣服 (top and trousers
  colours), 穿戴 (what was bought at 古道具屋, by part). The face tabs frame his head; 衣服 and 穿戴 frame all of him.
- Each option is a small preview drawn with the rest of the current look; a tap shows it on him at once (a little hop).
- 隨機 rolls a whole new face and hair; 轉身 turns him round; 取消 puts everything back; 完成 keeps it. Either way he flies back
  to his place and the room zooms out.
- He is drawn in daylight colours here, whatever the hour, so colours read true.

## Motions

- Idle, standing still a few seconds: looks round, stretches, waves (facing the camera), sways, or a little bounce — one at a
  time, 6–12 s apart, never the same twice running. Sitting at the desk he nods over the notebook. In the yard too.
- A tap on him: hop, wave, spin or cheer, in turn at random.
- Walking leans a little forward, running more.
- None of this with reduced motion.

## Not now

Body types, hairstyles that are only a recolour, eye-color for the closed 笑眼 (it has none), a full-length mirror ware.

## Second round (same day): clothes for sale, a cat, new hair

- **Clothes are styles; the colours stay theirs.** `look.topStyle` and `look.bottomStyle` pick the garment, `look.top` and
  `look.bottom` still dye it. 帽T and 長褲 are everyone's; 古道具屋 sells T恤, 毛衣, 襯衫, 甚平, 貓咪上衣 and 短褲, 寬褲, 裙子,
  貓咪褲 (kind `clothes`, a shelf 衣服褲子 of their own). Bought, they wait in the wardrobe; the dressing room's 衣服 offers the
  styles they have, then the colours, and says how many more the shop has. A shop card can put one on or take it off.
- **The cat.** 貓咪頭套 is a thing worn on the head that takes the place of the whole head (and of glasses), in the fur of the
  top's colour; 貓咪上衣 has a white belly, paws and a bell; 貓咪褲 a tail and paw feet in the trousers' colour. Matching colours
  make a ginger, grey or white cat.
- **Hair, redrawn.** The user disliked all ten styles, the ears most of all. Sixteen new ones (短碎髮, 清爽短髮, 平頭, 中分, 油頭,
  刺蝟頭, 自然捲, 爆炸頭, 鮑伯頭, 狼尾, 及肩髮, 長直髮, 長捲髮, 高馬尾, 雙馬尾, 丸子頭); 光頭 is gone with the old ones. Ears are
  ear-shaped; short cuts keep a darker layer of hair behind the ears and a sideburn in front, long ones fall over them; the
  fringe casts a faint shadow on the forehead. A crown-covering hat cuts away only the hair in the band above it.

## Third round: the head redrawn the Q版 way

The user was still unhappy round the ears and sent five Q版 references (2–3 heads tall, big low eyes, hair that hides the ears),
allowing a new model as long as it keeps the app's flat style. The head now:
- has **no ears**: every style has side locks (or volume) where they would be;
- has **big eyes low on the face** (y -117): the colour darker under the lid, a pupil, two highlights from the upper right, a dark
  lash line. Six kinds after the reference sheet: 普通, 吊眼, 垂眼, 笑眼, 大眼, 睏眼;
- has a small mouth lower down (y -104), six kinds (with 吐舌); brows five (with 八字眉); cheeks four (with 害羞's hatched blush);
  faces 圓臉, 包子臉, 鵝蛋臉, 尖下巴; beards and glasses moved to the new features;
- has **hair in clumps**: a crown with volume, the fringe as pointed clumps (six fringe patterns), side locks, a darker layer behind,
  strands and a light band round the crown. Sixteen styles: 短碎髮, 清爽短髮, 中分, 呆毛短髮, 刺蝟頭, 油頭, 自然捲, 爆炸頭,
  鮑伯頭, 狼尾, 及肩髮, 長直髮, 長捲髮, 高馬尾, 雙馬尾, 丸子頭 (平頭 gave way to 呆毛短髮, which keeps the ears hidden).
Looks saved before fall back where their choice is gone (eyes → 普通, square face → 圓臉, 平頭 or 及肩 tucked → 短碎髮).
