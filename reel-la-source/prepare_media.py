#!/usr/bin/env python3
"""Prépare les médias intégrés à la vidéo (dossier media/, hors Git : droits d'auteur).

  python3 prepare_media.py --roof media/src/toit.mp4 --site media/src/site.mp4 --lecun media/src/lecun.webp

- roof  : clip IA du dessin (3:2) → media/roof/NNNN.jpg à 30 fps ; sa 1re image recadrée
          carrée devient le dessin original du polaroid (media/delord.jpg)
- site  : scroll du site LK Studio (16:9) → media/site/NNNN.jpg à 30 fps
- lecun : photo portrait → media/lecun.jpg, recadrée carrée sur le visage
Écrit media/manifest.js, lu par index.html. Sans médias, la vidéo retombe sur les
emplacements vides et l'écran magenta.
"""
import argparse
import glob
import json
import os
import subprocess

import imageio_ffmpeg
from PIL import Image

FF = imageio_ffmpeg.get_ffmpeg_exe()
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media')


def frames(src, name, width):
    out = os.path.join(D, name)
    os.makedirs(out, exist_ok=True)
    for f in glob.glob(os.path.join(out, '*.jpg')):
        os.remove(f)
    subprocess.run([FF, '-v', 'error', '-y', '-i', src, '-an',
                    '-vf', f'fps=30,scale={width}:-2:flags=lanczos', '-q:v', '3',
                    os.path.join(out, '%04d.jpg')], check=True)
    return len(glob.glob(os.path.join(out, '*.jpg')))


def square(im, bias=0.5):
    w, h = im.size
    s = min(w, h)
    return im.crop(((w - s) // 2, int((h - s) * bias), (w - s) // 2 + s, int((h - s) * bias) + s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--roof')
    ap.add_argument('--site')
    ap.add_argument('--lecun')
    a = ap.parse_args()
    os.makedirs(D, exist_ok=True)
    man = {}
    mpath = os.path.join(D, 'manifest.js')
    if os.path.exists(mpath):
        man = json.loads(open(mpath).read().split('=', 1)[1].rstrip(';\n'))
    if a.roof:
        man['roof'] = frames(a.roof, 'roof', 1086)
        first = os.path.join(D, 'first.png')
        subprocess.run([FF, '-v', 'error', '-y', '-i', a.roof, '-frames:v', '1', first], check=True)
        square(Image.open(first).convert('RGB')).save(os.path.join(D, 'delord.jpg'), quality=92)
        os.remove(first)
        man['delord'] = True
    if a.site:
        man['site'] = frames(a.site, 'site', 1040)
    if a.lecun:
        square(Image.open(a.lecun).convert('RGB'), 0.35).resize((736, 736), Image.LANCZOS).save(os.path.join(D, 'lecun.jpg'), quality=92)
        man['lecun'] = True
    with open(mpath, 'w') as f:
        f.write('window.MEDIA = ' + json.dumps(man) + ';\n')
    print(man)


if __name__ == '__main__':
    main()
