"""Street lantern post."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def bench(b):
    b.mb.box((1.8, 0.5, 0.08), (0, 0, 0.48), color="wood_light")
    b.mb.box((1.8, 0.08, 0.4), (0, 0.24, 0.75), rot=(-0.15, 0, 0), color="wood")
    for x in (-0.75, 0.75):
        b.mb.box((0.1, 0.45, 0.48), (x, 0, 0.24), color="wood_dark")
    b.col((1.8, 0.6, 0.9), (0, 0, 0.45))


def flower_bed(b):
    b.mb.box((2.4, 1.2, 0.35), (0, 0, 0.17), color="wood_light")
    b.mb.box((2.2, 1.0, 0.1), (0, 0, 0.36), color="mud")
    for k in range(18):
        x, y = b.r.uniform(-1.0, 1.0), b.r.uniform(-0.4, 0.4)
        b.mb.sphere(0.12, (x, y, 0.5), color=b.r.choice(["palm_leaf", "grass_dark"]), seg=6, rings=4)
        b.mb.sphere(0.07, (x + 0.04, y, 0.6), color=b.r.choice(["flower_red", "flower_yellow", "flower_pink", "white"]), seg=6, rings=4)
    b.col((2.4, 1.2, 0.5), (0, 0, 0.25))


def crates(b):
    b.crate(0, 0, 0, s=0.7)
    b.crate(0.75, 0.1, 0, s=0.6, color="wood_light")
    b.crate(0.3, 0.05, 0.7, s=0.55)
    b.barrel(-0.75, 0.2, 0)


def build():
    b = B(31)
    b.lantern_post(0, 0, 0, h=2.6)
    b.finish("lantern")


run(build, __file__)
