# EXPONENTIEL — brief de production (Reel PARANO-IA, 30 s)

> Rédigé le 2026-09-29. À lire avec `SCRIPT.md` (texte et sources) et `PROMPT.md` (direction créative
> plan par plan). Ce brief dit **dans quel ordre fabriquer quoi**, avec quels outils, et quand faire valider.

## Fiche technique

| | |
|---|---|
| Format | 1080×1920 (9:16), 30 i/s, H.264 + AAC, **28 à 30 s**, fichier final de moins de 30 Mo |
| Voix | ElevenLabs « Sébas - French Storyteller », `5jCmrHdxbpU36l1wb3Ke`, `eleven_v3` |
| Personnage | le robot détective officiel, pièces de `planche/robot_defs.svg` : **jamais redessiné** |
| Look | décors en **3D Blender stylisée** (ombrage cartoon, contours) + robot **2D vectoriel** incrusté (principe « Roger Rabbit / Spider-Verse ») |
| Fil rouge visuel | **le fil vert** `#4DFF8F` : la courbe exponentielle est un objet physique qui traverse tous les décors |
| Sortie | `out/EXPONENTIEL-reel.mp4` (+ miniature existante `out/miniature-exponentiel.png`) |
| Hors Git | `media/` et `out/` (voix, bruitages, musique, photos, rendus). Seul le code va dans Git. |

## Pourquoi cet ordre

**La voix d'abord.** Tout le reste se cale dessus : les coupes, la bouche du robot, les sous-titres,
les bruitages. Viennent ensuite les images (3D, puis le robot par-dessus), puis les bruitages, posés
sur les événements de l'image. La musique arrive en dernier, sous le reste. Si l'on fait l'inverse, on
recale tout à chaque changement : c'est ce qui a coûté le plus de temps sur LA SOURCE.

## Les étapes (dans l'ordre)

### 0. Préparation (10 min)

1. Récupérer le moteur des vidéos précédentes, sans rien réécrire :
   `git checkout b439b9a -- parano-ia reel-la-source`.
   On en tire : `parano-ia/core.js` (robot, poses, bras, bouche, personnages, sous-titres),
   `render.js` (Playwright + ffmpeg), `son.py` ; `reel-la-source/` pour la chaîne voix
   (`transcrire_voix.py`, `analyse_voix.py`, `aligne_voix.js`, `mix_voix.py`) et `miniature.js`
   (graphique néon de la miniature, repris pour le carton final).
2. Créer le projet dans `exponentiel/` (ne pas modifier les dossiers restaurés : copier ce qui sert).
3. Vérifier les outils :
   - Blender : `blender --version` (sur Mac : `/Applications/Blender.app/Contents/MacOS/Blender`).
   - Le serveur MCP Blender est-il connecté dans Claude Code ? Sinon, on passe par des scripts `bpy`
     lancés sans interface (`blender -b -P script.py`).
   - Node, Python, `pip install imageio-ffmpeg pillow numpy`, Playwright (Chromium).
   - Le connecteur ElevenLabs et le **solde de crédits**.
4. Demander à l'utilisateur les fichiers qui ne sont pas dans Git, s'il les a encore :
   `media/music2/` (musiques « deep tech » 118 BPM de LA SOURCE), `media/sfx/` (bruitages de LA
   SOURCE) et `out/miniature-exponentiel.png`.

### 1. Vérification des faits (15 min), avant de dépenser le moindre crédit

