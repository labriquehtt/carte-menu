// Feuilles audio : bruitages ElevenLabs (banque + placement exact) et brief musique Suno.
//   node sons.js   →  SONS-elevenlabs.txt + MUSIQUE-suno.txt + sons_cues.json (lu par mix_sons.py)
// Les repères sont en temps script (timecodes du brief) ; la page les convertit en temps
// vidéo, hit-stops compris.
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

// id, libellé, prompt ElevenLabs (anglais), durée conseillée (s)
const SOUNDS = [
  ['TV_OFF', 'Extinction vieille télé', 'old CRT television switching off, high pitched electric zip collapsing into a tiny blip', 1],
  ['DEZOOM', 'Dézoom caméra', 'smooth cinematic camera pull back whoosh, airy and soft', 1.2],
  ['BOOT', 'Les yeux du robot se rallument', 'cute small robot powering on, soft electronic startup chirp', 1],
  ['CLINK', 'Loupe qui retombe', 'small brass magnifying glass dropping into place with a light metallic clink and tiny bounce', 1],
  ['SNAP', 'Claquement de doigts', 'crisp cartoon finger snap with a tiny magical sparkle shimmer, dry and close', 0.8],
  ['POP', 'Un cadre apparaît', 'playful cartoon pop with a short bright whoosh, an image popping into view', 0.6],
  ['JUMP', 'Saut', 'quick springy cartoon jump whoosh going up', 0.7],
  ['LAND_BIG', 'Atterrissage lourd sur un cadre', 'punchy cartoon landing thud of a small metal robot on a wooden board, with a clank', 0.8],
  ['FALL', 'Le cadre tombe', 'object falling fast downward, descending cartoon whistle whoosh', 1],
  ['LAND', 'Atterrissage + antenne qui vibre', 'small robot landing thud followed by a springy antenna wobble boing', 1],
  ['HOP', 'Petit saut', 'tiny springy cartoon hop, light boing', 0.5],
  ['PAPER', 'On tire un grand papier', 'large sheet of paper yanked quickly and sliding across a table, swoosh', 1],
  ['STUMBLE', 'Il trébuche', 'cartoon stumble, quick tiptoe steps and a little wobble', 1],
  ['PENCIL', 'Effet dessin (crayon)', 'fast pencil scribbling on paper, continuous', 4],
  ['SWISH', 'Geste rapide', 'quick light swish of a small object raised in the air', 0.5],
  ['ZOOM_IN', 'Zoom sur le toit', 'fast cinematic zoom in whoosh, rising swoosh with a soft impact at the end', 1],
  ['GLINT', 'Reflet de la loupe', 'bright tiny glint ding, light reflecting on a magnifying glass', 0.6],
  ['QUESTION', 'Point d\'interrogation', 'curious cartoon question pop, little rising boing', 0.6],
  ['WOOD', 'Icône bois', 'single wooden plank knock', 0.5],
  ['DROP', 'Icône eau', 'single water drop plop', 0.5],
  ['SMOKE', 'Icône fumée', 'soft puff of smoke', 0.8],
  ['WOBBLE', 'Objet qui gigote', 'rubbery cartoon wobble, jelly boing, an object wiggling unnaturally', 2],
  ['DATA', 'Mosaïque de vidéos', 'digital data whoosh, many video thumbnails flickering by, soft glitch texture', 3],
  ['GLITCH', 'Robot qui se pixelise', '8-bit retro digital glitch, pixelated crunch and bleeps', 2.2],
  ['UNGLITCH', 'Retour à la normale', 'short reverse digital glitch resolving into a clean tone', 0.6],
  ['HOLO', 'Globe filaire qui se dessine', 'sci-fi hologram drawing itself line by line, electric tracing shimmer', 2],
  ['DREAM', 'Bulle de rêve', 'soft magical dream bubble opening, gentle chimes and airy shimmer', 2],
  ['DRIP', 'Gouttes dans le rêve (boucle)', 'slow gentle water drips, soft and dreamy, distant', 6],
  ['FADE', 'Fondu au noir', 'deep cinematic low boom fading into silence', 3],
  ['CHIME', 'Un œil s\'ouvre', 'tiny soft electronic chime, a robot eye slowly opening', 1],
  ['POWER', 'La lumière revient', 'lights turning back on, soft electrical hum rising, city waking up', 1.5],
  ['VR', 'Il enfile le casque VR', 'VR headset clicking on, futuristic whoosh into a virtual world', 1.5],
];

