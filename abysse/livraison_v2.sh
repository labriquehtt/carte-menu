#!/usr/bin/env bash
# ABYSSE v2 — après le rendu HyperFrames : remet la bande-son exacte (HyperFrames la baisse de 2 dB), puis fabrique
# la version légère (≈ 28 Mo, 2 passes) à envoyer. Contrôle la durée et le niveau final.
#   bash livraison_v2.sh
set -euo pipefail
cd "$(dirname "$0")"
SRC=renders/ABYSSE-PARANO-IA-v2.mp4
MASTER=renders/ABYSSE-PARANO-IA-v2-master.mp4
LEGER=renders/ABYSSE-PARANO-IA-v2-28mo.mp4
SON=out/son/bande-son-livraison.wav      # −14 LUFS, −2 dBTP : l'AAC ne dépasse pas 0 dBFS
python son/normaliser.py out/son/bande-son-brute.wav "$SON" -2.0 > /dev/null

ffmpeg -v error -y -i "$SRC" -i "$SON" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart "$MASTER"

mkdir -p out/passlog
ffmpeg -v error -y -i "$MASTER" -c:v libx264 -preset slow -b:v 7700k -pass 1 -passlogfile out/passlog/v2 -an -f mp4 NUL
ffmpeg -v error -y -i "$MASTER" -i "$SON" -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 7700k -pass 2 \
  -passlogfile out/passlog/v2 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$LEGER"

for f in "$MASTER" "$LEGER"; do
  d=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f")
  s=$(stat -c %s "$f")
  echo "$f : ${d} s, $((s / 1000000)) Mo"
done
ffmpeg -hide_banner -nostats -i "$LEGER" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
