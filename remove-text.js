const fs = require('fs');
const { PNG } = require('pngjs');

const files = [
  'burger-classic.png',
  'burger-jalapeno.png',
  'burger-poulet.png',
  'burger-bacon.png',
];

function isWhiteText(r, g, b, a) {
  return a > 100 && r > 180 && g > 180 && b > 180;
}

function processImage(filename) {
  const src = fs.readFileSync(filename);
  const png = PNG.sync.read(src);
  const { width, height, data } = png;

  // Trouver la couleur olive du cercle (pixel non-blanc, non-transparent visible)
  // Trouver la couleur olive dominante (r≈g>100, b<80)
  const buckets = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 100) continue;
      if (r > 100 && g > 100 && b < 80 && Math.abs(r-g) < 60) {
        const key = Math.round(r/10)*10+','+Math.round(g/10)*10+','+Math.round(b/10)*10;
        buckets[key] = (buckets[key]||0)+1;
      }
    }
  }
  let circleR = 170, circleG = 160, circleB = 30;
  const top = Object.entries(buckets).sort((a,b)=>b[1]-a[1])[0];
  if (top) {
    const [kr,kg,kb] = top[0].split(',').map(Number);
    circleR = kr; circleG = kg; circleB = kb;
  }
  console.log(`${filename}: couleur cercle = rgb(${circleR},${circleG},${circleB})`);

  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isWhiteText(data[i], data[i+1], data[i+2], data[i+3])) {
        data[i]   = circleR;
        data[i+1] = circleG;
        data[i+2] = circleB;
        data[i+3] = 255;
        count++;
      }
    }
  }

  fs.writeFileSync(filename, PNG.sync.write(png));
  console.log(`  -> ${count} pixels blancs remplacés`);
}

for (const f of files) {
  try { processImage(f); }
  catch(e) { console.error('ERR', f, e.message); }
}
console.log('Terminé.');
