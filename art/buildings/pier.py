"""The long wooden pier: 3 m wide, 44 m long, plus a 7 x 7 m end platform with an open seaward edge.
Extends along -Y (forward). Deck top = origin; placed at h = 2.2 from the dock's east edge."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def build():
    b = B(11)
    b.deck(-1.5, 1.5, -44, 0, 0, along="x")
    b.deck(-3.5, 3.5, -51, -44, 0, along="y")
    for y in range(0, -45, -4):
        for x in (-1.4, 1.4):
            b.post(x, y, -0.1, -8, r=0.14)
    b.stilts(-3.5, 3.5, -51, -44, 0, -9, spacing=3.5)
    b.railing((1.5, 0), (1.5, -44), spacing=2.0)
    b.railing((-1.5, 0), (-1.5, -44), spacing=2.0)
    b.railing((1.5, -44), (3.5, -44))
    b.railing((-1.5, -44), (-3.5, -44))
    b.railing((3.5, -44), (3.5, -51))
    b.railing((-3.5, -44), (-3.5, -51))
    for y in (-12, -24, -36):
        b.lantern_post(1.35, y, 0)
    b.bollard(-3.0, -50.6, 0)
    b.bollard(3.0, -50.6, 0)
    b.crate(-2.7, -45.0, 0, s=0.55)
    b.barrel(-2.9, -46.0, 0, r=0.26, h=0.65)
    # ladder down to the water on the end
    for k in range(6):
        b.mb.box((0.7, 0.06, 0.06), (0, -51.05, -0.3 - k * 0.4), color="wood_dark")
    for sx in (-0.35, 0.35):
        b.mb.box((0.07, 0.07, 2.6), (sx, -51.05, -1.2), color="wood_dark")
    empty("ANCHOR_walter", (1.6, -50.5, 0))
    b.finish("pier")


run(build, __file__)
