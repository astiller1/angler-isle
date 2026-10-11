"""Little wooden rowboat (3.6 m). Bow points to -Y (game forward), keel bottom at z = 0 (the game floats it
so the waterline sits ~0.18 m up the hull). Oars are separate objects `oar_L` / `oar_R` pivoting at the
oarlocks (the game swings them while rowing). ANCHOR_seat = where the cat sits, ANCHOR_motor = transom
clamp point for the outboard motor (props/outboard)."""
import math
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from palette import mix

L = 3.6
N = 14  # sections bow -> stern


def section(u):
    """Hull cross-section at u (0 = bow tip, 1 = transom): list of (x, z) from port gunwale to starboard."""
    w = 0.7 * math.sqrt(max(0.0, 1 - (1 - u) ** 2.4)) * (1 - 0.18 * u ** 4)
    top = 0.5 + 0.22 * (1 - u) ** 3
    bot = 0.32 * (1 - u) ** 3.5
    pts = [(-w, top), (-w * 0.9, bot + (top - bot) * 0.45), (-w * 0.5, bot + 0.04), (0, bot)]
    return pts + [(-x, z) for x, z in reversed(pts[:-1])]


def build():
    mb = MB()
    ys = [-L / 2 + L * i / N for i in range(N + 1)]
    secs = [section(i / N) for i in range(N + 1)]
    hull_out = "#3F8FCB"
    stripe = "#FFFFFF"
    inner = "plank"
    for i in range(N):
        a, b = secs[i], secs[i + 1]
        ya, yb = ys[i], ys[i + 1]
        for k in range(len(a) - 1):
            q = [(a[k][0], ya, a[k][1]), (b[k][0], yb, b[k][1]), (b[k + 1][0], yb, b[k + 1][1]), (a[k + 1][0], ya, a[k + 1][1])]
            top_band = k in (0, len(a) - 2)
            outc = stripe if top_band else (hull_out if k not in (2, 3) else "#2F6F9F")
            # outside (normals point out) and the wooden inside as a second, reversed face
            mb.poly(q, color=outc)
            mb.poly(list(reversed(q)), color=mix(inner, "plank_dark", 0.25 * (k % 2)))
    # transom (flat stern board)
    st = secs[-1]
    pts = [(x, ys[-1], z) for x, z in st]
    mb.poly(pts, color="wood", both_sides=True)
    # gunwale rail
    for side in (0, -1):
        path = [(secs[i][side][0], ys[i], secs[i][side][1] + 0.02) for i in range(1, N + 1)]
        mb.tube(path, 0.045, color="wood_dark", seg=5, smooth=False)
    # floor boards
    mb.box((0.56, 2.3, 0.04), (0, 0.45, 0.07), color="plank_dark")
    # thwarts (seats)
    for y, w in ((-0.2, 1.3), (1.15, 1.18)):
        mb.box((w, 0.3, 0.06), (0, y, 0.38), color="wood_light")
    # bow cap + little bow post with a red pennant
    mb.box((0.1, 0.25, 0.08), (0, -L / 2 + 0.12, 0.74), color="wood_dark")
    mb.cyl(0.025, 0.55, (0, -L / 2 + 0.25, 0.98), color="wood_dark", seg=5)
    mb.poly([(0, -L / 2 + 0.25, 1.24), (0, -L / 2 + 0.6, 1.16), (0, -L / 2 + 0.25, 1.08)], color="red", both_sides=True)
    # name plate on both sides of the bow
    for sx in (-1, 1):
        mb.box((0.02, 0.5, 0.12), (sx * 0.43, -1.1, 0.5), rot=(0, 0, sx * -0.33), color="sign")
    # rope coil and a small bucket
    mb.cyl(0.16, 0.06, (0.25, 1.55, 0.12), color="rope", seg=10)
    mb.cyl(0.12, 0.22, (-0.3, 1.5, 0.2), r2=0.14, color="red", seg=8)
    # oarlocks
    for sx in (-1, 1):
        mb.box((0.06, 0.06, 0.14), (sx * 0.66, 0.1, 0.6), color="metal")
    root = obj_from(mb, "rowboat")
    empty("ANCHOR_seat", (0, -0.2, 0.41), parent_obj=root)
    empty("ANCHOR_motor", (0, L / 2, 0.5), parent_obj=root)

    for sx, name in ((-1, "oar_L"), (1, "oar_R")):
        om = MB()
        px, py, pz = sx * 0.68, 0.1, 0.66
        # shaft from the handle (inboard) out and down to the blade
        handle = (px - sx * 0.55, py, pz + 0.12)
        tip = (px + sx * 1.55, py, pz - 0.75)
        om.tube([handle, tip], 0.03, color="wood_light", seg=5, smooth=False)
        dx, dz = tip[0] - handle[0], tip[2] - handle[2]
        n = math.hypot(dx, dz)
        ang = math.atan2(dz, dx)
        om.box((0.5, 0.03, 0.16), (tip[0] + dx / n * 0.15, py, tip[2] + dz / n * 0.15), rot=(0, -ang, 0), color="wood")
        om.cyl(0.035, 0.12, handle, rot=(0, math.pi / 2, 0), color="black", seg=6)
        o = obj_from(om, name, origin=(px, py, pz))
        parent(o, root)


run(build, __file__)
