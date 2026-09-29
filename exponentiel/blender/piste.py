"""La piste néon (le fil vert devenu exponentielle) : P3 sortie de l'étang, P4 labo, P5 la piste se cabre, P6 aiguillage.

  blender -b --factory-startup -P blender/piste.py -- --plan P3 [--quality anim|final] [--step 2]

Le robot surfe sur une feuille de nénuphar le long de la piste : son abscisse u(t) accélère en exponentielle.
Les textes qui changent (calendrier, fiche OpenAI) sont écrits en 2D par le compositing, aux positions
exportées dans anchor.json ; les panneaux METR (texte fixe) sont en 3D.
"""
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun as C   # noqa: E402
from mathutils import Vector   # noqa: E402

opt = C.args()
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PID = a[a.index('--plan') + 1] if '--plan' in a else 'P3'
sc, P = C.reset(PID)
K = C.TIMING['keys']
F = C.f
s0, s1 = sc.frame_start, sc.frame_end
T0, T1 = P['start'], P['end']
rng = random.Random({'P3': 3, 'P4': 4, 'P5': 5, 'P6': 6}[PID])

fil = C.mat('fil_vert', C.GREEN, emission=8.0)
glow_y = C.mat('jaune', C.YELLOW, emission=5.0)
white = C.mat('blanc', C.hexcol('F4F1EA'), emission=2.0)
pad_m = C.toon('nenuphar', C.hexcol('2FBF6A'))
sign_m = C.toon('panneau', C.hexcol('1F6B45'))
metal = C.toon('metal', C.hexcol('59606E'))
dark = C.toon('sombre', C.hexcol('1A2033'))
glass = C.toon('verre', C.hexcol('2A3F6E'), 0.7)
cloud_m = C.toon('nuage', C.hexcol('3B4A7A'), 0.7)
star_m = C.mat('etoile', C.hexcol('FFFFFF'), emission=3.0)
C.sun(1.4)

for i in range(160):                                  # ciel étoilé (une coupole)
    th, ph = rng.random() * 2 * math.pi, rng.uniform(0.15, 1.3)
    r = 400
    C.sphere(f'etoile{i}', (r * math.cos(th) * math.cos(ph), r * math.sin(th) * math.cos(ph), r * math.sin(ph)),
             rng.uniform(0.6, 1.4), star_m, seg=6)


def track_z(y, steep):
    """hauteur de la piste : exponentielle 2^(y/steep) - 1"""
    return 2 ** (y / steep) - 1


def build_track(y0, y1, steep, n=400, x=0.0, z0=0.0, name='piste'):
    pts = [(x, y0 + (y1 - y0) * i / n, z0 + track_z(y0 + (y1 - y0) * i / n, steep) - track_z(y0, steep)) for i in range(n + 1)]
    C.curve_from_points(name, pts, 0.09, fil)
    rail_pts = [(p[0] + 0.9, p[1], p[2]) for p in pts]
    C.curve_from_points(name + '_g', rail_pts, 0.04, fil)
    C.curve_from_points(name + '_d', [(p[0] - 0.9, p[1], p[2]) for p in pts], 0.04, fil)
    return pts


def ride(pts, t_of_u, frames, lift=0.25):
    """feuille + ROBOT_ANCHOR le long de la piste ; t_of_u : image → fraction de la piste parcourue"""
    pad = C.cyl('feuille', (0, 0, 0), 0.8, 0.08, pad_m, verts=20)
    anchor = C.empty('ROBOT_ANCHOR')
    anchor.parent = pad
    anchor.location = (0, 0, 0.55)
    for fr in frames:
        u = min(0.999, max(0.0, t_of_u(fr)))
        i = u * (len(pts) - 1)
        i0 = int(i)
        p0, p1 = Vector(pts[i0]), Vector(pts[min(len(pts) - 1, i0 + 1)])
        pos = p0.lerp(p1, i - i0)
        d = (p1 - p0).normalized()
        pad.location = pos + Vector((0, 0, lift))
        pad.rotation_euler = (math.atan2(d.z, d.y), 0, 0)
        pad.keyframe_insert('location', frame=fr)
        pad.keyframe_insert('rotation_euler', frame=fr)
    return pad, anchor


def follow_cam(cam, target, frames, offset, look=(0, 3, 0.6), lens=lambda fr: 22, roll=lambda fr: 0):
    def fn(fr):
        sc.frame_set(fr)
        p = target.matrix_world.translation
        return p + Vector(offset(fr)), p + Vector(look if not callable(look) else look(fr)), lens(fr), roll(fr)
    C.cam_path(cam, frames, fn)

cam = C.camera(lens=22)
frames = list(range(s0, s1 + 1))
extra_pts = {}

