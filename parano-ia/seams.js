// Les coutures entre les mondes (repère écran, sous le zoom de la caméra) :
// 0 ville→cyber : bande de glitch · 1 cyber→dessin : trait de crayon · 2 dessin→corporate : page déchirée
// 3 corporate→bonbons : vague de pâte rose · 4 bonbons→apocalypse : bord qui brûle
'use strict';
const SEAM_FX = [];
function buildSeams(parent) {
  for (let i = 0; i < 5; i++) {
    const gs = g(parent);
    const F = { g: gs, parts: [] };
    if (i === 0) {
      F.band = [...Array(26)].map((_, k) => mk('rect', { fill: ['#FF2E88', '#19F0FF', '#FFFFFF', '#0B0620'][k % 4] }, gs));
    } else if (i === 1) {
      F.line = mk('path', { fill: 'none', stroke: '#34302B', 'stroke-width': 10, 'stroke-linecap': 'round' }, gs);
      F.line2 = mk('path', { fill: 'none', stroke: '#34302B', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.6 }, gs);
      F.crumbs = [...Array(14)].map(() => mk('circle', { fill: '#F2B8C8', stroke: '#34302B', 'stroke-width': 2 }, gs));
    } else if (i === 2) {
      F.shadow = mk('path', { fill: '#000000', opacity: 0.25, filter: 'url(#b6)' }, gs);
      F.edge = mk('path', { fill: '#FBF7EC', stroke: '#CFC4AC', 'stroke-width': 3 }, gs);
    } else if (i === 3) {
      F.goo = mk('path', { fill: '#FF7EB9', stroke: INK, 'stroke-width': 6 }, gs);
      F.hi = mk('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.6 }, gs);
      F.bub = [...Array(10)].map(() => mk('circle', { fill: '#FFC1E3', stroke: INK, 'stroke-width': 4 }, gs));
    } else {
      F.char = mk('path', { fill: '#1A0604' }, gs);
      F.fire = mk('path', { fill: 'none', stroke: '#FF7A1F', 'stroke-width': 10, filter: 'url(#neon)', 'stroke-linejoin': 'round' }, gs);
      F.emb = [...Array(18)].map(() => mk('circle', { r: 4, fill: '#FFB03C', filter: 'url(#glow)' }, gs));
    }
    SEAM_FX.push(F);
  }
}
function jag(x, amp, step, seed, t, speed = 0) {   // ligne verticale irrégulière (liste de points)
  const pts = [];
  for (let y = -300; y <= 2200; y += step) pts.push([x + noise1(y * 0.013 + seed + t * speed, seed) * amp + (hash(y * 0.37 + seed) - 0.5) * amp * 0.6, y]);
  return pts;
}
const polyD = pts => 'M ' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L ');
function updateSeams(t, cx) {
  SEAMS.forEach((s, i) => {
    const F = SEAM_FX[i]; if (!F) return;
    const x = s.S - cx;
    const on = x > -160 && x < W + 160 && t < T_LINEUP;
    vis(F.g, on); if (!on) return;
    if (i === 0) {   // glitch : tranches décalées, qui clignotent
      const fr = Math.floor(t * 30);
      F.band.forEach((r, k) => {
        const y = hash(k * 13 + fr) * 2000 - 40, h = 10 + hash(k * 7 + fr) * 90, w = 30 + hash(k * 3 + fr) * 140;
        attr(r, 'x', r2(x - w * (hash(k + fr * 3) < 0.5 ? 1 : 0))); attr(r, 'y', r2(y)); attr(r, 'width', r2(w)); attr(r, 'height', r2(h));
        attr(r, 'opacity', r2(0.5 + 0.5 * hash(k * 5 + fr)));
      });
    } else if (i === 1) {   // trait de crayon épais + miettes de gomme
      const q = Math.floor(t * 12);
      const pts = jag(x, 8, 40, 11 + q, 0);
      attr(F.line, 'd', polyD(pts)); attr(F.line2, 'd', polyD(jag(x + 10, 6, 50, 17 + q, 0)));
      F.crumbs.forEach((c, k) => { attr(c, 'cx', r2(x + 20 + hash(k * 3 + q) * 60)); attr(c, 'cy', r2(hash(k * 7) * 1900)); attr(c, 'r', r2(4 + hash(k) * 6)); });
    } else if (i === 2) {   // bord de papier déchiré (côté gauche = page), ombre portée sur le monde suivant
      const pts = jag(x + 10, 16, 22, 29, 0);
      const d = polyD(pts) + ` L ${r2(x - 60)} 2200 L ${r2(x - 60)} -300 Z`;
      attr(F.edge, 'd', d);
      attr(F.shadow, 'd', polyD(pts.map(([a, b]) => [a + 18, b])) + ` L ${r2(x - 40)} 2200 L ${r2(x - 40)} -300 Z`);
    } else if (i === 3) {   // vague de pâte rose qui coule
      const pts = [];
      for (let y = -300; y <= 2200; y += 40) pts.push([x + Math.sin(y * 0.012 + t * 6) * 26 + Math.sin(y * 0.031 - t * 4) * 12, y]);
      attr(F.goo, 'd', polyD(pts) + ` L ${r2(x + 80)} 2200 L ${r2(x + 80)} -300 Z`);
      attr(F.hi, 'd', polyD(pts.filter((_, k) => k % 3 === 0).map(([a, b]) => [a + 30, b])));
      F.bub.forEach((b, k) => { const y = ((hash(k) * 2000 - t * 300 * (0.5 + hash(k * 3))) % 2000 + 2000) % 2000; attr(b, 'cx', r2(x + 40 + hash(k * 9) * 40)); attr(b, 'cy', r2(y)); attr(b, 'r', r2(8 + hash(k * 5) * 16)); });
    } else {   // bord calciné qui brûle
      const pts = jag(x, 30, 30, 41, t, 3);
      attr(F.char, 'd', polyD(pts.map(([a, b]) => [a + 30, b])) + ` L ${r2(x - 40)} 2200 L ${r2(x - 40)} -300 Z`);
      attr(F.fire, 'd', polyD(pts));
      F.emb.forEach((e, k) => { const a = (t * 1.5 + hash(k)) % 1; attr(e, 'cx', r2(x + (hash(k * 3) - 0.5) * 60 + a * 60)); attr(e, 'cy', r2(hash(k * 7) * 1900 - a * 300)); attr(e, 'opacity', r2(1 - a)); });
    }
  });
}
