"""Hauteur (fréquence fondamentale) des sons à accorder : python son/hauteur.py media/sfx/PIANO_1.mp3 …"""
import subprocess
import sys

import numpy as np

SR = 48000
NOTES = ['do', 'do#', 'ré', 'mib', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'sib', 'si']


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def f0(seg):
    """produit spectral harmonique (HPS) : robuste aux harmoniques fortes"""
    n = 1 << 16
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n))
    fr = np.fft.rfftfreq(n, 1 / SR)
    hps = np.log(sp + 1e-9)
    for h in (2, 3, 4):
        dec = sp[::h]
        hps[:len(dec)] += np.log(dec + 1e-9)
    sel = (fr > 50) & (fr < 1500)
    i = np.argmax(np.where(sel, hps, -np.inf))
    peak = fr[np.argmax(np.where(sel, sp, 0))]
    return fr[i], peak


for path in sys.argv[1:]:
    x = load(path)
    env = np.abs(x)
    on = int(np.argmax(env > env.max() * 0.2))
    print(path.split('/')[-1], f'attaque à {on / SR:.3f} s, crête {20 * np.log10(env.max()):.1f} dBFS')
    for a, b in ((0.05, 0.6), (0.6, 1.5), (1.5, 3.0)):
        seg = x[on + int(a * SR): on + int(b * SR)]
        if len(seg) < 2048:
            continue
        hz, pk = f0(seg)
        midi = 69 + 12 * np.log2(hz / 440)
        print(f'   {a:.2f}-{b:.2f}s  f0 {hz:7.1f} Hz = {NOTES[int(round(midi)) % 12]}{int(round(midi)) // 12 - 1}'
              f' ({(midi - round(midi)) * 100:+.0f} cents)   pic {pk:7.1f} Hz')
