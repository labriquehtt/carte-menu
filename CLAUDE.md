# CLAUDE.md — LE NATIONAL

> Référence permanente du projet pour Claude Code.
> Mis à jour le : 2026-03-12 (session 2)

---

## 🎯 Vue d'ensemble

Interface web monopage pour **LE NATIONAL**, restaurant fast-food premium. Le site est conçu pour être projeté sur des écrans en salle. Il affiche les cartes menu en images, des visuels animés (vidéos), et une carte interactive avec système de commande et paiement.

**Stack :** HTML/CSS/JS pur · Tailwind CSS CDN · Vanilla JS · Node.js (scripts utilitaires)

---

## 📁 Architecture

```
menu/
├── index.html              # Fichier unique — tout le site (2600+ lignes)
│
├── logo.png                # Logo personnage cartoon (fond supprimé)
│
├── — Images cartes menu fixes —
├── carte-sandwichs-1.png   # Carte sandwichs style bois/rustique
├── carte-burgers.png       # Carte burgers style moderne clair
├── carte-burgers-v2.png    # Variante burgers style cartoon
├── carte-burgers-v3.png    # Variante burgers style nappe vichy
├── carte-burgers-v4.png    # Variante burgers style bleu/néon
├── carte-assiettes.png     # Carte assiettes style bois chaud
│
├── — Nouvelles cartes (Gemini générées) —
├── gemini-1.png            # Carte pizza (portrait)
├── gemini-2.png            # Burgers Artisanal (paysage)
├── gemini-3.png            # Menu restaurant & bar (paysage)
├── gemini-6.png            # Assiettes (paysage)
├── gemini-9.png            # La carte qui fait fondre / glaces (portrait)
├── gemini-10.png           # Neon Chicken (paysage)
│
├── — Cartes converties depuis PDF —
├── french-1.png            # Menu vert salade (PNG origine)
├── french-2.png à french-7.png  # PDFs convertis en PNG (1re page)
│
├── — Photos burgers (section Fradel & Spies) —
├── burger-photo.png        # Burger & frites (colonne gauche fast food card)
├── burger-bacon.png        # Burger bacon champignons
├── burger-classic.png      # Classic cheeseburger
├── burger-jalapeno.png     # Burger jalapeño
├── burger-poulet.png       # Burger poulet avocat
│
├── — Vidéos visuels animés —
├── visual1.mp4 à visual6.mp4   # 6 vidéos menu animées (grille 2×3)
│
├── — Scripts Node.js utilitaires —
├── package.json            # Dépendances: pngjs, pdf-to-img
├── remove-bg-burgers.js    # Flood-fill fond gris → transparent sur les 4 burger images
├── crop-circle.js          # Détecte le cercle olive, applique masque circulaire
├── remove-text.js          # Remplace pixels blancs (prix) par la couleur olive du cercle
└── node_modules/           # pngjs + pdf-to-img installés
```

---

## ⚙️ Commandes utiles

```bash
# Ouvrir le site (double-clic ou)
start index.html

# Pipeline complet pour nettoyer une image burger (fond + masque cercle + texte blanc)
node remove-bg-burgers.js   # étape 1 : supprime le fond gris
node crop-circle.js         # étape 2 : masque circulaire (détecte couleur olive ~rgb(170,160,30))
node remove-text.js         # étape 3 : efface les prix blancs restants

# Convertir PDF → PNG (1re page, scale x2)
node -e "
const { pdf } = require('pdf-to-img');
const fs = require('fs');
(async () => {
  const doc = await pdf('fichier.pdf', { scale: 2 });
  for await (const img of doc) {
    fs.writeFileSync('sortie.png', img);
    break; // 1re page seulement
  }
})();
"
```

---

## ✅ État du projet

### Ce qui fonctionne
- **Section 1 — Cartes Menu** : grille masonry 3 colonnes, toutes images affichées du haut de page, sans titre de section
- **Section 2 — Visuels Animés** : 6 vidéos MP4 en grille 2×3, autoplay loop muted
- **Section 3 — La Carte** : menu interactif complet avec 4 blocs distincts
  - Carte Sandwichs (style premium double-bordure dorée, cercles photo aux coins)
  - Carte Assiettes (style japonais, fond blanc, police Noto Serif JP)
  - Carte Burgers (fast food card : photo burger à gauche, menu à droite) — header noir "FAST FOOD MENU" + SVG burger outline fidèle à la référence
  - Carte Fradel & Spies (grille de burgers avec photos circulaires, fond olive transparent, textes prix supprimés)
