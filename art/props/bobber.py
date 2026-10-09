"""Classic red-and-white bobber. Origin = waterline."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *


def build():
    mb = MB()
    mb.sphere(0.07, (0, 0, 0.02), color=lambda co: "bobber_red" if co.z > 0.02 else "bobber_white", seg=12, rings=10)
    mb.cyl(0.008, 0.12, (0, 0, 0.12), color="bobber_white", seg=6)
    mb.cyl(0.006, 0.06, (0, 0, -0.07), color="black", seg=4)
    obj_from(mb, "bobber")


run(build, __file__)
