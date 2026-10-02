---
message: "Tout le monde regarde la surface de l'IA ; PARANO-IA plonge en dessous"
format: 1080x1920 · 30 i/s · 27,4 s
musique: ElevenLabs Music (variante B), 150 BPM, ré mineur harmonique — 1 temps = 12 images, 1 mesure = 48 images
mode: autonome
---

# ABYSSE — storyboard minuté (source : partition.py → partition.json)

> **v2 (2026-10-02, 29,0 s)** — ce storyboard décrit la v1. En v2 l'ouverture dure une mesure de plus et tous les
> instants suivants sont décalés de +1,6 s (plongeon 9,6 s, sas 20,8 s, logo 27,2 s) :
> S1 0–3,2 s balle qui rebondit sur la ligne (notes), CHAQUE jaillit, SEMAINE, tombe ; S2 3,2–8,0 s « DE NOUVELLES /
> ACTUS » s'étire, « SUR L'IA. » en lettres de caractères (déchirure cryptée), éclat → 12 logos d'IA dessinés,
> « TOUT LE MONDE / REGARDE / LA SURFACE. », logos posés sur la ligne ; S3 8,0–9,6 s « NOUS, / ON PLONGE. », logos qui
> coulent, nappe, chute. Plus de cases vidéo ni de noms qui clignotent. Plongée : logo DeepSeek en points sur la
> baleine (11,6 s), applis de musique IA sur le piano (14,4–15,8 s). Bureau : viseur REC. Détails dans `../CLAUDE.md`.

## Frame 1 — S1 accroche (0,0 → 3,2 s, mesures 0-1)
status: built · src: motion.js (cartons, champPoints, nomsCaches) · rules: kinetic type sur les temps, décodage de glyphes
Impact + champ de points qui jaillit. « CHAQUE / SEMAINE, » puis « UNE NOUVELLE / IA. » (vert), chaque mot sur un temps.
Entre les mots, en doubles croches, des noms de modèles défilent 2 images chacun (références cachées).

## Frame 2 — S2 cases (3,2 → 6,4 s, mesures 2-3)
status: built · src: motion.js (CASES) + 4 vidéos `assets/clips/case_*.mp4` · rules: grille qui glisse sur les temps
Une case par temps : extrait de l'ancienne BA (FIGHT!), voix (la forme d'onde finit en « II »), nénuphar d'EXPONENTIEL,
rouleau de piano (la mélodie), graphique d'ALIGNEMENT, image qui se débruite en voilier (« /imagine »), chat
(« Rien. Tout va bien. »), robot-télé de LA SOURCE. À 4,8 s la grille se resserre en bande : « TOUT LE MONDE / REGARDE /
LA SURFACE. »

## Frame 3 — S3 la ligne (6,4 → 8,0 s, mesure 4, la montée)
status: built · src: motion.js (ligneOnde, nappe) · rules: écrasement en ligne, perspective, chute
La bande s'écrase en une ligne qui vibre avec le roulement ; « NOUS, / ON PLONGE. » ; la ligne devient une nappe de
points (l'eau) ; la caméra bascule et tombe dedans ; éclair blanc au plongeon (8,0 s).

## Frame 4 — P1 plongée (8,0 → 16,0 s, mesures 5-9)
status: built · src: blender/abysse.py + objets_abysse.py → `assets/plates/plongee.mp4` · rules: plan-séquence, fouets sur les temps forts
Descente en tournant dans un trou bleu ; à chaque mesure un fouet de caméra vers l'objet suivant, qui joue sa note :
bouée-câlin (cloche), baleine bleue (chant), voilier + étoiles à 4 branches (cristal), piano « SUNO » (la mélodie de la
musique, touche par touche), colonnes « II » (chœur), étincelle orange (nappe). Tableau de bord : profondeur, sonar.

## Frame 5 — P2 station (16,0 → 19,2 s, mesures 10-11)
status: built · src: idem · rules: accélération des pings, montée
Le sonar révèle la station (LED en M pixelisé, câble en ∞, hublot à fleur hexagonale) ; la musique revient à travers
la coque. 19,2 s : le sas s'ouvre, éclair blanc, DROP.

## Frame 6 — P3 bureau (19,2 → 24,0 s, mesures 12-14)
status: built · src: blender/bureau.py → `assets/plates/bureau.mp4` + `assets/clips/ecran.mp4` (incrusté par homographie,
coins `out/plates/P3/ecran.json`) · rules: poussée caméra, écran qui remplit le cadre
Pièce sombre façon référence (lattes, lampe, tableau d'enquête, chapeau, loupe, orbe verte qui bat sur la grosse caisse).
L'écran vertical enchaîne 12 extraits des vidéos du compte (un par temps), puis la caméra plonge dedans.

## Frame 7 — S4 logo (24,0 → 27,4 s, mesures 15-16)
status: built · src: motion.js (logoScene, robot) · rules: assemblage en particules, coup final
Les points de l'eau montent former « PARANO-IA » pendant le roulement ; 25,6 s : coup final, logo net, slogan tapé
« L'IA SOUS ENQUÊTE », le robot détective (pièces officielles) surgit avec sa loupe.
