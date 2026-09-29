#!/usr/bin/env python3
"""Génère la fiche « L'animation par prompt » : FICHE-TECHNIQUES.pdf et FICHE-TECHNIQUES.md.

Une seule source de contenu (les listes ci-dessous) pour les deux formats : le PDF se lit et se joint
au terminal, le Markdown est plus léger à lire pour Claude Code (et garde les URL en clair).

    pip install reportlab
    python3 exponentiel/build_fiche.py
"""
import os
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(HERE, 'FICHE-TECHNIQUES.pdf')
OUT_MD = os.path.join(HERE, 'FICHE-TECHNIQUES.md')

INK = colors.HexColor('#1B1620')
GREEN = colors.HexColor('#4DFF8F')
GREEN_DARK = colors.HexColor('#12894A')
PAPER = colors.HexColor('#F4F7F5')
GREY = colors.HexColor('#5B5560')
YELLOW = colors.HexColor('#FFD23C')

# ------------------------------------------------------------------ sources
SOURCES = {
    'cadence1': ("Frame Rate in Animation — Why Less is More (Nicholas Jean)",
                 "https://nicholasjean.medium.com/frame-rate-in-animation-why-less-is-more-1fe11b328193"),
    'cadence2': ("Is Spider-Verse Actually Animated At 12 FPS? (ExpertBeacon)",
                 "https://expertbeacon.com/is-spiderverse-12-fps/"),
    'somstop': ("Using Stop Motion Animation with After Effects (School of Motion)",
                "https://schoolofmotion.com/blog/stop-motion-after-effects"),
    'boil1': ("Simulating Hand-Drawn Motion with SVG Filters (Camillo Visini)",
              "https://camillovisini.com/coding/simulating-hand-drawn-motion-with-svg-filters"),
    'boil2': ("line-boil-skill : feTurbulence + feDisplacementMap animés (GitHub)",
              "https://github.com/Amateur0x1/line-boil-skill"),
    'turb': ("SVG Filter Effects: Creating Texture with feTurbulence (Codrops)",
             "https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/"),
    'poster': ("SVG Filter Effects: Poster Image Effect with feComponentTransfer (Codrops)",
               "https://tympanus.net/codrops/2019/01/29/svg-filter-effects-poster-image-effect-with-fecomponenttransfer/"),
    'cutout': ("An Easy Way to Get a Paper Cutout Stop Motion Look in Ae (Lesterbanks)",
               "https://lesterbanks.com/2020/02/an-easy-way-to-get-a-paper-cutout-stop-motion-look-in-ae/"),
    'felt1': ("Styles In Animation: Why Felt Feels Right (Cartoon Brew)",
              "https://www.cartoonbrew.com/stop-motion/styles-in-animation-felt-stop-motion-215313.html"),
    'felt2': ("Wool like you've never seen it before — Andrea Love (It's Nice That)",
              "https://www.itsnicethat.com/articles/andrea-love-stop-motion-animation-130220"),
    'clay1': ("Digital pic shows Aardman fingerprints (Variety)",
              "https://variety.com/2006/film/awards/digital-pic-shows-aardman-fingerprints-1117953534/"),
    'clay2': ("An introduction to Aardman (Factory International)",
              "https://factoryinternational.org/factoryplus/an-introduction-to-aardman/"),
    'comic1': ("Spider-Man: Into the Spider-Verse — How the Comic Look Works (Prolific Studio)",
               "https://prolificstudio.co/blog/spiderman-into-the-spiderverse/"),
    'comic2': ("Re-writing the rule book on Into the Spider-Verse (Foundry / Nuke)",
               "https://www.foundry.com/insights/film-tv/graphic-look-in-comp-spiderman"),
    'comic3': ("Why Spider-Verse has the most inventive visuals (fxguide)",
               "https://www.fxguide.com/fxfeatured/why-spider-verse-has-the-most-inventive-visuals-youll-see-this-year/"),
    'p12a': ("Disney's 12 Principles Of Animation (NYFA)",
             "https://www.nyfa.edu/student-resources/12-principles-of-animation/"),
    'pmario': ("Paper Mario: The Thousand-Year Door (Wikipédia)",
               "https://en.wikipedia.org/wiki/Paper_Mario:_The_Thousand-Year_Door"),
    'rem1': ("Prompting videos with coding agents (Remotion)",
             "https://www.remotion.dev/docs/ai/coding-agents"),
    'rem2': ("Agent Skills (Remotion)", "https://www.remotion.dev/docs/ai/skills"),
    'rem3': ("Video as Code: Remotion and the Agent Feedback Gap (Digital Applied)",
             "https://www.digitalapplied.com/blog/video-as-code-remotion-agentic-generation-2026"),
    'kin1': ("Kinetic typography: the what, why, and how (Linearity)",
             "https://www.linearity.io/blog/kinetic-typography/"),
    'toon1': ("Cel Shading in Blender (Artisticrender)", "https://artisticrender.com/cel-shading-in-blender/"),
    'bmcp1': ("blender-mcp (GitHub)", "https://github.com/ahujasid/blender-mcp"),
    'bmcp2': ("Claude + Blender MCP: What It Can Do, What It Can't (MindStudio)",
              "https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance"),
    'three1': ("MeshToonMaterial (three.js docs)", "https://threejs.org/docs/pages/MeshToonMaterial.html"),
    'three2': ("ToonOutlinePassNode (three.js docs)", "https://threejs.org/docs/pages/ToonOutlinePassNode.html"),
    'perf': ("SVG Filter Performance Issues Emerge … Hand-Drawn Animation Effects (BigGo)",
             "https://finance.biggo.com/news/202507211315_SVG_Filter_Performance_Issues"),
}

