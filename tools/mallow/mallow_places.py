"""
Mallow for the app: a place rendered once in full (a "base" per view), plus the face area alone for each
expression (a "patch" rendered with the same camera, so it drops onto the base), plus a transparent cut-out for icons.
Usage: PLACE=<meadow|forest|subway|rain|beach> python mallow_places.py OUT.png MODE(base|patch|cutout) VIEW(wide|tall) FACE SPP [W H]
Mallow holds a glass jar of small glowing feelings; a few drift away. Rendered with Blender Cycles (path tracing).
See README.md next to this file.
"""
import math
import sys
import numpy as np
import bpy
from mathutils import Vector, Matrix

OUT, MODE, VIEW, FACE, SPP = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
W, H = (int(sys.argv[6]), int(sys.argv[7])) if len(sys.argv) > 7 else ((1920, 1080) if VIEW == "wide" else (1080, 1920))
import json
import os
rng = np.random.default_rng(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


def link(obj):
    col.objects.link(obj)
    return obj


# ---------------------------------------------------------------- materials
def principled(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    for k, v in inputs.items():
        bsdf.inputs[k].default_value = v
    return m, bsdf


def emissive(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*color, 1)
    e.inputs["Strength"].default_value = strength
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs[0], o.inputs[0])
    return m


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ---------------------------------------------------------------- Mallow's body: the same soft shape as in the app
# my coordinates: x right, y up, z forward  ->  Blender: (x, -z, y)
def ell(p, c, r):
    q = (p - np.array(c)) / np.array(r)
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm((p - np.array(c)) / (np.array(r) ** 2), axis=1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)


def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def sdf(p):
    d = ell(p, (0, 1.02, 0), (0.9, 0.96, 0.8))
    d = smin(d, ell(p, (0, 0.62, 0.05), (1.0, 0.6, 0.86)), 0.42)
    d = smin(d, ell(p, (-0.47, 1.86, -0.08), (0.2, 0.19, 0.15)), 0.14)
    d = smin(d, ell(p, (0.47, 1.86, -0.08), (0.2, 0.19, 0.15)), 0.14)
    d = smin(d, ell(p, (-0.38, 0.1, 0.2), (0.26, 0.13, 0.3)), 0.12)
    d = smin(d, ell(p, (0.38, 0.1, 0.2), (0.26, 0.13, 0.3)), 0.12)
    return d


bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=1)
body = bpy.context.active_object
body.name = "Mallow"
me = body.data
co = np.zeros(len(me.vertices) * 3)
me.vertices.foreach_get("co", co)
dirs_b = co.reshape(-1, 3)
dirs_b /= np.linalg.norm(dirs_b, axis=1, keepdims=True)
dirs = np.stack([dirs_b[:, 0], dirs_b[:, 2], -dirs_b[:, 1]], 1)  # to my coordinates
C = np.array([0, 0.95, 0.02])
t = np.full(len(dirs), 2.3)
t_out = t.copy()
done = np.zeros(len(dirs), bool)
for _ in range(140):
    p = C + dirs * t[:, None]
    v = sdf(p)
    inside = (v < 0) & ~done
    done |= inside
    step = np.maximum(v * 0.7, 0.003)
    t_out = np.where(done, t_out, t)
    t = np.where(done, t, t - step)
lo, hi = t.copy(), t_out.copy()
for _ in range(14):
    m = (lo + hi) / 2
    ins = sdf(C + dirs * m[:, None]) < 0
    lo = np.where(ins, m, lo)
    hi = np.where(ins, hi, m)
pts = C + dirs * ((lo + hi) / 2)[:, None]
pb = np.stack([pts[:, 0], -pts[:, 2], pts[:, 1]], 1)
me.vertices.foreach_set("co", pb.ravel())
me.update()
for poly in me.polygons:
    poly.use_smooth = True
sub = body.modifiers.new("smooth", "SUBSURF")
sub.levels = 1
sub.render_levels = 2

# body material: warm marshmallow white, light passing through (subsurface), a paler belly, rosy cheeks
bm, bsdf = principled("mallow skin", **{"Roughness": 0.5, "Subsurface Weight": 0.5, "Subsurface Scale": 0.06, "Sheen Weight": 0.25, "Coat Weight": 0.08})
bsdf.inputs["Subsurface Radius"].default_value = (0.7, 0.62, 0.55)  # less warm tint from the light inside
nt = bm.node_tree
N = nt.nodes
L = nt.links
tc = N.new("ShaderNodeTexCoord")
sep = N.new("ShaderNodeSeparateXYZ")
L.new(tc.outputs["Object"], sep.inputs[0])


def math_node(op, a, b=None, clamp=False):
    n = N.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    for i, x in enumerate((a, b)):
        if x is None:
            continue
        if isinstance(x, (int, float)):
            n.inputs[i].default_value = x
        else:
            L.new(x, n.inputs[i])
    return n.outputs[0]


# belly: an oval on the front, lower half
bx = math_node("DIVIDE", sep.outputs["X"], 0.7)
bz = math_node("DIVIDE", math_node("SUBTRACT", sep.outputs["Z"], 0.6), 0.5)
oval = math_node("SUBTRACT", 1.0, math_node("ADD", math_node("POWER", bx, 2.0), math_node("POWER", bz, 2.0)))
front = math_node("MULTIPLY", math_node("MULTIPLY", sep.outputs["Y"], -2.0), 1.0, clamp=True)
belly = math_node("MULTIPLY", math_node("MULTIPLY", oval, 2.0, clamp=True), front, clamp=True)
mix1 = N.new("ShaderNodeMix")
mix1.data_type = "RGBA"
mix1.inputs[6].default_value = (*srgb("#f7f3ee"), 1)  # a clean, bright white (was a warm beige #ece4d8)
mix1.inputs[7].default_value = (*srgb("#ffffff"), 1)
L.new(belly, mix1.inputs[0])

# a soft sheen of colour where the cheeks are (filled in once the face points are known)
blush_mix = N.new("ShaderNodeMix")
blush_mix.data_type = "RGBA"
blush_mix.inputs[7].default_value = (*srgb("#ff9fae"), 1)
L.new(mix1.outputs[2], blush_mix.inputs[6])
L.new(blush_mix.outputs[2], bsdf.inputs["Base Color"])
body.data.materials.append(bm)

# ---------------------------------------------------------------- face: found on the real surface by casting rays
dg = bpy.context.evaluated_depsgraph_get()
body_eval = body.evaluated_get(dg)


def on_face(x, z, inset=0.0):
    """Point on the front of the body at (x, z), and the surface normal there."""
    o = Vector((x, -3.0, z))
    hit, loc, nor, _ = body_eval.ray_cast(o, Vector((0, 1, 0)))
    assert hit, (x, z)
    return loc - nor * inset, nor


def blush_mask(cx, cz):
    p, _ = on_face(cx, cz)
    vm = N.new("ShaderNodeVectorMath")
    vm.operation = "DISTANCE"
    L.new(tc.outputs["Object"], vm.inputs[0])
    vm.inputs[1].default_value = p
    mr = N.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 0.13
    mr.inputs["To Min"].default_value = 0.7
    mr.inputs["To Max"].default_value = 0.0
    L.new(vm.outputs["Value"], mr.inputs["Value"])
    return mr.outputs[0]


L.new(math_node("MAXIMUM", blush_mask(-0.44, 1.33), blush_mask(0.44, 1.33)), blush_mix.inputs[0])

eye_m, _ = principled("eye", **{"Base Color": (*srgb("#1d1622"), 1), "Roughness": 0.06, "Coat Weight": 1.0, "Coat Roughness": 0.02})
ink_m, _ = principled("ink", **{"Base Color": (*srgb("#2a1f26"), 1), "Roughness": 0.45})
brow_m, _ = principled("brow", **{"Base Color": (*srgb("#a7907c"), 1), "Roughness": 0.6})
mouth_in, _ = principled("mouth inside", **{"Base Color": (*srgb("#5b2a32"), 1), "Roughness": 0.5})
tongue_m, _ = principled("tongue", **{"Base Color": (*srgb("#f07f8f"), 1), "Roughness": 0.45, "Subsurface Weight": 0.3})
EX, EZ, MZ = 0.25, 1.5, 1.37  # eye centres (x = ±EX, z = EZ) and the mouth line


