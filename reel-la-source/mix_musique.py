#!/usr/bin/env python3
"""Monte la musique ElevenLabs sur mesure, calée sur les repères de la vidéo.

  python3 mix_musique.py                    # → out/musique.wav (116 s)
  python3 mix_musique.py --sfx out/bruitages.wav --video out/LA-SOURCE-reel-final-v3.mp4 \\
      --out out/LA-SOURCE-reel-son.mp4      # + out/bande-son.wav (musique + bruitages) et la vidéo

Quatre morceaux générés séparément (media/music/<PART>.mp3, hors Git), même tonalité et
même tempo, puis coupés et enchaînés ici aux repères `music` de sons_cues.json :
  GROOVE   du dézoom jusqu'à « La Source. » (arrêt net), avec un bégaiement 8-bit sur le glitch
  SUSPENS  « presque rien » après l'arrêt, ralenti façon bande qui freine, jusqu'au silence
  REVE     le rêve du robot, fondu à « Hallucination »
  OUTRO    fin LK Studio, l'accord final posé pile sur le coup de chapeau
Le gros plan d'ouverture reste sans musique : on y entend le son du clip.
"""
import argparse
import json
import os
import subprocess

import numpy as np

from mix_sons import FF, HERE, SR, db, fade, load, trim_head

BPM = 92
LEVEL = {'GROOVE': -24, 'SUSPENS': -29, 'REVE': -28, 'OUTRO': -23}   # énergie moyenne visée (dB)


def rms_db(a):
    return 10 * np.log10((a ** 2).mean() + 1e-12)


def part(src, name):
    s = trim_head(load(os.path.join(src, name + '.mp3')), -40)
    return s * db(LEVEL[name] - rms_db(s))


def put(mix, s, t0):
    i = int(round(t0 * SR))
    s = s[:len(mix) - i]
    mix[i:i + len(s)] += s


def envelope(a, t0, t1, pts):
    """Enveloppe de gain (en linéaire) définie par des points (temps absolu, gain)."""
    tt = t0 + np.arange(len(a)) / SR
    return a * np.interp(tt, [p[0] for p in pts], [p[1] for p in pts]).astype(np.float32)[:, None]


def stutter(seg, beat):
    """Bégaiement 8-bit : la même tranche répétée de plus en plus vite, échantillonnage grossier."""
    n = len(seg)
    u = np.arange(n) / SR
    L = np.where(u < 0.9, beat / 4, np.where(u < 1.6, beat / 8, beat / 16))
    src = ((u % L) * SR).astype(int)
    out = seg[np.clip(src, 0, n - 1)]
    out = out[(np.arange(n) // 6) * 6]                  # tenue d'échantillon (≈ 7 kHz)
    peak = np.abs(out).max() + 1e-9
    return np.round(out / peak * 7) / 7 * peak * db(-2)   # 4 bits


def tape_stop(seg, rate_end):
    """Ralenti de bande : la vitesse de lecture descend de 1 à rate_end (la hauteur aussi)."""
    n = len(seg)
    rate = np.linspace(1, rate_end, n)
    pos = np.cumsum(rate) - rate[0]
    idx = np.arange(len(seg))
    return np.stack([np.interp(pos, idx, seg[:, c]) for c in range(2)], axis=1).astype(np.float32)


def usable_length(a):
    """Durée avant le fondu de fin du morceau généré (énergie à -6 dB de la médiane)."""
    w = int(0.25 * SR)
    n = len(a) // w
    e = 10 * np.log10((a[:n * w] ** 2).mean(axis=1).reshape(n, w).mean(axis=1) + 1e-12)
    ok = np.nonzero(e > np.median(e) - 6)[0]
    return (ok[-1] + 1) * w / SR


def fit(a, need, bpm=BPM):
    """Étire légèrement le morceau (hauteur conservée) pour que son plein tienne `need` secondes."""
    u = usable_length(a)
    if u >= need:
        return a
    k = u / (need + 0.3)
    out = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-',
                          '-af', f'atempo={k:.5f}', '-f', 'f32le', '-'],
                         input=a.astype('<f4').tobytes(), capture_output=True, check=True).stdout
    print(f'groove : étiré de {(1 / k - 1) * 100:.1f} % ({bpm:g} → {bpm * k:.1f} BPM) pour tenir jusqu\'à l\'arrêt')
    return np.frombuffer(out, dtype=np.float32).reshape(-1, 2).copy()


