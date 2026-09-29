# EXPONENTIEL — script voix (Reel PARANO-IA, 30 s), version 2

> Rédigé le 2026-09-29, **v2 validée par l'utilisateur le même jour** (la v1 « 30 pas / METR » a été
> refusée : trop de chiffres, voix Sébas qui chuchotait mal). Compte PARANO-IA, « L'IA sous enquête ».
> Voix : ElevenLabs **« Hugo - Warm and Grounded »** (voice_id `IbbR6Av0dWuQJS0b8JVT`), `eleven_v3`, celle de
> LA SOURCE. **Aucun chuchotement** : ton dynamique jusqu'au bout.
> Prise : `media/voix_ia/exponentiel_hugo.mp3` (36,88 s brute, 580 crédits, flow
> https://elevenlabs.io/app/flows/my2I2EZxu63yKmSuJ8Hr) → `place_voix.py` → voix finie à 26,6 s.

L'idée : **le nénuphar suffit à faire comprendre l'exponentielle** (on ne voit rien venir avant la toute
fin). Puis le danger propre à l'IA : si elle fait elle-même la recherche en IA (**auto-amélioration**),
les doublements peuvent s'accélérer, et personne ne sait encore garantir l'**alignement**. On finit sur une
question d'enquêteur, sans rien affirmer.

---

## 1. Texte envoyé à ElevenLabs (tel quel, balises comprises)

```
[excited] Un nénuphar double chaque jour. Le trentième jour, il couvre tout l'étang.
La veille ? La moitié. Cinq jours avant ? Trois pour cent.
[serious] L'IA suit cette courbe : tous les quatre mois, elle réussit des tâches deux fois plus longues.
[excited] Et elle commence à faire sa propre recherche : c'est l'auto-amélioration. Un doublement pourrait alors prendre quelques semaines… voire une seule.
[serious] Et l'alignement ? Qui garantit qu'elle fera encore ce qu'on veut ? Même OpenAI admet ne pas encore savoir.
[intrigued] Alors… on est à quel jour ? Affaire à suivre.
```

## 2. Texte des sous-titres (chiffres en chiffres, mots-clés entre astérisques = en vert)

```
Un nénuphar *double* chaque jour.
Le *30e jour*, il couvre tout l'étang.
La veille ? *La moitié*.
5 jours avant ? *3 %*.
L'IA suit cette *courbe* :
tous les 4 mois, des tâches *2 fois plus longues*.
Et elle commence à faire sa propre recherche :
c'est l'*auto-amélioration*.
Un doublement pourrait prendre *quelques semaines*…
voire *une seule*.
Et l'*alignement* ?
Qui garantit qu'elle fera encore ce qu'on veut ?
Même OpenAI admet *ne pas encore savoir*.
L'*alignement*, c'est faire en sorte
qu'une IA veuille *vraiment* ce qu'on veut.
Problème : on ne lui écrit pas ses objectifs,
on la *récompense* quand elle réussit des tests.
Alors elle peut apprendre à décrocher la récompense…
*sans faire ce qu'on voulait*.
Comme un élève qui *triche* au lieu d'apprendre.
L'alignement, on lui consacre bientôt
une *vidéo entière*.
Affaire à suivre.
```

## 3. Vérification ligne par ligne (vérifiée le 2026-09-29)

| Ce qu'on dit | Ce que dit la source | Source |
|---|---|---|
| Le nénuphar qui double chaque jour couvre l'étang le 30e jour ; la veille, la moitié ; 5 jours avant, 3 % | Devinette française classique, citée par le rapport du Club de Rome *Les Limites à la croissance* (Meadows et al., 1972). Calcul : 2⁻¹ = 50 % le 29e jour ; 2⁻⁵ = 1/32 ≈ 3,1 % le 25e jour. | [« Consider the Lilypads », Reality Studies](https://www.realitystudies.co/p/consider-the-lilypads) · [Club de Rome](https://www.clubofrome.org/publication/the-limits-to-growth/) · [l'énigme en français](https://jeretiens.net/enigme-nenuphar-etang-combien-jours/) |
| Tous les 4 mois, elle réussit des tâches 2 fois plus longues | METR mesure la durée (temps d'un expert humain) des tâches que l'IA réussit **une fois sur deux**. Depuis 2023 : doublement tous les 130,8 jours (TH1.1), ≈ 4,3 mois. Données : GPT-2 (2019) 3 s, Claude 3.7 Sonnet (2025) 1 h, Claude Mythos Preview (avril 2026) 17,4 h (8,5 à 55 h). | [METR, Time Horizon 1.1](https://metr.org/blog/2026-1-29-time-horizon-1-1/) · [tableau de bord](https://metr.org/time-horizons/) · données `metr.org/assets/benchmark_results_1_1.yaml` |
| Elle commence à faire sa propre recherche : l'auto-amélioration | OpenAI annonce le 6 septembre 2026 son « stagiaire de recherche automatisé » (tâches de recherche bien définies, sous direction humaine, de quelques jours pour un chercheur) ; objectif : un chercheur en IA automatisé d'ici mars 2028. En anglais : *recursive self-improvement* (RSI). | [Engadget, sept. 2026](https://www.engadget.com/2251859/openai-says-it-reached-its-goal-of-creating-an-automated-research-intern/) · [TechCrunch, oct. 2025](https://techcrunch.com/2025/10/28/sam-altman-says-openai-will-have-a-legitimate-ai-researcher-by-2028/) · [Sam Altman sur X](https://x.com/sama/status/1983584366547829073) |
| Un doublement pourrait alors prendre quelques semaines… voire une seule | **Hypothèse** (d'où le conditionnel) : une fois la recherche en IA entièrement automatisée, les progrès logiciels iraient de 2 à 32 fois plus vite (médiane ×8). Au rythme actuel (quelques mois par doublement), ×8 → quelques semaines, ×32 → environ une semaine. | [Forethought, « How quick and big would a software intelligence explosion be? », 2025](https://www.forethought.org/research/how-quick-and-big-would-a-software-intelligence-explosion-be) |
| Même OpenAI admet ne pas encore savoir (garantir qu'elle fera ce qu'on veut) | OpenAI, septembre 2026 : l'entreprise « ne sait pas encore comment aller sans danger jusqu'à une auto-amélioration complète et alignée » (*does not yet know how to safely get all the way to aligned, full RSI*). Son directeur scientifique Jakub Pachocki alerte sur l'alignement et la surveillance. | [Fortune, 19 sept. 2026](https://fortune.com/2026/09/19/what-is-self-improvement-rsi-full-autonomy-openai-anthropic-xai/) (le lien Fortune du 8 sept. cité avant renvoie une erreur 404) · publications OpenAI de septembre 2026, probablement [« Research acceleration: The view inside OpenAI »](https://openai.com/index/research-acceleration-view-inside-openai/) ou [« Building standards for the next phase of AI »](https://openai.com/index/building-standards-next-phase-ai/) (non vérifié : OpenAI bloque la lecture automatique) · [Help Net Security, 7 sept. 2026](https://www.helpnetsecurity.com/2026/09/07/openai-research-automation-intern/) |
| Alors… on est à quel jour ? | Une question, pas une affirmation : on ne dit jamais « on est au 29e jour ». | — |

**Garde-fous :**

- Le « temps » METR n'est **pas** la durée pendant laquelle l'IA travaille seule, mais le temps qu'y
  passerait un expert humain ([METR, janvier 2026](https://metr.org/notes/2026-01-22-time-horizon-limitations/)).
  D'où « des tâches deux fois plus longues ». Surtout programmation, ML et cybersécurité.
- « Une semaine » est le haut d'une fourchette **spéculative** (Forethought le dit lui-même) : toujours au
  conditionnel, à l'écran « hypothèse ».
- L'emblème d'OpenAI n'apparaît jamais à l'écran : on évoque, on ne reproduit pas de logo.

## 4. Réserve de faits vérifiés (pour la légende, les commentaires ou une vidéo suivante)

Non utilisés dans les 30 s, mais sourcés :

- **Coût** : faire tourner une IA du niveau du ChatGPT de 2022 (GPT-3.5) coûtait 20 $ par million de
  tokens en novembre 2022, et 0,07 $ en octobre 2024 : **÷280 en moins de deux ans**.
  [Stanford AI Index 2025](https://hai.stanford.edu/ai-index/2025-ai-index-report)
- « Le coût d'un niveau d'IA donné est divisé par ~10 tous les 12 mois. »
  [Sam Altman, « Three Observations », février 2025](https://blog.samaltman.com/three-observations)
  (un patron qui parle de son secteur : à citer comme une déclaration, pas comme une mesure).
- Selon la tâche, les prix d'inférence baissent de 9× à 900× par an.
  [Epoch AI, mars 2025](https://epoch.ai/data-insights/llm-inference-price-trends)
- **Calcul** : la puissance de calcul utilisée pour entraîner les modèles de pointe est multipliée par
  4 à 5 chaque année (2010-2024).
  [Epoch AI](https://epoch.ai/publications/training-compute-of-frontier-ai-models-grows-by-4-5x-per-year)
- **Algorithmes** : pour atteindre le même niveau, il faut deux fois moins de calcul tous les ~8 mois
  (intervalle de 5 à 14 mois). [Epoch AI, 2024](https://epoch.ai/blog/algorithmic-progress-in-language-models)
  C'est le vrai « ce n'est pas juste du ×2 » : plusieurs exponentielles se multiplient entre elles.
- **Adoption** : 100 millions d'utilisateurs mensuels pour ChatGPT en deux mois, un record à
  l'époque ([UBS, via Reuters, février 2023](https://finance.yahoo.com/news/chatgpt-sets-record-fastest-growing-190911828.html)).
  1 milliard d'utilisateurs **par semaine** annoncé le 6 août 2026
  ([presse](https://tech.yahoo.com/ai/chatgpt/articles/chatgpt-tops-1b-weekly-users-191537749.html) ;
  à confirmer sur une source OpenAI avant de le citer).
- **Les limites** (les freins possibles) : le stock de textes humains publics utilisables (~300 000 milliards
  de tokens) serait épuisé entre 2026 et 2032
  ([Epoch AI](https://epoch.ai/publications/will-we-run-out-of-data-limits-of-llm-scaling-based-on-human-generated-data)).
  Les plus gros entraînements pourraient demander de 4 à 16 GW en 2030
  ([Epoch AI](https://epoch.ai/blog/power-demands-of-frontier-ai-training)).
- **Ceux qui y croient** : Dario Amodei (Anthropic), en février 2026 : « We are near the end of the
  exponential », au sens de « on arrive au bout », des IA au niveau des meilleurs humains, pas d'un
  ralentissement ([Dwarkesh Podcast](https://www.dwarkesh.com/p/dario-amodei-2)). C'est un patron de
  labo qui parle de son secteur : à citer comme une déclaration, pas comme une mesure.
- **Métaphores classiques** :
  - Albert Bartlett, physicien, 1976 : « La plus grande faiblesse de l'humanité, c'est notre
    incapacité à comprendre la fonction exponentielle. »
    ([Quote Investigator](https://quoteinvestigator.com/2021/02/01/understand-exponential/)).
  - Le bocal de Bartlett : des bactéries doublent chaque minute et remplissent le bocal à midi. À
    11 h 58, il n'est plein qu'au quart ; à 11 h 59, à moitié. Trouver trois nouveaux bocaux ne fait
    gagner que deux minutes.
  - Le nénuphar qui couvre l'étang en 30 jours n'en couvre que la moitié le 29e jour.
  - L'échiquier de Sissa : 2⁶⁴ − 1 grains, soit environ 1 200 milliards de tonnes de blé
    ([Wikipédia](https://en.wikipedia.org/wiki/Wheat_and_chessboard_problem)).
  - Le lac Michigan qu'on remplit en doublant tous les 18 mois : 70 ans sans que rien ne se voie,
    puis tout se remplit en 15 ans
    ([Kevin Drum, Mother Jones, 2013](https://www.motherjones.com/media/2013/05/robots-artificial-intelligence-jobs-automation/)).

## 5. Proposition de légende Instagram

```
Un nénuphar double chaque jour. Le 30e jour, il couvre l'étang. La veille ? La moitié.
Cinq jours avant ? 3 %. Sur une exponentielle, on ne voit rien venir… jusqu'à la fin.

L'IA double tous les ~4 mois. Et si elle se mettait à faire sa propre recherche ?

Sources :
- Devinette du nénuphar, citée dans « Les Limites à la croissance » (Club de Rome, 1972)
- METR, Time Horizon 1.1 (janvier 2026) et tableau de bord (mai 2026)
- OpenAI, « automated research intern » (septembre 2026), via Engadget et Fortune
- Forethought, « How quick and big would a software intelligence explosion be? » (2025) : hypothèse

L'IA sous enquête. Affaire à suivre.
#IA #intelligenceartificielle #exponentiel #alignement #tech
```
