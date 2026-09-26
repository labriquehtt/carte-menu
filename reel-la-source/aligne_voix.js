// Sous-titres calés sur la voix réellement enregistrée (export CapCut) :
//   node aligne_voix.js   →  voix_subs.js (window.VOICE_SUBS, lu par reel.js avant SUB_RAW)
// Entrée : media/voix/asr.json, la reconnaissance vocale de la voix (mots + instant de début,
// modèle français sherpa-onnx, voir CLAUDE.md). Le texte affiché est celui de VOIX ci-dessous :
// ce qui a vraiment été dit (improvisations comprises), mots-clés entre *étoiles*, découpé
// en morceaux courts. Chaque mot apparaît à l'instant où il est prononcé ; chaque morceau
// disparaît peu après son dernier mot s'il y a un silence. La zone d'affichage suit la scène
// (celle de la ligne de SUB_RAW qu'il remplace).
const fs = require('fs');
const path = require('path');

const NB = ' ';
const VOIX = [
  'On a demandé à une *IA*', 'de *donner vie* à ce dessin,', 'et regardez bien ce qui se passe.',
  'Et ce dessin, c’est celui', 'de *Philippe Delord*,', 'un dessinateur qui m’a autorisé', 'à utiliser son travail', 'pour cette vidéo.',
  'La consigne était simple,', 'faire vivre la scène,', 'et pourtant il y a quelque chose', 'qui se met à *couler* du toit,',
  'la maison s’efface', 'puis revient,', 'et honnêtement,', 'à part *Philippe*,', 'personne ne peut dire', 'si c’est du *bois*,',
  'de l’*eau*', 'ou de la *fumée*,', 'pas même la machine.',
  ['Et l’IA,', { 0: 30.98, 1: 31.18 }], '*donner vie*,', 'ça veut juste dire *faire bouger*.', 'Elle n’a jamais vu *la vie*,', 'elle a vu des *millions* de vidéos',
  'où tout ce qui est vivant bouge,', 'alors elle fait bouger', 'tout ce qu’elle peut,', 'même ce qui n’était pas censé bouger.',
  'Et c’est exactement ce que pointe', '*Yann LeCun*,', 'un Français,', 'l’un des pionniers', 'de l’IA moderne,', 'qui a reçu le *prix Turing*,',
  'qui est l’équivalent', 'du *Nobel* en informatique.',
  'Sauf que pour *LeCun*,', 'ces modèles', 'ne font que prédire des *pixels*,', 'sans *aucun monde* derrière,', 'sans savoir ce qu’est un toit,',
  ['du bois, ou même de l’eau.', { 4: 64.0, 5: 64.16 }],
  'D’ailleurs, il a quitté *Meta*', 'et levé plus d’un *milliard* de dollars', 'pour construire l’inverse,', `ce qu’on nomme les *world models*${NB}:`,
  ['ce sont des IA', { 3: 72.12 }], ['qui, potentiellement,', { 0: 72.42, 1: 72.62 }], 'pour moi, sauraient', 'qu’un toit ne s’écoule pas comme de l’*eau*.',
  ['Bref, revenons à ce dessin.', { 0: 76.28, 1: 76.64 }], '*Hasard* ou non,', 'ce dessin est une partie', 'de ce que Philippe a nommé', '*La Source*.',
  'Et d’ailleurs, *vous*,', `que voyez-vous couler de ce toit${NB}?`, 'Parce que la machine,', 'elle, n’a rien voulu dire,',
  'c’est nous qui cherchons *un sens*.',
  'Alors au fond,', `qui est en train de *rêver*${NB}:`, `la machine, ou plutôt *nous*${NB}?`,
  'Est-ce une *hallucination*,', 'ou simplement une autre façon', `de voir les choses${NB}?`,
  ['Passons… affaire à suivre.', { 0: 100.98, 1: 101.38, 2: 101.72, 3: 101.95 }], 'Les dessins de *Philippe Delord*', 'vous attendent dans sa *galerie*,', 'sur *LK Studio*.',
  'Et la galerie se visite aussi', `en *réalité virtuelle*${NB}:`, ['vous avez juste à enfiler', { 0: 109.0, 1: 109.14, 2: 109.4, 3: 109.62, 4: 109.66 }], 'un *casque*,', 'et vous pouvez rentrer', 'dans le *dessin*.',
];