def qcurve(a, c, b, n=8):
    return [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]) for t in (i / n for i in range(n + 1))]


def skin_curve(name, pts, thick, mat, lift=-0.004):
    """A round line laid on the skin through (x, z) points on the face."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = thick
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    spl = cu.splines.new("NURBS")
    spl.points.add(len(pts) - 1)
    for i, (x, z) in enumerate(pts):
        p, _ = on_face(x, z, inset=lift)
        spl.points[i].co = (*p, 1)
    spl.use_endpoint_u = True
    spl.order_u = min(4, len(pts))
    o = link(bpy.data.objects.new(name, cu))
    o.data.materials.append(mat)
    return o


def blob_on_skin(x, z, sx, sy, sz, mat, inset=0.012):
    p, n = on_face(x, z, inset=inset)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=p)
    e = bpy.context.active_object
    e.scale = (sx, sy, sz)
    e.rotation_euler = (n.to_track_quat("-Y", "Z")).to_euler()
    e.data.materials.append(mat)
    for poly in e.data.polygons:
        poly.use_smooth = True
    return e


def bean_eyes(dx=0.0, dz=0.0, k=1.0):
    for s_ in (-1, 1):
        blob_on_skin(s_ * EX + dx, EZ + dz, 0.052 * k, 0.034, 0.064 * k, eye_m)


def arc_eyes(up=True):
    for s_ in (-1, 1):
        cx = s_ * EX
        if up:  # happy ^ ^
            skin_curve(f"eye{s_}", qcurve((cx - 0.055, EZ - 0.012), (cx, EZ + 0.06), (cx + 0.055, EZ - 0.012)), 0.011, ink_m)
        else:  # closed, a soft downward curve
            skin_curve(f"eye{s_}", qcurve((cx - 0.05, EZ), (cx, EZ - 0.025), (cx + 0.05, EZ)), 0.009, ink_m)


def w_mouth(k=1.0):
    pts = [(-0.05, 0.0), (-0.035, -0.03), (-0.012, -0.03), (0.0, -0.006), (0.012, -0.03), (0.035, -0.03), (0.05, 0.0)]
    skin_curve("mouth", [(x * k, MZ + z * k) for x, z in pts], 0.0075, ink_m)


def open_mouth(w=0.05, h=0.04):
    blob_on_skin(0, MZ - h * 0.4, w, 0.02, h, mouth_in, inset=0.006)
    blob_on_skin(0, MZ - h * 0.85, w * 0.6, 0.02, h * 0.42, tongue_m, inset=0.0)


FACE_PARTS = {
    "idle": lambda: (bean_eyes(), w_mouth()),
    "blink": lambda: (arc_eyes(False), w_mouth()),
    "talk": lambda: (bean_eyes(), open_mouth(0.042, 0.034)),
    "happy": lambda: (arc_eyes(True), w_mouth(1.2)),
    "joy": lambda: (arc_eyes(True), open_mouth(0.055, 0.048)),
    "sad": lambda: (bean_eyes(0, -0.005, 1.12),
                    [skin_curve(f"brow{s_}", qcurve((s_ * 0.33, EZ + 0.11), (s_ * 0.25, EZ + 0.14), (s_ * 0.17, EZ + 0.17)), 0.008, brow_m) for s_ in (-1, 1)],
                    skin_curve("mouth", [(-0.05, MZ - 0.012), (-0.03, MZ + 0.008), (-0.012, MZ - 0.016), (0.0, MZ), (0.012, MZ - 0.016), (0.03, MZ + 0.008), (0.05, MZ - 0.012)], 0.0075, ink_m)),
    "think": lambda: (bean_eyes(0.03, 0.022),
                      skin_curve("brow1", qcurve((0.17, EZ + 0.16), (0.25, EZ + 0.2), (0.33, EZ + 0.17)), 0.008, brow_m),
                      skin_curve("mouth", [(-0.035, MZ - 0.004), (0.04, MZ + 0.01)], 0.0075, ink_m)),
}
FACE_PARTS[FACE]()

# ---------------------------------------------------------------- arms reaching round the jar (metaballs, smooth)
JAR = Vector((0.0, -1.12, 0.86))
mb = bpy.data.metaballs.new("arms")
mb.resolution = 0.025
mb.render_resolution = 0.012
ARMS = os.environ.get("ARMS", "current")


def bez(p0, p1, p2, k):
    return p0 * (1 - k) ** 2 + p1 * 2 * (1 - k) * k + p2 * k * k


def limb(p0, p1, p2, r0, r1, n=12, paw=None):
    """A soft limb along a curve, thicker at the shoulder, ending in a round paw."""
    for i in range(n):
        k = i / (n - 1)
        el = mb.elements.new()
        el.co = bez(p0, p1, p2, k)
        el.radius = r0 + (r1 - r0) * k
    if paw:
        loc, r, squash = paw
        el = mb.elements.new(type="ELLIPSOID")
        el.co = loc
        el.radius = r
        el.size_x, el.size_y, el.size_z = squash


for s in (-1, 1):
    if ARMS == "current":
        a = Vector((s * 0.74, -0.2, 1.02))
        b = Vector((s * 0.24, JAR.y + 0.05, JAR.z - 0.02))
        for i in range(9):
            k = i / 8
            el = mb.elements.new()
            el.co = a.lerp(b, k) + Vector((0, 0, -0.06 * math.sin(k * math.pi)))
            el.radius = 0.2 - 0.03 * k
    elif ARMS == "hug":
        # from low on the side, curving in along the belly; round paws pressed on the sides of the jar
        limb(Vector((s * 0.66, -0.42, 0.98)), Vector((s * 0.6, -0.92, 0.84)), Vector((s * 0.27, -1.12, 0.86)), 0.2, 0.13,
             paw=(Vector((s * 0.25, -1.13, 0.87)), 0.13, (0.85, 1.0, 1.05)))
    elif ARMS == "cradle":
        # short arms from the sides, paws cupped under the jar so it rests in them
        limb(Vector((s * 0.66, -0.46, 0.86)), Vector((s * 0.52, -0.98, 0.66)), Vector((s * 0.15, -1.12, 0.66)), 0.19, 0.13,
             paw=(Vector((s * 0.13, -1.13, 0.67)), 0.14, (1.1, 1.0, 0.72)))
    elif ARMS == "hug2":
        # chubby arms from low on the side, curving in; round paws on the sides of the jar
        limb(Vector((s * 0.66, -0.5, 0.95)), Vector((s * 0.6, -0.98, 0.84)), Vector((s * 0.27, -1.12, 0.86)), 0.24, 0.17,
             paw=(Vector((s * 0.25, -1.13, 0.86)), 0.15, (0.85, 1.0, 1.05)))
    elif ARMS == "cradle2":
        # chubby arms from the sides, paws cupped under the jar
        limb(Vector((s * 0.68, -0.52, 0.82)), Vector((s * 0.55, -1.0, 0.66)), Vector((s * 0.16, -1.12, 0.66)), 0.23, 0.16,
             paw=(Vector((s * 0.14, -1.13, 0.67)), 0.16, (1.1, 1.0, 0.72)))
    elif ARMS == "mitten":
        # very short and fat: mostly a mitten-like paw coming out of the body onto the jar
        limb(Vector((s * 0.56, -0.74, 0.9)), Vector((s * 0.44, -1.0, 0.88)), Vector((s * 0.28, -1.1, 0.87)), 0.21, 0.17,
             n=9, paw=(Vector((s * 0.26, -1.12, 0.87)), 0.16, (0.82, 1.0, 1.0)))
    elif ARMS == "nubs":
        # tiny arms: little more than round paws on the jar, the arm hidden by the body
        limb(Vector((s * 0.52, -0.7, 0.9)), Vector((s * 0.42, -0.98, 0.88)), Vector((s * 0.27, -1.11, 0.87)), 0.12, 0.1,
             n=8, paw=(Vector((s * 0.25, -1.12, 0.87)), 0.12, (0.8, 1.0, 1.0)))
arms = link(bpy.data.objects.new("arms", mb))
arms.data.materials.append(bm)

if os.environ.get("BLEND"):
    # weld the arms into the body and soften only the crease where they meet, so Mallow reads as one soft doll
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    bpy.context.view_layer.objects.active = arms
    arms.select_set(True)
    bpy.ops.object.convert(target="MESH")
    arms = bpy.context.active_object
    arms.select_set(False)
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    sub_b = body.modifiers["smooth"]
    sub_b.levels = 1
    bpy.ops.object.modifier_apply(modifier="smooth")
    bo = body.modifiers.new("arms", "BOOLEAN")
    bo.operation, bo.object, bo.solver = "UNION", arms, "EXACT"
    bpy.ops.object.modifier_apply(modifier="arms")
    rm = body.modifiers.new("remesh", "REMESH")
    rm.mode, rm.voxel_size, rm.use_smooth_shade = "VOXEL", 0.009, True
    bpy.ops.object.modifier_apply(modifier="remesh")
    arms.hide_render = True
    arms.hide_viewport = True
    # weight: high where the arm surface and the body surface meet
    centres = [(Vector(e.co), e.radius) for e in mb.elements]
    vg = body.vertex_groups.new(name="crease")
    for v in body.data.vertices:
        co = v.co
        da = min((co - c).length - r * 0.95 for c, r in centres)
        pm = np.array([[co.x, co.z, -co.y]])
        db = float(sdf(pm)[0])
        w = math.exp(-((da / 0.07) ** 2 + (db / 0.07) ** 2))
        if w > 0.02:
            vg.add([v.index], min(1.0, w * 1.6), "REPLACE")
    sm = body.modifiers.new("soften", "SMOOTH")
    sm.vertex_group, sm.factor, sm.iterations = "crease", 1.0, 40

# ---------------------------------------------------------------- the jar of feelings
glass_m, _ = principled("glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.02, "Transmission Weight": 1.0, "IOR": 1.45})
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.21, depth=0.34, location=JAR)
jar = bpy.context.active_object
jar.data.materials.append(glass_m)
sol = jar.modifiers.new("wall", "SOLIDIFY")
sol.thickness = 0.008
bev = jar.modifiers.new("round", "BEVEL")
bev.width = 0.035
bev.segments = 5
sub = jar.modifiers.new("smooth", "SUBSURF")
sub.levels = 1
sub.render_levels = 2
for poly in jar.data.polygons:
    poly.use_smooth = True
cork_m, _ = principled("cork", **{"Base Color": (*srgb("#b98a5c"), 1), "Roughness": 0.85})
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.165, depth=0.07, location=JAR + Vector((0, 0, 0.19)))
cork = bpy.context.active_object
cork.data.materials.append(cork_m)
cb = cork.modifiers.new("round", "BEVEL")
cb.width = 0.015
cb.segments = 3

FEEL = ["#ffc46b", "#ff9e8a", "#8fe3c0", "#c3a6ff", "#8fc8ff", "#ffe39a"]
feel_mats = [emissive(f"feel{i}", srgb(c), 5.0) for i, c in enumerate(FEEL)]


def mote(loc, r, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=r, location=loc)
    o = bpy.context.active_object
    o.data.materials.append(mat)
    o.visible_shadow = False
    return o


for i in range(28):
    a, rr, z = rng.uniform(0, 2 * math.pi), 0.14 * math.sqrt(rng.uniform()), rng.uniform(-0.12, 0.11)
    mote(JAR + Vector((math.cos(a) * rr, math.sin(a) * rr, z)), rng.uniform(0.012, 0.024), feel_mats[i % len(feel_mats)])
glow = bpy.data.lights.new("jar glow", "POINT")
glow.energy = 9
glow.color = srgb("#ffd9a0")
glow.shadow_soft_size = 0.08
link(bpy.data.objects.new("jar glow", glow)).location = JAR


# ---------------------------------------------------------------- meadow at dawn (the first place)
def place_meadow():
    # (feelings drifting out of the jar are animated in the app, not rendered)
    mote(Vector((-0.9, -3.4, 1.45)), 0.03, emissive("near1", srgb("#ffc46b"), 3.0))
    mote(Vector((1.1, -4.6, 0.7)), 0.03, emissive("near2", srgb("#8fe3c0"), 3.0))

    # ---------------------------------------------------------------- the meadow
    ground_m, _ = principled("soil", **{"Base Color": (*srgb("#4a5a2c"), 1), "Roughness": 1.0})
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 20, 0))
    ground = bpy.context.active_object
    ground.data.materials.append(ground_m)

    grass_m = bpy.data.materials.new("grass")
    grass_m.use_nodes = True
    gnt = grass_m.node_tree
    gb = gnt.nodes["Principled BSDF"]
    gb.inputs["Roughness"].default_value = 0.55
    gb.inputs["Subsurface Weight"].default_value = 0.0
    hi_ = gnt.nodes.new("ShaderNodeHairInfo")
    ramp = gnt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*srgb("#2f4a1c"), 1)
    ramp.color_ramp.elements[1].color = (*srgb("#b9c46a"), 1)
    ramp.color_ramp.elements.new(0.6).color = (*srgb("#6f9a3a"), 1)
    gnt.links.new(hi_.outputs["Intercept"], ramp.inputs[0])
    gnt.links.new(ramp.outputs[0], gb.inputs["Base Color"])

    def meadow_patch(name, center, size, count, length, children, seed):
        bpy.ops.mesh.primitive_plane_add(size=1, location=center)
        m = bpy.context.active_object
        m.name = name
        m.scale = (size[0], size[1], 1)
        bpy.ops.object.transform_apply(scale=True)
        m.data.materials.append(ground_m)
        m.data.materials.append(grass_m)
        ps = m.modifiers.new("grass", "PARTICLE_SYSTEM").particle_system
        st = ps.settings
        st.type = "HAIR"
        st.count = count
        st.hair_length = length
        st.hair_step = 5
        st.use_advanced_hair = True
        st.normal_factor = length  # with advanced hair, this sets the blade length (metres)
        st.factor_random = length * 0.15
        st.material_slot = "grass"
        st.child_type = "INTERPOLATED"
        st.child_percent = 2
        st.rendered_child_count = children
        st.child_radius = 0.12
        st.child_length = 1.0
        st.child_length_threshold = 0.4
        st.clump_factor = 0.15
        st.roughness_1 = 0.03
        st.roughness_endpoint = length * 0.2
        st.roughness_2 = 0.02
        st.root_radius = 1.0
        st.tip_radius = 0.0
        st.radius_scale = 0.0045
        st.use_close_tip = True
        ps.seed = seed
        return m


    # tall grass from Mallow's feet backwards, a short sward in the clearing in front
    meadow_patch("meadow", (0, 6.6, 0.001), (22, 13.6), 30000, 0.34, 7, 3)
    meadow_patch("clearing", (0, -3.6, 0.001), (22, 7.2), 15000, 0.11, 5, 5)

    # far hills, softened by the morning mist
    hill_m, _ = principled("hills", **{"Base Color": (*srgb("#7c8f55"), 1), "Roughness": 1.0})
    for x, y, sx, sz in [(-14, 38, 22, 2.2), (12, 46, 26, 3.2), (0, 60, 40, 4.0), (-30, 55, 20, 2.8)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1, location=(x, y, 0))
        h = bpy.context.active_object
        h.scale = (sx, sx * 0.6, sz)
        h.data.materials.append(hill_m)
        for poly in h.data.polygons:
            poly.use_smooth = True

    # dandelion clocks catching the backlight, a couple close to the lens
    fluff_m, fb_ = principled("fluff", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.4, "Transmission Weight": 0.6, "Sheen Weight": 1.0, "Alpha": 0.55})
    stem_m, _ = principled("stem", **{"Base Color": (*srgb("#6f8f3a"), 1), "Roughness": 0.6})
    for (x, y, hgt, r_) in [(-1.6, 0.6, 0.62, 0.075), (1.55, 0.2, 0.55, 0.07), (-0.95, -3.9, 0.42, 0.06), (2.3, 1.6, 0.66, 0.08), (-2.7, 2.2, 0.6, 0.075)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=hgt, location=(x, y, hgt / 2))
        bpy.context.active_object.data.materials.append(stem_m)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=r_, location=(x, y, hgt + r_ * 0.6))
        puff = bpy.context.active_object
        puff.data.materials.append(fluff_m)
        pps = puff.modifiers.new("seeds", "PARTICLE_SYSTEM").particle_system
        pst = pps.settings
        pst.type = "HAIR"
        pst.count = 260
        pst.use_advanced_hair = True
        pst.normal_factor = r_ * 0.9
        pst.hair_length = r_ * 0.9
        pst.root_radius = 1.0
        pst.tip_radius = 0.3
        pst.radius_scale = 0.0015
        pst.material_slot = "fluff"
        puff.show_instancer_for_render = True
        puff.scale = (0.35, 0.35, 0.35)

    # ---------------------------------------------------------------- dawn sky, low sun behind Mallow, morning mist
    world = bpy.data.worlds.new("dawn")
    scene.world = world
    world.use_nodes = True
    wn = world.node_tree
    sky = wn.nodes.new("ShaderNodeTexSky")
    SUN_EL, SUN_ROT = math.radians(6.5), math.radians(-8)  # low, behind Mallow on the left
    for t in ("NISHITA", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING", "HOSEK_WILKIE"):
        try:
            sky.sky_type = t
            break
        except TypeError:
            continue
    for attr, val in (("sun_elevation", SUN_EL), ("sun_rotation", SUN_ROT), ("altitude", 30.0), ("air_density", 1.4), ("dust_density", 2.5), ("sun_intensity", 0.6)):
        if hasattr(sky, attr):
            setattr(sky, attr, val)
    bg = wn.nodes["Background"]
    bg.inputs["Strength"].default_value = 0.3
    wn.links.new(sky.outputs[0], bg.inputs[0])

    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 6.5
    sun.angle = math.radians(1.2)
    sun.color = srgb("#ffc47e")
    sun_o = link(bpy.data.objects.new("sun", sun))
    d = Vector((math.cos(SUN_EL) * math.sin(SUN_ROT), math.cos(SUN_EL) * math.cos(SUN_ROT), math.sin(SUN_EL)))
    sun_o.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    fill = bpy.data.lights.new("sky fill", "AREA")
    fill.energy = 85
    fill.size = 6
    fill.color = srgb("#cfe0ff")
    f_o = link(bpy.data.objects.new("sky fill", fill))
    f_o.location = (-5, -4.5, 5)
    f_o.rotation_euler = (Vector((0, -1, 1)) - f_o.location).to_track_quat("-Z", "Y").to_euler()

    # a soft light from the front that only reaches Mallow and the jar (light linking), so the backlit Mallow reads
    # bright white without changing the meadow or the sky
    front = bpy.data.lights.new("mallow front", "AREA")
    front.energy = 150
    front.size = 2.6
    front.color = srgb("#fff6ea")
    fr_o = link(bpy.data.objects.new("mallow front", front))
    fr_o.location = (-2.2, -4.2, 3.2)  # upper left, like the sky: brightens Mallow but keeps the round shading
    fr_o.rotation_euler = (Vector((0, -0.6, 1.1)) - fr_o.location).to_track_quat("-Z", "Y").to_euler()
    lit = bpy.data.collections.new("lit by the front light")
    for o in scene.objects:
        if o.name in {"Mallow", "arms", "mouth", "cork"} or o.name.startswith(("eye", "brow", "mouth")) or (o.type == "MESH" and (o.matrix_world.translation - Vector((0, -1.1, 0.9))).length < 0.35):
            lit.objects.link(o)
    fr_o.light_linking.receiver_collection = lit

    mist_m = bpy.data.materials.new("mist")
    mist_m.use_nodes = True
    mnt = mist_m.node_tree
    mnt.nodes.clear()
    vol = mnt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = 0.0045
    vol.inputs["Anisotropy"].default_value = 0.55
    vol.inputs["Color"].default_value = (*srgb("#fff1dc"), 1)
    mo = mnt.nodes.new("ShaderNodeOutputMaterial")
    mnt.links.new(vol.outputs[0], mo.inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 40, 4))
    mist = bpy.context.active_object
    mist.scale = (180, 90, 8)
    mist.data.materials.append(mist_m)


# ================================================================ places
# Mallow stands at the origin facing the camera (which looks along +y); each place is built around him.
# Shared helpers first, then one function per place.
PLACE = os.environ.get("PLACE", "meadow")


def look_at(o, target):
    o.rotation_euler = (Vector(target) - o.location).to_track_quat("-Z", "Y").to_euler()


def add_light(kind, name, loc, energy, color, size=1.0, target=(0, 0, 1)):
    l = bpy.data.lights.new(name, kind)
    l.energy = energy
    l.color = srgb(color)
    if kind == "AREA":
        l.size = size
    elif kind in {"POINT", "SPOT"}:
        l.shadow_soft_size = size
    o = link(bpy.data.objects.new(name, l))
    o.location = loc
    if kind != "POINT":
        look_at(o, target)
    return l, o


def sun_light(el_deg, rot_deg, energy, color, angle=1.2):
    l = bpy.data.lights.new("sun", "SUN")
    l.energy, l.color, l.angle = energy, srgb(color), math.radians(angle)
    o = link(bpy.data.objects.new("sun", l))
    el, rot = math.radians(el_deg), math.radians(rot_deg)
    d = Vector((math.cos(el) * math.sin(rot), math.cos(el) * math.cos(rot), math.sin(el)))
    o.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return l


def sky_world(el_deg, rot_deg, strength, sun_intensity=0.6, dust=2.5, air=1.4):
    w = bpy.data.worlds.new("sky")
    scene.world = w
    w.use_nodes = True
    sky = w.node_tree.nodes.new("ShaderNodeTexSky")
    for t in ("NISHITA", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING", "HOSEK_WILKIE"):
        try:
            sky.sky_type = t
            break
        except TypeError:
            continue
    for attr, val in (("sun_elevation", math.radians(el_deg)), ("sun_rotation", math.radians(rot_deg)), ("altitude", 30.0),
                      ("air_density", air), ("dust_density", dust), ("sun_intensity", sun_intensity)):
        if hasattr(sky, attr):
            setattr(sky, attr, val)
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Strength"].default_value = strength
    w.node_tree.links.new(sky.outputs[0], bg.inputs[0])


def flat_world(color, strength):
    w = bpy.data.worlds.new("world")
    scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb(color), 1)
    bg.inputs["Strength"].default_value = strength


def fog(loc, scale, density, color, anisotropy=0.5):
    m = bpy.data.materials.new("fog")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    v = nt.nodes.new("ShaderNodeVolumePrincipled")
    v.inputs["Density"].default_value = density
    v.inputs["Anisotropy"].default_value = anisotropy
    v.inputs["Color"].default_value = (*srgb(color), 1)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(v.outputs[0], out.inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    c = bpy.context.active_object
    c.name = "fog"
    c.scale = scale
    c.data.materials.append(m)
    return c


def front_light(energy, loc, color, size=2.6):
    """A soft light that reaches only Mallow and the jar (light linking), so he reads white in any place."""
    l, o = add_light("AREA", "mallow front", loc, energy, color, size, (0, -0.6, 1.1))
    lit = bpy.data.collections.new("lit by the front light")
    for ob in list(scene.objects):
        if ob.name in {"Mallow", "arms", "mouth", "cork"} or ob.name.startswith(("eye", "brow", "mouth")) or \
                (ob.type == "MESH" and (ob.matrix_world.translation - Vector((0, -1.1, 0.9))).length < 0.35):
            lit.objects.link(ob)
    o.light_linking.receiver_collection = lit


def box(name, loc, size, mat, bevel=0.0, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("round", "BEVEL")
        b.width, b.segments = bevel, segs
        b.limit_method = "NONE"
    o.data.materials.append(mat)
    return o


def cyl(name, loc, r, depth, mat, verts=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.materials.append(mat)
    return o


def node_mat(name, build):
    """A material whose node tree `build(nt, bsdf)` wires up."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    build(nt, nt.nodes["Principled BSDF"])
    return m


