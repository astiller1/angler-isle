"""Small cooler (4 fish) carried on the cat's back. Fish stand tail-up in SLOT_0..SLOT_3.
Pivot = back-strap contact point. Front of the cooler faces -Y (away from the cat's back in game)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *

W, D, H = 0.46, 0.30, 0.30  # width (x), depth (y), height (z)
SLOTS = 4


def build():
    mb = MB()
    t = 0.03
    # open box: floor + 4 walls (so fish can sit inside)
    mb.box((W, D, t), (0, 0, t / 2), color="cooler_body")
    mb.box((W, t, H), (0, -D / 2 + t / 2, H / 2), color="cooler_body")
    mb.box((W, t, H), (0, D / 2 - t / 2, H / 2), color="cooler_body")
    mb.box((t, D, H), (-W / 2 + t / 2, 0, H / 2), color="cooler_body")
    mb.box((t, D, H), (W / 2 - t / 2, 0, H / 2), color="cooler_body")
    # white rim and stripe
    mb.box((W + 0.02, 0.035, 0.035), (0, -D / 2, H), color="cooler_lid")
    mb.box((W + 0.02, 0.035, 0.035), (0, D / 2, H), color="cooler_lid")
    mb.box((0.035, D + 0.02, 0.035), (-W / 2, 0, H), color="cooler_lid")
    mb.box((0.035, D + 0.02, 0.035), (W / 2, 0, H), color="cooler_lid")
    mb.box((W + 0.01, D + 0.01, 0.04), (0, 0, 0.09), color="cooler_lid")
    # open lid hinged at the back (+Y side, towards the cat)
    mb.box((W + 0.03, 0.04, D + 0.02), (0, D / 2 + 0.03, H + D / 2 - 0.02), rot=(0.25, 0, 0), color="cooler_lid")
    # handles on the sides
    for sx in (-1, 1):
        mb.box((0.03, 0.12, 0.03), (sx * (W / 2 + 0.03), 0, H * 0.75), color="cooler_handle")
    # straps (towards +Y = the cat's back)
    for sx in (-0.13, 0.13):
        mb.box((0.04, 0.02, H * 1.2), (sx, D / 2 + 0.012, H * 0.55), color="cooler_handle")
    root = obj_from(mb, "cooler", origin=(0, D / 2, H * 0.5))
    # slot anchors spread along the width, inside the box
    for i in range(SLOTS):
        x = -W / 2 + W * (i + 0.5) / SLOTS
        empty(f"SLOT_{i}", (x, (i % 2) * 0.06 - 0.03, 0.06), parent_obj=root)


run(build, __file__)
