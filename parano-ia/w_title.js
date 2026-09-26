// LE TITRE — iris qui s'ouvre depuis la loupe, « PARANO-IA » claque en néon vert (glitch), slogan tapé à la machine,
// bouton « S'ABONNER » cliqué (cloche qui sonne, confettis), le robot soulève son chapeau.
'use strict';
const TITLE = {};
TITLE.build = function (root) {
  const T = TITLE;
  T.g = g(root);
  const d = DEFS();
  radGrad(d, 'ttBg', [[0, '#0F2A1E'], [0.6, '#07140F'], [1, '#020605']], 0.5, 0.45, 0.8);
  const cp = mk('clipPath', { id: 'ttIris', clipPathUnits: 'userSpaceOnUse' }, d);
  T.iris = mk('circle', { cx: 540, cy: 960, r: 0 }, cp);
  T.inner = g(T.g, { 'clip-path': 'url(#ttIris)' });
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#ttBg)' }, T.inner);
  T.grid = g(T.inner, { stroke: GREEN, 'stroke-width': 2, opacity: 0.12 });
  for (let k = -10; k < 30; k++) mk('path', { d: `M ${k * 90} 0 L ${k * 90} ${H}` }, T.grid);
  for (let k = 0; k < 24; k++) mk('path', { d: `M 0 ${k * 90} L ${W} ${k * 90}` }, T.grid);
  T.rays = g(T.inner, { fill: GREEN, opacity: 0.06 });
  for (let k = 0; k < 16; k++) mk('path', { d: 'M 0 0 L -60 -1400 L 60 -1400 Z', transform: `rotate(${k * 22.5})` }, T.rays);
  // PARANO-IA
  T.word = g(T.inner);
  T.wA = mk('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 176, fill: '#FFFFFF', 'letter-spacing': -4, filter: 'url(#rgbSplit)' }, T.word);
  T.wA.innerHTML = 'PARANO<tspan fill="#4DFF8F">-IA</tspan>';
  T.glow = mk('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 176, fill: GREEN, 'letter-spacing': -4, opacity: 0.5, filter: 'url(#bloom)' }, T.word);
  T.glow.textContent = 'PARANO-IA';
  T.word.insertBefore(T.glow, T.wA);
  T.tag = mk('text', { x: 540, y: 820, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 500, 'font-size': 44, fill: '#BFFFD9', 'letter-spacing': 4 }, T.inner);
  T.tagFull = "L'IA SOUS ENQUÊTE";
  // bouton s'abonner + cloche
  T.btn = g(T.inner);
  T.btnBg = mk('rect', { x: -250, y: -62, width: 500, height: 124, rx: 62, fill: '#FF2E4D', stroke: '#FFFFFF', 'stroke-width': 6 }, T.btn);
  T.btnTx = mk('text', { x: 36, y: 20, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 56, fill: '#FFFFFF' }, T.btn);
  T.bell = g(T.btn, { transform: 'translate(-170 0)' });
  markup(T.bell, `<path d="M -26 18 Q -26 -34 0 -36 Q 26 -34 26 18 L 34 26 L -34 26 Z" fill="#FFFFFF"/><circle cx="0" cy="32" r="8" fill="#FFFFFF"/><rect x="-5" y="-46" width="10" height="12" rx="4" fill="#FFFFFF"/>`);
  T.cursor = g(T.inner);
  markup(T.cursor, `<path d="M 0 0 L 0 76 L 20 58 L 34 90 L 48 84 L 34 52 L 60 52 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`);
  T.conf = [...Array(30)].map((_, i) => mk('rect', { x: -8, y: -4, width: 16, height: 8, rx: 3, fill: ['#4DFF8F', '#FFFFFF', '#FF2E4D', '#FFE14D', '#7FE3FF'][i % 5] }, T.inner));
  T.rob = makeRobot(T.inner);
  vis(T.g, false);
};
TITLE.update = function (t) {
  const T = TITLE, t0 = T_TITLE;
  const on = t >= t0 - BEAT / 2;
  vis(T.g, on); if (!on) return;
  // iris depuis la loupe du détective (dans l'alignement), puis plein écran
  const ir = E.in(seg(t, t0 - BEAT / 2, t0));
  attr(T.iris, 'cx', r2(lerp(250 + 30 * 1.35, 540, ir))); attr(T.iris, 'cy', r2(lerp(1420 - 96 * 1.35, 960, ir)));
  attr(T.iris, 'r', r2(lerp(40, 1300, ir)));
  attr(T.rays, 'transform', `translate(540 760) rotate(${r2(t * 12)})`);
  // PARANO-IA claque sur le temps fort
  const p = seg(t, t0, t0 + 0.18), s = lerp(2.2, 1, E.out(p)), sh = Math.max(0, 1 - (t - t0) / 0.4);
  const jx = (noise1(t * 50, 3) * 18) * sh, jy = (noise1(t * 50, 4) * 12) * sh;
  attr(T.word, 'transform', `translate(${r2(540 + jx)} ${r2(660 + jy)}) scale(${r2(s)})`);
  attr(T.word, 'opacity', r2(clamp(p * 4)));
  const gl = Math.max(0, 1 - (t - t0) / 0.35) * 14 + (((t * 3) % 1) < 0.06 ? 10 : 0);
  attr($('rgbR'), 'dx', r2(-gl)); attr($('rgbB'), 'dx', r2(gl));
  // slogan tapé
  const n = Math.floor(clamp((t - (t0 + BEAT)) / 0.5) * T.tagFull.length);
  T.tag.textContent = T.tagFull.slice(0, n) + (n < T.tagFull.length && (t * 4) % 1 < 0.5 ? '▌' : '');
  // bouton qui surgit, clic, « ABONNÉ ✓ »
  const tb = t0 + 2 * BEAT, tc = t0 + 3 * BEAT;
  const bp = E.back(seg(t, tb, tb + 0.25)), clicked = t >= tc;
  const press = clicked ? 1 - 0.1 * pulse(t, tc, 0.18) : 1;
  attr(T.btn, 'transform', `translate(540 ${r2(1040)}) scale(${r2(bp * press)})`);
  attr(T.btnBg, 'fill', clicked ? '#2A2F3A' : '#FF2E4D');
  T.btnTx.textContent = clicked ? 'ABONNÉ ✓' : "S'ABONNER";
  attr(T.bell, 'transform', `translate(-170 0) rotate(${r2(clicked ? Math.sin((t - tc) * 30) * 22 * Math.max(0, 1 - (t - tc) / 0.8) : 0)})`);
  const cu = E.soft(seg(t, tb + 0.1, tc - 0.02));
  attr(T.cursor, 'transform', `translate(${r2(lerp(980, 640, cu))} ${r2(lerp(1500, 1060, cu))}) scale(${r2(clicked ? 1 - 0.15 * pulse(t, tc, 0.2) : 1)})`);
  vis(T.cursor, t > tb + 0.05);
  T.conf.forEach((c, i) => {
    const dd = t - tc, on2 = dd > 0 && dd < 1.4;
    vis(c, on2); if (!on2) return;
    const a = -Math.PI / 2 + (hash(i) - 0.5) * 2.6, v = 900 + hash(i * 3) * 700;
    attr(c, 'transform', `translate(${r2(540 + Math.cos(a) * v * dd)} ${r2(1040 + Math.sin(a) * v * dd + 1400 * dd * dd)}) rotate(${r2(dd * 720 * (hash(i) - 0.5))})`);
  });
  // le robot, en bas, soulève son chapeau au clic
  const rp = E.out(seg(t, t0 + 0.1, t0 + 0.45));
  const hat = clicked ? Math.sin(clamp((t - tc) / 0.7) * Math.PI) : 0;
  poseRobot(T.rob, { x: 540, y: lerp(2200, 1480, rp), s: 1.05, face: clicked ? 'satisfait' : 'curieux', blink: blinkAt(t), look: [0, -6], arms: hat > 0.05 ? ARMS.hat : ARMS.down, hatLift: hat, armLayer: { R: 'top' } });
};
