// PARANO-IA — bande-annonce : moteur commun (outils, temps, caméra, robot officiel, personnages, textes).
// Tout est déterministe : renderAt(t) ne dépend que de t (rendu parallèle, flou de bougé par sous-images).
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const W = 1080, H = 1920, FPS = 30;
const INK = '#1B1620', GREEN = '#4DFF8F';
const BEAT = 60 / 118;            // tempo de la musique (deep tech, 118 BPM)
const TD = 3 * BEAT;              // le drop : la mobylette démarre
const beat = k => TD + k * BEAT;  // instant du k-ième temps après le drop
const DURATION = 14.0;

const $ = id => document.getElementById(id);
const PI2 = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, q) => a + (b - a) * q;
const r2 = x => Math.round(x * 100) / 100;
function mk(tag, attrs, parent) {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}
function g(parent, attrs) { return mk('g', attrs, parent); }
function markup(parent, str) {
  const tmp = new DOMParser().parseFromString(`<svg xmlns="${NS}">${str}</svg>`, 'image/svg+xml');
  const out = [];
  for (const n of [...tmp.documentElement.childNodes]) { const c = document.importNode(n, true); parent.appendChild(c); out.push(c); }
  return out;
}
function attr(el, k, v) { const s = typeof v === 'number' ? String(r2(v)) : v; if (el.getAttribute(k) !== s) el.setAttribute(k, s); }
function vis(el, on) { const d = on ? '' : 'none'; if (el.style.display !== d) el.style.display = d; }
function tr(el, x, y, s = 1, rot = 0, sx = 1, sy = 1) {
  attr(el, 'transform', `translate(${r2(x)} ${r2(y)})${rot ? ` rotate(${r2(rot)})` : ''}${s !== 1 || sx !== 1 || sy !== 1 ? ` scale(${r2(s * sx)} ${r2(s * sy)})` : ''}`);
}

/* ----- courbes d'animation ----- */
function cubicBezier(x1, y1, x2, y2) {
  return p => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const x = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t - p;
      const d = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(x) < 1e-5 || !d) break; t -= x / d;
    }
    t = clamp(t);
    return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  };
}
const E = {
  lin: p => clamp(p),
  soft: cubicBezier(0.45, 0, 0.25, 1),
  out: cubicBezier(0.16, 1, 0.3, 1),        // départ vif, arrivée douce (style « Apple »)
  in: cubicBezier(0.7, 0, 0.84, 0),
  io: cubicBezier(0.65, 0, 0.35, 1),
  back: cubicBezier(0.34, 1.56, 0.64, 1),   // léger dépassement
  pop: p => { p = clamp(p); return p < 1 ? 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 2.2) : 1; },
};
const seg = (t, a, b) => clamp((t - a) / (b - a));
const pulse = (t, a, d) => { const u = (t - a) / d; return u < 0 || u > 1 ? 0 : Math.sin(u * Math.PI); };
const smooth = (x) => x * x * (3 - 2 * x);

/* ----- hasard reproductible ----- */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(t, seed = 0) {   // bruit lisse 1D
  const i = Math.floor(t), f = t - i, a = hash(i + seed * 97), b = hash(i + 1 + seed * 97);
  return lerp(a, b, smooth(f)) * 2 - 1;
}

/* ----- spline monotone (caméra) : pas de dépassement entre les clés ----- */
function monotone(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]);
  return t => {
    if (t <= xs[0]) return ys[0] + m[0] * (t - xs[0]);
    if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]);
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
}

