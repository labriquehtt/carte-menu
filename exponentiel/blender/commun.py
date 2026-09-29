"""Outils communs aux décors d'EXPONENTIEL (lancés sans interface) :

  blender -b --factory-startup -P blender/P1_etang.py -- [--quality anim|final] [--step 2] [--frames a:b] [--no-render]

- lit ../timing.json (instants des plans, calés sur la voix) ;
- scène 1080×1920 à 30 i/s ; « anim » = animatique (25 %, volumes gris, 1 image sur --step), « final » = EEVEE 100 %,
  ombrage cartoon + contours Line Art encre #1B1620 ;
- deux collections : BG (le décor) et FG (ce qui passe devant le robot) ; rendu bg (FG exclu), puis fg (fond
  transparent, BG en « holdout » pour que les occultations restent justes) ;
- anchor.json : position à l'écran de l'Empty ROBOT_ANCHOR à chaque image (x, y en pixels du 1080×1920, échelle,
  rotation, profondeur), via world_to_camera_view : le robot 2D suit la 3D.
Sorties dans ../out/plates/Pxx/{bg,fg}/####.png et ../out/plates/Pxx/anchor.json. Aléatoire à graines fixes.
"""
import json
import math
import os
import random
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TIMING = json.load(open(os.path.join(ROOT, 'timing.json'), encoding='utf8'))
FPS = TIMING['fps']
INK = (0x1B / 255, 0x16 / 255, 0x20 / 255, 1)


