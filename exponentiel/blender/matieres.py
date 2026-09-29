"""Matières réalistes procédurales et réglages EEVEE du rendu final d'EXPONENTIEL (importé par commun.py).

Tout est procédural (bruits, ondes, Voronoï) : pas de texture externe à télécharger, rendu reproductible.
La matière est choisie d'après le nom donné dans les scripts de décor (eau, nénuphar, bois, métal, verre, nuage…).
"""
import bpy


def _noise(N, L, scale, detail=6.0, rough=0.55, coord=None):
    n = N.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    if coord is not None:
        L.new(coord, n.inputs['Vector'])
    return n


def _ramp(N, L, src, c0, c1, p0=0.3, p1=0.7):
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].position, r.color_ramp.elements[0].color = p0, c0
    r.color_ramp.elements[1].position, r.color_ramp.elements[1].color = p1, c1
    L.new(src, r.inputs['Fac'])
    return r


def _bump(N, L, height, strength, bsdf, distance=0.02):
    b = N.new('ShaderNodeBump')
    b.inputs['Strength'].default_value = strength
    b.inputs['Distance'].default_value = distance
    L.new(height, b.inputs['Height'])
    L.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return b


def tint(c, k):
    return tuple(min(1.0, x * k) for x in c[:3]) + (1,)


