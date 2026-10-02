#!/bin/bash
# Images Blender → vidéos des plaques pour HyperFrames (qualité quasi sans perte, une image clé par seconde).
#   bash encoder_plaques.sh
cd "$(dirname "$0")"
set -e
n1=$(ls out/plates/P1P2/*.png | wc -l)
n3=$(ls out/plates/P3/*.png | wc -l)
[ "$n1" -eq 336 ] || { echo "P1P2 incomplet : $n1/336"; exit 1; }
[ "$n3" -eq 144 ] || { echo "P3 incomplet : $n3/144"; exit 1; }
ffmpeg -v error -y -framerate 30 -start_number 240 -i out/plates/P1P2/%04d.png -frames:v 336 \
  -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p -g 30 assets/plates/plongee.mp4
ffmpeg -v error -y -framerate 30 -start_number 576 -i out/plates/P3/%04d.png -frames:v 144 \
  -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p -g 30 assets/plates/bureau.mp4
for f in assets/plates/*.mp4; do
  echo "$f : $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f") s"
done
