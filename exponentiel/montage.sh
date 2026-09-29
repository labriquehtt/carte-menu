#!/usr/bin/env bash
# Montage final d'EXPONENTIEL : compositing (plaques Blender + robot + textes) → vidéo, bande-son, encodage.
#   bash rendu_decors.sh            # 1. décors Blender (out/plates)
#   bash montage.sh                 # 2. → out/EXPONENTIEL-reel.mp4 (1080×1920, 30 i/s, H.264 2 passes ~6,5 Mb/s, AAC 160k)
set -e
cd "$(dirname "$0")"
export PYTHONUTF8=1
python sons.py                                                             # bruitages + musique + mixage (-14 LUFS)
node render.js --plates plates --video out/EXPONENTIEL-video.mp4 --workers 4 --sub ${SUB:-4}
ffmpeg -v error -y -i out/EXPONENTIEL-video.mp4 -c:v libx264 -b:v 6500k -preset slow -pass 1 -an -f mp4 -passlogfile out/x264 NUL 2>/dev/null \
  || ffmpeg -v error -y -i out/EXPONENTIEL-video.mp4 -c:v libx264 -b:v 6500k -preset slow -pass 1 -an -f mp4 -passlogfile out/x264 /dev/null
ffmpeg -v error -y -i out/EXPONENTIEL-video.mp4 -i out/bande-son.wav -map 0:v -map 1:a -c:v libx264 -b:v 6500k -preset slow -pass 2 \
  -passlogfile out/x264 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart -t 29 out/EXPONENTIEL-reel.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 out/EXPONENTIEL-reel.mp4