const LEAD = 0.06;    // le morceau apparaît juste avant son premier mot
const HOLD = 0.8;     // et reste ~0,8 s après le début de son dernier mot s'il est suivi d'un silence

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').trim();
const src = fs.readFileSync(path.join(__dirname, 'reel.js'), 'utf8');
const a = src.indexOf('const SUB_RAW = [');
const SUB = new Function('return ' + src.slice(src.indexOf('[', a), src.indexOf('\n];', a) + 2).replace(/\/\/.*$/mg, ''))();
const SPEED = +src.match(/SPEED = ([\d.]+ \/ [\d.]+)/)[1].split('/').reduce((x, y) => x / y);

// mots reconnus : un mot commence à chaque jeton précédé d'une espace
const asr = JSON.parse(fs.readFileSync(path.join(__dirname, 'media', 'voix', 'asr.json'), 'utf8'));
const heard = [];
asr.tokens.forEach((tok, i) => {
  if (tok.startsWith(' ') || !heard.length) heard.push({ w: tok.trim(), t: asr.ts[i] });
  else heard[heard.length - 1].w += tok;
});
const H = heard.map(h => norm(h.w));

// mots affichés, en gardant de quel morceau ils viennent
const shown = [];
const TXT = VOIX.map(v => (Array.isArray(v) ? v[0] : v)), PIN = VOIX.map(v => (Array.isArray(v) ? v[1] : {}));
TXT.forEach((txt, c) => txt.split(' ').forEach((w, q) => shown.push({ c, w, n: norm(w.replace(/\*/g, '')).replace(/[^a-z0-9]/g, ''), pin: PIN[c][q] })));

// alignement lettre par lettre (plus longue sous-suite commune) : robuste aux mots que la
// reconnaissance a collés ou coupés (« OURIGNA » = « pour une IA »)
const hc = [];   // lettres entendues, avec leur instant
heard.forEach((h, k) => {
  const w = H[k].replace(/[^a-z0-9]/g, ''), t1 = k + 1 < heard.length ? heard[k + 1].t : h.t + 0.4;
  const step = Math.min(0.07, (t1 - h.t) / Math.max(1, w.length));
  [...w].forEach((ch, q) => hc.push({ ch, t: h.t + q * step }));
});
const sc = [];   // lettres affichées → mot
shown.forEach((s, k) => [...s.n].forEach((ch, q) => sc.push({ ch, k, first: q === 0 })));
const n = sc.length, m = hc.length;
const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
  L[i][j] = sc[i].ch === hc[j].ch ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
for (let i = 0, j = 0; i < n && j < m;) {
  if (sc[i].ch === hc[j].ch && L[i][j] === L[i + 1][j + 1] + 1) { sc[i].t = hc[j].t; i++; j++; }
  else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
}
// instant d'un mot : sa première lettre alignée (moins le temps des lettres qui précèdent)
shown.forEach((s, k) => {
  const cs = sc.filter(c => c.k === k);
  const q = cs.findIndex(c => c.t !== undefined);
  if (q >= 0) s.t = cs[q].t - q * 0.05; else s.guess = true;
});
for (let i = 0; i < shown.length; i++) if (shown[i].t === undefined) {
  let p = i - 1; while (p >= 0 && shown[p].t === undefined) p--;
  let q = i + 1; while (q < shown.length && shown[q].t === undefined) q++;
  const tp = p >= 0 ? shown[p].t : shown[q].t - 0.3, tq = q < shown.length ? shown[q].t : tp + 0.3 * (q - p);
  shown[i].t = tp + (tq - tp) * (i - p) / (q - p);
}
// la reconnaissance donne l'instant d'un mot avec ~0,1-0,25 s de retard : on le recale sur la
// dernière attaque du son (media/voix/onsets.json, analyse_voix.py) juste avant
const ONS = fs.existsSync(path.join(__dirname, 'media', 'voix', 'onsets.json'))
  ? JSON.parse(fs.readFileSync(path.join(__dirname, 'media', 'voix', 'onsets.json'), 'utf8')) : null;
let prevT = -1;
shown.forEach(s => {
  if (ONS && !s.guess && s.pin === undefined) {
    const c = ONS.filter(o => o >= s.t - 0.24 && o <= s.t + 0.03 && o > prevT + 0.09);
    s.t = c.length ? c[c.length - 1] : Math.max(s.t - 0.08, prevT + 0.09);
  }
  prevT = s.pin ?? s.t;
});
shown.forEach(s => { if (s.pin !== undefined) { s.t = s.pin; s.guess = false; } });
for (let i = 1; i < shown.length; i++) shown[i].t = Math.max(shown[i].t, shown[i - 1].t + 0.02);   // ordre garanti

