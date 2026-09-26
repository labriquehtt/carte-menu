// Miniature (couverture) du reel, 1080×1920, faite avec les éléments de la vidéo.
//   node miniature.js                          → out/miniature-hallucination.png / .jpg
//   node miniature.js --word "WORLD MODELS"    → out/miniature-world-models.png / .jpg
//   node miniature.js --theme expo --word EXPONENTIALITÉ --face surpris
//       thème « expo » : courbe exponentielle en néon à la place du dessin, lettres du mot qui
//       grossissent de façon exponentielle le long d'une ligne qui monte (vidéo sur l'IA)
// Décor de nuit, dessin de Philippe Delord dont le toit coule (image du clip roof), robot
// détective en pose « examine un indice » (loupe sur l'œil), et le mot en grand au milieu,
// qui coule lui aussi. Le mot et la tête restent dans le recadrage 3:4 de la grille du
// profil Instagram (y 240 → 1680).
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const WORD = (opt('word') || 'HALLUCINATION').toUpperCase();
const POSE = +(opt('pose') || 31.5);            // temps script de la pose du robot
const ROOF_FRAME = +(opt('frame') || 150);      // image du clip roof (le toit coule)
const THEME = opt('theme') || 'drip';            // drip (HALLUCINATION) | expo
const FACE = opt('face') || null;                // expression imposée au robot (liste autorisée)
const slug = WORD.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const OUT = path.resolve(opt('out') || path.join(__dirname, 'out', `miniature-${slug}`));

