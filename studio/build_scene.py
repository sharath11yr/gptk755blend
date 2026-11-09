"""Titanic test - step 2: build the scene in Blender and render one chunk of frames.
blender -b -P build_scene.py -- <chunk> <chunks> <frames> <assets_dir>

v2 (cinematic): open ocean to the horizon, night sky with stars and a faint horizon glow,
the ship sailing with a gentle pitch and roll, a foam wake, funnel smoke haze, and 4
camera shots cut like a film (wide, tracking, aerial, low bow pass) with depth of field
and motion blur. Uses a real 3D model when studio/models/*.glb exists (or Sketchfab gave
one), else builds a detailed liner itself."""
import bmesh, bpy, glob, math, os, sys
from mathutils import Vector

chunk, chunks, frames, assets = sys.argv[sys.argv.index("--") + 1:][:4]
chunk, chunks, frames = int(chunk), int(chunks), int(frames)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 48
sc.cycles.use_denoising = True; sc.render.fps = 24
sc.cycles.max_bounces = 6; sc.cycles.caustics_reflective = sc.cycles.caustics_refractive = False
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
SPEED = 4.0  # metres per second the ship sails (+X)
here = os.path.dirname(os.path.abspath(__file__))


def mat(name, rgb, rough=0.5, emit=0.0, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def box(loc, size, m, parent, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); o.data.materials.append(m)
    if bevel:
        o.modifiers.new("b", "BEVEL").width = bevel
    o.parent = parent
    return o


def cyl(loc, r, depth, m, parent, sx=1.0, tilt=0.0, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=verts)
    o = bpy.context.object; o.scale.x = sx; o.rotation_euler.y = math.radians(tilt)
    o.data.materials.append(m); o.parent = parent
    bpy.ops.object.shade_smooth()
    return o


def hull_mesh(length, beam, depth, m, parent):
    """A real ship hull: sharp raked bow, rounded counter stern, flared sides."""
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, depth / 2)); o = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=24, use_grid_fill=True)
    for v in bm.verts:
        x = v.co.x  # -1 (stern) .. 1 (bow)
        z = (v.co.z + 1) / 2  # 0 keel .. 1 deck
        if x > 0.55:  # bow: taper to a knife edge, raked forward at the top
            k = 1 - ((x - 0.55) / 0.45) ** 1.6
        elif x < -0.75:  # stern: rounded
            k = math.sqrt(max(0.0, 1 - ((-x - 0.75) / 0.25) ** 2)) * 0.9 + 0.1
        else:
            k = 1.0
        k *= 0.55 + 0.45 * z ** 0.5  # narrower towards the keel (flare)
        v.co.y *= max(0.02, k) * beam / 2
        v.co.x = x * length / 2 + (z * 2.5 if x > 0.55 else 0)
        v.co.z = z * depth
    bm.to_mesh(o.data); bm.free()
    o.scale = (1, 1, 1); o.data.materials.append(m); o.parent = parent
    bpy.ops.object.shade_smooth()
    return o


