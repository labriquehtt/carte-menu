// PARANO-IA — bande-annonce ~21 s : un plan-séquence de gauche à droite à travers les mondes de l'IA.
// Chaque monde défile puis la caméra « fouette » au temps fort : le robot franchit la couture et prend le style
// du monde suivant (la moitié avant d'abord). Dans deux mondes il s'arrête et descend de sa mobylette :
// combat façon Street Fighter contre un deepfake (il gagne… avec une oreille qui pendouille), puis le monde
// de la musique (touches de piano, batterie). Il remonte toujours sur sa mobylette avant la couture suivante.
// Les instants viennent de timing.js (partagé avec son.py).
'use strict';
const XR = 400;                       // position écran du robot quand il roule
const RS = 0.78;                      // échelle du pilote
const RY = 1400 - GROUND * RS;        // origine du pilote (roues au sol à y 1400)
const V = 330, PRE = 0.17, POST = 0.12, AHEAD = 760, AFTER = 420;
const PARK_X = 100;                   // position écran de la mobylette garée
const BRAKE = 460;                    // distance de freinage après le fouetté

const SEQ = [
  { w: () => CITY, name: 'city', face: 'curieux', look: [10, -6], rider: {} },
  { w: () => CYBER, name: 'cyber', face: 'surpris', look: [10, -4], zoom: { z: 1.4, f: [575, 1240], to: [540, 1090], out: () => beat(TIMING.fight.runBack) }, rider: { under: 0.85, underColor: '#19F0FF', beam: 0.8, puff: '#9A7BFF' } },
  { w: () => DRAW, name: 'draw', face: 'satisfait', look: [8, 0], rider: { filter: 'sketchFx', beam: 0, puff: '#6E6A62', puffStroke: '#3A3A3A', puffAlpha: 0.45 } },
  { w: () => MUSIC, name: 'music', face: 'satisfait', look: [8, -4], zoom: { z: 1.13, f: [640, 1040], to: [540, 960], out: () => beat(TIMING.music.jumpBack) }, rider: { under: 0.6, underColor: '#FF7A3C', beam: 0.5, puff: '#FFB86B' } },
  { w: () => CORP, name: 'corp', face: 'sceptique', look: [12, -8], rider: { beam: 0.3 } },
  { w: () => CANDY, name: 'candy', face: 'satisfait', look: [8, 0], rider: { wheels: 'donut', beam: 0.3, puff: '#FFC1E3', puffAlpha: 0.75 } },
  { w: () => APOC, name: 'apoc', face: 'surpris', look: [12, -10], rider: { flames: 1, beam: 0.9, puff: '#3A2A2A', puffAlpha: 0.7 } },
];
SEQ.forEach(q => { q.k = TIMING.seams[q.name] ?? null; const st = TIMING.stops[q.name]; if (st) q.stop = { park: beat(st.park), off: beat(st.off), on: beat(st.on), go: beat(st.go) }; });
const T_LINEUP = beat(TIMING.lineup), T_TITLE = beat(TIMING.title);

