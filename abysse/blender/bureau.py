"""P3 — le bureau au fond de la station (images 576 à 719) : la pièce sombre de la référence (mur de lattes,
écran sur un bureau), version enquête : tableau de liège et fils rouges, chapeau et loupe du détective, hublot
sur l'eau noire. L'écran est VERTICAL (comme un reel) : il affiche les vidéos du compte (incrustées ensuite par
HyperFrames grâce à ecran.json, les 4 coins de l'écran image par image), puis la caméra s'y enfonce jusqu'à ce
qu'il remplisse exactement l'image à 24,0 s (raccord avec le logo en motion design).

  blender -b --factory-startup -P blender/bureau.py -- --quality test --still 580,640,700,719
"""
import json
import math
import os
import random
import sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outils as U                     # noqa: E402
from outils import lin, smooth, smoother, mix, fr  # noqa: E402

F0, F1 = U.plan('P3')['image_debut'], U.plan('P3')['image_fin'] - 1        # 576 → 719
SCREEN_W, SCREEN_H = 0.345, 0.613        # 27 pouces en mode portrait (9:16)
SCREEN_C = Vector((0.0, 2.27, 1.205))     # centre de l'écran
DESK_Z = 0.76


def kicks():
    """grosses caisses du drop (musique B, 12,8–17,6 s → film 19,2–24,0 s)"""
    p = os.path.join(U.ROOT, 'out', 'analyse', 'B_evenements.json')
    if not os.path.exists(p):
        return []
    d = json.load(open(p, encoding='utf8'))
    return [r['t'] + 6.4 for r in d['coups']['kick'] if 12.7 <= r['t'] < 17.6 and r['force'] >= 0.8]


