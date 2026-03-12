const fs = require('fs');
const { PNG } = require('pngjs');

const files = [
  'burger-classic.png',
  'burger-jalapeno.png',
  'burger-poulet.png',
  'burger-bacon.png',
];

function colorDist(r1,g1,b1,r2,g2,b2) {
  return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
}

// Détecte la couleur olive/jaune du cercle vert
function isCircleColor(r,g,b) {
  return r > 90 && g > 90 && b < 70 && Math.abs(r-g) < 80 && (r+g) > 220;
}

function processImage(filename) {
  const src = fs.readFileSync(filename);
  const png = PNG.sync.read(src);
  const { width, height, data } = png;

  // ── Étape 1 : Flood-fill fond gris depuis les 4 coins ──
  const corner = (function(){
    const i=0; return [data[0],data[1],data[2]];
  })();
  const [bgR,bgG,bgB] = corner;
  console.log(`${filename}: fond détecté rgb(${bgR},${bgG},${bgB})`);

  const visited = new Uint8Array(width*height);
  const queue = [[0,0],[width-1,0],[0,height-1],[width-1,height-1]];
  const tolerance = 45;

  while (queue.length > 0) {
    const [x,y] = queue.pop();
    if (x<0||x>=width||y<0||y>=height) continue;
    const idx = y*width+x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx*4;
    const r=data[i],g=data[i+1],b=data[i+2];
    if (colorDist(r,g,b,bgR,bgG,bgB) > tolerance) continue;
    data[i+3] = 0;
    queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }

  // ── Étape 2 : Trouver la bounding box du cercle olive ──
  let minX=width, maxX=0, minY=height, maxY=0;
  for (let y=0;y<height;y++) {
    for (let x=0;x<width;x++) {
      const i=(y*width+x)*4;
      if (data[i+3]<50) continue;
      const r=data[i],g=data[i+1],b=data[i+2];
      if (isCircleColor(r,g,b)) {
        if(x<minX) minX=x; if(x>maxX) maxX=x;
        if(y<minY) minY=y; if(y>maxY) maxY=y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    console.log(`  WARN: cercle non détecté, masque plein`);
    // Fallback: masque circulaire centré sur l'image
    minX=0; maxX=width-1; minY=0; maxY=height-1;
  }

  const cx = (minX+maxX)/2;
  const cy = (minY+maxY)/2;
  const radius = (Math.max(maxX-minX, maxY-minY)/2) + 4; // +4px marge
  console.log(`  cercle: centre=(${cx.toFixed(0)},${cy.toFixed(0)}) rayon=${radius.toFixed(0)}`);

  // ── Étape 3 : Masque circulaire — tout hors du cercle → transparent ──
  for (let y=0;y<height;y++) {
    for (let x=0;x<width;x++) {
      const dx=x-cx, dy=y-cy;
      if (Math.sqrt(dx*dx+dy*dy) > radius) {
        const i=(y*width+x)*4;
        data[i+3]=0;
      }
    }
  }

  fs.writeFileSync(filename, PNG.sync.write(png));
  console.log(`  -> sauvegardé`);
}

for (const f of files) {
  try { processImage(f); }
  catch(e) { console.error('ERR', f, e.message); }
}
console.log('Terminé.');
