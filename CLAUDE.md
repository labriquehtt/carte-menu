# CLAUDE.md

> Mis à jour le : 2026-09-29

Ce dépôt ne contient plus que **la planche du robot détective** (`planche/`, voir `README.md`),
à la demande de l'utilisateur. Ne jamais redessiner le robot : réutiliser les pièces de
`planche/robot_defs.svg`. Source : projet Claude Design « Robot détective — fiche personnage »
https://claude.ai/artifact/Q9zcvFR359NL11zV4FWsZe.

## Anciens projets (retirés du dépôt, récupérables dans l'historique)

Le reel « LA SOURCE » (`reel-la-source/`), la bande-annonce « PARANO-IA » (`parano-ia/`) et les
cartes du restaurant LE NATIONAL (racine) ont été supprimés le 2026-09-27. Leur dernier état est
dans le commit **`b439b9a`** :

```bash
git checkout b439b9a -- reel-la-source parano-ia    # restaurer le code des vidéos
git show b439b9a:CLAUDE.md                          # notes complètes (chaîne de rendu, voix, son)
```

Version précédente de LA SOURCE : voix « Sébas - French Storyteller » (voice_id
`5jCmrHdxbpU36l1wb3Ke`), outro avec la vraie voix de l'utilisateur ; livraison
`out/LA-SOURCE-reel-voix-Sebas.mp4`.

## LA SOURCE, voix « Hugo » (2026-09-28, `reel-la-source/` restauré depuis `b439b9a`)

