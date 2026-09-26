// Rendu de la bande-annonce : images de contrôle ou vidéo 1080×1920 30 i/s avec flou de bougé.
//   node render.js --stills 0.5,2,3.6 --out out/stills
//   node render.js --video out/parano-ia.mp4 --workers 4 [--sub 4]
// Flou de bougé : chaque image est la moyenne de --sub sous-images réparties sur un demi-intervalle
// (obturateur à 180°), comme une vraie caméra : les fouettés et les vitesses deviennent fluides.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const FFMPEG = process.env.FFMPEG || require('child_process').execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page:', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}
function encoder(file, sub) {
  const vf = sub > 1
    ? `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/30/TB,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`
    : 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(30 * sub), '-c:v', 'png', '-i', '-',
    '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-g', '60',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', '30', file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  return { ff, done: new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c))))) };
}
async function renderRange(browser, a, b, file, label, sub) {
  const page = await openPage(browser);
  const { ff, done } = encoder(file, sub);
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    for (let k = 0; k < sub; k++) {
      const t = (i + (sub > 1 ? (k / (sub - 1) - 0.5) * 0.5 : 0)) / 30;
      await page.evaluate(x => window.renderAt(x), Math.max(0, t));
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if ((i - a) % 30 === 0) console.log(`[${label}] ${i - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await done; await page.close();
}
(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  try {
    if (opt('stills')) {
      const out = path.resolve(opt('out') || 'out/stills'); fs.mkdirSync(out, { recursive: true });
      const page = await openPage(browser);
      for (const s of opt('stills').split(',')) {
        const t = parseFloat(s);
        await page.evaluate(x => window.renderAt(x), t);
        await page.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(5, '0')}.png`) });
      }
      console.log('stills →', out);
    }
    if (opt('video')) {
      const file = path.resolve(opt('video')); fs.mkdirSync(path.dirname(file), { recursive: true });
      const sub = parseInt(opt('sub') || '4', 10);
      const probe = await openPage(browser); const total = await probe.evaluate(() => window.TRAILER.frames); await probe.close();
      const from = parseInt(opt('from') || '0', 10), to = parseInt(opt('to') || String(total), 10);
      const Wk = parseInt(opt('workers') || '4', 10);
      const tmp = fs.mkdtempSync(path.join(path.dirname(file), '.seg-'));
      const per = Math.ceil((to - from) / Wk), segs = [], jobs = [];
      for (let k = 0; k < Wk; k++) {
        const a = from + k * per, b = Math.min(to, a + per); if (a >= b) break;
        const sf = path.join(tmp, `seg${k}.mp4`); segs.push(sf);
        jobs.push(renderRange(browser, a, b, sf, 'w' + k, sub));
      }
      await Promise.all(jobs);
      const list = path.join(tmp, 'list.txt'); fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
      await new Promise((res, rej) => spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', file], { stdio: 'inherit' })
        .on('close', c => (c === 0 ? res() : rej(new Error('concat ' + c)))));
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log('vidéo →', file);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
