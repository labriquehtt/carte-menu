#!/usr/bin/env python3
"""Bande-son finale : la voix enregistrée dans CapCut (sans musique) avec les bruitages dessous.

  python3 mix_voix.py --video out/LA-SOURCE-reel-final-v5.mp4 --out out/LA-SOURCE-reel-voix.mp4

media/voix/voix.wav vient de l'export CapCut (même durée que la vidéo, calé à 0:00 ; extrait par
`ffmpeg -i export.mov -vn media/voix/voix.wav`). La voix est nettoyée des graves parasites et
ramenée à -16 LUFS ; les bruitages (out/bruitages.wav) passent 6 dB en dessous ; limiteur final
à -1 dBFS. Écrit aussi out/bande-son-voix.wav.
"""
import argparse
import os
import subprocess

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    seule = os.path.join(HERE, 'media', 'voix', 'voix_seule.wav')   # sans musique (separe_voix.py)
    ap.add_argument('--voice', default=seule if os.path.exists(seule) else os.path.join(HERE, 'media', 'voix', 'voix.wav'))
    ap.add_argument('--sfx', default=os.path.join(HERE, 'out', 'bruitages.wav'))
    ap.add_argument('--sfx-gain', type=float, default=-6)
    ap.add_argument('--wav', default=os.path.join(HERE, 'out', 'bande-son-voix.wav'))
    ap.add_argument('--video')
    ap.add_argument('--out')
    a = ap.parse_args()
    graph = (f'[0:a]highpass=f=70,loudnorm=I=-16:TP=-2:LRA=11,aresample=44100[v];'
             f'[1:a]volume={a.sfx_gain}dB[s];'
             f'[v][s]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.891:level=false[o]')
    subprocess.run([FF, '-v', 'error', '-y', '-i', a.voice, '-i', a.sfx, '-filter_complex', graph,
                    '-map', '[o]', '-ac', '2', '-ar', '44100', a.wav], check=True)
    print('bande-son :', a.wav)
    if a.video and a.out:
        subprocess.run([FF, '-v', 'error', '-y', '-i', a.video, '-i', a.wav, '-map', '0:v', '-map', '1:a',
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', a.out],
                       check=True)
        print('vidéo :', a.out)


if __name__ == '__main__':
    main()
