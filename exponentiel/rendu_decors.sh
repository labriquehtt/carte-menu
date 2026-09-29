#!/usr/bin/env bash
# Rendu final des décors Blender (EEVEE 1080×1920), plan par plan : out/plates/Pxx/{bg,fg}, anchor.json.
#   bash rendu_decors.sh P1 P2 P7        (sans argument : tous les plans)
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.1/blender.exe}"
cd "$(dirname "$0")"
PLANS="${@:-P1 P2 P3 P4 P5 P6 P7}"
for P in $PLANS; do
  case $P in P1|P2|P7) S=etang ;; *) S=piste ;; esac
  rm -rf "out/plates/$P"
  t0=$(date +%s)
  "$B" -b --factory-startup -P "blender/$S.py" -- --plan "$P" --quality final --step 1 > "out/log_$P.txt" 2>&1
  echo "$P : $(( $(date +%s) - t0 )) s, $(ls out/plates/$P/bg 2>/dev/null | wc -l) images"
done
