#!/usr/bin/env python3
"""Monte la voix IA (ElevenLabs, voix « Benjamin ») sur la vidéo → media/voix_ia/voix.wav (116 s).

  python3 place_voix_ia.py        # puis transcription, analyse, alignement (voir CLAUDE.md)

Sources (media/voix_ia/, hors Git) : la prise complète du texte (prise_benjamin.mp3), une reprise
de « D'ailleurs, il a quitté Meta… » (meta_a.mp3, mal articulée dans la prise) et le passage du
rêve relu d'une voix endormie (reve.mp3). Chaque paragraphe est posé là où la vidéo l'attend
(début du passage correspondant de la voix enregistrée), jamais avant la fin du précédent.
Pour une lecture plus dynamique : pauses internes raccourcies (PAUSE) et tempo légèrement accéléré
(TEMPO, hauteur conservée). Le rêve garde des pauses plus longues et son tempo d'origine.
Enfin un peu de compression et de présence, pour une voix qui passe devant la musique.
"""
import os
import subprocess

import numpy as np

from mix_sons import FF, HERE

SR = 44100
V = os.path.join(HERE, 'media', 'voix_ia')
DURATION = 116.0
TEMPO, PAUSE = 1.07, 0.30          # lecture normale : plus vive, pauses courtes
DREAM_TEMPO, DREAM_PAUSE = 1.0, 0.50
GAP = 0.30                          # silence minimal entre deux paragraphes

# (fichier, début, fin dans ce fichier, instant visé dans la vidéo ou None = à la suite, rêve ?)
BLOCS = [
    ('prise_benjamin.mp3', 0.0, 5.40, 1.46, False),      # On a demandé à une IA…
    ('prise_benjamin.mp3', 6.75, 13.50, 6.99, False),    # Ce dessin, c'est celui de Philippe Delord…
    ('prise_benjamin.mp3', 14.60, 24.90, 13.47, False),  # La consigne était simple…
    ('prise_benjamin.mp3', 25.85, 33.75, 22.93, False),  # Et honnêtement, à part Philippe…
    ('prise_benjamin.mp3', 34.70, 38.90, 30.92, False),  # Pour une IA, donner vie…
    ('prise_benjamin.mp3', 39.80, 50.70, 34.78, False),  # Elle n'a jamais vu la vie…
    ('prise_benjamin.mp3', 51.78, 61.85, 46.27, False),  # Et c'est exactement ce que pointe Yann LeCun…
    ('prise_benjamin.mp3', 62.72, 72.75, 56.28, False),  # Pour LeCun, ces modèles…
    ('meta_a.mp3', 0.0, None, 64.42, False),             # D'ailleurs, il a quitté Meta… (reprise)
    ('prise_benjamin.mp3', 78.38, 85.30, None, False),   # ce qu'on appelle les world models…
    ('prise_benjamin.mp3', 86.25, 94.15, 76.22, False),  # Bref, revenons à ce dessin… La Source.
    ('prise_benjamin.mp3', 95.00, 97.65, 82.80, False),  # Et vous… que voyez-vous couler de ce toit ?
    ('prise_benjamin.mp3', 98.50, 101.70, 85.58, False), # Parce que la machine, elle, n'a rien voulu dire.
    ('reve.mp3', 0.0, None, 88.49, True),                # C'est nous qui cherchons un sens… (endormi)
    ('prise_benjamin.mp3', 116.68, 117.70, 100.92, False),  # Affaire à suivre.
    ('prise_benjamin.mp3', 118.36, 129.12, 102.82, False),  # Les dessins de Philippe Delord…
]


