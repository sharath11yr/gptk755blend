"""Animated 3D story shots for 'The Human Journey' (our own blocky style).
blender -b -P saga3d.py -- <shots.json> <out_dir> <chunk> <chunks>
Each shot: {"start":N,"len":N,"set":"savanna|forest|night|cave|ice|village","chars":[{"who","x","y","rot","expr","act"}],
            "animal":"lion|wolf|none","fire":bool,"firex":x,"heart":bool,"cam":"wide|close|low|two","focus":idx}"""
import bpy, math, sys, os, json, random
a = sys.argv[sys.argv.index("--") + 1:]
shots = json.load(open(a[0])); out = a[1]; chunk, chunks = int(a[2]), int(a[3]); os.makedirs(out, exist_ok=True)
FPS = 24; RX, RY = 720, 1280

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE_NEXT"; sc.eevee.taa_render_samples = 16
    sc.render.resolution_x, sc.render.resolution_y = RX, RY; sc.render.fps = FPS
    sc.view_settings.view_transform = "Standard"; sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 92
    return sc

_mats = {}
def mat(name, rgb, rough=0.6, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    return m

def box(loc, size, m, bevel=0.05, rot=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot); o = bpy.context.object
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); bpy.ops.object.transform_apply(scale=True)
    if bevel: md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 3
    o.data.materials.append(m)
    if parent: o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o

def sph(loc, r, m, sc=(1, 1, 1), parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, radius=r, segments=20, ring_count=10); o = bpy.context.object
    o.scale = sc; o.data.materials.append(m); bpy.ops.object.shade_smooth()
    if parent: o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o

def empty(loc, parent=None):
    e = bpy.data.objects.new("e", None); bpy.context.scene.collection.objects.link(e); e.location = loc
    if parent: e.parent = parent; e.location = loc; 
    return e

LOOK = {
 "john": dict(skin=(0.42, 0.22, 0.12), hair=(0.05, 0.03, 0.02), cloth=(0.55, 0.25, 0.07), h=1.0, hs="short"),
 "mia":  dict(skin=(0.52, 0.29, 0.16), hair=(0.04, 0.025, 0.015), cloth=(0.72, 0.18, 0.12), h=0.94, hs="long"),
 "leo":  dict(skin=(0.46, 0.25, 0.14), hair=(0.05, 0.03, 0.02), cloth=(0.18, 0.38, 0.14), h=0.62, hs="short"),
 "nana": dict(skin=(0.38, 0.21, 0.12), hair=(0.85, 0.85, 0.85), cloth=(0.30, 0.20, 0.42), h=0.9, hs="bun"),
 "zor":  dict(skin=(0.28, 0.15, 0.08), hair=(0.02, 0.015, 0.01), cloth=(0.10, 0.07, 0.05), h=1.12, hs="beard"),
}