def procedural_ship(root):
    """A detailed Olympic-class style liner, about 60 m long (scaled scene)."""
    black = mat("hull", (0.015, 0.015, 0.017), 0.35)
    red = mat("antifoul", (0.22, 0.03, 0.02), 0.6)
    white = mat("superstructure", (0.78, 0.76, 0.70), 0.45)
    deck = mat("deck", (0.35, 0.25, 0.16), 0.7)
    buff = mat("funnel", (0.72, 0.47, 0.18), 0.55)
    glow = mat("window", (1.0, 0.72, 0.38), 0.4, 8.0)
    wood = mat("lifeboat", (0.85, 0.85, 0.82), 0.5)
    L, B = 60.0, 6.4
    h = hull_mesh(L, B, 6.0, black, root)
    r = hull_mesh(L * 0.985, B * 0.97, 1.6, red, root); r.location.z = -0.05
    box((-1, 0, 6.05), (L * 0.9, B * 0.92, 0.1), deck, root)
    # superstructure decks with lit windows
    for (x, ln, z, hgt, w) in ((0, 42, 6.6, 1.1, 5.8), (-1, 36, 7.7, 1.0, 5.4), (0, 26, 8.7, 0.9, 4.6)):
        box((x, 0, z), (ln, w, hgt), white, root, 0.03)
        for i in range(int(ln / 0.9)):
            for y in (w / 2 + 0.01, -w / 2 - 0.01):
                box((x - ln / 2 + 0.6 + i * 0.9, y, z + 0.1), (0.45, 0.02, 0.35), glow, root)
    box((15.5, 0, 9.3), (3.5, 5.2, 1.0), white, root, 0.03)  # bridge
    # hull portholes: 3 rows
    for row, z in enumerate((3.6, 4.4, 5.2)):
        for i in range(int(46 / 0.75)):
            x = -24 + i * 0.75
            for side in (1, -1):
                bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.05, vertices=8,
                                                    location=(x, side * (B / 2 - 0.02), z),
                                                    rotation=(math.pi / 2, 0, 0))
                p = bpy.context.object; p.data.materials.append(glow); p.parent = root
    # lifeboats along the boat deck
    for i in range(8):
        for side in (1, -1):
            box((-14 + i * 4.2 if i < 4 else -2 + i * 3.2, side * 2.5, 9.4), (2.2, 0.6, 0.45), wood, root, 0.15)
    # 4 raked funnels with black tops
    for x in (11, 3.5, -4, -11.5):
        cyl((x, 0, 12.6), 1.05, 7.0, buff, root, sx=1.3, tilt=-8)
        cyl((x - 0.5, 0, 15.9), 1.08, 1.0, black, root, sx=1.3, tilt=-8)
    # masts and rigging
    for x, hgt in ((22, 22), (-24, 20)):
        cyl((x, 0, 6 + hgt / 2), 0.15, hgt, black, root, verts=8)
    for a, b in (((22, 0, 27.5), (-24, 0, 25.5)), ((22, 0, 27.5), (29, 0, 6.2)), ((-24, 0, 25.5), (-29, 0, 6.2))):
        a, b = Vector(a), Vector(b); d = b - a
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=d.length, vertices=6, location=(a + b) / 2)
        c = bpy.context.object; c.rotation_mode = "QUATERNION"
        c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
        c.data.materials.append(black); c.parent = root
    # mast-head lights
    for x, z in ((22, 27.6), (-24, 25.6)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(x, 0, z))
        s = bpy.context.object; s.data.materials.append(mat("mastlight", (1, 0.95, 0.85), 0.3, 40)); s.parent = root
    return 60.0, 18.0


# ---------- the ship ----------
root = bpy.data.objects.new("ship", None); sc.collection.objects.link(root)
files = (glob.glob(f"{here}/models/*.glb") + glob.glob(f"{here}/models/*.gltf") +
         glob.glob(f"{assets}/model/**/*.gltf", recursive=True) + glob.glob(f"{assets}/model/**/*.glb", recursive=True))
