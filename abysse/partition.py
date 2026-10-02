"""PARTITION de la bande-annonce ABYSSE (v2) — la seule source de vérité du minutage (→ partition.json).

Tout est sur la grille de la musique B (ElevenLabs Music, 150 BPM, ré mineur harmonique) :
1 temps = 0,4 s = 12 images à 30 i/s ; 1 mesure = 1,6 s = 48 images ; 1 double croche = 3 images.
Le motion design (motion.js) et le mixage (son/mixage.py) lisent partition.json : quand la balle touche la ligne,
quand une lettre tombe, quand un logo apparaît, sa note part à la même image.

v2 (2026-10-02) : le début dure une mesure de plus (balle qui rebondit, lettres qui tombent, phrases qui s'étirent,
logos dessinés), plus aucun extrait vidéo au début ; la 3D, rendue avec la v1 (partition_3d.json, gelée pour
Blender), est décalée de DECALAGE_3D ; nouvelle musique pour la station et le bureau (bureau_B, ElevenLabs).

  python partition.py        → partition.json + assets/data/partition.js
"""
import json
import os

FPS = 30
BPM = 150
BEAT = 60 / BPM            # 0,4 s
BAR = 4 * BEAT             # 1,6 s
INTRO = 6                  # mesures de surface (dont la montée) : on plonge à la mesure 6 (9,6 s)
DECALAGE_3D = 1 * BAR      # la v1 plongeait à 8,0 s

HERE = os.path.dirname(os.path.abspath(__file__))
V1 = json.load(open(os.path.join(HERE, 'partition_3d.json'), encoding='utf8'))


def t(bar, beat=0.0):
    return round(bar * BAR + beat * BEAT, 4)


def fr(sec):
    return round(sec * FPS)


B = 'media/musique/surface_B.mp3'          # la musique de la bande-annonce
BUREAU = 'media/musique/bureau_B.mp3'      # la station et le bureau : flottante, dérangeante, tech (gros impact à 6,4 s)
MUSIQUE = [
    {'nom': 'intro', 'fichier': B, 'film': t(0), 'source': 0.0, 'duree': 5 * BAR, 'etat': 'clair'},
    {'nom': 'montee', 'fichier': B, 'film': t(5), 'source': 7 * BAR, 'duree': BAR, 'etat': 'clair'},
    {'nom': 'drop_etouffe', 'fichier': B, 'film': t(6), 'source': 8 * BAR, 'duree': 3 * BAR, 'etat': 'sous_eau'},
    # au fond : la musique de la station, entendue à travers la coque…
    {'nom': 'approche', 'fichier': BUREAU, 'film': t(11), 'source': 2 * BAR, 'duree': 2 * BAR, 'etat': 'coque'},
    # … et en clair quand le sas s'ouvre, sur son grand impact
    {'nom': 'bureau', 'fichier': BUREAU, 'film': t(13), 'source': 4 * BAR, 'duree': 3 * BAR, 'etat': 'clair'},
    # on plonge dans l'écran : la dernière mesure de B (roulement) et son coup final
    {'nom': 'final', 'fichier': B, 'film': t(16), 'source': 15 * BAR, 'duree': 3.4, 'etat': 'clair'},
]
DUREE = round(t(17) + 1.8, 2)          # 29,0 s : le coup final à 27,2 s puis la traîne

PLANS = [
    {'id': 'S1', 'nom': 'accroche', 'type': 'motion', 'debut': t(0), 'fin': t(2)},
    {'id': 'S2', 'nom': 'logos', 'type': 'motion', 'debut': t(2), 'fin': t(5)},
    {'id': 'S3', 'nom': 'la-ligne', 'type': 'motion', 'debut': t(5), 'fin': t(6)},
    {'id': 'P1', 'nom': 'plongee', 'type': 'blender', 'debut': t(6), 'fin': t(11)},
    {'id': 'P2', 'nom': 'station', 'type': 'blender', 'debut': t(11), 'fin': t(13)},
    {'id': 'P3', 'nom': 'bureau', 'type': 'blender', 'debut': t(13), 'fin': t(16)},
    {'id': 'S4', 'nom': 'logo', 'type': 'motion', 'debut': t(16), 'fin': DUREE},
]

