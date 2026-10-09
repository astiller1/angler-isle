"""Island terrain on the planet sphere, generated from island_shape.json.

The mesh is already curved: vertices sit at planet radius + height, with the island at the north pole
(Blender +Z = three.js +Y). The game uses this mesh both for rendering and as walkable collision.
Edit island_shape.json for big changes; sculpt the exported mesh in Blender for detail (but note that a
re-run of this script overwrites island.glb)."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *  # noqa: E402,F403
from palette import mix  # noqa: E402

SHAPE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "island_shape.json"), encoding="utf-8"))
R = SHAPE["planetRadius"]


# ----------------------------------------------------------------------------- helpers

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def smoothstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def smax(a, b, k):
    h = max(k - abs(a - b), 0.0) / k
    return max(a, b) + h * h * k * 0.25


def _hash(ix, iz, seed):
    n = (ix * 374761393 + iz * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def vnoise(x, z, freq, seed=0):
    x *= freq
    z *= freq
    ix, iz = math.floor(x), math.floor(z)
    fx, fz = x - ix, z - iz
    fx, fz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    a, b = _hash(ix, iz, seed), _hash(ix + 1, iz, seed)
    c, d = _hash(ix, iz + 1, seed), _hash(ix + 1, iz + 1, seed)
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz) * 2 - 1


def region_w(reg, x, z):
    d = math.hypot(x - reg["x"], z - reg["z"])
    return 1 - smoothstep(reg["r"] * 0.55, reg["r"], d)


def seg_dist(px, pz, a, b):
    ax, az = a
    bx, bz = b
    dx, dz = bx - ax, bz - az
    t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz + 1e-9))
    return math.hypot(px - ax - dx * t, pz - az - dz * t)


def map_to_blender(x, z, h):
    d = math.hypot(x, z)
    th = d / R
    s = math.sin(th) / d if d > 1e-9 else 1.0 / R
    r = R + h
    tx, ty, tz = x * s * r, math.cos(th) * r, z * s * r  # three.js coordinates
    return Vector((tx, -tz, ty))  # -> Blender (Z up)


# ----------------------------------------------------------------------------- height field

def sample(x, z):
    """Returns (height, info) for map coordinates."""
    S = -1e9
    for b in SHAPE["land"]:
        S = smax(S, b["r"] - math.hypot(x - b["x"], z - b["z"]), 14.0)
    S += vnoise(x, z, 0.035, 1) * 4.0 + vnoise(x, z, 0.09, 2) * 1.2
    for c in SHAPE["cuts"]:
        S = min(S, math.hypot(x - c["x"], z - c["z"]) - c["r"])

    beach = max([region_w(b, x, z) for b in SHAPE["beaches"]] + [0.0])
    cliff_w, cliff_h = 0.0, 0.0
    for c in SHAPE["cliffs"]:
        w = region_w(c, x, z)
        if w > cliff_w:
            cliff_w, cliff_h = w, c["h"]
    hill_sum, jungle = 0.0, 0.0

    if S >= 0:
        h = 0.35 + 1.7 * smoothstep(0, 12, S) + 0.03 * S
        h = lerp(h, 0.25 + 0.065 * S, beach * (1 - smoothstep(18, 30, S)))
        h += cliff_w * cliff_h * smoothstep(0, 5, S)
        for hl in SHAPE["hills"]:
            d = math.hypot(x - hl["x"], z - hl["z"])
            bump = hl["h"] * math.exp(-((d / hl["r"]) ** 2) * 2.2) * smoothstep(2, 18, S)
            hill_sum += bump
            if hl.get("jungle"):
                jungle = max(jungle, bump / hl["h"])
        h += hill_sum
        h += vnoise(x, z, 0.06, 3) * 0.7 * smoothstep(4, 14, S)
    else:
        slope = lerp(0.32, 0.1, beach)
        h = 0.35 + S * slope
        h -= cliff_w * min(5.0, -S * 1.4)
        h = max(h, -14.0)
        for s in SHAPE["shallows"]:
            w = region_w(s, x, z)
            if w > 0:
                h = lerp(h, s["depth"] + vnoise(x, z, 0.15, 4) * 0.15, w)

    for p in SHAPE["pads"]:
        d = math.hypot(x - p["x"], z - p["z"])
        w = (1 - smoothstep(p["r"], p["r"] + p["blend"], d)) * smoothstep(-3, 2, S)
        h = lerp(h, p["h"], w)

    path = 0.0
    for p in SHAPE["paths"]:
        pts = p["pts"]
        for i in range(len(pts) - 1):
            d = seg_dist(x, z, pts[i], pts[i + 1])
            path = max(path, 1 - smoothstep(p["w"] * 0.3, p["w"] * 0.75, d + vnoise(x, z, 0.3, 9) * 0.4))
    return h, dict(S=S, beach=beach, cliff=cliff_w, jungle=jungle, path=path)


def color_for(x, z, h, info, slope):
    n = vnoise(x, z, 0.12, 7)
    if h < -0.05:
        return mix("seabed", "seabed_deep", smoothstep(0.4, 6.0, -h))
    if info["cliff"] > 0.35 and (slope > 0.45 or h > 1.5):
        return mix("rock", "rock_light", 0.5 + n * 0.5)
    if slope > 0.9:
        return mix("rock_dark", "rock", 0.5 + n * 0.5)
    sandy = h < 0.9 + n * 0.25 or (info["beach"] > 0.35 and h < 2.4 + n * 0.3)
    if sandy:
        c = mix("sand_wet", "sand", smoothstep(0.0, 0.5, h))
    elif info["jungle"] > 0.3:
        c = mix("jungle", "jungle_dark", smoothstep(0.3, 0.8, info["jungle"]) * (0.6 + 0.4 * n))
    else:
        c = mix("grass", "grass_light", 0.5 + n * 0.5)
        c = mix(c, "sand", smoothstep(1.4, 0.95, h))  # soft transition from beach
    if info["path"] > 0 and h >= 0:
        c = mix(c, "sand_path", info["path"])
    return c


# ----------------------------------------------------------------------------- build

def build():
    g = SHAPE["grid"]
    half, step, drop = g["half"], g["step"], g["dropBelow"]
    n = int(round(2 * half / step)) + 1
    H = [[0.0] * n for _ in range(n)]
    INFO = [[None] * n for _ in range(n)]
    for j in range(n):
        z = -half + j * step
        for i in range(n):
            x = -half + i * step
            H[j][i], INFO[j][i] = sample(x, z)

    mb = MB()
    bm = mb.bm
    verts = {}

    def vert(i, j):
        key = (i, j)
        v = verts.get(key)
        if v is None:
            v = bm.verts.new(map_to_blender(-half + i * step, -half + j * step, H[j][i]))
            verts[key] = v
        return v

    colors = {}

    def color(i, j):
        c = colors.get((i, j))
        if c is None:
            i0, i1 = max(i - 1, 0), min(i + 1, n - 1)
            j0, j1 = max(j - 1, 0), min(j + 1, n - 1)
            sx = (H[j][i1] - H[j][i0]) / ((i1 - i0) * step)
            sz = (H[j1][i] - H[j0][i]) / ((j1 - j0) * step)
            slope = math.hypot(sx, sz)
            c = color_for(-half + i * step, -half + j * step, H[j][i], INFO[j][i], slope)
            colors[(i, j)] = c
        return c

    for j in range(n - 1):
        for i in range(n - 1):
            hs = (H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i])
            if max(hs) < drop:
                continue
            # quad corners in map order; Blender y = -map z flips winding, so go (i,j)->(i,j+1)->...
            quad = [(i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j)]
            f = bm.faces.new([vert(a, b) for a, b in quad])
            f.smooth = True
            for l, (a, b) in zip(f.loops, quad):
                l[mb.col] = (*lin(color(a, b)), 1.0)
    bmesh_ops_triangulate(bm)
    obj_from(mb, "island")


def bmesh_ops_triangulate(bm):
    import bmesh
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method="BEAUTY")


run(build, __file__)