def noise_ramp(nt, scale, stops, detail=6.0, coord=None):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    if coord is not None:
        nt.links.new(coord, n.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    els = r.color_ramp.elements
    els[0].position, els[0].color = stops[0][0], (*srgb(stops[0][1]), 1)
    els[1].position, els[1].color = stops[-1][0], (*srgb(stops[-1][1]), 1)
    for pos, col in stops[1:-1]:
        els.new(pos).color = (*srgb(col), 1)
    nt.links.new(n.outputs["Fac"], r.inputs[0])
    return r, n


def hair_patch(name, center, size, count, length, mat_name_colors, children=6, seed=1, ground_mat=None, clump=0.15, rough=0.03):
    bpy.ops.mesh.primitive_plane_add(size=1, location=center)
    m = bpy.context.active_object
    m.name = name
    m.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(scale=True)
    hm = bpy.data.materials.new(name + " blades")
    hm.use_nodes = True
    hnt = hm.node_tree
    hb = hnt.nodes["Principled BSDF"]
    hb.inputs["Roughness"].default_value = 0.55
    info = hnt.nodes.new("ShaderNodeHairInfo")
    ramp = hnt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*srgb(mat_name_colors[0]), 1)
    ramp.color_ramp.elements[1].color = (*srgb(mat_name_colors[-1]), 1)
    if len(mat_name_colors) > 2:
        ramp.color_ramp.elements.new(0.6).color = (*srgb(mat_name_colors[1]), 1)
    hnt.links.new(info.outputs["Intercept"], ramp.inputs[0])
    hnt.links.new(ramp.outputs[0], hb.inputs["Base Color"])
    m.data.materials.append(ground_mat or hm)
    m.data.materials.append(hm)
    ps = m.modifiers.new("hair", "PARTICLE_SYSTEM").particle_system
    st = ps.settings
    st.type = "HAIR"
    st.count = count
    st.hair_length = length
    st.hair_step = 5
    st.use_advanced_hair = True
    st.normal_factor = length
    st.factor_random = length * 0.15
    st.material_slot = hm.name
    st.child_type = "INTERPOLATED"
    st.child_percent = 2
    st.rendered_child_count = children
    st.child_radius = 0.12
    st.clump_factor = clump
    st.roughness_1 = rough
    st.roughness_endpoint = length * 0.2
    st.root_radius = 1.0
    st.tip_radius = 0.0
    st.radius_scale = 0.0045
    st.use_close_tip = True
    ps.seed = seed
    return m


