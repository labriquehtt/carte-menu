const fs = require('fs');
const { PNG } = require('pngjs');

const files = [
  'burger-classic.png',
  'burger-jalapeno.png',
  'burger-poulet.png',
  'burger-bacon.png',
];

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

function removeBg(filename) {
  const src = fs.readFileSync(filename);
  const png = PNG.sync.read(src);
  const { width, height, data } = png;

  // Sample background color from the 4 corners
  function getPixel(x, y) {
    const i = (y * width + x) * 4;
    return [data[i], data[i+1], data[i+2], data[i+3]];
  }

  const corners = [
    getPixel(0, 0),
    getPixel(width-1, 0),
    getPixel(0, height-1),
    getPixel(width-1, height-1),
  ];
  // Average background color
  const bgR = Math.round(corners.reduce((s,c)=>s+c[0],0)/4);
  const bgG = Math.round(corners.reduce((s,c)=>s+c[1],0)/4);
  const bgB = Math.round(corners.reduce((s,c)=>s+c[2],0)/4);

  console.log(`${filename}: bg color = rgb(${bgR},${bgG},${bgB})`);

  const tolerance = 40;
  const visited = new Uint8Array(width * height);

  // BFS flood-fill from all 4 corners
  const queue = [[0,0],[width-1,0],[0,height-1],[width-1,height-1]];

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const i = idx * 4;
    const r = data[i], g = data[i+1], b = data[i+2];
    if (colorDistance(r, g, b, bgR, bgG, bgB) > tolerance) continue;

    // Make transparent
    data[i+3] = 0;

    queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }

  const out = PNG.sync.write(png);
  fs.writeFileSync(filename, out);
  console.log(`  -> done`);
}

for (const f of files) {
  try { removeBg(f); }
  catch(e) { console.error('ERR', f, e.message); }
}
console.log('All done.');
