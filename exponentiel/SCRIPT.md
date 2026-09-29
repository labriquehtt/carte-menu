# EXPONENTIEL — script voix (Reel PARANO-IA, 30 s)

> Rédigé le 2026-09-29. Compte PARANO-IA, « L'IA sous enquête ».
> Voix : ElevenLabs « Sébas - French Storyteller » (voice_id `5jCmrHdxbpU36l1wb3Ke`), modèle `eleven_v3`,
> la même que pour la dernière version de LA SOURCE.
> Durée visée : **28 à 30 s** au total, carton final compris. Environ 72 mots.

L'idée en une phrase : **une exponentielle, ce n'est pas « juste du ×2 »** (la promesse de la miniature
EXPONENTIEL). Le principe s'explique avec une image connue, on le prouve avec la mesure la plus citée
du moment, puis on finit sur un doute sérieux, pour rester dans le ton « enquête ».

---

## 1. Texte à envoyer à ElevenLabs (tel quel, balises comprises)

Les nombres sont écrits en lettres pour que la voix les lise correctement.

```
[excited] Faites trente pas : trente mètres.
[mischievously] Trente pas qui doublent… vingt-six fois le tour de la Terre.

[intrigued] L'IA, c'est pareil. En deux mille dix-neuf, elle réussissait, une fois sur deux, des tâches informatiques qu'un expert boucle en deux secondes.
Six ans plus tard : des tâches d'une heure.
[excited] Treize mois plus tard… au moins seize heures.

[serious] Mais pour Yann LeCun, toute exponentielle finit par plafonner.
[whispers] La vraie question… c'est quand ?

Affaire à suivre.
```

Environ 480 caractères, donc **à peu près 480 crédits par prise** (1 crédit ≈ 1 caractère avec eleven_v3).
Toujours lancer `estimate_only` avant de générer.

## 2. Texte des sous-titres (chiffres en chiffres, mots-clés entre astérisques = en vert)

```
Faites 30 pas : *30 mètres*.
30 pas qui *doublent*…
*26 fois* le tour de la Terre.
L'IA, c'est pareil.
En 2019, elle réussissait, 1 fois sur 2,
des tâches qu'un expert boucle en *2 secondes*.
6 ans plus tard : *1 heure*.
13 mois plus tard… *16 heures*.
Mais pour Yann LeCun,
toute exponentielle finit par *plafonner*.
La vraie question… c'est *quand* ?
Affaire à suivre.
```

## 3. Vérification ligne par ligne (d'où vient chaque affirmation)

