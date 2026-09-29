# EXPONENTIEL — méga prompt pour Claude Code (Terminal)

**Mode d'emploi :** ouvre Terminal à la racine du dépôt `carte-menu` (après un `git pull`), ouvre
Blender si tu veux que Claude le pilote en direct, lance `claude`, puis colle tout le bloc ci-dessous.
Version courte, si le dépôt est à jour : « Lis `exponentiel/PROMPT.md` et exécute le prompt qu'il contient. »

---

```text
Tu es le réalisateur, animateur 3D/2D et monteur son du compte Instagram PARANO-IA (slogan : « L'IA
sous enquête »). Mission : fabriquer un Reel de 30 SECONDES MAXIMUM, « EXPONENTIEL », qui fait
comprendre l'exponentialité avec le nénuphar, puis montre le danger (auto-amélioration, alignement), et
finit sur un doute d'enquêteur. Le héros est notre robot détective, en 2D, qui traverse à toute vitesse des
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
  « Hugo - Warm and Grounded » (voice_id IbbR6Av0dWuQJS0b8JVT), modèle eleven_v3, jamais chuchotée.
- Pas d'emojis qui font « IA ». Polices du projet : Fredoka, Space Grotesk, IBM Plex Mono.
- Aléatoire à graines fixes : rendu reproductible image par image.
- Tu t'arrêtes à chaque validation du brief et tu m'envoies le fichier (MP3, planche contact,
  vidéo). On itère ensemble.

=== LE CONCEPT : « LE FIL VERT » ===
La courbe exponentielle est un OBJET PHYSIQUE, un fil néon vert #4DFF8F (le vert des yeux du robot et
de la miniature), présent dans chaque décor. Il sert de raccord d'un monde à l'autre (v2) :
bord de la zone couverte par les nénuphars → piste néon qui se soulève de l'étang → piste qui traverse le labo
→ piste qui se cabre à la verticale → rail vert de l'aiguillage → graphique néon du carton final.
Chaque transition est un raccord sur ce fil (match cut) ou un panoramique fouetté dans son axe.

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

=== PLAN PAR PLAN v2 (instants réels de la voix Hugo, exponentiel/timing.json) ===

P1 · 0,00-4,81 s · « Un nénuphar double chaque jour. Le trentième jour, il couvre tout l'étang. »
Étang sous la lune, brume au ras de l'eau, roseaux, lucioles vertes. Le robot, assis dans une petite
barque de bois, expression « curieux », loupe à la main. Panneau en bois planté dans les roseaux : « JOUR n »
qui défile (1 → 20 en éclair, puis un jour par demi-temps de musique, keys.doublements_P1). Vue de drone qui
monte : les feuilles doublent, un « pop » d'eau à chaque fois, et le FIL VERT trace le bord de la zone
couverte. Jusqu'au jour 20 on ne voit rien ; puis tout s'emballe. Sur « trentième jour » (keys.jour30) :
l'étang est plein, la barque est soulevée par les feuilles, grenouille qui saute. Expression « surpris ».

P2 · 4,81-7,65 s · « La veille ? La moitié. Cinq jours avant ? Trois pour cent. »
Effet de rembobinage (image qui recule, lignes de magnétoscope). Le panneau pivote : « JOUR 29 », l'étang
n'est couvert qu'à moitié, la barque pile sur la frontière (fil vert). Gros chiffre « 50 % ». Puis
rembobinage plus fort sur « cinq jours avant » : « JOUR 25 », une petite tache dans un coin, « 3 % ».
Le robot lève sa loupe vers la tache minuscule, expression « perplexe ».

P3 · 7,65-11,89 s · « L'IA suit cette courbe : tous les quatre mois, elle réussit des tâches deux fois plus longues. »
Sur « courbe » (keys.courbe) : le fil vert se SOULÈVE de l'eau et devient une piste néon qui file vers le
ciel, en forme d'exponentielle. Le robot saute sur une feuille de nénuphar et surfe dessus (gag papier). Des
panneaux 3D défilent le long de la piste : « 2019 · 3 s », « 2025 · 1 h », « 2026 · 16 h+ » (petite source
« METR » dessous). La vitesse augmente à chaque panneau, la piste reste presque plate puis commence à monter.

P4 · 11,89-15,89 s · « Et elle commence à faire sa propre recherche : c'est l'auto-amélioration. »
La piste plonge dans une tour de verre de labo « OpenIA » (motif de nœud stylisé, jamais le logo). Salle de
serveurs la nuit : des bras robotisés assemblent un nouveau bras qui en assemble un autre ; des écrans
montrent du code qui écrit du code, et chaque écran contient un écran plus petit (effet miroir infini).
Sur « auto-amélioration » (keys.auto) : zoom éclair dans la mise en abyme. Robot « sceptique ».

P5 · 15,89-19,41 s · « Un doublement pourrait alors prendre quelques semaines… voire une seule. »
La piste ressort par le toit et se cabre. Un calendrier géant dont les pages s'arrachent de plus en plus vite
(« 4 mois » → « quelques semaines »), petite mention « hypothèse · Forethought ». Sur « une seule »
(keys.une_seule) : la piste part à la verticale, boost, secousses, « 1 semaine ? » ; le robot tient son
chapeau, expression « surpris », bras « cheer ».

P6 · 19,41-24,73 s · « Et l'alignement ? Qui garantit qu'elle fera encore ce qu'on veut ? Même OpenAI admet ne pas encore savoir. »
En haut, la piste se sépare en deux rails à un AIGUILLAGE : un rail blanc en pointillés « ce qu'on veut », et
le rail vert qui s'en écarte. Le robot se suspend au levier « ALIGNEMENT » pour le basculer : le levier
résiste. Sur « Même OpenAI » (keys.openai) : une petite fiche d'enquête s'épingle à l'écran, « pas encore »
de méthode sûre, source « OpenAI, sept. 2026 ». Expression « sceptique ».

P7 · 24,73-26,13 s · « Alors… on est à quel jour ? »
Retour à l'étang, calme. Gros plan : la loupe devant l'œil vert ; dans la lentille, le panneau « JOUR ?? »
dont les chiffres tournent. Musique coupée, silence, tic-tac. On ne répond pas.

P8 · 26,13-29,00 s · « Affaire à suivre. »
Ouverture en iris depuis la loupe vers le carton titre (look de la miniature, graphique néon de
reel-la-source/miniature.js) : le fil vert devient la courbe qui double à chaque pas face à la droite
« linéaire » en pointillés. « EXPONENTIEL », lettres qui grandissent en exponentielle, puis « L'IA SOUS
ENQUÊTE ». Coup de chapeau (bras « hat »), bouton S'ABONNER cliqué, accord final.

=== SON ===
Suis la table des bruitages du brief. Idée clé : l'exponentielle s'entend. Chaque doublement du nénuphar
fait un « pop » d'eau une octave au-dessus ; la piste (P3 à P5) a un souffle qui monte d'une octave à chaque
panneau. Rembobinage audible au P2. Tout tombe dans le silence sur « on est à quel jour ? ». Voix toujours
devant ; bruitages 8 à 10 dB dessous et en sidechain ; musique (media/music2/GROOVE, 118 BPM) de 18 à 23 dB
sous la voix. Sortie à -14 LUFS.

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