# ------------------------------------------------------------------ matières
def wood_dark(name, base=(0.022, 0.016, 0.012), scale=1.0):
    m, N, L = U.node_mat(name)
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    w = N.new('ShaderNodeTexWave')
    w.wave_type = 'BANDS'
    w.bands_direction = 'Z'
    w.wave_profile = 'SAW'
    w.inputs['Scale'].default_value = 18.0 * scale
    w.inputs['Distortion'].default_value = 6.0
    w.inputs['Detail'].default_value = 4.0
    L.new(tc, w.inputs['Vector'])
    c = U.ramp(N, L, w.outputs['Fac'], [(0.2, tuple(x * 0.6 for x in base)), (0.8, tuple(x * 1.5 for x in base))])
    L.new(c.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.42
    L.new(U.bump(N, L, w.outputs['Fac'], 0.12, 0.002), b.inputs['Normal'])
    return m


def cork():
    m, N, L = U.node_mat('liege')
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    n = U.noise_tex(N, L, tc, 60, 10, 0.7)
    c = U.ramp(N, L, n.outputs['Fac'], [(0.3, lin('#5A3A1E')), (0.7, lin('#9A6A3A'))])
    L.new(c.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.9
    L.new(U.bump(N, L, n.outputs['Fac'], 0.4, 0.002), b.inputs['Normal'])
    return m


def photo_mat(name, img_path, tint=(1, 1, 1, 1)):
    m, N, L = U.node_mat(name)
    b = N['Principled BSDF']
    if img_path and os.path.exists(img_path):
        tex = N.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(img_path, check_existing=True)
        L.new(tex.outputs['Color'], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = tint
    b.inputs['Roughness'].default_value = 0.35
    return m


# ------------------------------------------------------------------ décor
def build_room():
    floor = U.box('sol', (8, 8, 0.05), (0, 1.5, -0.025), 'BUREAU')
    U.assign(floor, wood_dark('parquet', (0.012, 0.010, 0.009), 0.4))
    # mur de lattes verticales (la signature de la référence) : on les éclaire en rasant
    back = U.box('fond_mur', (8, 0.05, 3.4), (0, 3.08, 1.7), 'BUREAU')
    U.assign(back, U.principled('fond_noir', (0.004, 0.004, 0.005, 1), rough=0.8))
    bm = bmesh.new()
    rnd = random.Random(2)
    x = -3.2
    while x < 3.2:
        r = bmesh.ops.create_cube(bm, size=1.0)
        d = 0.035 + 0.01 * rnd.random()
        for v in r['verts']:
            v.co.x = v.co.x * 0.042 + x
            v.co.y = v.co.y * d + 3.0 - d / 2
            v.co.z = v.co.z * 3.4 + 1.7
        x += 0.072
    slats = U.mesh_from_bmesh('lattes', bm, 'BUREAU', smooth_shade=False)
    U.bevel(slats, 0.004, 2)
    U.assign(slats, wood_dark('lattes_bois', (0.03, 0.022, 0.016), 1.0))
    # murs latéraux sombres
    for sgn in (-1, 1):
        w = U.box('mur_cote', (0.05, 6, 3.4), (sgn * 2.6, 0.5, 1.7), 'BUREAU')
        U.assign(w, U.principled('mur_sombre', (0.008, 0.009, 0.01, 1), rough=0.7))
    return slats


def build_desk():
    top = U.box('plateau', (1.9, 0.82, 0.045), (0, 2.25, DESK_Z - 0.0225), 'BUREAU', bev=0.006)
    U.assign(top, wood_dark('bureau_bois', (0.018, 0.013, 0.010), 0.6))
    metal = U.principled('pieds_metal', (0.02, 0.02, 0.022, 1), rough=0.35, metal=1.0)
    for sx in (-0.88, 0.88):
        for sy in (1.9, 2.6):
            leg = U.box('pied_bureau', (0.04, 0.04, DESK_Z - 0.045), (sx, sy, (DESK_Z - 0.045) / 2), 'BUREAU')
            U.assign(leg, metal)


def build_monitor():
    black = U.principled('ecran_cadre', (0.008, 0.008, 0.009, 1), rough=0.25, metal=0.4)
    bez = U.box('cadre_ecran', (SCREEN_W + 0.018, 0.022, SCREEN_H + 0.018), tuple(SCREEN_C + Vector((0, 0.012, 0))),
                'BUREAU', bev=0.004)
    U.assign(bez, black)
    neck = U.box('pied_ecran', (0.05, 0.03, 0.42), (0, SCREEN_C.y + 0.07, DESK_Z + 0.21), 'BUREAU', bev=0.008)
    U.assign(neck, black)
    base = U.box('socle_ecran', (0.26, 0.20, 0.012), (0, SCREEN_C.y + 0.04, DESK_Z + 0.006), 'BUREAU', bev=0.004)
    U.assign(base, black)
    # la dalle : émission neutre (le contenu est incrusté ensuite) ; on n'oublie pas la lueur sur la pièce
    bm = bmesh.new()
    hw, hh = SCREEN_W / 2, SCREEN_H / 2
    vs = [bm.verts.new((sx, 0, sz)) for sx, sz in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh))]
    bm.faces.new(vs)
    scr = U.mesh_from_bmesh('dalle', bm, 'BUREAU', smooth_shade=False)
    scr.location = SCREEN_C + Vector((0, -0.0005, 0))
    m, N, L = U.node_mat('dalle')
    N.remove(N['Principled BSDF'])
    em = N.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = lin('#0A0F14')
    em.inputs['Strength'].default_value = 1.0
    L.new(em.outputs[0], N['Material Output'].inputs['Surface'])
    scr.data.materials.append(m)
    glow = U.light('lueur_ecran', 'AREA', 18.0, lin('#BFD8FF'), loc=tuple(SCREEN_C + Vector((0, -0.02, 0))),
                   rot=(math.radians(90), 0, 0), size=0.35, volume=0.6, shadow=False)
    glow.data.shape = 'RECTANGLE'
    glow.data.size, glow.data.size_y = SCREEN_W, SCREEN_H
    return scr, glow, em


def build_lamp():
    metal = U.principled('lampe_metal', lin('#1E1E20'), rough=0.3, metal=1.0)
    base = U.cylinder('lampe_pied', 0.08, 0.02, 32, loc=(-0.62, 2.45, DESK_Z + 0.01), coll='BUREAU')
    U.assign(base, metal)
    a1 = U.cylinder('lampe_bras1', 0.012, 0.42, 12, loc=(-0.66, 2.45, DESK_Z + 0.21), rot=(0, math.radians(-12), 0),
                    coll='BUREAU')
    U.assign(a1, metal)
    a2 = U.cylinder('lampe_bras2', 0.012, 0.36, 12, loc=(-0.58, 2.38, DESK_Z + 0.50),
                    rot=(math.radians(35), math.radians(50), 0), coll='BUREAU')
    U.assign(a2, metal)
    shade = U.cylinder('abat_jour', 0.075, 0.13, 32, loc=(-0.46, 2.26, DESK_Z + 0.58),
                       rot=(math.radians(-40), math.radians(25), 0), coll='BUREAU')
    U.assign(shade, metal)
    bulb = U.uvsphere('ampoule', 0.03, 12, 6, loc=(-0.44, 2.23, DESK_Z + 0.545), coll='BUREAU')
    U.assign(bulb, U.emission('ampoule', lin('#FFD7A0'), 30.0))
    U.light('lampe', 'SPOT', 45.0, lin('#FFC98A'), loc=(-0.44, 2.22, DESK_Z + 0.55),
            rot=(math.radians(-25), math.radians(30), 0), size=0.04, spot=(80, 0.5), volume=0.8, shadow=True)


def build_props():
    # chapeau de détective (feutre) posé sur le bureau
    felt = U.principled('feutre_chapeau', lin('#3A2E22'), rough=0.85)
    band = U.principled('ruban', (0.01, 0.01, 0.01, 1), rough=0.6)
    prof = [(0.0, 0.135), (0.05, 0.13), (0.085, 0.12), (0.10, 0.09), (0.105, 0.04), (0.11, 0.012), (0.17, 0.012),
            (0.19, 0.02), (0.19, 0.008), (0.0, 0.0)]
    bm = bmesh.new()
    rings = []
    for r, z in prof:
        ring = []
        for k in range(32):
            a = 2 * math.pi * k / 32
            pinch = 1.0 - 0.18 * max(0.0, math.cos(a)) * smooth((z - 0.05) / 0.08) if r < 0.12 else 1.0
            ring.append(bm.verts.new((r * math.cos(a) * pinch * 1.08, r * math.sin(a) * pinch, z)))
        rings.append(ring)
    for a_, b_ in zip(rings, rings[1:]):
        for k in range(32):
            bm.faces.new((a_[k], a_[(k + 1) % 32], b_[(k + 1) % 32], b_[k]))
    hat = U.mesh_from_bmesh('chapeau', bm, 'BUREAU')
    U.subsurf(hat, 1)
    hat.location = (0.62, 2.12, DESK_Z + 0.002)
    hat.rotation_euler = (0, 0, math.radians(25))
    U.assign(hat, felt)
    rib = U.cylinder('ruban_chapeau', 0.103, 0.022, 32, loc=(0.62, 2.12, DESK_Z + 0.03), coll='BUREAU')
    rib.scale = (1.08, 1.0, 1.0)
    U.assign(rib, band)
    # loupe
    brass = U.principled('laiton', lin('#A88A4A'), rough=0.25, metal=1.0)
    glass = U.principled('verre_loupe', (0.9, 0.95, 1.0, 1), rough=0.0, transmission=1.0, ior=1.5)
    if hasattr(glass, 'surface_render_method'):
        glass.surface_render_method = 'BLENDED'
    ring = bpy.data.meshes.new('loupe_anneau')
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=0.055, segments=32)
    bm.to_mesh(ring)
    bm.free()
    lo = U.new_obj('loupe_anneau', ring, 'BUREAU')
    lo.modifiers.new('fil', 'WIREFRAME').thickness = 0.008
    lo.location = (0.30, 1.98, DESK_Z + 0.006)
    U.assign(lo, brass)
    lens = U.cylinder('loupe_verre', 0.052, 0.004, 32, loc=(0.30, 1.98, DESK_Z + 0.006), coll='BUREAU')
    U.assign(lens, glass)
    handle = U.cylinder('loupe_manche', 0.011, 0.13, 12, loc=(0.30 + 0.12, 1.98 - 0.03, DESK_Z + 0.008),
                        rot=(0, math.radians(90), math.radians(-14)), coll='BUREAU')
    U.assign(handle, wood_dark('manche', (0.05, 0.03, 0.02)))
    # dossier « CONFIDENTIEL » et tasse
    folder = U.box('dossier', (0.24, 0.32, 0.012), (-0.18, 1.98, DESK_Z + 0.006), 'BUREAU')
    folder.rotation_euler = (0, 0, math.radians(-8))
    U.assign(folder, U.principled('chemise', lin('#B79A62'), rough=0.85))
    stamp = U.text_obj('tampon', 'CONFIDENTIEL', 0.022, os.path.join(U.FONTS, 'IBMPlexMono-500.ttf'), coll='BUREAU')
    stamp.location = (-0.18, 1.95, DESK_Z + 0.0125)
    stamp.rotation_euler = (0, 0, math.radians(-8 + 4))
    U.assign(stamp, U.principled('encre_rouge', lin('#B3261E'), rough=0.6))
    mug = U.cylinder('tasse', 0.042, 0.10, 24, loc=(-0.45, 2.02, DESK_Z + 0.05), coll='BUREAU')
    U.assign(mug, U.principled('tasse', lin('#1D1D1F'), rough=0.3))


