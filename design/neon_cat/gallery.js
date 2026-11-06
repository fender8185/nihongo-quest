/* Neon cat gallery: the buttons, bored rotation, play-all and speed control of a cat's gallery.html.
 *   NeonCatGallery({data, actions, groups, idle: {pose, action, label}, stage: {x, floor, scale}});
 * The page provides #stage (svg), #now, #bored, #all, #speed, #count and #groups.
 * gallery.html#play=<action id> shows only the stage, looping that action (for record.py and embedding).
 */
(function () {
  'use strict';
  window.NeonCatGallery = function ({data, actions: A, groups: G, idle: rest, stage: at}) {
    const $ = (id) => document.getElementById(id);
    const stage = $('stage');
    // phones see the middle of the stage, so the cat is bigger; the moves still fit (they stay within ±700)
    if (matchMedia('(max-width: 600px)').matches) stage.setAttribute('viewBox', '300 40 1400 780');
    const cat = new NeonCat(stage, Object.assign({data, actions: A, pose: rest.pose}, at));
    const now = $('now'), boredBtn = $('bored'), allBtn = $('all'), speedBtn = $('speed');
    $('count').textContent = `${Object.keys(A).length} 組動作・${Object.keys(data.poses).length} 個姿勢・點一下就播放`;
    let rate = 1, mode = null, token = 0;
    const buttons = {};

    function label(id) { const a = A[id], g = G.find((x) => x.id === a.group); return `<small>${g.name}</small>${a.name}`; }
    function mark(id) { for (const k in buttons) buttons[k].classList.toggle('on', k === id); }
    function idle() { cat.setPose(rest.pose); cat.play(rest.action, {loop: true, rate}); now.innerHTML = `<small>待機</small>${rest.label}`; mark(null); }
    // plays one action; resolves false if something else took over meanwhile
    function run(id) {
      const my = ++token;
      now.innerHTML = label(id); mark(id);
      if (A[id].loop) { cat.play(id, {loop: true, rate}); return new Promise((r) => setTimeout(() => r(my === token), A[id].dur * 2 / rate)); }
      return cat.play(id, {rate}).then(() => my === token);
    }
    function setMode(m) {
      mode = m; token++;
      boredBtn.setAttribute('aria-pressed', m === 'bored'); allBtn.setAttribute('aria-pressed', m === 'all');
    }
    async function boredLoop() {
      const ids = G.find((g) => g.id === 'bored').actions;
      let last = null;
      while (mode === 'bored') {
        let id; do { id = ids[Math.floor(Math.random() * ids.length)]; } while (id === last && ids.length > 1);
        last = id;
        if (!(await run(id)) || mode !== 'bored') return;
        idle(); const my = token;
        await new Promise((r) => setTimeout(r, 1200 / rate));
        if (my !== token) return;
      }
    }
    async function allLoop() {
      for (const g of G) for (const id of g.actions) {
        if (mode !== 'all' || !(await run(id))) return;
        if (mode !== 'all') return;
        idle(); await new Promise((r) => setTimeout(r, 500 / rate));
      }
      setMode(null); idle();
    }

    const host = $('groups');
    for (const g of G) {
      const sec = document.createElement('section');
      sec.innerHTML = `<h2>${g.name}<span>${g.actions.length} 組</span></h2><div class="chips"></div>`;
      const chips = sec.querySelector('.chips');
      for (const id of g.actions) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = A[id].name; buttons[id] = b;
        b.addEventListener('click', () => { setMode(null); run(id).then((mine) => { if (mine && !A[id].loop) idle(); }); });
        chips.appendChild(b);
      }
      host.appendChild(sec);
    }
    boredBtn.addEventListener('click', () => { if (mode === 'bored') { setMode(null); idle(); } else { setMode('bored'); boredLoop(); } });
    allBtn.addEventListener('click', () => { if (mode === 'all') { setMode(null); idle(); } else { setMode('all'); allLoop(); } });
    speedBtn.addEventListener('click', () => {
      rate = rate === 1 ? .5 : rate === .5 ? 2 : 1;
      speedBtn.textContent = `速度 ${rate}×`;
      for (const a of cat.anims) a.playbackRate = rate;
    });
    window.neonCat = cat;
    const solo = location.hash.match(/^#play=(.+)$/);
    if (solo && A[decodeURIComponent(solo[1])]) { document.body.classList.add('solo'); cat.play(decodeURIComponent(solo[1]), {loop: true}); }
    else idle();
    return cat;
  };
})();