if files:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=files[0])
    new = [o for o in bpy.data.objects if o not in before]
    holder = bpy.data.objects.new("model", None); sc.collection.objects.link(holder)
    for o in new:
        if o.parent is None:
            o.parent = holder
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    size = mx - mn
    if size.z > max(size.x, size.y):  # stored standing up: lay it down
        holder.rotation_euler.x = math.pi / 2 if size.y < size.x else 0
        holder.rotation_euler.y = 0 if size.y < size.x else math.pi / 2
        bpy.context.view_layer.update()
        pts = [o.matrix_world @ Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
        mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        size = mx - mn
    if size.y > size.x:  # make the ship point along +X
        holder.rotation_euler.z = math.pi / 2
    s = 60 / max(size); holder.scale = (s, s, s)
    c = (mn + mx) / 2
    holder.location = Vector((-c.x, -c.y, -mn.z - 0.12 * size.z)) * s
    if size.y > size.x:
        holder.location = Vector((c.y, -c.x, -mn.z - 0.12 * size.z)) * s
    holder.parent = root
    length, height = 60.0, size.z * s
else:
    length, height = procedural_ship(root)
    root.location.z = -1.4  # waterline

dur = frames / 24
for f in (1, frames):  # sail forward
    root.location.x = SPEED * (f - 1) / 24; root.keyframe_insert("location", index=0, frame=f)
for fc in root.animation_data.action.fcurves:
    for k in fc.keyframe_points:
        k.interpolation = "LINEAR"
root.rotation_mode = "XYZ"  # gentle swell: pitch and roll
for i, (axis, amp, per) in enumerate(((0, 0.6, 9.0), (1, 0.35, 13.0))):
    fc = root.driver_add("rotation_euler", axis).driver
    fc.expression = f"radians({amp})*sin(frame/24*2*pi/{per})"

# ---------- open ocean to the horizon ----------
bpy.ops.mesh.primitive_plane_add(size=2); ocean = bpy.context.object
m = ocean.modifiers.new("ocean", "OCEAN")
m.geometry_mode = "GENERATE"; m.size = 1; m.spatial_size = 200; m.repeat_x = m.repeat_y = 6
m.resolution = 14; m.wave_scale = 0.9; m.choppiness = 1.0; m.wind_velocity = 9
m.use_foam = True; m.foam_layer_name = "foam"; m.foam_coverage = 0.25
m.time = 0; m.keyframe_insert("time", frame=1); m.time = dur; m.keyframe_insert("time", frame=frames)
ocean.location = (SPEED * dur / 2, 0, 0)
bpy.ops.object.shade_smooth()
water = bpy.data.materials.new("water"); water.use_nodes = True
nt = water.node_tree; b = nt.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.002, 0.008, 0.014, 1)
b.inputs["Roughness"].default_value = 0.06; b.inputs["IOR"].default_value = 1.333
ocean.data.materials.append(water)
# far sea: a huge flat plane to the horizon, same material
bpy.ops.mesh.primitive_plane_add(size=6000, location=(0, 0, -0.3)); bpy.context.object.data.materials.append(water)

# foam wake behind the ship + bow wave
wake = bpy.data.materials.new("wake"); wake.use_nodes = True
wn = wake.node_tree; wb = wn.nodes["Principled BSDF"]
wb.inputs["Base Color"].default_value = (0.6, 0.65, 0.7, 1); wb.inputs["Roughness"].default_value = 0.8
noise = wn.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 6; noise.inputs["Detail"].default_value = 10
ramp = wn.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.55; ramp.color_ramp.elements[1].position = 0.75
grad = wn.nodes.new("ShaderNodeTexGradient"); tc = wn.nodes.new("ShaderNodeTexCoord")
mul = wn.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
wn.links.new(tc.outputs["Generated"], grad.inputs["Vector"])
wn.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
wn.links.new(ramp.outputs["Color"], mul.inputs[0]); wn.links.new(grad.outputs["Fac"], mul.inputs[1])
wn.links.new(mul.outputs[0], wb.inputs["Alpha"])
for loc, size in (((-length / 2 - 40, 0, 0.05), (80, 9)), ((length / 2 - 2, 0, 0.06), (6, 8))):
    bpy.ops.mesh.primitive_plane_add(location=loc); w_ = bpy.context.object
    w_.scale = (size[0] / 2, size[1] / 2, 1); w_.data.materials.append(wake); w_.parent = root
    w_.rotation_euler.z = math.pi if loc[0] < 0 else 0

# funnel smoke haze (volume)
smoke = bpy.data.materials.new("smoke"); smoke.use_nodes = True
sn = smoke.node_tree; sn.nodes.remove(sn.nodes["Principled BSDF"])
vol = sn.nodes.new("ShaderNodeVolumePrincipled"); vol.inputs["Density"].default_value = 0.04
vol.inputs["Color"].default_value = (0.25, 0.24, 0.23, 1)
sn.links.new(vol.outputs[0], sn.nodes["Material Output"].inputs["Volume"])
for x in (11, 3.5, -4):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(x - 9, 0, 19))
    s = bpy.context.object; s.scale = (10, 2.2, 1.8); s.data.materials.append(smoke); s.parent = root