if PID == 'P3':
    # l'eau de l'étang au départ, puis la piste file vers les étoiles ; panneaux METR
    C.cyl('etang', (0, 0, -0.03), 14, 0.04, C.toon('eau', C.hexcol('10254A'), 0.6), verts=64)
    for i in range(40):
        ang = rng.random() * 2 * math.pi
        C.cyl(f'n{i}', (rng.uniform(-10, 10), rng.uniform(-12, 4), 0.01), rng.uniform(0.35, 0.5), 0.02, pad_m, verts=12)
    L = 420
    pts = build_track(0, L, 60)
    # le fil se soulève de l'eau : la piste monte de sous la surface sur « courbe »
    tr = [o for o in bpy.data.objects if o.name.startswith('piste')]
    fc = F(K['courbe'])
    for o in tr:
        o.location.z = -0.6
        o.keyframe_insert('location', frame=s0)
        o.keyframe_insert('location', frame=fc - 3)
        o.location.z = 0
        o.keyframe_insert('location', frame=fc + 3)
    U = lambda fr: 0.0 if fr < fc else (math.exp(2.1 * (fr - fc) / (s1 - fc)) - 1) / (math.exp(2.1) - 1) * 0.72
    pad, anchor = ride(pts, U, frames)
    for label, t_s in (('2019 · 3 s', 8.35), ('2025 · 1 h', K['quatre_mois'] + 0.5), ('2026 · 16 h+', K['deux_fois'])):
        u = U(F(t_s) + 8)
        p = pts[int(u * (len(pts) - 1))]
        C.box('mat_' + label, (p[0] + 3.2, p[1], p[2] + 1.6), (0.18, 0.18, 3.2), metal)
        C.box('pan_' + label, (p[0] + 3.2, p[1], p[2] + 3.4), (3.4, 0.15, 1.3), sign_m, bevel=0.06)
        C.text3d('txt_' + label, label, (p[0] + 3.2, p[1] - 0.12, p[2] + 3.5), 0.55, white, font='SpaceGrotesk-700')
        C.text3d('src_' + label, 'METR', (p[0] + 3.2, p[1] - 0.12, p[2] + 2.95), 0.22, white, font='IBMPlexMono-500')
    def off3(fr):
        if fr < fc:                                   # au ras de l'eau : on voit le fil se tendre
            return (-0.9, -2.6, 0.18)
        u = C.smooth((fr - fc) / 18)                  # fouetté vers le haut puis poursuite
        v = (fr - fc) / max(1, s1 - fc)
        return (-0.9 - 1.6 * u, -2.6 - 3.4 * u - 2.0 * v, 0.18 + 1.6 * u + 1.4 * v)
    follow_cam(cam, pad, frames, off3, look=lambda fr: (0, 3 + 4 * ((fr - s0) / (s1 - s0)), 0.6 + (0.9 if fr >= fc else 0.3)),
               lens=lambda fr: 24 - 10 * C.smooth((fr - fc) / max(1, s1 - fc)), roll=lambda fr: -6 * math.sin((fr - fc) * 0.12) if fr > fc else 0)