# la mélodie de B (la « hook »), une note par temps : do#5 la4 mi5 do#5 | sib4 la4 fa4 mi4
HOOK = [73, 69, 76, 73, 70, 69, 65, 64]
MINEUR = [62, 65, 69, 72, 74, 77, 81, 84]          # ré fa la do (ré mineur 7) sur deux octaves

EVENEMENTS = []


def ev(sec, kind, **kw):
    EVENEMENTS.append({'t': round(sec, 4), 'image': fr(sec), 'type': kind, **kw})


def hook(sec):
    return HOOK[int(round(sec / BEAT)) % 8]


# ---------------------------------------------------------------- S1 l'accroche (mesures 0-1)
ev(t(0), 'ligne_trace')                                # une ligne se trace d'un bord à l'autre
for k in (1, 2, 3):                                    # la balle tombe et rebondit sur les temps : elle joue la mélodie
    ev(t(0, k), 'balle', index=k - 1, note=hook(t(0, k)))
ev(t(1), 'balle_ecrase', note=hook(t(1)))              # 4e choc : elle s'écrase, s'étale et devient le premier mot
for k, ch in enumerate('CHAQUE'):                      # les lettres jaillissent de la ligne, une par double croche
    ev(t(1, k * 0.25), 'lettre', mot='CHAQUE', index=k, lettre=ch, note=MINEUR[k % 8] - 12)
for k, ch in enumerate('SEMAINE,'):                    # puis tombent du haut et rebondissent
    ev(t(1, 2 + k * 0.25), 'lettre', mot='SEMAINE,', index=k, lettre=ch, note=MINEUR[(7 - k) % 8] - 12)
NOMS_CACHES = ['GPT-5', 'CLAUDE', 'GEMINI', 'LLAMA', 'MISTRAL', 'QWEN', 'DEEPSEEK', 'GROK',
               'KIMI', 'GEMMA', 'PHI-4', 'SORA', 'VEO', 'FLUX', 'SUNO', 'COPILOT']

# ---------------------------------------------------------------- S2 les logos (mesures 2-4)
ev(t(2), 'etire', texte='DE NOUVELLES ACTUS')          # la phrase s'étire comme un élastique (au pluriel : il y en a plusieurs)
ev(t(2, 2), 'crypte', texte="SUR L'IA.")               # en lettres de caractères : déchirure cryptée
ev(t(2, 3), 'rebond', texte="SUR L'IA.")
LOGOS = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek', 'mistral', 'meta', 'suno', 'elevenlabs',
         'midjourney', 'perplexity', 'huggingface']
ev(t(3), 'eclat')                                      # « SUR L'IA. » vole en éclats : les éclats deviennent les logos
for k, nom in enumerate(LOGOS):
    ev(t(3, k * 0.25), 'logo_ia', index=k, logo=nom, note=MINEUR[k % 8])
ev(t(3), 'etire', texte='TOUT LE MONDE')
for k, ch in enumerate('REGARDE'):
    ev(t(3, 2 + k * 0.25), 'lettre', mot='REGARDE', index=k, lettre=ch, note=MINEUR[(k + 2) % 8] - 12)
ev(t(4), 'surface_ligne')                              # les logos se posent sur la ligne : la surface
ev(t(4), 'crypte', texte='LA SURFACE.')
for k in (1, 2, 3):                                    # ils flottent, comme des bouées, sur les temps
    ev(t(4, k), 'bouee', index=k, note=hook(t(4, k)) - 12)

