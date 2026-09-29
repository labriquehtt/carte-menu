#!/usr/bin/env python3
"""timing.json : début et fin de chaque plan + instants clés, calés sur les mots de la voix finale.

  PYTHONUTF8=1 python ../reel-la-source/transcrire_voix.py --model ../../models/sherpa-onnx-streaming-zipformer-fr-2023-04-14 \
      --wav media/voix_ia/voix16k.wav --beam        # → media/voix_ia/asr.json
  PYTHONUTF8=1 python timing.py                     # → timing.json (lu par Blender, le moteur 2D, les bruitages, la musique)

Les instants de la reconnaissance vocale (sherpa-onnx) arrivent ~0,15 s après le son : on les avance de LAG.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LAG = 0.15
FPS = 30
DURATION = 29.0
BPM = 118

# plans : (id, mot de départ, n-ième occurrence de ce mot, description)
PLANS = [
    ('P1', 'UN', 1, 'Étang sous la lune : les nénuphars doublent, JOUR 1 → 30'),
    ('P2', 'VEILLE', 1, 'Retour en arrière : JOUR 29 = 50 %, JOUR 25 = 3 %'),
    ('P3', 'LIA', 1, 'Le fil vert devient la courbe METR, surf sur un nénuphar'),
    ('P4', 'ET', 1, 'Le labo : l\'IA qui construit l\'IA (auto-amélioration)'),
    ('P5', 'DOUBLEMENT', 1, '4 mois → quelques semaines → 1 semaine ? La courbe se cabre'),
    ('P6', "L'ALIGNEMENT", 1, 'L\'aiguillage : ce qu\'on veut / ce qu\'elle fait'),
    ('P7', 'ALORS', 2, 'Gros plan loupe : JOUR ??'),
    ('P8', 'AFFAIRE', 1, 'Carton final EXPONENTIEL'),
]
# instants clés : (nom, mot, occurrence, décalage en s)
KEYS = [
    ('jour30', 'TRENTIÈME', 1, 0.0),       # l'étang est plein
    ('etang_plein', 'TEMPS', 1, 0.0),       # « l'étang » (entendu « tous les temps » par la reconnaissance)
    ('moitie', 'MOITIÉ', 1, 0.0),          # JOUR 29
    ('cinq_jours', 'CINQ', 1, 0.0),        # rembobinage vers JOUR 25
    ('trois_pct', 'TROIS', 1, 0.0),
    ('courbe', 'COURBE', 1, 0.0),          # le fil vert se soulève
    ('quatre_mois', 'QUATRE', 1, 0.0),
    ('deux_fois', 'DEUX', 1, 0.0),
    ('recherche', 'RECHERCHE', 1, 0.0),
    ('auto', "L'AUTO", 1, 0.0),
    ('semaines', 'SEMAINES', 1, 0.0),
    ('une_seule', 'SEULE', 1, 0.0),        # la courbe se cabre à la verticale
    ('garantit', 'GARANTIT', 1, 0.0),
    ('openai', 'MÊME', 1, 0.0),
    ('pas_savoir', 'SAVOIR', 1, 0.0),
    ('quel_jour', 'QUEL', 1, 0.0),         # silence, tic-tac
    ('iris', 'AFFAIRE', 1, -0.15),
]


def words():
    d = json.load(open(os.path.join(HERE, 'media', 'voix_ia', 'asr.json'), encoding='utf8'))
    out = []
    for tok, t in zip(d['tokens'], d['ts']):
        if tok.startswith(' ') or not out:
            out.append([tok.strip(), round(max(0.0, t - LAG), 2)])
        else:
            out[-1][0] += tok
    return out


def find(ws, word, nth):
    hits = [t for w, t in ws if w == word]
    if len(hits) < nth:
        raise SystemExit(f'mot introuvable : {word} (occurrence {nth}) dans {[w for w, _ in ws]}')
    return hits[nth - 1]


def main():
    ws = words()
    starts = [find(ws, w, n) for _, w, n, _ in PLANS]
    starts[0] = 0.0
    plans = []
    for i, (pid, _, _, desc) in enumerate(PLANS):
        end = starts[i + 1] if i + 1 < len(PLANS) else DURATION
        plans.append({'id': pid, 'start': starts[i], 'end': round(end, 2), 'frames': [round(starts[i] * FPS), round(end * FPS)],
                      'desc': desc})
    keys = {name: round(find(ws, w, n) + dt, 2) for name, w, n, dt in KEYS}
    # nénuphars : un doublement par temps de musique pendant P1, jusqu'au 30e jour
    beat = 60 / BPM
    j30 = keys['jour30']
    keys['doublements_P1'] = [round(j30 - beat * k / 2, 3) for k in range(29, -1, -1) if j30 - beat * k / 2 >= 0.15]
    out = {'fps': FPS, 'duration': DURATION, 'bpm': BPM, 'voice': 'media/voix_ia/voix.wav', 'plans': plans, 'keys': keys,
           'words': ws}
    json.dump(out, open(os.path.join(HERE, 'timing.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    for p in plans:
        print(f"{p['id']}  {p['start']:5.2f} → {p['end']:5.2f}  ({p['end'] - p['start']:.2f} s)  {p['desc']}")
    print({k: v for k, v in keys.items() if k != 'doublements_P1'})
    print(len(keys['doublements_P1']), 'doublements dans P1')


if __name__ == '__main__':
    main()
