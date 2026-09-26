# CLAUDE.md

> Mis à jour le : 2026-09-26

Ce dépôt sert désormais au **reel Instagram "LA SOURCE"** (motion design du robot détective),
dans `reel-la-source/`. Les fichiers à la racine (cartes du restaurant LE NATIONAL) sont un
ancien projet, à ignorer.

---

## 🎬 Reel "LA SOURCE" — `reel-la-source/`

Vidéo 9:16, 1080×1920, 30 fps, **116 s** (dont l'outro LK Studio / Galerie Delord de 100 à 116 s), sans audio au rendu (voix + musique enregistrées dans
CapCut, bruitages ElevenLabs, mixés ensuite). Sous-titres à l'image **calés sur la voix réelle**
(voir « Voix enregistrée » plus bas) ; `SUB_RAW` reste le texte du script (téléprompteur).
La timeline est écrite dans les timecodes du brief (159 s de "temps script") et lue ×1,59
(`SPEED`) ; temps vidéo = temps script ÷ 1,59. Tout est généré par code : une page SVG animée par keyframes, rendue
image par image dans Chromium puis encodée en H.264.

- `brief.md` : **le brief complet** (timeline, sous-titres, gestes, règles). Source de vérité.
- `index.html` : la scène 1080×1920 + les pièces officielles du robot (copiées à l'identique
  de la fiche personnage Claude Design) + les filtres (effet pixel ; l'effet dessin sur le robot
  est retiré à la demande : `DRAWS = []` dans reel.js).
- `reel.js` : moteur (pistes de keyframes, easings POP/SOFT/ANTICIPATION/CHUTE, hit-stops,
  follow-through) + rig du robot + gestes CLAQUE / TIRE / ÉCRASE + toute la timeline
  (`buildTimeline`) + décor de nuit (`buildDecor`) + sous-titres (`SUB_RAW`, qui animent
  aussi la bouche du robot).
- `render.js` : rendu (Playwright + ffmpeg de `imageio-ffmpeg`).
- `assets/` : polices (Fredoka, Space Grotesk, IBM Plex Mono) et pins du chapeau.
- `prepare_media.py` : prépare `media/` (clips en images à 30 fps, photos recadrées,
  `media/manifest.js`). **`media/` n'est pas dans Git** (dépôt public, droits d'auteur) :
  dans une nouvelle session, redemander les fichiers à l'utilisateur, puis
  `python3 prepare_media.py --roof toit.mp4 --site site.mp4 --lecun lecun.webp`.
  Sans médias, la vidéo retombe sur les cadres vides et l'écran magenta.

### Médias intégrés

- `roof` (clip IA du dessin qui "coule", 3:2) : écran de la tête en gros plan (0–4,15 s) et
  cadre vidéo (scènes 1, 3, 6 ; repart du début à chaque apparition puis boucle avec fondu).
  Sa 1re image = le dessin original de Philippe Delord → cadre de la scène 2 (ajusté 3:2).
  Zoom sur l'écoulement du toit (`roofZoom`) pendant « couler du toit » (scènes 3 et 6).
- `lecun` : photo de Yann LeCun → cadre de la scène 5 (ajusté 4:5, photo entière).
- Les cadres photo épousent le format de leur image (pas de fond noir ni de marge polaroid).
- `site` (scroll de l-k-studio.com/gallery_delord.html, 16:9, 23,4 s) : fenêtre navigateur
  de l'outro, lue ×1,66 (`SITE_RATE`) pour tenir dans les 14 s.
- `renderFrame` est asynchrone : il attend le chargement des images des clips.

### Zone de sécurité (Reels / TikTok / Shorts)

Toute l'action est dessinée en coordonnées "scène" 1080×1920 puis réduite à 80 % et
centrée (`SAFE` dans reel.js, groupe `#safe` dans index.html) ; le décor reste plein cadre.
Écran réel visible : ~9 % rognés de chaque côté (téléphones allongés), ~220 px en haut,
~420 px en bas, colonne de boutons à droite (x > 950, y 1050–1500). Les éléments qui
arrivent "depuis le bord" utilisent `SCENE_LEFT/RIGHT/TOP/BOTTOM` (bords réels de l'écran
en coordonnées scène).

### Script voix

`node teleprompteur.js` écrit `SCRIPT-teleprompteur.txt` depuis `SUB_RAW` : texte continu, sans
titres ni repères ; une ligne vide = une respiration, deux = un vrai silence (listes `BREATH` et
`SILENCE`, en temps script). Le régénérer après toute modification du texte.

