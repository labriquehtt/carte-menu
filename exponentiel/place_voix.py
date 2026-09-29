#!/usr/bin/env python3
"""Voix d'EXPONENTIEL : prise unique de Sébas (eleven_v3) → media/voix_ia/voix.wav (+ voix16k.wav).

  PYTHONUTF8=1 python place_voix.py

Source (hors Git) : media/voix_ia/exponentiel_sebas.mp3 (32,56 s brute, flow ElevenLabs
https://elevenlabs.io/app/flows/my2I2EZxu63yKmSuJ8Hr). Un seul bloc, pas de recalage sur une ancienne voix :
chaque pause est plafonnée selon sa ponctuation (PAUSES, repérées sur la prise brute), le reste à
DEFAULT_CAP ; puis tempo ×TEMPO (hauteur conservée), compression douce et sonie à -16 LUFS.
Objectif du brief : la voix finit avant 27,5 s.
"""
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'reel-la-source'))
from place_voix_ia import SR, load, ffilter, silent_frames   # noqa: E402  (chaîne de LA SOURCE)
from mix_sons import FF                                      # noqa: E402

V = os.path.join(HERE, 'media', 'voix_ia')
PRISE = os.path.join(V, 'exponentiel_sebas.mp3')
LEAD = 0.12              # silence avant le premier mot
TEMPO = 1.0
FLOOR = 25               # silence : 25 dB sous le 95e centile (respirations comprises)
MIN_PAUSE = 0.12
DEFAULT_CAP = 0.25
# début approximatif de la pause dans la prise brute (s) → durée gardée (s)
PAUSES = {
    1.01: 0.25,   # Faites trente pas :
    2.00: 0.30,   # trente mètres.
    4.05: 0.40,   # Trente pas qui doublent…
    6.27: 0.35,   # …le tour de la Terre.
    8.07: 0.30,   # L'IA, c'est pareil.
    13.72: 0.30,  # …en trois secondes.
    15.23: 0.30,  # Six ans plus tard :
    16.44: 0.30,  # une heure.
    18.44: 0.40,  # Treize mois plus tard…
    19.70: 0.35,  # au moins seize heures.
    21.07: 0.28,  # Le piège :
    25.43: 0.35,  # …le trentième jour.
    26.70: 0.40,  # La veille ?
    27.87: 0.40,  # À moitié.
    29.58: 0.35,  # Alors l'IA…
    30.82: 0.45,  # on est à quel jour ?
}


def cap_for(t):
    k = min(PAUSES, key=lambda p: abs(p - t))
    return PAUSES[k] if abs(k - t) < 0.25 else DEFAULT_CAP


def tighten(x):
    hop = SR // 100
    sil = silent_frames(x, np.percentile(10 * np.log10(
        (x[:len(x) // hop * hop].reshape(-1, hop) ** 2).mean(axis=1) + 1e-12), 95) - FLOOR)
    talk = np.nonzero(~sil)[0]
    a, b = max(0, talk[0] - 3), min(len(sil), talk[-1] + 8)
    keep, i = [], a
    while i < b:
        j = i
        while j < b and sil[j] == sil[i]:
            j += 1
        if sil[i] and j - i >= MIN_PAUSE * 100:
            m = int(round(cap_for(i / 100) * 100))
            if j - i > m:   # garde les deux bords du silence (fin et attaque des mots), enlève le milieu
                keep += [(i, i + m // 2), (j - (m - m // 2), j)]
            else:
                keep.append((i, j))
        else:
            keep.append((i, j))
        i = j
    xf = int(0.005 * SR)
    out = x[keep[0][0] * hop:keep[0][1] * hop]
    for p, q in keep[1:]:
        seg = x[p * hop:q * hop]
        if len(out) > xf and len(seg) > xf:   # fondu enchaîné de 5 ms à chaque raccord
            r = np.linspace(0, 1, xf, dtype=np.float32)
            out = np.concatenate([out[:-xf], out[-xf:] * (1 - r) + seg[:xf] * r, seg[xf:]])
        else:
            out = np.concatenate([out, seg])
    return out


def loudnorm(x, target=-16.0):
    af = f'loudnorm=I={target}:TP=-1.5:LRA=11'
    r = subprocess.run([FF, '-hide_banner', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-',
                        '-af', af + ':print_format=json', '-f', 'null', '-'],
                       input=x.astype('<f4').tobytes(), capture_output=True, check=True).stderr.decode()
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    return ffilter(x, af + f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")


def main():
    x = load(PRISE)
    y = tighten(x)
    y = ffilter(y, f'atempo={TEMPO}')
    y = ffilter(y, 'acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=2,'
                   'equalizer=f=3200:t=q:w=1.2:g=2,highpass=f=70')
    y = np.concatenate([np.zeros(int(LEAD * SR), np.float32), loudnorm(y), np.zeros(int(0.3 * SR), np.float32)])
    pcm = np.clip(y, -1, 1).astype('<f4').tobytes()
    for name, ar, ac in (('voix.wav', SR, 2), ('voix16k.wav', 16000, 1)):
        subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-',
                        '-ac', str(ac), '-ar', str(ar), '-c:a', 'pcm_s16le', os.path.join(V, name)], input=pcm, check=True)
    subprocess.run([FF, '-v', 'error', '-y', '-i', os.path.join(V, 'voix.wav'), '-c:a', 'libmp3lame', '-b:a', '192k',
                    os.path.join(V, 'EXPONENTIEL-voix.mp3')], check=True)
    print(f'brute {len(x) / SR:.2f} s → resserrée {len(y) / SR:.2f} s (voix finie vers {len(y) / SR - 0.3:.2f} s)')


if __name__ == '__main__':
    main()
