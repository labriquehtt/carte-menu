"""Étang sous la lune (P1, P2, P7) :

  blender -b --factory-startup -P blender/etang.py -- --plan P1 [--quality anim|final] [--step 2]

1024 feuilles de nénuphar tirées au hasard (graine fixe), triées par distance à un coin : la zone couverte
grandit en tache. Elles sont groupées par doublement (paquet k = 2^(k-1) feuilles) ; le paquet k apparaît le
jour 20 + k (avant le jour 20, moins d'une feuille : rien à voir). Le fil vert borde la zone couverte (une
courbe par jour, affichée le bon jour). Le panneau « JOUR n » est un panneau vierge : le chiffre est écrit
en 2D par le compositing, à la position exportée dans anchor.json (sign_x, sign_y).
"""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun as C   # noqa: E402

opt = C.args()
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PID = a[a.index('--plan') + 1] if '--plan' in a else 'P1'
sc, P = C.reset(PID)
K = C.TIMING['keys']
F = C.f

R_POND = 10.0
SEED = (-R_POND * 0.62, -R_POND * 0.35)
N = 1024
rng = random.Random(30)
pads = []
while len(pads) < N:
    ang, d = rng.random() * 2 * math.pi, (R_POND - 0.45) * math.sqrt(rng.random())
    pads.append((d * math.cos(ang), d * math.sin(ang), rng.uniform(0.34, 0.46), rng.random() * 2 * math.pi))
pads.sort(key=lambda p: (p[0] - SEED[0]) ** 2 + (p[1] - SEED[1]) ** 2)


def covered_radius(n):
    """rayon (depuis SEED) qui contient les n premières feuilles"""
    p = pads[max(0, min(N, n) - 1)]
    return math.hypot(p[0] - SEED[0], p[1] - SEED[1]) + p[2]


# ---------------- décor ----------------
water = C.toon('eau', C.hexcol('10254A'), 0.6)
bank = C.toon('berge', C.hexcol('2B3B2A'))
pad_m = C.toon('nenuphar', C.hexcol('2FBF6A'))
wood = C.toon('bois', C.hexcol('8B6139'))
reed_m = C.toon('roseau', C.hexcol('3E5A2E'))
tree_m = C.toon('arbre', C.hexcol('16241C'), 0.7)
fil = C.mat('fil_vert', C.GREEN, emission=6.0)
moon_m = C.mat('lune', C.hexcol('FFF3C4'), emission=4.0)
glow_m = C.mat('luciole', C.GREEN, emission=10.0)

import nature as NA   # noqa: E402

C.cyl('eau', (0, 0, -0.02), R_POND + 0.6, 0.04, water, verts=128)
NA.sol('sol', 60, C.toon('sol_mousse', C.hexcol('1C2A1C')))
C.sphere('lune', (-30, 70, 38), 5, moon_m)
NA.ciel(260, rng, C.mat('etoile', C.hexcol('FFFFFF'), emission=6.0))
needles = C.toon('aiguilles', C.hexcol('1E3A2A'), 0.7)
bark = C.toon('ecorce', C.hexcol('3A2A1E'))
for i in range(34):                                     # forêt de sapins autour de l'étang
    ang = i / 34 * 2 * math.pi + rng.uniform(-0.08, 0.08)
    d = rng.uniform(14.5, 24)
    NA.sapin(f'sapin{i}', (d * math.cos(ang), d * math.sin(ang), max(0.0, (d - 11.5) * 0.18) - 0.1), rng.uniform(6, 11), rng, needles, bark)
rock_m = C.toon('roche', C.hexcol('4A4E55'))
for i in range(22):                                     # rochers sur la berge
    ang = rng.random() * 2 * math.pi
    d = R_POND + rng.uniform(0.4, 2.2)
    NA.rocher(f'rocher{i}', (d * math.cos(ang), d * math.sin(ang), 0.0), rng.uniform(0.25, 0.8), rock_m, rng)
