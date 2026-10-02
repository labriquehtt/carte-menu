#!/bin/bash
# Rendu final des plaques Blender par blocs (un processus Blender par bloc : la mémoire est rendue entre deux blocs).
# Les images déjà rendues sont sautées : on peut relancer ce script après une interruption.
#   bash rendu_final.sh
cd "$(dirname "$0")"
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
bloc() {   # bloc <script> <dossier> <première> <dernière>
  local script=$1 dir=$2 a=$3 b=$4 manque=""
  for ((f = a; f <= b; f++)); do
    [ -f "out/plates/$dir/$(printf %04d $f).png" ] || { manque=1; break; }
  done
  [ -z "$manque" ] && { echo "bloc $dir $a-$b déjà rendu"; return; }
  # première image manquante du bloc
  while [ -f "out/plates/$dir/$(printf %04d $a).png" ]; do a=$((a + 1)); done
  echo "rendu $dir $a-$b"
  "$B" -b --factory-startup -P "blender/$script" -- --quality final --frames "$a:$b" >> "out/final_$dir.log" 2>&1
}
bloc abysse.py P1P2 240 300
bloc abysse.py P1P2 301 360
bloc abysse.py P1P2 361 420
bloc abysse.py P1P2 421 470
bloc abysse.py P1P2 471 520
bloc abysse.py P1P2 521 575
bloc bureau.py P3 576 647
bloc bureau.py P3 648 719
echo "P1P2 : $(ls out/plates/P1P2/*.png | wc -l)/336   P3 : $(ls out/plates/P3/*.png | wc -l)/144"
