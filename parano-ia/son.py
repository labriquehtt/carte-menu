#!/usr/bin/env python3
"""Bande-son de la bande-annonce PARANO-IA (v2, ~21 s) → out/bande-son.wav, puis la vidéo avec le son.

  node cues.js            # (une fois) touches de la route-clavier sous la roue → out/cues.json
  python3 son.py --video out/parano-ia-brut.mp4 --out out/PARANO-IA-bande-annonce.mp4

Tous les instants viennent de timing.js (les mêmes que l'animation).
Musique : GROOVE (deep tech, 118 BPM, la mineur ; media/music2 du reel, hors Git) calée pour que son drop
(56,98 s) tombe quand la mobylette démarre ; coupée net sur le titre, où l'accord final d'OUTRO résonne.
Dans le monde de la musique, GROOVE passe derrière un filtre (il ne reste que la basse et la grosse caisse)
et c'est le robot qui joue : une note de piano à chaque touche où il saute (la mineur pentatonique), la
batterie coup pour coup (grosse caisse, caisse claire, toms, crash), un glissando quand la mobylette roule
sur la route-clavier ; le filtre se rouvre d'un coup pour la couture suivante.
Combat : crissement de freins, apparition du clone, cloche du ring, coup dans l'oreille (« boïng » du
ressort), trois coups, charge et boule d'énergie, explosion en éclats, K.O. et foule en délire.
Le reste comme la v1 : montée, sub-basses, whooshes gauche → droite, impacts, moteur, braaam, croc, déclics,
et quelques bruitages ElevenLabs déjà générés pour le reel (media/sfx) : allumage, papier, hologramme, saut…
Tout est synthétisé ici (aucun crédit).
"""
import argparse
import json
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
TIMING = json.loads(open(os.path.join(HERE, 'timing.js'), encoding='utf-8').read().split('=', 1)[1].strip().rstrip(';'))
BEAT = 60 / TIMING['bpm']
TD = TIMING['dropBeats'] * BEAT
beat = lambda k: TD + k * BEAT
DUR = round(beat(TIMING['end']) * 30) / 30
SEAM = {k: beat(v) for k, v in TIMING['seams'].items()}
STOP = {w: {k: beat(v) for k, v in s.items()} for w, s in TIMING['stops'].items()}
FT = {k: (beat(v) if not isinstance(v, list) else [beat(x) for x in v]) for k, v in TIMING['fight'].items()}
MU = TIMING['music']
T_LINEUP, T_TITLE = beat(TIMING['lineup']), beat(TIMING['title'])
POST = 0.12
DROP_IN_GROOVE = 56.98
R = np.random.default_rng(7)
NOTE = {'A3': 220.0, 'A4': 440.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.26, 'G5': 783.99, 'A5': 880.0}


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


def band(x, lo=0, hi=SR / 2):   # filtre par FFT (fréquences fixes, sans risque d'instabilité)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi < SR / 2:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def norm(x, peak=0.8):
    return x / (np.abs(x).max() + 1e-9) * peak


def st(mono, pan=0.0):   # mono → stéréo, pan de -1 (gauche) à 1 (droite), éventuellement variable
    p = np.broadcast_to(np.asarray(pan, dtype=float), mono.shape)
    return np.stack([mono * np.sqrt((1 - p) / 2), mono * np.sqrt((1 + p) / 2)], axis=1).astype(np.float32)


def put(mix, snd, t0, gain_db=0.0):
    i = int(round(t0 * SR))
    if i < 0:
        snd, i = snd[-i:], 0
    snd = snd[:len(mix) - i]
    mix[i:i + len(snd)] += snd * db(gain_db)


def noise(n):
    return R.standard_normal(n)


def sweep(f):   # phase d'une fréquence variable
    return 2 * np.pi * np.cumsum(f) / SR


# ---------- sons de la v1 ----------
def sub_drop(d=0.9, f0=78, f1=28):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / (d / 3))
    return st(np.tanh(np.sin(sweep(f)) * env(n, 0.004, d / 2.2) * 1.8) * 0.9)


def impact(d=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (48 + 30 * np.exp(-t / 0.03)) * t) * env(n, 0.001, 0.18)
    crack = svf(noise(n), 2500, 0.8, 'hp') * env(n, 0.0005, 0.03) * 0.5
    return st(np.tanh((boom + crack) * 1.6) * 0.8)


