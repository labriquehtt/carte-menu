# L'animation par prompt

> 15 techniques de motion design à demander à Claude Code, avec le prompt prêt à copier

Cette fiche se joint au terminal : « Lis exponentiel/FICHE-TECHNIQUES.pdf et pioche deux ou trois techniques pour ce plan ». Chaque technique donne l'effet, un prompt à copier et coller, une astuce, et ses références (numéros [1], [2]… détaillés en dernière page). Les valeurs chiffrées sont des points de départ à ajuster à l'œil.

## Sept règles d'or pour que le prompt marche

1. **Des chiffres, pas des adjectifs.** « 12 poses par seconde », « ombre décalée de (6, 8) px à 35 % », « #4DFF8F ». Un adjectif (« joli », « dynamique ») oblige Claude à deviner. Donner les images de début et de fin de chaque plan aide beaucoup [1].
2. **Nomme la technique et son réglage.** « On twos » seul ne suffit pas : précise la cadence, ce qui reste fluide (décor, caméra) et ce qui saute (le robot).
3. **Une référence, puis trois traits.** Le nom d'un film est flou ; « trame de points, décalage de couleurs, cadence mélangée » est exécutable.
4. **Une signature par plan, deux techniques au maximum.** Une cadence plus une matière (stop motion + feutrine). Au-delà, l'image devient illisible.
5. **Tout dépend du numéro d'image.** Graines fixes (graine = numéro de pose), aucune animation libre (SMIL, CSS, horloge réelle) : le rendu image par image doit donner le même résultat à chaque fois.
6. **Vérifie avant de rendre.** Images fixes aux temps forts, puis planche contact, puis seulement le rendu complet : une image fixe est la vérification la plus rapide pour un modèle qui voit [2].
7. **Dis pourquoi.** La cadence et la matière servent l'histoire : le clone deepfake ultra lisse contre le robot dessiné à 12 poses par seconde. Ce n'est pas de la décoration.

## Je veux… donc j'utilise

| Je veux… | Techniques |
|---|---|
| un rendu « dessiné à la main » | T1, T3 |
| un rendu « stop motion » | T2, puis une matière : T4, T5 ou T6 |
| l'ambiance papier | T4, T11 |
| l'ambiance laine, doudou | T5, T2, T8 |
| le look Spider-Verse, comics | T1, T7, T10 |
| plus d'énergie, de poids | T9, T10, T12 |
| des décors 3D et le robot en 2D | T14 (ou T15), T11 |
| un texte qui claque | T13 |

## À ne pas oublier (règles du dépôt)

- Le robot n'est jamais redessiné : on déforme les pièces de planche/robot_defs.svg, on n'en invente pas.
- Les effets de trait sur le robot se demandent d'abord (l'effet dessin a été retiré du robot dans LA SOURCE) : par défaut, on les met sur les décors.
- Aucun logo réel, aucune marque. Zone de sécurité Reels : rien d'important dans les 220 px du haut, 420 px du bas et à droite (x > 950, y 1050-1500). Reels de 30 s maximum.
- media/ et out/ ne vont jamais dans Git. ElevenLabs : toujours estimer avant de générer.

## A · Cadence : le rythme dessiné

### T1 · On twos et cadences mélangées

**Effet.** Le mouvement paraît dessiné : une nouvelle pose seulement toutes les 2 images. C'est le premier levier pour sortir du « trop lisse ».

**Prompt à copier :**

```text
Rends à 30 i/s mais anime le robot par paliers : temps_anim = floor(t × 12) / 12 (12 poses par seconde, façon « on twos »). Le décor, les particules et la caméra restent fluides à 30 i/s. Sur les impacts et les gestes rapides, repasse le robot « on ones » (30 poses par seconde) pendant 6 images, puis reviens à 12.
```

**Astuce.** À 30 i/s, 12 poses par seconde alternent des poses tenues 2 et 3 images (légèrement irrégulier, acceptable). Pour un on twos parfait, rendre à 24 i/s ; ou tenir 3 images (10 poses/s). Spider-Verse mélange 24 et 12 i/s et s'en sert pour le caractère : un personnage novice est plus saccadé qu'un expert.

Réf. [3] [4]

### T2 · Stop motion

