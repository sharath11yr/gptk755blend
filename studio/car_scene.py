"""Car-chase look test: a real car model on a wet night road with fog, street lights,
headlights, tail lights and fast cinematic cuts (low tracking, front chase, wheel-level
pass, overhead). blender -b -P car_scene.py -- <chunk> <chunks> <frames> <assets_dir>"""
import bpy, glob, math, sys
from mathutils import Vector

chunk, chunks, frames, assets = sys.argv[sys.argv.index("--") + 1:][:4]
chunk, chunks, frames = int(chunk), int(chunks), int(frames)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 64
sc.cycles.use_denoising = True; sc.render.fps = 24
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.6
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - High Contrast"
SPEED = 22.0  # m/s (~80 km/h)
L = 4.6       # car length in metres


def mat(name, rgb, rough=0.5, emit=0.0, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = emit
    return m


# ---------- car ----------
car = bpy.data.objects.new("car", None); sc.collection.objects.link(car)
files = glob.glob(f"{assets}/model/*.glb")
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=files[0])
new = [o for o in bpy.data.objects if o not in before]
holder = bpy.data.objects.new("holder", None); sc.collection.objects.link(holder)
for o in new:
    if o.parent is None:
        o.parent = holder


def bounds():
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))


mn, mx = bounds(); size = mx - mn
if size.z > max(size.x, size.y):
    holder.rotation_euler.x = math.pi / 2; mn, mx = bounds(); size = mx - mn
if size.y > size.x:
    holder.rotation_euler.z = math.pi / 2; mn, mx = bounds(); size = mx - mn
s = L / size.x
holder.scale = (s, s, s); mn, mx = bounds()
holder.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
holder.parent = car
width, height = (mx.y - mn.y), (mx.z - mn.z)
# Which end is the front? Assume +X; headlights there, tail lights at -X.
for side in (1, -1):
    hl = bpy.data.objects.new("head", bpy.data.lights.new("head", "SPOT"))
    hl.data.energy = 2500; hl.data.spot_size = math.radians(45); hl.data.color = (1, 0.95, 0.85)
    hl.data.shadow_soft_size = 0.05
    hl.location = (L / 2 + 0.1, side * width * 0.32, height * 0.38)
    hl.rotation_euler = (0, math.radians(-95), 0); hl.parent = car; sc.collection.objects.link(hl)
    tl = bpy.data.objects.new("tail", bpy.data.lights.new("tail", "POINT"))
    tl.data.energy = 15; tl.data.color = (1, 0.05, 0.02); tl.data.shadow_soft_size = 0.1
    tl.location = (-L / 2 - 0.05, side * width * 0.36, height * 0.5); tl.parent = car
    sc.collection.objects.link(tl)
car.animation_data_create()
for f in (1, frames):
    car.location.x = SPEED * (f - 1) / 24; car.keyframe_insert("location", index=0, frame=f)
for fc in car.animation_data.action.fcurves:
    for k in fc.keyframe_points:
        k.interpolation = "LINEAR"
d = car.driver_add("location", 2).driver; d.expression = "0.012*sin(frame*1.7)"  # road vibration

# ---------- wet road, kerbs, street lights ----------
run = SPEED * frames / 24 + 200
road = mat("asphalt", (0.02, 0.02, 0.022), 0.2)
nt = road.node_tree; b = nt.nodes["Principled BSDF"]
nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.45; ramp.color_ramp.elements[0].color = (0.03, 0.03, 0.03, 1)
ramp.color_ramp.elements[1].position = 0.6; ramp.color_ramp.elements[1].color = (0.45, 0.45, 0.45, 1)
nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], b.inputs["Roughness"])
bump = nt.nodes.new("ShaderNodeBump"); n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 300
bump.inputs["Strength"].default_value = 0.15
nt.links.new(n2.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
bpy.ops.mesh.primitive_plane_add(location=(run / 2 - 100, 0, 0)); p = bpy.context.object
p.scale = (run / 2, 7, 1); p.data.materials.append(road)
line = mat("line", (0.8, 0.75, 0.55), 0.6)
for i in range(int(run / 9)):
    bpy.ops.mesh.primitive_plane_add(location=(-100 + i * 9, 0, 0.005)); l = bpy.context.object
    l.scale = (1.5, 0.07, 1); l.data.materials.append(line)
ground = mat("ground", (0.015, 0.018, 0.015), 0.9)
for y in (40, -40):
    bpy.ops.mesh.primitive_plane_add(location=(run / 2 - 100, y, -0.15)); g = bpy.context.object
    g.scale = (run / 2, 33, 1); g.data.materials.append(ground)
pole_m = mat("pole", (0.05, 0.05, 0.05), 0.4, metal=1)
lamp_m = mat("lamp", (1.0, 0.6, 0.25), 0.3, 30)
for i in range(int(run / 30)):
    for side in (1, -1):
        x = -100 + i * 30 + (15 if side < 0 else 0)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=8, location=(x, side * 8, 4)); bpy.context.object.data.materials.append(pole_m)
        bpy.ops.mesh.primitive_cube_add(location=(x, side * 6.6, 8)); a = bpy.context.object
        a.scale = (0.3, 1.5, 0.08); a.data.materials.append(pole_m)
        bpy.ops.mesh.primitive_cube_add(location=(x, side * 5.6, 7.9)); h = bpy.context.object
        h.scale = (0.25, 0.4, 0.04); h.data.materials.append(lamp_m)
        lt = bpy.data.objects.new("street", bpy.data.lights.new("street", "SPOT"))
        lt.data.energy = 3500; lt.data.spot_size = math.radians(110); lt.data.color = (1.0, 0.62, 0.3)
        lt.location = (x, side * 5.6, 7.8); sc.collection.objects.link(lt)
