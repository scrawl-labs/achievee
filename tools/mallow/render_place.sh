#!/bin/bash
# Renders Mallow's pictures for the given places into out/<place>/ (files already there are skipped, so a run that
# stopped can simply be started again). Needs Blender's Python module: `pip install bpy` (Blender 4.2+), then
#   BLENDER_PY=/path/to/venv/bin/python ./render_place.sh forest rain
# and afterwards, for each place: python post_place.py out/<place> ../.. <place>
# A place takes about 1-2 hours on a laptop CPU at 128 samples.
cd "$(dirname "$0")"
PY=${BLENDER_PY:-python}
for place in "$@"; do
  mkdir -p out/$place
  for v in wide tall; do
    [ -f out/$place/base_$v.png ] || PLACE=$place $PY -I mallow_places.py out/$place/base_$v.png base $v idle 128 2>&1 | grep -E "^done|Error|Traceback"
  done
  for v in wide tall; do for f in idle blink talk happy joy sad think; do
    [ -f out/$place/face_${v}_$f.png ] || PLACE=$place $PY -I mallow_places.py out/$place/face_${v}_$f.png patch $v $f 128 2>&1 | grep -E "Error|Traceback"
  done; done
  echo "$place: $(ls out/$place/*.png | wc -l)/16 pictures"
done