cattail = C.toon('epi', C.hexcol('5A3A22'))
for i in range(110):                                    # massettes au bord de l'eau, qui ondulent
    ang = rng.random() * 2 * math.pi
    d = R_POND + rng.uniform(-0.3, 1.4)
    o = NA.massette(f'roseau{i}', (d * math.cos(ang), d * math.sin(ang), 0), rng.uniform(0.9, 2.0), reed_m, cattail, rng)
    base = o.rotation_euler.copy()
    for fr in range(sc.frame_start, sc.frame_end + 1, 20):
        o.rotation_euler = (base.x + 0.06 * math.sin(fr * 0.09 + i), base.y + 0.04 * math.cos(fr * 0.07 + i), 0)
        o.keyframe_insert('rotation_euler', frame=fr)
petal = C.toon('petale', C.hexcol('F2C6D8'), 0.8)
heart = C.mat('coeur', C.YELLOW, emission=0.6)

for i in range(18):                                     # lucioles
    s = C.sphere(f'luciole{i}', (rng.uniform(-9, 9), rng.uniform(-9, 9), rng.uniform(0.6, 2.2)), 0.05, glow_m, seg=8)
    for fr in range(sc.frame_start, sc.frame_end + 1, 15):
        s.location.x += rng.uniform(-0.4, 0.4)
        s.location.y += rng.uniform(-0.4, 0.4)
        s.keyframe_insert('location', frame=fr)

# ---------------- nénuphars par paquets de doublement ----------------
buckets = []
for k in range(11):
    lo, hi = (0, 1) if k == 0 else (2 ** (k - 1), 2 ** k)
    verts, faces = [], []
    for (x, y, r, rot) in pads[lo:hi]:
        c0 = len(verts)
        verts.append((x, y, 0.02))
        for j in range(14):
            a2 = rot + j / 14 * 2 * math.pi * 0.93          # l'encoche de la feuille
            verts.append((x + r * math.cos(a2), y + r * math.sin(a2), 0.02))
        for j in range(13):
            faces.append((c0, c0 + 1 + j, c0 + 2 + j))
    me = bpy.data.meshes.new(f'nenuphars{k}')
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(f'nenuphars{k}', me)
    sc.collection.objects.link(o)
    o.data.materials.append(pad_m)
    C.link(o)
    buckets.append(o)


def day_at(t):
    """jour affiché à l'instant t (P1 : 1 → 20 en éclair, puis un jour par doublement ; P2 : 29 puis 25 ; P7 : ??)"""
    d = K['doublements_P1']
    if t < d[0]:
        return 1 + 19 * max(0.0, min(1.0, (t - 0.2) / max(0.1, d[0] - 0.4)))
    if t < K['moitie'] - 0.35:
        return 20 + sum(1 for x in d if x <= t)
    if t < K['cinq_jours']:
        return 29
    if t < K['cinq_jours'] + 0.7:                     # rembobinage 29 → 25
        return 29 - 4 * (t - K['cinq_jours']) / 0.7
    return 25


def visible(k, day):
    return day >= 20 + k


for fr in range(sc.frame_start, sc.frame_end + 1):
    t = fr / C.FPS
    day = day_at(t)
    for k, o in enumerate(buckets):
        s = 1.0 if visible(k, int(day)) else 0.0
        if o.get('last') != s:
            o.scale = (1, 1, 1) if s else (0.001, 0.001, 0.001)
            o.keyframe_insert('scale', frame=fr)
            if s and fr > sc.frame_start:                 # petit « pop » d'apparition
                o.scale = (0.001, 0.001, 0.001)
                o.keyframe_insert('scale', frame=fr - 1)
                o.scale = (1, 1, 1)
            o['last'] = s
    for o in buckets:
        C.ease_all(o, 'CONSTANT')
for i, idx in enumerate((0, 2, 5, 9, 14, 21, 30, 41, 55, 90, 140, 230, 400, 700)):   # fleurs, portées par leur feuille
    x, y, r, _ = pads[idx]
    k = 0 if idx == 0 else int(math.log2(idx)) + 1
    for o in NA.fleur(f'fleur{i}', (x + 0.08, y + 0.05, 0.02), petal, heart, rng):
        o.parent = buckets[k]          # la feuille est à l'origine, sans rotation : pas de matrice inverse

