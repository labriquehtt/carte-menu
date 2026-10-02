"""P1 + P2 — la plongée dans le trou bleu et la station au fond (images 240 à 575, un seul plan-séquence).

  "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --factory-startup -P blender/abysse.py -- --quality test --still 250,300
  … -- --quality final --frames 240:575

La caméra descend en tournant sur elle-même ; à chaque mesure, un coup de fouet (sur le temps fort de la musique)
la tourne vers l'objet suivant, qui joue sa partie (partition.json) : bouée « Hugging Face » et sa cloche, baleine
« DeepSeek », voilier « Midjourney » et plancton « Gemini », piano « SUNO », colonnes « II » (ElevenLabs),
étincelle « Claude » ; puis au fond la station (LED « Mistral », câble ∞ « Meta », hublot « OpenAI »).
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as U                     # noqa: E402
from outils import lin, smooth, smoother, mix, bar, fr  # noqa: E402

F0, F1 = U.plan('P1')['image_debut'], U.plan('P2')['image_fin'] - 1     # 240 → 575
T0 = F0 / U.FPS

# ------------------------------------------------------------------ géométrie du trou bleu
FLOOR = -68.0                     # fond de la caverne
STATION_Z = FLOOR + 2.8           # axe de la station (et hauteur du hublot)


def radius_profile(z):
    """rayon du puits selon la profondeur : grand bassin, plateau (-17/-22 m), gorge étroite, caverne au fond"""
    if z > -16:
        return 21.0 + 2.0 * smooth((z + 16) / 16)
    if z > -22:
        return mix(21.0, 11.5, smooth((-16 - z) / 6))
    if z > -45:
        return 11.5 + 0.7 * math.sin(z * 0.27)
    if z > -53:
        return mix(11.5, 23.0, smooth((-45 - z) / 8))
    return 23.0


# ------------------------------------------------------------------ caméra : la descente (temps → position, cap, site)
OBJ_YAW = {'bouee': 0.0, 'baleine': 105.0, 'voilier': 205.0, 'piano': 290.0, 'colonnes': 385.0, 'station': 450.0}


def cam_z(s):
    """profondeur de la caméra (m) à l'instant s (temps film)"""
    keys = [(8.0, -0.7), (9.6, -6.5), (11.2, -14.0), (12.8, -21.5), (14.4, -26.0), (16.0, -33.5),
            (17.6, -51.0), (19.2, STATION_Z)]
    if s <= keys[0][0]:
        return keys[0][1]
    for (a, za), (b, zb) in zip(keys, keys[1:]):
        if s <= b:
            k = (s - a) / (b - a)
            if a == 8.0:                                  # élan du plongeon : rapide puis freiné
                k = 1 - (1 - k) ** 2.2
            return mix(za, zb, k)
    return keys[-1][1]


def whip(s, t_start, dur, a, b):
    """coup de fouet : de a à b pendant dur secondes (accélère puis freine fort), 0 avant, 1 après"""
    k = (s - t_start) / dur
    if k <= 0:
        return a
    if k >= 1:
        return b
    return mix(a, b, smoother(k))


def cam_yaw(s):
    y = OBJ_YAW['bouee'] - 6.0 * smooth((s - 8.0) / 1.4)
    for obj in ('baleine', 'voilier', 'piano', 'colonnes'):
        e = U.ev1('fouet', obj)
        prev = y
        y = whip(s, e['t'], e['duree'], prev, OBJ_YAW[obj] - 8.0)
        # dérive lente pendant la mesure (la caméra continue de tourner sur elle-même)
        y += 9.0 * smooth((s - e['t'] - e['duree']) / 1.35)
    # station : la caméra se tourne vers la station en descendant dans la caverne
    y = mix(y, OBJ_YAW['station'], smooth((s - 16.0) / 1.2))
    return y


PITCH_BAR = {'voilier': -24.0, 'piano': -31.0, 'colonnes': -19.0}