**Effet.** Poses tenues et petites erreurs de plateau. Marche aussi bien avec le papier, la feutrine ou la pâte à modeler.

**Prompt à copier :**

```text
Anime le robot en stop motion : 10 poses par seconde (chaque pose tenue 3 images), temps_anim = floor(t × 10) / 10. À chaque nouvelle pose, décale légèrement la pièce (graine = numéro de pose) : ±1,5 px en position, ±0,6° en rotation, ±1 % en échelle. Jamais deux poses identiques. Ajoute un léger flou de bougé après coup (moyenne de 3 sous-images, obturateur 180°).
```

**Astuce.** 8 poses/s fait très bricolé, 12 fluide, 10 est un bon compromis. Les animateurs de stop motion ajoutent souvent le flou de bougé après la prise. Le moteur de PARANO-IA sait déjà moyenner des sous-images (option --sub).

Réf. [5]

## B · Trait et matière : filtres SVG du moteur actuel

### T3 · Line boil : le trait qui bout

**Effet.** Les contours « bouillonnent » comme un dessin refait à chaque image.

**Prompt à copier :**

```text
Ajoute un « line boil » sur les décors : filtre SVG feTurbulence (fractalNoise, baseFrequency 0.02, numOctaves 2) suivi d'un feDisplacementMap (scale 3 à 5). Change la seed de feTurbulence toutes les 2 images. Pilote la seed depuis le numéro d'image, pas avec une animation SMIL ni CSS : le rendu est image par image. Applique le filtre à un groupe entier, jamais à chaque élément.
```

**Astuce.** Sur le robot officiel, demande d'abord. Les filtres SVG coûtent cher : parfait pour un rendu de nuit, lent pour l'aperçu (aperçu sans filtres, rendu final avec).

Réf. [6] [7] [8]

### T4 · Papier découpé et texture papier

**Effet.** Pièces plates, ombres dures, grain de papier : tout vit un peu « à la main ».

**Prompt à copier :**

```text
Style papier découpé : formes plates aux bords légèrement irréguliers (feDisplacementMap scale 2), ombre portée dure décalée de (6, 8) px, noire à 35 %, jamais floutée. Chaque pièce bouge « on threes » avec un tremblement de ±1 à 2 px et ±1° (posterize time). Texture papier sur tout le plan : feTurbulence fractalNoise baseFrequency 0.04, numOctaves 5, puis feDiffuseLighting (surfaceScale 1.5, lumière distante azimuth 45, élévation 60), mélangé en multiply à 25-35 %.
```

