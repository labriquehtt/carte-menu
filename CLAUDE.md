# CLAUDE.md

> Mis à jour le : 2026-10-02

Ce dépôt (public) contient **la planche du robot détective** (`planche/`, voir `README.md`) et **le code des
vidéos du compte PARANO-IA** (« L'IA sous enquête ») : `reel-la-source/`, `parano-ia/`, `exponentiel/`, `abysse/`
(et, en local seulement pour l'instant, `alignement/` et `evasion/`). Jamais de médias ni de rendus ici (voir
§ Règles) : **les vidéos finies vont dans le dépôt privé `labriquehtt/IA-sous-enquete-`** (dossier `videos/`,
le dossier parent `sousenquete/` en local), avec son README. Ne jamais redessiner le robot : réutiliser les
pièces de `planche/robot_defs.svg`. Source : projet Claude Design « Robot détective — fiche personnage »
https://claude.ai/artifact/Q9zcvFR359NL11zV4FWsZe.

## Fiche des 15 techniques d'animation (`exponentiel/FICHE-TECHNIQUES.pdf`)

`FICHE-TECHNIQUES.pdf` / `.md` (générés par `exponentiel/build_fiche.py`, à relancer après toute modification du
contenu ; une copie du PDF est aussi à la racine, hors Git) : 15 techniques d'animation par prompt (on twos, stop
motion, line boil, papier, feutrine, pâte à modeler, comics, grain, 12 principes, impacts, robot-feuille, caméra,
typo cinétique, Blender toon, Three.js), un prompt à copier par technique, sources numérotées. À piocher pour changer
de décor ; max. deux techniques de style par plan ; effets de trait sur le robot seulement sur demande.
Vidéos courtes : l'utilisateur veut des Reels et des bandes-annonces de **30 s maximum**.

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

