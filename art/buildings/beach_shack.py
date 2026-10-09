"""Bruno's beach kitchen: open shack with a thatched roof, a grill and two little tables. Front = -Y."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def build():
    b = B(13)
    b.deck(-2.5, 2.5, -1.8, 1.8, 0.25, along="x", color="wood_light")
    b.stilts(-2.5, 2.5, -1.8, 1.8, 0.25, -1.0, spacing=2.5, r=0.1)
    b.mb.box((4.4, 0.7, 1.0), (0, -1.3, 0.75), color="wall_yellow")
    b.mb.box((4.6, 0.85, 0.08), (0, -1.3, 1.28), color="wood")
    b.col((4.4, 0.7, 1.4), (0, -1.3, 0.75))
    b.wall(-2.5, 2.5, 0.25, 2.6, axis="x", at=1.7, color="wall_white", openings=[(-1.2, 1.2, 1.3, 2.0)])
    for px, py in ((-2.4, -1.7), (2.4, -1.7)):
        b.post(px, py, 2.9, 0.25, r=0.1, color="trunk", collide=True)
    # side walls so the cook is reachable only from the front
    b.wall(-1.8, 1.7, 0.25, 1.3, axis="y", at=-2.5, color="wall_yellow")
    b.wall(-1.8, 1.7, 0.25, 1.3, axis="y", at=2.5, color="wall_yellow")
    # thatched roof with a fringe
    b.mb.box((6.0, 4.6, 0.25), (0, -0.1, 2.85), rot=(-0.18, 0, 0), color="#D8B86A")
    for k in range(20):
        x = -2.9 + k * 0.305
        b.mb.cyl(0.08, 0.35, (x, -2.4, 2.35), r2=0.02, rot=(0.3, 0, 0), color="#C9A55A", seg=4)
    b.col((6.0, 4.6, 0.5), (0, -0.1, 2.9), rot=(-0.18, 0, 0))
    # grill
    b.mb.cyl(0.35, 0.3, (1.6, 0.9, 1.0), color="black", seg=10)
    b.mb.cyl(0.05, 0.75, (1.6, 0.9, 0.55), color="black", seg=6)
    b.mb.box((0.6, 0.6, 0.03), (1.6, 0.9, 1.17), color="metal")
    for k in range(3):
        b.mb.sphere(0.07, (1.45 + k * 0.15, 0.9, 1.22), scale=(1, 2, 0.6), color="#E2483F", seg=6, rings=4)
    # pots on the counter
    b.mb.cyl(0.2, 0.3, (-1.2, -1.3, 1.47), color="metal", seg=10)
    b.mb.cyl(0.14, 0.2, (-0.5, -1.3, 1.42), color="roof_red", seg=10)
    b.sign("Brunos Strandküche", 0, -2.42, 2.3, w=3.4, h=0.45, size=0.24)
    # tables + stools in the sand in front
    for tx in (-1.8, 1.8):
        ty = -4.3
        b.mb.cyl(0.55, 0.06, (tx, ty, 0.78), color="wood_light", seg=12)
        b.mb.cyl(0.07, 0.78, (tx, ty, 0.39), color="wood", seg=6)
        b.col((1.1, 1.1, 0.8), (tx, ty, 0.4))
        b.mb.cyl(0.9, 0.04, (tx, ty, 2.1), r2=0.05, color=("awning_a" if tx < 0 else "roof_teal"), seg=10)
        b.mb.cyl(0.03, 1.4, (tx, ty, 1.45), color="white", seg=4)
        for sx in (-0.8, 0.8):
            b.mb.cyl(0.2, 0.45, (tx + sx, ty, 0.22), color="wood", seg=8)
    empty("ANCHOR_cook", (0, -0.4, 0.25))
    b.finish("beach_shack")


run(build, __file__)
