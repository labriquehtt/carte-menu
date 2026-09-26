#!/usr/bin/env python3
"""Mixe les bruitages ElevenLabs en une seule piste calée sur la vidéo.

  python3 mix_sons.py                                   # → out/bruitages.wav (116 s, 44,1 kHz stéréo)
  python3 mix_sons.py --video out/LA-SOURCE-reel-final-v3.mp4 --out out/LA-SOURCE-reel-bruitages.mp4

Lit sons_cues.json (écrit par `node sons.js`, repères en temps vidéo) et les sons
media/sfx/<ID>.mp3 (générés sur ElevenLabs, hors Git comme tout media/).
Chaque son est recalé sur son attaque (silence de tête retiré) et ramené à son niveau
(MIX) ; PENCIL et DRIP sont bouclés sur leur plage. Pas d'ambiance de fond : la voix et la
musique viennent au montage. Seul le gros plan d'ouverture garde le son d'origine du clip
`roof` (media/roof.wav, extrait par prepare_media.py), coupé quand l'écran s'éteint.
"""
import argparse
import json
import os
import subprocess

import imageio_ffmpeg
import numpy as np

FF = imageio_ffmpeg.get_ffmpeg_exe()
HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100

# niveau visé (dB) : crête d'énergie sur 100 ms pour les sons ponctuels, énergie moyenne
# pour la nappe PENCIL et le son du clip ; durée max (s), None = boucle sur [t, fin]
MIX = {
    'PENCIL': (-33, None), 'DRIP': (-24, None),
    'TV_OFF': (-19, 1.2), 'DEZOOM': (-19, 1.4), 'BOOT': (-20, 1.2), 'CLINK': (-20, 1.2),
    'SNAP': (-17, 0.8), 'POP': (-19, 0.8), 'JUMP': (-20, 0.8), 'LAND_BIG': (-15, 1.0),
    'FALL': (-19, 1.2), 'LAND': (-18, 1.2), 'HOP': (-22, 0.6), 'PAPER': (-19, 1.2),
    'STUMBLE': (-21, 1.2), 'SWISH': (-21, 0.6), 'ZOOM_IN': (-16, 1.2), 'GLINT': (-21, 0.8),
    'QUESTION': (-19, 0.8), 'WOOD': (-19, 0.6), 'DROP': (-19, 0.6), 'SMOKE': (-20, 1.0),
    'WOBBLE': (-19, 2.2), 'DATA': (-20, 3.2), 'GLITCH': (-17, 2.4), 'UNGLITCH': (-20, 0.8),
    'HOLO': (-19, 2.2), 'DREAM': (-19, 2.2), 'FADE': (-14, 3.5),
    'CHIME': (-20, 1.2), 'POWER': (-19, 1.8), 'VR': (-18, 1.8),
}
BEDS = {'PENCIL', 'ROOF'}
ROOF_LEVEL = -21   # son du clip sur l'écran de la tête (eau, vent, feuilles)
LOOP_FADES = {'PENCIL': (0.15, 0.3), 'DRIP': (0.5, 0.8)}   # fondu entrée, sortie (s)


def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def fade(a, fin, fout):
    n = len(a)
    i, o = min(int(fin * SR), n), min(int(fout * SR), n)
    if i:
        a[:i] *= np.linspace(0, 1, i, dtype=np.float32)[:, None]
    if o:
        a[n - o:] *= np.linspace(1, 0, o, dtype=np.float32)[:, None]
    return a


def level(a, sid):
    e = (a ** 2).mean(axis=1)
    if sid not in BEDS:
        w = int(0.1 * SR)
        e = np.convolve(e, np.ones(w) / w, 'valid') if len(e) > w else e
        return 10 * np.log10(e.max() + 1e-12)
    return 10 * np.log10(e.mean() + 1e-12)


def trim_head(a, thresh_db=-36):
    env = np.abs(a).max(axis=1)
    idx = np.nonzero(env > env.max() * db(thresh_db))[0]
    start = max(0, idx[0] - int(0.008 * SR)) if len(idx) else 0
    return a[start:]


