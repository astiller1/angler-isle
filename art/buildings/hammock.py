"""Hammock between two posts for Fritzi the sloth. Hammock runs along X; ANCHOR_hammock is the lowest point."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def build():
    b = B(17)
    for x in (-2.0, 2.0):
        b.post(x, 0, 2.0, -0.5, r=0.11, color="trunk", collide=True)
        b.mb.sphere(0.13, (x, 0, 2.02), color="trunk_dark", seg=8, rings=6)
    pts = []
    for k in range(9):
        t = k / 8
        x = -1.5 + 3.0 * t
        pts.append((x, 0, 1.55 - math.sin(t * math.pi) * 0.6))
    for i in range(len(pts) - 1):
        a, c = pts[i], pts[i + 1]
        col = ("roof_red", "wall_yellow", "roof_teal")[i % 3]
        ang = math.atan2(c[2] - a[2], c[0] - a[0])
        L = math.hypot(c[0] - a[0], c[2] - a[2])
        b.mb.box((L + 0.02, 0.9, 0.05), ((a[0] + c[0]) / 2, 0, (a[2] + c[2]) / 2), rot=(0, -ang, 0), color=col)
    for s in (-1, 1):
        b.mb.box((0.55, 0.03, 0.03), (s * 1.75, 0, 1.75), rot=(0, s * 0.6, 0), color="rope")
    b.col((3.0, 1.0, 0.4), (0, 0, 1.1))
    # side table with a coconut drink
    b.mb.cyl(0.3, 0.05, (0, -1.0, 0.6), color="wood_light", seg=10)
    b.mb.cyl(0.05, 0.6, (0, -1.0, 0.3), color="wood", seg=6)
    b.mb.sphere(0.13, (0, -1.0, 0.75), color="coconut", seg=8, rings=6)
    b.mb.cyl(0.01, 0.25, (0.03, -1.0, 0.92), rot=(0, 0.3, 0), color="flower_pink", seg=4)
    b.col((0.6, 0.6, 0.7), (0, -1.0, 0.35))
    empty("ANCHOR_hammock", (0, 0, 1.0))
    b.finish("hammock")


run(build, __file__)
