"""Carte des coups d'une musique : grosse caisse, clap/caisse claire, charleston, notes de la mélodie.

  python son/evenements.py media/musique/surface_B.mp3 out/analyse/B_evenements.json

Chaque coup est rapporté à la grille 150 BPM (mesure, temps, double-croche) pour que l'image tombe pile dessus.
"""
import json
import subprocess
import sys

import numpy as np
from scipy.signal import stft, find_peaks

SR = 48000
BPM = 150.0
BEAT = 60 / BPM
NOTES = ['do', 'do#', 'ré', 'mib', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'sib', 'si']


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def band_flux(mag, f, lo, hi):
    sel = (f >= lo) & (f < hi)
    m = np.log1p(30 * mag[sel])
    fl = np.maximum(0, np.diff(m, axis=1)).sum(axis=0)
    fl = np.concatenate([[0], fl])
    fl = fl - np.convolve(fl, np.ones(24) / 24, mode='same')
    fl = np.maximum(fl, 0)
    return fl / (np.percentile(fl, 99.5) + 1e-9)


def grid(t):
    s16 = BEAT / 4
    k = round(t / s16)
    return {'mesure': k // 16, 'temps': (k // 4) % 4, 'dc': k % 4, 'ecart_ms': round((t - k * s16) * 1000, 1)}


def main():
    src, dst = sys.argv[1], sys.argv[2]
    x = load(src)
    hop = 240                                    # 5 ms
    f, t, Z = stft(x, fs=SR, nperseg=2048, noverlap=2048 - hop)
    mag = np.abs(Z)
    fps = SR / hop
    out = {'source': src, 'bpm': BPM, 'coups': {}}
    for name, lo, hi, thr in (('kick', 30, 120, 0.35), ('clap', 1200, 5000, 0.35), ('hat', 7000, 16000, 0.3)):
        fl = band_flux(mag, f, lo, hi)
        pk, pr = find_peaks(fl, height=thr, distance=int(0.07 * fps))
        rows = []
        for i, h in zip(pk, pr['peak_heights']):
            tt = float(t[i])
            rows.append({'t': round(tt, 3), 'force': round(float(min(h, 3.0)), 2), **grid(tt)})
        out['coups'][name] = rows
        print(name, len(rows))
    # mélodie : pic spectral dominant entre 220 et 1100 Hz quand une note démarre
    sel = (f >= 220) & (f < 1100)
    fl = band_flux(mag, f, 220, 1100)
    pk, pr = find_peaks(fl, height=0.3, distance=int(0.09 * fps))
    notes = []
    for i in pk:
        a = min(i + int(0.03 * fps), mag.shape[1] - 1)
        spec = mag[sel, a]
        fr = f[sel][int(np.argmax(spec))]
        midi = 69 + 12 * np.log2(fr / 440)
        notes.append({'t': round(float(t[i]), 3), 'hz': round(float(fr), 1), 'note': NOTES[int(round(midi)) % 12],
                      'midi': int(round(midi)), **grid(float(t[i]))})
    out['melodie'] = notes
    print('notes', len(notes))
    json.dump(out, open(dst, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    # résumé lisible par mesure : motif sur 16 doubles croches (K grosse caisse, C clap, h charleston)
    bars = {}
    for name, ch in (('hat', 'h'), ('clap', 'C'), ('kick', 'K')):
        for r in out['coups'][name]:
            row = bars.setdefault(r['mesure'], ['.'] * 16)
            row[r['temps'] * 4 + r['dc']] = ch
    for m in sorted(bars):
        mel = [n['note'] for n in notes if n['mesure'] == m]
        print(f"m{m:02d} {m * 4 * BEAT:5.1f}s  {''.join(bars[m][:4])} {''.join(bars[m][4:8])} {''.join(bars[m][8:12])} {''.join(bars[m][12:])}   {' '.join(mel)}")


if __name__ == '__main__':
    main()
