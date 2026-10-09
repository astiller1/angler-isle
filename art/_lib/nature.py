"""Vegetation and rocks. Every model stands at the origin (ground level), +Z up."""
import math

from kit import MB, obj_from, rng, Vector
from palette import mix


def palm(seed=1, height=6.0, lean=1.0, leaves=8, coconuts=3, name="palm"):
    r = rng(seed)
    mb = MB()
    # curved trunk
    pts, radii = [], []
    n = 9
    for i in range(n + 1):
        t = i / n
        pts.append((lean * t * t, 0, height * t))
        radii.append(0.24 - 0.1 * t)
    verts = mb.tube(pts, radii, color="trunk", seg=7)
    mb.recolor(verts, lambda co: "trunk_dark" if int(co.z * 2.6) % 2 == 0 else "trunk")
    top = Vector(pts[-1])
    # leaves: drooping strips
    for k in range(leaves):
        a = k / leaves * math.tau + r.uniform(-0.2, 0.2)
        L = r.uniform(2.4, 3.1)
        d = Vector((math.cos(a), math.sin(a), 0))
        side = Vector((-d.y, d.x, 0))
        lift = r.uniform(0.3, 0.7)
        col = r.choice(["palm_leaf", "palm_leaf", "palm_leaf_dark"])
        prev = None
        segs = 7
        for i in range(segs + 1):
            t = i / segs
            c = top + d * (L * t) + Vector((0, 0, lift * t - 1.9 * t * t))
            w = 0.42 * math.sin(math.pi * min(t * 1.1, 1.0)) ** 0.7 + 0.03
            left = c + side * w + Vector((0, 0, -w * 0.25))
            right = c - side * w + Vector((0, 0, -w * 0.25))
            if prev:
                cc = mix(col, "palm_leaf_dark", t * 0.5)
                mb.poly([prev[0], prev[1], c, left], color=cc, both_sides=True)
                mb.poly([prev[1], prev[2], right, c], color=cc, both_sides=True)
            prev = (left, c, right)
    for k in range(coconuts):
        a = k / max(coconuts, 1) * math.tau + 0.4
        mb.sphere(0.16, (top.x + math.cos(a) * 0.22, math.sin(a) * 0.22, top.z - 0.22), color="coconut", seg=8, rings=6)
    o = obj_from(mb, name)
    cb = MB()
    cb.cyl(0.28, 3.0, (lean * 0.1, 0, 1.5), color="col", seg=6)
    obj_from(cb, "COLP_" + name)
    return o


def bush(seed=1, size=1.0, flowers=True, name="bush"):
    r = rng(seed)
    mb = MB()
    for k in range(5):
        a = k / 5 * math.tau + r.uniform(0, 1)
        d = r.uniform(0.1, 0.45) * size
        s = r.uniform(0.38, 0.55) * size
        mb.ico(s, (math.cos(a) * d, math.sin(a) * d, s * 0.75), scale=(1, 1, 0.85), color=r.choice(["grass_dark", "jungle", "palm_leaf"]), sub=1)
    if flowers:
        for k in range(6):
            a = r.uniform(0, math.tau)
            mb.sphere(0.07 * size, (math.cos(a) * 0.5 * size, math.sin(a) * 0.5 * size, r.uniform(0.4, 0.8) * size),
                      color=r.choice(["flower_red", "flower_yellow", "flower_pink"]), seg=6, rings=4)
    return obj_from(mb, name)


def jungle_tree(seed=1, height=5.5, name="jungle_tree"):
    r = rng(seed)
    mb = MB()
    mb.tube([(0, 0, 0), (0.2, 0.1, height * 0.5), (0.1, 0, height)], [0.3, 0.22, 0.16], color="trunk_dark", seg=7)
    for k in range(4):
        a = k / 4 * math.tau + r.uniform(0, 0.5)
        d = r.uniform(0.6, 1.1)
        s = r.uniform(1.2, 1.6)
        mb.ico(s, (math.cos(a) * d, math.sin(a) * d, height + r.uniform(-0.4, 0.5)), scale=(1, 1, 0.75),
               color=r.choice(["jungle", "jungle_dark", "grass_dark"]), sub=1)
    mb.ico(1.4, (0, 0, height + 0.9), scale=(1, 1, 0.8), color="jungle", sub=1)
    o = obj_from(mb, name)
    cb = MB()
    cb.cyl(0.35, 3.0, (0, 0, 1.5), color="col", seg=6)
    obj_from(cb, "COLP_" + name)
    return o


