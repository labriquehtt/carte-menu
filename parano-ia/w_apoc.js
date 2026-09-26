// MONDE 6 — après l'IA : ciel rouge sang, ville en ruines qui brûle, robots géants aux yeux rouges qui marchent
// au loin, essaims de drones, projecteurs, cendres ; une enseigne « OpenIA » tombée ; la mobylette crache des flammes.
'use strict';
function apocDefs() {
  const d = DEFS();
  rectGrad(d, 'apSky', [[0, '#1A0404'], [0.3, '#5A0A08'], [0.55, '#B8260E'], [0.72, '#FF5A1F'], [0.86, '#FF9A3C'], [1, '#3A0A06']]);
  rectGrad(d, 'apFar', [[0, '#3A0806'], [1, '#6A1408']]);
  rectGrad(d, 'apRuin', [[0, '#1E0A08'], [1, '#2E100A']]);
  rectGrad(d, 'apGround', [[0, '#2A1210'], [1, '#0E0504']]);
  radGrad(d, 'apFire', [[0, '#FFF1A8'], [0.3, '#FFB03C'], [0.7, '#FF4A1F', 0.8], [1, '#FF2A0A', 0]]);
  radGrad(d, 'apGlow', [[0, '#FF6A2A', 0.6], [1, '#FF6A2A', 0]]);
}
function flame(parent, s) {   // flamme animée (trois couches)
  const f = g(parent, { transform: `scale(${s})` });
  const P = ['#FF2A0A', '#FF8A1F', '#FFE14D'].map((c, i) => mk('path', { fill: c, opacity: 0.92 }, f));
  mk('circle', { cx: 0, cy: -40, r: 90, fill: 'url(#apGlow)' }, f);
  return { g: f, P };
}
function setFlame(F, t, seed) {
  F.P.forEach((p, i) => {
    const h = (150 - i * 38) * (0.85 + 0.25 * noise1(t * 6 + i + seed, seed)), w = 60 - i * 14, sw = noise1(t * 5 + seed * 3 + i, i + 7) * 20;
    attr(p, 'd', `M ${-w} 0 Q ${r2(-w * 0.9 + sw)} ${r2(-h * 0.5)} ${r2(sw * 1.5)} ${r2(-h)} Q ${r2(w * 0.9 + sw)} ${r2(-h * 0.5)} ${w} 0 Z`);
  });
}

