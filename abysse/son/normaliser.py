"""Normalisation du mixage pour les réseaux (−14 LUFS intégré, crête vraie −1 dBTP), en deux passes ffmpeg.

  python son/normaliser.py out/son/bande-son-brute.wav assets/son/bande-son.wav
  python son/normaliser.py out/son/bande-son-brute.wav out/son/bande-son-livraison.wav -2.0   (marge pour l'AAC 192k,
      qui dépasse d'environ 1,5 dB la crête du WAV)
"""
import json
import re
import subprocess
import sys

src, dst = sys.argv[1], sys.argv[2]
tp = float(sys.argv[3]) if len(sys.argv) > 3 else -1.0
cible = f'I=-14:TP={tp}:LRA=11'
p1 = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', f'loudnorm={cible}:print_format=json', '-f', 'null', '-'],
                    capture_output=True, text=True)
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr, re.S).group(0))
print('mesure :', {k: m[k] for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh')})
af = (f"loudnorm={cible}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=summary")
p2 = subprocess.run(['ffmpeg', '-hide_banner', '-y', '-i', src, '-af', af, '-ar', '48000', '-c:a', 'pcm_s24le', dst],
                    capture_output=True, text=True)
print('\n'.join(l for l in p2.stderr.splitlines() if 'LUFS' in l or 'dBTP' in l or 'Normalization' in l))
