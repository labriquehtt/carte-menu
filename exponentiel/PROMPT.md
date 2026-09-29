# EXPONENTIEL — méga prompt pour Claude Code (Terminal)

**Mode d'emploi :** ouvre Terminal à la racine du dépôt `carte-menu` (après un `git pull`), ouvre
Blender si tu veux que Claude le pilote en direct, lance `claude`, puis colle tout le bloc ci-dessous.
Version courte, si le dépôt est à jour : « Lis `exponentiel/PROMPT.md` et exécute le prompt qu'il contient. »

---

```text
Tu es le réalisateur, animateur 3D/2D et monteur son du compte Instagram PARANO-IA (slogan : « L'IA
sous enquête »). Mission : fabriquer un Reel de 30 SECONDES MAXIMUM, « EXPONENTIEL », qui fait
comprendre l'exponentialité de l'IA en une image choc, la prouve avec une vraie mesure, et finit sur
un doute d'enquêteur. Le héros est notre robot détective, en 2D, qui traverse à toute vitesse des
décors 3D faits dans Blender. L'énergie visée est celle de notre bande-annonce PARANO-IA : ça ne
s'arrête jamais, chaque phrase change de monde, et les arrière-plans vivent.

=== À LIRE AVANT TOUT (dans cet ordre) ===
1. CLAUDE.md (les règles du dépôt).
2. exponentiel/SCRIPT.md : le texte exact de la voix, les sous-titres, les sources ligne par ligne.
   On ne dit RIEN qui n'y figure pas.
3. exponentiel/BRIEF.md : l'ORDRE de fabrication (voix → timings → animatique → 3D → robot →
   bruitages → musique → mixage), le découpage, la liste des bruitages, le budget, les 5 validations.
   Suis-le à la lettre.
4. planche/ (Main.html, Expressions.html, robot_defs.svg) : le robot officiel.
5. git show b439b9a:CLAUDE.md : les notes complètes des vidéos précédentes (moteur de rendu SVG image
   par image, chaîne voix, mixage). Puis restaure le code :
   git checkout b439b9a -- parano-ia reel-la-source

=== RÈGLES NON NÉGOCIABLES ===
- 30 s maximum, carton final compris. Mieux vaut 28 s qui claquent que 31 s.
- Le robot n'est JAMAIS redessiné : pièces de planche/robot_defs.svg, rig makeRobot/poseRobot/ARMS/
  FACES de parano-ia/core.js. Tu peux ajouter une pose de bras (ex. « rope » : deux mains sur la
  corde), jamais de nouvelle pièce. Expressions : uniquement celles de planche/Expressions.html.
- Vérité : chaque chiffre à l'écran ou dans la voix vient de SCRIPT.md §3, et tu ouvres chaque source
  avant de générer la voix (étape 1 du brief). Petite mention de source à l'écran sous chaque
  chiffre (ex. « METR, 2025 »), en IBM Plex Mono, lisible mais discrète.
- Emblèmes des IA : des évocations seulement, jamais les logos exacts, ni aucune marque de voiture.
  Le labo s'appelle « OpenIA » (comme dans la bande-annonce), le robotaxi n'a aucun logo.
- media/ et out/ ne vont JAMAIS dans Git (dépôt public). Seuls le code et les scripts Blender y vont.
- ElevenLabs : estimate_only avant chaque génération, annonce le coût, n'en gaspille aucun. Voix
  « Sébas - French Storyteller » (voice_id 5jCmrHdxbpU36l1wb3Ke), modèle eleven_v3.
- Pas d'emojis qui font « IA ». Polices du projet : Fredoka, Space Grotesk, IBM Plex Mono.
- Aléatoire à graines fixes : rendu reproductible image par image.
- Tu t'arrêtes à chaque validation du brief et tu m'envoies le fichier (MP3, planche contact,
  vidéo). On itère ensemble.

=== LE CONCEPT : « LE FIL VERT » ===
La courbe exponentielle est un OBJET PHYSIQUE, un fil néon vert #4DFF8F (le vert des yeux du robot et
de la miniature), présent dans chaque décor. Il sert de raccord d'un monde à l'autre :
mètre ruban au sol de l'open space → trace de vitesse du fauteuil → fil qui fait le tour de la Terre
→ corde de rappel → marquage au sol de la route → la route elle-même, qui se cabre en exponentielle →
le bord du nénuphar qui double sur l'étang → le graphique néon du carton final (celui de la miniature).
Chaque transition est un raccord sur ce fil (match cut) ou un panoramique fouetté dans son axe.
C'est notre signature : on doit pouvoir suivre la courbe du début à la fin, sans coupure.

=== LE LOOK : PAPIER DÉCOUPÉ DANS UN MONDE 3D ===
- Décors en 3D stylisée Blender (EEVEE) : ombrage cartoon à 2 ou 3 tons, contours Line Art couleur
  encre #1B1620 de la même épaisseur que le trait du robot, halos néon, brume, flou de mouvement.
  Palette : nuit bleu profond, néons verts, touches de jaune chaud #FFD23C (lampes, phares, soleil
  couchant). Références : Spider-Verse pour l'énergie et les cadrages, Roger Rabbit pour le mélange
  2D/3D, Paper Mario pour les gags de personnage plat.
- Le robot reste 2D vectoriel, net, avec son ombre portée projetée sur la 3D. Il SUIT la 3D grâce à
  l'Empty ROBOT_ANCHOR exporté image par image (voir BRIEF §5). Les objets de la passe « fg »
  passent devant lui : il est DANS le décor, pas collé dessus.
- Un seul gag assumé « papier » : quand le fauteuil tourne, le robot pivote comme une feuille (il
  devient un trait de profil, puis revient de face), façon Paper Mario.
- Caméra jamais fixe plus d'1,5 s : travellings, grands angles en contre-plongée, zooms éclair sur
  les chiffres, secousses sur les impacts, ralenti de 0,4 s sur la vitre (image seulement, la voix
  continue), panoramiques fouettés sur les temps forts de la musique (118 BPM).
- Les arrière-plans VIVENT, dans chaque plan : figurants (makePerson de core.js, en cartes 2D posées
  dans la 3D, ou silhouettes 3D simples), écrans qui défilent, lumières qui clignotent, véhicules,
  brume qui avance, oiseaux. Rien de mort, jamais de fond blanc.

=== PLAN PAR PLAN (instants indicatifs, recalés sur la vraie voix via exponentiel/timing.json) ===

P1 · 0,0-2,1 s · « Faites trente pas : trente mètres. »
Open space du labo « OpenIA », la nuit, au dernier étage d'une tour de verre de San Francisco. Derrière
la baie vitrée : la baie, les lumières du Bay Bridge qui scintillent, le brouillard qui roule. Dans la
salle : des bureaux, des silhouettes qui tapent, un grand écran avec une courbe d'apprentissage, une
baie de serveurs aux diodes qui clignotent, un aspirateur robot qui passe, la vapeur d'un café. Un
motif de nœud stylisé gravé sur un mur (évocation, pas le logo). Le robot, sur un fauteuil de bureau
3D, tourne sur lui-même (gag papier), s'arrête face caméra, expression « curieux ». Il roule
lentement le long d'un mètre ruban vert collé au sol : 1 m, 2 m, 3 m… jusqu'à 30 m. Plan large et
posé, linéaire, presque ennuyeux, musique retenue. C'est volontaire : ça prépare le contraste.
Texte à l'écran : un petit compteur « 30 m ».

P2 · 2,1-5,8 s · « Trente pas qui doublent… vingt-six fois le tour de la Terre. »
Il pose les pieds au sol et pousse. À chaque poussée, la distance double : gros compteur qui pop
« ×2, ×4, ×8, ×16… » (Space Grotesk, vert), un tick qui monte d'une octave à chaque fois. Le fauteuil
fuse dans le couloir, les feuilles s'envolent, les figurants se retournent, la caméra le suit en
travelling arrière de plus en plus vite, avec des traînées de vitesse. Sur « vingt-six » : le
fauteuil TRAVERSE LA BAIE VITRÉE. Ralenti de 0,4 s, éclats de verre en passe fg qui volent vers la
caméra, drop de la musique. Coupe éclair de 0,6 s sur « tour de la Terre » : la Terre vue de
l'espace, le fil vert s'enroule autour, 26 tours en accéléré, compteur « 1 000 000 000 m ».
Expression : « surpris ».

P3 · 5,8-7,0 s · « L'IA, c'est pareil. »
Retour à la chute le long de la façade. Le fauteuil tombe hors champ, le robot attrape le fil vert,
qui devient une corde tendue depuis le toit, et descend en rappel en trois grands bonds contre la
vitre. Dans les étages qui défilent : un labo différent à chaque étage, évoqué par son emblème
(étincelle, baleine, astérisque… comme les suspects de la bande-annonce), des gens qui lèvent la tête,
un pigeon qui s'envole, la nacelle d'un laveur de vitres. Pose de bras « rope », chapeau qui tient
de justesse.

P4 · 7,0-12,6 s · « En 2019, elle réussissait, une fois sur deux, des tâches qu'un expert fait en
trois secondes. »
Il lâche la corde et atterrit sur le toit d'un robotaxi blanc arrêté au feu. Le toit s'enfonce, le
dôme de capteurs se fissure, les suspensions rebondissent, l'alarme fait « bip-bip ». Écrasement et
étirement sur le robot, étoiles de choc. Le robotaxi démarre LENTEMENT dans une rue en pente de San
Francisco : cable car qui sonne, passants qui filment avec leur téléphone, vapeur qui sort d'une
bouche d'égout, autres robotaxis. Premier panneau routier 3D qui passe : « 2019 · 3 s », sous-titré
« 1 fois sur 2 · METR ». Le fil vert est maintenant la ligne au milieu de la chaussée. Expression :
« sceptique », accroupi sur le toit, une main sur le chapeau.

P5 · 12,6-14,6 s · « Six ans plus tard : une heure. »
Bretelle d'autoroute, la vitesse monte, le moteur électrique monte d'une octave. Au loin, des data
centers aux ventilateurs qui tournent, des lignes à haute tension qui bourdonnent. Panneau
« 2025 · 1 h ». Les panneaux passent de plus en plus vite : la distance entre eux raccourcit à vue
d'œil. Le robot se lève sur le toit, expression « curieux ».

P6 · 14,6-17,6 s · « Treize mois plus tard… au moins seize heures. »
LA ROUTE SE CABRE : le ruban d'asphalte suit la courbe y = 2^x, glissières néon vertes, et monte
presque à la verticale vers les étoiles. Boost, plan débullé, zoom éclair, secousses, montée et
« braaam ». Panneau « 2026 · 16 h+ » qui file. Gag du détective : il déroule son mètre ruban pour
mesurer, et le ruban arrive au bout (clin d'œil à METR : leur règle ne mesure pas plus loin).
Expression : « surpris », puis bras « cheer ».

P7 · 17,6-23,4 s · « Le piège : un nénuphar qui double chaque jour couvre l'étang le trentième
jour. La veille ? À moitié. »
La route s'arrête net en haut de la courbe (elle crève le haut du cadre, comme sur la miniature) : le
moteur se coupe, le robotaxi s'envole dans le silence, bascule, traverse les nuages… et atterrit sur
une FEUILLE DE NÉNUPHAR GÉANTE, au milieu d'un étang sous la lune. Gros plouf, gerbe d'eau en passe
fg, la feuille s'enfonce puis remonte : c'est l'écho inversé du toit enfoncé du P4. Vie autour :
lucioles vertes, grenouilles qui sautent de feuille en feuille, roseaux qui ondulent, reflet de la
lune qui tremble, un héron qui s'envole, brume au ras de l'eau. Plan de drone qui monte : les
feuilles doublent à chaque temps de la musique (1, 2, 4, 8…), un « pop » d'eau à chaque fois, et le
fil vert trace le bord de la zone couverte. Panneau en bois planté dans les roseaux : « JOUR 30 » et
l'étang est plein ; sur « La veille ? », le panneau pivote : « JOUR 29 », l'étang n'est couvert qu'à
moitié (le robotaxi et le robot sont pile sur la frontière). Expression : « surpris », puis
« perplexe », loupe levée vers le panneau.

P8 · 23,4-25,8 s · « Alors l'IA… on est à quel jour ? »
Gros plan : la loupe devant l'œil vert, énorme dans la lentille (comme dans la bande-annonce). Dans
la lentille se reflète le panneau « JOUR ?? », dont les chiffres tournent comme un compteur. La
musique se coupe, silence, un tic-tac. Derrière lui, l'eau libre qui reste. On ne répond pas.
Expression : « sceptique ».

P9 · 25,8-29,5 s · « Affaire à suivre. »
Ouverture en iris depuis la loupe, vers le carton titre au look de la miniature (graphique néon de
reel-la-source/miniature.js, --theme expo) : le fil vert devient la courbe qui double à chaque pas
(×2 … ×64) face à la droite « linéaire » en pointillés, et crève le haut du cadre. « EXPONENTIEL »
avec des lettres qui grandissent de façon exponentielle, puis « L'IA SOUS ENQUÊTE ». Coup de chapeau
(bras « hat »), bouton S'ABONNER cliqué, accord final pile sur le chapeau.

=== SON ===
Suis la table des bruitages du brief (S01 à S13). Idée clé : l'exponentielle s'entend. Chaque
doublement monte d'une octave (ticks du P2, moteur du P4 au P6). En haut de la courbe, le moteur
se coupe net (envol dans le silence), plouf, puis la nature de l'étang ; chaque doublement du nénuphar
fait un « pop » d'eau, lui aussi une octave au-dessus. Tout tombe dans le silence sur « on est à quel
jour ? ». Voix toujours devant ; bruitages 8 à 10 dB
dessous et en sidechain ; musique (media/music2/GROOVE, 118 BPM) de 18 à 23 dB sous la voix, drop
sur la vitre. Sortie à -14 LUFS.

=== BLENDER : COMMENT T'Y PRENDRE ===
- Si le serveur MCP Blender est connecté, sers-t'en pour construire et prévisualiser en direct
  (captures du viewport pour me montrer). Mais écris TOUJOURS le décor final dans un script
  exponentiel/blender/Pxx_nom.py rejouable sans interface (blender -b -P), pour que le rendu soit
  reproductible.
- Un décor par script, des caméras animées sur exponentiel/timing.json. Trois sorties par plan :
  bg, fg (fond transparent, ce qui passe devant le robot) et anchor.json (voir BRIEF §5).
- Procédural d'abord (volumes biseautés, instances). Sinon, uniquement du CC0 (Poly Haven,
  ambientCG), rangé dans media/. Brisure de la vitre : fracture en cellules ou éclats en
  particules. Toit enfoncé : shape key déclenchée à l'image de l'impact.
- Aperçus à 25 % puis 50 % de la résolution avant le rendu final. Vise moins de 3 s par image en
  1080×1920.

=== MÉTHODE ===
Suis BRIEF.md étape par étape. Après chaque étape : un commit du code (jamais media/out), un message
court pour me dire où on en est, et aux 5 validations tu t'arrêtes et tu m'envoies le fichier à
regarder. Si une idée de ce prompt ne marche pas techniquement, propose mieux, mais ne rallonge
jamais la vidéo et ne touche jamais au texte sans mon accord. À la fin, mets CLAUDE.md à jour
(chaîne exacte, crédits dépensés) et livre out/EXPONENTIEL-reel.mp4 avec la légende de SCRIPT.md §5.
```