# ------------------------------------------------------------------ contenu
TITLE = "L'animation par prompt"
SUBTITLE = "15 techniques de motion design à demander à Claude Code, avec le prompt prêt à copier"

INTRO = ("Cette fiche se joint au terminal : « Lis exponentiel/FICHE-TECHNIQUES.pdf et pioche deux ou "
         "trois techniques pour ce plan ». Chaque technique donne l'effet, un prompt à copier et coller, "
         "une astuce, et ses références (numéros [1], [2]… détaillés en dernière page). Les valeurs "
         "chiffrées sont des points de départ à ajuster à l'œil.")

RULES_TITLE = "Sept règles d'or pour que le prompt marche"
RULES = [
    ("Des chiffres, pas des adjectifs.",
     "« 12 poses par seconde », « ombre décalée de (6, 8) px à 35 % », « #4DFF8F ». Un adjectif (« joli », "
     "« dynamique ») oblige Claude à deviner. Donner les images de début et de fin de chaque plan aide "
     "beaucoup [rem1]."),
    ("Nomme la technique et son réglage.",
     "« On twos » seul ne suffit pas : précise la cadence, ce qui reste fluide (décor, caméra) et ce qui "
     "saute (le robot)."),
    ("Une référence, puis trois traits.",
     "Le nom d'un film est flou ; « trame de points, décalage de couleurs, cadence mélangée » est "
     "exécutable."),
    ("Une signature par plan, deux techniques au maximum.",
     "Une cadence plus une matière (stop motion + feutrine). Au-delà, l'image devient illisible."),
    ("Tout dépend du numéro d'image.",
     "Graines fixes (graine = numéro de pose), aucune animation libre (SMIL, CSS, horloge réelle) : le "
     "rendu image par image doit donner le même résultat à chaque fois."),
    ("Vérifie avant de rendre.",
     "Images fixes aux temps forts, puis planche contact, puis seulement le rendu complet : une image "
     "fixe est la vérification la plus rapide pour un modèle qui voit [rem3]."),
    ("Dis pourquoi.",
     "La cadence et la matière servent l'histoire : le clone deepfake ultra lisse contre le robot dessiné "
     "à 12 poses par seconde. Ce n'est pas de la décoration."),
]

LOOKUP_TITLE = "Je veux… donc j'utilise"
LOOKUP = [
    ("un rendu « dessiné à la main »", "T1, T3"),
    ("un rendu « stop motion »", "T2, puis une matière : T4, T5 ou T6"),
    ("l'ambiance papier", "T4, T11"),
    ("l'ambiance laine, doudou", "T5, T2, T8"),
    ("le look Spider-Verse, comics", "T1, T7, T10"),
    ("plus d'énergie, de poids", "T9, T10, T12"),
    ("des décors 3D et le robot en 2D", "T14 (ou T15), T11"),
    ("un texte qui claque", "T13"),
]

REPO_RULES_TITLE = "À ne pas oublier (règles du dépôt)"
REPO_RULES = [
    "Le robot n'est jamais redessiné : on déforme les pièces de planche/robot_defs.svg, on n'en invente pas.",
    "Les effets de trait sur le robot se demandent d'abord (l'effet dessin a été retiré du robot dans LA "
    "SOURCE) : par défaut, on les met sur les décors.",
    "Aucun logo réel, aucune marque. Zone de sécurité Reels : rien d'important dans les 220 px du haut, "
    "420 px du bas et à droite (x > 950, y 1050-1500). Reels de 30 s maximum.",
    "media/ et out/ ne vont jamais dans Git. ElevenLabs : toujours estimer avant de générer.",
]

