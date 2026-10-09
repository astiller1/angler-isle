"""Pelle's fish trader stall: counter with ice trays and a striped awning. Front = -Y. Floor = origin."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def build():
    b = B(9)
    b.mb.box((3.2, 0.8, 1.0), (0, -0.5, 0.5), color="wood")
    b.mb.box((3.3, 0.9, 0.07), (0, -0.5, 1.03), color="wood_light")
    b.col((3.2, 0.8, 1.0), (0, -0.5, 0.5))
    # ice trays with fish
    for k, x in enumerate((-1.0, 0.0, 1.0)):
        b.mb.box((0.85, 0.65, 0.12), (x, -0.5, 1.1), color="#E6F6FF")
        for j in range(3):
            c = ("#E2483F", "#5BB3D9", "#F2C744")[(k + j) % 3]
            b.mb.sphere(0.12, (x - 0.22 + j * 0.22, -0.5, 1.19), scale=(0.6, 1.6, 0.55), color=c, seg=8, rings=6)
    for px, py in ((-1.7, -1.0), (1.7, -1.0), (-1.7, 1.3), (1.7, 1.3)):
        b.post(px, py, 2.8, 0, r=0.08, color="wood", collide=True)
    b.awning(-1.9, 1.9, 1.4, 2.7, 3.0, drop=0.5)
    b.sign("Fischhandel", 0, -1.05, 2.0, w=2.2, h=0.4, size=0.24)
    b.crate(-2.4, 0.6, 0, s=0.6, color="roof_teal")
    b.crate(-2.4, 0.6, 0.6, s=0.5, color="roof_teal")
    b.barrel(2.4, 0.5, 0)
    # scale on the counter
    b.mb.cyl(0.18, 0.05, (1.25, -0.75, 1.22), color="metal", seg=10)
    b.mb.box((0.06, 0.06, 0.3), (1.25, -0.75, 1.36), color="metal")
    b.mb.box((0.9, 0.7, 0.45), (0, 0.55, 0.22), color="crate")  # Pelle stands on this box
    empty("ANCHOR_trader", (0, 0.55, 0))
    b.finish("trader_stall")


run(build, __file__)
