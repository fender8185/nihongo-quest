'use strict';
// ---------- 中華街の打工 (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §4–§7) ----------
// The user: a beginner should have somewhere to earn a little 円 — a second way beside the cruise's guide, the two unrelated; at
// most one workplace a day (later places too: 商店街's shops and others, 中華街 the first and lowest); the pay a tenth of what I
// first put (2026-11-14: too much). Four workplaces, a step up each (2026-11-19, the user: a clearer difficulty from job to job):
// 包包子 at 福明 with 王 (5 kana seen; kana and kana words heard), 站櫃 at らんらん (15; words heard), 外場 in らいらいけん (30 and
// three 入門 words; the talk; 2026-11-15: in place of 外送), 收銀 at ふく (N5's numbers learned; sums reckoned and read out —
// 2026-11-19, in place of 整理貨架). A shift is ten tasks (the 外場 six groups); one left halfway waits for its day, at that place
// only; the day is the town's day it began. Graded by the share right at once (as the cruise's guide), paid by the job (2026-11-20,
// the user: 站櫃 60 円, 包包子 80, 收銀 and 外場 100) and the grade (S 50 … C 10), a tip on top where a job gives one, and 2% more on
// all of it for each step up an area's 打工證 (AREAS); 円 only. Each job's runner registers itself (WORK.register) and drives the shift through its ctx: right(task, misses) as
// each is done, finish() at the tenth.
const WORK = (() => {
  const N = 10;
  const PLACES = {
    buns: { area: 'chinatown', pay: 80, place: 'chinatown', shop: 'seiro', who: 'wang', kana: 5, name: '包包子', at: '福明', tune: 'chukagai' },   // 5 (was 46): the first job (2026-11-19)
    counter: { area: 'chinatown', pay: 60, place: 'chinadori', shop: 'ranran', who: 'zhou', kana: 15, name: '站櫃', at: 'らんらん', tune: 'chukagai' },
    // 外場 2.0 (2026-11-15, docs/superpowers/specs/2026-11-15-hall-rush-design.md §2): a shift is six groups, each scored by its mood
    // at the door (0 pleased … 3 stormed out), graded with part credit for the not quite pleased
    waiter: { area: 'chinatown', pay: 100, place: 'rairai', shop: 'rairai', who: 'huang', kana: 30, words: ['いらっしゃいませ', 'どうぞ', 'はい'], name: '外場', at: 'らいらいけん', n: 6, credit: [1, 0.6, 0.3, 0], unit: '滿意的客人', tune: 'rairai' },
    till: { area: 'chinatown', pay: 100, place: 'chinadori', shop: 'fuku', who: 'zhang', kana: 46, need: '學「いくら」「円」和數字', name: '收銀', at: 'ふく', tune: 'chukagai' },   // need: its words (JOBS' left), named
    // 駅前 (2026-11-20, docs/superpowers/specs/2026-11-20-ekimae-work-design.md): the N5 area, open once 中華街's card is 一人前; each
    // job by the unit studied (course: that unit or past it), its keeper there (present) or its own hours
    bento: { area: 'ekimae', pay: 120, place: 'platform', shop: 'bento', who: 'haru', course: 'm1', present: true, name: '賣便當', at: 'みなと弁当', tune: 'ekimae', shut: '浜田ハル 7 點到 19 點在月台的便當攤。' },
    window: { area: 'ekimae', pay: 140, place: 'station', shop: 'window', who: 'harada', course: 'm2', hours: [7, 21], name: '售票窗口', at: 'きっぷうりば', tune: 'ekimae', shut: '售票窗口 7 點到 21 點。' },
    lost: { area: 'ekimae', pay: 160, place: 'station', shop: 'koban', who: 'kobayashi', course: 'm3', hours: [8, 22], name: '失物招領', at: '駅前交番', tune: 'ekimae', shut: '交番的失物招領 8 點到 22 點。' },
    taxi: { area: 'ekimae', pay: 180, place: 'station', shop: 'taxi', who: 'suzuki', course: 'm4', present: true, name: '計程車導航', at: '鈴木タクシー', n: 5, credit: [1, 0.6, 0.3, 0], unit: '順利載到的客人', tune: 'ekimae', shut: '鈴木 8–12 點、15–19 點在計程車招呼站（中午在食堂吃飯）。' },
    // 湯の花温泉 (2026-11-23, docs/superpowers/specs/2026-11-23-onsen-work-design.md §1): the N4 area, open once the card is ベテラン; each
    // job by its unit, its keeper there. All four on the board from the start (ruling 2); a job is offered and started only once its
    // runner is in (観光案内所 here, 仲居・おみやげ屋・フロント in their own tasks). tune: the onsen's own (湯けむり, 2026-11-25)
    annai: { area: 'onsen', pay: 200, place: 'onsen', shop: 'annai', who: 'akari', course: 'm7', present: true, name: '觀光服務台', at: '観光案内所', tune: 'onsen', shut: '森あかり 9 點到 18 點在観光案内所的窗口。' },
    nakai: { area: 'onsen', pay: 220, place: 'ryokan', shop: 'kagetsu', who: 'chiyo', course: 'm8', present: true, name: '仲居（準備客房）', at: '旅館「花月」', n: 16, tune: 'onsen', shut: '女將花村千代 8 點到 21 點在旅館花月的大廳。' },   // 16: three rooms, ten things to do in them, a check and a guest each (2026-11-24)
    miyage: { area: 'onsen', pay: 240, place: 'yudori', shop: 'yunohanado', who: 'makoto', course: 'm11', present: true, name: '伴手禮店', at: 'ゆのはな堂', tune: 'onsen', shut: '竹内まこと 9 點到 21 點在ゆのはな堂。' },
    front: { area: 'onsen', pay: 260, place: 'ryokan', shop: 'kagetsu', who: 'sato', course: 'm15', present: true, name: '旅館櫃台', at: '花月のフロント', tune: 'onsen', shut: '番頭佐藤一 7–11 點、14–22 點在旅館花月的櫃台。' } };
  // a workplace no more (外送, cut 2026-11-15; 整理貨架, 2026-11-19): its old records still read
  const GONE = { deliver: { name: '外送', at: 'らいらいけん' }, shelf: { name: '整理貨架', at: 'ふく' } };
  const named = (job) => PLACES[job] || GONE[job] || { name: job, at: '' };
  // 打工證: one for every area (2026-11-22, the user — it was one an area, a step up only with all of an area's jobs at S): its 經驗
  // each job's best shift (POINTS: S 5 … D 1; a job done again counts only if better), a step every 10 (RANKS), each step 2% more on
  // all the pay after it (the shift that takes it there: as it was). An area's need: the step it opens at (駅前 一人前); hours: what
  // its board says of when
  const POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0 };
  const RANKS = [['新人', 0], ['一人前', 10], ['ベテラン', 20], ['バイトリーダー', 30], ['達人', 40]];
  const AREAS = { chinatown: { name: '中華街', need: 0, hours: '大通り的店 10 點到 19 點；らいらいけん 10 點到 20 點；福明要王老闆在。' },
    ekimae: { name: '駅前', need: 1, hours: '便當攤 7–19 點（月台）；售票窗口 7–21 點；交番 8–22 點；計程車 8–12、15–19 點。' },
    onsen: { name: '湯の花温泉', need: 2, hours: '観光案内所 9–18 點（あかり）；旅館花月 8–21 點（千代）、櫃台 7–11、14–22 點（佐藤）；ゆのはな堂 9–21 點（竹内）。' } };
  const RAISE = 0.02;
  const BONUS = { S: 50, A: 30, B: 20, C: 10, D: 0, E: 0 };
  const GRADES = [['S', 0.95], ['A', 0.85], ['B', 0.7], ['C', 0.5], ['D', 0.3], ['E', 0]];
  const JOBS = {};
  const day = () => dateStr(TOWNEV.today());
  const W = () => (state.work && state.work.res ? state.work : (state.work = { res: {} }));
  const fin = (r) => Boolean(r) && r.yen !== undefined;
  const today = () => W().res[day()] || null;
  const shifts = () => Object.values(W().res).filter(fin).length;   // done anywhere: a record only (the pay no longer goes by it)
  const jobsOf = (area) => Object.keys(PLACES).filter((j) => PLACES[j].area === area);
  const best = (job) => GRADES.map(([g]) => g).find((g) => Object.values(W().res).some((r) => fin(r) && r.place === job && r.grade === g)) || null;
  const xp = () => Object.keys(PLACES).reduce((a, job) => a + (POINTS[best(job)] || 0), 0);   // a gone job's shifts: none
  const rank = (x = xp()) => RANKS.reduce((k, [, min], i) => (x >= min ? i : k), 0);
  const title = () => RANKS[rank()][0];
  const ups = () => rank();   // steps up: 2% each
  const RULE = `每份工作算最好的一次：${Object.entries(POINTS).filter(([, v]) => v).map(([g, v]) => `${g}\u00a0${v}`).join('・')}\u00a0點；每 ${RANKS[1][1]} 點升一級，之後的薪水 +${Math.round(RAISE * 100)}%`;
  // the card as it stands: its step, the 經驗, how far to the next
  const toNext = (x = xp()) => { const nx = RANKS[rank(x) + 1]; return nx ? `再 ${nx[1] - x} 點升「${nx[0]}」` : '最高級了'; };
  const shutWhy = (area) => { const A = AREAS[area], [nm, min] = RANKS[A.need], from = Object.keys(AREAS).filter((k) => k !== area && areaOpen(k)).map((k) => AREAS[k].name).join('、');
    return `打工證要「${nm}」（經驗 ${min} 點）才能在${A.name}打工，現在 ${xp()} 點${from ? `：先在${from}打工累積經驗` : ''}。`; };
  const nOf = (job) => (PLACES[job] && PLACES[job].n) || N;   // the tasks in a shift of this job (10, the 外場's six groups)
  const grade = (score, job) => { const v = Object.values(score || {}), cr = PLACES[job] && PLACES[job].credit, got = (m) => (cr ? cr[Math.min(m, cr.length - 1)] : m === 0 ? 1 : 0);
    const share = v.reduce((a, m) => a + got(m), 0) / Math.max(nOf(job), v.length); return GRADES.find(([, min]) => share >= min - 1e-9)[0]; };
  const pay = (job, g, tip = 0, up = ups()) => { const base = (PLACES[job] || {}).pay || 0, bonus = BONUS[g] || 0, raise = Math.round((base + bonus + tip) * RAISE * up);
    return { base, bonus, tip, raise, pct: Math.round(RAISE * 100 * up), yen: base + bonus + tip + raise }; };
  const seen = () => kanaSeenSet().size;
  const knowsAll = () => state.kanaKnown === true || !inPreStage();
  const kanaOk = (need) => knowsAll() || seen() >= need;
  // its kana seen — or the job's own switch on the test site says never mind (收銀's, 2026-11-20: on a device still in 入門 張 never
  // offered it, the switch skipping only the numbers)
  // 駅前's (2026-11-20): the area open (the card before it at its top) and the course at the job's unit — or the test site's switch
  // — each area its own (2026-11-24: 湯の花温泉's, nq_work_onsen, skips ベテラン and the units there only)
  const FREE_AREA = { ekimae: 'nq_work_eki', onsen: 'nq_work_onsen' };
  const areaFree = (area) => { const k = FREE_AREA[area]; try { return Boolean(k) && onTestSite() && localStorage.getItem(k) === '1'; } catch (e) { return false; } };
  const freeTool = (area, on, off) => { const k = FREE_AREA[area], now = !areaFree(area); try { localStorage.setItem(k, now ? '1' : ''); } catch (e) { /* no storage */ } return now ? on : off; };
  const ekiFree = () => areaFree('ekimae'), onsenFree = () => areaFree('onsen');
  const ekiTool = () => freeTool('ekimae', '駅前打工：不看條件（這台裝置），打工證還沒一人前、單元還沒到也能做', '駅前打工：恢復要先拿到打工證「一人前」、學到那個單元');
  const onsenTool = () => freeTool('onsen', '湯の花温泉打工：不看條件（這台裝置），打工證還沒ベテラン、單元還沒到也能做', '湯の花温泉打工：恢復要先拿到打工證「ベテラン」、學到那個單元');
  const areaOpen = (area) => rank() >= (AREAS[area].need || 0) || areaFree(area);
  const unitOk = (u, area) => areaFree(area) || TOWNEV.reachedIdx() >= TOWNEV.unitIdx(u);
  const unitName = (u) => { const x = DATA.UNITS.find((y) => y.id === u); return x ? x.short : u; };
  const unitLv = (u) => { const x = DATA.UNITS.find((y) => y.id === u); return x && x.lv ? `${x.lv}` : ''; };
  const opened = (job) => { const P = PLACES[job]; if (P.course) return areaOpen(P.area) && unitOk(P.course, P.area);
    return kanaOk(P.kana) || Boolean(JOBS[job] && JOBS[job].open && JOBS[job].open()); };
  // the kana the jobs may use: those seen — or all of them for one who knew kana already or is past 入門 (2026-11-15, the final
  // review: they had no kana seen, and three jobs drew from nothing)
  const kana = () => (knowsAll() ? new Set(REG.kana.map((x) => x.ch)) : kanaSeenSet());
  const at = (P) => (TOWNEV.whereIs(P.who, TOWNEV.now(), TOWNEV.today()) || {}).place === P.place;   // its keeper there now
  const inHours = ([a, b], h = TOWNEV.now()) => h >= a && h < b;
  const here = (job) => { const P = PLACES[job]; return P.present ? at(P) : P.hours ? inHours(P.hours) : job === 'buns' ? (TOWNEV.whereIs('wang', TOWNEV.now(), TOWNEV.today()) || {}).place === 'chinatown' : job === 'waiter' ? TOWNEV.isOpen('rairai', TOWNEV.now()) : TOWNEV.isOpen('dori', TOWNEV.now()); };
  // the 入門 words a job needs learned first (外場: いらっしゃいませ, どうぞ, はい) — the ones not yet, for one still in 入門
  // an 入門 word learned (or all of them, past 入門 — not for knowing kana: those words come in 入門's own lessons; the final review)
  const knows = (w) => !inPreStage() || REG.vocab.some((v) => v.w === w && v.r === w && state.srs[v.key]);
  const wordsLeft = (job) => (PLACES[job].words || []).filter((w) => !knows(w));
  const needs = (job) => (JOBS[job] && JOBS[job].left ? JOBS[job].left() : []);   // 收銀's numbers (and いくら, 円) still to learn
  // may this job be started (or picked up again) now: its kana seen, today's workplace (if any) this one and not done, open
  function can(job) {
    const P = PLACES[job]; if (!P) return { ok: false, why: '' };
    const unitShort = P.course && !unitOk(P.course, P.area);
    // the area shut and the unit not reached either: both said (2026-11-24, Review Focus 1 — one in N5 asking at 湯の花 hears the
    // step the card needs and the job's unit)
    if (!areaOpen(P.area)) return { ok: false, why: shutWhy(P.area) + (unitShort ? `${P.name}還要學到 ${unitLv(P.course)}「${unitName(P.course)}」單元。` : '') };
    if (unitShort) return { ok: false, why: `學到「${unitName(P.course)}」單元就能來${P.name}。` };
    if (!opened(job)) return { ok: false, why: `再學 ${P.kana - seen()} 個假名就能來${P.name}。` };
    const left = wordsLeft(job); if (left.length) return { ok: false, why: `先學會入門的${left.map((w) => `「${w}」`).join('')}，就能來${P.name}。` };
    const more = needs(job); if (more.length) return { ok: false, why: `先學會${more.map((w) => `「${w}」`).join('')}，就能來${P.name}。` };
    if (!JOBS[job]) return { ok: false, why: `${P.name}還在準備中。` };   // its runner not in yet (2026-11-24, ruling 2): never started
    const t = today();
    if (t && t.place !== job && !free()) return { ok: false, why: `今天已經在「${named(t.place).name}」打過工了。一天只能在一個地方打工，明天再來吧。` };
    if (fin(t) && !free()) return { ok: false, why: '今天的班打完了，明天再來吧。' };
    if (t && t.place === job && (Number(t.done) || 0) >= nOf(job)) return { ok: true };   // all done but never paid (the card shut at the last moment, the app gone): paid whenever tapped, its keeper there or not (2026-11-22, the review)
    if (!here(job)) return { ok: false, why: P.shut || (job === 'buns' ? '王老闆不在攤子（10 點到 20 點在）。' : job === 'waiter' ? 'らいらいけん 10 點到 20 點營業。' : '大通り的店 10 點到 19 點開門。') };
    return { ok: true };
  }
  // the test site (町の手帳, 2026-11-15, the user): shift after shift, any place, on this device — today's record put aside under the
  // day and a number (its pay kept with it) as the next begins
  const FREE = 'nq_work_free';
  const free = () => { try { return onTestSite() && localStorage.getItem(FREE) === '1'; } catch (e) { return false; } };
  function tool() { const on = !free(); try { localStorage.setItem(FREE, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '打工無限次數（這台裝置）：打完一班可以再打，也可以換別家' : '打工恢復一天只能一個地方、一班'; }
  function setAside(d) { const res = W().res; let n = 2; while (res[`${d}#${n}`]) n++; res[`${d}#${n}`] = res[d]; delete res[d]; }
  let S = null;   // the shift under way: { job, day }
  // a shift begun, or today's picked up where it was left; its runner given what it needs (ctx)
  function start(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const d = day(), res = W().res; if (free() && res[d] && (fin(res[d]) || res[d].place !== job)) setAside(d);
    if (!res[d]) { res[d] = { place: job, done: 0, score: {} }; saveState(); }
    const s = S = { job, day: d };
    if (res[d].done >= nOf(job)) { finish(s); return true; }   // all done but never paid (the card shut, the app gone, at the last moment): paid now
    const ctx = { yard, n: nOf(job), job, done: res[d].done, right: (k, misses) => right(s, k, misses), finish: (extra, ms) => finish(s, extra, ms), on: () => S === s,
      kept: Object.assign({}, res[d].keep), keep: (o) => { const r = W().res[d]; if (S === s && r && !fin(r)) { r.keep = o; saveState(); } } };   // keep: what the runner needs back after a break (外場's stars, its once-a-shift things), till paid
    const run = () => { if (S === s && JOBS[job]) JOBS[job].run(ctx); };
    const first = (TOWN.WORK.first || {})[job], before = Object.entries(res).some(([k, r]) => k !== d && r.place === job);   // the keeper's word the first time
    if (first && !before && !res[d].done) TALK.open(yard, PLACES[job].who, first, run, null, { ev: true }); else run();
    return true;
  }
  // before a shift (2026-11-19, the user: a job should first say how it is played and what it asks of you, then はい／いいえ): the
  // rules card — how it goes, the abilities it takes, how long a shift is and the pay — はい to begin (start), いいえ to leave it.
  // はたらく opens it; the keepers' first word (TOWN.WORK.first) keeps only what they say in Japanese, the rules being here
  const RULES = {
    counter: { how: ['客人用日文說要買什麼（用聽的），從櫃台上把那樣東西拿給他。', '學過「ふたつ」：有客人會要兩個，就拿兩次。', '客人底下那條是耐心：客人說完要什麼，你有 5 秒，拿錯也會少一截；沒了客人就走人，這位算失敗。'], uses: ['聽單字', '假名'], n: '一班 10 位客人' },
    waiter: { how: ['有「！」的就是在等你：客人頭上，或要帶位時的空桌子。點它走過去。', '聽客人說什麼，從下面三句選你要回的那句。帶位、點菜、端菜、結帳都靠你。', '客人頭上那條是耐心，越等越短；沒了客人就走人，店裡少一顆星。客滿時有人進門，先道歉請他等。'], uses: ['聽力', '招呼和店裡的會話', 'これ・それ・あれ'], n: '一班 6 組客人' },
    buns: { how: ['聽到哪個音，就在假名板上按哪個字；按對了包子就往下包一步。假名板上是你學過的平假名和片假名，發音像、字形像的會放在一起。', '按 30 下、包好 5 顆包子。每顆有 15 秒，喇叭旁邊那條就是；時間到還沒包好，這顆就變成醜包子進蒸籠、算失敗，接著包下一顆。全部按對又沒超時，王老闆會很激動。'], uses: ['聽假名', '認平假名、片假名'], n: '一班 5 顆包子' },
    // 駅前 (2026-11-20)
    bento: { how: ['電車停下來，車窗會一扇扇打開，乘客喊「すみません！」。點那扇窗，聽他要什麼、要幾個（先用聽的，按錯兩次字才會出來；喇叭可以再聽）。', '從箱子拿東西：點一下拿一個，點手上的放回去；拿好按「どうぞ」交給他。',
      '數東西：一般的東西用「つ」（ひとつ、ふたつ、みっつ），瓶子用「本」（いっぽん、にほん、さんぼん）；「A と B」是兩樣都要。學到形容詞以後，茶分熱的（あたたかい，橘色瓶蓋）和冷的（つめたい，藍色瓶蓋）。',
      '乘客問「〇〇、ありますか。」：箱子裡有就回「はい、あります。」，沒有就回「すみません、ありません。」。', '電車不等人：發車鈴響了就只剩 10 秒，車一開走，還沒拿到的乘客算失敗；全部遞完，車會提早開走。'], uses: ['聽數量和量詞', '「と」（和）', 'あたたかい・つめたい'], n: '一班 3 班電車、10 位乘客' },
    taxi: { how: ['你坐在鈴木的副駕駛座，腿上是鎮上的地圖。前三位乘客會一路告訴你怎麼走：「つぎの 角を 右に 曲がって ください」「二つ目の 角を…」「まっすぐ 行って ください」「あの 〜の 前で 止めて ください」。',
      '左右是照車頭的方向：車子往地圖下面開的時候，「右」是地圖的左邊。到路口前按「左」「まっすぐ」「右」，到了按「止めて」。', '後兩位只說要去哪裡（〜まで お願いします），自己在地圖上找到那個地方、選路開過去；繞太遠客人會唸。',
      '每個路口有幾秒可以決定，沒選鈴木就直走；走錯客人會叫停，算一次失誤。到了以後看跳表，說出車資。沒失誤的話，客人有時會說「おつりは いいです」給你小費。'], uses: ['右・左・まっすぐ', '〜て ください', '二つ目の 角', '地方的名字（漢字）'], n: '一班 5 趟' },
    lost: { how: ['來的人會說把東西忘了：有時說了是什麼、忘在哪裡（電車に 財布を 忘れました），有時只說其中一樣。從「何を 忘れましたか」「どこに 忘れましたか」「どんな〜ですか」裡問他還沒說的；問已經說過的算一次失誤。', '「どんな〜ですか」問到的是兩個特徵，用「くて」「で」連起來：「黒くて、小さい 財布です」＝黑色的、小的錢包。顏色、大小、新舊、圓的方的都會出現。東西、地點、樣子都知道了，小林才會拿出東西。',
      '小林會從後面拿出四個同種類的東西，只有兩個特徵都對的才是。點它拿起來，按「これですか」交給客人。', '錢包和包包可能有兩個長得一樣：小林會說「同じのが 二つ…」，這時要問「中に 何が ありますか」，聽客人說裡面有什麼（中に カードと 写真が あります），點起來看裡面。四個都不是就按「すみません、ありません」。', '客人說完特徵才開始算耐心（25 秒），按錯會少一截。'], uses: ['何・どこ・どんな', '形容詞（顏色、大小、新舊…）', 'くて・で 連接', '〜が あります／入って います'], n: '一班 10 位客人' },
    window: { how: ['客人在窗口問一個問題：到哪一站多少錢、下一班往哪裡的車幾點、在幾號月台、快速車停不停某一站，或是要買票（先用聽的，答對或錯兩次才出現字）。', '答案都在窗口上面：路線圖上每一站的票價（上面大人、下面小孩，● 是快速車會停的站）、時鐘、發車標。看好了，從下面三句選你要回答的那句。',
      '買票：先在路線圖點客人要去的站，車票印出來，再說價錢：一張就說「…円です」，大人加小孩兩張就說「ぜんぶで …円です」。', '答案用假名寫，要自己把板子上的數字念出來：10:25 是「じゅうじ にじゅうごふん」，10 分、40 分是「じゅっぷん、よんじゅっぷん」，4 點「よじ」、7 點「しちじ」、9 點「くじ」、14 點「じゅうよじ」。', '客人說完話開始算耐心（20 秒），按錯也會少一截；按喇叭重聽時耐心會暫停。'], uses: ['讀站名（漢字）', '時間和票價的念法', 'まで・に・は', 'ます・ません'], n: '一班 10 位客人' },
    till: { how: ['客人把要買的東西放上櫃台，每樣都有價格牌。只有一樣就問「これ、いくらですか。」，用字卡依序拼出價格的念法，例如 198円 → ひゃく｜きゅう｜じゅう｜はち｜えん。', '兩樣（或同一樣要「ふたつ」）就問「ぜんぶで いくらですか。」：自己加起來，拼出全部的錢，例如 248＋150 → さん｜びゃく｜きゅう｜じゅう｜はち｜えん。', '前 4 位買一樣，後 6 位買兩樣，不會更多。按錯一塊算一次失誤，錯兩次下一塊會亮。', '客人底下那條是耐心：買一樣 30 秒、兩樣 45 秒，按錯也會少一截；沒了客人就走人，這位算失敗。'], uses: ['數字的念法', 'ひゃく・せん 的音變', '兩個價錢相加'], n: '一班 10 位客人' },
    // 湯の花温泉 (2026-11-24)
    annai: { how: ['遊客在窗口外問問題（先用聽的，答對或錯兩次才出現字；喇叭可以再聽）：幾點到幾點、多少錢、可不可以帶狗、小孩能不能玩、哪裡買得到毛巾、晚上看不看得到……',
      '答案都在頭上的「湯の花温泉 ごあんない」看板：六個地方的時間、價錢和規則（狗、小孩能不能進去，哪裡買得到毛巾）。看板每天都會換，要讀看板，背不起來。',
      '從下面三句選你要回答的那句：要跟看板上寫的一樣，說法也要對——「入れます」「買えます」「借りられます」「できます」「見られます」這些「可以…」的說法。',
      '看板上是 24 小時制：21:00 要說「夜九時（よる くじ）」，17:00 是「夕方五時」，10:00 是「午前十時」。', '遊客說完話開始算耐心（25 秒），按錯也會少一截；按喇叭重聽時耐心會暫停。'],
      uses: ['可能形（入れる・買える・借りられる・できる）', 'ことが できる', '見られる', '讀時間和價錢'], n: '一班 10 位遊客' },
    nakai: { how: ['跟女將千代一起準備三間客房：桜の間、菊の間、松の間。每間一開始，千代會先問房間現在的樣子（「お茶は 用意して ありますか」「電気は ついて いますか」）：看圖，從下面選你要回的那句。',
      '接著她會交代客人來之前要先做好的事（先用聽的，按喇叭可以再聽一次；做對或錯兩次才出現字）：「エアコンを つけて おいて ください」就點冷氣，「お布団を 二組 敷いて おいて ください」就在兩個地方鋪棉被。點錯東西算一次失誤，那樣東西會回到原樣。',
      '上面「お客様 到着まで」是客人到達前的倒數，千代說話、按喇叭重聽時會暫停；時間到了還沒做好的事算失敗。最後 10 秒會變紅。',
      '客人進房會說一句話（「あれ、窓が 開いて いますね」），選你要回的那句：事先做好的是「開けて おきました」——自動詞（開く、つく）不能加「ておく」。',
      '睡在要鋪棉被的地方的貓，點牠就會走開，不算失誤。'],
      uses: ['自動詞・他動詞（開く／開ける、つく／つける…）', '〜て ある・〜て いる', '〜て おく', '數棉被「組」、坐墊「枚」'],
      n: () => { const rooms = 3, n = PLACES.nakai.n; return `一班 ${rooms} 間房：${n - 2 * rooms} 件要準備的事、${rooms} 次確認、${rooms} 位客人`; } },   // from n, as NAKAI.make (its three rooms: 桜・菊・松; fix round 2)
    miyage: { how: ['客人在櫃台前說要買什麼（先用聽的，按喇叭可以再聽一次；拿對、錯兩次或客人走了才出現字）：要送誰、送幾個人、收到過什麼、手上有多少錢……',
      '點背後貨架上的東西放上托盤（每樣一個；點托盤上的、或再點一次架上的，就放回去），放好按「どうぞ」交給客人。饅頭有 6 個裝和 12 個裝，看客人說幾個人。',
      '有的客人還會拜託你（「包んで もらえますか」）、兩手拿滿了，或是要送給長輩（さしあげる）：從下面選你要回的那句——看清楚是誰為誰做的（あげる・くれる・もらう）。',
      '拿不定主意的客人，可以請他試吃櫃台上的饅頭：「よかったら、食べて みて ください」。一位客人有兩步的話，兩步的失誤算在同一件裡。',
      '客人說完話開始算耐心（30 秒，回話 20 秒），拿錯、回錯會少一截；按喇叭重聽時耐心會暫停。'],
      uses: ['あげる・くれる・もらう', '〜て あげる・〜て くれる・〜て もらう', 'さしあげる', '聽人數和價錢'], n: '一班 10 位客人' },
    front: { how: ['客人走到櫃台說話（先用聽的，按喇叭可以再聽一次；答對、錯兩次或客人走了才出現字）：入住、行李、晚餐時間、要東西、問地方、問台帳上的事；早上的班還有退房。',
      '從下面選你要回的那句。先想「這是誰的動作」：客人的動作用尊敬語（なさる、いらっしゃる、お〜に なる），我們（旅館這一方）的動作用謙讓語（お〜する、おる、伺う）；東西、地方要說「ございます」——不能用「いらっしゃる」「おる」。',
      '入住：先打招呼，再在左邊的「予約台帳」找到客人的名字（名字上面有念法），看他住哪一間，點右邊那間的鑰匙。',
      '台帳上還有人數、晚餐時間和備註（お誕生日、えびが だめ……）：客人問的事，答案常常就在台帳上。',
      '佐藤先生站在你旁邊：選錯了，他會提醒你那是誰的動作。客人說完話開始算耐心（25 秒），選錯也會少一截；按喇叭重聽時耐心會暫停。退房只有早上的班（7–11 點）才有，下午的班（14–22 點）入住比較多。'],
      uses: ['尊敬語・謙讓語', '先判斷是誰的動作', 'ございます・おります・いらっしゃいます', '讀台帳（名字的念法、時間）'], n: '一班 10 位客人' } };
  function intro(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const P = PLACES[job], R = RULES[job] || { how: [DOES[job] || ''], uses: [], n: `一班 ${nOf(job)} 件` }, t = today(), back = t && t.place === job && !fin(t) ? t.done : 0, p = pay(job, 'E');   // a job without its card yet: what the board says of it
    CLASS.card('wk-rules', P.name, `<div class="wk-rhead"><span class="kr-face">${TOWNEV.face(P.who)}</span><p><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span></p></div>
      <h4>玩法</h4><ul class="wk-how">${R.how.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <h4>需要的能力</h4><p class="wk-uses">${R.uses.map((u) => `<span lang="ja">${esc(u)}</span>`).join('')}</p>
      <p class="wk-pay">${esc(typeof R.n === 'function' ? R.n() : R.n)}・底薪 ${p.base} 円＋評級加給最多 50 円${job === 'waiter' ? '＋店長紅包' : ''}${p.pct ? `・打工證加給 +${p.pct}%` : ''}${P.area === 'onsen' ? '・每天第一次打工，另付當天搭車上來的車資（交通費）' : ''}</p>
      ${back ? `<p class="wk-back">今天做到 ${back}／${nOf(job)}，按「はい」接著做。</p>` : ''}
      <p class="wk-ask"><b lang="ja">はたらきますか？</b><span>要開始打工嗎？</span></p>
      <div class="wk-yn"><button type="button" class="btn" data-rules="yes" lang="ja">はい</button><button type="button" class="btn" data-rules="no" lang="ja">いいえ</button></div>`,
    (e) => { const b = e.target.closest('[data-rules]'); if (!b) return; CLASS.close(); if (b.dataset.rules === 'yes') start(document.querySelector('#view .yard') || yard, job); });   // the place as it is now: shutting the card may draw it anew (CLASS.close → sceneMinute: an hour turned meanwhile), the keeper's first word in it, not in the old one off the page (the final review's I-1)
    return true;
  }
  // the job a person takes beginners on for, where they are now, once its kana are seen (today taken elsewhere or closed: still
  // offered, and はたらく says why not)
  // 駅前's (2026-11-21, the review: 「老闆會說還差什麼」): offered while not yet open too — はたらく then says what is missing
  const offer = (id, place) => { const job = Object.keys(PLACES).find((j) => PLACES[j].who === id && PLACES[j].place === place); return job && JOBS[job] && (PLACES[job].course || opened(job)) ? job : null; };   // a job whose runner is in (駅前's came stage by stage)
  const hello = (id) => (TOWN.WORK.hello || {})[id] || ['いらっしゃい！', '歡迎光臨！'];
  // the hero's word for working, a reply picked in the talk (2026-11-20): yes to their はたらく？ (asked: their greeting was it), else asked for
  const ASK = ['アルバイト、させて ください。', '請讓我在這裡打工。'];
  const ask = (id, asked) => (asked && (TOWN.WORK.yes || {})[id]) || ASK;
  // the 求人看板 (2026-11-20, the user: on the outer street by the gate, and it should say what the four jobs are): each job — what it
  // is, where and with whom, its pay, what it takes (✓ those open to this learner); the area's 打工證 and today's
  const DOES = { buns: '聽王老闆念的假名，在假名板上按對的字，一步步把包子包好。', counter: '客人用日文說要什麼，從櫃台上找出來拿給他。',
    waiter: '帶位、點菜、端菜、結帳：聽客人說的話，選一句回他。', till: '用字卡拼出價格和全部加起來的念法，念給客人聽。',
    bento: '電車停靠時，聽車窗裡的乘客要什麼、要幾個，在發車前遞給他。', window: '看運賃表和發車標，回答票價、下一班幾點、在幾號月台，也賣票。',
    lost: '問來找東西的人忘了什麼、忘在哪裡、長什麼樣子，從拿出來的東西裡找出對的那樣。', taxi: '坐在鈴木的副駕駛座，照乘客說的（右轉、直走、停在哪裡前面）在地圖上帶路。',
    annai: '看頭上的「ごあんない」看板，回答遊客：幾點開、多少錢、能不能帶狗、哪裡買得到毛巾。', nakai: '聽女將交代，在客人來之前把客房準備好（開窗、開冷氣、鋪棉被、泡茶…），回答她的確認和進房客人的話。',
    miyage: '聽客人要送誰、送幾個、收到過什麼，從貨架上拿對的伴手禮放上托盤交給他，回答客人的請求、主動幫忙。', front: '在旅館櫃台接待客人：入住時在予約台帳找到名字、拿對的鑰匙，回答行李、晚餐、要東西和問路，用對的敬語。' };
  const WHERE = { buns: '牌樓外・王老闆', counter: '大通り・周美蘭', waiter: '大通り盡頭・黄', till: '大通り・張偉', bento: 'ホーム・浜田ハル', window: '駅・原田', lost: '交番・小林巡查', taxi: 'タクシー乗り場・鈴木',
    annai: '湯の花駅前・森あかり', nakai: '旅館花月・花村千代', miyage: '湯けむり通り・竹内まこと', front: '旅館花月・佐藤一' };
  // an area's 求人看板 (中華街's by its gate; 駅前's on the square, 2026-11-20): each of its jobs, what it takes; the card and today's
  function board(area) {
    if (!AREAS[area]) area = 'chinatown';   // called bare (or with the scene, as it was before areas)
    const t = today(), A = AREAS[area], js = jobsOf(area), shut = !areaOpen(area);
    const rows = js.map((job) => { const P = PLACES[job], built = Boolean(JOBS[job]), ok = built && opened(job);
      const left = ok ? wordsLeft(job) : [], more = needs(job).length, go = ok && !left.length && !more;   // the kana seen, the 入門 words (外場) and numbers (收銀) still to learn
      const need = go ? '✓ 可以做' : !built ? '準備中' : shut ? `先拿到打工證「${RANKS[A.need][0]}」` : P.course ? `學到「${unitName(P.course)}」單元` : more ? P.need : ok ? `再學 ${left.length} 個入門單字` : `學 ${P.kana} 個假名`;
      return `<li class="wk-job${go ? ' ok' : ''}" data-job="${job}"><p class="wk-jtop"><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span><small>${esc(WHERE[job] || '')}</small><em>底薪 ${P.pay} 円</em></p>
        <p class="wk-does">${esc(DOES[job] || '')}</p><p class="wk-need">${esc(need)}</p></li>`; }).join('');
    const now = t ? (fin(t) ? `今天在「${esc(named(t.place).name)}」的班打完了。` : `今天在「${esc(named(t.place).name)}」打工中（${t.done}／${nOf(t.place)}）。`) : '今天還沒打工。一天只能選一個地方打一班。';
    const head = area === 'chinatown' ? 'アルバイト ぼしゅう' : 'アルバイト<ruby>募集<rt>ぼしゅう</rt></ruby>';
    CLASS.card('wk-board', '求人看板', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button><div class="wk-bhead"><b lang="ja">${head}</b><span>求人看板・${esc(A.name)}</span></div>
      ${shut ? `<p class="wk-lock">${esc(shutWhy(area))}</p>` : ''}
      <ul class="wk-jobs">${rows}</ul><p class="wk-today">${now}</p>
      <p class="wk-note">打工證：${esc(title())}・經驗 ${xp()}（${esc(toNext())}）。${esc(RULE)}。<br>${esc(A.hours)}點老闆，選要來打工的那句回話。</p>`, () => {});
  }
  // a task done (misses: the tries wrong first): counted once, on the day the shift began
  function right(s, k, misses) {
    const r = W().res[s.day]; if (!r || fin(r)) return;
    if (!(k in r.score)) r.score[k] = Math.max(0, Math.floor(misses) || 0);
    r.done = Math.max(r.done || 0, Object.keys(r.score).length); saveState();
  }
  // 交通費 (2026-11-25, ruling 37 — the final review's I-2: an onsen shift paid about what the train up cost): the day's first shift at
  // 湯の花 pays back what the ride up there cost that day (the ticket and any 乗り越し精算: RIDE.fare, kept on arriving, on this device),
  // as a real アルバイト's 実費 is — once a day (oneADay.koutsuhi, synced: ruling 9), none without a ride; in the shift's 円, on top of
  // its pay (no card's +% on it)
  const fareFor = (s) => (PLACES[s.job] || {}).area === 'onsen' && (state.oneADay || {}).koutsuhi !== s.day && typeof RIDE === 'object' ? RIDE.fare(s.day) : 0;
  // the last done: graded and paid at once (extra.tip: on top — 外場's 店長紅包, named by extra.tipName), the results shown ms later
  // (or once ms, a promise, is kept: the goodbye said) — the runner calls it at the tenth, not at the end of its card's goodbye,
  // so a card shut then is paid all the same (2026-11-15, the final review)
  function finish(s, extra = {}, ms = 0) {
    const r = W().res[s.day]; if (!r || fin(r)) return null;
    const was = { xp: xp(), rank: rank(), best: best(s.job) }, before = yenBalance(), g = grade(r.score, s.job), p = Object.assign(pay(s.job, g, extra.tip || 0), { tipName: extra.tipName });
    const fare = fareFor(s); if (fare) { p.fare = fare; p.yen += fare; state.oneADay = Object.assign({}, state.oneADay, { koutsuhi: s.day }); }   // 交通費, the day kept with the pay
    Object.assign(r, { done: nOf(s.job), yen: p.yen, grade: g, tip: p.tip }); delete r.keep; saveState();
    if (S === s) S = null;
    const show = () => results(s.job, r, p, before, was, extra.html);
    if (ms && ms.then) ms.then(show, show); else if (ms) setTimeout(show, ms); else show();
    return p;
  }
  // the results: the tasks right at once, the pay counting up, the grade stamped on, the area's 打工證 and whether it went up (up)
  // was: the card before this shift (its 經驗, step and this job's best) — what it gained, a step up, an area opened by it
  function results(job, r, p, before, was, more = '') {   // more: the job's own lines under the pay (外場: each group, their words to hear again)
    const first = Object.values(r.score).filter((m) => m === 0).length, all = nOf(job), g = r.grade, el = document.createElement('div');
    const x = xp(), lv = rank(x), gain = x - was.xp, up = lv > was.rank, opens = Object.keys(AREAS).filter((k) => AREAS[k].need > was.rank && AREAS[k].need <= lv);
    el.className = 'cr-result wk-result'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '打工結算'); el.dataset.at = location.hash;
    el.innerHTML = `<div class="crr-card"><div class="crr-head"><b>打工結算</b><span>${esc(named(job).name)}・${esc(named(job).at)}</span></div>
      <div class="crr-row"><span>${esc((PLACES[job] && PLACES[job].unit) || '一次就做對')}</span><b><i data-n="${first}">0</i> / ${all}</b></div>
      <div class="crr-row"><span>${yenIcon()}底薪</span><b><i data-n="${p.base}" data-yen>0</i> 円</b></div>
      ${p.bonus ? `<div class="crr-row"><span>評級加給（${g} 級）</span><b>+<i data-n="${p.bonus}" data-yen>0</i> 円</b></div>` : ''}
      ${p.tip ? `<div class="crr-row"><span>${esc(p.tipName || '小費')}</span><b>+<i data-n="${p.tip}" data-yen>0</i> 円</b></div>` : ''}
      ${p.raise ? `<div class="crr-row"><span>打工證加給（+${p.pct}%）</span><b>+<i data-n="${p.raise}" data-yen>0</i> 円</b></div>` : ''}
      ${p.fare ? `<div class="crr-row crr-fare"><span lang="ja"><ruby>交通費<rt>こうつうひ</rt></ruby></span><b>+<i data-n="${p.fare}" data-yen>0</i> 円</b></div>` : ''}
      <div class="crr-row crr-sum"><span>錢包</span><b><i data-n="${before + p.yen}" data-from="${before}" data-yen>${yenStr(before)}</i> 円</b></div>${more}
      <div class="crr-stamp g${g}" aria-label="${g} 級"><b>${g}</b><span>級バイト</span></div>
      <p class="crr-rank">打工證：${esc(RANKS[lv][0])}・經驗 ${x}${gain ? `（+${gain}）` : ''}${up ? `　<em>升級！之後的薪水 +${Math.round(RAISE * 100 * lv)}%${opens.length ? `，${esc(opens.map((k) => AREAS[k].name).join('、'))}的打工開放了` : ''}</em>`
        : `<small>${esc(toNext(x))}${!gain && was.best ? `（${esc(named(job).name)}最好的一次是 ${was.best}，要更好才會多經驗）` : ''}</small>`}</p>
      <button type="button" class="btn btn-primary crr-ok">收下</button></div>`;
    document.body.appendChild(el);
    const nums = [...el.querySelectorAll('i[data-n]')], stamp = el.querySelector('.crr-stamp'), put = (x, v) => { x.textContent = x.dataset.yen !== undefined ? yenStr(v) : String(Math.round(v)); };
    const thud = () => { stamp.classList.add('on'); el.querySelector('.crr-card').classList.add('thud'); playSfx('stamp'); setTimeout(() => playSfx('fanfare'), 380); };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { nums.forEach((x) => put(x, Number(x.dataset.n))); stamp.classList.add('on', 'still'); }
    else nums.forEach((x, k) => setTimeout(() => {   // one after another, ticking up
      const to = Number(x.dataset.n), from = Number(x.dataset.from || 0), t0 = performance.now(); let ticks = 0;
      const f = (now) => { const u = Math.min(1, (now - t0) / 600); put(x, from + (to - from) * (1 - Math.pow(1 - u, 3))); if (Math.floor(u * 5) > ticks) { ticks = Math.floor(u * 5); playSfx('coin', ticks); } if (u < 1) requestAnimationFrame(f); else if (k === nums.length - 1) setTimeout(thud, 250); };
      requestAnimationFrame(f);
    }, 300 + k * 650));
    // put away: a gift for a shift done so well (原田's 白鷺まんじゅう for an S at the window, 2026-11-22), said by its giver, then had
    const gk = YEN.giftFor(job, g), gx = gk && YEN.gifts()[gk];
    el.querySelector('.crr-ok').addEventListener('click', () => { el.remove(); if (typeof kotoButtons === 'function') kotoButtons(document);
      const y = document.querySelector('.yard'); if (gx && y) TALK.open(y, gx.who, gx.give, () => YEN.gift(gk)); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-say]'); if (b) { primeTtsPlayer(); speakAs(b.dataset.who, b.dataset.say); } });   // a line heard again
  }
  // 町の手帳's 打工證 page (2026-11-22, the user: one card, the jobs under it by area): its step and 經驗 (a bar to the next), the
  // rule; then each area (one not open yet saying the step it opens at) with its jobs' pay, shifts, best grade and the 經驗 that
  // gives; the shifts done in all, as a record
  function book() {
    const all = Object.values(W().res).filter(fin), n = all.length, up = ups(), x = xp(), lv = rank(x), nx = RANKS[lv + 1];
    const gone = Object.keys(GONE).filter((job) => all.some((r) => r.place === job));   // a workplace no more, while it has shifts to show (no 經驗)
    const row = (job, P, counts) => { const mine = all.filter((r) => r.place === job), b = GRADES.map(([g]) => g).find((g) => mine.some((r) => r.grade === g));
      return `<tr><td><b>${esc(P.name)}</b><small lang="ja">${esc(P.at)}</small></td><td>${P.pay ? `${P.pay} 円` : '—'}</td><td>${mine.length} 班</td><td${b === 'S' ? ' class="wk-s"' : ''}>${b || '—'}</td><td>${counts && b ? POINTS[b] : '—'}</td></tr>`; };   // the job, its place under it: five columns on a phone
    const bar = nx ? Math.round(((x - RANKS[lv][1]) / (nx[1] - RANKS[lv][1])) * 100) : 100;
    const areas = Object.keys(AREAS).map((area) => { const A = AREAS[area];
      return `<p class="wk-area"><b>${esc(A.name)}</b>${areaOpen(area) ? '' : `<small>打工證「${esc(RANKS[A.need][0])}」才開放</small>`}</p>
        <table class="wk-tbl wk-jobs-tbl"><thead><tr><th>工作・場所</th><th>底薪</th><th>打過</th><th>最好</th><th>經驗</th></tr></thead><tbody>${jobsOf(area).map((job) => row(job, PLACES[job], true)).join('')}${area === 'chinatown' ? gone.map((job) => row(job, GONE[job], false)).join('') : ''}</tbody></table>`; }).join('');
    return `<div class="wk-book"><div class="wk-card wk-lic"><span class="wk-title">打工證</span><b class="wk-rank" lang="ja">${esc(RANKS[lv][0])}</b>
      <span class="wk-xpn"><b>經驗 ${x}${nx ? `／${nx[1]}` : ''}</b><em>${esc(toNext(x))}</em></span><i class="wk-xp" aria-hidden="true"><b style="width: ${bar}%"></b></i><small>${esc(RULE)}。</small></div>
      ${areas}${CRUISE.card()}
      <p class="wk-note">總共打過 ${n} 班${up ? `・打工證加給 +${Math.round(RAISE * 100 * up)}%` : ''}。一天只能在一個地方打一班。${Object.keys(AREAS).map((area) => `${esc(AREAS[area].name)}：${esc(AREAS[area].hours)}`).join('')}</p></div>`;
  }
  const register = (job, def) => { JOBS[job] = def; };
  // the music while a shift is under way and in sight (MUSIC.RECORDS: tune; 2026-11-18, the user: the jobs wanted a little music):
  // a job's card up (to its goodbye), or the 外場's floor running (to 黄's おつかれ) — MUSIC.sync() as either opens or shuts
  const tune = () => { const job = Object.keys(PLACES).find((j) => document.querySelector('.cls.wk-' + j)) || (typeof HALL === 'object' && HALL.on() ? 'waiter' : '');
    return job ? PLACES[job].tune : ''; };
  const lines = (add) => { Object.entries(TOWN.WORK.hello || {}).forEach(([id, l]) => add(id, l[0])); Object.values(TOWN.WORK.yes || {}).concat([ASK]).forEach((l) => add('hero', l[0])); Object.values(TOWN.WORK.first || {}).forEach((ls) => ls.forEach((l) => add(l[0], l[1]))); Object.values(JOBS).forEach((j) => j.lines && j.lines(add)); };
  return { N, nOf, PLACES, AREAS, kana, knows, free, tool, ekiTool, ekiOn: ekiFree, onsenTool, onsenOn: onsenFree, areaOpen, can, start, intro, register, has: (job) => Boolean(JOBS[job]), pay, xp, rank, RANKS, POINTS, title, ups, grade, shifts, today, book, shown: () => shifts() > 0, lines, on: () => S, offer, hello, ask, board, tune };
})();
