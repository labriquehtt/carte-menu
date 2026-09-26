// MONDE 5 — le monde tout rose : barbe à papa, maisons-cupcakes, bonbons et smoothie qui parlent,
// un cookie qui brandit « ACCEPTER LES COOKIES ? » (deux boutons… OUI / OUI). Juste avant l'apocalypse,
// tous ces visages mignons ont une fraction de seconde des yeux-caméras rouges.
'use strict';
function candyDefs() {
  const d = DEFS();
  rectGrad(d, 'kdSky', [[0, '#FF7FC0'], [0.4, '#FFB3DA'], [0.75, '#FFE0F0'], [1, '#FFF6FB']]);
  rectGrad(d, 'kdHill1', [[0, '#C9A7FF'], [1, '#A889F0']]);
  rectGrad(d, 'kdHill2', [[0, '#9EF0D0'], [1, '#6FD8B4']]);
  rectGrad(d, 'kdCup', [[0, '#FF9ACB'], [1, '#F2629F']]);
  rectGrad(d, 'kdGum', [[0, '#7FE3FF'], [1, '#3FB8E8']]);
  rectGrad(d, 'kdGum2', [[0, '#FFE680'], [1, '#FFC23C']]);
  rectGrad(d, 'kdGum3', [[0, '#B8FF9E'], [1, '#6FD85A']]);
  rectGrad(d, 'kdSmoothie', [[0, '#FF8FB8'], [0.5, '#FF5C8A'], [1, '#E23A6A']]);
  radGrad(d, 'kdCookie', [[0, '#F2C07A'], [1, '#C98A3E']]);
}
function cuteFace(parent, s = 1) {   // visage kawaii : yeux (qui peuvent devenir des caméras rouges), bouche qui parle, joues
  const f = g(parent, { transform: `scale(${s})` });
  const eyes = g(f);
  markup(eyes, `<ellipse cx="-18" cy="0" rx="7" ry="9" fill="${INK}"/><ellipse cx="18" cy="0" rx="7" ry="9" fill="${INK}"/><circle cx="-16" cy="-3" r="2.5" fill="#FFFFFF"/><circle cx="20" cy="-3" r="2.5" fill="#FFFFFF"/>`);
  const red = g(f);
  markup(red, `<circle cx="-18" cy="0" r="10" fill="#1B1620"/><circle cx="-18" cy="0" r="6" fill="#FF2A2A" filter="url(#glow)"/><circle cx="18" cy="0" r="10" fill="#1B1620"/><circle cx="18" cy="0" r="6" fill="#FF2A2A" filter="url(#glow)"/>`);
  vis(red, false);
  markup(f, `<ellipse cx="-30" cy="14" rx="8" ry="5" fill="#FF5C9A" opacity="0.55"/><ellipse cx="30" cy="14" rx="8" ry="5" fill="#FF5C9A" opacity="0.55"/>`);
  const mouth = mk('path', { fill: '#8A1F3A', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, f);
  return { g: f, eyes, red, mouth };
}
function setFace(F, t, seed, evil) {
  const talk = Math.max(0, Math.sin(t * 13 + seed * 2.1));
  const o = 2 + talk * 10;
  attr(F.mouth, 'd', `M -9 12 Q 0 ${r2(12 + o)} 9 12 Q 0 ${r2(14 + o * 0.3)} -9 12 Z`);
  const bl = ((t + seed * 0.37) % 2.2) < 0.1 ? 0.15 : 1;
  attr(F.eyes, 'transform', `scale(1 ${bl})`);
  vis(F.eyes, !evil); vis(F.red, evil);
}

const CANDY = { id: 'candy' };
CANDY.build = function (root, width) {
  candyDefs();
  const K = CANDY; K.width = width; K.faces = [];
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#kdSky)' }, root);
  // arc-en-ciel et étincelles
  K.rainbow = g(root, { opacity: 0.55 });
  ['#FF5C8A', '#FFB03C', '#FFE14D', '#6FD85A', '#3FB8E8', '#9A6BFF'].forEach((c, i) => mk('path', { d: `M -200 1200 A 760 760 0 0 1 1320 1200`, fill: 'none', stroke: c, 'stroke-width': 30, transform: `translate(0 ${i * 30})` }, K.rainbow));
  K.spark = g(root, { fill: '#FFFFFF' });
  K.sparks = [...Array(24)].map((_, i) => mk('path', { d: 'M 0 -12 Q 2 -2 12 0 Q 2 2 0 12 Q -2 2 -12 0 Q -2 -2 0 -12 Z', opacity: 0.9 }, K.spark));
  // nuages de barbe à papa
  K.clouds = g(root);
  const Rc = rng(123);
  for (let i = 0; i < 9; i++) {
    const cg = g(K.clouds, { transform: `translate(${-300 + i * 420 + Rc() * 120} ${260 + Rc() * 420}) scale(${0.8 + Rc() * 0.6})` });
    const c = ['#FFC1E3', '#C9E8FF', '#E6CCFF'][i % 3];
    markup(cg, `<g fill="${c}" stroke="#FFFFFF" stroke-width="6"><circle cx="-80" cy="10" r="60"/><circle cx="-10" cy="-30" r="80"/><circle cx="70" cy="0" r="66"/><circle cx="130" cy="30" r="44"/></g><path d="M 10 60 L 20 170" stroke="#F4D9B0" stroke-width="10" stroke-linecap="round"/>`);
  }
  // collines lointaines, maisons-cupcakes, cornets géants (0,2)
  K.far = g(root);
  let x = -800;
  const R = rng(127);
  while (x < width * 0.2 + 1800) {
    const w = 380 + R() * 300;
    mk('ellipse', { cx: x + w / 2, cy: 1240, rx: w * 0.7, ry: 260 + R() * 120, fill: R() < 0.5 ? 'url(#kdHill1)' : 'url(#kdHill2)', stroke: '#FFFFFF', 'stroke-width': 6 }, K.far);
    x += w;
  }
  for (let k = 0; k < 6; k++) {
    const hx = -200 + k * 560, hy = 1080;
    markup(K.far, `<g transform="translate(${hx} ${hy}) scale(0.9)"><path d="M -110 0 L -90 -140 L 90 -140 L 110 0 Z" fill="#F7D9A8" stroke="${INK}" stroke-width="5"/>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M ${-86 + i * 40} -140 L ${-80 + i * 40} 0" stroke="#E0B878" stroke-width="5"/>`).join('')}
      <path d="M -120 -140 Q -130 -230 -40 -230 Q -10 -300 40 -250 Q 130 -250 120 -140 Z" fill="url(#kdCup)" stroke="${INK}" stroke-width="5"/>
      <circle cx="10" cy="-290" r="26" fill="#FF3B5C" stroke="${INK}" stroke-width="5"/><rect x="-20" y="-80" width="40" height="80" rx="20" fill="#8A4A2A" stroke="${INK}" stroke-width="4"/>
      <rect x="40" y="-110" width="34" height="34" rx="8" fill="#BFF0FF" stroke="${INK}" stroke-width="4"/></g>`);
  }
  // sucettes-arbres, gros bonbons qui parlent, smoothie, cookie (0,6)
  K.mid = g(root);
  for (let k = 0; k < 10; k++) {
    const lx = -300 + k * 360, h = 260 + (k % 3) * 80;
    const c = ['#FF5C8A', '#3FB8E8', '#FFB03C', '#9A6BFF'][k % 4];
    markup(K.mid, `<g transform="translate(${lx} 1250)"><rect x="-8" y="${-h}" width="16" height="${h}" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/>
      <circle cx="0" cy="${-h - 60}" r="70" fill="${c}" stroke="${INK}" stroke-width="5"/><path d="M 0 ${-h - 60} m -50 0 a 50 50 0 0 1 50 -50 a 36 36 0 0 1 36 36 a 24 24 0 0 1 -24 24 a 12 12 0 0 1 -12 -12" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/></g>`);
  }
  K.gums = [];
  for (let k = 0; k < 7; k++) {
    const gx = -100 + k * 430, gg = g(K.mid);
    const col = ['url(#kdGum)', 'url(#kdGum2)', 'url(#kdGum3)'][k % 3];
    markup(gg, `<path d="M -80 0 Q -90 -150 0 -160 Q 90 -150 80 0 Z" fill="${col}" stroke="${INK}" stroke-width="6"/><path d="M -50 -110 Q -40 -140 -10 -140" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.7"/>
      ${[...Array(8)].map((_, i) => `<circle cx="${-50 + (i * 37) % 100}" cy="${-30 - (i * 53) % 110}" r="4" fill="#FFFFFF" opacity="0.8"/>`).join('')}`);
    const F = cuteFace(gg, 1.3); attr(F.g, 'transform', 'translate(0 -70) scale(1.3)');
    K.gums.push({ g: gg, F, x: gx, seed: k });
  }
  // le smoothie qui parle (bulle « coucou ! »)
  K.smoothie = g(K.mid);
  markup(K.smoothie, `<path d="M -90 -260 L 90 -260 L 70 0 L -70 0 Z" fill="url(#kdSmoothie)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M -96 -280 L 96 -280 L 90 -250 L -90 -250 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/><path d="M 30 -270 L 60 -420 L 100 -430" fill="none" stroke="#3FB8E8" stroke-width="16" stroke-linecap="round"/>
    <circle cx="-40" cy="-300" r="30" fill="#FF3B5C" stroke="${INK}" stroke-width="5"/><path d="M -40 -330 Q -30 -350 -14 -346" fill="none" stroke="#3E9A50" stroke-width="6"/>
    <path d="M -60 -230 L -40 -30" stroke="#FFFFFF" stroke-width="10" opacity="0.4" stroke-linecap="round"/>`);
  K.smF = cuteFace(K.smoothie, 1.6); attr(K.smF.g, 'transform', 'translate(0 -140) scale(1.6)');
  K.bubble = g(K.smoothie);
  markup(K.bubble, `<path d="M 60 -500 Q 60 -560 150 -560 L 300 -560 Q 380 -560 380 -500 Q 380 -440 300 -440 L 170 -440 L 120 -400 L 140 -440 Q 60 -440 60 -500 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/>`);
  const bt = mk('text', { x: 220, y: -486, 'text-anchor': 'middle', 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 50, fill: '#FF3B8A' }, K.bubble); bt.textContent = 'coucou !';
  // le cookie et son bandeau de consentement
  K.cookie = g(K.mid);
  markup(K.cookie, `<circle cx="0" cy="-110" r="110" fill="url(#kdCookie)" stroke="${INK}" stroke-width="7"/>
    ${[[-50, -160], [40, -170], [60, -80], [-60, -70], [0, -40], [-10, -190]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="14" ry="11" fill="#5A2E1A"/>`).join('')}
    <path d="M -100 -60 L -170 -150" stroke="#C98A3E" stroke-width="22" stroke-linecap="round"/><path d="M 100 -60 L 170 -150" stroke="#C98A3E" stroke-width="22" stroke-linecap="round"/>
    <path d="M -40 0 L -46 70 M 40 0 L 46 70" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`);
  K.ckF = cuteFace(K.cookie, 1.5); attr(K.ckF.g, 'transform', 'translate(0 -120) scale(1.5)');
  K.sign = g(K.cookie);
  markup(K.sign, `<rect x="-230" y="-470" width="460" height="260" rx="26" fill="#FFFFFF" stroke="${INK}" stroke-width="7"/>
    <text x="0" y="-400" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="#1B1620">ACCEPTER LES</text>
    <text x="0" y="-350" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="#1B1620">COOKIES ?</text>
    <rect x="-200" y="-310" width="180" height="76" rx="38" fill="#6FD85A" stroke="${INK}" stroke-width="5"/><text x="-110" y="-258" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="42" fill="#FFFFFF">OUI</text>
    <rect x="20" y="-310" width="180" height="76" rx="38" fill="#6FD85A" stroke="${INK}" stroke-width="5"/><text x="110" y="-258" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="42" fill="#FFFFFF">OUI</text>`);
  // route en sucre d'orge
  K.street = g(root);
  mk('rect', { x: -1400, y: 1330, width: width + 4000, height: 40, fill: '#FFFFFF', stroke: INK, 'stroke-width': 4 }, K.street);
  mk('rect', { x: -1400, y: 1368, width: width + 4000, height: 200, fill: '#FFE3EF' }, K.street);
  for (let k = -12; k < (width + 3000) / 90; k++) mk('path', { d: `M ${k * 90} 1368 L ${k * 90 + 60} 1368 L ${k * 90 + 10} 1568 L ${k * 90 - 50} 1568 Z`, fill: '#FF6FA8' }, K.street);
  mk('rect', { x: -1400, y: 1566, width: width + 5000, height: 400, fill: '#8A4A2A' }, K.street);
  for (let k = 0; k < 40; k++) mk('path', { d: `M ${-800 + k * 140} 1566 q 30 60 0 120 q -30 60 0 120`, fill: 'none', stroke: '#A8603A', 'stroke-width': 10, opacity: 0.6 }, K.street);
  // premier plan : sucettes géantes floues + vermicelles qui tombent
  K.fore = g(root, { filter: 'url(#b12)' });
  for (let k = 0; k < 6; k++) markup(K.fore, `<g transform="translate(${500 + k * 780} 1980)"><rect x="-16" y="-300" width="32" height="600" fill="#FFFFFF"/><circle cx="0" cy="-360" r="150" fill="${['#FF5C8A', '#9A6BFF', '#FFB03C'][k % 3]}"/></g>`);
  K.sprinkles = g(root);
  K.spr = [...Array(40)].map((_, i) => mk('rect', { x: -9, y: -3, width: 18, height: 6, rx: 3, fill: ['#FFFFFF', '#7FE3FF', '#FFE14D', '#8CFF9E', '#B98CFF', '#FF5C8A'][i % 6] }, K.sprinkles));
};
CANDY.update = function (t, u) {
  const K = CANDY;
  const L = (el, f, dx = 0) => attr(el, 'transform', `translate(${r2(-u * f + dx)} 0)`);
  L(K.clouds, 0.05); L(K.far, 0.2); L(K.mid, 0.6); L(K.street, 1); L(K.fore, 1.6);
  attr(K.rainbow, 'transform', `translate(${r2(-u * 0.03)} 0)`);
  // repères : smoothie et cookie bien cadrés pendant le passage
  const tIn = beat(13);
  if (K.ref === undefined) K.ref = camX(tIn + 0.5) - K.x0;
  const ref = K.ref;
  attr(K.smoothie, "transform", `translate(${r2(150 + 0.6 * ref)} ${r2(1250 + Math.abs(Math.sin(t * 8)) * -12)})`);
  attr(K.cookie, "transform", `translate(${r2(830 + 0.6 * ref)} ${r2(1250)}) rotate(${r2(Math.sin(t * 6) * 3)})`);
  attr(K.bubble, 'transform', `scale(${r2(E.back(seg(t, tIn + 0.1, tIn + 0.3)))})`);
  // une fraction de seconde avant l'apocalypse, les yeux deviennent des caméras rouges
  const evil = t > beat(14.55);
  K.gums.forEach(gm => { attr(gm.g, 'transform', `translate(${gm.x} ${r2(1250 - Math.abs(Math.sin(t * 7 + gm.seed)) * 18)}) scale(1 ${r2(1 - Math.abs(Math.sin(t * 7 + gm.seed)) * 0.05)})`); setFace(gm.F, t, gm.seed, evil); });
  setFace(K.smF, t, 11, evil); setFace(K.ckF, t, 13, evil);
  K.sparks.forEach((s, i) => { const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7); attr(s, 'transform', `translate(${r2((hash(i) * 1400 - u * 0.1) % 1200)} ${r2(200 + hash(i * 3) * 900)}) scale(${r2(0.4 + tw)})`); attr(s, 'opacity', r2(tw)); });
  K.spr.forEach((s, i) => {
    const y = ((hash(i * 5) * 2000 + t * (500 + hash(i) * 300)) % 2100) - 100, x = ((hash(i * 11) * 1400 - u * 1.2) % 1300 + 1300) % 1300 - 100;
    attr(s, 'transform', `translate(${r2(x)} ${r2(y)}) rotate(${r2(t * 300 + i * 40)})`);
  });
};
