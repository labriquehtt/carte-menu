// MONDE 2 — cyberpunk sous la pluie : deepfakes géants (le visage change), cadenas qui éclatent,
// hackers encapuchonnés, drones qui scannent, voitures volantes, reflets de néons sur le bitume mouillé.
'use strict';
function cyberDefs() {
  const d = DEFS();
  rectGrad(d, 'cbSky', [[0, '#05030F'], [0.35, '#12093A'], [0.6, '#2B0F55'], [0.8, '#4A1266'], [1, '#12061E']]);
  rectGrad(d, 'cbTowerFar', [[0, '#1B1240'], [1, '#2E1856']]);
  rectGrad(d, 'cbTower', [[0, '#120C2A'], [1, '#1E1238']]);
  rectGrad(d, 'cbRoad', [[0, '#150E26'], [1, '#07040F']]);
  rectGrad(d, 'cbRefl', [[0, '#FF2E88', 0.55], [1, '#FF2E88', 0]]);
  rectGrad(d, 'cbReflC', [[0, '#19F0FF', 0.5], [1, '#19F0FF', 0]]);
  radGrad(d, 'cbFog', [[0, '#FF2E88', 0.35], [1, '#FF2E88', 0]]);
  radGrad(d, 'cbFogC', [[0, '#19F0FF', 0.3], [1, '#19F0FF', 0]]);
  rectGrad(d, 'cbFace', [[0, '#FFD1B8'], [1, '#E09A7A']]);
  rectGrad(d, 'cbFace2', [[0, '#B8E8FF'], [1, '#6AA8D8']]);
}
const NEON = ['#FF2E88', '#19F0FF', '#FFE14D', '#B14DFF', '#3DFF9E'];

// visage stylisé pour les panneaux « deepfake » (A ou B)
function fakeFace(parent, which) {
  const f = g(parent);
  if (which === 0) markup(f, `<ellipse cx="0" cy="10" rx="120" ry="150" fill="url(#cbFace)"/><path d="M -126 -20 Q -120 -170 0 -168 Q 120 -170 126 -20 Q 100 -110 0 -112 Q -100 -110 -126 -20 Z" fill="#3A1E12"/>
    <ellipse cx="-44" cy="0" rx="16" ry="10" fill="#1B1020"/><ellipse cx="44" cy="0" rx="16" ry="10" fill="#1B1020"/><path d="M -70 -30 L -22 -24 M 22 -24 L 70 -30" stroke="#3A1E12" stroke-width="8" stroke-linecap="round"/>
    <path d="M 0 10 L -10 60 L 8 62" fill="none" stroke="#B5705A" stroke-width="5"/><path d="M -40 96 Q 0 120 40 96" fill="none" stroke="#8A2A3A" stroke-width="9" stroke-linecap="round"/>`);
  else markup(f, `<ellipse cx="0" cy="10" rx="120" ry="150" fill="url(#cbFace2)"/><path d="M -120 -40 Q -110 -176 10 -170 Q 124 -160 124 -40 L 110 -80 Q 60 -120 -20 -118 Q -90 -110 -120 -40 Z" fill="#E8E8F0"/>
    <rect x="-70" y="-14" width="52" height="28" rx="8" fill="#1B1020"/><rect x="18" y="-14" width="52" height="28" rx="8" fill="#1B1020"/><path d="M -18 0 L 18 0" stroke="#1B1020" stroke-width="6"/>
    <path d="M 0 16 L -8 58 L 10 60" fill="none" stroke="#4A7AA8" stroke-width="5"/><path d="M -46 94 Q 0 84 46 94" fill="none" stroke="#2A3A6A" stroke-width="9" stroke-linecap="round"/>`);
  return f;
}