def cam_pitch(s):
    if s < 9.0:
        return mix(24.0, 18.0, smooth((s - 8.0) / 1.0))       # on regarde la bouée et la surface
    if s < 9.6:
        return mix(18.0, -8.0, smooth((s - 9.0) / 0.55))      # on bascule vers le large (la baleine)
    p = mix(-8.0, -14.0, smooth((s - 9.6) / 1.35))
    for obj in ('voilier', 'piano', 'colonnes'):               # chaque fouet change aussi l'inclinaison
        e = U.ev1('fouet', obj)
        p = whip(s, e['t'], e['duree'], p, PITCH_BAR[obj])
    if s < 16.0:
        return p
    if s < 17.6:
        return mix(p, -52.0, smooth((s - 16.0) / 0.9))        # on découvre la station en contrebas
    return mix(-52.0, -4.0, smooth((s - 17.6) / 1.5))         # on se met face au hublot


def cam_roll(s):
    return 2.5 * math.sin(s * 1.7) + 1.5 * math.sin(s * 3.1 + 1.0) - 5.0 * math.exp(-(s - 8.0) * 3.0)


def cam_xy(s):
    """axe du puits, puis on file vers le hublot de la station"""
    if s < 16.0:
        return Vector((0.0, 0.0))
    yaw = math.radians(OBJ_YAW['station'])
    d = Vector((-math.sin(yaw), math.cos(yaw)))
    k = smooth((s - 16.4) / 2.8)
    return d * mix(0.0, HATCH_DIST - 2.6, k)


HATCH_DIST = 10.0                                  # distance horizontale axe → hublot


def cam_state(s):
    xy = cam_xy(s)
    return Vector((xy.x, xy.y, cam_z(s))), cam_yaw(s), cam_pitch(s), cam_roll(s)


# ------------------------------------------------------------------ construction
def build_shaft():
    """parois du trou bleu : cylindre vu de l'intérieur, rocheux (bruits), rayon selon la profondeur"""
    seg, z_top, z_bot, dz = 200, 3.0, FLOOR - 1.0, 0.6
    rings = int((z_top - z_bot) / dz) + 1
    verts, faces = [], []
    for j in range(rings):
        z = z_top - j * dz
        r0 = radius_profile(z)
        for i in range(seg):
            th = 2 * math.pi * i / seg
            p = Vector((math.cos(th), math.sin(th), 0))
            q = Vector((math.cos(th) * 1.3, math.sin(th) * 1.3, z * 0.075))
            n = noise.fractal(q, 1.0, 2.1, 6, noise_basis='PERLIN_ORIGINAL')
            n2 = noise.ridged_multi_fractal(q * 2.3 + Vector((0, 0, 7.0)), 0.85, 2.1, 5, 1.0, 2.0,
                                            noise_basis='PERLIN_ORIGINAL')
            n3 = noise.noise(q * 6.0) * 0.35
            r = r0 + 2.2 * n - 1.1 * n2 + n3
            verts.append((p.x * r, p.y * r, z))
    for j in range(rings - 1):
        for i in range(seg):
            a, b = j * seg + i, j * seg + (i + 1) % seg
            c, d = (j + 1) * seg + (i + 1) % seg, (j + 1) * seg + i
            faces.append((a, d, c, b))             # normales vers l'intérieur du puits
    o = U.mesh_from_data('parois', verts, faces)
    U.subsurf(o, 1, 1)
    tex = bpy.data.textures.new('roche_detail', 'CLOUDS')
    tex.noise_scale = 0.9
    tex.noise_depth = 4
    U.mod(o, 'DISPLACE', texture=tex, strength=0.55, mid_level=0.5, texture_coords='OBJECT')
    U.assign(o, U.rock('roche', scale=0.55, sonar=SONAR['group']))
    return o


def build_floor():
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=160, y_segments=160, size=30)
    for v in bm.verts:
        q = Vector((v.co.x * 0.08, v.co.y * 0.08, 0.3))
        rip = 0.06 * math.sin(v.co.x * 2.1 + 1.3 * noise.noise(q * 3)) * math.cos(v.co.y * 0.4)
        h = 1.4 * noise.fractal(q, 1.0, 2.0, 5) + 0.25 * noise.noise(q * 6) + rip
        # aire plane sous la station (x de -22 à -7, |y| < 5), raccordée en douceur
        dx = max(0.0, -22.0 - v.co.x, v.co.x + 7.0)
        dy = max(0.0, abs(v.co.y) - 5.0)
        flat = smooth(1.0 - math.hypot(dx, dy) / 6.0)
        v.co.z = FLOOR + mix(h, rip * 0.5, flat)
    o = U.mesh_from_bmesh('fond', bm)
    U.assign(o, U.rock('sable_fond', base=(0.075, 0.075, 0.068), algae=(0.05, 0.06, 0.05), sand=(0.15, 0.14, 0.12),
                       scale=0.8, sonar=SONAR['group']))
    return o


