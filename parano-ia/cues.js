// Repères sonores calculés par la page elle-même (mêmes fonctions que le rendu) → out/cues.json, lu par son.py.
//   node cues.js
// Pour l'instant : chaque touche de la route-clavier (monde de la musique) sur laquelle passe la roue avant
// de la mobylette → une note (glissando qui ralentit au freinage et accélère au départ).
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page:', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const cues = await page.evaluate(() => {
    const iM = SEQ.findIndex(q => q.name === 'music');
    const a = SEAMS[iM - 1].S, b = SEAMS[iM].S, x0 = MUSIC.x0, KWR = 74;
    const keys = [];
    let last = null;
    for (let t = beat(TIMING.seams.music) - 0.3; t < beat(TIMING.seams.corp) + 0.3; t += 0.001) {
      const wx = mopedX(t) + FW[0] * RS;
      if (wx < a + 10 || wx > b - 10) { last = null; continue; }
      const k = Math.floor((wx - x0) / KWR);
      if (last !== null && k !== last) keys.push([+t.toFixed(4), k, +((wx - camX(t)) / W).toFixed(3)]);
      last = k;
    }
    return { roadKeys: keys };
  });
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'cues.json'), JSON.stringify(cues));
  console.log('cues.json :', cues.roadKeys.length, 'touches');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
