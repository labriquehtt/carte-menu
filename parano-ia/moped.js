// La mobylette (vue de profil, roule vers la droite) + le robot assis dessus = un « pilote ».
// Repère : celui du robot (cou en 0,0). Roues : arrière (-175, 262), avant (205, 262), rayon 64 ; sol à y 326.
'use strict';
const RW = [-165, 262], FW = [196, 262], WR = 64, GROUND = 326;
const EXHAUST = [-268, 292];   // sortie du pot (fumée)

function mopedDefs() {
  const d = DEFS();
  if ($('mpPaint')) return;
  rectGrad(d, 'mpPaint', [[0, '#F0615A'], [0.45, '#C8322B'], [1, '#7E1A16']]);
  rectGrad(d, 'mpChrome', [[0, '#FFFFFF'], [0.35, '#C7CED6'], [0.55, '#8A939E'], [0.7, '#E9EDF1'], [1, '#9AA3AD']]);
  rectGrad(d, 'mpChromeH', [[0, '#FFFFFF'], [0.4, '#C7CED6'], [0.6, '#7D8691'], [1, '#DDE2E7']], 0, 0, 1, 0);
  rectGrad(d, 'mpSeat', [[0, '#5A4636'], [0.5, '#3A2C22'], [1, '#221913']]);
  rectGrad(d, 'mpEngine', [[0, '#C4C9CF'], [0.5, '#8E959D'], [1, '#5D636B']]);
  radGrad(d, 'mpLamp', [[0, '#FFFBEA'], [0.55, '#FFE8A3'], [1, '#E0B04A']], 0.4, 0.4, 0.6);
  radGrad(d, 'mpBeam', [[0, '#FFF3C4', 0.75], [1, '#FFF3C4', 0]], 0, 0.5, 1);
  radGrad(d, 'mpDonut', [[0, '#F6C48A'], [0.8, '#D9914A'], [1, '#A8652C']], 0.5, 0.5, 0.5);
}