/* ================= ROBOT DÉTECTIVE (pièces officielles de index.html) ================= */
const FACES = {   // expressions officielles (fiche personnage), comme dans reel-la-source/reel.js
  neutre: { sw: 6, L: '<ellipse cx="-30" cy="-96" rx="11" ry="15" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="30" cy="-96" rx="16" ry="21" fill="#4DFF8F" stroke="none"/>', X: '', M: '<rect x="-12" y="-62" width="24" height="6" rx="3" fill="#4DFF8F" stroke="none"/>' },
  curieux: { sw: 6, L: '<path d="M -42 -94 Q -30 -106 -18 -94"/>', R: '<ellipse cx="30" cy="-96" rx="20" ry="25" fill="#4DFF8F" stroke="none"/>', X: '<path d="M 10 -134 Q 30 -146 50 -136" stroke-width="5"/>', M: '<path d="M -10 -58 Q 2 -54 14 -62" stroke-width="5"/>' },
  surpris: { sw: 5, L: '<circle cx="-30" cy="-96" r="13" fill="#4DFF8F" stroke="none"/>', R: '<circle cx="30" cy="-96" r="22" fill="#4DFF8F" stroke="none"/>', X: '<path d="M -42 -124 Q -30 -134 -18 -124"/><path d="M 10 -138 Q 30 -150 50 -138"/>', M: '<ellipse cx="0" cy="-54" rx="7" ry="9"/>' },
  satisfait: { sw: 6, L: '<path d="M -42 -90 L -30 -102 L -18 -90"/>', R: '<path d="M 12 -88 L 30 -108 L 48 -88"/>', X: '', M: '<path d="M -14 -62 Q 0 -50 14 -62" stroke-width="5"/>' },
  sceptique: { sw: 5, L: '<ellipse cx="-30" cy="-92" rx="10" ry="7" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="30" cy="-96" rx="16" ry="21" fill="#4DFF8F" stroke="none"/>', X: '<path d="M -44 -104 L -16 -102"/><path d="M 10 -136 Q 30 -150 50 -138"/>', M: '<path d="M -4 -58 L 18 -61"/>' },
  perplexe: { sw: 5, L: '<ellipse cx="-30" cy="-94" rx="10" ry="12" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="30" cy="-94" rx="14" ry="17" fill="#4DFF8F" stroke="none"/>', X: '<path d="M -44 -121 L -18 -114"/><path d="M 12 -134 L 48 -142"/>', M: '<path d="M -18 -58 Q -12 -64 -6 -58 Q 0 -52 6 -58 Q 12 -64 18 -58"/>' },
  reflechit: { sw: 5, L: '<ellipse cx="-36" cy="-106" rx="9" ry="13" fill="#4DFF8F" stroke="none"/>', R: '<ellipse cx="22" cy="-108" rx="13" ry="17" fill="#4DFF8F" stroke="none"/>', X: '<circle cx="-56" cy="-60" r="2.5" fill="#4DFF8F" stroke="none"/><circle cx="-48" cy="-60" r="2.5" fill="#4DFF8F" stroke="none"/><circle cx="-40" cy="-60" r="2.5" fill="#4DFF8F" stroke="none"/>', M: '<path d="M 2 -58 L 18 -61"/>' },
  endormi: { sw: 5, L: '<path d="M -42 -96 Q -30 -88 -18 -96"/>', R: '<path d="M 12 -96 Q 30 -86 48 -96"/>', X: '', M: '<rect x="-8" y="-60" width="16" height="4" rx="2" fill="#4DFF8F" stroke="none"/>' },
};

function makeArm(parent) {
  const a = g(parent);
  return {
    g: a,
    o: mk('path', { fill: 'none', stroke: INK, 'stroke-width': 34, 'stroke-linecap': 'round' }, a),
    f: mk('path', { fill: 'none', stroke: '#C8A97E', 'stroke-width': 23, 'stroke-linecap': 'round' }, a),
    h: mk('circle', { r: 14, fill: '#C9D1D9', stroke: INK, 'stroke-width': 5 }, a),
  };
}
function setArm(A, p) {   // p = [épaule x, y, contrôle x, y, main x, y]
  if (!p) { vis(A.g, false); return; }
  vis(A.g, true);
  const d = `M ${r2(p[0])} ${r2(p[1])} Q ${r2(p[2])} ${r2(p[3])} ${r2(p[4])} ${r2(p[5])}`;
  attr(A.o, 'd', d); attr(A.f, 'd', d);
  const hx = p[4] + (p[4] - p[2]) * 0.12, hy = p[5] + (p[5] - p[3]) * 0.12;
  attr(A.h, 'cx', hx); attr(A.h, 'cy', hy);
}