def whoosh(d=0.42, rise=0.75, pan0=-0.9, pan1=0.9):   # bruit filtré qui monte puis retombe, traverse l'image
    n = int(d * SR); u = np.arange(n) / n
    shape = np.where(u < rise, (u / rise) ** 2, np.exp(-(u - rise) / 0.08))
    fc = 400 + 3800 * np.where(u < rise, u / rise, 1 - (u - rise) / (1 - rise) * 0.6)
    x = svf(noise(n), fc, 1.3) * shape
    return st(norm(x), pan=pan0 + (pan1 - pan0) * u)


def riser(d):
    n = int(d * SR); u = np.arange(n) / n
    nz = svf(noise(n), 300 + 5000 * u ** 2, 1.5) * u ** 2.2
    tone = np.sin(sweep(180 + 900 * u ** 2)) * u ** 3 * 0.35
    return st((norm(nz, 0.7) + tone) * 0.8)


def braam(d=1.6):   # cuivres graves désaccordés de bande-annonce
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f, a in ((55, 1), (55.6, 0.9), (82.4, 0.6), (110.3, 0.5), (41.2, 0.7)):
        x += a * (2 * ((f * t) % 1) - 1)
    x = svf(x, 150 + 900 * np.minimum(1, t / 0.25) * np.exp(-t / 0.9), 0.9, 'lp') * env(n, 0.03, 0.8)
    return st(np.tanh(norm(x, 1) * 2.2) * 0.85)


def moped(d=2.4, rev=0.18):   # deux-temps : impulsions ~ 40 → 90 Hz qui montent au démarrage puis ronronnent
    n = int(d * SR); t = np.arange(n) / SR
    f = 40 + 55 * (1 - np.exp(-t / rev)) + 6 * np.sin(2 * np.pi * 7 * t)
    pulse = (np.sin(sweep(f)) > 0.6).astype(float) - 0.15
    x = svf(pulse + 0.2 * noise(n), 900, 0.8, 'lp')
    x *= np.minimum(1, t / 0.02) * (0.55 + 0.45 * np.exp(-t / 0.4)) * np.minimum(1, (d - t) / 0.3)
    return st(norm(x, 0.7))


def crunch():
    out = np.zeros((int(0.5 * SR), 2), np.float32)
    for k, dt in enumerate((0.0, 0.11, 0.22)):
        n = int(0.09 * SR)
        x = svf(noise(n), 1400 - k * 300, 0.9) * env(n, 0.001, 0.03) + np.sin(2 * np.pi * 70 * np.arange(n) / SR) * env(n, 0.001, 0.05)
        i = int(dt * SR); out[i:i + n] += st(norm(x, 0.9 - k * 0.2))
    return out


def shutter():
    n = int(0.12 * SR); x = np.zeros(n)
    for dt in (0.0, 0.055):
        m = int(0.006 * SR); i = int(dt * SR)
        x[i:i + m] += svf(noise(m), 3000, 1.0, 'hp') * np.hanning(m)
    return st(norm(x))


# ---------- combat ----------
def squeal(d):   # crissement de pneus
    n = int(d * SR); t = np.arange(n) / SR; u = t / d
    f = 2100 - 500 * u + 90 * np.sin(2 * np.pi * 13 * t)
    x = np.sin(sweep(f)) * 0.6 + svf(noise(n), 2200, 4, 'bp') * 0.5
    x *= np.minimum(1, t / 0.03) * (1 - u) ** 0.7
    return st(norm(x, 0.7), pan=0.2)


def bell(f=1150, d=1.4):   # cloche du ring
    n = int(d * SR); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / dd) for r, a, dd in ((1, 1, 0.9), (2.76, 0.55, 0.5), (5.4, 0.35, 0.25), (8.93, 0.2, 0.12)))
    return st(norm(x * np.minimum(1, t / 0.001), 0.8))


def punch(big=1.0):
    n = int(0.35 * SR); t = np.arange(n) / SR
    thump = np.sin(sweep(55 + 90 * np.exp(-t / 0.02))) * env(n, 0.001, 0.07 * big)
    slap = svf(noise(n), 1400, 0.7) * env(n, 0.0005, 0.025)
    return st(np.tanh((thump + slap * 0.8) * 2.2) * 0.85)


