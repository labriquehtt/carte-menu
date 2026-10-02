"""Outils communs aux scènes Blender de la bande-annonce ABYSSE (Blender 5.1, sans interface).

  blender -b --factory-startup -P blender/abysse.py -- [--quality test|final] [--frames a:b] [--step n] [--still f1,f2]

- lit ../partition.json (le minutage de la musique : chaque évènement a son numéro d'image) ;
- 1080×1920, 30 i/s ; « test » = EEVEE à 50 % et peu d'échantillons ; « final » = EEVEE 100 % ;
- sorties : ../out/plates/<plan>/####.png (+ <plan>.blend pour ouvrir la scène dans Blender).
Tout est procédural et à graines fixes : deux rendus donnent les mêmes images.
"""
import json
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector, noise

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# la 3D a été rendue avec la partition v1 (gelée dans partition_3d.json) ; la v2 la décale (decalage_3d)
P = json.load(open(os.path.join(ROOT, 'partition_3d.json'), encoding='utf8'))
FPS = P['fps']
FONTS = os.path.join(ROOT, 'media', 'fonts')


# ---------------------------------------------------------------- partition
def events(kind=None, objet=None):
    return [e for e in P['evenements'] if (kind is None or e['type'] == kind) and (objet is None or e.get('objet') == objet)]


def ev1(kind, objet=None):
    return events(kind, objet)[0]


def plan(pid):
    return next(p for p in P['plans'] if p['id'] == pid)


def fr(sec):
    return round(sec * FPS)


def bar(n, beat=0.0):
    return n * P['mesure'] + beat * P['temps']


# ---------------------------------------------------------------- arguments
def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opt = {'quality': 'test', 'frames': None, 'step': 1, 'still': None, 'render': True, 'samples': None}
    i = 0
    while i < len(a):
        k = a[i]
        if k == '--quality':
            opt['quality'] = a[i + 1]; i += 1
        elif k == '--frames':
            opt['frames'] = [int(v) for v in a[i + 1].split(':')]; i += 1
        elif k == '--step':
            opt['step'] = int(a[i + 1]); i += 1
        elif k == '--still':
            opt['still'] = [int(v) for v in a[i + 1].split(',')]; i += 1
        elif k == '--samples':
            opt['samples'] = int(a[i + 1]); i += 1
        elif k == '--only':
            opt['only'] = a[i + 1].split(','); i += 1
        elif k == '--no-render':
            opt['render'] = False
        i += 1
    return opt


