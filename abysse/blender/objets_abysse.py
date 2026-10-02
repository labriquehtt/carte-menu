"""Les références cachées de la plongée, modélisées en code et animées par la partition (partition.json).

Chaque objet « joue » sa partie de la musique : l'image et le son partent à la même image.
  bouée jaune au visage qui fait un câlin (Hugging Face) + sa cloche ........ « cloche »   8,8 s
  baleine bleue (DeepSeek) ................................................... « chant »   9,6 s
  épave de voilier (Midjourney) + étoiles à 4 branches (Gemini) ............. « etincelle » 12,0–12,7 s
  piano à queue « SUNO » : chaque note enfonce et allume sa touche ........... « touche »  12,8–14,2 s
  deux colonnes de lumière « II » (ElevenLabs) qui montent comme une voix .... « choeur »  14,4 s
  étincelle orange à 12 branches (Claude) ..................................... 15,2 s
  station : LED en « M » pixelisé (Mistral), câble en ∞ (Meta), hublot à fleur hexagonale (OpenAI)
Les objets sont modélisés « face à −Y » puis tournés de leur cap (rotation z = cap) pour regarder la caméra.
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

import outils as U
from outils import lin, smooth, smoother, mix, fr

CTX = {}


def direction(yaw_deg):
    a = math.radians(yaw_deg)
    return Vector((-math.sin(a), math.cos(a), 0.0))


def obj_yaw(name):
    """cap de l'objet : la caméra finit son fouet à cap − 8° et dérive de +9° pendant la mesure → on vise le milieu"""
    return CTX['yaw'][name] - 3.5


def obj_color_glow(name, color, base=0.0, k=1.0, rough=0.4, emit_color=None, metal=0.0, sss=0.0):
    """matière dont l'émission suit la couleur de l'objet (canal rouge) : une seule matière, intensité par objet"""
    m, N, L = U.node_mat(name)
    b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Emission Color'].default_value = emit_color or color
    oi = N.new('ShaderNodeObjectInfo')
    sep = N.new('ShaderNodeSeparateColor')
    L.new(oi.outputs['Color'], sep.inputs[0])
    L.new(U.math_node(N, L, 'ADD', base, U.math_node(N, L, 'MULTIPLY', sep.outputs[0], k)), b.inputs['Emission Strength'])
    m.diffuse_color = color
    return m


def glow_keys(obj, frames_values):
    """anime l'intensité lumineuse d'un objet (canal rouge de sa couleur)"""
    for f, v in frames_values:
        obj.color = (v, 0, 0, 1)
        obj.keyframe_insert('color', frame=f)


def pulse(obj, f_hit, peak, decay_frames, base=0.0, attack=1):
    glow_keys(obj, [(f_hit - attack, base), (f_hit, peak), (f_hit + decay_frames, base)])


def catmull(points, n_per=8, closed=False):
    pts = [Vector(p) for p in points]
    out = []
    count = len(pts) if closed else len(pts) - 1
    for i in range(count):
        p0 = pts[(i - 1) % len(pts)] if (closed or i > 0) else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % len(pts)]
        p3 = pts[(i + 2) % len(pts)] if (closed or i + 2 < len(pts)) else pts[(i + 1) % len(pts)]
        for k in range(n_per):
            t = k / n_per
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    if not closed:
        out.append(pts[-1])
    return out


def extrude_outline(name, outline2d, z0, z1, coll='DECOR'):
    """prisme à partir d'un contour 2D (x, y) entre z0 et z1"""
    bm = bmesh.new()
    bot = [bm.verts.new((p.x, p.y, z0)) for p in outline2d]
    top = [bm.verts.new((p.x, p.y, z1)) for p in outline2d]
    n = len(outline2d)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return U.mesh_from_bmesh(name, bm, coll, smooth_shade=False)


# =====================================================================  1. BOUÉE (Hugging Face) + cloche
def build_buoy():
    yaw = CTX['yaw']['bouee']
    d = direction(yaw)
    center = d * 3.3 + Vector((0, 0, -0.16))
    root = U.collection('BOUEE')
    yellow = U.principled('bouee_jaune', lin('#FFC81E'), rough=0.45, sss=0.05)
    brown = U.principled('bouee_trait', lin('#3B2412'), rough=0.5)
    tongue = U.principled('bouee_bouche', lin('#C2413B'), rough=0.5)
    ball = U.uvsphere('bouee', 0.55, 48, 24, coll='BOUEE')
    U.assign(ball, yellow)
    ball.location = center
    # repère du visage : face vers la caméra, un peu vers le bas (on la voit d'en dessous)
    fwd = (Vector((0, 0, -0.7)) - center).normalized()
    fwd = (fwd + Vector((0, 0, -0.35))).normalized()
    side = fwd.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(fwd).normalized()

    def on_sphere(a, b, r=0.555):
        v = (fwd * math.cos(a) * math.cos(b) + side * math.sin(a) * math.cos(b) + up * math.sin(b)).normalized()
        return center + v * r

    # yeux : deux arcs « heureux » (^ ^)
    for sgn in (-1, 1):
        pts = [on_sphere(sgn * 0.33 + 0.16 * math.cos(t), 0.22 + 0.10 * math.sin(t), 0.562)
               for t in [math.pi * k / 10 for k in range(11)]]
        e = U.curve_tube(f'oeil_{sgn}', [tuple(p) for p in pts], 0.022, coll='BOUEE', kind='POLY')
        e.data.materials.append(brown)
    # bouche ouverte (demi-disque sombre) + langue
    mouth_pts = [on_sphere(0.30 * math.cos(t), -0.10 - 0.20 * math.sin(t), 0.553) for t in
                 [math.pi * k / 16 for k in range(17)]]
    bm = bmesh.new()
    vs = [bm.verts.new(tuple(p)) for p in mouth_pts]
    bm.faces.new(vs)
    mo = U.mesh_from_bmesh('bouche', bm, 'BOUEE')
    U.mod(mo, 'SOLIDIFY', thickness=0.02, offset=0.0)
    U.assign(mo, brown)
    tg = U.uvsphere('langue', 0.09, 16, 8, coll='BOUEE')
    tg.location = on_sphere(0.0, -0.24, 0.55)
    tg.scale = (1.4, 1.4, 0.45)
    tg.rotation_euler = fwd.to_track_quat('Z', 'Y').to_euler()
    U.assign(tg, tongue)
    # les deux mains qui font le câlin, devant le bas du visage
    for sgn in (-1, 1):
        palm_c = center + fwd * 0.62 + side * sgn * 0.30 + up * (-0.30)
        palm = U.uvsphere(f'main_{sgn}', 0.13, 24, 12, coll='BOUEE')
        palm.location = palm_c
        palm.scale = (1.0, 0.45, 1.15)
        palm.rotation_euler = fwd.to_track_quat('Y', 'Z').to_euler()
        U.assign(palm, yellow)
        for k in range(4):
            ang = math.radians(-35 + k * 23) * sgn
            tip = palm_c + (up * math.cos(ang) + side * math.sin(ang) * sgn) * 0.22 + fwd * 0.02
            base = palm_c + (up * math.cos(ang) + side * math.sin(ang) * sgn) * 0.08
            fing = U.curve_tube(f'doigt_{sgn}_{k}', [tuple(base), tuple((base + tip) / 2), tuple(tip)], 0.032,
                                coll='BOUEE', kind='POLY')
            fing.data.materials.append(yellow)
    # chaîne d'ancrage + cloche suspendue
    bronze = U.principled('bronze', lin('#8C6A35'), rough=0.35, metal=1.0)
    steel = U.metal_rust('chaine', paint=(0.06, 0.06, 0.06), rust_amount=0.35, scale=6)
    bottom = center + Vector((0, 0, -0.55))
    for k in range(44):
        z = bottom.z - 0.1 - k * 0.11
        link = bpy.data.meshes.new(f'maillon_{k}')
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=False, radius=0.045, segments=10)
        bm.to_mesh(link)
        bm.free()
        lo = U.new_obj(f'maillon_{k}', link, 'BOUEE')
        lo.location = (bottom.x + 0.02 * math.sin(k * 0.5), bottom.y, z)
        lo.rotation_euler = (math.radians(90), 0, math.radians(90 * (k % 2)))
        lo.scale = (1.0, 1.6, 1.0)
        lo.modifiers.new('fil', 'WIREFRAME').thickness = 0.016
        U.assign(lo, steel)
    bell = build_bell(bronze)
    bell.location = center + Vector((0.0, 0.0, -0.55 - 0.65))
    # la cloche se balance avec la houle, puis frappe sur l'évènement « cloche »
    hit = U.ev1('cloche')['image']
    for f in range(CTX['F0'], hit + 40):
        s = (f - CTX['F0']) / U.FPS
        a = 9.0 * math.sin(s * 3.4)
        if f >= hit - 6:
            k = (f - (hit - 6)) / 6.0
            a = mix(a, 22.0, smooth(k)) if f < hit else 22.0 * math.exp(-(f - hit) / 6.0) * math.cos((f - hit) * 0.9)
        bell.rotation_euler = (math.radians(a), 0, 0)
        bell.keyframe_insert('rotation_euler', frame=f)
    # une lumière douce de remplissage pour lire le visage (vu d'en dessous, il serait dans l'ombre)
    U.light('remplissage_bouee', 'POINT', 60.0, lin('#BFF6F0'), loc=tuple(center + fwd * 1.6 + Vector((0, 0, -0.6))),
            size=0.6, volume=0.0, shadow=False)
    return ball


