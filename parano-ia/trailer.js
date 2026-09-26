// PARANO-IA — bande-annonce 14 s : un plan-séquence de gauche à droite à travers les mondes de l'IA.
// Chaque monde défile lentement puis la caméra « fouette » au temps fort : le robot franchit la couture
// et prend le style du monde suivant (la moitié avant d'abord). Coupes calées sur la musique (118 BPM).
'use strict';
const XR = 400;                       // position écran du robot
const RS = 0.78;                      // échelle du pilote
const RY = 1400 - GROUND * RS;        // origine du pilote (roues au sol à y 1400)
const V = 330, PRE = 0.17, POST = 0.12, AHEAD = 760, AFTER = 420;

// mondes du plan-séquence : [objet, temps (en temps musicaux) où le robot y entre]
const SEQ = [
  { w: () => CITY, k: null, face: 'curieux', look: [10, -6], rider: {} },
  { w: () => CYBER, k: 4, face: 'surpris', look: [10, -4], rider: { under: 0.85, underColor: '#19F0FF', beam: 0.8, puff: '#9A7BFF' } },
  { w: () => DRAW, k: 7, face: 'satisfait', look: [8, 0], rider: { filter: 'sketchFx', beam: 0, puff: '#6E6A62', puffStroke: '#3A3A3A', puffAlpha: 0.45 } },
  { w: () => CORP, k: 10, face: 'sceptique', look: [12, -8], rider: { beam: 0.3 } },
  { w: () => CANDY, k: 13, face: 'satisfait', look: [8, 0], rider: { wheels: 'donut', beam: 0.3, puff: '#FFC1E3', puffAlpha: 0.75 } },
  { w: () => APOC, k: 15, face: 'surpris', look: [12, -10], rider: { flames: 1, beam: 0.9, puff: '#3A2A2A', puffAlpha: 0.7 } },
];
const T_LINEUP = beat(18), T_TITLE = beat(20);

/* ----- caméra ----- */
let CAM = null, SEAMS = [];
function buildCamera() {
  const keys = [[0, 0], [TD - 0.02, 14], [TD + 0.32, 190]];
  let cxPrev = 190, tPrev = TD + 0.32;
  SEAMS = [];
  for (let i = 1; i < SEQ.length; i++) {
    const T = beat(SEQ[i].k);
    const cxPre = cxPrev + V * (T - PRE - tPrev);
    const S = cxPre + AHEAD + XR;
    keys.push([T - PRE, S - XR - AHEAD], [T, S - XR], [T + POST, S - XR + AFTER]);
    SEAMS.push({ i, T, S });
    cxPrev = S - XR + AFTER; tPrev = T + POST;
  }
  keys.push([T_LINEUP, cxPrev + V * (T_LINEUP - tPrev)], [T_LINEUP + 1, cxPrev + V * (T_LINEUP + 1 - tPrev)]);
  CAM = monotone(keys);
}
const camX = t => CAM(t);
function camSpeed(t) { return (CAM(t + 0.004) - CAM(t - 0.004)) / 0.008; }
function worldBounds(i) {   // coordonnées monde [début, fin] du monde i
  return [i === 0 ? -1e6 : SEAMS[i - 1].S, i === SEQ.length - 1 ? 1e7 : SEAMS[i].S];
}
function worldAt(t) { let w = 0; for (const s of SEAMS) if (t >= s.T) w = s.i; return w; }