// [temps script, id, note, fin (boucles, temps script)]
const CUES = [
  [6.3, 'TV_OFF', "l'écran de la tête s'éteint"],
  [6.6, 'DEZOOM', 'dézoom vers le plan large'],
  [6.72, 'BOOT', 'les yeux se rallument'],
  [6.95, 'CLINK', 'la loupe retombe devant l\'œil'],
  [7.6, 'SNAP', 'CLAQUE'], [7.65, 'POP', 'le cadre vidéo apparaît'],
  [10.6, 'JUMP', 'ÉCRASE : saut'], [11.0, 'LAND_BIG', 'atterrit sur le cadre (hit-stop)'],
  [11.15, 'FALL', 'le cadre tombe'], [11.7, 'LAND', 'atterrit à droite'],
  [11.35, 'PENCIL', 'effet dessin sur le robot (volume bas)', 19.6],
  [11.9, 'PAPER', 'TIRE : il tire le dessin'], [12.28, 'POP', 'le dessin arrive en place'],
  [12.4, 'STUMBLE', 'il trébuche en arrière'],
  [21.3, 'JUMP', 'ÉCRASE : saut'], [21.62, 'LAND_BIG', 'atterrit sur le dessin'], [21.72, 'FALL', 'le dessin tombe'],
  [21.9, 'SNAP', 'CLAQUE en plein vol'], [21.95, 'POP', 'le cadre vidéo revient'], [22.14, 'LAND', 'atterrit sous le cadre'],
  [26.7, 'SWISH', 'il lève la loupe'],
  [29.9, 'ZOOM_IN', 'zoom sur le toit qui coule'], [30.25, 'GLINT', 'pose "examine un indice"'],
  [34.1, 'DEZOOM', 'on ressort du zoom'], [34.18, 'HOP', 'petit recul surpris'],
  [35.75, 'QUESTION', 'il se gratte la tête, "?"'],
  [40.0, 'SNAP', 'CLAQUE'], [40.05, 'WOOD', 'icône planche'],
  [42.4, 'SNAP', 'CLAQUE'], [42.45, 'DROP', 'icône goutte'],
  [43.8, 'SNAP', 'CLAQUE'], [43.85, 'SMOKE', 'icône fumée'],
  [48.4, 'JUMP', 'ÉCRASE : saut'], [48.8, 'LAND_BIG', 'atterrit sur le cadre'], [48.95, 'FALL', 'le cadre et les icônes tombent'],
  [49.3, 'SNAP', 'CLAQUE en plein vol'], [49.35, 'POP', 'arbre, maison, caillou apparaissent'], [49.5, 'LAND', 'atterrit au centre'],
  [53.3, 'HOP', 'vers l\'arbre'], [54.0, 'WOBBLE', "il touche l'arbre (hit-stop) : l'arbre gigote"],
  [54.7, 'HOP', 'vers la maison'], [55.12, 'HOP', ''], [56.0, 'WOBBLE', 'la maison gigote'],
  [56.6, 'HOP', 'retour au centre'],
  [60.0, 'DATA', 'la mosaïque de vidéos défile'],
  [71.3, 'HOP', 'vers le caillou'], [72.0, 'WOBBLE', 'le caillou gigote'], [72.8, 'HOP', 'retour au centre'],
  [74.6, 'FALL', 'les objets tombent'],
  [74.45, 'JUMP', 'TIRE depuis le haut : il saute s\'accrocher'], [75.1, 'PAPER', 'il tire la photo vers le bas'],
  [76.02, 'LAND', 'il lâche et atterrit'],
  [93.0, 'GLITCH', 'le robot se pixelise'], [96.4, 'UNGLITCH', 'retour net'],
  [113.4, 'SNAP', 'CLAQUE (assis)'], [113.45, 'HOLO', 'le globe se dessine'],
  [121.5, 'JUMP', 'ÉCRASE : saut'], [121.82, 'LAND_BIG', 'atterrit sur la carte'], [121.92, 'FALL', 'carte, photo et globe tombent'],
  [122.1, 'SNAP', 'CLAQUE en plein vol'], [122.15, 'POP', 'le cadre vidéo revient'], [122.34, 'LAND', 'atterrit sous le cadre'],
  [132.25, 'ZOOM_IN', 'zoom sur le toit'], [135.2, 'DEZOOM', 'on ressort du zoom'],
  [143.5, 'DREAM', 'il s\'endort, la bulle de rêve s\'ouvre'], [144.0, 'DRIP', 'gouttes dans la bulle', 151.3],
  [151.3, 'FADE', 'fondu au noir, "Hallucination"'],
  [152.0, 'CHIME', 'il ouvre un œil'],
  [159.0, 'POWER', 'la lumière revient (outro LK Studio)'], [159.45, 'JUMP', 'il saute à sa place'], [159.95, 'LAND', ''],
  [162.0, 'SNAP', 'CLAQUE'], [162.05, 'POP', 'la fenêtre du site apparaît'],
  [173.2, 'SNAP', 'CLAQUE'], [173.25, 'POP', 'le casque VR apparaît dans sa main'],
  [175.3, 'VR', 'il enfile le casque'],
  [177.4, 'PENCIL', '"entrez dans le dessin" : effet dessin', 180.2],
  [180.35, 'SWISH', 'il retire le casque'],
];