# ---------------------------------------------------------------- forest: late light through the canopy
def place_forest():
    sky_world(34, -25, 0.3, sun_intensity=0.4, dust=4.0)
    sun_light(34, -25, 8.0, "#ffd08a", angle=0.8)
    add_light("AREA", "canopy fill", (-3, -5, 6), 60, "#cfe7c4", 8)
    front_light(130, (-2.2, -4.2, 3.2), "#fff3e2")
    # the canopy: unseen by the camera, it breaks the sun into shafts and dapples (a gobo of leaves)
    def canopy(nt, b):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 0.9
        n.inputs["Detail"].default_value = 8
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        r = nt.nodes.new("ShaderNodeValToRGB")
        r.color_ramp.elements[0].position = 0.47
        r.color_ramp.elements[1].position = 0.53
        nt.links.new(n.outputs["Fac"], r.inputs[0])
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(r.outputs[0], mix.inputs[0])
        nt.links.new(b.outputs[0], mix.inputs[1])
        nt.links.new(tr.outputs[0], mix.inputs[2])
        b.inputs["Base Color"].default_value = (*srgb("#2f4a22"), 1)
        nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 10, 11))
    cp = bpy.context.active_object
    cp.name = "canopy"
    cp.scale = (80, 60, 1)
    cp.data.materials.append(node_mat("canopy", canopy))
    cp.visible_camera = False
    # ground: dark soil and leaf litter, moss, a carpet of low growth
    def soil(nt, b):
        r, _ = noise_ramp(nt, 9, [(0.3, "#2a2012"), (0.45, "#5e4122"), (0.55, "#8a5a2a"), (0.65, "#6a5a2a"), (0.78, "#3c4a1e")])
        nt.links.new(r.outputs[0], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.95
    soil_m = node_mat("forest floor", soil)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 25, 0))
    g = bpy.context.active_object
    g.scale = (90, 70, 1)
    g.data.materials.append(soil_m)
    hair_patch("moss", (0, 3.0, 0.001), (20, 14), 16000, 0.05, ["#23361a", "#4e7a2c", "#93b04a"], 6, 4, soil_m, clump=0.5)
    hair_patch("ferns", (0, 9.0, 0.002), (26, 10), 900, 0.45, ["#1f3417", "#3f6b28", "#7da046"], 12, 7, soil_m, clump=0.85, rough=0.12)
    hair_patch("near growth", (0, -3.4, 0.001), (16, 5), 3000, 0.06, ["#23361a", "#4e7a2c", "#93b04a"], 5, 9, soil_m, clump=0.5)
    # trunks: knobbly, mossy at the foot, rising out of frame; farther ones melt into the haze
    def bark(nt, b):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (5, 5, 0.6)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        r, n = noise_ramp(nt, 3, [(0.35, "#2b2016"), (0.55, "#5b4633"), (0.7, "#7a6550")], coord=mp.outputs["Vector"])
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Object"], sep.inputs[0])
        mossy = nt.nodes.new("ShaderNodeMapRange")
        mossy.inputs["From Min"].default_value = -4.4  # object space: the trunk runs from -6 (ground) to +6
        mossy.inputs["From Max"].default_value = -6.0
        nt.links.new(sep.outputs["Z"], mossy.inputs["Value"])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs[7].default_value = (*srgb("#4f6e2a"), 1)
        nt.links.new(mossy.outputs[0], mix.inputs[0])
        nt.links.new(r.outputs[0], mix.inputs[6])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.9
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.9
        ridges = nt.nodes.new("ShaderNodeTexWave")
        ridges.wave_type = "BANDS"
        ridges.bands_direction = "X"
        ridges.inputs["Scale"].default_value = 9
        ridges.inputs["Distortion"].default_value = 9
        ridges.inputs["Detail"].default_value = 6
        nt.links.new(mp.outputs["Vector"], ridges.inputs["Vector"])
        nt.links.new(ridges.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], b.inputs["Normal"])
    bark_m = node_mat("bark", bark)
    tex = bpy.data.textures.new("knobs", "CLOUDS")
    tex.noise_scale = 0.6
    spots = [(-3.6, 3.4, 0.4), (3.9, 4.4, 0.5), (-1.6, 7.5, 0.35), (2.2, 9.0, 0.4), (-6.2, 6.0, 0.6), (6.6, 7.5, 0.55),
             (-8.0, 11, 0.9), (8.5, 12, 0.8), (-3.5, 14, 0.7), (3.0, 16, 0.65), (0.4, 22, 0.8), (-11, 18, 1.0), (11, 20, 0.9),
             (-6.5, 24, 0.8), (6.0, 26, 0.85), (-14, 9, 0.9), (14, 10, 0.9), (-1.0, 30, 0.9)]
    for i, (x, y, r) in enumerate(spots):
        t = cyl(f"trunk{i}", (x, y, 6), r, 12.5, bark_m, verts=40)
        sub = t.modifiers.new("smooth", "SUBSURF")
        sub.levels = sub.render_levels = 2
        disp = t.modifiers.new("knobs", "DISPLACE")
        disp.texture, disp.strength = tex, 0.12 + r * 0.1
        # a flared foot
        bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=r * 1.35, radius2=r, depth=0.7, location=(x, y, 0.3))
        f = bpy.context.active_object
        f.data.materials.append(bark_m)
        for p in f.data.polygons:
            p.use_smooth = True
        fs = f.modifiers.new("smooth", "SUBSURF")
        fs.levels = fs.render_levels = 2
        fd = f.modifiers.new("knobs", "DISPLACE")
        fd.texture, fd.strength = tex, 0.18
    # the deep woods: many more trunks far off, thinner and fainter in the haze, filling the gaps
    far_m = principled("far bark", **{"Base Color": (*srgb("#5a5444"), 1), "Roughness": 0.95})[0]
    for i in range(70):
        x, y = rng.uniform(-30, 30), rng.uniform(30, 70)
        if abs(x) < 2 and y < 40:
            continue
        cyl(f"far trunk{i}", (x, y, 7), rng.uniform(0.25, 0.7), 14, far_m, 16)
    # a few toadstools at Mallow's feet
    cap_m = principled("cap", **{"Base Color": (*srgb("#c9542f"), 1), "Roughness": 0.45, "Coat Weight": 0.3})[0]
    stem_m = principled("stem", **{"Base Color": (*srgb("#efe4cf"), 1), "Roughness": 0.7})[0]
    for (x, y, s) in [(-1.25, -0.45, 1.0), (-1.05, -0.2, 0.7), (1.35, -0.3, 0.8), (-1.5, -0.05, 0.55)]:
        cyl("stem", (x, y, 0.09 * s), 0.035 * s, 0.18 * s, stem_m, 16)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.11 * s, location=(x, y, 0.18 * s))
        c = bpy.context.active_object
        c.scale = (1, 1, 0.55)
        c.data.materials.append(cap_m)
        for p in c.data.polygons:
            p.use_smooth = True
    fog((0, 30, 6), (90, 80, 14), 0.014, "#e3ecd0", 0.7)