(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.REEL_READY === true, null, { timeout: 60000 });
  await page.evaluate(ts => window.renderScript(ts), POSE);
  await page.evaluate(async ({ WORD, ROOF_FRAME, THEME, FACE }) => {
    const { RB, $, g, mk, markup, attr, vis, GREEN, INK } = window.REEL_KIT;
    const svg = document.querySelector('svg');
    for (const id of ['L-back', 'L-world', 'L-front', 'L-key', 'L-subs', 'L-debug']) vis($(id), false);
    attr($('bgFade'), 'opacity', 0);
    const TH = g(svg);

    markup(mk('defs', {}, TH), `
      <filter id="thGlow" x="-20%" y="-60%" width="140%" height="220%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="b"/>
        <feFlood flood-color="${GREEN}" flood-opacity="0.75"/><feComposite in2="b" operator="in" result="gl"/>
        <feMerge><feMergeNode in="gl"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="thShadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.65"/>
      </filter>
      <radialGradient id="thVignette" cx="540" cy="1000" r="760" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#020812" stop-opacity="0.55"/><stop offset="0.55" stop-color="#020812" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#020812" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="thClip"><rect x="-410" y="-273" width="820" height="547" rx="20"/></clipPath>`);
    mk('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: 'url(#thVignette)' }, TH);

    const F = g(TH, { transform: 'translate(540 548) rotate(2.5)', filter: 'url(#thShadow)' });
    if (THEME === 'expo') {
      // courbe exponentielle en néon : chaque pas double (×2 … ×64), elle crève le haut du cadre
      mk('rect', { x: -410, y: -273, width: 820, height: 547, rx: 20, fill: '#0A1119', 'fill-opacity': 0.93 }, F);
      const gr = g(F, { stroke: GREEN, 'stroke-opacity': 0.09, 'stroke-width': 2 });
      for (let x = -410 + 82; x < 410; x += 82) mk('line', { x1: x, y1: -273, x2: x, y2: 274 }, gr);
      for (let y = -273 + 68; y < 274; y += 68) mk('line', { x1: -410, y1: y, x2: 410, y2: y }, gr);
      const X0 = -350, X1 = 330, Y0 = 215, YT = -250;
      mk('path', { d: `M ${X0} ${Y0 + 12} L ${X1 + 40} ${Y0 + 12} M ${X0 - 12} ${Y0} L ${X0 - 12} ${-240}`, stroke: GREEN, 'stroke-opacity': 0.45, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, F);
      // linéaire, pour comparer (pointillés gris)
      mk('path', { d: `M ${X0} ${Y0} L ${X1 + 30} ${Y0 - 150}`, stroke: '#8FA3B5', 'stroke-opacity': 0.75, 'stroke-width': 4, 'stroke-dasharray': '10 12', fill: 'none' }, F);
      const lin = mk('text', { x: X1 + 34, y: Y0 - 168, 'font-family': 'IBM Plex Mono', 'font-weight': 500, 'font-size': 24, fill: '#8FA3B5', 'text-anchor': 'end' }, F);
      lin.textContent = 'linéaire';
      const K = 6 * Math.LN2, N = 60, pts = [];
      const cy = u => Y0 - (Math.exp(K * u) - 1) / (Math.exp(K) - 1) * (Y0 - YT);
      for (let i = 0; i <= N + 6; i++) { const u = i / N; pts.push([X0 + u * (X1 - X0), cy(u)]); }
      const d = 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
      mk('path', { d, stroke: GREEN, 'stroke-opacity': 0.22, 'stroke-width': 26, fill: 'none', 'stroke-linecap': 'round' }, F);
      mk('path', { d, stroke: GREEN, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round', filter: 'url(#glow)' }, F);
      const [ex, ey] = pts[pts.length - 1], [px, py] = pts[pts.length - 3], an = Math.atan2(ey - py, ex - px);
      mk('path', { d: `M ${ex + 30 * Math.cos(an)} ${ey + 30 * Math.sin(an)} L ${ex + 22 * Math.cos(an + 2.4)} ${ey + 22 * Math.sin(an + 2.4)} L ${ex + 22 * Math.cos(an - 2.4)} ${ey + 22 * Math.sin(an - 2.4)} Z`, fill: GREEN, filter: 'url(#glow)' }, F);
      for (let k = 1; k <= 6; k++) {   // un point à chaque doublement
        const u = k / 6, x = X0 + u * (X1 - X0), y = cy(u);
        mk('circle', { cx: x, cy: y, r: 9, fill: '#0A1119', stroke: GREEN, 'stroke-width': 4 }, F);
        const lb = mk('text', { x: x - (k < 6 ? 16 : 24), y: k < 6 ? y - 16 : y + 34, 'font-family': 'IBM Plex Mono', 'font-weight': 500, 'font-size': k < 6 ? 26 : 30, fill: GREEN, 'text-anchor': 'end' }, F);
        lb.textContent = '×' + 2 ** k;
      }
      mk('rect', { x: -410, y: -273, width: 820, height: 547, rx: 20, fill: 'none', stroke: GREEN, 'stroke-width': 7, filter: 'url(#glow)' }, F);
      mk('path', { d: d.split(' L ').slice(-9).join(' L ').replace(/^(?!M)/, 'M '), stroke: GREEN, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round', filter: 'url(#glow)' }, F);   // la courbe repasse devant le cadre
    } else {
    // le dessin, dont le toit coule, dans un cadre vert légèrement penché
    mk('rect', { x: -410, y: -273, width: 820, height: 547, rx: 20, fill: '#F4F1EA' }, F);
    const im = mk('image', { x: -410, y: -273, width: 820, height: 547, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#thClip)' }, F);
    await new Promise(res => { im.addEventListener('load', res, { once: true }); im.setAttribute('href', `media/roof/${String(ROOF_FRAME).padStart(4, '0')}.jpg`); });
    mk('rect', { x: -410, y: -273, width: 820, height: 547, rx: 20, fill: 'none', stroke: GREEN, 'stroke-width': 7, filter: 'url(#glow)' }, F);
    }

    // le robot, en grand, pose « examine un indice »
    attr(RB.root, 'transform', 'translate(540 1880) rotate(-3) scale(1.62) translate(0 -166)');
    vis(RB.shadow, false);
    if (FACE && RB.faces[FACE]) {
      for (const n in RB.faces) { vis(RB.faces[n].g, n === FACE); attr(RB.faces[n].g, 'opacity', 1); }
      const F2 = RB.faces[FACE]; vis(F2.fm, true); vis(RB.talk, false);
      F2.eL.removeAttribute('transform');
      attr(F2.eR, 'transform', `translate(${F2.cR[0]} ${F2.cR[1]}) scale(1.3) translate(${-F2.cR[0]} ${-F2.cR[1]})`);
    }
    const R = g(TH);
    R.appendChild(RB.fx);

    if (THEME === 'expo') {
      // chaque lettre plus grande que la précédente (facteur constant), sur une ligne qui monte
      const n = [...WORD].length, RT = 1.9, r = RT ** (1 / (n - 1)), GAP = 4;
      const T = g(TH);
      const meas = mk('text', { 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 100 }, T);
      const ws = [...WORD].map(c => { meas.textContent = c; return meas.getComputedTextLength(); });
      meas.remove();
      const s0 = 1010 / ws.reduce((a, w, i) => a + (w / 100 + GAP / 100) * r ** i, 0) * 1;
      const out = g(T), fill = g(T, { filter: 'url(#thGlow)' });
      let x = 540 - 1010 / 2;
      [...WORD].forEach((c, i) => {
        const fs = s0 * r ** i, y = 1085 - 75 * (r ** i - 1) / (RT - 1);
        const a = { x: x.toFixed(1), y: y.toFixed(1), 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': fs.toFixed(1) };
        mk('text', { ...a, fill: INK, stroke: INK, 'stroke-width': 22 + 6 * i / n, 'stroke-linejoin': 'round' }, out).textContent = c;
        mk('text', { ...a, fill: GREEN }, fill).textContent = c;
        x += (ws[i] + GAP) * fs / 100;
      });
      return;
    }
    // le mot, qui coule comme le toit
    const T = g(TH, { transform: 'translate(540 1005) rotate(-4)' });
    const meas = mk('text', { 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 100, 'letter-spacing': 2 }, T);
    meas.textContent = WORD;
    const fs0 = Math.min(230, 100 * 1000 / meas.getComputedTextLength());
    meas.remove();
    const base = { 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': Math.round(fs0), 'letter-spacing': 2, 'text-anchor': 'middle', x: 0, y: 0 };
    const out = g(T), fill = g(T, { filter: 'url(#thGlow)' });
    const tOut = mk('text', { ...base, fill: INK, stroke: INK, 'stroke-width': 26, 'stroke-linejoin': 'round' }, out);
    const tFill = mk('text', { ...base, fill: GREEN }, fill);
    tOut.textContent = tFill.textContent = WORD;
    // gouttes qui coulent de quelques lettres (tirage fixe), sous une partie pleine du glyphe
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const ROUND = 'UDBZ', MID = 'IT1!', plain = WORD.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // une goutte : part du bas de la lettre, pend à la verticale (contre-rotation), finit en larme
    const drip = (cx, w, len, parent, attrs) => {
      const hw = w / 2, hb = w * 0.34, f = w * 0.22, top = fs0 * 0.1;
      const d = `M ${-hw} ${-top} L ${hw} ${-top} L ${hw} 0 L ${hw + f} 0 Q ${hw} 0 ${hw} ${f} L ${hb} ${len}`
        + ` A ${hb} ${hb} 0 0 1 ${-hb} ${len} L ${-hw} ${f} Q ${-hw} 0 ${-hw - f} 0 L ${-hw} 0 Z`;
      const gg = g(parent, { transform: `translate(${cx} 0) rotate(4)` });
      mk('path', { d, ...attrs }, gg);
      mk('ellipse', { cx: 0, cy: len + w * 0.12, rx: w * 0.58, ry: w * 0.72, ...attrs }, gg);
    };
    let last = -9;
    for (let i = 0; i < plain.length; i++) {
      const c = plain[i];
      if (c === ' ' || 'CAGSJQKO'.includes(c) || i - last < 2 || rnd() < 0.35) continue;   // pas de faux Ç ni Ą
      const ext = tFill.getExtentOfChar(i);
      const fr = ROUND.includes(c) ? 0.3 + 0.4 * rnd() : MID.includes(c) ? 0.5 : 'LE'.includes(c) ? 0.2 : (rnd() < 0.5 ? 0.16 : 0.84);
      const cx = ext.x + ext.width * fr, w = fs0 * (ROUND.includes(c) ? 0.18 + 0.03 * rnd() : 0.15), len = fs0 * (0.25 + 0.5 * rnd());
      drip(cx, w, len, out, { fill: INK, stroke: INK, 'stroke-width': 26, 'stroke-linejoin': 'round' });
      drip(cx, w, len, fill, { fill: GREEN });
      last = i;
    }
    fill.insertBefore(tFill, null);   // le texte par-dessus ses gouttes
  }, { WORD, ROOF_FRAME, THEME, FACE });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const png = await page.screenshot({ type: 'png' });
  fs.writeFileSync(OUT + '.png', png);
  await page.screenshot({ type: 'jpeg', quality: 92, path: OUT + '.jpg' });
  await browser.close();
  console.log('miniature →', OUT + '.png / .jpg');
})();