const CYBER = { id: 'cyber' };
CYBER.build = function (root, width) {
  cyberDefs();
  const C = CYBER; C.width = width;
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#cbSky)' }, root);
  C.moon = g(root);
  mk('circle', { cx: 0, cy: 0, r: 250, fill: 'url(#cbFog)' }, C.moon);
  mk('circle', { cx: 0, cy: 0, r: 120, fill: '#FF5AA8', opacity: 0.9 }, C.moon);
  for (let k = 0; k < 7; k++) mk('rect', { x: -130, y: -60 + k * 22, width: 260, height: 6, fill: '#12093A' }, C.moon);
  // mégatours lointaines (0,15)
  C.far = g(root, { filter: 'url(#b1)' });
  const R = rng(71);
  let x = -900;
  while (x < width * 0.15 + 1800) {
    const w = 80 + R() * 140, h = 500 + R() * 700, top = 1250 - h;
    mk('rect', { x, y: top, width: w, height: h + 100, fill: 'url(#cbTowerFar)' }, C.far);
    const nc = NEON[Math.floor(R() * NEON.length)];
    mk('rect', { x: x + w * 0.5 - 2, y: top + 20, width: 4, height: h * 0.6, fill: nc, opacity: 0.7, filter: 'url(#glow)' }, C.far);
    for (let k = 0; k < 14; k++) if (R() < 0.6) mk('rect', { x: x + 8 + R() * (w - 18), y: top + 20 + R() * h, width: 6, height: 3, fill: '#8FE9FF', opacity: 0.6 }, C.far);
    if (R() < 0.3) mk('path', { d: `M ${x + w / 2} ${top} L ${x + w / 2} ${top - 120}`, stroke: '#2E1856', 'stroke-width': 6 }, C.far);
    x += w + 20 + R() * 60;
  }
  mk('rect', { x: -1000, y: 900, width: width + 4000, height: 420, fill: 'url(#cbFog)', opacity: 0.6 }, C.far);
  // voitures volantes (traînées lumineuses)
  C.cars = [...Array(9)].map((_, i) => {
    const cg = g(root);
    markup(cg, `<g><rect x="-34" y="-9" width="68" height="18" rx="9" fill="#1E1238" stroke="${NEON[i % 5]}" stroke-width="2"/><rect x="-60" y="-2" width="40" height="4" fill="${NEON[i % 5]}" opacity="0.8" filter="url(#glow)"/><circle cx="30" cy="0" r="4" fill="#FFFFFF" filter="url(#glow)"/></g>`);
    return { g: cg, y: 260 + i * 70, v: (i % 2 ? -1 : 1) * (260 + i * 40), x0: i * 237 };
  });
  // tours du milieu (0,45) : panneaux holo, kanjis-néons, fenêtres
  C.mid = g(root);
  C.boards = [];
  x = -700; let bi = 0;
  while (x < width * 0.45 + 1800) {
    const w = 260 + R() * 160, top = 380 + R() * 260;
    mk('rect', { x, y: top, width: w, height: 1300 - top, fill: 'url(#cbTower)', stroke: '#2A1B55', 'stroke-width': 4 }, C.mid);
    for (let yy = top + 40; yy < 1250; yy += 44) for (let xx = x + 18; xx < x + w - 20; xx += 34) if (R() < 0.45) mk('rect', { x: xx, y: yy, width: 18, height: 10, fill: R() < 0.5 ? '#3DE0FF' : '#FF4FA0', opacity: 0.35 + R() * 0.4 }, C.mid);
    const nc = NEON[bi % NEON.length];
    // enseigne verticale en néon
    const sg = g(C.mid, { filter: 'url(#neon)' });
    mk('rect', { x: x + w - 60, y: top + 60, width: 44, height: 300, rx: 10, fill: 'none', stroke: nc, 'stroke-width': 5 }, sg);
    const tx = mk('text', { x: x + w - 38, y: top + 110, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 34, fill: nc, 'writing-mode': 'tb', 'letter-spacing': 6 }, sg);
    tx.textContent = ['HACK', 'DATA', 'VPN', 'CODE', 'BOTS', '404'][bi % 6];
    // panneau holographique : deepfake (visage qui change) ou cadenas qui éclate
    if (bi % 2 === 0) {
      const bx = x + 40, by = top + 80, bw = Math.min(360, w - 110), bh = 360;
      const bg = g(C.mid);
      mk('rect', { x: bx - 8, y: by - 8, width: bw + 16, height: bh + 16, rx: 14, fill: '#0A0618', stroke: '#19F0FF', 'stroke-width': 4, filter: 'url(#neon)' }, bg);
      const clipId = 'cbClip' + bi;
      const cp = mk('clipPath', { id: clipId }, DEFS()); mk('rect', { x: bx, y: by, width: bw, height: bh, rx: 8 }, cp);
      const inner = g(bg, { 'clip-path': `url(#${clipId})` });
      mk('rect', { x: bx, y: by, width: bw, height: bh, fill: '#0F1840' }, inner);
      const fa = fakeFace(inner, 0), fb = fakeFace(inner, 1);
      const sc = bw / 300;
      [fa, fb].forEach(f => attr(f, 'transform', `translate(${bx + bw / 2} ${by + bh / 2 + 20}) scale(${r2(sc)})`));
      const slices = g(inner);
      const sl = [...Array(6)].map(() => mk('rect', { x: bx, y: by, width: bw, height: 20, fill: '#19F0FF', opacity: 0 }, slices));
      for (let k = 0; k < bh; k += 6) mk('rect', { x: bx, y: by + k, width: bw, height: 2, fill: '#000', opacity: 0.25 }, inner);
      const tag = g(bg);
      mk('rect', { x: bx + 14, y: by + bh - 58, width: 200, height: 44, rx: 6, fill: '#FF2E88' }, tag);
      const tt = mk('text', { x: bx + 114, y: by + bh - 26, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 30, fill: '#FFFFFF' }, tag);
      tt.textContent = 'DEEPFAKE';
      const live = g(bg); mk('circle', { cx: bx + 30, cy: by + 28, r: 9, fill: '#FF3B30' }, live);
      const lt = mk('text', { x: bx + 46, y: by + 38, 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 26, fill: '#FFFFFF' }, live); lt.textContent = 'LIVE';
      C.boards.push({ type: 'face', fa, fb, sl, bx, by, bw, bh, live, seed: bi });
    } else {
      const cx0 = x + w * 0.4, cy0 = top + 250;
      const lg = g(C.mid, { filter: 'url(#neon)' });
      const body = g(lg);
      markup(body, `<rect x="-80" y="-30" width="160" height="130" rx="20" fill="none" stroke="#FFE14D" stroke-width="10"/><circle cx="0" cy="30" r="16" fill="#FFE14D"/><rect x="-6" y="30" width="12" height="36" fill="#FFE14D"/>`);
      const shackle = mk('path', { d: 'M -50 -30 L -50 -80 Q -50 -130 0 -130 Q 50 -130 50 -80 L 50 -30', fill: 'none', stroke: '#FFE14D', 'stroke-width': 10 }, lg);
      const shards = [...Array(10)].map((_, k) => mk('path', { d: `M 0 0 L ${8 + k % 3 * 6} -6 L ${4 + k % 2 * 8} 12 Z`, fill: '#FFE14D' }, lg));
      C.boards.push({ type: 'lock', lg, body, shackle, shards, x: cx0, y: cy0, seed: bi });
    }
    x += w + 30; bi++;
  }
  // rue : bitume mouillé + reflets, stands, hackers encapuchonnés
  C.street = g(root);
  mk('rect', { x: -1400, y: 1328, width: width + 4000, height: 44, fill: '#1E1238', stroke: '#FF2E88', 'stroke-width': 3 }, C.street);
  mk('rect', { x: -1400, y: 1370, width: width + 4000, height: 600, fill: 'url(#cbRoad)' }, C.street);
  C.refl = g(C.street, { filter: 'url(#b6)' });
  for (let k = -8; k < (width + 3000) / 140; k++) mk('rect', { x: k * 140 + (k % 3) * 30, y: 1380, width: 40 + (k % 4) * 20, height: 240 + (k % 5) * 40, fill: k % 2 ? 'url(#cbRefl)' : 'url(#cbReflC)' }, C.refl);
  for (let k = -12; k < (width + 3000) / 160; k++) mk('rect', { x: k * 160, y: 1480, width: 80, height: 8, rx: 4, fill: '#19F0FF', opacity: 0.8, filter: 'url(#glow)' }, C.street);
  // flaques
  for (let k = 0; k < 10; k++) mk('ellipse', { cx: -300 + k * 420, cy: 1540 + (k % 3) * 60, rx: 90, ry: 14, fill: '#6A3AB0', opacity: 0.35 }, C.street);
  C.stalls = g(root);
  C.hackers = [];
  for (let k = 0; k < 4; k++) {
    const hx = 200 + k * 560;
    markup(C.stalls, `<g transform="translate(${hx} 1330)"><rect x="-120" y="-200" width="240" height="200" fill="#1A1030" stroke="#B14DFF" stroke-width="3"/>
      <path d="M -140 -200 L 140 -200 L 120 -250 L -120 -250 Z" fill="#2A1450" stroke="#FF2E88" stroke-width="3" filter="url(#neon)"/>
      <rect x="-100" y="-120" width="200" height="16" fill="#3DFF9E" opacity="0.5"/></g>`);
    const hg = g(C.stalls);
    markup(hg, `<g><path d="M -34 0 Q -40 -80 0 -96 Q 40 -80 34 0 Z" fill="#241A3A" stroke="#0A0618" stroke-width="4"/><path d="M -24 -60 Q 0 -110 24 -60 Q 0 -70 -24 -60 Z" fill="#0A0618"/>
      <path d="M -40 -20 L 40 -20 L 30 -44 L -30 -44 Z" fill="#9AA3AD" stroke="#0A0618" stroke-width="3"/><rect x="-26" y="-44" width="52" height="4" fill="#3DFF9E" filter="url(#glow)"/></g>`);
    const glow = mk('ellipse', { cx: 0, cy: -70, rx: 20, ry: 10, fill: '#3DFF9E', opacity: 0.6, filter: 'url(#b6)' }, hg);
    C.hackers.push({ g: hg, glow, x: hx + 60, y: 1330 });
  }
  // drones de surveillance qui balaient au laser
  C.drones = [0, 1].map(i => {
    const dg = g(root);
    const beam = mk('path', { fill: '#FF3B30', opacity: 0.18 }, dg);
    const body = g(dg);
    markup(body, `<rect x="-40" y="-12" width="80" height="24" rx="10" fill="#2A2F3A" stroke="${INK}" stroke-width="4"/><path d="M -60 -18 L 60 -18" stroke="${INK}" stroke-width="5"/><ellipse cx="-60" cy="-22" rx="22" ry="4" fill="#9AA3AD" opacity="0.7"/><ellipse cx="60" cy="-22" rx="22" ry="4" fill="#9AA3AD" opacity="0.7"/><circle cx="0" cy="12" r="10" fill="#FF3B30" filter="url(#glow)"/>`);
    return { g: dg, beam, body, i };
  });
  // pluie (premier plan)
  C.rain = g(root, { stroke: '#BFD8FF', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5 });
  C.drops = [...Array(90)].map(() => mk('path', {}, C.rain));
  C.splash = g(root, { fill: 'none', stroke: '#BFD8FF', 'stroke-width': 2, opacity: 0.6 });
  C.spl = [...Array(14)].map(() => mk('ellipse', {}, C.splash));
};
CYBER.update = function (t, u, robot) {
  const C = CYBER;
  const L = (el, f, dx = 0) => attr(el, 'transform', `translate(${r2(-u * f + dx)} 0)`);
  L(C.far, 0.15); L(C.mid, 0.45); L(C.street, 1); L(C.stalls, 0.8);
  attr(C.moon, 'transform', `translate(${r2(760 - u * 0.03)} 420)`);
  C.cars.forEach(c => { const xx = ((c.x0 + c.v * t - u * 0.2) % 1600 + 1600) % 1600 - 260; attr(c.g, 'transform', `translate(${r2(xx)} ${c.y}) scale(${c.v < 0 ? -1 : 1} 1)`); });
  for (const b of C.boards) {
    if (b.type === 'face') {
      const ph = (t * 2.4 + b.seed * 0.3) % 1, glitch = ph > 0.42 && ph < 0.6;
      const which = Math.floor(t * 2.4 + b.seed * 0.3) % 2;
      vis(b.fa, glitch ? Math.floor(t * 30) % 2 === 0 : which === 0); vis(b.fb, glitch ? Math.floor(t * 30) % 2 === 1 : which === 1);
      b.sl.forEach((s, k) => {
        const on = glitch && hash(k + Math.floor(t * 30)) < 0.6;
        attr(s, 'opacity', on ? 0.45 : 0); attr(s, 'y', r2(b.by + hash(k * 7 + Math.floor(t * 30)) * b.bh)); attr(s, 'height', r2(6 + hash(k * 3 + Math.floor(t * 30)) * 30));
        attr(s, 'fill', k % 2 ? '#19F0FF' : '#FF2E88');
      });
      [b.fa, b.fb].forEach(f => { const dx = glitch ? (hash(Math.floor(t * 30)) - 0.5) * 30 : 0; const base = f.getAttribute('transform').replace(/ translate\([^)]*\)$/, ''); attr(f, 'transform', base + ` translate(${r2(dx)} 0)`); });
      attr(b.live, 'opacity', (t * 2) % 1 < 0.6 ? 1 : 0.3);
    } else {
      const ph = ((t * 0.9 + b.seed * 0.17) % 1.4);
      const brk = clamp((ph - 0.5) / 0.15);
      attr(b.body, 'transform', `translate(${r2(b.x)} ${r2(b.y + brk * 20)}) rotate(${r2(brk * 8)})`);
      attr(b.shackle, 'transform', `translate(${r2(b.x - brk * 40)} ${r2(b.y - brk * 60)}) rotate(${r2(-brk * 40)})`);
      b.shards.forEach((s, k) => {
        const a = k / 10 * PI2, dd = brk * (60 + k * 12);
        attr(s, 'transform', `translate(${r2(b.x + Math.cos(a) * dd)} ${r2(b.y + Math.sin(a) * dd + brk * brk * 40)}) rotate(${r2(k * 40 + brk * 200)})`);
        attr(s, 'opacity', brk > 0 && brk < 1 ? 1 : brk >= 1 ? r2(clamp(1 - (ph - 0.65) / 0.4)) : 0);
      });
    }
  }
  C.hackers.forEach((h, k) => { attr(h.g, 'transform', `translate(${h.x} ${h.y}) scale(1.4)`); attr(h.glow, 'opacity', 0.4 + 0.3 * Math.abs(Math.sin(t * 6 + k))); });
  C.drones.forEach((d, i) => {
    const dx = 300 + i * 520 + Math.sin(t * 1.7 + i) * 60 - u * 0.6 + 400, dy = 560 + i * 120 + Math.sin(t * 2.3 + i * 2) * 20;
    const sweep = Math.sin(t * 2.2 + i * 1.3) * 0.5;
    const ex = dx + Math.sin(sweep) * 700, ey = dy + Math.cos(sweep) * 800;
    attr(d.body, 'transform', `translate(${r2(dx)} ${r2(dy)}) rotate(${r2(Math.sin(t * 3 + i) * 5)})`);
    attr(d.beam, 'd', `M ${r2(dx)} ${r2(dy + 12)} L ${r2(ex - 90)} ${r2(ey)} L ${r2(ex + 90)} ${r2(ey)} Z`);
  });
  C.drops.forEach((p, i) => {
    const sp = 2400, len = 70;
    const x0 = hash(i * 3.1) * 1400 - 200, y0 = hash(i * 7.7) * 2200;
    const y = ((y0 + t * sp) % 2200) - 200, x = ((x0 - t * 500 - u * 1.4) % 1400 + 1400) % 1400 - 200;
    attr(p, 'd', `M ${r2(x)} ${r2(y)} L ${r2(x - 16)} ${r2(y + len)}`);
  });
  C.spl.forEach((e, i) => {
    const ph = (t * 3 + hash(i) * 5) % 1;
    attr(e, 'cx', r2(((hash(i * 9) * 1400 - u * 1.0) % 1400 + 1400) % 1400 - 100)); attr(e, 'cy', r2(1400 + hash(i * 5) * 400));
    attr(e, 'rx', r2(4 + ph * 30)); attr(e, 'ry', r2(1 + ph * 6)); attr(e, 'opacity', r2(0.7 * (1 - ph)));
  });
};
