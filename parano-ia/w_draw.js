// MONDE 3 — le monde dessiné au crayon : papier, traits qui tremblent (stop motion 12 i/s), la maison au toit
// qui coule (clin d'œil à LA SOURCE), une main à 6 doigts (défaut typique des images IA) entourée au crayon rouge,
// et un bras robotique géant qui dessine la route juste devant la mobylette.
'use strict';
const GR = '#34302B';   // graphite
function skPath(parent, pts, o = {}) {   // trait de crayon : deux passages légèrement décalés
  const R = rng(o.seed || (pts.length * 131 + Math.round(pts[0][0] * 7 + pts[0][1] * 3)));
  const out = [];
  for (let pass = 0; pass < (o.passes ?? 2); pass++) {
    const j = o.jit ?? 3;
    const P = pts.map(([x, y]) => [x + (R() - 0.5) * j, y + (R() - 0.5) * j]);
    let d = `M ${r2(P[0][0])} ${r2(P[0][1])}`;
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      const mx = (x0 + x1) / 2 + (R() - 0.5) * j * 1.5, my = (y0 + y1) / 2 + (R() - 0.5) * j * 1.5;
      d += ` Q ${r2(mx)} ${r2(my)} ${r2(x1)} ${r2(y1)}`;
    }
    if (o.closed) d += ' Z';
    out.push(mk('path', { d, fill: pass === 0 && o.fill ? o.fill : 'none', stroke: o.stroke || GR, 'stroke-width': pass ? (o.w || 3) * 0.55 : (o.w || 3), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: pass ? 0.55 : (o.op ?? 0.95) }, parent));
  }
  return out;
}
function skCircle(parent, cx, cy, r, o = {}) {
  const pts = []; const n = Math.max(12, Math.round(r / 5));
  for (let i = 0; i <= n + 1; i++) { const a = i / n * PI2 + (o.a0 || 0); pts.push([cx + Math.cos(a) * r * (1 + (i > n ? 0.04 : 0)), cy + Math.sin(a) * r]); }
  return skPath(parent, pts, o);
}
let HATCH_N = 0;
function hatch(parent, shapeD, box, o = {}) {   // hachures parallèles découpées dans une forme
  const id = 'hatch' + (HATCH_N++);
  const cp = mk('clipPath', { id }, DEFS()); mk('path', { d: shapeD }, cp);
  const hg = g(parent, { 'clip-path': `url(#${id})`, stroke: o.stroke || GR, 'stroke-width': o.w || 1.8, opacity: o.op ?? 0.55, 'stroke-linecap': 'round' });
  const [x, y, w, h] = box, gap = o.gap || 12, a = (o.angle ?? 35) * Math.PI / 180;
  const L = w + h, R = rng(id.length * 97 + x);
  for (let k = -L; k < L; k += gap) {
    const x0 = x + w / 2 + k * Math.cos(a + Math.PI / 2) - Math.cos(a) * L, y0 = y + h / 2 + k * Math.sin(a + Math.PI / 2) - Math.sin(a) * L;
    mk('path', { d: `M ${r2(x0 + (R() - 0.5) * 6)} ${r2(y0)} L ${r2(x0 + Math.cos(a) * 2 * L)} ${r2(y0 + Math.sin(a) * 2 * L + (R() - 0.5) * 6)}` }, hg);
  }
  return hg;
}
function drawDefs() {
  const d = DEFS();
  radGrad(d, 'dwPaper', [[0, '#F7F2E6'], [0.7, '#EFE6D2'], [1, '#DCCFB4']], 0.5, 0.45, 0.75);
  const f = mk('filter', { id: 'paperGrain', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, d);
  markup(f, `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.35 0"/>`);
}

const DRAW = { id: 'draw' };
DRAW.build = function (root, width) {
  drawDefs();
  const D = DRAW; D.width = width;
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#dwPaper)' }, root);
  mk('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#paperGrain)', opacity: 0.6 }, root);
  D.boil = g(root, { filter: 'url(#boilFx)' });   // tout le dessin tremble à 12 i/s
  // ciel : soleil gribouillé, nuages, oiseaux
  D.sky = g(D.boil);
  D.sun = g(D.sky);
  skCircle(D.sun, 0, 0, 90, { w: 4 });
  for (let k = 0; k < 12; k++) { const a = k / 12 * PI2; skPath(D.sun, [[Math.cos(a) * 118, Math.sin(a) * 118], [Math.cos(a) * 170, Math.sin(a) * 170]], { w: 4 }); }
  hatch(D.sun, 'M -90 0 A 90 90 0 1 0 90 0 A 90 90 0 1 0 -90 0 Z', [-90, -90, 180, 180], { gap: 14, angle: 60, op: 0.35 });
  D.clouds = g(D.sky);
  const Rc = rng(8);
  for (let i = 0; i < 7; i++) {
    const cx = -200 + i * 520 + Rc() * 200, cy = 330 + Rc() * 300;
    skPath(D.clouds, [[cx - 140, cy + 30], [cx - 120, cy - 10], [cx - 70, cy - 30], [cx - 40, cy - 70], [cx + 20, cy - 80], [cx + 60, cy - 50], [cx + 110, cy - 50], [cx + 150, cy - 10], [cx + 160, cy + 30], [cx - 140, cy + 30]], { w: 3.5 });
  }
  D.birds = g(D.sky);
  for (let i = 0; i < 6; i++) skPath(D.birds, [[-18 + i * 70, 700 + (i % 3) * 40], [-6 + i * 70, 690 + (i % 3) * 40], [0 + i * 70, 700 + (i % 3) * 40], [6 + i * 70, 690 + (i % 3) * 40], [18 + i * 70, 700 + (i % 3) * 40]], { w: 3 });
  // montagnes au loin (0,15)
  D.far = g(D.boil);
  const Rm = rng(19);
  let x = -900, pts = [[x, 1150]];
  while (x < width * 0.15 + 1800) { x += 120 + Rm() * 160; pts.push([x, 860 + Rm() * 220]); }
  skPath(D.far, pts, { w: 3.5 });
  pts.forEach(([px, py], i) => { if (i % 2 === 0) hatch(D.far, `M ${px - 60} ${py + 200} L ${px} ${py} L ${px + 60} ${py + 200} Z`, [px - 60, py, 120, 200], { gap: 11, angle: 70, op: 0.3 }); });
  // la maison de LA SOURCE, jardin, arbres (0,5)
  D.mid = g(D.boil);
  const house = (hx, hy, s) => {
    const hg = g(D.mid, { transform: `translate(${hx} ${hy}) scale(${s})` });
    skPath(hg, [[-180, 0], [-180, -160], [180, -160], [180, 0]], { w: 4 });
    skPath(hg, [[-230, -150], [0, -420], [230, -150], [-230, -150]], { w: 4.5 });
    hatch(hg, 'M -230 -150 L 0 -420 L 230 -150 Z', [-230, -420, 460, 270], { gap: 10, angle: 25, op: 0.45 });
    skPath(hg, [[-40, 0], [-40, -110], [40, -110], [40, 0]], { w: 3.5 });
    skPath(hg, [[-150, -120], [-80, -120], [-80, -60], [-150, -60], [-150, -120]], { w: 3 });
    skPath(hg, [[80, -120], [150, -120], [150, -60], [80, -60], [80, -120]], { w: 3 });
    // le toit qui « coule » (le défaut de l'IA du reel précédent)
    D.drips.push({ g: g(hg), x0: 120, y0: -210 });
    return hg;
  };
  D.drips = [];
  house(700, 1300, 1.0);
  house(2200, 1300, 0.8);
  const tree = (tx, ty, s) => {
    const tg = g(D.mid, { transform: `translate(${tx} ${ty}) scale(${s})` });
    skPath(tg, [[-14, 0], [-10, -150], [10, -150], [14, 0]], { w: 3.5 });
    const R2 = rng(tx);
    for (let k = 0; k < 9; k++) skCircle(tg, (R2() - 0.5) * 130, -200 - R2() * 120, 40 + R2() * 30, { w: 3, op: 0.8 });
    hatch(tg, 'M -110 -170 Q -130 -330 0 -350 Q 130 -330 110 -170 Z', [-130, -350, 260, 180], { gap: 13, angle: -40, op: 0.3 });
  };
  for (let k = 0; k < 8; k++) tree(-300 + k * 420 + (k % 2) * 90, 1310, 0.9 + (k % 3) * 0.15);
  skPath(D.mid, [[-800, 1310], [width * 0.5 + 1600, 1310]], { w: 3 });
  for (let k = 0; k < 60; k++) skPath(D.mid, [[-600 + k * 60, 1310], [-600 + k * 60, 1260]], { w: 2.5 });   // barrière
  skPath(D.mid, [[-600, 1275], [3000, 1275]], { w: 2.5 });
  // chevalet : main à 6 doigts, entourée au crayon rouge (0,75)
  D.easel = g(D.boil, {});
  const ex = 1250, ey = 1310;
  skPath(D.easel, [[ex - 150, ey], [ex - 60, ey - 520]], { w: 4 }); skPath(D.easel, [[ex + 150, ey], [ex + 60, ey - 520]], { w: 4 }); skPath(D.easel, [[ex, ey - 40], [ex, ey - 560]], { w: 4 });
  skPath(D.easel, [[ex - 190, ey - 520], [ex + 190, ey - 520], [ex + 190, ey - 180], [ex - 190, ey - 180], [ex - 190, ey - 520]], { w: 4.5, fill: '#FBF8F0' });
  const hand = g(D.easel, { transform: `translate(${ex} ${ey - 330}) scale(1.25)` });
  skPath(hand, [[-60, 90], [-66, 10], [-100, -40], [-90, -56], [-56, -20], [-56, -110], [-38, -114], [-30, -30], [-26, -130], [-8, -132], [-4, -34], [4, -122], [22, -120], [20, -30], [30, -104], [48, -100], [42, -24], [58, -80], [74, -74], [62, 10], [56, 90]], { w: 4 });
  hatch(hand, 'M -60 90 L -66 10 L -56 -20 L 62 10 L 56 90 Z', [-70, -30, 140, 120], { gap: 10, angle: 40, op: 0.35 });
  D.redCircle = g(hand);
  skPath(D.redCircle, [[70, -120], [96, -96], [90, -56], [60, -44], [36, -70], [38, -110], [70, -128], [92, -118]], { w: 5, stroke: '#D8322B', op: 0.95 });
  const q = mk('text', { x: 118, y: -120, 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 56, fill: '#D8322B', transform: 'rotate(12 118 -120)' }, D.redCircle); q.textContent = '6 ?';
  // la route dessinée au fur et à mesure (devant la mobylette)
  D.road = g(D.boil);
  const cpId = 'dwRoadClip';
  const cp = mk('clipPath', { id: cpId, clipPathUnits: 'userSpaceOnUse' }, DEFS());
  D.roadClip = mk('rect', { x: -2000, y: 0, width: 3000, height: H }, cp);
  D.roadDrawn = g(D.road, { 'clip-path': `url(#${cpId})` });
  skPath(D.roadDrawn, [[-1400, 1402], [width + 2400, 1402]], { w: 5.5, jit: 5 });
  skPath(D.roadDrawn, [[-1400, 1560], [width + 2400, 1560]], { w: 4, jit: 5 });
  for (let k = -10; k < (width + 2400) / 150; k++) skPath(D.roadDrawn, [[k * 150, 1480], [k * 150 + 70, 1482]], { w: 4 });
  const Rg = rng(66);
  for (let k = 0; k < 70; k++) { const gx = -1200 + k * 70 + Rg() * 40; skPath(D.roadDrawn, [[gx, 1600 + Rg() * 20], [gx + 8, 1570], [gx + 14, 1604], [gx + 22, 1566], [gx + 28, 1602]], { w: 2.5 }); }
  // premier plan : fleurs et cailloux (1,3)
  D.fore = g(D.boil);
  for (let k = 0; k < 14; k++) {
    const fx = -200 + k * 330, fy = 1760 + (k % 3) * 60;
    skCircle(D.fore, fx, fy - 90, 22, { w: 3.5 }); skPath(D.fore, [[fx, fy - 68], [fx + 6, fy]], { w: 3.5 });
    for (let p = 0; p < 6; p++) { const a = p / 6 * PI2; skCircle(D.fore, fx + Math.cos(a) * 36, fy - 90 + Math.sin(a) * 36, 16, { w: 2.5 }); }
    skPath(D.fore, [[fx + 60, fy + 10], [fx + 80, fy - 20], [fx + 130, fy - 26], [fx + 150, fy + 10], [fx + 60, fy + 10]], { w: 3 });
  }
  // bras robotique géant qui tient le crayon (il dessine la route)
  D.arm = g(root);
  D.armSeg = g(D.arm);
  skPath(D.armSeg, [[40, -1500], [0, -320]], { w: 36, passes: 1, stroke: '#4A4540', op: 1 });
  skPath(D.armSeg, [[40, -1500], [0, -320]], { w: 26, passes: 1, stroke: '#CFC8BA', op: 1 });
  skCircle(D.armSeg, 0, -320, 34, { w: 5, fill: '#CFC8BA' });
  D.fore2 = g(D.arm);
  skPath(D.fore2, [[0, 0], [-120, 240]], { w: 30, passes: 1, stroke: '#4A4540', op: 1 });
  skPath(D.fore2, [[0, 0], [-120, 240]], { w: 20, passes: 1, stroke: '#CFC8BA', op: 1 });
  D.pencil = g(D.arm);
  markup(D.pencil, `<g><rect x="-16" y="-260" width="32" height="220" fill="#F2C94C" stroke="${GR}" stroke-width="4"/><rect x="-16" y="-290" width="32" height="34" fill="#E88A8A" stroke="${GR}" stroke-width="4"/>
    <path d="M -16 -40 L 16 -40 L 0 0 Z" fill="#E9D3A8" stroke="${GR}" stroke-width="4"/><path d="M -5 -12 L 5 -12 L 0 0 Z" fill="${GR}"/>
    <path d="M -6 -250 L -6 -50" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="4"/></g>`);
  D.shav = [...Array(8)].map(() => mk('path', { fill: '#E9D3A8', stroke: GR, 'stroke-width': 2 }, root));
};
DRAW.update = function (t, u) {
  const D = DRAW;
  // stop motion : le décor n'avance qu'à 12 i/s
  const uq = Math.floor(u / 1) ;
  const L = (el, f, dx = 0) => attr(el, 'transform', `translate(${r2(-uq * f + dx)} 0)`);
  attr(D.sun, 'transform', `translate(${r2(840 - u * 0.03)} 330) rotate(${r2(Math.floor(t * 12) * 3)})`);
  L(D.clouds, 0.06); L(D.birds, 0.2, 200 + t * 30); L(D.far, 0.15); L(D.mid, 0.5); L(D.easel, 0.75); L(D.road, 1); L(D.fore, 1.3);
  D.drips.forEach((d, i) => {
    const q = (t * 1.2 + i * 0.4) % 1;
    d.g.replaceChildren();
    skPath(d.g, [[d.x0, d.y0], [d.x0 + 6, d.y0 + 60 + q * 120], [d.x0 - 4, d.y0 + 80 + q * 160]], { w: 5, seed: Math.floor(t * 12) + i });
    skCircle(d.g, d.x0 - 2, d.y0 + 100 + q * 170, 12, { w: 4, seed: Math.floor(t * 12) + 5 + i });
  });
  // la route est tracée jusqu'au crayon, qui avance devant la mobylette
  const tipScreen = 840 + Math.sin(t * 5) * 20;
  attr(D.roadClip, 'x', -3000 + uq); attr(D.roadClip, 'width', 3000 + tipScreen);
  const bob = Math.abs(Math.sin(t * 24)) * 14;
  const tipX = tipScreen, tipY = 1402 - bob;
  attr(D.pencil, 'transform', `translate(${r2(tipX)} ${r2(tipY)}) rotate(28)`);
  // le crayon est tenu par un bras qui descend du haut de l'image
  const ex = tipX + 136 + 120, ey = tipY - 256 - 250;
  attr(D.fore2, 'transform', `translate(${r2(ex)} ${r2(ey)}) rotate(${r2(Math.atan2(250, -120) * 180 / Math.PI - Math.atan2(240, -120) * 180 / Math.PI)})`);
  attr(D.armSeg, 'transform', `translate(${r2(ex)} ${r2(ey + 320)})`);
  D.shav.forEach((s, i) => {
    const q = (t * 2 + i / 8) % 1;
    attr(s, 'd', `M ${r2(tipX - 20 - q * 160 - i * 10)} ${r2(1392 + q * q * 120)} l 10 -4 l 6 8 z`);
    attr(s, 'opacity', r2(1 - q));
  });
};
