# CLAUDE.md

> Mis à jour le : 2026-09-27

Ce dépôt ne contient plus que **la planche du robot détective** (`planche/`, voir `README.md`),
à la demande de l'utilisateur. Ne jamais redessiner le robot : réutiliser les pièces de
`planche/robot_defs.svg`. Source : projet Claude Design « Robot détective — fiche personnage »
https://claude.ai/artifact/Q9zcvFR359NL11zV4FWsZe.

## Anciens projets (retirés du dépôt, récupérables dans l'historique)

Le reel « LA SOURCE » (`reel-la-source/`), la bande-annonce « PARANO-IA » (`parano-ia/`) et les
cartes du restaurant LE NATIONAL (racine) ont été supprimés le 2026-09-27. Leur dernier état est
dans le commit **`b439b9a`** :

```bash
git checkout b439b9a -- reel-la-source parano-ia    # restaurer le code des vidéos
git show b439b9a:CLAUDE.md                          # notes complètes (chaîne de rendu, voix, son)
```

Dernier état de LA SOURCE : narration par la voix ElevenLabs « Sébas - French Storyteller »
(voice_id `5jCmrHdxbpU36l1wb3Ke`), outro avec la vraie voix de l'utilisateur ; livraison
`out/LA-SOURCE-reel-voix-Sebas.mp4`.

## Règles

- `media/` et `out/` ne vont jamais dans Git (dépôt public : dessins de Philippe Delord, photo de
  Yann LeCun, voix de l'utilisateur). Dans une nouvelle session, redemander les fichiers.
- Emblèmes des IA : évocations seulement, jamais les logos exacts.
- ElevenLabs : estimer avant de générer (`estimate_only`), ne pas gaspiller les crédits. Le
  connecteur est lié à un seul compte ; s'il manque de crédits, l'utilisateur le reconnecte sur
  https://claude.ai/customize/connectors.
- Style : pas d'emojis qui font « IA ». Slogan du compte PARANO-IA : « L'IA sous enquête ».