const APOC = { id: 'apoc' };
APOC.build = function (root, width) {
  apocDefs();
  const A = APOC; A.width = width; A.fires = [];
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#apSky)' }, root);
  A.sun = mk('circle', { cx: 0, cy: 0, r: 160, fill: '#FFD08A', opacity: 0.85, filter: 'url(#b6)' }, root);
  // fumées épaisses
  A.smoke = g(root, { filter: 'url(#b24)' });
  const Rs = rng(151);
  for (let i = 0; i < 12; i++) mk('ellipse', { cx: -300 + i * 330, cy: 380 + Rs() * 400, rx: 260 + Rs() * 200, ry: 90 + Rs() * 80, fill: '#1A0606', opacity: 0.55 }, A.smoke);
  // robots géants lointains aux yeux rouges (0,1)
  A.giants = [0, 1, 2].map(i => {
    const gg = g(root);
    markup(gg, `<g fill="#2A0605"><rect x="-70" y="-560" width="140" height="120" rx="30"/><rect x="-110" y="-440" width="220" height="260" rx="40"/>
      <rect x="-150" y="-430" width="40" height="220" rx="20"/><rect x="110" y="-430" width="40" height="220" rx="20"/><rect x="-90" y="-180" width="60" height="200" rx="20"/><rect x="30" y="-180" width="60" height="200" rx="20"/>
      <path d="M 0 -560 L 0 -620" stroke="#2A0605" stroke-width="10"/></g>
      <rect x="-50" y="-520" width="100" height="18" rx="9" fill="#FF2A2A" filter="url(#neon)"/>`);
    return { g: gg, x: 200 + i * 420, s: 0.9 - i * 0.18 };
  });
  // ville lointaine en ruine (0,15)
  A.far = g(root);
  const R = rng(157);
  let x = -900;
  while (x < width * 0.15 + 1800) {
    const w = 80 + R() * 120, h = 200 + R() * 380, top = 1200 - h;
    const b = 20 + R() * 40;
    mk('path', { d: `M ${x} 1300 L ${x} ${top + b} L ${x + w * 0.3} ${top} L ${x + w * 0.5} ${top + b * 1.6} L ${x + w * 0.8} ${top + b * 0.5} L ${x + w} ${top + b * 1.2} L ${x + w} 1300 Z`, fill: 'url(#apFar)' }, A.far);
    for (let k = 0; k < 4; k++) if (R() < 0.5) mk('rect', { x: x + 10 + R() * (w - 20), y: top + 60 + R() * (h - 80), width: 8, height: 10, fill: '#FF7A2A', opacity: 0.8 }, A.far);
    x += w + 10;
  }
  // ruines proches (0,5) : squelettes d'immeubles, enseigne tombée, feux
  A.mid = g(root);
  x = -600; let bi = 0;
  while (x < width * 0.5 + 1800) {
    const w = 260 + R() * 140, top = 620 + R() * 260;
    const rg = g(A.mid);
    mk('path', { d: `M ${x} 1320 L ${x} ${top + 40} L ${x + w * 0.2} ${top} L ${x + w * 0.45} ${top + 90} L ${x + w * 0.7} ${top + 20} L ${x + w} ${top + 130} L ${x + w} 1320 Z`, fill: 'url(#apRuin)', stroke: '#0A0302', 'stroke-width': 5 }, rg);
    for (let yy = top + 110; yy < 1260; yy += 90) for (let xx = x + 30; xx < x + w - 40; xx += 70) mk('rect', { x: xx, y: yy, width: 36, height: 50, fill: R() < 0.3 ? '#FF6A1F' : '#0A0302', opacity: R() < 0.3 ? 0.85 : 1 }, rg);
    mk('path', { d: `M ${x + w * 0.2} ${top} L ${x + w * 0.24} ${top - 80} M ${x + w * 0.7} ${top + 20} L ${x + w * 0.66} ${top - 60}`, stroke: '#0A0302', 'stroke-width': 8 }, rg);
    if (bi % 2 === 0) { const F = flame(rg, 1.3); attr(F.g, 'transform', `translate(${x + w * 0.45} ${top + 96}) scale(1.3)`); A.fires.push({ F, seed: bi }); }
    x += w + 20 + R() * 60; bi++;
  }
  A.sign = g(A.mid);
  markup(A.sign, `<g transform="rotate(168)"><rect x="-190" y="-60" width="380" height="120" rx="20" fill="#2A2F3A" stroke="#0A0302" stroke-width="6"/>
    <text x="40" y="22" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="64" fill="#8A8F9A">OpenIA</text>
    <g transform="translate(-120 0)" fill="none" stroke="#8A8F9A" stroke-width="7">${[0, 60, 120, 180, 240, 300].map(a => `<rect x="-10" y="-34" width="20" height="38" rx="10" transform="rotate(${a})"/>`).join('')}</g></g>`);
  // drones en essaim
  A.drones = [...Array(14)].map((_, i) => { const d = g(root); markup(d, `<rect x="-16" y="-5" width="32" height="10" rx="4" fill="#1A0604"/><path d="M -24 -8 L 24 -8" stroke="#1A0604" stroke-width="3"/><circle cx="0" cy="6" r="3.5" fill="#FF2A2A" filter="url(#glow)"/>`); return d; });
  // projecteurs qui balaient
  A.beams = [0, 1, 2].map(() => mk('path', { fill: '#FFE9C4', opacity: 0.12, filter: 'url(#b6)' }, root));
  // sol : route défoncée, fissures, carcasses de voitures
  A.street = g(root);
  mk('rect', { x: -1400, y: 1330, width: width + 4000, height: 50, fill: '#3A1410', stroke: '#0A0302', 'stroke-width': 4 }, A.street);
  mk('rect', { x: -1400, y: 1378, width: width + 4000, height: 700, fill: 'url(#apGround)' }, A.street);
  for (let k = 0; k < 30; k++) { const cx = -600 + k * 200; mk('path', { d: `M ${cx} 1400 l 30 40 l -20 30 l 40 50`, fill: 'none', stroke: '#0A0302', 'stroke-width': 5 }, A.street); }
  for (let k = 0; k < 6; k++) markup(A.street, `<g transform="translate(${-200 + k * 760} 1332) rotate(${k % 2 ? 6 : -8})"><path d="M -110 0 L -100 -50 L -50 -80 L 50 -80 L 100 -46 L 120 0 Z" fill="#2A1A18" stroke="#0A0302" stroke-width="5"/><rect x="-40" y="-70" width="70" height="30" fill="#0A0302"/><circle cx="-60" cy="0" r="22" fill="#0A0302"/><circle cx="70" cy="0" r="22" fill="#0A0302"/></g>`);
  A.groundFires = [0, 1, 2, 3].map(k => { const F = flame(A.street, 1); return { F, x: 300 + k * 700, seed: 20 + k }; });
  // cendres et braises
  A.ash = g(root);
  A.ashP = [...Array(60)].map((_, i) => mk('circle', { r: i % 4 ? 3 : 5, fill: i % 3 ? '#8A7A74' : '#FF8A3C', opacity: 0.8 }, A.ash));
};
APOC.update = function (t, u) {
  const A = APOC;
  const L = (el, f, dx = 0) => attr(el, 'transform', `translate(${r2(-u * f + dx)} 0)`);
  L(A.smoke, 0.08, t * 30); L(A.far, 0.15); L(A.mid, 0.5); L(A.street, 1);
  attr(A.sun, 'cx', 540 - u * 0.02); attr(A.sun, 'cy', 820);
  A.giants.forEach((gi, i) => {
    const step = Math.sin(t * 3 + i) * 10;
    attr(gi.g, 'transform', `translate(${r2(gi.x - u * 0.1 + t * 12)} ${r2(1200 + Math.abs(step))}) scale(${gi.s})`);
  });
  A.fires.forEach(f => setFlame(f.F, t, f.seed));
  A.groundFires.forEach(f => { attr(f.F.g, 'transform', `translate(${f.x} 1380) scale(0.9)`); setFlame(f.F, t, f.seed); });
  const tIn = beat(15);
  if (A.ref === undefined) A.ref = camX(tIn + 0.6) - A.x0;
  attr(A.sign, 'transform', `translate(${r2(760 + 0.5 * A.ref)} 1250)`);
  A.drones.forEach((d, i) => {
    const a = t * 1.3 + i * 0.45, rr = 160 + (i % 4) * 50;
    attr(d, 'transform', `translate(${r2(700 + Math.cos(a) * rr + Math.sin(t * 2 + i) * 30)} ${r2(560 + Math.sin(a * 1.4) * rr * 0.5)})`);
  });
  A.beams.forEach((b, i) => {
    const bx = 200 + i * 360, ang = Math.sin(t * 1.5 + i * 1.7) * 0.6;
    attr(b, 'd', `M ${bx} 1300 L ${r2(bx + Math.sin(ang) * 1400 - 80)} ${r2(1300 - Math.cos(ang) * 1400)} L ${r2(bx + Math.sin(ang) * 1400 + 80)} ${r2(1300 - Math.cos(ang) * 1400)} Z`);
  });
  A.ashP.forEach((p, i) => {
    const y = ((hash(i * 3) * 2000 + t * (120 + hash(i) * 180)) % 2000), x = ((hash(i * 7) * 1300 - u * 1.1 + Math.sin(t * 2 + i) * 30) % 1300 + 1300) % 1300 - 100;
    attr(p, 'cx', r2(x)); attr(p, 'cy', r2(y));
  });
};
