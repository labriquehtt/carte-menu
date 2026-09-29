// EXPONENTIEL — motion design (sans Blender) : typo animée « C'EST / L'AUTO / AMÉLIORATION » (P4), sortie du robot hors
// du décor 3D, séquence « alignement » (M1) dans une arène d'entraînement de nuit, décor du carton final (P8).
// Même contrat que compo.js : tout ne dépend que de t. Les instants viennent de timing.json (keys).
'use strict';
const MO = {};
const VIOLET = '#7B5CFF', CYAN = '#4DD9FF';

// ---------------- petits outils ----------------
function grad(id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) { return rectGrad(DEFS(), id, stops, x1, y1, x2, y2); }
function camT(c) { return `translate(540 960) scale(${r2(c.z)}) translate(${r2(-c.x)} ${r2(-c.y)})`; }
const lerp3 = (a, b, q) => ({ x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), z: lerp(a.z, b.z, q) });

// ======================= 1. typo animée du P4 =======================
function buildKinetic() {
  const G = MO.kin = g($('fx'));
  MO.kinVeil = mk('rect', { width: 1080, height: 1920, fill: '#05070F', opacity: 0 }, G);
  MO.kinRays = g(G, { stroke: GREEN, 'stroke-linecap': 'round', opacity: 0.5 });
  MO.kinRayL = [...Array(28)].map(() => mk('line', { 'stroke-width': 6 }, MO.kinRays));
  const word = (s, size, fill) => { const w = g(G); txt(w, { size, fill, stroke: INK, sw: 16, filter: 'url(#glow)' }).textContent = s; return w; };
  MO.kinW = [word('C’EST', 190, WHITE), word('L’AUTO', 230, GREEN), word('AMÉLIORATION', 142, GREEN)];
}
function drawKinetic(t) {
  const k = K(), t0 = k.cest - 0.05, t3 = k.amelio + 0.95;
  const on = t >= t0 && t < t3 + 0.35;
  vis(MO.kin, on);
  if (!on) return false;
  const out = seg(t, t3, t3 + 0.3);
  attr(MO.kinVeil, 'opacity', r2(0.62 * seg(t, t0, t0 + 0.08) * (1 - out)));
  const hits = [k.cest, k.lauto, k.amelio];
  const Y = [620, 900, 1160];
  let shake = 0;
  MO.kinW.forEach((w, i) => {
    const h = hits[i] - 0.03, p = seg(t, h, h + 0.22);
    shake += 18 * pulse(t, h, 0.25);
    const s = t < h ? 0 : lerp(2.6, 1, E.back(p)) * (1 + 0.04 * Math.sin((t - h) * 12)) * (1 - 0.35 * out);
    place(w, 540 + (i === 1 ? -10 : 0), Y[i] - 900 * out * (i - 1), s, [-5, 3, -2][i] * (1 - E.out(p)), (t >= h ? 1 : 0) * (1 - out));
  });
  const R = rng(91), burst = Math.max(...hits.map(h => pulse(t, h - 0.02, 0.35)));
  MO.kinRayL.forEach(l => {
    const a = R() * PI2, r0 = 260 + R() * 200, len = 120 + 520 * burst * R();
    attr(l, 'x1', r2(540 + Math.cos(a) * r0)); attr(l, 'y1', r2(900 + Math.sin(a) * r0));
    attr(l, 'x2', r2(540 + Math.cos(a) * (r0 + len))); attr(l, 'y2', r2(900 + Math.sin(a) * (r0 + len)));
  });
  attr(MO.kinRays, 'opacity', r2(0.7 * burst * (1 - out)));
  attr(MO.kin, 'transform', shake ? `translate(${r2(shake * noise1(t * 50, 3))} ${r2(shake * noise1(t * 50, 4))})` : '');
  return true;                                   // les sous-titres s'effacent pendant la typo
}