def boing(d=0.9, f0=170):   # le ressort de l'oreille qui se détend
    n = int(d * SR); t = np.arange(n) / SR
    f = (f0 + 90 * np.exp(-t / 0.25)) * (1 + 0.22 * np.sin(2 * np.pi * 26 * t) * np.exp(-t / 0.45))
    ph = sweep(f)
    x = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * env(n, 0.002, 0.3)
    clank = sum(np.sin(2 * np.pi * fr * t) for fr in (1650, 2470, 3910)) * env(n, 0.0005, 0.04) * 0.4
    return st(norm(x + clank, 0.8), pan=0.35)


def charge(d):   # boule d'énergie qui se charge (bourdonnement qui monte, trémolo qui s'accélère)
    n = int(d * SR); t = np.arange(n) / SR; u = t / d
    f = 90 * 4 ** u
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    trem = 0.6 + 0.4 * np.sin(sweep(6 + 30 * u))
    x = svf(saw, 300 + 3500 * u ** 1.5, 2.0, 'lp') * trem * (0.3 + 0.7 * u)
    x += svf(noise(n), 500 + 6000 * u ** 2, 2, 'bp') * u ** 2 * 0.4
    return st(norm(x, 0.8))


def shatter(d=0.9):   # éclats de verre / de pixels
    n = int(d * SR); out = np.zeros((n, 2), np.float32)
    for k in range(46):
        t0 = (R.random() ** 2) * d * 0.6; m = int(R.uniform(0.02, 0.09) * SR)
        f = R.uniform(2500, 9500); tt = np.arange(m) / SR
        g = (np.sin(2 * np.pi * f * tt) * 0.6 + svf(noise(m), f, 6, 'bp') * 0.8) * env(m, 0.0005, m / SR / 3)
        i = int(t0 * SR); out[i:i + m] += st(g * R.uniform(0.3, 1) * (1 - t0 / d), pan=R.uniform(-0.8, 0.8))[:n - i]
    return out / (np.abs(out).max() + 1e-9) * 0.8