def build_orb():
    """petite sphère verte (le « orbe » de la référence, en vert PARANO) qui bat sur la grosse caisse"""
    m, N, L = U.node_mat('orbe')
    b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.02, 0.08, 0.04, 1)
    b.inputs['Roughness'].default_value = 0.15
    b.inputs['Emission Color'].default_value = lin('#4DFF8F')
    oi = N.new('ShaderNodeObjectInfo')
    sc = N.new('ShaderNodeSeparateColor')
    L.new(oi.outputs['Color'], sc.inputs[0])
    L.new(U.math_node(N, L, 'ADD', 0.5, U.math_node(N, L, 'MULTIPLY', sc.outputs[0], 10.0)), b.inputs['Emission Strength'])
    orb = U.uvsphere('orbe', 0.028, 32, 16, loc=(0.26, 2.50, DESK_Z + 0.028), coll='BUREAU')
    U.assign(orb, m)
    lamp = U.light('orbe_lumiere', 'POINT', 3.0, lin('#4DFF8F'), loc=(0.22, 2.40, DESK_Z + 0.08), size=0.05,
                   volume=0.6, shadow=False)
    keys = [(F0, 0.0)]
    for t in kicks():
        f = fr(t)
        keys += [(f - 1, 0.05), (f, 1.0), (f + 7, 0.08)]
    for f, v in keys:
        orb.color = (v, 0, 0, 1)
        orb.keyframe_insert('color', frame=f)
        lamp.data.energy = 0.8 + 9.0 * v
        lamp.data.keyframe_insert('energy', frame=f)