- Préparé d'abord dans une session web (premiers SCRIPT/BRIEF/PROMPT, voix Sébas), puis fabriqué ici ; les brouillons
  web restent dans l'historique (commits `278e76a`, `e251b2a`). **Pas de Yann LeCun** pour parler d'exponentialité
  (l'utilisateur juge qu'il n'est pas le mieux placé).
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
- **v2 (44 s, `out/EXPONENTIEL-reel-v2.mp4`)** sans nouveau rendu Blender : `motion.js` (typo animée « C'EST / L'AUTO /
  AMÉLIORATION » avec la musique coupée, sortie du robot hors du décor 3D, séquence « alignement » dans une arène néon
  en motion design, décor du carton final). « Alors l'IA… on est à quel jour ? » retiré ; voix alignement
  `media/voix_ia/alignement_hugo.mp3` collée par `place_voix2.py` (lancer place_voix2 après place_voix).
  Rendu par tranches : `node render.js --plates plates --video out/tranches/v.mp4 --workers 2 --sub 4 --range a:b`
  (12 Go de RAM : jamais plus de 2 navigateurs), puis concaténation et encodage 2 passes.
- Crédits ElevenLabs : 526 (prise Sébas refusée) + 580 (Hugo) + 83 (5 bruitages) + 405 (alignement) = **1 594**.

## ALIGNEMENT (Reel ~69,5 s, 2026-09-29, `alignement/`)

- Textes : `SCRIPT.md` (v2 validée, sources vérifiées sur les originaux : Anthropic « Agentic Misalignment », « Teaching Claude
  why », System Card Mythos ; OpenAI × Apollo arXiv 2509.15541), `BRIEF.md` (découpage, zone de recadrage Insta).
- **Voix : Hugo**, prise `media/voix_ia/alignement_hugo_v2.mp3` (flow https://elevenlabs.io/app/flows/8vs8a7CCyHpndIKksjZm,
  1 089 + 1 445 crédits) → `place_voix.py` (68,5 s). « Toutes les sources sont en description » gardé (choix de l'utilisateur).
  `timing.py` → `timing.json` (11 plans), `synchro.py` → `bouche.json`, `subs.json`.
- **Tout en 2D HTML, thème clair** (l'utilisateur a refusé la 3D Blender) : `monde.js` (ville en papier découpé, parallaxe,
  train, voitures, passants, avion à banderole, éoliennes), `decors.js` (bureaux papier, place et salle d'examen en comics,
  plateau en carton stop motion, carrefour et parc en feutrine, tableau du détective), `compo.js` (robot « on twos », sous-titres,
  cartons de sources SANS le mot « SOURCE »), `plans.js` (caméras, sauts, objets, transitions). Techniques piochées dans
  `../FICHE-TECHNIQUES.pdf`.
- Son : `sons.py` (banques de LA SOURCE et d'EXPONENTIEL, GROOVE étouffée dans feutre/carton) → `out/bande-son.wav`.
- Aperçu : `node render.js --video out/preview/apercu-video.mp4 --workers 2 --scale 0.5` (~18 min) puis mux avec
  `out/bande-son.wav` → `out/ALIGNEMENT-apercu.mp4`. Final : `node render.js --video out/final/ALIGNEMENT-video.mp4 --workers 2`,
  encodage 2 passes 7 Mb/s avec `out/bande-son.wav` → `out/ALIGNEMENT-reel.mp4`.
- Profondeur : les premiers plans des décors (arbres, haie, buissons, plante) sont dans `#sceneFront`, au-dessus du robot ;
  dans la rue, le robot se tient sur le trottoir de DEVANT (y 1548) pour que les voitures passent derrière lui.
- Miniature : `node miniature.js` → `out/miniature-alignement.png/.jpg` (même système que LA SOURCE / EXPONENTIEL ;
  le G du mot est désaligné).

## ÉVASION (Reel ~1 min 52, 2026-10-01, `evasion/`) — en cours

- Sujet : évasion d'un agent OpenAI par le DNS le 20 sept. 2026 (« capitale de la France ? » → « Paris »), arrêt automatique
  en panne, 2e pause d'OpenAI ; flashback Hugging Face (juillet 2026, 1 200 agents sur un forum secret, 700 à l'attaque) ;
  dizaines de milliers d'incidents (Axios), enquête FTC du 30 sept. Suite directe d'ALIGNEMENT.
- Textes : `SCRIPT.md` (v1, sous-titres + vérification ligne par ligne sur les sources primaires : rapport OpenAI
  alignment.openai.com/misalignment-reports, METR, CSA/The Register) et `voix_prompt.txt`. Garde-fous en bas de `SCRIPT.md`
  (modèle de l'évasion jamais nommé, 700 ≠ 1 200, rachat Nvidia seulement annoncé).
- **Voix : Hugo**, prise `media/voix_ia/evasion_hugo.mp3` (134,7 s brute, 2 323 crédits, flow
  https://elevenlabs.io/app/flows/5lAd2ipNQC2p3wC96UYW) → `place_voix.py` → `EVASION-voix.mp3`. v1 : ×1,06, 111,7 s
  (`EVASION-voix-v1.mp3`). **v2** (demande : « un tout petit peu plus dynamique » + « pauses intelligentes » entre les
  thèmes) : même prise, sans regénérer, ×1,09, virgules à 0,20 s, et `PAUSES` = durée FINALE par pause (allongée par du
  silence si la prise est plus courte) : thème ≈ 0,8 s, suspense ≈ 0,5 s, 1 s après « dehors », 0,7 s avant « Paris » →
  119,9 s (`EVASION-voix-v2.mp3`). **v3** (123,5 s) : 1) la prise a un souffle de fond (≈ -50 dBFS, grave) et le
  silence numérique ajouté « faisait bug » → pauses allongées avec le souffle de la prise (`RoomTone`), coupes en fondu
  à puissance constante de 25 ms, aucune trame sous -70 dBFS (contrôlé) ; 2) 1re phrase « trop IA » (« encore »
  chuchoté) → reprises `intro_1..4.mp3` (660 crédits, [excited] seul), début d'`intro_4` (117 Hz comme les phrases 2-3)
  + « encore ! » d'`intro_1` (voisé), niveaux calés sur les phrases 2-3 (`build_raw`). **Piège** : ne jamais insérer de
  silence numérique dans une voix ElevenLabs, toujours du souffle de la prise. v3 refusée (pause entre « s'échappe » et
  « encore ») → **v4** (122,7 s) : 1re phrase d'un trait, reprise `direct_4.mp3` (texte sans « … », ≈ 500 crédits).
  Leçon : pas de « … » dans le texte quand on veut un enchaînement rapide. v4 refusée (« voix de bande-annonce »,
  respirations) → **v5** (105,4 s) : nouvelle prise complète `evasion_hugo_naturel.mp3` (2 150 crédits), texte SANS
  balise d'émotion, points au lieu de « ! » ; `place_voix.py` remplace chaque trou (respirations comprises) par du
  souffle, 3 durées (0,40 / 0,26 / 0,14 s), ×1,08. **Ton voulu sur le compte : présentateur d'actu IA, naturel, rapide,
  informatif — pas de dramatisation.** v5 jugée pas assez vive → **v6** (102 s) : prise `evasion_hugo_vif.mp3`
  (2 160 crédits, même texte + une seule balise [excited] au début), ×1,10. v6 refusée (« on l'entend couper ses
  respirations », trop rapide) → **v7** (129,3 s) : même prise, ×1,0, respirations GARDÉES, seuls les silences > 0,45 s
  raccourcis. **Leçon : ne pas accélérer ni retirer les respirations — ça sonne coupé.** v7 jugée « parfaite » ;
  demande « plus dynamique et solaire, avec le sourire » → **v8** (125,8 s) : même prise, rubberband ×1,03,
  +0,4 demi-ton formants déplacés, EQ plus brillante. Transcription : `python ../reel-la-source/transcrire_voix.py --model ../../models/sherpa-onnx-streaming-zipformer-fr-2023-04-14 --wav media/voix_ia/voix16k.wav --beam`.
- Animation (après validation de la voix) : 2D HTML comme ALIGNEMENT, décors liés à l'histoire, logos dessinés
  (OpenAI, Hugging Face, Anthropic, Nvidia), robot très mobile, techniques de `FICHE-TECHNIQUES.pdf`.

## ABYSSE — bande-annonce du compte (v1 27,4 s → v2 29,0 s, 2026-10-01/02, `abysse/`)

- Demande : BA dans la DA de la réf. Twitter « SHIPPER » (noir, typo en points, vagues de particules, plans 3D sombres),
  « encore plus dynamique », **30 s max**, 3D Blender autorisée (« plans sombres… magnifique éclairage… la caméra descend
  en tournant »), plans calés sur la musique, musique étouffée quand on plonge, interactions du décor qui jouent la
  musique (comme la BA de Suno), **références cachées** (Suno, ElevenLabs, LLM, open source), extraits des vidéos du
  compte dans des cases, robot seulement à la fin. Concept « Sous la surface » : `BRIEF.md`, `STORYBOARD.md`.
- **Une seule source de minutage : `partition.py` → `partition.json`** (+ `assets/data/partition.js`). Musique
  ElevenLabs Music v2.5 (flow https://elevenlabs.io/app/flows/s6Hoe9X2mpRIVKi0MrJR, 2 variantes 30 s ≈ 900 crédits ;
  on garde **B**, 150 BPM, ré mineur harmonique : intro sans basse, montée à 11,2 s, drop à 12,8 s), montée mesure
  par mesure (`MUSIQUE`) : surface = B 0–6,4 s ; le drop est d'abord entendu **étouffé sous l'eau** (8,0 s), puis
  revient à travers la coque et **en clair** quand le sas s'ouvre (19,2 s). 17 bruitages ElevenLabs (≈ 200 crédits).
- 3D : Blender 5.1 sans interface. `blender/abysse.py` (trou bleu, eau en volume, fenêtre de Snell, rayons, neige
  marine, caméra-fouet sur les temps forts, sonar en ondes vertes sur la roche) + `objets_abysse.py` (bouée-câlin
  Hugging Face et sa cloche, baleine DeepSeek, voilier Midjourney + étoiles Gemini, piano « SUNO » dont les touches
  jouent la mélodie de B, colonnes « II » ElevenLabs, étincelle Claude, station : LED Mistral, câble ∞ Meta, sas à
  fleur OpenAI) ; `blender/bureau.py` (pièce sombre de la réf., écran vertical, `ecran.json` = coins de l'écran).
  `--quality anim|test|final`, `--spatial` exporte les angles des objets pour le son. **Piège EEVEE : la résolution
  des ombres d'un soleil sur 120 m faisait 150 s/image → `shadow_maximum_resolution = 0.02` (fait dans
  `outils.light`), 13 s/image en final.** Rendu par blocs (la mémoire saturait) : `bash rendu_final.sh` (reprend où il
  s'est arrêté).
- Son : `son/mixage.py` (montage de B avec états clair / sous_eau / coque, nappes et battement sous l'eau, chaque objet
  joue sa note à son image, spatialisé d'après `out/plates/spatial.json`, 808 sous l'intro) → `son/normaliser.py`
  (−14 LUFS, −1 dBTP) → `assets/son/bande-son.wav`. `son/analyse_musique.py`, `evenements.py`, `spectro.py`,
  `hauteur.py` pour « voir » la musique.
- Motion design et assemblage : projet HyperFrames (`index.html` + `motion.js`, une horloge GSAP qui redessine tout
  à chaque image). Extraits des vidéos du compte : `assets/clips/` (cases + `ecran.mp4`, 12 × 0,4 s).
- **v2 (29,0 s, 2026-10-02, `renders/ABYSSE-PARANO-IA-v2.mp4`)**, retours sur la v1 « vraiment parfaite » :
  - Ouverture rythmique 0–9,6 s (une mesure de plus), **plus aucun extrait vidéo** : balle verte qui rebondit sur la
    ligne et joue la mélodie (notes affichées), CHAQUE jaillit de la ligne / SEMAINE, tombe lettre par lettre,
    « DE NOUVELLES / ACTUS » s'étire (élastique), **« SUR L'IA. »** en lettres de caractères (`motCaracteres` :
    incurvées sur un cylindre, relief vert, aplat léger, franges, déchirure + son `crypte`, noms de modèles cachés
    dans les caractères), éclat → 12 logos d'IA **dessinés trait par trait** (style `alignement/logos.js`) qui se
    posent sur la ligne (« LA SURFACE. »), flottent, coulent sur « NOUS, ON PLONGE. », nappe de points, chute.
    Texte : « CHAQUE SEMAINE, DE NOUVELLES ACTUS SUR L'IA. » (pluriel voulu ; plus de noms qui clignotent au milieu).
  - La 3D n'a pas été re-rendue : `partition_3d.json` (v1 gelée, lue par `blender/outils.py`) + `DECALAGE_3D` = 1,6 s.
  - Baleine = **DeepSeek** : au passage (11,6 s, évènement `deepseek`), le sonar la verrouille et révèle le logo en
    matrice de points bleus qui la suit (`assets/data/spatial.js` = angles exportés de Blender), puis il s'égrène.
    Piano = **Suno** : à chaque touche, l'icône Suno (fournie par l'utilisateur, `assets/logos/suno.png`) puis des
    pastilles sombres udio, Stable Audio, AIVA, Mubert, Eleven Music, Riffusion, Soundraw montent du piano.
  - Bureau : **viseur de caméra** (cadre, ● REC qui clignote après deux bips, timecode, 1080p · 30, batterie,
    vumètres L/R lus dans `assets/data/niveaux.js`), plus d'étiquettes ARCHIVES. Nouvelle musique station + bureau :
    `media/musique/bureau_B.mp3` (ElevenLabs Music, flottante et dérangeante, 150 BPM, ≈ 480 crédits).
  - Son : `python partition.py && python son/mixage.py && python son/normaliser.py out/son/bande-son-brute.wav
    assets/son/bande-son.wav`. Rendu : `npx hyperframes@0.8.105 render . -o renders/ABYSSE-PARANO-IA-v2.mp4 --quality
    delivery --video-frame-format png --workers 2`, puis remettre la bande-son exacte (HyperFrames la baisse de 2 dB).

## Règles

- `media/` et `out/` ne vont jamais dans Git (dépôt public : dessins de Philippe Delord, photo de
  Yann LeCun, voix de l'utilisateur). Dans une nouvelle session, redemander les fichiers.
- Emblèmes des IA : par défaut, évocations seulement. Exception demandée par l'utilisateur (2026-09-29, ALIGNEMENT) :
  logos redessinés « en mode dessin » (Claude, Gemini, GPT, Grok, DeepSeek) pour qu'on les reconnaisse (`alignement/logos.js`).
- ElevenLabs : estimer avant de générer (`estimate_only`), ne pas gaspiller les crédits. Le
  connecteur est lié à un seul compte ; s'il manque de crédits, l'utilisateur le reconnecte sur
  https://claude.ai/customize/connectors.
- Style : pas d'emojis qui font « IA ». Slogan du compte PARANO-IA : « L'IA sous enquête ».
