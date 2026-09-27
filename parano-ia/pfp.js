// Photo de profil Instagram : la tête du robot, loupe à l'œil, fond noir. 1080×1080 (carré, comme Instagram
// le veut), sur-échantillonné ×2 puis réduit pour un rendu bien lissé.
//   node pfp.js
const path = require('path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('page:', e.message));
  await page.goto('file://' + path.join(__dirname, 'pfp.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  await page.screenshot({ path: path.join(__dirname, 'out', 'pfp-2x.png') });
  await browser.close();
  console.log('→ out/pfp-2x.png');
})().catch(e => { console.error(e); process.exit(1); });