def mangrove(seed=1, name="mangrove"):
    """Stands in shallow water: roots arch from z=+1.2 down into the water/mud (z<0)."""
    r = rng(seed)
    mb = MB()
    mb.tube([(0, 0, 1.0), (0.1, 0, 2.4), (0, 0.1, 3.2)], [0.16, 0.13, 0.1], color="mangrove_root", seg=6)
    for k in range(7):
        a = k / 7 * math.tau + r.uniform(-0.2, 0.2)
        d = r.uniform(0.9, 1.5)
        pts = [(0, 0, 1.2), (math.cos(a) * d * 0.45, math.sin(a) * d * 0.45, 1.3), (math.cos(a) * d * 0.85, math.sin(a) * d * 0.85, 0.6),
               (math.cos(a) * d, math.sin(a) * d, -0.6)]
        mb.tube(pts, [0.08, 0.07, 0.06, 0.05], color="mangrove_root", seg=5)
    for k in range(5):
        a = k / 5 * math.tau
        mb.ico(r.uniform(0.9, 1.2), (math.cos(a) * 0.8, math.sin(a) * 0.8, 3.2 + r.uniform(-0.2, 0.3)), scale=(1, 1, 0.7),
               color=r.choice(["mangrove_leaf", "jungle", "grass_dark"]), sub=1)
    mb.ico(1.0, (0, 0, 3.8), scale=(1, 1, 0.7), color="mangrove_leaf", sub=1)
    o = obj_from(mb, name)
    cb = MB()
    cb.cyl(0.9, 2.0, (0, 0, 0.6), color="col", seg=6)
    obj_from(cb, "COLP_" + name)
    return o


def rock(seed=1, size=1.0, flat=1.0, color="rock", name="rock", collide=True):
    r = rng(seed)
    mb = MB()
    verts = mb.ico(size, (0, 0, size * 0.45 * flat), scale=(1, r.uniform(0.75, 1.1), 0.7 * flat), color=color, sub=1)
    for v in verts:
        k = r.uniform(0.82, 1.12)
        v.co.x *= k
        v.co.y *= k
        v.co.z = max(v.co.z * r.uniform(0.85, 1.1), -0.2)
    mb.recolor(verts, lambda co: mix("rock_dark", color, min(1.0, max(0.0, co.z / (size * flat) + 0.3))))
    o = obj_from(mb, name)
    if collide:
        cb = MB()
        cb.ico(size * 0.92, (0, 0, size * 0.4 * flat), scale=(1, 0.95, 0.65 * flat), color="col", sub=0)
        obj_from(cb, "COL_" + name)
    return o


def flowers(seed=1, name="flowers"):
    r = rng(seed)
    mb = MB()
    for k in range(7):
        x, y = r.uniform(-0.6, 0.6), r.uniform(-0.6, 0.6)
        h = r.uniform(0.15, 0.35)
        mb.cyl(0.015, h, (x, y, h / 2), color="grass_dark", seg=3)
        c = r.choice(["flower_red", "flower_yellow", "flower_pink", "white"])
        mb.cyl(0.075, 0.025, (x, y, h), color=c, seg=5)
        mb.cyl(0.03, 0.03, (x, y, h + 0.012), color="flower_yellow", seg=4)
    return obj_from(mb, name)


def grass(seed=1, name="grass"):
    r = rng(seed)
    mb = MB()
    for k in range(10):
        x, y = r.uniform(-0.35, 0.35), r.uniform(-0.35, 0.35)
        h = r.uniform(0.25, 0.55)
        mb.cyl(0.05, h, (x, y, h / 2), r2=0.0, rot=(r.uniform(-0.3, 0.3), r.uniform(-0.3, 0.3), 0),
               color=r.choice(["grass_dark", "palm_leaf", "grass"]), seg=3)
    return obj_from(mb, name)
