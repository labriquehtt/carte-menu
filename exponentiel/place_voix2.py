#!/usr/bin/env python3
"""Voix v3 d'EXPONENTIEL (demande du 2026-09-29, soir) : la voix principale jusqu'à « …ne pas encore savoir. »,
sans « Alors l'IA… on est à quel jour ? », puis un blanc (le robot sort du décor 3D), puis la séquence
« alignement » (media/voix_ia/alignement_hugo.mp3, Hugo, même traitement que place_voix.py) qui finit
sur « Affaire à suivre ».

  PYTHONUTF8=1 python place_voix.py && PYTHONUTF8=1 python place_voix2.py   → media/voix_ia/voix.wav (+ voix16k.wav)
"""
import os
import subprocess

import numpy as np

import place_voix as PV

V = PV.V
GAP = 0.95                 # blanc pour la sortie du décor 3D (fouetté + atterrissage dans le motion design)
CUT_WIN = (24.15, 24.85)   # silence entre « savoir » et « Alors l'IA » dans la voix posée par place_voix.py


def quietest(x, w):
    hop = PV.SR // 100
    a0, a1 = int(w[0] * 100), int(w[1] * 100)
    e = [(x[i * hop:(i + 2) * hop] ** 2).mean() for i in range(a0, a1)]
    return (a0 + int(np.argmin(e)) + 1) / 100


def main():
    PV.main()                                               # voix principale → voix.wav
    main_v = PV.load(os.path.join(V, 'voix.wav'))
    cut = quietest(main_v, CUT_WIN)
    head = main_v[:int(cut * PV.SR)].copy()
    n = int(0.03 * PV.SR)
    head[-n:] *= np.linspace(1, 0, n)
    PV.PAUSES = {}                                          # la prise « alignement » : pauses toutes à DEFAULT_CAP
    PV.DEFAULT_CAP = 0.3
    a = PV.tighten(PV.load(os.path.join(V, 'alignement_hugo.mp3')))
    a = PV.ffilter(a, f'atempo={PV.TEMPO}')
    a = PV.ffilter(a, 'acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=2,'
                      'equalizer=f=3200:t=q:w=1.2:g=2,highpass=f=70')
    a = PV.loudnorm(a)
    y = np.concatenate([head, np.zeros(int(GAP * PV.SR), np.float32), a, np.zeros(int(0.3 * PV.SR), np.float32)])
    pcm = np.clip(y, -1, 1).astype('<f4').tobytes()
    for name, ar, ac in (('voix.wav', PV.SR, 2), ('voix16k.wav', 16000, 1)):
        subprocess.run([PV.FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(PV.SR), '-i', '-',
                        '-ac', str(ac), '-ar', str(ar), '-c:a', 'pcm_s16le', os.path.join(V, name)], input=pcm, check=True)
    print(f'coupe à {cut:.2f} s ; alignement {len(a) / PV.SR:.2f} s ; total {len(y) / PV.SR:.2f} s '
          f'(séquence alignement de {cut + GAP:.2f} à {cut + GAP + len(a) / PV.SR:.2f})')


if __name__ == '__main__':
    main()
