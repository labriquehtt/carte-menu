// Texte du téléprompteur (CapCut), tiré de SUB_RAW dans reel.js :
//   node teleprompteur.js   →  SCRIPT-teleprompteur.txt
// Texte continu, sans titres ni repères. Une ligne vide = une respiration ; deux lignes
// vides = un vrai silence, là où la vidéo s'arrête (« La Source. », le robot qui s'endort,
// le fondu au noir avant l'outro).
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'reel.js'), 'utf8');
const a = src.indexOf('const SUB_RAW = [');
const b = src.indexOf('\n];', a);
const SUB = new Function('return ' + src.slice(src.indexOf('[', a), b + 2).replace(/\/\/.*$/mg, ''))();

// temps script (début de ligne) avant lesquels on marque une pause
const BREATH = [11.2, 21.9, 49.0, 75.1, 91.0, 105.5, 122.1, 130.4, 135.2, 151.3, 152.9, 162.0, 170.2];
const SILENCE = [129.0, 145.5, 160.1];

let out = '';
for (const [t0, , text] of SUB) {
  const line = text.replace(/\*/g, '');
  if (!out) out = line;
  else if (SILENCE.includes(t0)) out += '\n\n\n' + line;
  else if (BREATH.includes(t0)) out += '\n\n' + line;
  else out += ' ' + line;
}
fs.writeFileSync(path.join(__dirname, 'SCRIPT-teleprompteur.txt'), out + '\n');
console.log(out);
