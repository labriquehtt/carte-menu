#!/bin/bash
# Assemblage final : plaques → vidéos, vérification HyperFrames, rendu 1080×1920 avec la bande-son.
#   bash assemblage.sh            (les rendus Blender doivent être complets : bash rendu_final.sh)
cd "$(dirname "$0")"
set -e
bash encoder_plaques.sh
npx --yes hyperframes@0.8.105 lint
mkdir -p renders
npx --yes hyperframes@0.8.105 render --quality delivery --video-frame-format png --workers 2 \
  --output renders/ABYSSE-PARANO-IA.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate \
  -of compact renders/ABYSSE-PARANO-IA.mp4