def build_board():
    """tableau d'enquête : liège, photos tirées des vidéos du compte, punaises et fils rouges"""
    board = U.box('tableau', (0.95, 0.025, 0.7), (-1.35, 2.93, 1.55), 'BUREAU', bev=0.01)
    board.rotation_euler = (0, 0, math.radians(12))
    U.assign(board, cork())
    frame_mat = wood_dark('cadre_tableau', (0.05, 0.035, 0.02))
    photos_dir = os.path.join(U.ROOT, 'media', 'photos_tableau')
    files = sorted(os.listdir(photos_dir)) if os.path.isdir(photos_dir) else []
    rnd = random.Random(9)
    pins = []
    rot = board.rotation_euler.to_matrix()
    for k in range(7):
        lx, lz = rnd.uniform(-0.38, 0.38), rnd.uniform(-0.26, 0.26)
        w, h = (0.13, 0.17) if k % 2 else (0.17, 0.12)
        ph = U.box(f'photo_{k}', (w, 0.003, h), (0, 0, 0), 'BUREAU')
        ph.location = Vector((-1.35, 2.93, 1.55)) + rot @ Vector((lx, -0.016, lz))
        ph.rotation_euler = (0, math.radians(rnd.uniform(-6, 6)), math.radians(12))
        img = os.path.join(photos_dir, files[k % len(files)]) if files else None
        U.assign(ph, photo_mat(f'photo_{k}', img, lin('#C8C2B4')))
        pin = U.uvsphere(f'punaise_{k}', 0.008, 10, 5, coll='BUREAU')
        pin.location = Vector((-1.35, 2.93, 1.55)) + rot @ Vector((lx, -0.022, lz + h / 2 - 0.015))
        U.assign(pin, U.principled('punaise', lin('#D21F1F'), rough=0.3))
        pins.append(pin.location.copy())
    red = U.principled('fil_rouge', lin('#C0181A'), rough=0.5)
    for a, b in ((0, 3), (3, 5), (5, 1), (1, 6), (6, 2), (2, 4)):
        p, q = pins[a], pins[b]
        mid = (p + q) / 2 + Vector((0, -0.005, -0.01))
        c = U.curve_tube('fil', [tuple(p), tuple(mid), tuple(q)], 0.0015, coll='BUREAU', kind='POLY')
        c.data.materials.append(red)
    U.light('tableau_lumiere', 'SPOT', 9.0, lin('#FFE2C0'), loc=(-1.0, 2.2, 2.4),
            rot=(math.radians(35), 0, math.radians(160)), size=0.05, spot=(40, 0.6), volume=0.5, shadow=True)