// ======================= 2. décor du monde « alignement » =======================
function buildArena(back, front) {
  grad('moSky', [[0, '#050818'], [0.45, '#0E1440'], [0.72, '#2A1B5E'], [1, '#12102E']]);
  radGrad(DEFS(), 'moHalo', [[0, '#4DFF8F', 0.28], [0.5, '#7B5CFF', 0.12], [1, '#000', 0]]);
  radGrad(DEFS(), 'orbG', [[0, '#FFFFFF'], [0.25, '#B8FFD6'], [0.6, '#4DFF8F', 0.85], [1, '#4DFF8F', 0]]);
  grad('floorG', [[0, '#1A1450'], [1, '#05060F']]);
  grad('cardG', [[0, '#1B2360', 0.92], [1, '#0B0F2E', 0.95]], 0, 0, 1, 1);
  const B = MO.back = g(back);
  mk('rect', { width: 1080, height: 1920, fill: 'url(#moSky)' }, B);
  MO.halo = mk('ellipse', { cx: 540, cy: 1000, rx: 900, ry: 520, fill: 'url(#moHalo)' }, B);
  MO.stars = g(B);
  const R = rng(4242);
  MO.starL = [...Array(120)].map(() => mk('circle', { cx: r2(R() * 1600 - 260), cy: r2(R() * 900), r: r2(0.8 + R() * 2.4), fill: '#FFFFFF' }, MO.stars));
  // skyline de data centers (fenêtres qui clignotent)
  MO.city = g(B);
  MO.win = [];
  let x = -600;
  while (x < 2400) {
    const w = 60 + R() * 140, h = 120 + R() * 380;
    mk('rect', { x: r2(x), y: r2(1040 - h), width: r2(w), height: r2(h), fill: '#0A0C22', stroke: '#1E2150', 'stroke-width': 2 }, MO.city);
    for (let yy = 1040 - h + 18; yy < 1030; yy += 26) for (let xx = x + 12; xx < x + w - 12; xx += 22)
      if (R() < 0.45) MO.win.push(mk('rect', { x: r2(xx), y: r2(yy), width: 9, height: 12, fill: R() < 0.8 ? '#4DFF8F' : '#FFD23C', opacity: 0.8 }, MO.city));
    x += w + 10 + R() * 30;
  }
  mk('rect', { x: -2000, y: 1036, width: 6000, height: 10, fill: GREEN, filter: 'url(#glow)', opacity: 0.9 }, B);   // ligne d'horizon néon
  // sol : grille néon en perspective (dessinée dans l'écran, défile avec la caméra)
  mk('rect', { x: 0, y: 1040, width: 1080, height: 880, fill: 'url(#floorG)' }, B);
  MO.grid = g(B, { stroke: GREEN, fill: 'none', opacity: 0.55 });
  MO.gridV = [...Array(31)].map(() => mk('line', { 'stroke-width': 2.5 }, MO.grid));
  MO.gridH = [...Array(14)].map(() => mk('line', { 'stroke-width': 2.5 }, MO.grid));
  // chiffres binaires qui montent
  MO.bits = g(B, { 'font-family': 'IBM Plex Mono', 'font-size': 30, fill: GREEN });
  MO.bitL = [...Array(36)].map(() => { const e = mk('text', {}, MO.bits); e.textContent = R() < 0.5 ? '0' : '1'; return { e, x: R() * 2400 - 600, y0: R() * 1900, v: 40 + R() * 90, o: 0.15 + R() * 0.35 }; });

  // ------------- la scène (coordonnées « monde », filmée par la caméra) -------------
  const S = MO.stage = g(front);
  // tableau 1 : la cible « ce qu'on veut »
  MO.target = g(S);
  [[190, '#0F2A22'], [150, GREEN], [112, '#0F2A22'], [74, GREEN], [36, '#FFFFFF']].forEach(([r, c], i) =>
    mk('circle', { cx: 0, cy: 0, r, fill: c, stroke: INK, 'stroke-width': 6, filter: i === 1 ? 'url(#glow)' : '' }, MO.target));
  mk('rect', { x: -8, y: 190, width: 16, height: 220, fill: '#59606E', stroke: INK, 'stroke-width': 5 }, MO.target);
  MO.targetLab = txt(g(MO.target), { font: 'Space Grotesk', size: 54, fill: WHITE, stroke: INK, sw: 10 });
  MO.targetLab.textContent = 'CE QU’ON VEUT'; attr(MO.targetLab.parentNode, 'transform', 'translate(0 -250)');
  MO.targetX = txt(g(MO.target), { size: 260, fill: RED, stroke: INK, sw: 14 }); MO.targetX.textContent = '✗';
  // l'IA : une orbe néon avec ses anneaux
  MO.orb = g(S);
  MO.orbTrail = mk('path', { fill: 'none', stroke: GREEN, 'stroke-width': 14, 'stroke-linecap': 'round', opacity: 0.35, filter: 'url(#glow)' }, S);
  mk('circle', { r: 120, fill: 'url(#orbG)' }, MO.orb);
  mk('circle', { r: 58, fill: '#0B1D16', stroke: GREEN, 'stroke-width': 7, filter: 'url(#glow)' }, MO.orb);
  MO.orbRings = [0, 1].map(i => mk('ellipse', { rx: 92, ry: 26, fill: 'none', stroke: i ? VIOLET : CYAN, 'stroke-width': 5, opacity: 0.9 }, MO.orb));
  txt(MO.orb, { font: 'Space Grotesk', size: 50, fill: GREEN }).textContent = 'IA';
  MO.sheetNote = g(MO.orb);                                        // l'antisèche qu'elle cache
  mk('rect', { x: 40, y: 10, width: 150, height: 110, rx: 8, fill: '#FFF6C9', stroke: INK, 'stroke-width': 5 }, MO.sheetNote);
  txt(MO.sheetNote, { font: 'IBM Plex Mono', weight: 500, size: 24, fill: INK }).textContent = 'RÉPONSES';
  attr(MO.sheetNote.lastChild, 'x', 115); attr(MO.sheetNote.lastChild, 'y', 50);
  txt(MO.sheetNote, { font: 'IBM Plex Mono', weight: 500, size: 22, fill: '#6B5A45' }).textContent = 'A · C · B · D';
  attr(MO.sheetNote.lastChild, 'x', 115); attr(MO.sheetNote.lastChild, 'y', 88);
  MO.sweat = mk('path', { d: 'M 70 -70 q 12 20 0 30 q -12 -10 0 -30 z', fill: CYAN, stroke: INK, 'stroke-width': 4 }, MO.orb);
  // tableau 2 : « objectifs » barrés, puis la copie de test et la récompense
  MO.obj = g(S);
  mk('rect', { x: -230, y: -300, width: 460, height: 600, rx: 20, fill: '#E9EEF7', stroke: INK, 'stroke-width': 8 }, MO.obj);
  txt(MO.obj, { font: 'IBM Plex Mono', weight: 500, size: 40, fill: INK }).textContent = 'objectifs.txt';
  attr(MO.obj.lastChild, 'y', -230);
  for (let i = 0; i < 7; i++) mk('rect', { x: -170, y: -160 + i * 62, width: 180 + (i * 53) % 150, height: 18, rx: 9, fill: '#A7B2C8' }, MO.obj);
  MO.objX = g(MO.obj, { stroke: RED, 'stroke-width': 30, 'stroke-linecap': 'round' });
  MO.objX1 = mk('line', { x1: -200, y1: -260, x2: 200, y2: 260 }, MO.objX);
  MO.objX2 = mk('line', { x1: 200, y1: -260, x2: -200, y2: 260 }, MO.objX);
  MO.sheet = g(S);
  mk('rect', { x: -250, y: -330, width: 500, height: 660, rx: 20, fill: '#F4EAD2', stroke: INK, 'stroke-width': 8 }, MO.sheet);
  txt(MO.sheet, { font: 'Space Grotesk', size: 64, fill: INK }).textContent = 'TEST';
  attr(MO.sheet.lastChild, 'y', -250);
  MO.checks = [...Array(6)].map((_, i) => {
    const row = g(MO.sheet, { transform: `translate(-190 ${-150 + i * 80})` });
    mk('rect', { x: 0, y: -26, width: 52, height: 52, rx: 8, fill: '#FFFFFF', stroke: INK, 'stroke-width': 5 }, row);
    mk('rect', { x: 80, y: -8, width: 200 + (i * 41) % 90, height: 16, rx: 8, fill: '#C9B99A' }, row);
    const ok = mk('path', { d: 'M 8 2 L 22 18 L 46 -16', fill: 'none', stroke: '#1FA85A', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, row);
    const ko = mk('path', { d: 'M 10 -14 L 42 18 M 42 -14 L 10 18', fill: 'none', stroke: RED, 'stroke-width': 9, 'stroke-linecap': 'round' }, row);
    return { ok, ko };
  });
  MO.pencil = g(S);
  mk('path', { d: 'M 0 0 L 26 -14 L 150 -150 L 124 -176 L 0 -40 Z', fill: YELLOW, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, MO.pencil);
  mk('path', { d: 'M 0 0 L 26 -14 L 0 -40 Z', fill: INK }, MO.pencil);
  // compteur de récompense + étoiles
  MO.reward = g(S);
  mk('rect', { x: -250, y: -60, width: 500, height: 120, rx: 60, fill: '#1B1A3A', stroke: YELLOW, 'stroke-width': 6, filter: 'url(#glow)' }, MO.reward);
  MO.rewardTxt = txt(MO.reward, { font: 'Space Grotesk', size: 60, fill: YELLOW }); MO.rewardTxt.textContent = '★ 0';
  txt(MO.reward, { font: 'IBM Plex Mono', weight: 500, size: 26, fill: '#C9D2FF' }).textContent = 'RÉCOMPENSE';
  attr(MO.reward.lastChild, 'y', -90);
  MO.starsFly = [...Array(18)].map(() => txt(g(S), { size: 70, fill: YELLOW, stroke: INK, sw: 6 }));
  MO.starsFly.forEach(s => { s.textContent = '★'; });
  MO.src = txt(g(front), { font: 'IBM Plex Mono', weight: 500, size: 28, fill: '#C9D2FF', stroke: INK, sw: 6 });
  MO.src.textContent = 'METR, 2025 : des IA de pointe trichent aux tests';
  // le tampon TRICHE
  MO.stamp = g(front);
  mk('rect', { x: -300, y: -95, width: 600, height: 190, rx: 20, fill: 'none', stroke: RED, 'stroke-width': 18 }, MO.stamp);
  txt(MO.stamp, { font: 'Space Grotesk', size: 140, fill: RED }).textContent = 'TRICHE';
  // tableau 5 : la carte « épisode dédié »
  MO.card = g(S);
  mk('rect', { x: -420, y: -300, width: 840, height: 600, rx: 40, fill: 'url(#cardG)', stroke: GREEN, 'stroke-width': 8, filter: 'url(#glow)' }, MO.card);
  txt(MO.card, { font: 'IBM Plex Mono', weight: 500, size: 34, fill: '#C9D2FF' }).textContent = 'L’IA SOUS ENQUÊTE · ÉPISODE DÉDIÉ';
  attr(MO.card.lastChild, 'y', -200);
  MO.cardTitle = txt(g(MO.card), { size: 128, fill: GREEN, stroke: INK, sw: 12, filter: 'url(#glow)' }); MO.cardTitle.textContent = 'ALIGNEMENT';
  MO.badge = g(MO.card);
  mk('rect', { x: -170, y: -48, width: 340, height: 96, rx: 48, fill: YELLOW, stroke: INK, 'stroke-width': 6 }, MO.badge);
  txt(MO.badge, { size: 52, fill: INK }).textContent = 'BIENTÔT';
  attr(MO.badge, 'transform', 'translate(-80 170)');
  MO.bell = g(MO.card);
  mk('path', { d: 'M -46 30 Q -46 -50 0 -56 Q 46 -50 46 30 L 58 46 L -58 46 Z', fill: YELLOW, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }, MO.bell);
  mk('circle', { cx: 0, cy: 58, r: 14, fill: YELLOW, stroke: INK, 'stroke-width': 6 }, MO.bell);
  MO.bellWaves = g(MO.card, { fill: 'none', stroke: YELLOW, 'stroke-width': 7, 'stroke-linecap': 'round' });
  mk('path', { d: 'M 330 90 q 26 30 0 60 M 372 70 q 44 50 0 100' }, MO.bellWaves);
  mk('path', { d: 'M 250 90 q -26 30 0 60 M 208 70 q -44 50 0 100' }, MO.bellWaves);
  // la sortie : la dernière image 3D devient une photo qui s'envole
  MO.photo = g(front);
  mk('rect', { x: -560, y: -980, width: 1120, height: 1960, rx: 18, fill: '#F4F1EA', stroke: INK, 'stroke-width': 10 }, MO.photo);
  MO.photoImg = mk('image', { x: -540, y: -960, width: 1080, height: 1920, preserveAspectRatio: 'none' }, MO.photo);
  MO.speed = g(front, { stroke: '#FFFFFF', 'stroke-linecap': 'round' });
  MO.speedL = [...Array(24)].map(() => mk('line', {}, MO.speed));
}

// caméra de la séquence : points de vue (monde) aux instants clés, transitions rapides (fouettés et zooms)
const POS = { target: { x: 500, y: 760 }, sheet: { x: 1650, y: 780 }, card: { x: 3150, y: 800 } };
function arenaCam(t) {
  const k = K();
  const V = [
    [k.sortie + 0.55, { x: 700, y: 820, z: 0.78 }],          // atterrissage : plan large
    [k.align + 0.25, { x: 520, y: 800, z: 1.05 }],           // la cible
    [k.veut2 + 0.05, { x: 520, y: 780, z: 1.12 }],
    [k.probleme + 0.25, { x: 1650, y: 780, z: 1.05 }],       // fouetté vers la copie
    [k.tests + 0.1, { x: 1650, y: 740, z: 1.12 }],
    [k.alors_elle + 0.3, { x: 1120, y: 860, z: 0.6 }],      // recul : cible ET copie
    [k.sans + 0.2, { x: 1100, y: 850, z: 0.63 }],
    [k.comme + 0.25, { x: 1450, y: 900, z: 1.3 }],           // zoom sur le robot qui surprend l'IA
    [k.align2 - 0.05, { x: 1470, y: 880, z: 1.38 }],
    [k.align2 + 0.3, { x: 3150, y: 820, z: 1.0 }],           // fouetté vers la carte
    [k.iris, { x: 3150, y: 800, z: 1.08 }],
  ];
  if (t <= V[0][0]) return V[0][1];
  for (let i = 0; i < V.length - 1; i++) {
    const [ta, a] = V[i], [tb, b] = V[i + 1];
    if (t < tb) {
      const fast = Math.hypot(b.x - a.x, b.y - a.y) > 500 || Math.abs(b.z - a.z) > 0.25;
      const q = seg(t, ta, tb);
      return lerp3(a, b, fast ? E.io(clamp((q - 0.55) / 0.45)) : E.soft(q));   // les grands déplacements partent tard et vite
    }
  }
  return V[V.length - 1][1];
}
function whipAmount(t) {                                       // intensité des fouettés (traînées, flou)
  const k = K();
  return Math.max(pulse(t, k.probleme - 0.05, 0.35), pulse(t, k.alors_elle + 0.05, 0.3), pulse(t, k.comme, 0.3), pulse(t, k.align2, 0.35));
}

function orbPos(t) {
  const k = K();
  if (t < k.align) return { x: 900, y: 1150, s: 0 };
  if (t < k.veut2) { const q = E.io(seg(t, k.align + 0.4, k.veut2 - 0.2)); return { x: lerp(980, POS.target.x + 20, q), y: lerp(1050, POS.target.y + 10, q) - 120 * Math.sin(q * Math.PI), s: 1 }; }
  if (t < k.probleme) return { x: POS.target.x + 20, y: POS.target.y + 10, s: 1 };
  if (t < k.alors_elle) { const q = E.io(seg(t, k.probleme, k.probleme + 0.6)); return { x: lerp(POS.target.x, 1300, q), y: lerp(POS.target.y, 1000, q) + 18 * Math.sin(t * 5), s: 1 }; }
  if (t < k.sans) {                                            // le détour : elle contourne la cible et file vers la copie
    const q = E.io(seg(t, k.alors_elle + 0.3, k.decrocher + 0.3));
    return { x: lerp(1300, 1900, q), y: lerp(1000, 640, q) - 220 * Math.sin(q * Math.PI), s: 1 };
  }
  if (t < k.comme) return { x: 1900 + 14 * Math.sin(t * 9), y: 640, s: 1 };
  return { x: lerp(1900, 1560, E.out(seg(t, k.comme, k.comme + 0.4))), y: lerp(640, 880, E.out(seg(t, k.comme, k.comme + 0.4))), s: 1.15 };
}
function robotArena(t) {                                       // position « monde » et jeu du robot dans l'arène
  const k = K();
  if (t < k.probleme) return { x: 860, y: 1400, s: 0.95, face: t < k.veut2 ? 'curieux' : 'satisfait', arms: t > k.align + 0.3 ? ARMS.wave : ARMS.down };
  if (t < k.alors_elle) return { x: 1320, y: 1400, s: 0.95, face: 'sceptique', arms: ARMS.down };
  if (t < k.comme) return { x: 1120, y: 1400, s: 0.95, face: t < k.sans ? 'surpris' : 'perplexe', arms: t < k.sans ? ARMS.cheer : ARMS.down };
  if (t < k.align2) return { x: lerp(1150, 1330, E.out(seg(t, k.comme, k.comme + 0.4))), y: 1080, s: 1.0, face: 'sceptique', arms: ARMS.loupe, loupe: true };
  return { x: 3380, y: 1520, s: 0.8, face: 'satisfait', arms: ARMS.wave };
}

function drawArena(t) {
  const k = K(), p = planAt(t);
  const on = p.id === 'M1';
  vis(MO.back, on); vis(MO.stage, on); vis(MO.photo, false); vis(MO.speed, false); vis(MO.src.parentNode, false); vis(MO.stamp, false);
  if (!on) return null;
  const u = t - p.start;
  const exitEnd = k.align - 0.1;
  const c = arenaCam(t);
  // ---- fond (parallaxe) ----
  attr(MO.stars, 'transform', `translate(${r2(-c.x * 0.05)} ${r2(-(c.y - 800) * 0.03)})`);
  MO.starL.forEach((s, i) => attr(s, 'opacity', r2(0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 1.7)))));
  attr(MO.city, 'transform', `translate(${r2(540 - c.x * 0.28 - 400)} ${r2(-(c.y - 800) * 0.15)}) scale(${r2(0.9 + 0.1 * c.z)})`);
  MO.win.forEach((w, i) => { if (i % 7 === 0) attr(w, 'opacity', (Math.floor(t * 3 + i) % 5) ? 0.8 : 0.15); });
  const horizon = 1040, vx = 540, spread = 2600 * c.z;
  MO.gridV.forEach((l, i) => {                                 // lignes fuyantes qui glissent avec la caméra
    const off = ((i - 15) * 140 - (c.x * 0.9) % 140);
    attr(l, 'x1', r2(vx + off * 0.08)); attr(l, 'y1', horizon); attr(l, 'x2', r2(vx + off * spread / 1400)); attr(l, 'y2', 1920);
  });
  const scroll = (t * 0.9 + c.x * 0.0006) % 1;
  MO.gridH.forEach((l, i) => {                                 // lignes horizontales qui avancent vers nous
    const d = (i + scroll) / MO.gridH.length, y = horizon + Math.pow(d, 2.2) * (1920 - horizon);
    attr(l, 'x1', -100); attr(l, 'x2', 1180); attr(l, 'y1', r2(y)); attr(l, 'y2', r2(y)); attr(l, 'opacity', r2(0.25 + 0.75 * d));
  });
  MO.bitL.forEach(b => {
    const y = ((b.y0 - t * b.v) % 1900 + 1900) % 1900;
    attr(b.e, 'x', r2(b.x - c.x * 0.6 + 540 * 0.6)); attr(b.e, 'y', r2(y)); attr(b.e, 'opacity', r2(b.o));
  });
  attr(MO.halo, 'cx', r2(540 - (c.x - 1500) * 0.15));
  // ---- scène ----
  attr(MO.stage, 'transform', camT(c));
  const appear = E.back(seg(t, k.sortie + 0.4, k.sortie + 0.75));
  place(MO.target, POS.target.x, POS.target.y, appear, 0, 1);
  const bad = seg(t, k.sans, k.sans + 0.15);
  vis(MO.targetX.parentNode, bad > 0);
  attr(MO.targetX.parentNode, 'transform', `scale(${r2(E.back(bad))})`);
  MO.targetLab.textContent = t < k.sans ? 'CE QU’ON VEUT' : 'CE QU’ON VOULAIT';
  attr(MO.targetLab, 'fill', t < k.sans ? WHITE : RED);
  attr(MO.target, 'opacity', r2(t < k.alors_elle ? 1 : lerp(1, 0.55, seg(t, k.alors_elle + 0.5, k.sans))));
  // orbe
  const o = orbPos(t);
  place(MO.orb, o.x, o.y + 10 * Math.sin(t * 3), o.s * E.back(seg(t, k.align, k.align + 0.3)), 0, o.s > 0 && t >= k.align ? 1 : 0);
  MO.orbRings.forEach((r, i) => attr(r, 'transform', `rotate(${r2(t * (i ? -90 : 120) + i * 60)})`));
  vis(MO.sheetNote, t >= k.comme);
  vis(MO.sweat, t >= k.triche);
  attr(MO.sweat, 'transform', `translate(0 ${r2(20 * seg(t, k.triche, k.triche + 0.6))})`);
  // traînée de l'orbe (ses positions passées)
  const pts = []; for (let i = 0; i < 14; i++) { const tt = t - i * 0.05; if (tt < k.align) break; const q = orbPos(tt); pts.push(`${r2(q.x)} ${r2(q.y)}`); }
  attr(MO.orbTrail, 'd', pts.length > 1 ? 'M ' + pts.join(' L ') : '');
  // objectifs barrés → copie de test
  const objOn = t >= k.probleme - 0.2 && t < k.recompense;
  place(MO.obj, POS.sheet.x, POS.sheet.y, E.back(seg(t, k.probleme - 0.2, k.probleme + 0.15)), -3, objOn ? 1 - seg(t, k.recompense - 0.25, k.recompense) : 0);
  const cross = seg(t, k.probleme + 0.9, k.probleme + 1.3);
  attr(MO.objX1, 'x2', r2(-200 + 400 * clamp(cross * 2))); attr(MO.objX1, 'y2', r2(-260 + 520 * clamp(cross * 2)));
  attr(MO.objX2, 'x2', r2(200 - 400 * clamp(cross * 2 - 1))); attr(MO.objX2, 'y2', r2(-260 + 520 * clamp(cross * 2 - 1)));
  vis(MO.objX, cross > 0);
  const sheetOn = t >= k.recompense - 0.25;
  place(MO.sheet, POS.sheet.x, POS.sheet.y, E.back(seg(t, k.recompense - 0.25, k.recompense + 0.1)), 2, sheetOn ? 1 : 0);
  // cases : d'abord honnête (✓ et ✗), puis la triche transforme tout en ✓
  const honest = [1, 0, 1, 1, 0, 1];
  const cheatT = k.decrocher - 0.1;
  MO.checks.forEach((c2, i) => {
    const shown = t >= k.recompense + 0.2 + i * 0.22;
    const cheated = t >= cheatT + i * 0.12;
    vis(c2.ok, shown && (honest[i] || cheated)); vis(c2.ko, shown && !honest[i] && !cheated);
  });
  // crayon qui trafique la copie
  const pen = t >= cheatT - 0.2 && t < k.sans + 0.3;
  const pi = clamp((t - cheatT) / 0.12);
  place(MO.pencil, POS.sheet.x - 170 + 30 * Math.sin(t * 40), POS.sheet.y - 150 + Math.min(5, Math.floor(pi)) * 80, 1, 0, pen ? 1 : 0);
  // récompense : lente quand c'est honnête, explose quand elle triche
  let score = 0;
  if (t > k.recompense + 0.2) score = Math.min(4, Math.floor((t - k.recompense - 0.2) / 0.22) + 1) * 10;
  if (t > cheatT) score = Math.round(40 + 9959 * Math.pow(seg(t, cheatT, k.sans), 1.6));
  MO.rewardTxt.textContent = '★ ' + score.toLocaleString('fr-FR');
  place(MO.reward, POS.sheet.x, POS.sheet.y - 470, E.back(seg(t, k.recompense - 0.1, k.recompense + 0.2)) * (1 + 0.12 * pulse(t % 0.25, 0, 0.12) * (t > cheatT && t < k.sans ? 1 : 0)), 0, t >= k.recompense - 0.1 ? 1 : 0);
  const rain = t > cheatT && t < k.comme;
  MO.starsFly.forEach((s, i) => {
    const ph = ((t - cheatT) * 1.6 + i / MO.starsFly.length) % 1;
    const sx = POS.sheet.x - 300 + (i * 97) % 600, sy = POS.sheet.y - 700 + ph * 900;
    place(s.parentNode, sx, sy, 0.8 + 0.4 * ((i * 13) % 5) / 5, ph * 360, rain ? (1 - ph) : 0);
  });
  const srcOn = t > k.alors_elle + 0.4 && t < k.align2;
  place(MO.src.parentNode, 540, 1500, 1, 0, srcOn ? seg(t, k.alors_elle + 0.4, k.alors_elle + 0.7) : 0);
  // tampon TRICHE (écran)
  const st = seg(t, k.triche - 0.05, k.triche + 0.15);
  place(MO.stamp, 540, 520, lerp(3, 1, E.out(st)), -12, t >= k.triche - 0.05 && t < k.align2 ? 1 : 0);
  // carte « épisode dédié »
  place(MO.card, POS.card.x, POS.card.y, E.back(seg(t, k.align2 + 0.05, k.align2 + 0.4)), -2 + 2 * E.out(seg(t, k.align2, k.align2 + 0.5)), t >= k.align2 ? 1 : 0);
  const ring = t > k.video - 0.1 ? Math.sin((t - k.video) * 28) * Math.exp(-(t - k.video) * 2.5) : 0;
  attr(MO.bell, 'transform', `translate(290 120) rotate(${r2(ring * 28)})`);
  vis(MO.bellWaves, Math.abs(ring) > 0.25);
  place(MO.badge, -80, 170, 1 + 0.08 * Math.sin(t * 6), 0, t > k.align2 + 0.5 ? 1 : 0);
  // ---- fouettés : traînées de vitesse ----
  const w = whipAmount(t);
  vis(MO.speed, w > 0.05);
  if (w > 0.05) {
    const R = rng(3 + Math.floor(t * 30));
    MO.speedL.forEach(l => {
      const y = R() * 1920, x = R() * 1080, len = 200 + 700 * w * R();
      attr(l, 'x1', r2(x)); attr(l, 'x2', r2(x + len)); attr(l, 'y1', r2(y)); attr(l, 'y2', r2(y));
      attr(l, 'stroke-width', r2(3 + 6 * R())); attr(l, 'opacity', r2(0.3 + 0.5 * w * R()));
    });
  }
  // ---- sortie du décor 3D : la dernière image de l'aiguillage devient une photo qui s'envole ----
  if (t < exitEnd + 0.4) {
    const q = seg(t, k.sortie, exitEnd);
    vis(MO.photo, true);
    const sc = lerp(1, 0.38, E.io(clamp(q * 1.6)));
    const fly = E.in(clamp((q - 0.55) / 0.45));
    attr(MO.photo, 'transform', `translate(${r2(540 - 1300 * fly)} ${r2(960 - 500 * fly)}) rotate(${r2(-14 * E.io(clamp(q * 1.6)) - 40 * fly)}) scale(${r2(sc)} ${r2(sc * (1 - 0.15 * Math.sin(q * Math.PI)))})`);
    attr(MO.photo, 'opacity', r2(1 - seg(t, exitEnd, exitEnd + 0.3)));
  }
  // ---- robot dans l'arène (ou en plein saut pendant la sortie) ----
  const R0 = robotArena(t);
  const scr = { x: 540 + (R0.x - c.x) * c.z, y: 960 + (R0.y - c.y) * c.z, s: R0.s * c.z };
  if (t < exitEnd + 0.15) {                                    // le saut : de l'aiguillage jusqu'au sol de l'arène
    const A6 = anchorAt('P6', K().sortie - 0.02) || { x: 300, y: 1100, s: 0.5 };
    const q = seg(t, k.sortie - 0.05, exitEnd + 0.15);
    const qe = E.io(q);
    const land = { x: 540 + (860 - 700) * 0.78, y: 960 + (1400 - 820) * 0.78, s: 0.95 * 0.78 };
    return {
      x: lerp(A6.x, land.x, qe), y: lerp(A6.y - 40, land.y, qe) - 900 * Math.sin(q * Math.PI),
      s: lerp(Math.max(0.5, A6.s * 1.1), land.s, qe) * (1 + 1.4 * Math.sin(q * Math.PI)),
      rot: 360 * E.io(q), face: 'surpris', arms: ARMS.cheer, loupe: false,
    };
  }
  return { x: scr.x, y: scr.y + 18 * pulse(t, exitEnd + 0.15, 0.3), s: scr.s, rot: 0, face: R0.face, arms: R0.arms, loupe: !!R0.loupe };
}