def pbr(name, color):
    key = 'pbr_' + name
    m = bpy.data.materials.get(key)
    if m:
        return m
    m = bpy.data.materials.new(key)
    m.diffuse_color = color
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord').outputs['Object']
    b.inputs['Base Color'].default_value = color
    n = name.lower()
    if 'eau' in n or 'etang' in n:
        # eau noire et profonde : très lisse, reflets de la lune et des néons, petites rides
        b.inputs['Base Color'].default_value = tint(color, 0.3)
        b.inputs['Roughness'].default_value = 0.03
        b.inputs['Specular IOR Level'].default_value = 0.9
        w = N.new('ShaderNodeTexWave')
        w.wave_type = 'RINGS'
        w.inputs['Scale'].default_value = 1.3
        w.inputs['Distortion'].default_value = 7.0
        w.inputs['Detail'].default_value = 3
        L.new(tc, w.inputs['Vector'])
        nz = _noise(N, L, 3.0, 8, 0.6, tc)
        add = N.new('ShaderNodeMath')
        add.operation = 'ADD'
        L.new(w.outputs['Fac'], add.inputs[0])
        L.new(nz.outputs['Fac'], add.inputs[1])
        _bump(N, L, add.outputs[0], 0.08, b, 0.01)
    elif 'nenuphar' in n or 'feuille' in n:
        # feuille cireuse : cellules, variations de vert, léger passage de lumière
        vor = N.new('ShaderNodeTexVoronoi')
        vor.inputs['Scale'].default_value = 16
        L.new(tc, vor.inputs['Vector'])
        nz = _noise(N, L, 9, 6, 0.6, tc)
        r = _ramp(N, L, nz.outputs['Fac'], tint(color, 0.45), tint(color, 1.1), 0.35, 0.75)
        L.new(r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.3
        b.inputs['Subsurface Weight'].default_value = 0.15
        _bump(N, L, vor.outputs['Distance'], 0.2, b)
    elif any(k in n for k in ('bois', 'barque', 'poteau', 'panneau')):
        w = N.new('ShaderNodeTexWave')
        w.wave_profile = 'SAW'
        w.bands_direction = 'X'
        w.inputs['Scale'].default_value = 3.0
        w.inputs['Distortion'].default_value = 9
        w.inputs['Detail'].default_value = 6
        L.new(tc, w.inputs['Vector'])
        r = _ramp(N, L, w.outputs['Fac'], tint(color, 0.5), tint(color, 1.05), 0.2, 0.8)
        L.new(r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.72
        _bump(N, L, w.outputs['Fac'], 0.3, b)
    elif any(k in n for k in ('metal', 'baie', 'socle', 'bras', 'orange', 'rouge')):
        nz = _noise(N, L, 40, 10, 0.7, tc)
        metal = not any(k in n for k in ('orange', 'rouge'))
        b.inputs['Metallic'].default_value = 1.0 if metal else 0.0
        r = _ramp(N, L, nz.outputs['Fac'], (0.2, 0.2, 0.22, 1), (0.45, 0.45, 0.48, 1))
        L.new(r.outputs['Color'], b.inputs['Roughness'])
        _bump(N, L, nz.outputs['Fac'], 0.05, b)
    elif 'verre' in n or 'toit' in n:
        b.inputs['Roughness'].default_value = 0.03
        b.inputs['Metallic'].default_value = 0.7
        b.inputs['Base Color'].default_value = tint(color, 0.6)
    elif 'nuage' in n:
        bpy.data.materials.remove(m)
        return cloud_volume(key)
    elif 'nuage_surface' in n:
        b.inputs['Roughness'].default_value = 1.0
        b.inputs['Base Color'].default_value = (0.5, 0.56, 0.78, 1)
        b.inputs['Subsurface Weight'].default_value = 0.5
        nz = _noise(N, L, 1.4, 8, 0.65, tc)
        _bump(N, L, nz.outputs['Fac'], 1.0, b, 0.4)
    elif 'papier' in n:
        b.inputs['Roughness'].default_value = 0.9
        b.inputs['Subsurface Weight'].default_value = 0.2
    else:
        # sol, berge, roseaux, arbres… : variation de teinte + relief
        nz = _noise(N, L, 6, 8, 0.6, tc)
        r = _ramp(N, L, nz.outputs['Fac'], tint(color, 0.65), tint(color, 1.2))
        L.new(r.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.85
        _bump(N, L, nz.outputs['Fac'], 0.35, b)
    return m


def final_look(sc, fog=0.0, fog_color=(0.35, 0.45, 0.8), fog_box=None):
    """EEVEE réaliste : lancer de rayons (reflets), ombres douces, brume volumétrique, halo des néons"""
    e = sc.eevee
    for k, v in (('use_raytracing', True), ('use_shadows', True), ('use_volumetric_shadows', True),
                 ('volumetric_tile_size', '4'), ('volumetric_end', 150.0), ('taa_render_samples', 32),
                 ('use_fast_gi', True), ('shadow_pool_size', '1024')):
        if hasattr(e, k):
            try:
                setattr(e, k, v)
            except Exception:
                pass
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    if fog and fog_box:                                     # nappe de brume locale (la brume « monde » assombrit tout dans EEVEE)
        (cx, cy, cz), (sx, sy, sz) = fog_box
        bpy.ops.mesh.primitive_cube_add(location=(cx, cy, cz))
        o = bpy.context.object
        o.name = 'brume'
        o.scale = (sx / 2, sy / 2, sz / 2)
        m = bpy.data.materials.new('brume')
        m.use_nodes = True
        N = m.node_tree.nodes
        N.remove(N['Principled BSDF'])
        vol = N.new('ShaderNodeVolumeScatter')
        vol.inputs['Density'].default_value = fog
        vol.inputs['Color'].default_value = (*fog_color, 1)
        vol.inputs['Anisotropy'].default_value = 0.4
        grad = N.new('ShaderNodeTexGradient')              # plus dense au ras de l'eau
        tc = N.new('ShaderNodeTexCoord')
        sep = N.new('ShaderNodeSeparateXYZ')
        mth = N.new('ShaderNodeMapRange')
        m.node_tree.links.new(tc.outputs['Generated'], sep.inputs[0])
        m.node_tree.links.new(sep.outputs['Z'], mth.inputs['Value'])
        mth.inputs['To Min'].default_value, mth.inputs['To Max'].default_value = fog * 2.5, 0.0
        m.node_tree.links.new(mth.outputs['Result'], vol.inputs['Density'])
        m.node_tree.links.new(vol.outputs[0], N['Material Output'].inputs['Volume'])
        o.data.materials.append(m)
    bloom(sc)


def bloom(sc):
    """halo lumineux (Glare « Fog Glow ») dans le compositing de Blender"""
    if hasattr(sc, 'compositing_node_group'):          # Blender 5 : arbre de compositing = groupe de nœuds
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
    for k, v in (('glare_type', 'FOG_GLOW'), ('quality', 'HIGH'), ('threshold', 0.9), ('size', 8)):
        if hasattr(gl, k):
            try:
                setattr(gl, k, v)
            except Exception:
                pass
    for k, v in (('Type', 'Fog Glow'), ('Threshold', 1.6), ('Strength', 0.45), ('Size', 0.6)):
        if k in gl.inputs:
            try:
                gl.inputs[k].default_value = v
            except Exception:
                pass
    ct.links.new(rl.outputs['Image'], gl.inputs[0])
    ct.links.new(gl.outputs[0], out.inputs[0])
    # la transparence du premier plan doit survivre au halo : on recopie l'alpha
    if 'Alpha' in rl.outputs and 'Alpha' in [s.name for s in gl.inputs]:
        ct.links.new(rl.outputs['Alpha'], gl.inputs['Alpha'])


def world_sky(sc, zenith=(0.004, 0.008, 0.03), horizon=(0.05, 0.075, 0.17), strength=1.0):
    """ciel de nuit en dégradé : noir bleuté au zénith, halo bleu à l'horizon"""
    nt = sc.world.node_tree
    N, L = nt.nodes, nt.links
    bg = N['Background']
    tc = N.new('ShaderNodeTexCoord')
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(tc.outputs['Generated'], sep.inputs[0])
    mr = N.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value, mr.inputs['From Max'].default_value = -0.05, 0.6
    L.new(sep.outputs['Z'], mr.inputs['Value'])
    ramp = N.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*horizon, 1)
    ramp.color_ramp.elements[1].color = (*zenith, 1)
    L.new(mr.outputs['Result'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength


def cloud_volume(name):
    """nuage volumétrique : densité = bruit × atténuation vers le bord de l'objet (sphère)"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N['Principled BSDF'])
    vol = N.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = (0.75, 0.8, 1.0, 1)
    tc = N.new('ShaderNodeTexCoord')
    nz = N.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 1.6
    nz.inputs['Detail'].default_value = 10
    nz.inputs['Roughness'].default_value = 0.6
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    ln = N.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    L.new(tc.outputs['Object'], ln.inputs[0])
    fall = N.new('ShaderNodeMapRange')                     # 1 au centre → 0 au bord
    fall.inputs['From Min'].default_value, fall.inputs['From Max'].default_value = 0.35, 1.0
    fall.inputs['To Min'].default_value, fall.inputs['To Max'].default_value = 1.0, 0.0
    L.new(ln.outputs['Value'], fall.inputs['Value'])
    mul = N.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    L.new(nz.outputs['Fac'], mul.inputs[0])
    L.new(fall.outputs['Result'], mul.inputs[1])
    dens = N.new('ShaderNodeMapRange')
    dens.inputs['From Min'].default_value, dens.inputs['From Max'].default_value = 0.1, 0.45
    dens.inputs['To Min'].default_value, dens.inputs['To Max'].default_value = 0.0, 6.0
    L.new(mul.outputs[0], dens.inputs['Value'])
    L.new(dens.outputs['Result'], vol.inputs['Density'])
    L.new(vol.outputs[0], N['Material Output'].inputs['Volume'])
    m.diffuse_color = (0.6, 0.65, 0.85, 1)
    return m