# ---------------------------------------------------------------- couleurs
def lin(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (a,)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def smoother(x):
    x = max(0.0, min(1.0, x))
    return x * x * x * (x * (x * 6 - 15) + 10)


def mix(a, b, k):
    return a + (b - a) * k


# ---------------------------------------------------------------- scène
def reset(seed=7):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.render.resolution_x, sc.render.resolution_y = P['largeur'], P['hauteur']
    random.seed(seed)
    w = bpy.data.worlds.new('monde')
    sc.world = w
    w.use_nodes = True
    return sc


def collection(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def put(obj, coll='DECOR'):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection(coll).objects.link(obj)
    return obj


def new_obj(name, mesh, coll='DECOR'):
    o = bpy.data.objects.new(name, mesh)
    collection(coll).objects.link(o)
    return o


def mesh_from_bmesh(name, bm, coll='DECOR', smooth_shade=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth_shade:
        for p in me.polygons:
            p.use_smooth = True
    return new_obj(name, me, coll)


def mesh_from_data(name, verts, faces, coll='DECOR', smooth_shade=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate()
    if smooth_shade:
        for p in me.polygons:
            p.use_smooth = True
    return new_obj(name, me, coll)


def mod(obj, kind, name=None, **kw):
    m = obj.modifiers.new(name or kind.lower(), kind)
    for k, v in kw.items():
        setattr(m, k, v)
    return m


def subsurf(obj, levels=2, render=None):
    return mod(obj, 'SUBSURF', levels=levels, render_levels=render if render is not None else levels)


def bevel(obj, width, segments=3):
    return mod(obj, 'BEVEL', width=width, segments=segments, limit_method='ANGLE')


def assign(obj, *mats):
    for m in mats:
        obj.data.materials.append(m)
    return obj


def key(obj, frame, **props):
    for k, v in props.items():
        setattr(obj, k, v)
        obj.keyframe_insert(data_path=k, frame=frame)


def key_path(owner, path, frame, value, index=-1):
    """clé sur un chemin quelconque (ex. une entrée de nœud : inputs[1].default_value)"""
    obj = owner
    parts = path.split('.')
    for p in parts[:-1]:
        obj = eval('obj.' + p) if not p.startswith('[') else obj[eval(p[1:-1])]
    setattr(obj, parts[-1], value)
    owner.keyframe_insert(data_path=path, frame=frame, index=index)


def fcurves(idblock):
    ad = idblock.animation_data
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


def interp(idblock, kind='LINEAR'):
    for fc in fcurves(idblock):
        for kp in fc.keyframe_points:
            kp.interpolation = kind


# ---------------------------------------------------------------- matières
def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt.nodes, nt.links


def principled(name, color, rough=0.5, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0, coat=0.0, sss=0.0,
               transmission=0.0, ior=1.45, spec=0.5):
    m, N, L = node_mat(name)
    b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['IOR'].default_value = ior
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.05
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if emit is not None:
        b.inputs['Emission Color'].default_value = emit
        b.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    m.diffuse_color = color
    return m


def emission(name, color, strength=5.0, alpha=None):
    m, N, L = node_mat(name)
    N.remove(N['Principled BSDF'])
    e = N.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = color
    e.inputs['Strength'].default_value = strength
    out = N['Material Output']
    if alpha is None:
        L.new(e.outputs[0], out.inputs['Surface'])
    else:
        tr = N.new('ShaderNodeBsdfTransparent')
        mx = N.new('ShaderNodeMixShader')
        mx.inputs[0].default_value = alpha
        L.new(tr.outputs[0], mx.inputs[1])
        L.new(e.outputs[0], mx.inputs[2])
        L.new(mx.outputs[0], out.inputs['Surface'])
    m.diffuse_color = color
    return m


def noise_tex(N, L, vec, scale, detail=8.0, rough=0.6, dist=0.0, w=None):
    n = N.new('ShaderNodeTexNoise')
    if w is not None:
        n.noise_dimensions = '4D'
        n.inputs['W'].default_value = w
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    n.inputs['Distortion'].default_value = dist
    if vec is not None:
        L.new(vec, n.inputs['Vector'])
    return n


def ramp(N, L, src, stops):
    r = N.new('ShaderNodeValToRGB')
    els = r.color_ramp.elements
    while len(els) < len(stops):
        els.new(0.5)
    for el, (pos, col) in zip(els, stops):
        el.position = pos
        el.color = col if len(col) == 4 else (*col, 1)
    L.new(src, r.inputs['Fac'])
    return r


def math_node(N, L, op, a, b=None, clamp=False):
    m = N.new('ShaderNodeMath')
    m.operation = op
    m.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            L.new(v, m.inputs[i])
    return m.outputs[0]


def mix_rgb(N, L, fac, a, b, blend='MIX'):
    m = N.new('ShaderNodeMix')
    m.data_type = 'RGBA'
    m.blend_type = blend
    for sock, v in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v
        else:
            L.new(v, sock)
    return m.outputs[2]


def bump(N, L, height, strength, distance=0.05, normal_in=None):
    b = N.new('ShaderNodeBump')
    b.inputs['Strength'].default_value = strength
    b.inputs['Distance'].default_value = distance
    L.new(height, b.inputs['Height'])
    if normal_in is not None:
        L.new(normal_in, b.inputs['Normal'])
    return b.outputs['Normal']


def rock(name, base=(0.030, 0.034, 0.034), algae=(0.022, 0.036, 0.024), sand=(0.11, 0.105, 0.09), scale=0.6,
         sonar=None):
    """roche sous-marine : teinte sombre qui varie, voile d'algues, fin dépôt de sédiment sur les faces horizontales,
    fissures et grain (relief). `sonar` : groupe de nœuds qui ajoute l'onde lumineuse du sonar."""
    m, N, L = node_mat(name)
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    big = noise_tex(N, L, tc, scale * 0.3, 5, 0.55, dist=0.4)
    mid = noise_tex(N, L, tc, scale * 1.6, 8, 0.6)
    det = noise_tex(N, L, tc, scale * 9.0, 14, 0.7, dist=0.2)
    # croûte poreuse (éponges, corail mort) : petites alvéoles irrégulières, pas de dallage
    pores = N.new('ShaderNodeTexVoronoi')
    pores.feature = 'SMOOTH_F1'
    pores.inputs['Scale'].default_value = scale * 14.0
    pores.inputs['Randomness'].default_value = 1.0
    warp = N.new('ShaderNodeVectorMath')
    warp.operation = 'ADD'
    L.new(tc, warp.inputs[0])
    L.new(mid.outputs['Color'], warp.inputs[1])
    L.new(warp.outputs[0], pores.inputs['Vector'])
    dark = tuple(c * 0.55 for c in base)
    col = ramp(N, L, big.outputs['Fac'], [(0.3, dark), (0.5, base), (0.72, algae)])
    col2 = mix_rgb(N, L, math_node(N, L, 'MULTIPLY', mid.outputs['Fac'], 0.5), col.outputs['Color'],
                   (0.5, 0.5, 0.5, 1), 'OVERLAY')
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(geo.outputs['Normal'], sep.inputs[0])
    up = N.new('ShaderNodeMapRange')
    up.inputs['From Min'].default_value, up.inputs['From Max'].default_value = 0.65, 0.95
    L.new(sep.outputs['Z'], up.inputs['Value'])
    soft = N.new('ShaderNodeMapRange')
    soft.inputs['From Min'].default_value, soft.inputs['From Max'].default_value = 0.35, 0.75
    L.new(mid.outputs['Fac'], soft.inputs['Value'])
    sandmask = math_node(N, L, 'MULTIPLY', math_node(N, L, 'MULTIPLY', up.outputs['Result'], soft.outputs['Result']), 0.7)
    c2 = mix_rgb(N, L, sandmask, col2, (*sand, 1))
    pit = N.new('ShaderNodeMapRange')
    pit.inputs['From Min'].default_value, pit.inputs['From Max'].default_value = 0.05, 0.35
    L.new(pores.outputs['Distance'], pit.inputs['Value'])
    c3 = mix_rgb(N, L, math_node(N, L, 'MULTIPLY', math_node(N, L, 'SUBTRACT', 1.0, pit.outputs['Result']), 0.45),
                 c2, (0.006, 0.007, 0.007, 1))
    L.new(c3, b.inputs['Base Color'])
    L.new(math_node(N, L, 'ADD', 0.80, math_node(N, L, 'MULTIPLY', det.outputs['Fac'], 0.18)), b.inputs['Roughness'])
    h = math_node(N, L, 'ADD', math_node(N, L, 'MULTIPLY', det.outputs['Fac'], 0.5),
                  math_node(N, L, 'MULTIPLY', pit.outputs['Result'], 0.45))
    h = math_node(N, L, 'ADD', h, math_node(N, L, 'MULTIPLY', mid.outputs['Fac'], 0.9))
    L.new(bump(N, L, h, 0.65, 0.1), b.inputs['Normal'])
    if sonar is not None:
        add_sonar(N, L, b, sonar)
    m.diffuse_color = (*base[:3], 1)
    return m


def add_sonar(N, L, bsdf, group, factor=1.0):
    """ajoute l'onde du sonar (groupe de nœuds partagé) en émission"""
    g = N.new('ShaderNodeGroup')
    g.node_tree = group
    L.new(g.outputs['Couleur'], bsdf.inputs['Emission Color'])
    L.new(math_node(N, L, 'MULTIPLY', g.outputs['Force'], factor), bsdf.inputs['Emission Strength'])


def metal_rust(name, paint=(0.11, 0.13, 0.14), rust=(0.20, 0.07, 0.025), scale=1.0, rust_amount=0.45):
    m, N, L = node_mat(name)
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    n1 = noise_tex(N, L, tc, scale * 1.4, 10, 0.62, dist=0.4)
    n2 = noise_tex(N, L, tc, scale * 14, 8, 0.6)
    mask = N.new('ShaderNodeMapRange')
    mask.inputs['From Min'].default_value = rust_amount + 0.05
    mask.inputs['From Max'].default_value = rust_amount + 0.12
    L.new(n1.outputs['Fac'], mask.inputs['Value'])
    c = mix_rgb(N, L, mask.outputs['Result'], (*paint, 1), (*rust, 1))
    c = mix_rgb(N, L, math_node(N, L, 'MULTIPLY', n2.outputs['Fac'], 0.35), c, (0.02, 0.02, 0.02, 1), 'MULTIPLY')
    L.new(c, b.inputs['Base Color'])
    met = math_node(N, L, 'SUBTRACT', 0.85, math_node(N, L, 'MULTIPLY', mask.outputs['Result'], 0.8))
    L.new(met, b.inputs['Metallic'])
    ro = math_node(N, L, 'ADD', 0.35, math_node(N, L, 'MULTIPLY', mask.outputs['Result'], 0.5))
    L.new(ro, b.inputs['Roughness'])
    L.new(bump(N, L, math_node(N, L, 'ADD', n2.outputs['Fac'], math_node(N, L, 'MULTIPLY', mask.outputs['Result'], 0.6)),
               0.35, 0.02), b.inputs['Normal'])
    m.diffuse_color = (*paint, 1)
    return m


def silted(name, base, rough=0.3, coat=0.0, silt=(0.16, 0.15, 0.13), amount=0.55, scale=3.0, metal=0.0):
    """surface (laque, bois…) couverte de limon sur les faces tournées vers le haut"""
    m, N, L = node_mat(name)
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    n = noise_tex(N, L, tc, scale, 10, 0.6, dist=0.2)
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(geo.outputs['Normal'], sep.inputs[0])
    up = N.new('ShaderNodeMapRange')
    up.inputs['From Min'].default_value, up.inputs['From Max'].default_value = 0.3, 0.9
    L.new(sep.outputs['Z'], up.inputs['Value'])
    msk = math_node(N, L, 'MULTIPLY', up.outputs['Result'],
                    math_node(N, L, 'ADD', n.outputs['Fac'], amount - 0.5), clamp=True)
    L.new(mix_rgb(N, L, msk, (*base, 1), (*silt, 1)), b.inputs['Base Color'])
    L.new(math_node(N, L, 'ADD', rough, math_node(N, L, 'MULTIPLY', msk, 0.9 - rough)), b.inputs['Roughness'])
    b.inputs['Metallic'].default_value = metal
    if coat:
        L.new(math_node(N, L, 'SUBTRACT', coat, math_node(N, L, 'MULTIPLY', msk, coat)), b.inputs['Coat Weight'])
        b.inputs['Coat Roughness'].default_value = 0.06
    L.new(bump(N, L, math_node(N, L, 'MULTIPLY', msk, n.outputs['Fac']), 0.3, 0.01), b.inputs['Normal'])
    m.diffuse_color = (*base, 1)
    return m


# ---------------------------------------------------------------- formes
def icosphere(name, r, subdiv=2, loc=(0, 0, 0), coll='DECOR'):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    o = mesh_from_bmesh(name, bm, coll)
    o.location = loc
    return o


def uvsphere(name, r, seg=32, rings=16, loc=(0, 0, 0), coll='DECOR'):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    o = mesh_from_bmesh(name, bm, coll)
    o.location = loc
    return o


def box(name, size, loc=(0, 0, 0), coll='DECOR', bev=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    o = mesh_from_bmesh(name, bm, coll, smooth_shade=False)
    o.location = loc
    if bev:
        bevel(o, bev, 3)
        o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None
    return o


def cylinder(name, r, depth, verts=32, loc=(0, 0, 0), rot=(0, 0, 0), coll='DECOR', cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=verts, radius1=r, radius2=r, depth=depth)
    o = mesh_from_bmesh(name, bm, coll)
    o.location, o.rotation_euler = loc, rot
    return o


def curve_tube(name, pts, radius, coll='DECOR', res=4, closed=False, kind='NURBS'):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new(kind)
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    if kind == 'NURBS':
        sp.use_endpoint_u = not closed
        sp.order_u = 4 if len(pts) >= 4 else len(pts)
    sp.use_cyclic_u = closed
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.resolution_u = 24
    o = bpy.data.objects.new(name, cu)
    collection(coll).objects.link(o)
    return o


def tube_mesh(name, pts, radius, closed=False, seg=10, coll='DECOR'):
    """tube maillé le long d'un chemin, avec une carte UV : u = position le long du tube (0 → 1)"""
    pts = [Vector(p) for p in pts]
    n = len(pts)
    lengths = [0.0]
    for i in range(1, n + (1 if closed else 0)):
        lengths.append(lengths[-1] + (pts[i % n] - pts[i - 1]).length)
    total = lengths[-1]
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('long')
    rings = []
    count = n + (1 if closed else 0)
    for i in range(count):
        p = pts[i % n]
        t = (pts[(i + 1) % n] - pts[(i - 1) % n]) if (closed or 0 < i < n - 1) else \
            ((pts[1] - pts[0]) if i == 0 else (pts[-1] - pts[-2]))
        t.normalize()
        a = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        nrm = t.cross(a).normalized()
        bi = t.cross(nrm).normalized()
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * math.pi * k / seg) + bi * math.sin(2 * math.pi * k / seg)) * radius)
                      for k in range(seg)])
    for i in range(count - 1):
        for k in range(seg):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
            us = (lengths[i] / total, lengths[i + 1] / total)
            for loop, (uu, vv) in zip(f.loops, ((us[0], k / seg), (us[0], (k + 1) / seg), (us[1], (k + 1) / seg),
                                                (us[1], k / seg))):
                loop[uv].uv = (uu, vv)
    return mesh_from_bmesh(name, bm, coll)