function makeWheel(parent, cx, cy, variant) {
  const wg = g(parent);
  tr(wg, cx, cy);
  const rot = g(wg);
  if (variant === 'donut') {
    // roue-donut : pâte dorée, glaçage rose qui coule, vermicelles
    mk('circle', { r: WR, fill: 'url(#mpDonut)', stroke: INK, 'stroke-width': 6 }, rot);
    mk('path', { d: 'M -56 -14 Q -50 -52 -8 -58 Q 30 -62 52 -30 Q 62 -6 50 10 Q 44 22 34 14 Q 24 34 10 26 Q -4 40 -14 28 Q -32 34 -36 20 Q -54 22 -56 -14 Z', fill: '#FF7EB9', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, rot);
    mk('circle', { r: 20, fill: '#FFE4F1', stroke: INK, 'stroke-width': 5 }, rot);
    const R = rng(44);
    for (let i = 0; i < 16; i++) {
      const a = R() * PI2, rr = 28 + R() * 22;
      mk('rect', { x: -5, y: -2, width: 10, height: 4, rx: 2, fill: ['#FFF', '#7FE3FF', '#FFE14D', '#8CFF9E', '#B98CFF'][i % 5], transform: `translate(${r2(Math.cos(a) * rr)} ${r2(Math.sin(a) * rr - 6)}) rotate(${r2(R() * 180)})` }, rot);
    }
  } else {
    mk('circle', { r: WR, fill: '#1A1B1F', stroke: INK, 'stroke-width': 6 }, rot);
    // sculptures du pneu
    for (let i = 0; i < 28; i++) { const a = i / 28 * PI2; mk('path', { d: `M ${r2(Math.cos(a) * 58)} ${r2(Math.sin(a) * 58)} L ${r2(Math.cos(a + 0.06) * 64)} ${r2(Math.sin(a + 0.06) * 64)}`, stroke: '#3A3C44', 'stroke-width': 4 }, rot); }
    mk('circle', { r: 50, fill: 'none', stroke: 'url(#mpChrome)', 'stroke-width': 7 }, rot);
    const sp = g(rot, { stroke: '#D5DAE0', 'stroke-width': 2.2 });
    for (let i = 0; i < 24; i++) { const a = i / 24 * PI2, b = a + (i % 2 ? 0.5 : -0.5); mk('path', { d: `M ${r2(Math.cos(b) * 9)} ${r2(Math.sin(b) * 9)} L ${r2(Math.cos(a) * 47)} ${r2(Math.sin(a) * 47)}` }, sp); }
    mk('circle', { r: 13, fill: 'url(#mpEngine)', stroke: INK, 'stroke-width': 4 }, rot);
    mk('circle', { r: 4, fill: '#FFFFFF', 'fill-opacity': 0.8 }, rot);
    // reflet fixe (ne tourne pas)
    mk('path', { d: 'M -40 -36 A 54 54 0 0 1 10 -54', fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.35, 'stroke-width': 4, 'stroke-linecap': 'round' }, wg);
  }
  return { g: wg, rot };
}

function makeMoped(parentBack, parentFront, variant) {
  mopedDefs();
  const M = { variant };
  M.back = g(parentBack); M.front = g(parentFront);
  const B = M.back, F = M.front;
  // lumière de phare au sol (devant)
  M.beam = mk('path', { d: 'M 210 90 L 640 20 L 660 250 Z', fill: 'url(#mpBeam)', opacity: 0.55 }, B);
  // ---- arrière : roue, garde-boue, porte-bagages, plaque, feu
  M.rear = makeWheel(B, RW[0], RW[1], variant);
  markup(B, `
  <path d="M -240 240 Q -236 180 -166 174 Q -104 176 -92 228" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
  <path d="M -240 240 Q -236 180 -166 174 Q -104 176 -92 228" fill="none" stroke="url(#mpPaint)" stroke-width="9" stroke-linecap="round"/>
  <g stroke="${INK}" stroke-width="10" stroke-linecap="round" fill="none"><path d="M -256 158 L -120 158"/><path d="M -236 158 L -180 250"/><path d="M -140 158 L -165 262"/></g>
  <g stroke="url(#mpChrome)" stroke-width="5" stroke-linecap="round" fill="none"><path d="M -256 158 L -120 158"/><path d="M -236 158 L -180 250"/><path d="M -140 158 L -165 262"/><path d="M -248 146 L -128 146"/></g>
  <rect x="-270" y="166" width="22" height="16" rx="4" fill="#FF3B30" stroke="${INK}" stroke-width="4"/>
  <rect x="-266" y="169" width="8" height="5" rx="2" fill="#FFC2BE"/>
  <g transform="translate(-256 204) rotate(-6)"><rect x="-26" y="-13" width="52" height="26" rx="4" fill="#F4F1E6" stroke="${INK}" stroke-width="4"/><text x="0" y="7" text-anchor="middle" font-family="IBM Plex Mono" font-weight="500" font-size="16" fill="${INK}">IA·404</text></g>`);
  // ---- pot d'échappement chromé
  markup(B, `
  <path d="M 30 246 Q -40 300 -150 296" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
  <path d="M 30 246 Q -40 300 -150 296" fill="none" stroke="url(#mpChrome)" stroke-width="10" stroke-linecap="round"/>
  <path d="M -264 282 Q -270 292 -264 302 L -150 306 Q -140 294 -150 284 Z" fill="url(#mpChrome)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M -250 288 L -160 290" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="3" stroke-linecap="round"/>
  <g stroke="${INK}" stroke-width="2" opacity="0.5"><path d="M -236 284 L -236 304"/><path d="M -214 285 L -214 305"/><path d="M -192 286 L -192 305"/></g>`);
  // ---- cadre (grand tube courbe), moteur à ailettes, réservoir, selle
  markup(B, `
  <path d="M 164 112 Q 110 206 34 238 L -52 170 L -165 262" fill="none" stroke="${INK}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 164 112 Q 110 206 34 238 L -52 170 L -165 262" fill="none" stroke="url(#mpPaint)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 150 132 Q 104 204 44 228" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/>
  <path d="M 10 252 L -165 262" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
  <path d="M 10 252 L -165 262" fill="none" stroke="url(#mpChrome)" stroke-width="5" stroke-linecap="round"/>
  <g transform="translate(30 244)">
    <rect x="-40" y="-26" width="76" height="52" rx="18" fill="url(#mpEngine)" stroke="${INK}" stroke-width="5"/>
    <g transform="rotate(-28)"><rect x="-4" y="-74" width="34" height="50" rx="6" fill="url(#mpEngine)" stroke="${INK}" stroke-width="5"/>
      <g stroke="${INK}" stroke-width="3"><path d="M -10 -66 L 36 -66"/><path d="M -10 -56 L 36 -56"/><path d="M -10 -46 L 36 -46"/><path d="M -10 -36 L 36 -36"/></g></g>
    <circle cx="-38" cy="6" r="24" fill="url(#mpEngine)" stroke="${INK}" stroke-width="5"/>
    <circle cx="-38" cy="6" r="8" fill="#5D636B" stroke="${INK}" stroke-width="3"/>
  </g>
  <path d="M 86 150 Q 112 118 158 126 Q 162 152 142 172 Q 110 190 82 176 Z" fill="url(#mpPaint)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 100 150 Q 118 132 150 134" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round"/>
  <text x="122" y="165" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="15" fill="#F7E7C6" transform="rotate(-18 122 160)">Mob'IA</text>
  <g stroke="${INK}" stroke-width="4" fill="none"><path d="M -118 158 q 8 4 0 8 q -8 4 0 8 q 8 4 0 8"/><path d="M -92 158 q 8 4 0 8 q -8 4 0 8 q 8 4 0 8"/></g>
  <path d="M -176 146 Q -176 124 -134 124 L 24 130 Q 58 134 54 150 Q 48 162 18 162 L -154 160 Q -178 158 -176 146 Z" fill="url(#mpSeat)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M -154 134 Q -80 128 20 136" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="4" stroke-linecap="round"/>
  <path d="M -50 160 L -50 176" stroke="${INK}" stroke-width="12"/>
  <rect x="-66" y="210" width="52" height="12" rx="5" fill="#2A2C33" stroke="${INK}" stroke-width="3"/>
  <rect x="34" y="212" width="52" height="12" rx="5" fill="#2A2C33" stroke="${INK}" stroke-width="3"/>`);
  // ---- avant (devant le robot) : fourche, roue, garde-boue, guidon, phare, rétroviseur
  M.frontWheel = makeWheel(F, FW[0], FW[1], variant);
  markup(F, `
  <path d="M 122 204 Q 138 162 196 164 Q 250 170 262 226" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
  <path d="M 122 204 Q 138 162 196 164 Q 250 170 262 226" fill="none" stroke="url(#mpPaint)" stroke-width="8" stroke-linecap="round"/>
  <path d="M 168 100 L 196 262" stroke="${INK}" stroke-width="20" stroke-linecap="round"/>
  <path d="M 168 100 L 196 262" stroke="url(#mpChromeH)" stroke-width="11" stroke-linecap="round"/>
  <path d="M 166 104 L 160 60 Q 158 48 142 50 L 116 54" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 166 104 L 160 60 Q 158 48 142 50 L 116 54" fill="none" stroke="url(#mpChrome)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="104" y="46" width="30" height="16" rx="7" fill="#2A2C33" stroke="${INK}" stroke-width="4" transform="rotate(-8 118 54)"/>
  <path d="M 158 56 L 176 14" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="178" cy="4" r="14" fill="url(#mpChrome)" stroke="${INK}" stroke-width="5"/>
  <circle cx="180" cy="2" r="7" fill="#9ED8FF" opacity="0.8"/>`);
  M.lamp = g(F);
  markup(M.lamp, `
  <circle cx="190" cy="96" r="26" fill="url(#mpChrome)" stroke="${INK}" stroke-width="6"/>
  <circle cx="196" cy="96" r="17" fill="url(#mpLamp)" stroke="${INK}" stroke-width="3"/>
  <path d="M 188 86 Q 194 80 202 82" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>`);
  M.lampGlow = mk('circle', { cx: 200, cy: 96, r: 40, fill: '#FFE9A8', opacity: 0.35, filter: 'url(#b12)' }, F);
  // options par monde : néon sous la caisse, flammes dans le pot
  M.under = mk('ellipse', { cx: 10, cy: 326, rx: 250, ry: 22, fill: '#19F0FF', opacity: 0, filter: 'url(#b12)' }, B);
  B.insertBefore(M.under, B.firstChild);
  M.flames = g(B);
  M.flameP = [0, 1, 2].map(i => mk('path', { fill: ['#FFE14D', '#FF8A1F', '#FF3B1F'][i], opacity: 0.9 }, M.flames));
  return M;
}
// dist = distance parcourue (unités du robot) → rotation des roues ; t pour les vibrations
function updateMoped(M, t, dist, o = {}) {
  const a = (dist / WR) * 180 / Math.PI;
  attr(M.rear.rot, 'transform', `rotate(${r2(a % 360)})`);
  attr(M.frontWheel.rot, 'transform', `rotate(${r2(a % 360)})`);
  attr(M.under, 'opacity', o.under ?? 0);
  if (o.underColor) attr(M.under, 'fill', o.underColor);
  vis(M.beam, (o.beam ?? 0.55) > 0); attr(M.beam, 'opacity', o.beam ?? 0.55);
  const fl = o.flames || 0;
  vis(M.flames, fl > 0);
  if (fl > 0) M.flameP.forEach((p, i) => {
    const L = (70 - i * 18) * fl * (0.8 + 0.4 * Math.abs(noise1(t * 18 + i * 3, i))), hgt = 16 - i * 4;
    attr(p, 'd', `M ${EXHAUST[0] + 4} ${EXHAUST[1] - hgt} Q ${r2(EXHAUST[0] - L * 0.6)} ${r2(EXHAUST[1] - hgt * 1.6)} ${r2(EXHAUST[0] - L)} ${EXHAUST[1]} Q ${r2(EXHAUST[0] - L * 0.6)} ${r2(EXHAUST[1] + hgt * 1.4)} ${EXHAUST[0] + 4} ${EXHAUST[1] + hgt} Z`);
  });
}

/* ----- pilote = mobylette + robot, dans un groupe découpable (couture entre deux mondes) ----- */
function makeRider(parent, o = {}) {
  const P = { o };
  P.wrap = g(parent);                 // reçoit le clip-path (repère écran)
  P.fx = g(P.wrap);                   // reçoit le filtre éventuel (crayon)
  if (o.filter) attr(P.fx, 'filter', `url(#${o.filter})`);
  P.g = g(P.fx);                      // position / échelle du pilote
  P.smoke = g(P.fx);                  // fumée (repère écran)
  const back = g(P.g), mid = g(P.g), front = g(P.g);
  P.robot = makeRobot(mid);
  P.moped = makeMoped(back, front, o.wheels);
  P.speedLines = g(P.fx, { stroke: '#FFFFFF', 'stroke-linecap': 'round' });
  P.lines = [...Array(7)].map(() => mk('path', { 'stroke-width': 4 }, P.speedLines));
  const puffCol = o.puff || '#E9E4DA';
  P.puffs = [...Array(16)].map(() => mk('circle', { fill: puffCol, stroke: o.puffStroke || 'none', 'stroke-width': 3 }, P.smoke));
  return P;
}
// st : {x, y, s (échelle écran), dist, t, cx (caméra), speed (px/s écran), face, look, headRot, under, flames, beam, bob}
function updateRider(P, st) {
  const t = st.t, s = st.s;
  const vib = Math.sin(t * 47) * 1.3 + Math.sin(t * 31) * 0.8;   // moteur qui vibre
  const bump = st.bump || 0;
  tr(P.g, st.x, st.y + bump, s, st.tilt || 0);
  poseRobot(P.robot, {
    x: 0, y: vib * 0.8 - 2 + (st.lean || 0) * 0.2, s: 1, rot: (st.lean || 0) * 0.08, sit: true,
    feet: [[-40, 196, -6], [60, 198, 6]],
    face: st.face || 'neutre', blink: blinkAt(t), look: st.look || [8, 0], headRot: st.headRot || 0,
    arms: st.arms || ARMS.ride, armLayer: st.armLayer || { L: 'back', R: 'front' },
    hatLift: st.hatLift || 0, loupe: st.loupe,
  });
  updateMoped(P.moped, t, st.dist, st);
  // fumée : bouffées émises à la sortie du pot, qui restent en place dans le monde (repère écran = monde - caméra)
  const every = 0.055, n = P.puffs.length;
  const k0 = Math.floor(t / every);
  for (let i = 0; i < n; i++) {
    const k = k0 - i, te = k * every, age = t - te;
    const el = P.puffs[i];
    const life = 0.85;
    if (age < 0 || age > life || !st.exhaustAt) { vis(el, false); continue; }
    const src = st.exhaustAt(te);               // position monde de la sortie du pot à l'émission
    const R = hash(k * 1.37);
    const wx = src[0] - age * (40 + 60 * R) - age * age * 60, wy = src[1] - age * (70 + 40 * R) + Math.sin(age * 8 + k) * 6;
    const x = wx - st.cx, y = wy;
    const rr = (10 + age * 70) * s * (0.8 + 0.5 * R);
    vis(el, true);
    attr(el, 'cx', x); attr(el, 'cy', y); attr(el, 'r', rr);
    attr(el, 'opacity', r2((1 - age / life) * (st.puffAlpha ?? 0.55)));
  }
  // traits de vitesse quand ça accélère
  const sp = clamp(((st.speed || 0) - 900) / 2600);
  vis(P.speedLines, sp > 0.02);
  if (sp > 0.02) P.lines.forEach((l, i) => {
    const y = st.y + (-150 + i * 62) * s + Math.sin(i * 7.3) * 20, len = (160 + 220 * hash(i + Math.floor(t * 20))) * sp;
    const x = st.x - (260 + 90 * hash(i * 3.1)) * s;
    attr(l, 'd', `M ${r2(x)} ${r2(y)} L ${r2(x - len)} ${r2(y)}`); attr(l, 'opacity', r2(0.6 * sp));
  });
}
