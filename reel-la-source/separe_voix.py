#!/usr/bin/env python3
"""Retire la musique de l'export CapCut → media/voix/voix_seule.wav (voix seule).

  curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/source-separation-models/sherpa-onnx-spleeter-2stems-fp16.tar.bz2
  tar xjf sherpa-onnx-spleeter-2stems-fp16.tar.bz2
  python3 separe_voix.py --model sherpa-onnx-spleeter-2stems-fp16 --from 55.5 --to 100.8

Spleeter (voix / accompagnement) ; la voix extraite ne remplace l'enregistrement d'origine que
sur le passage où il y a de la musique (--from/--to, fondus de 0,3 s à placer dans des pauses),
pour garder partout ailleurs le son d'origine, sans artefacts. (Le modèle UVR échoue ici :
il range par endroits la voix dans la musique.)
"""
import argparse
import os
import subprocess

import numpy as np
import sherpa_onnx

from mix_sons import FF, SR, load

HERE = os.path.dirname(os.path.abspath(__file__))
V = os.path.join(HERE, 'media', 'voix')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--from', dest='t0', type=float, required=True)
    ap.add_argument('--to', dest='t1', type=float, required=True)
    a = ap.parse_args()
    M = a.model.rstrip('/') + '/'
    ss = sherpa_onnx.OfflineSourceSeparation(sherpa_onnx.OfflineSourceSeparationConfig(
        model=sherpa_onnx.OfflineSourceSeparationModelConfig(
            spleeter=sherpa_onnx.OfflineSourceSeparationSpleeterModelConfig(
                vocals=M + 'vocals.fp16.onnx', accompaniment=M + 'accompaniment.fp16.onnx'), num_threads=2)))
    o = load(os.path.join(V, 'voix.wav'))
    res = ss.process(sample_rate=SR, samples=np.ascontiguousarray(o.T))
    v = np.array(res.stems[0].data).T.astype(np.float32)
    n = min(len(o), len(v))
    o, v = o[:n], v[:n]
    t = np.arange(n) / SR
    w = np.interp(t, [a.t0 - 0.15, a.t0 + 0.15, a.t1 - 0.1, a.t1 + 0.1], [0, 1, 1, 0]).astype(np.float32)[:, None]
    out = o * (1 - w) + v * w
    pcm = (np.clip(out, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run([FF, '-v', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', str(SR), '-i', '-',
                    os.path.join(V, 'voix_seule.wav')], input=pcm, check=True)
    print('voix seule :', os.path.join(V, 'voix_seule.wav'))


if __name__ == '__main__':
    main()