def crowd(d, swell=0.25):   # foule qui hurle : bandes de bruit modulées au hasard, stéréo large
    n = int(d * SR); t = np.arange(n) / SR
    chans = []
    for c in range(2):
        a = svf(noise(n), 650, 0.7) + 0.6 * svf(noise(n), 1500, 1.2)
        k = int(0.05 * SR); am = np.convolve(np.abs(R.standard_normal(n // k + 2)), [0.25, 0.5, 0.25], 'same')
        am = np.interp(t, np.arange(len(am)) * 0.05, am)
        vow = np.sin(sweep(np.full(n, 0.8 + c * 0.3))) * 0.3
        chans.append(a * (0.6 + 0.4 * am) * (1 + vow))
    x = np.stack(chans, 1) * (np.minimum(1, t / swell) * np.minimum(1, (d - t) / 0.6))[:, None]
    return (x / (np.abs(x).max() + 1e-9) * 0.7).astype(np.float32)


# ---------- le robot musicien ----------
def piano(f, d=1.6, bright=1.0):   # piano + piano électrique, avec une octave grave
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for h in range(1, 9):
        fh = f * h * np.sqrt(1 + 0.0004 * h * h)
        x += (1 / h ** (1.3 / bright)) * np.sin(2 * np.pi * fh * t) * np.exp(-t * (1.1 + 0.9 * h))
    x = norm(x * np.minimum(1, t / 0.003), 0.6)
    ep = np.sin(2 * np.pi * f * t + 1.7 * np.exp(-t / 0.18) * np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.75) * 0.45
    low = np.sin(np.pi * f * t) * np.exp(-t / 0.8) * 0.25
    ham = svf(noise(int(0.02 * SR)), 3000, 1, 'bp') * env(int(0.02 * SR), 0.0005, 0.004) * 0.3
    y = x + ep + low; y[:len(ham)] += ham
    return norm(y * np.minimum(1, (d - t) / 0.15), 0.85)


def kick808():
    n = int(0.6 * SR); t = np.arange(n) / SR
    x = np.sin(sweep(46 + 120 * np.exp(-t / 0.035))) * env(n, 0.001, 0.32)
    x += band(noise(n), 3500) * env(n, 0.0003, 0.004) * 0.6
    return np.tanh(x * 1.8) * 0.9


def snare():
    n = int(0.35 * SR); t = np.arange(n) / SR
    body = (np.sin(2 * np.pi * 185 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * env(n, 0.0005, 0.05)
    wires = band(noise(n), 1500, 4000) * env(n, 0.0005, 0.13) + band(noise(n), 6000) * env(n, 0.0005, 0.06) * 0.5
    return norm(body * 0.7 + wires, 0.85)


def tom(f0):
    n = int(0.55 * SR); t = np.arange(n) / SR
    x = np.sin(sweep(f0 + f0 * 0.7 * np.exp(-t / 0.03))) * env(n, 0.001, 0.28)
    x += svf(noise(n), f0 * 4, 1) * env(n, 0.0005, 0.02) * 0.4
    return norm(np.tanh(x * 1.4), 0.85)


def crash():
    n = int(1.8 * SR); t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (540, 803, 1327, 1781, 2689, 3607)) / 6
    x = band(metal + noise(n) * 0.9, 5000) * (0.55 * np.exp(-t / 0.05) + 0.45 * np.exp(-t / 0.9)) * np.minimum(1, t / 0.001)
    return norm(x, 0.8)


def sfx(name):
    return load(os.path.join(REEL, 'media', 'sfx', name + '.mp3'))


def lp_segment(x, a, b, fc_of_t, q_of_t):   # filtre passe-bas variable sur [a, b] (secondes), fondus aux bords
    i0, i1 = int(a * SR), min(len(x), int(b * SR))
    t = np.arange(i0, i1) / SR
    fc, q = fc_of_t(t), q_of_t(t)
    y = x.copy()
    for c in range(x.shape[1]):
        seg = x[i0:i1, c].astype(float)
        # svf n'accepte qu'un q constant : on traite par petits blocs
        out = np.empty_like(seg); lo = bp = 0.0
        f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
        for i in range(len(seg)):
            hp = seg[i] - lo - bp / q[i]
            bp += f[i] * hp
            lo += f[i] * bp
            out[i] = lo
        k = int(0.03 * SR); w = np.ones(len(seg)); w[:k] = np.linspace(0, 1, k); w[-k:] = np.linspace(1, 0, k)
        y[i0:i1, c] = (out * w + seg * (1 - w)).astype(np.float32)
    return y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wav', default=os.path.join(HERE, 'out', 'bande-son.wav'))
    ap.add_argument('--video')
    ap.add_argument('--out')
    a = ap.parse_args()
    N = int(DUR * SR)
    mus = np.zeros((N, 2), np.float32)
    inst = np.zeros((N, 2), np.float32)   # ce que joue le robot
    fx = np.zeros((N, 2), np.float32)

    # ----- musique : le drop de GROOVE sur le départ de la mobylette, coupée net sur le titre -----
    grv = load(os.path.join(REEL, 'media', 'music2', 'GROOVE.mp3'))
    m0 = DROP_IN_GROOVE - TD
    # GROOVE s'éteint vers 73 s : au premier coup de batterie (masqué par le filtre et la grosse caisse), on
    # repart dans sa montée pour que son drop retombe pile sur la couture du monde corporate (le filtre se rouvre)
    tj = beat(MU['drums'][0][0])
    m1 = DROP_IN_GROOVE - SEAM['corp']
    k = int(0.02 * SR)
    pA = grv[int(m0 * SR):int(m0 * SR) + int(tj * SR) + k].copy()
    pB = grv[int((m1 + tj) * SR) - k:int((m1 + T_TITLE + 0.03) * SR)].copy()
    w = np.linspace(0, 1, 2 * k, dtype=np.float32)[:, None]
    seg = np.concatenate([pA[:-2 * k], pA[-2 * k:] * (1 - w) + pB[:2 * k] * w, pB[2 * k:]])
    k = int(0.03 * SR); seg[-k:] *= np.linspace(1, 0, k, dtype=np.float32)[:, None]
    k = int(0.4 * SR); seg[:k] *= np.linspace(0.3, 1, k, dtype=np.float32)[:, None]
    # monde de la musique : GROOVE derrière un filtre (basse + grosse caisse), qui se rouvre pour la couture suivante
    ma, mb = SEAM['music'], SEAM['corp']
    rise0 = beat(TIMING['stops']['music']['go'])
    fc = lambda t: np.where(t < ma + 0.35, 6000 * (320 / 6000) ** np.clip((t - ma) / 0.35, 0, 1),
                            np.where(t < rise0, 320, 320 * (6000 / 320) ** np.clip((t - rise0) / (mb - rise0), 0, 1) ** 1.6))
    qf = lambda t: np.where((t > rise0) & (t < mb), 1.8, 1.0)
    seg = lp_segment(seg, ma - 0.02, mb + 0.04, fc, qf)
    gm = np.ones(len(seg), np.float32)
    tt = np.arange(len(seg)) / SR
    gm *= np.where((tt > ma + 0.3) & (tt < rise0), db(-2.5), 1).astype(np.float32)
    seg *= gm[:, None]
    put(mus, seg, 0.0, -1)
    # accord final d'OUTRO : il résonne sous le titre
    out = load(os.path.join(REEL, 'media', 'music2', 'OUTRO.mp3'))
    bt = button_time(out) or (len(out) / SR - 3)
    ring = out[int((bt - 0.02) * SR):int((bt - 0.02 + DUR - T_TITLE + 0.2) * SR)].copy()
    k = int(0.9 * SR); ring[-k:] *= np.linspace(1, 0, k, dtype=np.float32)[:, None]
    put(mus, ring, T_TITLE, 0)

    # ----- gros plan : allumage de l'écran, montée jusqu'au drop, moteur qui démarre -----
    put(fx, sfx('BOOT'), 0.22, -4)
    put(fx, riser(TD - 0.05), 0.05, -9)
    put(fx, moped(2.4), TD - 0.12, -12)
    put(fx, sub_drop(), TD, -3)
    put(fx, impact(), TD, -6)
    # ----- coutures : whoosh gauche → droite puis impact sur le temps -----
    for name, s in SEAM.items():
        w = whoosh()
        put(fx, w, s - 0.75 * len(w) / SR, -5)
        put(fx, impact(), s, -7)
    put(fx, sfx('HOLO'), SEAM['cyber'] + 0.1, -14)
    put(fx, sfx('PAPER'), SEAM['music'] - 0.12, -6)
    put(fx, crunch(), beat(TIMING['seams']['corp'] + 2), -4)
    put(fx, sfx('WOBBLE'), SEAM['candy'] + 0.05, -12)
    put(fx, braam(), SEAM['apoc'], -4)
    put(fx, sub_drop(1.2, 60, 24), SEAM['apoc'], -6)

    # ----- combat (monde des deepfakes) -----
    sc = STOP['cyber']
    put(fx, squeal(sc['park'] - SEAM['cyber'] - POST + 0.15), SEAM['cyber'] + POST, -13)
    put(fx, sfx('JUMP'), sc['off'], -9)
    put(fx, sfx('LAND_BIG'), sc['off'] + 0.34, -8)
    put(fx, crowd(sc['go'] - SEAM['cyber'] - 0.1, 0.5), SEAM['cyber'] + 0.1, -22)
    put(fx, sfx('HOLO'), FT['cloneIn'] - 0.05, -9)
    put(fx, bell(), FT['fightText'], -9)
    put(fx, bell(), FT['fightText'] + 0.16, -11)
    put(fx, impact(0.4), FT['fightText'], -8)
    put(fx, whoosh(0.3, 0.8, 0.8, -0.2), FT['earHit'] - 0.26, -8)
    put(fx, punch(1.4), FT['earHit'], -2)
    put(fx, boing(), FT['earHit'] + 0.02, -5)
    for i, tp in enumerate(FT['punches']):
        put(fx, whoosh(0.16, 0.7, -0.4, 0.4), tp - 0.12, -12)
        put(fx, punch(1.0 + 0.2 * i), tp, -4)
    put(fx, charge(FT['fire'] - FT['charge']), FT['charge'], -8)
    put(fx, whoosh(0.35, 0.3, -0.3, 0.6), FT['fire'] - 0.03, -5)
    put(fx, sub_drop(0.6, 90, 40), FT['fire'], -9)
    put(fx, impact(0.8), FT['impact'], 0)
    put(fx, sub_drop(1.1, 80, 26), FT['impact'], -3)
    put(fx, shatter(), FT['impact'], -5)
    put(fx, impact(0.6), FT['ko'], -4)
    for i in range(3):
        put(fx, bell(1150, 0.8), FT['ko'] + 0.05 + i * 0.13, -12)
    put(fx, crowd(1.8, 0.1), FT['ko'] - 0.05, -10)
    put(fx, sfx('JUMP'), FT['runBack'], -9)
    put(fx, sfx('LAND_BIG'), sc['on'], -9)
    put(fx, boing(0.6, 210), sc['on'] + 0.03, -15)
    put(fx, moped(1.6, 0.08), sc['go'] - 0.08, -9)

    # ----- monde de la musique : c'est le robot qui joue -----
    sm = STOP['music']
    cues = os.path.join(HERE, 'out', 'cues.json')
    scale = [0, 2, 3, 5, 7, 8, 10]   # la mineur naturel = les touches blanches
    if os.path.exists(cues):
        keys = json.load(open(cues))['roadKeys']
        lastT = -1
        for tk, kk, sx in keys:
            if tk - lastT < 0.028:
                continue
            lastT = tk
            semi = 12 * (kk // 7) + scale[kk % 7]
            f = 220 * 2 ** (semi / 12)
            while f > 1400:
                f /= 2
            put(inst, st(piano(f, 0.45, 1.3), pan=np.clip(sx * 1.6 - 0.8, -0.8, 0.8)), tk, -13)
    else:
        print('(pas de out/cues.json : node cues.js pour le glissando de la route-clavier)')
    put(fx, sfx('JUMP'), sm['off'], -10)
    for i, (kb, note) in enumerate(MU['hops']):
        th = beat(kb)
        put(inst, st(piano(NOTE[note], 1.8), pan=-0.5 + i * 0.2), th, -3)
        put(fx, sfx('HOP'), th - 0.03, -20)
    put(fx, sfx('HOP'), beat(MU['toDrums']), -12)
    pans = {'kick': 0.1, 'snare': 0.2, 'tom1': 0.3, 'tom2': 0.5, 'crash': 0.65}
    gains = {'kick': -1, 'snare': -4, 'tom1': -3, 'tom2': -3, 'crash': -8}
    for kb, kind in MU['drums']:
        snd = {'kick': kick808, 'snare': snare, 'crash': crash}.get(kind)
        x = snd() if snd else tom(150 if kind == 'tom1' else 105)
        put(inst, st(x, pan=pans[kind]), beat(kb), gains[kind])
    put(fx, sub_drop(0.8, 70, 30), beat(MU['drums'][-1][0]), -8)
    put(fx, sfx('JUMP'), beat(MU['jumpBack']), -9)
    put(fx, sfx('LAND_BIG'), sm['on'], -9)
    put(fx, moped(1.4, 0.07), sm['go'] - 0.06, -9)
    put(fx, riser(mb - rise0), rise0, -12)
    put(fx, sub_drop(1.2, 80, 26), mb, -3)   # le drop de GROOVE revient avec le monde corporate

    # ----- alignement des suspects : flash + déclic à chaque demi-temps -----
    for i in range(4):
        put(fx, shutter(), T_LINEUP + i * BEAT / 2, -6)
    put(fx, riser(BEAT / 2 + 0.05), T_TITLE - BEAT / 2 - 0.05, -10)
    # ----- titre -----
    put(fx, sub_drop(1.4, 90, 26), T_TITLE, 0)
    put(fx, impact(0.8), T_TITLE, -3)
    put(fx, sfx('CHIME'), T_TITLE + BEAT, -10)
    put(fx, sfx('POP'), T_TITLE + 2 * BEAT, -8)
    put(fx, sfx('SNAP'), T_TITLE + 3 * BEAT - 0.01, -8)
    put(fx, sfx('GLINT'), T_TITLE + 3 * BEAT + 0.05, -9)

    mixd = mus * db(-2) + inst * db(-1) + fx
    assert np.isfinite(mixd).all(), 'NaN dans le mixage'
    # niveau Instagram : ~ -14 LUFS, crêtes à -1 dBFS (ffmpeg loudnorm + limiteur)
    os.makedirs(os.path.dirname(a.wav), exist_ok=True)
    raw = np.clip(mixd, -4, 4).astype('<f4').tobytes()
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-',
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9,alimiter=limit=0.89:level=false', '-ar', str(SR), '-c:a', 'pcm_s16le', a.wav],
                   input=raw, check=True)
    print('bande-son :', a.wav, f'({DUR:.2f} s)')
    if a.video and a.out:
        subprocess.run([FF, '-v', 'error', '-y', '-i', a.video, '-i', a.wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', a.out], check=True)
        print('vidéo :', a.out)


if __name__ == '__main__':
    main()