SECTIONS = [
    ("A", "Cadence : le rythme dessiné", [
        dict(id="T1", name="On twos et cadences mélangées",
             effet="Le mouvement paraît dessiné : une nouvelle pose seulement toutes les 2 images. "
                   "C'est le premier levier pour sortir du « trop lisse ».",
             prompt="Rends à 30 i/s mais anime le robot par paliers : temps_anim = floor(t × 12) / 12 "
                    "(12 poses par seconde, façon « on twos »). Le décor, les particules et la caméra restent "
                    "fluides à 30 i/s. Sur les impacts et les gestes rapides, repasse le robot « on ones » "
                    "(30 poses par seconde) pendant 6 images, puis reviens à 12.",
             astuce="À 30 i/s, 12 poses par seconde alternent des poses tenues 2 et 3 images (légèrement "
                    "irrégulier, acceptable). Pour un on twos parfait, rendre à 24 i/s ; ou tenir 3 images "
                    "(10 poses/s). Spider-Verse mélange 24 et 12 i/s et s'en sert pour le caractère : un "
                    "personnage novice est plus saccadé qu'un expert.",
             refs=['cadence1', 'cadence2']),
        dict(id="T2", name="Stop motion",
             effet="Poses tenues et petites erreurs de plateau. Marche aussi bien avec le papier, la "
                   "feutrine ou la pâte à modeler.",
             prompt="Anime le robot en stop motion : 10 poses par seconde (chaque pose tenue 3 images), "
                    "temps_anim = floor(t × 10) / 10. À chaque nouvelle pose, décale légèrement la pièce "
                    "(graine = numéro de pose) : ±1,5 px en position, ±0,6° en rotation, ±1 % en échelle. "
                    "Jamais deux poses identiques. Ajoute un léger flou de bougé après coup (moyenne de 3 "
                    "sous-images, obturateur 180°).",
             astuce="8 poses/s fait très bricolé, 12 fluide, 10 est un bon compromis. Les animateurs de "
                    "stop motion ajoutent souvent le flou de bougé après la prise. Le moteur de PARANO-IA "
                    "sait déjà moyenner des sous-images (option --sub).",
             refs=['somstop']),
    ]),
    ("B", "Trait et matière : filtres SVG du moteur actuel", [
        dict(id="T3", name="Line boil : le trait qui bout",
             effet="Les contours « bouillonnent » comme un dessin refait à chaque image.",
             prompt="Ajoute un « line boil » sur les décors : filtre SVG feTurbulence (fractalNoise, "
                    "baseFrequency 0.02, numOctaves 2) suivi d'un feDisplacementMap (scale 3 à 5). Change la "
                    "seed de feTurbulence toutes les 2 images. Pilote la seed depuis le numéro d'image, pas "
                    "avec une animation SMIL ni CSS : le rendu est image par image. Applique le filtre à un "
                    "groupe entier, jamais à chaque élément.",
             astuce="Sur le robot officiel, demande d'abord. Les filtres SVG coûtent cher : parfait pour un "
                    "rendu de nuit, lent pour l'aperçu (aperçu sans filtres, rendu final avec).",
             refs=['boil1', 'boil2', 'perf']),
        dict(id="T4", name="Papier découpé et texture papier",
             effet="Pièces plates, ombres dures, grain de papier : tout vit un peu « à la main ».",
             prompt="Style papier découpé : formes plates aux bords légèrement irréguliers "
                    "(feDisplacementMap scale 2), ombre portée dure décalée de (6, 8) px, noire à 35 %, "
                    "jamais floutée. Chaque pièce bouge « on threes » avec un tremblement de ±1 à 2 px et "
                    "±1° (posterize time). Texture papier sur tout le plan : feTurbulence fractalNoise "
                    "baseFrequency 0.04, numOctaves 5, puis feDiffuseLighting (surfaceScale 1.5, lumière "
                    "distante azimuth 45, élévation 60), mélangé en multiply à 25-35 %.",
             astuce="Superpose 2 ou 3 plans de papier à des profondeurs différentes (plus l'ombre est "
                    "grande, plus la feuille est haute). Les cartes de titre entrent en glissant depuis le "
                    "bord, comme une feuille qu'on pousse.",
             refs=['cutout', 'somstop', 'turb']),
        dict(id="T5", name="Feutrine et laine",
             effet="Aplats mats, bords pelucheux, coutures visibles. Doux, chaleureux, fait main.",
             prompt="Style feutrine : aplats mats sans dégradé ni reflet ; contours doux et pelucheux "
                    "(feTurbulence baseFrequency 0.8 puis feDisplacementMap scale 2-3 sur les bords, puis "
                    "feGaussianBlur 0.4) ; texture de fibres fines en multiply à 15-20 %, plus dense dans "
                    "les creux ; coutures apparentes en pointillés sur le bord des pièces ; petites ombres "
                    "de contact douces là où deux pièces se superposent. Anime en stop motion (10 poses/s) : "
                    "les fibres changent de graine à chaque pose.",
             astuce="Recette de départ à ajuster : les sources décrivent l'apparence (fibres courtes, masses "
                    "arrondies, bords doux, ombres de contact, coutures), pas des valeurs. Évite les "
                    "contours noirs nets : ils cassent l'effet laine.",
             refs=['felt1', 'felt2']),
        dict(id="T6", name="Pâte à modeler",
             effet="Volumes ronds, surface mate, empreintes de doigts : le charme d'Aardman.",
             prompt="Aspect pâte à modeler : formes arrondies un peu trop épaisses, surface mate avec "
                    "empreintes de doigts et petites rayures (bruit basse fréquence en léger relief), bords "
                    "légèrement irréguliers, couleurs saturées, éclairage doux de studio, ombre de contact "
                    "courte. Stop motion à 8-10 poses/s ; imperfections volontaires : chaque pose déforme "
                    "très légèrement les volumes.",
             astuce="En 3D (Blender) : un bump map de bruit et une subdivision légère, sans simulation. "
                    "Aardman appelle « thumbiness » ces empreintes qui prouvent que c'est fait main.",
             refs=['clay1', 'clay2']),
        dict(id="T7", name="Comics : demi-teinte, décalage CMJN, hachures",
             effet="Image façon bande dessinée imprimée, le look Spider-Verse.",
             prompt="Look comics imprimé : trame de points (Ben-Day) à 45° dans les ombres, points plus "
                    "gros là où c'est plus sombre ; hachures croisées sur les ombres secondaires ; décalage "
                    "de couleurs façon impression mal calée (canaux rouge et bleu décalés de 2 à 4 px dans "
                    "des directions opposées, surtout sur les bords) ; sur les mouvements rapides, une image "
                    "étirée (smear) plutôt qu'un flou.",
             astuce="Des angles de trame volontairement différents créent des moirés qui ressemblent à une "
                    "vraie impression. À doser : sur tout le plan en plein, ça fatigue.",
             refs=['comic1', 'comic2', 'comic3']),
        dict(id="T8", name="Grain de pellicule, vignette, posterisation",
             effet="Colle les couches ensemble et donne de la vie aux poses tenues.",
             prompt="Grain de pellicule : feTurbulence fractalNoise baseFrequency 0.9, contrasté par "
                    "feComponentTransfer, en overlay à 6-10 %, seed = numéro d'image (le grain change à "
                    "chaque image même quand les poses sont tenues). Vignettage doux (coins à -25 %). "
                    "Micro-tremblement de caméra de ±1 px. Pour la posterisation ou le duotone : "
                    "feComponentTransfer en mode discrete sur 3 ou 4 niveaux.",
             astuce="Un grain qui bouge sur une pose tenue est ce qui fait « vivant » en stop motion.",
             refs=['turb', 'poster']),
    ]),
    ("C", "Mouvement : poids, énergie, personnage", [
        dict(id="T9", name="Les 12 principes et les ressorts",
             effet="La différence entre « ça bouge » et « ça vit ».",
             prompt="Applique les principes de l'animation : anticipation (recul de 4 à 6 images avant un "
                    "saut), écrasement-étirement en gardant le volume (squash 0,85 × 1,15), arcs de "
                    "mouvement, chevauchement (chapeau et antenne en retard de 3 à 5 images), ralenti à "
                    "l'entrée et à la sortie (jamais linéaire), action secondaire (clignement, regard), "
                    "exagération ×1,5 par rapport au réaliste. Toute apparition utilise un ressort : elle "
                    "dépasse de 8 à 12 % puis se stabilise en 12 à 18 images.",
             astuce="Un gag = anticipation longue, action très rapide, arrêt net. Nommer les principes et "
                    "donner des valeurs fonctionne mieux que « rends-le plus vivant ».",
             refs=['p12a', 'rem2']),
        dict(id="T10", name="Impacts : hit-stop, secousse, smear",
             effet="Le poids d'un coup à moindre coût.",
             prompt="À chaque impact : gel de 3 à 4 images (hit-stop, la voix continue), secousse d'écran "
                    "à amplitude décroissante sur 8 images, étirement (smear) du robot dans le sens du coup "
                    "puis écrasement à l'arrivée, éclats et étoiles en passe devant, ralenti de 0,4 s sur le "
                    "moment fort. Le bruitage tombe sur la première image de l'impact.",
             astuce="Le moteur de LA SOURCE gère déjà le hit-stop (durées données en secondes réelles). "
                    "Spider-Verse préfère le smear au flou de mouvement classique pour garder des images nettes.",
             refs=['comic3', 'comic1']),
        dict(id="T11", name="Le robot-feuille (Paper Mario)",
             effet="Un personnage plat dans un monde 3D, qui se comporte comme une feuille de papier.",
             prompt="Le robot est une feuille : quand il se retourne, sa largeur passe de 1 à 0,05 (on voit "
                    "sa tranche) puis à -1 en 6 images ; son ombre au sol suit la rotation ; il se plie "
                    "légèrement (skewY 4°) à la course et se froisse au rebond. Il reste net et sans relief "
                    "alors que la caméra 3D tourne autour de lui.",
             astuce="Pièces officielles uniquement (planche/robot_defs.svg) : on déforme, on ne redessine "
                    "pas. Le principe vient de Paper Mario : personnages 2D dans un décor 3D.",
             refs=['pmario']),
    ]),
    ("D", "Caméra et texte", [
        dict(id="T12", name="Caméra, parallaxe et raccords",
             effet="L'énergie de la bande-annonce : ça ne s'arrête jamais et chaque coupe est motivée.",
             prompt="Caméra jamais fixe plus de 1,5 s : travelling, contre-plongée pour la puissance, zoom "
                    "éclair sur les chiffres. Parallaxe à 5-6 couches (les plus proches défilent le plus "
                    "vite). Raccords : panoramique fouetté (whip pan) sur les temps forts de la musique, ou "
                    "raccord sur un objet commun (le fil vert) qui traverse la coupe.",
             astuce="Un fil conducteur (un objet présent dans tous les plans) évite l'effet « collage de "
                    "scènes ». Technique déjà utilisée dans la bande-annonce PARANO-IA (commit b439b9a).",
             refs=[]),
        dict(id="T13", name="Typo cinétique calée sur la voix",
             effet="Le texte qui claque, mot pour mot avec la voix.",
             prompt="Chaque mot apparaît à l'instant où il est prononcé (instants de la transcription de la "
                    "voix) : entrée en ressort, lettre par lettre avec 2 images d'écart, échelle 1,2 vers 1 ; "
                    "les mots-clés en vert #4DFF8F et plus gros ; le mot sort en poussant le suivant. Police "
                    "lisible (Space Grotesk ou Fredoka), dans la zone de sécurité Reels.",
             astuce="La synchronisation avec l'audio compte plus que l'effet. Une seule animation de texte à "
                    "la fois.",
             refs=['kin1', 'rem2']),
    ]),
    ("E", "3D : décors derrière le robot 2D", [
        dict(id="T14", name="Blender : toon, contours, piloté par script",
             effet="Décors 3D stylisés, dessinés comme du 2D, avec le robot posé dedans.",
             prompt="Dans Blender (EEVEE) : matériau toon = Diffuse BSDF, puis Shader to RGB, puis Color "
                    "Ramp en interpolation Constant à 2 ou 3 crans ; contours avec un modificateur Line Art "
                    "(ou une coque inversée) à l'épaisseur du trait du robot ; halo (glare) sur les "
                    "émissifs. Écris tout dans un script bpy rejouable (blender -b -P script.py) et prends "
                    "une capture du viewport après chaque étape. Décors low-poly stylisés en instances, pas "
                    "de personnages organiques.",
             astuce="Shader to RGB n'existe pas dans Cycles, seulement dans EEVEE. Via le serveur MCP "
                    "Blender, Claude écrit du bpy dans la scène ouverte : fiable pour les formes simples, "
                    "le placement, les scènes à plusieurs objets et les matériaux simples ; faible pour la "
                    "géométrie organique, les cotes précises et le rig.",
             refs=['toon1', 'bmcp1', 'bmcp2']),
        dict(id="T15", name="Three.js dans le même moteur (alternative)",
             effet="De la 3D toon sans quitter la chaîne Chromium, image par image.",
             prompt="Alternative sans Blender : une scène Three.js dans la même page Chromium que le robot "
                    "SVG, avec MeshToonMaterial (2 ou 3 tons) et un passage de contour (OutlineEffect ou "
                    "ToonOutlinePassNode). La caméra et le temps dépendent du numéro d'image (aucune "
                    "horloge réelle). Exporte à chaque image la position écran du point d'ancrage du robot.",
             astuce="À tester avant de s'y fier : le rendu WebGL de Chromium sans écran peut demander des "
                    "réglages. L'avantage : une seule chaîne de rendu, pas d'aller-retour de fichiers.",
             refs=['three1', 'three2']),
    ]),
]

