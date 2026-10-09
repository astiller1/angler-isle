"""Bait-and-tackle shack (the start area). 7 x 6 m, floor = origin. Door in front (-Y).
A rod rack stands on the inside of the right wall (+X); ANCHOR_rack_rod is where the takeable rod hangs."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B

W, D, H = 7.0, 6.0, 2.8


def build():
    b = B(5)
    x0, x1, y0, y1 = -W / 2, W / 2, -D / 2, D / 2
    b.deck(x0, x1, y0, y1, 0.04, along="y", color="wood_light", collide=False)
    b.wall(x0, x1, 0, H, axis="x", at=y0, color="wall_mint", trim="trim",
           openings=[(-1.0, 1.0, 0, 2.25), (1.7, 2.9, 1.0, 1.9), (-2.9, -1.7, 1.0, 1.9)])
    b.wall(x0, x1, 0, H, axis="x", at=y1, color="wall_mint", openings=[(-0.7, 0.7, 1.1, 1.9)])
    b.wall(y0, y1, 0, H, axis="y", at=x0, color="wall_mint", openings=[(-0.8, 0.8, 1.0, 1.9)])
    b.wall(y0, y1, 0, H, axis="y", at=x1, color="wall_mint")
    b.gable_roof(0, 0, W, D, H, 1.5, color="roof_teal", ridge_axis="x", overhang=0.5)
    b.sign("Köder & Angeln", 0, y0 - 0.12, 2.55, w=2.6, h=0.42, size=0.24)
    # counter with a cash box along the back
    b.mb.box((3.0, 0.7, 1.0), (-1.4, y1 - 0.75, 0.5), color="wood")
    b.mb.box((3.1, 0.8, 0.07), (-1.4, y1 - 0.75, 1.03), color="wood_light")
    b.mb.box((0.4, 0.3, 0.22), (-2.3, y1 - 0.7, 1.17), color="red")
    b.col((3.0, 0.7, 1.0), (-1.4, y1 - 0.75, 0.5))
    # shelves with bait jars on the left wall
    for z in (1.1, 1.6, 2.1):
        b.mb.box((0.35, 2.4, 0.05), (x0 + 0.3, 0.6, z), color="wood")
        for k in range(6):
            col = b.r.choice(["flower_red", "flower_yellow", "roof_teal", "wall_pink", "coconut"])
            b.mb.cyl(0.08, 0.2, (x0 + 0.3, -0.4 + k * 0.38, z + 0.12), color=col, seg=8)
            b.mb.cyl(0.085, 0.04, (x0 + 0.3, -0.4 + k * 0.38, z + 0.23), color="metal", seg=8)
    b.col((0.4, 2.4, 2.2), (x0 + 0.3, 0.6, 1.1))
    # rod rack on the right wall
    rx = x1 - 0.35
    for z in (0.35, 1.6):
        b.mb.box((0.14, 2.6, 0.1), (rx, 0.3, z), color="wood_dark")
    for y in (-0.9, 1.5):
        b.mb.box((0.12, 0.12, 2.0), (rx, y, 1.0), color="wood_dark")
    for k, col in enumerate(("hat_green", "red", "roof_blue")):
        y = 0.9 - k * 0.5
        b.mb.cyl(0.025, 2.1, (rx - 0.05, y, 1.15), r2=0.01, color="rod", seg=6)
        b.mb.cyl(0.04, 0.35, (rx - 0.05, y, 0.3), color="rod_grip", seg=6)
        b.mb.cyl(0.06, 0.05, (rx - 0.12, y, 0.55), rot=(0, math.pi / 2, 0), color=col, seg=8)
    b.col((0.4, 2.8, 2.2), (rx, 0.3, 1.1))
    empty("ANCHOR_rack_rod", (rx - 0.08, -0.65, 0.2))
    # hanging lamp
    b.mb.cyl(0.18, 0.2, (0, 0.4, H - 0.35), color="flower_yellow", seg=8)
    b.mb.box((0.02, 0.02, 0.5), (0, 0.4, H - 0.1), color="black")
    # rug
    b.mb.box((2.2, 1.6, 0.02), (0.6, -0.4, 0.07), color="roof_red")
    b.mb.box((1.8, 1.2, 0.022), (0.6, -0.4, 0.075), color="wall_yellow")
    empty("ANCHOR_spawn", (0.9, -0.3, 0.1))
    empty("ANCHOR_shopkeeper", (-1.4, y1 - 0.2, 0))
    b.finish("tackle_shack")


run(build, __file__)
