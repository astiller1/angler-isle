"""Shared low-poly modelling kit for Angler-Insel.

Conventions
- Every model is built from code in its own script and exported to a .glb next to it.
- All geometry uses ONE material ("Palette") whose colour comes from the "Col" vertex colour attribute.
- Characters, fish and props face Blender -Y (the "front" view). In three.js that becomes +Z.
- Objects named COL_* are collision proxies: hidden in game, merged into the collision world.
- Empties named ANCHOR_* / SLOT_* mark attachment points read by the game.

Usage inside an art script:
    import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
    from kit import *
    def build(): ...
    run(build, __file__)
"""
import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

from palette import C, lin

__all__ = [
    "MB", "C", "lin", "run", "obj_from", "empty", "parent", "text_mesh", "Vector", "Matrix", "Euler",
    "math", "col_box", "col_cyl", "rng",
]


# ----------------------------------------------------------------------------- scene / export

def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)


def palette_material():
    m = bpy.data.materials.get("Palette")
    if m:
        return m
    m = bpy.data.materials.new("Palette")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    return m


def export_glb(path):
    kwargs = dict(
        filepath=path, export_format="GLB", use_selection=False, export_apply=True, export_yup=True,
        export_texcoords=False, export_normals=True, export_extras=True, export_cameras=False,
        export_lights=False, export_animations=False,
    )
    try:
        bpy.ops.export_scene.gltf(export_vertex_color="ACTIVE", **kwargs)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def run(build, file):
    """Clear the scene, build the model, and (when headless) export <script>.glb."""
    clear_scene()
    build()
    if bpy.app.background:
        export_glb(os.path.splitext(os.path.abspath(file))[0] + ".glb")


# ----------------------------------------------------------------------------- mesh builder