def build_porthole():
    """hublot à droite : l'eau noire de la fosse, de la neige marine, une lueur verte lointaine"""
    dark = U.principled('hublot_acier', (0.03, 0.033, 0.036, 1), rough=0.3, metal=1.0)
    ring = bpy.data.meshes.new('hublot_bord')
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=0.32, segments=48)
    bm.to_mesh(ring)
    bm.free()
    r = U.new_obj('hublot_bord', ring, 'BUREAU')
    r.modifiers.new('fil', 'WIREFRAME').thickness = 0.06
    r.location = (0.95, 2.95, 1.78)
    r.rotation_euler = (math.radians(90), 0, 0)
    U.assign(r, dark)
    m, N, L = U.node_mat('eau_noire')
    N.remove(N['Principled BSDF'])
    tc = N.new('ShaderNodeTexCoord').outputs['Generated']
    grad = N.new('ShaderNodeSeparateXYZ')
    L.new(tc, grad.inputs[0])
    vor = N.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 40.0
    vor.voronoi_dimensions = '4D'
    L.new(tc, vor.inputs['Vector'])
    vor.inputs['W'].default_value = 0.0
    vor.inputs['W'].keyframe_insert('default_value', frame=F0)
    vor.inputs['W'].default_value = 1.2
    vor.inputs['W'].keyframe_insert('default_value', frame=F1)
    flakes = N.new('ShaderNodeMapRange')
    flakes.inputs['From Min'].default_value, flakes.inputs['From Max'].default_value = 0.03, 0.0
    L.new(vor.outputs['Distance'], flakes.inputs['Value'])
    col = U.ramp(N, L, grad.outputs['Z'], [(0.0, (0.0, 0.004, 0.006, 1)), (1.0, lin('#0B3A42'))])
    c = U.mix_rgb(N, L, U.math_node(N, L, 'MULTIPLY', flakes.outputs['Result'], 0.5), col.outputs['Color'],
                  (0.6, 0.75, 0.75, 1))
    em = N.new('ShaderNodeEmission')
    L.new(c, em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.4
    L.new(em.outputs[0], N['Material Output'].inputs['Surface'])
    U.interp(m.node_tree, 'LINEAR')
    g = U.cylinder('hublot_eau', 0.31, 0.01, 48, loc=(0.95, 2.965, 1.78), rot=(math.radians(90), 0, 0),
                   coll='BUREAU')
    U.assign(g, m)


def lights():
    # lumière rasante sur les lattes (de la gauche), comme dans la référence : rayures de lumière
    l = U.light('rasante', 'AREA', 140.0, lin('#DCE6FF'), loc=(-2.3, 2.75, 1.9), rot=(0, math.radians(-90), 0),
                size=0.4, volume=0.4, shadow=True)
    l.data.shape = 'RECTANGLE'
    l.data.size, l.data.size_y = 0.25, 3.0
    U.light('contre_droit', 'AREA', 60.0, lin('#9FB8FF'), loc=(2.2, 2.6, 2.6), rot=(math.radians(-35), math.radians(60), 0),
            size=1.0, volume=0.3, shadow=True)
    U.light('remplissage', 'AREA', 6.0, lin('#7C8CA8'), loc=(0.0, -1.0, 2.0), rot=(math.radians(60), 0, 0),
            size=3.0, volume=0.0, shadow=False)


def haze():
    o = U.box('brume', (6, 6, 3.6), (0, 1.0, 1.8), 'BUREAU')
    m, N, L = U.node_mat('brume_piece')
    N.remove(N['Principled BSDF'])
    v = N.new('ShaderNodeVolumePrincipled')
    v.inputs['Density'].default_value = 0.035
    v.inputs['Anisotropy'].default_value = 0.5
    v.inputs['Color'].default_value = (0.8, 0.85, 0.9, 1)
    L.new(v.outputs[0], N['Material Output'].inputs['Volume'])
    o.data.materials.append(m)
    o.visible_shadow = False


# ------------------------------------------------------------------ caméra : on entre, on avance, on plonge dans l'écran
def screen_fill_distance(lens):
    """distance à laquelle l'écran (vertical) remplit exactement l'image (capteur vertical 36 mm)"""
    return (SCREEN_H / 2) / (18.0 / lens)


def animate_camera(cam):
    start = Vector((0.42, 0.25, 1.32))
    t_end = U.ev1('logo_montee')['t']                        # 24,0 s : l'écran remplit l'image
    for f in range(F0, F1 + 2):
        s = f / U.FPS
        k = (s - 19.2) / (t_end - 19.2)
        lens = mix(26.0, 40.0, smoother(max(0.0, (k - 0.7) / 0.3)))
        end = SCREEN_C + Vector((0, -screen_fill_distance(lens) - 0.0005, 0))
        # avance continue (rapide au début : l'élan du drop), puis plongée finale dans l'écran
        k1 = min(1.0, k)
        a = 0.5 * smooth(k1 / 0.8) if k1 < 0.8 else 0.5 + 0.5 * ((k1 - 0.8) / 0.2) ** 2.2
        pos = start.lerp(end, a)
        pos.x += 0.012 * math.sin(s * 2.3) * (1 - k)
        pos.z += 0.008 * math.sin(s * 3.1 + 1) * (1 - k)
        cam.location = pos
        target = SCREEN_C.lerp(SCREEN_C + Vector((0.08, 0, -0.06)), (1 - k) * 0.6)
        rot = U.aim(pos, target, roll_deg=1.2 * math.sin(s * 1.7) * (1 - k))
        if k >= 1.0:
            rot = U.aim(pos, SCREEN_C, 0.0)
        cam.rotation_euler = rot
        cam.data.lens = lens
        cam.keyframe_insert('location', frame=f)
        cam.keyframe_insert('rotation_euler', frame=f)
        cam.data.keyframe_insert('lens', frame=f)
    U.interp(cam, 'LINEAR')
    U.interp(cam.data, 'LINEAR')


def export_screen(sc, cam, scr, path):
    """4 coins de la dalle en pixels (1080×1920) à chaque image → incrustation du contenu dans HyperFrames"""
    rows = {}
    hw, hh = SCREEN_W / 2, SCREEN_H / 2
    corners = [Vector((-hw, 0, hh)), Vector((hw, 0, hh)), Vector((hw, 0, -hh)), Vector((-hw, 0, -hh))]  # HG HD BD BG
    for f in range(F0, F1 + 2):
        sc.frame_set(f)
        mw = scr.matrix_world
        pts = []
        for c in corners:
            p = world_to_camera_view(sc, cam, mw @ c)
            pts.append([round(p.x * 1080, 2), round((1 - p.y) * 1920, 2)])
        rows[f] = pts
    json.dump({'coins': rows, 'ordre': 'haut-gauche, haut-droite, bas-droite, bas-gauche'}, open(path, 'w'), indent=0)


def screen_light(glow, em):
    """la lueur de l'écran change à chaque coupe (le contenu change) : intensité et teinte variées"""
    rnd = random.Random(12)
    palette = [lin('#FFD9A8'), lin('#9FD0FF'), lin('#C8A8FF'), lin('#A8FFD0'), lin('#FFB0B0'), lin('#E8F0FF')]
    for e in U.events('coupe_ecran'):
        f = e['image']
        col = palette[e['index'] % len(palette)]
        for ff, boost in ((f, 1.6), (f + 3, 1.0)):
            glow.data.color = col[:3]
            glow.data.energy = (14.0 + rnd.uniform(-4, 6)) * boost
            glow.data.keyframe_insert('color', frame=ff)
            glow.data.keyframe_insert('energy', frame=ff)
            em.inputs['Color'].default_value = tuple(c * 0.04 for c in col[:3]) + (1,)
            em.inputs['Color'].keyframe_insert('default_value', frame=ff)


def build(opt):
    sc = U.reset(seed=33)
    sc.frame_start, sc.frame_end = F0, F1
    U.setup_render(sc, opt['quality'], opt['samples'])
    sc.eevee.volumetric_end = 12.0
    U.compositor(sc, glare_threshold=0.8, glare_strength=0.3, glare_size=0.5)
    nt = sc.world.node_tree
    nt.nodes['Background'].inputs['Color'].default_value = (0.001, 0.0012, 0.0015, 1)
    build_room()
    build_desk()
    scr, glow, em = build_monitor()
    build_lamp()
    build_props()
    build_orb()
    build_board()
    build_porthole()
    lights()
    haze()
    screen_light(glow, em)
    cam = U.camera(lens=26.0)
    cam.data.clip_start = 0.01
    animate_camera(cam)
    out_dir = os.path.join(U.ROOT, 'out', 'plates', 'P3')
    os.makedirs(out_dir, exist_ok=True)
    export_screen(sc, cam, scr, os.path.join(out_dir, 'ecran.json'))
    return sc


def main():
    opt = U.args()
    sc = build(opt)
    out = os.path.join(U.ROOT, 'out', {'final': 'plates', 'anim': 'anim'}.get(opt['quality'], 'tests'), 'P3')
    U.render_frames(sc, out, opt, 'bureau')


if __name__ == '__main__':
    main()
