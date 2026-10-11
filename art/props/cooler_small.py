"""The cooler carried on the cat's back — a closed box (the fish inside are not shown; upgrades only add
capacity, the box stays the same). Pivot = back-strap contact point. Front faces -Y (away from the cat)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *

W, D, H = 0.46, 0.30, 0.30  # width (x), depth (y), height (z)


def build():
    mb = MB()
    # body
    mb.box((W, D, H * 0.78), (0, 0, H * 0.39), color="cooler_body")
    # white lid with a rounded top and a lip
    mb.box((W + 0.03, D + 0.03, 0.05), (0, 0, H * 0.78 + 0.025), color="cooler_lid")
    mb.box((W - 0.02, D - 0.02, 0.06), (0, 0, H * 0.78 + 0.07), color="cooler_lid", smooth=True)
    # carry handle on top
    for sx in (-1, 1):
        mb.box((0.03, 0.04, 0.07), (sx * 0.12, 0, H + 0.04), color="cooler_handle")
    mb.box((0.27, 0.045, 0.03), (0, 0, H + 0.08), color="cooler_handle")
    # white stripe + latch on the front
    mb.box((W + 0.01, D + 0.01, 0.04), (0, 0, 0.09), color="cooler_lid")
    mb.box((0.08, 0.02, 0.06), (0, -D / 2 - 0.01, H * 0.74), color="cooler_handle")
    # side handles
    for sx in (-1, 1):
        mb.box((0.03, 0.12, 0.03), (sx * (W / 2 + 0.03), 0, H * 0.6), color="cooler_handle")
    # straps (towards +Y = the cat's back)
    for sx in (-0.13, 0.13):
        mb.box((0.04, 0.02, H * 1.1), (sx, D / 2 + 0.012, H * 0.5), color="cooler_handle")
    obj_from(mb, "cooler", origin=(0, D / 2, H * 0.5))


run(build, __file__)