/* ----- scène ----- */
const S = {};
function build() {
  buildCamera();
  const root = $('root');
  S.cam = g(root);                     // zoom / secousse
  S.worlds = g(S.cam);
  S.wg = SEQ.map((q, i) => {
    const cp = mk('clipPath', { id: 'clipW' + i, clipPathUnits: 'userSpaceOnUse' }, DEFS());
    const rect = mk('rect', { x: 0, y: -400, width: W, height: H + 800 }, cp);
    const gw = g(S.worlds, { 'clip-path': `url(#clipW${i})` });
    const [a, b] = worldBounds(i);
    let obj = null; try { obj = q.w(); } catch (e) { obj = null; }   // monde pas encore écrit
    const x0 = i === 0 ? 0 : a;   // origine du monde (le premier commence en 0)
    if (obj) { obj.x0 = x0; obj.build(gw, b - x0 > 1e6 ? 4000 : b - x0); }
    return { g: gw, rect, obj, a, b, x0 };
  });
  S.seamFx = g(S.cam);
  S.riders = SEQ.map((q, i) => {
    const cp = mk('clipPath', { id: 'clipR' + i, clipPathUnits: 'userSpaceOnUse' }, DEFS());
    const rect = mk('rect', { x: 0, y: -400, width: W, height: H + 800 }, cp);
    const P = makeRider(S.cam, q.rider);
    attr(P.wrap, 'clip-path', `url(#clipR${i})`);
    return { P, rect };
  });
  S.overlay = g(root);
  if (typeof buildSeams === 'function') buildSeams(S.seamFx);
  if (typeof LINEUP !== 'undefined') LINEUP.build(g(root));
  if (typeof TITLE !== 'undefined') TITLE.build(g(root));
  S.flash = mk('rect', { x: 0, y: 0, width: W, height: H, fill: '#FFFFFF', opacity: 0 }, root);
  S.captions = g(root);
  S.caps = [
    [['ELLES', 'TE', '\n', 'REGARDENT.'], 0.4, 3.6, { size: 128, fill: '#FFF4DE', stroke: '#2A1630', strokeW: 14 }],
    [['ELLES', '\n', "T'IMITENT."], 4.35, 6.7, { size: 132, fill: '#FF2E88', stroke: '#0B0620', strokeW: 12, filter: 'url(#rgbSplit)' }],
    [['ELLES', '\n', 'DESSINENT.'], 7.35, 9.7, { size: 128, font: 'Fredoka', fill: '#2E2B28', stroke: '#F2ECDD', strokeW: 10 }],
    [['ELLES', 'SE', '\n', 'DÉVORENT.'], 10.35, 12.75, { size: 128, fill: '#0E1B3D', stroke: '#FFFFFF', strokeW: 14 }],
    [['TROP', '\n', 'MIGNONNES…'], 13.25, 14.8, { size: 124, font: 'Fredoka', fill: '#FFFFFF', stroke: '#FF4FA3', strokeW: 16 }],
    [['ET', 'APRÈS', '?'], 15.35, 17.85, { size: 150, fill: '#FFE9D6', stroke: '#3A0606', strokeW: 16 }],
  ].map(([w, a, b, o]) => ({ C: makeCaption(S.captions, w, o), t0: beat(a), t1: beat(b), o }));
  S.grain = mk('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#grainFx)', opacity: 0.07 }, root);
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#vignette)' }, root);
}

