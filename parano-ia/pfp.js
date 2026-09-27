// Photos de profil Instagram (fond noir), 1080×1080, sur-échantillonnées ×2 puis réduites (python).
//   node pfp.js                       → out/pfp-2x.png       (buste, loupe à l'œil : pfp.html)
//   node pfp.js tete [h] [rot]        → out/pfp-tete-2x.png  (tête + chapeau seuls, clin d'œil : pfp_tete.html)
const path = require('path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const [kind, h, rot] = process.argv.slice(2);
(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('page:', e.message));
  const file = kind === 'tete' ? 'pfp_tete.html' : 'pfp.html';
  const qs = kind === 'tete' ? `?h=${h || 0.46}&rot=${rot || -6}` : '';
  await page.goto('file://' + path.join(__dirname, file) + qs);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  const out = path.join(__dirname, 'out', kind === 'tete' ? 'pfp-tete-2x.png' : 'pfp-2x.png');
  await page.screenshot({ path: out });
  await browser.close();
  console.log('→', out);
})().catch(e => { console.error(e); process.exit(1); });