def build_bell(mat):
    prof = [(0.0, 0.02), (0.05, 0.02), (0.07, -0.02), (0.085, -0.12), (0.11, -0.2), (0.13, -0.24), (0.125, -0.25),
            (0.0, -0.25)]
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * k / 24), r * math.sin(2 * math.pi * k / 24), z))
                for k in range(24)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(24):
            bm.faces.new((a[k], a[(k + 1) % 24], b[(k + 1) % 24], b[k]))
    o = U.mesh_from_bmesh('cloche', bm, 'BOUEE')
    U.mod(o, 'SOLIDIFY', thickness=0.01)
    U.assign(o, mat)
    return o


# =====================================================================  2. BALEINE (DeepSeek)
def whale_mesh():
    L = 11.0
    prof = [(0.0, 0.16), (0.03, 0.52), (0.08, 0.84), (0.18, 1.10), (0.32, 1.20), (0.48, 1.10), (0.62, 0.86),
            (0.75, 0.56), (0.85, 0.31), (0.93, 0.17), (1.0, 0.09)]

    def rad(u):
        for (a, ra), (b, rb) in zip(prof, prof[1:]):
            if u <= b:
                return mix(ra, rb, smooth((u - a) / (b - a)))
        return prof[-1][1]

    nu, nv = 72, 36
    verts, faces, uvals = [], [], []
    for i in range(nu + 1):
        u = (i / nu) ** 1.05
        r = rad(u)
        x = L * (0.5 - u)
        for j in range(nv):
            phi = 2 * math.pi * j / nv
            y = r * 1.04 * math.cos(phi)
            zf = math.sin(phi)
            z = r * (0.82 if zf > 0 else 0.9) * zf
            if zf > 0 and u < 0.2:                 # tête plus plate sur le dessus (rostre)
                z *= mix(0.62, 1.0, u / 0.2)
            verts.append((x, y, z))
            uvals.append(u)
    for i in range(nu):
        for j in range(nv):
            a, b = i * nv + j, i * nv + (j + 1) % nv
            c, d = (i + 1) * nv + (j + 1) % nv, (i + 1) * nv + j
            faces.append((a, b, c, d))
    tip = len(verts)
    verts.append((L * 0.5 + 0.02, 0, -0.02))
    uvals.append(0.0)
    for j in range(nv):
        faces.append((tip, (j + 1) % nv, j))
    end = len(verts)
    verts.append((-L * 0.5 - 0.02, 0, 0))
    uvals.append(1.0)
    base = nu * nv
    for j in range(nv):
        faces.append((base + j, base + (j + 1) % nv, end))
    body = U.mesh_from_data('baleine', verts, faces, 'BALEINE')
    # nageoire caudale, pectorales, dorsale (ajoutées au même maillage pour la déformation)
    bm = bmesh.new()
    bm.from_mesh(body.data)

    def wing(root, span_dir, back_dir, span, chord, thick, sweep=0.35, notch=False):
        ring = []
        nsp = 10
        for k in range(nsp + 1):
            s = k / nsp
            c = chord * (1 - 0.75 * s) if not notch else chord * (1 - 0.55 * s)
            p0 = root + span_dir * span * s + back_dir * (sweep * span * s * s)
            ring.append((p0 - back_dir * c * 0.25, p0 + back_dir * c * 0.75, thick * (1 - 0.8 * s)))
        top, bot = [], []
        for a, b_, t in ring:
            top.append((bm.verts.new(a + Vector((0, 0, t))), bm.verts.new(b_ + Vector((0, 0, t * 0.4)))))
            bot.append((bm.verts.new(a - Vector((0, 0, t))), bm.verts.new(b_ - Vector((0, 0, t * 0.4)))))
        for k in range(nsp):
            (a1, b1), (a2, b2) = top[k], top[k + 1]
            (c1, d1), (c2, d2) = bot[k], bot[k + 1]
            bm.faces.new((a1, a2, b2, b1))
            bm.faces.new((c1, d1, d2, c2))
            bm.faces.new((a1, c1, c2, a2))
            bm.faces.new((b1, b2, d2, d1))
        (a, b_), (c, d_) = top[-1], bot[-1]
        bm.faces.new((a, b_, d_, c))

    tail_root = Vector((-L * 0.5 + 0.35, 0, 0))
    for sgn in (-1, 1):
        wing(tail_root, Vector((0, sgn, 0)), Vector((-1, 0, 0)), 1.75, 0.95, 0.07, sweep=0.45, notch=True)
        wing(Vector((L * 0.5 - 0.25 * L, sgn * 0.95, -0.40)), Vector((0, sgn * 1.0, -0.35)).normalized(),
             Vector((-1, 0, -0.1)).normalized(), 1.55, 0.62, 0.07, sweep=0.55)
    dorsal = [(L * (0.5 - 0.70), 0, 0.82), (L * (0.5 - 0.755), 0, 1.12), (L * (0.5 - 0.80), 0, 0.66)]
    dv = [bm.verts.new(p) for p in dorsal]
    bm.faces.new(dv)
    bm.to_mesh(body.data)
    bm.free()
    for p in body.data.polygons:
        p.use_smooth = True
    U.subsurf(body, 1, 2)
    return body, L


def whale_material():
    m, N, L = U.node_mat('baleine_peau')
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(tc, sep.inputs[0])
    belly = N.new('ShaderNodeMapRange')
    belly.inputs['From Min'].default_value, belly.inputs['From Max'].default_value = 0.1, -0.55
    L.new(sep.outputs['Z'], belly.inputs['Value'])
    mott = U.noise_tex(N, L, tc, 1.8, 8, 0.6)
    top = U.ramp(N, L, mott.outputs['Fac'], [(0.35, lin('#14263A')), (0.65, lin('#2B4763'))])
    c = U.mix_rgb(N, L, U.math_node(N, L, 'MULTIPLY', belly.outputs['Result'], 0.7), top.outputs['Color'],
                  lin('#6F8496'))
    grooves = N.new('ShaderNodeTexWave')
    grooves.bands_direction = 'Z'
    grooves.inputs['Scale'].default_value = 9.0
    grooves.inputs['Distortion'].default_value = 1.5
    L.new(tc, grooves.inputs['Vector'])
    gmask = U.math_node(N, L, 'MULTIPLY', grooves.outputs['Fac'], belly.outputs['Result'])
    L.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.62
    b.inputs['Specular IOR Level'].default_value = 0.35
    L.new(U.bump(N, L, U.math_node(N, L, 'ADD', U.math_node(N, L, 'MULTIPLY', gmask, 0.5),
                                   U.math_node(N, L, 'MULTIPLY', mott.outputs['Fac'], 0.3)),
                 0.3, 0.03), b.inputs['Normal'])
    b.inputs['Subsurface Weight'].default_value = 0.05
    return m