def hexcol(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


GREEN, YELLOW, NIGHT = hexcol('4DFF8F'), hexcol('FFD23C'), hexcol('0B1230')


def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opt = {'quality': 'anim', 'step': 2, 'frames': None, 'render': True}
    i = 0
    while i < len(a):
        if a[i] == '--quality':
            opt['quality'] = a[i + 1]; i += 1
        elif a[i] == '--step':
            opt['step'] = int(a[i + 1]); i += 1
        elif a[i] == '--frames':
            opt['frames'] = [int(v) for v in a[i + 1].split(':')]; i += 1
        elif a[i] == '--no-render':
            opt['render'] = False
        i += 1
    return opt


def plan(pid):
    return next(p for p in TIMING['plans'] if p['id'] == pid)


def f(t):
    """instant (s, temps vidéo) → numéro d'image"""
    return round(t * FPS)


def reset(pid):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    p = plan(pid)
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = p['frames'][0], p['frames'][1] - 1
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    random.seed(hash(pid) % 1000 + 30)
    for name in ('BG', 'FG'):
        col = bpy.data.collections.new(name)
        sc.collection.children.link(col)
    world = bpy.data.worlds.new('nuit')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = NIGHT
    world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    world.color = NIGHT[:3]
    return sc, p


def col(name):
    return bpy.data.collections[name]


def link(obj, collection='BG'):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col(collection).objects.link(obj)
    return obj


def mat(name, color, emission=0.0, rough=0.6):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    if emission:
        b.inputs['Emission Color'].default_value = color
        b.inputs['Emission Strength'].default_value = emission
    m.diffuse_color = color
    return m


def toon(name, color, shade=0.45):
    """ombrage cartoon à deux tons (Shader to RGB + rampe constante)"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    dif = nt.nodes.new('ShaderNodeBsdfDiffuse')
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    emi = nt.nodes.new('ShaderNodeEmission')
    ramp.color_ramp.interpolation = 'CONSTANT'
    dark = tuple(c * shade for c in color[:3]) + (1,)
    ramp.color_ramp.elements[0].color = dark
    ramp.color_ramp.elements[1].position = 0.35
    ramp.color_ramp.elements[1].color = color
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], emi.inputs[0])
    nt.links.new(emi.outputs[0], out.inputs[0])
    m.diffuse_color = color
    return m


def box(name, loc, size, material, collection='BG', bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    for v in o.data.vertices:                 # taille appliquée au maillage : l'échelle reste libre pour l'animation
        v.co.x *= size[0] / 2; v.co.y *= size[1] / 2; v.co.z *= size[2] / 2
    o.data.materials.append(material)
    if bevel:
        m = o.modifiers.new('biseau', 'BEVEL')
        m.width, m.segments = bevel, 2
    return link(o, collection)


def cyl(name, loc, r, depth, material, collection='BG', verts=24, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return link(o, collection)


def sphere(name, loc, r, material, collection='BG', seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return link(o, collection)


def text3d(name, body, loc, size, material, collection='BG', rot=(math.radians(90), 0, 0), font='Fredoka-700'):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.body = body
    o.data.size = size
    o.data.align_x, o.data.align_y = 'CENTER', 'CENTER'
    o.data.extrude = size * 0.06
    ttf = os.path.join(ROOT, 'media', 'fonts', font + '.ttf')
    if os.path.exists(ttf):
        o.data.font = bpy.data.fonts.load(ttf, check_existing=True)
    o.data.materials.append(material)
    return link(o, collection)


def curve_from_points(name, pts, bevel, material, collection='BG'):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    cu.bevel_depth = bevel
    cu.bevel_resolution = 3
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    return link(o, collection)


def empty(name, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.location = loc
    bpy.context.scene.collection.objects.link(o)
    return o


def camera(lens=24):
    cd = bpy.data.cameras.new('CAM')
    cd.lens = lens
    cd.clip_end = 2000
    cam = bpy.data.objects.new('CAM', cd)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    return cam


def key(obj, frame, **props):
    """pose des clés : key(cam, 12, location=(…), rotation_euler=(…))"""
    for k, v in props.items():
        setattr(obj, k, v)
        obj.keyframe_insert(data_path=k, frame=frame)


def fcurves(obj):
    """courbes d'animation d'un objet (Blender 5 : actions en couches → channelbags)"""
    ad = obj.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, 'layers') and len(act.layers):
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out += list(cb.fcurves)
        return out
    return list(getattr(act, 'fcurves', []))


def ease_all(obj, kind='BEZIER'):
    for fc in fcurves(obj):
        for kp in fc.keyframe_points:
            kp.interpolation = kind


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def sun(strength=2.0, rot=(math.radians(50), 0, math.radians(30)), color=(0.75, 0.82, 1.0)):
    ld = bpy.data.lights.new('lune', 'SUN')
    ld.energy = strength
    ld.color = color
    o = bpy.data.objects.new('lune', ld)
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    return o


def setup_render(sc, quality, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    r = sc.render
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    if quality == 'anim':
        r.engine = 'BLENDER_WORKBENCH'
        r.resolution_percentage = 25
        sh = sc.display.shading
        sh.light = 'STUDIO'
        sh.color_type = 'MATERIAL'
        sh.show_cavity = True
        sh.show_object_outline = True
        sh.object_outline_color = INK[:3]
        sc.display.render_aa = '8'
    else:
        r.engine = 'BLENDER_EEVEE'
        r.resolution_percentage = 100
        e = sc.eevee
        e.taa_render_samples = 16
        r.use_motion_blur = True
        r.motion_blur_shutter = 0.5
        lineart(sc)


def lineart(sc):
    """contours encre, même épaisseur que le trait du robot"""
    bpy.ops.object.gpencil_add(type='LINEART_SCENE') if hasattr(bpy.ops.object, 'gpencil_add') else \
        bpy.ops.object.grease_pencil_add(type='LINEART_SCENE')
    o = bpy.context.object
    o.name = 'CONTOURS'
    for m in o.modifiers if hasattr(o, 'modifiers') else []:
        if hasattr(m, 'thickness'):
            m.thickness = 6
    return o


def export_anchor(sc, anchor, out_file, extra=None):
    """position écran de ROBOT_ANCHOR à chaque image ; l'échelle vient de la distance à la caméra"""
    cam = sc.camera
    rows = {}
    for fr in range(sc.frame_start, sc.frame_end + 1):
        sc.frame_set(fr)
        m = anchor.matrix_world
        p = world_to_camera_view(sc, cam, m.translation)
        cup = cam.matrix_world.to_3x3().normalized() @ Vector((0, 1, 0))      # « haut » de l'écran, dans le monde
        up = world_to_camera_view(sc, cam, m.translation + cup)
        wz = world_to_camera_view(sc, cam, m.translation + Vector((0, 0, 1)))
        px, py = p.x * 1080, (1 - p.y) * 1920
        scale = math.hypot(up.x * 1080 - px, (1 - up.y) * 1920 - py) / 330   # 1 unité Blender = hauteur du robot (330 px à s = 1)
        zx, zy = wz.x * 1080 - px, (1 - wz.y) * 1920 - py
        # penche comme la verticale du monde, sauf en vue plongeante (verticale presque vers la caméra)
        rot = math.degrees(math.atan2(zx, -zy)) if math.hypot(zx, zy) > 0.5 * scale * 330 else 0.0
        row = {'x': round(px, 1), 'y': round(py, 1), 's': round(scale * anchor.get('robot_scale', 1.0), 4),
               'rot': round(rot, 2), 'z': round(p.z, 3)}
        if extra:
            row.update(extra(fr))
        rows[fr] = row
    json.dump(rows, open(out_file, 'w'), indent=0)


def render(sc, pid, opt):
    out = os.path.join(ROOT, 'out', 'plates' if opt['quality'] == 'final' else 'anim', pid)
    setup_render(sc, opt['quality'], out)
    anchor = bpy.data.objects.get('ROBOT_ANCHOR')
    if anchor:
        export_anchor(sc, anchor, os.path.join(out, 'anchor.json'),
                      extra=globals().get('ANCHOR_EXTRA'))
    if opt['quality'] == 'final':
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, pid + '.blend'))
    if not opt['render']:
        return
    a, b = opt['frames'] or (sc.frame_start, sc.frame_end)
    fg_objs = list(col('FG').all_objects)
    for layer in ('bg', 'fg'):
        if layer == 'fg' and not fg_objs:
            continue
        vl = sc.view_layers[0]
        vl.layer_collection.children['FG'].exclude = layer == 'bg'
        if opt['quality'] == 'final':      # EEVEE : le décor masque le premier plan là où il est devant (holdout)
            vl.layer_collection.children['BG'].holdout = layer == 'fg'
        else:                              # Workbench ignore le holdout : on retire simplement le décor
            vl.layer_collection.children['BG'].exclude = layer == 'fg'
        sc.render.film_transparent = layer == 'fg'
        os.makedirs(os.path.join(out, layer), exist_ok=True)
        for fr in range(a, b + 1, opt['step']):
            sc.frame_set(fr)
            sc.render.filepath = os.path.join(out, layer, f'{fr:04d}.png')
            bpy.ops.render.render(write_still=True)
    print('RENDU', pid, out)


def cam_path(cam, frames, fn):
    """caméra continue : fn(image) → (position, cible, focale en mm, roulis en degrés) ; une clé par image"""
    from mathutils import Matrix
    for fr in frames:
        bpy.context.scene.frame_set(fr)
        loc, target, lens, roll = fn(fr)
        cam.location = Vector(loc)
        look_at(cam, target)
        if roll:
            cam.rotation_euler = (cam.rotation_euler.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(roll), 4, 'Z')).to_euler()
        cam.data.lens = lens
        cam.keyframe_insert('location', frame=fr)
        cam.keyframe_insert('rotation_euler', frame=fr)
        cam.data.keyframe_insert('lens', frame=fr)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)
