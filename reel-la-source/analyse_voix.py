#!/usr/bin/env python3
"""Analyse de la voix enregistrée : synchro labiale du robot + attaques des syllabes.

  python3 analyse_voix.py            # après transcrire_voix.py (media/voix/asr.json)

- voix_bouche.js : window.VOICE_MOUTH, une lettre par image (30 i/s) : '.' bouche au repos
  (l'expression reprend la main), 'f' fermée, 'm' mi-ouverte, 'u' ouverte, 'o' ronde.
  Forme choisie par l'énergie de la voix (et sa brillance pour le 'o'), seulement pendant
  que des mots sont prononcés (instants de la reconnaissance), pour ignorer souffle et bruit.
- media/voix/onsets.json : attaques (montées brusques d'énergie), pour que aligne_voix.js
  cale chaque mot sur le début réel du son (la reconnaissance donne l'instant ~0,1-0,25 s tard).
Prend media/voix/voix_seule.wav si elle existe (voix sans musique), sinon media/voix/voix.wav.
"""
import json
import os

import numpy as np

from mix_sons import SR, load

HERE = os.path.dirname(os.path.abspath(__file__))
V = os.path.join(HERE, os.environ.get('VOIX_DIR', os.path.join('media', 'voix')))   # VOIX_DIR=media/voix_ia : voix IA
FPS = 30


def main():
    src = os.path.join(V, 'voix_seule.wav')
    if not os.path.exists(src):
        src = os.path.join(V, 'voix.wav')
    x = load(src).mean(axis=1)
    asr = json.load(open(os.path.join(V, 'asr.json')))
    words = []
    for tok, t in zip(asr['tokens'], asr['ts']):
        if tok.startswith(' ') or not words:
            words.append(t)
    words = np.array(words)

    # enveloppe 10 ms (dB) et brillance (centroïde spectral) par fenêtre de 40 ms
    hop = SR // 100
    n = len(x) // hop
    e = 10 * np.log10((x[:n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
    floor = np.percentile(e, 15)

    # attaques : +6 dB en 50 ms, nettement au-dessus du bruit de fond
    rise = np.zeros(n)
    rise[5:] = e[5:] - e[:-5]
    on = [i for i in range(5, n) if rise[i] > 6 and e[i] > floor + 14 and rise[i - 1] <= 6]
    json.dump([round(i / 100, 3) for i in on], open(os.path.join(V, 'onsets.json'), 'w'))

    # zones de parole : autour de chaque mot reconnu (la reconnaissance marque le début des mots)
    speaking = np.zeros(n, bool)
    for k, t in enumerate(words):
        a = t - 0.25
        b = min(words[k + 1] - 0.02 if k + 1 < len(words) else t + 0.7, t + 0.75)
        speaking[max(0, int(a * 100)):int(b * 100)] = True
    speaking &= e > floor + 8

    frames = int(len(x) / SR * FPS)
    lv = np.array([e[min(n - 1, int(f / FPS * 100)) - 2:min(n - 1, int(f / FPS * 100)) + 3].max() if f else e[0]
                   for f in range(frames)])
    sp = np.array([speaking[min(n - 1, int(f / FPS * 100))] for f in range(frames)])
    def centroid(f):
        c0 = int(f / FPS * SR)
        seg = x[max(0, c0 - 882):c0 + 882]
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        band = (fr > 150) & (fr < 4000)
        return (S[band] * fr[band]).sum() / (S[band].sum() + 1e-12)
    cen = np.array([centroid(f) if sp[f] else 0 for f in range(frames)])
    ref, cref = lv[sp], cen[sp]
    p30, p65, c15 = np.percentile(ref, 30), np.percentile(ref, 65), np.percentile(cref, 15)
    out = []
    for f in range(frames):
        if not sp[f]:
            out.append('.')
        elif lv[f] < p30:
            out.append('f')
        elif cen[f] < c15:
            out.append('o')        # voyelle sombre, bouche ronde
        else:
            out.append('m' if lv[f] < p65 else 'u')
    # pas de clignotement : une forme tient au moins 2 images
    s = ''.join(out)
    s = ''.join(s[i] if 0 < i < len(s) - 1 and not (s[i - 1] == s[i + 1] != s[i]) else (s[i - 1] if i else s[i])
                for i in range(len(s)))
    with open(os.path.join(HERE, 'voix_bouche.js'), 'w') as fo:
        fo.write('// Généré par analyse_voix.py : forme de la bouche du robot à chaque image (30 i/s).\n')
        fo.write(f'window.VOICE_MOUTH = "{s}";\n')
    talk = sum(c != '.' for c in s) / FPS
    print(f'{src} → voix_bouche.js ({len(s)} images, bouche active {talk:.1f} s), {len(on)} attaques')


if __name__ == '__main__':
    main()