# ---------------------------------------------------------------- subway: sunset through the windows on the way home
def place_subway():
    sky_world(5, 12, 0.12, sun_intensity=0.35, dust=4.0)
    sun_light(8, 12, 4.5, "#ffa858", angle=0.6)  # low, behind the train: it shines in through the windows
    front_light(150, (-2.2, -4.2, 3.0), "#fff1e2")
    wall_m = principled("car wall", **{"Base Color": (*srgb("#e7e1d6"), 1), "Roughness": 0.45, "Coat Weight": 0.3})[0]
    panel_m = principled("panel", **{"Base Color": (*srgb("#cfd5d8"), 1), "Roughness": 0.35, "Metallic": 0.2})[0]
    steel = principled("steel", **{"Base Color": (*srgb("#d9dde2"), 1), "Roughness": 0.12, "Metallic": 1.0})[0]
    glass = principled("glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.02, "Transmission Weight": 1.0, "IOR": 1.45})[0]
    WY = 1.9  # the back wall, behind Mallow
    # lower wall, upper wall, and pillars between the windows
    box("lower wall", (0, WY + 0.05, 0.55), (14, 0.1, 1.1), panel_m, 0.02)
    box("upper wall", (0, WY + 0.05, 2.55), (14, 0.1, 0.5), wall_m, 0.02)
    for x in (-5.4, -1.8, 1.8, 5.4):
        box("pillar", (x, WY + 0.05, 1.7), (0.7, 0.14, 1.2), wall_m, 0.08)
    for x in (-3.6, 0.0, 3.6):
        box("window", (x, WY + 0.06, 1.7), (2.9, 0.02, 1.2), glass)
        for (fx, fz, fw, fh) in ((x, 2.3, 2.95, 0.05), (x, 1.1, 2.95, 0.05), (x - 1.45, 1.7, 0.05, 1.25), (x + 1.45, 1.7, 0.05, 1.25)):
            box("frame", (fx, WY + 0.02, fz), (fw, 0.04, fh), steel, 0.015)
    # the seat: a long cushioned bench with a backrest against the wall
    def fabric(nt, b):
        r, n = noise_ramp(nt, 60, [(0.4, "#245e6a"), (0.6, "#2f7a88")], detail=2)
        nt.links.new(r.outputs[0], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.85
        b.inputs["Sheen Weight"].default_value = 0.6
    fab = node_mat("seat fabric", fabric)
    box("seat", (0, WY - 0.3, 0.47), (12, 0.6, 0.14), fab, 0.06, 6)
    box("backrest", (0, WY - 0.05, 0.85), (12, 0.12, 0.62), fab, 0.06, 6)
    box("seat base", (0, WY - 0.25, 0.2), (12, 0.5, 0.4), panel_m, 0.03)
    # floor and ceiling with long light panels
    floor_m = principled("floor", **{"Base Color": (*srgb("#7c766c"), 1), "Roughness": 0.4, "Coat Weight": 0.4, "Coat Roughness": 0.25})[0]
    box("floor", (0, 0, -0.05), (16, 12, 0.1), floor_m)
    box("ceiling", (0, 0, 2.95), (16, 12, 0.1), wall_m)
    lamp_m = emissive("ceiling light", srgb("#fff3dc"), 2.2)
    for y in (-1.0, 1.0):
        box("light strip", (0, y, 2.89), (12, 0.22, 0.02), lamp_m)
    # poles and the hand rail with straps
    for x in (-2.3, 2.3):
        cyl("pole", (x, 0.2, 1.45), 0.035, 2.9, steel, 24)
    cyl("rail", (0, 1.15, 2.45), 0.025, 14, steel, 16, rot=(0, math.radians(90), 0))
    strap_m = principled("strap", **{"Base Color": (*srgb("#f2efe8"), 1), "Roughness": 0.5})[0]
    for x in [-4.5 + i * 0.75 for i in range(13)]:
        box("strap", (x, 1.15, 2.27), (0.04, 0.012, 0.32), strap_m)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.014, location=(x, 1.15, 2.05), rotation=(math.radians(90), 0, 0))
        bpy.context.active_object.data.materials.append(strap_m)
    # outside: a city skyline against the low sun, softened by distance and haze
    bld_m = principled("buildings", **{"Base Color": (*srgb("#241d2b"), 1), "Roughness": 0.8})[0]
    win_m = emissive("lit windows", srgb("#ffd59a"), 4.0)
    for i in range(40):
        x = -24 + i * 1.25 + rng.uniform(-0.4, 0.4)
        y = rng.uniform(9, 16)
        h = rng.uniform(3.5, 12)
        w = rng.uniform(0.9, 1.8)
        box("building", (x, y, h / 2 - 1), (w, w, h), bld_m)
        for k in range(int(h)):
            if rng.uniform() < 0.35:
                box("window light", (x + rng.uniform(-w / 3, w / 3), y - w / 2 - 0.01, k + rng.uniform(-0.6, 0.2)), (0.22, 0.01, 0.26), win_m)
    fog((0, 25, 4), (90, 40, 14), 0.0025, "#ffd8b0", 0.6)
    fog((0, 0, 1.45), (15.8, 3.6, 2.9), 0.0025, "#fff0dc", 0.7)


# ---------------------------------------------------------------- rainy bus stop at night
def place_rain():
    flat_world("#0c1222", 0.12)
    front_light(110, (-2.2, -4.2, 3.0), "#e9f0ff")
    # wet asphalt: dark, with smooth puddles where the noise is high
    def asphalt(nt, b):
        r, n = noise_ramp(nt, 2.2, [(0.3, "#1a1c22"), (0.7, "#2a2c33")])
        nt.links.new(r.outputs[0], b.inputs["Base Color"])
        rr, _ = noise_ramp(nt, 0.9, [(0.48, "#7a7a7a"), (0.56, "#060606")], detail=3)
        nt.links.new(rr.outputs[0], b.inputs["Roughness"])
        fine = nt.nodes.new("ShaderNodeTexNoise")
        fine.inputs["Scale"].default_value = 180
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.12
        nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], b.inputs["Normal"])
    road = node_mat("wet asphalt", asphalt)
    box("ground", (0, 10, -0.05), (80, 60, 0.1), road)
    pave_m = principled("pavement", **{"Base Color": (*srgb("#3a3b40"), 1), "Roughness": 0.25, "Coat Weight": 0.6, "Coat Roughness": 0.08})[0]
    box("pavement", (0, 0.6, 0.06), (16, 5.6, 0.12), pave_m, 0.02)
    # the shelter: a glass back, a thin roof, a slim frame, a bench, and a glowing advert
    steel = principled("frame", **{"Base Color": (*srgb("#9aa1aa"), 1), "Roughness": 0.25, "Metallic": 1.0})[0]
    glass = principled("glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.03, "Transmission Weight": 1.0, "IOR": 1.45})[0]
    box("back glass", (0.6, 1.75, 1.32), (5.2, 0.02, 2.4), glass)
    box("roof", (0.6, 0.6, 2.62), (5.6, 2.6, 0.06), principled("roof", **{"Base Color": (*srgb("#6c7686"), 1), "Roughness": 0.35, "Metallic": 0.6})[0], 0.02)
    for x in (-2.0, 3.2):
        cyl("post", (x, 1.7, 1.31), 0.045, 2.62, steel, 20)
    box("bench", (1.4, 1.45, 0.48), (2.0, 0.4, 0.06), principled("bench", **{"Base Color": (*srgb("#8a5a34"), 1), "Roughness": 0.5})[0], 0.02)
    ad = bpy.data.materials.new("advert")
    ad.use_nodes = True
    ant = ad.node_tree
    ant.nodes.clear()
    img = ant.nodes.new("ShaderNodeTexImage")
    img.image = bpy.data.images.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "places", "advert.png"))
    em = ant.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.8
    ant.links.new(img.outputs["Color"], em.inputs["Color"])
    ant.links.new(em.outputs[0], ant.nodes.new("ShaderNodeOutputMaterial").inputs[0])
    box("advert frame", (-1.25, 1.72, 1.32), (1.15, 0.08, 1.75), steel, 0.02)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.25, 1.67, 1.32), rotation=(math.radians(90), 0, 0))
    adp = bpy.context.active_object
    adp.scale = (1.0, 1.6, 1)
    adp.data.materials.append(ad)
    add_light("AREA", "advert glow", (-1.25, 1.4, 1.3), 45, "#ffd2c2", 1.2, (-1.0, -2, 0.9))
    # a street lamp on the right with its warm cone, and the city glowing behind in the rain
    cyl("lamp post", (3.9, 2.4, 2.1), 0.06, 4.2, steel, 20)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.2, location=(3.6, 2.4, 4.1))
    bpy.context.active_object.data.materials.append(emissive("lamp", srgb("#ffd796"), 25.0))
    add_light("SPOT", "street lamp", (3.6, 2.4, 4.0), 900, "#ffcf8a", 0.3, (2.0, 0.5, 0))
    bokeh_cols = ["#ffcf7a", "#ff6d5e", "#8fc8ff", "#ffe2a8", "#ff9ecb", "#9dff7a"]
    for i in range(70):
        x, y, z = rng.uniform(-22, 22), rng.uniform(12, 34), rng.uniform(0.3, 6)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=rng.uniform(0.08, 0.2), location=(x, y, z))
        bpy.context.active_object.data.materials.append(emissive(f"city{i}", srgb(bokeh_cols[i % len(bokeh_cols)]), rng.uniform(4, 12)))
    bld = principled("night buildings", **{"Base Color": (*srgb("#141826"), 1), "Roughness": 0.8})[0]
    for i in range(24):
        x = -30 + i * 2.6
        h = rng.uniform(5, 16)
        box("building", (x, rng.uniform(30, 40), h / 2), (2.4, 2.4, h), bld)
    fog((0, 18, 4), (80, 40, 12), 0.03, "#8fa0c8", 0.3)


