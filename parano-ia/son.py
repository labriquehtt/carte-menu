#!/usr/bin/env python3
"""Bande-son de la bande-annonce PARANO-IA (14 s) → out/bande-son.wav, puis la vidéo avec le son.

  python3 son.py --video out/parano-ia-video.mp4 --out out/PARANO-IA-bande-annonce.mp4

Musique : GROOVE (deep tech, 118 BPM, media/music2 du reel, hors Git) calée pour que son drop (56,98 s)
tombe pile quand la mobylette démarre ; coupée net sur le titre, où l'accord final d'OUTRO résonne.
Par-dessus, des sons synthétisés ici (aucun crédit) : montée pendant le gros plan, chutes de sub-basses,
whooshes qui traversent de gauche à droite avant chaque couture, impacts sur les temps forts, moteur de
mobylette, « braaam » de bande-annonce sur l'apocalypse, croc du méca, déclics d'appareil photo, et quelques
bruitages ElevenLabs déjà générés pour le reel (media/sfx) : allumage, papier, hologramme, pop, carillon.
"""
import argparse
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REEL = os.path.join(HERE, '..', 'reel-la-source')
sys.path.insert(0, REEL)
from mix_sons import FF, load, db  # noqa: E402
from mix_musique import button_time  # noqa: E402

SR = 44100
DUR = 14.0
BEAT = 60 / 118
TD = 3 * BEAT
beat = lambda k: TD + k * BEAT
SEAMS = [beat(4), beat(7), beat(10), beat(13), beat(15)]
T_LINEUP, T_TITLE = beat(18), beat(20)
DROP_IN_GROOVE = 56.98
R = np.random.default_rng(7)


def env(n, a, d):   # attaque / décroissance exponentielle
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def svf(x, fc, q=0.7, mode='bp'):   # filtre d'état variable, fréquence qui peut varier (tableau)
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    lo = bp = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        hp = x[i] - lo - bp / q
        bp += f[i] * hp
        lo += f[i] * bp
        out[i] = bp if mode == 'bp' else lo if mode == 'lp' else hp
    return out


def st(mono, pan=0.0):   # mono → stéréo, pan de -1 (gauche) à 1 (droite), éventuellement variable
    p = np.broadcast_to(np.asarray(pan, dtype=float), mono.shape)
    return np.stack([mono * np.sqrt((1 - p) / 2), mono * np.sqrt((1 + p) / 2)], axis=1).astype(np.float32)


def put(mix, snd, t0, gain_db=0.0):
    i = int(round(t0 * SR))
    if i < 0:
        snd, i = snd[-i:], 0
    snd = snd[:len(mix) - i]
    mix[i:i + len(snd)] += snd * db(gain_db)


def sub_drop(d=0.9, f0=78, f1=28):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (d / 3))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, d / 2.2)
    return st(np.tanh(x * 1.8) * 0.9)


def impact(d=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (48 + 30 * np.exp(-t / 0.03)) * t) * env(n, 0.001, 0.18)
    crack = svf(R.standard_normal(n), 2500, 0.8, 'hp') * env(n, 0.0005, 0.03) * 0.5
    return st(np.tanh((boom + crack) * 1.6) * 0.8)


def whoosh(d=0.42, rise=0.75):   # bruit filtré qui monte puis retombe, traverse de gauche à droite
    n = int(d * SR); u = np.arange(n) / n
    shape = np.where(u < rise, (u / rise) ** 2, np.exp(-(u - rise) / 0.08))
    fc = 400 + 3800 * np.where(u < rise, u / rise, 1 - (u - rise) / (1 - rise) * 0.6)
    x = svf(R.standard_normal(n), fc, 1.3) * shape
    return st(x / (np.abs(x).max() + 1e-9) * 0.8, pan=-0.9 + 1.8 * u)


def riser(d):
    n = int(d * SR); u = np.arange(n) / n
    noise = svf(R.standard_normal(n), 300 + 5000 * u ** 2, 1.5) * u ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(180 + 900 * u ** 2) / SR) * u ** 3 * 0.35
    x = noise / (np.abs(noise).max() + 1e-9) * 0.7 + tone
    return st(x * 0.8)


def braam(d=1.6):   # cuivres graves désaccordés de bande-annonce
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f, a in ((55, 1), (55.6, 0.9), (82.4, 0.6), (110.3, 0.5), (41.2, 0.7)):
        ph = 2 * np.pi * f * t
        x += a * (2 * ((ph / (2 * np.pi)) % 1) - 1)   # dent de scie
    x = svf(x, 150 + 900 * np.minimum(1, t / 0.25) * np.exp(-t / 0.9), 0.9, 'lp')
    x *= env(n, 0.03, 0.8)
    return st(np.tanh(x / (np.abs(x).max() + 1e-9) * 2.2) * 0.85)


def moped(d=2.4):   # deux-temps : impulsions ~ 40 → 90 Hz qui montent au démarrage puis ronronnent
    n = int(d * SR); t = np.arange(n) / SR
    f = 40 + 55 * (1 - np.exp(-t / 0.18)) + 6 * np.sin(2 * np.pi * 7 * t)
    ph = np.cumsum(f) / SR
    pulse = (np.sin(2 * np.pi * ph) > 0.6).astype(float) - 0.15
    x = svf(pulse + 0.2 * R.standard_normal(n), 900, 0.8, 'lp')
    x *= np.minimum(1, t / 0.02) * (0.55 + 0.45 * np.exp(-t / 0.4)) * np.minimum(1, (d - t) / 0.3)
    return st(x / (np.abs(x).max() + 1e-9) * 0.7)


