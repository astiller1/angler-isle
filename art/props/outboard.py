"""Small outboard motor that clamps onto the rowboat's transom (pivot = clamp point, boat ANCHOR_motor).
The engine sits behind the transom (+Y = toward the stern), the propeller `prop` spins in game."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *


def build():
    mb = MB()
    # clamp bracket over the transom
    mb.box((0.18, 0.16, 0.08), (0, 0.02, 0.02), color="black")
    # engine cowling
    mb.box((0.3, 0.36, 0.3), (0, 0.24, 0.24), color="red", smooth=False)
    mb.sphere(0.17, (0, 0.24, 0.39), scale=(0.95, 1.1, 0.5), color="red", seg=10, rings=6)
    mb.box((0.31, 0.05, 0.05), (0, 0.1, 0.18), color="white")
    mb.box((0.31, 0.05, 0.05), (0, 0.38, 0.18), color="white")
    # tiller handle pointing into the boat
    mb.tube([(0, 0.1, 0.3), (0, -0.45, 0.42)], 0.025, color="black", seg=5, smooth=False)
    mb.cyl(0.035, 0.14, (0, -0.47, 0.43), rot=(1.4, 0, 0), color="black", seg=6)
    # shaft down into the water and the gearbox
    mb.box((0.07, 0.08, 0.75), (0, 0.24, -0.3), color="metal")
    mb.sphere(0.07, (0, 0.24, -0.66), scale=(0.8, 2.0, 0.8), color="metal", seg=8, rings=5)
    root = obj_from(mb, "outboard")
    pm = MB()
    for k in range(3):
        a = k * 2.0944
        pm.box((0.02, 0.05, 0.15), (0, 0.4, -0.66), rot=(a, 0, 0.5), color="yellow")
    pm.cyl(0.03, 0.06, (0, 0.4, -0.66), rot=(1.5708, 0, 0), color="metal", seg=6)
    p = obj_from(pm, "prop", origin=(0, 0.4, -0.66))
    parent(p, root)


run(build, __file__)
