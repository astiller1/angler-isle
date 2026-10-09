"""Basic fishing rod (tier 1). Grip at the origin, rod points up (+Z). ANCHOR_tip = line exit."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *

LENGTH = 1.7


def build():
    mb = MB()
    mb.cyl(0.035, 0.38, (0, 0, 0.05), color="rod_grip", seg=8)
    mb.cyl(0.024, LENGTH, (0, 0, LENGTH / 2 + 0.2), r2=0.008, color="rod", seg=6)
    for k in range(4):
        z = 0.6 + k * 0.32
        mb.cyl(0.02, 0.01, (0, -0.03, z), rot=(math.pi / 2, 0, 0), color="metal", seg=6)
    # reel
    mb.cyl(0.07, 0.05, (0, 0.07, 0.3), rot=(0, math.pi / 2, 0), color="reel", seg=12)
    mb.cyl(0.03, 0.06, (0, 0.04, 0.3), rot=(math.pi / 2, 0, 0), color="reel", seg=6)
    mb.box((0.015, 0.015, 0.06), (0.035, 0.07, 0.34), color="black")
    root = obj_from(mb, "rod")
    empty("ANCHOR_tip", (0, 0, LENGTH + 0.2), parent_obj=root)


run(build, __file__)
