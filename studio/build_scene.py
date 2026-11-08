"""Titanic test - step 2: build the scene in Blender and render one chunk of frames.
blender -b -P build_scene.py -- <chunk> <chunks> <frames> <assets_dir>"""
import bpy, glob, math, os, sys
from mathutils import Vector

chunk, chunks, frames, assets = sys.argv[sys.argv.index("--") + 1:][:4]
chunk, chunks, frames = int(chunk), int(chunks), int(frames)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 32
sc.cycles.use_denoising = True; sc.render.fps = 24
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"

# Ship: import, scale to ~60 m long, sit in the water
files = glob.glob(f"{assets}/model/**/*.gltf", recursive=True) + glob.glob(f"{assets}/model/**/*.glb", recursive=True)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=files[0])
new = [o for o in bpy.data.objects if o not in before]
root = bpy.data.objects.new("ship", None); sc.collection.objects.link(root)
for o in new:
    if o.parent is None:
        o.parent = root
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
s = 60 / max(mx - mn)
root.scale = (s, s, s)
c = (mn + mx) / 2
root.location = (-c.x * s, -c.y * s, -mn.z * s - 0.12 * (mx.z - mn.z) * s)
height = (mx.z - mn.z) * s

# Ocean
bpy.ops.mesh.primitive_plane_add(size=2)
ocean = bpy.context.object
m = ocean.modifiers.new("ocean", "OCEAN")
m.geometry_mode = "GENERATE"; m.size = 6; m.spatial_size = 120; m.repeat_x = m.repeat_y = 4
m.resolution = 12; m.wave_scale = 0.6; m.choppiness = 0.8; m.wind_velocity = 12
m.time = 0; m.keyframe_insert("time", frame=1)
m.time = frames / 24 * 0.8; m.keyframe_insert("time", frame=frames)
ocean.location.z = 0
mat = bpy.data.materials.new("water"); mat.use_nodes = True
b = mat.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.005, 0.015, 0.03, 1); b.inputs["Roughness"].default_value = 0.04
ocean.data.materials.append(mat)

# Night sky + moonlight + warm ship glow
w = bpy.data.worlds.new("night"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]
hdr = f"{assets}/sky.hdr"
if os.path.exists(hdr):
    env = w.node_tree.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(hdr)
    w.node_tree.links.new(env.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.35
else:
    bg.inputs["Color"].default_value = (0.003, 0.006, 0.015, 1)
moon = bpy.data.objects.new("moon", bpy.data.lights.new("moon", "SUN"))
moon.data.energy = 0.8; moon.data.color = (0.65, 0.75, 1.0); moon.rotation_euler = (math.radians(60), 0, math.radians(35))
sc.collection.objects.link(moon)
glow = bpy.data.objects.new("glow", bpy.data.lights.new("glow", "AREA"))
glow.data.energy = 4000; glow.data.size = 40; glow.data.color = (1.0, 0.75, 0.45)
glow.location = (0, -25, height * 1.2); glow.rotation_euler = (math.radians(70), 0, 0)
sc.collection.objects.link(glow)

# Camera: slow cinematic orbit around the ship
target = bpy.data.objects.new("target", None); target.location = (0, 0, height * 0.35); sc.collection.objects.link(target)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); cam.data.lens = 32
sc.collection.objects.link(cam); sc.camera = cam
t = cam.constraints.new("TRACK_TO"); t.target = target; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
for f in range(1, frames + 1, 12):
    a = math.radians(-70 + 140 * (f - 1) / max(1, frames - 1))
    r = 85 - 25 * (f - 1) / max(1, frames - 1)
    cam.location = (r * math.sin(a), -r * math.cos(a), 6 + 10 * (f - 1) / max(1, frames - 1))
    cam.keyframe_insert("location", frame=f)

# Render this chunk
per = math.ceil(frames / chunks)
sc.frame_start, sc.frame_end = chunk * per + 1, min(frames, (chunk + 1) * per)
sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 93
sc.render.filepath = f"{assets}/frames/f_"
if sc.frame_start <= sc.frame_end:
    bpy.ops.render.render(animation=True)