# ---------------------------------------------------------------- S3 la ligne (mesure 5, la montée)
ev(t(5), 'ligne')
ev(t(5), 'mot', texte='NOUS,')
ev(t(5, 1), 'crypte', texte='ON PLONGE.')
for k in range(len(LOGOS)):                            # les logos coulent un à un (doubles croches)
    ev(t(5, k * 0.25), 'coule', index=k, logo=LOGOS[k], note=MINEUR[(7 - k) % 8])
ev(t(5, 2), 'surface')                                 # la ligne bascule en nappe de points (l'eau)
ev(t(5, 3), 'chute')                                   # la caméra tombe vers l'eau

# ---------------------------------------------------------------- la 3D (v1 décalée) : plongée, station, bureau
TYPES_3D = {'plongeon', 'cloche', 'fouet', 'chant', 'passage', 'grincement', 'etincelle', 'touche', 'choeur',
            'etincelle_claude', 'sonar', 'led', 'boucle', 'trappe', 'sas', 'coupe_ecran'}
for e in V1['evenements']:
    if e['type'] in TYPES_3D:
        e2 = {k: v for k, v in e.items() if k not in ('t', 'image')}
        ev(e['t'] + DECALAGE_3D, e['type'], t3d=e['t'], **e2)
# la baleine passe devant la caméra : le sonar révèle sur elle le logo DeepSeek (trois notes de verre),
# puis il s'égrène pendant qu'elle sort du cadre
t_passage = next(e['t'] for e in EVENEMENTS if e['type'] == 'passage')
ev(t_passage, 'deepseek', notes=[74, 81, 86], fin=round(t_passage + 0.6, 4))
# pendant le piano : les logos d'applis de musique IA s'allument, sombres, sur ses notes (Suno d'abord)
MUSIQUE_IA = ['suno', 'udio', 'stableaudio', 'aiva', 'mubert', 'elevenmusic', 'riffusion', 'soundraw']
touches = [e for e in EVENEMENTS if e['type'] == 'touche']
for k, e in enumerate(touches):
    ev(e['t'], 'appli_musique', index=k, logo=MUSIQUE_IA[k % len(MUSIQUE_IA)], note=e['note'])

# ---------------------------------------------------------------- S4 le logo
ev(t(16), 'logo_montee')
ev(t(17), 'logo')                                      # dernier coup : PARANO-IA


def main():
    data = {
        'version': 2, 'fps': FPS, 'bpm': BPM, 'temps': BEAT, 'mesure': BAR, 'duree': DUREE, 'images': fr(DUREE),
        'largeur': 1080, 'hauteur': 1920,
        'decalage_3d': DECALAGE_3D,
        'plaques': {'plongee': {'debut': t(6), 'premiere_image_3d': 240, 'images': 336},
                    'bureau': {'debut': t(13), 'premiere_image_3d': 576, 'images': 144}},
        'musique': {'tonalite': 'ré mineur harmonique', 'montage': MUSIQUE},
        'plans': [{**p, 'image_debut': fr(p['debut']), 'image_fin': fr(p['fin'])} for p in PLANS],
        'hook': HOOK, 'logos': LOGOS, 'noms_caches': NOMS_CACHES, 'musique_ia': MUSIQUE_IA,
        'evenements': sorted(EVENEMENTS, key=lambda e: (e['t'], e['type'])),
    }
    json.dump(data, open(os.path.join(HERE, 'partition.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(HERE, 'assets', 'data'), exist_ok=True)
    with open(os.path.join(HERE, 'assets', 'data', 'partition.js'), 'w', encoding='utf8') as fjs:
        fjs.write('window.PARTITION = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    print(f"partition.json v2 : {data['duree']} s, {data['images']} images, {len(EVENEMENTS)} évènements")
    for p in data['plans']:
        print(f"  {p['id']} {p['nom']:10s} {p['debut']:6.2f}–{p['fin']:6.2f} s  images {p['image_debut']}–{p['image_fin']}")


if __name__ == '__main__':
    main()