def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def ffilter(x, af):
    out = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-', '-af', af,
                          '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         input=x.astype('<f4').tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def silent_frames(x, floor):
    hop = SR // 100
    n = len(x) // hop
    e = 10 * np.log10((x[:n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
    return e < floor


def tighten(x, floor, cap):
    """Raccourcit à `cap` secondes les silences internes plus longs ; rogne début et fin."""
    sil = silent_frames(x, floor)
    hop = SR // 100
    talk = np.nonzero(~sil)[0]
    if not len(talk):
        return x
    a, b = max(0, talk[0] - 3), min(len(sil), talk[-1] + 6)   # 30 ms avant, 60 ms après
    keep, i = [], a
    while i < b:
        if sil[i]:
            j = i
            while j < b and sil[j]:
                j += 1
            n = j - i
            m = int(cap * 100)
            if n > m:   # garde les deux bords du silence, enlève le milieu
                keep.append((i, i + m // 2))
                keep.append((j - (m - m // 2), j))
            else:
                keep.append((i, j))
            i = j
        else:
            j = i
            while j < b and not sil[j]:
                j += 1
            keep.append((i, j))
            i = j
    parts = [x[p * hop:q * hop] for p, q in keep]
    out = parts[0]
    xf = int(0.005 * SR)
    for p in parts[1:]:   # fondu enchaîné de 5 ms à chaque raccord
        if len(out) > xf and len(p) > xf:
            r = np.linspace(0, 1, xf, dtype=np.float32)
            out = np.concatenate([out[:-xf], out[-xf:] * (1 - r) + p[:xf] * r, p[xf:]])
        else:
            out = np.concatenate([out, p])
    return out


def main():
    cache = {}
    ref = load(os.path.join(V, 'prise_benjamin.mp3'))
    hop = SR // 100
    e = 10 * np.log10((ref[:len(ref) // hop * hop].reshape(-1, hop) ** 2).mean(axis=1) + 1e-12)
    floor = np.percentile(e, 95) - 38
    rms_ref = np.sqrt((ref[~np.repeat(silent_frames(ref, floor), hop)[:len(ref)]] ** 2).mean())
    mix = np.zeros(int(DURATION * SR), np.float32)
    end = 0.0
    for k, (f, t0, t1, target, dream) in enumerate(BLOCS):
        if f not in cache:
            cache[f] = load(os.path.join(V, f))
        x = cache[f][int(t0 * SR):int(t1 * SR) if t1 else None]
        if f != 'prise_benjamin.mp3' and not dream:   # même niveau que la prise principale (le rêve garde sa douceur)
            s = ~np.repeat(silent_frames(x, floor), hop)[:len(x)]
            x = x * rms_ref / (np.sqrt((x[s] ** 2).mean()) + 1e-9)
        x = tighten(x, floor, DREAM_PAUSE if dream else PAUSE)
        tempo = DREAM_TEMPO if dream else TEMPO
        if tempo != 1:
            x = ffilter(x, f'atempo={tempo}')
        start = max(target if target is not None else 0, end + GAP)
        i = int(start * SR)
        x = x[:len(mix) - i]
        mix[i:i + len(x)] += x
        nxt = next((b[3] for b in BLOCS[k + 1:] if b[3] is not None), None)
        end = start + len(x) / SR
        late = f'  +{start - target:.2f} s de retard' if target is not None and start > target + 0.01 else ''
        over = f'  (déborde de {end + GAP - nxt:.2f} s)' if nxt is not None and end + GAP > nxt else ''
        print(f'{start:7.2f} → {end:7.2f}  {f:20s}{late}{over}')
    # voix plus présente : compression douce + un peu de brillance, sans saturer
    mix = ffilter(mix, 'acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=2,'
                       'equalizer=f=3200:t=q:w=1.2:g=2,highpass=f=70')
    mix = mix[:int(DURATION * SR)]
    pcm = np.clip(mix, -1, 1)
    for path, ar, ac in ((os.path.join(V, 'voix.wav'), SR, 2), (os.path.join(V, 'voix16k.wav'), 16000, 1)):
        subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-',
                        '-ac', str(ac), '-ar', str(ar), '-c:a', 'pcm_s16le', path],
                       input=pcm.astype('<f4').tobytes(), check=True)
    print('voix IA :', os.path.join(V, 'voix.wav'), f'(fin de la parole à {end:.2f} s)')


if __name__ == '__main__':
    main()