- Ouvrir chaque lien du tableau de `SCRIPT.md` §3 et confirmer chaque chiffre.
- Rouvrir le tableau de bord METR (https://metr.org/time-horizons/). Si un modèle plus récent y
  dépasse « au moins 16 h », proposer la nouvelle phrase à l'utilisateur **avant** de générer.
- **Validation n°1** (seulement si quelque chose change) : l'utilisateur approuve le texte.

### 2. Voix (20 min, environ 500 à 1 000 crédits)

1. `estimate_only` sur le texte de `SCRIPT.md` §1, puis annoncer le coût.
2. Une prise complète avec eleven_v3 (sur le même flow, une seconde prise seulement si la première a
   un défaut). Ranger dans `media/voix_ia/exponentiel_sebas.mp3`.
3. Nettoyage : resserrer les silences internes à ~0,25 s, tempo ×1,05 à ×1,10 si besoin pour que la
   voix finisse **avant 27,5 s**, sonie à -16 LUFS. Adapter `place_voix_ia.py` : un seul bloc, pas de
   recalage sur une ancienne voix.
4. **Validation n°2** : envoyer le MP3 à l'utilisateur. On ne touche pas aux images tant que la voix
   n'est pas validée.

### 3. Timings (10 min)

1. Transcription avec les instants de chaque mot (`transcrire_voix.py`, ou `--whisper`).
2. Écrire `exponentiel/timing.json` : début et fin de chaque plan, calés sur des mots précis (table
   ci-dessous), plus les instants clés (vitre, prise de la corde, atterrissage, panneaux, rampe,
   envol, plongeon dans l'étang, doublements du nénuphar, tic-tac, iris). **Toute la suite lit ce fichier** : Blender, moteur 2D, bruitages, musique.
3. Formes de bouche (`analyse_voix.py`) et sous-titres mot à mot (`aligne_voix.js`, texte de
   `SCRIPT.md` §2).

### 4. Animatique (30 min)

- Blocage grossier : décors en volumes gris dans Blender, caméras animées selon `timing.json`, robot
  posé à plat, sans finitions. Rendu à 25 % de la résolution, une image sur deux.
- Planche contact (une image par plan + les instants clés) et vidéo brute avec la voix.
- **Validation n°3** : l'utilisateur valide le découpage, les décors et les gags. C'est le moment de
  tout changer, ça ne coûte presque rien.

### 5. Décors 3D Blender (la plus grosse étape)

- Un script `bpy` par décor, dans `exponentiel/blender/` (procédural et reproductible, versionné) ;
  les `.blend` et les rendus vont dans `out/`.
- Moteur EEVEE, 1080×1920, 30 i/s, flou de mouvement activé. Ombrage cartoon (Shader to RGB, rampe
  de 2 ou 3 tons), contours Line Art couleur encre `#1B1620`, halo sur les néons.
- Pour chaque plan, trois sorties :
  - `out/plates/Pxx/bg/####.png` : tout le décor ;
  - `out/plates/Pxx/fg/####.png` : sur fond transparent, seulement ce qui passe **devant** le robot
    (accoudoirs, éclats de verre, rebord du toit de la voiture, roseaux et gerbes d'eau du premier plan) ;
  - `out/plates/Pxx/anchor.json` : pour chaque image, la position à l'écran d'un Empty
    `ROBOT_ANCHOR` (x, y, échelle, rotation, profondeur), calculée avec
    `bpy_extras.object_utils.world_to_camera_view`. Le robot 2D suivra exactement la 3D.
- Textes en 3D (panneaux routiers) : convertir les polices du projet (`assets/*.woff2`) en TTF avec
  fontTools, pour que Blender les lise.
- Ressources extérieures : procédural d'abord ; sinon uniquement du **CC0** (Poly Haven, ambientCG),
  rangé dans `media/`. **Aucun logo réel**, aucune marque de voiture reconnaissable.

### 6. Robot 2D + compositing (moteur SVG repris de parano-ia)

- Ordre des couches pour chaque image : `bg` → robot (pose, expression, bouche, flou) → `fg` →
  effets 2D (traînées de vitesse, compteurs ×2, cartes) → sous-titres → transitions.
- Robot : `makeRobot` / `poseRobot` / `ARMS` / `FACES` de `core.js` ; expressions prises uniquement
  dans `planche/Expressions.html` ; bouche calée sur la voix.
- Zone de sécurité Reels : rien d'important dans les 220 px du haut, les 420 px du bas ni la colonne
  de boutons à droite (x > 950, y de 1050 à 1500). Sous-titres entre y ≈ 1180 et 1380.
- Images de contrôle (`--stills`) aux instants clés, puis planche contact.
- **Validation n°4** : planche contact des images finales. Ensuite seulement, rendu complet
  (`--workers 4 --sub 4` pour le flou de mouvement).

### 7. Bruitages (après l'image)

- Placement automatique depuis `timing.json` (liste plus bas). Réutiliser d'abord `media/sfx/`.
  Synthétiser en Python ce qui peut l'être (ticks, montée du moteur : **chaque doublement = une
  octave au-dessus**, sans crédit). Générer avec ElevenLabs seulement ce qui manque (8 sons au maximum,
  `estimate_only` avant chaque son, total annoncé à l'utilisateur).
- Mixage `out/bruitages.wav` : 8 à 10 dB sous la voix, qui s'efface quand elle parle (sidechain).

### 8. Musique (en dernier)

- Par défaut : `media/music2/GROOVE` (118 BPM), coupée à 30 s ; le drop tombe sur la vitre qui
  éclate, un filtre étouffe la musique quand on plonge dans l'étang (« Le piège »), puis silence sur
  « on est à quel jour ? ». Accord final sur le coup de chapeau.
- Sinon, une musique ElevenLabs de 30 s (environ 450 crédits : **demander avant**).
- Musique très basse, de 18 à 23 dB sous la voix.

### 9. Mixage final et export

- Voix à -16 LUFS, bruitages et musique en sidechain, sortie à -14 LUFS.
- Encodage x264 en deux passes (~6 à 7 Mb/s), `+faststart`, AAC 160k → `out/EXPONENTIEL-reel.mp4`.
- **Validation n°5** : l'utilisateur regarde sur son téléphone.

### 10. Clôture

- Légende Instagram et sources (`SCRIPT.md` §5).
- Mettre à jour `CLAUDE.md` (chaîne exacte, voix, crédits dépensés) ; commit du code seulement.

## Découpage (instants indicatifs, recalculés sur la vraie voix à l'étape 3)

| Plan | ≈ temps | Texte dit | Décor (3D) | Action |
|---|---|---|---|---|
| P1 | 0,0 – 2,1 | « Faites trente pas : trente mètres. » | Open space « OpenIA », la nuit, vue sur la baie | Le robot tourne sur un fauteuil de bureau, puis roule lentement le long d'un mètre ruban vert au sol (0 → 30 m). Plat, linéaire, presque ennuyeux. |
| P2 | 2,1 – 5,8 | « Trente pas qui doublent… vingt-six fois le tour de la Terre. » | Couloir de l'open space → espace | Chaque poussée double : compteur ×2 ×4 ×8…, le fauteuil fuse, **traverse la baie vitrée** sur « vingt-six ». Coupe éclair de 0,6 s : la Terre vue de l'espace, le fil vert qui en fait 26 fois le tour. |
| P3 | 5,8 – 7,0 | « L'IA, c'est pareil. » | Façade de la tour de verre | Chute, il attrape le fil vert (qui devient une corde), descend en rappel en trois bonds. |
| P4 | 7,0 – 12,6 | « En 2019… trois secondes. » | Rue de San Francisco | Il atterrit sur le toit d'un robotaxi (toit enfoncé, dôme de capteurs fissuré). Le robotaxi démarre, **lentement**. Panneau « 2019 · 3 s ». |
| P5 | 12,6 – 14,6 | « Six ans plus tard : une heure. » | Autoroute, data centers au loin | Ça accélère. Panneau « 2025 · 1 h ». |
| P6 | 14,6 – 17,6 | « Treize mois plus tard… au moins seize heures. » | La route **se cabre et devient la courbe** | Boost, la route monte presque à la verticale vers les étoiles. Panneau « 2026 · 16 h+ » ; le mètre ruban du détective arrive au bout. |
| P7 | 17,6 – 23,4 | « Le piège : un nénuphar qui double chaque jour couvre l'étang le trentième jour. La veille ? À moitié. » | Étang sous la lune | La route s'arrête net en haut de la courbe : le robotaxi s'envole, traverse les nuages et **atterrit sur une feuille de nénuphar géante** (plouf, écho de l'atterrissage sur le toit). Vue de drone : les feuilles doublent à chaque temps, le fil vert trace le bord de la zone couverte. Panneau en bois dans les roseaux : « JOUR 30 », l'étang est plein ; il se retourne sur « La veille ? » : « JOUR 29 », la moitié seulement. |
| P8 | 23,4 – 25,8 | « Alors l'IA… on est à quel jour ? » | Même étang, eau libre devant | Gros plan : la loupe devant l'œil vert, dans laquelle se reflète le panneau « JOUR ?? » dont les chiffres tournent. Silence, tic-tac. On ne répond pas. |
| P9 | 25,8 – 29,5 | « Affaire à suivre. » | Carton titre (look de la miniature) | Ouverture en iris depuis la loupe → EXPONENTIEL, « L'IA SOUS ENQUÊTE », coup de chapeau, bouton S'ABONNER cliqué. |

## Bruitages (repères depuis timing.json)

| ID | Moment | Son | Source |
|---|---|---|---|
| S01 | P1 | Ambiance d'open space la nuit (clim, clavier lointain) | `media/sfx` ou ElevenLabs |
| S02 | P1 | Fauteuil qui tourne (grincement) + roulettes lentes | ElevenLabs |
| S03 | P2, chaque doublement | « Tick » qui monte d'une octave à chaque fois | synthèse Python |
| S04 | P2 | Souffle qui accélère dans le couloir | `media/sfx` (whoosh) |
| S05 | P2, « vingt-six » | Baie vitrée qui éclate + pluie d'éclats | ElevenLabs |
| S06 | P3 | Vent de chute, mousqueton, corde qui file | ElevenLabs |
| S07 | P4, atterrissage | Tôle écrasée + plastique qui craque + « bip-bip » d'alarme | ElevenLabs |
| S08 | P4 → P6 | Moteur électrique qui monte d'une octave à chaque panneau | synthèse Python |
| S09 | P4 à P6 | Passage de chaque panneau (whoosh court, de plus en plus aigu) | `media/sfx` |
| S10 | P6 | Montée + « braaam » quand la route se cabre | `media/sfx` / son.py |
| S11 | P7 | Envol (le moteur s'arrête d'un coup), vent, gros plouf sur la feuille de nénuphar, puis grenouilles, grillons et clapotis ; « pop » d'eau à chaque doublement ; panneau de bois qui pivote | ElevenLabs + synthèse |
| S12 | P8 | Silence, puis tic-tac d'horloge | ElevenLabs ou synthèse |
| S13 | P9 | Iris, accord final, clic S'ABONNER, coup de chapeau | `media/sfx` de LA SOURCE |

## Budget ElevenLabs (compte gratuit : 10 000 crédits par mois)

Voix : ~500 par prise. Bruitages : 8 sons au maximum, estimés un par un. Musique : réutilisée (0), ou
~450 crédits si l'utilisateur accepte. **Toujours `estimate_only` avant**, et annoncer le total. Si le
connecteur manque de crédits, l'utilisateur le reconnecte sur https://claude.ai/customize/connectors.

## Points de validation avec l'utilisateur

1. Texte (seulement si la vérification change un chiffre) · 2. Voix · 3. Animatique · 4. Planche
contact des images finales · 5. Vidéo finale sur téléphone.