// repères musicaux (temps script) : la musique doit épouser ces moments
const MUSIC = [
  [0.0, 'Intro', 'gros plan sur l\'écran : très discret (on y entend l\'eau et le vent du clip), vibraphone + nappes, sans batterie'],
  [6.6, 'Groove', 'le dézoom : contrebasse walking + balais, enquête espiègle'],
  [49.0, 'Variation', '"donner vie = faire bouger" : plus bondissant, pizzicati'],
  [75.1, 'Thème', 'Yann LeCun : trompette bouchée, plus sérieux et intrigant'],
  [93.0, 'Glitch', '"prédire des pixels" : 2 s de bégaiement 8-bit, puis reprise'],
  [113.4, 'Montée', 'les world models : tension qui monte'],
  [122.1, 'Retour', '"Revenons à ce jardin" : on retrouve le groove, en retenue'],
  [127.0, 'STOP', '"La Source." : arrêt net sur un gros impact, puis presque rien'],
  [138.1, 'Ralenti', 'tout ralentit, la musique s\'étire et s\'éteint'],
  [143.5, 'SILENCE', 'le robot s\'endort : silence complet'],
  [145.5, 'Rêve', '"Alors au fond, qui rêve…" : vibraphone rêveur, très doux'],
  [151.3, 'Noir', '"Hallucination" : fondu au noir, une seule note grave'],
  [159.0, 'Outro', 'fin LK Studio : le groove revient, chaleureux et entraînant'],
  [181.6, 'Fin', 'coup de chapeau : accord final (button)'],
];

const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