def crunch():
    out = np.zeros((int(0.5 * SR), 2), np.float32)
    for k, dt in enumerate((0.0, 0.11, 0.22)):
        n = int(0.09 * SR)
        x = svf(R.standard_normal(n), 1400 - k * 300, 0.9) * env(n, 0.001, 0.03) + np.sin(2 * np.pi * 70 * np.arange(n) / SR) * env(n, 0.001, 0.05)
        i = int(dt * SR); out[i:i + n] += st(x / (np.abs(x).max() + 1e-9) * (0.9 - k * 0.2))
    return out


def shutter():
    n = int(0.12 * SR)
    x = np.zeros(n)
    for dt in (0.0, 0.055):
        m = int(0.006 * SR); i = int(dt * SR)
        x[i:i + m] += svf(R.standard_normal(m), 3000, 1.0, 'hp') * np.hanning(m)
    return st(x / (np.abs(x).max() + 1e-9) * 0.8)


def sfx(name):
    return load(os.path.join(REEL, 'media', 'sfx', name + '.mp3'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wav', default=os.path.join(HERE, 'out', 'bande-son.wav'))
    ap.add_argument('--video')
    ap.add_argument('--out')
    a = ap.parse_args()
    N = int(DUR * SR)
    mus = np.zeros((N, 2), np.float32)
    fx = np.zeros((N, 2), np.float32)

    # musique : le drop de GROOVE sur le départ de la mobylette, coupée net sur le titre
    grv = load(os.path.join(REEL, 'media', 'music2', 'GROOVE.mp3'))
    m0 = DROP_IN_GROOVE - TD
    seg = grv[int(m0 * SR):int((m0 + T_TITLE + 0.03) * SR)].copy()
    k = int(0.03 * SR); seg[-k:] *= np.linspace(1, 0, k, dtype=np.float32)[:, None]
    k = int(0.4 * SR); seg[:k] *= np.linspace(0.3, 1, k, dtype=np.float32)[:, None]
    put(mus, seg, 0.0, -1)
    # accord final d'OUTRO : il résonne sous le titre
    out = load(os.path.join(REEL, 'media', 'music2', 'OUTRO.mp3'))
    bt = button_time(out) or (len(out) / SR - 3)
    ring = out[int((bt - 0.02) * SR):int((bt - 0.02 + DUR - T_TITLE + 0.2) * SR)].copy()
    k = int(0.9 * SR); ring[-k:] *= np.linspace(1, 0, k, dtype=np.float32)[:, None]
    put(mus, ring, T_TITLE, 0)

    # gros plan : allumage de l'écran, montée jusqu'au drop, moteur qui démarre
    put(fx, sfx('BOOT'), 0.22, -4)
    put(fx, riser(TD - 0.05), 0.05, -9)
    put(fx, moped(2.4), TD - 0.12, -12)
    put(fx, sub_drop(), TD, -3)
    put(fx, impact(), TD, -6)
    # coutures : whoosh gauche → droite puis impact sur le temps
    for s in SEAMS:
        w = whoosh()
        put(fx, w, s - 0.75 * len(w) / SR, -5)
        put(fx, impact(), s, -7)
    put(fx, sfx('HOLO'), SEAMS[0] + 0.1, -14)
    put(fx, sfx('PAPER'), SEAMS[2] - 0.12, -6)
    put(fx, crunch(), beat(12), -4)
    put(fx, sfx('WOBBLE'), SEAMS[3] + 0.05, -12)
    put(fx, braam(), SEAMS[4], -4)
    put(fx, sub_drop(1.2, 60, 24), SEAMS[4], -6)
    # alignement des suspects : flash + déclic à chaque demi-temps
    for i in range(4):
        put(fx, shutter(), T_LINEUP + i * BEAT / 2, -6)
    put(fx, riser(BEAT / 2 + 0.05), T_TITLE - BEAT / 2 - 0.05, -10)
    # titre
    put(fx, sub_drop(1.4, 90, 26), T_TITLE, 0)
    put(fx, impact(0.8), T_TITLE, -3)
    put(fx, sfx('CHIME'), T_TITLE + BEAT, -10)
    put(fx, sfx('POP'), T_TITLE + 2 * BEAT, -8)
    put(fx, sfx('SNAP'), T_TITLE + 3 * BEAT - 0.01, -8)
    put(fx, sfx('GLINT'), T_TITLE + 3 * BEAT + 0.05, -9)

    mixd = mus * db(-2) + fx
    # niveau Instagram : ~ -14 LUFS, crêtes à -1 dBFS (ffmpeg loudnorm + limiteur)
    os.makedirs(os.path.dirname(a.wav), exist_ok=True)
    raw = np.clip(mixd, -4, 4).astype('<f4').tobytes()
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-',
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9,alimiter=limit=0.89:level=false', '-ar', str(SR), '-c:a', 'pcm_s16le', a.wav],
                   input=raw, check=True)
    print('bande-son :', a.wav)
    if a.video and a.out:
        subprocess.run([FF, '-v', 'error', '-y', '-i', a.video, '-i', a.wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', a.out], check=True)
        print('vidéo :', a.out)


if __name__ == '__main__':
    main()