def text_obj(name, body, size, font_file, extrude=0.0, coll='DECOR', align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.size = size
    cu.align_x, cu.align_y = align, 'CENTER'
    cu.extrude = extrude
    if font_file and os.path.exists(font_file):
        cu.font = bpy.data.fonts.load(font_file, check_existing=True)
    o = bpy.data.objects.new(name, cu)
    collection(coll).objects.link(o)
    return o


def to_mesh(obj):
    """convertit une courbe/texte en maillage (pour lui appliquer des modificateurs)"""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    new = bpy.data.objects.new(obj.name + '_m', me)
    for c in obj.users_collection:
        c.objects.link(new)
    new.matrix_world = obj.matrix_world.copy()
    bpy.data.objects.remove(obj)
    new.name = new.name[:-2]
    return new


def scatter_points(name, pts, inst_radius, material, coll='DECOR', subdiv=1, scales=None):
    """nuage de petites sphères (neige marine, bulles…) en un seul maillage : rapide à rendre"""
    bm = bmesh.new()
    proto = bmesh.new()
    bmesh.ops.create_icosphere(proto, subdivisions=subdiv, radius=1.0)
    pv = [v.co.copy() for v in proto.verts]
    pf = [[v.index for v in f.verts] for f in proto.faces]
    proto.free()
    verts = []
    for i, p in enumerate(pts):
        r = inst_radius * (scales[i] if scales is not None else 1.0)
        base = len(verts)
        verts.extend(bm.verts.new((p[0] + v.x * r, p[1] + v.y * r, p[2] + v.z * r)) for v in pv)
        for f in pf:
            bm.faces.new([verts[base + k] for k in f])
    o = mesh_from_bmesh(name, bm, coll)
    o.data.materials.append(material)
    o.visible_shadow = False                  # des milliers de grains : pas d'ombres (coût énorme, aucun effet)
    return o


# ---------------------------------------------------------------- caméra et lumières
def camera(name='CAM', lens=20.0, coll='CAMERA'):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_fit = 'VERTICAL'
    cd.sensor_height = 36.0
    cd.clip_start, cd.clip_end = 0.05, 600
    cam = bpy.data.objects.new(name, cd)
    collection(coll).objects.link(cam)
    bpy.context.scene.camera = cam
    return cam


def aim(loc, target, roll_deg=0.0):
    d = Vector(target) - Vector(loc)
    q = d.to_track_quat('-Z', 'Y')
    m = q.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(roll_deg), 4, 'Z')
    return m.to_euler()