- **Panier** : slide-in depuis la droite, ajout au clic sur les prix, badge compteur dans le dock
- **Dock flottant** : icône panier magnifiante (style macOS), pas de toggle langue
- **Modal paiement** : formulaire carte bleue avec flip 3D au CVV, détection Visa/MC/Amex
- **Prix cliquables** : animation "+1" flottante sur tous les prix (addToCartFromPrice)

### En cours / Incomplet
- Les placeholders de la section Visuels Animés sont remplacés par de vraies vidéos ✓
- Pas de backend — les commandes ne sont pas envoyées nulle part (front-end only)

### Pas encore commencé
- Aucune persistance du panier (localStorage)
- Aucun système de gestion des commandes côté serveur

---

## 📋 Historique des changements

### 2026-03-12 — Traitement images burgers + refonte header Fast Food
- Pipeline Node.js en 3 étapes pour nettoyer les photos burgers circulaires :
  1. `remove-bg-burgers.js` : flood-fill fond gris (~rgb 50,50,50) → transparent
  2. `crop-circle.js` : détecte couleur olive (~rgb 170,160,30), applique masque circulaire
  3. `remove-text.js` : remplace pixels blancs (prix) par la couleur olive dominante
- Couleur du cercle olive détectée : rgb(170,160,30) — fond `rgb(50,50,50)`
- Refonte header carte Burgers : fond noir pleine largeur, "FAST FOOD MENU" uppercase, SVG burger redessiné (dôme + graines sésame + couches + laitue ondulée + pain bas)
- Suppression `gemini-4/5/8.png` (doublons sandwichs + cartoon)
- Création `CLAUDE.md`

### 2026-03-12 — Restructuration grille images + ajout cartes PDF/Gemini
- Fusion des deux grilles (fixe + masonry) en une seule masonry 3 colonnes
- Suppression du titre de section « Cartes Menu » pour démarrage direct en haut
- Réduction padding logo header (py-8 → py-3, h-36 → h-24)
- Ajout 10 images Gemini générées (gemini-1 à 10, sauf 4/5/7/8 supprimés)
- Conversion 6 PDFs → PNG via pdf-to-img (french-1 à french-7)
- Suppression gemini-7.png (doublon NOS Burgers)

### 2026-03-12 — Remplacement photos burgers Fradel & Spies
- Remplacement 4 images Unsplash par photos locales : burger-bacon.png, burger-classic.png, burger-jalapeno.png, burger-poulet.png
- Fichiers source : screenshots `Capture d'écran 2026-03-12 18xxxx.png`

### 2026-03-12 — Ajout carte Fradel & Spies + vidéos
- Intégration carte burger Fradel & Spies dans section La Carte (CSS scopé `.fsc-wrap`)
- Ajout 6 vidéos MP4 (visual1-6.mp4) en grille 2×3 dans section Visuels Animés
- Suppression toggle FR/EN du dock flottant

### 2026-03-12 — Système panier + dock + paiement
- Panier vanilla JS : addToCart / removeFromCart / changeQty / clearCart / renderCart
- FloatingDock magnifiant (style macOS) avec badge compteur
- Modal paiement : flip 3D carte, détection Visa/MC/Amex, formatage temps réel

---

## ⚠️ Notes importantes

- **Fichier unique** : tout le CSS, JS et HTML est dans `index.html` — pas de séparation de fichiers
- **Tailwind CDN** : pas de build, pas de purge CSS — toutes les classes Tailwind disponibles
- **Fonts Google** : Bebas Neue, Dancing Script, Inter, Lora, Montserrat, Noto Serif JP (chargées en ligne)
- **CSS scoping** : les styles de la carte Fradel & Spies sont préfixés `.fsc-wrap` pour éviter les conflits
- **Prix cliquables** : utiliser `addToCartFromPrice(this, 'clé-unique', prix)` sur tout nouveau prix
- **Images locales uniquement** : les images Unsplash ont été remplacées — ne pas remettre d'URLs externes
- **PDF → PNG** : utiliser le snippet Node.js ci-dessus avec `pdf-to-img` (déjà installé)
- **Traitement images burgers** : pipeline 3 scripts — `remove-bg-burgers.js` → `crop-circle.js` → `remove-text.js`
- **Couleur cercle olive** : `rgb(170,160,30)` — fond gris `rgb(50,50,50)` — tolérance flood-fill : 45
- **Header Fast Food card** : `background:#000`, texte uppercase Montserrat 900, SVG burger `viewBox="0 0 140 115"`
- **Couleurs principales** : `primary: #ff2e2e` · `gold: #FFD700` · `background: #0A0A0A`