**Astuce.** Superpose 2 ou 3 plans de papier à des profondeurs différentes (plus l'ombre est grande, plus la feuille est haute). Les cartes de titre entrent en glissant depuis le bord, comme une feuille qu'on pousse.

Réf. [5] [9] [10]

### T5 · Feutrine et laine

**Effet.** Aplats mats, bords pelucheux, coutures visibles. Doux, chaleureux, fait main.

**Prompt à copier :**

```text
Style feutrine : aplats mats sans dégradé ni reflet ; contours doux et pelucheux (feTurbulence baseFrequency 0.8 puis feDisplacementMap scale 2-3 sur les bords, puis feGaussianBlur 0.4) ; texture de fibres fines en multiply à 15-20 %, plus dense dans les creux ; coutures apparentes en pointillés sur le bord des pièces ; petites ombres de contact douces là où deux pièces se superposent. Anime en stop motion (10 poses/s) : les fibres changent de graine à chaque pose.
```

**Astuce.** Recette de départ à ajuster : les sources décrivent l'apparence (fibres courtes, masses arrondies, bords doux, ombres de contact, coutures), pas des valeurs. Évite les contours noirs nets : ils cassent l'effet laine.

Réf. [11] [12]

### T6 · Pâte à modeler

**Effet.** Volumes ronds, surface mate, empreintes de doigts : le charme d'Aardman.

**Prompt à copier :**

```text
Aspect pâte à modeler : formes arrondies un peu trop épaisses, surface mate avec empreintes de doigts et petites rayures (bruit basse fréquence en léger relief), bords légèrement irréguliers, couleurs saturées, éclairage doux de studio, ombre de contact courte. Stop motion à 8-10 poses/s ; imperfections volontaires : chaque pose déforme très légèrement les volumes.
```

**Astuce.** En 3D (Blender) : un bump map de bruit et une subdivision légère, sans simulation. Aardman appelle « thumbiness » ces empreintes qui prouvent que c'est fait main.

Réf. [13] [14]

### T7 · Comics : demi-teinte, décalage CMJN, hachures

**Effet.** Image façon bande dessinée imprimée, le look Spider-Verse.

**Prompt à copier :**

```text
Look comics imprimé : trame de points (Ben-Day) à 45° dans les ombres, points plus gros là où c'est plus sombre ; hachures croisées sur les ombres secondaires ; décalage de couleurs façon impression mal calée (canaux rouge et bleu décalés de 2 à 4 px dans des directions opposées, surtout sur les bords) ; sur les mouvements rapides, une image étirée (smear) plutôt qu'un flou.
```

**Astuce.** Des angles de trame volontairement différents créent des moirés qui ressemblent à une vraie impression. À doser : sur tout le plan en plein, ça fatigue.

Réf. [15] [16] [17]

### T8 · Grain de pellicule, vignette, posterisation

**Effet.** Colle les couches ensemble et donne de la vie aux poses tenues.

**Prompt à copier :**

```text
Grain de pellicule : feTurbulence fractalNoise baseFrequency 0.9, contrasté par feComponentTransfer, en overlay à 6-10 %, seed = numéro d'image (le grain change à chaque image même quand les poses sont tenues). Vignettage doux (coins à -25 %). Micro-tremblement de caméra de ±1 px. Pour la posterisation ou le duotone : feComponentTransfer en mode discrete sur 3 ou 4 niveaux.
```

**Astuce.** Un grain qui bouge sur une pose tenue est ce qui fait « vivant » en stop motion.

Réf. [10] [18]

## C · Mouvement : poids, énergie, personnage

### T9 · Les 12 principes et les ressorts

**Effet.** La différence entre « ça bouge » et « ça vit ».

**Prompt à copier :**

```text
Applique les principes de l'animation : anticipation (recul de 4 à 6 images avant un saut), écrasement-étirement en gardant le volume (squash 0,85 × 1,15), arcs de mouvement, chevauchement (chapeau et antenne en retard de 3 à 5 images), ralenti à l'entrée et à la sortie (jamais linéaire), action secondaire (clignement, regard), exagération ×1,5 par rapport au réaliste. Toute apparition utilise un ressort : elle dépasse de 8 à 12 % puis se stabilise en 12 à 18 images.
```

**Astuce.** Un gag = anticipation longue, action très rapide, arrêt net. Nommer les principes et donner des valeurs fonctionne mieux que « rends-le plus vivant ».

Réf. [19] [20]

### T10 · Impacts : hit-stop, secousse, smear

**Effet.** Le poids d'un coup à moindre coût.

**Prompt à copier :**

```text
À chaque impact : gel de 3 à 4 images (hit-stop, la voix continue), secousse d'écran à amplitude décroissante sur 8 images, étirement (smear) du robot dans le sens du coup puis écrasement à l'arrivée, éclats et étoiles en passe devant, ralenti de 0,4 s sur le moment fort. Le bruitage tombe sur la première image de l'impact.
```

**Astuce.** Le moteur de LA SOURCE gère déjà le hit-stop (durées données en secondes réelles). Spider-Verse préfère le smear au flou de mouvement classique pour garder des images nettes.

Réf. [15] [17]

### T11 · Le robot-feuille (Paper Mario)

**Effet.** Un personnage plat dans un monde 3D, qui se comporte comme une feuille de papier.

**Prompt à copier :**

```text
Le robot est une feuille : quand il se retourne, sa largeur passe de 1 à 0,05 (on voit sa tranche) puis à -1 en 6 images ; son ombre au sol suit la rotation ; il se plie légèrement (skewY 4°) à la course et se froisse au rebond. Il reste net et sans relief alors que la caméra 3D tourne autour de lui.
```

**Astuce.** Pièces officielles uniquement (planche/robot_defs.svg) : on déforme, on ne redessine pas. Le principe vient de Paper Mario : personnages 2D dans un décor 3D.

Réf. [21]

## D · Caméra et texte

### T12 · Caméra, parallaxe et raccords

**Effet.** L'énergie de la bande-annonce : ça ne s'arrête jamais et chaque coupe est motivée.

**Prompt à copier :**

```text
Caméra jamais fixe plus de 1,5 s : travelling, contre-plongée pour la puissance, zoom éclair sur les chiffres. Parallaxe à 5-6 couches (les plus proches défilent le plus vite). Raccords : panoramique fouetté (whip pan) sur les temps forts de la musique, ou raccord sur un objet commun (le fil vert) qui traverse la coupe.
```

**Astuce.** Un fil conducteur (un objet présent dans tous les plans) évite l'effet « collage de scènes ». Technique déjà utilisée dans la bande-annonce PARANO-IA (commit b439b9a).

### T13 · Typo cinétique calée sur la voix

**Effet.** Le texte qui claque, mot pour mot avec la voix.

**Prompt à copier :**

```text
Chaque mot apparaît à l'instant où il est prononcé (instants de la transcription de la voix) : entrée en ressort, lettre par lettre avec 2 images d'écart, échelle 1,2 vers 1 ; les mots-clés en vert #4DFF8F et plus gros ; le mot sort en poussant le suivant. Police lisible (Space Grotesk ou Fredoka), dans la zone de sécurité Reels.
```

**Astuce.** La synchronisation avec l'audio compte plus que l'effet. Une seule animation de texte à la fois.

Réf. [20] [22]

## E · 3D : décors derrière le robot 2D

### T14 · Blender : toon, contours, piloté par script

**Effet.** Décors 3D stylisés, dessinés comme du 2D, avec le robot posé dedans.

**Prompt à copier :**

```text
Dans Blender (EEVEE) : matériau toon = Diffuse BSDF, puis Shader to RGB, puis Color Ramp en interpolation Constant à 2 ou 3 crans ; contours avec un modificateur Line Art (ou une coque inversée) à l'épaisseur du trait du robot ; halo (glare) sur les émissifs. Écris tout dans un script bpy rejouable (blender -b -P script.py) et prends une capture du viewport après chaque étape. Décors low-poly stylisés en instances, pas de personnages organiques.
```

**Astuce.** Shader to RGB n'existe pas dans Cycles, seulement dans EEVEE. Via le serveur MCP Blender, Claude écrit du bpy dans la scène ouverte : fiable pour les formes simples, le placement, les scènes à plusieurs objets et les matériaux simples ; faible pour la géométrie organique, les cotes précises et le rig.

Réf. [23] [24] [25]

### T15 · Three.js dans le même moteur (alternative)

**Effet.** De la 3D toon sans quitter la chaîne Chromium, image par image.

**Prompt à copier :**

```text
Alternative sans Blender : une scène Three.js dans la même page Chromium que le robot SVG, avec MeshToonMaterial (2 ou 3 tons) et un passage de contour (OutlineEffect ou ToonOutlinePassNode). La caméra et le temps dépendent du numéro d'image (aucune horloge réelle). Exporte à chaque image la position écran du point d'ancrage du robot.
```

**Astuce.** À tester avant de s'y fier : le rendu WebGL de Chromium sans écran peut demander des réglages. L'avantage : une seule chaîne de rendu, pas d'aller-retour de fichiers.

Réf. [26] [27]

## Cinq combinaisons prêtes pour PARANO-IA

- **Spider-Verse** : T1 (robot on twos, décor fluide) + T7 + T10 + décors 3D T14.
- **Atelier de feutre** : T5 + T2 + T8 : feutrine, 10 poses par seconde, grain qui bouge.
- **Carnet de détective** : T4 + T3 sur le décor, ombre dure ; le robot net posé par-dessus.
- **Roger Rabbit** : T14 + T11 : décor 3D toon, robot-feuille, ombre portée du robot sur la 3D.
- **La cadence comme personnage** : Le clone deepfake à 30 poses par seconde, trop lisse, contre le robot à 12 : c'est le lisse qui devient inquiétant.

## Ce que le prompt ne fait pas (bien)

- Il donne un look d'ensemble, pas la main d'un artiste : pas de vrai dessin image par image, pas de fourrure ou de laine simulée en 3D.
- Blender par MCP : bon pour le décor simple, faible pour l'organique, le rig et les cotes précises.
- Les filtres SVG coûtent cher : rendu final la nuit, aperçu sans filtres.
- Les chiffres de cette fiche sont des points de départ. Les sources justifient chaque technique, pas chaque valeur : à régler à l'œil sur des images fixes.

## Sources

[1] Prompting videos with coding agents (Remotion) : https://www.remotion.dev/docs/ai/coding-agents
[2] Video as Code: Remotion and the Agent Feedback Gap (Digital Applied) : https://www.digitalapplied.com/blog/video-as-code-remotion-agentic-generation-2026
[3] Frame Rate in Animation — Why Less is More (Nicholas Jean) : https://nicholasjean.medium.com/frame-rate-in-animation-why-less-is-more-1fe11b328193
[4] Is Spider-Verse Actually Animated At 12 FPS? (ExpertBeacon) : https://expertbeacon.com/is-spiderverse-12-fps/
[5] Using Stop Motion Animation with After Effects (School of Motion) : https://schoolofmotion.com/blog/stop-motion-after-effects
[6] Simulating Hand-Drawn Motion with SVG Filters (Camillo Visini) : https://camillovisini.com/coding/simulating-hand-drawn-motion-with-svg-filters
[7] line-boil-skill : feTurbulence + feDisplacementMap animés (GitHub) : https://github.com/Amateur0x1/line-boil-skill
[8] SVG Filter Performance Issues Emerge … Hand-Drawn Animation Effects (BigGo) : https://finance.biggo.com/news/202507211315_SVG_Filter_Performance_Issues
[9] An Easy Way to Get a Paper Cutout Stop Motion Look in Ae (Lesterbanks) : https://lesterbanks.com/2020/02/an-easy-way-to-get-a-paper-cutout-stop-motion-look-in-ae/
[10] SVG Filter Effects: Creating Texture with feTurbulence (Codrops) : https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/
[11] Styles In Animation: Why Felt Feels Right (Cartoon Brew) : https://www.cartoonbrew.com/stop-motion/styles-in-animation-felt-stop-motion-215313.html
[12] Wool like you've never seen it before — Andrea Love (It's Nice That) : https://www.itsnicethat.com/articles/andrea-love-stop-motion-animation-130220
[13] Digital pic shows Aardman fingerprints (Variety) : https://variety.com/2006/film/awards/digital-pic-shows-aardman-fingerprints-1117953534/
[14] An introduction to Aardman (Factory International) : https://factoryinternational.org/factoryplus/an-introduction-to-aardman/
[15] Spider-Man: Into the Spider-Verse — How the Comic Look Works (Prolific Studio) : https://prolificstudio.co/blog/spiderman-into-the-spiderverse/
[16] Re-writing the rule book on Into the Spider-Verse (Foundry / Nuke) : https://www.foundry.com/insights/film-tv/graphic-look-in-comp-spiderman
[17] Why Spider-Verse has the most inventive visuals (fxguide) : https://www.fxguide.com/fxfeatured/why-spider-verse-has-the-most-inventive-visuals-youll-see-this-year/
[18] SVG Filter Effects: Poster Image Effect with feComponentTransfer (Codrops) : https://tympanus.net/codrops/2019/01/29/svg-filter-effects-poster-image-effect-with-fecomponenttransfer/
[19] Disney's 12 Principles Of Animation (NYFA) : https://www.nyfa.edu/student-resources/12-principles-of-animation/
[20] Agent Skills (Remotion) : https://www.remotion.dev/docs/ai/skills
[21] Paper Mario: The Thousand-Year Door (Wikipédia) : https://en.wikipedia.org/wiki/Paper_Mario:_The_Thousand-Year_Door
[22] Kinetic typography: the what, why, and how (Linearity) : https://www.linearity.io/blog/kinetic-typography/
[23] Cel Shading in Blender (Artisticrender) : https://artisticrender.com/cel-shading-in-blender/
[24] blender-mcp (GitHub) : https://github.com/ahujasid/blender-mcp
[25] Claude + Blender MCP: What It Can Do, What It Can't (MindStudio) : https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance
[26] MeshToonMaterial (three.js docs) : https://threejs.org/docs/pages/MeshToonMaterial.html
[27] ToonOutlinePassNode (three.js docs) : https://threejs.org/docs/pages/ToonOutlinePassNode.html

Les sources décrivent chaque technique ; les réglages chiffrés des prompts sont des valeurs de départ proposées par l'auteur de la fiche.