# simple buildings / trees silhouettes far away
dark = mat("silhouette", (0.01, 0.012, 0.015), 0.8)
import random
random.seed(4)
for i in range(int(run / 12)):
    for side in (1, -1):
        hgt = random.uniform(6, 22)
        bpy.ops.mesh.primitive_cube_add(location=(-100 + i * 12 + random.uniform(-3, 3), side * random.uniform(30, 55), hgt / 2))
        o = bpy.context.object; o.scale = (random.uniform(3, 6), random.uniform(3, 6), hgt / 2); o.data.materials.append(dark)

# ---------- fog (volume) + night sky ----------
fog = bpy.data.materials.new("fog"); fog.use_nodes = True; fn = fog.node_tree
fn.nodes.remove(fn.nodes["Principled BSDF"])
v = fn.nodes.new("ShaderNodeVolumePrincipled"); v.inputs["Density"].default_value = 0.012
v.inputs["Anisotropy"].default_value = 0.6
fn.links.new(v.outputs[0], fn.nodes["Material Output"].inputs["Volume"])
bpy.ops.mesh.primitive_cube_add(location=(run / 2 - 100, 0, 10)); fb = bpy.context.object
fb.scale = (run / 2, 60, 10); fb.data.materials.append(fog)
w = bpy.data.worlds.new("night"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.007, 0.014, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
moon = bpy.data.objects.new("moon", bpy.data.lights.new("moon", "SUN"))
moon.data.energy = 0.08; moon.data.color = (0.5, 0.65, 1.0)
moon.rotation_euler = (math.radians(50), 0, math.radians(140)); sc.collection.objects.link(moon)

# ---------- fast cinematic cuts ----------
target = bpy.data.objects.new("t", None); target.parent = car; target.location = (0, 0, height * 0.45)
sc.collection.objects.link(target)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
sc.camera = cam; cam.data.sensor_width = 36
cam.data.dof.use_dof = True; cam.data.dof.focus_object = target; cam.data.dof.aperture_fstop = 2.0
tt = cam.constraints.new("TRACK_TO"); tt.target = target; tt.track_axis = "TRACK_NEGATIVE_Z"; tt.up_axis = "UP_Y"
SHOTS = [  # (seconds, lens, start offset, end offset) relative to the car
    (2.5, 35, (14, -2.5, 0.35), (7, -2.0, 0.5)),     # low front: car rushes at us
    (2.5, 50, (-2, -5.5, 0.8), (2, -5.0, 1.0)),      # tracking side, wheel level
    (2.0, 24, (-9, 1.5, 1.6), (-7, 0.8, 1.4)),       # chase from behind, tail lights
    (2.0, 85, (3, -1.6, 0.25), (-1, -1.6, 0.25)),    # close detail pass along the body
    (3.0, 30, (-6, -10, 14), (12, -6, 10)),          # drone overhead into the fog
]
f0 = 1
for secs, lens, a, b in SHOTS:
    f1 = min(frames, f0 + round(secs * 24) - 1)
    for f, off in ((f0, a), (f1, b)):
        cam.location = (SPEED * (f - 1) / 24 + off[0], off[1], off[2]); cam.keyframe_insert("location", frame=f)
        cam.data.lens = lens; cam.data.keyframe_insert("lens", frame=f)
    f0 = f1 + 1
    if f0 > frames:
        break
for fc in list(cam.animation_data.action.fcurves) + list(cam.data.animation_data.action.fcurves):
    for k in fc.keyframe_points:
        k.interpolation = "LINEAR"

per = math.ceil(frames / chunks)
sc.frame_start, sc.frame_end = chunk * per + 1, min(frames, (chunk + 1) * per)
sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 93
sc.render.filepath = f"{assets}/frames/f_"
if sc.frame_start <= sc.frame_end:
    bpy.ops.render.render(animation=True)