COMBOS_TITLE = "Cinq combinaisons prêtes pour PARANO-IA"
COMBOS = [
    ("Spider-Verse", "T1 (robot on twos, décor fluide) + T7 + T10 + décors 3D T14."),
    ("Atelier de feutre", "T5 + T2 + T8 : feutrine, 10 poses par seconde, grain qui bouge."),
    ("Carnet de détective", "T4 + T3 sur le décor, ombre dure ; le robot net posé par-dessus."),
    ("Roger Rabbit", "T14 + T11 : décor 3D toon, robot-feuille, ombre portée du robot sur la 3D."),
    ("La cadence comme personnage",
     "Le clone deepfake à 30 poses par seconde, trop lisse, contre le robot à 12 : c'est le lisse qui "
     "devient inquiétant."),
]

LIMITS_TITLE = "Ce que le prompt ne fait pas (bien)"
LIMITS = [
    "Il donne un look d'ensemble, pas la main d'un artiste : pas de vrai dessin image par image, pas de "
    "fourrure ou de laine simulée en 3D.",
    "Blender par MCP : bon pour le décor simple, faible pour l'organique, le rig et les cotes précises.",
    "Les filtres SVG coûtent cher : rendu final la nuit, aperçu sans filtres.",
    "Les chiffres de cette fiche sont des points de départ. Les sources justifient chaque technique, pas "
    "chaque valeur : à régler à l'œil sur des images fixes.",
]