/* ----- rendu d'un instant ----- */
function drawAt(t) {
  const cx = camX(t), sp = camSpeed(t);
  // intro : gros plan sur l'écran du robot puis recul brutal jusqu'au drop
  const k = E.io(seg(t, 0.72, TD - 0.06));
  const Z = lerp(2.9 - 0.12 * seg(t, 0, 0.72), 1, k);
  const head = [XR + 6, RY - 96 * RS];
  const ax = lerp(540, 540, k), ay = lerp(820, 960, k), bx = lerp(head[0], 540, k), by = lerp(head[1], 960, k);
  // temps forts : petite pulsation de zoom et secousse sur les coutures
  let punch = 0, shake = 0;
  if (t >= TD) for (let b = 0; b < 21; b++) { const d = t - beat(b); if (d >= 0 && d < 0.4) punch += 0.022 * Math.exp(-d / 0.09); }
  for (const s of SEAMS) { const d = t - s.T; if (d >= -0.02 && d < 0.35) { punch += 0.05 * Math.exp(-Math.max(0, d) / 0.1); shake += 9 * Math.exp(-Math.max(0, d) / 0.12); } }
  const sx = shake * noise1(t * 40, 1), sy = shake * noise1(t * 40, 2);
  const Zt = Z * (1 + punch);
  attr(S.cam, 'transform', `translate(${r2(ax + sx)} ${r2(ay + sy)}) scale(${r2(Zt)}) translate(${r2(-bx)} ${r2(-by)})`);

  // mondes visibles et coutures
  S.wg.forEach((wg, i) => {
    const l = wg.a - cx, r = wg.b - cx;
    const on = r > -40 && l < W + 40 && t < T_LINEUP + 0.05;
    vis(wg.g, on);
    if (!on) return;
    attr(wg.rect, 'x', Math.max(-2000, l)); attr(wg.rect, 'width', Math.min(8000, r) - Math.max(-2000, l));
    if (wg.obj) wg.obj.update(t, cx - wg.x0, [XR, RY + 40 * RS], wg);
  });
  // pilote(s)
  const wi = worldAt(t);
  const dist = (cx + XR) / RS;
  const exhaustAt = te => [camX(te) + XR + EXHAUST[0] * RS, RY + EXHAUST[1] * RS];
  S.riders.forEach((r, i) => {
    const [a, b] = [S.wg[i].a - cx, S.wg[i].b - cx];
    const on = b > XR - 320 && a < XR + 320 && t < T_LINEUP + 0.05;
    vis(r.P.wrap, on); if (!on) return;
    attr(r.rect, 'x', Math.max(-2000, a)); attr(r.rect, 'width', Math.min(8000, b) - Math.max(-2000, a));
    const q = SEQ[i];
    let face = q.face, look = q.look, arms = null, headRot = Math.sin(t * 3) * 2;
    if (t < TD) {   // intro : l'écran s'allume, il regarde la caméra puis la route
      face = t < 0.62 ? 'neutre' : 'curieux'; look = t < 0.62 ? [0, 0] : [10, -4];
    }
    const lean = clamp((sp - 600) / 3000) * 10;
    updateRider(r.P, {
      t, x: XR - lean * 2, y: RY, s: RS, dist, cx, speed: sp, face, look, headRot, arms, lean,
      bump: t > TD ? Math.abs(Math.sin(dist * 0.02)) * 2 : 0, exhaustAt: t > 0.2 ? exhaustAt : null,
      ...q.rider,
    });
    // écran éteint au tout début, puis allumage qui clignote
    const faceOn = t < 0.24 ? 0 : t < 0.44 ? (Math.floor(t * 40) % 2 ? 1 : 0.25) : 1;
    attr(r.P.robot.face, 'opacity', faceOn);
  });
  if (typeof updateSeams === 'function') updateSeams(t, cx);
  attr($('rgbR'), 'dx', -6); attr($('rgbB'), 'dx', 6);   // aberration par défaut (le titre la fait varier)
  if (typeof LINEUP !== 'undefined') LINEUP.update(t);
  if (typeof TITLE !== 'undefined') TITLE.update(t);
  // flash blanc : entrée dans l'alignement des suspects
  attr(S.flash, 'opacity', r2(Math.max(0, 1 - Math.abs(t - T_LINEUP) / 0.12) * 0.95));
  // textes
  for (const c of S.caps) updateCaption(c.C, t, c.t0, c.t1, 540, 440, { tilt: -6 });
  attr($('grainTurb'), 'seed', Math.floor(t * 24) % 97);
  if ($('boilTurb')) attr($('boilTurb'), 'seed', Math.floor(t * 12) % 50 + 1);   // dessin : 12 i/s (stop motion)
  if ($('skTurb')) attr($('skTurb'), 'seed', Math.floor(t * 12) % 50 + 1);
}

/* ----- API pour render.js ----- */
window.TRAILER = { FPS, DURATION, frames: Math.round(DURATION * FPS) };
window.renderAt = async t => { drawAt(t); };
window.renderFrame = async i => { drawAt(i / FPS); };
(async function init() {
  await document.fonts.load('700 50px "Space Grotesk"'); await document.fonts.load('700 50px Fredoka'); await document.fonts.load('500 20px "IBM Plex Mono"');
  build();
  for (const c of S.caps) c.C.layout();
  drawAt(0);
  window.READY = true;
})();