elif PID == 'P4':
    # couloir de serveurs du labo « OpenIA » ; au bout, un écran qui contient un écran qui contient un écran…
    L = 60
    pts = build_track(0, L, 1e9, n=60)                # piste à plat dans le labo
    C.box('sol', (0, L / 2, -0.1), (12, L + 20, 0.2), dark)
    C.box('plafond', (0, L / 2, 6.2), (12, L + 20, 0.2), dark)
    led_on = C.mat('led_v', C.GREEN, emission=12.0)
    led_b = C.mat('led_b', C.hexcol('4DA3FF'), emission=10.0)
    for side in (-1, 1):
        for k in range(12):
            y = 2 + k * 4.4
            C.box(f'baie{side}{k}', (side * 4.2, y, 2.6), (1.4, 3.6, 5.2), metal, bevel=0.05)
            for j in range(10):
                led = C.box(f'led{side}{k}{j}', (side * 3.48, y + rng.uniform(-1.5, 1.5), rng.uniform(0.6, 4.8)),
                            (0.04, 0.12, 0.06), led_on if rng.random() < 0.6 else led_b)
                for fr in range(s0, s1 + 1, rng.choice((4, 6, 8))):   # diodes qui clignotent
                    led.scale = (1, 1, 1) if rng.random() < 0.6 else (0.001, 0.001, 0.001)
                    led.keyframe_insert('scale', frame=fr)
                C.ease_all(led, 'CONSTANT')
        for k in range(5):                            # bras robotisés qui assemblent des bras
            y = 5 + k * 10
            base = C.cyl(f'socle{side}{k}', (side * 2.4, y, 0.2), 0.35, 0.4, metal)
            seg1 = C.box(f'bras1_{side}{k}', (side * 2.4, y, 1.1), (0.22, 0.22, 1.6), C.toon('orange', C.hexcol('E07A2E')))
            seg1.parent = base
            seg1.location = (0, 0, 0.9)
            for fr in range(s0, s1 + 1, 10):
                seg1.rotation_euler = (math.sin(fr * 0.21 + k) * 0.6, math.cos(fr * 0.17 + k) * 0.5, 0)
                seg1.keyframe_insert('rotation_euler', frame=fr)
            C.box(f'piece{side}{k}', (side * 1.9, y + 0.6, 0.3), (0.5, 0.3, 0.3), C.toon('orange', C.hexcol('E07A2E')))
    screen_m = C.mat('ecran', C.hexcol('0E3B2A'), emission=2.0)
    for k in range(7):                                # écrans en mise en abyme au fond du couloir
        s = 5.2 * 0.62 ** k
        C.box(f'cadre{k}', (0, L + 1 - k * 0.02, 3.0), (s * 0.62, 0.05, s), metal if k % 2 == 0 else screen_m)
    C.box('noeud', (0, L + 0.9, 5.7), (1.2, 0.05, 0.25), glow_y)   # évocation « OpenIA » (pas de logo)
    fa = F(K['auto'])
    U = lambda fr: 0.15 + 0.7 * (fr - s0) / (fa - s0) if fr < fa else 0.85
    pad, anchor = ride(pts, U, frames)
    follow_cam(cam, pad, [fr for fr in frames if fr <= fa],
               lambda fr: (-1.6, -4.5 - 2 * (1 - C.smooth((fr - s0) / 20)), 1.5 + 3.5 * (1 - C.smooth((fr - s0) / 20))),
               lens=lambda fr: 18, roll=lambda fr: 10 * (1 - C.smooth((fr - s0) / 24)) + 3 * math.sin(fr * 0.15))
    for fr in range(fa + 1, s1 + 1):                  # zoom éclair dans l'écran
        k = (fr - fa) / max(1, s1 - fa)
        cam.location = Vector((0, L - 6 + 6.9 * (1 - (1 - k) ** 3), 3.0))
        C.look_at(cam, (0, L + 2, 3.0))
        cam.keyframe_insert('location', frame=fr)
        cam.keyframe_insert('rotation_euler', frame=fr)
    extra_pts['screen'] = C.empty('SCREEN_ANCHOR', (0, L + 0.9, 3.0))

elif PID == 'P5':
    # la piste ressort du toit et se cabre ; calendrier géant dont les pages s'arrachent de plus en plus vite
    L = 120
    pts = build_track(0, L, 12)
    C.box('toit', (0, -6, -1.2), (16, 20, 2.4), glass)
    for i in range(30):
        C.sphere(f'nuage{i}', (rng.uniform(-30, 30), rng.uniform(10, 140), rng.uniform(4, 90)), rng.uniform(2, 6), cloud_m, seg=10)
    cal = C.box('calendrier', (-6, 38, track_z(38, 12) + 3), (4.2, 0.4, 5.2), C.toon('papier', C.hexcol('F4F1EA'), 0.8))
    C.box('cal_haut', (-6, 37.9, track_z(38, 12) + 5.8), (4.2, 0.5, 0.9), C.toon('rouge', C.hexcol('D8453B')))
    fus = F(K['une_seule'])
    t_pages, dt = F(T0) + 6, 16.0
    k = 0
    while t_pages < fus and k < 40:                     # chaque page part plus vite que la précédente
        pg = C.box(f'page{k}', (-6, 37.75, track_z(38, 12) + 3), (4.0, 0.03, 4.4),
                   C.toon('papier', C.hexcol('F4F1EA'), 0.8), collection='FG' if k % 3 == 0 else 'BG')
        pg.keyframe_insert('location', frame=int(t_pages) - 1)
        pg.keyframe_insert('rotation_euler', frame=int(t_pages) - 1)
        pg.location += Vector((rng.uniform(-6, 6), -8, rng.uniform(2, 8)))
        pg.rotation_euler = (rng.uniform(-2, 2), rng.uniform(-2, 2), rng.uniform(-2, 2))
        pg.keyframe_insert('location', frame=int(t_pages) + 10)
        pg.keyframe_insert('rotation_euler', frame=int(t_pages) + 10)
        pg.scale = (0.001, 0.001, 0.001)
        pg.keyframe_insert('scale', frame=int(t_pages) + 11)
        pg.scale = (1, 1, 1)
        pg.keyframe_insert('scale', frame=int(t_pages) + 10)
        t_pages += dt
        dt = max(1.2, dt * 0.62)
        k += 1
    extra_pts['cal'] = C.empty('CAL_ANCHOR', (-6, 37.6, track_z(38, 12) + 3))
    U = lambda fr: 0.25 * (fr - s0) / (fus - s0) if fr < fus else 0.25 + 0.55 * ((fr - fus) / (s1 - fus)) ** 1.6
    pad, anchor = ride(pts, U, frames)
    follow_cam(cam, pad, frames,
               lambda fr: tuple(x + (y - x) * C.smooth((fr - fus) / 10) for x, y in zip((7.5, -7.5, -1.5), (5.0, -3.5, -7.5))),
               look=lambda fr: tuple(x + (y - x) * C.smooth((fr - fus) / 10) for x, y in zip((-2.5, 4, 2.5), (0, 1.0, 3.2))),
               lens=lambda fr: 20 - 6 * C.smooth((fr - fus) / 10), roll=lambda fr: -8 + 20 * C.smooth((fr - fus) / 10))
    for fr in range(fus, min(s1, fus + 12)):          # secousses (autour de la position déjà animée)
        sc.frame_set(fr)
        cam.location.x += rng.uniform(-0.25, 0.25)
        cam.location.z += rng.uniform(-0.25, 0.25)
        cam.keyframe_insert('location', frame=fr)

