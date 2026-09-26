// MONDE 4 — le campus corporate (couleurs vives, verre, pelouses) : un méca géant « OpenIA » (emblème en nœud)
// croque le petit visage jaune qui fait un câlin (clin d'œil à Hugging Face) ; les employés applaudissent.
'use strict';
function corpDefs() {
  const d = DEFS();
  rectGrad(d, 'cpSky', [[0, '#3FA8FF'], [0.45, '#7FD0FF'], [0.8, '#C9F0FF'], [1, '#E8FBFF']]);
  rectGrad(d, 'cpGlass', [[0, '#9FE3FF'], [0.35, '#4FB6E8'], [0.36, '#7FD4F5'], [1, '#2D7FB8']], 0, 0, 1, 1);
  rectGrad(d, 'cpGlass2', [[0, '#B8FFE8'], [0.5, '#5FD6B8'], [1, '#2E9A8A']], 0, 0, 1, 1);
  rectGrad(d, 'cpGlass3', [[0, '#FFD6F0'], [0.5, '#E89AD0'], [1, '#B866A8']], 0, 0, 1, 1);
  rectGrad(d, 'cpFar', [[0, '#A8D8F0'], [1, '#CDEBF7']]);
  rectGrad(d, 'cpLawn', [[0, '#7EE08A'], [1, '#3FAE5A']]);
  rectGrad(d, 'cpPath', [[0, '#F4E9D8'], [1, '#D9C8AE']]);
  rectGrad(d, 'cpMech', [[0, '#3A3F4B'], [0.5, '#1E2129'], [1, '#0E1015']], 0, 0, 1, 1);
  radGrad(d, 'cpHug', [[0, '#FFE680'], [0.7, '#FFC93C'], [1, '#F2A51A']], 0.4, 0.35, 0.7);
}
function knot(parent, r, fill, stroke) {   // emblème en nœud (6 boucles entrelacées, évocation)
  const k = g(parent);
  for (let i = 0; i < 6; i++) mk('rect', { x: -r * 0.28, y: -r, width: r * 0.56, height: r * 1.1, rx: r * 0.28, fill: 'none', stroke, 'stroke-width': r * 0.16, transform: `rotate(${i * 60})` }, k);
  mk('circle', { r: r * 0.22, fill }, k);
  return k;
}
function hugFace(parent) {   // petit visage jaune qui fait un câlin
  const h = g(parent);
  mk('circle', { cx: 0, cy: 0, r: 70, fill: 'url(#cpHug)', stroke: INK, 'stroke-width': 6 }, h);
  markup(h, `<path d="M -34 -18 Q -24 -32 -14 -18" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M 14 -18 Q 24 -32 34 -18" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M -30 10 Q 0 44 30 10 Q 0 22 -30 10 Z" fill="#8A2A1A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="-44" cy="8" rx="10" ry="6" fill="#FF8A5C" opacity="0.6"/><ellipse cx="44" cy="8" rx="10" ry="6" fill="#FF8A5C" opacity="0.6"/>`);
  const hands = g(h);
  markup(hands, `<g><ellipse cx="-52" cy="40" rx="24" ry="18" fill="url(#cpHug)" stroke="${INK}" stroke-width="5"/><path d="M -62 32 L -48 40 M -62 44 L -48 46" stroke="${INK}" stroke-width="3"/></g>
    <g><ellipse cx="52" cy="40" rx="24" ry="18" fill="url(#cpHug)" stroke="${INK}" stroke-width="5"/><path d="M 62 32 L 48 40 M 62 44 L 48 46" stroke="${INK}" stroke-width="3"/></g>`);
  const legs = g(h);
  const lL = mk('path', { stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, legs), lR = mk('path', { stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }, legs);
  h.insertBefore(legs, h.firstChild);
  const sweat = [0, 1].map(() => mk('path', { d: 'M 0 0 Q 6 10 0 14 Q -6 10 0 0 Z', fill: '#7FD6FF', stroke: INK, 'stroke-width': 2 }, h));
  return { g: h, hands, lL, lR, sweat };
}

const CORP = { id: 'corp' };
CORP.build = function (root, width) {
  corpDefs();
  const C = CORP; C.width = width;
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#cpSky)' }, root);
  C.clouds = g(root);
  const Rc = rng(91);
  for (let i = 0; i < 8; i++) {
    const cg = g(C.clouds, { transform: `translate(${-300 + i * 460 + Rc() * 150} ${300 + Rc() * 380}) scale(${0.8 + Rc() * 0.7})` });
    markup(cg, `<g fill="#FFFFFF"><ellipse cx="0" cy="0" rx="140" ry="50"/><circle cx="-60" cy="-20" r="56"/><circle cx="20" cy="-46" r="72"/><circle cx="90" cy="-14" r="50"/></g><ellipse cx="0" cy="30" rx="130" ry="18" fill="#BFE6FF"/>`);
  }
  // skyline lointaine (0,12)
  C.far = g(root, { filter: 'url(#b1)' });
  const R = rng(93);
  let x = -900;
  while (x < width * 0.12 + 1800) { const w = 70 + R() * 120, h = 260 + R() * 500; mk('rect', { x, y: 1180 - h, width: w, height: h + 100, rx: 6, fill: 'url(#cpFar)' }, C.far); x += w + 10; }
  // tours de verre (0,4) : emblèmes évocateurs (étincelle, baleine, nœud géant « OpenIA »)
  C.mid = g(root);
  x = -600; let bi = 0;
  const glass = ['cpGlass', 'cpGlass2', 'cpGlass3'];
  while (x < width * 0.4 + 1800) {
    const w = 240 + R() * 160, h = 620 + R() * 460, top = 1250 - h;
    const tg = g(C.mid);
    mk('rect', { x, y: top, width: w, height: h + 50, rx: 18, fill: `url(#${glass[bi % 3]})`, stroke: '#1E4A6E', 'stroke-width': 5 }, tg);
    for (let yy = top + 30; yy < 1240; yy += 46) mk('path', { d: `M ${x + 8} ${yy} L ${x + w - 8} ${yy}`, stroke: '#FFFFFF', 'stroke-width': 2, opacity: 0.35 }, tg);
    for (let xx = x + 40; xx < x + w - 10; xx += 56) mk('path', { d: `M ${xx} ${top + 10} L ${xx} ${1240}`, stroke: '#1E4A6E', 'stroke-width': 2, opacity: 0.25 }, tg);
    mk('path', { d: `M ${x + 10} ${top + 20} L ${x + w * 0.45} ${top + 20} L ${x + 10} ${top + h * 0.5} Z`, fill: '#FFFFFF', opacity: 0.28 }, tg);
    const ex = x + w / 2, ey = top + 110;
    if (bi % 4 === 1) { const e = g(tg, { transform: `translate(${ex} ${ey})` }); mk('path', { d: 'M 0 -60 Q 8 -8 60 0 Q 8 8 0 60 Q -8 8 -60 0 Q -8 -8 0 -60 Z', fill: '#FFFFFF', stroke: '#1E4A6E', 'stroke-width': 4 }, e); }
    else if (bi % 4 === 3) { const e = g(tg, { transform: `translate(${ex} ${ey})` }); markup(e, `<path d="M -70 10 Q -60 -40 0 -40 Q 50 -40 60 -6 L 86 -26 L 80 12 L 60 10 Q 40 40 -20 36 Q -60 34 -70 10 Z" fill="#4D6BFE" stroke="#FFFFFF" stroke-width="5"/><circle cx="30" cy="-14" r="6" fill="#FFFFFF"/>`); }
    else if (bi % 4 === 2) { const e = g(tg, { transform: `translate(${ex} ${ey})` }); knot(e, 62, '#FFFFFF', '#FFFFFF'); const tt = mk('text', { x: 0, y: 110, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 46, fill: '#FFFFFF' }, e); tt.textContent = 'OpenIA'; }
    // hélistation + drapeaux
    if (bi % 3 === 0) markup(tg, `<g transform="translate(${ex} ${top})"><rect x="-70" y="-12" width="140" height="12" fill="#1E4A6E"/><circle cx="0" cy="-12" r="0"/><path d="M -40 -12 L -40 -90" stroke="#1E4A6E" stroke-width="5"/><path d="M -40 -90 L 20 -76 L -40 -62 Z" fill="#FF6B8B"/></g>`);
    x += w + 40 + R() * 60; bi++;
  }
  // campus : pelouse, allée, méca géant et le petit visage jaune (0,7)
  C.campus = g(root);
  mk('rect', { x: -1400, y: 1240, width: width + 4000, height: 120, fill: 'url(#cpLawn)', stroke: '#2E7A40', 'stroke-width': 4 }, C.campus);
  for (let k = 0; k < 40; k++) markup(C.campus, `<g transform="translate(${-800 + k * 140} 1244)"><rect x="-8" y="-60" width="16" height="60" fill="#8A5A3A"/><circle cx="0" cy="-86" r="42" fill="#4FC06A" stroke="#2E7A40" stroke-width="4"/><circle cx="-14" cy="-96" r="12" fill="#7EE08A"/></g>`);
  // méca « OpenIA »
  C.mech = g(C.campus);
  const M = C.mech;
  C.mechX = 1500;
  markup(M, `<g><rect x="-150" y="-60" width="80" height="320" rx="30" fill="url(#cpMech)" stroke="${INK}" stroke-width="7"/><rect x="70" y="-60" width="80" height="320" rx="30" fill="url(#cpMech)" stroke="${INK}" stroke-width="7"/>
    <rect x="-190" y="230" width="150" height="60" rx="20" fill="#14161C" stroke="${INK}" stroke-width="7"/><rect x="40" y="230" width="150" height="60" rx="20" fill="#14161C" stroke="${INK}" stroke-width="7"/>
    <rect x="-230" y="-480" width="460" height="460" rx="70" fill="url(#cpMech)" stroke="${INK}" stroke-width="8"/>
    <rect x="-200" y="-450" width="120" height="30" rx="15" fill="#FFFFFF" opacity="0.18"/></g>`);
  C.mechEmblem = g(M, { transform: 'translate(0 -250)' });
  knot(C.mechEmblem, 90, '#FFFFFF', '#FFFFFF');
  const emText = mk('text', { x: 0, y: 150, 'text-anchor': 'middle', 'font-family': 'Space Grotesk', 'font-weight': 700, 'font-size': 44, fill: '#FFFFFF' }, C.mechEmblem); emText.textContent = 'OpenIA';
  C.mechArmL = g(M); C.mechArmR = g(M);
  for (const a of [C.mechArmL, C.mechArmR]) markup(a, `<rect x="-40" y="0" width="80" height="300" rx="36" fill="url(#cpMech)" stroke="${INK}" stroke-width="7"/><path d="M -50 290 L -60 360 M 0 300 L 0 372 M 50 290 L 60 360" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>`);
  C.mechHead = g(M);
  markup(C.mechHead, `<rect x="-170" y="-230" width="340" height="170" rx="50" fill="url(#cpMech)" stroke="${INK}" stroke-width="8"/>
    <rect x="-120" y="-190" width="90" height="40" rx="16" fill="#FF3B30" filter="url(#glow)"/><rect x="30" y="-190" width="90" height="40" rx="16" fill="#FF3B30" filter="url(#glow)"/>`);
  C.mechJaw = g(M);
  markup(C.mechJaw, `<path d="M -170 -60 L 170 -60 L 150 40 Q 0 70 -150 40 Z" fill="#14161C" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M -140 -60 L -120 -20 L -100 -60 L -80 -20 L -60 -60 L -40 -20 L -20 -60 L 0 -20 L 20 -60 L 40 -20 L 60 -60 L 80 -20 L 100 -60 L 120 -20 L 140 -60" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/>`);
  C.mechTop = g(M);
  markup(C.mechTop, `<path d="M -140 -64 L -120 -104 L -100 -64 L -80 -104 L -60 -64 L -40 -104 L -20 -64 L 0 -104 L 20 -64 L 40 -104 L 60 -64 L 80 -104 L 100 -64 L 120 -104 L 140 -64" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/>`);
  C.hug = hugFace(C.campus);
  C.crumbs = [...Array(10)].map((_, k) => mk('circle', { r: 8 + (k % 3) * 4, fill: k % 2 ? '#FFC93C' : '#FFE680', stroke: INK, 'stroke-width': 3 }, C.campus));
  // employés qui applaudissent / filment
  C.staff = [0, 1, 2, 3, 4, 5].map(k => ({ P: makePerson(C.campus, { kind: ['clap', 'phone', 'clap', 'cheer', 'type', 'clap'][k], seed: 900 + k, tie: ['#D1495B', '#29335C', '#F3A712'][k % 3], shirt: ['#FFFFFF', '#E9EEF5', '#1F2A44'][k % 3], full: true }), x: 780 + k * 150 + (k > 2 ? 900 : 0), y: 1250 }));
  // allée et bordure (profondeur 1)
  C.street = g(root);
  mk('rect', { x: -1400, y: 1330, width: width + 4000, height: 44, fill: '#FFFFFF', stroke: '#1E4A6E', 'stroke-width': 4 }, C.street);
  mk('rect', { x: -1400, y: 1372, width: width + 4000, height: 190, fill: 'url(#cpPath)' }, C.street);
  for (let k = -12; k < (width + 3000) / 120; k++) mk('rect', { x: k * 120, y: 1372, width: 60, height: 190, fill: '#FFFFFF', opacity: 0.18 }, C.street);
  mk('rect', { x: -1400, y: 1560, width: width + 5000, height: 400, fill: 'url(#cpLawn)' }, C.street);
  C.beds = g(root);
  for (let k = 0; k < 12; k++) {
    const bx = -200 + k * 420, by = 1660 + (k % 2) * 40;
    markup(C.beds, `<g transform="translate(${bx} ${by})"><ellipse cx="0" cy="30" rx="170" ry="46" fill="#2E8A45"/>${[...Array(9)].map((_, i) => `<circle cx="${-130 + i * 32}" cy="${10 + (i % 3) * 12}" r="${14 + (i % 2) * 4}" fill="${['#FF6B8B', '#FFD34D', '#FFFFFF', '#B98CFF'][i % 4]}" stroke="${INK}" stroke-width="3"/>`).join('')}</g>`);
  }
  // premier plan : buissons taillés et bornes flous
  C.fore = g(root, { filter: 'url(#b12)' });
  for (let k = 0; k < 7; k++) markup(C.fore, `<g transform="translate(${400 + k * 820} 1820)"><rect x="-120" y="-60" width="240" height="160" rx="70" fill="#3E9A50"/><rect x="-100" y="-80" width="200" height="40" rx="20" fill="#5FC06A"/></g><g transform="translate(${800 + k * 820} 1760)"><rect x="-26" y="-200" width="52" height="300" rx="20" fill="#E9EEF5"/><rect x="-26" y="-200" width="52" height="30" rx="10" fill="#FF6B8B"/></g>`);
};
CORP.update = function (t, u) {
  const C = CORP;
  const L = (el, f, dx = 0) => attr(el, 'transform', `translate(${r2(-u * f + dx)} 0)`);
  L(C.clouds, 0.05, t * 20); L(C.far, 0.12); L(C.mid, 0.4); L(C.campus, 0.7); L(C.street, 1); L(C.beds, 1.25); L(C.fore, 1.6);
  // le méca : il marche, se penche, ouvre la mâchoire… et croque au temps fort (beat 12)
  const tb = beat(12);
  if (C.mx === undefined) C.mx = 640 + 0.7 * (camX(tb) - C.x0);   // le méca est bien cadré au moment du croc
  const open = clamp(1 - Math.abs(t - (tb - 0.12)) / 0.3) * (t < tb ? 1 : 0);
  const chomp = t >= tb ? Math.abs(Math.sin((t - tb) * 22)) * clamp(1 - (t - tb) / 0.5) : 0;
  const jaw = Math.max(open * 90, chomp * 30);
  const MS = 0.62, mx = C.mx, my = 1250 - 290 * MS, lean = clamp((t - (tb - 0.6)) / 0.5) * (t < tb + 0.3 ? 1 : clamp(1 - (t - tb - 0.3) / 0.4));
  attr(C.mech, 'transform', `translate(${r2(mx)} ${r2(my + Math.sin(t * 5) * 4)}) rotate(${r2(lean * 10)}) scale(${MS})`);
  attr(C.mechHead, 'transform', `translate(0 ${r2(-480 - jaw * 0.3)})`);
  attr(C.mechTop, 'transform', `translate(0 ${r2(-480 - jaw * 0.3)})`);
  attr(C.mechJaw, 'transform', `translate(0 ${r2(-480 + jaw * 0.7)})`);
  const reach = lean;
  attr(C.mechArmL, 'transform', `translate(-270 -420) rotate(${r2(20 + Math.sin(t * 4) * 6)})`);
  attr(C.mechArmR, 'transform', `translate(270 -420) rotate(${r2(-20 - reach * 60)})`);
  // le petit visage jaune court… puis se fait croquer
  const eaten = t >= tb;
  const run = t * 1;
  const hx = mx + 520 - E.soft(clamp((t - (tb - 1.0)) / 0.9)) * 360, hy = 1170 - Math.abs(Math.sin(run * 16)) * 26;
  const pull = eaten ? E.in(clamp((t - tb) / 0.08)) : 0;
  const fx = lerp(hx, mx + 20, pull), fy = lerp(hy, my - 500 * MS, pull);
  vis(C.hug.g, !eaten || t < tb + 0.08);
  attr(C.hug.g, 'transform', `translate(${r2(fx)} ${r2(fy)}) rotate(${r2(Math.sin(run * 16) * 8)}) scale(${r2(1.25 * (1 - pull * 0.5))})`);
  const lg = Math.sin(run * 16) * 26;
  attr(C.hug.lL, 'd', `M -24 60 L ${r2(-30 - lg)} 110`); attr(C.hug.lR, 'd', `M 24 60 L ${r2(30 + lg)} 110`);
  C.hug.sweat.forEach((s, i) => attr(s, 'transform', `translate(${r2(-80 - i * 20 - ((t * 3 + i * 0.5) % 1) * 30)} ${r2(-60 + i * 30 - ((t * 3 + i * 0.5) % 1) * 20)})`));
  C.crumbs.forEach((c, k) => {
    const d = t - tb;
    const on = d > 0.02 && d < 0.7;
    vis(c, on); if (!on) return;
    const a = -Math.PI / 2 + (k / 10 - 0.5) * 2.4;
    attr(c, 'cx', r2(mx + 10 + Math.cos(a) * d * 700)); attr(c, 'cy', r2(my - 500 * MS + Math.sin(a) * d * 700 + d * d * 1600));
  });
  C.staff.forEach((s, k) => updatePerson(s.P, t, k < 3 ? mx - 900 + k * 140 : mx + 700 + (k - 3) * 140, s.y, 1.05, k < 3 ? 1 : -1));
};