# ---------------------------------------------------------------- beach in the late afternoon
def place_beach():
    sky_world(14, 25, 0.22, sun_intensity=0.5, dust=0.8, air=1.0)
    sun_light(14, 25, 4.0, "#ffe2b8", angle=0.9)
    add_light("AREA", "sky fill", (-4, -6, 5), 50, "#d6e8ff", 8)
    front_light(140, (-2.2, -4.2, 3.0), "#fff4e6")
    # the sea: a big rippled plane, clear teal near the shore, deep blue out to the horizon
    def water(nt, b):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs[0])
        r = nt.nodes.new("ShaderNodeValToRGB")
        r.color_ramp.elements[0].color = (*srgb("#1f9ea0"), 1)
        r.color_ramp.elements[1].color = (*srgb("#0b3c78"), 1)
        r.color_ramp.elements[1].position = 0.06
        nt.links.new(sep.outputs["Y"], r.inputs[0])
        nt.links.new(r.outputs[0], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.35
        b.inputs["Specular IOR Level"].default_value = 0.0  # no mirror: at this low angle a mirror would only show the pale sky  # less mirror-like at a low angle, so the sea reads blue
        # ripples a few tens of centimetres across, in world-sized units (object space of the plane)
        oc = nt.nodes.new("ShaderNodeTexCoord")
        sc = nt.nodes.new("ShaderNodeMapping")
        sc.inputs["Scale"].default_value = (300, 110, 1)
        nt.links.new(oc.outputs["Object"], sc.inputs["Vector"])
        w = nt.nodes.new("ShaderNodeTexWave")
        w.inputs["Scale"].default_value = 0.9
        w.inputs["Distortion"].default_value = 7
        w.inputs["Detail"].default_value = 6
        nt.links.new(sc.outputs["Vector"], w.inputs["Vector"])
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 2.5
        nt.links.new(sc.outputs["Vector"], nz.inputs["Vector"])
        add = nt.nodes.new("ShaderNodeMath")
        add.operation = "ADD"
        nt.links.new(w.outputs["Fac"], add.inputs[0])
        nt.links.new(nz.outputs["Fac"], add.inputs[1])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.5
        nt.links.new(add.outputs[0], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], b.inputs["Normal"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 57, 0.15))
    sea = bpy.context.active_object
    sea.scale = (300, 110, 1)
    sea.data.materials.append(node_mat("sea", water))
    glint = emissive("glint", srgb("#fff3d6"), 3.0)
    for i in range(160):
        x, y = rng.uniform(4, 30) * (1 if rng.uniform() < 0.8 else -0.4), rng.uniform(8, 80)
        if abs(x - y * 0.45) > 3 + y * 0.08:
            continue
        box("glint", (x, y, 0.16), (rng.uniform(0.08, 0.4), 0.02, 0.01), glint)
    # sand: pale and dry, darker and glossy where the waves reach, with fine ripples
    def sand(nt, b):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Object"], sep.inputs[0])
        wet = nt.nodes.new("ShaderNodeMapRange")
        wet.inputs["From Min"].default_value = 6.2  # object space: the sand runs to y = 7.5 (2.9 in the world)
        wet.inputs["From Max"].default_value = 7.4
        nt.links.new(sep.outputs["Y"], wet.inputs["Value"])
        r, n = noise_ramp(nt, 25, [(0.35, "#e6cfa1"), (0.65, "#f1dfb6")], detail=8)
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs[7].default_value = (*srgb("#b39462"), 1)
        nt.links.new(wet.outputs[0], mix.inputs[0])
        nt.links.new(r.outputs[0], mix.inputs[6])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        rough = nt.nodes.new("ShaderNodeMapRange")
        rough.inputs["To Min"].default_value = 0.95
        rough.inputs["To Max"].default_value = 0.25
        nt.links.new(wet.outputs[0], rough.inputs["Value"])
        nt.links.new(rough.outputs[0], b.inputs["Roughness"])
        wv = nt.nodes.new("ShaderNodeTexWave")
        wv.inputs["Scale"].default_value = 9
        wv.inputs["Distortion"].default_value = 4
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.18
        nt.links.new(wv.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], b.inputs["Normal"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -4.6, 0))
    sd = bpy.context.active_object
    sd.scale = (40, 15, 1)
    bpy.ops.object.transform_apply(scale=True)
    sd.data.materials.append(node_mat("sand", sand))
    # foam where the sea meets the sand
    def foam(nt, b):
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 14
        n.inputs["Detail"].default_value = 10
        r = nt.nodes.new("ShaderNodeValToRGB")
        r.color_ramp.elements[0].position = 0.5
        r.color_ramp.elements[1].position = 0.62
        nt.links.new(n.outputs["Fac"], r.inputs[0])
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(r.outputs[0], mix.inputs[0])
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(b.outputs[0], mix.inputs[2])
        b.inputs["Base Color"].default_value = (1, 1, 1, 1)
        b.inputs["Roughness"].default_value = 0.6
        nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 3.0, 0.005))
    fm = bpy.context.active_object
    fm.scale = (40, 0.7, 1)
    fm.data.materials.append(node_mat("foam", foam))
    # a striped parasol with its towel, a starfish, shells and a bucket
    def stripes(colors):
        def build(nt, b):
            tc = nt.nodes.new("ShaderNodeTexCoord")
            sep = nt.nodes.new("ShaderNodeSeparateXYZ")
            nt.links.new(tc.outputs["Object"], sep.inputs[0])
            ang = nt.nodes.new("ShaderNodeMath")
            ang.operation = "ARCTAN2"
            nt.links.new(sep.outputs["Y"], ang.inputs[0])
            nt.links.new(sep.outputs["X"], ang.inputs[1])
            k = nt.nodes.new("ShaderNodeMath")
            k.operation = "MULTIPLY"
            k.inputs[1].default_value = 8 / math.pi
            nt.links.new(ang.outputs[0], k.inputs[0])
            fr = nt.nodes.new("ShaderNodeMath")
            fr.operation = "FRACT"
            nt.links.new(k.outputs[0], fr.inputs[0])
            st = nt.nodes.new("ShaderNodeMath")
            st.operation = "GREATER_THAN"
            st.inputs[1].default_value = 0.5
            nt.links.new(fr.outputs[0], st.inputs[0])
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.inputs[6].default_value = (*srgb(colors[0]), 1)
            mix.inputs[7].default_value = (*srgb(colors[1]), 1)
            nt.links.new(st.outputs[0], mix.inputs[0])
            nt.links.new(mix.outputs[2], b.inputs["Base Color"])
            b.inputs["Roughness"].default_value = 0.6
            b.inputs["Sheen Weight"].default_value = 0.4
        return build
    pole_m = principled("pole", **{"Base Color": (*srgb("#f4efe6"), 1), "Roughness": 0.4})[0]
    cyl("parasol pole", (-2.9, 1.2, 1.15), 0.03, 2.4, pole_m, 16, rot=(0, math.radians(-6), 0))
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=1.5, radius2=0.05, depth=0.55, location=(-3.0, 1.2, 2.25))
    um = bpy.context.active_object
    um.data.materials.append(node_mat("parasol", stripes(["#ff6f61", "#fff6ea"])))
    for p in um.data.polygons:
        p.use_smooth = True
    sd_ = um.modifiers.new("cloth", "SOLIDIFY")
    sd_.thickness = 0.01
    box("towel", (-2.4, 0.4, 0.008), (1.0, 1.9, 0.01), node_mat("towel", stripes(["#4aa3df", "#fff6ea"])), 0.01)
    star_m = principled("starfish", **{"Base Color": (*srgb("#ff8a4c"), 1), "Roughness": 0.65})[0]
    shell_m = principled("shell", **{"Base Color": (*srgb("#fbeee3"), 1), "Roughness": 0.35, "Coat Weight": 0.5})[0]
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.14, depth=0.03, location=(1.25, -0.9, 0.015))
    st_o = bpy.context.active_object
    st_o.data.materials.append(star_m)
    for i, v in enumerate(st_o.data.vertices):
        a = math.atan2(v.co.y, v.co.x)
        k = 1.0 if (round(a / (math.pi / 5)) % 2 == 0) else 0.42
        v.co.x *= k
        v.co.y *= k
    sm = st_o.modifiers.new("smooth", "SUBSURF")
    sm.levels = sm.render_levels = 2
    for (x, y) in [(1.7, -0.3), (-1.1, -1.2), (2.2, 0.6)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.07, location=(x, y, 0.0))
        s = bpy.context.active_object
        s.scale = (1, 0.8, 0.45)
        s.data.materials.append(shell_m)
    cyl("bucket", (2.0, -0.2, 0.12), 0.13, 0.24, principled("bucket", **{"Base Color": (*srgb("#ffcf3f"), 1), "Roughness": 0.4})[0], 32)
    fog((0, 120, 3), (300, 80, 6), 0.0008, "#eaf2ff", 0.4)  # haze only far out, near the horizon


