// Rendu d'EXPONENTIEL (compositing index.html + compo.js) : images de contrôle ou vidéo 1080×1920 30 i/s.
//   node render.js --plates anim --step 2 --stills 1,5,9 --out out/stills        (animatique : plaques 25 %)
//   node render.js --plates anim --step 2 --video out/animatique.mp4 --scale 0.5
//   node render.js --plates plates --video out/EXPONENTIEL-video.mp4 --workers 4 --sub 4
// Repris de parano-ia/render.js (Playwright + ffmpeg, flou de bougé par sous-images). Les pièces du robot
// (planche/robot_defs.svg) et les données (timing, bouche, sous-titres, ancres Blender) sont injectées ici.
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const pw = require(path.join(__dirname, '..', 'reel-la-source', 'node_modules', 'playwright'));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const PLATES = opt('plates') || 'anim', STEP = +(opt('step') || (PLATES === 'anim' ? 2 : 1));
const SCALE = +(opt('scale') || 1);
const ROOT = __dirname;

function data() {
  const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8'));
  const anchors = {}, fg = {};
  for (const p of timing.plans) {
    const dir = path.join(ROOT, 'out', PLATES, p.id);
    const f = path.join(dir, 'anchor.json');
    if (fs.existsSync(f)) anchors[p.id] = JSON.parse(fs.readFileSync(f, 'utf8'));
    fg[p.id] = fs.existsSync(path.join(dir, 'fg'));
  }
  return {
    timing, anchors, fg, plates: PLATES, step: STEP,
    root: 'file:///' + ROOT.replace(/\\/g, '/'),
    subs: JSON.parse(fs.readFileSync(path.join(ROOT, 'subs.json'), 'utf8')),
    mouth: JSON.parse(fs.readFileSync(path.join(ROOT, 'bouche.json'), 'utf8')).mouth,
  };
}

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SCALE });
  page.on('pageerror', e => console.error('page:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto('file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
  const defs = fs.readFileSync(path.join(ROOT, '..', 'planche', 'robot_defs.svg'), 'utf8');
  await page.evaluate(([d, x]) => {
    window.DATA = x;
    const tmp = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${d}</svg>`, 'image/svg+xml');
    const defs = document.querySelector('#stage defs');
    for (const n of [...tmp.documentElement.childNodes]) defs.appendChild(document.importNode(n, true));
    return window.init();
  }, [defs, data()]);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}
function encoder(file, sub, fps = 30) {
  const vf = (sub > 1 ? `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/${fps}/TB,` : '')
    + 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-c:v', 'png', '-i', '-',
    '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
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
    if ((i - a) % 60 === 0) console.log(`[${label}] ${i - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await done; await page.close();
}
(async () => {
  const browser = await pw.chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none', '--allow-file-access-from-files'] });
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
      const dur = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8')).duration;
      const N = Math.round(dur * 30), W = +(opt('workers') || 1), sub = +(opt('sub') || 1);
      const out = path.resolve(opt('video'));
      if (W === 1) await renderRange(browser, 0, N, out, 'rendu', sub);
      else {
        const parts = [], per = Math.ceil(N / W);
        await Promise.all([...Array(W)].map((_, w) => {
          const f = out.replace(/\.mp4$/, `.part${w}.mp4`); parts.push(f);
          return renderRange(browser, w * per, Math.min(N, (w + 1) * per), f, 'w' + w, sub);
        }));
        const list = out + '.txt';
        fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
        execSync(`"${FFMPEG}" -y -loglevel error -f concat -safe 0 -i "${list}" -c copy "${out}"`);
        parts.forEach(p => fs.unlinkSync(p)); fs.unlinkSync(list);
      }
      console.log('vidéo →', out);
    }
  } finally { await browser.close(); }
})();