// Un robot = une instance indépendante (on peut en avoir deux : normal et « au crayon »).
function makeRobot(parent, opt = {}) {
  const R = { opt };
  R.root = g(parent);
  R.body = g(R.root);
  R.armBackL = makeArm(R.body); R.armBackR = makeArm(R.body);
  R.feetStand = mk('use', { href: '#rb-feet' }, R.body);
  R.feetSit = g(R.body);
  R.footL = mk('rect', { x: -20, y: -15, width: 40, height: 30, rx: 14, fill: '#3A3F4B', stroke: INK, 'stroke-width': 5 }, R.feetSit);
  R.footR = mk('rect', { x: -20, y: -15, width: 40, height: 30, rx: 14, fill: '#3A3F4B', stroke: INK, 'stroke-width': 5 }, R.feetSit);
  R.coat = mk('use', { href: '#rb-coat-body' }, R.body);
  R.head = g(R.body);
  mk('use', { href: '#rb-head' }, R.head);
  R.face = g(R.head);
  R.faces = {};
  for (const n in FACES) {
    const F = FACES[n];
    const fg = g(R.face, { filter: 'url(#glow)', fill: 'none', stroke: GREEN, 'stroke-width': F.sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const eL = g(fg), eR = g(fg), fx = g(fg), fm = g(fg);
    markup(eL, F.L); markup(eR, F.R); markup(fx, F.X); markup(fm, F.M);
    vis(fg, false);
    R.faces[n] = { g: fg, eL, eR };
  }
  R.loupe = g(R.body); mk('use', { href: '#loupe' }, R.loupe); vis(R.loupe, false);
  R.armFrontL = makeArm(R.body); R.armFrontR = makeArm(R.body);
  R.hat = g(R.body);
  mk('use', { href: '#rb-antenna' }, g(R.hat)); mk('use', { href: '#rb-hat' }, R.hat);
  R.armTopL = makeArm(R.body); R.armTopR = makeArm(R.body);
  R.cur = null;
  return R;
}
const ARMS = {   // poses de bras (repère du robot : cou en 0,0 ; pieds vers y 166)
  down: { L: [-62, 40, -90, 72, -96, 108], R: [62, 40, 90, 72, 96, 108] },
  ride: { L: [-60, 42, 30, 84, 114, 52], R: [60, 42, 104, 80, 130, 54] },   // mains sur le guidon (vers la droite)
  wave: { L: [-62, 40, -90, 72, -96, 108], R: [62, 40, 130, 10, 120, -120] },
  loupe: { L: [-62, 40, -90, 72, -96, 108], R: [62, 40, 118, 40, 112, -92] },
  cheer: { L: [-62, 40, -140, 0, -122, -120], R: [62, 40, 140, 0, 122, -120] },
  hat: { L: [-62, 40, -90, 72, -96, 108], R: [62, 40, 150, -40, 60, -200] },
};
// état : {x, y, s, rot, sx, sy, face, blink, look:[dx,dy], arms:{L,R,layerL,layerR}, sit, hatLift, hatRot, loupe}
function poseRobot(R, st) {
  tr(R.root, st.x, st.y, st.s || 1, st.rot || 0, st.sx || 1, st.sy || 1);
  const sit = !!st.sit;
  vis(R.feetStand, !sit); vis(R.feetSit, sit);
  if (sit) {
    const f = st.feet || [[-44, 196, -10], [46, 200, 12]];
    attr(R.footL, 'transform', `translate(${f[0][0]} ${f[0][1]}) rotate(${f[0][2]})`);
    attr(R.footR, 'transform', `translate(${f[1][0]} ${f[1][1]}) rotate(${f[1][2]})`);
  }
  // visage
  const face = st.face || 'neutre';
  if (face !== R.cur) { for (const n in R.faces) vis(R.faces[n].g, n === face); R.cur = face; }
  const F = R.faces[face], b = st.blink ?? 1, lk = st.look || [0, 0];
  attr(F.eL, 'transform', `translate(${lk[0]} ${lk[1]}) translate(-30 -96) scale(1 ${r2(b)}) translate(30 96)`);
  attr(F.eR, 'transform', `translate(${lk[0]} ${lk[1]}) translate(30 -96) scale(1 ${r2(b)}) translate(-30 96)`);
  attr(R.head, 'transform', `rotate(${r2(st.headRot || 0)} 0 -10)`);
  // bras : couche de dessin choisie selon la pose
  const A = st.arms || ARMS.down, lay = st.armLayer || {};
  const put = (side, p, layer) => {
    for (const [ly, arm] of [['back', R['armBack' + side]], ['front', R['armFront' + side]], ['top', R['armTop' + side]]]) setArm(arm, ly === layer ? p : null);
  };
  put('L', A.L, lay.L || (sit ? 'back' : 'front'));
  put('R', A.R, lay.R || 'front');
  vis(R.loupe, !!st.loupe);
  const hl = st.hatLift || 0;
  attr(R.hat, 'transform', hl || st.hatRot ? `translate(${r2(hl * 40)} ${r2(-hl * 70)}) rotate(${r2(st.hatRot || -hl * 18)} 0 -190)` : '');
}
// clignements réguliers (temps réel)
function blinkAt(t, seed = 3) {
  const per = 2.6, ph = (t + seed * 0.37) % per;
  if (ph < 0.06) return 1 - 0.92 * (ph / 0.06);
  if (ph < 0.16) return 0.08 + 0.92 * smooth((ph - 0.06) / 0.1);
  return 1;
}

/* ================= PERSONNAGES (habitants, clients, employés…) ================= */
const SKINS = ['#F2C9A5', '#E0A57A', '#B97A4E', '#8A5536', '#5E3A24', '#F5D6BD'];
const HAIRS = ['#2B1B12', '#5A3822', '#C9892F', '#1A1A1A', '#8C8C8C', '#A63A1F', '#E8D29A'];
// Personnage simple (buste ou en pied), contour encre comme le robot. kind : 'sip' | 'read' | 'eat' | 'toast' |
// 'phone' | 'wave' | 'walk' | 'type' | 'clap' | 'cheer' | 'idle'. Hauteur ≈ 150 unités (en pied) × s.
function makePerson(parent, o) {
  const P = { o, g: g(parent) };
  const R = rng(o.seed || 1);
  const skin = o.skin || SKINS[Math.floor(R() * SKINS.length)];
  const hair = o.hair || HAIRS[Math.floor(R() * HAIRS.length)];
  const shirt = o.shirt || ['#E4572E', '#29335C', '#F3A712', '#669BBC', '#A8C686', '#D1495B', '#00798C', '#EDAE49'][Math.floor(R() * 8)];
  const pants = o.pants || ['#2E2E3A', '#3C4F76', '#5C4033', '#1F2A44'][Math.floor(R() * 4)];
  const sw = o.sw ?? 4, ink = o.ink || INK;
  P.inner = g(P.g);
  const full = o.full !== false;
  if (full) {
    P.legL = mk('path', { d: 'M -10 40 L -12 92', stroke: ink, 'stroke-width': 17, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
    P.legL2 = mk('path', { d: 'M -10 40 L -12 92', stroke: pants, 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
    P.legR = mk('path', { d: 'M 10 40 L 12 92', stroke: ink, 'stroke-width': 17, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
    P.legR2 = mk('path', { d: 'M 10 40 L 12 92', stroke: pants, 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
  }
  P.armB = mk('path', { stroke: ink, 'stroke-width': 13, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
  P.armB2 = mk('path', { stroke: shirt, 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
  mk('path', { d: 'M -24 44 Q -26 -8 0 -12 Q 26 -8 24 44 Z', fill: shirt, stroke: ink, 'stroke-width': sw, 'stroke-linejoin': 'round' }, P.inner);
  if (o.tie) mk('path', { d: 'M 0 -10 L -5 12 L 0 22 L 5 12 Z', fill: o.tie, stroke: ink, 'stroke-width': 2 }, P.inner);
  P.head = g(P.inner);
  mk('circle', { cx: 0, cy: -34, r: 21, fill: skin, stroke: ink, 'stroke-width': sw }, P.head);
  const hs = Math.floor(R() * 4);
  const hairD = [
    'M -21 -36 Q -22 -60 0 -58 Q 22 -60 21 -36 Q 12 -50 -4 -48 Q -14 -46 -21 -36 Z',
    'M -22 -30 Q -26 -62 0 -60 Q 26 -62 22 -30 Q 22 -44 12 -50 Q -8 -40 -22 -30 Z',
    'M -23 -34 Q -24 -58 0 -58 Q 24 -58 23 -34 L 24 -4 Q 16 -20 14 -44 Q -2 -40 -14 -46 Q -18 -20 -24 -4 Z',
    'M -18 -46 Q -10 -62 4 -58 Q 20 -56 20 -42 Q 6 -52 -18 -46 Z',
  ][hs];
  mk('path', { d: hairD, fill: hair, stroke: ink, 'stroke-width': sw * 0.75, 'stroke-linejoin': 'round' }, P.head);
  P.eyes = g(P.head, { fill: ink });
  mk('circle', { cx: -7, cy: -34, r: 2.6 }, P.eyes); mk('circle', { cx: 7, cy: -34, r: 2.6 }, P.eyes);
  P.mouth = mk('path', { d: 'M -6 -24 Q 0 -20 6 -24', fill: 'none', stroke: ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, P.head);
  if (o.glasses) markup(P.head, `<g fill="none" stroke="${ink}" stroke-width="2.5"><circle cx="-8" cy="-34" r="6"/><circle cx="8" cy="-34" r="6"/><path d="M -2 -34 L 2 -34"/></g>`);
  P.prop = g(P.inner);
  P.armF = mk('path', { stroke: ink, 'stroke-width': 13, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
  P.armF2 = mk('path', { stroke: shirt, 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, P.inner);
  P.hand = mk('circle', { r: 6, fill: skin, stroke: ink, 'stroke-width': 2.5 }, P.inner);
  // accessoires
  const k = o.kind || 'idle';
  if (k === 'sip') {
    markup(P.prop, `<g id="cup"><path d="M -9 -9 L 9 -9 L 7 9 L -7 9 Z" fill="#F4EFE6" stroke="${ink}" stroke-width="2.5"/><path d="M 9 -5 Q 16 -3 9 4" fill="none" stroke="${ink}" stroke-width="2.5"/></g>`);
    P.steam = g(P.prop, { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.8 });
    P.steamP = [0, 1].map(() => mk('path', {}, P.steam));
  } else if (k === 'read') {
    markup(P.prop, `<g><path d="M -34 -10 L 0 -16 L 34 -10 L 34 30 L 0 24 L -34 30 Z" fill="#EDE8DC" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/><path d="M 0 -16 L 0 24" stroke="${ink}" stroke-width="2"/><g stroke="#8A857A" stroke-width="2.4"><path d="M -28 -2 L -6 -5"/><path d="M -28 6 L -6 3"/><path d="M -28 14 L -10 11"/><path d="M 6 -5 L 28 -2"/><path d="M 6 3 L 28 6"/><path d="M 6 11 L 24 14"/></g></g>`);
  } else if (k === 'phone') {
    markup(P.prop, `<g><rect x="-7" y="-13" width="14" height="24" rx="3" fill="#20242E" stroke="${ink}" stroke-width="2.5"/><rect x="-5" y="-10" width="10" height="17" rx="1.5" fill="#7FD6FF"/></g>`);
    P.flash = mk('circle', { r: 26, fill: 'url(#dot)', opacity: 0 }, P.prop);
  } else if (k === 'toast') {
    markup(P.prop, `<g><path d="M -7 -14 L 7 -14 L 4 0 L -4 0 Z" fill="#F7D35C" fill-opacity="0.85" stroke="${ink}" stroke-width="2.2"/><path d="M 0 0 L 0 10 M -5 11 L 5 11" stroke="${ink}" stroke-width="2.2"/></g>`);
  } else if (k === 'eat') {
    markup(P.prop, `<path d="M 0 -14 L 0 8 M -3 -14 L -3 -6 M 3 -14 L 3 -6" stroke="#B9C0C9" stroke-width="2.4" stroke-linecap="round"/>`);
  } else if (k === 'type') {
    markup(P.prop, `<g><path d="M -28 18 L 28 18 L 22 -14 L -22 -14 Z" fill="#C9D1D9" stroke="${ink}" stroke-width="2.5"/><path d="M -18 -10 L 18 -10 L 22 14 L -22 14 Z" fill="#7FD6FF" opacity="0.7"/></g>`);
  }
  P.skin = skin;
  return P;
}
function updatePerson(P, t, ox, oy, s = 1, flip = 1) {
  const o = P.o, k = o.kind || 'idle', ph = (t * (o.speed || 1) + (o.seed || 1) * 0.713) % 1;
  let bob = 0, head = 0;
  // bras de derrière pendant, bras de devant selon l'action
  let af = [16, -2, 26, 24, 22, 44], ab = [-16, -2, -26, 24, -22, 44], prop = null, legs = 0;
  if (k === 'sip') {
    const up = smooth(clamp(Math.sin(ph * PI2) * 1.6 + 0.2));
    const hx = lerp(26, 10, up), hy = lerp(30, -26, up);
    af = [16, -2, 30, 20, hx, hy]; prop = [hx, hy - 4, lerp(0, -18, up)]; head = up * 6;
    const u = t * 0.9;
    P.steamP.forEach((p, i) => { const q = (u + i * 0.5) % 1; attr(p, 'd', `M ${-3 + i * 6} ${-14 - q * 26} q 6 -6 0 -12 q -6 -6 0 -12`); attr(p, 'opacity', (1 - q) * (1 - up)); });
  } else if (k === 'read') {
    const turn = Math.sin(ph * PI2) > 0.92 ? 1 : 0;
    af = [16, -2, 30, 10, 20, 8]; ab = [-16, -2, -30, 10, -20, 8]; prop = [0, 6, turn * 4]; head = Math.sin(t * 2 + o.seed) * 3;
  } else if (k === 'eat') {
    const up = smooth(clamp(Math.sin(ph * PI2 * 1.3) * 1.4));
    af = [16, -2, 28, 22, lerp(26, 6, up), lerp(30, -20, up)]; prop = [lerp(26, 6, up), lerp(30, -20, up) - 8, -20];
    attr(P.mouth, 'd', up > 0.7 ? 'M -5 -24 Q 0 -18 5 -24 Z' : 'M -6 -24 Q 0 -20 6 -24');
  } else if (k === 'toast') {
    const up = smooth(clamp(Math.sin(ph * PI2) * 1.3 + 0.4));
    af = [16, -2, 34, -6, lerp(30, 40, up), lerp(10, -30, up)]; prop = [lerp(30, 40, up), lerp(10, -30, up) - 8, 0];
  } else if (k === 'phone') {
    af = [16, -2, 34, -10, 30, -40]; prop = [30, -48, 0];
    const f = (t * 1.3 + o.seed * 0.31) % 1; attr(P.flash, 'opacity', f < 0.08 ? 1 - f / 0.08 : 0); head = -4;
  } else if (k === 'wave') {
    const w = Math.sin(t * 14 + o.seed) * 0.5 + 0.5;
    af = [16, -2, 40, -20, lerp(28, 46, w), -58];
  } else if (k === 'clap' || k === 'cheer') {
    const c = Math.abs(Math.sin(t * (k === 'clap' ? 11 : 7) + o.seed));
    if (k === 'clap') { af = [16, -2, 22, 10, lerp(2, 14, c), 6]; ab = [-16, -2, -22, 10, lerp(-2, -14, c), 6]; }
    else { af = [16, -2, 34, -30, 30, lerp(-58, -70, c)]; ab = [-16, -2, -34, -30, -30, lerp(-58, -70, c)]; bob = -c * 6; }
  } else if (k === 'type') {
    const c = Math.sin(t * 22 + o.seed) * 3;
    af = [16, -2, 24, 16, 14 + c, 14]; ab = [-16, -2, -24, 16, -14 - c, 14]; prop = [0, 22, 0]; head = 6;
  } else if (k === 'walk') {
    const w = Math.sin(ph * PI2 * 2);
    legs = w; bob = -Math.abs(w) * 4;
    af = [16, -2, 20 + w * 8, 22, 18 + w * 14, 42]; ab = [-16, -2, -20 - w * 8, 22, -18 - w * 14, 42];
  } else {
    bob = Math.sin(t * 2.2 + o.seed) * 1.5;
  }
  const d = p => `M ${p[0]} ${p[1]} Q ${p[2]} ${p[3]} ${p[4]} ${p[5]}`;
  attr(P.armF, 'd', d(af)); attr(P.armF2, 'd', d(af)); attr(P.armB, 'd', d(ab)); attr(P.armB2, 'd', d(ab));
  attr(P.hand, 'cx', af[4]); attr(P.hand, 'cy', af[5]);
  if (prop) attr(P.prop, 'transform', `translate(${r2(prop[0])} ${r2(prop[1])}) rotate(${r2(prop[2])})`);
  attr(P.head, 'transform', `rotate(${r2(head)} 0 -14)`);
  if (P.legL) {
    const a = legs * 12;
    for (const [el, sg] of [[P.legL, -1], [P.legL2, -1], [P.legR, 1], [P.legR2, 1]]) attr(el, 'd', `M ${sg * 10} 40 L ${sg * 11 + (sg < 0 ? a : -a)} 92`);
  }
  attr(P.g, 'transform', `translate(${r2(ox)} ${r2(oy + bob * s)}) scale(${r2(s * flip)} ${r2(s)})`);
}

/* ----- petits outils de décor ----- */
function rectGrad(defs, id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
  const gr = mk('linearGradient', { id, x1, y1, x2, y2 }, defs);
  for (const [o, c, a] of stops) mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': a ?? 1 }, gr);
  return gr;
}
function radGrad(defs, id, stops, cx = 0.5, cy = 0.5, r = 0.5) {
  const gr = mk('radialGradient', { id, cx, cy, r }, defs);
  for (const [o, c, a] of stops) mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': a ?? 1 }, gr);
  return gr;
}
const DEFS = () => document.querySelector('#stage defs');

/* ----- textes « bande-annonce » : mots qui claquent ('\n' = nouvelle ligne) ----- */
function makeCaption(parent, words, o) {
  const C = { g: g(parent), words: [], o };
  const fs = o.size || 96;
  const tmp = []; let line = 0;
  for (const w of words) {
    if (w === '\n') { line++; continue; }
    const wg = g(C.g);
    const tx = mk('text', { x: 0, y: 0, 'font-family': o.font || 'Space Grotesk', 'font-weight': 700, 'font-size': fs, fill: o.fill || '#FFFFFF', 'text-anchor': 'start', 'letter-spacing': o.spacing ?? -1 }, wg);
    if (o.stroke) { attr(tx, 'stroke', o.stroke); attr(tx, 'stroke-width', o.strokeW || 10); attr(tx, 'paint-order', 'stroke'); attr(tx, 'stroke-linejoin', 'round'); }
    if (o.filter) attr(tx, 'filter', o.filter);
    tx.textContent = w;
    tmp.push({ wg, tx, line });
  }
  C.lines = line + 1;
  C.layout = () => {   // à appeler une fois les polices chargées
    const gap = fs * 0.26, lh = fs * (o.lineH || 1.02);
    C.words = [];
    for (let L = 0; L < C.lines; L++) {
      const ws = tmp.filter(w => w.line === L), widths = ws.map(w => w.tx.getComputedTextLength());
      const total = widths.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      let x = -total / 2;
      ws.forEach((w, i) => { attr(w.tx, 'x', r2(-widths[i] / 2)); C.words.push({ wg: w.wg, x: x + widths[i] / 2, y: (L - (C.lines - 1) / 2) * lh, w: widths[i] }); x += widths[i] + gap; });
    }
  };
  return C;
}
// entrée : chaque mot surgit (échelle 1.7 → 1) décalé de dt ; sortie : glissement + fondu
function updateCaption(C, t, t0, t1, cx, cy, o = {}) {
  const on = t >= t0 - 0.05 && t <= t1 + 0.2;
  vis(C.g, on); if (!on) return;
  const dt = o.stagger ?? 0.07;
  C.words.forEach((w, i) => {
    const p = seg(t, t0 + i * dt, t0 + i * dt + 0.22), q = seg(t, t1 - 0.12, t1 + 0.12);
    const s = lerp(o.from ?? 1.7, 1, E.out(p)) * (1 + 0.03 * Math.sin((t - t0) * 9 + i));
    const x = cx + w.x + (o.slide ?? -90) * E.in(q), y = cy + w.y + (o.rise ?? 0) * (1 - E.out(p));
    attr(w.wg, 'transform', `translate(${r2(x)} ${r2(y)}) scale(${r2(s)}) rotate(${r2((o.tilt ?? 0) * (1 - E.out(p)))})`);
    attr(w.wg, 'opacity', r2(clamp(p * 3) * (1 - q)));
  });
}