def build_whale():
    body, L = whale_mesh()
    U.assign(body, whale_material())
    eye = U.principled('oeil_baleine', (0.005, 0.005, 0.006, 1), rough=0.1)
    for sgn in (-1, 1):
        e = U.uvsphere(f'oeil_baleine_{sgn}', 0.07, 16, 8, coll='BALEINE')
        e.location = (L * (0.5 - 0.13), sgn * 0.83, -0.18)
        U.assign(e, eye)
        e.parent = body
    # nage : la queue ondule (deux clés de forme), la baleine traverse le champ de gauche à droite
    body.shape_key_add(name='Basis')
    for name, sgn in (('queue_haut', 1), ('queue_bas', -1)):
        sk = body.shape_key_add(name=name, from_mix=False)
        for i, v in enumerate(body.data.vertices):
            u = (L * 0.5 - v.co.x) / L
            if u > 0.42:
                k = ((u - 0.42) / 0.58) ** 2
                sk.data[i].co.z = v.co.z + sgn * 0.75 * k
                sk.data[i].co.x = v.co.x + 0.12 * k
    keys = body.data.shape_keys.key_blocks
    ev = U.ev1('chant', 'baleine')
    t_mid = ev['t'] + 0.75
    yaw = CTX['yaw']['baleine']
    d = direction(yaw)
    right = Vector((math.cos(math.radians(yaw)), math.sin(math.radians(yaw)), 0))
    fa, fb = fr(ev['t'] - 0.6), fr(ev['t'] + 2.0)
    heading = math.radians(yaw)          # tête vers +X local → vers « right »
    for f in range(fa, fb + 1):
        s = f / U.FPS
        u = (s - (ev['t'] - 0.6)) / 2.6
        cam = CTX['cam_state'](s)[0]
        pos = d * 7.6 + right * mix(-7.5, 6.5, u) + Vector((0, 0, cam.z - 0.9 - 0.8 * u))
        body.location = pos
        body.rotation_euler = (math.radians(4 * math.sin(s * 2.0)), math.radians(9), heading)
        body.keyframe_insert('location', frame=f)
        body.keyframe_insert('rotation_euler', frame=f)
        ph = math.sin(s * 2 * math.pi * 0.62)
        keys['queue_haut'].value = max(0.0, ph)
        keys['queue_bas'].value = max(0.0, -ph)
        keys['queue_haut'].keyframe_insert('value', frame=f)
        keys['queue_bas'].keyframe_insert('value', frame=f)
    mid_cam = CTX['cam_state'](t_mid)[0]
    U.light('contre_jour_baleine', 'AREA', 1800.0, lin('#BFF2F4'),
            loc=tuple(d * 13.0 + Vector((0, 0, mid_cam.z + 6.0))), rot=(math.radians(150), 0, math.radians(yaw)),
            size=14.0, volume=0.25, shadow=False)
    for f, hidden in ((CTX['F0'], True), (fa, False), (fb + 1, True)):
        body.hide_render = hidden
        body.keyframe_insert('hide_render', frame=f)
        for c in body.children:
            c.hide_render = hidden
            c.keyframe_insert('hide_render', frame=f)
    return body


# =====================================================================  3. VOILIER (Midjourney) + étoiles (Gemini)
def build_sailboat():
    yaw = obj_yaw('voilier')
    d = direction(yaw)
    ledge_c = d * 9.6 + Vector((0, 0, -21.4))
    CTX['ledge']('plateau_voilier', tuple(ledge_c), (4.2, 3.0, 1.4), yaw)
    wood = U.silted('bois_epave', (0.12, 0.10, 0.08), rough=0.75, amount=0.6, scale=2.5)
    paint = U.silted('coque_peinte', (0.22, 0.24, 0.23), rough=0.6, amount=0.5, scale=2.0)
    # coque : sections en U le long de x (proue en +x)
    Lh, nx, nv = 6.4, 40, 18
    verts, faces = [], []
    for i in range(nx + 1):
        u = i / nx
        x = Lh * (0.5 - u)
        half = 1.05 * math.sin(math.pi / 2 * min(1.0, u / 0.45 + 0.03)) ** 0.8 if u < 0.45 else             mix(1.05, 0.84, ((u - 0.45) / 0.55) ** 2)
        depth = 1.05 * (0.55 + 0.45 * math.sin(math.pi * min(1.0, u * 1.1)))
        sheer = 0.25 * (1 - u) ** 2
        for j in range(nv + 1):
            phi = math.pi * j / nv
            y = half * math.cos(phi)
            z = -depth * math.sin(phi) ** 0.8 + sheer
            verts.append((x, y, z))
    for i in range(nx):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.append((a, a + 1, a + nv + 2, a + nv + 1))
    hull = U.mesh_from_data('coque', verts, faces, 'VOILIER')
    U.mod(hull, 'SOLIDIFY', thickness=0.05)
    U.subsurf(hull, 1)
    U.assign(hull, paint)
    deck = U.box('pont', (Lh * 0.86, 1.8, 0.05), (-0.15, 0, 0.05), 'VOILIER')
    U.assign(deck, wood)
    cabin = U.box('cabine', (1.8, 1.1, 0.45), (-0.4, 0, 0.32), 'VOILIER', bev=0.06)
    U.assign(cabin, wood)
    keel = U.box('quille', (1.3, 0.12, 1.1), (0.0, 0, -1.4), 'VOILIER', bev=0.03)
    U.assign(keel, paint)
    mast_h = 7.2
    mast = U.cylinder('mat', 0.07, mast_h, 12, loc=(0.9, 0, mast_h / 2), coll='VOILIER')
    U.assign(mast, wood)
    boom = U.cylinder('bome', 0.05, 3.2, 10, loc=(0.9 - 1.6, 0, 1.15), rot=(0, math.radians(90), 0), coll='VOILIER')
    U.assign(boom, wood)
    # grand-voile : grand triangle courbe (bord d'attaque bombé), déchirée par endroits, comme le logo
    sail_mat = sail_material()
    nsu, nsv = 24, 16
    sv, sf = [], []
    for i in range(nsu + 1):
        a = i / nsu                                       # le long du mât (0 bas, 1 haut)
        for j in range(nsv + 1):
            b = j / nsv                                   # du mât vers la chute
            width = 3.0 * (1 - a) ** 1.1
            x = 0.9 - b * width + 0.35 * math.sin(math.pi * a) * (1 - b)
            z = 1.2 + a * (mast_h - 1.5)
            belly = 0.42 * math.sin(math.pi * b) * (1 - a * 0.6)
            n = noise.noise(Vector((a * 3, b * 3, 0.5))) * 0.12
            sv.append((x, belly + n, z))
    for i in range(nsu):
        for j in range(nsv):
            a = i * (nsv + 1) + j
            sf.append((a, a + 1, a + nsv + 2, a + nsv + 1))
    sail = U.mesh_from_data('voile', sv, sf, 'VOILIER')
    U.mod(sail, 'SOLIDIFY', thickness=0.01)
    U.assign(sail, sail_mat)
    jib_pts = [(0.95, 0.05, 1.3), (0.95, 0.05, mast_h - 1.0), (Lh * 0.5 - 0.2, 0.1, 0.4)]
    bm = bmesh.new()
    bm.faces.new([bm.verts.new(p) for p in jib_pts])
    jib = U.mesh_from_bmesh('foc', bm, 'VOILIER')
    U.mod(jib, 'SOLIDIFY', thickness=0.01)
    U.assign(jib, sail_mat)
    rope = U.principled('cordage', lin('#5A5246'), rough=0.8)
    for p in ((Lh * 0.5 - 0.2, 0, 0.35), (-Lh * 0.5 + 0.3, 0, 0.3), (0.6, 0.95, 0.15), (0.6, -0.95, 0.15)):
        c = U.curve_tube('hauban', [(0.9, 0, mast_h - 0.2), ((0.9 + p[0]) / 2, p[1] / 2, (mast_h + p[2]) / 2 - 0.15), p],
                         0.012, coll='VOILIER', kind='POLY')
        c.data.materials.append(rope)
    # l'épave : couchée sur le flanc, enfoncée dans le limon du plateau
    root = bpy.data.objects.new('voilier', None)
    U.collection('VOILIER').objects.link(root)
    for o in list(U.collection('VOILIER').objects):
        if o is not root and o.parent is None:
            o.parent = root
    root.location = ledge_c + Vector((0, 0, 1.25))
    root.rotation_euler = (math.radians(-22), math.radians(-6), math.radians(yaw))
    # grincement : la coque roule un peu sur l'évènement
    ev = U.ev1('grincement')
    for f, r in ((CTX['F0'], -22.0), (ev['image'] - 2, -22.0), (ev['image'] + 10, -25.5), (ev['image'] + 40, -23.0)):
        root.rotation_euler = (math.radians(r), math.radians(-6), math.radians(yaw))
        root.keyframe_insert('rotation_euler', frame=f)
    # projecteur ténu venu d'en haut pour détacher la voile
    U.light('rai_voilier', 'SPOT', 700.0, lin('#BDEFF0'), loc=tuple(ledge_c + Vector((-1.0, 0.5, 11.0))),
            rot=(0, 0, 0), size=0.4, spot=(30, 0.9), volume=0.6, shadow=True)
    U.light('face_voilier', 'AREA', 500.0, lin('#9FE3E6'), loc=tuple(ledge_c - d * 5.0 + Vector((0, 0, 5.0))),
            rot=(math.radians(50), 0, math.radians(yaw + 180)), size=4.0, volume=0.0, shadow=False)
    return root