def character(who, x, y, rot, expr):
    L = LOOK[who]; s = L["h"]
    skin, hair, cloth = mat("sk", L["skin"], 0.55), mat("hr", L["hair"], 0.8), mat("cl", L["cloth"], 0.9)
    white, black, boot = mat("w", (0.95, 0.95, 0.95), 0.3), mat("k", (0.02, 0.02, 0.02), 0.3), mat("bt", (0.12, 0.07, 0.04), 0.9)
    root = empty((x, y, 0)); root.rotation_euler = (0, 0, rot)
    P = {"root": root}
    for side, dx in (("L", -0.16), ("R", 0.16)):     # legs pivot at hip
        hip = empty((dx * s, 0, 0.9 * s), root); P["leg" + side] = hip
        box((dx * s, 0, 0.45 * s), (0.26 * s, 0.28 * s, 0.9 * s), skin, parent=hip)
        box((dx * s, -0.04, 0.07 * s), (0.3 * s, 0.38 * s, 0.14 * s), boot, parent=hip)
    body = empty((0, 0, 0.9 * s), root); P["body"] = body
    box((0, 0, 1.25 * s), (0.72 * s, 0.4 * s, 0.75 * s), skin, parent=body)
    box((0, 0, 1.15 * s), (0.78 * s, 0.46 * s, 0.7 * s), cloth, bevel=0.03, parent=body)
    for k in range(6): box((-0.33 * s + k * 0.13 * s, 0, 0.78 * s), (0.11 * s, 0.47 * s, 0.14 * s), cloth, bevel=0.01, rot=(0, 0.5 if k % 2 else -0.5, 0), parent=body)
    for side, dx in (("L", -0.5), ("R", 0.5)):       # arms pivot at shoulder
        sh = empty((dx * s, 0, 1.58 * s), body); P["arm" + side] = sh
        box((dx * s, 0, 1.25 * s), (0.22 * s, 0.24 * s, 0.7 * s), skin, parent=sh)
        sph((dx * s, 0, 0.86 * s), 0.13 * s, skin, parent=sh)
    hz = 1.95 * s; hsz = 0.72 * s * (1.15 if who == "leo" else 1)
    head = empty((0, 0, 1.62 * s), body); P["head"] = head
    box((0, 0, hz), (hsz, hsz * 0.9, hsz), skin, bevel=0.26 * s, parent=head)
    sph((0, -hsz * 0.47, hz - 0.04 * s), 0.07 * s, skin, (1, 0.8, 0.9), parent=head)
    for d in (-1, 1): sph((d * hsz * 0.52, 0, hz), 0.09 * s, skin, (0.5, 1, 1.2), parent=head)
    ey = -hsz * 0.46
    for dx in (-0.16, 0.16):
        ex = dx * hsz / 0.72
        if expr == "love":
            box((ex, ey - 0.01, hz + 0.05 * s), (0.14 * s, 0.02, 0.035 * s), black, bevel=0, parent=head)
        else:
            sph((ex, ey, hz + 0.05 * s), 0.085 * s, white, (1, 0.35, 1.2 if expr == "fear" else 1), parent=head)
            sph((ex, ey - 0.03, hz + 0.04 * s), 0.05 * s, black, (1, 0.4, 1), parent=head)
            sph((ex + 0.02, ey - 0.06, hz + 0.07 * s), 0.016 * s, white, parent=head)
        tilt = (0.35 if dx < 0 else -0.35) if expr == "angry" else ((-0.3 if dx < 0 else 0.3) if expr == "fear" else 0)
        box((ex, ey - 0.01, hz + 0.18 * s), (0.15 * s, 0.03, 0.03 * s), hair, bevel=0, rot=(0, tilt, 0), parent=head)
    mth = mat("m", (0.35, 0.07, 0.07))
    if expr in ("happy", "love"): box((0, ey - 0.01, hz - 0.17 * s), (0.18 * s, 0.03, 0.06 * s), mth, bevel=0.02, parent=head)
    elif expr == "fear": sph((0, ey - 0.01, hz - 0.18 * s), 0.06 * s, mth, (1, 0.3, 1.3), parent=head)
    else: box((0, ey - 0.01, hz - 0.17 * s), (0.16 * s, 0.03, 0.025 * s), black, bevel=0, parent=head)
    if who == "mia":
        for d in (-1, 1): sph((d * 0.26 * s, ey - 0.01, hz - 0.08 * s), 0.05 * s, mat("bl", (0.9, 0.4, 0.45)), (1, 0.2, 0.6), parent=head)
    box((0, 0.02, hz + hsz * 0.5), (hsz * 1.08, hsz * 1.0, hsz * 0.28), hair, bevel=0.08, parent=head)
    box((0, hsz * 0.3, hz + 0.05), (hsz * 1.08, hsz * 0.4, hsz * 0.9), hair, bevel=0.08, parent=head)
    if L["hs"] == "long":
        for d in (-1, 1): box((d * hsz * 0.55, 0.05, hz - hsz * 0.45), (hsz * 0.2, hsz * 0.75, hsz * 1.3), hair, bevel=0.05, parent=head)
        sph((hsz * 0.42, -hsz * 0.2, hz + hsz * 0.45), 0.09, mat("fl", (0.95, 0.35, 0.5), emit=0.3), parent=head)
    if L["hs"] == "bun": sph((0, hsz * 0.35, hz + hsz * 0.65), hsz * 0.25, hair, parent=head)
    if L["hs"] == "beard": box((0, ey + 0.05, hz - hsz * 0.35), (hsz * 0.9, 0.12, hsz * 0.45), hair, bevel=0.05, parent=head)
    wood = mat("wd", (0.3, 0.17, 0.08), 0.8)
    if who == "john":
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=2.4, location=(0.62 * s, -0.1, 0.9 * s)); sp = bpy.context.object; sp.data.materials.append(wood)
        bpy.ops.mesh.primitive_cone_add(radius1=0.07, depth=0.25, location=(0.62 * s, -0.1, 2.2 * s)); tip = bpy.context.object; tip.data.materials.append(mat("st", (0.5, 0.5, 0.5), 0.4))
        for o in (sp, tip): o.parent = P["armR"]; o.matrix_parent_inverse = P["armR"].matrix_world.inverted()
    if who == "zor": box((0.66 * s, -0.1, 1.0 * s), (0.2, 0.2, 1.0), wood, bevel=0.06, parent=P["armR"])
    if who == "nana":
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=1.6, location=(0.62 * s, -0.1, 0.8)); o = bpy.context.object; o.data.materials.append(wood); o.parent = P["armR"]; o.matrix_parent_inverse = P["armR"].matrix_world.inverted()
    P["hz"] = hz; P["s"] = s
    return P

