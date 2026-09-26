// Texte et points de synchro de la voix IA (ElevenLabs, voix « Benjamin »), lus par aligne_voix.js :
//   VOIX_DIR=media/voix_ia VOIX_TEXTE=voix_ia.js node aligne_voix.js
// VOIX : ce que dit la voix IA (voix_ia_texte.txt), en morceaux courts, mots-clés entre *étoiles*.
// [texte, {rang du mot: instant}] fixe un mot que la reconnaissance place trop tard.
// SYNC : les mêmes temps script que pour la voix enregistrée, sur les passages correspondants.
const NB = '\u00a0';
const VOIX = [
  'On a demandé à une *IA*', 'de *donner vie* à ce dessin…', 'et regardez bien ce qui se passe.',
  'Ce dessin, c’est celui', 'de *Philippe Delord*,', 'un dessinateur qui m’a autorisé', 'à utiliser son travail', 'pour cette vidéo.',
  `La consigne était simple${NB}:`, 'faire vivre la scène.', 'Et pourtant, il y a quelque chose', 'qui se met à *couler* du toit.',
  'La maison s’efface…', 'puis revient.',
  'Et honnêtement,', 'à part *Philippe*,', 'personne ne peut dire', 'si c’est du *bois*,', 'de l’*eau*,', 'ou de la *fumée*.', 'Pas même la machine.',
  'Pour une *IA*,', '*donner vie*…', 'ça veut juste dire *faire bouger*.',
  ['Elle n’a jamais vu *la vie*.', { 0: 34.8, 1: 34.97, 2: 35.12, 3: 35.42, 4: 35.56, 5: 35.7 }], 'Elle a vu des *millions* de vidéos', 'où tout ce qui est vivant bouge.', 'Alors elle fait bouger',
  'tout ce qu’elle peut…', 'même ce qui n’était pas censé bouger.',
  'Et c’est exactement ce que pointe', `*Yann LeCun*${NB}:`, 'un Français,', 'l’un des pionniers', 'de l’IA moderne,', 'qui a reçu le *prix Turing*,',
  'l’équivalent', 'du *Nobel* en informatique.',
  'Pour *LeCun*,', 'ces modèles', 'ne font que prédire des *pixels*.', 'Sans *aucun monde* derrière.', 'Sans savoir ce qu’est un toit,',
  'du bois… ou même de l’*eau*.',
  'D’ailleurs… il a quitté *Meta*,', 'et levé plus d’un *milliard* de dollars', `pour construire l’inverse${NB}:`, 'ce qu’on appelle les *world models*.',
  ['Des IA qui,', { 0: 72.13, 1: 72.3, 2: 72.66 }], ['potentiellement, sauraient', { 0: 72.84 }], 'qu’un toit ne s’écoule pas comme de l’*eau*.',
  'Bref, revenons à ce dessin.', '*Hasard* ou non…', 'ce dessin fait partie', 'de ce que Philippe a nommé…', '*La Source*.',
  'Et *vous*…', `que voyez-vous couler de ce toit${NB}?`,
  'Parce que la machine,', 'elle, n’a rien voulu dire.', 'C’est nous qui cherchons *un sens*.',
  'Alors au fond,', `qui est en train de *rêver*${NB}?`, [`La machine… ou *nous*${NB}?`, { 0: 94.91, 1: 95.06, 2: 96.11, 3: 96.3 }],
  ['Est-ce une *hallucination*…', { 0: 97.03 }], 'ou simplement une autre façon', `de voir les choses${NB}?`,
  'Affaire à suivre.', 'Les dessins de *Philippe Delord*', 'vous attendent dans sa *galerie*,', 'sur *LK Studio*.',
  'Et la galerie se visite aussi', `en *réalité virtuelle*${NB}:`, 'enfilez un *casque*…', 'et entrez dans le *dessin*.',
];
const SYNC = [
  [6.9, 'et regardez'], [11.2, 'Ce dessin'], [15.1, 'un dessinateur'], [17.6, 'à utiliser'], [19.6, 'pour cette'],
  [21.9, 'La consigne'], [24.3, 'faire vivre'], [26.7, 'Et pourtant'], [30.2, 'qui se met'], [34.1, 'La maison'],
  [35.6, 'puis revient'], [37.0, 'Et honnêtement'], [40.0, 'si c’est'], [42.4, 'de l’*eau*'], [43.8, 'ou de la'],
  [46.2, 'Pas même'], [49.0, 'Pour une'], [53.3, 'ça veut'], [57.1, 'Elle n’a'],
  [60.0, 'Elle a vu'], [63.5, 'où tout'], [66.9, 'Alors elle'], [68.9, 'tout ce qu’elle'], [71.3, 'même ce'],
  [75.1, 'Et c’est exactement'], [78.1, '*Yann LeCun*'], [79.5, 'un Français'], [80.9, 'l’un des'], [84.3, 'qui a reçu'],
  [87.7, 'l’équivalent'], [91.0, 'Pour *LeCun*'], [93.0, 'ne font que'], [96.4, 'Sans *aucun'], [98.8, 'Sans savoir'],
  [102.2, 'du bois… ou'], [105.5, 'D’ailleurs'], [108.0, 'et levé'], [111.5, 'pour construire'], [113.4, 'ce qu’on appelle'],
  [116.8, 'Des IA qui'], [119.3, 'qu’un toit'], [122.1, 'Bref, revenons'], [124.5, 'de ce que Philippe'], [127.0, '*La Source*.'],
  [130.4, 'que voyez-vous'], [132.25, 'que voyez-vous', 2], [135.2, 'Parce que la'], [138.1, 'elle, n’a'], [140.5, 'C’est nous'],
  [145.5, 'Alors au fond'], [147.4, 'qui est en train'], [148.8, 'La machine… ou'], [151.3, 'Est-ce une'], [152.9, 'ou simplement'],
  [160.1, 'Affaire à suivre'], [162.0, 'Les dessins'], [165.5, 'vous attendent'], [168.4, 'sur *LK'], [170.2, 'Et la galerie'],
  [173.2, 'en *réalité'], [175.2, 'enfilez un'], [177.0, 'et entrez'],
];
module.exports = { VOIX, SYNC };