SONAR = {'group': None, 'slots': []}


def sonar_group():
    """l'onde du sonar : un front lumineux vert qui balaie la roche, la station et le fond à chaque ping.
    8 « tiroirs » (origine, rayon, intensité) animés à partir des pings de la partition."""
    g = bpy.data.node_groups.new('SONAR', 'ShaderNodeTree')
    g.interface.new_socket('Couleur', in_out='OUTPUT', socket_type='NodeSocketColor')
    g.interface.new_socket('Force', in_out='OUTPUT', socket_type='NodeSocketFloat')
    N, L = g.nodes, g.links
    out = N.new('NodeGroupOutput')
    geo = N.new('ShaderNodeNewGeometry')
    total = None
    slots = []
    for i in range(SONAR_SLOTS):
        org = N.new('ShaderNodeCombineXYZ')
        org.label = f'origine_{i}'
        rad = N.new('ShaderNodeValue')
        rad.label = f'rayon_{i}'
        amp = N.new('ShaderNodeValue')
        amp.label = f'intensite_{i}'
        amp.outputs[0].default_value = 0.0
        d = N.new('ShaderNodeVectorMath')
        d.operation = 'DISTANCE'
        L.new(geo.outputs['Position'], d.inputs[0])
        L.new(org.outputs[0], d.inputs[1])
        diff = U.math_node(N, L, 'SUBTRACT', d.outputs['Value'], rad.outputs[0])
        x = U.math_node(N, L, 'DIVIDE', diff, 0.38)
        band = U.math_node(N, L, 'EXPONENT', U.math_node(N, L, 'MULTIPLY', U.math_node(N, L, 'MULTIPLY', x, x), -1.0))
        # traîne : ce que l'onde vient de toucher reste un instant allumé
        behind = U.math_node(N, L, 'MULTIPLY', U.math_node(N, L, 'LESS_THAN', diff, 0.0),
                             U.math_node(N, L, 'EXPONENT', U.math_node(N, L, 'DIVIDE', diff, 1.4)))
        # pas de vert sur ce qui touche la caméra (l'onde part de la caméra)
        near = N.new('ShaderNodeMapRange')
        near.inputs['From Min'].default_value, near.inputs['From Max'].default_value = 2.5, 9.0
        L.new(d.outputs['Value'], near.inputs['Value'])
        s = U.math_node(N, L, 'MULTIPLY', U.math_node(N, L, 'ADD', band, U.math_node(N, L, 'MULTIPLY', behind, 0.05)),
                        amp.outputs[0])
        s = U.math_node(N, L, 'MULTIPLY', s, near.outputs['Result'])
        total = s if total is None else U.math_node(N, L, 'ADD', total, s)
        slots.append((org, rad, amp))
    rgb = N.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = lin('#4DFF8F')
    L.new(rgb.outputs[0], out.inputs['Couleur'])
    L.new(total, out.inputs['Force'])
    SONAR['group'], SONAR['slots'] = g, slots
    return g


SONAR_SLOTS = 8