# ------------------------------------------------------------------ numérotation des sources
ORDER = []


def ref_num(key):
    if key not in ORDER:
        ORDER.append(key)
    return ORDER.index(key) + 1


def resolve(text):
    """Remplace [clé] par [n] dans les textes des règles."""
    import re
    return re.sub(r'\[([a-z0-9]+)\]', lambda m: '[%d]' % ref_num(m.group(1)) if m.group(1) in SOURCES
                  else m.group(0), text)


# on numérote dans l'ordre de lecture : règles, puis fiches
RULES = [(a, resolve(b)) for a, b in RULES]
for _, _, techs in SECTIONS:
    for t in techs:
        t['nums'] = sorted(ref_num(k) for k in t['refs'])


# ------------------------------------------------------------------ PDF
def register_fonts():
    """DejaVu (accents français, flèches, ×). Pas d'italique dans la fiche : on réutilise le romain."""
    base = next(d for d in ('/usr/share/fonts/truetype/dejavu/', '/usr/share/fonts/dejavu/',
                            '/Library/Fonts/', os.path.expanduser('~/Library/Fonts/'))
                if os.path.exists(d + 'DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('Sans', base + 'DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('Sans-B', base + 'DejaVuSans-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('Sans-I', base + 'DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('Sans-BI', base + 'DejaVuSans-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('Mono', base + 'DejaVuSansMono.ttf'))
    pdfmetrics.registerFont(TTFont('Mono-B', base + 'DejaVuSansMono-Bold.ttf'))
    pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='Sans-B', italic='Sans-I', boldItalic='Sans-BI')


def styles():
    S = {}
    S['body'] = ParagraphStyle('body', fontName='Sans', fontSize=8.0, leading=11.0, textColor=INK, alignment=TA_LEFT)
    S['small'] = ParagraphStyle('small', parent=S['body'], fontSize=7.4, leading=10, textColor=GREY)
    S['h1'] = ParagraphStyle('h1', parent=S['body'], fontName='Sans-B', fontSize=12.5, leading=15, spaceBefore=8, spaceAfter=5)
    S['h2'] = ParagraphStyle('h2', parent=S['body'], fontName='Sans-B', fontSize=9.6, leading=12.5, textColor=INK)
    S['sec'] = ParagraphStyle('sec', parent=S['body'], fontName='Mono-B', fontSize=8.4, leading=11, textColor=GREEN)
    S['prompt'] = ParagraphStyle('prompt', parent=S['body'], fontName='Mono', fontSize=7.1, leading=9.7)
    S['label'] = ParagraphStyle('label', parent=S['body'], fontName='Mono-B', fontSize=6.8, leading=9, textColor=GREEN_DARK)
    S['num'] = ParagraphStyle('num', parent=S['body'], fontName='Mono-B', fontSize=10, leading=13, textColor=GREEN, alignment=1)
    S['ref'] = ParagraphStyle('ref', parent=S['small'], fontSize=7, leading=9)
    S['src'] = ParagraphStyle('src', parent=S['small'], fontSize=6.2, leading=7.9)
    return S


def P(text, style):
    return Paragraph(text, style)


def prompt_box(text, S, width):
    inner = Table([[P('PROMPT À COPIER', S['label'])], [P(escape(text), S['prompt'])]], colWidths=[width])
    inner.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PAPER),
        ('LINEBEFORE', (0, 0), (0, -1), 2.2, GREEN_DARK),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (0, 0), 4), ('BOTTOMPADDING', (0, 0), (0, 0), 0),
        ('TOPPADDING', (0, 1), (0, 1), 1), ('BOTTOMPADDING', (0, 1), (0, 1), 5),
    ]))
    return inner


