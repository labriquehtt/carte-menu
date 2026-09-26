// MONDE 1 — la ville au crépuscule : une rue vivante sous un grand ciel ; les caméras de surveillance suivent le robot.
// Profondeurs (parallaxe) : ciel 0,03 · lointain 0,12 · toits 0,35 · façades d'en face 0,8 · route 1 · trottoir 1,25 · flou 1,7
'use strict';
function cityDefs() {
  const d = DEFS();
  rectGrad(d, 'cySky', [[0, '#121A45'], [0.22, '#3A2F6E'], [0.4, '#9A4C7A'], [0.52, '#E0685A'], [0.62, '#F79A5E'], [0.72, '#FFC27A'], [1, '#FFE3A8']]);
  radGrad(d, 'cySun', [[0, '#FFF6D8'], [0.3, '#FFD27A', 0.9], [1, '#FF9A52', 0]]);
  rectGrad(d, 'cyFar', [[0, '#8C6A9E'], [1, '#C98F95']]);
  rectGrad(d, 'cyMidFar', [[0, '#7C5070'], [1, '#5E4060']]);
  rectGrad(d, 'cyWinLit', [[0, '#FFE7A8'], [1, '#FFB45C']]);
  rectGrad(d, 'cyWinDark', [[0, '#3C3F66'], [1, '#7A6A96']]);
  rectGrad(d, 'cyRoad', [[0, '#4B3F52'], [1, '#2A2433']]);
  rectGrad(d, 'cyWalk', [[0, '#A88880'], [1, '#6E5660']]);
  rectGrad(d, 'cyInterior', [[0, '#FFD08A'], [0.6, '#E8914E'], [1, '#B5613A']]);
  rectGrad(d, 'cyAwning', [[0, '#D8433A'], [1, '#A82B28']]);
  rectGrad(d, 'cyTram', [[0, '#FFD34D'], [1, '#E0A21E']]);
  radGrad(d, 'cyLampGlow', [[0, '#FFE3A0', 0.85], [0.4, '#FFB866', 0.3], [1, '#FF9A52', 0]]);
  radGrad(d, 'cyHaze', [[0, '#FFD9A0', 0.55], [1, '#FFD9A0', 0]]);
}

function cctv(parent, s) {   // caméra de surveillance orientable (tête = groupe à tourner)
  const cg = g(parent);
  const head = g(cg);
  markup(head, `<g transform="scale(${s})"><rect x="-58" y="-18" width="78" height="36" rx="9" fill="#EEF1F4" stroke="${INK}" stroke-width="5"/>
    <path d="M -58 -18 L 20 -18 L 20 -8 L -58 -8 Z" fill="#FFFFFF" opacity="0.6"/><rect x="-72" y="-14" width="16" height="28" rx="4" fill="#2B2430" stroke="${INK}" stroke-width="3"/>
    <circle cx="-66" cy="0" r="7" fill="#1B2A3A"/><circle cx="-68" cy="-2" r="3" fill="#5AC8FA"/><path d="M 20 -6 L 34 -6 L 34 6 L 20 6" fill="#9AA3AD" stroke="${INK}" stroke-width="3"/></g>`);
  const led = mk('circle', { cx: 8 * s, cy: -8 * s, r: 5 * s, fill: '#FF3B30', filter: 'url(#glow)' }, head);
  const cone = mk('path', { d: `M ${-70 * s} 0 L ${-560 * s} ${-120 * s} L ${-560 * s} ${120 * s} Z`, fill: '#FF3B30', opacity: 0.08 }, head);
  head.insertBefore(cone, head.firstChild);
  return { g: cg, head, led };
}

