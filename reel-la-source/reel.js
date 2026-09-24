/* LA SOURCE — reel Instagram 1080×1920 · 30 fps · 159 s
   Moteur d'animation par keyframes, déterministe : renderFrame(i) dessine l'image i
   sans dépendre des images précédentes (rendu parallélisable). */
(function () {
'use strict';

const W = 1080, H = 1920, FPS = 30, DURATION = 159;
const NS = 'http://www.w3.org/2000/svg';
const GREEN = '#4DFF8F', INK = '#1B1620';
const PI2 = Math.PI * 2, DEG = Math.PI / 180;
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, q) => a + (b - a) * q;
const r3 = n => Math.round(n * 1000) / 1000;
const softclamp = (v, m) => m * Math.tanh(v / m);

function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function g(parent, attrs) { return mk('g', attrs, parent); }
function markup(parent, str) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${str}</svg>`, 'image/svg+xml');
  const out = [];
  for (const n of Array.from(doc.documentElement.childNodes)) {
    if (n.nodeType !== 1) continue;
    const m = document.importNode(n, true);
    parent.appendChild(m); out.push(m);
  }
  return out;
}
function vis(el, on) { const d = on ? '' : 'none'; if (el.style.display !== d) el.style.display = d; }
function attr(el, k, v) { el.setAttribute(k, typeof v === 'number' ? r3(v) : v); }

/* ================= EASINGS (brief) ================= */
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return p => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - p; if (Math.abs(e) < 1e-7) return Y(t);
      const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d;
    }
    let lo = 0, hi = 1; t = p;
    for (let i = 0; i < 40; i++) { const x = X(t); if (Math.abs(x - p) < 1e-7) break; if (x < p) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
const E = {
  pop: cubicBezier(0.34, 1.56, 0.64, 1),
  soft: cubicBezier(0.22, 1, 0.36, 1),
  antic: cubicBezier(0.36, 0, 0.66, -0.56),
  chute: cubicBezier(0.55, 0, 1, 0.45),
  io: cubicBezier(0.45, 0, 0.55, 1),
  lin: p => p, qout: p => 1 - (1 - p) * (1 - p), qin: p => p * p,
  step: p => (p < 1 ? 0 : 1),
};

/* ================= KEYFRAME TRACKS ================= */
function mix(a, b, q) {
  if (typeof a === 'number') return a + (b - a) * q;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * q);
  return q < 1 ? a : b;
}
class Track {
  constructor(v0) { this.k = [{ t: -1e9, v: v0, e: 'step' }]; this.segs = []; this.dirty = false; }
  key(t, v, e = 'soft') { this.k.push({ t, v, e }); this.dirty = true; return this; }
  seg(t0, t1, fn) { this.segs.push({ t0, t1, fn }); return this; }
  at(t) {
    const S = this.segs;
    for (let i = 0; i < S.length; i++) { const s = S[i]; if (t >= s.t0 && t < s.t1) return s.fn(t); }
    if (this.dirty) { this.k.sort((a, b) => a.t - b.t); this.dirty = false; }
    const k = this.k; let lo = 0, hi = k.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (k[m].t <= t) lo = m; else hi = m - 1; }
    const a = k[lo], b = k[lo + 1];
    if (!b) return a.v;
    return mix(a.v, b.v, E[b.e]((t - a.t) / (b.t - a.t)));
  }
}

/* ================= RNG À GRAINE FIXE ================= */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n) {
  let x = (n | 0) ^ 0x9E3779B9;
  x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B); x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/* ================= CONSTANTES DE MISE EN SCÈNE ================= */
const S0 = 0.92;                 // robot ≈ 24 % de la largeur (≈ 245 px)
const FLOOR = 1595, BLX = 190;   // "bas à gauche", sous le cadre
const CFLOOR = 1250;             // sol quand il est au centre (scène 4)
const CU = { x: 540, y: 2194.4, s: 5.517 }; // gros plan = planche ModeEcran (écran à x60 y440 960×640)
const VID = { x: 0, y: 420, w: 1080, h: 720 };   // cadre vidéo 3:2, moitié haute

/* bras : [épaule x,y, contrôle x,y, main x,y] — mêmes courbes que la planche */
const PR = {
  down: [62, 40, 90, 72, 96, 108],
  examine: [58, 38, 118, 0, 78, -56],
  scratch: [58, 38, 142, -40, 104, -150],
  shrug: [58, 38, 106, 42, 124, 4],
  snapReady: [58, 38, 128, 26, 136, -52],
  snap: [58, 38, 136, 14, 150, -64],
  onLoupe: [58, 38, 132, -10, 112, -84],
  raiseLoupe: [58, 38, 170, -40, 168, -178],
  reach: [58, 38, 110, 50, 150, 10],
  pull: [60, 38, 124, 44, 176, 16],
  reachR: [58, 38, 112, 60, 150, 40],
  balance: [58, 38, 128, -10, 146, -78],
};
const mirror = p => [-p[0], p[1], -p[2], p[3], -p[4], p[5]];
const PL = {};
for (const k in PR) PL[k] = mirror(PR[k]);
Object.assign(PL, {
  hang: [-58, 38, -175, -80, -140, -270],   // bras étiré qui contourne la tête : il pend SOUS le coin
  hatfix: [-58, 38, -150, -40, -128, -160],
  reachUp: [-58, 38, -130, 20, -150, -50],
  touchLow: [-62, 40, -120, 70, -140, 112],
  point: [-58, 38, -130, -20, -150, -100],
});
function handOf(p) {
  const dx = p[4] - p[2], dy = p[5] - p[3], L = Math.hypot(dx, dy) || 1;
  return [p[4] + 12 * dx / L, p[5] + 12 * dy / L];
}

/* ================= TIMELINE : pistes du robot ================= */
const DEF = {
  x: CU.x, y: CU.y, s: CU.s, rot: 0, sx: 1, sy: 1, float: 0, sit: 0,
  hr: 0, hdx: 0, hdy: 0, gx: 0, gy: 0,
  armR: PR.down, armL: PL.down, handR: 1, handL: 1,
  loupe: [0, 0, 0, 1], loupeUp: 1, eR: 1, lid: 1, rOpen: 0,
  hatTilt: 0, hatLift: 0, faceOn: 0, speed: 1, groundY: FLOOR, qmark: 0, phys: 0,
};
const TR = {};
const T = n => TR[n] || (TR[n] = new Track(DEF[n]));
const set = (n, t, v) => T(n).key(t, v, 'step');
function to(n, t0, t1, v, e = 'soft') { const tr = T(n); tr.key(t0, tr.at(t0), 'soft'); tr.key(t1, v, e); }
function eto(tr, t0, t1, v, e = 'soft') { tr.key(t0, tr.at(t0), 'soft'); tr.key(t1, v, e); }
const arm = (side, t0, t1, pose, e = 'soft') => to('arm' + side, t0, t1, (side === 'R' ? PR : PL)[pose], e);
function sqk(t, sy, e) { T('sy').key(t, sy, e); T('sx').key(t, 1 + (1 - sy) * 0.85, e); }

const HS = [];                 // hit-stops [t, durée]
const hitstop = (t, d) => HS.push([t, d]);
const SPARKS = [];
const FACE_BASE = [], FACE_OVR = [];
const face = (t, n) => FACE_BASE.push([t, n]);
const faceOver = (t0, t1, n) => FACE_OVR.push([t0, t1, n]);

/* ----- gestes de base ----- */
function crouch(t0, t1, d = 0.84) {
  to('sy', t0, t1, d, 'antic'); to('sx', t0, t1, 1 + (1 - d) * 0.85, 'antic');
}
function jump(t0, dur, x1, y1, apex, o = {}) {
  const X = T('x'), Y = T('y');
  const x0 = X.at(t0), y0 = Y.at(t0);
  const top = Math.min(y0, y1) - apex;
  const H1 = y0 - top, H2 = y1 - top;
  const r1 = Math.sqrt(Math.max(H1, 0)), r2 = Math.sqrt(Math.max(H2, 0));
  const t1 = (r1 + r2) > 0 ? dur * r1 / (r1 + r2) : dur / 2;   // montée/descente d'une vraie parabole
  X.key(t0, x0, 'step'); Y.key(t0, y0, 'step');
  X.seg(t0, t0 + dur, t => lerp(x0, x1, (t - t0) / dur));
  Y.seg(t0, t0 + dur, t => {
    const u = t - t0;
    if (u < t1) { const p = u / t1; return y0 - H1 * (1 - (1 - p) * (1 - p)); }
    const p = (u - t1) / Math.max(1e-6, dur - t1); return top + H2 * p * p;
  });
  X.key(t0 + dur, x1, 'step'); Y.key(t0 + dur, y1, 'step');
  const st = o.stretch ?? 1.16, sq = o.squash ?? 0.72;
  sqk(t0, T('sy').at(t0), 'soft');
  sqk(t0 + 0.07, st, 'soft');
  if (t1 > 0.14 && t1 < dur - 0.1) sqk(t0 + t1, 1, 'soft');
  if (dur > 0.2) sqk(t0 + dur - 0.04, 1.05, 'soft');
  sqk(t0 + dur, sq, 'lin');
  if (o.settle === false) return;
  sqk(t0 + dur + 0.12, 1 + (1 - sq) * 0.25, 'soft');
  sqk(t0 + dur + 0.3, 1, 'pop');
}
function hop(t0, x1, dur = 0.3, apex = 34) {
  crouch(t0 - 0.08, t0, 0.92);
  jump(t0, dur, x1, T('y').at(t0), apex, { stretch: 1.07, squash: 0.88 });
}
function hops(t0, x1, n, dur = 0.3, apex = 30) {
  const x0 = T('x').at(t0);
  for (let i = 1; i <= n; i++) hop(t0 + (i - 1) * (dur + 0.12), lerp(x0, x1, i / n), dur, apex);
  return t0 + n * (dur + 0.12) - 0.12;
}
function nod(t) {
  to('hdy', t, t + 0.16, 7, 'soft'); to('hdy', t + 0.16, t + 0.42, 0, 'pop');
}

/* ================= ÉLÉMENTS (cadres, objets…) ================= */
const ELS = [];
class El {
  constructor(node, cx, cy, init = {}) {
    this.node = node; this.cx = cx; this.cy = cy;
    this.tx = new Track(init.tx ?? 0); this.ty = new Track(init.ty ?? 0);
    this.r = new Track(init.r ?? 0); this.s = new Track(init.s ?? 1); this.o = new Track(init.o ?? 1);
    this.top = init.top ?? cy - 400;
    this.hook = null; ELS.push(this);
  }
  apply(t) {
    const s = this.s.at(t), o = this.o.at(t);
    if (s <= 0.0005 || o <= 0.002) { vis(this.node, false); return; }
    const tx = this.tx.at(t), ty = this.ty.at(t), r = this.r.at(t);
    if (this.top + ty > H + 20) { vis(this.node, false); return; }
    vis(this.node, true);
    attr(this.node, 'transform', `translate(${r3(this.cx + tx)} ${r3(this.cy + ty)}) rotate(${r3(r)}) scale(${r3(s)}) translate(${-this.cx} ${-this.cy})`);
    attr(this.node, 'opacity', o);
    if (this.hook) this.hook(t);
  }
  pointAt(t, lx, ly) {
    const tx = this.tx.at(t), ty = this.ty.at(t), r = this.r.at(t) * DEG, s = this.s.at(t);
    const dx = (lx - this.cx) * s, dy = (ly - this.cy) * s, c = Math.cos(r), sn = Math.sin(r);
    return [this.cx + tx + dx * c - dy * sn, this.cy + ty + dx * sn + dy * c];
  }
}

const fallDist = e => Math.max(1500, H + 40 - e.top);

function claque(t, els, o = {}) {
  arm('R', t - 0.25, t - 0.03, 'snapReady', 'soft');
  to('handR', t - 0.25, t - 0.05, 0.78, 'soft');
  to('rot', t - 0.25, t - 0.03, o.lean ?? -3, 'soft');
  arm('R', t, t + 0.07, 'snap', 'soft');
  to('handR', t, t + 0.05, 1.25, 'soft'); to('handR', t + 0.05, t + 0.22, 1, 'pop');
  to('rot', t + 0.02, t + 0.3, o.rotAfter ?? 0, 'pop');
  SPARKS.push(t); hitstop(t, 0.08);
  for (const e of els) {
    if (o.noPop) continue;
    e.s.key(t + 0.05, 0, 'step'); e.s.key(t + 0.3, 1.08, 'pop'); e.s.key(t + 0.45, 1, 'soft');
    e.r.key(t + 0.05, -3, 'step'); e.r.key(t + 0.3, 0, 'soft');
    e.tx.key(t + 0.05, 0, 'step'); e.ty.key(t + 0.05, 0, 'step');
  }
  arm('R', t + 0.3, t + 0.65, o.armAfter ?? 'down', 'soft');
  if (o.sat !== false) faceOver(t + 0.3, t + 0.8, 'satisfait');
}

/* o.fast : version resserrée quand un [CLAQUE] suit 0.6 s plus tard (le robot doit être
   revenu sous le cadre avant que le nouveau cadre ne s'ouvre). */
function ecrase(t, el, others, landX, topY, dest, o = {}) {
  const fast = !!o.fast, jd = fast ? 0.32 : 0.4;
  crouch(t - 0.3, t, 0.8);
  jump(t, jd, landX, topY, 14, { squash: 0.64, settle: false });
  const tland = t + jd;
  hitstop(tland, 0.12);
  const ty0 = el.ty.at(tland - 0.01);
  eto(el.ty, tland, tland + 0.08, ty0 + 20, 'soft');
  to('y', tland, tland + 0.08, topY + 20, 'soft');
  sqk(tland + 0.09, 0.86, 'soft');
  const tf = fast ? tland + 0.1 : t + 0.55;
  [el, ...others].forEach((e, i) => {
    const st = i * (o.stagger ?? 0.06);
    const b = e.ty.at(tf + st - 1e-4);
    e.ty.key(tf + st, b, 'step'); e.ty.key(tf + st + 0.45, b + fallDist(e), 'chute');
  });
  let tre = tf + 0.02;
  const rideEnd = fast ? tf + 0.12 : tf + 0.44;
  while (el.ty.at(tre) - (ty0 + 20) < 150 && tre < rideEnd) tre += 0.004;
  const Y = T('y');
  Y.key(tf, topY + 20, 'step');
  Y.seg(tf, tre, tt => topY + 20 + (el.ty.at(tt) - (ty0 + 20)));
  Y.key(tre, topY + 20 + (el.ty.at(tre) - (ty0 + 20)), 'step');
  const tl = fast ? tre + 0.3 : t + 1.1;
  jump(tre, tl - tre, dest[0], dest[1], o.apex ?? (fast ? 70 : 110), { stretch: 1.18, squash: 0.7 });
  set('groundY', tl - 0.08, dest[1]);
  return tl;
}

/* ================= DÉCOR : nuit de film noir =================
   Ciel bleu nuit → sarcelle, lune verte (rappel de l'accent #4DFF8F), lumière de store
   vénitien, skyline aux fenêtres ambrées, poussières en suspension. Aucune teinte
   violette ou rose : le fond reste sûr pour l'incrustation chromatique du magenta. */
const DECOR = { stars: [], flick: [], dust: [], blinds: null };
function buildDecor() {
  const D = $('L-decor'); const R = rng(2026);
  mk('circle', { cx: 900, cy: 150, r: 330, fill: 'url(#moonHalo)' }, D);
  mk('circle', { cx: 900, cy: 150, r: 78, fill: 'url(#moonDisc)' }, D);
  const cr = g(D, { fill: '#9FE6C0', opacity: 0.55 });
  [[872, 128, 15], [921, 176, 9], [930, 116, 6], [880, 186, 5]].forEach(c => mk('circle', { cx: c[0], cy: c[1], r: c[2] }, cr));

  const st = g(D, { fill: '#E4F7FF' });
  for (let i = 0; i < 80; i++) {
    const x = R() * 1080, y = 30 + R() * 1180;
    if (Math.hypot(x - 900, y - 150) < 150) continue;
    DECOR.stars.push({ el: mk('circle', { cx: r3(x), cy: r3(y), r: r3(0.8 + R() * 1.7) }, st), base: 0.2 + R() * 0.5, ph: R() * PI2, sp: 0.5 + R() * 1.5 });
  }

  const bl = g(D, { opacity: 0.075 }); DECOR.blinds = bl;
  const bi = g(bl, { transform: 'rotate(-28 1080 0)' });
  for (let k = 0; k < 10; k++) mk('rect', { x: -300, y: 60 + k * 78, width: 1900, height: 34, fill: 'url(#blindGrad)' }, bi);

  mk('rect', { x: 0, y: 700, width: 1080, height: 1220, fill: 'url(#cityGlow)' }, D);

  const WIN = [['#F2C46B', 0.86], ['#F2C46B', 0.86], ['#F2C46B', 0.86], ['#FFD98C', 0.9], ['#8FE3FF', 0.96], ['#4DFF8F', 1]];
  const pickWin = () => { const r = R(); for (const [c, p] of WIN) if (r < p) return c; return '#F2C46B'; };
  const skyline = (layer, fill, topMin, topMax, wMin, wMax, win) => {
    const lg = g(D); let x = -20; let id = 0;
    while (x < 1100) {
      const w = wMin + R() * (wMax - wMin), top = topMin + R() * (topMax - topMin);
      mk('rect', { x: r3(x), y: r3(top), width: r3(w), height: r3(1920 - top), fill }, lg);
      const roof = R();
      if (roof < 0.22) mk('rect', { x: r3(x + w * 0.3), y: r3(top - 26), width: r3(w * 0.4), height: 26, fill }, lg);
      else if (roof < 0.34) { mk('path', { d: `M ${r3(x + w / 2)} ${r3(top - 60)} V ${r3(top)}`, stroke: fill, 'stroke-width': 4 }, lg); mk('circle', { cx: r3(x + w / 2), cy: r3(top - 62), r: 3.5, fill: '#FF6B5A', opacity: 0.8 }, lg); }
      else if (roof < 0.44 && w > 90) {
        const cx = x + w * 0.65;
        mk('path', { d: `M ${r3(cx - 16)} ${r3(top)} L ${r3(cx - 12)} ${r3(top - 20)} M ${r3(cx + 16)} ${r3(top)} L ${r3(cx + 12)} ${r3(top - 20)}`, stroke: fill, 'stroke-width': 4 }, lg);
        mk('path', { d: `M ${r3(cx - 18)} ${r3(top - 20)} h 36 v -30 q -18 -12 -36 0 z`, fill }, lg);
      }
      const cw = win.w, ch = win.h, gx = win.gx, gy = win.gy;
      const cols = Math.max(1, Math.floor((w - 16) / gx)), x0 = x + (w - cols * gx) / 2 + (gx - cw) / 2;
      for (let yy = top + 18; yy < 1880; yy += gy) for (let c = 0; c < cols; c++) {
        if (R() > win.p) continue;
        const color = pickWin(), op = win.op[0] + R() * (win.op[1] - win.op[0]);
        const el = mk('rect', { x: r3(x0 + c * gx), y: r3(yy), width: cw, height: ch, rx: 1.5, fill: color, opacity: r3(op) }, lg);
        if (R() < 0.12) DECOR.flick.push({ el, op, id: layer * 10000 + id });
        id++;
      }
      x += w + (R() < 0.3 ? 6 + R() * 18 : 0);
    }
  };
  skyline(1, '#12263C', 1290, 1470, 55, 140, { w: 7, h: 10, gx: 16, gy: 22, p: 0.2, op: [0.22, 0.45] });
  skyline(2, '#0A1522', 1450, 1600, 90, 175, { w: 9, h: 13, gx: 21, gy: 27, p: 0.24, op: [0.45, 0.8] });
  mk('rect', { x: 0, y: 1560, width: 1080, height: 360, fill: 'url(#streetFade)' }, D);

  const du = g(D);
  for (let i = 0; i < 28; i++) {
    DECOR.dust.push({ el: mk('circle', { r: r3(2.5 + R() * 6), fill: 'url(#dustGrad)' }, du), x: R() * 1080, y: R() * 1920, vx: -6 + R() * 12, vy: -10 - R() * 14, op: 0.08 + R() * 0.16, ph: R() * PI2 });
  }
}
function renderDecor(ta) {
  for (const s of DECOR.stars) attr(s.el, 'opacity', s.base * (0.65 + 0.35 * Math.sin(ta * s.sp + s.ph)));
  const k = Math.floor(ta / 2.2);
  for (const w of DECOR.flick) attr(w.el, 'opacity', hash(w.id * 31 + k) < 0.3 ? w.op * 0.15 : w.op);
  attr(DECOR.blinds, 'transform', `translate(${r3(10 * Math.sin(ta * 0.21))} ${r3(14 * Math.sin(ta * 0.13))})`);
  for (const d of DECOR.dust) {
    const x = ((d.x + d.vx * ta + 12 * Math.sin(ta * 0.5 + d.ph)) % 1120 + 1120) % 1120 - 20;
    const y = ((d.y + d.vy * ta) % 1960 + 1960) % 1960 - 20;
    attr(d.el, 'cx', x); attr(d.el, 'cy', y); attr(d.el, 'opacity', d.op * (0.6 + 0.4 * Math.sin(ta * 0.7 + d.ph)));
  }
}

/* ================= DÉCOR ET PLACEHOLDERS ================= */
let VIDEO, POL2, POL5, CARD5, GLOBE, ICONS = [], TREE, HOUSE, STONE, SOURCE_TXT, BUBBLE;
const WIG = {};

function buildWorld() {
  const Lw = $('L-world'), Lf = $('L-front'), Lb = $('L-back');

  // cadre vidéo 1080×720, uni, contour vert 2 px, aucun contenu
  const vg = g(Lw);
  mk('rect', { x: VID.x + 1, y: VID.y + 1, width: VID.w - 2, height: VID.h - 2, rx: 28, fill: '#141414', stroke: GREEN, 'stroke-width': 2 }, vg);
  VIDEO = new El(vg, 540, VID.y + VID.h / 2, { s: 0, top: VID.y });

  // polaroid scène 2 : 600×720
  const pg = g(Lw);
  mk('rect', { x: 241, y: 421, width: 598, height: 718, rx: 18, fill: '#141414', stroke: GREEN, 'stroke-width': 2 }, pg);
  mk('rect', { x: 276, y: 456, width: 528, height: 528, rx: 6, fill: '#101012', stroke: '#26262C', 'stroke-width': 2 }, pg);
  POL2 = new El(pg, 540, 780, { tx: 1100, ty: 428.3, r: 20, top: 420 });

  // scène 5 : polaroid vide + carte titre
  const p5 = g(Lw);
  mk('rect', { x: 71, y: 331, width: 418, height: 502, rx: 16, fill: '#141414', stroke: GREEN, 'stroke-width': 2 }, p5);
  mk('rect', { x: 96, y: 356, width: 368, height: 368, rx: 6, fill: '#101012', stroke: '#26262C', 'stroke-width': 2 }, p5);
  POL5 = new El(p5, 280, 582, { ty: -1100, top: 330 });

  const c5 = g(Lw);
  mk('rect', { x: 531, y: 401, width: 468, height: 278, rx: 18, fill: '#141414', stroke: GREEN, 'stroke-width': 2 }, c5);
  const t1 = mk('text', { x: 765, y: 532, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 58, fill: '#F2F3F5', 'letter-spacing': 1 }, c5);
  t1.textContent = 'YANN LeCUN';
  mk('rect', { x: 705, y: 562, width: 120, height: 3, rx: 1.5, fill: GREEN, opacity: 0.8 }, c5);
  const t2 = mk('text', { x: 765, y: 614, 'text-anchor': 'middle', 'font-family': 'IBM Plex Mono', 'font-weight': 500, 'font-size': 30, fill: GREEN, 'letter-spacing': 4 }, c5);
  t2.textContent = 'PRIX TURING';
  CARD5 = new El(c5, 765, 540, { ty: -1100, r: -6, top: 400 });

  // globe filaire (world models)
  const gl = g(Lw, { filter: 'url(#glow)', fill: 'none', stroke: GREEN, 'stroke-width': 3, 'stroke-linecap': 'round' });
  const GC = [765, 935], GR = 150;
  const gp = {
    outer: mk('circle', { cx: GC[0], cy: GC[1], r: GR, pathLength: 1 }, gl),
    eq: mk('ellipse', { cx: GC[0], cy: GC[1], rx: GR, ry: GR * 0.3, pathLength: 1 }, gl),
    la1: mk('ellipse', { cx: GC[0], cy: GC[1] - GR * 0.5, rx: GR * 0.866, ry: GR * 0.26, pathLength: 1 }, gl),
    la2: mk('ellipse', { cx: GC[0], cy: GC[1] + GR * 0.5, rx: GR * 0.866, ry: GR * 0.26, pathLength: 1 }, gl),
    m: [0, 1, 2].map(() => mk('ellipse', { cx: GC[0], cy: GC[1], rx: GR, ry: GR, pathLength: 1 }, gl)),
  };
  GLOBE = new El(gl, GC[0], GC[1], { s: 0, top: GC[1] - GR - 4 });
  GLOBE.t0 = 113.45;
  GLOBE.hook = t => {
    const draw = (el, a, b) => { const p = E.soft(clamp((t - a) / (b - a))); attr(el, 'stroke-dasharray', '1 1'); attr(el, 'stroke-dashoffset', 1 - p); vis(el, p > 0.001); };
    const t0 = GLOBE.t0;
    draw(gp.outer, t0, t0 + 0.6); draw(gp.eq, t0 + 0.2, t0 + 0.75); draw(gp.la1, t0 + 0.35, t0 + 0.9); draw(gp.la2, t0 + 0.45, t0 + 1.0);
    const phase = t > t0 + 1.4 ? (t - t0 - 1.4) * 0.55 : 0;
    gp.m.forEach((m, i) => { attr(m, 'rx', Math.abs(Math.sin(phase + i * Math.PI / 3 + 0.35)) * GR + 0.5); draw(m, t0 + 0.55 + i * 0.12, t0 + 1.25 + i * 0.12); });
  };

  // icônes scène 3 (près des mots bois / eau / fumée)
  const ICON_ART = [
    `<g transform="rotate(-10)"><rect x="-62" y="-20" width="124" height="40" rx="8" fill="#C8A97E" stroke="${INK}" stroke-width="6"/>
      <path d="M -46 -6 Q -10 -12 30 -5 M -38 8 Q 2 2 44 9" fill="none" stroke="#8C6A45" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-50" cy="0" r="4" fill="#5E4330"/><circle cx="50" cy="0" r="4" fill="#5E4330"/></g>`,
    `<path d="M 0 -50 C 18 -24 36 -4 36 16 C 36 38 20 52 0 52 C -20 52 -36 38 -36 16 C -36 -4 -18 -24 0 -50 Z" fill="#8FDCFF" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M -18 14 Q -18 30 -4 38" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    `<path d="M -26 44 C -48 14 -8 4 -18 -18 C -28 -40 2 -54 16 -40" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/>
      <path d="M 14 46 C 34 26 10 14 22 -2 C 32 -16 48 -10 44 2" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
      <path d="M -26 44 C -48 14 -8 4 -18 -18 C -28 -40 2 -54 16 -40" fill="none" stroke="#C9D1D9" stroke-width="10" stroke-linecap="round"/>
      <path d="M 14 46 C 34 26 10 14 22 -2 C 32 -16 48 -10 44 2" fill="none" stroke="#A9B3BE" stroke-width="7" stroke-linecap="round"/>`,
  ];
  const SLOTS = [[470, 1206], [652, 1206], [834, 1206]];
  ICONS = ICON_ART.map((a, i) => {
    const ig = g(Lw); const inner = g(ig, { transform: `translate(${SLOTS[i][0]} ${SLOTS[i][1]})` });
    markup(inner, a);
    return new El(ig, SLOTS[i][0], SLOTS[i][1], { s: 0, top: SLOTS[i][1] - 60 });
  });

  // scène 4 : arbre, maison, caillou (dessins simples)
  const tg = g(Lw); mk('ellipse', { cx: 150, cy: 1253, rx: 96, ry: 13, fill: '#000000', 'fill-opacity': 0.45 }, tg); const tw = g(tg); WIG.tree = { g: tw, px: 150, py: 1250, t0: 1e9, seed: 11 };
  markup(tw, `
    <path d="M 134 1250 L 139 1092 Q 150 1074 161 1092 L 166 1250 Z" fill="#6B4A33" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M 150 1160 L 112 1118" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M 150 1160 L 112 1118" stroke="#6B4A33" stroke-width="8" stroke-linecap="round"/>
    <g fill="${INK}"><circle cx="150" cy="985" r="106"/><circle cx="86" cy="1046" r="72"/><circle cx="214" cy="1046" r="72"/><circle cx="150" cy="1070" r="62"/></g>
    <g fill="#2F7A4E"><circle cx="150" cy="985" r="100"/><circle cx="86" cy="1046" r="66"/><circle cx="214" cy="1046" r="66"/><circle cx="150" cy="1070" r="56"/></g>
    <g fill="#3E9B63"><circle cx="126" cy="958" r="46"/><circle cx="72" cy="1030" r="30"/><circle cx="196" cy="1024" r="28"/></g>
    <path d="M 98 940 Q 110 910 140 900" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="6" stroke-linecap="round"/>`);
  TREE = new El(tg, 150, 1060, { s: 0, top: 876 });

  const hg = g(Lw); mk('ellipse', { cx: 900, cy: 1253, rx: 128, ry: 14, fill: '#000000', 'fill-opacity': 0.45 }, hg); const hw = g(hg); WIG.house = { g: hw, px: 900, py: 1250, t0: 1e9, seed: 23 };
  markup(hw, `
    <rect x="950" y="1012" width="28" height="56" fill="#8C6A45" stroke="${INK}" stroke-width="5"/>
    <rect x="805" y="1098" width="190" height="152" fill="#D8BD93" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M 782 1110 L 900 996 L 1018 1110 Z" fill="#5E4330" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M 812 1094 L 900 1010" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round"/>
    <rect x="880" y="1178" width="40" height="72" rx="6" fill="#4A3526" stroke="${INK}" stroke-width="5"/>
    <circle cx="912" cy="1216" r="3.5" fill="#D4A64A"/>
    <rect x="826" y="1134" width="40" height="36" rx="4" fill="#D4A64A" stroke="${INK}" stroke-width="5"/>
    <rect x="934" y="1134" width="40" height="36" rx="4" fill="#D4A64A" stroke="${INK}" stroke-width="5"/>
    <path d="M 846 1134 V 1170 M 826 1152 H 866 M 954 1134 V 1170 M 934 1152 H 974" stroke="${INK}" stroke-width="3"/>`);
  HOUSE = new El(hg, 900, 1125, { s: 0, top: 993 });

  const sg = g(Lf); mk('ellipse', { cx: 360, cy: 1302, rx: 66, ry: 10, fill: '#000000', 'fill-opacity': 0.45 }, sg); const sw = g(sg); WIG.stone = { g: sw, px: 358, py: 1300, t0: 1e9, seed: 37 };
  markup(sw, `
    <path d="M 302 1300 Q 296 1250 334 1230 Q 372 1214 404 1238 Q 428 1262 418 1300 Z" fill="#8E97A3" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M 320 1258 Q 332 1240 352 1236" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>
    <path d="M 372 1282 Q 390 1276 402 1262" fill="none" stroke="#6E7682" stroke-width="4" stroke-linecap="round"/>`);
  STONE = new El(sg, 358, 1266, { s: 0, top: 1214 });

  // "LA SOURCE" qui s'écrit au-dessus du cadre
  const src = g(Lw, { filter: 'url(#softGlow)' });
  SOURCE_TXT = { g: src, letters: [], t0: 127.05 };

  // bulle de rêve
  const bg = g(Lf);
  BUBBLE = { g: bg, c1: g(bg), c2: g(bg), cloud: g(bg), drips: [] };
  mk('circle', { cx: 300, cy: 1250, r: 10, fill: GREEN }, BUBBLE.c1); mk('circle', { cx: 300, cy: 1250, r: 7, fill: '#111217' }, BUBBLE.c1);
  mk('circle', { cx: 345, cy: 1214, r: 14, fill: GREEN }, BUBBLE.c2); mk('circle', { cx: 345, cy: 1214, r: 11, fill: '#111217' }, BUBBLE.c2);
  const CL = [[430, 1215, 40], [490, 1200, 48], [560, 1198, 50], [630, 1210, 44], [668, 1236, 30], [605, 1245, 40], [520, 1248, 42], [448, 1240, 32]];
  const co = g(BUBBLE.cloud, { filter: 'url(#glow)' });
  CL.forEach(c => mk('circle', { cx: c[0], cy: c[1], r: c[2] + 3, fill: GREEN }, co));
  CL.forEach(c => mk('circle', { cx: c[0], cy: c[1], r: c[2], fill: '#111217' }, BUBBLE.cloud));
  const mini = g(BUBBLE.cloud, { fill: 'none', stroke: GREEN, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#glow)' });
  mk('path', { d: 'M 518 1218 L 552 1188 L 586 1218' }, mini);
  mk('path', { d: 'M 526 1212 V 1246 H 578 V 1212' }, mini);
  mk('path', { d: 'M 546 1246 V 1230 H 558 V 1246' }, mini);
  for (let i = 0; i < 3; i++) BUBBLE.drips.push(mk('line', { x1: 0, y1: 0, x2: 0, y2: 0, 'stroke-width': 3 }, mini));

  // décor : mosaïque de vidéos (scène 4) et grille de pixels (scène 5)
  const mos = g(Lb); const R = rng(4242);
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const row = g(mos); const tiles = [];
    for (let c = 0; c < 11; c++) {
      const tx = c * 140, ty = 500 + r * 118;
      const tg2 = g(row);
      mk('rect', { x: tx, y: ty, width: 122, height: 78, rx: 10, fill: ['#161922', '#1B1F29', '#212634'][Math.floor(R() * 3)], stroke: '#2A2F3C', 'stroke-width': 2 }, tg2);
      if (R() < 0.3) mk('path', { d: `M ${tx + 52} ${ty + 26} L ${tx + 74} ${ty + 39} L ${tx + 52} ${ty + 52} Z`, fill: GREEN, 'fill-opacity': 0.55 }, tg2);
      else { mk('rect', { x: tx + 14, y: ty + 52, width: 60 + R() * 30, height: 6, rx: 3, fill: '#3A4050' }, tg2); mk('rect', { x: tx + 14, y: ty + 20, width: 40, height: 22, rx: 4, fill: '#2B3140' }, tg2); }
      tiles.push(tg2);
    }
    rows.push({ g: row, speed: (r % 2 ? 1 : -1) * (38 + R() * 30), off: R() * 140 });
  }
  MOSAIC.g = mos; MOSAIC.rows = rows;

  const pg2 = g(Lb); PIXGRID.g = pg2;
  for (let yy = 1000; yy < 1720; yy += 40) for (let xx = 0; xx < 360; xx += 40) {
    PIXGRID.cells.push({ el: mk('rect', { x: xx + 2, y: yy + 2, width: 36, height: 36, rx: 3, fill: GREEN, opacity: 0 }, pg2), id: (yy * 97 + xx) | 0 });
  }
}
const MOSAIC = { g: null, rows: [] };
const PIXGRID = { g: null, cells: [] };

function wiggle(w, t) {
  const u = t - w.t0;
  if (u <= 0) { w.g.removeAttribute('transform'); return; }
  const a = E.soft(clamp(u / 0.35)), sd = w.seed;
  const n = k => Math.sin(u * k + sd) * 0.6 + Math.sin(u * k * 1.73 + sd * 2) * 0.4;
  const rot = a * 5 * n(19), sy = 1 + a * 0.06 * n(26), sx = 1 - a * 0.045 * n(26), sk = a * 4 * n(15);
  attr(w.g, 'transform', `translate(${w.px} ${w.py}) rotate(${r3(rot)}) skewX(${r3(sk)}) scale(${r3(sx)} ${r3(sy)}) translate(${-w.px} ${-w.py})`);
}

/* ================= ROBOT (rig) ================= */
const RB = {};
const FACES = {
  neutre: { sw: 6, L: '<ellipse cx="-30" cy="-96" rx="11" ry="15" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="30" cy="-96" rx="16" ry="21" fill="#4DFF8F" stroke="none"/>', X: '', M: '<rect x="-12" y="-62" width="24" height="6" rx="3" fill="#4DFF8F" stroke="none"/>', mc: [0, -59] },
  curieux: { sw: 6, L: '<path d="M -42 -94 Q -30 -106 -18 -94"/>', R: '<ellipse cx="30" cy="-96" rx="20" ry="25" fill="#4DFF8F" stroke="none"/>', X: '<path d="M 10 -134 Q 30 -146 50 -136" stroke-width="5"/>', M: '<path d="M -10 -58 Q 2 -54 14 -62" stroke-width="5"/>', mc: [2, -59] },
  perplexe: { sw: 5, cy: -94, L: '<ellipse cx="-30" cy="-94" rx="10" ry="12" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="30" cy="-94" rx="14" ry="17" fill="#4DFF8F" stroke="none"/>', X: '<path d="M -44 -121 L -18 -114"/><path d="M 12 -134 L 48 -142"/>', M: '<path d="M -18 -58 Q -12 -64 -6 -58 Q 0 -52 6 -58 Q 12 -64 18 -58"/>', mc: [0, -58] },
  surpris: { sw: 5, L: '<circle cx="-30" cy="-96" r="13" fill="#4DFF8F" stroke="none"/>', R: '<circle cx="30" cy="-96" r="22" fill="#4DFF8F" stroke="none"/>', X: '<path d="M -42 -124 Q -30 -134 -18 -124"/><path d="M 10 -138 Q 30 -150 50 -138"/>', M: '<ellipse cx="0" cy="-54" rx="7" ry="9"/>', mc: [0, -56] },
  satisfait: { sw: 6, L: '<path d="M -42 -90 L -30 -102 L -18 -90"/>', R: '<path d="M 12 -88 L 30 -108 L 48 -88"/>', X: '', M: '<path d="M -14 -62 Q 0 -50 14 -62" stroke-width="5"/>', mc: [0, -58] },
  endormi: { sw: 5, L: '<path d="M -42 -96 Q -30 -88 -18 -96"/>', R: '<path d="M 12 -96 Q 30 -86 48 -96"/>', X: '', M: '<rect x="-8" y="-60" width="16" height="4" rx="2" fill="#4DFF8F" stroke="none"/>', mc: [0, -58] },
  incertain: { sw: 6, L: '<path d="M -40 -96 L -20 -96"/>', R: '<path d="M 14 -96 L 46 -96"/>', X: '<path d="M -42 -112 L -18 -117" stroke-width="5"/><path d="M 14 -134 L 46 -128" stroke-width="5"/>', M: '<path d="M -14 -58 Q -7 -62 0 -58 Q 7 -54 14 -58" stroke-width="5"/>', mc: [0, -58] },
  reflechit: { sw: 5, cL: [-36, -106], cR: [22, -108], L: '<ellipse cx="-36" cy="-106" rx="9" ry="13" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="22" cy="-108" rx="13" ry="17" fill="#4DFF8F" stroke="none"/>', X: '<circle cx="-56" cy="-60" r="2.5" fill="#4DFF8F" stroke="none"/><circle cx="-48" cy="-60" r="2.5" fill="#4DFF8F" stroke="none"/><circle cx="-40" cy="-60" r="2.5" fill="#4DFF8F" stroke="none"/>', M: '<path d="M 2 -58 L 18 -61"/>', mc: [10, -59] },
  sceptique: { sw: 5, cL: [-30, -92], L: '<ellipse cx="-30" cy="-92" rx="10" ry="7" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="30" cy="-96" rx="16" ry="21" fill="#4DFF8F" stroke="none"/>', X: '<path d="M -44 -104 L -16 -102"/><path d="M 10 -136 Q 30 -150 50 -138"/>', M: '<path d="M -4 -58 L 18 -61"/>', mc: [7, -59] },
  eveil: { sw: 5, L: '<path d="M -42 -96 Q -30 -88 -18 -96"/>', R: '<path class="closed" d="M 12 -96 Q 30 -86 48 -96"/><ellipse class="open" cx="30" cy="-96" rx="16" ry="21" fill="#4DFF8F" stroke="none"/>', X: '', M: '<rect x="-8" y="-60" width="16" height="4" rx="2" fill="#4DFF8F" stroke="none"/>', mc: [0, -58] },
};
const NO_BLINK = new Set(['endormi', 'eveil', 'satisfait', 'none']);

function makeArm(parent) {
  const gg = g(parent);
  const o = mk('path', { fill: 'none', stroke: INK, 'stroke-width': 34, 'stroke-linecap': 'round' }, gg);
  const f = mk('path', { fill: 'none', stroke: '#C8A97E', 'stroke-width': 23, 'stroke-linecap': 'round' }, gg);
  const h = mk('circle', { r: 14, fill: '#C9D1D9', stroke: INK, 'stroke-width': 5 }, gg);
  return { g: gg, o, f, h };
}

function buildRobot() {
  const L = $('L-robot');
  RB.fx = g(L);
  RB.shadow = mk('ellipse', { fill: '#000000', 'fill-opacity': 0.55 }, RB.fx);
  RB.root = g(RB.fx);
  RB.body = g(RB.root);
  RB.arms = { R: {}, L: {} };
  RB.arms.L.back = makeArm(RB.body); RB.arms.R.back = makeArm(RB.body);
  RB.feetStand = mk('use', { href: '#rb-feet' }, RB.body);
  mk('use', { href: '#rb-coat-body' }, RB.body);
  RB.head = g(RB.body);
  mk('use', { href: '#rb-head' }, RB.head);
  RB.faceWrap = g(RB.head);
  RB.face = g(RB.faceWrap);
  RB.faces = {};
  for (const n in FACES) {
    const F = FACES[n];
    const fg = g(RB.face, { filter: 'url(#glow)', fill: 'none', stroke: GREEN, 'stroke-width': F.sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const eL = g(fg), eR = g(fg), fx = g(fg), fm = g(fg);
    markup(eL, F.L); markup(eR, F.R); markup(fx, F.X); markup(fm, F.M);
    vis(fg, false);
    RB.faces[n] = { g: fg, eL, eR, fm, F, cL: F.cL || [-30, F.cy ?? -96], cR: F.cR || [30, F.cy ?? -96], open: eR.querySelector('.open'), closed: eR.querySelector('.closed') };
  }
  RB.talk = g(RB.face, { filter: 'url(#glow)', fill: GREEN });
  RB.mouths = {
    ferm: mk('rect', { x: -12, y: -2.5, width: 24, height: 5, rx: 2.5 }, RB.talk),
    mi: mk('rect', { x: -12, y: -5.5, width: 24, height: 11, rx: 5.5 }, RB.talk),
    ouv: mk('rect', { x: -14, y: -10, width: 28, height: 20, rx: 9 }, RB.talk),
    o: mk('ellipse', { cx: 0, cy: 0, rx: 8, ry: 11, fill: 'none', stroke: GREEN, 'stroke-width': 5 }, RB.talk),
  };
  RB.loupe = g(RB.body); mk('use', { href: '#loupe' }, RB.loupe);
  RB.arms.L.front = makeArm(RB.body); RB.arms.R.front = makeArm(RB.body);
  RB.sparks = g(RB.body, { stroke: GREEN, 'stroke-width': 5, 'stroke-linecap': 'round', filter: 'url(#glow)' });
  RB.sparkLines = [0, 1, 2].map(() => mk('line', {}, RB.sparks));
  RB.hat = g(RB.body); RB.ant = g(RB.hat);
  mk('use', { href: '#rb-antenna' }, RB.ant); mk('use', { href: '#rb-hat' }, RB.hat);
  RB.arms.L.top = makeArm(RB.body); RB.arms.R.top = makeArm(RB.body);
  RB.feetSit = g(RB.body);
  mk('rect', { x: -20, y: -15, width: 40, height: 30, rx: 14, fill: '#3A3F4B', stroke: INK, 'stroke-width': 5, transform: 'translate(-56 164) rotate(-14)' }, RB.feetSit);
  mk('rect', { x: -20, y: -15, width: 40, height: 30, rx: 14, fill: '#3A3F4B', stroke: INK, 'stroke-width': 5, transform: 'translate(56 164) rotate(14)' }, RB.feetSit);
  RB.qmark = mk('text', { x: -150, y: -210, 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 72, fill: GREEN, filter: 'url(#glow)' }, RB.body);
  RB.qmark.textContent = '?';
}

function placeArm(side, p, hs) {
  const hand = handOf(p);
  const layer = hand[1] < -130 ? 'top' : hand[1] < 30 ? 'front' : 'back';
  for (const ly of ['back', 'front', 'top']) {
    const A = RB.arms[side][ly];
    if (ly !== layer) { vis(A.g, false); continue; }
    vis(A.g, true);
    const d = `M ${r3(p[0])} ${r3(p[1])} Q ${r3(p[2])} ${r3(p[3])} ${r3(p[4])} ${r3(p[5])}`;
    attr(A.o, 'd', d); attr(A.f, 'd', d);
    attr(A.h, 'cx', hand[0]); attr(A.h, 'cy', hand[1]); attr(A.h, 'r', 14 * hs);
  }
  return hand;
}

/* ----- visages : fusion base + surcharges ----- */
let FACE_TL = [];
function buildFaces() {
  FACE_BASE.sort((a, b) => a[0] - b[0]);
  const pts = new Set();
  FACE_BASE.forEach(f => pts.add(f[0])); FACE_OVR.forEach(o => { pts.add(o[0]); pts.add(o[1]); });
  const ts = [...pts].sort((a, b) => a - b);
  const baseAt = t => { let n = 'none'; for (const f of FACE_BASE) if (f[0] <= t) n = f[1]; return n; };
  const at = t => { for (const o of FACE_OVR) if (t >= o[0] && t < o[1]) return o[2]; return baseAt(t); };
  let cur = null;
  for (const t of ts) { const n = at(t); if (n !== cur) { FACE_TL.push({ t, n }); cur = n; } }
}
function faceState(t) {
  let lo = 0, hi = FACE_TL.length - 1;
  if (t < FACE_TL[0].t) return { n: 'none', prev: null, tc: -1e9 };
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (FACE_TL[m].t <= t) lo = m; else hi = m - 1; }
  return { n: FACE_TL[lo].n, prev: lo > 0 ? FACE_TL[lo - 1].n : null, tc: FACE_TL[lo].t };
}

/* ----- clignements (graine fixe, toutes les 3 à 5 s) ----- */
const BLINKS = [];
(function () { const R = rng(777); let t = 8.4; while (t < 160) { BLINKS.push(t); t += 3 + 2 * R(); } })();
function blinkAt(t) {
  let b = 1;
  for (const tb of BLINKS) {
    const d = t - tb; if (d < 0) break;
    if (d < 0.06) b = 1 - 0.92 * E.qin(d / 0.06);
    else if (d < 0.17) b = 0.08 + 0.92 * E.soft((d - 0.06) / 0.11);
  }
  return b;
}

/* ----- phase de l'idle (vitesse variable : "tout ralentit") ----- */
let PHASE = null;
function buildPhase() {
  const n = Math.ceil((DURATION + 2) * FPS) + 2; PHASE = new Float64Array(n);
  for (let i = 1; i < n; i++) PHASE[i] = PHASE[i - 1] + T('speed').at((i - 1) / FPS) / FPS;
}
function phaseAt(t) {
  if (t <= 0) return t;
  const x = t * FPS, i = Math.floor(x); if (i >= PHASE.length - 1) return PHASE[PHASE.length - 1];
  return lerp(PHASE[i], PHASE[i + 1], x - i);
}
function cycKF(c, keys) {
  for (let i = 1; i < keys.length; i++) {
    if (c <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], p = E.io((c - a[0]) / (b[0] - a[0]));
      return a.slice(1).map((v, j) => lerp(v, b[j + 1], p));
    }
  }
  return keys[keys.length - 1].slice(1);
}

/* ----- follow-through (ressort amorti sur l'accélération du corps) ----- */
function followThrough(t, s) {
  const h = 1 / 60, N = 60;
  const X = T('x'), Y = T('y');
  const xs = new Float64Array(N + 2), ys = new Float64Array(N + 2);
  for (let k = 0; k < N + 2; k++) { const tt = t + h - k * h; xs[k] = X.at(tt); ys[k] = Y.at(tt); }
  const springs = [[2.6, 0.3], [4.4, 0.13]];
  const out = springs.map(() => [0, 0]);
  for (let k = 0; k < N; k++) {
    const ax = (xs[k] - 2 * xs[k + 1] + xs[k + 2]) / (h * h), ay = (ys[k] - 2 * ys[k + 1] + ys[k + 2]) / (h * h);
    const tau = k * h;
    springs.forEach(([f, z], i) => {
      const w = PI2 * f, wd = w * Math.sqrt(1 - z * z), kk = Math.exp(-z * w * tau) * Math.sin(wd * tau) / wd * h;
      out[i][0] += ax * kk; out[i][1] += ay * kk;
    });
  }
  const ph = T('phys').at(t) / s;
  return { hx: out[0][0] * ph, hy: out[0][1] * ph, ax: out[1][0] * ph, ay: out[1][1] * ph };
}

/* ----- bouche : formes de parole pendant chaque ligne ----- */
const SPEECH = [];
function buildSpeech() {
  VOICE.forEach((L, i) => {
    const t0 = L.t0, t1 = Math.min(L.t1, L.te) - 0.12;
    const R = rng(1000 + i); const seq = []; let t = t0 + 0.04, last = '';
    const sleepy = t0 >= 145.5;
    const pool = sleepy ? ['ferm', 'mi', 'ferm', 'mi'] : ['mi', 'mi', 'ouv', 'ouv', 'o', 'ferm', 'mi', 'ouv'];
    while (t < t1) {
      let sh; do { sh = pool[Math.floor(R() * pool.length)]; } while (sh === last);
      const d = sleepy ? 0.16 + R() * 0.16 : 0.08 + R() * 0.09;
      seq.push([t, sh]); last = sh; t += d;
    }
    SPEECH.push({ t0, t1, seq });
  });
}
function mouthAt(t) {
  for (const S of SPEECH) {
    if (t < S.t0 || t >= S.t1) continue;
    let sh = null; for (const [ts, s] of S.seq) { if (ts <= t) sh = s; else break; }
    return sh;
  }
  return null;
}

/* ----- effets dessin / pixel ----- */
const DRAW = [11.2, 19.6], PIX = [93.0, 96.4];
function drawAmt(t) { if (t < DRAW[0] || t > DRAW[1]) return 0; return Math.min(E.soft((t - DRAW[0]) / 0.3), E.soft((DRAW[1] - t) / 0.3)); }
function pixBlock(t) {
  if (t < PIX[0] || t > PIX[1] + 0.3) return 0;
  if (t < PIX[0] + 0.12) return lerp(4, 18, E.soft((t - PIX[0]) / 0.12));
  if (t <= PIX[1]) return 18;
  const q = (t - PIX[1]) / 0.3; return q >= 1 ? 0 : lerp(18, 1, E.soft(q));
}

/* ----- hit-stops : l'animation se fige puis rattrape le temps ----- */
/* Les hit-stops sont déclarés en temps d'animation ; HSR les place en temps réel,
   à l'image exacte où l'impact se produit (après les hit-stops précédents). */
let HSR = [];
function warpWith(list, t) {
  let lag = 0; const R = 0.25;
  for (const [h, d] of list) {
    if (t < h) continue;
    if (t < h + d) lag += t - h;
    else if (t < h + d + R) lag += d * (1 - E.io((t - h - d) / R));
  }
  return t - lag;
}
function buildHitstops() {
  HS.sort((a, b) => a[0] - b[0]);
  HSR = [];
  for (const [h, d] of HS) {
    let lo = h, hi = h + 0.6;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (warpWith(HSR, m) < h) lo = m; else hi = m; }
    HSR.push([hi, d]);
  }
}
const warp = t => warpWith(HSR, t);
function robotTime(t, ta) {
  if ((t >= DRAW[0] && t <= DRAW[1]) || (t >= PIX[0] && t <= PIX[1])) return Math.floor(ta * 12 + 1e-6) / 12;
  return ta;
}

function renderRobot(t, ta) {
  const rt = robotTime(t, ta);
  const v = n => T(n).at(rt);
  const x = v('x'), y = v('y'), s = v('s'), rot = v('rot'), sx = v('sx'), sy = v('sy'), amp = v('float'), sit = v('sit');
  const ph = phaseAt(rt), cyc = ((ph / 2.6) % 1 + 1) % 1, k6 = amp / 6;
  const lift = amp * (1 - Math.cos(PI2 * cyc)) * (s / S0);
  attr(RB.root, 'transform', `translate(${r3(x)} ${r3(y - lift)}) rotate(${r3(rot)}) scale(${r3(s * sx)} ${r3(s * sy)}) translate(0 -166)`);
  if (sit > 0.001) attr(RB.body, 'transform', `translate(0 ${r3(166 + 14 * sit)}) scale(1 ${r3(1 - 0.08 * sit)}) translate(0 -166)`);
  else RB.body.removeAttribute('transform');
  vis(RB.feetStand, sit < 0.5); vis(RB.feetSit, sit >= 0.5);

  const gyr = v('groundY'), hgt = Math.max(0, gyr - (y - lift)), ga = clamp(1 - hgt / 260), fl = amp > 0 ? lift / (2 * amp) : 0;
  if (ga > 0.01 && s < 2) {
    vis(RB.shadow, true);
    attr(RB.shadow, 'cx', x); attr(RB.shadow, 'cy', gyr + 6 * s);
    attr(RB.shadow, 'rx', 96 * s * (1 - 0.2 * fl) * (0.7 + 0.3 * ga)); attr(RB.shadow, 'ry', 14 * s * (1 - 0.2 * fl));
    attr(RB.shadow, 'fill-opacity', 0.55 * (1 - 0.4 * fl) * ga);
  } else vis(RB.shadow, false);

  // tête + visage
  const fs = faceState(rt);
  const pc = clamp((rt - fs.tc) / 0.2);
  const hsy = 1 - 0.05 * (1 - E.soft(pc));
  const hr = v('hr') + 1.2 * Math.sin(PI2 * ph / 5.2) * k6, hdx = v('hdx'), hdy = v('hdy');
  const Hs = `translate(${r3(hdx)} ${r3(hdy)}) rotate(${r3(hr)} 0 -6) translate(0 -6) scale(1 ${r3(hsy)}) translate(0 6)`;
  attr(RB.head, 'transform', Hs);
  const gx = v('gx'), gy = v('gy'), fo = v('faceOn');
  vis(RB.faceWrap, fo > 0.01);
  attr(RB.faceWrap, 'transform', `translate(0 -96) scale(1 ${r3(Math.max(0.02, fo))}) translate(0 96)`);
  attr(RB.face, 'transform', `translate(${r3(gx)} ${r3(gy)})`);

  const cross = clamp((rt - fs.tc) / 0.1);
  const lid = v('lid'), eR = v('eR'), rOpen = v('rOpen');
  const mouth = fo > 0.5 ? mouthAt(rt) : null;
  for (const n in RB.faces) {
    const F = RB.faces[n];
    let op = 0;
    if (n === fs.n) op = fs.prev ? cross : 1;
    else if (n === fs.prev && cross < 1) op = 1 - cross;
    if (op <= 0.001) { vis(F.g, false); continue; }
    vis(F.g, true); attr(F.g, 'opacity', op);
    const b = (NO_BLINK.has(n) ? 1 : blinkAt(rt)) * lid;
    attr(F.eL, 'transform', `translate(${F.cL[0]} ${F.cL[1]}) scale(1 ${r3(b)}) translate(${-F.cL[0]} ${-F.cL[1]})`);
    attr(F.eR, 'transform', `translate(${F.cR[0]} ${F.cR[1]}) scale(${r3(eR)} ${r3(eR * b)}) translate(${-F.cR[0]} ${-F.cR[1]})`);
    if (F.open) {
      vis(F.open, rOpen > 0.04); attr(F.open, 'transform', `translate(30 -96) scale(1 ${r3(Math.max(0.04, rOpen))}) translate(-30 96)`);
      vis(F.closed, rOpen < 0.35);
    }
    vis(F.fm, !(mouth && n === fs.n));
  }
  if (mouth) {
    vis(RB.talk, true);
    const mc = FACES[fs.n] ? FACES[fs.n].mc : [0, -59];
    attr(RB.talk, 'transform', `translate(${mc[0]} ${mc[1]})`);
    for (const k in RB.mouths) vis(RB.mouths[k], k === mouth);
  } else vis(RB.talk, false);

  // loupe
  const up = v('loupeUp'), L4 = v('loupe');
  attr(RB.loupe, 'transform', `${Hs} translate(${r3(gx * (1 - clamp(up)))} ${r3(gy * (1 - clamp(up)))}) translate(${r3(L4[0])} ${r3(L4[1])}) rotate(${r3(L4[2] + 100 * up)} 110 -98) translate(30 -96) scale(${r3(L4[3])}) translate(-30 96)`);

  // bras
  placeArm('L', v('armL'), v('handL'));
  const hR = placeArm('R', v('armR'), v('handR'));

  // étincelles du claquement
  let sp = null; for (const ts of SPARKS) if (rt >= ts && rt < ts + 0.22) sp = ts;
  if (sp !== null) {
    vis(RB.sparks, true); const p = (rt - sp) / 0.22;
    RB.sparkLines.forEach((ln, i) => {
      const a = (-110 + i * 38) * DEG, r0 = 18 + 20 * E.soft(p), r1 = r0 + 22 * (1 - p);
      attr(ln, 'x1', hR[0] + Math.cos(a) * r0); attr(ln, 'y1', hR[1] + Math.sin(a) * r0);
      attr(ln, 'x2', hR[0] + Math.cos(a) * r1); attr(ln, 'y2', hR[1] + Math.sin(a) * r1);
    });
    attr(RB.sparks, 'opacity', 1 - E.qin(p));
  } else vis(RB.sparks, false);

  // chapeau + antenne : idle de la planche + follow-through physique
  const [hIr, hIy] = cycKF(cyc, [[0, 0, 0], [0.3, -2.5, -4], [0.65, 1.5, 1], [1, 0, 0]]);
  const [aI] = cycKF(cyc, [[0, 0], [0.35, -9], [0.6, 6], [0.8, -2], [1, 0]]);
  const ft = followThrough(rt, s);
  const hatRot = hIr * k6 + v('hatTilt') + softclamp(-0.3 * ft.hx, 16);
  const hatDy = hIy * k6 + v('hatLift') + softclamp(-0.05 * ft.hy, 12);
  const antRot = aI * k6 + softclamp(-0.55 * ft.ax - 0.2 * ft.ay, 30);
  attr(RB.hat, 'transform', `${Hs} translate(0 ${r3(hatDy)}) rotate(${r3(hatRot)} 0 -178)`);
  attr(RB.ant, 'transform', `rotate(${r3(antRot)} 22 -236)`);

  const qm = v('qmark');
  vis(RB.qmark, qm > 0.01);
  if (qm > 0.01) attr(RB.qmark, 'transform', `translate(-128 -232) scale(${r3(qm)}) rotate(-8) translate(128 232)`);

  // effets
  const pb = pixBlock(t), da = drawAmt(t);
  if (pb > 0) {
    const B = Math.max(1, Math.round(pb)), hb = Math.floor(B / 2);
    RB.fx.setAttribute('filter', 'url(#pixFx)');
    attr($('pxFlood'), 'x', hb); attr($('pxFlood'), 'y', hb);
    attr($('pxCell'), 'width', B); attr($('pxCell'), 'height', B);
    attr($('pxMorph'), 'radius', hb); attr($('pxBlur'), 'stdDeviation', B * 0.3);
  } else if (da > 0) {
    const k = Math.floor(t * 12);
    RB.fx.setAttribute('filter', 'url(#drawFx)');
    attr($('dfTurb'), 'seed', 1 + k); attr($('dfGrain'), 'seed', 500 + k);
    attr($('dfDisp'), 'scale', 5 * da); attr($('dfGrainA'), 'slope', 0.34 * da);
  } else RB.fx.removeAttribute('filter');
}

/* ================= LIGNES DE VOIX (pour la bouche du robot) =================
   Plus de sous-titres à l'image : ils seront faits au montage. Ces timecodes servent
   uniquement à animer la bouche pendant que la voix parle. */
const VOICE_RAW = [
  [0.5, 3.5, 'On a demandé à une IA'],
  [3.5, 6.9, 'de donner vie à ce dessin,'],
  [6.9, 8.4, 'et regardez bien'],
  [8.4, 11.2, 'ce qui se passe.'],
  [11.2, 15.1, 'Ce dessin, c’est celui de Philippe Delord,'],
  [15.1, 17.6, 'un dessinateur qui m’a autorisé'],
  [17.6, 19.6, 'à utiliser son travail'],
  [19.6, 21.9, 'pour cette vidéo.'],
  [21.9, 24.3, 'La consigne était simple,'],
  [24.3, 26.7, 'faire vivre la scène,'],
  [26.7, 30.2, 'et pourtant il y a quelque chose'],
  [30.2, 34.1, 'qui se met à couler du toit,'],
  [34.1, 35.6, 'la maison s’efface'],
  [35.6, 37.0, 'puis revient,'],
  [37.0, 40.0, 'et honnêtement personne ne peut dire'],
  [40.0, 42.4, 'si c’est du bois,'],
  [42.4, 43.8, 'de l’eau'],
  [43.8, 46.2, 'ou de la fumée,'],
  [46.2, 49.0, 'pas même la machine.'],
  [49.0, 51.9, 'Parce que pour une IA,'],
  [51.9, 53.3, 'donner vie,'],
  [53.3, 57.1, 'ça veut juste dire faire bouger.'],
  [57.1, 60.0, 'Elle n’a jamais vu la vie,'],
  [60.0, 63.5, 'elle a vu des millions de vidéos'],
  [63.5, 66.9, 'où tout ce qui est vivant bouge,'],
  [66.9, 68.9, 'alors elle fait bouger'],
  [68.9, 71.3, 'tout ce qu’elle peut,'],
  [71.3, 75.1, 'même ce qui n’était pas censé bouger.'],
  [75.1, 78.1, 'Et c’est exactement ce que pointe'],
  [78.1, 79.5, 'Yann LeCun,'],
  [79.5, 80.9, 'un Français,'],
  [80.9, 84.3, 'l’un des pionniers de l’IA moderne,'],
  [84.3, 87.7, 'qui a reçu le prix Turing,'],
  [87.7, 91.0, 'l’équivalent du Nobel en informatique.'],
  [91.0, 93.0, 'Pour lui, ces modèles'],
  [93.0, 96.4, 'ne font que prédire des pixels,'],
  [96.4, 98.8, 'sans aucun monde derrière,'],
  [98.8, 102.2, 'sans savoir ce qu’est un toit,'],
  [102.2, 105.5, 'du bois ou de l’eau.'],
  [105.5, 108.0, 'D’ailleurs, il a quitté Meta'],
  [108.0, 111.5, 'et levé plus d’un milliard de dollars'],
  [111.5, 113.4, 'pour construire l’inverse,'],
  [113.4, 116.8, 'ce qu’on appelle les world models,'],
  [116.8, 119.3, 'des IA qui comprendraient vraiment'],
  [119.3, 122.1, 'comment le monde fonctionne.'],
  [122.1, 124.5, 'Mais le plus troublant,'],
  [124.5, 127.0, 'c’est que ce lieu s’appelle'],
  [127.0, 129.0, 'La Source.'],
  [129.0, 130.4, 'Alors vous,'],
  [130.4, 132.4, 'qu’est-ce que vous voyez'],
  [132.4, 135.2, 'couler de ce toit ?'],
  [135.2, 138.1, 'Parce que la machine, elle,'],
  [138.1, 140.5, 'n’a rien voulu dire,'],
  [140.5, 143.5, 'c’est nous qui cherchons un sens.', 143.5],
  [145.5, 147.4, 'Alors au fond,'],
  [147.4, 148.8, 'qui rêve,'],
  [148.8, 151.3, 'elle ou nous ?'],
  [151.3, 152.9, 'Hallucination,'],
  [152.9, 159.0, 'ou simplement une autre façon de voir ?', 999],
];
const VOICE = VOICE_RAW.map((r, i) => ({ t0: r[0], t1: r[1], text: r[2], te: r[3] ?? (VOICE_RAW[i + 1] ? VOICE_RAW[i + 1][0] : 999) }));

/* ================= LA SOURCE (lettres) ================= */
function buildSourceText() {
  const G = SOURCE_TXT.g; const txt = 'LA SOURCE'; const FS = 150;
  const meas = mk('text', { 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': FS, y: -500 }, G);
  const ws = [...txt].map(c => { meas.textContent = c === ' ' ? ' ' : c; return meas.getComputedTextLength(); });
  meas.remove();
  const total = ws.reduce((a, b) => a + b, 0) + 6 * (txt.length - 1);
  let x = 540 - total / 2; let k = 0;
  [...txt].forEach((c, i) => {
    if (c !== ' ') {
      const el = mk('text', { x: r3(x), y: 372, 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': FS, fill: GREEN, 'fill-opacity': 0, stroke: GREEN, 'stroke-width': 4, 'stroke-dasharray': '900', 'stroke-dashoffset': '900', 'stroke-linejoin': 'round' }, G);
      el.textContent = c;
      SOURCE_TXT.letters.push({ el, t: SOURCE_TXT.t0 + k * 0.075 }); k++;
    }
    x += ws[i] + 6;
  });
}
function renderSourceText(ta) {
  const on = ta >= SOURCE_TXT.t0 && ta < 153;
  vis(SOURCE_TXT.g, on); if (!on) return;
  for (const L of SOURCE_TXT.letters) {
    const u = ta - L.t;
    const d = E.soft(clamp(u / 0.28)), fl = E.soft(clamp((u - 0.18) / 0.22));
    attr(L.el, 'stroke-dashoffset', 900 * (1 - d)); attr(L.el, 'fill-opacity', fl);
    attr(L.el, 'stroke-opacity', u > 0 ? 1 : 0);
  }
}

/* ================= BULLE DE RÊVE ================= */
const BUB_T = 143.5;
function renderBubble(ta) {
  const on = ta >= BUB_T; vis(BUBBLE.g, on); if (!on) return;
  const pc = (el, t0, cx, cy) => { const k = E.pop(clamp((ta - t0) / 0.35)); vis(el, k > 0.001); attr(el, 'transform', `translate(${cx} ${cy}) scale(${r3(Math.max(0.001, k))}) translate(${-cx} ${-cy})`); };
  pc(BUBBLE.c1, BUB_T, 300, 1250); pc(BUBBLE.c2, BUB_T + 0.15, 345, 1214);
  const k = E.pop(clamp((ta - BUB_T - 0.3) / 0.45));
  const pulse = ta > BUB_T + 0.75 ? 1 + 0.035 * Math.sin(PI2 * (ta - BUB_T - 0.75) / 2.4) : 1;
  vis(BUBBLE.cloud, k > 0.001);
  attr(BUBBLE.cloud, 'transform', `translate(420 1250) scale(${r3(Math.max(0.001, k * pulse))}) translate(-420 -1250)`);
  BUBBLE.drips.forEach((d, i) => {
    const x = 530 + i * 22, u = ((ta - BUB_T) * 0.55 + i * 0.33) % 1;
    attr(d, 'x1', x); attr(d, 'x2', x); attr(d, 'y1', 1206 + (i === 1 ? -10 : 0) + u * 8); attr(d, 'y2', 1212 + (i === 1 ? -10 : 0) + u * 30);
    attr(d, 'opacity', Math.sin(Math.PI * u));
  });
}

/* ================= DÉCOR ANIMÉ ================= */
function renderMosaic(ta) {
  const a = Math.min(E.soft(clamp((ta - 60.0) / 0.6)), 1 - E.soft(clamp((ta - 68.9) / 0.8)));
  vis(MOSAIC.g, a > 0.001); if (a <= 0.001) return;
  attr(MOSAIC.g, 'opacity', 0.5 * a);
  MOSAIC.rows.forEach(r => { const off = ((r.off + (ta - 60) * r.speed) % 140 + 140) % 140 - 140; attr(r.g, 'transform', `translate(${r3(off)} 0)`); });
}
function renderPixGrid(t) {
  const a = t >= PIX[0] && t <= PIX[1] + 0.3 ? Math.min(E.soft(clamp((t - PIX[0]) / 0.15)), 1 - E.soft(clamp((t - PIX[1]) / 0.3))) : 0;
  vis(PIXGRID.g, a > 0.001); if (a <= 0.001) return;
  const step = Math.floor(t * 12);
  for (const c of PIXGRID.cells) {
    const h = hash(c.id * 131 + step * 7919);
    attr(c.el, 'opacity', h < 0.2 ? a * (0.1 + 0.3 * hash(c.id + step)) : 0);
  }
}

/* ================= MAGENTA (mode écran) ================= */
let KEY;
function buildKey() {
  KEY = mk('rect', { x: 60, y: 440, width: 960, height: 640, rx: 143, fill: '#FF00FF', 'shape-rendering': 'geometricPrecision' }, $('L-key'));
}
function renderKey(ta) {
  if (ta >= 6.6) { vis(KEY, false); return; }
  vis(KEY, true);
  let sx = 1, sy = 1;
  if (ta >= 6.3) {
    sy = lerp(1, 0.012, E.qin(clamp((ta - 6.3) / 0.15)));
    if (ta >= 6.45) sx = lerp(1, 0, E.qin(clamp((ta - 6.45) / 0.15)));
  }
  if (sx === 1 && sy === 1) KEY.removeAttribute('transform');
  else attr(KEY, 'transform', `translate(540 760) scale(${r3(sx)} ${r3(sy)}) translate(-540 -760)`);
}

/* ================= LA TIMELINE ================= */
function buildTimeline() {
  /* ---------- SCÈNE 1 · 0.0–11.2 ---------- */
  face(0, 'none');
  // 6.6–7.6 dézoom (SOFT) du gros plan vers le plan large, bas à gauche
  const d0 = 6.6, d1 = 7.6, hy = s => 258 * s;
  const H0 = [CU.x, CU.y - hy(CU.s)], H1 = [BLX, FLOOR - hy(S0)];
  const zp = t => E.soft(clamp((t - d0) / (d1 - d0)));
  const zs = t => lerp(CU.s, S0, zp(t));
  for (const [n, a, b] of [['s', CU.s, S0], ['x', CU.x, BLX], ['y', CU.y, FLOOR]]) { set(n, d0, a); set(n, d1, b); }
  T('s').seg(d0, d1, zs);
  T('x').seg(d0, d1, t => lerp(H0[0], H1[0], zp(t)));
  T('y').seg(d0, d1, t => lerp(H0[1], H1[1], zp(t)) + hy(zs(t)));
  to('phys', 7.4, 7.9, 1, 'soft');
  face(6.62, 'curieux');
  to('faceOn', 6.72, 6.98, 1, 'pop');         // les yeux se rallument
  to('loupeUp', 6.72, 7.15, 0, 'pop');        // la loupe retombe avec un petit rebond
  to('float', 6.8, 7.9, 6, 'soft');
  to('gx', 6.9, 7.3, 7); to('gy', 6.9, 7.3, -10); to('hr', 6.9, 7.3, 4);   // il se tourne vers le cadre
  claque(7.6, [VIDEO]);
  // 8.4 il se penche vers le cadre, main sur la loupe
  to('rot', 8.4, 8.85, 6); arm('R', 8.4, 8.8, 'onLoupe'); to('loupe', 8.5, 8.9, [0, 0, 0, 1.12]);
  to('gx', 8.4, 8.8, 9); to('gy', 8.4, 8.8, -13);
  arm('R', 9.85, 10.15, 'down'); to('rot', 9.85, 10.2, 0); to('loupe', 9.85, 10.2, [0, 0, 0, 1]); to('hr', 9.9, 10.2, 0);
  to('gx', 9.9, 10.2, 3); to('gy', 9.9, 10.2, -6);

  /* ---------- SCÈNE 2 · 11.2–21.9 ---------- */
  face(10.6, 'neutre');
  ecrase(10.6, VIDEO, [], 300, VID.y, [889, FLOOR]);
  // 11.2 le coin du polaroid dépasse du bord droit
  POL2.tx.key(11.2, 1100, 'step'); POL2.tx.key(11.55, 900, 'soft');
  arm('R', 11.72, 11.88, 'reach');
  to('gx', 11.5, 11.8, 10); to('gy', 11.5, 11.8, 2);
  const tp = 11.9;      // [TIRE]
  to('rot', tp - 0.04, tp + 0.12, -12); crouch(tp - 0.04, tp - 0.035, 1);
  to('sx', tp - 0.03, tp + 0.1, 1.15); to('sy', tp - 0.03, tp + 0.1, 0.9);
  to('x', tp, tp + 0.3, 845);
  arm('R', tp, tp + 0.08, 'pull');
  eto(POL2.tx, tp, tp + 0.38, -18); POL2.tx.key(tp + 0.5, 0, 'soft');
  eto(POL2.ty, tp, tp + 0.38, -8.7); POL2.ty.key(tp + 0.5, 0, 'soft');
  eto(POL2.r, tp, tp + 0.38, -1.5); POL2.r.key(tp + 0.5, 0, 'soft');
  arm('R', tp + 0.12, tp + 0.42, 'down');
  to('sx', tp + 0.28, tp + 0.42, 1); to('sy', tp + 0.28, tp + 0.42, 1);
  const tb = tp + 0.5;  // il trébuche en arrière, se rattrape, remet son chapeau
  hop(tb, 815, 0.24, 24);
  to('rot', tb, tb + 0.12, -15); to('rot', tb + 0.24, tb + 0.55, 0, 'pop');
  to('hatTilt', tb + 0.02, tb + 0.16, -14, 'pop');
  arm('L', tb, tb + 0.14, 'balance'); arm('R', tb, tb + 0.14, 'balance');
  arm('R', tb + 0.24, tb + 0.5, 'down');
  arm('L', tb + 0.28, tb + 0.5, 'hatfix'); to('hatTilt', tb + 0.5, tb + 0.68, 0);
  arm('L', tb + 0.72, tb + 0.98, 'down');
  to('gx', tb, tb + 0.3, -4); to('gy', tb, tb + 0.3, -4);
  // il désigne le polaroid, satisfait discret
  face(13.2, 'satisfait');
  arm('L', 13.2, 13.55, 'point'); to('gx', 13.2, 13.5, -11); to('gy', 13.2, 13.5, -9); to('rot', 13.2, 13.55, -4);
  face(15.1, 'neutre');
  arm('L', 15.1, 15.45, 'down'); to('rot', 15.1, 15.45, 0); to('gx', 15.1, 15.5, -8);
  to('hr', 16.4, 16.9, -4); to('hr', 18.2, 18.7, 2);
  nod(19.75); nod(20.3); to('hr', 19.6, 19.9, 0);
  face(19.6, 'neutre');

  /* ---------- SCÈNE 3 · 21.9–49.0 ---------- */
  ecrase(21.3, POL2, [], 690, 420, [BLX, FLOOR], { fast: true });
  claque(21.9, [VIDEO]);
  face(21.9, 'neutre');
  to('gx', 22.6, 23.0, 4); to('gy', 22.6, 23.0, -10);
  // 26.7 il lève la loupe vers le cadre
  face(26.7, 'curieux');
  arm('R', 26.7, 27.2, 'raiseLoupe'); to('loupe', 26.75, 27.2, [58, -92, 50, 1.05]);
  to('gx', 26.7, 27.1, 10); to('gy', 26.7, 27.1, -12); to('rot', 26.7, 27.2, 3);
  // 30.2 pose "examine un indice", œil-loupe agrandi
  arm('R', 30.2, 30.55, 'examine'); to('loupe', 30.2, 30.55, [0, 0, 0, 1.3]); to('eR', 30.25, 30.6, 1.35, 'pop');
  to('rot', 30.2, 30.55, -6); to('gx', 30.2, 30.5, 4); to('gy', 30.2, 30.5, -6);
  // 34.1 surpris léger, petit recul
  face(34.1, 'surpris');
  to('eR', 34.1, 34.3, 1); to('loupe', 34.1, 34.3, [0, 0, 0, 1]); arm('R', 34.1, 34.4, 'down');
  hop(34.18, 165, 0.26, 22); to('rot', 34.1, 34.3, -5); to('rot', 34.55, 34.9, 0, 'pop');
  // 35.6 perplexe : se gratte la tête
  face(35.6, 'perplexe');
  arm('R', 35.6, 35.95, 'scratch'); to('hatTilt', 35.65, 35.95, -7); to('hatLift', 35.65, 35.95, -8);
  to('qmark', 35.75, 36.1, 1, 'pop'); to('qmark', 37.7, 37.9, 0, 'soft');
  to('x', 36.0, 36.4, BLX);
  arm('R', 37.8, 38.15, 'down'); to('hatTilt', 37.8, 38.1, 0); to('hatLift', 37.8, 38.1, 0);
  to('gx', 37.9, 38.3, 6); to('gy', 37.9, 38.3, -8);
  // 40.0 / 42.4 / 43.8 [CLAQUE] bois, eau, fumée
  face(40.0, 'neutre');
  claque(40.0, [ICONS[0]]); claque(42.4, [ICONS[1]]); claque(43.8, [ICONS[2]]);
  to('gx', 40.3, 40.6, 10); to('gy', 40.3, 40.6, -2);
  // 46.2 haussement d'épaules, incertain
  face(46.2, 'incertain');
  arm('R', 46.2, 46.45, 'shrug'); arm('L', 46.2, 46.45, 'shrug'); to('hdy', 46.2, 46.45, -14); to('hatLift', 46.2, 46.45, -6);
  to('gx', 46.2, 46.5, 0); to('gy', 46.2, 46.5, 0);
  arm('R', 47.8, 48.05, 'down'); arm('L', 47.8, 48.05, 'down'); to('hdy', 47.8, 48.05, 0); to('hatLift', 47.8, 48.05, 0);

  /* ---------- SCÈNE 4 · 49.0–75.1 ---------- */
  face(48.2, 'neutre');
  ecrase(48.4, VIDEO, ICONS, 300, VID.y, [540, CFLOOR], { stagger: 0.05 });
  claque(49.3, [TREE, HOUSE, STONE]);
  face(49.0, 'neutre');
  to('gx', 51.9, 52.3, -10); to('gy', 51.9, 52.3, -4);
  // il touche l'arbre, puis la maison
  hop(53.3, 400, 0.32, 36);
  arm('L', 53.66, 53.95, 'reachUp');
  hitstop(54.0, 0.1); WIG.tree.t0 = 54.0;
  arm('L', 54.2, 54.5, 'down');
  hops(54.7, 680, 2, 0.28, 30);
  to('gx', 54.7, 55.0, 10); to('gy', 54.7, 55.0, 0);
  arm('R', 55.55, 55.9, 'reachR');
  hitstop(56.0, 0.1); WIG.house.t0 = 56.0;
  arm('R', 56.2, 56.5, 'down');
  hop(56.6, 540, 0.3, 32);
  face(57.1, 'reflechit'); to('gx', 57.0, 57.4, 0); to('gy', 57.0, 57.4, 0);
  face(60.0, 'curieux'); to('hr', 60.2, 60.8, -5); to('hr', 62.2, 62.8, 5); to('hr', 64.6, 65.2, 0);
  to('gx', 60.2, 60.8, -10); to('gx', 62.2, 62.8, 10); to('gx', 64.6, 65.2, 0);
  face(63.5, 'neutre');
  face(66.9, 'reflechit');
  // 71.3 il touche le caillou : sceptique
  face(71.3, 'sceptique');
  hop(71.3, 470, 0.3, 30);
  to('rot', 71.65, 71.95, -10); arm('L', 71.62, 71.95, 'touchLow'); to('gx', 71.62, 71.9, -8); to('gy', 71.62, 71.9, 6);
  hitstop(72.0, 0.1); WIG.stone.t0 = 72.0;
  arm('L', 72.25, 72.55, 'down'); to('rot', 72.25, 72.6, 0);
  hop(72.8, 540, 0.3, 30);
  to('gx', 72.8, 73.2, -6); to('gy', 72.8, 73.2, -2);
  // 74.6 les objets tombent (décalés de 0.08 s)
  [TREE, HOUSE, STONE].forEach((e, i) => { const t0 = 74.6 + i * 0.08; e.ty.key(t0, 0, 'step'); e.ty.key(t0 + 0.45, fallDist(e), 'chute'); });

  /* ---------- SCÈNE 5 · 75.1–122.1 ---------- */
  // [TIRE] depuis le haut : il saute, attrape le coin du polaroid et le tire vers le bas
  const hang = handOf(PL.hang);
  const cornerLocal = [70, 834];
  const rP = -25 * DEG, cvec = [-210, 252];
  const cr = [cvec[0] * Math.cos(rP) - cvec[1] * Math.sin(rP), cvec[0] * Math.sin(rP) + cvec[1] * Math.cos(rP)];
  const peek = [330, 150];                       // seul un coin dépasse du bord haut
  const c0 = [peek[0] - cr[0], peek[1] - cr[1]];
  POL5.tx.key(0, c0[0] - 280, 'step'); POL5.ty.key(0, c0[1] - 582 - 260, 'step'); POL5.r.key(0, -25, 'step');
  POL5.ty.key(74.2, c0[1] - 582 - 260, 'step'); POL5.ty.key(74.5, c0[1] - 582, 'soft');
  CARD5.ty.key(0, -1100, 'step');
  const feetFromCorner = (c, t) => [c[0] - S0 * T('sx').at(t) * hang[0], c[1] - S0 * T('sy').at(t) * (hang[1] - 166)];
  const f0 = feetFromCorner(peek, 0);
  face(74.3, 'curieux');
  to('gx', 74.2, 74.4, -6); to('gy', 74.2, 74.4, -12);
  crouch(74.2, 74.45, 0.82);
  arm('L', 74.45, 74.7, 'hang');
  jump(74.45, 0.35, f0[0], f0[1], 0, { squash: 1, settle: false });
  sqk(74.95, 1, 'soft');
  set('groundY', 74.5, FLOOR);
  const tt = 75.1;
  const ov = [280 - c0[0], 582 - c0[1]]; const ol = Math.hypot(ov[0], ov[1]); const on = [ov[0] / ol * 20, ov[1] / ol * 20];
  eto(POL5.tx, tt, tt + 0.38, on[0]); POL5.tx.key(tt + 0.5, 0, 'soft');
  eto(POL5.ty, tt, tt + 0.38, on[1]); POL5.ty.key(tt + 0.5, 0, 'soft');
  eto(POL5.r, tt, tt + 0.38, 1.5); POL5.r.key(tt + 0.5, 0, 'soft');
  CARD5.ty.key(tt + 0.1, -760, 'step'); CARD5.ty.key(tt + 0.48, 22, 'soft'); CARD5.ty.key(tt + 0.6, 0, 'soft');
  CARD5.r.key(tt + 0.1, -6, 'step'); CARD5.r.key(tt + 0.6, 0, 'soft');
  const cornerAt = t => POL5.pointAt(t, cornerLocal[0], cornerLocal[1]);
  to('sy', tt, tt + 0.15, 1.1); to('sx', tt, tt + 0.15, 0.92);   // il s'étire en tirant
  T('x').seg(74.8, tt + 0.5, t => feetFromCorner(cornerAt(t), t)[0]);
  T('y').seg(74.8, tt + 0.5, t => feetFromCorner(cornerAt(t), t)[1]);
  const fEnd = feetFromCorner(cornerAt(tt + 0.5), tt + 0.5);
  set('x', tt + 0.5, fEnd[0]); set('y', tt + 0.5, fEnd[1]);
  to('sy', tt + 0.38, tt + 0.5, 1); to('sx', tt + 0.38, tt + 0.5, 1);
  // t+0.5 il lâche, tombe, trébuche, remet son chapeau, s'assoit
  arm('L', tt + 0.5, tt + 0.75, 'down');
  jump(tt + 0.5, 0.42, BLX, FLOOR, 0, { squash: 0.72 });
  const tl5 = tt + 0.92;
  to('rot', tl5, tl5 + 0.12, -9); to('rot', tl5 + 0.2, tl5 + 0.5, 0, 'pop');
  to('hatTilt', tl5, tl5 + 0.12, -12, 'pop');
  arm('L', tl5 + 0.25, tl5 + 0.45, 'hatfix'); to('hatTilt', tl5 + 0.45, tl5 + 0.62, 0);
  arm('L', tl5 + 0.66, tl5 + 0.9, 'down');
  face(75.6, 'neutre');
  to('gx', 76.3, 76.7, 9); to('gy', 76.3, 76.7, -9);
  to('sit', 77.0, 77.45, 1, 'soft'); to('float', 77.0, 77.45, 2);
  to('hr', 80.0, 80.5, 3); to('hr', 84.3, 84.8, -2); to('hr', 88.0, 88.5, 2);
  face(91.0, 'reflechit'); to('gx', 91.0, 91.3, 0); to('gy', 91.0, 91.3, 0); to('hr', 91.0, 91.4, 0);
  face(93.0, 'sceptique');
  face(105.5, 'neutre'); to('gx', 105.5, 105.9, 9); to('gy', 105.5, 105.9, -9);
  to('hr', 108.0, 108.4, 4); to('hr', 111.5, 111.9, 0);
  // 113.4 [CLAQUE] globe filaire
  face(113.4, 'curieux');
  claque(113.4, [GLOBE], { sat: false, noPop: true });
  GLOBE.s.key(113.45, 0.86, 'step'); GLOBE.s.key(113.9, 1, 'soft');
  to('gx', 113.5, 113.9, 12); to('gy', 113.5, 113.9, -6); to('hr', 113.5, 113.9, 3);
  face(119.3, 'reflechit'); to('gx', 119.3, 119.6, 0); to('gy', 119.3, 119.6, 0); to('hr', 119.3, 119.6, 0);
  // 121.5 [ÉCRASE] sur la carte : carte, polaroid et globe sortent par le bas
  to('sit', 120.95, 121.2, 0); to('float', 120.95, 121.2, 6);
  face(121.3, 'neutre');
  ecrase(121.5, CARD5, [POL5, GLOBE], 720, 400, [BLX, FLOOR], { stagger: 0.05, fast: true });

  /* ---------- SCÈNE 6 · 122.1–151.3 ---------- */
  claque(122.1, [VIDEO]);
  face(122.1, 'neutre');
  to('gx', 122.8, 123.2, 5); to('gy', 122.8, 123.2, -10);
  // 127.0 La Source
  hitstop(127.0, 0.15);
  face(127.0, 'surpris');
  to('sy', 127.0, 127.06, 1.06); to('sy', 127.06, 127.4, 1, 'pop');
  to('gy', 127.0, 127.2, -13);
  // 129.0 il se tourne face caméra
  face(129.0, 'neutre');
  to('gx', 129.0, 129.4, 0); to('gy', 129.0, 129.4, 0); to('hr', 129.0, 129.4, 0);
  face(130.4, 'curieux');
  face(135.2, 'reflechit');
  to('speed', 138.1, 143.5, 0.35, 'soft');
  // 140.5 il s'assoit, les yeux se ferment
  to('sit', 140.5, 141.3, 1, 'soft'); to('float', 140.5, 141.3, 2);
  to('lid', 140.8, 143.3, 0.28, 'io');
  face(143.5, 'endormi'); set('lid', 143.5, 1);

  /* ---------- SCÈNE 7 · 151.3–159.0 ---------- */
  hitstop(151.3, 0.15);
  to('y', 151.45, 152.25, 1235); to('x', 151.75, 152.9, 540); to('s', 151.6, 152.9, 1.0);   // il s'élève d'abord, puis glisse au centre (sans passer sur le texte)
  T('groundY').seg(151.45, 160, t => T('y').at(t));
  face(152.0, 'eveil');
  to('rOpen', 152.0, 153.1, 1, 'io');
  to('rOpen', 157.0, 157.07, 0.05, 'qin'); to('rOpen', 157.07, 157.24, 1, 'soft');
}

/* ================= RENDU D'UNE IMAGE ================= */
function renderWorld(t, ta) {
  const f = E.soft(clamp((ta - 151.3) / 1.0));
  attr($('bgFade'), 'opacity', 0.82 * f);
  renderDecor(ta);
  for (const id of ['L-world', 'L-back', 'L-front']) attr($(id), 'opacity', 1 - f);
  for (const e of ELS) e.apply(ta);
  for (const k in WIG) wiggle(WIG[k], ta);
  renderMosaic(ta); renderPixGrid(t);
  renderSourceText(ta); renderBubble(ta);
}
let DEBUG = false;
function renderFrame(i) {
  const t = i / FPS, ta = warp(t);
  renderWorld(t, ta);
  renderRobot(t, ta);
  renderKey(ta);
  if (DEBUG) {
    const d = $('L-debug'); d.textContent = '';
    const tx = mk('text', { x: 20, y: 60, 'font-family': 'IBM Plex Mono', 'font-size': 34, fill: '#FFFF00' }, d);
    tx.textContent = `t=${t.toFixed(2)}  face=${faceState(robotTime(t, ta)).n}`;
  }
}

async function init() {
  await document.fonts.load('700 60px Fredoka');
  await document.fonts.load('700 58px "Space Grotesk"');
  await document.fonts.load('500 30px "IBM Plex Mono"');
  await document.fonts.ready;
  buildDecor();
  buildWorld();
  buildRobot();
  buildKey();
  buildTimeline();
  buildFaces();
  buildHitstops();
  buildPhase();
  buildSpeech();
  buildSourceText();
  await Promise.all(Array.from(document.images || []).map(im => im.decode ? im.decode().catch(() => {}) : null));
  window.renderFrame = renderFrame;
  window.renderAt = t => renderFrame(Math.round(t * FPS));
  window.setDebug = on => { DEBUG = on; if (!on) $('L-debug').textContent = ''; };
  window.REEL = { FPS, DURATION, frames: Math.round(DURATION * FPS) };
  renderFrame(0);
  window.REEL_READY = true;
}
init();
})();
