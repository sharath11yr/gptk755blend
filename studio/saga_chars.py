"""Blocky 3D characters for 'The Human Journey' (original designs), rendered in Blender.
blender -b -P saga_chars.py -- <out_dir>   -> character sheet stills (PNG)"""
import bpy, math, sys, os
out = sys.argv[sys.argv.index("--") + 1]; os.makedirs(out, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    return sc

def mat(name, rgb, rough=0.6, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    return m

def box(name, loc, size, m, bevel=0.06, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot); o = bpy.context.object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new("b", "BEVEL"); mod.width = bevel; mod.segments = 3
    o.data.materials.append(m); return o

def sph(name, loc, r, m, sc=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, radius=r, segments=24, ring_count=12); o = bpy.context.object; o.name = name
    o.scale = sc; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

LOOKS = {
 "john": dict(skin=(0.62, 0.40, 0.27), hair=(0.12, 0.08, 0.05), cloth=(0.45, 0.28, 0.14), h=1.0, hairstyle="short", prop="spear"),
 "mia":  dict(skin=(0.74, 0.50, 0.35), hair=(0.10, 0.06, 0.04), cloth=(0.62, 0.32, 0.18), h=0.94, hairstyle="long", prop="flower"),
 "leo":  dict(skin=(0.66, 0.43, 0.29), hair=(0.12, 0.08, 0.05), cloth=(0.50, 0.33, 0.18), h=0.62, hairstyle="short", prop=None),
 "nana": dict(skin=(0.58, 0.38, 0.27), hair=(0.82, 0.82, 0.82), cloth=(0.40, 0.34, 0.27), h=0.9, hairstyle="bun", prop="stick"),
 "zor":  dict(skin=(0.45, 0.29, 0.19), hair=(0.05, 0.04, 0.03), cloth=(0.20, 0.14, 0.10), h=1.12, hairstyle="beard", prop="club"),
}

def character(key, x=0, expr="happy"):
    L = LOOKS[key]; s = L["h"]
    skin, hair, cloth = mat(key + "skin", L["skin"]), mat(key + "hair", L["hair"], 0.8), mat(key + "cloth", L["cloth"], 0.9)
    white, black = mat("w", (0.95, 0.95, 0.95), 0.3), mat("k", (0.03, 0.03, 0.03), 0.2)
    z0 = 0
    box(key + "legL", (x - 0.16 * s, 0, z0 + 0.45 * s), (0.26 * s, 0.28 * s, 0.9 * s), skin)
    box(key + "legR", (x + 0.16 * s, 0, z0 + 0.45 * s), (0.26 * s, 0.28 * s, 0.9 * s), skin)
    box(key + "torso", (x, 0, z0 + 1.25 * s), (0.72 * s, 0.4 * s, 0.75 * s), skin)
    box(key + "wrap", (x, 0, z0 + 1.15 * s), (0.78 * s, 0.46 * s, 0.7 * s), cloth, bevel=0.03)   # fur/cloth wrap
    box(key + "armL", (x - 0.5 * s, 0, z0 + 1.25 * s), (0.22 * s, 0.24 * s, 0.75 * s), skin)
    box(key + "armR", (x + 0.5 * s, 0, z0 + 1.25 * s), (0.22 * s, 0.24 * s, 0.75 * s), skin)
    hz = z0 + 1.95 * s; hs = 0.72 * s * (1.15 if key == "leo" else 1)
    box(key + "head", (x, 0, hz), (hs, hs * 0.9, hs), skin, bevel=0.1 * s)
    # eyes: big, expressive
    ey = -hs * 0.46
    for dx in (-0.16, 0.16):
        if expr == "love":
            box(key + "lid", (x + dx * hs / 0.72, ey - 0.01, hz + 0.05 * s), (0.14 * s, 0.02, 0.035 * s), black, bevel=0)
        else:
            e = sph(key + "eye", (x + dx * hs / 0.72, ey, hz + 0.05 * s), 0.085 * s, white, (1, 0.35, 1.15 if expr == "fear" else 1))
            sph(key + "pupil", (x + dx * hs / 0.72, ey - 0.03, hz + 0.04 * s), 0.05 * s, black, (1, 0.4, 1))
            sph(key + "shine", (x + dx * hs / 0.72 + 0.02, ey - 0.06, hz + 0.07 * s), 0.016 * s, white)
        brow_rot = (0, (0.35 if dx < 0 else -0.35) if expr == "angry" else 0, 0)
        box(key + "brow", (x + dx * hs / 0.72, ey - 0.01, hz + 0.17 * s), (0.15 * s, 0.03, 0.03 * s), hair, bevel=0, rot=brow_rot)
    if expr in ("happy", "love"):
        box(key + "mouth", (x, ey - 0.01, hz - 0.16 * s), (0.18 * s, 0.03, 0.06 * s), mat("mth", (0.35, 0.08, 0.08)), bevel=0.02)
    elif expr == "fear":
        sph(key + "mouth", (x, ey - 0.01, hz - 0.17 * s), 0.06 * s, mat("mth", (0.2, 0.04, 0.04)), (1, 0.3, 1.3))
    else:
        box(key + "mouth", (x, ey - 0.01, hz - 0.16 * s), (0.16 * s, 0.03, 0.025 * s), black, bevel=0)
    if key == "mia":
        for dx in (-0.08, 0.08): sph("blush", (x + dx * 3.2 * s, ey - 0.01, hz - 0.08 * s), 0.05 * s, mat("blush", (0.95, 0.45, 0.5)), (1, 0.2, 0.6))
    # hair
    st = L["hairstyle"]
    box(key + "hairtop", (x, 0.02, hz + hs * 0.5), (hs * 1.08, hs * 1.0, hs * 0.28), hair, bevel=0.05)
    box(key + "hairback", (x, hs * 0.3, hz + 0.05), (hs * 1.08, hs * 0.4, hs * 0.9), hair, bevel=0.05)
    if st == "long":
        for dx in (-1, 1): box(key + "lock", (x + dx * hs * 0.55, 0.05, hz - hs * 0.45), (hs * 0.2, hs * 0.75, hs * 1.3), hair, bevel=0.04)
        for i, c in enumerate([(0.98, 0.42, 0.57), (1, 0.82, 0.4)]): sph("flower", (x + hs * 0.42, -hs * 0.2, hz + hs * 0.45), 0.09 - i * 0.04, mat("fl" + str(i), c, emit=0.3))
    if st == "bun": sph(key + "bun", (x, hs * 0.35, hz + hs * 0.65), hs * 0.25, hair)
    if st == "beard": box(key + "beard", (x, ey + 0.05, hz - hs * 0.35), (hs * 0.9, 0.12, hs * 0.45), hair, bevel=0.05)
    # props
    wood = mat("wood", (0.33, 0.2, 0.1), 0.8); stone = mat("stone", (0.5, 0.5, 0.5), 0.5)
    if L["prop"] == "spear":
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=2.6, location=(x + 0.62 * s, -0.1, 1.3)); bpy.context.object.data.materials.append(wood)
        bpy.ops.mesh.primitive_cone_add(radius1=0.07, depth=0.25, location=(x + 0.62 * s, -0.1, 2.72)); bpy.context.object.data.materials.append(stone)
    if L["prop"] == "club": box("club", (x + 0.66 * s, -0.1, 1.55 * s), (0.2, 0.2, 1.1), wood, bevel=0.06)
    if L["prop"] == "stick":
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=1.7, location=(x + 0.62 * s, -0.1, 0.85)); bpy.context.object.data.materials.append(wood)