// ======================= 3. décor du carton final =======================
function buildCardDecor(G) {
  grad('p8Sky', [[0, '#04061A'], [0.55, '#101A4A'], [0.8, '#2A1E5E'], [1, '#0A0C22']]);
  grad('p8Water', [[0, '#0E1740'], [1, '#03040C']]);
  const B = MO.p8 = g(G);
  mk('rect', { width: 1080, height: 1920, fill: 'url(#p8Sky)' }, B);
  const R = rng(808);
  MO.p8Stars = [...Array(140)].map(() => mk('circle', { cx: r2(R() * 1080), cy: r2(R() * 1250), r: r2(0.8 + R() * 2.2), fill: '#FFFFFF' }, B));
  mk('circle', { cx: 210, cy: 700, r: 150, fill: '#FFF3C4', opacity: 0.08 }, B);
  mk('circle', { cx: 210, cy: 700, r: 70, fill: '#FFF3C4', filter: 'url(#glow)' }, B);
  // collines et sapins en silhouette
  MO.p8Far = g(B);
  mk('path', { d: 'M 0 1330 Q 200 1250 380 1300 T 760 1280 T 1080 1300 L 1080 1400 L 0 1400 Z', fill: '#0B1330' }, MO.p8Far);
  for (let i = 0; i < 22; i++) {
    const x = i * 52 + R() * 20, h = 90 + R() * 120, w = h * 0.42, y = 1320 + R() * 20;
    mk('path', { d: `M ${r2(x)} ${r2(y - h)} L ${r2(x + w)} ${r2(y)} L ${r2(x - w)} ${r2(y)} Z`, fill: '#081026' }, MO.p8Far);
  }
  // l'étang, les nénuphars et le reflet de la courbe
  mk('rect', { x: 0, y: 1380, width: 1080, height: 540, fill: 'url(#p8Water)' }, B);
  MO.p8Refl = mk('path', { fill: 'none', stroke: GREEN, 'stroke-width': 10, opacity: 0.25, filter: 'url(#glow)' }, B);
  MO.p8Pads = [...Array(26)].map(() => {
    const x = R() * 1080, y = 1420 + R() * 460, r = 22 + (y - 1420) * 0.09;
    return mk('ellipse', { cx: r2(x), cy: r2(y), rx: r2(r), ry: r2(r * 0.34), fill: '#1F7A45', stroke: INK, 'stroke-width': 3 }, B);
  });
  MO.p8Fog = mk('rect', { x: -200, y: 1300, width: 1480, height: 180, fill: '#9FB3FF', opacity: 0.09, filter: 'url(#b3)' }, B);
  MO.p8Fire = [...Array(16)].map(() => mk('circle', { r: 4, fill: GREEN, filter: 'url(#glow)' }, B));
}
function drawCardDecor(t) {
  const p = planAt(t);
  if (p.id !== 'P8') return;
  const u = t - p.start;
  attr(MO.p8, 'transform', `translate(540 960) scale(${r2(1 + 0.05 * E.soft(seg(u, 0, 3)))}) translate(-540 -960)`);
  MO.p8Stars.forEach((s, i) => attr(s, 'opacity', r2(0.3 + 0.7 * Math.abs(Math.sin(t * 1.1 + i * 2.3)))));
  const pts = curvePts(E.out(seg(u, 0.2, 1.3)));
  attr(MO.p8Refl, 'd', pts.length > 1 ? 'M ' + pts.map(q => `${r2(q[0])} ${r2(1380 + (1180 - q[1]) * 0.35 + 6 * Math.sin(q[0] * 0.05 + t * 4))}`).join(' L ') : '');
  MO.p8Pads.forEach((e, i) => attr(e, 'transform', `translate(${r2(4 * Math.sin(t * 0.8 + i))} 0)`));
  attr(MO.p8Fog, 'x', r2(-200 + 60 * Math.sin(t * 0.3)));
  MO.p8Fire.forEach((f, i) => {
    attr(f, 'cx', r2((i * 71 + t * 30 * (1 + (i % 3))) % 1080)); attr(f, 'cy', r2(1250 + 120 * Math.sin(t * 0.9 + i)));
    attr(f, 'opacity', r2(0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))));
  });
}