def yaw_pitch(yaw_deg, pitch_deg, roll_deg=0.0):
    """orientation caméra : cap (0 = regarde vers +Y), site (négatif = vers le bas), roulis"""
    e = Euler((math.radians(90 + pitch_deg), 0.0, math.radians(yaw_deg)), 'XYZ')
    m = e.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(roll_deg), 4, 'Z')
    return m.to_euler()


def light(name, kind, energy, color=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0), size=0.1, spot=None, coll='LUMIERES',
          volume=1.0, shadow=True):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color[:3]
    if hasattr(ld, 'shadow_soft_size'):
        ld.shadow_soft_size = size
    if kind == 'SUN':
        ld.angle = math.radians(size)
    if kind == 'AREA':
        ld.size = size
    if spot and kind == 'SPOT':
        ld.spot_size = math.radians(spot[0])
        ld.spot_blend = spot[1]
    if hasattr(ld, 'volume_factor'):
        ld.volume_factor = volume
    ld.use_shadow = shadow
    # ombres : 2 cm par texel suffisent (c'est la résolution fine des ombres qui faisait 150 s par image)
    if hasattr(ld, 'shadow_maximum_resolution'):
        ld.shadow_maximum_resolution = 0.02
    o = bpy.data.objects.new(name, ld)
    o.location, o.rotation_euler = loc, rot
    collection(coll).objects.link(o)
    return o