def sail_material():
    m, N, L = U.node_mat('voile')
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    n = U.noise_tex(N, L, tc, 1.6, 6, 0.6, dist=0.8)
    holes = N.new('ShaderNodeMapRange')
    holes.inputs['From Min'].default_value, holes.inputs['From Max'].default_value = 0.66, 0.62
    L.new(n.outputs['Fac'], holes.inputs['Value'])
    stain = U.noise_tex(N, L, tc, 4.0, 8, 0.6)
    c = U.ramp(N, L, stain.outputs['Fac'], [(0.3, lin('#8B8370')), (0.7, lin('#C9C0A6'))])
    L.new(c.outputs['Color'], b.inputs['Base Color'])
    L.new(holes.outputs['Result'], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 0.85
    b.inputs['Subsurface Weight'].default_value = 0.25
    b.inputs['Transmission Weight'].default_value = 0.15
    if hasattr(m, 'surface_render_method'):
        m.surface_render_method = 'DITHERED'
    m.use_backface_culling = False
    return m


def star4(name, size, coll):
    """étoile à 4 branches aux côtés creusés (la forme ✦)"""
    pts = []
    n = 64
    for k in range(n):
        a = 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        r = 1.0 / (abs(c) ** 0.5 + abs(s) ** 0.5) ** 2
        pts.append(Vector((c * r * size, s * r * size, 0)))
    bm = bmesh.new()
    top = [bm.verts.new((p.x, p.y, 0.035 * size)) for p in pts]
    bot = [bm.verts.new((p.x, p.y, -0.035 * size)) for p in pts]
    ct, cb = bm.verts.new((0, 0, 0.12 * size)), bm.verts.new((0, 0, -0.12 * size))
    for k in range(n):
        j = (k + 1) % n
        bm.faces.new((ct, top[k], top[j]))
        bm.faces.new((cb, bot[j], bot[k]))
        bm.faces.new((top[k], bot[k], bot[j], top[j]))
    return U.mesh_from_bmesh(name, bm, coll, smooth_shade=False)


def gemini_material():
    m, N, L = U.node_mat('etoile_gemini')
    N.remove(N['Principled BSDF'])
    tc = N.new('ShaderNodeTexCoord').outputs['Generated']
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(tc, sep.inputs[0])
    g = U.math_node(N, L, 'MULTIPLY', U.math_node(N, L, 'ADD', sep.outputs['X'], sep.outputs['Y']), 0.5)
    col = U.ramp(N, L, g, [(0.15, lin('#4E86F7')), (0.5, lin('#9B72CB')), (0.85, lin('#E0708A'))])
    oi = N.new('ShaderNodeObjectInfo')
    sp = N.new('ShaderNodeSeparateColor')
    L.new(oi.outputs['Color'], sp.inputs[0])
    em = N.new('ShaderNodeEmission')
    L.new(col.outputs['Color'], em.inputs['Color'])
    L.new(U.math_node(N, L, 'ADD', 1.2, U.math_node(N, L, 'MULTIPLY', sp.outputs[0], 22.0)), em.inputs['Strength'])
    L.new(em.outputs[0], N['Material Output'].inputs['Surface'])
    return m


def build_gemini_stars():
    rnd = random.Random(42)
    yaw = CTX['yaw']['voilier']
    mat = gemini_material()
    sparks = U.events('etincelle', 'plancton')
    stars = []
    for k in range(34):
        a = math.radians(yaw + rnd.uniform(-24, 24))
        r = rnd.uniform(3.0, 8.5)
        z = rnd.uniform(-22.5, -15.5)
        o = star4(f'etoile_{k}', rnd.uniform(0.08, 0.26), 'GEMINI')
        o.location = (-math.sin(a) * r, math.cos(a) * r, z)
        o.rotation_euler = (rnd.uniform(0, 6.28), rnd.uniform(0, 6.28), rnd.uniform(0, 6.28))
        U.assign(o, mat)
        ev = sparks[k % len(sparks)]
        base_s = o.scale.copy()
        f = ev['image']
        for ff, sc, glow in ((CTX['F0'], 0.85, 0.0), (f - 2, 0.85, 0.0), (f, 1.6, 1.0), (f + 9, 1.0, 0.12),
                             (f + 30, 0.9, 0.05)):
            o.scale = base_s * sc
            o.keyframe_insert('scale', frame=ff)
            o.color = (glow, 0, 0, 1)
            o.keyframe_insert('color', frame=ff)
        # lente rotation
        o.keyframe_insert('rotation_euler', frame=CTX['F0'])
        o.rotation_euler.z += rnd.uniform(1.5, 3.0)
        o.keyframe_insert('rotation_euler', frame=CTX['F1'])
        stars.append(o)
    return stars


# =====================================================================  4. PIANO « SUNO »
def piano_outline():
    pts = [(-0.74, 0.0), (-0.74, 0.8), (-0.74, 1.55), (-0.68, 1.76), (-0.50, 1.86), (-0.28, 1.86), (-0.10, 1.74),
           (0.08, 1.48), (0.28, 1.12), (0.50, 0.74), (0.68, 0.46), (0.74, 0.25), (0.74, 0.0)]
    out = catmull([(x, y, 0) for x, y in pts], n_per=6, closed=False)
    return out


WHITE = [0, 2, 4, 5, 7, 9, 11]


def key_layout():
    """88 touches (la0 = midi 21 → do8 = 108) : x du centre, blanche/noire"""
    whites = [m for m in range(21, 109) if (m % 12) in WHITE]
    pitch = 1.22 / len(whites)
    xs = {}
    for i, m in enumerate(whites):
        xs[m] = -0.61 + pitch * (i + 0.5)
    for m in range(21, 109):
        if (m % 12) not in WHITE:
            xs[m] = (xs[m - 1] + xs[m + 1]) / 2 if (m + 1) in xs else xs[m - 1] + pitch / 2
    return xs, pitch


def build_piano():
    yaw = obj_yaw('piano')
    d = direction(yaw)
    base_pos = d * 4.1 + Vector((0, 0, -27.15))
    CTX['ledge']('plateau_piano', tuple(d * 5.6 + Vector((0, 0, -27.15 - 0.24))), (3.6, 3.2, 1.0), yaw)
    lacquer = U.silted('laque_noire', (0.008, 0.008, 0.009), rough=0.12, coat=1.0, amount=0.45, scale=4.0)
    gold = U.principled('or_piano', lin('#C9A253'), rough=0.25, metal=1.0)
    ivory = obj_color_glow('touche_blanche', lin('#E8E2D2'), base=0.0, k=9.0, rough=0.25, emit_color=lin('#C6FFF4'))
    ebony = obj_color_glow('touche_noire', (0.01, 0.01, 0.01, 1), base=0.0, k=9.0, rough=0.2, emit_color=lin('#C6FFF4'))
    felt = U.principled('feutre', lin('#5A1414'), rough=0.9)
    outline = piano_outline()
    z0, z1 = 0.62, 0.98
    case = extrude_outline('caisse', outline, z0, z1, 'PIANO')
    # la caisse est une coque : on retire le dessus et on donne de l'épaisseur
    bm = bmesh.new()
    bm.from_mesh(case.data)
    top_faces = [f for f in bm.faces if f.normal.z > 0.9]
    bmesh.ops.delete(bm, geom=top_faces, context='FACES_ONLY')
    bm.to_mesh(case.data)
    bm.free()
    U.mod(case, 'SOLIDIFY', thickness=0.035, offset=-1)
    U.bevel(case, 0.01, 2)
    U.assign(case, lacquer)
    # cadre en fonte doré + table d'harmonie striée de cordes
    inner = [Vector((p.x * 0.92, p.y * 0.95 + 0.03, 0)) for p in outline]
    plate = extrude_outline('cadre', inner, 0.80, 0.83, 'PIANO')
    U.assign(plate, strings_material(gold))
    # couvercle (charnière sur le côté gauche, ouvert ~36°) et sa béquille
    lid = extrude_outline('couvercle', outline, 0.0, 0.025, 'PIANO')
    U.assign(lid, lacquer)
    for v in lid.data.vertices:
        v.co.x += 0.74
    lid.location = (-0.74, 0, z1)
    lid.rotation_euler = (0, math.radians(-36), 0)
    prop = U.cylinder('bequille', 0.012, 0.62, 8, loc=(0.42, 0.9, z1 + 0.29), rot=(0, math.radians(-14), 0),
                      coll='PIANO')
    U.assign(prop, lacquer)
    # pieds, lyre, pédales
    for x, y in ((-0.62, 0.15), (0.62, 0.15), (-0.45, 1.62)):
        leg = U.cylinder('pied', 0.055, 0.62, 16, loc=(x, y, 0.31), coll='PIANO')
        U.assign(leg, lacquer)
    lyre = U.box('lyre', (0.22, 0.05, 0.5), (0, 0.35, 0.27), 'PIANO', bev=0.01)
    U.assign(lyre, lacquer)
    for k in range(3):
        p = U.box('pedale', (0.03, 0.12, 0.012), (-0.06 + k * 0.06, 0.28, 0.06), 'PIANO')
        U.assign(p, gold)
    # clavier : lit de touches, joues, pupitre, couvercle de clavier avec « SUNO »
    bed = U.box('lit_clavier', (1.48, 0.30, 0.10), (0, -0.05, 0.66), 'PIANO', bev=0.01)
    U.assign(bed, lacquer)
    for sgn in (-1, 1):
        cheek = U.box('joue', (0.12, 0.30, 0.12), (sgn * 0.68, -0.05, 0.76), 'PIANO', bev=0.015)
        U.assign(cheek, lacquer)
    fallboard = U.box('cache_clavier', (1.24, 0.03, 0.11), (0, 0.075, 0.80), 'PIANO', bev=0.006)
    fallboard.rotation_euler = (math.radians(-12), 0, 0)
    U.assign(fallboard, lacquer)
    stand = U.box('pupitre', (0.82, 0.02, 0.30), (0, 0.22, 1.13), 'PIANO', bev=0.005)
    stand.rotation_euler = (math.radians(-16), 0, 0)
    U.assign(stand, lacquer)
    sheet = U.box('partition', (0.40, 0.004, 0.27), (0, 0.205, 1.14), 'PIANO')
    sheet.rotation_euler = (math.radians(-16), 0, 0)
    U.assign(sheet, U.principled('papier', lin('#CFC6AE'), rough=0.9))
    serif = 'C:/Windows/Fonts/georgiab.ttf'
    logo = U.text_obj('SUNO_cache', 'SUNO', 0.05, serif, extrude=0.002, coll='PIANO')
    logo.location = (0, 0.058, 0.81)
    logo.rotation_euler = (math.radians(90 - 12), 0, 0)
    logo.data.space_character = 1.25
    U.assign(logo, gold)
    side = U.text_obj('SUNO_flanc', 'SUNO', 0.16, serif, extrude=0.003, coll='PIANO')
    side.location = (-0.775, 0.95, 0.80)
    side.rotation_euler = (math.radians(90), 0, math.radians(-90))
    side.data.space_character = 1.35
    U.assign(side, gold)
    rail = U.box('feutre', (1.22, 0.012, 0.012), (0, -0.002, 0.728), 'PIANO')
    U.assign(rail, felt)
    # les 88 touches ; celles de la mélodie sont des objets animés (elles s'enfoncent et s'allument)
    xs, pitch = key_layout()
    hook_notes = sorted(set(e['note'] for e in U.events('touche', 'piano')))
    static_w, static_b = bmesh.new(), bmesh.new()
    keys = {}
    for m in range(21, 109):
        black = (m % 12) not in WHITE
        w = 0.0122 if black else pitch - 0.0012
        ln = 0.095 if black else 0.148
        h = 0.022 if black else 0.02
        y = (-0.10 if black else -0.15) + ln / 2
        z = 0.722 + (0.012 if black else 0.0)
        if m in hook_notes:
            k = U.box(f'touche_{m}', (w, ln, h), (0, 0, 0), 'PIANO')
            # pivot au fond de la touche : origine déplacée
            for v in k.data.vertices:            # pivot au fond de la touche
                v.co.y -= ln / 2
            k.location = (xs[m], y + ln / 2, z)
            U.assign(k, ebony if black else ivory)
            keys[m] = k
        else:
            tgt = static_b if black else static_w
            r = bmesh.ops.create_cube(tgt, size=1.0)
            for v in r['verts']:
                v.co.x = v.co.x * w + xs[m]
                v.co.y = v.co.y * ln + y
                v.co.z = v.co.z * h + z
    for bm, mat, nm in ((static_w, ivory, 'touches_blanches'), (static_b, ebony, 'touches_noires')):
        o = U.mesh_from_bmesh(nm, bm, 'PIANO', smooth_shade=False)
        U.assign(o, mat)
    # frappe des touches : enfoncée en 1 image, lueur qui retombe en 0,4 s, remontée en 0,2 s
    for e in U.events('touche', 'piano'):
        k = keys[e['note']]
        f = e['image']
        for ff, ang, glow in ((f - 1, 0.0, 0.0), (f, 3.2, 1.0), (f + 5, 3.0, 0.35), (f + 8, 0.0, 0.12),
                              (f + 14, 0.0, 0.0)):
            k.rotation_euler = (math.radians(ang), 0, 0)
            k.keyframe_insert('rotation_euler', frame=ff)
            k.color = (glow, 0, 0, 1)
            k.keyframe_insert('color', frame=ff)
    root = bpy.data.objects.new('piano', None)
    U.collection('PIANO').objects.link(root)
    for o in list(U.collection('PIANO').objects):
        if o is not root and o.parent is None:
            o.parent = root
    root.location = base_pos
    root.rotation_euler = (math.radians(2.5), math.radians(-3), math.radians(yaw + 28))
    root.scale = (1.12, 1.12, 1.12)
    # lumière : un rai chaud qui tombe sur le piano, et la lueur des touches
    U.light('rai_piano', 'SPOT', 1600.0, lin('#FFE2B8'), loc=tuple(base_pos + Vector((0.4, -0.6, 7.5))),
            size=0.3, spot=(24, 0.7), volume=1.2, shadow=True)
    U.light('face_piano', 'AREA', 420.0, lin('#CFF3F0'), loc=tuple(base_pos - d * 2.6 + Vector((0, 0, 2.6))),
            rot=(math.radians(48), 0, math.radians(yaw + 180)), size=2.5, volume=0.0, shadow=False)
    glow = U.light('lueur_touches', 'POINT', 0.0, lin('#BFFFF2'), loc=tuple(base_pos + Vector((0, 0, 1.05)) - d * 0.45),
                   size=0.3, volume=0.4, shadow=False)
    for e in U.events('touche', 'piano'):
        f = e['image']
        U.key(glow.data, f - 1, energy=0.0)
        U.key(glow.data, f, energy=60.0)
        U.key(glow.data, f + 6, energy=8.0)
    return root


def strings_material(gold):
    m, N, L = U.node_mat('cadre_cordes')
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    w = N.new('ShaderNodeTexWave')
    w.bands_direction = 'X'
    w.wave_profile = 'SAW'
    w.inputs['Scale'].default_value = 60.0
    L.new(tc, w.inputs['Vector'])
    lines = N.new('ShaderNodeMapRange')
    lines.inputs['From Min'].default_value, lines.inputs['From Max'].default_value = 0.88, 0.95
    L.new(w.outputs['Fac'], lines.inputs['Value'])
    c = U.mix_rgb(N, L, lines.outputs['Result'], lin('#B08A44'), lin('#E8E4DA'))
    L.new(c, b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = 0.3
    return m


# =====================================================================  5. COLONNES « II » (ElevenLabs) et ÉTINCELLE (Claude)
def build_columns():
    yaw = obj_yaw('colonnes') % 360
    d = direction(yaw)
    right = Vector((math.cos(math.radians(yaw)), math.sin(math.radians(yaw)), 0))
    base = d * 6.9 + Vector((0, 0, -35.0))
    CTX['ledge']('plateau_colonnes', tuple(base + Vector((0, 0, -0.24))), (2.4, 2.2, 1.0), yaw)
    m, N, L = U.node_mat('colonne_voix')
    b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.01, 0.012, 0.014, 1)
    b.inputs['Roughness'].default_value = 0.08
    b.inputs['Coat Weight'].default_value = 1.0
    b.inputs['Emission Color'].default_value = lin('#EAF6FF')
    gen = N.new('ShaderNodeTexCoord').outputs['Generated']
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(gen, sep.inputs[0])
    oi = N.new('ShaderNodeObjectInfo')
    sc = N.new('ShaderNodeSeparateColor')
    L.new(oi.outputs['Color'], sc.inputs[0])
    # niveau (canal vert de la couleur d'objet) : la lumière monte dans la colonne comme un VU-mètre
    below = U.math_node(N, L, 'LESS_THAN', sep.outputs['Z'], sc.outputs[1])
    lines = N.new('ShaderNodeTexWave')
    lines.bands_direction = 'Z'
    lines.inputs['Scale'].default_value = 12.0
    lines.inputs['Distortion'].default_value = 0.0
    L.new(gen, lines.inputs['Vector'])
    seg = N.new('ShaderNodeMapRange')
    seg.inputs['From Min'].default_value, seg.inputs['From Max'].default_value = 0.15, 0.25
    L.new(lines.outputs['Fac'], seg.inputs['Value'])
    L.new(U.math_node(N, L, 'MULTIPLY', U.math_node(N, L, 'MULTIPLY', below, seg.outputs['Result']),
                      U.math_node(N, L, 'MULTIPLY', sc.outputs[0], 9.0)), b.inputs['Emission Strength'])
    cols = []
    for k, sgn in enumerate((-1, 1)):
        c = U.box(f'colonne_{k}', (0.42, 0.42, 4.6), (0, 0, 0), 'COLONNES', bev=0.12)
        c.location = base + right * sgn * 0.52 + Vector((0, 0, 2.3))
        c.rotation_euler = (0, 0, math.radians(yaw))
        U.assign(c, m)
        cols.append(c)
    ev = U.ev1('choeur')
    f = ev['image']
    rnd = random.Random(3)
    for c in cols:
        frames = [(CTX['F0'], 0.0, 0.0), (f - 1, 0.0, 0.0)]
        for i in range(0, 34, 2):
            lvl = min(1.0, (i + 2) / 12.0) * rnd.uniform(0.62, 1.0) if i < 26 else max(0.0, 1.0 - (i - 26) / 8)
            frames.append((f + i, 1.0 if i < 30 else 0.4, lvl))
        frames.append((f + 40, 0.0, 0.0))
        for ff, inten, lvl in frames:
            c.color = (inten, lvl, 0, 1)
            c.keyframe_insert('color', frame=ff)
    lamp = U.light('lueur_colonnes', 'POINT', 0.0, lin('#DDF1FF'), loc=tuple(base + Vector((0, 0, 2.5)) - d * 0.8),
                   size=1.2, volume=1.0, shadow=False)
    U.key(lamp.data, f - 1, energy=0.0)
    U.key(lamp.data, f + 10, energy=600.0)
    U.key(lamp.data, f + 28, energy=480.0)
    U.key(lamp.data, f + 40, energy=60.0)
    return cols


def build_claude():
    yaw = obj_yaw('colonnes') % 360 + 22
    d = direction(yaw)
    pos = d * 5.7 + Vector((0, 0, -33.6))
    CTX['ledge']('rocher_claude', tuple(pos + Vector((0, 0, -0.65))), (1.3, 1.2, 0.9), yaw)
    rnd = random.Random(8)
    mat = obj_color_glow('etincelle_claude', lin('#D97757'), base=0.35, k=16.0, rough=0.55, sss=0.3,
                         emit_color=lin('#FF8A5C'))
    bm = bmesh.new()
    n = 12
    for k in range(n):
        a = 2 * math.pi * k / n + rnd.uniform(-0.08, 0.08)
        ln = rnd.uniform(0.42, 0.68)
        steps = 6
        prev = None
        for s in range(steps + 1):
            t = s / steps
            r = 0.09 + ln * t
            w = mix(0.055, 0.022, t)
            c = Vector((math.cos(a) * r, 0.04 * math.sin(t * 3) * (1 if k % 2 else -1), math.sin(a) * r))
            ring = bmesh.ops.create_circle(bm, cap_ends=False, radius=w, segments=8)['verts']
            rot = Matrix.Rotation(-a, 4, 'Y') @ Matrix.Rotation(math.radians(90), 4, 'Y')
            for v in ring:
                v.co = rot @ v.co + c
            if prev:
                for i in range(8):
                    bm.faces.new((prev[i], prev[(i + 1) % 8], ring[(i + 1) % 8], ring[i]))
            prev = ring
        tip = bm.verts.new(prev[0].co * 0 + Vector((math.cos(a) * (0.09 + ln + 0.03), 0, math.sin(a) * (0.09 + ln + 0.03))))
        for i in range(8):
            bm.faces.new((prev[i], prev[(i + 1) % 8], tip))
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.14)
    o = U.mesh_from_bmesh('claude', bm, 'CLAUDE')
    U.subsurf(o, 1)
    o.location = pos
    o.rotation_euler = (math.radians(12), 0, math.radians(yaw))
    U.assign(o, mat)
    ev = U.ev1('etincelle_claude')
    f = ev['image']
    glow_keys(o, [(CTX['F0'], 0.0), (f - 1, 0.0), (f, 1.0), (f + 18, 0.18), (f + 60, 0.1)])
    o.keyframe_insert('scale', frame=f - 1)
    o.scale = (1.12, 1.12, 1.12)
    o.keyframe_insert('scale', frame=f + 2)
    o.scale = (1.0, 1.0, 1.0)
    o.keyframe_insert('scale', frame=f + 14)
    lamp = U.light('lueur_claude', 'POINT', 0.0, lin('#FF9A62'), loc=tuple(pos - d * 0.7 + Vector((0, 0, 0.2))),
                   size=0.4, volume=1.2, shadow=False)
    U.key(lamp.data, f - 1, energy=8.0)
    U.key(lamp.data, f, energy=520.0)
    U.key(lamp.data, f + 20, energy=60.0)
    return o


