"""
Small UI pieces for Mallow's screen, rendered in Cycles on transparent:
  orb_off.png         an empty frosted-glass bead (a step not reached yet)
  orb_<colour>.png     the same bead with a glowing feeling inside (a step done / the current step)
  cork.png            a rounded cork tab (Mallow's name tag; the name is HTML on top)
Usage: python ui_assets.py OUTDIR SPP
"""
import math
import sys
import bpy
from mathutils import Vector

OUT, SPP = sys.argv[1], int(sys.argv[2])


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SPP
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = True  # glass shows what is behind it on the page, not a grey film
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    for vt in ("Standard",):
        try:
            sc.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb("#fff3e2"), 1)
    bg.inputs["Strength"].default_value = 0.7
    # warm key light from the upper left, like the low sun in the meadow, and a soft fill
    for name, loc, energy, size, col in (("key", (-2.5, -2.0, 3.0), 160, 1.2, "#ffe2b8"), ("fill", (2.5, -3.0, 0.5), 70, 3.0, "#e6eeff")):
        l = bpy.data.lights.new(name, "AREA")
        l.energy, l.size, l.color = energy, size, srgb(col)
        o = bpy.data.objects.new(name, l)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return sc


def camera(sc, w, h, ortho_scale):
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = ortho_scale
    o = bpy.data.objects.new("cam", cam)
    sc.collection.objects.link(o)
    o.location = (0, -6, 0)
    o.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = o
    sc.render.resolution_x, sc.render.resolution_y = w, h


def mat(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    for k, v in inputs.items():
        b.inputs[k].default_value = v
    return m


def orb(colour, path):
    sc = reset()
    camera(sc, 160, 160, 2.3)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1)
    g = bpy.context.active_object
    for p in g.data.polygons:
        p.use_smooth = True
    g.data.materials.append(mat("glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.03,
                                            "Transmission Weight": 1.0, "IOR": 1.45, "Coat Weight": 1.0, "Coat Roughness": 0.02}))
    if colour is not None:
        m = bpy.data.materials.new("core")
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        # brighter in the middle, the colour deepening towards the edge: a glow, not a flat disk
        e = nt.nodes.new("ShaderNodeEmission")
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.45
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*[min(1, c * 1.8 + 0.25) for c in srgb(colour)], 1)
        ramp.color_ramp.elements[1].color = (*[c * 0.85 for c in srgb(colour)], 1)
        nt.links.new(lw.outputs["Facing"], ramp.inputs[0])
        nt.links.new(ramp.outputs[0], e.inputs["Color"])
        e.inputs["Strength"].default_value = 1.6
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(e.outputs[0], out.inputs[0])
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.5, location=(0.05, 0, -0.06))
        bpy.context.active_object.data.materials.append(m)
        l = bpy.data.lights.new("glow", "POINT")
        l.energy, l.color, l.shadow_soft_size = 6, srgb(colour), 0.3
        lo = bpy.data.objects.new("glow", l)
        sc.collection.objects.link(lo)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def cork(path):
    sc = reset()
    camera(sc, 360, 132, 2.8)
    bpy.ops.mesh.primitive_cube_add(size=1)
    c = bpy.context.active_object
    c.scale = (2.5, 0.42, 0.78)
    bpy.ops.object.transform_apply(scale=True)
    bev = c.modifiers.new("round", "BEVEL")
    bev.width, bev.segments = 0.36, 10
    sub = c.modifiers.new("smooth", "SUBSURF")
    sub.levels = sub.render_levels = 2
    for p in c.data.polygons:
        p.use_smooth = True
    m = bpy.data.materials.new("cork")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.85
    # cork: a warm tan with fine dark and light flecks, and a little bump
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.inputs["Scale"].default_value = 70
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 24
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*srgb("#9a6a3c"), 1)
    ramp.color_ramp.elements[1].color = (*srgb("#d9a86e"), 1)
    ramp.color_ramp.elements.new(0.55).color = (*srgb("#c58f55"), 1)
    mix = nt.nodes.new("ShaderNodeMath")
    mix.operation = "MULTIPLY"
    nt.links.new(v.outputs["Distance"], mix.inputs[0])
    nt.links.new(n.outputs["Fac"], mix.inputs[1])
    nt.links.new(mix.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    nt.links.new(v.outputs["Distance"], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], b.inputs["Normal"])
    c.data.materials.append(m)
    c.rotation_euler = (0, math.radians(-3), 0)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


orb(None, f"{OUT}/orb_off.png")
for name, col in (("amber", "#ffa92e"), ("coral", "#ff6f5a"), ("mint", "#3fd39a"), ("lilac", "#9b78ff"), ("sky", "#4aa3ff")):
    orb(col, f"{OUT}/orb_{name}.png")
cork(f"{OUT}/cork.png")
print("assets done")