(async () => {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForFunction(() => window.REEL_READY === true, null, { timeout: 60000 });
  const times = await page.evaluate(ts => ts.map(t => window.videoTimeOf(t)), CUES.flatMap(c => [c[0], c[3] ?? c[0]]));
  const mtimes = await page.evaluate(ts => ts.map(t => window.videoTimeOf(t)), MUSIC.map(m => m[0]));
  const dur = await page.evaluate(() => window.REEL.DURATION);
  await browser.close();

  const cues = CUES.map((c, i) => ({ t: +times[2 * i].toFixed(2), end: c[3] ? +times[2 * i + 1].toFixed(2) : null, id: c[1], note: c[2] }))
    .sort((a, b) => a.t - b.t);
  const L = [];
  L.push('LA SOURCE — sons à faire sur ElevenLabs (Sound Effects)');
  L.push(`Vidéo : ${fmt(dur)} · les repères sont en temps vidéo (m:ss.d)`);
  L.push('');
  L.push('═══ 1. BANQUE DE SONS — générer chaque son UNE fois, puis le réutiliser ═══');
  L.push('Colle le prompt (en anglais, ElevenLabs le comprend mieux) et règle la durée indiquée.');
  L.push('Nomme chaque fichier avec son ID (ex. SNAP.mp3).');
  L.push('');
  for (const [id, label, prompt, d] of SOUNDS) {
    const n = cues.filter(c => c.id === id).length;
    L.push(`[${id}] ${label} — ${d} s — utilisé ${n}×`);
    L.push(`    ${prompt}`);
  }
  L.push('');
  L.push('═══ 2. PLACEMENT DANS LA VIDÉO ═══');
  for (const c of cues) L.push(`${fmt(c.t).padStart(7)}  ${c.id.padEnd(9)} ${c.note}${c.end ? `  (jusqu'à ${fmt(c.end)})` : ''}`);
  L.push('');
  L.push('Astuce : envoie-moi les sons générés (nommés par ID), je peux les placer automatiquement');
  L.push("à l'image près et te rendre la vidéo avec la piste de bruitages déjà mixée.");
  fs.writeFileSync(path.join(__dirname, 'SONS-elevenlabs.txt'), L.join('\n') + '\n');
  fs.writeFileSync(path.join(__dirname, 'sons_cues.json'), JSON.stringify({ duration: dur, sounds: SOUNDS, cues, music: MUSIC.map((m, i) => ({ t: +mtimes[i].toFixed(2), name: m[1], note: m[2] })) }, null, 1));
  // ---------- brief musique Suno ----------
  const M = [];
  const sec = i => fmt(mtimes[i]);
  M.push('LA SOURCE — musique sur mesure avec Suno');
  M.push(`Vidéo : ${fmt(dur)} · repères en temps vidéo (m:ss.d)`);
  M.push('');
  M.push('═══ RÉGLAGES SUNO (mode Custom, Instrumental activé) ═══');
  M.push('Titre : La Source');
  M.push('Style of Music (à coller tel quel) :');
  M.push('    cinematic noir detective jazz, upright bass, brushed drums, muted trumpet, vibraphone, mysterious and playful, 92 BPM, D minor, instrumental');
  M.push('');
  M.push('Lyrics (seulement des balises de structure, aucune parole) :');
  const tags = {
    Intro: '[Intro: mysterious vibraphone and soft pads, no drums]',
    Groove: '[Verse: walking upright bass and brushed drums enter, playful investigation]',
    Variation: '[Verse 2: bouncy, playful pizzicato accents]',
    'Thème': '[Chorus: muted trumpet melody, serious and intriguing]',
    Glitch: '[Break: short 8-bit glitch stutter]',
    'Montée': '[Build: tension rising]',
    Retour: '[Verse 3: groove returns, restrained]',
    STOP: '[Stop: full stop on a big hit]',
    Ralenti: '[Breakdown: slowing down, fading out]',
    SILENCE: '[Silence]',
    'Rêve': '[Bridge: dreamy vibraphone, very soft, slow]',
    Noir: '[Interlude: single deep low note]',
    Outro: '[Outro: warm groove returns, upbeat]',
    Fin: '[End: final button hit]',
  };
  MUSIC.forEach((m, i) => M.push(`    ${tags[m[1]]}`));
  M.push('');
  M.push('═══ LA MUSIQUE DOIT ÉPOUSER CES MOMENTS ═══');
  MUSIC.forEach((m, i) => M.push(`${sec(i).padStart(7)}  ${m[1].padEnd(10)} ${m[2]}`));
  M.push('');
  M.push('═══ MÉTHODE ═══');
  M.push("Suno respecte la structure mais pas les secondes exactes : c'est normal.");
  M.push('1. Génère plusieurs versions (2 par essai) et garde celle dont l’ambiance colle le mieux.');
  M.push(`2. Dans CapCut, cale le début à 0:00 et fais tomber un gros temps fort pile sur ${sec(MUSIC.findIndex(m => m[1] === 'STOP'))} ("La Source.").`);
  M.push(`3. Coupe en fondu vers ${sec(MUSIC.findIndex(m => m[1] === 'Ralenti'))} et laisse le silence de ${sec(MUSIC.findIndex(m => m[1] === 'SILENCE'))} à ${sec(MUSIC.findIndex(m => m[1] === 'Rêve'))}.`);
  M.push(`4. Place un passage calme de la musique (ou une 2e génération "dreamy vibraphone, slow, soft") de ${sec(MUSIC.findIndex(m => m[1] === 'Rêve'))} à ${sec(MUSIC.findIndex(m => m[1] === 'Outro'))}.`);
  M.push(`5. Relance le groove à ${sec(MUSIC.findIndex(m => m[1] === 'Outro'))} et aligne l'accord final sur ${sec(MUSIC.findIndex(m => m[1] === 'Fin'))} (coup de chapeau).`);
  M.push('6. Baisse la musique d\'environ 12 dB sous la voix (ducking automatique de CapCut).');
  M.push('');
  M.push("Si tu préfères, envoie-moi la musique Suno et les bruitages : je fais les coupes, le");
  M.push("silence et le calage à l'image près, et je te rends la vidéo avec la bande-son mixée.");
  fs.writeFileSync(path.join(__dirname, 'MUSIQUE-suno.txt'), M.join('\n') + '\n');

  console.log(L.join('\n'));
  console.log('\n' + M.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