# =====================================================================  6. STATION (Mistral, Meta, OpenAI)
def build_station():
    yaw = CTX['yaw']['station'] % 360          # 90° : la station est vers −X
    zc = CTX['station_z']
    hatch_x = -CTX['hatch_dist']
    length, radius = 9.0, 2.2
    x_front, x_back = hatch_x - 0.55, hatch_x - 0.55 - length
    hull_mat = U.metal_rust('coque_station', paint=(0.045, 0.05, 0.055), rust=(0.12, 0.05, 0.02), scale=0.6,
                            rust_amount=0.5)
    add_sonar_to(hull_mat)
    dark = U.metal_rust('acier_sombre', paint=(0.03, 0.035, 0.04), scale=2.0, rust_amount=0.5)
    add_sonar_to(dark)
    hull = U.cylinder('coque', radius, length, 64, loc=((x_front + x_back) / 2, 0, zc), rot=(0, math.radians(90), 0),
                      coll='STATION', cap=False)
    U.assign(hull, hull_mat)
    for xe, sgn in ((x_front, 1), (x_back, -1)):
        cap = U.uvsphere('calotte', radius, 64, 32, coll='STATION')
        cap.location = (xe, 0, zc)
        cap.scale = (0.32, 1, 1)
        U.assign(cap, hull_mat)
        bm = bmesh.new()
        bm.from_mesh(cap.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x * sgn < -0.001], context='VERTS')
        bm.to_mesh(cap.data)
        bm.free()
    for k in range(9):
        x = x_back + 0.5 + k * (length - 1.0) / 8
        rib = bpy.data.meshes.new('nervure')
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=False, radius=radius + 0.06, segments=64)
        bm.to_mesh(rib)
        bm.free()
        ro = U.new_obj('nervure', rib, 'STATION')
        ro.location = (x, 0, zc)
        ro.rotation_euler = (0, math.radians(90), 0)
        ro.modifiers.new('fil', 'WIREFRAME').thickness = 0.12
        U.assign(ro, dark)
    # hublots latéraux (lumière chaude : il y a de la vie à l'intérieur)
    warm = U.emission('hublot_chaud', lin('#FFC27A'), 9.0)
    for k in range(4):
        x = x_back + 1.6 + k * 1.9
        for sgn in (-1, 1):
            g = U.cylinder('vitre', 0.24, 0.06, 24, loc=(x, sgn * (radius + 0.01), zc + 0.35),
                           rot=(math.radians(90), 0, 0), coll='STATION')
            U.assign(g, warm)
            rim = bpy.data.meshes.new('cerclage')
            bm = bmesh.new()
            bmesh.ops.create_circle(bm, cap_ends=False, radius=0.27, segments=24)
            bm.to_mesh(rim)
            bm.free()
            r = U.new_obj('cerclage', rim, 'STATION')
            r.location = (x, sgn * (radius + 0.03), zc + 0.35)
            r.rotation_euler = (math.radians(90), 0, 0)
            r.modifiers.new('fil', 'WIREFRAME').thickness = 0.06
            U.assign(r, dark)
            U.light('hublot_lumiere', 'POINT', 25.0, lin('#FFB765'), loc=(x, sgn * (radius + 0.5), zc + 0.35),
                    size=0.3, volume=1.5, shadow=False)
    # patins
    for sgn in (-1, 1):
        sk = U.box('patin', (length * 0.95, 0.25, 0.3), ((x_front + x_back) / 2, sgn * 1.35, zc - radius - 0.45),
                   'STATION', bev=0.04)
        U.assign(sk, dark)
        for k in range(4):
            leg = U.box('jambe', (0.18, 0.18, 0.7), (x_back + 1.2 + k * 2.3, sgn * 1.25, zc - radius + 0.05), 'STATION')
            U.assign(leg, dark)
    # tourelle, antenne et feu rouge, projecteurs (cônes visibles dans l'eau)
    tower = U.cylinder('tourelle', 0.8, 1.0, 32, loc=(x_front - 3.0, 0, zc + radius + 0.35), coll='STATION')
    U.assign(tower, hull_mat)
    mast = U.cylinder('antenne', 0.035, 2.6, 8, loc=(x_front - 3.2, 0.3, zc + radius + 2.0), coll='STATION')
    U.assign(mast, dark)
    red = obj_color_glow('feu_rouge', lin('#FF2A1F'), base=0.0, k=30.0)
    beacon = U.uvsphere('feu', 0.07, 12, 6, loc=(x_front - 3.2, 0.3, zc + radius + 3.3), coll='STATION')
    U.assign(beacon, red)
    for f in range(CTX['F0'], CTX['F1'] + 1, 24):
        glow_keys(beacon, [(f, 1.0), (f + 4, 0.0)])
    for sgn in (-1, 1):
        U.light('projecteur_station', 'SPOT', 4200.0, lin('#E9F2FF'),
                loc=(x_front - 0.6, sgn * 1.1, zc + radius + 0.15),
                rot=(math.radians(28), 0, math.radians(-90 + sgn * 18)), size=0.15, spot=(38, 0.35), volume=2.2,
                shadow=False)
    U.light('face_station', 'POINT', 380.0, lin('#CFE7F2'), loc=(x_front + 4.5, 1.5, zc + 2.0), size=1.0, volume=0.2,
            shadow=False)
    build_mistral_panel(x_front, zc, radius)
    build_meta_cable(hatch_x, zc)
    build_hatch(x_front, zc, radius, dark)
    # câbles qui partent de la station vers les parois et remontent (les données)
    cable_mat = U.principled('cable', (0.012, 0.012, 0.014, 1), rough=0.5)
    rnd = random.Random(4)
    for k in range(6):
        a = math.radians(rnd.uniform(120, 240))
        end = Vector((math.cos(a) * 22, math.sin(a) * 22, CTX['floor'] + rnd.uniform(4, 16)))
        start = Vector((x_back + rnd.uniform(0.5, 3.0), rnd.uniform(-1, 1), CTX['floor'] + 0.2))
        mid = (start + end) / 2
        mid.z = CTX['floor'] + 0.3
        c = U.curve_tube('cable_donnees', [tuple(start), tuple(start.lerp(mid, 0.5)), tuple(mid), tuple(end)],
                         0.07, coll='STATION')
        c.data.materials.append(cable_mat)
    return hull


