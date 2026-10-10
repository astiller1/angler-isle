"""Fishing rods. Grip at the origin, rod points up (+Z). ANCHOR_tip = line exit. One script per tier."""
import math

from kit import MB, empty, obj_from


def make_rod(name, length=1.7, shaft="rod", shaft_tip=None, grip="rod_grip", reel="reel", accent="red",
             rings="metal", bands=None, reel_size=0.07):
    mb = MB()
    mb.cyl(0.035, 0.38, (0, 0, 0.05), color=grip, seg=8)
    mb.cyl(0.04, 0.04, (0, 0, 0.25), color=accent, seg=8)  # butt ring
    tip_color = shaft_tip or shaft
    mb.cyl(0.024, length, (0, 0, length / 2 + 0.2), r2=0.008,
           color=lambda co: shaft if co.z < 0.2 + length * 0.75 else tip_color, seg=6)
    if bands:  # bamboo nodes or decorative wraps
        for k in range(1, 6):
            z = 0.2 + length * k / 6
            mb.cyl(0.026 - 0.0025 * k, 0.025, (0, 0, z), color=bands, seg=6)
    for k in range(5):
        z = 0.55 + k * (length - 0.4) / 5
        mb.cyl(0.02, 0.008, (0, -0.03, z), rot=(math.pi / 2, 0, 0), color=rings, seg=6)
    # reel
    mb.cyl(reel_size, 0.05, (0, 0.07, 0.3), rot=(0, math.pi / 2, 0), color=reel, seg=12)
    mb.cyl(reel_size * 0.45, 0.06, (0.03, 0.07, 0.3), rot=(0, math.pi / 2, 0), color=accent, seg=8)
    mb.cyl(0.03, 0.06, (0, 0.04, 0.3), rot=(math.pi / 2, 0, 0), color=reel, seg=6)
    mb.box((0.015, 0.015, 0.06), (0.035, 0.07, 0.34), color="black")
    root = obj_from(mb, name)
    empty("ANCHOR_tip", (0, 0, length + 0.2), parent_obj=root)
    return root