# fil vert : bord de la zone couverte, un anneau par jour (20 → 30)
rings = {}
for day in range(20, 31):
    n = 2 ** (day - 20)
    r = covered_radius(n)
    pts = []
    for j in range(121):
        a2 = j / 120 * 2 * math.pi
        x, y = SEED[0] + r * math.cos(a2), SEED[1] + r * math.sin(a2)
        d = math.hypot(x, y)
        if d > R_POND - 0.15:                             # rabattu sur le bord de l'étang
            x, y = x / d * (R_POND - 0.15), y / d * (R_POND - 0.15)
        pts.append((x, y, 0.06))
    rings[day] = C.curve_from_points(f'fil{day}', pts, 0.045, fil)
for fr in range(sc.frame_start, sc.frame_end + 1):
    day = int(day_at(fr / C.FPS))
    for d2, o in rings.items():
        s = 1.0 if d2 == min(30, max(20, day)) else 0.0
        if o.get('last') != s:
            o.scale = (1, 1, 1) if s else (0.001, 0.001, 0.001)
            o.keyframe_insert('scale', frame=fr)
            o['last'] = s
for o in rings.values():
    C.ease_all(o, 'CONSTANT')

# ---------------- barque, robot, panneau ----------------
r29 = covered_radius(512)
bx, by = SEED[0] + r29 * math.cos(0.55), SEED[1] + r29 * math.sin(0.55)   # la barque est sur la frontière du jour 29
boat = NA.barque('barque', (bx, by, 0.2), wood)
boat.rotation_euler.z = 0.55
anchor = C.empty('ROBOT_ANCHOR', (bx, by, 0.3))
anchor['robot_scale'] = 1.0
anchor.parent = boat
anchor.location = (0, 0, -0.05)   # pieds du robot assis au fond de la barque
boat.keyframe_insert('location', frame=sc.frame_start)
jf = F(K['jour30'])
if sc.frame_start <= jf <= sc.frame_end:                 # la barque est soulevée par les feuilles, puis retombe
    boat.keyframe_insert('location', frame=jf - 2)
    boat.location.z = 0.6
    boat.rotation_euler.x = 0.18
    boat.keyframe_insert('location', frame=jf + 4)
    boat.keyframe_insert('rotation_euler', frame=jf + 4)
    boat.location.z = 0.25
    boat.rotation_euler.x = -0.05
    boat.keyframe_insert('location', frame=jf + 14)
    boat.keyframe_insert('rotation_euler', frame=jf + 14)

sx, sy = R_POND * 0.55, R_POND * 0.92
C.box('poteau', (sx, sy, 0.9), (0.14, 0.14, 1.8), wood)
sign = C.box('panneau', (sx, sy, 1.8), (1.6, 0.12, 0.7), wood, bevel=0.05)
sign.rotation_euler.z = math.radians(-12)
sign_pt = C.empty('SIGN_ANCHOR', (sx, sy - 0.08, 1.8))
if PID == 'P2':                                          # le panneau pivote à chaque rembobinage
    for t0 in (P['start'], K['cinq_jours']):
        fr = F(t0)
        sign.keyframe_insert('rotation_euler', frame=fr)
        sign.rotation_euler.z += math.radians(360)
        sign.keyframe_insert('rotation_euler', frame=fr + 9)

# premier plan : roseaux qui passent devant le robot
fg_m = C.toon('roseau_fg', C.hexcol('2E4622'))
for i in range(9):
    h = rng.uniform(1.2, 2.2)
    C.cyl(f'roseau_fg{i}', (bx - 1.2 + i * 0.3, by - 1.6 + rng.uniform(-0.2, 0.2), h / 2), 0.035, h, fg_m, collection='FG', verts=6)

C.sun(1.6 if C.QUALITY != 'final' else 4.5, color=(0.62, 0.72, 1.0))
if C.QUALITY == 'final':
    C.FOG.update(fog=0.05, fog_color=(0.55, 0.62, 0.9), fog_box=((0, 0, 1.2), (44, 44, 2.4)))
    C.world_sky(sc, strength=1.5)                             # ciel de nuit en dégradé (éclaire aussi les ombres)
    lamp = bpy.data.lights.new('lanterne', 'POINT')           # lanterne chaude sur la barque (touche jaune)
    lamp.energy, lamp.color, lamp.shadow_soft_size = 35, (1.0, 0.78, 0.35), 0.15
    lo = bpy.data.objects.new('lanterne', lamp)
    sc.collection.objects.link(lo)
    lo.parent = boat
    lo.location = (0.55, 0.2, 0.9)
    rim = bpy.data.lights.new('contre', 'AREA')                # contre-jour lunaire sur l'eau
    rim.energy, rim.size, rim.color = 900, 12, (0.55, 0.65, 1.0)
    ro = bpy.data.objects.new('contre', rim)
    sc.collection.objects.link(ro)
    ro.location = (-25, 55, 20)
    C.look_at(ro, (0, 0, 0))