def add_sonar_to(mat, factor=0.3):
    """la station renvoie moins l'onde que la roche (sinon la coque devient verte quand on s'approche)"""
    nt = mat.node_tree
    b = nt.nodes['Principled BSDF']
    U.add_sonar(nt.nodes, nt.links, b, CTX['sonar'], factor)


def build_mistral_panel(x_front, zc, radius):
    """panneau de LED en « M » pixelisé (dégradé jaune → rouge), sur le dessus de la coque, côté caméra"""
    pattern = ['X...X', 'XX.XX', 'XXXXX', 'X.X.X', 'X...X']
    colors = ['#FFD800', '#FFAF00', '#FF8205', '#FA500F', '#E10500']
    leds = U.events('led', 'mistral')
    panel = U.box('panneau_led', (1.5, 1.5, 0.06), (0, 0, 0), 'STATION', bev=0.02)
    U.assign(panel, U.principled('panneau', (0.01, 0.01, 0.012, 1), rough=0.4))
    cx, cz = x_front - 1.5, zc + radius + 0.06
    panel.location = (cx, 0, cz)
    panel.rotation_euler = (0, math.radians(18), 0)
    rot = panel.rotation_euler.to_matrix()
    k = 0
    for r, row in enumerate(pattern):
        for c, ch in enumerate(row):
            if ch != 'X':
                continue
            mat = obj_color_glow(f'led_{r}', lin(colors[r]), base=1.2, k=16.0, rough=0.3)
            px = U.box(f'led_{r}_{c}', (0.24, 0.24, 0.05), (0, 0, 0), 'STATION', bev=0.01)
            local = Vector(((r - 2) * 0.27, (c - 2) * 0.27, 0.05))
            px.location = Vector((cx, 0, cz)) + rot @ local
            px.rotation_euler = panel.rotation_euler
            U.assign(px, mat)
            # arpège : chaque LED s'allume sur sa note (8 notes, réparties sur les pixels)
            e = leds[k % len(leds)]
            glow_keys(px, [(CTX['F0'], 0.0), (e['image'] - 1, 0.0), (e['image'], 1.0), (e['image'] + 6, 0.25),
                           (CTX['F1'], 0.25)])
            k += 1
    U.light('lueur_led', 'POINT', 120.0, lin('#FF8A1A'), loc=(cx + 0.6, 0, cz + 0.8), size=0.6, volume=1.0,
            shadow=False)