### Son

`node sons.js` régénère `SONS-elevenlabs.txt` (banque de bruitages ElevenLabs + placement
exact en temps vidéo, hit-stops compris, via `window.videoTimeOf`), `MUSIQUE-suno.txt`
(brief musique Suno calé sur les temps forts et le silence) et `sons_cues.json`.
À relancer après toute modification de la timeline.

Bruitages : les 30 sons (`SOUNDS` de sons.js ; retirés à la demande : ambiance de fond, néon sur
« LA SOURCE », glitch 8-bit du passage en pixels et son retour, ding du carton l-k-studio.com et
sifflet du coup de chapeau) ont été générés via le connecteur ElevenLabs (modèle
`eleven_text_to_sound_v2`, flow "LA SOURCE — bruitages"
https://elevenlabs.io/app/flows/LxzHYbIplS9K9SBhNABw) et rangés dans `media/sfx/<ID>.mp3`
(hors Git). `python3 mix_sons.py` les pose aux repères de `sons_cues.json` → `out/bruitages.wav`
(116 s, niveaux dans `MIX`, DRIP en boucle ; les bruits de feutre PENCIL sont retirés). Le gros plan d'ouverture garde le son
d'origine du clip `roof` (`media/roof.wav`, extrait par prepare_media.py), coupé quand l'écran
s'éteint. `--video … --out …` ajoute la piste à une vidéo (AAC 96k, pour rester sous 30 Mo).

Musique : 4 morceaux `eleven_music_v2` (même flow, D mineur, 92 BPM) dans
`media/music/{GROOVE,SUSPENS,REVE,OUTRO}.mp3` (2 prises par morceau sur le flow, `_a` utilisées).
`python3 mix_musique.py` les monte aux repères `music` de sons_cues.json → `out/musique.wav` :
groove du dézoom à « La Source. » (étiré de ~3 % pour tenir, arrêt net ; bégaiement 8-bit sur le
glitch seulement avec `--stutter`, jugé désagréable), suspens avec ralenti de bande, silence, rêve, outro dont l'accord final est détecté
et posé sur le coup de chapeau. Rien sous le gros plan d'ouverture. `--sfx out/bruitages.wav
--video … --out …` écrit aussi `out/bande-son.wav` et la vidéo complète. Voix : au montage
(CapCut), en baissant la musique sous la voix. `MUSIQUE-suno.txt` reste une alternative Suno.
**Livraison actuelle : vidéo recalée sur la voix de l'utilisateur (rythme, sous-titres, bouche),
avec sa voix + bruitages + nouvelle musique de fond « deep tech »** : 4 morceaux eleven_music_v2
(techno mélodique profonde, IA/tech, 118 BPM, la mineur ; drone suspendu ; rêve éthéré ; outro)
dans `media/music2/` (prises A ; le jazz de `media/music/` jugé « trop tuto YouTube »), montés par
`mix_musique.py --src media/music2 --bpm 118 --wav out/musique2.wav` (groove étiré ~6 %, sans bégaiement 8-bit, breakdown
naturel autour de « prédire des pixels », drop sur « il a quitté Meta », outro qui démarre sur « Les
dessins de Philippe Delord » pour que l'accord final tombe sur le coup de chapeau), puis
`mix_voix.py --music out/musique2.wav --music-gain -8` : **musique très basse** (~18-23 dB sous la
voix, effacée quand elle parle).

### Voix enregistrée → sous-titres, synchro labiale et rythme calés sur la voix

L'utilisateur enregistre sa voix sur la vidéo dans CapCut mobile et envoie l'export (même durée,
calé à 0:00) — idéalement sans musique ; sinon `separe_voix.py` (Spleeter 2 stems de sherpa-onnx,
appliqué seulement là où il y a de la musique ; le modèle UVR, lui, perd la voix par endroits). `media/voix/` (hors Git) : `capcut.mov`, `voix.wav`
(ou `voix_seule.wav`, prioritaire), `voix16k.wav`, `asr.json`, `onsets.json`.
1. `transcrire_voix.py` : reconnaissance française sherpa-onnx (zipformer fr, releases GitHub —
   Hugging Face est bloqué) → mots + instants ; `--beam --from/--to` pour un passage douteux ;
   `--whisper` (Whisper turbo) pour le texte fidèle. **Écrire ce qui est dit**, pas le script.
2. `analyse_voix.py` : `voix_bouche.js` (forme de bouche par image, pendant les mots, d'après
   l'énergie et la brillance de la voix) + `onsets.json` (attaques des syllabes).
3. `aligne_voix.js` : `VOIX` (texte dit, *mots-clés*, morceaux courts, `[texte, {rang: instant}]`
   pour fixer un mot mal entendu) aligné lettre par lettre, chaque mot recalé sur son attaque ;
   `SYNC` = [temps script d'une ligne de SUB_RAW, début du passage dit correspondant]. Écrit
   `voix_subs.js` : `VOICE_SUBS` (zones 'auto') et `VOICE_ANCHORS`.
4. reel.js : `buildVoiceMap` fait du temps vidéo → temps script une fonction par morceaux
   (`scriptAt` / `videoAt`) : entre deux points l'animation accélère ou ralentit ; si la voix fait
   une pause, l'animation **attend** au dernier instant calme du passage (aucune piste en
   mouvement de moins de 4 s, hors hit-stops, néon, bulle, effets). Robot (idle, clignements,
   bouche), décor et clips vivent en temps réel `RR` (= vidéo, figé pendant les hit-stops) : ils
   continuent pendant les attentes. `node sons.js` + `mix_sons.py` recalent les bruitages.
5. `mix_voix.py` : voix à -16 LUFS + bruitages (clip d'ouverture compris) 8 dB plus bas et qui
   s'effacent quand la voix parle (sidechaincompress) → ~20 dB sous la voix ; ajoutés à la vidéo
   encodée. Voix prise dans `voix_capcut_propre.wav` (export CapCut refait sans musique, calé à
   0 ms près sur le premier), sinon `voix_seule.wav`, sinon `voix.wav`.

### Carte « World model »

`buildWMCard` / `renderWMCard` (reel.js, temps vidéo) : explication grand public qui apparaît au
centre quand la voix dit « world » (IA vidéo : imite des pixels / World model : apprend à
comprendre le monde / gravité · matière · cause → effet), se range sous la photo de LeCun (entre
la photo, le globe et le robot) et s'efface 0,35 s avant l'ÉCRASE de 121.5.

### Miniature (couverture du reel)

`node miniature.js [--word "MOT"]` → `out/miniature-<mot>.png/.jpg` (1080×1920) : décor de nuit,
dessin de Delord dont le toit coule (image 150 du clip `roof`) dans un cadre vert penché, le mot
en grand au milieu qui coule lui aussi (gouttes seulement sous des jambages, jamais sous C/A/O
pour ne pas lire Ç/Ą), et le robot officiel en pose « examine un indice » (temps script 31.5,
`--pose`). Mot choisi : HALLUCINATION. Tout tient dans le recadrage 3:4 de la grille Instagram
(y 240 → 1680). reel.js expose `window.REEL_KIT` (RB, mk, g…) pour ce script.

Vidéo suivante (sujet : l'exponentialité de l'IA) : `node miniature.js --theme expo --word
EXPONENTIALITÉ --face surpris` (variante `--word EXPONENTIEL`). Même décor et même vert, sans le
dessin : un graphique néon où la courbe double à chaque pas (×2 … ×64, face à une droite
« linéaire » en pointillés) et crève le haut du cadre ; les lettres du mot grandissent
exponentiellement sur une ligne qui monte. `--face` impose une expression (œil droit agrandi).
`window.renderScript(ts)` passe par la carte de la voix (`videoAt`), sinon la pose tombe à côté.

### Commandes

```bash
pip install imageio-ffmpeg pillow numpy  # ffmpeg avec libx264 + mixage (une seule fois)
cd reel-la-source
node render.js --stills 5,14,22.2 --script --out out/stills --debug   # images de contrôle (timecodes du brief)
node render.js --video out/la-source-1080x1920.mp4 --workers 4   # vidéo complète (~quelques min)
node sons.js && python3 mix_sons.py --video out/la-source-1080x1920.mp4 --out out/la-source-bruitages.mp4   # piste bruitages
python3 mix_musique.py --sfx out/bruitages.wav --video out/la-source-1080x1920.mp4 --out out/la-source-son.mp4   # musique + bruitages
node miniature.js --word HALLUCINATION   # miniature du reel
node aligne_voix.js && python3 mix_voix.py --video out/LA-SOURCE-reel-final-v5.mp4 --out out/LA-SOURCE-reel-voix.mp4   # voix + sous-titres
node miniature.js --theme expo --word EXPONENTIALITÉ --face surpris   # miniature de la vidéo suivante
```

Chaîne exacte de la **livraison finale** (`out/LA-SOURCE-reel-final.mp4`, 116 s, ~28 Mo) :

```bash
python3 analyse_voix.py && node aligne_voix.js                          # seulement si la voix change
node render.js --video out/la-source-1080x1920.mp4 --workers 4          # ~16 min
FF=$(python3 -c 'import imageio_ffmpeg as i; print(i.get_ffmpeg_exe())'); cd out
X="-c:v libx264 -preset medium -b:v 1850k -maxrate 3500k -bufsize 7000k -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709"
$FF -y -i la-source-1080x1920.mp4 $X -pass 1 -an -f mp4 /dev/null && \
$FF -y -i la-source-1080x1920.mp4 $X -pass 2 -an -movflags +faststart LA-SOURCE-reel-final-v6.mp4; cd ..
node sons.js && python3 mix_sons.py                                    # → out/bruitages.wav
python3 mix_musique.py --src media/music2 --bpm 118 --wav out/musique2.wav
python3 mix_voix.py --music out/musique2.wav --music-gain -8 --video out/LA-SOURCE-reel-final-v6.mp4 --out out/LA-SOURCE-reel-final.mp4
```

`render.js --video` peut s'arrêter sur « Target page … has been closed » (mémoire) : relancer.

### État au 2026-09-26 (fin de session)

- **Reel LA SOURCE : terminé et livré** (`out/LA-SOURCE-reel-final.mp4`) : voix de l'utilisateur,
  sous-titres, bouche et rythme calés sur la voix, bruitages bas, musique « deep tech » très basse,
  carte « World model ». Miniature : `out/miniature-hallucination.png`.
- **Vidéo suivante** (l'exponentialité de l'IA, « ce n'est pas juste du ×2 ») : miniatures livrées
  `out/miniature-exponentialite.png` (principale) et `out/miniature-exponentiel.png` (variante,
  conseillée : plus courte, plus lisible). Rien d'autre n'est commencé pour cette vidéo.
- `out/` et `media/` sont hors Git : dans une nouvelle session, redemander les fichiers.

### Robot détective (source)

Projet Claude Design "Robot détective — fiche personnage" :
https://claude.ai/artifact/Q9zcvFR359NL11zV4FWsZe (planches Main, Expressions, ModeEcran).
Ne jamais redessiner le robot : réutiliser les `<g id="rb-…">` de `index.html`.

### Règles importantes

- Écran du mode écran (0–6.6 s script = 0–4,15 s vidéo) : exactement x 60, y 440, 960×640,
  rayon 143 — rien par-dessus, tête immobile. Il affiche le clip `roof` ; sans médias, magenta
  `#FF00FF` pur pour une incrustation au montage.
- Expressions autorisées seulement : neutre, curieux, perplexe, surpris, reflechit, sceptique,
  incertain, satisfait, endormi (+ `eveil` = endormi avec un œil ouvert, scène 7).
- Le robot ne recouvre jamais l'intérieur d'un cadre affiché ; les cadres n'entrent/sortent
  que par CLAQUE, TIRE ou ÉCRASE.
- Les hit-stops sont donnés en secondes réelles (`hitstop(t, d)` convertit).
- Décor sans violet ni rose (au cas où l'on revienne à l'incrustation du magenta).
- Tout l'aléatoire vient de graines fixes : le rendu est reproductible image par image.
- `renderFrame(i)` ne dépend d'aucun état précédent → rendu parallèle par segments.

### Écarts assumés par rapport au brief

- ÉCRASE suivi d'un CLAQUE 0.6 s plus tard (21.3 → 21.9, 121.5 → 122.1) : version resserrée
  (`fast`), sinon le robot serait encore sur le nouveau cadre à la vérification de 22.2.
- TIRE de la scène 2 : le coin du polaroid apparaît à 11.2, mais la traction se fait à 11.9
  (le robot atterrit de l'ÉCRASE à 11.7).
- TIRE "depuis le haut" (scène 5) : le robot saute, s'accroche au coin avec un bras étiré et
  descend avec le polaroid.
- Cadres qui tombent : au moins +1500 px, davantage si nécessaire pour vraiment sortir.
