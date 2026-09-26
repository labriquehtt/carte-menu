# REEL INSTAGRAM — "LA SOURCE" — brief de référence

## MODIFICATIONS (après les premières versions)
- **v3 — vitesse** : la vidéo dure **100 s (1:40)** au lieu de 159 s. Toute la timeline
  ci-dessous reste écrite dans ses timecodes d'origine ("temps script") et elle est lue
  ×1,59 (`SPEED` dans reel.js) : débit de parole ~2,7 mots/s au lieu de 1,7. Temps vidéo =
  temps script ÷ 1,59. Les hit-stops, l'idle, les clignements, la bouche et le décor restent
  en temps réel.
- **v3 — sous-titres** : remis à l'image comme base pour poser la voix au montage (même style
  cinétique, mots-clés en vert), au nouveau rythme.
- **v2 — décor** : nuit de film noir de détective — ciel bleu nuit → sarcelle, lune verte
  (rappel de #4DFF8F), lumière de store vénitien, skyline aux fenêtres ambrées, poussières en
  suspension. Aucune teinte violette/rose (sûr pour l'incrustation du magenta).
- **v4 — outro LK Studio (scène 8, 159.0–184.44 script → 100–116 s vidéo)** : la lumière
  revient, le robot se réveille ; [CLAQUE] 162.0 → fenêtre de navigateur
  « l-k-studio.com/gallery_delord.html » (zone de contenu 16:9 : x 20, y 500, 1040×585, pour
  le scroll du site) ; il la désigne ; [CLAQUE] 173.2 → casque VR dans sa main, il l'enfile
  (loupe relevée) ; « entrez dans le dessin » = effet dessin + croquis ; il retire le casque,
  carton « GALERIE DELORD · l-k-studio.com », coup de chapeau. Texte :
  Affaire à suivre… / Les autres dessins de Philippe Delord / vous attendent dans sa galerie, /
  sur LK Studio. / Et la galerie se visite aussi / en réalité virtuelle : / enfilez un casque, /
  et entrez dans le dessin.
- **v5 — médias intégrés** : le clip IA du dessin remplace l'écran magenta et remplit le cadre
  vidéo, le dessin original est dans le polaroid de la scène 2, la photo de Yann LeCun dans
  celui de la scène 5, le scroll du site dans la fenêtre navigateur de l'outro. Plus
  d'incrustation à faire au montage.
- **Montage CapCut (v3, avant intégration des médias)** : le mode écran magenta dure de **0 à 4,15 s** (extinction télé à
  3,96 s) → le clip Kling va sur la piste du dessous de 0 à 4,15 s.

## RENDU
Vidéo 9:16, 1080×1920, 30 fps, durée exacte 159 s (2:39). Aucun audio :
voix, musique et bruitages ajoutés au montage.
Style "deep cartoon" : fond presque noir (#0A0A0F) avec léger dégradé radial,
accent vert néon (#4DFF8F), texte blanc. Animation cartoon rebondissante et précise,
mais ambiance posée et contemplative : c'est du storytelling, pas une fête foraine.
Toute l'animation est pilotée par KEYFRAMES explicites (temps, propriété, valeur,
easing). Aucun mouvement linéaire.

## LE PERSONNAGE — ROBOT DÉTECTIVE
Le SVG de la fiche personnage est le modèle officiel : reprendre ses formes, couleurs et
proportions EXACTEMENT. Pièces animables : #arm-l-down, #arm-r-down, #rb-coat, #rb-head,
#loupe, #rb-antenna, #rb-hat. Visages : #face-*.
Taille : ~24 % de la largeur de l'écran. Il n'a pas de nom, ne jamais le nommer à l'écran.

## SON RÔLE
Il est le "corps" de la voix : il EXPRIME ce qui est dit avec son attitude, ses gestes et
son visage, et c'est lui qui fait apparaître et disparaître les images.
- Bouche : pendant chaque ligne de sous-titre, la bouche alterne les formes de parole
  (fermée / mi-ouverte / ouverte / o), ~8 changements par seconde, rythme irrégulier.
  Bouche fermée pendant les pauses.
- Expressions autorisées UNIQUEMENT : neutre, curieux, perplexe, surpris (léger), reflechit,
  sceptique, incertain, satisfait (discret), endormi.
  INTERDIT : mort-de-rire, amoureux, emerveille, etourdi, langue-tiree, bug, gene, boude, eureka.
- Changement d'expression : transition 0.2 s (squash de la tête scaleY 0.95 → 1).
- Idle permanent : flottement lent (y ±6 px, 2.6 s), clignement toutes les 3 à 5 s,
  antenne et chapeau en follow-through. Jamais figé.

## PRINCIPES D'ANIMATION
- Squash & stretch sur chaque saut et atterrissage.
- Anticipation avant chaque geste.
- Overshoot + settle à chaque arrivée.
- Sauts avec une vraie gravité (trajectoire parabolique).
- HIT-STOP : aux impacts indiqués, toute l'animation se fige 0.08 à 0.15 s, puis repart.
- Tout l'aléatoire part d'une graine fixe.
EASINGS :
  POP (arrivées)      cubic-bezier(0.34, 1.56, 0.64, 1)
  SOFT (déplacements) cubic-bezier(0.22, 1, 0.36, 1)
  ANTICIPATION        cubic-bezier(0.36, 0, 0.66, -0.56)
  CHUTE (gravité)     cubic-bezier(0.55, 0, 1, 0.45)

## 3 GESTES SIGNATURE
[CLAQUE] fait apparaître un élément en claquant des doigts
  t-0.25 anticipation : bras droit levé, main fermée, corps penché en arrière de 3°
  t      claquement : la main se détend, 3 étincelles vertes (0.2 s), HIT-STOP 0.08 s
  t+0.05 l'élément apparaît : scale 0 → 1.08 (0.25 s, POP) → 1 (0.15 s, SOFT), rotation -3° → 0°
  t+0.3  retour en idle, visage satisfait discret 0.5 s
[TIRE] ramène un élément dans le cadre depuis le bord de l'écran
  t-0.3  il marche vers le bord, attrape le coin de l'élément (seul un coin est visible)
  t      il tire en se penchant en arrière (stretch horizontal, pieds qui glissent)
  t→t+0.5 l'élément glisse jusqu'à sa place (SOFT, overshoot 20 px)
  t+0.5  il trébuche en arrière (squash), se rattrape, remet son chapeau droit d'une main
[ÉCRASE] fait sortir un élément de l'écran en sautant dessus
  t-0.3  accroupissement
  t      saut parabolique jusqu'au bord supérieur de l'élément
  t+0.4  atterrissage sur le cadre : squash fort, HIT-STOP 0.12 s, le cadre s'enfonce de 20 px
  t+0.55 le cadre sort par le bas (translateY +1500 px, 0.45 s, CHUTE) ; le robot descend
         avec lui sur 150 px puis rebondit et saute hors du cadre
  t+1.1  atterrissage à sa nouvelle place, squash, antenne qui vibre
RÈGLE : le robot ne recouvre JAMAIS l'intérieur d'un cadre affiché. Il ne touche un cadre
que pendant ses gestes.

## MODE ÉCRAN (écran de la tête = incrustation vidéo)
- L'écran est rempli de magenta PUR #FF00FF, parfaitement uni : aucun dégradé, reflet,
  grain, glow, filtre, sous-titre ni élément par-dessus.
- Yeux et bouche disparaissent. Loupe relevée sur le côté (#loupe-up).
- Tête TOTALEMENT IMMOBILE : écran exactement à x 60, y 440, 960 × 640 px, rayon 143 px.
- Le magenta #FF00FF n'est utilisé NULLE PART ailleurs.

## EFFET DESSIN (uniquement 11.2–19.6 s)
Sur le robot seulement : mouvement à 12 images/s, contours qui tremblent (feTurbulence +
feDisplacementMap, seed changé 12 fois/s, 1.5–3 px), léger grain papier. Entrée/sortie 0.3 s.
(La plage 3.5–6.9 a été supprimée : elle ferait bouger les bords de l'écran magenta.)

## EFFET PIXEL (93.0–96.4 s)
Le robot se pixelise (gros pixels carrés), mouvement à 12 images/s, face-sceptique.
À 96.4 il redevient net en 0.3 s.

## PLACEHOLDERS (remplis au montage)
1. Cadre vidéo : 1080×720 (3:2), #141414 uni, contour vert 2 px, coins arrondis, AUCUN
   contenu. Centré, moitié haute, sans chevaucher les sous-titres. STATIQUE une fois en place.
2. Cadre photo : polaroid vertical (~600×720), même traitement, vide.
Ils entrent et sortent UNIQUEMENT par les gestes du robot.

## SOUS-TITRES CINÉTIQUES
Tempo ~2 mots/s. Chaque ligne apparaît à son timecode, mot par mot sur la durée de la ligne,
reste jusqu'à la ligne suivante. Une seule ligne à la fois (sortie 0.15 s). Tiers inférieur,
décalage léger d'une ligne à l'autre, rotations ±3°. Police ronde et grasse, blanche, légère
ombre. Mots-clés en vert #4DFF8F, 1.3× plus gros, avec POP. Autres mots : fade + montée 10 px.

## TIMELINE (secondes)
SCÈNE 1 · 0.0–11.2
0.0–6.3  GROS PLAN MODE ÉCRAN (tête à l'échelle 5.5, écran à x 60, y 440, 960×640). Rien ne bouge.
6.3–6.6  Extinction vieux téléviseur : le magenta s'écrase en ligne (0.15 s) puis en point (0.15 s).
6.6–7.6  Dézoom (SOFT) jusqu'au plan large : robot en bas à gauche, yeux qui se rallument,
         loupe qui retombe avec un petit rebond, face-curieux.
7.6      [CLAQUE] → cadre vidéo.
0.5–3.5  On a demandé à une IA
3.5–6.9  de donner vie à ce dessin,
6.9–8.4  et regardez bien                   · il se tourne vers le cadre
8.4–11.2 ce qui se passe.                   · il se penche vers le cadre, main sur la loupe
Mots-clés : IA, donner vie

SCÈNE 2 · 11.2–21.9
10.6 [ÉCRASE] → le cadre vidéo sort. 11.2 [TIRE] depuis le bord droit → polaroid (effet dessin).
11.2–15.1 Ce dessin, c'est celui de Philippe Delord,  · il désigne le cadre, face-satisfait discret
15.1–17.6 un dessinateur qui m'a autorisé
17.6–19.6 à utiliser son travail
19.6–21.9 pour cette vidéo.                  · petit hochement de tête, face-neutre
Mots-clés : Philippe Delord

SCÈNE 3 · 21.9–49.0
21.3 [ÉCRASE] → polaroid sort. 21.9 [CLAQUE] → cadre vidéo. Robot sous le cadre.
21.9–24.3 La consigne était simple,          · face-neutre
24.3–26.7 faire vivre la scène,
26.7–30.2 et pourtant il y a quelque chose   · il lève la loupe vers le cadre, face-curieux
30.2–34.1 qui se met à couler du toit,       · pose "examine un indice", œil-loupe agrandi
34.1–35.6 la maison s'efface                 · face-surpris léger, petit recul
35.6–37.0 puis revient,                      · face-perplexe
37.0–40.0 et honnêtement personne ne peut dire
40.0–42.4 si c'est du bois,   · [CLAQUE] → icône planche
42.4–43.8 de l'eau            · [CLAQUE] → icône goutte
43.8–46.2 ou de la fumée,     · [CLAQUE] → icône volute
46.2–49.0 pas même la machine. · haussement d'épaules, face-incertain
Mots-clés : couler, bois, eau, fumée

SCÈNE 4 · 49.0–75.1
48.4 [ÉCRASE] → cadre vidéo sort. Robot au centre ; [CLAQUE] 49.3 : arbre, maison, caillou.
49.0–51.9 Parce que pour une IA,            · face-neutre
51.9–53.3 donner vie,
53.3–57.1 ça veut juste dire faire bouger.  · touche l'arbre (HIT-STOP 0.1, il gigote), puis la maison
57.1–60.0 Elle n'a jamais vu la vie,        · face-reflechit
60.0–63.5 elle a vu des millions de vidéos  · mosaïque de petits rectangles derrière lui
63.5–66.9 où tout ce qui est vivant bouge,
66.9–68.9 alors elle fait bouger
68.9–71.3 tout ce qu'elle peut,
71.3–75.1 même ce qui n'était pas censé bouger. · touche le caillou (HIT-STOP), face-sceptique
Mots-clés : faire bouger, la vie, millions

SCÈNE 5 · 75.1–122.1
74.6 Les objets tombent (CHUTE, décalés de 0.08 s).
75.1 [TIRE] depuis le haut → carte "YANN LeCUN — Prix Turing" + polaroid vide. Robot assis, face-neutre.
75.1–78.1 Et c'est exactement ce que pointe
78.1–79.5 Yann LeCun,
79.5–80.9 un Français,
80.9–84.3 l'un des pionniers de l'IA moderne,
84.3–87.7 qui a reçu le prix Turing,
87.7–91.0 l'équivalent du Nobel en informatique.
91.0–93.0 Pour lui, ces modèles               · face-reflechit
93.0–96.4 ne font que prédire des pixels,    · EFFET PIXEL + grille de pixels qui scintille
96.4–98.8 sans aucun monde derrière,         · face-sceptique
98.8–102.2 sans savoir ce qu'est un toit,
102.2–105.5 du bois ou de l'eau.
105.5–108.0 D'ailleurs, il a quitté Meta
108.0–111.5 et levé plus d'un milliard de dollars
111.5–113.4 pour construire l'inverse,
113.4–116.8 ce qu'on appelle les world models, · [CLAQUE] → globe filaire trait par trait, face-curieux
116.8–119.3 des IA qui comprendraient vraiment
119.3–122.1 comment le monde fonctionne.     · face-reflechit
Mots-clés : Yann LeCun, prix Turing, pixels, aucun monde, milliard, world models

SCÈNE 6 · 122.1–151.3
121.5 [ÉCRASE] sur la carte → carte, polaroid et globe sortent. 122.1 [CLAQUE] → cadre vidéo.
122.1–124.5 Mais le plus troublant,          · face-neutre
124.5–127.0 c'est que ce lieu s'appelle
127.0–129.0 La Source.  · HIT-STOP 0.15 s, "LA SOURCE" s'écrit au-dessus du cadre, face-surpris léger
129.0–130.4 Alors vous, · il se tourne face caméra
130.4–132.4 qu'est-ce que vous voyez         · face-curieux
132.4–135.2 couler de ce toit ?
135.2–138.1 Parce que la machine, elle,      · face-reflechit
138.1–140.5 n'a rien voulu dire,             · ses mouvements ralentissent
140.5–143.5 c'est nous qui cherchons un sens. · il s'assoit, les yeux se ferment
143.5–145.5 [SILENCE] · face-endormi, tout ralentit, bulle de rêve qui pulse
145.5–147.4 Alors au fond,
147.4–148.8 qui rêve,
148.8–151.3 elle ou nous ?
Mots-clés : La Source, vous, un sens, qui rêve

SCÈNE 7 · 151.3–159.0
151.3 Fondu au noir lent (1 s) : seul le robot reste, endormi, au centre. HIT-STOP 0.15 s.
152.0 Il ouvre UN œil, lentement (l'œil sous la loupe).
151.3–152.9 Hallucination,
152.9–159.0 ou simplement une autre façon de voir ?
157.0 Il cligne une fois. Le texte reste jusqu'à la fin.
Mots-clés : Hallucination

## VÉRIFICATION APRÈS CHAQUE RENDU
Images à : 0.3, 5, 11.0, 14, 22.2, 32, 41, 47, 55, 72, 76, 95, 115, 121.8, 127.2, 131, 144, 150, 155.
Robot fidèle, aucun sous-titre sur le robot ni un cadre, robot jamais sur l'intérieur d'un
cadre affiché, sous-titres lisibles et dans l'écran, bon sous-titre et bon visage au bon
timecode, cadres uniquement par CLAQUE/TIRE/ÉCRASE, effets dessin/pixel dans leurs plages,
aucune expression interdite.

## MONTAGE CAPCUT
1. L'export va sur la piste du haut.
2. Le clip Kling va sur la piste du dessous, de 0 à 6,6 s : centré horizontalement, centre à
   y 760, largeur ≥ 960 px.
3. Piste du haut → Retirer l'arrière-plan → Incrustation chromatique → pipette sur le magenta.
Si le clip n'est pas en 3:2, l'agrandir jusqu'à couvrir l'écran (les bords sont cachés par la tête).