def build_meta_cable(hatch_x, zc):
    """câble posé au sol en forme de ∞, qu'une lumière bleue parcourt sur l'évènement « boucle »"""
    fz = CTX['floor'] + 0.12
    cx, cy = hatch_x + 3.4, 2.9
    pts = []
    for k in range(48):
        t = 2 * math.pi * k / 48
        s = math.sin(t)
        x = 2.2 * math.cos(t) / (1 + s * s)
        y = 2.2 * math.sin(t) * math.cos(t) / (1 + s * s)
        pts.append((cx + x * 1.2, cy + y * 1.4, fz + 0.05 * math.sin(3 * t)))
    smooth_pts = catmull(pts, n_per=4, closed=True)
    o = U.tube_mesh('cable_infini', smooth_pts, 0.11, closed=True, seg=12, coll='STATION')
    m, N, L = U.node_mat('cable_infini')
    b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.015, 0.016, 0.02, 1)
    b.inputs['Roughness'].default_value = 0.45
    b.inputs['Emission Color'].default_value = lin('#1877F2')
    uvn = N.new('ShaderNodeUVMap')
    uvn.uv_map = 'long'
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(uvn.outputs['UV'], sep.inputs[0])
    head = N.new('ShaderNodeValue')
    head.label = 'tete'
    head.outputs[0].default_value = -1.0
    # distance (cyclique) au point lumineux qui parcourt la boucle
    diff = U.math_node(N, L, 'SUBTRACT', sep.outputs['X'], head.outputs[0])
    wrapped = U.math_node(N, L, 'FRACT', diff)
    trail = U.math_node(N, L, 'POWER', U.math_node(N, L, 'SUBTRACT', 1.0, wrapped), 6.0)
    alive = N.new('ShaderNodeValue')
    alive.label = 'intensite'
    alive.outputs[0].default_value = 0.0
    L.new(U.math_node(N, L, 'MULTIPLY', trail, alive.outputs[0]), b.inputs['Emission Strength'])
    o.data.materials.append(m)
    e = U.ev1('boucle')
    f = e['image']
    head.outputs[0].keyframe_insert('default_value', frame=f)
    head.outputs[0].default_value = 2.0                     # deux tours en 1,6 s
    head.outputs[0].keyframe_insert('default_value', frame=f + 48)
    for ff, v in ((CTX['F0'], 0.0), (f - 1, 0.0), (f, 26.0), (f + 48, 18.0), (f + 60, 3.0)):
        alive.outputs[0].default_value = v
        alive.outputs[0].keyframe_insert('default_value', frame=ff)
    U.interp(m.node_tree, 'LINEAR')
    lamp = U.light('lueur_infini', 'POINT', 0.0, lin('#2F7BFF'), loc=(cx, cy, fz + 0.6), size=1.5, volume=1.0,
                   shadow=False)
    U.key(lamp.data, f - 1, energy=0.0)
    U.key(lamp.data, f + 4, energy=300.0)
    U.key(lamp.data, f + 60, energy=20.0)
    return o


