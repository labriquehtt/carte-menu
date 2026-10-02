# Robot détective — planche du personnage

Le personnage mascotte des vidéos IA/tech du compte. Les pièces sont copiées à l'identique :
les réutiliser, ne pas les redessiner.

Planches de référence dans `planche/` (ouvrir directement dans un navigateur, aucune dépendance) :

- **`Main.html`** — vue de face animée, poses clés, palette de couleurs.
- **`Expressions.html`** — 24 expressions et 8 formes de bouche (visèmes, pour du doublage).
- **`ModeEcran.html`** — spécification du plan rapproché sur l'écran (position, taille, couleur
  d'incrustation `#FF00FF` pour le montage).
- **`robot_defs.svg`** — les pièces SVG brutes (`rb-head`, `rb-coat-body`, `rb-feet`, `rb-antenna`,
  `rb-hat`, `loupe`), prêtes à réutiliser dans du code (`<use href="#rb-head">`, etc.).

Aucun logo/pin sur le chapeau (retirés du personnage officiel).

## Code des vidéos du compte PARANO-IA

Uniquement le code et les textes (pas de médias ni de rendus) ; les vidéos finies sont rangées à part.

- `reel-la-source/` — Reel « LA SOURCE » (voix, sous-titres, bouche du robot calés sur la voix).
- `parano-ia/` — première bande-annonce du compte.
- `exponentiel/` — Reel « EXPONENTIEL » (script sourcé, brief, prompt, décors Blender) et la fiche des 15
  techniques d'animation par prompt (`FICHE-TECHNIQUES.pdf`).
- `abysse/` — bande-annonce « ABYSSE » (29 s) : motion design rythmique calé sur la musique, plongée 3D Blender,
  bureau du détective, logo. Projet HyperFrames ; tout le minutage vient de `partition.py`.

Les notes de fabrication (voix, musique, pièges, commandes) sont dans `CLAUDE.md`.