def stage(sc, bg=(0.95, 0.7, 0.45)):
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*bg, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.8; sc.world = w
    box("ground", (0, 0, -0.05), (30, 30, 0.1), mat("g", (0.55, 0.42, 0.22), 0.9), bevel=0)
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), 0, math.radians(30))); bpy.context.object.data.energy = 3.5
    bpy.ops.object.light_add(type="AREA", location=(0, -5, 4)); bpy.context.object.data.energy = 400; bpy.context.object.data.size = 5

def cam(sc, loc, look, lens=50):
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object; c.data.lens = lens; sc.camera = c
    t = bpy.data.objects.new("t", None); sc.collection.objects.link(t); t.location = look
    k = c.constraints.new("TRACK_TO"); k.target = t; k.track_axis = "TRACK_NEGATIVE_Z"; k.up_axis = "UP_Y"

def shot(name, setup):
    sc = reset(); stage(sc); setup(sc); sc.render.filepath = f"{out}/{name}.png"; bpy.ops.render.render(write_still=True)

shot("1_john_mia", lambda sc: (character("john", -0.65, "happy"), character("mia", 0.65, "happy"), cam(sc, (0, -7.5, 2.0), (0, 0, 1.5), 50)))
shot("2_closeup_mia", lambda sc: (character("mia", 0, "love"), cam(sc, (0, -2.6, 1.9), (0, 0, 1.85), 50)))
shot("3_leo_nana", lambda sc: (character("leo", -0.6, "happy"), character("nana", 0.6, "happy"), cam(sc, (0, -7, 1.7), (0, 0, 1.2), 50)))
shot("4_zor", lambda sc: (character("zor", 0, "angry"), cam(sc, (0, -5.5, 1.6), (0, 0, 1.6), 45)))
shot("5_john_fear", lambda sc: (character("john", 0, "fear"), cam(sc, (0.4, -2.6, 2.1), (0, 0, 1.95), 50)))