| Ce qu'on dit | Ce que dit la source | Source |
|---|---|---|
| 30 pas = 30 m ; 30 pas qui doublent = 26 fois le tour de la Terre | Image popularisée par Ray Kurzweil et Peter Diamandis (Singularity University) : « 30 pas linéaires = 30 ; 30 pas exponentiels = un milliard ». Calcul : 1 + 2 + 4 + … + 2²⁹ = 2³⁰ − 1 ≈ 1,07 milliard de mètres ; ÷ 40 075 km (tour de la Terre) ≈ 26,8 tours. | [Diamandis, « What does exponential growth feel like? »](https://www.diamandis.com/blog/what-does-exponential-growth-feel-like) · [Singularity Hub, 2016](https://singularityhub.com/2016/04/05/how-to-think-exponentially-and-better-predict-the-future/) |
| En 2019, l'IA réussissait une fois sur deux des tâches de 2 secondes | METR mesure la **durée des tâches** (temps qu'y passe un expert humain) que l'IA réussit **une fois sur deux** : GPT-2 (février 2019) ≈ 2 s. | [METR, « Measuring AI Ability to Complete Long Tasks », mars 2025](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) · [article arXiv 2503.14499](https://arxiv.org/abs/2503.14499) |
| 6 ans plus tard : des tâches d'une heure | Claude 3.7 Sonnet (février 2025) ≈ 59 min, en tête à la publication. Tendance 2019-2025 : ça double environ tous les 7 mois. | même étude METR |
| 13 mois plus tard : au moins 16 heures | METR a évalué une première version de Claude Mythos Preview (Anthropic, accès restreint) en mars 2026 : au moins 16 h (intervalle de confiance à 95 % : 8,5 h à 55 h), « à la limite de ce qu'on peut mesurer sans nouvelles tâches ». Publié le 8 mai 2026. | [METR sur X, 8 mai 2026](https://x.com/METR_Evals/status/2052896621760004602) · [tableau de bord METR](https://metr.org/time-horizons/) |
| (ne pas le dire, mais c'est ce qui rend « exponentiel » juste) | Mise à jour Time Horizon 1.1 (29 janvier 2026) : depuis 2023, doublement tous les ~4,3 mois (130,8 jours). | [METR, Time Horizon 1.1](https://metr.org/blog/2026-1-29-time-horizon-1-1/) |
| Pour Yann LeCun, toute exponentielle finit par plafonner | « The beginning of a sigmoid looks like an exponential. […] every single exponential trend eventually passes an inflection point and saturates into a sigmoid. » | [Yann LeCun sur X, juin 2024](https://x.com/ylecun/status/1799064075487572133) |

**Garde-fous, pour ne pas mentir :**

- Le « temps » METR n'est **pas** la durée pendant laquelle l'IA travaille seule. C'est la durée
  qu'il faudrait à un expert humain pour faire la tâche, que l'IA réussit une fois sur deux. D'où la
  formule « des tâches qu'un expert boucle en… ». METR insiste là-dessus :
  [« Clarifying limitations of time horizon », janvier 2026](https://metr.org/notes/2026-01-22-time-horizon-limitations/).
  Ce sont surtout des tâches de programmation, de machine learning et de cybersécurité.
- « Au moins 16 h » est une estimation très incertaine (8,5 h à 55 h). METR dit lui-même que sa
  règle est trop courte pour mesurer plus loin. Ça peut faire un clin d'œil visuel (le mètre ruban du
  détective arrive au bout), mais on ne dit jamais « l'IA travaille 16 h d'affilée ».
- **Solution de repli** si l'on préfère un modèle public : GPT-5.6 Sol, évalué par METR à
  ~11,3 h (intervalle de 5 h à 40 h), le 26 juin 2026
  ([METR](https://metr.org/blog/2026-06-26-gpt-5-6-sol/)). La phrase devient alors : « Seize mois plus
  tard… plus de onze heures. »
- **Avant de générer la voix**, rouvrir le [tableau de bord METR](https://metr.org/time-horizons/) :
  si un modèle plus récent (sorti après mai 2026) y dépasse Mythos Preview, mettre la phrase à jour
  et prévenir l'utilisateur.

Ma session cloud n'avait pas accès direct aux sites de METR, d'Epoch AI ni de Stanford (réseau
restreint). Tous les chiffres ci-dessus ont été recoupés sur plusieurs sources indépendantes via la
recherche web. Claude, dans Terminal, doit ouvrir chaque lien et confirmer (étape 1 du brief).

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
- **Les limites** (le camp LeCun) : le stock de textes humains publics utilisables (~300 000 milliards
  de tokens) serait épuisé entre 2026 et 2032
  ([Epoch AI](https://epoch.ai/publications/will-we-run-out-of-data-limits-of-llm-scaling-based-on-human-generated-data)).
  Les plus gros entraînements pourraient demander de 4 à 16 GW en 2030
  ([Epoch AI](https://epoch.ai/blog/power-demands-of-frontier-ai-training)).
- **L'autre camp** : Dario Amodei (Anthropic), en février 2026 : « We are near the end of the
  exponential », au sens de « on arrive au bout », des IA au niveau des meilleurs humains, pas d'un
  ralentissement ([Dwarkesh Podcast](https://www.dwarkesh.com/p/dario-amodei-2)). Belle chute pour
  une vidéo 2 : **deux géants disent « la fin », mais pas la même fin.**
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
30 pas normaux : 30 mètres. 30 pas qui doublent : 26 fois le tour de la Terre.
L'IA avance comme ça… mais jusqu'à quand ?

Sources :
- METR, « Measuring AI Ability to Complete Long Tasks » (2025) et Time Horizon 1.1 (2026)
- METR, évaluation de Claude Mythos Preview (mai 2026)
- Yann LeCun, X (juin 2024)
- Ray Kurzweil / Peter Diamandis, image des 30 pas

L'IA sous enquête. Affaire à suivre.
#IA #intelligenceartificielle #exponentiel #LeCun #tech
```
