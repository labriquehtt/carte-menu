#!/usr/bin/env python3
"""Léger effet « robot » sur la voix IA, dosé pour rester agréable.

  python3 robot_voix.py media/voix_ia/voix_ia.wav media/voix_ia/voix_ia_robot.wav --amount 0.3

Deux couches mélangées sous la voix d'origine (--amount = part de l'effet, 0 à 1) :
  - un peigne métallique (copies retardées de 4,2 / 8,4 / 12,6 ms) : timbre « tube », voix de machine ;
  - une modulation en anneau à 55 Hz : léger grain électronique.
Le niveau moyen reste celui de la voix d'origine.
"""
import argparse
import subprocess

import numpy as np

from mix_sons import FF

SR = 44100


def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def delayed(x, ms):
    d = int(round(ms * SR / 1000))
    return np.concatenate([np.zeros(d, np.float32), x[:-d]])


def robot(x, amount):
    metal = x + 0.45 * delayed(x, 4.2) + 0.3 * delayed(x, 8.4) + 0.2 * delayed(x, 12.6)
    metal *= np.sqrt((x ** 2).mean() / ((metal ** 2).mean() + 1e-12))
    ring = x * np.sin(2 * np.pi * 55 * np.arange(len(x)) / SR).astype(np.float32) * np.sqrt(2)
    y = (1 - amount) * x + amount * (0.65 * metal + 0.35 * ring)
    return y * np.sqrt((x ** 2).mean() / ((y ** 2).mean() + 1e-12))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--amount', type=float, default=0.3)
    a = ap.parse_args()
    y = np.clip(robot(load(a.src), a.amount), -1, 1)
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-', a.dst],
                   input=y.astype('<f4').tobytes(), check=True)
    print('voix robot :', a.dst)


if __name__ == '__main__':
    main()