def animate(P, act, n, dx=0.0):
    root = P["root"]
    for f in range(1, n + 1):
        t = f / FPS
        sw = math.sin(t * 7) if act in ("walk", "run") else 0
        amp = 0.6 if act == "walk" else 0.9 if act == "run" else 0
        P["legL"].rotation_euler = (sw * amp, 0, 0); P["legR"].rotation_euler = (-sw * amp, 0, 0)
        arm_l = -sw * amp; arm_r = sw * amp
        if act == "scared": arm_l, arm_r = -2.4, -2.4
        if act == "raise": arm_r = -2.6 + 0.1 * math.sin(t * 3)
        if act == "point": arm_r = -1.5
        if act == "hug": arm_l, arm_r = -1.2, -1.2
        P["armL"].rotation_euler = (arm_l, 0, 0); P["armR"].rotation_euler = (arm_r, 0, 0)
        P["body"].rotation_euler = (0.25 if act == "scared" else 0.12 if act == "hug" else 0, 0, 0)
        P["head"].rotation_euler = (0, 0, 0.05 * math.sin(t * 1.3))
        P["body"].location.z = 0.9 * P["s"] + (0.02 * math.sin(t * 2) if act in ("idle", "hug", "scared", "raise", "point") else 0.03 * abs(sw))
        root.location.x += dx / n
        for k in ("legL", "legR", "armL", "armR", "body", "head"):
            P[k].keyframe_insert("rotation_euler", frame=f)
        P["body"].keyframe_insert("location", frame=f); root.keyframe_insert("location", frame=f)

def quad(name, x, y, color, n, speed):  # lion / wolf
    m = mat(name, color, 0.85); root = empty((x, y, 0))
    box((0, 0, 0.75), (1.8, 0.7, 0.7), m, parent=root)
    legs = []
    for lx in (-0.65, 0.65):
        for ly in (-0.25, 0.25):
            hip = empty((lx, ly, 0.6), root); box((lx, ly, 0.3), (0.2, 0.2, 0.6), m, parent=hip); legs.append(hip)
    head = empty((-1.0, 0, 1.0), root)
    if name == "lion": box((-1.0, 0, 1.05), (0.75, 0.9, 0.85), mat("mane", (0.35, 0.16, 0.05), 0.9), bevel=0.15, parent=head)
    box((-1.15, 0, 1.0), (0.55, 0.5, 0.5), m, bevel=0.1, parent=head)
    box((-1.43, 0, 0.92), (0.2, 0.3, 0.22), mat("snout", (0.85, 0.7, 0.45) if name == "lion" else (0.6, 0.6, 0.6)), bevel=0.05, parent=head)
    for d in (-0.13, 0.13): sph((-1.42, d, 1.12), 0.05, mat("eye", (1, 0.85, 0.1), emit=2), parent=head)
    if name == "wolf":
        for d in (-0.15, 0.15): box((-1.05, d, 1.35), (0.12, 0.08, 0.25), m, bevel=0.02, parent=head)
    box((1.0, 0, 1.0), (0.6, 0.1, 0.1), m, rot=(0, -0.6, 0), parent=root)
    for f in range(1, n + 1):
        t = f / FPS
        for i, lg in enumerate(legs): lg.rotation_euler = (0, math.sin(t * 6 + i * 1.6) * 0.5, 0); lg.keyframe_insert("rotation_euler", frame=f)
        root.location.x = x - speed * (f / n); root.keyframe_insert("location", frame=f)
        head.rotation_euler = (0, 0, 0.1 * math.sin(t * 2)); head.keyframe_insert("rotation_euler", frame=f)

