# EXPONENTIEL — brief de production (Reel PARANO-IA, 30 s)

> Rédigé le 2026-09-29. À lire avec `SCRIPT.md` (texte et sources) et `PROMPT.md` (direction créative
> plan par plan). Ce brief dit **dans quel ordre fabriquer quoi**, avec quels outils, et quand faire valider.

## Fiche technique

| | |
|---|---|
| Format | 1080×1920 (9:16), 30 i/s, H.264 + AAC, **28 à 30 s**, fichier final de moins de 30 Mo |
| Voix | ElevenLabs « Hugo - Warm and Grounded », `IbbR6Av0dWuQJS0b8JVT`, `eleven_v3` (validée le 2026-09-29, 580 crédits) |
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

## Découpage v2 (instants réels : `timing.json`, voix Hugo)

| Plan | Temps | Texte dit | Décor (3D) | Action |
|---|---|---|---|---|
| P1 | 0,00 – 4,81 | « Un nénuphar double chaque jour. Le trentième jour, il couvre tout l'étang. » | Étang sous la lune | Robot dans une barque. Panneau « JOUR n ». Vue de drone : les feuilles doublent (pop), le fil vert borde la zone couverte ; étang plein sur « trentième jour ». |
| P2 | 4,81 – 7,65 | « La veille ? La moitié. Cinq jours avant ? Trois pour cent. » | Même étang, rembobiné | « JOUR 29 » : 50 %, barque pile sur la frontière ; « JOUR 25 » : 3 %, loupe sur la petite tache. |
| P3 | 7,65 – 11,89 | « L'IA suit cette courbe : … deux fois plus longues. » | Piste néon qui sort de l'étang | Le fil vert se soulève et devient la piste ; surf sur une feuille. Panneaux « 2019 · 3 s », « 2025 · 1 h », « 2026 · 16 h+ » (METR). |
| P4 | 11,89 – 15,89 | « Et elle commence à faire sa propre recherche : c'est l'auto-amélioration. » | Labo « OpenIA », salle de serveurs | Bras robotisés qui assemblent des bras, écrans en mise en abyme, zoom éclair sur « auto-amélioration ». |
| P5 | 15,89 – 19,41 | « Un doublement pourrait alors prendre quelques semaines… voire une seule. » | La piste ressort et se cabre | Calendrier dont les pages s'arrachent : 4 mois → quelques semaines → « 1 semaine ? » (hypothèse · Forethought). Verticale sur « une seule ». |
| P6 | 19,41 – 24,73 | « Et l'alignement ? … Même OpenAI admet ne pas encore savoir. » | Aiguillage dans le ciel | Rail blanc « ce qu'on veut » / rail vert qui s'écarte ; levier « ALIGNEMENT » qui résiste ; fiche « pas encore » (OpenAI, sept. 2026). |
| P7 | 24,73 – 26,13 | « Alors… on est à quel jour ? » | Étang, gros plan | Loupe devant l'œil vert, « JOUR ?? » qui tourne. Silence, tic-tac. |
| P8 | 26,13 – 29,00 | « Affaire à suivre. » | Carton titre (look de la miniature) | Iris → EXPONENTIEL, « L'IA SOUS ENQUÊTE », coup de chapeau, S'ABONNER. |

## Bruitages v2 (repères depuis timing.json)

| ID | Moment | Son | Source |
|---|---|---|---|
| S01 | P1, P2, P7 | Ambiance d'étang la nuit (grillons, clapotis, grenouilles) | ElevenLabs |
| S02 | P1, chaque doublement | « Pop » d'eau qui monte d'une octave à chaque fois | synthèse Python |
| S03 | P1, « trentième jour » | Gerbe d'eau, barque soulevée, grenouille | `media/sfx` (DROP, LAND) |
| S04 | P2 | Rembobinage de magnétoscope (deux fois, le 2e plus fort) + panneau de bois qui pivote | ElevenLabs |
| S05 | P3 | Le fil qui se tend et s'arrache de l'eau, puis souffle de glisse qui monte d'une octave à chaque panneau | synthèse + `media/sfx` |
| S06 | P4 | Salle de serveurs (ventilation, bras robotisés, bips) | ElevenLabs |
| S07 | P5 | Pages de calendrier qui s'arrachent de plus en plus vite + montée + « braaam » | ElevenLabs + `media/sfx` (RISER) |
| S08 | P6 | Levier d'aiguillage métallique qui résiste, grincement, rails | ElevenLabs |
| S09 | P7 | Silence, puis tic-tac d'horloge | synthèse |
| S10 | P8 | Iris, accord final, clic S'ABONNER, coup de chapeau | `media/sfx` de LA SOURCE |

## Budget ElevenLabs (compte gratuit : 10 000 crédits par mois)

Voix : ~500 par prise. Bruitages : 8 sons au maximum, estimés un par un. Musique : réutilisée (0), ou
~450 crédits si l'utilisateur accepte. **Toujours `estimate_only` avant**, et annoncer le total. Si le
connecteur manque de crédits, l'utilisateur le reconnecte sur https://claude.ai/customize/connectors.

## Points de validation avec l'utilisateur

1. Texte (seulement si la vérification change un chiffre) · 2. Voix · 3. Animatique · 4. Planche
contact des images finales · 5. Vidéo finale sur téléphone.