// ======================= branchement =======================
window.buildMotion = function () {
  const world = $('world');
  const back = g(null); world.insertBefore(back, $('robotLayer'));    // décor de l'arène, puis sa scène : derrière le robot
  const front = g(null); world.insertBefore(front, $('robotLayer'));
  buildArena(back, front);
  MO.stage.appendChild(MO.orbTrail); MO.stage.appendChild(MO.orb);   // l'orbe passe devant la copie et la cible
  const title = FX.title;                                            // décor du carton final, sous le titre
  const d = g(null); title.insertBefore(d, title.firstChild.nextSibling);
  buildCardDecor(d);
  buildKinetic();
  // la photo de sortie et les effets d'écran passent devant le robot
  front.appendChild(MO.photo);                                       // la photo reste derrière le robot (il en sort)
  const over = g($('fx'));
  over.appendChild(MO.speed); over.appendChild(MO.stamp); over.appendChild(MO.src.parentNode);
};
window.drawMotion = function (t) {
  const kin = drawKinetic(t);
  const robot = drawArena(t);
  drawCardDecor(t);
  return { kin, robot };
};
window.motionPhotoSrc = t => {                                       // image de la photo de sortie (dernière image du P6)
  const P6 = plans().find(p => p.id === 'P6');
  return plateSrc('P6', 'bg', P6.end - 0.02);
};
