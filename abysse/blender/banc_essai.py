"""Banc d'essai du temps de rendu EEVEE : ouvre out/blend/abysse.blend et rend une image avec des réglages variés.

  blender -b out/blend/abysse.blend -P blender/banc_essai.py -- 300
"""
import os
import sys
import time

import bpy

frame = int(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else 300
sc = bpy.context.scene
e = sc.eevee
sc.frame_set(frame)
out = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'tests', 'banc')
os.makedirs(out, exist_ok=True)


def run(label, samples=8, pct=100):
    sc.render.resolution_percentage = pct
    e.taa_render_samples = samples
    t0 = time.time()
    sc.render.filepath = os.path.join(out, f'{label}.png')
    bpy.ops.render.render(write_still=True)
    print(f'BANC {label:34s} {time.time() - t0:6.1f}s', flush=True)


for o in bpy.data.objects:
    if o.name.startswith(('neige', 'bulles')):
        o.visible_shadow = False
run('neige_sans_ombre')
for o in bpy.data.objects:
    if o.type == 'LIGHT' and o.data.type == 'SPOT':
        o.data.use_shadow = False
run('+ projecteurs_sans_ombre')
bpy.data.objects['parois'].visible_shadow = False
run('+ parois_sans_ombre')
bpy.data.objects['parois'].visible_shadow = True
for l in bpy.data.lights:
    if hasattr(l, 'shadow_maximum_resolution'):
        l.shadow_maximum_resolution = 0.02
run('parois_ombre_res_0.02')
run('idem_32_samples', samples=32)
e.use_raytracing = False
run('idem_32_sans_raytracing', samples=32)