def animate_sonar():
    """chaque ping de la partition part de la caméra et s'étend à 34 m/s ; 8 tiroirs utilisés à tour de rôle,
    la durée de vie d'une onde suit l'écart avec le ping suivant (les pings accélèrent)"""
    pings = U.events('sonar')
    for k, (org, rad, amp) in enumerate(SONAR['slots']):
        rad.outputs[0].default_value = 0.0
        rad.outputs[0].keyframe_insert('default_value', frame=F0)
        amp.outputs[0].keyframe_insert('default_value', frame=F0)
    for i, p in enumerate(pings):
        org, rad, amp = SONAR['slots'][i % SONAR_SLOTS]
        f = p['image']
        loc, *_ = cam_state(p['t'])
        for axis, v in zip(('X', 'Y', 'Z'), loc):
            org.inputs[axis].default_value = v
            org.inputs[axis].keyframe_insert('default_value', frame=f)
        gap = pings[i + 1]['t'] - p['t'] if i + 1 < len(pings) else 0.4
        speed, life = 34.0, max(0.6, min(1.1, 6 * gap))
        rad.outputs[0].default_value = 0.0
        rad.outputs[0].keyframe_insert('default_value', frame=f)
        rad.outputs[0].default_value = speed * life
        rad.outputs[0].keyframe_insert('default_value', frame=f + round(life * U.FPS))
        peak = 1.5 + 1.1 * i / max(1, len(pings) - 1)
        amp.outputs[0].default_value = 0.0
        amp.outputs[0].keyframe_insert('default_value', frame=f - 1)
        amp.outputs[0].default_value = peak
        amp.outputs[0].keyframe_insert('default_value', frame=f)
        amp.outputs[0].default_value = 0.0
        amp.outputs[0].keyframe_insert('default_value', frame=f + round(life * U.FPS))
    for fc in U.fcurves(SONAR['group']):
        for kp in fc.keyframe_points:
            kp.interpolation = 'CONSTANT' if 'inputs' in fc.data_path else 'LINEAR'


def build_ledge(name, center, size, yaw_out):
    """plateau rocheux accroché à la paroi (y poser un objet)"""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
        if v.co.z > 0:
            v.co.z *= 0.25                          # dessus presque plat
        q = v.co * 0.9 + Vector(center) * 0.05
        v.co += v.normal * 0.45 * noise.fractal(q, 1.0, 2.0, 4)
    o = U.mesh_from_bmesh(name, bm)
    o.location = center
    o.rotation_euler = (0, 0, math.radians(yaw_out))
    U.assign(o, bpy.data.materials['roche'])
    return o


def water_volume():
    """l'eau : diffusion turquoise vers l'avant (rayons), absorption du rouge"""
    o = U.cylinder('eau', 40.0, -FLOOR + 4.0, 48, loc=(0, 0, (FLOOR - 4.0) / 2 + 0.5))
    m, N, L = U.node_mat('eau_volume')
    N.remove(N['Principled BSDF'])
    v = N.new('ShaderNodeVolumePrincipled')
    v.inputs['Color'].default_value = lin('#7FD6E0')
    v.inputs['Density'].default_value = 0.045
    v.inputs['Anisotropy'].default_value = 0.62
    v.inputs['Absorption Color'].default_value = lin('#3AA6C0')
    L.new(v.outputs[0], N['Material Output'].inputs['Volume'])
    o.data.materials.append(m)
    o.visible_shadow = False
    return o, v