def button_time(a):
    """Instant du dernier gros coup (l'accord final) dans le dernier tiers du morceau."""
    w = int(0.02 * SR)
    e = np.convolve((a ** 2).mean(axis=1), np.ones(w) / w, 'same')
    e_db = 10 * np.log10(e + 1e-12)
    rise = np.zeros_like(e_db)
    lag = int(0.06 * SR)
    rise[lag:] = e_db[lag:] - e_db[:-lag]
    start = int(len(a) * 0.6)
    loud = e_db > e_db.max() - 10
    cand = np.nonzero((rise > 9) & loud & (np.arange(len(a)) >= start))[0]
    return cand[-1] / SR - 0.03 if len(cand) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.path.join(HERE, 'media', 'music'))
    ap.add_argument('--bpm', type=float, default=BPM)
    ap.add_argument('--wav', default=os.path.join(HERE, 'out', 'musique.wav'))
    ap.add_argument('--sfx')
    ap.add_argument('--video')
    ap.add_argument('--out')
    a = ap.parse_args()

    data = json.load(open(os.path.join(HERE, 'sons_cues.json')))
    M = {m['name']: m['t'] for m in data['music']}
    cue = {c['id']: c['t'] for c in reversed(data['cues'])}   # 1re occurrence de chaque son
    total = int(round(data['duration'] * SR))
    beat = 60 / a.bpm
    mix = np.zeros((total, 2), dtype=np.float32)

    # GROOVE : du dézoom à l'arrêt net sur « La Source. »
    g0, stop = M['Groove'], M['STOP']
    g = fit(part(a.src, 'GROOVE'), stop - g0, a.bpm)[:int((stop - g0) * SR)].copy()
    gl0, gl1 = int((M['Glitch'] - g0) * SR), int((cue['UNGLITCH'] - g0) * SR)
    g[gl0:gl1] = stutter(g[gl0:gl1].copy(), beat)
    g = fade(g, 0.25, 0.02)
    put(mix, g, g0)

    # SUSPENS : presque rien, puis tout ralentit et s'éteint avant le silence
    s0, sl, silence = stop + 0.35, M['Ralenti'], M['SILENCE']
    s = part(a.src, 'SUSPENS')[:int((silence - s0) * SR)].copy()
    k = int((sl - s0) * SR)
    s[k:] = tape_stop(s[k:], 0.55)
    s = envelope(s, s0, silence, [(s0, 0), (s0 + 1.2, 1), (sl, 1), (silence, 0)])
    put(mix, s, s0)

    # REVE : vibraphone très doux, fondu à « Hallucination » (la note grave est un bruitage)
    r0, noir = M['Rêve'], M['Noir']
    r = part(a.src, 'REVE')[:int((noir + 2.0 - r0) * SR)].copy()
    r = envelope(r, r0, noir + 2.0, [(r0, 0), (r0 + 0.5, 1), (noir, 1), (noir + 2.0, 0)])
    put(mix, r, r0)

    # OUTRO : l'accord final tombe sur le coup de chapeau
    o0, fin, end = M['Outro'], M['Fin'], data['duration']
    o = part(a.src, 'OUTRO')
    bt = button_time(o)
    start = fin - bt if bt is not None and fin - bt <= o0 + 2.0 else o0   # peut démarrer jusqu'à 2 s après la reprise
    if start < o0:
        o, start = o[int((o0 - start) * SR):], o0
    o = o[:int((end - start) * SR)].copy()
    o = envelope(o, start, end, [(start, 0), (start + 0.3, 1), (end - 1.2, 1), (end, 0)])
    put(mix, o, start)
    print(f'outro : accord final posé à {fin:.2f} s' if bt is not None and fin - bt <= o0 + 2.0
          else f'outro : accord final non calé, morceau posé à {start:.2f} s')

    def write(x, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
        subprocess.run([FF, '-v', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', str(SR), '-i', '-', path],
                       input=pcm, check=True)

    write(mix, a.wav)
    print('musique :', a.wav)
    if a.sfx:
        both = mix + load(a.sfx)[:total]
        k, ceil = db(-8), db(-3)   # même limiteur doux que les bruitages
        x = np.abs(both)
        over = x > k
        both[over] = np.sign(both[over]) * (k + (ceil - k) * np.tanh((x[over] - k) / (ceil - k)))
        bs = os.path.join(os.path.dirname(a.wav), 'bande-son.wav')
        write(both, bs)
        print('bande-son :', bs)
        if a.video and a.out:
            subprocess.run([FF, '-v', 'error', '-y', '-i', a.video, '-i', bs, '-map', '0:v', '-map', '1:a',
                            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart',
                            a.out], check=True)
            print('vidéo :', a.out)


if __name__ == '__main__':
    main()