/* ----- caméra et mobylette ----- */
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
    const st = SEQ[i].stop;
    if (st) {   // freinage : la mobylette se gare, la caméra cadre la scène puis attend
      st.P = S + AFTER + BRAKE;               // position monde de la mobylette garée
      st.C = st.P - PARK_X;                   // caméra pendant l'arrêt
      st.from = T + POST; st.fromX = S + AFTER;
      keys.push([st.park + 0.3, st.C], [st.go, st.C + 12]);
      cxPrev = st.C + 12; tPrev = st.go;
    }
  }
  keys.push([T_LINEUP, cxPrev + V * (T_LINEUP - tPrev)], [T_LINEUP + 1, cxPrev + V * (T_LINEUP + 1 - tPrev)]);
  CAM = monotone(keys);
  for (const q of SEQ) if (q.stop) { const st = q.stop; st.brake = monotone([[st.from - 0.05, st.fromX - 0.05 * 3500], [st.from, st.fromX], [st.park, st.P], [st.park + 0.1, st.P]]); }
}
const camX = t => CAM(t);
function camSpeed(t) { return (CAM(t + 0.004) - CAM(t - 0.004)) / 0.008; }
function stopAt(t) { for (const q of SEQ) if (q.stop && t >= q.stop.from && t < q.stop.go + 0.8) return q.stop; return null; }
function mopedX(t) {   // position monde de la mobylette
  const st = stopAt(t);
  if (!st) return camX(t) + XR;
  if (t < st.park) return st.brake(t);
  if (t < st.go) return st.P;
  return camX(t) + lerp(PARK_X, XR, E.io(seg(t, st.go, st.go + 0.8)));   // elle rattrape la caméra
}
function mopedSpeed(t) { return (mopedX(t + 0.004) - mopedX(t - 0.004)) / 0.008; }
function mounted(t) { const st = stopAt(t); return !st || t < st.off || t >= st.on; }
function worldBounds(i) { return [i === 0 ? -1e6 : SEAMS[i - 1].S, i === SEQ.length - 1 ? 1e7 : SEAMS[i].S]; }
function worldAt(t) { let w = 0; for (const s of SEAMS) if (t >= s.T) w = s.i; return w; }

/* ----- l'oreille arrachée : elle pend et balance à chaque secousse ----- */
const EAR_EVENTS = [];
function earAt(t) {
  const th = beat(TIMING.fight.earHit);
  if (t < th) return null;
  let ang = 30 + 55 * Math.exp(-(t - th) / 0.5) * Math.sin((t - th) * 15);
  for (const te of EAR_EVENTS) { const d = t - te; if (d > 0 && d < 1.5) ang += 22 * Math.exp(-d / 0.35) * Math.sin(d * 16); }
  ang += 5 * Math.sin(t * 11);
  return { ang, spark: (t - th) < 1.2 ? (Math.floor(t * 20) % 3 === 0 ? 1 : 0) : ((t * 3) % 1 < 0.08 ? 1 : 0) };
}

