// Rendu image par image de index.html → MP4 H.264 1080×1920 30 fps.
//   node render.js --stills 0.3,5,11 --out out/stills     (images de vérification, temps vidéo)
//   node render.js --stills 22.2,95 --script --out ...    (mêmes images, timecodes du brief)
//   node render.js --video out/la-source.mp4 --workers 4  (vidéo complète)
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const FFMPEG = process.env.FFMPEG || (() => {
  try { return require('child_process').execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim(); }
  catch { return 'ffmpeg'; }
})();

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const has = k => args.includes('--' + k);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.REEL_READY === true, null, { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  if (has('debug')) await page.evaluate(() => window.setDebug(true));
  return page;
}

function encoder(file) {
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-g', '60',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', '30', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  return { ff, done };
}

async function renderRange(browser, a, b, file, label) {
  const page = await openPage(browser);
  const { ff, done } = encoder(file);
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    await page.evaluate(n => window.renderFrame(n), i);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 150 === 0) console.log(`[${label}] ${i - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await done;
  await page.close();
}

(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  try {
    if (opt('stills')) {
      const out = path.resolve(opt('out') || 'out/stills');
      fs.mkdirSync(out, { recursive: true });
      const page = await openPage(browser);
      const fn = has('script') ? 'renderScript' : 'renderAt';   // --script : timecodes du brief
      for (const s of opt('stills').split(',')) {
        const t = parseFloat(s);
        await page.evaluate(([f, x]) => window[f](x), [fn, t]);
        await page.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(6, '0')}.png`) });
      }
      console.log('stills →', out);
    }
    if (opt('video')) {
      const file = path.resolve(opt('video'));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const probe = await openPage(browser);
      const total = await probe.evaluate(() => window.REEL.frames);
      await probe.close();
      const from = parseInt(opt('from') || '0', 10), to = parseInt(opt('to') || String(total), 10);
      const W = parseInt(opt('workers') || '4', 10);
      const tmp = fs.mkdtempSync(path.join(path.dirname(file), '.seg-'));
      const n = to - from, per = Math.ceil(n / W), segs = [];
      const jobs = [];
      for (let k = 0; k < W; k++) {
        const a = from + k * per, b = Math.min(to, a + per); if (a >= b) break;
        const sf = path.join(tmp, `seg${k}.mp4`); segs.push(sf);
        jobs.push(renderRange(browser, a, b, sf, 'w' + k));
      }
      await Promise.all(jobs);
      const list = path.join(tmp, 'list.txt');
      fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
      await new Promise((res, rej) => spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', file], { stdio: 'inherit' })
        .on('close', c => (c === 0 ? res() : rej(new Error('concat ' + c)))));
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log('vidéo →', file);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
