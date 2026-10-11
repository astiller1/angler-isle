"""Harbor dock: 12 x 36 m plank platform on stilts. Deck top = origin (placed at h = 2.2).
Local +X = sea side (east when placed with rot 0). The pier attaches at the east edge, y = 0."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B


def build():
    b = B(7)
    b.deck(-6, 6, -18, 18, 0, along="x")
    b.stilts(-6, 6, -18, 18, 0, -7, spacing=4)
    b.skirt([(-6, -18), (6, -18), (6, 18), (-6, 18), (-6, -18)], z_bottom=-7)
    b.railing((6, -18), (6, -1.6))
    b.railing((6, 1.6), (6, 18))
    b.railing((1, -18), (6, -18))
    b.railing((1, 18), (6, 18))
    for y in (-14, -6, 6, 14):
        b.bollard(5.5, y, 0)
    b.crate(4.6, 4.2, 0)
    b.crate(4.6, 4.9, 0.6, s=0.5)
    b.crate(3.9, 4.4, 0, s=0.55)
    b.barrel(4.8, -4.0, 0)
    b.barrel(4.3, -4.7, 0, r=0.28, h=0.7)
    b.crate(-4.8, 16.5, 0)
    b.barrel(-3.9, 16.8, 0)
    b.lantern_post(5.3, -1.9, 0)
    b.lantern_post(5.3, 1.9, 0)
    b.lantern_post(-5.5, 3.6, 0)
    b.lantern_post(-5.5, -9.0, 0)
    # fishing net draped over the east railing
    for k in range(6):
        b.mb.box((0.04, 0.6, 0.7), (6.05, 9 + k * 0.6, 0.45), rot=(0, 0.1, 0), color="net")
    b.finish("dock")


run(build, __file__)
