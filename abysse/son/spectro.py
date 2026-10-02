"""Spectrogramme lisible (fréquences en échelle log, grille des temps à 150 BPM) pour « voir » une musique.

  python son/spectro.py fichier.(mp3|wav) sortie.png [--debut 0] [--fin 30] [--bpm 150] [--phase 0] [--largeur 1800]
"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import stft

SR = 48000


def arg(name, default):
    a = sys.argv
    return type(default)(a[a.index(name) + 1]) if name in a else default


def main():
    src, dst = sys.argv[1], sys.argv[2]
    t0, t1 = arg('--debut', 0.0), arg('--fin', 30.0)
    bpm, phase, W = arg('--bpm', 150.0), arg('--phase', 0.0), arg('--largeur', 1800)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(t1 - t0), '-i', src, '-f', 'f32le',
                          '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    hop = max(64, int(len(x) / W))
    f, t, Z = stft(x, fs=SR, nperseg=4096, noverlap=4096 - hop)
    mag = 20 * np.log10(np.abs(Z) + 1e-7)
    H = 520
    fmin, fmax = 30, 16000
    rows = np.geomspace(fmax, fmin, H)
    img = np.zeros((H, mag.shape[1]))
    for i, fr in enumerate(rows):
        k = int(np.clip(fr / (SR / 2) * (len(f) - 1), 0, len(f) - 1))
        img[i] = mag[k]
    lo, hi = np.percentile(img, 5), np.percentile(img, 99.7)
    v = np.clip((img - lo) / (hi - lo), 0, 1) ** 1.3
    # palette « magma » simplifiée
    r = np.clip(v * 1.6, 0, 1)
    g = np.clip((v - 0.35) * 1.6, 0, 1)
    b = np.clip(0.35 + v * 0.8 - np.clip((v - 0.6) * 2, 0, 1), 0, 1) * (v > 0.02)
    rgb = (np.stack([r, g, b], -1) * 255).astype(np.uint8)
    im = Image.fromarray(rgb).resize((W, H))
    canvas = Image.new('RGB', (W, H + 40), (12, 12, 16))
    canvas.paste(im, (0, 0))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
    except OSError:
        font = ImageFont.load_default()
    beat = 60 / bpm
    k = int(np.ceil((t0 - phase) / beat))
    while phase + k * beat < t1:
        tb = phase + k * beat
        xpx = int((tb - t0) / (t1 - t0) * W)
        bar = k % 4 == 0
        d.line([(xpx, 0), (xpx, H)], fill=(80, 255, 140) if bar else (70, 70, 90), width=2 if bar else 1)
        if bar:
            d.text((xpx + 3, H + 4), f'{tb:.1f}s', fill=(200, 255, 220), font=font)
            d.text((xpx + 3, H + 20), f'm{k // 4}', fill=(140, 160, 150), font=font)
        k += 1
    for fr, lab in ((60, '60'), (150, '150'), (500, '500'), (2000, '2k'), (8000, '8k')):
        y = int(np.log(fmax / fr) / np.log(fmax / fmin) * H)
        d.text((2, y - 7), lab, fill=(255, 255, 255), font=font)
    canvas.save(dst)


if __name__ == '__main__':
    main()