def surface():
    """la surface vue d'en dessous : fenêtre de Snell (le ciel dans un cône de 48,6°), ailleurs le reflet du fond"""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=200, y_segments=200, size=60)
    o = U.mesh_from_bmesh('surface', bm)
    o.location = (0, 0, 0.0)
    oc = U.mod(o, 'OCEAN')
    for k, v in (('geometry_mode', 'DISPLACE'), ('size', 1.0), ('spatial_size', 40), ('wave_scale', 0.6),
                 ('choppiness', 1.2), ('resolution', 10), ('random_seed', 3)):
        try:
            setattr(oc, k, v)
        except Exception:                                    # noqa: BLE001
            pass
    oc.time = 0.0
    oc.keyframe_insert('time', frame=F0)
    oc.time = (F1 - F0) / U.FPS * 0.9
    oc.keyframe_insert('time', frame=F1)
    U.interp(o, 'LINEAR')
    m, N, L = U.node_mat('surface_dessous')
    N.remove(N['Principled BSDF'])
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(geo.outputs['Incoming'], sep.inputs[0])
    absz = U.math_node(N, L, 'ABSOLUTE', sep.outputs['Z'])
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    rip = U.noise_tex(N, L, tc, 0.9, 6, 0.6, dist=1.2)
    jit = U.math_node(N, L, 'MULTIPLY', U.math_node(N, L, 'SUBTRACT', rip.outputs['Fac'], 0.5), 0.10)
    a = U.math_node(N, L, 'ADD', absz, jit)
    win = N.new('ShaderNodeMapRange')
    win.inputs['From Min'].default_value, win.inputs['From Max'].default_value = 0.63, 0.70
    L.new(a, win.inputs['Value'])
    sky = U.ramp(N, L, win.outputs['Result'], [(0.0, lin('#062C35')), (0.55, lin('#2E9FB2')), (1.0, lin('#C9F4F2'))])
    caus = N.new('ShaderNodeTexVoronoi')
    caus.feature = 'SMOOTH_F1'
    caus.voronoi_dimensions = '4D'
    caus.inputs['Scale'].default_value = 0.8
    L.new(tc, caus.inputs['Vector'])
    caus.inputs['W'].default_value = 0.0
    caus.inputs['W'].keyframe_insert('default_value', frame=F0)
    caus.inputs['W'].default_value = 6.0
    caus.inputs['W'].keyframe_insert('default_value', frame=F1)
    br = U.math_node(N, L, 'ADD', 0.75, U.math_node(N, L, 'MULTIPLY', caus.outputs['Distance'], 0.6))
    em = N.new('ShaderNodeEmission')
    L.new(sky.outputs['Color'], em.inputs['Color'])
    st = U.math_node(N, L, 'MULTIPLY', br, U.math_node(N, L, 'ADD', 0.12, U.math_node(N, L, 'MULTIPLY', win.outputs['Result'], 0.6)))
    L.new(st, em.inputs['Strength'])
    L.new(em.outputs[0], N['Material Output'].inputs['Surface'])
    o.data.materials.append(m)
    o.visible_shadow = False
    U.interp(m.node_tree, 'LINEAR')
    return o


def sun_and_gobo():
    """soleil presque vertical ; sous la surface, une grille de taches (invisible) découpe les rayons dans l'eau"""
    sun = U.light('soleil', 'SUN', 6.0, lin('#E8FFFB'), rot=(math.radians(9), math.radians(-6), 0), size=0.6,
                  volume=1.0)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
    g = U.mesh_from_bmesh('cache_rayons', bm)
    g.location = (0, 0, -0.35)
    m, N, L = U.node_mat('cache_rayons')
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    n = U.noise_tex(N, L, None, 0.55, 4, 0.5, dist=0.6, w=0.0)
    mp = N.new('ShaderNodeMapping')
    L.new(tc, mp.inputs['Vector'])
    L.new(mp.outputs['Vector'], n.inputs['Vector'])
    n.inputs['W'].default_value = 0.0
    n.inputs['W'].keyframe_insert('default_value', frame=F0)
    n.inputs['W'].default_value = 2.5
    n.inputs['W'].keyframe_insert('default_value', frame=F1)
    th = N.new('ShaderNodeMapRange')
    th.inputs['From Min'].default_value, th.inputs['From Max'].default_value = 0.47, 0.53
    L.new(n.outputs['Fac'], th.inputs['Value'])
    L.new(th.outputs['Result'], b.inputs['Alpha'])
    b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    if hasattr(m, 'surface_render_method'):
        m.surface_render_method = 'DITHERED'
    if hasattr(m, 'use_transparent_shadow'):
        m.use_transparent_shadow = True
    U.interp(m.node_tree, 'LINEAR')
    g.data.materials.append(m)
    g.visible_camera = False
    g.visible_diffuse = False
    g.visible_glossy = False
    g.visible_volume_scatter = False
    return sun, g


def world(sc):
    nt = sc.world.node_tree
    bg = nt.nodes['Background']
    bg.inputs['Color'].default_value = lin('#0B4A57')
    bg.inputs['Strength'].default_value = 1.0
    return bg