/* ----- scène ----- */
const S = {};
function build() {
  buildCamera();
  SEAMS.forEach(s => EAR_EVENTS.push(s.T));
  for (const [k] of [...TIMING.music.hops, ...TIMING.music.drums]) EAR_EVENTS.push(beat(k));
  EAR_EVENTS.push(beat(TIMING.music.toDrums) + 0.2, beat(TIMING.fight.impact), beat(TIMING.fight.ko));
  const root = $('root');
  S.cam = g(root);                     // zoom / secousse
  S.worlds = g(S.cam);
  S.wg = SEQ.map((q, i) => {
    const cp = mk('clipPath', { id: 'clipW' + i, clipPathUnits: 'userSpaceOnUse' }, DEFS());
    const rect = mk('rect', { x: 0, y: -400, width: W, height: H + 800 }, cp);
    const gw = g(S.worlds, { 'clip-path': `url(#clipW${i})` });
    const [a, b] = worldBounds(i);
    let obj = null; try { obj = q.w(); } catch (e) { obj = null; }
    const x0 = i === 0 ? 0 : a;
    if (obj) { obj.x0 = x0; obj.stop = q.stop; obj.build(gw, b - x0 > 1e6 ? 4000 : b - x0); }
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
  S.actorLayer = g(S.cam);
  S.actor = makeRobot(S.actorLayer);   // le robot quand il est descendu de sa mobylette
  if (typeof FIGHT !== 'undefined') FIGHT.build(S.actorLayer, g(root));
  if (typeof MUSIC !== 'undefined' && MUSIC.buildFx) MUSIC.buildFx(S.actorLayer);
  if (typeof buildSeams === 'function') buildSeams(S.seamFx);
  if (typeof LINEUP !== 'undefined') LINEUP.build(g(root));
  if (typeof TITLE !== 'undefined') TITLE.build(g(root));
  S.flash = mk('rect', { x: 0, y: 0, width: W, height: H, fill: '#FFFFFF', opacity: 0 }, root);
  S.grain = mk('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#grainFx)', opacity: 0.07 }, root);
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#vignette)' }, root);
}

/* ----- rendu d'un instant ----- */
function drawAt(t) {
  const cx = camX(t), sp = camSpeed(t);
  const mx = mopedX(t), msp = mopedSpeed(t);
  // intro : gros plan sur l'écran du robot puis recul brutal jusqu'au drop
  const k = E.io(seg(t, 0.72, TD - 0.06));
  const Z = lerp(2.9 - 0.12 * seg(t, 0, 0.72), 1, k);
  const head = [XR + 6, RY - 96 * RS];
  let ax = 540, ay = lerp(820, 960, k), bx = lerp(head[0], 540, k), by = lerp(head[1], 960, k);
  // arrêts (combat, musique) : la caméra se rapproche de l'action, puis recule avant qu'il remonte en selle
  let Z2 = 1;
  for (const q of SEQ) if (q.stop && q.zoom) {
    const st = q.stop, zo = q.zoom, tOut = zo.out();
    const kz = E.io(seg(t, st.park + 0.2, st.park + 0.55)) * (1 - E.io(seg(t, tOut - 0.12, tOut + 0.22)));
    if (kz > 0) { Z2 = lerp(1, zo.z, kz); ax = lerp(ax, zo.to[0], kz); ay = lerp(ay, zo.to[1], kz); bx = lerp(bx, zo.f[0], kz); by = lerp(by, zo.f[1], kz); }
  }
  // temps forts : pulsation de zoom, secousses (coutures, coups, batterie)
  let punch = 0, shake = 0;
  const nb = Math.ceil(TIMING.end);
  if (t >= TD && t < T_LINEUP) for (let b = 0; b < nb; b++) { const d = t - beat(b); if (d >= 0 && d < 0.4) punch += 0.018 * Math.exp(-d / 0.09); }
  for (const s of SEAMS) { const d = t - s.T; if (d >= -0.02 && d < 0.35) { punch += 0.05 * Math.exp(-Math.max(0, d) / 0.1); shake += 9 * Math.exp(-Math.max(0, d) / 0.12); } }
  if (typeof FIGHT !== 'undefined') { const f = FIGHT.shake(t); shake += f.shake; punch += f.punch; }
  if (typeof MUSIC !== 'undefined' && MUSIC.shake) { const f = MUSIC.shake(t); shake += f.shake; punch += f.punch; }
  const sx = shake * noise1(t * 40, 1), sy = shake * noise1(t * 40, 2);
  const Zt = Z * Z2 * (1 + punch);
  attr(S.cam, 'transform', `translate(${r2(ax + sx)} ${r2(ay + sy)}) scale(${r2(Zt)}) translate(${r2(-bx)} ${r2(-by)})`);

  // mondes visibles
  S.wg.forEach((wg, i) => {
    const l = wg.a - cx, r = wg.b - cx;
    const on = r > -40 && l < W + 40 && t < T_LINEUP + 0.05;
    vis(wg.g, on);
    if (!on) return;
    attr(wg.rect, 'x', Math.max(-2000, l)); attr(wg.rect, 'width', Math.min(8000, r) - Math.max(-2000, l));
    if (wg.obj) wg.obj.update(t, cx - wg.x0, [mx - cx, RY + 40 * RS], wg);
  });
  // pilote(s) : la mobylette (et le robot dessus quand il est en selle)
  const px = mx - cx;
  const dist = mx / RS;
  const exhaustAt = te => [mopedX(te) + EXHAUST[0] * RS, RY + EXHAUST[1] * RS];
  const onBike = mounted(t), ear = earAt(t);
  S.riders.forEach((r, i) => {
    const [a, b] = [S.wg[i].a - cx, S.wg[i].b - cx];
    const on = b > px - 320 && a < px + 320 && t < T_LINEUP + 0.05;
    vis(r.P.wrap, on); if (!on) return;
    attr(r.rect, 'x', Math.max(-2000, a)); attr(r.rect, 'width', Math.min(8000, b) - Math.max(-2000, a));
    const q = SEQ[i];
    let face = q.face, look = q.look, headRot = Math.sin(t * 3) * 2;
    if (t < TD) { face = t < 0.62 ? 'neutre' : 'curieux'; look = t < 0.62 ? [0, 0] : [10, -4]; }
    const lean = clamp((msp - 600) / 3000) * 10;
    const parked = Math.abs(msp) < 5;
    updateRider(r.P, {
      t, x: px - lean * 2, y: RY, s: RS, dist, cx, speed: msp, face, look, headRot, lean,
      bump: t > TD && !parked ? Math.abs(Math.sin(dist * 0.02)) * 2 : 0, exhaustAt: t > 0.2 ? exhaustAt : null,
      ear, ...q.rider, puffAlpha: (q.rider.puffAlpha ?? 0.55) * (parked ? 0.35 : 1),
    });
    vis(r.P.robot.root, onBike);
    const faceOn = t < 0.24 ? 0 : t < 0.44 ? (Math.floor(t * 40) % 2 ? 1 : 0.25) : 1;
    attr(r.P.robot.face, 'opacity', faceOn);
  });
  // le robot à pied (combat, musique)
  let act = null;
  if (!onBike) {
    const st = stopAt(t);
    const seat = [st.P - cx, RY];                                   // repère écran du siège
    if (typeof FIGHT !== 'undefined' && st === SEQ[1].stop) act = FIGHT.actor(t, cx, seat);
    else if (typeof MUSIC !== 'undefined' && st === SEQ[3].stop) act = MUSIC.actor(t, cx, seat);
  }
  vis(S.actorLayer, true);
  vis(S.actor.root, !!act);
  if (act) poseRobot(S.actor, { s: RS, blink: blinkAt(t), ear, ...act });
  if (typeof FIGHT !== 'undefined') FIGHT.update(t, cx);
  if (typeof MUSIC !== 'undefined' && MUSIC.updateFx) MUSIC.updateFx(t, cx);
  if (typeof updateSeams === 'function') updateSeams(t, cx);
  attr($('rgbR'), 'dx', -6); attr($('rgbB'), 'dx', 6);
  if (typeof LINEUP !== 'undefined') LINEUP.update(t);
  if (typeof TITLE !== 'undefined') TITLE.update(t);
  attr(S.flash, 'opacity', r2(Math.max(0, 1 - Math.abs(t - T_LINEUP) / 0.12) * 0.95));
  attr($('grainTurb'), 'seed', Math.floor(t * 24) % 97);
  if ($('boilTurb')) attr($('boilTurb'), 'seed', Math.floor(t * 12) % 50 + 1);
  if ($('skTurb')) attr($('skTurb'), 'seed', Math.floor(t * 12) % 50 + 1);
  if ($('dfTurb')) attr($('dfTurb'), 'seed', Math.floor(t * 20) % 60 + 1);
}

/* ----- saut de la selle vers un point (et retour) : arc + écrasement ----- */
function jumpArc(t, t0, t1, from, to, apex) {
  const u = clamp((t - t0) / (t1 - t0));
  const x = lerp(from[0], to[0], E.io(u)), y = lerp(from[1], to[1], u) - Math.sin(u * Math.PI) * apex;
  return { x, y, u };
}
// pieds au sol : origine du robot debout (pieds vers y 166 × échelle)
const standY = gy => gy - 166 * RS;

/* ----- API pour render.js ----- */
window.TRAILER = { FPS, DURATION, frames: Math.round(DURATION * FPS) };
window.renderAt = async t => { drawAt(t); };
window.renderFrame = async i => { drawAt(i / FPS); };
(async function init() {
  await document.fonts.load('700 50px "Space Grotesk"'); await document.fonts.load('700 50px Fredoka'); await document.fonts.load('500 20px "IBM Plex Mono"');
  build();
  drawAt(0);
  window.READY = true;
})();
