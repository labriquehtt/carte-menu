# CLAUDE.md

> Mis à jour le : 2026-09-24

Ce dépôt sert désormais au **reel Instagram "LA SOURCE"** (motion design du robot détective),
dans `reel-la-source/`. Les fichiers à la racine (cartes du restaurant LE NATIONAL) sont un
ancien projet, à ignorer.

---

## 🎬 Reel "LA SOURCE" — `reel-la-source/`

Vidéo 9:16, 1080×1920, 30 fps, **116 s** (dont l'outro LK Studio / Galerie Delord de 100 à 116 s), sans audio (voix, musique, bruitages ajoutés au
montage dans CapCut ; les sous-titres à l'image servent de base pour poser la voix).
La timeline est écrite dans les timecodes du brief (159 s de "temps script") et lue ×1,59
(`SPEED`) ; temps vidéo = temps script ÷ 1,59. Tout est généré par code : une page SVG animée par keyframes, rendue
image par image dans Chromium puis encodée en H.264.

- `brief.md` : **le brief complet** (timeline, sous-titres, gestes, règles). Source de vérité.
- `index.html` : la scène 1080×1920 + les pièces officielles du robot (copiées à l'identique
  de la fiche personnage Claude Design) + les filtres (effet dessin, effet pixel).
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

### Commandes

```bash
pip install imageio-ffmpeg pillow        # ffmpeg avec libx264 (une seule fois)
cd reel-la-source
node render.js --stills 5,14,22.2 --script --out out/stills --debug   # images de contrôle (timecodes du brief)
node render.js --video out/la-source-1080x1920.mp4 --workers 4   # vidéo complète (~quelques min)
```

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
- Décor sans violet ni rose : l'incrustation chromatique s'applique à toute la piste.
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