def marine_snow():
    """neige marine : particules autour du trajet de la caméra (un seul maillage)"""
    rnd = random.Random(11)
    pts, sc = [], []
    for _ in range(26000):
        z = rnd.uniform(FLOOR + 1, -0.8)
        r = 7.5 * math.sqrt(rnd.random())
        th = rnd.uniform(0, 2 * math.pi)
        pts.append((r * math.cos(th), r * math.sin(th), z))
        sc.append(rnd.uniform(0.5, 1.6))
    yaw = math.radians(OBJ_YAW['station'])           # le long du trajet vers la station
    d = Vector((-math.sin(yaw), math.cos(yaw), 0))
    for _ in range(5000):
        k = rnd.uniform(0, HATCH_DIST)
        c = d * k + Vector((0, 0, rnd.uniform(FLOOR + 1.5, -70)))
        off = Vector((rnd.uniform(-5, 5), rnd.uniform(-5, 5), 0))
        p = c + off
        pts.append(tuple(p))
        sc.append(rnd.uniform(0.5, 1.6))
    m = U.principled('neige', lin('#DDEBE6'), rough=0.7, emit=lin('#BFE9E6'), emit_strength=0.25)
    return U.scatter_points('neige_marine', pts, 0.0045, m, subdiv=0, scales=sc)


def bubbles():
    """bulles du plongeon : nuage qui remonte vite en ondulant (positions-clés image par image)"""
    rnd = random.Random(5)
    # bulle : transparente au centre, reflet argenté sur le pourtour (réflexion totale air/eau)
    m, N, L = U.node_mat('bulle')
    N.remove(N['Principled BSDF'])
    lw = N.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.35
    edge = U.math_node(N, L, 'POWER', lw.outputs['Facing'], 1.6)
    tr = N.new('ShaderNodeBsdfTransparent')
    gl = N.new('ShaderNodeBsdfGlossy')
    gl.inputs['Roughness'].default_value = 0.05
    gl.inputs['Color'].default_value = (1, 1, 1, 1)
    em = N.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = lin('#D6FFFB')
    em.inputs['Strength'].default_value = 2.2
    rim = N.new('ShaderNodeAddShader')
    L.new(gl.outputs[0], rim.inputs[0])
    L.new(em.outputs[0], rim.inputs[1])
    mx = N.new('ShaderNodeMixShader')
    L.new(edge, mx.inputs[0])
    L.new(tr.outputs[0], mx.inputs[1])
    L.new(rim.outputs[0], mx.inputs[2])
    L.new(mx.outputs[0], N['Material Output'].inputs['Surface'])
    if hasattr(m, 'surface_render_method'):
        m.surface_render_method = 'BLENDED'
    objs = []
    for k in range(6):                                # 6 grappes animées (moins d'objets = rendu rapide)
        pts, scl = [], []
        for _ in range(140):
            th = rnd.uniform(0, 2 * math.pi)
            r = rnd.uniform(0.15, 2.4)
            pts.append((r * math.cos(th), r * math.sin(th), rnd.uniform(-2.2, 0.6)))
            scl.append(rnd.choice((0.5, 0.7, 1.0, 1.0, 1.4, 2.4, 4.0)))
        o = U.scatter_points(f'bulles_{k}', pts, 0.006, m, subdiv=2, scales=scl)
        speed = rnd.uniform(1.6, 3.2)
        ph = rnd.uniform(0, 6.28)
        for f in range(F0, F0 + 75, 3):
            s = (f - F0) / U.FPS
            z0 = cam_z(T0 + s)
            o.location = (0.25 * math.sin(s * 5 + ph), 0.25 * math.cos(s * 4 + ph), z0 - 0.4 + speed * s * 1.0 + 0.8 * s * s)
            o.keyframe_insert('location', frame=f)
        objs.append(o)
    return objs


def rov_lights(cam):
    """projecteurs de la caméra (comme un robot sous-marin) : s'allument quand il fait trop sombre"""
    out = []
    for side in (-1, 1):
        l = U.light(f'projecteur_{side}', 'SPOT', 0.0, lin('#EAF7FF'), loc=(0.35 * side, -0.15, 0.0), size=0.05,
                    spot=(75, 0.6), volume=0.35, shadow=False)
        l.parent = cam
        l.rotation_euler = (0, math.radians(-4 * side), 0)
        out.append(l)
    on = fr(10.9)
    for l in out:
        U.key(l.data, F0, energy=0.0)
        U.key(l.data, on, energy=0.0)
        U.key(l.data, on + 2, energy=650.0)
        U.key(l.data, on + 4, energy=180.0)
        U.key(l.data, on + 7, energy=900.0)
        U.key(l.data, F1, energy=900.0)
    return out