# ---------- night sky ----------
w = bpy.data.worlds.new("night"); sc.world = w; w.use_nodes = True
wt = w.node_tree; bg = wt.nodes["Background"]
sky = wt.nodes.new("ShaderNodeTexSky"); sky.sky_type = "NISHITA"
sky.sun_elevation = math.radians(-4); sky.sun_rotation = math.radians(200); sky.altitude = 0
stars = wt.nodes.new("ShaderNodeTexVoronoi"); stars.inputs["Scale"].default_value = 600
sr = wt.nodes.new("ShaderNodeValToRGB"); sr.color_ramp.elements[0].position = 0.0
sr.color_ramp.elements[0].color = (1, 1, 1, 1); sr.color_ramp.elements[1].position = 0.03
sr.color_ramp.elements[1].color = (0, 0, 0, 1)
add = wt.nodes.new("ShaderNodeMixRGB"); add.blend_type = "ADD"; add.inputs[0].default_value = 0.6
base = wt.nodes.new("ShaderNodeMixRGB"); base.blend_type = "ADD"; base.inputs[0].default_value = 1
base.inputs[2].default_value = (0.002, 0.004, 0.012, 1)
wt.links.new(stars.outputs["Distance"], sr.inputs["Fac"])
wt.links.new(sky.outputs["Color"], base.inputs[1])
wt.links.new(base.outputs["Color"], add.inputs[1]); wt.links.new(sr.outputs["Color"], add.inputs[2])
wt.links.new(add.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.6

moon = bpy.data.objects.new("starlight", bpy.data.lights.new("starlight", "SUN"))
moon.data.energy = 0.25; moon.data.color = (0.6, 0.72, 1.0); moon.data.angle = math.radians(3)
moon.rotation_euler = (math.radians(55), 0, math.radians(30)); sc.collection.objects.link(moon)
glow = bpy.data.objects.new("deckglow", bpy.data.lights.new("deckglow", "AREA"))
glow.data.energy = 2500; glow.data.size = 50; glow.data.color = (1.0, 0.72, 0.42)
glow.location = (0, 0, 22); glow.parent = root; sc.collection.objects.link(glow)

# ---------- 4 camera shots, cut like a film ----------
target = bpy.data.objects.new("target", None); target.parent = root
target.location = (0, 0, height * 0.35); sc.collection.objects.link(target)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
sc.camera = cam; cam.data.dof.use_dof = True; cam.data.dof.focus_object = target
cam.data.dof.aperture_fstop = 5.6; cam.data.sensor_width = 36
tt = cam.constraints.new("TRACK_TO"); tt.target = target
tt.track_axis = "TRACK_NEGATIVE_Z"; tt.up_axis = "UP_Y"


def ship_x(f):
    return SPEED * (f - 1) / 24


SHOTS = [  # (share of the video, lens, start offset, end offset) - offsets relative to the ship
    (0.30, 28, (140, -150, 4), (70, -95, 3)),      # wide: she comes towards us over the sea
    (0.25, 50, (5, -45, 4), (-15, -42, 6)),         # tracking alongside, lit portholes
    (0.25, 24, (-60, -70, 55), (20, 40, 70)),       # aerial drone sweep over the decks
    (0.20, 35, (45, -14, 1.2), (-40, -16, 1.5)),    # low pass along the hull from the bow
]
f0 = 1
for share, lens, a, b in SHOTS:
    f1 = min(frames, f0 + max(24, round(frames * share)))
    for f, off in ((f0, a), (f1, b)):
        cam.location = (ship_x(f) + off[0], off[1], off[2])
        cam.keyframe_insert("location", frame=f)
        cam.data.lens = lens; cam.data.keyframe_insert("lens", frame=f)
    f0 = f1 + 1
    if f0 > frames:
        break

# ---------- render this chunk ----------
per = math.ceil(frames / chunks)
sc.frame_start, sc.frame_end = chunk * per + 1, min(frames, (chunk + 1) * per)
sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 93
sc.render.filepath = f"{assets}/frames/f_"
if sc.frame_start <= sc.frame_end:
    bpy.ops.render.render(animation=True)