- **Voix : « Hugo - Warm and Grounded »** (voice_id `IbbR6Av0dWuQJS0b8JVT`), `eleven_v3`, une seule
  prise qui couvre **toute la vidéo, outro comprise** (plus aucun passage avec la voix de
  l'utilisateur). Texte balisé : `voix_hugo_prompt.txt` (2 054 crédits) ; flow
  https://elevenlabs.io/app/flows/OUSnYMjFrp2ddSl9H5A2 ; prise dans `media/voix_ia/prise_hugo.mp3`.
- **Hugo mène le rythme** (demande de l'utilisateur : dynamique, « comme une pub rapide », pas de
  voix adoucie hors du rêve) : `place_voix_ia.py` (mode `hugo` par défaut) découpe la prise en
  morceaux de parole, garde le tempo d'origine, resserre les respirations (`PAUSE_CAP`), et
  n'ajoute un silence que si l'animation dépasserait ×1,3 le storyboard (`MAX_RATE`, sauts
  lisibles). Il s'appuie sur l'alignement de la prise brute (`media/voix_hugo_brut/subs_brut.js`).
- **La durée de la vidéo suit la voix** : `aligne_voix.js` écrit `VOICE_DURATION` dans
  `voix_subs.js`, lu par `reel.js` (puis `sons.js` et les mixages). Actuellement 114,23 s.
- Texte et synchro : `voix_hugo.js`. Musique et bruitages regénérés (mêmes consignes que
  `sons.js` ; musique techno mélodique 118 BPM en la mineur) sur le flow
  https://elevenlabs.io/app/flows/hQRJcLUQs46QuoonCVF3 (nœuds : `media/son_hugo_nodes.json`),
  environ 4 000 crédits.
- **Ouverture « film d'horreur »** (reel.js `PRE`, temps vidéo) : noir, silhouette du robot au loin dans une
  lumière qui vacille, caméra qui tremble et avance (`#stageCam`), cris lointains (HORROR, SHRIEK) coupés net à
  2,75 s quand sa tête-télé s'allume (cathodique, CRT_ON) → plus un bruit, le clip du dessin passe UNE fois en
  entier (3,2 → 8,2 s, son du clip seul). 8,2 s la télé se coupe (trait, point), 8,4 s il bondit hors du cadre par
  la droite. Écran noir : **carton** (`buildTitle`/`renderTitle`, `#L-title`) « ON A DEMANDÉ À UNE IA DE DONNER VIE
  À CE DESSIN… » qui s'écrit mot par mot sur la voix (ces 3 morceaux ne sont plus en sous-titres). Coupe franche
  à 6.6 (temps script, = `videoTimeOf(6.6)`) : dans la nuit, il arrive en bondissant depuis la gauche, puis CLAQUE.
  La voix commence à 9,0 s (`HUGO_START`). Gros plan réaliste et sombre (`buildCloseUp` : volume du métal,
  vis, rayures, lumière de l'écran sur le cadre ; balayage/vitre bombée sur l'image ; `#preVig`, grain `#preGrain`).
  « et regardez bien ce qui se passe » dit d'une traite : reprise `regardez_3.mp3` insérée par `build_hugo_raw()`
  (1,16 s au lieu de 1,84 s, « bien » n'est plus appuyé). 1re phrase accélérée ×1,25 (`INTRO_FAST`), carton écrit
  plus vite. Mots tenus `HOLD` (« vu la vie » : +0,28 s de résonance, ×1,15) : leur fin douce était coupée.
  Les épingles de `voix_hugo.js` (temps vidéo) sont ignorées pour l'alignement de la prise brute (`VOIX_OUT`).
  Tout refaire d'un coup : `bash refaire_video.sh`. Transitions des décors 3D adoucies (fondus 0,9, zoom 1,5→1). La 1re phrase vient d'une reprise plus naturelle (`intro_hugo_1.mp3`,
  précédée de « Alors voilà… » coupé) collée à la prise principale dès « et regardez » : `BRUT=1 python
  place_voix_ia.py` fabrique `prise_hugo_v2.wav` (puis réaligner la prise brute). Vidéo : 121,6 s.
- **Décors 3D** (reel.js, section « DÉCORS 3D », calque plein cadre `#L-env`, transitions `#L-fx`) : fausse 3D
  par projection perspective, caméra en temps réel `RR`. **Couloir de vidéos** (script 59.9–68.55 : « des millions
  de vidéos ») : écrans sur les murs et le plafond avec de petits films animés + le vrai clip du toit ; **tunnel de
  pixels** (92.75–98.45 : « prédire des pixels ») : anneaux de pixels en spirale, caméra qui tourne, le robot plonge
  au centre ; **salle de cinéma** (dès 158.9, outro) : fauteuils, rideaux qui s'ouvrent au CLAQUE de 162.0, le
  monocle du robot projette le site LK Studio sur l'écran (la fenêtre de navigateur `BROWSER` n'apparaît plus).
  Entrées/sorties : coup de zoom, fouet de caméra, flash, lignes de vitesse (`FX.hits`).
- **Musique par décor** : `mix_musique.py` (`DECORS`) coupe le groove et pose `CORRIDOR` (techno « data ») puis
  `ABYSS` (nappe profonde flottante) ; outro `--outro CINEMA`. Bruitages de transition : WARP_IN, DIVE, WARP_OUT,
  PROJECTOR, CURTAIN. Même flow ElevenLabs (≈1 370 crédits). Commande : `python mix_musique.py --src media/music2
  --bpm 118 --outro CINEMA --wav out/musique2.wav`.
- Aperçu en direct : `python -m http.server 8000` dans `reel-la-source/`, puis
  http://localhost:8000/preview.html (joue `out/bande-son-voix.wav` sinon la voix seule).
- Sous Windows : `PYTHONUTF8=1` pour les scripts Python ; modèle de reconnaissance dans
  `../models/sherpa-onnx-streaming-zipformer-fr-2023-04-14` ; `npm install --no-save playwright`.

```bash
cd reel-la-source; export PYTHONUTF8=1
python place_voix_ia.py                                  # voix posée → media/voix_ia/voix.wav
VOIX_DIR=media/voix_ia python transcrire_voix.py --model ../../models/sherpa-onnx-streaming-zipformer-fr-2023-04-14
VOIX_DIR=media/voix_ia python analyse_voix.py && VOIX_DIR=media/voix_ia VOIX_TEXTE=voix_hugo.js node aligne_voix.js
node sons.js && python mix_sons.py && python mix_musique.py --src media/music2 --bpm 118 --wav out/musique2.wav
node render.js --video out/la-source-1080x1920.mp4 --workers 4      # puis encodage 2 passes (voir b439b9a:CLAUDE.md)
VOIX_DIR=media/voix_ia python mix_voix.py --music out/musique2.wav --music-gain -8 --video out/LA-SOURCE-reel-hugo-video.mp4 --out out/LA-SOURCE-reel-voix-Hugo.mp4
```

## EXPONENTIEL (Reel 29 s, 2026-09-29, `exponentiel/`)

- Textes : `SCRIPT.md` (v2 validée : nénuphar → auto-amélioration → alignement ; sources ligne par ligne), `BRIEF.md`
  (ordre de fabrication, découpage v2, bruitages), `PROMPT.md` (direction plan par plan). Chiffre METR vérifié sur les
  données brutes : GPT-2 = 3 s (pas 2 s).
- **Voix : Hugo** (`IbbR6Av0dWuQJS0b8JVT`, eleven_v3), jamais chuchotée ; prise `media/voix_ia/exponentiel_hugo.mp3`
  (flow https://elevenlabs.io/app/flows/my2I2EZxu63yKmSuJ8Hr) → `place_voix.py` (pauses resserrées, ×1,06, -16 LUFS,
  finit à 26,6 s). Puis `transcrire_voix.py … --wav media/voix_ia/voix16k.wav --beam` → `timing.py` (timing.json :
  8 plans calés sur des mots, instants clés) → `synchro.py` (bouche.json, subs.json).
- **Décors Blender 5.1** (`blender/`, sans interface) : `etang.py` (P1, P2, P7), `piste.py` (P3 à P6), outils `commun.py`,
  modèles `nature.py` (sapins, barque, rochers, massettes, fleurs, sol, ciel), matières réalistes procédurales
  `matieres.py` (eau, feuilles, bois, métal, nuages volumétriques, ciel en dégradé, halo). `--quality anim` =
  animatique Workbench 25 % ; `final` = EEVEE 1080×1920 (~4 s/image). Chaque plan : `out/plates/Pxx/{bg,fg}` +
  `anchor.json` (position écran du robot et des textes 2D). Pièges Blender 5 : fcurves dans les channelbags
  (`C.fcurves`), `transform_apply(location=False…)`, pas de brume « monde » (elle noircit tout : nappe locale
  `fog_box`), Workbench ignore le holdout.
- **Compositing** : `index.html` + `compo.js` (rig officiel de `../parano-ia/core.js`, étalonnage clair de lune,
  grain) rendus par `render.js` (Playwright). Son : `sons.py` (5 bruitages ElevenLabs dans `media/sfx_expo`,
  sons de LA SOURCE, synthèse des pops/glisse/tic-tac ; GROOVE 118 BPM). Tout : `bash rendu_decors.sh && bash montage.sh`
  → `out/EXPONENTIEL-reel.mp4`.
- Crédits ElevenLabs : 526 (prise Sébas refusée) + 580 (Hugo) + 83 (5 bruitages) = **1 189**.

## Règles

- `media/` et `out/` ne vont jamais dans Git (dépôt public : dessins de Philippe Delord, photo de
  Yann LeCun, voix de l'utilisateur). Dans une nouvelle session, redemander les fichiers.
- Emblèmes des IA : évocations seulement, jamais les logos exacts.
- ElevenLabs : estimer avant de générer (`estimate_only`), ne pas gaspiller les crédits. Le
  connecteur est lié à un seul compte ; s'il manque de crédits, l'utilisateur le reconnecte sur
  https://claude.ai/customize/connectors.
- Style : pas d'emojis qui font « IA ». Slogan du compte PARANO-IA : « L'IA sous enquête ».