def card(t, S, W):
    num_w = 13 * mm
    inner_w = W - num_w - 4 * mm
    flow = [P(escape(t['name']), S['h2']), Spacer(1, 1.5),
            P(escape(t['effet']), S['body']), Spacer(1, 3.5),
            prompt_box(t['prompt'], S, inner_w), Spacer(1, 3.5),
            P('<font name="Sans-B" color="#12894A">Astuce.</font> ' + escape(t['astuce']), S['body'])]
    if t['nums']:
        flow += [Spacer(1, 2), P('Réf. ' + ' '.join('[%d]' % n for n in t['nums']), S['ref'])]
    tbl = Table([[P(t['id'], S['num']), flow]], colWidths=[num_w, W - num_w])
    tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), INK),
        ('TOPPADDING', (0, 0), (0, 0), 7),
        ('LEFTPADDING', (1, 0), (1, 0), 8), ('RIGHTPADDING', (1, 0), (1, 0), 0),
        ('TOPPADDING', (1, 0), (1, 0), 0), ('BOTTOMPADDING', (1, 0), (1, 0), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#D8DED9')),
    ]))
    return [tbl, Spacer(1, 5)]   # liste (pas de KeepTogether imbriqués : ils gonflent la hauteur)


def build_pdf():
    register_fonts()
    S = styles()
    W = A4[0] - 32 * mm

    def on_page(c, doc):
        c.saveState()
        c.setFillColor(INK)
        c.rect(0, A4[1] - 9 * mm, A4[0], 9 * mm, stroke=0, fill=1)
        c.setFillColor(GREEN)
        c.rect(0, A4[1] - 9.6 * mm, A4[0], 0.6 * mm, stroke=0, fill=1)
        c.setFont('Mono-B', 7.2)
        c.drawString(16 * mm, A4[1] - 6 * mm, "PARANO-IA · L'IA SOUS ENQUÊTE")
        c.setFillColor(colors.white)
        c.setFont('Mono', 7.2)
        c.drawRightString(A4[0] - 16 * mm, A4[1] - 6 * mm, "Fiche techniques d'animation par prompt · page %d" % doc.page)
        c.restoreState()

    doc = BaseDocTemplate(OUT_PDF, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                          topMargin=15 * mm, bottomMargin=11 * mm,
                          title="L'animation par prompt — fiche techniques (PARANO-IA)",
                          author="PARANO-IA", subject="Techniques de motion design à demander à Claude Code")
    doc.addPageTemplates([PageTemplate(id='p', frames=[Frame(doc.leftMargin, doc.bottomMargin, W,
                                                            A4[1] - doc.topMargin - doc.bottomMargin, id='f',
                                                            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
                                       onPage=on_page)])
    story = []

    # titre
    title = Table([[[P('<font name="Mono-B" color="#4DFF8F" size="8">FICHE TECHNIQUE · MOTION DESIGN PAR PROMPT</font>', S['body']),
                     Spacer(1, 4),
                     P('<font name="Sans-B" color="#FFFFFF" size="24">%s</font>' % escape(TITLE.upper()), ParagraphStyle('t', leading=28)),
                     Spacer(1, 3),
                     P('<font color="#E8E4EC" size="9.2">%s</font>' % escape(SUBTITLE), ParagraphStyle('t2', leading=12.5))]]],
                  colWidths=[W])
    title.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), INK), ('LEFTPADDING', (0, 0), (-1, -1), 12),
                               ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
                               ('LINEBELOW', (0, 0), (-1, -1), 3, GREEN)]))
    story += [title, Spacer(1, 8), P(escape(INTRO), S['body']), Spacer(1, 4)]

    # règles d'or
    story.append(P(escape(RULES_TITLE), S['h1']))
    rows = [[P('<font name="Mono-B" color="#12894A">%d</font>' % (i + 1), S['body']),
             P('<font name="Sans-B">%s</font> %s' % (escape(a), escape(b)), S['body'])] for i, (a, b) in enumerate(RULES)]
    rt = Table(rows, colWidths=[7 * mm, W - 7 * mm])
    rt.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 2.2),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2), ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
    story += [rt, Spacer(1, 4)]

    # tableau « je veux »
    story.append(P(escape(LOOKUP_TITLE), S['h1']))
    lk = Table([[P(escape(a), S['body']), P('<font name="Mono-B">%s</font>' % escape(b), S['body'])] for a, b in LOOKUP],
               colWidths=[W * 0.52, W * 0.48])
    lk.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PAPER), ('ROWBACKGROUNDS', (0, 0), (-1, -1), [PAPER, colors.white]),
                            ('TOPPADDING', (0, 0), (-1, -1), 2.6), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.6),
                            ('LEFTPADDING', (0, 0), (-1, -1), 7), ('LINEBELOW', (0, 0), (-1, -1), 0.3, colors.HexColor('#D8DED9'))]))
    story += [lk, Spacer(1, 6)]

    # règles du dépôt
    rb = Table([[[P('<font name="Mono-B" color="#FFD23C">%s</font>' % escape(REPO_RULES_TITLE.upper()), S['body']), Spacer(1, 3)] +
                 [P('<font color="#F4F0F7">• %s</font>' % escape(r), ParagraphStyle('rr', parent=S['body'], leading=11, spaceAfter=1.5))
                  for r in REPO_RULES]]], colWidths=[W])
    rb.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), INK), ('LEFTPADDING', (0, 0), (-1, -1), 10),
                            ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 7),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    story += [rb, PageBreak()]

    # techniques
    for letter, name, techs in SECTIONS:
        head = Table([[P('%s · %s' % (letter, escape(name.upper())), S['sec'])]], colWidths=[W])
        head.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), INK), ('LEFTPADDING', (0, 0), (-1, -1), 8),
                                  ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
        story.append(KeepTogether([head, Spacer(1, 6)] + card(techs[0], S, W)))
        story += [KeepTogether(card(t, S, W)) for t in techs[1:]]

    # combos + limites
    story += [Spacer(1, 2), P(escape(COMBOS_TITLE), S['h1'])]
    cb = Table([[P('<font name="Sans-B">%s</font>' % escape(a), S['body']), P(escape(b), S['body'])] for a, b in COMBOS],
               colWidths=[W * 0.27, W * 0.73])
    cb.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ROWBACKGROUNDS', (0, 0), (-1, -1), [PAPER, colors.white]),
                            ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                            ('LEFTPADDING', (0, 0), (-1, -1), 7)]))
    story += [cb, Spacer(1, 4), P(escape(LIMITS_TITLE), S['h1'])]
    for l in LIMITS:
        story.append(P('• ' + escape(l), ParagraphStyle('lm', parent=S['body'], leftIndent=8, firstLineIndent=-8, spaceAfter=2)))

    # sources (deux colonnes, lecture de haut en bas)
    story += [Spacer(1, 4), P('Sources', S['h1'])]
    cells = []
    for i, key in enumerate(ORDER, 1):
        label, url = SOURCES[key]
        cells.append(P('<font name="Mono-B">[%d]</font> %s<br/><font color="#12894A">%s</font>' %
                       (i, escape(label), '<link href="%s">%s</link>' % (escape(url), escape(url))), S['src']))
    half = (len(cells) + 1) // 2
    left, right = cells[:half], cells[half:]
    right += [P('', S['src'])] * (half - len(right))
    st = Table([[l, r] for l, r in zip(left, right)], colWidths=[W / 2, W / 2])
    st.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                            ('RIGHTPADDING', (0, 0), (0, -1), 8), ('RIGHTPADDING', (1, 0), (1, -1), 0),
                            ('TOPPADDING', (0, 0), (-1, -1), 1.2), ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2)]))
    story.append(st)
    doc.build(story)


