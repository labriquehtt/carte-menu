"""Modèles procéduraux de l'étang (sapins, barque, rochers, massettes, fleurs de nénuphar, sol, ciel).
Tout est construit à partir de primitives + modificateurs, avec des graines fixes (rendu reproductible)."""
import math
import random

import bpy

import commun as C


def _displace(o, strength, scale, seed=0):
    tex = bpy.data.textures.new(f'bruit_{o.name}', 'CLOUDS')
    tex.noise_scale = scale
    tex.noise_depth = 3
    m = o.modifiers.new('relief', 'DISPLACE')
    m.texture = tex
    m.strength = strength
    m.texture_coords = 'GLOBAL' if seed == 0 else 'LOCAL'
    return m


def sapin(name, loc, h, rng, needles, bark, collection='BG'):
    """sapin étagé : tronc + 4 à 5 couronnes coniques déformées"""
    x, y, z = loc
    C.cyl(name + '_tronc', (x, y, z + h * 0.12), h * 0.035, h * 0.26, bark, collection=collection, verts=8)
    tiers = rng.randint(4, 5)
    for k in range(tiers):
        u = k / tiers
        r = h * (0.33 - 0.25 * u) * rng.uniform(0.9, 1.1)
        th = h * 0.36
        zc = z + h * (0.2 + 0.68 * u)
        bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=r, depth=th, location=(x, y, zc))
        o = bpy.context.object
        o.name = f'{name}_c{k}'
        o.rotation_euler.z = rng.random() * 6.28
        bpy.ops.object.mode_set(mode='OBJECT')
        sub = o.modifiers.new('sub', 'SUBSURF')
        sub.levels = sub.render_levels = 1
        _displace(o, r * 0.25, 0.35)
        o.data.materials.append(needles)
        C.link(o, collection)


def barque(name, loc, wood, collection='BG'):
    """coque de barque : demi-sphère étirée, creusée (solidify), avec deux bancs et un liseré"""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=loc)
    o = bpy.context.object
    o.name = name
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 0.001], context='VERTS')   # coque ouverte (moitié basse)
    bm.to_mesh(o.data)
    bm.free()
    o.scale = (0.8, 0.42, 0.32)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    so = o.modifiers.new('epaisseur', 'SOLIDIFY')
    so.thickness = 0.05
    bv = o.modifiers.new('biseau', 'BEVEL')
    bv.width = 0.01
    o.data.materials.append(wood)
    for i, dx in enumerate((-0.25, 0.3)):
        b = C.box(f'{name}_banc{i}', (loc[0] + dx, loc[1], loc[2] - 0.08), (0.12, 0.72, 0.04), wood)
        b.parent = o
        b.location = (dx, 0, -0.08)
    for o2 in [o]:
        C.link(o2, collection)
    return o


def rocher(name, loc, r, mat, rng, collection='BG'):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (rng.uniform(0.8, 1.4), rng.uniform(0.8, 1.3), rng.uniform(0.45, 0.8))
    o.rotation_euler.z = rng.random() * 6.28
    _displace(o, r * 0.35, r * 0.8)
    o.data.materials.append(mat)
    return C.link(o, collection)


def massette(name, loc, h, stem, head, rng, collection='BG'):
    """massette (roseau à épi brun) légèrement penchée ; renvoie la tige (pour l'animer au vent)"""
    x, y, z = loc
    s = C.cyl(name, (x, y, z + h / 2), 0.018, h, stem, collection=collection, verts=6)
    if rng.random() < 0.55:
        e = C.cyl(name + '_epi', (0, 0, h * 0.36), 0.045, h * 0.16, head, collection=collection, verts=8)
        e.parent = s
        e.location = (0, 0, h * 0.36)
    s.rotation_euler = (rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12), 0)
    return s


def fleur(name, loc, petal, heart, rng, collection='BG'):
    """fleur de nénuphar : deux couronnes de pétales + cœur jaune ; renvoie ses objets (pour les rattacher à une feuille)"""
    x, y, z = loc
    out = []
    for k, (r, n) in enumerate(((0.16, 8), (0.1, 6))):
        for j in range(n):
            a = j / n * 6.28 + k * 0.4
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.07,
                                                 location=(x + r * 0.55 * math.cos(a), y + r * 0.55 * math.sin(a), z + 0.04 + 0.03 * k))
            p = bpy.context.object
            p.scale = (1.9, 0.7, 0.45)
            p.rotation_euler = (0, -0.5 - 0.35 * k, a)
            p.data.materials.append(petal)
            out.append(C.link(p, collection))
    out.append(C.sphere(name + '_coeur', (x, y, z + 0.08), 0.04, heart, collection=collection, seg=8))
    return out


R_IN = 11.0


def sol(name, radius, mat, collection='BG'):
    """sol en relief autour de l'étang (le creux de l'eau reste plat)"""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=160, y_subdivisions=160, size=radius * 2, location=(0, 0, 0))
    o = bpy.context.object
    o.name = name
    for v in o.data.vertices:
        d = math.hypot(v.co.x, v.co.y)
        if d < R_IN:                                        # sous l'eau : fond de l'étang
            v.co.z = -0.7
        else:
            v.co.z = (d - R_IN) * 0.18 - 0.05 + (math.sin(v.co.x * 0.7) * math.cos(v.co.y * 0.6)) * 0.25 * min(1, (d - R_IN) / 4)
    _displace(o, 0.2, 1.5)
    o.data.materials.append(mat)
    return C.link(o, collection)


def ciel(n, rng, star, collection='BG'):
    """coupole d'étoiles (petites sphères émissives)"""
    for i in range(n):
        th, ph = rng.random() * 6.28, rng.uniform(0.08, 1.35)
        r = 300
        C.sphere(f'etoile{i}', (r * math.cos(th) * math.cos(ph), r * math.sin(th) * math.cos(ph), r * math.sin(ph)),
                 rng.uniform(0.25, 0.8), star, collection=collection, seg=6)