def _mat(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    s = Matrix.Diagonal((*scale, 1.0))
    return Matrix.Translation(Vector(loc)) @ Euler(rot).to_matrix().to_4x4() @ s


class MB:
    """Accumulates coloured primitives into one bmesh. All coordinates are world space."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new("Col")

    # -- internals
    def _finish(self, verts, color, M, smooth):
        bmesh.ops.transform(self.bm, matrix=M, verts=verts)
        faces = {f for v in verts for f in v.link_faces}
        self._paint(faces, color)
        for f in faces:
            f.smooth = smooth
        return verts

    def _paint(self, faces, color):
        for f in faces:
            for l in f.loops:
                c = color(l.vert.co) if callable(color) else color
                l[self.col] = (*lin(c), 1.0)

    # -- primitives (color may be a palette key/hex or a function(co)->hex)
    def box(self, size, loc=(0, 0, 0), rot=(0, 0, 0), color="white", smooth=False):
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        return self._finish(r["verts"], color, _mat(loc, rot, size), smooth)

    def cyl(self, r, h, loc=(0, 0, 0), rot=(0, 0, 0), color="white", seg=8, r2=None, smooth=False, scale=(1, 1, 1)):
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r,
                                    radius2=r if r2 is None else r2, depth=h)
        return self._finish(res["verts"], color, _mat(loc, rot, scale), smooth)

    def sphere(self, r, loc=(0, 0, 0), scale=(1, 1, 1), color="white", seg=12, rings=8, rot=(0, 0, 0), smooth=True):
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=r)
        return self._finish(res["verts"], color, _mat(loc, rot, scale), smooth)

    def ico(self, r, loc=(0, 0, 0), scale=(1, 1, 1), color="white", sub=1, rot=(0, 0, 0), smooth=False):
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=r)
        return self._finish(res["verts"], color, _mat(loc, rot, scale), smooth)

    def poly(self, points, color="white", smooth=False, both_sides=False):
        """A single flat polygon from world points."""
        vs = [self.bm.verts.new(p) for p in points]
        faces = [self.bm.faces.new(vs)]
        if both_sides:
            faces.append(self.bm.faces.new([self.bm.verts.new(p) for p in reversed(points)]))
        self._paint(faces, color)
        for f in faces:
            f.smooth = smooth
        return vs

    def tube(self, path, radii, color="white", seg=8, smooth=True, cap=True):
        """Generalised cylinder along a list of points; radii is a list (or a float)."""
        if not isinstance(radii, (list, tuple)):
            radii = [radii] * len(path)
        path = [Vector(p) for p in path]
        rings = []
        prev_n = None
        for i, p in enumerate(path):
            t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            n = prev_n if prev_n is not None else (Vector((1, 0, 0)) if abs(t.x) < 0.9 else Vector((0, 1, 0)))
            n = (n - t * n.dot(t)).normalized()
            prev_n = n
            b = t.cross(n)
            ring = []
            for k in range(seg):
                a = 2 * math.pi * k / seg
                ring.append(self.bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * radii[i]))
            rings.append(ring)
        faces = []
        for i in range(len(rings) - 1):
            for k in range(seg):
                a, b2 = rings[i][k], rings[i][(k + 1) % seg]
                c, d = rings[i + 1][(k + 1) % seg], rings[i + 1][k]
                faces.append(self.bm.faces.new((a, b2, c, d)))
        if cap:
            faces.append(self.bm.faces.new(list(reversed(rings[0]))))
            faces.append(self.bm.faces.new(rings[-1]))
        self._paint(faces, color)
        for f in faces:
            f.smooth = smooth
        return [v for r in rings for v in r]

    def recolor(self, verts, color):
        self._paint({f for v in verts for f in v.link_faces}, color)


def obj_from(mb, name, origin=(0, 0, 0), parent_obj=None, collection=None):
    """Turn a builder into an object whose origin (pivot) is at `origin` (world space)."""
    origin = Vector(origin)
    bmesh.ops.transform(mb.bm, matrix=Matrix.Translation(-origin), verts=mb.bm.verts)
    me = bpy.data.meshes.new(name)
    mb.bm.normal_update()
    mb.bm.to_mesh(me)
    mb.bm.free()
    if "Col" in me.color_attributes:
        me.color_attributes.active_color_name = "Col"
        me.color_attributes.render_color_index = me.color_attributes.find("Col")
    me.materials.append(palette_material())
    o = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(o)
    o.location = origin
    if parent_obj is not None:
        parent(o, parent_obj)
    return o


def empty(name, loc=(0, 0, 0), parent_obj=None, size=0.1):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = size
    bpy.context.scene.collection.objects.link(o)
    o.location = Vector(loc)
    if parent_obj is not None:
        parent(o, parent_obj)
    return o


def parent(child, par):
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = par
    child.matrix_world = mw


def text_mesh(mb, text, loc, size=0.3, color="black", depth=0.02, rot=(math.pi / 2, 0, 0), align="CENTER"):
    """Bake a 3D text into the builder (default: standing, readable from -Y)."""
    cu = bpy.data.curves.new("txt", type="FONT")
    cu.body = text
    cu.size = size
    cu.extrude = depth
    cu.align_x = align
    cu.align_y = "CENTER"
    tmp = bpy.data.objects.new("txt", cu)
    bpy.context.scene.collection.objects.link(tmp)
    bpy.context.view_layer.update()
    me = tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    M = _mat(loc, rot)
    vmap = {}
    faces = []
    for v in me.vertices:
        vmap[v.index] = mb.bm.verts.new(M @ v.co)
    for p in me.polygons:
        try:
            faces.append(mb.bm.faces.new([vmap[i] for i in p.vertices]))
        except ValueError:
            pass
    mb._paint(faces, color)
    tmp.to_mesh_clear()
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)


# ----------------------------------------------------------------------------- collision proxies

def col_box(name, size, loc, rot=(0, 0, 0)):
    mb = MB()
    mb.box(size, loc, rot, color="col")
    return obj_from(mb, "COL_" + name, origin=loc)


def col_cyl(name, r, h, loc, seg=8):
    mb = MB()
    mb.cyl(r, h, loc, color="col", seg=seg)
    return obj_from(mb, "COL_" + name, origin=loc)


# ----------------------------------------------------------------------------- deterministic random

class rng:
    """Tiny deterministic PRNG so re-running a script gives the same model."""

    def __init__(self, seed=1):
        self.s = seed & 0xFFFFFFFF or 1

    def random(self):
        self.s ^= (self.s << 13) & 0xFFFFFFFF
        self.s ^= self.s >> 17
        self.s ^= (self.s << 5) & 0xFFFFFFFF
        return (self.s & 0xFFFFFFFF) / 4294967296.0

    def uniform(self, a, b):
        return a + (b - a) * self.random()

    def choice(self, seq):
        return seq[int(self.random() * len(seq)) % len(seq)]