# ---------------------------------------------------------------- rendu
def setup_render(sc, quality, samples=None):
    r = sc.render
    r.engine = 'BLENDER_EEVEE'
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGB'
    r.image_settings.color_depth = '8'
    r.resolution_percentage = {'anim': 25, 'test': 50}.get(quality, 100)
    e = sc.eevee
    vals = {
        'taa_render_samples': samples or {'anim': 4, 'test': 24}.get(quality, 48),
        'use_raytracing': True, 'use_shadows': True, 'use_volumetric_shadows': True,
        'volumetric_tile_size': {'anim': '16', 'test': '8'}.get(quality, '4'),
        'volumetric_samples': 64 if quality == 'test' else 128,
        'volumetric_start': 0.1, 'volumetric_end': 90.0, 'volumetric_sample_distribution': 0.85,
        'volumetric_light_clamp': 0.0, 'volumetric_shadow_samples': 16,
        'use_fast_gi': True, 'shadow_ray_count': 2, 'shadow_step_count': 8, 'shadow_resolution_scale': 1.0,
        'clamp_surface_indirect': 10.0,
    }
    for k, v in vals.items():
        if hasattr(e, k):
            try:
                setattr(e, k, v)
            except Exception as exc:                 # noqa: BLE001
                print('eevee', k, exc)
    if hasattr(e, 'ray_tracing_options'):
        try:
            e.ray_tracing_options.resolution_scale = '2'
            e.ray_tracing_options.trace_max_roughness = 0.5
        except Exception:                            # noqa: BLE001
            pass
    r.use_motion_blur = quality != 'test'
    if hasattr(r, 'motion_blur_shutter'):
        r.motion_blur_shutter = 0.5
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:                                # noqa: BLE001
        pass
    r.film_transparent = False