else:
    # P6 : aiguillage dans le ciel. Rail blanc en pointillés « ce qu'on veut » (droit) / rail vert qui s'en écarte
    for i in range(24):
        C.sphere(f'nuage{i}', (rng.uniform(-25, 25), rng.uniform(-10, 60), rng.uniform(-8, -2)), rng.uniform(3, 7), cloud_m, seg=10)
    C.box('plateforme', (0, 0, -0.3), (5, 6, 0.4), metal, bevel=0.1)
    pts_w = [(0, y, 0.12 * y) for y in [i * 0.5 for i in range(80)]]
    for i in range(0, 79, 2):                         # pointillés blancs
        p0, p1 = Vector(pts_w[i]), Vector(pts_w[i + 1])
        seg = C.curve_from_points(f'blanc{i}', [tuple(p0), tuple(p1)], 0.07, white)
    diverge = lambda y: (0.012 * y ** 2.1, y, 0.12 * y + 0.004 * y ** 2.6)
    fo = F(K['openai'])
    grow = [o for o in []]
    pts_g = [diverge(i * 0.5) for i in range(80)]
    vert = C.curve_from_points('rail_vert', pts_g, 0.09, fil)
    vert.data.bevel_factor_mapping_end = 'SPLINE'
    vert.data.bevel_factor_end = 0.05
    vert.data.keyframe_insert('bevel_factor_end', frame=s0)
    vert.data.bevel_factor_end = 1.0
    vert.data.keyframe_insert('bevel_factor_end', frame=fo)
    C.box('socle_levier', (-1.6, 1.5, 0.2), (0.6, 0.6, 0.5), metal)
    lever = C.box('levier', (-1.6, 1.5, 1.1), (0.14, 0.14, 1.8), C.toon('rouge', C.hexcol('D8453B')))
    for fr in range(s0, s1 + 1, 6):                   # le levier résiste : il tremble sans basculer
        lever.rotation_euler = (0, math.radians(18 + rng.uniform(-4, 4)), 0)
        lever.keyframe_insert('rotation_euler', frame=fr)
    anchor = C.empty('ROBOT_ANCHOR', (-1.25, 1.5, 0.35))
    extra_pts['lever'] = C.empty('LEVER_ANCHOR', (-1.6, 1.4, 2.1))
    extra_pts['fork'] = C.empty('FORK_ANCHOR', diverge(22))
    extra_pts['want'] = C.empty('WANT_ANCHOR', pts_w[60])
    def cam_p6(fr):
        u = (fr - s0) / max(1, s1 - s0)
        ang = math.radians(35 - 55 * C.smooth(u))
        v = C.smooth((fr - fo) / 30) if fr >= fo else 0.0      # Vertigo : on recule en resserrant la focale
        r = 7.5 + 9 * v
        tgt = (-0.8 + 1.8 * u, 2.5 + 5 * u, 1.6 + 1.2 * u)
        loc = (tgt[0] + r * math.sin(ang), tgt[1] - r * math.cos(ang), tgt[2] + 1.2 + 1.5 * u)
        return loc, tgt, 22 * (r / 7.5), 0
    C.cam_path(cam, frames, cam_p6)

def extra(fr):
    from bpy_extras.object_utils import world_to_camera_view
    out = {}
    for name, e in extra_pts.items():
        p = world_to_camera_view(sc, sc.camera, e.matrix_world.translation)
        out[name + '_x'], out[name + '_y'], out[name + '_z'] = round(p.x * 1080, 1), round((1 - p.y) * 1920, 1), round(p.z, 2)
    return out


C.ANCHOR_EXTRA = extra
C.render(sc, PID, opt)