def animate_camera(cam):
    for f in range(F0, F1 + 1):
        s = f / U.FPS
        loc, yaw, pitch, roll = cam_state(s)
        cam.location = loc
        cam.rotation_euler = U.yaw_pitch(yaw, pitch, roll)
        cam.keyframe_insert('location', frame=f)
        cam.keyframe_insert('rotation_euler', frame=f)
    U.interp(cam, 'LINEAR')


def depth_light(sun, bg, vol):
    """la lumière du jour s'éteint avec la profondeur ; l'eau du fond devient noire"""
    for f in range(F0, F1 + 1, 4):
        s = f / U.FPS
        z = cam_z(s)
        k = math.exp(z / 16.0)
        sun.data.energy = 2.6 * k
        sun.data.keyframe_insert('energy', frame=f)
        c = [mix(dark, light_, min(1.0, k * 1.4)) for dark, light_ in zip((0.0008, 0.0025, 0.004), lin('#0B4A57')[:3])]
        bg.inputs['Color'].default_value = (*c, 1)
        bg.inputs['Color'].keyframe_insert('default_value', frame=f)
        bg.inputs['Strength'].default_value = 0.4 + 0.6 * k
        bg.inputs['Strength'].keyframe_insert('default_value', frame=f)
        vol.inputs['Density'].default_value = mix(0.075, 0.045, min(1.0, k * 1.6))
        vol.inputs['Density'].keyframe_insert('default_value', frame=f)


def build(opt):
    sc = U.reset(seed=21)
    sc.frame_start, sc.frame_end = F0, F1
    U.setup_render(sc, opt['quality'], opt['samples'])
    U.compositor(sc, glare_threshold=0.9, glare_strength=0.4, glare_size=0.6)
    bg = world(sc)
    sonar_group()
    build_shaft()
    build_floor()
    _, vol = water_volume()
    surface()
    sun, _ = sun_and_gobo()
    marine_snow()
    bubbles()
    cam = U.camera(lens=19.0)
    animate_camera(cam)
    rov_lights(cam)
    depth_light(sun, bg, vol)
    animate_sonar()
    import objets_abysse as O                       # les références cachées (fichier séparé)
    O.build_all(sc, cam_state, OBJ_YAW, build_ledge, FLOOR, STATION_Z, HATCH_DIST, SONAR['group'], only=opt.get('only'))
    return sc


SPATIAL_OBJECTS = ['bouee', 'cloche', 'baleine', 'voilier', 'piano', 'colonne_0', 'colonne_1', 'claude',
                   'panneau_led', 'cable_infini', 'sas', 'coque']


def export_spatial(sc, path):
    """pour le mixage : cap (°, + = à droite) et distance (m) de chaque objet vu de la caméra, image par image"""
    import json
    cam = sc.camera
    objs = {n: bpy.data.objects.get(n) for n in SPATIAL_OBJECTS if bpy.data.objects.get(n) is not None}
    out = {n: [] for n in objs}
    for f in range(F0, F1 + 1):
        sc.frame_set(f)
        inv = cam.matrix_world.inverted()
        for name, o in objs.items():
            p = inv @ o.matrix_world.translation
            az = math.degrees(math.atan2(p.x, -p.z))
            el = math.degrees(math.atan2(p.y, math.hypot(p.x, p.z)))
            out[name].append([round(az, 1), round(el, 1), round(p.length, 2)])
    json.dump({'premiere_image': F0, 'objets': out}, open(path, 'w'), indent=0)
    print('SPATIAL', path)


def main():
    opt = U.args()
    if '--spatial' in sys.argv:
        opt['render'] = False
        sc = build(opt)
        path = os.path.join(U.ROOT, 'out', 'plates', 'spatial.json')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        export_spatial(sc, path)
        return
    sc = build(opt)
    out = os.path.join(U.ROOT, 'out', {'final': 'plates', 'anim': 'anim'}.get(opt['quality'], 'tests'), 'P1P2')
    U.render_frames(sc, out, opt, 'abysse')


if __name__ == '__main__':
    main()
