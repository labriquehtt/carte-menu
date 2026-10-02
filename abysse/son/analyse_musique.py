"""Analyse d'une musique : tempo précis, grille des temps, tonalité, énergie par mesure.

  python son/analyse_musique.py media/musique/surface_A.mp3 [--bpm 150]

Lit le MP3 via ffmpeg (48 kHz stéréo), sort un résumé lisible et un JSON à côté du fichier (…_analyse.json).
"""
import json
import subprocess
import sys

import numpy as np
from scipy.signal import stft, find_peaks, butter, sosfiltfilt

SR = 48000
NOTES = ['do', 'do#', 'ré', 'mib', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'sib', 'si']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def onset_env(x, hop=480, band=None):
    if band:
        sos = butter(4, band if len(band) == 2 else band[0], btype='band' if len(band) == 2 else 'low', fs=SR,
                     output='sos')
        x = sosfiltfilt(sos, x)
    f, t, Z = stft(x, fs=SR, nperseg=2048, noverlap=2048 - hop)
    m = np.log1p(50 * np.abs(Z))
    fl = np.maximum(0, np.diff(m, axis=1)).sum(axis=0)
    fl = np.concatenate([[0], fl])
    fl -= np.convolve(fl, np.ones(32) / 32, mode='same')
    return np.maximum(fl, 0), SR / hop


def tempo(env, fps, lo=120, hi=180):
    best = None
    for bpm in np.arange(lo, hi, 0.05):
        period = 60 / bpm * fps
        # peigne : somme de l'enveloppe aux instants des temps, pour la meilleure phase
        n = int((len(env) - 1) / period)
        idx = np.arange(n) * period
        for ph in np.linspace(0, period, 24, endpoint=False):
            s = env[np.clip((idx + ph).astype(int), 0, len(env) - 1)].sum() / n
            if best is None or s > best[0]:
                best = (s, bpm, ph / fps)
    return best


def refine(env, fps, bpm, phase):
    best = (0, bpm, phase)
    for b in np.arange(bpm - 0.2, bpm + 0.2, 0.005):
        period = 60 / b * fps
        n = int((len(env) - 1) / period)
        idx = np.arange(n) * period
        for ph in np.linspace(phase - 0.03, phase + 0.03, 31):
            s = env[np.clip((idx + ph * fps).astype(int), 0, len(env) - 1)].sum() / n
            if s > best[0]:
                best = (s, b, ph)
    return best


def key_of(x):
    f, t, Z = stft(x, fs=SR, nperseg=8192, noverlap=4096)
    mag = np.abs(Z).mean(axis=1)
    chroma = np.zeros(12)
    for fi, a in zip(f, mag):
        if 55 < fi < 2000:
            pc = int(round(12 * np.log2(fi / 261.6256))) % 12
            chroma[pc] += a
    chroma /= chroma.max()
    scores = []
    for k in range(12):
        scores.append((np.corrcoef(np.roll(MAJ, k), chroma)[0, 1], NOTES[k] + ' majeur'))
        scores.append((np.corrcoef(np.roll(MIN, k), chroma)[0, 1], NOTES[k] + ' mineur'))
    scores.sort(reverse=True)
    return scores[:3], chroma


def main():
    path = sys.argv[1]
    x = load(path)
    mono = x.mean(axis=1)
    env, fps = onset_env(mono)
    s, bpm, ph = tempo(env, fps)
    s, bpm, ph = refine(env, fps, bpm, ph)
    kick, _ = onset_env(mono, band=[150])
    period = 60 / bpm
    beats = np.arange(ph, len(mono) / SR, period)
    # temps fort : la phase (sur 4) où la grosse caisse tape le plus
    kv = [kick[np.clip((beats[i::4] * fps).astype(int), 0, len(kick) - 1)].mean() for i in range(4)]
    down = int(np.argmax(kv))
    (k1, k2, k3), chroma = key_of(mono)
    print(f'{path}\n  tempo {bpm:.2f} BPM, 1er temps à {ph:.3f} s, temps fort = temps n°{down} (énergie grosse caisse {np.round(kv, 2)})')
    print(f'  tonalité : {k1[1]} ({k1[0]:.2f}), {k2[1]} ({k2[0]:.2f}), {k3[1]} ({k3[0]:.2f})')
    print('  chroma :', ' '.join(f'{n}:{c:.2f}' for n, c in zip(NOTES, chroma)))
    bars = beats[down::4]
    print('  mesure  début   RMS dB  grave%  aigu%  largeur')
    side = (x[:, 0] - x[:, 1]) / 2
    rows = []
    for i, b0 in enumerate(bars):
        b1 = b0 + 4 * period
        a, z = int(b0 * SR), min(int(b1 * SR), len(mono))
        if z - a < SR * 0.5:
            break
        seg = mono[a:z]
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        tot = sp.sum() + 1e-9
        rms = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        low, high = sp[fr < 150].sum() / tot, sp[fr > 4000].sum() / tot
        wid = np.sqrt(np.mean(side[a:z] ** 2)) / (np.sqrt(np.mean(seg ** 2)) + 1e-9)
        rows.append({'mesure': i, 'debut': round(float(b0), 3), 'rms_db': round(float(rms), 1),
                     'grave': round(float(low), 3), 'aigu': round(float(high), 3), 'largeur': round(float(wid), 2)})
        print(f'  {i:5d}  {b0:6.2f}  {rms:7.1f}  {100*low:6.1f}  {100*high:5.1f}  {wid:6.2f}')
    # énergie fine (par temps) pour repérer coupures et reprises
    per_beat = []
    for b0 in beats:
        a, z = int(b0 * SR), min(int((b0 + period) * SR), len(mono))
        if z - a < 100:
            break
        per_beat.append(round(float(20 * np.log10(np.sqrt(np.mean(mono[a:z] ** 2)) + 1e-9)), 1))
    print('  RMS par temps :', ' '.join(f'{v:.0f}' for v in per_beat))
    out = {'fichier': path, 'bpm': round(float(bpm), 3), 'premier_temps': round(float(ph), 4), 'temps_fort': down,
           'tonalite': [k1[1], k2[1], k3[1]], 'chroma': [round(float(c), 3) for c in chroma], 'mesures': rows,
           'rms_par_temps': per_beat}
    json.dump(out, open(path.rsplit('.', 1)[0] + '_analyse.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
