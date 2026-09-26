// Miniature (couverture) du reel, 1080×1920, faite avec les éléments de la vidéo.
//   node miniature.js                          → out/miniature-hallucination.png / .jpg
//   node miniature.js --word "WORLD MODELS"    → out/miniature-world-models.png / .jpg
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
const slug = WORD.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const OUT = path.resolve(opt('out') || path.join(__dirname, 'out', `miniature-${slug}`));

(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.REEL_READY === true, null, { timeout: 60000 });
  await page.evaluate(ts => window.renderScript(ts), POSE);
  await page.evaluate(async ({ WORD, ROOF_FRAME }) => {
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

    // le dessin, dont le toit coule, dans un cadre vert légèrement penché
    const F = g(TH, { transform: 'translate(540 548) rotate(2.5)', filter: 'url(#thShadow)' });
    mk('rect', { x: -410, y: -273, width: 820, height: 547, rx: 20, fill: '#F4F1EA' }, F);
    const im = mk('image', { x: -410, y: -273, width: 820, height: 547, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#thClip)' }, F);
    await new Promise(res => { im.addEventListener('load', res, { once: true }); im.setAttribute('href', `media/roof/${String(ROOF_FRAME).padStart(4, '0')}.jpg`); });
    mk('rect', { x: -410, y: -273, width: 820, height: 547, rx: 20, fill: 'none', stroke: GREEN, 'stroke-width': 7, filter: 'url(#glow)' }, F);

    // le robot, en grand, pose « examine un indice »
    attr(RB.root, 'transform', 'translate(540 1880) rotate(-3) scale(1.62) translate(0 -166)');
    vis(RB.shadow, false);
    const R = g(TH);
    R.appendChild(RB.fx);

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
  }, { WORD, ROOF_FRAME });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const png = await page.screenshot({ type: 'png' });
  fs.writeFileSync(OUT + '.png', png);
  await page.screenshot({ type: 'jpeg', quality: 92, path: OUT + '.jpg' });
  await browser.close();
  console.log('miniature →', OUT + '.png / .jpg');
})();