if PLACE == "meadow":
    place_meadow()
else:
    {"forest": place_forest, "subway": place_subway, "rain": place_rain, "beach": place_beach}[PLACE]()

# ---------------------------------------------------------------- camera: low, close, shallow focus on the face and jar
cam = bpy.data.cameras.new("cam")
cam.dof.use_dof = True
cam.dof.aperture_fstop = 2.0
cam_o = link(bpy.data.objects.new("cam", cam))
if VIEW == "wide":   # desktop: Mallow a little above centre, room for the replies on the right
    cam.lens = 50
    cam_o.location = (0.6, -6.4, 0.85)
    look = Vector((0.05, -0.9, 1.0))
else:                # phone: a taller frame with Mallow in the upper half, the dialogue box over the grass below
    cam.lens = 38
    cam_o.location = (0.45, -6.6, 0.8)
    look = Vector((0.04, -0.9, 0.42))
cam_o.rotation_euler = (look - cam_o.location).to_track_quat("-Z", "Y").to_euler()
cam.dof.focus_distance = (Vector((0, -1.1, 1.2)) - cam_o.location).length
scene.camera = cam_o
if os.environ.get("TOPVIEW"):  # debugging: look down at the scene
    cam_o.location = (0, -4, 14)
    cam_o.rotation_euler = (Vector((0, 8, 0)) - cam_o.location).to_track_quat("-Z", "Y").to_euler()
    cam.dof.use_dof = False