def compositor(sc, glare_threshold=1.0, glare_strength=0.35, glare_size=0.55, streaks=False):
    """halo (Glare « Bloom ») + légère aberration ; Blender 5 : l'arbre de compositing est un groupe de nœuds"""
    if hasattr(sc, 'compositing_node_group'):
        ct = bpy.data.node_groups.new('compo', 'CompositorNodeTree')
        sc.compositing_node_group = ct
        ct.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        out = ct.nodes.new('NodeGroupOutput')
    else:
        sc.use_nodes = True
        ct = sc.node_tree
        ct.nodes.clear()
        out = ct.nodes.new('CompositorNodeComposite')
    rl = ct.nodes.new('CompositorNodeRLayers')
    gl = ct.nodes.new('CompositorNodeGlare')
    for k, v in (('glare_type', 'BLOOM'), ('quality', 'HIGH')):
        if hasattr(gl, k):
            try:
                setattr(gl, k, v)
            except Exception:                        # noqa: BLE001
                pass
    for k, v in (('Type', 'Bloom'), ('Threshold', glare_threshold), ('Strength', glare_strength),
                 ('Size', glare_size), ('Quality', 'High')):
        if k in gl.inputs:
            try:
                gl.inputs[k].default_value = v
            except Exception:                        # noqa: BLE001
                pass
    ct.links.new(rl.outputs['Image'], gl.inputs[0])
    ct.links.new(gl.outputs[0], out.inputs[0])
    return ct


def render_frames(sc, out_dir, opt, name):
    os.makedirs(out_dir, exist_ok=True)
    blend_dir = os.path.join(ROOT, 'out', 'blend')
    os.makedirs(blend_dir, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(blend_dir, name + '.blend'))
    if not opt['render']:
        return
    if opt['still']:
        frames = opt['still']
    else:
        a, b = opt['frames'] or (sc.frame_start, sc.frame_end)
        frames = range(a, b + 1, opt['step'])
    import time
    for f in frames:
        t0 = time.time()
        sc.frame_set(f)
        sc.render.filepath = os.path.join(out_dir, f'{f:04d}.png')
        bpy.ops.render.render(write_still=True)
        print(f'IMAGE {f} {time.time() - t0:.1f}s', flush=True)