def setting(name, fire, firex, n):
    sc = bpy.context.scene; w = bpy.data.worlds.new("w"); w.use_nodes = True; bgn = w.node_tree.nodes["Background"]; sc.world = w
    sky = {"savanna": ((0.95, 0.5, 0.22), 0.9), "forest": ((0.2, 0.32, 0.18), 0.5), "night": ((0.02, 0.03, 0.09), 0.6),
           "cave": ((0.05, 0.03, 0.02), 0.4), "ice": ((0.75, 0.85, 0.95), 0.9), "village": ((0.55, 0.75, 0.95), 0.9)}[name]
    bgn.inputs[0].default_value = (*sky[0], 1); bgn.inputs[1].default_value = sky[1]
    ground = {"savanna": (0.55, 0.38, 0.12), "forest": (0.12, 0.22, 0.07), "night": (0.06, 0.06, 0.05), "cave": (0.15, 0.1, 0.07), "ice": (0.92, 0.95, 1), "village": (0.35, 0.5, 0.18)}[name]
    box((0, 6, -0.05), (80, 80, 0.1), mat("g", ground, 0.95), bevel=0)
    random.seed(5)
    if name in ("savanna", "night"):
        gm = mat("grass", (0.5, 0.38, 0.1) if name == "savanna" else (0.08, 0.09, 0.06), 0.9)
        for i in range(160): box((random.uniform(-10, 10), random.uniform(1.0, 16), 0.25), (0.05, 0.05, random.uniform(0.3, 0.8)), gm, bevel=0, rot=(random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), 0))
        tr = mat("tr", (0.2, 0.12, 0.06)); lf = mat("lf", (0.2, 0.3, 0.07) if name == "savanna" else (0.04, 0.06, 0.03))
        box((4.5, 10, 1.6), (0.35, 0.35, 3.2), tr); 
        for dx, dz in ((-0.8, 3.3), (0.8, 3.3), (0, 3.6)): sph((4.5 + dx, 10, dz), 1.4, lf, (1.4, 1.1, 0.3))
    if name == "savanna":
        sph((-4, 40, 7), 3, mat("sun", (1, 0.75, 0.4), emit=6))
        bpy.ops.object.light_add(type="SUN", rotation=(math.radians(70), 0, math.radians(200))); bpy.context.object.data.energy = 3; bpy.context.object.data.color = (1, 0.7, 0.45)
    if name == "night":
        sph((5, 40, 12), 1.8, mat("moon", (0.95, 0.95, 0.85), emit=5))
        for i in range(60): sph((random.uniform(-40, 40), 45, random.uniform(6, 30)), 0.08, mat("star", (1, 1, 1), emit=8))
        bpy.ops.object.light_add(type="SUN", rotation=(math.radians(60), 0, math.radians(160))); bpy.context.object.data.energy = 0.4; bpy.context.object.data.color = (0.5, 0.6, 1)
    if name == "forest":
        tr = mat("tr", (0.15, 0.09, 0.05)); lf = mat("lf", (0.08, 0.2, 0.06))
        for i in range(26):
            x, y = random.uniform(-9, 9), random.uniform(2, 18)
            if abs(x) < 1.5 and y < 5: continue
            box((x, y, 2.5), (0.5, 0.5, 5), tr); sph((x, y, 5.6), random.uniform(1.6, 2.4), lf)
        bpy.ops.object.light_add(type="SUN", rotation=(math.radians(55), 0, math.radians(20))); bpy.context.object.data.energy = 1.5; bpy.context.object.data.color = (0.8, 1, 0.8)
    if name == "cave":
        rk = mat("rock", (0.18, 0.13, 0.1), 0.95)
        for i in range(30): sph((random.choice([-1, 1]) * random.uniform(2.5, 4), random.uniform(-2, 8), random.uniform(0, 4)), random.uniform(1, 2), rk)
        box((0, 4, 5), (12, 14, 1), rk, bevel=0.3)
    if name == "ice":
        sn = mat("snow", (0.95, 0.97, 1), 0.5)
        for i in range(10): sph((random.uniform(-14, 14), random.uniform(12, 30), 0), random.uniform(3, 6), sn, (1, 1, 0.8))
        bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), 0, math.radians(30))); bpy.context.object.data.energy = 2.5
    if name == "village":
        wl, rf = mat("wall", (0.6, 0.4, 0.22)), mat("roof", (0.55, 0.42, 0.15))
        for x in (-4, 0, 4):
            box((x, 9, 1), (2.5, 2.5, 2), wl); bpy.ops.mesh.primitive_cone_add(radius1=2.1, depth=1.6, location=(x, 9, 2.8), vertices=4); bpy.context.object.data.materials.append(rf)
        bpy.ops.object.light_add(type="SUN", rotation=(math.radians(55), 0, math.radians(30))); bpy.context.object.data.energy = 3
    bpy.ops.object.light_add(type="AREA", location=(0, -6, 4)); bpy.context.object.data.energy = 250 if name in ("night", "cave") else 500; bpy.context.object.data.size = 6
    if fire:
        fx = firex
        for r in (0.6, -0.6): box((fx, 0.6, 0.08), (0.9, 0.12, 0.12), mat("log", (0.2, 0.1, 0.05)), rot=(0, 0, r))
        bpy.ops.object.light_add(type="POINT", location=(fx, 0.6, 0.6)); fl = bpy.context.object; fl.data.color = (1, 0.55, 0.2)
        bpy.ops.mesh.primitive_cone_add(radius1=0.32, depth=0.9, location=(fx, 0.6, 0.5)); c1 = bpy.context.object; c1.data.materials.append(mat("fire", (1, 0.4, 0.05), emit=12))
        bpy.ops.mesh.primitive_cone_add(radius1=0.18, depth=0.6, location=(fx, 0.55, 0.42)); c2 = bpy.context.object; c2.data.materials.append(mat("fire2", (1, 0.85, 0.2), emit=15))
        for f in range(1, n + 1):
            k = 1 + 0.15 * math.sin(f * 1.7) + 0.1 * math.sin(f * 0.9)
            c1.scale = (1, 1, k); c2.scale = (1, 1, 2 - k); fl.data.energy = 600 * k
            c1.keyframe_insert("scale", frame=f); c2.keyframe_insert("scale", frame=f); fl.data.keyframe_insert("energy", frame=f)

