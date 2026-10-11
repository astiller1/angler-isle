"""Mangrove boardwalk: 1.8 m wide, 22 m long along -Y, ending in a 4 x 4 m fishing platform. Deck = origin."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def build():
    b = B(19)
    b.deck(-0.9, 0.9, -22, 0, 0, along="x", color="driftwood")
    b.deck(-2, 2, -26, -22, 0, along="y", color="driftwood")
    for y in range(0, -23, -3):
        for x in (-0.85, 0.85):
            b.post(x, y, -0.05, -3, r=0.1, color="mangrove_root")
    b.stilts(-2, 2, -26, -22, 0, -3, spacing=2, r=0.1)
    b.skirt([(-0.9, 0), (-0.9, -22), (-2, -22), (-2, -26), (2, -26), (2, -22), (0.9, -22), (0.9, 0), (-0.9, 0)], z_bottom=-3)
    b.railing((0.9, -1), (0.9, -22), rope=True, spacing=2.2)
    b.railing((-0.9, -1), (-0.9, -22), rope=True, spacing=2.2)
    b.railing((-2, -22), (-0.9, -22), rope=True)
    b.railing((0.9, -22), (2, -22), rope=True)
    b.railing((-2, -22), (-2, -26), rope=True)
    b.railing((2, -22), (2, -26), rope=True)
    b.mb.box((0.25, 0.25, 0.4), (1.6, -22.5, 0.2), color="crate")
    b.finish("boardwalk")


run(build, __file__)
