'use strict';
// ---------- 中華街大通り (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §3) ----------
// The user: 中華街's 牌樓 should not shake but be walked through, into a street seen down its length — the two rows of shops
// facing it, narrowing away (B of the two pictures, not the 食堂's 45°), the jobs a beginner earns a little 円 at along it. One
// screen wide, a phone's too: no swipe. The ground is a trapezoid in one-point perspective: the hero's Y is up the screen as
// anywhere out of doors, the horizon at H; at Y the street's half width and his size are as far from H as Y is (HALF0 and 0.5
// at the front, Y0), so he walks in up the middle and shrinks, and can't step past the shops' fronts.
const DORI = (() => {
  const H = 430, Y0 = 12, FAR = 270, HALF0 = 110;
  const scale = (Y) => 0.5 * (H - Y) / (H - Y0);
  const half = (Y) => HALF0 * (H - Y) / (H - Y0);
  const top = (X) => Math.min(FAR, H - Math.abs(X) * (H - Y0) / HALF0);
  // a spot sent to, onto the street: no deeper than its end, no nearer than its front, inside its edge at that depth
  const clamp = ([X, Y]) => { const y = Math.max(Y0, Math.min(FAR, Y)), h = half(y); return [Math.max(-h, Math.min(h, X)), y]; };
  return { H, Y0, FAR, HALF0, scale, half, top, clamp };
})();

function chinadoriHtml() {
  return `<svg class="land tall dori-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice"></svg>
    ${yHeroHtml()}
    <div class="ysel"></div>`;
}