cam = C.camera(lens=24 if PID != 'P7' else 50)

# ---------------- caméras ----------------
s0, s1 = sc.frame_start, sc.frame_end
def orbit(u, a0, a1, r0, r1, h, target):
    """point sur une spirale autour de la cible"""
    ang = math.radians(a0 + (a1 - a0) * u)
    r = r0 + (r1 - r0) * u
    return (target[0] + r * math.sin(ang), target[1] - r * math.cos(ang), h), target


if PID == 'P1':
    # au ras de l'eau contre la barque → montée en spirale ; la HAUTEUR DOUBLE comme les nénuphars (0,35 m → 24 m)
    def cam_p1(fr):
        u = C.smooth((fr - s0) / max(1, jf - s0)) if fr <= jf else 1.0
        tgt = (bx * (1 - u) + 0.0 * u, by * (1 - u) + 0.5 * u, 0.7 * (1 - u))
        h = 0.35 * 2 ** (6.1 * u)
        loc, _ = orbit(u, -35, 20, 2.4, 5.0, h, tgt)
        drift = max(0, fr - jf) / 30
        loc = (loc[0] + 0.3 * drift, loc[1], loc[2] + 1.2 * drift)
        return loc, tgt, 16 + 8 * u, -8 * (1 - u)
    C.cam_path(cam, range(s0, s1 + 1), cam_p1)
elif PID == 'P2':
    # rembobinage : la caméra tourne à l'envers ; « cinq jours avant » : piqué sur la petite tache
    fc = F(K['cinq_jours'])
    patch = (SEED[0] + 0.8, SEED[1] + 0.6, 0.0)
    def cam_p2(fr):
        rew = C.smooth((fr - s0) / 12)
        if fr < fc:
            loc, tgt = orbit(0, 20 - 45 * rew, 0, 5.0, 5.0, 25.5 - 1.5 * rew, (0, 0.5, 0))
            return loc, tgt, 24, 4 * math.sin(fr * 0.8) * (1 - rew)
        u = C.smooth((fr - fc) / max(1, s1 - fc - 8))
        tgt = (patch[0] * u, 0.5 * (1 - u) + patch[1] * u, 0)
        h = 24 * 2 ** (-2.1 * u)
        loc, _ = orbit(u, -25, -110, 5.0, 3.2, h, tgt)
        return loc, tgt, 24 - 4 * u, -10 * u
    C.cam_path(cam, range(s0, s1 + 1), cam_p2)
    boat.keyframe_insert('location', frame=fc + 10)
    boat.location = (SEED[0] + covered_radius(32) + 0.9, SEED[1] + 0.3, 0.2)
    boat.keyframe_insert('location', frame=fc + 11)
    C.ease_all(boat, 'CONSTANT')
else:
    # P7 : gros plan bas sur l'eau qui avance doucement (la loupe et « JOUR ?? » sont en 2D)
    C.cam_path(cam, range(s0, s1 + 1), lambda fr: ((bx - 0.6 + 0.2 * (fr - s0) / 40, by - 3.2 + 0.8 * (fr - s0) / 40, 1.0),
                                                   (bx, by, 0.95), 45 + 10 * (fr - s0) / 40, 2 * math.sin(fr * 0.1)))

def extra(fr):
    from bpy_extras.object_utils import world_to_camera_view
    p = world_to_camera_view(sc, sc.camera, sign_pt.matrix_world.translation)
    t = fr / C.FPS
    return {'sign_x': round(p.x * 1080, 1), 'sign_y': round((1 - p.y) * 1920, 1), 'sign_z': round(p.z, 2),
            'day': round(day_at(t), 2) if PID != 'P7' else None}


C.ANCHOR_EXTRA = extra
C.render(sc, PID, opt)