const chunks = TXT.map((txt, c) => {
  const ws = shown.filter(s => s.c === c);
  return { txt, t0: ws[0].t - LEAD, last: ws[ws.length - 1].t, wt: ws.map(s => s.t - 0.02), guess: ws.filter(s => s.guess).length };
});
chunks.forEach((k, i) => {
  const next = chunks[i + 1];
  k.te = next ? Math.min(next.t0, k.last + HOLD) : k.last + 1.4;
  if (next && next.t0 - k.te < 0.3) k.te = next.t0;
});
chunks.forEach(k => { if (k.wt[k.wt.length - 1] > k.te - 0.12) console.warn('ATTENTION mot trop tardif :', k.txt); });
const r2 = x => Math.round(x * 100) / 100;

// Points de synchro : chaque action du script (temps script d'une ligne de SUB_RAW) tombe quand
// la voix dit le passage correspondant. reel.js en tire la correspondance temps vidéo → temps
// script (accélère, ralentit, ou attend à un moment calme pendant les pauses).
const SYNC = [
  [6.9, 'et regardez'], [11.2, 'Et ce dessin'], [15.1, 'un dessinateur'], [17.6, 'à utiliser'], [19.6, 'pour cette'],
  [21.9, 'La consigne'], [24.3, 'faire vivre'], [26.7, 'et pourtant'], [30.2, 'qui se met'], [34.1, 'la maison'],
  [35.6, 'puis revient'], [37.0, 'et honnêtement'], [40.0, 'si c’est'], [42.4, 'de l’*eau*'], [43.8, 'ou de la'],
  [46.2, 'pas même'], [49.0, 'Et l’IA'], [53.3, 'ça veut'], [57.1, 'Elle n’a'],
  [60.0, 'elle a vu'], [63.5, 'où tout'], [66.9, 'alors elle'], [68.9, 'tout ce qu’elle'], [71.3, 'même ce'],
  [75.1, 'Et c’est exactement'], [78.1, '*Yann LeCun*'], [79.5, 'un Français'], [80.9, 'l’un des'], [84.3, 'qui a reçu'],
  [87.7, 'qui est l’équivalent'], [91.0, 'Sauf que'], [93.0, 'ne font que'], [96.4, 'sans *aucun'], [98.8, 'sans savoir'],
  [102.2, 'du bois, ou'], [105.5, 'D’ailleurs, il'], [108.0, 'et levé'], [111.5, 'pour construire'], [113.4, 'ce qu’on nomme'],
  [116.8, 'ce sont des'], [119.3, 'qu’un toit'], [122.1, 'Bref, revenons'], [124.5, 'de ce que Philippe'], [127.0, '*La Source*.'],
  [130.4, 'que voyez-vous'], [132.25, 'que voyez-vous', 2], [135.2, 'Parce que la'], [138.1, 'elle, n’a'], [140.5, 'c’est nous'],
  [145.5, 'Alors au fond'], [147.4, 'qui est en train'], [148.8, 'la machine, ou'], [151.3, 'Est-ce une'], [152.9, 'ou simplement'],
  [160.1, 'Passons… affaire', 1], [162.0, 'Les dessins'], [165.5, 'vous attendent'], [168.4, 'sur *LK'], [170.2, 'Et la galerie'],
  [173.2, 'en *réalité'], [175.2, 'vous avez juste', 4], [177.0, 'et vous pouvez'],
];
const anchors = [[0, 0]];
for (const [st, pre, wi = 0] of SYNC) {
  const c = TXT.findIndex(x => x.startsWith(pre));
  if (c < 0) throw new Error('synchro introuvable : ' + pre);
  const w = shown.filter(s => s.c === c)[wi];
  anchors.push([r2(w.t - 0.05), st]);
}
chunks.forEach(k => { k.zone = 'auto'; });
const rows = chunks.map(k => [r2(k.t0 * SPEED), r2(Math.min(k.last + 0.3, k.te) * SPEED), k.txt, k.zone, r2(k.te * SPEED), k.wt.map(t => r2(t * SPEED))]);
fs.writeFileSync(path.join(__dirname, 'voix_subs.js'),
  '// Généré par aligne_voix.js : sous-titres calés sur la voix enregistrée.\n'
  + '// [début, fin de parole, texte, zone, fin d’affichage, instants des mots] en temps script (vidéo × SPEED).\n'
  + 'window.VOICE_SUBS = [\n' + rows.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n];\n'
  + '// [temps vidéo, temps script] : points de synchro de l’animation sur la voix.\n'
  + 'window.VOICE_ANCHORS = ' + JSON.stringify(anchors) + ';\n');
for (const k of chunks) console.log(`${k.t0.toFixed(2).padStart(7)} → ${k.te.toFixed(2).padStart(7)}  ${k.guess ? '~' : ' '} ${k.txt.replace(/\*/g, '')}  [${k.wt.map(t => t.toFixed(2)).join(' ')}]`);