def camera(kind, focus, n):
    sc = bpy.context.scene
    bpy.ops.object.camera_add(); c = bpy.context.object; sc.camera = c
    tgt = empty((0, 0, 1.3)); k = c.constraints.new("TRACK_TO"); k.target = tgt; k.track_axis = "TRACK_NEGATIVE_Z"; k.up_axis = "UP_Y"
    fx, fz = (focus["root"].location.x, focus["hz"]) if focus else (0, 1.6)
    for f in (1, n):
        p = (f - 1) / max(1, n - 1)
        if kind == "close":
            c.location = (fx + 0.3 - 0.2 * p, -2.6 + 0.4 * p, fz + 0.1); tgt.location = (fx, 0, fz - 0.05); c.data.lens = 50
        elif kind == "low":
            c.location = (fx - 1.2 + 0.6 * p, -3.8, 0.45); tgt.location = (fx, 0, fz); c.data.lens = 28
        elif kind == "two":
            c.location = (fx + 1.8, -4.6 + 0.5 * p, fz - 0.2); tgt.location = (fx - 0.5, 0, fz - 0.3); c.data.lens = 40
        else:
            c.location = (0, -10 + 1.5 * p, 2.0); tgt.location = (0, 0, 1.3); c.data.lens = 30
        c.keyframe_insert("location", frame=f); tgt.keyframe_insert("location", frame=f)

def hearts(n):
    m = mat("heart", (1, 0.25, 0.4), emit=4)
    for i in range(3):
        h = empty((-0.3 + i * 0.3, -0.3, 2.6))
        for d in (-0.06, 0.06): sph((d, 0, 0.04), 0.08, m, parent=h)
        bpy.ops.mesh.primitive_cone_add(radius1=0.13, depth=0.16, location=(0, 0, -0.06), rotation=(math.pi, 0, 0)); o = bpy.context.object; o.data.materials.append(m); o.parent = h
        for f in range(1, n + 1):
            h.location.z = 2.6 + ((f + i * 12) % 40) / 30; h.keyframe_insert("location", frame=f)

total = len(shots)
for idx, sh in enumerate(shots):
    if idx % chunks != chunk: continue
    n = sh["len"]; sc = reset(); sc.frame_start, sc.frame_end = 1, n
    setting(sh["set"], sh.get("fire"), sh.get("firex", 1.6), n)
    Ps = []
    for ch in sh["chars"]:
        P = character(ch["who"], ch["x"], ch.get("y", 0), ch.get("rot", 0), ch.get("expr", "calm"))
        animate(P, ch.get("act", "idle"), n, ch.get("dx", 0)); Ps.append(P)
    if sh.get("animal") in ("lion", "wolf"):
        quad(sh["animal"], 4.5, 0.4, (0.72, 0.45, 0.15) if sh["animal"] == "lion" else (0.35, 0.37, 0.4), n, 1.6)
    if sh.get("heart"): hearts(n)
    camera(sh.get("cam", "wide"), Ps[min(sh.get("focus", 0), len(Ps) - 1)] if Ps else None, n)
    sc.render.filepath = f"{out}/s{idx:03d}_"; bpy.ops.render.render(animation=True)
    print(f"shot {idx}/{total} done ({n} frames)")
