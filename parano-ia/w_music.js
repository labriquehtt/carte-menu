// MONDE 4 — la musique (clins d'œil à Suno et ElevenLabs) : un festival au coucher du soleil, un soleil fait
// d'ondes sonores, deux tours jumelles « II », des murs d'enceintes qui pompent au tempo, une route-clavier
// dont les touches s'enfoncent sous les roues. Le robot descend de sa mobylette, monte un escalier de touches
// géantes (une note par saut), puis joue de la batterie avec des baguettes. Chaque coup se voit : touches qui
// s'allument, ondes, vibrations, notes qui s'envolent, peaux et cymbale qui tremblent, enceintes qui pompent.
// Les instants (et les notes) viennent de TIMING.music : son.py joue exactement les mêmes.
'use strict';
const MUSIC = { id: 'music' };
const NOTE_COL = { A4: '#FF3C6E', C5: '#FF8A3C', D5: '#FFD23C', E5: '#4DFF8F', G5: '#3CE8FF', A5: '#C77BFF' };
// repère « écran pendant l'arrêt » (mobylette garée à x 100) : escalier de touches puis estrade de la batterie
const KX0 = 322, KW = 72, KTOP0 = 1372, KSTEP = 62;
const keyTop = i => KTOP0 - i * KSTEP, keyCx = i => KX0 + i * KW + (KW - 4) / 2;
const DRUM_X = 905, DRUM_FLOOR = 1004, STAGE_X = 756;   // le batteur (pieds) derrière sa batterie, sur une enceinte géante
const KIT = (() => {   // batterie à l'échelle 1,25 autour des pieds du batteur
  const k = 1.25, P = (dx, dy, o) => ({ x: DRUM_X + dx * k, y: DRUM_FLOOR + dy * k, ...Object.fromEntries(Object.entries(o).map(([a, v]) => [a, v * k])) });
  return { kick: P(0, -54, { r: 58 }), snare: P(-90, -86, { rx: 42, ry: 13, h: 30 }), tom1: P(-40, -138, { rx: 34, ry: 11, h: 34 }), tom2: P(40, -138, { rx: 34, ry: 11, h: 34 }), crash: P(90, -198, { rx: 50, ry: 9 }) };
})();
function musicDefs() {
  const d = DEFS();
  rectGrad(d, 'msSky', [[0, '#0B0620'], [0.3, '#1E0C45'], [0.52, '#5A1768'], [0.66, '#C7366E'], [0.76, '#FF7A45'], [0.86, '#FFB35C'], [1, '#2A1030']]);
  rectGrad(d, 'msSun', [[0, '#FFE66B'], [0.5, '#FF8A3C'], [1, '#FF3C8E']]);
  radGrad(d, 'msSunGlow', [[0, '#FFB35C', 0.75], [0.5, '#FF6A5C', 0.25], [1, '#FF3C8E', 0]]);
  rectGrad(d, 'msKey', [[0, '#FFFFFF'], [0.85, '#EDEAF2'], [1, '#C9C3D6']]);
  rectGrad(d, 'msKeyFront', [[0, '#F4F1F8'], [1, '#B9B2C9']]);
  rectGrad(d, 'msCab', [[0, '#2B2440'], [1, '#15111F']]);
  rectGrad(d, 'msBeam', [[0, '#FFFFFF', 0], [1, '#FFFFFF', 0.9]]);
  radGrad(d, 'msCone', [[0, '#5A5470'], [0.55, '#2A2438'], [1, '#12101A']]);
  rectGrad(d, 'msTower', [[0, '#2A1650'], [1, '#12092A']]);
}
function noteGlyph(parent, col, dbl) {   // ♪ (ou ♫)
  const n = g(parent);
  markup(n, dbl
    ? `<g fill="${col}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"><ellipse cx="-18" cy="10" rx="15" ry="11" transform="rotate(-20 -18 10)"/><ellipse cx="26" cy="0" rx="15" ry="11" transform="rotate(-20 26 0)"/><path d="M -6 6 L -6 -56 L 38 -66 L 38 -4 L 34 -4 L 34 -52 L -2 -44 L -2 6 Z"/></g>`
    : `<g fill="${col}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"><ellipse cx="0" cy="10" rx="16" ry="12" transform="rotate(-20 0 10)"/><path d="M 12 4 L 12 -58 Q 34 -48 36 -22 Q 28 -38 16 -40 L 16 4 Z"/></g>`);
  return n;
}
// cabine d'enceinte (deux boomers + tweeter) ; renvoie les boomers pour les faire pomper
function speakerCab(parent, x, y, w, h) {
  const cg = g(parent);
  mk('rect', { x, y, width: w, height: h, rx: 14, fill: 'url(#msCab)', stroke: INK, 'stroke-width': 6 }, cg);
  mk('rect', { x: x + 10, y: y + 10, width: w - 20, height: h - 20, rx: 8, fill: 'none', stroke: '#3E3656', 'stroke-width': 3 }, cg);
  const cones = [];
  const r = Math.min(w, h) * 0.28;
  for (const fy of (h > w * 1.2 ? [0.32, 0.72] : [0.5])) {
    const c = g(cg);
    attr(c, 'data-cx', x + w / 2); attr(c, 'data-cy', y + h * fy);
    mk('circle', { cx: 0, cy: 0, r: r + 8, fill: '#0C0A12', stroke: '#4A4262', 'stroke-width': 4 }, c);
    mk('circle', { cx: 0, cy: 0, r, fill: 'url(#msCone)' }, c);
    mk('circle', { cx: 0, cy: 0, r: r * 0.32, fill: '#3A3450', stroke: '#6A6288', 'stroke-width': 2 }, c);
    cones.push({ g: c, x: x + w / 2, y: y + h * fy });
  }
  mk('circle', { cx: x + w - 22, cy: y + 22, r: 8, fill: '#FF7A3C', filter: 'url(#glow)' }, cg);
  return cones;
}