# ------------------------------------------------------------------ Markdown
def build_md():
    L = ["# %s" % TITLE, "", "> %s" % SUBTITLE, "", INTRO, "", "## %s" % RULES_TITLE, ""]
    for i, (a, b) in enumerate(RULES, 1):
        L.append("%d. **%s** %s" % (i, a, b))
    L += ["", "## %s" % LOOKUP_TITLE, "", "| Je veux… | Techniques |", "|---|---|"]
    L += ["| %s | %s |" % (a, b) for a, b in LOOKUP]
    L += ["", "## %s" % REPO_RULES_TITLE, ""] + ["- %s" % r for r in REPO_RULES] + [""]
    for letter, name, techs in SECTIONS:
        L += ["## %s · %s" % (letter, name), ""]
        for t in techs:
            L += ["### %s · %s" % (t['id'], t['name']), "", "**Effet.** %s" % t['effet'], "",
                  "**Prompt à copier :**", "", "```text", t['prompt'], "```", "",
                  "**Astuce.** %s" % t['astuce'], ""]
            if t['nums']:
                L += ["Réf. " + " ".join("[%d]" % n for n in t['nums']), ""]
    L += ["## %s" % COMBOS_TITLE, ""] + ["- **%s** : %s" % (a, b) for a, b in COMBOS]
    L += ["", "## %s" % LIMITS_TITLE, ""] + ["- %s" % l for l in LIMITS]
    L += ["", "## Sources", ""]
    for i, key in enumerate(ORDER, 1):
        label, url = SOURCES[key]
        L.append("[%d] %s : %s" % (i, label, url))
    L += ["", "Les sources décrivent chaque technique ; les réglages chiffrés des prompts sont des valeurs "
          "de départ proposées par l'auteur de la fiche.", ""]
    with open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write("\n".join(L))


if __name__ == '__main__':
    build_pdf()
    build_md()
    print('OK', OUT_PDF, OUT_MD, len(ORDER), 'sources')