const CITY = { id: 'city' };
CITY.build = function (root, width) {
  cityDefs();
  const C = CITY; C.width = width;
  C.sky = g(root);
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#cySky)' }, C.sky);
  C.sun = g(C.sky);
  mk('circle', { cx: 0, cy: 0, r: 420, fill: 'url(#cySun)' }, C.sun);
  mk('circle', { cx: 0, cy: 0, r: 110, fill: '#FFF1C9' }, C.sun);
  C.stars = g(C.sky, { fill: '#FFFFFF' });
  const Rs = rng(3);
  for (let i = 0; i < 40; i++) mk('circle', { cx: Rs() * W, cy: Rs() * 420, r: 1 + Rs() * 1.8, opacity: 0.3 + Rs() * 0.6 }, C.stars);
  C.clouds = g(root);
  const Rc = rng(5);
  for (let i = 0; i < 14; i++) {
    const x = -600 + i * 380 + Rc() * 200, y = 520 + Rc() * 360, w = 240 + Rc() * 380;
    mk('ellipse', { cx: x, cy: y, rx: w, ry: 14 + Rc() * 16, fill: ['#F7A58A', '#E98AA0', '#FFD1A1'][i % 3], opacity: 0.6, filter: 'url(#b6)' }, C.clouds);
  }
  // lointain : ville à perte de vue, antenne 5G, dirigeable de surveillance, brume dorée
  C.far = g(root, { filter: 'url(#b1)' });
  const Rf = rng(11);
  let x = -900;
  while (x < width * 0.12 + 1800) {
    const w = 50 + Rf() * 110, h = 140 + Rf() * 360, top = 1120 - h;
    mk('rect', { x, y: top, width: w + 2, height: h + 200, fill: 'url(#cyFar)' }, C.far);
    if (Rf() < 0.25) mk('path', { d: `M ${x + w / 2} ${top} L ${x + w / 2} ${top - 60 - Rf() * 80}`, stroke: '#8C6A9E', 'stroke-width': 4 }, C.far);
    for (let k = 0; k < 8; k++) if (Rf() < 0.6) mk('rect', { x: x + 6 + Rf() * (w - 16), y: top + 16 + Rf() * (h - 30), width: 5, height: 7, fill: '#FFE0A0', opacity: 0.75 }, C.far);
    x += w;
  }
  markup(C.far, `<g transform="translate(620 0)"><path d="M -24 1120 L 0 560 L 24 1120 Z" fill="none" stroke="#7A5A8E" stroke-width="6"/>
    <path d="M -17 960 L 17 960 M -12 820 L 12 820 M -8 690 L 8 690" stroke="#7A5A8E" stroke-width="5"/>
    <rect x="-20" y="620" width="11" height="30" fill="#7A5A8E"/><rect x="9" y="610" width="11" height="30" fill="#7A5A8E"/></g>`);
  C.antLed = mk('circle', { cx: 620, cy: 556, r: 8, fill: '#FF3B30', filter: 'url(#glow)' }, C.far);
  mk('rect', { x: -1000, y: 900, width: width + 4000, height: 260, fill: 'url(#cyHaze)', opacity: 0.8 }, C.far);
  C.blimp = g(root);
  markup(C.blimp, `<ellipse cx="0" cy="0" rx="170" ry="58" fill="#9A86B4"/><ellipse cx="-10" cy="-16" rx="136" ry="26" fill="#B8A8D0" opacity="0.6"/>
    <path d="M 134 -10 L 200 -52 L 188 0 L 200 52 L 134 10 Z" fill="#8A76A6"/><rect x="-46" y="50" width="70" height="24" rx="6" fill="#6A5A86"/>
    <g transform="translate(-10 70)"><rect x="-22" y="-8" width="40" height="20" rx="5" fill="#EEF1F4" stroke="#3A2F55" stroke-width="3"/><circle cx="-18" cy="2" r="7" fill="#1B1A2E"/><circle cx="-18" cy="2" r="3" fill="#FF3B30"/></g>
    <path d="M -130 0 L 120 0" stroke="#FFE7A8" stroke-width="3" stroke-dasharray="10 12" opacity="0.8"/>`);
  // toits de la ville (profondeur 0,35) : paraboles, châteaux d'eau, cheminées, pigeons
  C.midFar = g(root);
  const Rm = rng(21);
  x = -1000;
  while (x < width * 0.35 + 2200) {
    const w = 150 + Rm() * 150, h = 300 + Rm() * 330, top = 1260 - h;
    mk('rect', { x, y: top, width: w + 2, height: h + 100, fill: 'url(#cyMidFar)' }, C.midFar);
    mk('path', { d: `M ${x - 8} ${top} L ${x + w / 2} ${top - 40 - Rm() * 40} L ${x + w + 8} ${top} Z`, fill: '#5A3A55', display: Rm() < 0.45 ? 'inline' : 'none' }, C.midFar);
    mk('rect', { x: x - 8, y: top - 12, width: w + 18, height: 16, fill: '#4E3050' }, C.midFar);
    for (let yy = top + 34; yy < 1220; yy += 62) for (let xx = x + 20; xx < x + w - 26; xx += 46)
      mk('rect', { x: xx, y: yy, width: 22, height: 34, rx: 3, fill: Rm() < 0.4 ? 'url(#cyWinLit)' : '#4A3456' }, C.midFar);
    if (Rm() < 0.55) { const dx = x + 30 + Rm() * (w - 60); markup(C.midFar, `<g transform="translate(${r2(dx)} ${r2(top - 12)})"><path d="M 0 0 L 0 -26" stroke="#3E2A40" stroke-width="5"/><path d="M -24 -42 Q 0 -10 24 -42 Z" fill="#D8C6D8" stroke="#3E2A40" stroke-width="4"/><path d="M 0 -28 L 10 -52" stroke="#3E2A40" stroke-width="3"/></g>`); }
    if (Rm() < 0.3) markup(C.midFar, `<g transform="translate(${r2(x + w * 0.5)} ${r2(top - 12)})"><path d="M -30 0 L -26 -40 M 30 0 L 26 -40" stroke="#3E2A40" stroke-width="6"/><rect x="-40" y="-110" width="80" height="72" rx="10" fill="#7A4E5E" stroke="#3E2A40" stroke-width="5"/><path d="M -44 -110 L 0 -140 L 44 -110 Z" fill="#5A3A55"/></g>`);
    if (Rm() < 0.4) mk('rect', { x: x + w - 40, y: top - 50, width: 20, height: 40, fill: '#4E3050' }, C.midFar);
    x += w + (Rm() < 0.3 ? 40 + Rm() * 90 : 0);
  }
  C.pigeons = [...Array(6)].map((_, i) => { const p = g(C.midFar); markup(p, `<g><ellipse cx="0" cy="0" rx="14" ry="8" fill="#4A4A5E"/><circle cx="12" cy="-6" r="6" fill="#4A4A5E"/><path class="w" d="M -4 -2 Q -10 -22 -24 -18" fill="none" stroke="#4A4A5E" stroke-width="6" stroke-linecap="round"/></g>`); return { g: p, w: p.querySelector('.w'), x: 520 + i * 70, y: 900 + (i % 3) * 20 }; });
  // façades d'en face (profondeur 0,8) : 2-3 étages, balcons, habitants, commerces, ruelles
  C.mid = g(root);
  C.people = []; C.cams = [];
  const Rb = rng(33);
  const cols = ['#EBC89B', '#D9876A', '#F0D5A0', '#B9C8A6', '#C99BB0', '#E3B37E', '#9FB8C8'];
  x = -700; let bi = 0;
  const slots = [];
  while (x < width * 0.8 + 1600) {
    const w = 320 + Rb() * 110, top = 600 + Rb() * 170 + (bi % 3 === 2 ? 110 : 0), col = cols[bi % cols.length];
    const fg = g(C.mid);
    mk('rect', { x, y: top, width: w, height: 1330 - top, fill: col, stroke: INK, 'stroke-width': 5 }, fg);
    mk('rect', { x: x + w - 24, y: top, width: 24, height: 1330 - top, fill: '#000', opacity: 0.13 }, fg);
    mk('rect', { x: x - 10, y: top - 22, width: w + 20, height: 26, rx: 4, fill: '#5E4A5A', stroke: INK, 'stroke-width': 4 }, fg);
    if (bi % 2) markup(fg, `<path d="M ${x + 10} ${top - 22} L ${x + w / 2} ${top - 130} L ${x + w - 10} ${top - 22} Z" fill="#6E4A58" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="${x + w / 2 - 22}" y="${top - 96}" width="44" height="50" rx="20" fill="url(#cyWinLit)" stroke="${INK}" stroke-width="4"/>`);
    mk('rect', { x: x - 6, y: 1060, width: w + 12, height: 14, fill: '#000', opacity: 0.15 }, fg);
    const shutter = ['#2F7C79', '#3E6FA6', '#6C8C3E', '#A0463A'][bi % 4];
    const nx = Math.max(2, Math.floor((w - 40) / 110)), step = (w - 40) / nx;
    for (let row = 0; row < 2; row++) {
      const wy = top + 56 + row * 190;
      if (wy > 920) break;
      for (let c = 0; c < nx; c++) {
        const wx = x + 20 + c * step + step / 2 - 36;
        const lit = Rb() < 0.6;
        mk('rect', { x: wx - 20, y: wy - 6, width: 18, height: 132, fill: shutter, stroke: INK, 'stroke-width': 3 }, fg);
        mk('rect', { x: wx + 74, y: wy - 6, width: 18, height: 132, fill: shutter, stroke: INK, 'stroke-width': 3 }, fg);
        mk('rect', { x: wx, y: wy, width: 72, height: 120, rx: 4, fill: lit ? 'url(#cyWinLit)' : 'url(#cyWinDark)', stroke: INK, 'stroke-width': 4 }, fg);
        if (lit) slots.push({ x: wx + 36, y: wy + 120, fg });
        mk('path', { d: `M ${wx + 36} ${wy} L ${wx + 36} ${wy + 120} M ${wx} ${wy + 48} L ${wx + 72} ${wy + 48}`, stroke: INK, 'stroke-width': 3, opacity: 0.75 }, fg);
        if (row === 0 && c % 2 === 0) {   // balcon en fer forgé + fleurs
          mk('rect', { x: wx - 18, y: wy + 114, width: 108, height: 10, fill: '#2B2430' }, fg);
          const rail = g(fg, { stroke: '#2B2430', 'stroke-width': 3 });
          mk('path', { d: `M ${wx - 16} ${wy + 78} L ${wx + 88} ${wy + 78}` }, rail);
          for (let k = 0; k <= 10; k++) mk('path', { d: `M ${wx - 14 + k * 10.2} ${wy + 78} L ${wx - 14 + k * 10.2} ${wy + 114}` }, rail);
          markup(fg, `<g transform="translate(${wx + 78} ${wy + 78})"><rect x="-10" y="-14" width="20" height="16" fill="#B5613A" stroke="${INK}" stroke-width="2.5"/><circle cx="-6" cy="-20" r="9" fill="#5E9E4A"/><circle cx="5" cy="-24" r="10" fill="#6FB257"/><circle cx="12" cy="-16" r="6" fill="#E85D75"/></g>`);
        }
      }
    }
    // commerces du rez-de-chaussée
    const shop = bi % 3, sg = g(fg), sx = x + 20, sw = w - 40, sy = 1110;
    if (shop === 0) {   // restaurant : grande vitrine, clients attablés
      mk('rect', { x: sx, y: sy, width: sw, height: 220, fill: 'url(#cyInterior)', stroke: INK, 'stroke-width': 5 }, sg);
      C.people.push(...[0, 1, 2].map(k => ({ P: makePerson(sg, { kind: ['eat', 'toast', 'sip'][k], seed: bi * 10 + k, full: false }), x: sx + 56 + k * (sw - 100) / 2, y: sy + 170, s: 0.82, f: k % 2 ? -1 : 1 })));
      mk('rect', { x: sx + 10, y: sy + 180, width: sw - 20, height: 40, fill: '#7A4A30', stroke: INK, 'stroke-width': 4 }, sg);
      for (let k = 0; k < 3; k++) markup(sg, `<g transform="translate(${sx + 50 + k * (sw - 90) / 2} ${sy + 176})"><ellipse cx="0" cy="0" rx="26" ry="6" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><circle cx="-4" cy="-4" r="6" fill="#E8563A"/><circle cx="6" cy="-3" r="5" fill="#8CC152"/></g>`);
      mk('path', { d: `M ${sx} ${sy} L ${sx + 120} ${sy} L ${sx + sw * 0.6} ${sy + 220} L ${sx + sw * 0.6 - 120} ${sy + 220} Z`, fill: '#FFFFFF', opacity: 0.1 }, sg);
      mk('path', { d: `M ${sx - 16} ${sy - 8} L ${sx + sw + 16} ${sy - 8} L ${sx + sw + 30} ${sy + 50} L ${sx - 30} ${sy + 50} Z`, fill: 'url(#cyAwning)', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, sg);
      for (let k = 0; k < 8; k++) mk('rect', { x: sx - 30 + k * (sw + 60) / 8, y: sy - 8, width: (sw + 60) / 16, height: 58, fill: '#F7EDE0', opacity: 0.9 }, sg);
      const lab = mk('text', { x: sx + sw / 2, y: sy - 24, 'text-anchor': 'middle', 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 32, fill: '#FFE3A0', stroke: INK, 'stroke-width': 6, 'paint-order': 'stroke' }, sg);
      lab.textContent = ['Bistrot Neuronal', 'Café des Algos', 'Le Pixel Doré'][Math.floor(bi / 3) % 3];
      const gl = g(sg);
      mk('path', { d: `M ${sx - 20} ${sy + 60} Q ${sx + sw / 2} ${sy + 110} ${sx + sw + 20} ${sy + 60}`, fill: 'none', stroke: '#2B2430', 'stroke-width': 2 }, gl);
      for (let k = 0; k < 9; k++) { const u = k / 8, px = lerp(sx - 20, sx + sw + 20, u), py = sy + 60 + Math.sin(u * Math.PI) * 50; mk('circle', { cx: px, cy: py + 6, r: 6, fill: '#FFE9A8', filter: 'url(#glow)' }, gl); }
    } else if (shop === 1) {   // réparation de téléphones (néon)
      mk('rect', { x: sx, y: sy, width: sw, height: 220, fill: '#2E3550', stroke: INK, 'stroke-width': 5 }, sg);
      for (let k = 0; k < 6; k++) mk('rect', { x: sx + 24 + (k % 3) * (sw - 60) / 3, y: sy + 40 + Math.floor(k / 3) * 80, width: 40, height: 64, rx: 7, fill: '#101320', stroke: '#7FD6FF', 'stroke-width': 3 }, sg);
      const n = mk('text', { x: sx + sw / 2, y: sy - 18, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 30, fill: '#7FF0FF', filter: 'url(#glow)' }, sg);
      n.textContent = 'RÉPARATION';
      C.people.push({ P: makePerson(sg, { kind: 'phone', seed: bi * 7, full: false }), x: sx + sw - 60, y: sy + 180, s: 0.82, f: -1 });
    } else {   // boulangerie
      mk('rect', { x: sx, y: sy, width: sw, height: 220, fill: '#F6D9A6', stroke: INK, 'stroke-width': 5 }, sg);
      for (let k = 0; k < 5; k++) markup(sg, `<g transform="translate(${sx + 40 + k * (sw - 80) / 4} ${sy + 140})"><path d="M -28 8 Q -30 -12 0 -14 Q 30 -12 28 8 Z" fill="#D9933F" stroke="${INK}" stroke-width="3"/><path d="M -14 -6 L -8 4 M 0 -8 L 4 4 M 12 -6 L 16 4" stroke="#8C5424" stroke-width="3"/></g>`);
      C.people.push({ P: makePerson(sg, { kind: 'wave', seed: bi * 3 + 1, full: false }), x: sx + sw / 2, y: sy + 110, s: 0.82, f: 1 });
      mk('path', { d: `M ${sx - 10} ${sy - 6} L ${sx + sw + 10} ${sy - 6} L ${sx + sw + 24} ${sy + 40} L ${sx - 24} ${sy + 40} Z`, fill: '#2F7C79', stroke: INK, 'stroke-width': 5 }, sg);
      const n = mk('text', { x: sx + sw / 2, y: sy - 22, 'text-anchor': 'middle', 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 32, fill: '#FFF3D6', stroke: INK, 'stroke-width': 6, 'paint-order': 'stroke' }, sg);
      n.textContent = 'Boulangerie';
    }
    x += w + (bi % 3 === 1 ? 90 : 0);   // de temps en temps une ruelle : on voit loin derrière
    bi++;
  }
  const kinds = ['sip', 'read', 'wave', 'phone', 'sip', 'read', 'toast'];
  slots.forEach((s, i) => { if (i % 2) return; C.people.push({ P: makePerson(s.fg, { kind: kinds[(i / 2) % kinds.length], seed: 100 + i, full: false }), x: s.x, y: s.y - 6, s: 0.6, f: i % 4 ? 1 : -1 }); });
  C.cat = g(C.mid);
  markup(C.cat, `<ellipse cx="0" cy="0" rx="26" ry="16" fill="#2B2430"/><circle cx="22" cy="-16" r="13" fill="#2B2430"/><path d="M 14 -26 L 16 -38 L 24 -28 M 26 -28 L 32 -38 L 34 -24" fill="#2B2430"/><circle cx="26" cy="-17" r="2.5" fill="#FFE14D"/><circle cx="18" cy="-17" r="2.5" fill="#FFE14D"/>`);
  C.catTail = mk('path', { fill: 'none', stroke: '#2B2430', 'stroke-width': 7, 'stroke-linecap': 'round' }, C.cat);
  C.catAt = slots.length > 5 ? slots[5] : { x: 900, y: 880 };
  // tram jaune qui croise en sens inverse (voie d'en face)
  C.tram = g(root);
  markup(C.tram, `<g><rect x="0" y="-190" width="620" height="170" rx="30" fill="url(#cyTram)" stroke="${INK}" stroke-width="6"/>
    <rect x="0" y="-60" width="620" height="22" fill="#C8322B"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${30 + i * 118}" y="-168" width="92" height="80" rx="10" fill="url(#cyWinLit)" stroke="${INK}" stroke-width="4"/>`).join('')}
    <path d="M 300 -190 L 300 -230 L 380 -290" stroke="${INK}" stroke-width="5" fill="none"/>
    <circle cx="110" cy="-12" r="22" fill="#2B2430" stroke="${INK}" stroke-width="4"/><circle cx="510" cy="-12" r="22" fill="#2B2430" stroke="${INK}" stroke-width="4"/>
    <circle cx="8" cy="-50" r="10" fill="#FFF3C4" filter="url(#glow)"/></g>`);
  C.tramPeople = [0, 1, 2, 3].map(k => { const P = makePerson(C.tram, { kind: ['phone', 'read', 'phone', 'sip'][k], seed: 700 + k, full: false }); return { P, x: 76 + k * 118 + 40, y: -96 }; });
  // rue
  C.street = g(root);
  mk('rect', { x: -1400, y: 1328, width: width + 4000, height: 40, fill: 'url(#cyWalk)', stroke: INK, 'stroke-width': 4 }, C.street);
  mk('rect', { x: -1400, y: 1366, width: width + 4000, height: 200, fill: 'url(#cyRoad)' }, C.street);
  C.marks = g(C.street, { fill: '#F4E6C8', opacity: 0.8 });
  for (let k = -12; k < (width + 3000) / 160; k++) mk('rect', { x: k * 160, y: 1476, width: 80, height: 10, rx: 5 }, C.marks);
  mk('rect', { x: -1400, y: 1366, width: width + 4000, height: 70, fill: '#FF9A52', opacity: 0.14 }, C.street);
  // lampadaires d'en face avec caméras
  C.furn = g(root);
  const Rl = rng(55);
  for (let lx = -600; lx < width + 1500; lx += 460 + Rl() * 120) {
    markup(C.furn, `<g transform="translate(${r2(lx)} 1336)"><circle cx="0" cy="-360" r="130" fill="url(#cyLampGlow)"/>
      <path d="M 0 0 L 0 -330 Q 0 -360 30 -360" fill="none" stroke="#2B2430" stroke-width="11"/><path d="M 16 -366 L 50 -366 L 44 -348 L 22 -348 Z" fill="#2B2430"/>
      <ellipse cx="33" cy="-346" rx="12" ry="5" fill="#FFF3C4" filter="url(#glow)"/><rect x="-11" y="-8" width="22" height="12" fill="#2B2430"/><rect x="-7" y="-250" width="14" height="24" fill="#2B2430"/></g>`);
    const cam = cctv(C.furn, 0.95);
    C.cams.push({ ...cam, x: lx - 4, y: 1336 - 238, f: 0.8 });
  }
  // notre trottoir : passants en pied (plus près de la caméra que le robot, donc plus grands)
  C.near = g(root);
  mk('rect', { x: -1400, y: 1562, width: width + 5000, height: 30, fill: '#C0A298', stroke: INK, 'stroke-width': 4 }, C.near);
  mk('rect', { x: -1400, y: 1590, width: width + 5000, height: 400, fill: 'url(#cyWalk)' }, C.near);
  for (let k = 0; k < 20; k++) mk('path', { d: `M ${-800 + k * 260} 1600 L ${-900 + k * 260} 1920`, stroke: '#5E4852', 'stroke-width': 3, opacity: 0.35 }, C.near);
  C.walkers = [0, 1, 2, 3, 4].map(k => ({ P: makePerson(C.near, { kind: k === 1 || k === 3 ? 'phone' : 'walk', seed: 300 + k, full: true }), x: 120 + k * 560 + (k % 2) * 90, v: k % 2 ? 0 : (k % 4 ? -55 : 60) }));
  // grosse caméra au premier plan, sur un lampadaire tout près
  C.bigCamPole = g(root);
  mk('rect', { x: -30, y: 520, width: 60, height: 1500, fill: '#241E2A', stroke: INK, 'stroke-width': 6 }, C.bigCamPole);
  mk('rect', { x: -50, y: 700, width: 100, height: 26, rx: 6, fill: '#241E2A' }, C.bigCamPole);
  C.bigCam = cctv(C.bigCamPole, 2.6);
  C.bigCam.x = 0; C.bigCam.y = 640;
  // premier plan flou
  C.fore = g(root, { filter: 'url(#b12)' });
  for (let k = 0; k < 6; k++) {
    const fx = 900 + k * 1000;
    markup(C.fore, `<g transform="translate(${fx} 1790)"><rect x="-80" y="-40" width="160" height="220" rx="12" fill="#5B3A2E"/><circle cx="-36" cy="-64" r="68" fill="#2F6A34"/><circle cx="44" cy="-86" r="78" fill="#3E8040"/><circle cx="0" cy="-130" r="56" fill="#4E9446"/><circle cx="-20" cy="-120" r="10" fill="#FF6B8B"/><circle cx="30" cy="-60" r="9" fill="#FFD34D"/></g>`);
  }
};
CITY.update = function (t, u, robot) {
  const C = CITY;
  const L = (el, f, dx = 0, dy = 0) => attr(el, 'transform', `translate(${r2(-u * f + dx)} ${r2(dy)})`);
  L(C.clouds, 0.04); L(C.far, 0.12); L(C.midFar, 0.35); L(C.mid, 0.8); L(C.street, 1); L(C.furn, 0.8); L(C.near, 1.25); L(C.fore, 1.7);
  attr(C.sun, 'transform', `translate(${r2(700 - u * 0.03)} 780)`);
  attr(C.antLed, 'opacity', (t % 1) < 0.5 ? 1 : 0.2);
  attr(C.blimp, 'transform', `translate(${r2(250 - u * 0.1 + t * 18)} ${r2(560 + Math.sin(t * 1.3) * 8)}) scale(0.9)`);
  C.pigeons.forEach((p, i) => {
    const go = clamp((t - 2.0 - i * 0.04) / 0.9);
    attr(p.g, 'transform', `translate(${r2(p.x + go * (240 + i * 50))} ${r2(p.y - go * (300 + i * 40))}) scale(${i % 2 ? -1 : 1} 1)`);
    const fl = go > 0 ? Math.sin(t * 40 + i) : 0.2;
    attr(p.w, 'd', `M -4 -2 Q -10 ${r2(-10 - 16 * fl)} -24 ${r2(-10 - 10 * fl)}`);
  });
  for (const p of C.people) updatePerson(p.P, t, p.x, p.y, p.s, p.f);
  C.walkers.forEach(w => updatePerson(w.P, t, w.x + w.v * t, 1690, 2.3, w.v >= 0 ? 1 : -1));
  // tram : arrive de la droite et file vers la gauche (voie d'en face, profondeur 0,9)
  const tx = 1300 + u * 0.9 * 0 - (t - 1.2) * 1500;
  attr(C.tram, 'transform', `translate(${r2(tx - u * 0.9 + 1200)} 1356)`);
  vis(C.tram, t > 1.3 && t < 3.6);
  C.tramPeople.forEach(p => updatePerson(p.P, t, p.x, p.y, 0.62, 1));
  // caméras : elles pivotent pour suivre le robot
  const aimAt = (cam, sx, sy) => {
    const a = Math.atan2(robot[1] - 60 - sy, robot[0] + 60 - sx) * 180 / Math.PI;
    attr(cam.head, 'transform', `translate(${r2(cam.x)} ${r2(cam.y)}) rotate(${r2(a + 180)})`);
    attr(cam.led, 'opacity', (t * 3 + cam.x * 0.01) % 1 < 0.5 ? 1 : 0.25);
  };
  for (const c of C.cams) aimAt(c, c.x - u * c.f, c.y);
  const bx = 980 - u * 1.25 + 400;
  attr(C.bigCamPole, 'transform', `translate(${r2(bx)} 0)`);
  aimAt(C.bigCam, bx, C.bigCam.y);
  attr(C.cat, 'transform', `translate(${r2(C.catAt.x - 10)} ${r2(C.catAt.y - 2)})`);
  attr(C.catTail, 'd', `M -24 4 Q -50 ${r2(10 + 20 * Math.sin(t * 5))} -46 ${r2(-20 + 14 * Math.sin(t * 5 + 1))}`);
};