MUSIC.build = function (root, width) {
  musicDefs();
  const M = MUSIC; M.width = width;
  const st = M.stop;
  M.U = st ? st.P - PARK_X - M.x0 : 800;           // décalage caméra pendant l'arrêt (repère du monde)
  const at = (s, f) => s + f * M.U;                  // x d'un élément de parallaxe f qui doit être en s pendant l'arrêt
  M.at = at;
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#msSky)' }, root);
  // étoiles
  M.stars = g(root);
  const R = rng(404);
  M.starEl = [...Array(46)].map(() => mk('circle', { cx: R() * W, cy: R() * 620, r: 1.5 + R() * 2.5, fill: '#FFFFFF' }, M.stars));
  // le soleil fait d'ondes sonores (clin d'œil Suno)
  M.sun = g(root);
  mk('circle', { cx: 0, cy: 0, r: 520, fill: 'url(#msSunGlow)' }, M.sun);
  const cp = mk('clipPath', { id: 'msSunClip' }, DEFS()); mk('circle', { cx: 0, cy: 0, r: 270 }, cp);
  const sb = g(M.sun, { 'clip-path': 'url(#msSunClip)' });
  M.sunBars = [...Array(27)].map((_, k) => mk('rect', { x: -270 + k * 20 + 3, width: 14, rx: 7, fill: 'url(#msSun)' }, sb));
  M.sunLine = mk('path', { fill: 'none', stroke: '#FFF4D6', 'stroke-width': 5, opacity: 0.85, filter: 'url(#glow)' }, M.sun);
  // montagnes en forme d'onde sonore
  M.far = g(root);
  const mountain = (y0, amp, col, rim, seed, f) => {
    const Rm = rng(seed); let d = `M -600 1400 L -600 ${y0}`; const pts = [];
    for (let x = -600; x < width * f + 2200; x += 60) { const h = amp * (0.25 + Rm()) * (0.6 + 0.4 * Math.sin(x * 0.004)); pts.push([x, y0 - h], [x + 30, y0 - h * 0.15]); }
    d += pts.map(p => ` L ${r2(p[0])} ${r2(p[1])}`).join('') + ` L ${width * f + 2200} 1400 Z`;
    mk('path', { d, fill: col }, M.far);
    mk('path', { d: 'M ' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L '), fill: 'none', stroke: rim, 'stroke-width': 4, opacity: 0.8, filter: 'url(#glow)' }, M.far);
  };
  mountain(1010, 260, '#3A1466', '#FF6AC1', 11, 0.08);
  M.far2 = g(root);
  { const Rm = rng(12); let d = 'M -600 1400 L -600 1100'; for (let x = -600; x < width * 0.14 + 2200; x += 44) { const h = 90 * (0.2 + Rm()); d += ` L ${x} ${1100 - h} L ${x + 22} ${1100 - h * 0.2}`; } d += ` L ${width * 0.14 + 2200} 1400 Z`; mk('path', { d, fill: '#24104A' }, M.far2); }
  // les tours jumelles « II » (clin d'œil ElevenLabs), fenêtres en VU-mètres
  M.twin = g(root);
  M.twinWin = [];
  for (const [k, dx] of [[0, 0], [1, 118]]) {
    const x = at(118, 0.18) + dx, top = 330;
    mk('rect', { x, y: top, width: 86, height: 1150 - top, rx: 43, fill: 'url(#msTower)', stroke: '#FFFFFF', 'stroke-width': 5, opacity: 0.95 }, M.twin);
    mk('rect', { x: x + 6, y: top + 6, width: 74, height: 1150 - top, rx: 37, fill: 'none', stroke: '#9A7BFF', 'stroke-width': 2, opacity: 0.6 }, M.twin);
    for (let r = 0; r < 20; r++) for (let c = 0; c < 3; c++) M.twinWin.push({ el: mk('rect', { x: x + 16 + c * 20, y: 1110 - r * 34, width: 14, height: 22, rx: 3, fill: r > 14 ? '#FF3C6E' : r > 9 ? '#FFD23C' : '#4DFF8F' }, M.twin), r, k, c });
    mk('circle', { cx: x + 43, cy: top - 20, r: 9, fill: '#FF3C6E', filter: 'url(#neon)' }, M.twin);
    mk('path', { d: `M ${x + 43} ${top} L ${x + 43} ${top - 16}`, stroke: '#FFFFFF', 'stroke-width': 4 }, M.twin);
  }
  // ville du festival (0,4) : murs d'enceintes, vinyle-grande roue, manches de guitare, micro géant
  M.mid = g(root);
  M.cones = [];
  M.vinyls = [];
  const Rc = rng(77);
  let x = -500, k = 0;
  while (x < width * 0.4 + 1600) {
    const type = k % 4;
    const hs = x - 0.4 * M.U;   // x à l'écran pendant l'arrêt : on laisse le soleil dégagé derrière la batterie
    if (hs > 380 && hs < 1120) { x = 1120 + 0.4 * M.U; continue; }
    if (type === 0 || type === 2) {   // pile d'enceintes
      const w = 150 + Rc() * 50, n = 2 + Math.floor(Rc() * 3);
      for (let j = 0; j < n; j++) M.cones.push(...speakerCab(M.mid, x, 1250 - (j + 1) * (w * 0.9), w, w * 0.9));
      x += w + 60;
    } else if (type === 1) {           // vinyle-grande roue
      const vg = g(M.mid), vx = x + 190, vy = 820;
      markup(vg, `<path d="M ${vx - 150} 1250 L ${vx} ${vy} L ${vx + 150} 1250" fill="none" stroke="#2A2440" stroke-width="18"/>`);
      const disc = g(vg);
      markup(disc, `<circle r="180" fill="#121018" stroke="${INK}" stroke-width="6"/>${[150, 128, 106, 84].map(r => `<circle r="${r}" fill="none" stroke="#2E2A3A" stroke-width="3"/>`).join('')}
        <circle r="56" fill="#FF3C6E" stroke="${INK}" stroke-width="5"/><circle r="8" fill="#FFF4D6"/><path d="M -150 -40 A 156 156 0 0 1 -60 -140" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.35" stroke-linecap="round"/>
        ${[...Array(12)].map((_, i) => `<circle cx="${r2(Math.cos(i / 12 * PI2) * 194)}" cy="${r2(Math.sin(i / 12 * PI2) * 194)}" r="9" fill="${['#FFD23C', '#FF3C8E', '#3CE8FF'][i % 3]}" filter="url(#glow)"/>`).join('')}`);
      M.vinyls.push({ g: disc, x: vx, y: vy });
      x += 420;
    } else {                           // manche de guitare géant + micro
      markup(M.mid, `<g transform="translate(${x + 70} 1250) rotate(-8)"><rect x="-26" y="-760" width="52" height="760" fill="#6A3A22" stroke="${INK}" stroke-width="6"/>
        ${[...Array(14)].map((_, i) => `<path d="M -26 ${-740 + i * 52} L 26 ${-740 + i * 52}" stroke="#D9D2C0" stroke-width="4"/>`).join('')}
        ${[-14, -5, 5, 14].map(dx => `<path d="M ${dx} -800 L ${dx} 0" stroke="#EDE6D6" stroke-width="2"/>`).join('')}
        <path d="M -34 -760 L -40 -900 L 40 -900 L 34 -760 Z" fill="#4A2616" stroke="${INK}" stroke-width="6"/>
        ${[-860, -820, -780].map(y => `<circle cx="-48" cy="${y}" r="9" fill="#D9D2C0" stroke="${INK}" stroke-width="3"/><circle cx="48" cy="${y}" r="9" fill="#D9D2C0" stroke="${INK}" stroke-width="3"/>`).join('')}</g>
        <g transform="translate(${x + 200} 1250)"><path d="M 0 0 L 0 -520" stroke="#2A2440" stroke-width="14"/><rect x="-44" y="-640" width="88" height="140" rx="44" fill="#9AA3AD" stroke="${INK}" stroke-width="6"/>
        ${[...Array(6)].map((_, i) => `<path d="M -40 ${-620 + i * 20} L 40 ${-620 + i * 20}" stroke="#5A6270" stroke-width="3"/>`).join('')}</g>`);
      x += 330;
    }
    k++;
  }
  // notes qui flottent dans le ciel
  M.sky = g(root);
  M.floatNotes = [...Array(16)].map((_, i) => { const n = noteGlyph(M.sky, ['#FFD23C', '#FF3C8E', '#3CE8FF', '#4DFF8F', '#FFFFFF'][i % 5], i % 3 === 0); return n; });
  // lasers de la scène
  M.lasers = g(root);
  M.laserEl = [...Array(6)].map((_, i) => mk('path', { stroke: ['#4DFF8F', '#FF3C8E', '#3CE8FF'][i % 3], 'stroke-width': 5, opacity: 0.55, filter: 'url(#glow)', 'stroke-linecap': 'round' }, M.lasers));
  // public du festival (0,7) : silhouettes, bras levés, bâtons lumineux
  M.crowd = g(root);
  M.fans = [];
  for (let i = 0; i < 30; i++) {
    const fx = -300 + i * 95 + (i % 3) * 20, fg = g(M.crowd);
    const col = ['#1A1030', '#22143C', '#170D2A'][i % 3];
    markup(fg, `<circle cx="0" cy="-118" r="24" fill="${col}"/><path d="M -34 0 L -30 -80 Q 0 -100 30 -80 L 34 0 Z" fill="${col}"/>`);
    const arm = mk('path', { fill: 'none', stroke: col, 'stroke-width': 14, 'stroke-linecap': 'round' }, fg);
    const stick = mk('path', { stroke: ['#4DFF8F', '#FFD23C', '#3CE8FF', '#FF3C8E'][i % 4], 'stroke-width': 8, 'stroke-linecap': 'round', filter: 'url(#glow)' }, fg);
    M.fans.push({ g: fg, arm, stick, x: fx, seed: i });
  }
  // la route-clavier (touches blanches et noires, vues de dessus)
  M.street = g(root);
  mk('rect', { x: -1400, y: 1396, width: width + 4000, height: 600, fill: '#140C22' }, M.street);
  M.roadKeys = [];
  const KWR = 74;
  for (let i = -20; i < (width + 2400) / KWR; i++) {
    const kx = i * KWR;
    const kg = g(M.street);
    const top = mk('rect', { x: kx + 2, y: 1400, width: KWR - 4, height: 150, rx: 6, fill: 'url(#msKey)', stroke: INK, 'stroke-width': 3 }, kg);
    mk('rect', { x: kx + 2, y: 1546, width: KWR - 4, height: 22, rx: 4, fill: '#B9B2C9', stroke: INK, 'stroke-width': 3 }, kg);
    const glow = mk('rect', { x: kx + 2, y: 1400, width: KWR - 4, height: 150, rx: 6, fill: '#FF7A3C', opacity: 0 }, kg);
    M.roadKeys.push({ g: kg, x: kx, glow, col: Object.values(NOTE_COL)[((i % 6) + 6) % 6] });
    if ([0, 1, 3, 4, 5].includes(((i % 7) + 7) % 7)) mk('rect', { x: kx + KWR - 20, y: 1400, width: 40, height: 88, rx: 5, fill: '#1A1626', stroke: INK, 'stroke-width': 3 }, M.street);
  }
  mk('rect', { x: -1400, y: 1568, width: width + 4000, height: 400, fill: '#0E0918' }, M.street);
  // escalier de touches géantes + estrade de la batterie (une enceinte géante) — seulement s'il y a un arrêt
  M.stairs = g(root);
  M.keys = [];
  if (st) {
    const X0 = at(0, 1);
    // l'estrade : une énorme enceinte (boomers qui pompent sur la grosse caisse)
    const sx = X0 + STAGE_X, sw = 1110 - STAGE_X;
    M.stageCones = speakerCab(M.stairs, sx, DRUM_FLOOR, sw, 1400 - DRUM_FLOOR);
    mk('rect', { x: sx - 6, y: DRUM_FLOOR - 16, width: sw + 12, height: 22, rx: 6, fill: '#3A3450', stroke: INK, 'stroke-width': 5 }, M.stairs);
    M.stageLeds = [...Array(9)].map((_, i) => mk('rect', { x: sx + 12 + i * 29, y: DRUM_FLOOR - 11, width: 20, height: 10, rx: 3, fill: Object.values(NOTE_COL)[i % 6] }, M.stairs));
    TIMING.music.hops.forEach(([, note], i) => {
      const kg = g(M.stairs), x = X0 + KX0 + i * KW, top = keyTop(i);
      const col = NOTE_COL[note];
      const beam = mk('rect', { x: x + 4, y: top - 700, width: KW - 12, height: 700, fill: col, opacity: 0, filter: 'url(#b12)' }, M.stairs);
      const body = g(kg);
      mk('rect', { x, y: top + 16, width: KW - 4, height: 1400 - top - 16, fill: 'url(#msKeyFront)', stroke: INK, 'stroke-width': 5 }, body);
      mk('rect', { x, y: top, width: KW - 4, height: 22, rx: 5, fill: 'url(#msKey)', stroke: INK, 'stroke-width': 5 }, body);
      if (i !== 2 && i !== 5) mk('rect', { x: x + KW - 26, y: top + 16, width: 44, height: Math.min(190, 1400 - top - 30), rx: 6, fill: '#1A1626', stroke: INK, 'stroke-width': 4 }, body);
      const tint = mk('rect', { x, y: top, width: KW - 4, height: 1400 - top, fill: col, opacity: 0 }, body);
      const ring = mk('ellipse', { cx: x + (KW - 4) / 2, cy: top + 4, fill: 'none', stroke: col, 'stroke-width': 6, opacity: 0, filter: 'url(#glow)' }, M.stairs);
      const waves = [0, 1, 2].map(() => mk('path', { fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0 }, M.stairs));
      M.keys.push({ g: body, beam, tint, ring, waves, x, top, col, t: beat(TIMING.music.hops[i][0]) });
    });
  }
  // bord de scène : rampe de projecteurs
  M.foot = g(root);
  mk('rect', { x: -1400, y: 1568, width: width + 4000, height: 30, fill: '#2A2440', stroke: INK, 'stroke-width': 4 }, M.foot);
  M.footLights = [];
  for (let i = -12; i < (width + 3000) / 120; i++) { M.footLights.push(mk('ellipse', { cx: i * 120 + 60, cy: 1583, rx: 26, ry: 9, fill: ['#FFD23C', '#FF3C8E', '#3CE8FF'][((i % 3) + 3) % 3], filter: 'url(#glow)' }, M.foot)); }
  // premier plan : le public vu de dos (têtes, bras levés, téléphones qui filment), léger flou de profondeur
  M.fore = g(root, { filter: 'url(#b3)' });
  M.backFans = [];
  for (let i = -8; i < (width * 1.4 + 3000) / 150; i++) {
    const fg = g(M.fore), R2 = rng(900 + i * 13), col = ['#2A1D48', '#33224F', '#241A3E'][((i % 3) + 3) % 3];
    const r = 62 + R2() * 22;
    markup(fg, `<path d="M ${-r * 1.9} 400 Q ${-r * 1.8} ${r * 0.9} 0 ${r * 0.8} Q ${r * 1.8} ${r * 0.9} ${r * 1.9} 400 Z" fill="${col}"/><circle cx="0" cy="0" r="${r2(r)}" fill="${col}"/>
      <path d="M ${r2(-r * 0.9)} -20 A ${r2(r)} ${r2(r)} 0 0 1 ${r2(r * 0.7)} ${r2(-r * 0.7)}" fill="none" stroke="#FF9A5C" stroke-width="8" opacity="0.9"/>`);
    let arm = null, prop = null;
    if (R2() < 0.55) {
      arm = mk('path', { fill: 'none', stroke: col, 'stroke-width': 30, 'stroke-linecap': 'round' }, fg);
      prop = R2() < 0.5 ? mk('rect', { width: 38, height: 62, rx: 7, fill: '#BFF4FF', stroke: '#1A1626', 'stroke-width': 6, filter: 'url(#glow)' }, fg) : mk('path', { stroke: ['#4DFF8F', '#FFD23C', '#FF3C8E'][i & 1 ? 0 : 2], 'stroke-width': 12, 'stroke-linecap': 'round', filter: 'url(#glow)' }, fg);
    }
    M.backFans.push({ g: fg, arm, prop, x: i * 150 + R2() * 40, side: R2() < 0.5 ? -1 : 1, seed: i, r });
  }
};

/* ----- instants des coups (instrument, main, position à l'arrêt) ----- */
function musicHits() {
  if (MUSIC.hits) return MUSIC.hits;
  const hops = TIMING.music.hops.map(([k, note], i) => ({ t: beat(k), kind: 'key', i, note }));
  let snareN = 0;
  const drums = TIMING.music.drums.map(([k, kind]) => {
    let hand = null;
    if (kind === 'crash' || kind === 'tom2') hand = 'R';
    else if (kind === 'tom1') hand = 'L';
    else if (kind === 'snare') { hand = snareN === 2 ? 'R' : 'L'; snareN++; }
    return { t: beat(k), kind, hand };
  });
  return (MUSIC.hits = { hops, drums, all: [...hops, ...drums].sort((a, b) => a.t - b.t) });
}
// énergie musicale (0 → ~1,5) : un peu à chaque temps de la musique de fond, beaucoup à chaque coup
MUSIC.energy = function (t) {
  const H = musicHits();
  let e = 0.35 * Math.exp(-(((t - TD) % BEAT + BEAT) % BEAT) / 0.1);
  for (const h of H.all) { const d = t - h.t; if (d >= 0 && d < 0.6) e += (h.kind === 'kick' ? 1 : h.kind === 'key' ? 0.7 : 0.5) * Math.exp(-d / 0.12); }
  return e;
};
MUSIC.shake = function (t) {
  const H = musicHits(); let shake = 0, punch = 0;
  for (const h of H.all) {
    const d = t - h.t; if (d < 0 || d > 0.35) continue;
    const a = { key: 4, kick: 12, crash: 7, snare: 4, tom1: 5, tom2: 5 }[h.kind] || 3;
    shake += a * Math.exp(-d / 0.08); punch += a * 0.0025 * Math.exp(-d / 0.1);
  }
  return { shake, punch };
};

MUSIC.update = function (t, u, robot) {
  const M = MUSIC, H = musicHits();
  const L = (el, f, dx = 0) => attr(el, 'transform', `translate(${r2(-u * f + dx)} 0)`);
  const en = M.energy(t);
  M.starEl.forEach((s, i) => attr(s, 'opacity', r2(0.35 + 0.65 * Math.abs(Math.sin(t * (1 + hash(i) * 3) + i)))));
  attr(M.sun, 'transform', `translate(${r2(M.at(800, 0.03) - u * 0.03)} 800)`);
  M.sunBars.forEach((b, k) => {
    const c = -270 + k * 20 + 10, half = Math.sqrt(Math.max(0, 270 * 270 - c * c));
    const h = half * (0.45 + 0.35 * Math.abs(Math.sin(t * 5 + k * 0.7)) + 0.35 * en * hash(k * 3 + Math.floor(t * 15)));
    attr(b, 'y', r2(-Math.min(half, h))); attr(b, 'height', r2(2 * Math.min(half, h)));
  });
  { let d = 'M -290 0'; for (let x = -290; x <= 290; x += 10) d += ` L ${x} ${r2(Math.sin(x * 0.06 + t * 14) * (10 + 40 * en) * Math.cos(x / 290 * Math.PI / 2))}`; attr(M.sunLine, 'd', d); }
  L(M.far, 0.08); L(M.far2, 0.14); L(M.twin, 0.18); L(M.mid, 0.4); L(M.sky, 0.5); L(M.crowd, 0.7); L(M.street, 1); L(M.stairs, 1); L(M.foot, 1);
  attr(M.fore, 'transform', '');
  M.twinWin.forEach(w => { const lvl = 8 + 12 * clamp(en * (0.6 + 0.4 * hash(w.k * 5 + w.c + Math.floor(t * 12)))); attr(w.el, 'opacity', w.r < lvl ? 1 : 0.12); });
  const pump = s => 1 + 0.1 * s;
  M.cones.forEach((c, i) => attr(c.g, 'transform', `translate(${c.x} ${c.y}) scale(${r2(pump(en * (0.7 + 0.3 * hash(i))))})`));
  M.vinyls.forEach(v => attr(v.g, 'transform', `translate(${v.x} ${v.y}) rotate(${r2(t * 60)})`));
  M.floatNotes.forEach((n, i) => {
    const ph = (t * (0.18 + hash(i) * 0.12) + hash(i * 3)) % 1;
    const xx = M.at(0, 0.5) - 300 + hash(i * 7) * 1700 + Math.sin(t * 2 + i) * 30, yy = 1100 - ph * 900;
    attr(n, 'transform', `translate(${r2(xx)} ${r2(yy)}) rotate(${r2(Math.sin(t * 3 + i) * 15)}) scale(${r2(0.8 + hash(i * 5) * 0.8)})`);
    attr(n, 'opacity', r2(Math.sin(ph * Math.PI) * 0.9));
  });
  M.laserEl.forEach((l, i) => {
    const ox = M.at(i % 2 ? 980 : 80, 0.7) + Math.floor(i / 2) * 20 - u * 0.7, oy = 1240;
    const a = -Math.PI / 2 + Math.sin(t * (1.3 + i * 0.2) + i * 1.7) * 0.7 + (i % 2 ? -0.25 : 0.25);
    attr(l, 'd', `M ${r2(ox)} ${oy} L ${r2(ox + Math.cos(a) * 1500)} ${r2(oy + Math.sin(a) * 1500)}`);
    attr(l, 'opacity', r2(0.25 + 0.4 * clamp(en)));
  });
  M.fans.forEach(f => {
    const b = Math.abs(Math.sin((t - TD) / BEAT * Math.PI + f.seed)) * (8 + 10 * clamp(en));
    const up = 0.5 + 0.5 * Math.sin(t * 4 + f.seed);
    const hx = 26 + up * 10, hy = -160 - up * 40;
    attr(f.g, 'transform', `translate(${f.x} ${r2(1340 - b)}) scale(1.25)`);
    attr(f.arm, 'd', `M 20 -80 Q 40 -120 ${r2(hx)} ${r2(hy)}`);
    attr(f.stick, 'd', `M ${r2(hx)} ${r2(hy)} L ${r2(hx + 10 + Math.sin(t * 6 + f.seed) * 14)} ${r2(hy - 50)}`);
  });
  M.footLights.forEach((l, i) => attr(l, 'opacity', r2(0.4 + 0.6 * clamp(en) * (0.5 + 0.5 * hash(i + Math.floor(t * 8))))));
  M.backFans.forEach(f => {
    const b = Math.abs(Math.sin((t - TD) / BEAT * Math.PI + f.seed * 0.7)) * (14 + 16 * clamp(en));
    const x = f.x - u * 1.4;
    if (x < -300 || x > W + 300) { vis(f.g, false); return; }
    vis(f.g, true);
    attr(f.g, 'transform', `translate(${r2(x)} ${r2(1750 - b)})`);
    if (f.arm) {
      const sw = Math.sin(t * 5 + f.seed) * 20, hx = f.side * (f.r * 1.1) + sw, hy = -f.r * 2.3 - b * 0.5;
      attr(f.arm, 'd', `M ${r2(f.side * f.r * 1.2)} ${r2(f.r * 1.2)} Q ${r2(f.side * f.r * 1.6)} ${r2(-f.r * 0.6)} ${r2(hx)} ${r2(hy)}`);
      if (f.prop.tagName === 'rect') { attr(f.prop, 'x', r2(hx - 17)); attr(f.prop, 'y', r2(hy - 64)); }
      else attr(f.prop, 'd', `M ${r2(hx)} ${r2(hy)} L ${r2(hx + sw * 0.6)} ${r2(hy - 90)}`);
    }
  });
  // route-clavier : les touches s'enfoncent et s'allument sous les roues
  const wheels = [robot[0] + FW[0] * RS, robot[0] + RW[0] * RS];
  M.roadKeys.forEach(k => {
    const sx = k.x - u;
    if (sx < -120 || sx > W + 60) return;
    const on = wheels.some(w => w > sx - 10 && w < sx + 84);
    attr(k.g, 'transform', on ? 'translate(0 6)' : '');
    attr(k.glow, 'opacity', on ? 0.75 : 0); if (on) attr(k.glow, 'fill', k.col);
  });
  // escalier : chaque touche s'enfonce, s'allume, lance un faisceau et des ondes quand le robot atterrit
  M.keys.forEach(k => {
    const d = t - k.t, hit = d >= 0 && d < 0.9;
    const press = d >= 0 && d < 0.3 ? 14 * Math.exp(-d / 0.08) : 0;
    const hold = t >= k.t && t < k.t + BEAT / 2 + 0.02 ? 1 : 0;   // tant que le robot est dessus
    attr(k.g, 'transform', `translate(0 ${r2(press + hold * 4)})`);
    attr(k.tint, 'opacity', r2(hit ? 0.75 * Math.exp(-d / 0.35) : 0));
    attr(k.beam, 'opacity', r2(hit ? 0.55 * Math.exp(-d / 0.3) : 0));
    const rr = d >= 0 && d < 0.5 ? d / 0.5 : -1;
    attr(k.ring, 'opacity', r2(rr >= 0 ? 1 - rr : 0)); attr(k.ring, 'rx', r2(30 + rr * 150)); attr(k.ring, 'ry', r2(8 + rr * 30));
    k.waves.forEach((w, j) => {   // arcs de vibration « ))) » de chaque côté
      const q = d - j * 0.06;
      if (!(q >= 0 && q < 0.45)) { attr(w, 'opacity', 0); return; }
      const R0 = 50 + q * 260, cx = k.x + 39, cy = k.top - 40;
      attr(w, 'd', `M ${r2(cx + R0 * 0.7)} ${r2(cy - R0 * 0.6)} Q ${r2(cx + R0 * 1.05)} ${r2(cy)} ${r2(cx + R0 * 0.7)} ${r2(cy + R0 * 0.6)} M ${r2(cx - R0 * 0.7)} ${r2(cy - R0 * 0.6)} Q ${r2(cx - R0 * 1.05)} ${r2(cy)} ${r2(cx - R0 * 0.7)} ${r2(cy + R0 * 0.6)}`);
      attr(w, 'opacity', r2(1 - q / 0.45));
    });
  });
  if (M.stageCones) {
    let kick = 0; for (const h of H.drums) if (h.kind === 'kick') { const d = t - h.t; if (d >= 0 && d < 0.5) kick += Math.exp(-d / 0.09); }
    M.stageCones.forEach(c => attr(c.g, 'transform', `translate(${c.x} ${c.y}) scale(${r2(1 + 0.08 * en + 0.22 * kick)})`));
    M.stageLeds.forEach((l, i) => attr(l, 'opacity', r2((Math.floor(t * 10) + i) % 3 === 0 ? 1 : 0.3 + 0.7 * clamp(en - 0.4))));
  }
};

/* ----- la batterie (devant le robot) et les particules : couche des acteurs ----- */
MUSIC.buildFx = function (layer) {
  const M = MUSIC; if (!M.stop) return;
  const F = M.fx = { g: g(layer) };
  const kitG = F.kit = g(F.g);
  const drum = (d, shell) => {   // fût vu de face, légèrement du dessus
    const dg = g(kitG);
    mk('path', { d: `M ${-d.rx} 0 L ${-d.rx} ${d.h} A ${d.rx} ${d.ry} 0 0 0 ${d.rx} ${d.h} L ${d.rx} 0 Z`, fill: shell, stroke: INK, 'stroke-width': 5 }, dg);
    mk('path', { d: `M ${-d.rx} ${d.h * 0.5} A ${d.rx} ${d.ry} 0 0 0 ${d.rx} ${d.h * 0.5}`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3, opacity: 0.35 }, dg);
    const skin = g(dg);
    mk('ellipse', { cx: 0, cy: 0, rx: d.rx, ry: d.ry, fill: '#F4F1E8', stroke: INK, 'stroke-width': 5 }, skin);
    const flash = mk('ellipse', { cx: 0, cy: 0, rx: d.rx, ry: d.ry, fill: '#FFFFFF', opacity: 0 }, skin);
    return { g: dg, skin, flash, d };
  };
  // pieds et supports
  markup(kitG, `<g stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none">
    <path d="M ${KIT.snare.x} ${KIT.snare.y + 30} L ${KIT.snare.x - 26} ${DRUM_FLOOR} M ${KIT.snare.x} ${KIT.snare.y + 30} L ${KIT.snare.x + 22} ${DRUM_FLOOR}"/>
    <path d="M ${KIT.crash.x} ${KIT.crash.y} L ${KIT.crash.x - 8} ${DRUM_FLOOR} M ${KIT.crash.x - 8} ${DRUM_FLOOR - 40} L ${KIT.crash.x - 38} ${DRUM_FLOOR} M ${KIT.crash.x - 8} ${DRUM_FLOOR - 40} L ${KIT.crash.x + 24} ${DRUM_FLOOR}"/>
    <path d="M ${KIT.tom1.x + 10} ${KIT.tom1.y + 30} L ${KIT.kick.x} ${KIT.kick.y - 50} L ${KIT.tom2.x - 10} ${KIT.tom2.y + 30}"/></g>`);
  F.crashG = g(kitG);
  mk('ellipse', { cx: 0, cy: 0, rx: KIT.crash.rx, ry: KIT.crash.ry, fill: '#E8B84A', stroke: INK, 'stroke-width': 5 }, F.crashG);
  mk('ellipse', { cx: 0, cy: -2, rx: KIT.crash.rx * 0.55, ry: KIT.crash.ry * 0.5, fill: 'none', stroke: '#FFE9A8', 'stroke-width': 3 }, F.crashG);
  mk('circle', { cx: 0, cy: -3, r: 6, fill: '#B8862A', stroke: INK, 'stroke-width': 3 }, F.crashG);
  F.crashShine = mk('ellipse', { cx: 0, cy: 0, rx: KIT.crash.rx, ry: KIT.crash.ry, fill: '#FFFFFF', opacity: 0 }, F.crashG);
  F.snare = drum(KIT.snare, '#C9D1D9');
  // grosse caisse (vue de face) avec une onde sur la peau
  F.kickG = g(kitG);
  mk('circle', { r: KIT.kick.r + 8, fill: '#FF3C6E', stroke: INK, 'stroke-width': 6 }, F.kickG);
  mk('circle', { r: KIT.kick.r - 4, fill: '#F4F1E8', stroke: INK, 'stroke-width': 4 }, F.kickG);
  markup(F.kickG, `<path d="M -40 0 L -28 0 L -20 -22 L -10 24 L 0 -34 L 10 30 L 20 -16 L 28 0 L 40 0" fill="none" stroke="#FF3C6E" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`);
  F.kickFlash = mk('circle', { r: KIT.kick.r - 4, fill: '#FFFFFF', opacity: 0 }, F.kickG);
  F.tom1 = drum(KIT.tom1, '#FF3C6E');
  F.tom2 = drum(KIT.tom2, '#FF3C6E');
  // baguettes (tenues par le robot)
  F.sticks = ['L', 'R'].map(() => { const sg = g(F.g); const a = mk('path', { stroke: INK, 'stroke-width': 12, 'stroke-linecap': 'round' }, sg); const b = mk('path', { stroke: '#E9C98A', 'stroke-width': 6, 'stroke-linecap': 'round' }, sg); return { g: sg, a, b }; });
  // ondes de choc, vibrations, notes qui s'envolent
  const H = musicHits();
  F.rings = H.drums.map(h => mk('ellipse', { fill: 'none', stroke: h.kind === 'crash' ? '#FFE9A8' : h.kind === 'kick' ? '#FF3C6E' : '#FFFFFF', 'stroke-width': 5, opacity: 0, filter: 'url(#glow)' }, F.g));
  F.vib = H.drums.map(() => [0, 1].map(() => mk('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0 }, F.g)));
  F.notes = [];
  H.all.forEach((h, j) => {
    const col = h.kind === 'key' ? NOTE_COL[h.note] : ['#FFD23C', '#3CE8FF', '#FF3C8E', '#4DFF8F'][j % 4];
    for (let q = 0; q < (h.kind === 'key' ? 3 : h.kind === 'kick' || h.kind === 'crash' ? 1 : 0); q++) { const n = noteGlyph(F.g, col, (j + q) % 3 === 0); vis(n, false); F.notes.push({ n, h, q, j }); }
  });
  vis(F.g, false);
};
function kitPos(h) { const k = KIT[h.kind]; return k ? [k.x, k.y] : [0, 0]; }
// position de la main (repère « écran à l'arrêt ») et angle de la baguette à l'instant t, pour une main
function stickAt(t, hand) {
  const H = musicHits().drums.filter(h => h.hand === hand);
  const side = hand === 'L' ? -1 : 1;
  const down = h => { const [x, y] = kitPos(h); return { x: x + side * 50, y: y - 80, a: Math.atan2(80, -side * 50) }; };
  const up = (h, amt = 1) => { const d = down(h); return { x: d.x + side * 16 * amt, y: d.y - 90 * amt, a: d.a - side * 1.25 * amt }; };
  const mix = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), a: lerp(p.a, q.a, u) });
  let p = null, n = null;
  for (const h of H) { if (h.t <= t) p = h; else if (!n) n = h; }
  if (!p) { const d = n.t - t; return mix(up(n), down(n), d < 0.07 ? E.in(1 - d / 0.07) : 0); }
  if (!n) {   // après le dernier coup : baguette levée en l'air
    const d = t - p.t; const hi = { x: DRUM_X + side * 120, y: 700, a: -Math.PI / 2 + side * 0.4 };
    return mix(down(p), hi, E.out(clamp((d - 0.04) / 0.2)));
  }
  const gap = n.t - p.t, d = t - p.t, strike = Math.min(0.07, gap * 0.45), amt = clamp(gap / 0.3, 0.35, 1);
  if (d < gap - strike) return mix(down(p), up(n, amt), E.out(clamp(d / Math.max(0.03, gap - strike))));
  return mix(up(n, amt), down(n), E.in(clamp((d - (gap - strike)) / strike)));
}
MUSIC.updateFx = function (t, cx) {
  const M = MUSIC, F = M.fx; if (!F) return;
  const st = M.stop, off = st.P - PARK_X - cx;
  const on = t >= beat(TIMING.stops.music.park) - 1 && t < beat(TIMING.stops.music.go) + 1.2 && off > -1400 && off < 1400;
  vis(F.g, on); if (!on) return;
  attr(F.g, 'transform', `translate(${r2(off)} 0)`);
  const H = musicHits();
  const hitD = kind => { let best = 9; for (const h of H.drums) if (h.kind === kind && t >= h.t) best = Math.min(best, t - h.t); return best; };
  const bump = d => (d < 0.4 ? Math.exp(-d / 0.08) : 0);
  // fûts qui s'écrasent puis rebondissent, peau qui flashe
  for (const [key, D] of [['snare', F.snare], ['tom1', F.tom1], ['tom2', F.tom2]]) {
    const d = hitD(key), b = bump(d), wob = d < 0.5 ? Math.sin(d * 60) * Math.exp(-d / 0.12) : 0;
    attr(D.g, 'transform', `translate(${D.d.x} ${r2(D.d.y + b * 5)}) scale(${r2(1 + 0.08 * wob)} ${r2(1 - 0.08 * wob)})`);
    attr(D.flash, 'opacity', r2(b * 0.9));
  }
  const dk = hitD('kick'), bk = bump(dk), wk = dk < 0.5 ? Math.sin(dk * 50) * Math.exp(-dk / 0.14) : 0;
  attr(F.kickG, 'transform', `translate(${KIT.kick.x} ${KIT.kick.y}) scale(${r2(1 + 0.1 * wk + 0.05 * bk)})`);
  attr(F.kickFlash, 'opacity', r2(bk * 0.8));
  const dc = hitD('crash'), wc = dc < 1.2 ? Math.sin(dc * 28) * Math.exp(-dc / 0.35) : 0;
  attr(F.crashG, 'transform', `translate(${KIT.crash.x} ${KIT.crash.y}) rotate(${r2(-10 + 16 * wc)}) scale(1 ${r2(1 + 0.6 * wc)})`);
  attr(F.crashShine, 'opacity', r2(bump(dc) * 0.9));
  // baguettes : de la main vers la peau (seulement quand il joue)
  const playing = t >= H.drums[0].t - 0.02 && t < beat(TIMING.music.jumpBack);
  F.sticks.forEach((s, i) => {
    vis(s.g, playing); if (!playing) return;
    const p = stickAt(t, i ? 'R' : 'L'), L = 96;
    const d = `M ${r2(p.x - Math.cos(p.a) * 18)} ${r2(p.y - Math.sin(p.a) * 18)} L ${r2(p.x + Math.cos(p.a) * L)} ${r2(p.y + Math.sin(p.a) * L)}`;
    attr(s.a, 'd', d); attr(s.b, 'd', d);
  });
  // ondes de choc et vibrations « ) ) » autour des fûts
  H.drums.forEach((h, j) => {
    const d = t - h.t, [x, y] = kitPos(h), big = h.kind === 'kick' ? 2 : h.kind === 'crash' ? 1.6 : 1;
    const r = F.rings[j];
    if (d >= 0 && d < 0.45) { const q = d / 0.45; attr(r, 'opacity', r2((1 - q) * 0.9)); attr(r, 'cx', x); attr(r, 'cy', y); attr(r, 'rx', r2((40 + q * 120) * big)); attr(r, 'ry', r2((12 + q * 36) * big)); }
    else attr(r, 'opacity', 0);
    F.vib[j].forEach((v, s) => {
      if (!(d >= 0 && d < 0.35)) { attr(v, 'opacity', 0); return; }
      const sd = s ? 1 : -1, R0 = (50 + d * 120) * (big > 1 ? 1.2 : 1), jit = Math.sin(d * 90) * 4;
      attr(v, 'd', `M ${r2(x + sd * R0 * 0.8 + jit)} ${r2(y - 40)} Q ${r2(x + sd * R0 + jit)} ${r2(y)} ${r2(x + sd * R0 * 0.8 + jit)} ${r2(y + 40)} M ${r2(x + sd * (R0 * 0.8 + 26))} ${r2(y - 30)} Q ${r2(x + sd * (R0 + 26))} ${r2(y)} ${r2(x + sd * (R0 * 0.8 + 26))} ${r2(y + 30)}`);
      attr(v, 'opacity', r2(1 - d / 0.35));
    });
  });
  // notes qui jaillissent de chaque touche / fût
  F.notes.forEach(o => {
    const d = t - o.h.t; const onN = d >= 0 && d < 1.1;
    vis(o.n, onN); if (!onN) return;
    let x0, y0;
    if (o.h.kind === 'key') { x0 = keyCx(o.h.i); y0 = keyTop(o.h.i) - 30; } else [x0, y0] = kitPos(o.h);
    const a = -Math.PI / 2 + (o.q - (o.h.kind === 'key' ? 1 : 0.5)) * 0.7 + (hash(o.j * 3 + o.q) - 0.5) * 0.4, v = 520 + hash(o.j + o.q * 7) * 260;
    const x = x0 + Math.cos(a) * v * d, y = y0 + Math.sin(a) * v * d + 380 * d * d;
    const s = E.back(clamp(d / 0.18)) * (0.9 + 0.3 * hash(o.j * 11 + o.q));
    attr(o.n, 'transform', `translate(${r2(x)} ${r2(y)}) rotate(${r2(Math.sin(d * 9 + o.q) * 20)}) scale(${r2(s)})`);
    attr(o.n, 'opacity', r2(1 - clamp((d - 0.7) / 0.4)));
  });
};

/* ----- le robot à pied : saute sur les touches puis joue de la batterie ----- */
MUSIC.actor = function (t, cx, seat) {
  const st = MUSIC.stop, off = st.P - PARK_X - cx;
  const hops = musicHits().hops, tm = TIMING.music;
  const tDr = beat(tm.toDrums), tBack = beat(tm.jumpBack), d0 = musicHits().drums[0].t;
  const onKey = i => [keyCx(i) + off, standY(keyTop(i))];
  const drumSpot = [DRUM_X + off, standY(DRUM_FLOOR) - 48];   // perché sur le tabouret (caché derrière la grosse caisse)
  let x, y, face = 'satisfait', arms = ARMS.cheer, rot = 0, sx = 1, sy = 1, look = [8, -6], headRot = 0, lay = { L: 'front', R: 'front' };
  const land = (tl) => { const d = t - tl; return d >= 0 && d < 0.09 ? Math.sin(d / 0.09 * Math.PI) : 0; };
  if (t < hops[0].t) {   // saut de la selle vers la première touche
    const j = jumpArc(t, st.off, hops[0].t, seat, onKey(0), 150);
    x = j.x; y = j.y; rot = lerp(-12, 0, j.u); face = 'curieux'; arms = ARMS.cheer;
  } else if (t < hops[hops.length - 1].t) {   // de touche en touche (une note par saut)
    let i = 0; while (i < hops.length - 1 && t >= hops[i + 1].t) i++;
    const j = jumpArc(t, hops[i].t, hops[i + 1].t, onKey(i), onKey(i + 1), 70);
    x = j.x; y = j.y; const sq = land(hops[i].t);
    sy = 1 - 0.14 * sq; sx = 1 + 0.1 * sq; rot = Math.sin(j.u * Math.PI) * -6;
    arms = j.u > 0.15 && j.u < 0.85 ? ARMS.cheer : ARMS.down; face = i % 2 ? 'satisfait' : 'surpris'; look = [10, -8];
  } else if (t < tDr) {   // sur la dernière touche
    [x, y] = onKey(hops.length - 1); const sq = land(hops[hops.length - 1].t); sy = 1 - 0.14 * sq; sx = 1 + 0.1 * sq; arms = ARMS.cheer;
  } else if (t < d0 - 0.02) {   // saut derrière la batterie (il sort ses baguettes)
    const j = jumpArc(t, tDr, d0 - 0.02, onKey(hops.length - 1), drumSpot, 90);
    x = j.x; y = j.y; face = 'satisfait'; rot = lerp(-8, 0, j.u);
  } else if (t < tBack) {   // il joue : bras calés sur les baguettes, tête qui bat la mesure
    [x, y] = drumSpot;
    let kick = 0, any = 0;
    for (const h of musicHits().drums) { const d = t - h.t; if (d >= 0 && d < 0.3) { any += Math.exp(-d / 0.08); if (h.kind === 'kick') kick += Math.exp(-d / 0.08); } }
    y += 6 * Math.min(1, any); headRot = -6 * Math.min(1, any) + Math.sin(t * 12) * 3; face = t > musicHits().drums.at(-1).t ? 'satisfait' : any > 0.3 ? 'surpris' : 'satisfait';
    const toLocal = (p, shx) => [(p.x + off - x) / RS, (p.y - y) / RS];
    const hl = stickAt(t, 'L'), hr = stickAt(t, 'R');
    const [lx, ly] = toLocal(hl), [rx, ry] = toLocal(hr);
    arms = { L: [-62, 40, lerp(-62, lx, 0.5) - 40, lerp(40, ly, 0.5) + 20, lx, ly], R: [62, 40, lerp(62, rx, 0.5) + 40, lerp(40, ry, 0.5) + 20, rx, ry] };
    look = [0, 10]; lay = { L: 'top', R: 'top' };
  } else {   // retour sur la mobylette, d'un grand saut
    const j = jumpArc(t, tBack, st.on, drumSpot, seat, 230);
    x = j.x; y = j.y; face = 'satisfait'; arms = ARMS.cheer; rot = lerp(0, -14, j.u);
  }
  return { x, y, rot, sx, sy, face, look, arms, armLayer: lay, headRot };
};