def knot_outline():
    """fleur hexagonale à 6 maillons entrelacés (évocation) : contour d'un maillon arrondi"""
    pts = []
    for k in range(40):
        a = 2 * math.pi * k / 40
        x = 0.30 * math.cos(a)
        y = 0.12 * math.sin(a)
        pts.append(Vector((x + 0.17, y, 0)))
    return pts


def build_hatch(x_front, zc, radius, dark):
    """hublot-sas (évocation OpenAI) : porte ronde, fleur à 6 maillons en relief, volant central"""
    hx = x_front + 0.32 * radius + 0.02
    brass = U.principled('laiton_sas', lin('#9C8B6A'), rough=0.3, metal=1.0)
    door_mat = U.metal_rust('porte_sas', paint=(0.07, 0.08, 0.085), rust=(0.14, 0.06, 0.02), scale=3.0,
                            rust_amount=0.55)
    add_sonar_to(door_mat)
    root = bpy.data.objects.new('sas', None)
    U.collection('STATION').objects.link(root)
    # charnière à gauche (vue caméra : la caméra regarde vers −X ; sa gauche est −Y)
    root.location = (hx, -0.95, zc)
    door = U.cylinder('porte', 0.92, 0.14, 64, loc=(0, 0.95, 0), rot=(0, math.radians(90), 0), coll='STATION')
    U.bevel(door, 0.03, 3)
    U.assign(door, door_mat)
    door.parent = root
    links = []
    for k in range(6):
        ln = extrude_outline(f'maillon_{k}', knot_outline(), 0.0, 0.05, 'STATION')
        U.bevel(ln, 0.015, 2)
        ln.location = (0.075, 0.95, 0)
        ln.rotation_mode = 'ZYX'                 # d'abord tourner dans le plan (60° × k), puis poser sur la porte
        ln.rotation_euler = (0, math.radians(90), math.radians(60 * k + 15))
        U.assign(ln, brass)
        ln.parent = root
        links.append(ln)
    wheel = bpy.data.objects.new('volant', None)
    U.collection('STATION').objects.link(wheel)
    wheel.parent = root
    wheel.location = (0.17, 0.95, 0)
    ring = bpy.data.meshes.new('volant_anneau')
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=0.22, segments=32)
    bm.to_mesh(ring)
    bm.free()
    ro = U.new_obj('volant_anneau', ring, 'STATION')
    ro.modifiers.new('fil', 'WIREFRAME').thickness = 0.035
    ro.rotation_euler = (0, math.radians(90), 0)
    U.assign(ro, dark)
    ro.parent = wheel
    for k in range(3):
        sp = U.box('rayon_volant', (0.03, 0.44, 0.03), (0, 0, 0), 'STATION')
        sp.rotation_euler = (math.radians(60 * k), 0, 0)
        U.assign(sp, dark)
        sp.parent = wheel
    # cadre épais et boulons autour du sas (fixes sur la coque)
    frame = bpy.data.meshes.new('cadre_sas')
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=1.07, segments=64)
    bm.to_mesh(frame)
    bm.free()
    fo = U.new_obj('cadre_sas', frame, 'STATION')
    fo.modifiers.new('fil', 'WIREFRAME').thickness = 0.17
    fo.location = (hx - 0.05, 0, zc)
    fo.rotation_euler = (0, math.radians(90), 0)
    U.assign(fo, dark)
    for k in range(16):
        a = 2 * math.pi * k / 16
        bo = U.cylinder('boulon', 0.035, 0.07, 8, loc=(hx + 0.05, 1.07 * math.cos(a), zc + 1.07 * math.sin(a)),
                        rot=(0, math.radians(90), 0), coll='STATION')
        U.assign(bo, brass)
    for sgn in (-1, 1):
        pipe = U.cylinder('tuyau', 0.06, 3.2, 12, loc=(hx - 0.2, sgn * 1.45, zc - 0.1), coll='STATION')
        U.assign(pipe, dark)
    # bord de la porte : la lumière de l'intérieur filtre (fin anneau lumineux)
    leak = bpy.data.meshes.new('fuite')
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=0.94, segments=64)
    bm.to_mesh(leak)
    bm.free()
    lo = U.new_obj('fuite_lumiere', leak, 'STATION')
    lo.modifiers.new('fil', 'WIREFRAME').thickness = 0.025
    lo.location = (hx - 0.03, 0, zc)
    lo.rotation_euler = (0, math.radians(90), 0)
    leak_mat = obj_color_glow('fuite_sas', (1, 1, 1, 1), base=3.0, k=40.0, emit_color=lin('#FFF4E0'))
    U.assign(lo, leak_mat)
    # intérieur éblouissant derrière la porte
    inner = U.cylinder('interieur', 0.9, 0.05, 48, loc=(hx - 0.25, 0, zc), rot=(0, math.radians(90), 0),
                       coll='STATION')
    U.assign(inner, U.emission('interieur_sas', lin('#FFF7EA'), 60.0))
    # « trappe » : le volant tourne d'un quart de tour ; « sas » : la porte s'ouvre et la lumière jaillit
    t1, t2 = U.ev1('trappe')['image'], U.ev1('sas')['image']
    for ff, ang in ((CTX['F0'], 0.0), (t1 - 1, 0.0), (t1 + 5, 100.0), (t1 + 9, 90.0)):
        wheel.rotation_euler = (math.radians(ang), 0, 0)
        wheel.keyframe_insert('rotation_euler', frame=ff)
    for ff, ang in ((CTX['F0'], 0.0), (t2 - 3, 0.0), (t2 + 2, 70.0), (t2 + 8, 105.0)):
        root.rotation_euler = (0, 0, math.radians(-ang))
        root.keyframe_insert('rotation_euler', frame=ff)
    glow_keys(lo, [(CTX['F0'], 0.0), (t1 - 1, 0.0), (t1 + 2, 0.5), (t1 + 12, 0.15), (t2 - 4, 0.3), (t2, 1.0)])
    burst = U.light('jaillissement', 'AREA', 0.0, lin('#FFF4E2'), loc=(hx - 0.35, 0, zc),
                    rot=(0, math.radians(-90), 0), size=1.8, volume=3.0, shadow=False)
    U.key(burst.data, t2 - 3, energy=0.0)
    U.key(burst.data, t2 + 3, energy=60000.0)
    return root


# =====================================================================  assemblage
def build_all(sc, cam_state, obj_yaw, build_ledge, floor, station_z, hatch_dist, sonar, only=None):
    CTX.update(cam_state=cam_state, yaw=obj_yaw, ledge=build_ledge, floor=floor, station_z=station_z,
               hatch_dist=hatch_dist, sonar=sonar, F0=sc.frame_start, F1=sc.frame_end)
    todo = [('bouee', build_buoy), ('baleine', build_whale), ('voilier', build_sailboat),
            ('gemini', build_gemini_stars), ('piano', build_piano), ('colonnes', build_columns),
            ('claude', build_claude), ('station', build_station)]
    for name, fn in todo:
        if only and name not in only:
            continue
        print('OBJET', name, flush=True)
        fn()