def tile(a, n, xf=0.4):
    """Boucle a sur n échantillons, avec un fondu enchaîné de xf s à chaque raccord."""
    x = min(int(xf * SR), len(a) // 4)
    out = a[:min(n, len(a))].copy()
    ramp = np.linspace(0, 1, x, dtype=np.float32)[:, None]
    while len(out) < n:
        tail = out[-x:] * (1 - ramp) + a[:x] * ramp
        out = np.concatenate([out[:-x], tail, a[x:]])
    return out[:n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sfx', default=os.path.join(HERE, 'media', 'sfx'))
    ap.add_argument('--wav', default=os.path.join(HERE, 'out', 'bruitages.wav'))
    ap.add_argument('--video')
    ap.add_argument('--out')
    a = ap.parse_args()

    data = json.load(open(os.path.join(HERE, 'sons_cues.json')))
    total = int(round(data['duration'] * SR))
    mix = np.zeros((total, 2), dtype=np.float32)
    cache, missing = {}, set()
    for c in data['cues']:
        sid = c['id']
        if sid not in cache:
            p = os.path.join(a.sfx, sid + '.mp3')
            if not os.path.exists(p):
                missing.add(sid)
                cache[sid] = None
                continue
            s = load(p)
            if MIX[sid][1] is not None:
                s = trim_head(s)[:int(MIX[sid][1] * SR)]
            cache[sid] = s * db(MIX[sid][0] - level(s, sid))
        s = cache[sid]
        if s is None:
            continue
        maxlen = MIX[sid][1]
        t0 = int(round(c['t'] * SR))
        if maxlen is None:
            clip = fade(tile(s, int(round(c['end'] * SR)) - t0), *LOOP_FADES[sid])
        else:
            clip = fade(s.copy(), 0.002, 0.06)
        clip = clip[:total - t0]
        mix[t0:t0 + len(clip)] += clip

    # gros plan d'ouverture : le clip garde son propre son jusqu'à l'extinction de l'écran
    roof = os.path.join(os.path.dirname(a.sfx), 'roof.wav')
    if os.path.exists(roof):
        cue = {c['id']: c['t'] for c in reversed(data['cues'])}   # 1re occurrence
        off, end = cue['TV_OFF'], cue['DEZOOM']
        s = load(roof)[:int(end * SR)]
        s *= db(ROOF_LEVEL - level(s, 'ROOF'))
        tt = np.arange(len(s)) / SR
        s *= np.interp(tt, [0, 0.15, off, end], [0, 1, 1, 0]).astype(np.float32)[:, None]
        mix[:len(s)] += s
    else:
        missing.add('roof.wav')

    # quelques clics isolés (VR, TV_OFF) ne doivent pas dicter le volume de toute la piste :
    # on cale le 99,95e centile à -11 dBFS, puis on arrondit les crêtes au-delà de -8 dBFS
    # (plafond -3 : crête vraie ≈ -1 après encodage AAC)
    mix *= db(-11) / max(np.percentile(np.abs(mix), 99.95), 1e-6)
    k, ceil = db(-8), db(-3)
    x = np.abs(mix)
    over = x > k
    mix[over] = np.sign(mix[over]) * (k + (ceil - k) * np.tanh((x[over] - k) / (ceil - k)))
    os.makedirs(os.path.dirname(a.wav), exist_ok=True)
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run([FF, '-v', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', str(SR), '-i', '-', a.wav],
                   input=pcm, check=True)
    print('bruitages :', a.wav, f'({total / SR:.1f} s)')
    if missing:
        print('sons manquants :', ', '.join(sorted(missing)))
    if a.video and a.out:
        subprocess.run([FF, '-v', 'error', '-y', '-i', a.video, '-i', a.wav, '-map', '0:v', '-map', '1:a',
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', a.out],
                       check=True)
        print('vidéo :', a.out)


if __name__ == '__main__':
    main()