# ---------------------------------------------------------------- render
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SPP
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 8
scene.cycles.volume_bounces = 1
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.volume_step_rate = 4.0
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
for vt in ("AgX", "Filmic"):
    try:
        scene.view_settings.view_transform = vt
        break
    except TypeError:
        continue
for look_name in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Base Contrast"):
    try:
        scene.view_settings.look = look_name
        break
    except TypeError:
        continue
from bpy_extras.object_utils import world_to_camera_view


bpy.context.view_layer.update()  # camera placement must be applied before projecting


def to_px(v):
    c = world_to_camera_view(scene, cam_o, v)
    return c.x * W, (1 - c.y) * H


def face_rect():
    """Pixel box around everything an expression can change (eyes, brows, mouth), with a margin."""
    pts = [on_face(x, z)[0] for x in (-0.42, -0.2, 0, 0.2, 0.42) for z in (1.22, 1.3, 1.5, 1.72)]
    xs, ys = zip(*(to_px(p) for p in pts))
    m = 0.02 * max(W, H)
    return [max(0, min(xs) - m), max(0, min(ys) - m), min(W, max(xs) + m), min(H, max(ys) + m)]


meta = {"w": W, "h": H, "face": [round(v) for v in face_rect()],
        "head": [round(v) for v in to_px(on_face(0.3, 1.8)[0])],   # where emotes pop up
        "jar": [round(v) for v in to_px(JAR + Vector((0, 0, 0.17)))],  # where feelings drift out
        "mallow": [round(v) for v in to_px(Vector((0, -0.6, 1.0)))]}
if MODE == "patch":
    x0, y0, x1, y1 = meta["face"]
    scene.render.use_border = True
    scene.render.use_crop_to_border = True
    scene.render.border_min_x, scene.render.border_max_x = x0 / W, x1 / W
    scene.render.border_min_y, scene.render.border_max_y = 1 - y1 / H, 1 - y0 / H
elif MODE == "cutout":
    # Mallow and the jar alone on transparent, for icons and cards
    scene.render.film_transparent = True
    keep_near = Vector((0, -0.5, 1.0))
    for o in list(scene.objects):
        if o.type in {"MESH", "CURVE", "META"}:
            # keep Mallow, the face, the arms and the jar; hide the meadow, hills, mist, dandelions and far motes
            far = (o.matrix_world.translation - keep_near).length > 1.4
            if far or o.name in {"meadow", "clearing", "Plane"} or o.particle_systems:
                o.hide_render = True
    cam.dof.use_dof = False
if MODE == "base":
    with open(OUT.rsplit(".", 1)[0] + ".json", "w") as f:
        json.dump(meta, f)
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("done", OUT, json.dumps(meta))
